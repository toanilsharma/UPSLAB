
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
        [ParallelBreakerId.Q2_1]: true, // Bypass Input 1
        [ParallelBreakerId.Q3_1]: false,
        [ParallelBreakerId.Q4_1]: true,
        [ParallelBreakerId.QF1_1]: true,

        [ParallelBreakerId.Q1_2]: true,
        [ParallelBreakerId.Q2_2]: true, // Bypass Input 2
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

// 1. System Maintenance Bypass (Wrap-around for both) - OEM CORRECTED
export const PROC_SYSTEM_MAINT_BYPASS: ParallelProcedure = {
    id: 'sys_maint_bypass',
    name: 'SOP-P-01: System Maintenance Bypass',
    description: 'Transfer load to maintenance bypass on both modules for complete system service.',
    initialState: INITIAL_PARALLEL_STATE,
    steps: [
        {
            id: 1,
            description: 'Verify Bypass Input Available (Q2-1 and Q2-2 CLOSED).',
            validationFn: (s) => s.breakers[ParallelBreakerId.Q2_1] && s.breakers[ParallelBreakerId.Q2_2],
            hint: 'Bypass power must be available before proceeding.',
        },
        {
            id: 2,
            description: 'Transfer Module 1 Static Switch to BYPASS.',
            expectedAction: { type: 'SWITCH', target: 'module1.staticSwitch', value: 'BYPASS' },
            validationFn: (s) => s.modules.module1.staticSwitch.mode === 'BYPASS',
        },
        {
            id: 3,
            description: 'Transfer Module 2 Static Switch to BYPASS.',
            expectedAction: { type: 'SWITCH', target: 'module2.staticSwitch', value: 'BYPASS' },
            validationFn: (s) => s.modules.module2.staticSwitch.mode === 'BYPASS',
        },
        {
            id: 4,
            description: 'Close Maintenance Bypass Breaker 1 (Q3-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q3_1, value: true },
            validationFn: (s) => s.breakers[ParallelBreakerId.Q3_1],
            hint: 'External bypass path now energized for M1.',
        },
        {
            id: 5,
            description: 'Close Maintenance Bypass Breaker 2 (Q3-2).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q3_2, value: true },
            validationFn: (s) => s.breakers[ParallelBreakerId.Q3_2],
            hint: 'External bypass path now energized for M2.',
        },
        {
            id: 6,
            description: 'Verify Load Stable (Load Bus > 390V).',
            validationFn: (s) => s.voltages.loadBus > 390,
            hint: 'Load fed via maintenance bypass.',
        },
        {
            id: 7,
            description: 'Open Output Switch 1 (Q4-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q4_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q4_1],
        },
        {
            id: 8,
            description: 'Open Output Switch 2 (Q4-2).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q4_2, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q4_2],
        },
        {
            id: 9,
            description: 'Open Input Breakers (Q1-1 and Q1-2).',
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q1_1] && !s.breakers[ParallelBreakerId.Q1_2],
            hint: 'System now completely isolated. Safe for maintenance.',
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

// 3. Module 1 Isolation for Preventive Maintenance - OEM CORRECTED
export const PROC_MODULE_1_PM: ParallelProcedure = {
    id: 'module1_pm',
    name: 'SOP-P-03: Module 1 PM Isolation',
    description: 'Complete electrical isolation of Module 1 for safe preventive maintenance.',
    initialState: INITIAL_PARALLEL_STATE,
    steps: [
        {
            id: 1,
            description: 'Verify Module 2 Healthy and Carrying Load.',
            validationFn: (s) => s.modules.module2.inverter.status === ComponentStatus.NORMAL && s.breakers[ParallelBreakerId.Q4_2],
            hint: 'M2 must be operational and connected to load bus.',
        },
        {
            id: 2,
            description: 'Transfer Module 1 Static Switch to BYPASS.',
            expectedAction: { type: 'SWITCH', target: 'module1.staticSwitch', value: 'BYPASS' },
            validationFn: (s) => s.modules.module1.staticSwitch.mode === 'BYPASS',
            hint: 'Ensures clean shutdown of M1 inverter.',
        },
        {
            id: 3,
            description: 'Open Module 1 Output Breaker (Q4-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q4_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q4_1],
            hint: 'Disconnects M1 from load bus.',
        },
        {
            id: 4,
            description: 'Verify Load Stable on Module 2 Only (Load Bus > 390V, M2 Load > 70%).',
            validationFn: (s) => s.voltages.loadBus > 390 && s.modules.module2.inverter.loadPct > 70,
            hint: 'M2 now carrying 100% of load.',
        },
        {
            id: 5,
            description: 'Open Module 1 Input Breaker (Q1-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q1_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q1_1],
            hint: 'Isolates mains input to M1.',
        },
        {
            id: 6,
            description: 'Open Module 1 Bypass Input Breaker (Q2-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q2_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q2_1],
            hint: 'CRITICAL: Isolates bypass power for complete de-energization.',
        },
        {
            id: 7,
            description: 'Open Module 1 Battery Breaker (QF1-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.QF1_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.QF1_1],
            hint: 'Isolates DC battery power.',
        },
        {
            id: 8,
            description: 'Module 1 ZERO VOLTAGE - Safe for Maintenance.',
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q1_1] && !s.breakers[ParallelBreakerId.Q2_1] && !s.breakers[ParallelBreakerId.Q4_1] && !s.breakers[ParallelBreakerId.QF1_1],
            hint: 'All M1 power sources isolated. Module de-energized.',
        }
    ]
};

// 4. Module 1 Restoration After Maintenance
export const PROC_MODULE_1_RESTORE: ParallelProcedure = {
    id: 'module1_restore',
    name: 'SOP-P-04: Module 1 Restoration',
    description: 'Restore Module 1 to service after preventive maintenance.',
    initialState: {
        ...INITIAL_PARALLEL_STATE,
        breakers: {
            ...INITIAL_PARALLEL_STATE.breakers,
            [ParallelBreakerId.Q1_1]: false,
            [ParallelBreakerId.Q4_1]: false,
            [ParallelBreakerId.QF1_1]: false,
        },
        modules: {
            ...INITIAL_PARALLEL_STATE.modules,
            module1: {
                ...INITIAL_PARALLEL_STATE.modules.module1,
                rectifier: { ...INITIAL_PARALLEL_STATE.modules.module1.rectifier, status: ComponentStatus.OFF, voltageOut: 0 },
                inverter: { ...INITIAL_PARALLEL_STATE.modules.module1.inverter, status: ComponentStatus.OFF, voltageOut: 0 },
                staticSwitch: { mode: 'BYPASS' as const, status: 'OK' as const, syncError: 0, forceBypass: false },
            }
        }
    },
    steps: [
        {
            id: 1,
            description: 'Close Module 1 Battery Breaker (QF1-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.QF1_1, value: true },
            validationFn: (s) => s.breakers[ParallelBreakerId.QF1_1],
        },
        {
            id: 2,
            description: 'Close Module 1 Input Breaker (Q1-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q1_1, value: true },
            validationFn: (s) => s.breakers[ParallelBreakerId.Q1_1],
        },
        {
            id: 3,
            description: 'Start Module 1 Rectifier.',
            expectedAction: { type: 'COMPONENT', target: 'module1.rectifier', action: 'START' },
            validationFn: (s) => s.modules.module1.rectifier.status === ComponentStatus.NORMAL || s.modules.module1.rectifier.status === ComponentStatus.STARTING,
            hint: 'Click on M1 Rectifier and press START.',
        },
        {
            id: 4,
            description: 'Wait for M1 DC Bus to stabilize (>500V).',
            validationFn: (s) => s.modules.module1.dcBusVoltage > 500,
            hint: 'Rectifier charging DC link.',
        },
        {
            id: 5,
            description: 'Start Module 1 Inverter.',
            expectedAction: { type: 'COMPONENT', target: 'module1.inverter', action: 'START' },
            validationFn: (s) => s.modules.module1.inverter.status === ComponentStatus.NORMAL || s.modules.module1.inverter.status === ComponentStatus.STARTING,
            hint: 'Click on M1 Inverter and press START.',
        },
        {
            id: 6,
            description: 'Wait for M1 Inverter to reach NORMAL (400V output).',
            validationFn: (s) => s.modules.module1.inverter.status === ComponentStatus.NORMAL && s.modules.module1.inverter.voltageOut > 390,
        },
        {
            id: 7,
            description: 'Transfer M1 Static Switch to INVERTER.',
            expectedAction: { type: 'SWITCH', target: 'module1.staticSwitch', value: 'INVERTER' },
            validationFn: (s) => s.modules.module1.staticSwitch.mode === 'INVERTER',
        },
        {
            id: 8,
            description: 'Close Module 1 Output Breaker (Q4-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q4_1, value: true },
            validationFn: (s) => s.breakers[ParallelBreakerId.Q4_1],
            hint: 'Synchronize M1 to load bus.',
        },
        {
            id: 9,
            description: 'Verify Load Sharing (Both modules ~45-50% load).',
            validationFn: (s) => {
                const m1Load = s.modules.module1.inverter.loadPct;
                const m2Load = s.modules.module2.inverter.loadPct;
                return m1Load > 35 && m1Load < 65 && m2Load > 35 && m2Load < 65;
            },
            hint: 'Load should be balanced between M1 and M2.',
        }
    ]
};

// 5. Utility Failure Simulation Test
export const PROC_UTILITY_FAILURE_TEST: ParallelProcedure = {
    id: 'utility_fail_test',
    name: 'SOP-P-05: Utility Failure Test',
    description: 'Simulate total utility failure to test battery backup and automatic bypass.',
    initialState: INITIAL_PARALLEL_STATE,
    steps: [
        {
            id: 1,
            description: 'Verify both modules in NORMAL operation.',
            validationFn: (s) => s.modules.module1.inverter.status === ComponentStatus.NORMAL && s.modules.module2.inverter.status === ComponentStatus.NORMAL,
        },
        {
            id: 2,
            description: 'Open Module 1 Input (Q1-1) to simulate utility failure.',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q1_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q1_1],
            hint: 'M1 should switch to battery.',
        },
        {
            id: 3,
            description: 'Verify M1 running on battery (DC Bus 380-450V).',
            validationFn: (s) => s.modules.module1.dcBusVoltage < 500 && s.modules.module1.dcBusVoltage > 350,
            hint: 'M1 DC bus drops to battery voltage.',
        },
        {
            id: 4,
            description: 'Open Module 2 Input (Q1-2) - Both modules now on battery.',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q1_2, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q1_2],
        },
        {
            id: 5,
            description: 'Verify both batteries discharging together.',
            validationFn: (s) => s.modules.module1.battery.chargeLevel < 100 && s.modules.module2.battery.chargeLevel < 100,
            hint: 'Monitor battery levels decreasing.',
        },
        {
            id: 6,
            description: 'Observe battery depletion to <10% (Auto bypass will activate).',
            validationFn: (s) => s.modules.module1.battery.chargeLevel < 10 || s.modules.module2.battery.chargeLevel < 10,
            hint: 'Wait for batteries to drain. System will auto-transfer to bypass.',
        },
        {
            id: 7,
            description: 'Confirm automatic bypass transfer occurred.',
            validationFn: (s) => s.modules.module1.staticSwitch.mode === 'BYPASS' && s.modules.module2.staticSwitch.mode === 'BYPASS',
            hint: 'Both STS should switch to BYPASS automatically.',
        }
    ]
};
