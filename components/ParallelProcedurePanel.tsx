
import React, { useEffect, useRef } from 'react';
import { ParallelProcedure, ParallelSimulationState } from '../parallel_types';

interface ProcedurePanelProps {
    procedure: ParallelProcedure | null;
    currentStepIndex: number;
    state: ParallelSimulationState;
    onNextStep: () => void;
    onSelectProcedure: (procId: string) => void;
    completed: boolean;
    failedReason: string | null;
    mistakeCount: number;
}

export const ParallelProcedurePanel: React.FC<ProcedurePanelProps> = ({
    procedure, currentStepIndex, state, onNextStep, onSelectProcedure, completed, failedReason, mistakeCount
}) => {
    const activeStepRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeStepRef.current) {
            activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentStepIndex]);

    if (!procedure) {
        return (
            <div className="h-full p-4 pl-6 flex flex-col gap-4 overflow-y-auto">
                <h2 className="text-xl font-bold text-slate-200">Parallel SOPs</h2>

                <button onClick={() => onSelectProcedure('sys_maint_bypass')} className="bg-slate-700 hover:bg-blue-600 p-3 rounded text-left border border-slate-600 transition-colors">
                    <div className="font-bold text-sm">SOP-01: Maint. Bypass Transfer</div>
                    <div className="text-xs text-slate-400">Normal → Maintenance (UPS Isolation)</div>
                </button>

                <button onClick={() => onSelectProcedure('system_return_bypass')} className="bg-slate-700 hover:bg-blue-500 p-3 rounded text-left border border-slate-600 transition-colors border-l-4 border-l-blue-400">
                    <div className="font-bold text-sm">SOP-02: Return from Bypass</div>
                    <div className="text-xs text-slate-400">Maintenance → Normal Operation</div>
                </button>

                <button onClick={() => onSelectProcedure('module_iso')} className="bg-slate-700 hover:bg-teal-600 p-3 rounded text-left border border-slate-600 transition-colors">
                    <div className="font-bold text-sm">SOP-03: Module Isolation</div>
                    <div className="text-xs text-slate-400">Isolate Module 1, Maintain Module 2</div>
                </button>

                <button onClick={() => onSelectProcedure('module1_pm')} className="bg-slate-700 hover:bg-purple-600 p-3 rounded text-left border border-slate-600 transition-colors">
                    <div className="font-bold text-sm">SOP-04: M1 Preventive Maint</div>
                    <div className="text-xs text-slate-400">Full Isolation & Safe Discharge</div>
                </button>

                <button onClick={() => onSelectProcedure('module1_restore')} className="bg-slate-700 hover:bg-green-600 p-3 rounded text-left border border-slate-600 transition-colors">
                    <div className="font-bold text-sm">SOP-05: M1 Restoration</div>
                    <div className="text-xs text-slate-400">Return to Service (Sync & Parallel)</div>
                </button>

                <button onClick={() => onSelectProcedure('utility_fail_test')} className="bg-slate-700 hover:bg-amber-600 p-3 rounded text-left border border-slate-600 transition-colors">
                    <div className="font-bold text-sm">SOP-06: Simulation of Mains Failure</div>
                    <div className="text-xs text-slate-400">Battery Backup Verification</div>
                </button>

                <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-200 leading-relaxed">
                    ⚠️ <strong>WARNING:</strong> Parallel Switching requires strict synchronization. Ensure Phase Angle &lt; 5° before closing output breakers.
                </div>
            </div>
        );
    }

    const currentStep = procedure.steps[currentStepIndex];
    const isStepValid = currentStep ? currentStep.validationFn(state) : false;

    return (
        <div className="h-full flex flex-col bg-slate-800/50">
            <div className="p-4 bg-slate-800 border-b border-slate-700 shadow-md z-10">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-blue-400 text-lg tracking-tight">{procedure.id.toUpperCase()}</h2>
                    <button onClick={() => onSelectProcedure('')} className="text-xs text-slate-400 hover:text-white underline font-bold tracking-wider">EXIT</button>
                </div>
                <div className="flex justify-between items-start gap-2">
                    <p className="text-sm text-slate-300 leading-snug">{procedure.description}</p>
                    <div className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${mistakeCount > 0 ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                        ERRORS: {mistakeCount}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {procedure.steps.map((step, idx) => {
                    const isCurrent = idx === currentStepIndex;
                    const isDone = idx < currentStepIndex;

                    return (
                        <div
                            key={step.id}
                            ref={isCurrent ? activeStepRef : null}
                            className={`p-3 rounded border transition-all duration-300 ${isCurrent ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30' : isDone ? 'bg-slate-800/50 border-slate-700 opacity-60' : 'bg-slate-800/20 border-slate-700/50 opacity-40'}`}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${isDone ? 'bg-green-500 text-black' : isCurrent ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
                                    {isDone ? '✓' : step.id}
                                </div>
                                <span className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-slate-400'}`}>Step {step.id}</span>
                            </div>
                            <p className="text-sm text-slate-300 ml-9 leading-relaxed">{step.description}</p>
                            {isCurrent && step.hint && (
                                <div className="mt-2 ml-9 text-xs text-blue-300 italic border-l-2 border-blue-500/30 pl-2">
                                    Hint: {step.hint}
                                </div>
                            )}
                        </div>
                    );
                })}

                {completed && (
                    <div className="p-6 bg-green-900/30 border border-green-500/50 rounded-lg text-center shadow-lg transform transition-all animate-fade-in-up">
                        <div className="text-4xl mb-2">🎉</div>
                        <h3 className="text-lg font-black text-green-400 uppercase tracking-widest mb-1">Procedure Complete</h3>
                        <p className="text-sm text-green-200 mb-4">System stabilized in target configuration.</p>
                        
                        <div className="inline-block px-4 py-2 bg-black/30 rounded mb-4">
                            <span className="text-xs text-slate-400 uppercase tracking-widest mr-2">Performance</span>
                            <span className={`font-mono font-bold ${mistakeCount === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {mistakeCount === 0 ? 'PERFECT EXECUTION' : `${mistakeCount} SAFETY VIOLATIONS`}
                            </span>
                        </div>
                        
                        <button onClick={() => onSelectProcedure('')} className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded shadow-lg shadow-green-500/20 transition-all">
                            RETURN TO MENU
                        </button>
                    </div>
                )}

                {failedReason && (
                    <div className="p-6 bg-red-900/30 border border-red-500/50 rounded-lg text-center shadow-lg animate-pulse">
                        <div className="text-4xl mb-2">💥</div>
                        <h3 className="text-lg font-black text-red-500 uppercase tracking-widest mb-1">CRITICAL FAILURE</h3>
                        <p className="text-sm text-red-200 mb-4">{failedReason}</p>
                        <button onClick={() => window.location.reload()} className="block w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2 rounded shadow-lg shadow-red-500/20 transition-all">
                            EMERGENCY RESET
                        </button>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-900/80 backdrop-blur">
                <button
                    disabled={!isStepValid || completed || !!failedReason}
                    onClick={onNextStep}
                    className={`w-full py-3 rounded font-bold transition-all shadow-lg text-sm tracking-wider uppercase ${isStepValid ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30 scale-100' : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'}`}
                >
                    {isStepValid ? 'Confirm Verification Step' : 'Awaiting Valid Action...'}
                </button>
            </div>
        </div>
    );
};
