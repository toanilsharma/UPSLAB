
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParallelSLD } from './components/ParallelSLD';
import { ParallelWaveforms } from './components/ParallelWaveforms';
import { ParallelProcedurePanel } from './components/ParallelProcedurePanel';
import { ParallelFaceplate } from './components/ParallelFaceplate';
import { ParallelDashboard } from './components/ParallelDashboard';
import { INITIAL_PARALLEL_STATE, PROC_SYSTEM_MAINT_BYPASS, PROC_MODULE_ISOLATION } from './parallel_constants';
import { calculateParallelPowerFlow, checkParallelInterlock } from './services/parallel_engine';
import { ParallelSimulationState, ParallelBreakerId, ParallelProcedure, ComponentStatus, LogEntry } from './parallel_types';

const ParallelApp = () => {
    const [booted, setBooted] = useState(false);
    const [state, setState] = useState<ParallelSimulationState>(INITIAL_PARALLEL_STATE);
    const [activeProcedure, setActiveProcedure] = useState<ParallelProcedure | null>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [procedureCompleted, setProcedureCompleted] = useState(false);
    const [failReason, setFailReason] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string, type: 'error' | 'info' } | null>(null);
    const [mistakes, setMistakes] = useState(0);

    // FACEPLATE STATE
    const [selectedComp, setSelectedComp] = useState<string | null>(null);

    // LOGS
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);

    const addLog = (message: string, type: LogEntry['type'] = 'INFO') => {
        const entry: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            message,
            type
        };
        setLogs(prev => [entry, ...prev].slice(0, 100)); // Keep last 100
    };

    // Simulation Tick
    useEffect(() => {
        if (!booted) return;

        const interval = setInterval(() => {
            if (failReason) return; // Stop physics on fail

            setState(prev => {
                const next = calculateParallelPowerFlow(prev);

                // Log Alarms (Debounced in real app, simplified here)
                // const newAlarms = next.alarms.filter(a => !prev.alarms.includes(a));
                // newAlarms.forEach(a => addLog(`ALARM: ${a}`, 'ALARM'));

                return next;
            });
        }, 200);
        return () => clearInterval(interval);
    }, [failReason, booted]);

    const toggleBreaker = useCallback((id: string) => {
        if (failReason) return;

        // Type casting because simple string id
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
                if (action === 'RESET') targetModule.rectifier.status = ComponentStatus.OFF;
            }
            else if (comp === 'inverter') {
                if (action === 'START') targetModule.inverter.status = ComponentStatus.STARTING;
                if (action === 'STOP') targetModule.inverter.status = ComponentStatus.OFF;
            }
            else if (comp === 'staticSwitch') {
                if (action === 'TO_BYPASS') targetModule.staticSwitch.mode = 'BYPASS';
                if (action === 'TO_INVERTER') targetModule.staticSwitch.mode = 'INVERTER';
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

    // Get Faceplate Data
    const getSelectedData = () => {
        if (!selectedComp) return null;
        const [mod, comp] = selectedComp.split('.');
        if (!state.modules[mod as 'module1' | 'module2']) return null;
        return state.modules[mod as 'module1' | 'module2'][comp as 'rectifier']; // 'rectifier' is just a key assumption for typing, data matches
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

                <div className="flex-none flex justify-between items-center bg-slate-900 border-b border-cyan-500/20 shadow-lg z-10 px-4 py-2 h-20">
                    <div className="flex flex-col justify-center">
                        <h1 className="text-xl font-black italic text-slate-100 tracking-tighter leading-none">OMNI<span className="text-cyan-500">POWER</span> <span className="text-sm font-normal text-slate-400">PARALLEL</span></h1>
                        <div className="text-[10px] text-slate-400 font-mono tracking-widest mt-1">REDUNDANT ARCHITECTURE</div>
                    </div>

                    <div className="h-full flex-1 mx-4">
                        <ParallelDashboard state={state} />
                    </div>

                    <div className="flex flex-col gap-2">
                        <button onClick={() => startProcedure('')} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-xs font-bold text-slate-300 transition-colors">RESET SIM</button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 relative bg-slate-900 overflow-hidden border-t border-slate-800">
                    <ParallelSLD
                        state={state}
                        onBreakerToggle={toggleBreaker}
                        onComponentClick={setSelectedComp}
                    />
                </div>

                <div className="flex-none h-40 flex gap-0 border-t border-slate-800">
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
