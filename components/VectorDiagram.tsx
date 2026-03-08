
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, ZapOff } from 'lucide-react';

interface VectorDiagramProps {
    inverterPhase: number;
    bypassPhase: number;
    syncStatus: 'SYNCED' | 'DRIFTING' | 'OUT_OF_SYNC';
    title?: string;
    isParallel?: boolean;
}

export const VectorDiagram: React.FC<VectorDiagramProps> = ({ 
    inverterPhase, 
    bypassPhase, 
    syncStatus,
    title = "Phase Vector Sync",
    isParallel = false
}) => {
    const size = 180;
    const center = size / 2;
    const radius = size * 0.35;

    // Helper to calculate vector tip coordinates
    const getPoint = (angleDeg: number, len: number) => {
        const rad = (angleDeg - 90) * (Math.PI / 180); // -90 to start at 12 o'clock
        return {
            x: center + len * Math.cos(rad),
            y: center + len * Math.sin(rad)
        };
    };

    const statusColors = {
        SYNCED: '#22c55e',   // Green
        DRIFTING: '#f59e0b', // Amber
        OUT_OF_SYNC: '#ef4444' // Red
    };

    const statusLabel = {
        SYNCED: 'Phase Synced',
        DRIFTING: 'Syncing...',
        OUT_OF_SYNC: 'No Sync'
    };

    const StatusIcon = syncStatus === 'SYNCED' ? ShieldCheck : (syncStatus === 'DRIFTING' ? Activity : ZapOff);

    // Phases A, B, C are 120 degrees apart
    const phases = [0, 120, 240];
    const phaseLabels = ['L1', 'L2', 'L3'];

    return (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 flex flex-col items-center gap-3 backdrop-blur-md shadow-2xl relative overflow-hidden group">
            {/* Background scanner lines */}
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,.05)_25%,rgba(255,255,255,.05)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.05)_75%,rgba(255,255,255,.05)_76%,transparent_77%,transparent)] bg-[length:100%_40px]"></div>

            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-tighter">{title}</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-slate-700/50">
                    <StatusIcon size={12} className={syncStatus === 'OUT_OF_SYNC' ? 'text-red-500' : 'text-blue-400 rotate-animation'} />
                    <span className="text-[10px] font-mono text-slate-400">IEEE-519</span>
                </div>
            </div>

            <div className="relative">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Dial Background */}
                    <circle cx={center} cy={center} r={radius + 10} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />
                    <circle cx={center} cy={center} r={radius} fill="none" stroke="#334155" strokeWidth="0.5" />
                    
                    {/* Grid Axes */}
                    <line x1={center - radius - 10} y1={center} x2={center + radius + 10} y2={center} stroke="#1e293b" strokeWidth="0.5" />
                    <line x1={center} y1={center - radius - 10} x2={center} y2={center + radius + 10} stroke="#1e293b" strokeWidth="0.5" />

                    {/* Degree Ticks */}
                    {[0, 90, 180, 270].map(deg => {
                        const p = getPoint(deg, radius + 15);
                        return (
                            <text key={deg} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[8px] fill-slate-600 font-mono">
                                {deg}°
                            </text>
                        );
                    })}

                    {/* BYPASS VECTORS (Static or slowly moving) */}
                    {phases.map((offset, i) => {
                        const p = getPoint(bypassPhase + offset, radius - 5);
                        return (
                            <g key={`byp-${i}`}>
                                <motion.line
                                    x1={center} y1={center} x2={p.x} y2={p.y}
                                    stroke="#475569" strokeWidth="2" strokeDasharray="4 2"
                                    animate={{ x2: p.x, y2: p.y }}
                                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                                />
                                <text x={p.x} y={p.y} dx={5} dy={5} className="text-[8px] fill-slate-500 font-bold">{phaseLabels[i]}</text>
                            </g>
                        );
                    })}

                    {/* INVERTER VECTORS (Primary dynamic visual) */}
                    {phases.map((offset, i) => {
                        const p = getPoint(inverterPhase + offset, radius);
                        return (
                            <g key={`inv-${i}`}>
                                <motion.line
                                    x1={center} y1={center} x2={p.x} y2={p.y}
                                    stroke={statusColors[syncStatus]}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    animate={{ x2: p.x, y2: p.y }}
                                    transition={{ type: 'spring', stiffness: 120, damping: 15 }}
                                    className="filter drop-shadow-[0_0_3px_rgba(34,197,94,0.5)]"
                                />
                                {/* Vector Arrowhead */}
                                <motion.circle
                                    cx={p.x} cy={p.y} r="2"
                                    fill="white"
                                    animate={{ cx: p.x, cy: p.y }}
                                />
                            </g>
                        );
                    })}

                    {/* Center Point */}
                    <circle cx={center} cy={center} r="3" fill="#64748b" />
                </svg>

                {/* Overlaid Sync Badge */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                     <div className="flex flex-col items-center justify-center">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors duration-500`}
                             style={{ 
                                backgroundColor: `${statusColors[syncStatus]}20`, 
                                borderColor: `${statusColors[syncStatus]}40`,
                                color: statusColors[syncStatus]
                             }}>
                            {statusLabel[syncStatus]}
                        </div>
                     </div>
                </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 text-[10px] items-center">
                <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500 uppercase text-[8px] font-bold tracking-wider">Source Diff.</span>
                    <span className={`font-mono font-bold ${syncStatus === 'SYNCED' ? 'text-green-400' : 'text-amber-400'}`}>
                        {Math.abs(inverterPhase - bypassPhase).toFixed(1)}°
                    </span>
                </div>
                <div className="flex flex-col gap-0.5 items-end">
                    <span className="text-slate-500 uppercase text-[8px] font-bold tracking-wider">Sync Tolerance</span>
                    <span className="font-mono text-slate-300">±2.0°</span>
                </div>
            </div>
            
            {/* Legend */}
            <div className="w-full pt-2 border-t border-slate-700/30 flex justify-between">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-0.5 bg-slate-600 rounded-full"></div>
                    <span className="text-[8px] text-slate-500 font-bold uppercase">Bypass</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-0.5 bg-green-500 rounded-full shadow-[0_0_4px_green]"></div>
                    <span className="text-[8px] text-slate-500 font-bold uppercase">Inverter</span>
                </div>
            </div>
        </div>
    );
};
