
import { ParallelSimulationState, ParallelBreakerId, ComponentStatus, UPSModuleState } from '../parallel_types';

const AMBIENT_TEMP = 22;
const THERMAL_MASS = 0.08;
const COOLING_FACTOR = 0.015;

const updateTemp = (currentTemp: number, loadPct: number, isRunning: boolean): number => {
    const targetTemp = isRunning ? (AMBIENT_TEMP + (loadPct * 0.6)) : AMBIENT_TEMP;
    const diff = targetTemp - currentTemp;
    return currentTemp + (diff * (diff > 0 ? THERMAL_MASS : COOLING_FACTOR));
};

const calculateModulePhysics = (
    mod: UPSModuleState,
    inputBreakerClosed: boolean,
    batteryBreakerClosed: boolean,
    utilityVoltage: number,
    loadSharePct: number,
    now: number
): UPSModuleState => {
    const next = { ...mod };

    // 1. RECTIFIER
    if (next.rectifier.status === ComponentStatus.FAULT) {
        next.rectifier.voltageOut = 0;
    } else if (inputBreakerClosed && utilityVoltage > 380) {
        if (next.rectifier.status === ComponentStatus.STARTING) {
            next.rectifier.voltageOut += 3;
            if (next.rectifier.voltageOut >= 540) {
                next.rectifier.status = ComponentStatus.NORMAL;
                next.rectifier.voltageOut = 540;
            }
        } else if (next.rectifier.status === ComponentStatus.NORMAL) {
            next.rectifier.voltageOut = 540 + (Math.sin(now / 2000 + (Math.random())) * 0.2);
        } else {
            next.rectifier.voltageOut *= 0.95;
        }
    } else {
        next.rectifier.status = ComponentStatus.OFF;
        next.rectifier.voltageOut *= 0.90;
    }

    // 2. DC BUS
    let dcSource = 'NONE';
    if (next.rectifier.voltageOut > 400) {
        next.dcBusVoltage = next.rectifier.voltageOut;
        dcSource = 'RECTIFIER';
    } else if (batteryBreakerClosed && next.battery.chargeLevel > 0) {
        // Battery discharging
        next.dcBusVoltage = 380 + ((next.battery.chargeLevel / 100) * 160);
        dcSource = 'BATTERY';
    } else {
        next.dcBusVoltage *= 0.92;
    }

    // 3. BATTERY CHARGING/DISCHARGING is handled in main loop based on load

    // 4. INVERTER
    if (next.inverter.status === ComponentStatus.FAULT) {
        next.inverter.voltageOut = 0;
    } else if (next.dcBusVoltage > 350 && next.inverter.status !== ComponentStatus.OFF) {
        if (next.inverter.status === ComponentStatus.STARTING) {
            next.inverter.voltageOut += 10;
            if (next.inverter.voltageOut >= 400) {
                next.inverter.status = ComponentStatus.NORMAL;
                next.inverter.voltageOut = 400;
            }
        } else {
            next.inverter.voltageOut = 400;
        }
    } else {
        next.inverter.status = ComponentStatus.OFF;
        next.inverter.voltageOut = 0;
    }

    // 5. STS
    // Auto-transfer logic would go here, simplified for now
    if (next.staticSwitch.mode === 'INVERTER' && next.inverter.status !== ComponentStatus.NORMAL) {
        next.staticSwitch.mode = 'BYPASS';
    }

    // Thermal
    next.rectifier.temperature = updateTemp(next.rectifier.temperature, next.rectifier.loadPct, next.rectifier.status === ComponentStatus.NORMAL);
    next.inverter.temperature = updateTemp(next.inverter.temperature, next.inverter.loadPct, next.inverter.status === ComponentStatus.NORMAL);

    return next;
};

export const calculateParallelPowerFlow = (prevState: ParallelSimulationState): ParallelSimulationState => {
    const now = Date.now();
    const s = JSON.parse(JSON.stringify(prevState)) as ParallelSimulationState;
    s.lastTick = now;

    // Load Calculation
    const loadAmps = (s.breakers[ParallelBreakerId.Load1] ? 110 : 0) + (s.breakers[ParallelBreakerId.Load2] ? 80 : 0);
    s.currents.totalOutput = loadAmps;

    // Determine Active Sources for Load Bus
    let sources = [];
    if (s.breakers[ParallelBreakerId.Q4_1]) sources.push('M1');
    if (s.breakers[ParallelBreakerId.Q4_2]) sources.push('M2');

    // Maint Bypass Override
    const m1Bypass = s.breakers[ParallelBreakerId.Q3_1];
    const m2Bypass = s.breakers[ParallelBreakerId.Q3_2];

    if (m1Bypass || m2Bypass) {
        s.voltages.loadBus = s.voltages.utilityInput;
        // Load is on Bypass
        s.modules.module1.inverter.loadPct = 0;
        s.modules.module2.inverter.loadPct = 0;
        s.modules.module1.rectifier.loadPct = 10; // Idle
        s.modules.module2.rectifier.loadPct = 10;
    } else {
        // Normal Operation
        const activeCount = sources.length;
        if (activeCount > 0) {
            s.voltages.loadBus = 400; // Simplified
            const ampsPerModule = loadAmps / activeCount;

            // Apply Physics to Modules
            sources.forEach(src => {
                if (src === 'M1') {
                    s.modules.module1.inverter.loadPct = (ampsPerModule / 120) * 100;
                    s.modules.module1.rectifier.loadPct = (ampsPerModule / 140) * 100;
                }
                if (src === 'M2') {
                    s.modules.module2.inverter.loadPct = (ampsPerModule / 120) * 100;
                    s.modules.module2.rectifier.loadPct = (ampsPerModule / 140) * 100;
                }
            });

            // If a module is NOT contributing:
            if (!sources.includes('M1')) {
                s.modules.module1.inverter.loadPct = 0;
                s.modules.module1.rectifier.loadPct = 5;
            }
            if (!sources.includes('M2')) {
                s.modules.module2.inverter.loadPct = 0;
                s.modules.module2.rectifier.loadPct = 5;
            }

        } else {
            s.voltages.loadBus = 0;
        }
    }

    // Run Module Physics
    s.modules.module1 = calculateModulePhysics(
        s.modules.module1,
        s.breakers[ParallelBreakerId.Q1_1],
        s.breakers[ParallelBreakerId.QF1_1],
        s.voltages.utilityInput,
        0, now
    );

    s.modules.module2 = calculateModulePhysics(
        s.modules.module2,
        s.breakers[ParallelBreakerId.Q1_2],
        s.breakers[ParallelBreakerId.QF1_2],
        s.voltages.utilityInput,
        0, now
    );

    // Battery discharge logic if needed
    // (Simplified: if dcBus < 400 (rectifier off) and loadPct > 0, drain battery)
    if (s.modules.module1.dcBusVoltage < 500 && s.modules.module1.inverter.loadPct > 0) {
        s.modules.module1.battery.chargeLevel -= 0.05;
    }
    if (s.modules.module2.dcBusVoltage < 500 && s.modules.module2.inverter.loadPct > 0) {
        s.modules.module2.battery.chargeLevel -= 0.05;
    }

    return s;
};

export const checkParallelInterlock = (actionType: string, target: string, value: any, state: ParallelSimulationState): { allowed: boolean; reason?: string } => {
    // Interlocks for Parallel System

    // 1. Cannot close Maint Bypass if Inverter is Active and not in Bypass Mode
    if (target === ParallelBreakerId.Q3_1 && value === true) {
        if (state.modules.module1.staticSwitch.mode !== 'BYPASS')
            return { allowed: false, reason: 'Module 1 STS must be in BYPASS' };
    }

    if (target === ParallelBreakerId.Q3_2 && value === true) {
        if (state.modules.module2.staticSwitch.mode !== 'BYPASS')
            return { allowed: false, reason: 'Module 2 STS must be in BYPASS' };
    }

    return { allowed: true };
};
