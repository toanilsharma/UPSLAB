
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
            <div className="h-full p-4 flex flex-col gap-4">
                <h2 className="text-xl font-bold text-slate-200">Parallel System SOPs</h2>

                <button onClick={() => onSelectProcedure('sys_maint_bypass')} className="bg-slate-700 hover:bg-blue-600 p-3 rounded text-left border border-slate-600">
                    <div className="font-bold">SOP-P-01: System Maintenance Bypass</div>
                    <div className="text-xs text-slate-400">Transfer BOTH modules to bypass</div>
                </button>

                <button onClick={() => onSelectProcedure('module_iso')} className="bg-slate-700 hover:bg-teal-600 p-3 rounded text-left border border-slate-600">
                    <div className="font-bold">SOP-P-02: Module Isolation (Quick)</div>
                    <div className="text-xs text-slate-400">Isolate M1, Run on M2</div>
                </button>

                <button onClick={() => onSelectProcedure('module1_pm')} className="bg-slate-700 hover:bg-purple-600 p-3 rounded text-left border border-slate-600">
                    <div className="font-bold">SOP-P-03: Module 1 PM Isolation</div>
                    <div className="text-xs text-slate-400">Full isolation procedure for preventive maintenance</div>
                </button>

                <button onClick={() => onSelectProcedure('module1_restore')} className="bg-slate-700 hover:bg-green-600 p-3 rounded text-left border border-slate-600">
                    <div className="font-bold">SOP-P-04: Module 1 Restoration</div>
                    <div className="text-xs text-slate-400">Restore Module 1 after maintenance complete</div>
                </button>

                <button onClick={() => onSelectProcedure('utility_fail_test')} className="bg-slate-700 hover:bg-amber-600 p-3 rounded text-left border border-slate-600">
                    <div className="font-bold">SOP-P-05: Utility Failure Test</div>
                    <div className="text-xs text-slate-400">Simulate total power failure & battery backup test</div>
                </button>

                <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded text-sm text-yellow-200">
                    WARNING: Parallel system operations require strict synchronization checks.
                </div>
            </div>
        );
    }

    const currentStep = procedure.steps[currentStepIndex];
    const isStepValid = currentStep ? currentStep.validationFn(state) : false;

    return (
        <div className="h-full flex flex-col h-full bg-slate-800/50">
            <div className="p-4 bg-slate-800 border-b border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-blue-400">{procedure.id.toUpperCase()}</h2>
                    <button onClick={() => onSelectProcedure('')} className="text-xs text-slate-400 hover:text-white underline">EXIT</button>
                </div>
                <div className="flex justify-between items-start">
                    <p className="text-sm text-slate-300 w-3/4">{procedure.description}</p>
                    <div className={`text-xs font-bold px-2 py-1 rounded ${mistakeCount > 0 ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                        ERRORS: {mistakeCount}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {procedure.steps.map((step, idx) => {
                    const isCurrent = idx === currentStepIndex;
                    const isDone = idx < currentStepIndex;

                    return (
                        <div
                            key={step.id}
                            ref={isCurrent ? activeStepRef : null}
                            className={`p-3 rounded border ${isCurrent ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : isDone ? 'bg-slate-800 border-slate-700 opacity-60' : 'bg-slate-800/30 border-slate-700 opacity-40'}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-500 text-black' : isCurrent ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-400'}`}>
                                    {isDone ? '✓' : step.id}
                                </div>
                                <span className={`text-sm font-semibold ${isCurrent ? 'text-white' : 'text-slate-400'}`}>Step {step.id}</span>
                            </div>
                            <p className="text-sm text-slate-300 ml-8">{step.description}</p>
                            {isCurrent && step.hint && (
                                <div className="mt-2 ml-8 text-xs text-blue-300 italic">Hint: {step.hint}</div>
                            )}
                        </div>
                    );
                })}

                {completed && (
                    <div className="p-4 bg-green-900/50 border border-green-500 rounded text-center">
                        <h3 className="text-lg font-bold text-green-400">PROCEDURE COMPLETE</h3>
                        <p className="text-sm text-green-200">System is stable in desired configuration.</p>
                        <div className="mt-2 text-sm">Final Score: <span className={mistakeCount === 0 ? 'text-green-300 font-bold' : 'text-yellow-300'}>{mistakeCount === 0 ? 'PERFECT' : `${mistakeCount} ERRORS`}</span></div>
                        <button onClick={() => onSelectProcedure('')} className="mt-2 bg-green-700 px-4 py-1 rounded hover:bg-green-600 text-sm font-bold">Return to Menu</button>
                    </div>
                )}

                {failedReason && (
                    <div className="p-4 bg-red-900/50 border border-red-500 rounded text-center animate-pulse">
                        <h3 className="text-lg font-bold text-red-400">PROCEDURE FAILED</h3>
                        <p className="text-sm text-red-200">{failedReason}</p>
                        <button onClick={() => window.location.reload()} className="mt-2 bg-red-700 px-4 py-1 rounded hover:bg-red-600 text-sm font-bold">RESET SIMULATOR</button>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-900">
                <button
                    disabled={!isStepValid || completed || !!failedReason}
                    onClick={onNextStep}
                    className={`w-full py-3 rounded font-bold transition-all ${isStepValid ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                >
                    {isStepValid ? 'CONFIRM STEP & PROCEED' : 'AWAITING ACTION...'}
                </button>
            </div>
        </div>
    );
};
