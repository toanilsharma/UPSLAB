
import { ParallelSimulationState, ParallelBreakerId, ComponentStatus, ModuleState } from '../parallel_types';

const AMBIENT_TEMP = 22; // Server room temperature
const THERMAL_MASS = 0.08; // Realistic slow heating
const COOLING_FACTOR = 0.015;

// Process a single module with realistic physics (ported from single module)
const processModule = (
    moduleState: ModuleState,
    utilityInput: number,
    breakers: { mainInput: boolean; bypassInput: boolean; batteryBreaker: boolean; output: boolean },
    now: number,
    dcSource: 'RECT' | 'BATTERY' | 'NONE'
): ModuleState => {
    const module = JSON.parse(JSON.stringify(moduleState)) as ModuleState;

    // --- 1. RECTIFIER PHYSICS: "Walk-in" (Soft Start) Logic ---
    if (module.rectifier.status === ComponentStatus.FAULT) {
        module.rectifier.voltageOut = 0;
    } else if (breakers.mainInput && utilityInput > 380) {
        if (module.rectifier.status === ComponentStatus.STARTING) {
            // Linear Ramp Up (Walk-in) - 5 seconds to full voltage
            module.rectifier.voltageOut += 3;
            if (module.rectifier.voltageOut >= 540) {
                module.rectifier.status = ComponentStatus.NORMAL;
                module.rectifier.voltageOut = 540;
            }
        } else if (module.rectifier.status === ComponentStatus.NORMAL) {
            // PID Simulation: Slight fluctuation around setpoint
            module.rectifier.voltageOut = 540 + (Math.sin(now / 2000) * 0.2);
        } else {
            // OFF but Input Live: Capacitors hold charge briefly then decay
            module.rectifier.voltageOut = Math.max(0, module.rectifier.voltageOut * 0.95);
        }
    } else {
        // Input Lost: Fast Decay
        module.rectifier.status = ComponentStatus.OFF;
        module.rectifier.voltageOut = Math.max(0, module.rectifier.voltageOut * 0.90);
    }

    // --- 2. DC BUS & BATTERY PHYSICS ---
    let busV = 0;
    module.battery.current = 0;

    // Determine Dominant DC Source
    if (module.rectifier.voltageOut > 400) {
        busV = module.rectifier.voltageOut;
        dcSource = 'RECT';
    }

    // Battery Interaction & Physics
    if (breakers.batteryBreaker) {
        // Peukert-ish approximation for Open Circuit Voltage based on Charge %
        let battCurveFactor = 1.0;
        if (module.battery.chargeLevel > 90) battCurveFactor = 1.05; // Surface charge
        else if (module.battery.chargeLevel < 20) battCurveFactor = 0.90; // Knee of curve

        const battOpenCircuitV = 380 + ((module.battery.chargeLevel / 100) * (540 - 380) * battCurveFactor);

        if (dcSource === 'RECT') {
            // CHARGING LOGIC
            if (module.battery.chargeLevel < 100) {
                // Bulk Charge vs Float Charge
                const voltageDiff = Math.max(0, busV - battOpenCircuitV);
                module.battery.current = voltageDiff * 0.5; // Internal Resistance simulation

                // Load the DC bus slightly
                busV -= module.battery.current * 0.05;

                // Charge Accumulation
                module.battery.chargeLevel += (module.battery.current / 1000);
                module.battery.chargeLevel = Math.min(100, module.battery.chargeLevel);
            } else {
                module.battery.current = 0.2; // Float maintenance
            }
        } else {
            // DISCHARGING LOGIC (Battery is the Source)
            if (module.battery.chargeLevel > 0) {
                busV = battOpenCircuitV;
                dcSource = 'BATTERY';
                // Discharge current calculated later based on load
            } else {
                busV = 0; // Dead Battery
            }
        }
    } else if (dcSource !== 'RECT') {
        // DC Link Capacitor Discharge (No battery, no rectifier)
        busV = Math.max(0, module.dcBusVoltage * 0.92);
    }

    module.dcBusVoltage = busV;

    // --- 3. INVERTER PHYSICS ---
    if (module.inverter.status === ComponentStatus.FAULT) {
        module.inverter.voltageOut = 0;
    } else if (module.dcBusVoltage > 350 && module.inverter.status !== ComponentStatus.OFF) {
        // Inverter needs >350V DC to modulate AC
        if (module.inverter.status === ComponentStatus.STARTING) {
            module.inverter.voltageOut += 10;
            if (module.inverter.voltageOut >= 400) {
                module.inverter.status = ComponentStatus.NORMAL;
                module.inverter.voltageOut = 400;
            }
        } else {
            module.inverter.voltageOut = 400 + (Math.sin(now / 1000) * 0.2);
        }
    } else {
        module.inverter.status = ComponentStatus.OFF;
        module.inverter.voltageOut = 0;
    }

    return module;
};

export const calculateParallelPowerFlow = (prevState: ParallelSimulationState): ParallelSimulationState => {
    const now = Date.now();

    const s: ParallelSimulationState = {
        ...prevState,
        breakers: { ...prevState.breakers },
        voltages: { ...prevState.voltages },
        frequencies: { ...prevState.frequencies },
        modules: {
            module1: { ...prevState.modules.module1 },
            module2: { ...prevState.modules.module2 }
        },
        alarms: [],
        lastTick: now
    };

    const utilityInput = s.voltages.utilityInput;
    const utilityLive = utilityInput > 380;

    // --- PROCESS MODULE 1 WITH REALISTIC PHYSICS ---
    s.modules.module1 = processModule(
        s.modules.module1,
        utilityInput,
        {
            mainInput: s.breakers[ParallelBreakerId.Q1_1],
            bypassInput: s.breakers[ParallelBreakerId.Q2_1],
            batteryBreaker: s.breakers[ParallelBreakerId.QF1_1],
            output: s.breakers[ParallelBreakerId.Q4_1]
        },
        now,
        'NONE'
    );

    // --- PROCESS MODULE 2 WITH REALISTIC PHYSICS ---
    s.modules.module2 = processModule(
        s.modules.module2,
        utilityInput,
        {
            mainInput: s.breakers[ParallelBreakerId.Q1_2],
            bypassInput: s.breakers[ParallelBreakerId.Q2_2],
            batteryBreaker: s.breakers[ParallelBreakerId.QF1_2],
            output: s.breakers[ParallelBreakerId.Q4_2]
        },
        now,
        'NONE'
    );

    // --- STATIC SWITCH LOGIC FOR EACH MODULE ---
    const processStaticSwitch = (module: ModuleState, bypassAvailable: boolean) => {
        const inverterReady = module.inverter.status === ComponentStatus.NORMAL && module.inverter.voltageOut > 390;

        // Calculate sync error
        const freqDiff = Math.abs(50.0 - s.frequencies.utility);
        module.staticSwitch.syncError = module.inverter.status === ComponentStatus.NORMAL && utilityLive
            ? Math.abs(Math.sin(now / 2000)) * 15
            : 0;

        // AUTO-TRANSFER LOGIC
        if (module.staticSwitch.mode === 'INVERTER') {
            // Failover Conditions
            if (!inverterReady && bypassAvailable) {
                module.staticSwitch.mode = 'BYPASS';
            }
            // Battery depletion auto-transfer
            if (module.battery.chargeLevel < 15 && bypassAvailable && !s.breakers[ParallelBreakerId.Q1_1] && !s.breakers[ParallelBreakerId.Q1_2]) {
                module.staticSwitch.mode = 'BYPASS';
            }
        } else {
            // AUTO-RETRANSFER Logic
            if (inverterReady && module.staticSwitch.syncError < 5 && !module.staticSwitch.forceBypass) {
                module.staticSwitch.mode = 'INVERTER';
            }
        }
    };

    const bypass1Available = utilityLive && s.breakers[ParallelBreakerId.Q2_1];
    const bypass2Available = utilityLive && s.breakers[ParallelBreakerId.Q2_2];

    processStaticSwitch(s.modules.module1, bypass1Available);
    processStaticSwitch(s.modules.module2, bypass2Available);

    // --- LOAD CALCULATION & SHARING ---
    const load1kW = s.breakers[ParallelBreakerId.Load1] ? 60 : 0;
    const load2kW = s.breakers[ParallelBreakerId.Load2] ? 40 : 0;
    const totalLoadkW = load1kW + load2kW;
    const loadAmps = (totalLoadkW / 0.4) * 2.5; // ~190A at full load

    // Determine active modules
    const m1Active = s.modules.module1.inverter.status === ComponentStatus.NORMAL && s.breakers[ParallelBreakerId.Q4_1];
    const m2Active = s.modules.module2.inverter.status === ComponentStatus.NORMAL && s.breakers[ParallelBreakerId.Q4_2];
    const m1OnBypass = s.modules.module1.staticSwitch.mode === 'BYPASS';
    const m2OnBypass = s.modules.module2.staticSwitch.mode === 'BYPASS';

    // Check maintenance bypass
    const m1Maintenance = s.breakers[ParallelBreakerId.Q3_1];
    const m2Maintenance = s.breakers[ParallelBreakerId.Q3_2];

    if (m1Maintenance || m2Maintenance) {
        // SYSTEM ON MAINTENANCE BYPASS
        s.voltages.loadBus = utilityInput;
        s.modules.module1.inverter.loadPct = 0;
        s.modules.module2.inverter.loadPct = 0;
        s.modules.module1.rectifier.loadPct = 5;
        s.modules.module2.rectifier.loadPct = 5;
    } else {
        // NORMAL/AUTOMATIC REDUNDANCY OPERATION
        let sources = [];
        if (m1Active && !m1OnBypass) sources.push('M1');
        if (m2Active && !m2OnBypass) sources.push('M2');

        const activeCount = sources.length;

        if (activeCount > 0) {
            s.voltages.loadBus = 400;

            // AUTOMATIC LOAD BALANCING WITH REDUNDANCY
            const ampsPerModule = loadAmps / activeCount;

            // Module 1 Load Assignment with Efficiency Curve
            if (sources.includes('M1')) {
                s.modules.module1.inverter.loadPct = Math.min(100, (ampsPerModule / 120) * 100);
                s.modules.module1.rectifier.loadPct = (ampsPerModule / 140) * 100;

                // Inverter Efficiency Curve
                const loadFactor = s.modules.module1.inverter.loadPct / 100;
                s.modules.module1.inverter.efficiency = Math.min(0.96, Math.max(0.85, 0.96 - (0.1 * Math.pow(1 - loadFactor, 2))));

                // Battery discharge if on battery
                if (s.modules.module1.dcBusVoltage < 500 && s.modules.module1.battery.chargeLevel > 0) {
                    const powerRequired = (ampsPerModule * 400) / s.modules.module1.inverter.efficiency;
                    const dcAmps = powerRequired / s.modules.module1.dcBusVoltage;
                    s.modules.module1.battery.current = -dcAmps;
                    s.modules.module1.battery.chargeLevel -= (dcAmps / 800);
                    s.modules.module1.battery.chargeLevel = Math.max(0, s.modules.module1.battery.chargeLevel);
                }

                if (activeCount === 1 && s.modules.module1.inverter.loadPct > 120) {
                    if (!s.alarms.includes('M1 OVERLOAD')) s.alarms.push('M1 OVERLOAD');
                }
            } else {
                s.modules.module1.inverter.loadPct = 0;
                s.modules.module1.rectifier.loadPct = 5; // Idle charging
                s.modules.module1.inverter.efficiency = 0;
            }

            // Module 2 Load Assignment with Efficiency Curve
            if (sources.includes('M2')) {
                s.modules.module2.inverter.loadPct = Math.min(100, (ampsPerModule / 120) * 100);
                s.modules.module2.rectifier.loadPct = (ampsPerModule / 140) * 100;

                // Inverter Efficiency Curve
                const loadFactor = s.modules.module2.inverter.loadPct / 100;
                s.modules.module2.inverter.efficiency = Math.min(0.96, Math.max(0.85, 0.96 - (0.1 * Math.pow(1 - loadFactor, 2))));

                // Battery discharge if on battery
                if (s.modules.module2.dcBusVoltage < 500 && s.modules.module2.battery.chargeLevel > 0) {
                    const powerRequired = (ampsPerModule * 400) / s.modules.module2.inverter.efficiency;
                    const dcAmps = powerRequired / s.modules.module2.dcBusVoltage;
                    s.modules.module2.battery.current = -dcAmps;
                    s.modules.module2.battery.chargeLevel -= (dcAmps / 800);
                    s.modules.module2.battery.chargeLevel = Math.max(0, s.modules.module2.battery.chargeLevel);
                }

                if (activeCount === 1 && s.modules.module2.inverter.loadPct > 120) {
                    if (!s.alarms.includes('M2 OVERLOAD')) s.alarms.push('M2 OVERLOAD');
                }
            } else {
                s.modules.module2.inverter.loadPct = 0;
                s.modules.module2.rectifier.loadPct = 5;
                s.modules.module2.inverter.efficiency = 0;
            }
        } else if (bypass1Available || bypass2Available) {
            // On bypass mode
            s.voltages.loadBus = utilityInput;
            s.modules.module1.inverter.loadPct = 0;
            s.modules.module2.inverter.loadPct = 0;
        } else {
            // No power source available
            s.voltages.loadBus = 0;
            s.modules.module1.inverter.loadPct = 0;
            s.modules.module2.inverter.loadPct = 0;
        }
    }

    // --- THERMAL MODELS ---
    const updateTemp = (currentTemp: number, loadPct: number, isRunning: boolean): number => {
        const targetTemp = isRunning ? (AMBIENT_TEMP + (loadPct * 0.6)) : AMBIENT_TEMP;
        const diff = targetTemp - currentTemp;
        return currentTemp + (diff * (diff > 0 ? THERMAL_MASS : COOLING_FACTOR));
    };

    s.modules.module1.rectifier.temperature = updateTemp(s.modules.module1.rectifier.temperature, s.modules.module1.rectifier.loadPct, s.modules.module1.rectifier.status === ComponentStatus.NORMAL);
    s.modules.module1.inverter.temperature = updateTemp(s.modules.module1.inverter.temperature, s.modules.module1.inverter.loadPct, s.modules.module1.inverter.status === ComponentStatus.NORMAL);

    s.modules.module2.rectifier.temperature = updateTemp(s.modules.module2.rectifier.temperature, s.modules.module2.rectifier.loadPct, s.modules.module2.rectifier.status === ComponentStatus.NORMAL);
    s.modules.module2.inverter.temperature = updateTemp(s.modules.module2.inverter.temperature, s.modules.module2.inverter.loadPct, s.modules.module2.inverter.status === ComponentStatus.NORMAL);

    const batt1Heat = Math.abs(s.modules.module1.battery.current) * 0.1;
    s.modules.module1.battery.temp = Math.max(AMBIENT_TEMP, s.modules.module1.battery.temp + batt1Heat - ((s.modules.module1.battery.temp - AMBIENT_TEMP) * 0.05));

    const batt2Heat = Math.abs(s.modules.module2.battery.current) * 0.1;
    s.modules.module2.battery.temp = Math.max(AMBIENT_TEMP, s.modules.module2.battery.temp + batt2Heat - ((s.modules.module2.battery.temp - AMBIENT_TEMP) * 0.05));

    // --- ALARMS ---
    if (!utilityLive) s.alarms.push('UTILITY FAILURE');
    if (s.modules.module1.battery.chargeLevel < 20) s.alarms.push('M1 BATTERY LOW');
    if (s.modules.module2.battery.chargeLevel < 20) s.alarms.push('M2 BATTERY LOW');
    if (s.modules.module1.rectifier.temperature > 85) s.alarms.push('M1 RECTIFIER OVERTEMP');
    if (s.modules.module2.rectifier.temperature > 85) s.alarms.push('M2 RECTIFIER OVERTEMP');
    if (s.modules.module1.inverter.temperature > 85) s.alarms.push('M1 INVERTER OVERTEMP');
    if (s.modules.module2.inverter.temperature > 85) s.alarms.push('M2 INVERTER OVERTEMP');
    if (s.modules.module1.rectifier.status === ComponentStatus.FAULT) s.alarms.push('M1 RECTIFIER FAULT');
    if (s.modules.module2.rectifier.status === ComponentStatus.FAULT) s.alarms.push('M2 RECTIFIER FAULT');
    if (s.modules.module1.inverter.status === ComponentStatus.FAULT) s.alarms.push('M1 INVERTER FAULT');
    if (s.modules.module2.inverter.status === ComponentStatus.FAULT) s.alarms.push('M2 INVERTER FAULT');
    if (s.voltages.loadBus < 100 && (s.breakers[ParallelBreakerId.Load1] || s.breakers[ParallelBreakerId.Load2])) s.alarms.push('CRITICAL LOAD LOSS');

    return s;
};

// Interlock checking logic (keep existing)
export const checkParallelInterlock = (actionType: string, target: string, value: any, state: ParallelSimulationState): { allowed: boolean; reason?: string } => {
    // Maintenance Bypass Interlock
    if (actionType === 'BREAKER' && (target === ParallelBreakerId.Q3_1 || target === ParallelBreakerId.Q3_2) && value === true) {
        const isM1 = target === ParallelBreakerId.Q3_1;
        const module = isM1 ? state.modules.module1 : state.modules.module2;

        if (module.staticSwitch.mode !== 'BYPASS' && module.inverter.status === ComponentStatus.NORMAL) {
            return { allowed: false, reason: `INTERLOCK: ${isM1 ? 'M1' : 'M2'} STS must be in BYPASS before closing Maint. Bypass.` };
        }
    }

    // Output breaker safety
    if (actionType === 'BREAKER' && (target === ParallelBreakerId.Q4_1 || target === ParallelBreakerId.Q4_2) && value === true) {
        const isM1 = target === ParallelBreakerId.Q4_1;
        const maintBypass = isM1 ? state.breakers[ParallelBreakerId.Q3_1] : state.breakers[ParallelBreakerId.Q3_2];
        const module = isM1 ? state.modules.module1 : state.modules.module2;

        if (maintBypass && module.staticSwitch.mode === 'INVERTER') {
            return { allowed: false, reason: `INTERLOCK: Cannot close ${isM1 ? 'Q4-1' : 'Q4-2'} while Q3 is closed and Inverter is Active.` };
        }
    }

    return { allowed: true };
};