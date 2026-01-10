
import React from 'react';
import { ParallelSimulationState } from '../parallel_types';

const Gauge = ({ label, value, max, unit, color = 'text-cyan-400' }: any) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className="flex flex-col items-center bg-slate-800/50 p-2 rounded border border-slate-700 w-24">
            <div className="text-[9px] text-slate-400 font-bold tracking-wider mb-1">{label}</div>
            <div className={`text-lg font-mono font-black ${color}`}>{value.toFixed(0)}<span className="text-[10px] text-slate-500 ml-0.5">{unit}</span></div>
            <div className="w-full h-1 bg-slate-700 mt-1 rounded-full overflow-hidden">
                <div className={`h-full ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }}></div>
            </div>
        </div>
    );
};

export const ParallelDashboard = ({ state }: { state: ParallelSimulationState }) => {
    const loadPct = ((state.currents.totalOutput / 200) * 100);

    return (
        <div className="h-full flex items-center justify-between gap-4">
            <div className="flex gap-2">
                <Gauge label="INPUT V" value={state.voltages.utilityInput} max={450} unit="V" />
                <Gauge label="LOAD V" value={state.voltages.loadBus} max={450} unit="V" color={state.voltages.loadBus < 380 ? 'text-red-500' : 'text-green-400'} />
                <Gauge label="TOTAL AMPS" value={state.currents.totalOutput} max={250} unit="A" />
                <Gauge label="LOAD %" value={loadPct} max={100} unit="%" />
            </div>

            <div className="h-12 w-px bg-slate-700 mx-2"></div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs font-mono">
                <div className="text-cyan-300 font-bold border-b border-slate-700 text-[10px]">MODULE 1</div>
                <div className="text-cyan-300 font-bold border-b border-slate-700 text-[10px]">MODULE 2</div>

                <div className="flex justify-between w-24">
                    <span className="text-slate-500">RECT</span>
                    <span className={state.modules.module1.rectifier.status === 'NORMAL' ? 'text-green-400' : 'text-red-500'}>{state.modules.module1.rectifier.status}</span>
                </div>
                <div className="flex justify-between w-24">
                    <span className="text-slate-500">RECT</span>
                    <span className={state.modules.module2.rectifier.status === 'NORMAL' ? 'text-green-400' : 'text-red-500'}>{state.modules.module2.rectifier.status}</span>
                </div>

                <div className="flex justify-between w-24">
                    <span className="text-slate-500">INV</span>
                    <span className={state.modules.module1.inverter.status === 'NORMAL' ? 'text-green-400' : 'text-red-500'}>{state.modules.module1.inverter.status}</span>
                </div>
                <div className="flex justify-between w-24">
                    <span className="text-slate-500">INV</span>
                    <span className={state.modules.module2.inverter.status === 'NORMAL' ? 'text-green-400' : 'text-red-500'}>{state.modules.module2.inverter.status}</span>
                </div>

                <div className="flex justify-between w-24">
                    <span className="text-slate-500">LOAD</span>
                    <span className="text-white">{state.modules.module1.inverter.loadPct.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between w-24">
                    <span className="text-slate-500">LOAD</span>
                    <span className="text-white">{state.modules.module2.inverter.loadPct.toFixed(0)}%</span>
                </div>
            </div>
        </div>
    );
};
