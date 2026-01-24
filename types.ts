
export enum BreakerId {
  Q1 = 'Q1', // Rectifier Input
  Q2 = 'Q2', // Bypass Input
  Q3 = 'Q3', // Maintenance Bypass
  Q4 = 'Q4', // UPS Output
  QF1 = 'QF1', // Battery Breaker
  Load1 = 'Load1', // Critical Load A
  Load2 = 'Load2'  // Critical Load B
}

export enum ComponentStatus {
  OFF = 'OFF',
  STARTING = 'STARTING',
  NORMAL = 'NORMAL',
  ALARM = 'ALARM',
  FAULT = 'FAULT'
}

export enum UPSMode {
  OFF = 'OFF',
  ONLINE = 'ONLINE',
  BATTERY_MODE = 'BATTERY_MODE',
  RECHARGE = 'RECHARGE',
  STATIC_BYPASS = 'STATIC_BYPASS',
  MAINT_BYPASS = 'MAINT_BYPASS',
  BLACK_START = 'BLACK_START',
  FAULT_LOCKOUT = 'FAULT_LOCKOUT',
  EMERGENCY_SHUTDOWN = 'EMERGENCY_SHUTDOWN'
}

export enum UPSCommand {
  RECT_ON = 'CMD_RECT_ON',
  RECT_OFF = 'CMD_RECT_OFF',
  INV_ON = 'CMD_INV_ON',
  INV_OFF = 'CMD_INV_OFF',
  TRANSFER_MAINT = 'CMD_TRANSFER_TO_MAINT',
  RETURN_MAINT = 'CMD_RETURN_FROM_MAINT',
  EPO = 'CMD_EPO',
  ACK_ALARM = 'CMD_ACK_ALARM'
}

export interface ComponentDetail {
  status: ComponentStatus;
  temperature: number; // Celsius
  loadPct: number;     // 0-100%
  efficiency: number;  // 0-1.0
  voltageOut: number;  // Local voltage reading
}

export interface SimulationState {
  breakers: Record<BreakerId, boolean>;
  voltages: {
    utilityInput: number;
    bypassInput: number;
    dcBus: number;
    loadBus: number;
  };
  frequencies: {
    utility: number;
    inverter: number;
    load: number;
  };
  currents: {
    input: number;
    battery: number;
    output: number;
  };
  battery: {
    chargeLevel: number;  // 0-100% state of charge
    temp: number;         // Celsius
    health: number;       // 0-100% state of health
    voltage: number;      // Terminal voltage
    current: number;      // Charge (+) or discharge (-) current in Amps
    cycleCount: number;   // Total charge/discharge cycles for SOH
    // Peukert parameters
    nominalCapacityAh: number;   // Nominal capacity in Amp-hours
    peukertExponent: number;     // Typically 1.05-1.3 for VRLA
    effectiveCapacityAh: number; // Calculated based on discharge rate
  };
  components: {
    rectifier: ComponentDetail;
    inverter: ComponentDetail;
    staticSwitch: {
      mode: 'INVERTER' | 'BYPASS';
      status: 'OK' | 'ALARM';
      syncError: number; // Phase difference in degrees
      forceBypass?: boolean; // Manual override flag
    };
  };
  alarms: string[];
  // Fault injection states (IEC 62040-3 / IEEE 142)
  faults: {
    dcLinkCapacitorFailure: boolean;  // IEC 62040-3: DC bus ripple/instability
    groundFault: boolean;             // IEEE 142: Ground fault detection
    syncDrift: boolean;               // IEC 62040-3: Frequency out of VFI tolerance
  };
  // timestamp for physics delta calculations
  lastTick: number;

  // New Controller State
  upsMode: UPSMode;
}

export interface ProcedureStep {
  id: number;
  description: string;
  expectedAction?: {
    type: 'BREAKER' | 'SWITCH' | 'WAIT';
    target: string;
    value: any;
  };
  validationFn: (state: SimulationState) => boolean;
  hint?: string;
}

export interface Procedure {
  id: string;
  name: string;
  description: string;
  steps: ProcedureStep[];
  initialState: Partial<SimulationState>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'ACTION' | 'ALARM' | 'ERROR';
}