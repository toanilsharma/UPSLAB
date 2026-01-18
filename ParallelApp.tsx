
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParallelSLD } from './components/ParallelSLD';
import { ParallelWaveforms } from './components/ParallelWaveforms';
import { ParallelProcedurePanel } from './components/ParallelProcedurePanel';
import { ParallelFaceplate } from './components/ParallelFaceplate';
import { ParallelDashboard } from './components/ParallelDashboard';
import { INITIAL_PARALLEL_STATE, PROC_SYSTEM_MAINT_BYPASS, PROC_MODULE_ISOLATION, PROC_MODULE_1_PM, PROC_MODULE_1_RESTORE, PROC_UTILITY_FAILURE_TEST } from './parallel_constants';
import { calculateParallelPowerFlow, checkParallelInterlock } from './services/parallel_engine';
import { ParallelSimulationState, ParallelBreakerId, ParallelProcedure, ComponentStatus, LogEntry } from './parallel_types';

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
                const newState = calculateParallelPowerFlow(prev);
                monitorEvents(prevStateRef.current, newState);
                prevStateRef.current = JSON.parse(JSON.stringify(newState));
                return newState;
            });
        }, 200);
        return () => clearInterval(interval);
    }, [failReason, booted, monitorEvents]);

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
                if (action === 'TO_BYPASS') {
                    targetModule.staticSwitch.mode = 'BYPASS';
                    targetModule.staticSwitch.forceBypass = true; // Force bypass mode
                }
                if (action === 'TO_INVERTER') {
                    // Only allow transfer to inverter if inverter is ready
                    if (targetModule.inverter.status === ComponentStatus.NORMAL && targetModule.inverter.voltageOut > 390) {
                        targetModule.staticSwitch.mode = 'INVERTER';
                        targetModule.staticSwitch.forceBypass = false;
                    } else {
                        setNotification({ msg: `Transfer Failed: ${mod.toUpperCase()} Inverter Not Ready`, type: 'error' });
                        setTimeout(() => setNotification(null), 3000);
                        return prev; // Don't update state if transfer fails
                    }
                }
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
                <div className="flex-none flex justify-between items-center bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/10 z-10 px-4 py-2 h-20 relative overflow-hidden">
                    {/* Subtle animated glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent opacity-50"></div>
                    <div className="flex flex-col justify-center cursor-pointer group relative z-10" onClick={onReturnToMenu}>
                        <h1 className="text-2xl font-black italic text-white tracking-tighter leading-none group-hover:text-cyan-400 transition-colors drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)]">SafeOps <span className="text-cyan-400">UPS</span> <span className="text-base font-normal text-slate-300">PARALLEL</span></h1>
                        <div className="text-[11px] text-cyan-300/70 font-mono tracking-widest mt-1 group-hover:text-cyan-400 transition-colors">REDUNDANT ARCHITECTURE {onReturnToMenu && '· CLICK TO EXIT'}</div>
                    </div>
                    <div className="h-full flex-1 mx-4">
                        <ParallelDashboard state={state} />
                    </div>
                    <div className="flex flex-col gap-2 relative z-10">
                        <button onClick={() => startProcedure('')} className="px-4 py-1.5 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 rounded-lg border border-cyan-500/30 hover:border-cyan-400/50 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-all shadow-lg hover:shadow-cyan-500/20">RESET SIM</button>
                        <button onClick={() => alert('💡 INTERACTIVE SLD GUIDE\\n\\n• BREAKERS: Click any breaker (Q1, Q2, Q3, Q4, CB-L1, CB-L2) to toggle it OPEN/CLOSED\\n\\n• COMPONENTS: Click on RECT, INV, or STS boxes to open the faceplate control panel\\n\\n• FACEPLATE: From the faceplate, you can START/STOP components or transfer the STS\\n\\n• LOADS: Click on CRITICAL-A or CRITICAL-B to view load status\\n\\n• EVENT LOG: Watch the event log for real-time system events\\n\\n• SOPs: Follow Standard Operating Procedures on the right panel for guided training')} className="px-4 py-1.5 bg-gradient-to-br from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 rounded-lg border border-blue-500/30 hover:border-blue-400/50 text-xs font-bold text-blue-300 hover:text-blue-200 transition-all shadow-lg hover:shadow-blue-500/20">? HELP</button>
                    </div>
                </div>
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
            <div className="w-80 flex-none bg-slate-900 border-l border-slate-800 shadow-xl z-20">
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
