

import { SimulationState, BreakerId, ComponentStatus } from '../types';

const AMBIENT_TEMP = 22; // Server room temp
const THERMAL_MASS = 0.08; // Increased thermal mass for more realistic slow heating
const COOLING_FACTOR = 0.015;

// ADVANCED BATTERY PHYSICS CONSTANTS
const NOMINAL_DISCHARGE_RATE_C = 10; // C/10 rate (10A for 100Ah battery)
const TEMP_COEFFICIENT = 0.006; // 0.6% per °C capacity change
const NOMINAL_TEMP = 25; // °C
const MAX_CYCLES = 1500; // Typical VRLA lifespan

/**
 * Calculate effective capacity using Peukert's Law
 * Formula: Effective_Capacity = Nominal_Capacity × (C/I)^(n-1)
 * Where:
 * - C = nominal discharge rate (C/10 = 10A for 100Ah)
 * - I = actual discharge current
 * - n = Peukert exponent (1.15 for VRLA)
 */
function calculatePeukertCapacity(
    nominalCapacityAh: number,
    peukertExponent: number,
    dischargeCurrent: number
): number {
    if (dischargeCurrent <= 0) return nominalCapacityAh;

    const nominalRate = nominalCapacityAh / NOMINAL_DISCHARGE_RATE_C; // C/10
    const rateRatio = nominalRate / dischargeCurrent;
    const effectiveCapacity = nominalCapacityAh * Math.pow(rateRatio, peukertExponent - 1);

    return effectiveCapacity;
}

/**
 * Calculate temperature effect on battery capacity
 * Capacity decreases ~0.6% per °C below 25°C
 * Capacity increases ~0.6% per °C above 25°C (but reduces lifespan)
 */
function calculateTemperatureEffect(tempCelsius: number): number {
    const tempDelta = tempCelsius - NOMINAL_TEMP;
    return 1 + (TEMP_COEFFICIENT * tempDelta);
}

/**
 * Calculate State of Health based on cycle count
 * Typical VRLA degrades to 80% capacity at 1500 cycles
 */
function calculateStateOfHealth(cycleCount: number): number {
    const healthPct = 100 - ((cycleCount / MAX_CYCLES) * 20);
    return Math.max(80, Math.min(100, healthPct));
}

export const calculatePowerFlow = (prevState: SimulationState): SimulationState => {
    const now = Date.now();

    const s: SimulationState = {
        ...prevState,
        breakers: { ...prevState.breakers },
        voltages: { ...prevState.voltages },
        currents: { ...prevState.currents },
        frequencies: { ...prevState.frequencies },
        battery: { ...prevState.battery },
        components: {
            rectifier: { ...prevState.components.rectifier },
            inverter: { ...prevState.components.inverter },
            staticSwitch: { ...prevState.components.staticSwitch }
        },
        alarms: [],
        faults: { ...prevState.faults },
        lastTick: now
    };

    const b = s.breakers;

    // --- 1. INPUT STAGE ---
    const utilityLive = s.voltages.utilityInput > 400; // 415V nominal, 400V undervoltage threshold

    // Rectifier Physics: "Walk-in" (Soft Start) Logic
    // First check for terminal states (FAULT or OFF)
    if (s.components.rectifier.status === ComponentStatus.FAULT) {
        s.components.rectifier.voltageOut = 0;
    } else if (s.components.rectifier.status === ComponentStatus.OFF) {
        // OFF but Input may be Live: Capacitors hold charge briefly then decay
        s.components.rectifier.voltageOut = Math.max(0, s.components.rectifier.voltageOut * 0.95);
    } else if (b[BreakerId.Q1] && utilityLive) {
        if (s.components.rectifier.status === ComponentStatus.STARTING) {
            // Linear Ramp Up (Walk-in) - 5 seconds to full voltage
            s.components.rectifier.voltageOut += 2;
            if (s.components.rectifier.voltageOut >= 220) {
                s.components.rectifier.status = ComponentStatus.NORMAL;
                s.components.rectifier.voltageOut = 220;
            }
        } else if (s.components.rectifier.status === ComponentStatus.NORMAL) {
            // PID Simulation: Slight fluctuation around setpoint
            s.components.rectifier.voltageOut = 220 + (Math.sin(now / 2000) * 0.2);
        }
    } else {
        // Input Lost: Set to OFF and Fast Decay
        s.components.rectifier.status = ComponentStatus.OFF;
        s.components.rectifier.voltageOut = Math.max(0, s.components.rectifier.voltageOut * 0.90);
    }

    // --- 2. DC BUS & BATTERY PHYSICS ---
    const batteryConnected = b[BreakerId.QF1];
    let dcSource = 'NONE';
    let busV = 0;

    // Determine Dominant DC Source
    // Rectifier is "Stiffer" source usually set higher than float voltage
    // CRITICAL: Rectifier must be OPERATING (not just have residual voltage) to be the DC source
    const rectifierOperating = s.components.rectifier.status === ComponentStatus.NORMAL &&
        b[BreakerId.Q1] &&
        s.voltages.utilityInput > 400;

    if (rectifierOperating && s.components.rectifier.voltageOut > 180) {
        busV = s.components.rectifier.voltageOut;
        dcSource = 'RECTIFIER';
    }

    // Battery Interaction & Physics Curve
    s.currents.battery = 0;
    if (batteryConnected) {
        // Peukert-ish approximation for Open Circuit Voltage based on Charge %
        // 100% = 220V (Float), 0% = 155V (Cutoff) for 220V DC system
        // Non-linear curve: V drops fast at 100->90, plateaus, then drops fast 20->0
        let battCurveFactor = 1.0;
        if (s.battery.chargeLevel > 90) battCurveFactor = 1.05; // Surface charge
        else if (s.battery.chargeLevel < 20) battCurveFactor = 0.90; // Knee of curve

        const battOpenCircuitV = 155 + ((s.battery.chargeLevel / 100) * (220 - 155) * battCurveFactor);

        if (dcSource === 'RECTIFIER') {
            // CHARGING LOGIC
            if (s.battery.chargeLevel < 100) {
                // Bulk Charge vs Float Charge
                const voltageDiff = Math.max(0, busV - battOpenCircuitV);
                s.currents.battery = voltageDiff * 0.5; // Internal Resistance simulation

                // Load the DC bus slightly
                busV -= s.currents.battery * 0.05;

                // Charge Accumulation
                s.battery.chargeLevel += (s.currents.battery / 1000);
            } else {
                s.currents.battery = 0.2; // Float maintenance
            }
        } else {
            // DISCHARGING LOGIC (Battery is the Source)
            if (s.battery.chargeLevel > 0) {
                busV = battOpenCircuitV;
                dcSource = 'BATTERY';
                // Discharge current calculated in Output Stage based on Load
            } else {
                busV = 0; // Dead Battery
            }
        }
    } else if (dcSource === 'NONE') {
        // DC Link Capacitor Discharge (No battery, no rectifier)
        // Decays based on previous tick voltage
        busV = Math.max(0, s.voltages.dcBus * 0.92);
    }

    s.voltages.dcBus = busV;

    // --- FAULT: DC LINK CAPACITOR FAILURE (IEC 62040-3 §6.4) ---
    // Simulates capacitor ESR increase/failure causing 100Hz ripple (2× line frequency)
    // Ripple amplitude increases, may cause inverter undervoltage during troughs
    if (s.faults.dcLinkCapacitorFailure && s.voltages.dcBus > 0) {
        // 100Hz ripple with ±50V amplitude (severe degradation)
        const ripple100Hz = Math.sin((now / 1000) * 2 * Math.PI * 100) * 50;
        s.voltages.dcBus = Math.max(0, s.voltages.dcBus + ripple100Hz);
    }

    // --- 3. INVERTER PHYSICS ---
    // First check if inverter is in a terminal state (FAULT or OFF)
    if (s.components.inverter.status === ComponentStatus.FAULT || s.components.inverter.status === ComponentStatus.OFF) {
        s.components.inverter.voltageOut = 0;
        // Don't change status - let controller manage it
    } else if (s.voltages.dcBus > 155) {
        // Inverter needs >155V DC to modulate AC (220V system)
        if (s.components.inverter.status === ComponentStatus.STARTING) {
            s.components.inverter.voltageOut += 10;
            s.frequencies.inverter = 45 + (Math.random() * 2);
            if (s.components.inverter.voltageOut >= 415) {
                s.components.inverter.status = ComponentStatus.NORMAL;
                s.components.inverter.voltageOut = 415;
            }
        } else {
            s.components.inverter.voltageOut = 415 + (Math.sin(now / 1000) * 0.2);
            // Frequency drifts slightly if on Battery, locked if on Mains (PLL simulation)
            if (dcSource === 'BATTERY') {
                s.frequencies.inverter = 50.0 + (Math.sin(now / 5000) * 0.1);
            } else {
                s.frequencies.inverter = 50.0;
            }

            // --- FAULT: SYNCHRONIZATION DRIFT (IEC 62040-3 §5.3.4) ---
            // VFI tolerance is ±0.5% (49.75-50.25Hz). This fault causes PLL to lose lock.
            // Inverter frequency drifts outside tolerance, blocking safe transfer.
            if (s.faults.syncDrift) {
                // Frequency oscillates between 48Hz and 52Hz (well outside ±0.5%)
                const driftAmount = Math.sin(now / 3000) * 2.5; // ±2.5Hz drift
                s.frequencies.inverter = 50.0 + driftAmount;
            }
        }
    } else {
        // DC Bus too low - inverter cannot run, but don't override FAULT from controller
        s.components.inverter.voltageOut = 0;
        // Only set to OFF if it was trying to run (STARTING or NORMAL)
        if (s.components.inverter.status === ComponentStatus.STARTING ||
            s.components.inverter.status === ComponentStatus.NORMAL) {
            s.components.inverter.status = ComponentStatus.OFF;
        }
    }

    // --- 4. STATIC SWITCH (STS) ---
    const bypassLive = s.voltages.bypassInput > 400; // 415V system
    const q2Closed = b[BreakerId.Q2];
    const bypassAvailable = bypassLive && q2Closed;

    // Phase Synchronization Logic
    // If Inverter is running and Mains is present, calculate phase error
    const freqDiff = Math.abs(s.frequencies.inverter - s.frequencies.utility);
    let syncError = 0;
    if (s.components.inverter.status === ComponentStatus.NORMAL && utilityLive) {
        // Simulated beating frequency of phase angle
        syncError = Math.abs(Math.sin(now / 2000)) * 15;
    }
    s.components.staticSwitch.syncError = syncError;

    const inverterReady = s.components.inverter.status === ComponentStatus.NORMAL && s.components.inverter.voltageOut > 400;

    // AUTO-TRANSFER LOGIC
    if (s.components.staticSwitch.mode === 'INVERTER') {
        // Failover Conditions
        if (!inverterReady && bypassAvailable) {
            s.components.staticSwitch.mode = 'BYPASS';
            s.alarms.push('AUTO-TRANSFER: INV FAIL');
        }
    } else {
        // AUTO-RETRANSFER Logic
        // Only if: Inverter Good AND Sync Good AND Not Forced AND Sync Error Low
        // Block if sync drift fault is active (IEC 62040-3 VFI tolerance violation)
        const freqInTolerance = Math.abs(s.frequencies.inverter - 50.0) <= 0.25; // ±0.5%
        if (inverterReady && syncError < 5 && !s.components.staticSwitch.forceBypass && freqInTolerance) {
            // Simulating a "Wait time" could go here, but instant for now
            s.components.staticSwitch.mode = 'INVERTER';
        }
    }

    // Calculate STS Output
    let outputV = 0;
    let sourceUsed = 'NONE';

    if (s.components.staticSwitch.mode === 'INVERTER') {
        outputV = s.components.inverter.voltageOut;
        sourceUsed = 'INVERTER';
    } else {
        outputV = bypassAvailable ? s.voltages.bypassInput : 0;
        sourceUsed = 'BYPASS';
    }

    // --- 5. OUTPUT & LOAD ---
    const q3Closed = b[BreakerId.Q3];
    const q4Closed = b[BreakerId.Q4];

    // Maintenance Bypass Override
    if (q3Closed && s.voltages.utilityInput > 0) {
        outputV = Math.max(outputV, s.voltages.utilityInput);
    }

    // Load Bus Logic
    if (!q4Closed && !q3Closed) {
        s.voltages.loadBus = 0;
    } else {
        s.voltages.loadBus = outputV;
    }

    // Load Calculation
    const load1 = b[BreakerId.Load1] ? 60 : 0; // Load A is bigger
    const load2 = b[BreakerId.Load2] ? 40 : 0;
    const totalLoadAmps = (s.voltages.loadBus > 200) ? (load1 + load2) : 0;

    s.currents.output = totalLoadAmps;

    // --- 6. THERMAL & EFFICIENCY PHYSICS ---
    let invLoad = 0;
    let rectLoad = 0;

    if (sourceUsed === 'INVERTER' && q4Closed) {
        invLoad = totalLoadAmps;
        // Inverter Efficiency Curve (Lower efficiency at low load)
        const invLoadFactor = invLoad / 120; // 0.0 to 1.0
        const invEff = 0.96 - (0.1 * Math.pow(1 - invLoadFactor, 2)); // Quadratic curve
        s.components.inverter.efficiency = Math.min(0.96, Math.max(0.85, invEff));

        const powerRequired = (invLoad * s.voltages.loadBus) / s.components.inverter.efficiency;
        rectLoad = powerRequired / s.voltages.dcBus; // DC Amps

        if (dcSource === 'BATTERY') {
            s.currents.battery = -rectLoad;

            // ADVANCED BATTERY DISCHARGE with Peukert's Law
            const dischargeCurrent = Math.abs(rectLoad);

            // Calculate effective capacity based on discharge rate
            s.battery.effectiveCapacityAh = calculatePeukertCapacity(
                s.battery.nominalCapacityAh,
                s.battery.peukertExponent,
                dischargeCurrent
            );

            // Apply temperature compensation
            const tempEffect = calculateTemperatureEffect(s.battery.temp);
            const adjustedCapacity = s.battery.effectiveCapacityAh * tempEffect;

            // Calculate SOH based on cycle count
            s.battery.health = calculateStateOfHealth(s.battery.cycleCount);
            const sohEffect = s.battery.health / 100;

            // Final effective capacity with all factors
            const finalCapacity = adjustedCapacity * sohEffect;

            // REALISTIC DISCHARGE CALCULATION
            // Tick interval: 200ms = 0.2 seconds
            // For 30 minutes backup: 30 min × 60 sec = 1800 seconds total
            // 100Ah battery at typical 50A load: 100Ah/50A = 2 hours = 7200 seconds
            // 
            // Formula: ΔCharge(%) = (Current × Time) / Capacity × 100
            // Time per tick in hours: 0.2s / 3600s = 0.0000556 hours
            // 
            // For SIMULATION SPEEDUP: Multiply by a time acceleration factor
            // Real-time: factor = 1 (actual 2 hours backup at 50A)
            // 4x speedup: factor = 4 (simulated 30 min = real 2 hour backup)
            // 60x speedup: factor = 60 (simulated 2 min = real 2 hour backup)
            const SIMULATION_TIME_FACTOR = 4; // 4x speedup for ~30 min training backup
            const TICK_HOURS = 0.2 / 3600; // 200ms in hours

            const dischargeAh = dischargeCurrent * TICK_HOURS * SIMULATION_TIME_FACTOR;
            const dischargePercent = (dischargeAh / finalCapacity) * 100;

            s.battery.chargeLevel -= dischargePercent;
            s.battery.chargeLevel = Math.max(0, s.battery.chargeLevel);

            // Track cycle count (increment by small amount each discharge tick)
            if (s.battery.chargeLevel > 0) {
                s.battery.cycleCount += 0.0001; // Gradual cycle accumulation
            }
        } else {
            rectLoad += s.currents.battery;
        }
    } else {
        s.components.inverter.efficiency = 0;
    }

    s.components.inverter.loadPct = (invLoad / 120) * 100;
    s.components.rectifier.loadPct = (rectLoad / 300) * 100; // 300A rating for 220V DC system

    // Thermal Models
    const updateTemp = (currentTemp: number, loadPct: number, isRunning: boolean): number => {
        const targetTemp = isRunning ? (AMBIENT_TEMP + (loadPct * 0.6)) : AMBIENT_TEMP;
        const diff = targetTemp - currentTemp;
        return currentTemp + (diff * (diff > 0 ? THERMAL_MASS : COOLING_FACTOR));
    };

    s.components.rectifier.temperature = updateTemp(s.components.rectifier.temperature, s.components.rectifier.loadPct, s.components.rectifier.status === ComponentStatus.NORMAL);
    s.components.inverter.temperature = updateTemp(s.components.inverter.temperature, s.components.inverter.loadPct, s.components.inverter.status === ComponentStatus.NORMAL);

    const battHeat = Math.abs(s.currents.battery) * 0.1;
    s.battery.temp = Math.max(AMBIENT_TEMP, s.battery.temp + battHeat - ((s.battery.temp - AMBIENT_TEMP) * 0.05));

    // --- 7. ALARMS ---
    if (!utilityLive) s.alarms.push('UTILITY FAILURE');
    if (s.battery.chargeLevel < 20) s.alarms.push('BATTERY LOW');
    if (s.components.rectifier.temperature > 85) s.alarms.push('RECTIFIER OVERTEMP');
    if (s.components.inverter.temperature > 85) s.alarms.push('INVERTER OVERTEMP');
    if (s.components.rectifier.status === ComponentStatus.FAULT) s.alarms.push('RECTIFIER FAULT');
    if (s.components.inverter.status === ComponentStatus.FAULT) s.alarms.push('INVERTER FAULT');
    if (s.voltages.loadBus < 100 && (b[BreakerId.Load1] || b[BreakerId.Load2])) s.alarms.push('CRITICAL LOAD LOSS');
    if (s.battery.temp > 45) s.alarms.push('BATTERY OVERTEMP');

    // --- FAULT ALARMS (IEC 62040-3 / IEEE 142) ---
    if (s.faults.dcLinkCapacitorFailure) {
        s.alarms.push('DC LINK CAPACITOR ALARM');
        // Check if ripple is causing undervoltage trips
        if (s.voltages.dcBus < 155) {
            s.alarms.push('DC BUS UNDERVOLTAGE');
        }
    }
    if (s.faults.groundFault) {
        // IEEE 142 High-Resistance Grounding: Alarm only, allows continued operation
        s.alarms.push('GROUND FAULT DETECTED (IEEE 142)');
    }
    if (s.faults.syncDrift) {
        const freqDeviation = Math.abs(s.frequencies.inverter - 50.0);
        if (freqDeviation > 0.25) { // Outside VFI ±0.5% tolerance
            s.alarms.push('SYNC ERROR - TRANSFER BLOCKED');
        }
    }

    return s;
};

export const checkInterlock = (actionType: string, target: string, value: any, state: SimulationState): { allowed: boolean; reason?: string } => {
    // Mechanical Interlock: Q3 vs Static Switch
    if (actionType === 'BREAKER' && target === BreakerId.Q3 && value === true) {
        if (state.components.staticSwitch.mode !== 'BYPASS' && state.components.inverter.status === ComponentStatus.NORMAL) {
            return { allowed: false, reason: 'INTERLOCK: STS must be in BYPASS before closing Maint. Bypass.' };
        }
    }

    // Safety: Prevent paralleling Inverter and Maintenance Bypass
    if (actionType === 'BREAKER' && target === BreakerId.Q4 && value === true) {
        if (state.breakers[BreakerId.Q3] && state.components.staticSwitch.mode === 'INVERTER') {
            return { allowed: false, reason: 'INTERLOCK: Cannot close Output Breaker while Q3 is closed and Inverter is Active.' };
        }
    }

    // Warning: Load Drop
    if (actionType === 'BREAKER' && target === BreakerId.Q4 && value === false) {
        if (!state.breakers[BreakerId.Q3] && state.voltages.loadBus > 0) {
            return { allowed: true, reason: 'WARNING: Opening Q4 will drop the Critical Load!' };
        }
    }

    return { allowed: true };
};
