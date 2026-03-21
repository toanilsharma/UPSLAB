

export enum ParallelBreakerId {
    // Module 1
    Q1_1 = 'Q1_1', // Rectifier Input 1
    Q2_1 = 'Q2_1', // Bypass Input 1
    Q3_1 = 'Q3_1', // Maintenance Bypass 1
    Q4_1 = 'Q4_1', // Output Switch 1
    QF1_1 = 'QF1_1', // Battery Breaker 1

    // Module 2
    Q1_2 = 'Q1_2', // Rectifier Input 2
    Q2_2 = 'Q2_2', // Bypass Input 2
    Q3_2 = 'Q3_2', // Maintenance Bypass 2
    Q4_2 = 'Q4_2', // Output Switch 2
    QF1_2 = 'QF1_2', // Battery Breaker 2

    // Loads (Shared)
    Load1 = 'Load1',
    Load2 = 'Load2'
}

// System States per Operating Philosophy Section 2
export enum ParallelSystemMode {
    OFF = 'OFF',
    ONLINE_PARALLEL = 'ONLINE_PARALLEL',
    BATTERY_PARALLEL = 'BATTERY_PARALLEL',
    RECHARGE_PARALLEL = 'RECHARGE_PARALLEL',
    DEGRADED_REDUNDANCY = 'DEGRADED_REDUNDANCY',
    STATIC_BYPASS = 'STATIC_BYPASS',
    MAINT_BYPASS = 'MAINT_BYPASS',
    BLACK_START_PARALLEL = 'BLACK_START_PARALLEL',
    FAULT_LOCKOUT = 'FAULT_LOCKOUT',
    EMERGENCY_SHUTDOWN = 'EMERGENCY_SHUTDOWN'
}


export enum ComponentStatus {
    OFF = 'OFF',
    STARTING = 'STARTING',
    NORMAL = 'NORMAL',
    ALARM = 'ALARM',
    FAULT = 'FAULT'
}

export interface ComponentDetail {
    status: ComponentStatus;
    temperature: number; // Celsius
    loadPct: number;     // 0-100%
    efficiency: number;  // 0-1.0
    voltageOut: number;  // Local voltage reading
    startTimer?: number; // Seconds remaining for STARTING -> NORMAL
    kva?: number;        // Apparent Power (kVA)
    pf?: number;         // Power Factor (0.0 - 1.0)
    thd?: number;        // Total Harmonic Distortion (%)
    prechargePct?: number; // DC Pre-charge progress (0-100%)
    walkInPct?: number;    // Rectifier Walk-in progress (0-100%)
    boostCharge?: boolean; // VRLA Boost Charge active mode
}

export interface StaticSwitchDetail {
    mode: 'INVERTER' | 'BYPASS';
    status: 'OK' | 'ALARM';
    syncError: number; // Phase difference in degrees
    syncStatus: 'SYNCED' | 'DRIFTING' | 'OUT_OF_SYNC';
    forceBypass?: boolean; // Manual override flag
    isIsolated?: boolean; // Electronic isolation (STS Blocked)
}

export interface BatteryDetail {
    chargeLevel: number;
    temp: number;
    health: number;
    voltage: number; // Terminal voltage
    current: number; // Charge (+) or discharge (-) current in Amps
    ri: number;      // Internal Resistance (Ohms)
    soh: number;     // State of Health (%)
}

export interface UPSModuleState {
    rectifier: ComponentDetail;
    inverter: ComponentDetail;
    staticSwitch: StaticSwitchDetail;
    battery: BatteryDetail;
    dcBusVoltage: number;
}

export interface ParallelSimulationState {
    systemMode: ParallelSystemMode;
    breakers: Record<ParallelBreakerId, boolean>;
    voltages: {
        utilityInput: number;
        bypassInput: number;
        loadBus: number;
        loadPhase: number;     // System output phase
        bypassPhase: number;   // System bypass phase
    };
    frequencies: {
        utility: number;
        load: number;
    };
    currents: {
        totalOutput: number;
        load1: number;
        load2: number;
        kvar?: number;       // System-wide Reactive Power
    };
    modules: {
        module1: UPSModuleState;
        module2: UPSModuleState;
    };
    // Parallel-specific fields
    availableModules: number;
    effectiveCapacityAh: number;
    totalCapacityKW: number;
    loadKW: number;
    kva: number;                // System-wide Apparent Power
    pf: number;                 // System-wide Power Factor
    thd: number;                // System-wide Total Harmonic Distortion (%)
    redundancyOK: boolean;
    // Faults for instructor panel
    faults: {
        epo: boolean; // Emergency Power Off
        mainsFailure: boolean;
        module1RectFault: boolean;
        module1InvFault: boolean;
        module2RectFault: boolean;
        module2InvFault: boolean;
        // IEC/IEEE Standard Faults
        dcLinkCapacitorFailure: boolean;
        groundFault: boolean;
        syncDrift: boolean;
    };
    alarms: string[];
    lastTick: number;
}

export interface ParallelProcedureStep {
    id: number;
    description: string;
    expectedAction?: {
        type: 'BREAKER' | 'SWITCH' | 'WAIT' | 'COMPONENT';
        target: string; // e.g., 'module1.rectifier' or 'Q1_1'
        value?: any;
        action?: string; // e.g., 'START', 'STOP' for component actions
    };
    validationFn: (state: ParallelSimulationState) => boolean;
    hint?: string;
}

export interface ParallelProcedure {
    id: string;
    name: string;
    description: string;
    steps: ParallelProcedureStep[];
    initialState: Partial<ParallelSimulationState>;
}

export interface LogEntry {
    id: string;
    timestamp: string;
    message: string;
    type: 'INFO' | 'ACTION' | 'ALARM' | 'ERROR';
}
