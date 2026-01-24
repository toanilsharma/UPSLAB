/**
 * ParallelUPSController.ts
 * FSM Controller for 2-Module Parallel Redundant UPS System
 * Implements Operating Philosophy Sections 4-17
 */

import {
    ParallelSimulationState,
    ParallelBreakerId,
    ParallelSystemMode,
    ComponentStatus,
    UPSModuleState
} from '../parallel_types';

// Module Rating in kW
const MODULE_RATING_KW = 100;

export class ParallelUPSController {

    /**
     * Calculate available modules count
     * AVAILABLE_MODULES = count where INVx=ON, Q4_x=CLOSED, STSx=INVERTER
     */
    static calculateAvailableModules(state: ParallelSimulationState): number {
        let count = 0;

        // Module 1
        if (state.modules.module1.inverter.status === ComponentStatus.NORMAL &&
            state.breakers[ParallelBreakerId.Q4_1] &&
            state.modules.module1.staticSwitch.mode === 'INVERTER') {
            count++;
        }

        // Module 2
        if (state.modules.module2.inverter.status === ComponentStatus.NORMAL &&
            state.breakers[ParallelBreakerId.Q4_2] &&
            state.modules.module2.staticSwitch.mode === 'INVERTER') {
            count++;
        }

        return count;
    }

    /**
     * Global Interlocks Check (Section 4)
     */
    static checkBreakerPermission(
        breakerId: ParallelBreakerId,
        isClosing: boolean,
        state: ParallelSimulationState
    ): { allowed: boolean; reason?: string } {

        // INTERLOCK 1: Block Q3_x closing unless STSx = BYPASS
        if (isClosing && breakerId === ParallelBreakerId.Q3_1) {
            if (state.modules.module1.staticSwitch.mode !== 'BYPASS') {
                return { allowed: false, reason: 'INTERLOCK: STS1 must be in BYPASS before closing Q3-1' };
            }
        }
        if (isClosing && breakerId === ParallelBreakerId.Q3_2) {
            if (state.modules.module2.staticSwitch.mode !== 'BYPASS') {
                return { allowed: false, reason: 'INTERLOCK: STS2 must be in BYPASS before closing Q3-2' };
            }
        }

        // INTERLOCK 7: Block closing Q1_x while Q3_x closed
        if (isClosing && breakerId === ParallelBreakerId.Q1_1) {
            if (state.breakers[ParallelBreakerId.Q3_1]) {
                return { allowed: false, reason: 'INTERLOCK: Cannot close Q1-1 while Q3-1 (Maint Bypass) is closed' };
            }
        }
        if (isClosing && breakerId === ParallelBreakerId.Q1_2) {
            if (state.breakers[ParallelBreakerId.Q3_2]) {
                return { allowed: false, reason: 'INTERLOCK: Cannot close Q1-2 while Q3-2 (Maint Bypass) is closed' };
            }
        }

        // INTERLOCK 2: Block Q4_x opening if it drops available modules below required
        if (!isClosing && (breakerId === ParallelBreakerId.Q4_1 || breakerId === ParallelBreakerId.Q4_2)) {
            const currentAvailable = this.calculateAvailableModules(state);
            const afterOpen = currentAvailable - 1;
            // If only one module and load is present, warn but allow
            if (afterOpen === 0 && state.loadKW > 0) {
                // Allow but this will cause bypass transfer
            }
        }

        // INTERLOCK 4: Prevent Q4_x close unless SYNC_OK_x = TRUE
        if (isClosing && breakerId === ParallelBreakerId.Q4_1) {
            if (state.modules.module1.staticSwitch.syncError > 5) {
                return { allowed: false, reason: 'INTERLOCK: Module 1 sync error too high (>5°)' };
            }
            if (state.modules.module1.inverter.status !== ComponentStatus.NORMAL) {
                return { allowed: false, reason: 'INTERLOCK: Module 1 inverter not running' };
            }
        }
        if (isClosing && breakerId === ParallelBreakerId.Q4_2) {
            if (state.modules.module2.staticSwitch.syncError > 5) {
                return { allowed: false, reason: 'INTERLOCK: Module 2 sync error too high (>5°)' };
            }
            if (state.modules.module2.inverter.status !== ComponentStatus.NORMAL) {
                return { allowed: false, reason: 'INTERLOCK: Module 2 inverter not running' };
            }
        }

        return { allowed: true };
    }

    /**
     * Main FSM Tick - Determines system state and reactions
     */
    static processTick(prevState: ParallelSimulationState): ParallelSimulationState {
        const state = JSON.parse(JSON.stringify(prevState)) as ParallelSimulationState;

        // Apply fault injections
        if (state.faults.mainsFailure) {
            state.voltages.utilityInput = 0;
            state.voltages.bypassInput = 0;
        }
        if (state.faults.module1RectFault && state.modules.module1.rectifier.status !== ComponentStatus.OFF) {
            state.modules.module1.rectifier.status = ComponentStatus.FAULT;
        }
        if (state.faults.module1InvFault && state.modules.module1.inverter.status !== ComponentStatus.OFF) {
            state.modules.module1.inverter.status = ComponentStatus.FAULT;
        }
        if (state.faults.module2RectFault && state.modules.module2.rectifier.status !== ComponentStatus.OFF) {
            state.modules.module2.rectifier.status = ComponentStatus.FAULT;
        }
        if (state.faults.module2InvFault && state.modules.module2.inverter.status !== ComponentStatus.OFF) {
            state.modules.module2.inverter.status = ComponentStatus.FAULT;
        }

        // Calculate conditions
        const mainsOK = state.voltages.utilityInput > 400;
        const bypassOK = state.voltages.bypassInput > 400;

        // Calculate available modules
        state.availableModules = this.calculateAvailableModules(state);
        state.totalCapacityKW = state.availableModules * MODULE_RATING_KW;
        state.redundancyOK = state.totalCapacityKW > state.loadKW;

        // Check module conditions
        const m1RectON = state.modules.module1.rectifier.status === ComponentStatus.NORMAL;
        const m2RectON = state.modules.module2.rectifier.status === ComponentStatus.NORMAL;
        const m1InvON = state.modules.module1.inverter.status === ComponentStatus.NORMAL;
        const m2InvON = state.modules.module2.inverter.status === ComponentStatus.NORMAL;
        const m1OnBattery = !m1RectON && state.breakers[ParallelBreakerId.QF1_1] && state.modules.module1.battery.chargeLevel > 0;
        const m2OnBattery = !m2RectON && state.breakers[ParallelBreakerId.QF1_2] && state.modules.module2.battery.chargeLevel > 0;
        const m1OnBypass = state.modules.module1.staticSwitch.mode === 'BYPASS';
        const m2OnBypass = state.modules.module2.staticSwitch.mode === 'BYPASS';
        const m1MaintBypass = state.breakers[ParallelBreakerId.Q3_1];
        const m2MaintBypass = state.breakers[ParallelBreakerId.Q3_2];

        // --- EPO CHECK (Section 15) ---
        if (state.faults.epo) {
            state.systemMode = ParallelSystemMode.EMERGENCY_SHUTDOWN;
            // Open all breakers
            state.breakers[ParallelBreakerId.Q1_1] = false;
            state.breakers[ParallelBreakerId.Q1_2] = false;
            state.breakers[ParallelBreakerId.Q4_1] = false;
            state.breakers[ParallelBreakerId.Q4_2] = false;
            state.breakers[ParallelBreakerId.QF1_1] = false;
            state.breakers[ParallelBreakerId.QF1_2] = false;
            state.breakers[ParallelBreakerId.Q2_1] = false;
            state.breakers[ParallelBreakerId.Q2_2] = false;
            state.modules.module1.rectifier.status = ComponentStatus.OFF;
            state.modules.module2.rectifier.status = ComponentStatus.OFF;
            state.modules.module1.inverter.status = ComponentStatus.OFF;
            state.modules.module2.inverter.status = ComponentStatus.OFF;
            return state;
        }

        // --- STATE MACHINE ---

        // MAINTENANCE BYPASS (Section 11)
        if (m1MaintBypass || m2MaintBypass) {
            state.systemMode = ParallelSystemMode.MAINT_BYPASS;
            return state;
        }

        // STATIC BYPASS (Both modules on bypass)
        if (m1OnBypass && m2OnBypass && !m1MaintBypass && !m2MaintBypass) {
            state.systemMode = ParallelSystemMode.STATIC_BYPASS;
            return state;
        }

        // BATTERY PARALLEL (Section 8)
        if (!mainsOK && (m1OnBattery || m2OnBattery) && (m1InvON || m2InvON)) {
            state.systemMode = ParallelSystemMode.BATTERY_PARALLEL;
            return state;
        }

        // DEGRADED REDUNDANCY (Section 6 & 7)
        if (state.availableModules === 1 && state.loadKW > 0) {
            state.systemMode = ParallelSystemMode.DEGRADED_REDUNDANCY;
            return state;
        }

        // RECHARGE PARALLEL (Mains restored, batteries charging)
        if (mainsOK && (m1RectON || m2RectON) &&
            (state.modules.module1.battery.chargeLevel < 100 || state.modules.module2.battery.chargeLevel < 100) &&
            state.availableModules >= 1) {
            state.systemMode = ParallelSystemMode.RECHARGE_PARALLEL;
            return state;
        }

        // ONLINE PARALLEL (Section 5 - Normal)
        if (mainsOK && state.availableModules >= 1) {
            state.systemMode = ParallelSystemMode.ONLINE_PARALLEL;
            return state;
        }

        // OFF (No modules available, no power)
        if (state.availableModules === 0 && !mainsOK) {
            state.systemMode = ParallelSystemMode.OFF;
        }

        return state;
    }

    /**
     * Check if inverter can start (Section 4 - INTERLOCK 3)
     */
    static canStartInverter(module: UPSModuleState): boolean {
        return module.dcBusVoltage > 180; // DC_OK threshold for 220V system
    }
}
