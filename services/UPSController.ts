import { SimulationState, UPSMode, ComponentStatus, BreakerId, UPSCommand } from '../types';

/**
 * UPSController - Strict Operating Philosophy Implementation
 * 
 * This controller implements the exact Action/Reaction matrix provided:
 * 
 * | Action                     | Preconditions     | UPS Reaction                                      | New State                    | Alarms                                      |
 * |----------------------------|-------------------|---------------------------------------------------|------------------------------|---------------------------------------------|
 * | Open Q1 (rectifier input)  | UPS ONLINE        | RECT stops, battery feeds DC link                 | BATTERY_MODE                 | INPUT FAIL, RECTIFIER OFF, BATTERY DISCHARGE|
 * | Open QF1 (normal)          | ONLINE, MAINS OK  | Battery isolated, inverter still on rectifier     | ONLINE                       | BATTERY DISCONNECTED                        |
 * | Open QF1 (battery mode)    | BATTERY_MODE      | DC collapses → INV trip → STS to bypass if avail  | STATIC_BYPASS/FAULT_LOCKOUT  | DC UNDERVOLT, INVERTER TRIP, BATTERY LOST   |
 * | INV OFF (manual/fault)     | Any supplying load| STS transfers to bypass if healthy                | STATIC_BYPASS/FAULT_LOCKOUT  | INVERTER OFF/TRIP, BYPASS ACTIVE            |
 * | RECT OFF                   | ONLINE            | Battery takes DC supply                           | BATTERY_MODE                 | RECTIFIER OFF, BATTERY DISCHARGE            |
 * | Open Q2 while on inverter  | ONLINE/BATTERY    | No transfer, bypass unavailable                   | No change                    | BYPASS SOURCE LOST                          |
 * | Open Q2 while on bypass    | STATIC_BYPASS     | Attempt STS return to inverter; blackout if not   | ONLINE/FAULT_LOCKOUT         | BYPASS FAIL, TRANSFER ATTEMPT               |
 * | Close Q3 wrong time        | STS ≠ BYPASS      | Action blocked by logic                           | No change                    | ILLEGAL OPERATION                           |
 * | Overload                   | LOAD > rating     | STS to bypass if possible                         | STATIC_BYPASS/FAULT_LOCKOUT  | OVERLOAD, TRANSFER TO BYPASS                |
 * | DC undervolt               | Any               | INV trip → bypass attempt                         | STATIC_BYPASS/FAULT_LOCKOUT  | DC BUS LOW, INVERTER TRIP                   |
 */
export class UPSController {

    /**
     * Process a single simulation tick.
     * This evaluates the current electrical state and applies the Action/Reaction matrix.
     */
    static processTick(state: SimulationState): SimulationState {
        const nextState = { ...state };
        const b = nextState.breakers;
        const comps = nextState.components;
        const voltages = nextState.voltages;

        // --- ELECTRICAL STATUS FLAGS ---
        const MAINS_OK = voltages.utilityInput > 400; // 415V system
        const BYPASS_OK = voltages.bypassInput > 400 && b.Q2;
        const DC_OK = voltages.dcBus > 155; // 220V DC system
        const BATTERY_SOC = nextState.battery.chargeLevel;
        const RECT_ON = comps.rectifier.status === ComponentStatus.NORMAL;
        const INV_ON = comps.inverter.status === ComponentStatus.NORMAL;
        const STS_INV = comps.staticSwitch.mode === 'INVERTER';
        const STS_BYPASS = comps.staticSwitch.mode === 'BYPASS';

        // =====================================================================
        // ROW 10: DC UNDERVOLT (Critical Protection - Evaluated First)
        // Precondition: Any
        // Reaction: INV trip → bypass attempt
        // New State: STATIC_BYPASS or FAULT_LOCKOUT
        // Alarms: DC BUS LOW, INVERTER TRIP
        // =====================================================================
        if (!DC_OK && INV_ON && comps.inverter.status !== ComponentStatus.STARTING) {
            // Trip Inverter
            nextState.components.inverter.status = ComponentStatus.FAULT;
            nextState.alarms.push('DC BUS LOW');
            nextState.alarms.push('INVERTER TRIP');

            // Attempt STS transfer to bypass
            if (BYPASS_OK) {
                nextState.components.staticSwitch.mode = 'BYPASS';
                nextState.upsMode = UPSMode.STATIC_BYPASS;
                nextState.alarms.push('BYPASS ACTIVE');
            } else {
                nextState.upsMode = UPSMode.FAULT_LOCKOUT;
            }
        }

        // =====================================================================
        // ROW 9: OVERLOAD (IEC Curve)
        // Precondition: LOAD > rating for IEC curve
        // Reaction: STS to bypass if possible
        // New State: STATIC_BYPASS or FAULT_LOCKOUT
        // Alarms: OVERLOAD, TRANSFER TO BYPASS
        // =====================================================================
        const loadPct = comps.inverter.loadPct;
        if (STS_INV && loadPct > 110) {
            nextState.alarms.push('OVERLOAD');
            if (BYPASS_OK) {
                nextState.components.staticSwitch.mode = 'BYPASS';
                nextState.upsMode = UPSMode.STATIC_BYPASS;
                nextState.alarms.push('TRANSFER TO BYPASS');
            } else {
                nextState.upsMode = UPSMode.FAULT_LOCKOUT;
            }
        }

        // =====================================================================
        // ROW 7: Open Q2 while on bypass
        // Precondition: STATIC_BYPASS
        // Reaction: Attempt STS return to inverter; blackout if not possible
        // New State: ONLINE or FAULT_LOCKOUT
        // Alarms: BYPASS FAIL, TRANSFER ATTEMPT
        // =====================================================================
        if (nextState.upsMode === UPSMode.STATIC_BYPASS && STS_BYPASS && !b.Q2) {
            nextState.alarms.push('BYPASS FAIL');
            nextState.alarms.push('TRANSFER ATTEMPT');
            if (INV_ON && comps.staticSwitch.syncError < 10) {
                nextState.components.staticSwitch.mode = 'INVERTER';
                nextState.upsMode = UPSMode.ONLINE;
            } else {
                nextState.upsMode = UPSMode.FAULT_LOCKOUT;
            }
        }

        // =====================================================================
        // STATE MACHINE TRANSITIONS (Driven by Electrical Conditions)
        // =====================================================================
        switch (nextState.upsMode) {
            case UPSMode.OFF:
                if (INV_ON && STS_INV && b.Q4) nextState.upsMode = UPSMode.ONLINE;
                if (INV_ON && b.QF1 && !b.Q1 && !MAINS_OK) nextState.upsMode = UPSMode.BLACK_START;
                break;

            case UPSMode.BLACK_START:
                if (MAINS_OK && b.Q1 && RECT_ON) nextState.upsMode = UPSMode.ONLINE;
                if (!b.QF1 || BATTERY_SOC <= 0) nextState.upsMode = UPSMode.FAULT_LOCKOUT;
                break;

            // =====================================================================
            // ROW 1: Open Q1 (rectifier input)
            // Precondition: UPS ONLINE
            // Reaction: RECT stops, battery feeds DC link
            // New State: BATTERY_MODE
            // Alarms: INPUT FAIL, RECTIFIER OFF, BATTERY DISCHARGE
            // =====================================================================
            // ROW 5: RECT OFF
            // Precondition: ONLINE
            // Reaction: Battery takes DC supply
            // New State: BATTERY_MODE
            // Alarms: RECTIFIER OFF, BATTERY DISCHARGE
            // =====================================================================
            case UPSMode.ONLINE:
                // Check for conditions that lead to BATTERY_MODE
                if ((!b.Q1 || !MAINS_OK) && b.QF1 && BATTERY_SOC > 0) {
                    // Row 1: Mains Lost / Q1 Opened
                    nextState.upsMode = UPSMode.BATTERY_MODE;
                    nextState.components.rectifier.status = ComponentStatus.OFF; // Rectifier cannot run without input
                    nextState.alarms.push('INPUT FAIL');
                    nextState.alarms.push('RECTIFIER OFF');
                    nextState.alarms.push('BATTERY DISCHARGE');
                } else if (comps.rectifier.status === ComponentStatus.OFF && b.QF1 && BATTERY_SOC > 0) {
                    // Row 5: RECT OFF Command
                    nextState.upsMode = UPSMode.BATTERY_MODE;
                    nextState.alarms.push('RECTIFIER OFF');
                    nextState.alarms.push('BATTERY DISCHARGE');
                }
                // =====================================================================
                // ROW 2: Open QF1 (normal)
                // Precondition: ONLINE, MAINS OK
                // Reaction: Battery isolated, inverter still on rectifier
                // New State: ONLINE
                // Alarms: BATTERY DISCONNECTED
                // =====================================================================
                if (!b.QF1 && MAINS_OK && RECT_ON) {
                    // Stays ONLINE, just alarm
                    nextState.alarms.push('BATTERY DISCONNECTED');
                }
                // Check for STATIC_BYPASS transition
                if (STS_BYPASS && b.Q2) {
                    nextState.upsMode = UPSMode.STATIC_BYPASS;
                }
                // =====================================================================
                // ROW 6: Open Q2 while on inverter
                // Precondition: ONLINE/BATTERY_MODE
                // Reaction: No transfer, bypass unavailable
                // New State: No change
                // Alarms: BYPASS SOURCE LOST
                // =====================================================================
                if (!b.Q2 && STS_INV) {
                    nextState.alarms.push('BYPASS SOURCE LOST');
                }
                break;

            // =====================================================================
            // ROW 3: Open QF1 (battery mode)
            // Precondition: BATTERY_MODE
            // Reaction: DC collapses → INV trip → STS to bypass if available
            // New State: STATIC_BYPASS or FAULT_LOCKOUT
            // Alarms: DC UNDERVOLT, INVERTER TRIP, BATTERY LOST
            // =====================================================================
            case UPSMode.BATTERY_MODE:
                if (!b.QF1 || BATTERY_SOC <= 0) {
                    nextState.alarms.push('DC UNDERVOLT');
                    nextState.alarms.push('INVERTER TRIP');
                    nextState.alarms.push('BATTERY LOST');
                    nextState.components.inverter.status = ComponentStatus.FAULT;

                    if (BYPASS_OK) {
                        nextState.components.staticSwitch.mode = 'BYPASS';
                        nextState.upsMode = UPSMode.STATIC_BYPASS;
                    } else {
                        nextState.upsMode = UPSMode.FAULT_LOCKOUT;
                    }
                }
                // Recovery: Mains returns
                if (MAINS_OK && b.Q1 && RECT_ON) {
                    nextState.upsMode = UPSMode.RECHARGE;
                }
                // Row 6: Open Q2 while on inverter (also applies to Battery Mode)
                if (!b.Q2 && STS_INV) {
                    nextState.alarms.push('BYPASS SOURCE LOST');
                }
                break;

            case UPSMode.RECHARGE:
                if (BATTERY_SOC > 90) nextState.upsMode = UPSMode.ONLINE;
                if (!MAINS_OK) nextState.upsMode = UPSMode.BATTERY_MODE;
                break;

            case UPSMode.STATIC_BYPASS:
                if (b.Q3) {
                    nextState.upsMode = UPSMode.MAINT_BYPASS;
                }
                if (STS_INV && INV_ON) {
                    nextState.upsMode = UPSMode.ONLINE;
                }
                break;

            case UPSMode.MAINT_BYPASS:
                if (!b.Q3) {
                    if (STS_BYPASS) nextState.upsMode = UPSMode.STATIC_BYPASS;
                    else if (STS_INV && INV_ON) nextState.upsMode = UPSMode.ONLINE;
                    else nextState.upsMode = UPSMode.FAULT_LOCKOUT;
                }
                break;

            case UPSMode.FAULT_LOCKOUT:
                // Sticky state
                break;

            case UPSMode.EMERGENCY_SHUTDOWN:
                // Stuck until reset
                break;
        }

        return nextState;
    }

    // =========================================================================
    // INTERLOCK CHECKS
    // =========================================================================
    static checkBreakerPermission(state: SimulationState, breaker: BreakerId, isOpenOperation: boolean): { allowed: boolean; reason?: string } {
        const b = state.breakers;
        const s = state.components;

        // =====================================================================
        // ROW 8: Close Q3 wrong time
        // Precondition: STS ≠ BYPASS
        // Reaction: Action blocked by logic
        // Alarms: ILLEGAL OPERATION
        // =====================================================================
        if (breaker === BreakerId.Q3 && !isOpenOperation) {
            if (s.staticSwitch.mode !== 'BYPASS') {
                return { allowed: false, reason: 'ILLEGAL OPERATION: STS must be in BYPASS before closing Q3.' };
            }
        }

        // Block Opening Q4 while in Online mode without Maint Bypass
        if (breaker === BreakerId.Q4 && isOpenOperation) {
            if (s.staticSwitch.mode === 'INVERTER' && !b.Q3) {
                return { allowed: false, reason: 'Interlock: Cannot open Q4 in Online Mode without Maintenance Bypass.' };
            }
        }

        // Block Closing Q1 into maintenance mode
        if (breaker === BreakerId.Q1 && !isOpenOperation) {
            if (b.Q3) return { allowed: false, reason: 'Interlock: Cannot close Q1 while Q3 is closed.' };
        }

        return { allowed: true };
    }

    // =========================================================================
    // EXECUTE COMMANDS
    // =========================================================================
    static executeCommand(state: SimulationState, cmd: UPSCommand): { newState: SimulationState, log?: string } {
        const next = { ...state };
        let logMsg: string | undefined;

        if (state.upsMode === UPSMode.EMERGENCY_SHUTDOWN && cmd !== UPSCommand.EPO) {
            return { newState: next, log: 'IGNORED: System in EPO State' };
        }

        switch (cmd) {
            case UPSCommand.RECT_ON:
                if (next.voltages.utilityInput > 0 && next.breakers.Q1) {
                    next.components.rectifier.status = ComponentStatus.STARTING;
                    logMsg = 'COMMAND: Rectifier Start Initiated';
                } else {
                    logMsg = 'ERROR: Cannot Start Rectifier (No Input)';
                }
                break;

            // =====================================================================
            // ROW 5: RECT OFF
            // =====================================================================
            case UPSCommand.RECT_OFF:
                next.components.rectifier.status = ComponentStatus.OFF;
                logMsg = 'COMMAND: Rectifier Stop';
                // State transition handled in processTick
                break;

            case UPSCommand.INV_ON:
                if (next.voltages.dcBus > 155) {
                    next.components.inverter.status = ComponentStatus.STARTING;
                    logMsg = 'COMMAND: Inverter Start Initiated';
                } else {
                    logMsg = 'ERROR: Cannot Start Inverter (Low DC Bus)';
                }
                break;

            // =====================================================================
            // ROW 4: INV OFF (manual/fault)
            // Precondition: Any supplying load
            // Reaction: STS transfers to bypass if healthy
            // New State: STATIC_BYPASS or FAULT_LOCKOUT
            // Alarms: INVERTER OFF/TRIP, BYPASS ACTIVE
            // =====================================================================
            case UPSCommand.INV_OFF:
                next.components.inverter.status = ComponentStatus.OFF;
                next.alarms.push('INVERTER OFF');

                const Q2_HEALTHY = next.breakers.Q2 && next.voltages.bypassInput > 400;
                if (next.components.staticSwitch.mode === 'INVERTER') {
                    if (Q2_HEALTHY) {
                        next.components.staticSwitch.mode = 'BYPASS';
                        next.components.staticSwitch.forceBypass = true;
                        next.upsMode = UPSMode.STATIC_BYPASS;
                        next.alarms.push('BYPASS ACTIVE');
                        logMsg = 'INVERTER OFF -> Transfer to Bypass';
                    } else {
                        next.upsMode = UPSMode.FAULT_LOCKOUT;
                        logMsg = 'INVERTER OFF -> FAULT LOCKOUT (No Bypass)';
                    }
                }
                break;

            case UPSCommand.TRANSFER_MAINT:
                if (next.components.staticSwitch.mode !== 'BYPASS') {
                    next.components.staticSwitch.mode = 'BYPASS';
                    next.components.staticSwitch.forceBypass = true;
                    logMsg = 'COMMAND: Transfer to Maintenance (Forced Bypass)';
                }
                break;

            case UPSCommand.RETURN_MAINT:
                next.components.staticSwitch.forceBypass = false;
                logMsg = 'COMMAND: Return from Maintenance';
                break;

            case UPSCommand.EPO:
                next.upsMode = UPSMode.EMERGENCY_SHUTDOWN;
                next.breakers.Q1 = false;
                next.breakers.Q2 = false;
                next.breakers.Q4 = false;
                next.breakers.QF1 = false;
                next.components.rectifier.status = ComponentStatus.OFF;
                next.components.inverter.status = ComponentStatus.OFF;
                logMsg = 'CRITICAL: EMERGENCY POWER OFF ACTIVATED';
                break;

            case UPSCommand.ACK_ALARM:
                logMsg = 'COMMAND: Alarms Acknowledged';
                break;
        }

        return { newState: next, log: logMsg };
    }
}
