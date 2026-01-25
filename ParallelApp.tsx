
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParallelSLD } from './components/ParallelSLD';
import { ParallelWaveforms } from './components/ParallelWaveforms';
import { ParallelProcedurePanel } from './components/ParallelProcedurePanel';
import { ParallelFaceplate } from './components/ParallelFaceplate';
import { ParallelDashboard } from './components/ParallelDashboard';
import { INITIAL_PARALLEL_STATE, PROC_SYSTEM_MAINT_BYPASS, PROC_MODULE_ISOLATION, PROC_MODULE_1_PM, PROC_MODULE_1_RESTORE, PROC_UTILITY_FAILURE_TEST } from './parallel_constants';
import { calculateParallelPowerFlow, checkParallelInterlock } from './services/parallel_engine';
import { ParallelUPSController } from './services/ParallelUPSController';
import { ParallelSimulationState, ParallelBreakerId, ParallelProcedure, ComponentStatus, LogEntry, ParallelSystemMode } from './parallel_types';

interface ParallelAppProps {
    onReturnToMenu?: () => void;
}

const ParallelApp: React.FC<ParallelAppProps> = ({ onReturnToMenu }) => {
    const [booted, setBooted] = useState(false);
    const [state, setState] = useState<ParallelSimulationState>(INITIAL_PARALLEL_STATE);
    const [activeProcedure, setActiveProcedure] = useState<ParallelProcedure | null>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [procedureCompleted, setProcedureCompleted] = useState(false);
    const [failReason, setFailReason] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string, type: 'error' | 'info' } | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [selectedComp, setSelectedComp] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [autoMode, setAutoMode] = useState(true); // UPS Auto Mode - auto-recovery
    const [showFaultPanel, setShowFaultPanel] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);

    const addLog = (message: string, type: LogEntry['type'] = 'INFO') => {
        const entry: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            message,
            type
        };
        setLogs(prev => [entry, ...prev].slice(0, 100));
    };

    // Track previous state for event detection
    const prevStateRef = useRef<ParallelSimulationState | null>(null);

    // Comprehensive event monitoring system
    const monitorEvents = useCallback((prevState: ParallelSimulationState | null, newState: ParallelSimulationState) => {
        if (!prevState) return;

        const { modules: prevMod, breakers: prevBrk, voltages: prevVolt } = prevState;
        const { modules: newMod, breakers: newBrk, voltages: newVolt } = newState;

        // --- MODULE 1 EVENTS ---
        // Battery discharge detection
        if (newMod.module1.battery.current < -5 && prevMod.module1.battery.current >= -5) {
            addLog('MODULE 1: Load transferred to BATTERY backup', 'ALARM');
        }
        if (newMod.module1.battery.current >= 0 && prevMod.module1.battery.current < -5) {
            addLog('MODULE 1: Battery backup ended, AC power restored', 'INFO');
        }

        // STS mode changes
        if (newMod.module1.staticSwitch.mode === 'BYPASS' && prevMod.module1.staticSwitch.mode === 'INVERTER') {
            addLog('MODULE 1: STS transferred to BYPASS mode', 'ALARM');
        }
        if (newMod.module1.staticSwitch.mode === 'INVERTER' && prevMod.module1.staticSwitch.mode === 'BYPASS') {
            addLog('MODULE 1: STS transferred to INVERTER mode', 'INFO');
        }

        // Rectifier status
        if (newMod.module1.rectifier.status === ComponentStatus.OFF && prevMod.module1.rectifier.status === ComponentStatus.NORMAL) {
            addLog('MODULE 1: Rectifier OFFLINE - Running on battery/standby', 'ALARM');
        }
        if (newMod.module1.rectifier.status === ComponentStatus.NORMAL && prevMod.module1.rectifier.status !== ComponentStatus.NORMAL) {
            addLog('MODULE 1: Rectifier ONLINE and charging', 'INFO');
        }

        // Inverter status
        if (newMod.module1.inverter.status === ComponentStatus.OFF && prevMod.module1.inverter.status === ComponentStatus.NORMAL) {
            addLog('MODULE 1: Inverter STOPPED - Module in standby', 'ALARM');
        }
        if (newMod.module1.inverter.status === ComponentStatus.NORMAL && prevMod.module1.inverter.status === ComponentStatus.STARTING) {
            addLog('MODULE 1: Inverter synchronized and ON-LINE', 'INFO');
        }

        // --- MODULE 2 EVENTS ---
        if (newMod.module2.battery.current < -5 && prevMod.module2.battery.current >= -5) {
            addLog('MODULE 2: Load transferred to BATTERY backup', 'ALARM');
        }
        if (newMod.module2.battery.current >= 0 && prevMod.module2.battery.current < -5) {
            addLog('MODULE 2: Battery backup ended, AC power restored', 'INFO');
        }

        if (newMod.module2.staticSwitch.mode === 'BYPASS' && prevMod.module2.staticSwitch.mode === 'INVERTER') {
            addLog('MODULE 2: STS transferred to BYPASS mode', 'ALARM');
        }
        if (newMod.module2.staticSwitch.mode === 'INVERTER' && prevMod.module2.staticSwitch.mode === 'BYPASS') {
            addLog('MODULE 2: STS transferred to INVERTER mode', 'INFO');
        }

        if (newMod.module2.rectifier.status === ComponentStatus.OFF && prevMod.module2.rectifier.status === ComponentStatus.NORMAL) {
            addLog('MODULE 2: Rectifier OFFLINE - Running on battery/standby', 'ALARM');
        }
        if (newMod.module2.rectifier.status === ComponentStatus.NORMAL && prevMod.module2.rectifier.status !== ComponentStatus.NORMAL) {
            addLog('MODULE 2: Rectifier ONLINE and charging', 'INFO');
        }

        if (newMod.module2.inverter.status === ComponentStatus.OFF && prevMod.module2.inverter.status === ComponentStatus.NORMAL) {
            addLog('MODULE 2: Inverter STOPPED - Module in standby', 'ALARM');
        }
        if (newMod.module2.inverter.status === ComponentStatus.NORMAL && prevMod.module2.inverter.status === ComponentStatus.STARTING) {
            addLog('MODULE 2: Inverter synchronized and ON-LINE', 'INFO');
        }

        // --- SYSTEM-WIDE EVENTS ---
        // Utility power
        if (newVolt.utilityInput < 100 && prevVolt.utilityInput >= 350) {
            addLog('SYSTEM: UTILITY POWER FAILURE - Transferring to battery', 'ALARM');
        }
        if (newVolt.utilityInput >= 350 && prevVolt.utilityInput < 100) {
            addLog('SYSTEM: Utility power RESTORED', 'INFO');
        }

        // Load bus
        if (newVolt.loadBus < 100 && prevVolt.loadBus >= 350) {
            addLog('CRITICAL: Load bus voltage LOST - Critical load offline!', 'ALARM');
        }
        if (newVolt.loadBus >= 350 && prevVolt.loadBus < 100) {
            addLog('SYSTEM: Load bus energized - Critical load protected', 'INFO');
        }

        // Load sharing mode detection
        const m1Active = newMod.module1.inverter.status === ComponentStatus.NORMAL && newBrk[ParallelBreakerId.Q4_1];
        const m2Active = newMod.module2.inverter.status === ComponentStatus.NORMAL && newBrk[ParallelBreakerId.Q4_2];
        const pm1Active = prevMod.module1.inverter.status === ComponentStatus.NORMAL && prevBrk[ParallelBreakerId.Q4_1];
        const pm2Active = prevMod.module2.inverter.status === ComponentStatus.NORMAL && prevBrk[ParallelBreakerId.Q4_2];

        if (m1Active && m2Active && (!pm1Active || !pm2Active)) {
            addLog('SYSTEM: Both modules ON-LINE - Load sharing 50%/50%', 'INFO');
        }
        if (m1Active && !m2Active && pm1Active && pm2Active) {
            addLog('SYSTEM: Module 2 OFFLINE - Module 1 carrying 100% load', 'ALARM');
        }
        if (!m1Active && m2Active && pm1Active && pm2Active) {
            addLog('SYSTEM: Module 1 OFFLINE - Module 2 carrying 100% load', 'ALARM');
        }

        // Maintenance bypass
        if (newBrk[ParallelBreakerId.Q3_1] && !prevBrk[ParallelBreakerId.Q3_1]) {
            addLog('MODULE 1: Maintenance bypass ENGAGED - UPS bypassed', 'ALARM');
        }
        if (!newBrk[ParallelBreakerId.Q3_1] && prevBrk[ParallelBreakerId.Q3_1]) {
            addLog('MODULE 1: Maintenance bypass DISENGAGED', 'INFO');
        }
        if (newBrk[ParallelBreakerId.Q3_2] && !prevBrk[ParallelBreakerId.Q3_2]) {
            addLog('MODULE 2: Maintenance bypass ENGAGED - UPS bypassed', 'ALARM');
        }
        if (!newBrk[ParallelBreakerId.Q3_2] && prevBrk[ParallelBreakerId.Q3_2]) {
            addLog('MODULE 2: Maintenance bypass DISENGAGED', 'INFO');
        }

        // Battery low warnings
        if (newMod.module1.battery.chargeLevel < 20 && prevMod.module1.battery.chargeLevel >= 20) {
            addLog('MODULE 1: BATTERY LOW WARNING (<20%)', 'ALARM');
        }
        if (newMod.module2.battery.chargeLevel < 20 && prevMod.module2.battery.chargeLevel >= 20) {
            addLog('MODULE 2: BATTERY LOW WARNING (<20%)', 'ALARM');
        }
    }, []);

    useEffect(() => {
        if (!booted) return;
        const interval = setInterval(() => {
            if (failReason) return;
            setState(prev => {
                let newState = calculateParallelPowerFlow(prev);

                // AUTO MODE: Automatic recovery for both modules
                if (autoMode) {
                    const mainsOK = newState.voltages.utilityInput > 400;

                    // Module 1 Auto-Recovery
                    const q1_1Closed = newState.breakers[ParallelBreakerId.Q1_1];
                    const dc1OK = newState.modules.module1.dcBusVoltage > 180;

                    if (mainsOK && q1_1Closed && newState.modules.module1.rectifier.status === ComponentStatus.OFF) {
                        newState.modules.module1.rectifier.status = ComponentStatus.STARTING;
                        addLog('AUTO M1: Rectifier Starting', 'INFO');
                    }
                    if (dc1OK && newState.modules.module1.rectifier.status === ComponentStatus.NORMAL &&
                        newState.modules.module1.inverter.status === ComponentStatus.OFF) {
                        newState.modules.module1.inverter.status = ComponentStatus.STARTING;
                        addLog('AUTO M1: Inverter Starting', 'INFO');
                    }
                    if (newState.modules.module1.inverter.status === ComponentStatus.NORMAL &&
                        newState.modules.module1.inverter.voltageOut > 400 &&
                        newState.modules.module1.staticSwitch.mode === 'BYPASS' &&
                        !newState.modules.module1.staticSwitch.forceBypass) {

                        // PARALLEL AUTO-SAFETY: Check M2 Status
                        const m2OnBypass = newState.modules.module2.staticSwitch.mode === 'BYPASS' && newState.breakers[ParallelBreakerId.Q4_2];
                        const m2Healthy = newState.modules.module2.inverter.status === ComponentStatus.NORMAL;

                        if (!m2OnBypass) {
                            // Safe to transfer
                            newState.modules.module1.staticSwitch.mode = 'INVERTER';
                            addLog('AUTO M1: Transferred to Inverter', 'INFO');
                        } else if (!m2Healthy) {
                            // M2 is on Bypass but NOT ready. AUTO-ISOLATE M2 to allow M1 to take load.
                            newState.breakers[ParallelBreakerId.Q4_2] = false;
                            addLog('AUTO SYSTEM: Isolating Failed M2 (Opening Q4-2)', 'ACTION');
                            newState.modules.module1.staticSwitch.mode = 'INVERTER';
                            addLog('AUTO M1: Transferred to Inverter (Single Mode)', 'INFO');
                        }
                        // If M2 IS healthy and on Bypass, wait for M2 logic to sync up 
                        // (System will likely transfer both together in real life, or M1 waits for M2)
                    }

                    // Module 2 Auto-Recovery
                    const q1_2Closed = newState.breakers[ParallelBreakerId.Q1_2];
                    const dc2OK = newState.modules.module2.dcBusVoltage > 180;

                    if (mainsOK && q1_2Closed && newState.modules.module2.rectifier.status === ComponentStatus.OFF) {
                        newState.modules.module2.rectifier.status = ComponentStatus.STARTING;
                        addLog('AUTO M2: Rectifier Starting', 'INFO');
                    }
                    if (dc2OK && newState.modules.module2.rectifier.status === ComponentStatus.NORMAL &&
                        newState.modules.module2.inverter.status === ComponentStatus.OFF) {
                        newState.modules.module2.inverter.status = ComponentStatus.STARTING;
                        addLog('AUTO M2: Inverter Starting', 'INFO');
                    }
                    if (newState.modules.module2.inverter.status === ComponentStatus.NORMAL &&
                        newState.modules.module2.inverter.voltageOut > 400 &&
                        newState.modules.module2.staticSwitch.mode === 'BYPASS' &&
                        !newState.modules.module2.staticSwitch.forceBypass) {

                        // PARALLEL AUTO-SAFETY: Check M1 Status
                        const m1OnBypass = newState.modules.module1.staticSwitch.mode === 'BYPASS' && newState.breakers[ParallelBreakerId.Q4_1];
                        const m1Healthy = newState.modules.module1.inverter.status === ComponentStatus.NORMAL;

                        if (!m1OnBypass) {
                            newState.modules.module2.staticSwitch.mode = 'INVERTER';
                            addLog('AUTO M2: Transferred to Inverter', 'INFO');
                        } else if (!m1Healthy) {
                            // M1 failed on bypass. Auto-isolate M1.
                            newState.breakers[ParallelBreakerId.Q4_1] = false;
                            addLog('AUTO SYSTEM: Isolating Failed M1 (Opening Q4-1)', 'ACTION');
                            newState.modules.module2.staticSwitch.mode = 'INVERTER';
                            addLog('AUTO M2: Transferred to Inverter (Single Mode)', 'INFO');
                        }
                    }
                }

                monitorEvents(prevStateRef.current, newState);
                prevStateRef.current = JSON.parse(JSON.stringify(newState));
                return newState;
            });
        }, 200);
        return () => clearInterval(interval);
    }, [failReason, booted, monitorEvents, autoMode]);

    const toggleBreaker = useCallback((id: string) => {
        if (failReason) return;
        const bid = id as ParallelBreakerId;
        const currentState = state.breakers[bid];
        const newState = !currentState;
        const check = checkParallelInterlock('BREAKER', id, newState, state);
        if (!check.allowed) {
            setNotification({ msg: check.reason || 'Blocked', type: 'error' });
            addLog(`Interlock blocked ${id}: ${check.reason}`, 'ERROR');
            setTimeout(() => setNotification(null), 3000);
            if (activeProcedure) setMistakes(m => m + 1);
            return;
        }
        addLog(`Operator ${newState ? 'CLOSED' : 'OPENED'} Breaker ${id}`, 'ACTION');
        setState(prev => {
            const nextState = { ...prev, breakers: { ...prev.breakers, [bid]: newState } };
            return calculateParallelPowerFlow(nextState);
        });
    }, [state, failReason, activeProcedure]);

    const handleFaceplateAction = (action: string) => {
        if (!selectedComp) return;
        const [mod, comp] = selectedComp.split('.');
        if (!mod || !comp) return;

        addLog(`Command Sent to ${selectedComp.toUpperCase()}: ${action}`, 'ACTION');

        setState(prev => {
            const next = JSON.parse(JSON.stringify(prev)) as ParallelSimulationState;
            const targetModule = next.modules[mod as 'module1' | 'module2'];
            if (!targetModule) return prev;

            if (comp === 'rectifier') {
                if (action === 'START') targetModule.rectifier.status = ComponentStatus.STARTING;
                if (action === 'STOP') targetModule.rectifier.status = ComponentStatus.OFF;
                if (action === 'RESET' && targetModule.rectifier.status === ComponentStatus.FAULT) {
                    targetModule.rectifier.status = ComponentStatus.OFF;
                }
            } else if (comp === 'inverter') {
                if (action === 'START') targetModule.inverter.status = ComponentStatus.STARTING;
                if (action === 'STOP') targetModule.inverter.status = ComponentStatus.OFF;
                if (action === 'RESET' && targetModule.inverter.status === ComponentStatus.FAULT) {
                    targetModule.inverter.status = ComponentStatus.OFF;
                }
            } else if (comp === 'staticSwitch') {
                // Use Controller for Safety Interlocks
                const result = ParallelUPSController.executeCommand(prev, {
                    type: 'COMPONENT',
                    target: selectedComp,
                    action: action
                });

                if (result.log.includes('ERROR')) {
                    setNotification({ msg: result.log.replace('ERROR: ', ''), type: 'error' });
                    setTimeout(() => setNotification(null), 3000);
                    addLog(result.log, 'ERROR');
                    return prev;
                }

                addLog(result.log, 'ACTION');
                return calculateParallelPowerFlow(result.newState);
            }
            return calculateParallelPowerFlow(next);
        });
    };

    const startProcedure = (procId: string) => {
        if (procId === '') {
            setActiveProcedure(null);
            setStepIndex(0);
            setProcedureCompleted(false);
            setFailReason(null);
            setMistakes(0);
            setLogs([]);
            setState(INITIAL_PARALLEL_STATE);
            return;
        }
        let proc;
        if (procId === 'sys_maint_bypass') proc = PROC_SYSTEM_MAINT_BYPASS;
        else if (procId === 'module_iso') proc = PROC_MODULE_ISOLATION;
        else if (procId === 'module1_pm') proc = PROC_MODULE_1_PM;
        else if (procId === 'module1_restore') proc = PROC_MODULE_1_RESTORE;
        else if (procId === 'utility_fail_test') proc = PROC_UTILITY_FAILURE_TEST;
        if (proc) {
            setActiveProcedure(proc);
            setStepIndex(0);
            setProcedureCompleted(false);
            setFailReason(null);
            setMistakes(0);
            setState(proc.initialState as ParallelSimulationState);
        }
    };

    const nextStep = () => {
        if (!activeProcedure) return;
        if (stepIndex < activeProcedure.steps.length - 1) setStepIndex(stepIndex + 1);
        else setProcedureCompleted(true);
    };

    const getSelectedData = () => {
        if (!selectedComp) return null;
        const [mod, comp] = selectedComp.split('.');
        if (!state.modules[mod as 'module1' | 'module2']) return null;
        return state.modules[mod as 'module1' | 'module2'][comp as 'rectifier'];
    };

    if (!booted) return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
            <div className="w-96 text-center">
                <div className="text-4xl font-black text-cyan-500 mb-2 tracking-tighter">PARALLEL TWIN</div>
                <div className="text-sm font-mono text-slate-500 mb-8">N+1 REDUNDANT UPS SIMULATOR</div>
                <button onClick={() => setBooted(true)} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-lg shadow-cyan-500/30 transition-all">INITIALIZE PARALLEL SYSTEM</button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
            {selectedComp && (
                <ParallelFaceplate
                    type={selectedComp}
                    data={getSelectedData()}
                    onClose={() => setSelectedComp(null)}
                    onAction={handleFaceplateAction}
                />
            )}
            {notification && (
                <div className="absolute top-32 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded shadow-2xl border-l-4 border-red-500 animate-slide-down">
                    {notification.msg}
                </div>
            )}
            <div className="flex-1 flex flex-col p-0 h-full min-h-0 relative">
                <div className="flex-none flex justify-between items-center bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b-2 border-cyan-500/30 shadow-lg z-10 px-2 py-1 h-14 relative overflow-hidden">
                    {/* Subtle animated glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent opacity-50"></div>
                    <div className="flex flex-col justify-center cursor-pointer group relative z-10 flex-shrink-0" onClick={onReturnToMenu}>
                        <h1 className="text-base font-black italic text-white tracking-tighter leading-none group-hover:text-cyan-400 transition-colors">SafeOps <span className="text-cyan-400">UPS</span></h1>
                        <div className={`text-[9px] font-mono tracking-wide ${state.systemMode === ParallelSystemMode.ONLINE_PARALLEL ? 'text-green-400' : state.systemMode === ParallelSystemMode.BATTERY_PARALLEL ? 'text-orange-400 animate-pulse' : state.systemMode === ParallelSystemMode.DEGRADED_REDUNDANCY ? 'text-yellow-400' : state.systemMode === ParallelSystemMode.EMERGENCY_SHUTDOWN ? 'text-red-500 animate-pulse' : 'text-cyan-300/70'}`}>
                            {state.systemMode.replace(/_/g, ' ')} {state.redundancyOK ? '✓' : '⚠'}
                        </div>
                    </div>
                    <div className="h-full flex-1 mx-4">
                        <ParallelDashboard state={state} />
                    </div>
                    <div className="flex items-center gap-2 relative z-10 flex-shrink-0">
                        <button onClick={() => startProcedure('')} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 border border-green-400 rounded text-xs font-bold text-white transition-colors shadow-md" title="Reset System">
                            🔄 <span className="hidden sm:inline">RESET</span>
                        </button>
                        <button onClick={() => setAutoMode(!autoMode)} className={`flex items-center gap-1 px-3 py-1.5 rounded border text-xs font-bold transition-colors ${autoMode ? 'bg-emerald-700 border-emerald-400 text-white' : 'bg-slate-700 border-slate-500 text-slate-300'}`} title={autoMode ? 'Auto-recovery ON' : 'Manual Mode'}>
                            ⚡ <span className="hidden sm:inline">{autoMode ? 'AUTO' : 'MANUAL'}</span>
                        </button>
                        <button onClick={() => setShowFaultPanel(!showFaultPanel)} className={`flex items-center gap-1 px-3 py-1.5 rounded border text-xs font-bold transition-colors ${showFaultPanel ? 'bg-red-700 border-red-400 text-white' : 'bg-slate-700 border-slate-500 text-slate-300'}`} title="Fault Injection Panel">
                            🎓 <span className="hidden sm:inline">FAULTS</span>
                        </button>
                        <button onClick={() => { setState(prev => ({ ...prev, faults: { ...prev.faults, epo: !prev.faults.epo } })); addLog(state.faults.epo ? 'EPO Reset' : 'EPO!', 'ALARM'); }} className={`flex items-center gap-1 px-3 py-1.5 rounded border text-xs font-bold transition-colors ${state.faults.epo ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-red-900 border-red-700 text-red-300'}`} title="Emergency Power Off">
                            🛑 <span className="hidden sm:inline">EPO</span>
                        </button>
                    </div>
                </div>

                {/* Fault Injection Panel */}
                {showFaultPanel && (
                    <div className="absolute top-24 right-4 z-50 bg-slate-900/95 border border-red-600/50 p-4 rounded-lg shadow-2xl w-72 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-red-400 font-bold text-xs uppercase tracking-wider">🎓 Failure Injection</h3>
                            <button onClick={() => setShowFaultPanel(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => { setState(prev => ({ ...prev, faults: { ...prev.faults, mainsFailure: !prev.faults.mainsFailure } })); addLog(state.faults.mainsFailure ? 'Utility power restored' : 'FAULT INJECTED: Mains Failure', 'ALARM'); }}
                                className={`w-full text-left p-2 rounded border text-xs font-bold transition-all ${state.faults.mainsFailure ? 'bg-red-700 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-red-900/30'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <span>⚡ Trip Mains Input</span>
                                    {state.faults.mainsFailure && <span className="animate-pulse">ACTIVE</span>}
                                </div>
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <div className="text-[10px] text-slate-500 font-mono text-center">MODULE 1</div>
                                    <button
                                        onClick={() => { setState(prev => ({ ...prev, faults: { ...prev.faults, module1RectFault: !prev.faults.module1RectFault } })); addLog(state.faults.module1RectFault ? 'M1 Rectifier fault cleared' : 'FAULT: M1 Rectifier Trip', 'ALARM'); }}
                                        className={`w-full px-2 py-1.5 rounded border text-[10px] font-bold ${state.faults.module1RectFault ? 'bg-red-700 border-red-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-red-900/30'}`}
                                    >RECT FAIL</button>
                                    <button
                                        onClick={() => { setState(prev => ({ ...prev, faults: { ...prev.faults, module1InvFault: !prev.faults.module1InvFault } })); addLog(state.faults.module1InvFault ? 'M1 Inverter fault cleared' : 'FAULT: M1 Inverter Trip', 'ALARM'); }}
                                        className={`w-full px-2 py-1.5 rounded border text-[10px] font-bold ${state.faults.module1InvFault ? 'bg-red-700 border-red-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-red-900/30'}`}
                                    >INV FAIL</button>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] text-slate-500 font-mono text-center">MODULE 2</div>
                                    <button
                                        onClick={() => { setState(prev => ({ ...prev, faults: { ...prev.faults, module2RectFault: !prev.faults.module2RectFault } })); addLog(state.faults.module2RectFault ? 'M2 Rectifier fault cleared' : 'FAULT: M2 Rectifier Trip', 'ALARM'); }}
                                        className={`w-full px-2 py-1.5 rounded border text-[10px] font-bold ${state.faults.module2RectFault ? 'bg-red-700 border-red-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-red-900/30'}`}
                                    >RECT FAIL</button>
                                    <button
                                        onClick={() => { setState(prev => ({ ...prev, faults: { ...prev.faults, module2InvFault: !prev.faults.module2InvFault } })); addLog(state.faults.module2InvFault ? 'M2 Inverter fault cleared' : 'FAULT: M2 Inverter Trip', 'ALARM'); }}
                                        className={`w-full px-2 py-1.5 rounded border text-[10px] font-bold ${state.faults.module2InvFault ? 'bg-red-700 border-red-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-red-900/30'}`}
                                    >INV FAIL</button>
                                </div>
                            </div>

                            <h3 className="text-orange-400 font-bold mt-4 mb-2 text-xs uppercase tracking-wider border-t border-white/10 pt-2">IEC 62040-3 Standard Faults</h3>

                            <button onClick={() => { setState(prev => ({ ...prev, faults: { ...prev.faults, dcLinkCapacitorFailure: !prev.faults.dcLinkCapacitorFailure } })); addLog(state.faults.dcLinkCapacitorFailure ? 'DC Link Capacitor Recovered' : 'FAULT: DC Link Capacitor Failure', 'ALARM'); }}
                                className={`w-full text-left text-xs p-2 rounded border transition-all ${state.faults.dcLinkCapacitorFailure ? 'bg-orange-900 border-orange-500 text-orange-200' : 'bg-slate-800 hover:bg-orange-900/50 border-slate-700 text-slate-300'}`}>
                                <div className="flex justify-between">
                                    <span>DC Link Capacitor Fail</span>
                                    {state.faults.dcLinkCapacitorFailure && <span>✓</span>}
                                </div>
                                <div className="text-[9px] text-slate-500 mt-0.5 font-mono">IEC 62040-3 §6.4</div>
                            </button>

                            <button onClick={() => { setState(prev => ({ ...prev, faults: { ...prev.faults, groundFault: !prev.faults.groundFault } })); addLog(state.faults.groundFault ? 'Ground Fault Cleared' : 'FAULT: Ground Fault Detected', 'ALARM'); }}
                                className={`w-full text-left text-xs p-2 rounded border transition-all ${state.faults.groundFault ? 'bg-orange-900 border-orange-500 text-orange-200' : 'bg-slate-800 hover:bg-orange-900/50 border-slate-700 text-slate-300'}`}>
                                <div className="flex justify-between">
                                    <span>Ground Fault (HRG)</span>
                                    {state.faults.groundFault && <span>✓</span>}
                                </div>
                                <div className="text-[9px] text-slate-500 mt-0.5 font-mono">IEEE 142</div>
                            </button>

                            <button onClick={() => { setState(prev => ({ ...prev, faults: { ...prev.faults, syncDrift: !prev.faults.syncDrift } })); addLog(state.faults.syncDrift ? 'Sync Drift Corrected' : 'FAULT: Oscillator Sync Drift', 'ALARM'); }}
                                className={`w-full text-left text-xs p-2 rounded border transition-all ${state.faults.syncDrift ? 'bg-orange-900 border-orange-500 text-orange-200' : 'bg-slate-800 hover:bg-orange-900/50 border-slate-700 text-slate-300'}`}>
                                <div className="flex justify-between">
                                    <span>Sync Drift Simulation</span>
                                    {state.faults.syncDrift && <span>✓</span>}
                                </div>
                                <div className="text-[9px] text-slate-500 mt-0.5 font-mono">IEC 62040-3 §5.3.4</div>
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 min-h-0 relative bg-slate-900 overflow-hidden border-t border-slate-800">
                    {/* Interactive SLD Hint Banner - Bottom left corner to avoid covering components */}
                    <div className="absolute bottom-2 left-2 z-30 bg-slate-800/90 px-3 py-1 rounded border border-cyan-500/40 shadow-lg">
                        <span className="text-cyan-400 text-[10px] font-bold">💡 Click switches to toggle • Click components for faceplate</span>
                    </div>
                    <ParallelSLD
                        state={state}
                        onBreakerToggle={toggleBreaker}
                        onComponentClick={setSelectedComp}
                    />
                </div>
                <div className="flex-none h-48 flex gap-0 border-t-2 border-cyan-500/20 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
                    <div className="w-1/2 h-full border-r border-slate-800">
                        <ParallelWaveforms state={state} />
                    </div>
                    <div className="w-1/2 h-full bg-slate-900 flex flex-col">
                        <div className="flex bg-slate-800/50 border-b border-slate-800">
                            <span className="flex-1 py-1 text-[10px] font-bold tracking-widest text-white bg-slate-700 text-center">EVENT LOG</span>
                        </div>
                        <div className="flex-1 overflow-auto p-2 font-mono text-[10px] space-y-1" ref={logContainerRef}>
                            {logs.map(l => (
                                <div key={l.id} className="flex gap-2 text-slate-300 border-b border-slate-800/50 pb-0.5">
                                    <span className="text-slate-500 w-14 shrink-0">{l.timestamp}</span>
                                    <span className={l.type === 'ALARM' ? 'text-red-400 font-bold' : l.type === 'ACTION' ? 'text-cyan-400' : ''}>{l.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-56 flex-none bg-slate-900 border-l border-slate-800 shadow-xl z-20 overflow-hidden">
                <ParallelProcedurePanel
                    procedure={activeProcedure}
                    currentStepIndex={stepIndex}
                    state={state}
                    onNextStep={nextStep}
                    onSelectProcedure={startProcedure}
                    completed={procedureCompleted}
                    failedReason={failReason}
                    mistakeCount={mistakes}
                />
            </div>
        </div>
    );
};

export default ParallelApp;
