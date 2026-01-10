
import React from 'react';
import { ParallelSimulationState } from '../parallel_types';
import { motion } from 'framer-motion';

const MetricCard = ({ label, value, max, unit, color = 'text-cyan-400' }: any) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className="relative flex flex-col items-center bg-white/5 p-2 rounded-lg border border-white/10 w-28 backdrop-blur-sm overflow-hidden">
            <div className="text-[9px] text-slate-400 font-bold tracking-wider mb-1 z-10">{label}</div>

            <div className="flex items-baseline gap-0.5 z-10">
                <span className={`text-xl font-mono font-black ${color} drop-shadow-lg`}>{value.toFixed(0)}</span>
                <span className="text-[10px] text-slate-500 font-bold">{unit}</span>
            </div>

            {/* Background Bar */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                <motion.div
                    className={`h-full ${color.replace('text-', 'bg-')}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                />
            </div>
        </div>
    );
};

const StatusPill = ({ label, status }: { label: string, status: string }) => {
    const isNormal = status === 'NORMAL' || status === 'OK';
    const isFault = status === 'FAULT' || status === 'ALARM';
    const color = isNormal ? 'bg-green-500/20 text-green-400 border-green-500/30' : isFault ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30';

    return (
        <div className={`flex justify-between items-center px-2 py-1 rounded border ${color} w-32`}>
            <span className="text-[9px] font-bold opacity-70">{label}</span>
            <span className="text-[9px] font-black tracking-widest">{status === 'NORMAL' ? 'ONLINE' : status}</span>
        </div>
    );
}

export const ParallelDashboard = ({ state }: { state: ParallelSimulationState }) => {
    const loadPct = ((state.currents.totalOutput / 200) * 100);

    return (
        <div className="h-full flex items-center justify-between gap-6 px-2">

            {/* System Metrics */}
            <div className="flex gap-3">
                <MetricCard label="GRID INPUT" value={state.voltages.utilityInput} max={450} unit="V" />
                <MetricCard label="LOAD BUS" value={state.voltages.loadBus} max={450} unit="V" color={state.voltages.loadBus < 380 ? 'text-red-500' : 'text-green-400'} />
                <MetricCard label="OUTPUT CUR" value={state.currents.totalOutput} max={250} unit="A" />
                <MetricCard label="SYSTEM LOAD" value={loadPct} max={100} unit="%" />
            </div>

            <div className="h-12 w-px bg-white/10"></div>

            {/* Module Status Grid */}
            <div className="flex gap-4">
                {/* Module 1 */}
                <div className="flex flex-col gap-1">
                    <div className="text-[9px] text-cyan-500 font-bold mb-0.5 tracking-widest text-center">MODULE A</div>
                    <StatusPill label="RECT" status={state.modules.module1.rectifier.status} />
                    <StatusPill label="INV" status={state.modules.module1.inverter.status} />
                </div>

                {/* Module 2 */}
                <div className="flex flex-col gap-1">
                    <div className="text-[9px] text-cyan-500 font-bold mb-0.5 tracking-widest text-center">MODULE B</div>
                    <StatusPill label="RECT" status={state.modules.module2.rectifier.status} />
                    <StatusPill label="INV" status={state.modules.module2.inverter.status} />
                </div>
            </div>

            {/* Load Share Balance */}
            <div className="flex flex-col items-center bg-white/5 p-2 rounded-lg border border-white/10 w-32">
                <div className="text-[8px] text-slate-400 font-bold tracking-wider mb-2">LOAD SHARING</div>
                <div className="flex w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
                    {/* Center Mark */}
                    <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/30 -translate-x-1/2 z-10"></div>

                    <motion.div
                        className="h-full bg-cyan-500"
                        animate={{ width: `${(state.modules.module1.inverter.loadPct / (state.modules.module1.inverter.loadPct + state.modules.module2.inverter.loadPct || 1)) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between w-full mt-1 text-[8px] font-mono text-slate-500">
                    <span>A</span>
                    <span>B</span>
                </div>
            </div>

        </div>
    );
};
