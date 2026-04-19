
import { ParallelBreakerId, ComponentStatus, ParallelProcedure, ParallelSimulationState, ParallelSystemMode } from './parallel_types';

const COMPONENT_DEFAULTS = {
    status: ComponentStatus.NORMAL,
    temperature: 35,
    loadPct: 45, // approx 90% total load shared
    efficiency: 0,
    voltageOut: 0,
    kva: 0,
    pf: 0,
    thd: 0,
    prechargePct: 0,
    walkInPct: 0
};

const BATTERY_DEFAULTS = {
    chargeLevel: 100,
    temp: 25,
    health: 100,
    voltage: 225,
    ri: 0.015,
    soh: 100
};

const MODULE_DEFAULTS = {
    rectifier: { ...COMPONENT_DEFAULTS, voltageOut: 225 },
    inverter: { ...COMPONENT_DEFAULTS, voltageOut: 110, temperature: 45 },
    staticSwitch: { 
        mode: 'INVERTER' as const, 
        status: 'OK' as const, 
        syncError: 0, 
        syncStatus: 'SYNCED' as const,
        forceBypass: false, 
        isIsolated: false 
    },
    battery: { ...BATTERY_DEFAULTS },
    dcBusVoltage: 225,
    effectiveCapacityAh: 100
};

export const INITIAL_PARALLEL_STATE: ParallelSimulationState = {
    systemMode: ParallelSystemMode.ONLINE_PARALLEL,
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
        utilityInput: 415,
        loadBus: 110,
        bypassInput: 415,
        loadPhase: 0,
        bypassPhase: 0,
    },
    frequencies: {
        utility: 50.0,
        load: 50.0,
    },
    currents: {
        totalOutput: 190,
        load1: 110,
        load2: 80,
        kvar: 45
    },
    modules: {
        module1: JSON.parse(JSON.stringify(MODULE_DEFAULTS)),
        module2: JSON.parse(JSON.stringify(MODULE_DEFAULTS))
    },
    // Parallel-specific fields
    availableModules: 2,
    effectiveCapacityAh: 100,
    totalCapacityKW: 200, // 2 x 100kVA modules
    loadKW: 100,
    kva: 110,
    pf: 0.91,
    thd: 1.5,
    redundancyOK: true, // N+1 OK
    // Fault injection
    faults: {
        epo: false,
        mainsFailure: false,
        module1RectFault: false,
        module1InvFault: false,
        module2RectFault: false,
        module2InvFault: false,
        dcLinkCapacitorFailure: false,
        groundFault: false,
        syncDrift: false,
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
            description: 'Transfer System Static Switches to BYPASS.',
            expectedAction: { type: 'SWITCH', target: 'module1.staticSwitch', value: 'BYPASS' },
            validationFn: (s) => s.modules.module1.staticSwitch.mode === 'BYPASS' && s.modules.module2.staticSwitch.mode === 'BYPASS',
            hint: 'Commanding either module transfers both symmetrically.',
        },
        {
            id: 3,
            description: 'Close Maintenance Bypass Breaker 1 (Q3-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q3_1, value: true },
            validationFn: (s) => s.breakers[ParallelBreakerId.Q3_1],
            hint: 'External bypass path now energized for M1.',
        },
        {
            id: 4,
            description: 'Close Maintenance Bypass Breaker 2 (Q3-2).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q3_2, value: true },
            validationFn: (s) => s.breakers[ParallelBreakerId.Q3_2],
            hint: 'External bypass path now energized for M2.',
        },
        {
            id: 5,
            description: 'Verify Load Stable (Load Bus > 390V).',
            validationFn: (s) => s.voltages.loadBus > 390,
            hint: 'Load fed via maintenance bypass.',
        },
        {
            id: 6,
            description: 'Open Output Switch 1 (Q4-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q4_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q4_1],
        },
        {
            id: 7,
            description: 'Open Output Switch 2 (Q4-2).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q4_2, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q4_2],
        },
        {
            id: 8,
            description: 'Open Input Breakers (Q1-1 and Q1-2).',
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q1_1] && !s.breakers[ParallelBreakerId.Q1_2],
        },
        {
            id: 9,
            description: 'Open Bypass Input Breakers (Q2-1 and Q2-2).',
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q2_1] && !s.breakers[ParallelBreakerId.Q2_2],
            hint: 'AC inputs isolated. DC system still live.',
        },
        {
            id: 10,
            description: 'Open Battery Breakers (QF1-1 and QF1-2).',
            validationFn: (s) => !s.breakers[ParallelBreakerId.QF1_1] && !s.breakers[ParallelBreakerId.QF1_2],
            hint: 'Disconnects DC storage.',
        },
        {
            id: 11,
            description: 'Verify DC Bus complete discharge.',
            validationFn: (s) => s.modules.module1.dcBusVoltage < 10 && s.modules.module2.dcBusVoltage < 10,
            hint: 'System now completely de-energized. Safe for maintenance.',
        }
    ]
};

// 1.5 System Return from Maintenance Bypass
export const PROC_RETURN_FROM_BYPASS_PARALLEL: ParallelProcedure = {
    id: 'system_return_bypass',
    name: 'SOP-P-02: Return from Maint. Bypass Transfer',
    description: 'Restore UPS to normal parallel operation from total maintenance bypass state.',
    initialState: {
        ...INITIAL_PARALLEL_STATE,
        breakers: {
            ...INITIAL_PARALLEL_STATE.breakers,
            [ParallelBreakerId.Q1_1]: false,
            [ParallelBreakerId.Q2_1]: false,
            [ParallelBreakerId.Q4_1]: false,
            [ParallelBreakerId.QF1_1]: false,
            [ParallelBreakerId.Q3_1]: true,
            [ParallelBreakerId.Q1_2]: false,
            [ParallelBreakerId.Q2_2]: false,
            [ParallelBreakerId.Q4_2]: false,
            [ParallelBreakerId.QF1_2]: false,
            [ParallelBreakerId.Q3_2]: true,
        },
        modules: {
            module1: {
                ...INITIAL_PARALLEL_STATE.modules.module1,
                rectifier: { ...INITIAL_PARALLEL_STATE.modules.module1.rectifier, status: ComponentStatus.OFF, voltageOut: 0 },
                inverter: { ...INITIAL_PARALLEL_STATE.modules.module1.inverter, status: ComponentStatus.OFF, voltageOut: 0 },
                staticSwitch: { ...INITIAL_PARALLEL_STATE.modules.module1.staticSwitch, mode: 'BYPASS', forceBypass: true },
                dcBusVoltage: 0,
            },
            module2: {
                ...INITIAL_PARALLEL_STATE.modules.module2,
                rectifier: { ...INITIAL_PARALLEL_STATE.modules.module2.rectifier, status: ComponentStatus.OFF, voltageOut: 0 },
                inverter: { ...INITIAL_PARALLEL_STATE.modules.module2.inverter, status: ComponentStatus.OFF, voltageOut: 0 },
                staticSwitch: { ...INITIAL_PARALLEL_STATE.modules.module2.staticSwitch, mode: 'BYPASS', forceBypass: true },
                dcBusVoltage: 0,
            }
        },
        voltages: {
            ...INITIAL_PARALLEL_STATE.voltages,
            dcBus: 0,
            loadBus: 415,
        }
    },
    steps: [
        {
            id: 1,
            description: 'Close Bypass Input Breakers (Q2-1 and Q2-2).',
            validationFn: (s) => s.breakers[ParallelBreakerId.Q2_1] && s.breakers[ParallelBreakerId.Q2_2],
            hint: 'Energize bypass lines to sync static switches.',
        },
        {
            id: 2,
            description: 'Close Input Breakers (Q1-1 and Q1-2).',
            validationFn: (s) => s.breakers[ParallelBreakerId.Q1_1] && s.breakers[ParallelBreakerId.Q1_2],
        },
        {
            id: 3,
            description: 'Close Battery Breakers (QF1-1 and QF1-2).',
            validationFn: (s) => s.breakers[ParallelBreakerId.QF1_1] && s.breakers[ParallelBreakerId.QF1_2],
        },
        {
            id: 4,
            description: 'Start Rectifiers and wait for DC Bus > 200V.',
            validationFn: (s) => s.modules.module1.dcBusVoltage > 200 && s.modules.module2.dcBusVoltage > 200,
        },
        {
            id: 5,
            description: 'Start Inverters and verify output voltage.',
            validationFn: (s) => s.modules.module1.inverter.voltageOut > 99 && s.modules.module2.inverter.voltageOut > 99,
        },
        {
            id: 6,
            description: 'Verify System Static Switches are in BYPASS Mode.',
            validationFn: (s) => s.modules.module1.staticSwitch.mode === 'BYPASS' && s.modules.module2.staticSwitch.mode === 'BYPASS',
            hint: 'CRITICAL: Must be in Bypass for Make-Before-Break with Q3.',
        },
        {
            id: 7,
            description: 'Close Output Breakers (Q4-1 and Q4-2).',
            validationFn: (s) => s.breakers[ParallelBreakerId.Q4_1] && s.breakers[ParallelBreakerId.Q4_2],
            hint: 'Parallel the UPS bypass with the external maintenance bypass.',
        },
        {
            id: 8,
            description: 'Open Maintenance Bypass Breakers (Q3-1 and Q3-2).',
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q3_1] && !s.breakers[ParallelBreakerId.Q3_2],
            hint: 'Isolates external maintenance path.',
        },
        {
            id: 9,
            description: 'Transfer System to INVERTER.',
            expectedAction: { type: 'SWITCH', target: 'module1.staticSwitch', value: 'INVERTER' },
            validationFn: (s) => s.modules.module1.staticSwitch.mode === 'INVERTER' && s.modules.module2.staticSwitch.mode === 'INVERTER',
            hint: 'Cleanly transfers total load to protected UPS power.',
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
            validationFn: (s) => s.voltages.loadBus > 90 && s.modules.module2.inverter.loadPct > 50,
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
            description: 'Open Module 1 Output Breaker (Q4-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q4_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q4_1],
            hint: 'Disconnects M1 from load bus. M2 will now carry 100% of load.',
        },
        {
            id: 3,
            description: 'Verify Load Stable on Module 2 Only (Load Bus > 90V, M2 Load > 70%).',
            validationFn: (s) => s.voltages.loadBus > 90 && s.modules.module2.inverter.loadPct > 70,
            hint: 'M2 now carrying 100% of load.',
        },
        {
            id: 4,
            description: 'Open Module 1 Input Breaker (Q1-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q1_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q1_1],
            hint: 'Isolates mains input to M1.',
        },
        {
            id: 5,
            description: 'Open Module 1 Bypass Input Breaker (Q2-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.Q2_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.Q2_1],
            hint: 'CRITICAL: Isolates bypass power for complete de-energization.',
        },
        {
            id: 6,
            description: 'Open Module 1 Battery Breaker (QF1-1).',
            expectedAction: { type: 'BREAKER', target: ParallelBreakerId.QF1_1, value: false },
            validationFn: (s) => !s.breakers[ParallelBreakerId.QF1_1],
            hint: 'Isolates DC battery power.',
        },
        {
            id: 7,
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
                rectifier: { ...COMPONENT_DEFAULTS, status: ComponentStatus.NORMAL, temperature: 45, voltageOut: 220, efficiency: 0.94, pf: 0.98, thd: 3.1, prechargePct: 100, walkInPct: 100 },
                inverter: { ...COMPONENT_DEFAULTS, status: ComponentStatus.NORMAL, temperature: 52, voltageOut: 110, efficiency: 0.96, pf: 0.9, thd: 1.2, prechargePct: 100, walkInPct: 100 },
                staticSwitch: { mode: 'INVERTER' as const, status: 'OK' as const, syncError: 0, syncStatus: 'SYNCED' as const, forceBypass: false },
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
            description: 'Wait for M1 DC Bus to stabilize (>200V).',
            validationFn: (s) => s.modules.module1.dcBusVoltage > 200,
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
            description: 'Wait for M1 Inverter to reach NORMAL (110V output).',
            validationFn: (s) => s.modules.module1.inverter.status === ComponentStatus.NORMAL && s.modules.module1.inverter.voltageOut > 99,
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
            description: 'Verify M1 running on battery (DC Bus 190-220V).',
            validationFn: (s) => s.modules.module1.dcBusVoltage < 225 && s.modules.module1.dcBusVoltage > 190,
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
