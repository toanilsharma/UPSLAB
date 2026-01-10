
import { ParallelBreakerId, ComponentStatus, ParallelProcedure, ParallelSimulationState } from './parallel_types';

const COMPONENT_DEFAULTS = {
    status: ComponentStatus.NORMAL,
    temperature: 35,
    loadPct: 45, // approx 90% total load shared
    efficiency: 0.95,
    voltageOut: 540
};

const BATTERY_DEFAULTS = {
    chargeLevel: 100,
    temp: 25,
    health: 100,
    voltage: 540,
};

const MODULE_DEFAULTS = {
    rectifier: { ...COMPONENT_DEFAULTS, voltageOut: 540 },
    inverter: { ...COMPONENT_DEFAULTS, voltageOut: 400, temperature: 45 },
    staticSwitch: { mode: 'INVERTER' as const, status: 'OK' as const, syncError: 0, forceBypass: false },
    battery: { ...BATTERY_DEFAULTS },
    dcBusVoltage: 540
};

export const INITIAL_PARALLEL_STATE: ParallelSimulationState = {
    breakers: {
        [ParallelBreakerId.Q1_1]: true,
        [ParallelBreakerId.Q3_1]: false,
        [ParallelBreakerId.Q4_1]: true,
        [ParallelBreakerId.QF1_1]: true,

        [ParallelBreakerId.Q1_2]: true,
        [ParallelBreakerId.Q3_2]: false,
        [ParallelBreakerId.Q4_2]: true,
        [ParallelBreakerId.QF1_2]: true,

        [ParallelBreakerId.Load1]: true,
        [ParallelBreakerId.Load2]: true,
    },
    voltages: {
        utilityInput: 400,
        loadBus: 400,
    },
    frequencies: {
        utility: 50.0,
        load: 50.0,
    },
    currents: {
        totalOutput: 190,
        load1: 110,
        load2: 80,
    },
    modules: {
        module1: JSON.parse(JSON.stringify(MODULE_DEFAULTS)),
        module2: JSON.parse(JSON.stringify(MODULE_DEFAULTS))
    },
    alarms: [],
    lastTick: 0,
};

// --- PROCEDURES ---

// 1. System Maintenance Bypass (Wrap-around for both)
export const PROC_SYSTEM_MAINT_BYPASS: ParallelProcedure = {
    id: 'sys_maint_bypass',
    name: 'System Maintenance Bypass',
    description: 'Transfer generic load to maintenance bypass on both modules.',
    initialState: INITIAL_PARALLEL_STATE,
    steps: [
        {
            id: 1,
            description: 'Transfer Module 1 Static Switch to BYPASS.',
            expectedAction: { type: 'SWITCH', target: 'module1.staticSwitch', value: 'BYPASS' },
            validationFn: (s) => s.modules.module1.staticSwitch.mode === 'BYPASS',
        },
        {
            id: 2,
            description: 'Transfer Module 2 Static Switch to BYPASS.',
            expectedAction: { type: 'SWITCH', target: 'module2.staticSwitch', value: 'BYPASS' },
            validationFn: (s) => s.modules.module2.staticSwitch.mode === 'BYPASS',
        },
        {
            id: 3,
            description: 'Close Maintenance Bypass Breaker 1 (Q3-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q3_1, value: true },
            validationFn: (s) => s.breakers[ParallelBreakerId.Q3_1],
        },
        {
            id: 4,
            description: 'Close Maintenance Bypass Breaker 2 (Q3-2).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q3_2, value: true },
            validationFn: (s) => s.breakers[ParallelBreakerId.Q3_2],
        },
        {
            id: 5,
            description: 'Open Output Switch 1 (Q4-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q4_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q4_1],
        },
        {
            id: 6,
            description: 'Open Output Switch 2 (Q4-2).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q4_2, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q4_2],
        },
        {
            id: 7,
            description: 'Isolate Inputs (Open Q1-1 and Q1-2).',
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q1_1] && !s.breakers[ParallelBreakerId.Q1_2],
            hint: 'Open both Rectifier Input breakers.',
        }
    ]
};

// 2. Module 1 Isolation (Redundancy Test)
export const PROC_MODULE_ISOLATION: ParallelProcedure = {
    id: 'module_iso',
    name: 'Isolate Module 1 (Redundancy)',
    description: 'Safely remove Module 1 from service while maintaining load on Module 2.',
    initialState: INITIAL_PARALLEL_STATE,
    steps: [
        {
            id: 1,
            description: 'Verify Module 2 can support total load.',
            validationFn: (s) => s.modules.module2.inverter.status === ComponentStatus.NORMAL,
            hint: 'Ensure Module 2 is healthy.',
        },
        {
            id: 2,
            description: 'Open Module 1 Output Switch (Q4-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q4_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q4_1],
            hint: 'Disconnect M1 from the load bus.',
        },
        {
            id: 3,
            description: 'Verify Load is stable on Module 2.',
            validationFn: (s) => s.voltages.loadBus > 390 && s.modules.module2.inverter.loadPct > 50,
        },
        {
            id: 4,
            description: 'Open Module 1 Rectifier Input (Q1-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q1_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q1_1],
        },
        {
            id: 5,
            description: 'Open Module 1 Battery (QF1-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.QF1_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.QF1_1],
        }
    ]
};
