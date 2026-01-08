import { BreakerId, ComponentStatus, Procedure, SimulationState } from './types';

export const INITIAL_STATE: SimulationState = {
  breakers: {
    [BreakerId.Q1]: true,
    [BreakerId.Q2]: true,
    [BreakerId.Q3]: false,
    [BreakerId.Q4]: true,
    [BreakerId.QF1]: true,
    [BreakerId.Load1]: true,
    [BreakerId.Load2]: true,
  },
  voltages: {
    utilityInput: 400,
    bypassInput: 400,
    dcBus: 540,
    loadBus: 400,
  },
  frequencies: {
    utility: 50.0,
    inverter: 50.0,
    load: 50.0,
  },
  currents: {
    input: 100,
    battery: 2, // trickle charge
    output: 95,
  },
  battery: {
    chargeLevel: 100,
    temp: 25,
    health: 100,
    voltage: 540,
  },
  components: {
    rectifier: {
      status: ComponentStatus.NORMAL,
      temperature: 35,
      loadPct: 60,
      efficiency: 0.95,
      voltageOut: 540
    },
    inverter: {
      status: ComponentStatus.NORMAL,
      temperature: 48,
      loadPct: 55,
      efficiency: 0.94,
      voltageOut: 400
    },
    staticSwitch: {
      mode: 'INVERTER',
      status: 'OK',
      syncError: 0,
      forceBypass: false
    },
  },
  alarms: [],
  lastTick: 0,
};

// Procedure 1: Maintenance Bypass
export const PROC_MAINT_BYPASS: Procedure = {
  id: 'maint_bypass',
  name: 'Transfer to Maintenance Bypass',
  description: 'Safely transfer critical load to maintenance bypass for UPS servicing.',
  initialState: INITIAL_STATE,
  steps: [
    {
      id: 1,
      description: 'Verify System is Normal and No Alarms exist.',
      validationFn: (s) => s.components.inverter.status === ComponentStatus.NORMAL && s.alarms.length === 0,
      hint: 'Clear any alarms if present. Ensure Inverter is Green.',
    },
    {
      id: 2,
      description: 'Transfer Static Switch to Bypass Mode.',
      expectedAction: { type: 'SWITCH', target: 'staticSwitch', value: 'BYPASS' },
      validationFn: (s) => s.components.staticSwitch.mode === 'BYPASS',
      hint: 'Click the Static Switch symbol to toggle mode.',
    },
    {
      id: 3,
      description: 'Close Maintenance Bypass Breaker (Q3).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q3, value: true },
      validationFn: (s) => s.breakers[BreakerId.Q3] === true,
      hint: 'Locate Q3 on the SLD and close it.',
    },
    {
      id: 4,
      description: 'Open UPS Output Breaker (Q4).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q4, value: false },
      validationFn: (s) => s.breakers[BreakerId.Q4] === false,
      hint: 'Locate Q4 and open it to isolate UPS output.',
    },
    {
      id: 5,
      description: 'Open Rectifier Input Breaker (Q1).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q1, value: false },
      validationFn: (s) => s.breakers[BreakerId.Q1] === false,
    },
    {
      id: 6,
      description: 'Open Battery Breaker (QF1).',
      expectedAction: { type: 'BREAKER', target: BreakerId.QF1, value: false },
      validationFn: (s) => s.breakers[BreakerId.QF1] === false,
    },
    {
      id: 7,
      description: 'Procedure Complete. UPS is isolated.',
      validationFn: (s) => true,
    }
  ]
};

// Procedure 2: Return from Maintenance Bypass
export const PROC_RETURN_FROM_BYPASS: Procedure = {
  id: 'return_bypass',
  name: 'Return from Maint. Bypass',
  description: 'Restore UPS to normal operation from maintenance bypass state (Make-Before-Break).',
  initialState: {
    ...INITIAL_STATE,
    breakers: {
      ...INITIAL_STATE.breakers,
      [BreakerId.Q1]: false,
      [BreakerId.QF1]: false,
      [BreakerId.Q4]: false,
      [BreakerId.Q3]: true,
    },
    components: {
      rectifier: { ...INITIAL_STATE.components.rectifier, status: ComponentStatus.OFF, voltageOut: 0 },
      inverter: { ...INITIAL_STATE.components.inverter, status: ComponentStatus.OFF, voltageOut: 0 },
      staticSwitch: { ...INITIAL_STATE.components.staticSwitch, mode: 'BYPASS', forceBypass: true },
    },
    voltages: {
      ...INITIAL_STATE.voltages,
      dcBus: 0,
      loadBus: 400, // Fed by Q3
    }
  },
  steps: [
    {
      id: 1,
      description: 'Close Rectifier Input Breaker (Q1).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q1, value: true },
      validationFn: (s) => s.breakers[BreakerId.Q1],
      hint: 'Energize the rectifier first.'
    },
    {
      id: 2,
      description: 'Close Battery Breaker (QF1).',
      expectedAction: { type: 'BREAKER', target: BreakerId.QF1, value: true },
      validationFn: (s) => s.breakers[BreakerId.QF1],
      hint: 'Reconnect energy storage.'
    },
    {
      id: 3,
      description: 'Start Inverter and Verify Output Voltage.',
      expectedAction: { type: 'SWITCH', target: 'inverter', value: 'START' },
      validationFn: (s) => s.components.inverter.status === ComponentStatus.NORMAL && s.components.inverter.voltageOut > 380,
      hint: 'Manually start the inverter module.'
    },
    {
      id: 4,
      description: 'Verify Static Switch is in BYPASS Mode.',
      validationFn: (s) => s.components.staticSwitch.mode === 'BYPASS',
      hint: 'CRITICAL: Do not close Q4 if Static Switch is on Inverter while Q3 is closed (Phase sync risk).'
    },
    {
      id: 5,
      description: 'Close UPS Output Breaker (Q4).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q4, value: true },
      validationFn: (s) => s.breakers[BreakerId.Q4],
      hint: 'Parallel the UPS bypass line with the maintenance bypass line.'
    },
    {
      id: 6,
      description: 'Open Maintenance Bypass Breaker (Q3).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q3, value: false },
      validationFn: (s) => !s.breakers[BreakerId.Q3],
      hint: 'Isolate the maintenance path.'
    },
    {
      id: 7,
      description: 'Transfer Static Switch to INVERTER Mode.',
      expectedAction: { type: 'SWITCH', target: 'staticSwitch', value: 'INVERTER' },
      validationFn: (s) => s.components.staticSwitch.mode === 'INVERTER',
      hint: 'Put load on protected UPS power.'
    }
  ]
};

// Procedure 3: Black Start
export const PROC_BLACK_START: Procedure = {
  id: 'black_start',
  name: 'Black Start Recovery',
  description: 'Restore power using Battery and Inverter during total blackout.',
  initialState: {
    ...INITIAL_STATE,
    breakers: {
      [BreakerId.Q1]: false, // Utility failed
      [BreakerId.Q2]: false,
      [BreakerId.Q3]: false,
      [BreakerId.Q4]: false, // System tripped
      [BreakerId.QF1]: true,
      [BreakerId.Load1]: false, // Load shed
      [BreakerId.Load2]: false,
    },
    voltages: {
      utilityInput: 0,
      bypassInput: 0,
      dcBus: 500, // Battery holding
      loadBus: 0,
    },
    components: {
      rectifier: { ...INITIAL_STATE.components.rectifier, status: ComponentStatus.OFF, voltageOut: 0 },
      inverter: { ...INITIAL_STATE.components.inverter, status: ComponentStatus.OFF, voltageOut: 0 },
      staticSwitch: { ...INITIAL_STATE.components.staticSwitch, mode: 'INVERTER', status: 'ALARM' },
    },
    alarms: ['UTILITY FAILURE', 'LOAD LOSS'],
  },
  steps: [
    {
      id: 1,
      description: 'Acknowledge Alarms and verify Battery is available.',
      validationFn: (s) => s.battery.chargeLevel > 20 && s.breakers[BreakerId.QF1],
    },
    {
      id: 2,
      description: 'Pre-charge DC Bus (simulated automatic soft-start). Start Inverter.',
      expectedAction: { type: 'SWITCH', target: 'inverter', value: 'START' },
      validationFn: (s) => s.components.inverter.status === ComponentStatus.NORMAL && s.components.inverter.voltageOut > 380,
      hint: 'Click the Inverter unit to manually start.',
    },
    {
      id: 3,
      description: 'Close UPS Output Breaker (Q4).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q4, value: true },
      validationFn: (s) => s.breakers[BreakerId.Q4],
    },
    {
      id: 4,
      description: 'Energize Critical Load 1 (Priority).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Load1, value: true },
      validationFn: (s) => s.breakers[BreakerId.Load1],
    },
    {
      id: 5,
      description: 'Wait for voltage stability before adding Load 2.',
      validationFn: (s) => s.voltages.loadBus > 390,
    }
  ]
};

// Procedure 4: Cold Start (Dead Bus)
export const PROC_COLD_START: Procedure = {
  id: 'cold_start',
  name: 'Cold Start (Dead Bus)',
  description: 'Energize UPS from total shutdown state with Utility available.',
  initialState: {
    ...INITIAL_STATE,
    breakers: {
      [BreakerId.Q1]: false,
      [BreakerId.Q2]: true,
      [BreakerId.Q3]: false,
      [BreakerId.Q4]: false,
      [BreakerId.QF1]: false,
      [BreakerId.Load1]: false,
      [BreakerId.Load2]: false,
    },
    voltages: {
      utilityInput: 400,
      bypassInput: 400,
      dcBus: 0,
      loadBus: 0,
    },
    components: {
      rectifier: { ...INITIAL_STATE.components.rectifier, status: ComponentStatus.OFF, voltageOut: 0 },
      inverter: { ...INITIAL_STATE.components.inverter, status: ComponentStatus.OFF, voltageOut: 0 },
      staticSwitch: { ...INITIAL_STATE.components.staticSwitch, mode: 'BYPASS' },
    },
    alarms: ['SYSTEM SHUTDOWN'],
  },
  steps: [
    {
      id: 1,
      description: 'Close Rectifier Input Breaker (Q1) to charge DC Bus.',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q1, value: true },
      validationFn: (s) => s.breakers[BreakerId.Q1] && s.voltages.dcBus > 500,
      hint: 'Close Q1, then open Rectifier Faceplate and click START.',
    },
    {
      id: 2,
      description: 'Close Battery Breaker (QF1).',
      expectedAction: { type: 'BREAKER', target: BreakerId.QF1, value: true },
      validationFn: (s) => s.breakers[BreakerId.QF1],
    },
    {
      id: 3,
      description: 'Start Inverter.',
      expectedAction: { type: 'SWITCH', target: 'inverter', value: 'START' },
      validationFn: (s) => s.components.inverter.status === ComponentStatus.NORMAL,
    },
    {
      id: 4,
      description: 'Close UPS Output Breaker (Q4).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q4, value: true },
      validationFn: (s) => s.breakers[BreakerId.Q4],
    },
    {
      id: 5,
      description: 'Energize Critical Loads.',
      validationFn: (s) => s.breakers[BreakerId.Load1] && s.breakers[BreakerId.Load2] && s.voltages.loadBus > 390,
    }
  ]
};

// Procedure 5: Emergency Isolation (Fire)
export const PROC_EMERGENCY: Procedure = {
  id: 'emergency',
  name: 'Emergency Isolation (Fire)',
  description: 'Immediate isolation of UPS battery and rectifier during localized fire alarm.',
  initialState: {
    ...INITIAL_STATE,
    alarms: ['FIRE ALARM - BATT ROOM', 'HIGH TEMP'],
    battery: { ...INITIAL_STATE.battery, temp: 55 }
  },
  steps: [
    {
      id: 1,
      description: 'Open Battery Breaker (QF1) IMMEDIATELY.',
      expectedAction: { type: 'BREAKER', target: BreakerId.QF1, value: false },
      validationFn: (s) => !s.breakers[BreakerId.QF1],
      hint: 'Isolate the chemical energy source to prevent thermal runaway.',
    },
    {
      id: 2,
      description: 'Forced Transfer Static Switch to BYPASS.',
      expectedAction: { type: 'SWITCH', target: 'staticSwitch', value: 'BYPASS' },
      validationFn: (s) => s.components.staticSwitch.mode === 'BYPASS',
      hint: 'Move load to utility to protect inverter electronics.',
    },
    {
      id: 3,
      description: 'Open Rectifier Input Breaker (Q1).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q1, value: false },
      validationFn: (s) => !s.breakers[BreakerId.Q1],
      hint: 'Cut input power to the cabinet.',
    },
    {
      id: 4,
      description: 'Load Shed: Open Non-Critical Load 2.',
      expectedAction: { type: 'BREAKER', target: BreakerId.Load2, value: false },
      validationFn: (s) => !s.breakers[BreakerId.Load2],
      hint: 'Reduce total power demand.',
    },
    {
      id: 5,
      description: 'Verify Critical Load 1 is supported by Bypass.',
      validationFn: (s) => s.voltages.loadBus > 390 && s.breakers[BreakerId.Load1],
    }
  ]
};

// Procedure 6: Failure Recovery (Rectifier Loss)
export const PROC_FAILURE_RECOVERY: Procedure = {
  id: 'failure_recovery',
  name: 'Fault Recovery: Rectifier Failure',
  description: 'Respond to Rectifier Failure alarm to prevent Battery exhaustion.',
  initialState: {
    ...INITIAL_STATE,
    components: { 
        ...INITIAL_STATE.components, 
        rectifier: { ...INITIAL_STATE.components.rectifier, status: ComponentStatus.FAULT } 
    },
    alarms: ['RECTIFIER FAILURE', 'BATTERY DISCHARGING'],
    voltages: { ...INITIAL_STATE.voltages, dcBus: 500 }
  },
  steps: [
    {
      id: 1,
      description: 'Identify Alarm and Confirm Battery Discharging.',
      validationFn: (s) => s.alarms.includes('RECTIFIER FAILURE') && s.currents.battery < 0,
      hint: 'Look at the Rectifier (Red) and Battery current (Negative).',
    },
    {
      id: 2,
      description: 'Manually Transfer Static Switch to BYPASS.',
      expectedAction: { type: 'SWITCH', target: 'staticSwitch', value: 'BYPASS' },
      validationFn: (s) => s.components.staticSwitch.mode === 'BYPASS',
      hint: 'Save the battery charge by moving load to Utility Bypass.',
    },
    {
      id: 3,
      description: 'Open Rectifier Input Breaker (Q1).',
      expectedAction: { type: 'BREAKER', target: BreakerId.Q1, value: false },
      validationFn: (s) => !s.breakers[BreakerId.Q1],
      hint: 'Isolate the failed module.',
    },
    {
      id: 4,
      description: 'Open Battery Breaker (QF1) to stop discharge.',
      expectedAction: { type: 'BREAKER', target: BreakerId.QF1, value: false },
      validationFn: (s) => !s.breakers[BreakerId.QF1] && s.currents.battery === 0,
      hint: 'Preserve remaining battery capacity for true blackout.',
    },
    {
      id: 5,
      description: 'Confirm Load supported by Bypass Feed.',
      validationFn: (s) => s.voltages.loadBus > 390 && s.components.staticSwitch.mode === 'BYPASS',
    }
  ]
};