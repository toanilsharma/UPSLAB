
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SLD } from './components/SLD';
import { Waveforms } from './components/Waveforms';
import { ProcedurePanel } from './components/ProcedurePanel';
import { Faceplate } from './components/Faceplate';
import { Dashboard } from './components/Dashboard';
import { TutorialOverlay, useTutorial } from './components/TutorialOverlay';
import { AchievementPanel, AchievementToast } from './components/AchievementPanel';
import { INITIAL_STATE, PROC_MAINT_BYPASS, PROC_RETURN_FROM_BYPASS, PROC_BLACK_START, PROC_COLD_START, PROC_EMERGENCY, PROC_FAILURE_RECOVERY } from './constants';
import { calculatePowerFlow, checkInterlock } from './services/engine';
import { SimulationState, BreakerId, Procedure, ComponentStatus, LogEntry } from './types';
import { audioService } from './services/audioService';
import { achievementService, Achievement } from './services/achievementService';

interface AppProps {
    onReturnToMenu?: () => void;
}

const App: React.FC<AppProps> = ({ onReturnToMenu }) => {
    const [booted, setBooted] = useState(false);
    const [state, setState] = useState<SimulationState>(INITIAL_STATE);
    const [activeProcedure, setActiveProcedure] = useState<Procedure | null>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [procedureCompleted, setProcedureCompleted] = useState(false);
    const [failReason, setFailReason] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string, type: 'error' | 'info' } | null>(null);
    const [showInstructor, setShowInstructor] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    const [procedureStartTime, setProcedureStartTime] = useState<number>(0);

    // NEW FEATURES
    const { showTutorial, completeTutorial, skipTutorial, restartTutorial } = useTutorial();
    const [showAchievements, setShowAchievements] = useState(false);
    const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

    // FACEPLATE STATE
    const [selectedComp, setSelectedComp] = useState<string | null>(null);

    // LOGS
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeTab, setActiveTab] = useState<'METRICS' | 'LOGS'>('METRICS');
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
                const next = calculatePowerFlow(prev);

                // Log Alarms
                const newAlarms = next.alarms.filter(a => !prev.alarms.includes(a));
                const resolvedAlarms = prev.alarms.filter(a => !next.alarms.includes(a));
                newAlarms.forEach(a => addLog(`ALARM: ${a}`, 'ALARM'));
                resolvedAlarms.forEach(a => addLog(`CLEARED: ${a}`, 'INFO'));

                // Log Auto-Ops
                if (prev.components.staticSwitch.mode !== next.components.staticSwitch.mode) {
                    addLog(`STS TRANSFER: ${prev.components.staticSwitch.mode} -> ${next.components.staticSwitch.mode}`, 'ACTION');
                }
                if (prev.components.inverter.status !== ComponentStatus.NORMAL && next.components.inverter.status === ComponentStatus.NORMAL) {
                    addLog('Inverter Output Stabilized.', 'INFO');
                }

                return next;
            });
        }, 200); // Faster physics tick for smooth ramp-up
        return () => clearInterval(interval);
    }, [failReason, booted]);

    // Handle Breaker Toggle
    const toggleBreaker = useCallback((id: BreakerId) => {
        if (failReason) return;

        const currentState = state.breakers[id];
        const newState = !currentState;

        const check = checkInterlock('BREAKER', id, newState, state);
        if (!check.allowed) {
            audioService.play('error');
            setNotification({ msg: check.reason || 'Blocked', type: 'error' });
            addLog(`Interlock blocked ${id}: ${check.reason}`, 'ERROR');
            setTimeout(() => setNotification(null), 3000);
            if (activeProcedure) setMistakes(m => m + 1);
            return;
        }

        // Play sound effect
        audioService.play(newState ? 'breaker_close' : 'breaker_open');

        addLog(`Operator ${newState ? 'CLOSED' : 'OPENED'} Breaker ${id}`, 'ACTION');
        setState(prev => {
            const nextState = { ...prev, breakers: { ...prev.breakers, [id]: newState } };
            return calculatePowerFlow(nextState);
        });
    }, [state, failReason, activeProcedure]);

    // Handle Faceplate Actions
    const handleFaceplateAction = (action: string) => {
        if (!selectedComp) return;

        // Play sound
        if (action === 'START') audioService.play('component_start');
        else if (action === 'STOP') audioService.play('component_stop');
        else if (action === 'TO_BYPASS' || action === 'TO_INVERTER') audioService.play('static_switch');
        else audioService.play('button_click');

        addLog(`Command Sent to ${selectedComp.toUpperCase()}: ${action}`, 'ACTION');

        // Track inspection for achievements
        achievementService.onComponentInspected(selectedComp);

        setState(prev => {
            const next = { ...prev, components: { ...prev.components } };

            if (selectedComp === 'rectifier') {
                if (action === 'START') next.components.rectifier.status = ComponentStatus.STARTING;
                if (action === 'STOP') next.components.rectifier.status = ComponentStatus.OFF;
                if (action === 'RESET' && next.components.rectifier.status === ComponentStatus.FAULT) next.components.rectifier.status = ComponentStatus.OFF;
            }
            else if (selectedComp === 'inverter') {
                if (action === 'START') next.components.inverter.status = ComponentStatus.STARTING;
                if (action === 'STOP') next.components.inverter.status = ComponentStatus.OFF;
                if (action === 'RESET' && next.components.inverter.status === ComponentStatus.FAULT) next.components.rectifier.status = ComponentStatus.OFF;
            }
            else if (selectedComp === 'staticSwitch') {
                if (action === 'TO_BYPASS') {
                    next.components.staticSwitch.mode = 'BYPASS';
                    next.components.staticSwitch.forceBypass = true;
                }
                if (action === 'TO_INVERTER') {
                    if (next.components.inverter.status === ComponentStatus.NORMAL) {
                        next.components.staticSwitch.mode = 'INVERTER';
                        next.components.staticSwitch.forceBypass = false;
                    } else {
                        audioService.play('error');
                        setNotification({ msg: 'Transfer Failed: Inverter Not Ready', type: 'error' });
                    }
                }
            }
            return calculatePowerFlow(next);
        });
    };

    // Instructor Faults
    const injectFault = (type: string) => {
        audioService.play('alarm_warning');
        addLog(`FAULT INJECTION: ${type}`, 'ALARM');
        setState(prev => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep clone
            if (type === 'UTILITY_LOSS') next.voltages.utilityInput = next.voltages.utilityInput > 0 ? 0 : 400;
            if (type === 'RECTIFIER_FAULT') next.components.rectifier.status = ComponentStatus.FAULT;
            if (type === 'INVERTER_FAULT') next.components.inverter.status = ComponentStatus.FAULT;
            if (type === 'BATTERY_DRAIN') next.battery.chargeLevel = 10;
            return calculatePowerFlow(next);
        });
    };

    // Procedure Logic (simplified for brevity, logic remains same)
    const startProcedure = (procId: string) => {
        if (procId === '') {
            setActiveProcedure(null);
            setStepIndex(0);
            setProcedureCompleted(false);
            setFailReason(null);
            setMistakes(0);
            setLogs([]);
            setState(INITIAL_STATE);
            return;
        }
        let proc;
        if (procId === 'maint_bypass') proc = PROC_MAINT_BYPASS;
        else if (procId === 'return_bypass') proc = PROC_RETURN_FROM_BYPASS;
        else if (procId === 'black_start') proc = PROC_BLACK_START;
        else if (procId === 'cold_start') proc = PROC_COLD_START;
        else if (procId === 'emergency') proc = PROC_EMERGENCY;
        else proc = PROC_FAILURE_RECOVERY;
        setActiveProcedure(proc);
        setStepIndex(0);
        setProcedureCompleted(false);
        setFailReason(null);
        setMistakes(0);
        setProcedureStartTime(Date.now()); // Track start time for achievements
        setState(proc.initialState as SimulationState);
    };

    const nextStep = () => {
        if (!activeProcedure) return;

        if (stepIndex < activeProcedure.steps.length - 1) {
            audioService.play('success');
            setStepIndex(stepIndex + 1);
        } else {
            // Procedure complete!
            const timeElapsed = (Date.now() - procedureStartTime) / 1000;
            audioService.play('success');
            setProcedureCompleted(true);

            // Track achievement
            const newAchievements = achievementService.onProcedureComplete(
                activeProcedure.id,
                mistakes,
                timeElapsed
            );

            // Show achievement toast if any unlocked
            if (newAchievements.length > 0) {
                setNewAchievement(newAchievements[0]);
            }
        }
    };

    // Boot Screen
    if (!booted) return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
            <div className="w-96 text-center">
                <div className="text-4xl font-black text-cyan-500 mb-2 tracking-tighter">DIGITAL TWIN</div>
                <div className="text-sm font-mono text-slate-500 mb-8">INDUSTRIAL POWER SIMULATOR v2.0</div>
                <button onClick={() => setBooted(true)} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-lg shadow-cyan-500/30 transition-all">INITIALIZE SYSTEM</button>
            </div>
        </div>
    );

    // MAIN LAYOUT
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">

            {/* FACEPLATE MODAL */}
            {selectedComp && (
                <Faceplate
                    type={selectedComp}
                    data={state.components[selectedComp as keyof typeof state.components]}
                    onClose={() => setSelectedComp(null)}
                    onAction={handleFaceplateAction}
                />
            )}

            {/* NOTIFICATIONS */}
            {notification && (
                <div className="absolute top-32 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded shadow-2xl border-l-4 border-red-500 animate-slide-down">
                    {notification.msg}
                </div>
            )}

            {/* TUTORIAL OVERLAY */}
            <TutorialOverlay
                show={showTutorial}
                onComplete={completeTutorial}
                onSkip={skipTutorial}
            />

            {/* ACHIEVEMENT PANEL */}
            <AchievementPanel
                visible={showAchievements}
                onClose={() => setShowAchievements(false)}
            />

            {/* ACHIEVEMENT TOAST */}
            <AchievementToast
                achievement={newAchievement}
                onDismiss={() => setNewAchievement(null)}
            />

            {/* LEFT COLUMN: SIMULATION */}
            <div className="flex-1 flex flex-col p-0 h-full min-h-0 relative">

                {/* Top Bar: Header & Gauges - BRIGHTER & LARGER */}
                <div className="flex-none flex justify-between items-center bg-slate-900 border-b border-cyan-500/20 shadow-lg z-10 px-4 py-2 h-20">
                    <div className="flex flex-col justify-center cursor-pointer group" onClick={onReturnToMenu}>
                        <h1 className="text-xl font-black italic text-slate-100 tracking-tighter leading-none group-hover:text-cyan-400 transition-colors">SafeOps <span className="text-cyan-500">UPS</span> <span className="text-sm font-normal text-slate-400">SINGLE</span></h1>
                        <div className="text-[10px] text-slate-400 font-mono tracking-widest mt-1 group-hover:text-cyan-500 transition-colors">DIGITAL TWIN v2.5{onReturnToMenu && ' · CLICK TO EXIT'}</div>
                    </div>

                    <div className="h-full flex-1 mx-4">
                        <Dashboard state={state} />
                    </div>

                    <div className="flex flex-col gap-2">
                        <button onClick={() => startProcedure('')} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-xs font-bold text-slate-300 transition-colors">RESET SIM</button>
                        <button onClick={restartTutorial} className="px-3 py-1 bg-slate-800 hover:bg-blue-900 rounded border border-slate-600 hover:border-blue-500 text-xs font-bold text-slate-300 hover:text-blue-400 transition-colors">? HELP</button>
                        <button onClick={() => setShowInstructor(!showInstructor)} className={`px-3 py-1 rounded border text-xs font-bold transition-colors ${showInstructor ? 'bg-red-900 border-red-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>INSTRUCTOR</button>
                    </div>
                </div>

                {/* Instructor Panel */}
                {showInstructor && (
                    <div className="absolute top-24 right-4 z-40 bg-slate-900 border border-red-600/50 p-4 rounded shadow-2xl w-64 backdrop-blur-md">
                        <h3 className="text-red-400 font-bold mb-2 text-xs uppercase tracking-wider">Failure Injection</h3>
                        <div className="space-y-2">
                            <button onClick={() => injectFault('UTILITY_LOSS')} className="w-full text-left text-xs p-2 bg-slate-800 hover:bg-red-900/50 rounded border border-slate-700">Trip Mains Input</button>
                            <button onClick={() => injectFault('RECTIFIER_FAULT')} className="w-full text-left text-xs p-2 bg-slate-800 hover:bg-red-900/50 rounded border border-slate-700">Fail Rectifier IGBTs</button>
                            <button onClick={() => injectFault('INVERTER_FAULT')} className="w-full text-left text-xs p-2 bg-slate-800 hover:bg-red-900/50 rounded border border-slate-700">Fail Inverter Module</button>
                            <button onClick={() => injectFault('BATTERY_DRAIN')} className="w-full text-left text-xs p-2 bg-slate-800 hover:bg-red-900/50 rounded border border-slate-700">Simulate Battery Failure</button>
                        </div>
                    </div>
                )}

                {/* MAIN SLD VIEW */}
                <div className="flex-1 min-h-0 relative bg-slate-900 overflow-hidden border-t border-slate-800">
                    {/* Interactive SLD Hint Banner - Bottom left corner to avoid covering components */}
                    <div className="absolute bottom-2 left-2 z-30 bg-slate-800/90 px-3 py-1 rounded border border-cyan-500/40 shadow-lg">
                        <span className="text-cyan-400 text-[10px] font-bold">💡 Click switches to toggle • Click components for faceplate</span>
                    </div>
                    <SLD
                        state={state}
                        onBreakerToggle={toggleBreaker}
                        onComponentClick={setSelectedComp}
                    />
                </div>

                {/* BOTTOM PANEL: METRICS & WAVES */}
                <div className="flex-none h-64 flex gap-0 border-t border-slate-800">
                    <div className="w-1/2 h-full border-r border-slate-800">
                        <Waveforms state={state} />
                    </div>
                    <div className="w-1/2 h-full bg-slate-900 flex flex-col">
                        <div className="flex bg-slate-800/50 border-b border-slate-800">
                            <button onClick={() => setActiveTab('LOGS')} className={`flex-1 py-1 text-[10px] font-bold tracking-widest ${activeTab === 'LOGS' ? 'text-white bg-slate-700' : 'text-slate-500'}`}>EVENT LOG</button>
                            <button onClick={() => setActiveTab('METRICS')} className={`flex-1 py-1 text-[10px] font-bold tracking-widest ${activeTab === 'METRICS' ? 'text-white bg-slate-700' : 'text-slate-500'}`}>MODULE HEALTH</button>
                        </div>
                        {activeTab === 'LOGS' ? (
                            <div className="flex-1 overflow-auto p-2 font-mono text-[10px] space-y-1" ref={logContainerRef}>
                                {logs.map(l => (
                                    <div key={l.id} className="flex gap-2 text-slate-300 border-b border-slate-800/50 pb-0.5">
                                        <span className="text-slate-500 w-14 shrink-0">{l.timestamp}</span>
                                        <span className={l.type === 'ALARM' ? 'text-red-400 font-bold' : l.type === 'ACTION' ? 'text-cyan-400' : ''}>{l.message}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 p-3 grid grid-cols-2 gap-4 text-xs font-mono">
                                <div className="flex justify-between border-b border-slate-800/50 pb-1">
                                    <div className="text-slate-500">RECT TEMP</div>
                                    <div className={state.components.rectifier.temperature > 60 ? 'text-orange-400' : 'text-green-400'}>{state.components.rectifier.temperature.toFixed(1)}°C</div>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/50 pb-1">
                                    <div className="text-slate-500">INV TEMP</div>
                                    <div className={state.components.inverter.temperature > 60 ? 'text-orange-400' : 'text-green-400'}>{state.components.inverter.temperature.toFixed(1)}°C</div>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/50 pb-1">
                                    <div className="text-slate-500">SYNC PHASE</div>
                                    <div className="text-white">{state.components.staticSwitch.syncError.toFixed(2)}°</div>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/50 pb-1">
                                    <div className="text-slate-500">BATT VOLT</div>
                                    <div className="text-white">{(state.battery.chargeLevel * 4 + 100).toFixed(0)}V</div>
                                </div>
                                <div className="flex justify-between">
                                    <div className="text-slate-500">EFFICIENCY</div>
                                    <div className="text-cyan-400">{(state.components.inverter.efficiency * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: PROCEDURES */}
            {/* Reduced width to w-72 */}
            <div className="w-80 flex-none bg-slate-900 border-l border-slate-800 shadow-xl z-20">
                <ProcedurePanel
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

export default App;
