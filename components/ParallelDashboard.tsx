
import React from 'react';
import { ParallelSimulationState } from '../parallel_types';
import { motion } from 'framer-motion';

// Compact metric card with smaller width
const MetricCard = ({ label, value, max, unit, color = 'text-cyan-400' }: any) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className="relative flex flex-col items-center bg-white/5 px-2 py-1 rounded border border-white/10 w-16 overflow-hidden">
            <div className="text-[7px] text-slate-400 font-bold tracking-wider truncate w-full text-center">{label}</div>
            <div className="flex items-baseline gap-0.5">
                <span className={`text-sm font-mono font-black ${color}`}>{value.toFixed(0)}</span>
                <span className="text-[8px] text-slate-500">{unit}</span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/5">
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

// Compact status pill
const StatusPill = ({ label, status }: { label: string, status: string }) => {
    const isNormal = status === 'NORMAL' || status === 'OK';
    const isFault = status === 'FAULT' || status === 'ALARM';
    const color = isNormal ? 'bg-green-500/20 text-green-400 border-green-500/30' : isFault ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-slate-500/20 text-slate-400 border-slate-500/30';

    return (
        <div className={`flex justify-between items-center px-1.5 py-0.5 rounded border ${color} w-20`}>
            <span className="text-[8px] font-bold opacity-70">{label}</span>
            <span className="text-[8px] font-black">{isNormal ? 'ON' : status.slice(0, 4)}</span>
        </div>
    );
}

export const ParallelDashboard = ({ state }: { state: ParallelSimulationState }) => {
    const loadPct = ((state.currents.totalOutput / 200) * 100);

    return (
        <div className="h-full flex items-center gap-2 px-1 overflow-hidden">

            {/* System Metrics - Compact */}
            <div className="flex gap-1">
                <MetricCard label="INPUT" value={state.voltages.utilityInput} max={450} unit="V" />
                <MetricCard label="BUS" value={state.voltages.loadBus} max={450} unit="V" color={state.voltages.loadBus < 380 ? 'text-red-500' : 'text-green-400'} />
                <MetricCard label="AMPS" value={state.currents.totalOutput} max={250} unit="A" />
                <MetricCard label="LOAD" value={loadPct} max={100} unit="%" />
            </div>

            <div className="h-10 w-px bg-white/10 flex-shrink-0"></div>

            {/* Module Status - Horizontal compact */}
            <div className="flex gap-2">
                {/* Module 1 */}
                <div className="flex flex-col gap-0.5">
                    <div className="text-[8px] text-cyan-500 font-bold text-center">M1</div>
                    <StatusPill label="R" status={state.modules.module1.rectifier.status} />
                    <StatusPill label="I" status={state.modules.module1.inverter.status} />
                </div>

                {/* Module 2 */}
                <div className="flex flex-col gap-0.5">
                    <div className="text-[8px] text-cyan-500 font-bold text-center">M2</div>
                    <StatusPill label="R" status={state.modules.module2.rectifier.status} />
                    <StatusPill label="I" status={state.modules.module2.inverter.status} />
                </div>
            </div>

            <div className="h-10 w-px bg-white/10 flex-shrink-0"></div>

            {/* Load Share Balance - Compact */}
            <div className="flex flex-col items-center bg-white/5 p-1 rounded border border-white/10 w-20">
                <div className="text-[7px] text-slate-400 font-bold tracking-wider">SHARE</div>
                <div className="flex w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative mt-1">
                    <div className="absolute top-0 left-1/2 w-px h-full bg-white/30 -translate-x-1/2 z-10"></div>
                    <motion.div
                        className="h-full bg-cyan-500"
                        animate={{ width: `${(state.modules.module1.inverter.loadPct / (state.modules.module1.inverter.loadPct + state.modules.module2.inverter.loadPct || 1)) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between w-full text-[7px] font-mono text-slate-500">
                    <span>A</span>
                    <span>B</span>
                </div>
            </div>

        </div>
    );
};
