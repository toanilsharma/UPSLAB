
import { ParallelSimulationState, ParallelBreakerId, ComponentStatus, UPSModuleState, ParallelSystemMode } from '../parallel_types';
import { ParallelUPSController } from './ParallelUPSController';

const AMBIENT_TEMP = 22; // Server room temperature
const THERMAL_MASS = 0.08; // Realistic slow heating
const COOLING_FACTOR = 0.015;

/**
 * Calculate Battery Internal Resistance (Ri)
 * Ri increases as charge drops and as temperature deviates from 25°C
 */
function calculateInternalResistance(chargePct: number, temp: number): number {
    const baseRi = 0.015; // 15mOhms nominal for larger parallel string
    const chargeFactor = 1 + Math.pow((100 - chargePct) / 100, 2) * 4;
    const tempFactor = 1 + Math.abs(temp - 25) * 0.015;
    return baseRi * chargeFactor * tempFactor;
}

/**
 * Calculate Total Harmonic Distortion (THD)
 */
function calculateTHD(loadPct: number, isNonLinear: boolean): number {
    if (loadPct <= 0) return 0;
    const baseTHD = isNonLinear ? 4.5 : 1.2;
    const loadFactor = 1 + (100 / (loadPct + 5)) * 0.4;
    return baseTHD * loadFactor;
}

// Process a single module with realistic physics (ported from single module)
function processModule(
    moduleState: UPSModuleState,
    utilityInput: number,
    breakers: { mainInput: boolean; bypassInput: boolean; batteryBreaker: boolean; output: boolean },
    loadAmps: number,
    isLoadNonLinear: boolean,
    now: number,
    dcSource: 'RECT' | 'BATTERY' | 'NONE'
): UPSModuleState {
    const module = JSON.parse(JSON.stringify(moduleState)) as UPSModuleState;

    // --- 1. RECTIFIER PHYSICS: "Walk-in" (Soft Start) Logic ---
    if (module.rectifier.status === ComponentStatus.FAULT) {
        module.rectifier.voltageOut = 0;
        module.rectifier.startTimer = undefined;
    } else if (breakers.mainInput && utilityInput > 400) {
        if (module.rectifier.status === ComponentStatus.STARTING) {
            // PHASE 2: DC PRE-CHARGE & WALK-IN
            if ((module.rectifier.prechargePct || 0) < 100) {
                module.rectifier.prechargePct = Math.min(100, (module.rectifier.prechargePct || 0) + 20);
                module.rectifier.voltageOut = 150 * ((module.rectifier.prechargePct || 0) / 100);
                module.rectifier.startTimer = 5;
            } else {
                module.rectifier.walkInPct = Math.min(100, (module.rectifier.walkInPct || 0) + 5);
                const targetV = 220;
                const startV = 150;
                module.rectifier.voltageOut = startV + (targetV - startV) * ((module.rectifier.walkInPct || 0) / 100);
                module.rectifier.startTimer = Math.ceil((100 - (module.rectifier.walkInPct || 0)) / 5) * 0.2;

                if (module.rectifier.walkInPct === 100) {
                    module.rectifier.status = ComponentStatus.NORMAL;
                    module.rectifier.voltageOut = 220;
                    module.rectifier.startTimer = 0;
                }
            }
        } else if (module.rectifier.status === ComponentStatus.NORMAL) {
            module.rectifier.voltageOut = 220 + (Math.sin(now / 2000) * 0.2);
            module.rectifier.startTimer = 0;
            module.rectifier.prechargePct = 100;
            module.rectifier.walkInPct = 100;
        } else {
            // OFF but Input Live: Capacitors hold charge briefly then decay
            module.rectifier.voltageOut = Math.max(0, module.rectifier.voltageOut * 0.95);
            module.rectifier.startTimer = undefined;
        }
    } else {
        // Input Lost: Fast Decay
        module.rectifier.status = ComponentStatus.OFF;
        module.rectifier.voltageOut = Math.max(0, module.rectifier.voltageOut * 0.90);
        module.rectifier.startTimer = undefined;
    }

    // Rectifier harmonics and PF
    module.rectifier.thd = calculateTHD(module.rectifier.loadPct, false);
    module.rectifier.pf = 0.94 + (module.rectifier.loadPct / 100) * 0.05;
    module.rectifier.kva = (module.rectifier.loadPct * 300 * utilityInput / 1000) / module.rectifier.pf;

    // --- 2. DC BUS & BATTERY PHYSICS ---
    let busV = 0;
    module.battery.current = 0;

    // Determine Dominant DC Source
    if (module.rectifier.voltageOut > 180) {
        busV = module.rectifier.voltageOut;
        dcSource = 'RECT';
    }

    // Battery Interaction & Physics
    if (breakers.batteryBreaker) {
        // Peukert-ish approximation for Open Circuit Voltage based on Charge %
        let battCurveFactor = 1.0;
        if (module.battery.chargeLevel > 90) battCurveFactor = 1.05; // Surface charge
        else if (module.battery.chargeLevel < 20) battCurveFactor = 0.90; // Knee of curve

        const battOpenCircuitV = 155 + ((module.battery.chargeLevel / 100) * (220 - 155) * battCurveFactor);

        // Update Internal Resistance
        module.battery.ri = calculateInternalResistance(module.battery.chargeLevel, module.battery.temp);

        // Terminal Voltage = OCV - (I * Ri)
        // currents.battery is positive for charge, negative for discharge
        const battCurrent = module.rectifier.status === ComponentStatus.NORMAL ? 5 : -loadAmps; // Simplified for processModule
        module.battery.voltage = battOpenCircuitV + (battCurrent * module.battery.ri);

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
        module.inverter.startTimer = undefined;
    } else if (module.dcBusVoltage > 155 && module.inverter.status !== ComponentStatus.OFF) {
        // Inverter needs >155V DC to modulate AC (220V system)
        if (module.inverter.status === ComponentStatus.STARTING) {
            // Increased speed for < 8s startup
            module.inverter.voltageOut += 12;

            // Calculate remaining time: 12V per 200ms tick. Target 415V.
            const remainingVolts = Math.max(0, 415 - module.inverter.voltageOut);
            module.inverter.startTimer = Math.ceil(remainingVolts / 12) * 0.2;

            if (module.inverter.voltageOut >= 415) {
                module.inverter.status = ComponentStatus.NORMAL;
                module.inverter.voltageOut = 415;
                module.inverter.startTimer = 0;
            }
        } else {
            module.inverter.voltageOut = 415 + (Math.sin(now / 1000) * 0.2);
            module.inverter.startTimer = 0;
        }
    } else {
        module.inverter.status = ComponentStatus.OFF;
        module.inverter.voltageOut = 0;
        module.inverter.startTimer = undefined;
    }

    // Inverter harmonics and PF
    module.inverter.thd = calculateTHD(module.inverter.loadPct, isLoadNonLinear);
    module.inverter.pf = 0.88 + (module.inverter.loadPct / 100) * 0.1;
    module.inverter.kva = (module.inverter.loadPct * 120 * 415 / 1000) / module.inverter.pf;

    return module;
}

export const calculateParallelPowerFlow = (prevState: ParallelSimulationState): ParallelSimulationState => {
    const now = Date.now();

    // First run controller FSM
    let s = ParallelUPSController.processTick(prevState);

    // Deep copy for physics
    s = {
        ...s,
        breakers: { ...s.breakers },
        voltages: { ...s.voltages },
        frequencies: { ...s.frequencies },
        modules: {
            module1: JSON.parse(JSON.stringify(s.modules.module1)),
            module2: JSON.parse(JSON.stringify(s.modules.module2))
        },
        faults: { ...s.faults },
        lastTick: now
    };

    // Clear alarms for fresh calculation
    s.alarms = [];

    const utilityInput = s.voltages.utilityInput;
    const utilityLive = utilityInput > 400; // 415V system

    // --- CONTINUOUS SAFETY PROTECTION (Section 5.4) ---
    // Rule: Never allow mixed INVERTER and BYPASS sources on the common load bus.
    const m1InvConnected = s.modules.module1.inverter.status === ComponentStatus.NORMAL &&
        s.modules.module1.staticSwitch.mode === 'INVERTER' &&
        s.breakers[ParallelBreakerId.Q4_1];

    const m2InvConnected = s.modules.module2.inverter.status === ComponentStatus.NORMAL &&
        s.modules.module2.staticSwitch.mode === 'INVERTER' &&
        s.breakers[ParallelBreakerId.Q4_2];

    const m1BypassConnected = s.modules.module1.staticSwitch.mode === 'BYPASS' && s.breakers[ParallelBreakerId.Q4_1];
    const m2BypassConnected = s.modules.module2.staticSwitch.mode === 'BYPASS' && s.breakers[ParallelBreakerId.Q4_2];

    // Scenario 1: M1 is Inverter, M2 stuck on Bypass
    if (m1InvConnected && m2BypassConnected) {
        // Attempt to transfer M2 to Inverter
        if (s.modules.module2.inverter.status === ComponentStatus.NORMAL && s.modules.module2.inverter.voltageOut > 400) {
            s.modules.module2.staticSwitch.mode = 'INVERTER';
            if (!s.alarms.includes('AUTO-SYNC: M2 TRANSFERRED TO INVERTER')) s.alarms.push('AUTO-SYNC: M2 TRANSFERRED TO INVERTER');
        } else {
            // If M2 cannot go to Inverter, MUST ISOLATE IT
            s.breakers[ParallelBreakerId.Q4_2] = false;
            if (!s.alarms.includes('SAFETY ISOLATION: M2 Q4 OPENED')) s.alarms.push('SAFETY ISOLATION: M2 Q4 OPENED to prevent short circuit');
        }
    }

    // Scenario 2: M2 is Inverter, M1 stuck on Bypass
    if (m2InvConnected && m1BypassConnected) {
        // Attempt to transfer M1 to Inverter
        if (s.modules.module1.inverter.status === ComponentStatus.NORMAL && s.modules.module1.inverter.voltageOut > 400) {
            s.modules.module1.staticSwitch.mode = 'INVERTER';
            if (!s.alarms.includes('AUTO-SYNC: M1 TRANSFERRED TO INVERTER')) s.alarms.push('AUTO-SYNC: M1 TRANSFERRED TO INVERTER');
        } else {
            // If M1 cannot go to Inverter, MUST ISOLATE IT
            s.breakers[ParallelBreakerId.Q4_1] = false;
            if (!s.alarms.includes('SAFETY ISOLATION: M1 Q4 OPENED')) s.alarms.push('SAFETY ISOLATION: M1 Q4 OPENED to prevent short circuit');
        }
    }
    // ------------------------------------------------

    // --- LOAD CALCULATION & SHARING ---
    const load1kW = s.breakers[ParallelBreakerId.Load1] ? 60 : 0;
    const load2kW = s.breakers[ParallelBreakerId.Load2] ? 40 : 0;
    const totalLoadkW = load1kW + load2kW;
    s.loadKW = totalLoadkW; // Update system load KW

    // Correct 3-phase current formula: I = P / (sqrt(3) * V * PF)
    const totalLoadAmps = (totalLoadkW * 1000) / (1.732 * 415 * 0.9);

    // --- PHASE & SYNC PHYSICS (Phase 3) ---
    const dt = 0.2; // 200ms
    s.voltages.bypassPhase = (s.voltages.bypassPhase + (s.frequencies.utility * 360 * dt)) % 360;

    const processSync = (module: UPSModuleState) => {
        const bypassAvailable = s.voltages.bypassInput > 400;
        let targetFreq = 50.0;
        if (bypassAvailable && !s.faults.syncDrift) targetFreq = s.frequencies.utility;

        // PLL Frequency adjustment
        const currentFreq = 50.0; // In a real system this would be tracked per module
        module.staticSwitch.syncError = Math.abs(s.voltages.loadPhase - s.voltages.bypassPhase);
        if (module.staticSwitch.syncError > 180) module.staticSwitch.syncError = 360 - module.staticSwitch.syncError;
        
        if (module.staticSwitch.syncError < 2) module.staticSwitch.syncStatus = 'SYNCED';
        else if (module.staticSwitch.syncError < 10) module.staticSwitch.syncStatus = 'DRIFTING';
        else module.staticSwitch.syncStatus = 'OUT_OF_SYNC';
    };

    processSync(s.modules.module1);
    processSync(s.modules.module2);
    
    // Update system load phase (Simplified: follows utility if bypass, else follows master inverter)
    s.voltages.loadPhase = (s.voltages.loadPhase + (s.frequencies.load * 360 * dt)) % 360;

    // Determine active modules and bypass status
    const m1Active = s.modules.module1.inverter.status === ComponentStatus.NORMAL && s.breakers[ParallelBreakerId.Q4_1] && !s.modules.module1.staticSwitch.isIsolated;
    const m2Active = s.modules.module2.inverter.status === ComponentStatus.NORMAL && s.breakers[ParallelBreakerId.Q4_2] && !s.modules.module2.staticSwitch.isIsolated;
    const m1OnBypass = s.modules.module1.staticSwitch.mode === 'BYPASS' && !s.modules.module1.staticSwitch.isIsolated;
    const m2OnBypass = s.modules.module2.staticSwitch.mode === 'BYPASS' && !s.modules.module2.staticSwitch.isIsolated;

    // Assume Load 1 is non-linear
    const isLoadNonLinear = s.breakers[ParallelBreakerId.Load1];

    // --- 2. MODULE 1 PROCESSING ---
    s.modules.module1 = processModule(
        s.modules.module1,
        s.voltages.utilityInput,
        {
            mainInput: s.breakers[ParallelBreakerId.Q1_1],
            bypassInput: s.breakers[ParallelBreakerId.Q2_1],
            batteryBreaker: s.breakers[ParallelBreakerId.QF1_1],
            output: s.breakers[ParallelBreakerId.Q4_1]
        },
        m1Active ? (totalLoadAmps / (m1Active && m2Active ? 2 : 1)) : 0,
        isLoadNonLinear,
        now,
        'NONE'
    );

    // --- 3. MODULE 2 PROCESSING ---
    s.modules.module2 = processModule(
        s.modules.module2,
        s.voltages.utilityInput,
        {
            mainInput: s.breakers[ParallelBreakerId.Q1_2],
            bypassInput: s.breakers[ParallelBreakerId.Q2_2],
            batteryBreaker: s.breakers[ParallelBreakerId.QF1_2],
            output: s.breakers[ParallelBreakerId.Q4_2]
        },
        m2Active ? (totalLoadAmps / (m1Active && m2Active ? 2 : 1)) : 0,
        isLoadNonLinear,
        now,
        'NONE'
    );

    // --- STATIC SWITCH LOGIC FOR EACH MODULE ---
    const processStaticSwitch = (module: UPSModuleState, bypassAvailable: boolean) => {
        const inverterReady = module.inverter.status === ComponentStatus.NORMAL && module.inverter.voltageOut > 400;

        // Calculate sync error
        const freqDiff = Math.abs(50.0 - s.frequencies.utility);
        module.staticSwitch.syncError = module.inverter.status === ComponentStatus.NORMAL && utilityLive
            ? Math.abs(Math.sin(now / 2000)) * 15
            : 0;

        // AUTO-TRANSFER LOGIC
        if (module.staticSwitch.mode === 'INVERTER') {
            // Failover Conditions
            // PARALLEL LOGIC FIX: Do NOT switch to bypass if the other module is holding the load
            const loadBusEnergized = s.voltages.loadBus > 200;

            if (!inverterReady && bypassAvailable) {
                // Only go to bypass if the SYSTEM is losing power.
                // If bus is energized (by parallel peer), stay in Inverter mode (Standby/Isolating)
                if (!loadBusEnergized) {
                    module.staticSwitch.mode = 'BYPASS';
                }
            }
            // Battery depletion auto-transfer
            if (module.battery.chargeLevel < 15 && bypassAvailable && !s.breakers[ParallelBreakerId.Q1_1] && !s.breakers[ParallelBreakerId.Q1_2]) {
                if (!loadBusEnergized) {
                    module.staticSwitch.mode = 'BYPASS';
                }
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
            s.voltages.loadBus = 415;

            // AUTOMATIC LOAD BALANCING WITH REDUNDANCY
            const ampsPerModule = totalLoadAmps / activeCount;

            // Module 1 Load Assignment with Efficiency Curve
            if (sources.includes('M1')) {
                // Rated capacity ~155A for 100kW module
                s.modules.module1.inverter.loadPct = Math.min(100, (ampsPerModule / 155) * 100);
                s.modules.module1.rectifier.loadPct = (ampsPerModule / 155) * 100;

                // Inverter Efficiency Curve
                const loadFactor = s.modules.module1.inverter.loadPct / 100;
                s.modules.module1.inverter.efficiency = Math.min(0.96, Math.max(0.85, 0.96 - (0.1 * Math.pow(1 - loadFactor, 2))));

                // Battery discharge if on battery
                if (s.modules.module1.dcBusVoltage < 500 && s.modules.module1.battery.chargeLevel > 0) {
                    const powerRequired = (ampsPerModule * 400) / s.modules.module1.inverter.efficiency;
                    const dcAmps = powerRequired / s.modules.module1.dcBusVoltage;
                    s.modules.module1.battery.current = -dcAmps;
                    // Adjusted for >30min runtime: Slow down discharge rate significantly
                    s.modules.module1.battery.chargeLevel -= (dcAmps / 5000);
                    s.modules.module1.battery.chargeLevel = Math.max(0, s.modules.module1.battery.chargeLevel);
                }

                if (activeCount === 1 && s.modules.module1.inverter.loadPct > 120) {
                    if (!s.alarms.includes('M1 OVERLOAD')) s.alarms.push('M1 OVERLOAD');
                }
            } else {
                s.modules.module1.inverter.loadPct = 0;
                s.modules.module1.rectifier.loadPct = 5; // Idle charging
                s.modules.module1.inverter.efficiency = 0;
                // If isolated or inactive, ensure battery is not discharging
                if (s.modules.module1.battery.current < 0) s.modules.module1.battery.current = 0;
            }

            // Module 2 Load Assignment with Efficiency Curve
            if (sources.includes('M2')) {
                s.modules.module2.inverter.loadPct = Math.min(100, (ampsPerModule / 155) * 100);
                s.modules.module2.rectifier.loadPct = (ampsPerModule / 155) * 100;

                // Inverter Efficiency Curve
                const loadFactor = s.modules.module2.inverter.loadPct / 100;
                s.modules.module2.inverter.efficiency = Math.min(0.96, Math.max(0.85, 0.96 - (0.1 * Math.pow(1 - loadFactor, 2))));

                // Battery discharge if on battery
                if (s.modules.module2.dcBusVoltage < 500 && s.modules.module2.battery.chargeLevel > 0) {
                    const powerRequired = (ampsPerModule * 400) / s.modules.module2.inverter.efficiency;
                    const dcAmps = powerRequired / s.modules.module2.dcBusVoltage;
                    s.modules.module2.battery.current = -dcAmps;
                    // Adjusted for >30min runtime
                    s.modules.module2.battery.chargeLevel -= (dcAmps / 5000);
                    s.modules.module2.battery.chargeLevel = Math.max(0, s.modules.module2.battery.chargeLevel);
                }

                if (activeCount === 1 && s.modules.module2.inverter.loadPct > 120) {
                    if (!s.alarms.includes('M2 OVERLOAD')) s.alarms.push('M2 OVERLOAD');
                }
            } else {
                s.modules.module2.inverter.loadPct = 0;
                s.modules.module2.rectifier.loadPct = 5;
                s.modules.module2.inverter.efficiency = 0;
                // If isolated or inactive, ensure battery is not discharging
                if (s.modules.module2.battery.current < 0) s.modules.module2.battery.current = 0;
            }
        } else {
            // Check if Bypass can energize the bus
            // Condition: Utility is live AND (STS is in BYPASS AND Output Breaker Q4 is CLOSED) for at least one module
            const m1BypassActive = bypass1Available && s.modules.module1.staticSwitch.mode === 'BYPASS' && s.breakers[ParallelBreakerId.Q4_1];
            const m2BypassActive = bypass2Available && s.modules.module2.staticSwitch.mode === 'BYPASS' && s.breakers[ParallelBreakerId.Q4_2];

            if (m1BypassActive || m2BypassActive) {
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
    }

    // Update System-Wide Parallel Metrics
    const activeCount = (m1Active ? 1 : 0) + (m2Active ? 1 : 0);
    if (activeCount > 0) {
        s.kva = (m1Active ? (s.modules.module1.inverter.kva || 0) : 0) +
                (m2Active ? (s.modules.module2.inverter.kva || 0) : 0);
        s.pf = (m1Active ? (s.modules.module1.inverter.pf || 0) : 0) / activeCount +
               (m2Active ? (s.modules.module2.inverter.pf || 0) : 0) / activeCount;
        s.thd = (m1Active ? (s.modules.module1.inverter.thd || 0) : 0) / activeCount +
                (m2Active ? (s.modules.module2.inverter.thd || 0) : 0) / activeCount;

        // System Reactive Power (kVAr)
        const totalKW = s.loadKW;
        const totalKVA = s.kva;
        s.currents.kvar = Math.sqrt(Math.max(0, Math.pow(totalKVA, 2) - Math.pow(totalKW, 2)));
    } else {
        s.kva = 0;
        s.pf = 1.0;
        s.thd = 0;
        s.currents.kvar = 0;
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
    // Clear alarms array first and rebuild based on current state
    s.alarms = [];

    // Utility power alarms
    if (!utilityLive) s.alarms.push('UTILITY FAILURE');

    // Battery alarms
    if (s.modules.module1.battery.chargeLevel < 20) s.alarms.push('M1 BATTERY LOW');
    if (s.modules.module2.battery.chargeLevel < 20) s.alarms.push('M2 BATTERY LOW');
    if (s.modules.module1.battery.current < -10) s.alarms.push('M1 ON BATTERY');
    if (s.modules.module2.battery.current < -10) s.alarms.push('M2 ON BATTERY');

    // Temperature alarms  
    if (s.modules.module1.rectifier.temperature > 85) s.alarms.push('M1 RECTIFIER OVERTEMP');
    if (s.modules.module2.rectifier.temperature > 85) s.alarms.push('M2 RECTIFIER OVERTEMP');
    if (s.modules.module1.inverter.temperature > 85) s.alarms.push('M1 INVERTER OVERTEMP');
    if (s.modules.module2.inverter.temperature > 85) s.alarms.push('M2 INVERTER OVERTEMP');

    // Component fault alarms
    if (s.modules.module1.rectifier.status === ComponentStatus.FAULT) s.alarms.push('M1 RECTIFIER FAULT');
    if (s.modules.module2.rectifier.status === ComponentStatus.FAULT) s.alarms.push('M2 RECTIFIER FAULT');
    if (s.modules.module1.inverter.status === ComponentStatus.FAULT) s.alarms.push('M1 INVERTER FAULT');
    if (s.modules.module2.inverter.status === ComponentStatus.FAULT) s.alarms.push('M2 INVERTER FAULT');

    // Load bus alarm
    if (s.voltages.loadBus < 100 && (s.breakers[ParallelBreakerId.Load1] || s.breakers[ParallelBreakerId.Load2])) {
        s.alarms.push('CRITICAL LOAD LOSS');
    }

    // --- STANDBY MODE DETECTION ---
    // Module 1 standby conditions
    const m1InputOff = !s.breakers[ParallelBreakerId.Q1_1];
    const m1RectOff = s.modules.module1.rectifier.status === ComponentStatus.OFF;
    const m1InvOff = s.modules.module1.inverter.status === ComponentStatus.OFF;

    if (m1InputOff || m1RectOff) {
        if (m1InputOff) s.alarms.push('M1 INPUT BREAKER OPEN');
        if (m1RectOff && !m1InputOff) s.alarms.push('M1 RECTIFIER OFF');
        if (m1InvOff) s.alarms.push('M1 STANDBY');
    }

    // Module 2 standby conditions
    const m2InputOff = !s.breakers[ParallelBreakerId.Q1_2];
    const m2RectOff = s.modules.module2.rectifier.status === ComponentStatus.OFF;
    const m2InvOff = s.modules.module2.inverter.status === ComponentStatus.OFF;

    if (m2InputOff || m2RectOff) {
        if (m2InputOff) s.alarms.push('M2 INPUT BREAKER OPEN');
        if (m2RectOff && !m2InputOff) s.alarms.push('M2 RECTIFIER OFF');
        if (m2InvOff) s.alarms.push('M2 STANDBY');
    }

    // Bypass mode alarms
    if (s.modules.module1.staticSwitch.mode === 'BYPASS') s.alarms.push('M1 ON BYPASS');
    if (s.modules.module2.staticSwitch.mode === 'BYPASS') s.alarms.push('M2 ON BYPASS');

    // Redundancy check
    const m1Operating = s.modules.module1.inverter.status === ComponentStatus.NORMAL && s.breakers[ParallelBreakerId.Q4_1];
    const m2Operating = s.modules.module2.inverter.status === ComponentStatus.NORMAL && s.breakers[ParallelBreakerId.Q4_2];

    if ((m1Operating && !m2Operating) || (!m1Operating && m2Operating)) {
        s.alarms.push('REDUNDANCY LOST - SINGLE MODULE');
    }
    if (!m1Operating && !m2Operating && s.voltages.loadBus > 50) {
        s.alarms.push('SYSTEM ON BYPASS - NO INVERTER');
    }

    // System Mode Alarms
    if (s.systemMode === ParallelSystemMode.EMERGENCY_SHUTDOWN) {
        s.alarms.push('CRITICAL: EMERGENCY SHUTDOWN ACTIVE');
    }
    if (s.systemMode === ParallelSystemMode.BATTERY_PARALLEL) {
        s.alarms.push('SYSTEM: PARALLEL BATTERY OPERATION');
    }
    if (s.systemMode === ParallelSystemMode.DEGRADED_REDUNDANCY) {
        s.alarms.push('SYSTEM: REDUNDANCY DEGRADED');
    }
    if (s.systemMode === ParallelSystemMode.STATIC_BYPASS) {
        s.alarms.push('SYSTEM: ON STATIC BYPASS');
    }
    if (s.systemMode === ParallelSystemMode.MAINT_BYPASS) {
        s.alarms.push('SYSTEM: MAINTENANCE BYPASS ACTIVE');
    }

    // Fault Alarms
    if (s.faults.epo) s.alarms.push('CRITICAL: EPO ACTIVATED');
    if (s.faults.mainsFailure) s.alarms.push('ALARM: UTILITY POWER FAILURE');

    return s;
};

// Interlock checking logic - uses ParallelUPSController
export const checkParallelInterlock = (actionType: string, target: string, value: any, state: ParallelSimulationState): { allowed: boolean; reason?: string } => {

    // For breaker actions, use the controller's comprehensive interlock check
    if (actionType === 'BREAKER') {
        const isClosing = value === true;
        return ParallelUPSController.checkBreakerPermission(target as ParallelBreakerId, isClosing, state);
    }

    return { allowed: true };
};