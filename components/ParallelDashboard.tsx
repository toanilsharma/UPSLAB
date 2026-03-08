
import React from 'react';
import { ParallelSimulationState } from '../parallel_types';
import { motion } from 'framer-motion';
import { Activity, Zap, BarChart3, Shield, Thermometer } from 'lucide-react';

// Enhanced Metric Card for Phase 1
const MetricCard = ({ label, value, icon, subValue, color = "text-cyan-400" }: any) => (
    <div className="flex flex-col bg-slate-950/50 border border-slate-800 rounded px-3 py-1 min-w-[120px]">
        <div className="flex items-center gap-2 mb-1">
            <span className="text-slate-500">{icon}</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{label}</span>
        </div>
        <div className={`text-sm font-mono font-black ${color}`}>{value}</div>
        <div className="text-[9px] text-slate-600 font-medium">{subValue}</div>
    </div>
);

// Digital Gauge Component (Unified Style)
const DigitalMeter = ({ label, value, unit, min, max, alertLow, alertHigh, small = false }: any) => {
    let statusColor = 'text-cyan-400';
    let borderColor = 'border-cyan-500/30';
    let bgGlow = 'shadow-[0_0_10px_rgba(34,211,238,0.1)]';

    if (value < alertLow || value > alertHigh) {
        statusColor = 'text-red-500 animate-pulse';
        borderColor = 'border-red-500';
        bgGlow = 'shadow-[0_0_15px_rgba(239,68,68,0.4)]';
    } else if (value > max * 0.9) {
        statusColor = 'text-amber-400';
        borderColor = 'border-amber-500';
    }

    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    return (
        <div className={`flex flex-col bg-slate-950 border ${borderColor} ${bgGlow} rounded p-2 ${small ? 'min-w-[80px]' : 'min-w-[100px]'} relative overflow-hidden transition-all duration-300`}>
            <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1 truncate">{label}</div>

            <div className="flex items-baseline gap-1 z-10">
                <span className={`${small ? 'text-lg' : 'text-2xl'} font-mono font-black ${statusColor} leading-none`}>
                    {value.toFixed(0)}
                </span>
                <span className="text-[10px] text-slate-500 font-bold">{unit}</span>
            </div>

            {/* Progress Bar Background */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800">
                <motion.div
                    className={`h-full ${value < alertLow || value > alertHigh ? 'bg-red-500' : 'bg-cyan-500'}`}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                />
            </div>
        </div>
    );
};

// Module Status Block
const ModuleStatus = ({ id, rectifier, inverter }: { id: string, rectifier: string, inverter: string }) => {
    const isReady = rectifier === 'NORMAL' && inverter === 'NORMAL';
    return (
        <div className={`flex flex-col items-center justify-center p-2 rounded border ${isReady ? 'bg-green-900/10 border-green-500/30' : 'bg-slate-800 border-slate-700'}`}>
            <div className="text-[9px] font-bold text-slate-400 mb-1">{id}</div>
            <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full ${rectifier === 'NORMAL' ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-slate-600'}`} title="Rectifier"></div>
                <div className={`w-2 h-2 rounded-full ${inverter === 'NORMAL' ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-slate-600'}`} title="Inverter"></div>
            </div>
        </div>
    );
}

export const ParallelDashboard = ({ state }: { state: ParallelSimulationState }) => {
    // Determine overall system load percentage based on 50kW capacity per module (100kW total) 
    // Simplified: assuming totalOutput A is approx X kW.
    const loadPct = (state.currents.totalOutput / 400) * 100; 

    // Calculate Load Share Imbalance
    const i1 = state.modules.module1.inverter.loadPct;
    const i2 = state.modules.module2.inverter.loadPct;
    const totalLoadPct = i1 + i2 || 1;
    const share1 = (i1 / totalLoadPct) * 100;
    
    // Determine System Status Text
    let sysStatus = "SYSTEM NORMAL";
    let sysColor = "text-green-400";

    if (state.alarms.length > 0) {
        sysStatus = state.alarms[0].substring(0, 18); // Show first alarm
        sysColor = "text-red-500 animate-pulse";
    } else if (state.systemMode !== 'ONLINE_PARALLEL') {
        sysStatus = state.systemMode.replace(/_/g, ' ');
        sysColor = "text-amber-400";
    }

    return (
        <div className="dashboard flex items-center gap-3 px-4 py-2 bg-slate-900 border-l border-r border-slate-700 h-full shadow-inner">
             {/* Key Metrics */}
            <DigitalMeter
                label="Mains"
                value={state.voltages.utilityInput}
                unit="V"
                min={0} max={500}
                alertLow={400} alertHigh={440}
            />
             <DigitalMeter
                label="Total Load"
                value={state.currents.totalOutput}
                unit="A"
                min={0} max={400}
                alertLow={-1} alertHigh={350}
            />
             <DigitalMeter
                label="Bus"
                value={state.voltages.loadBus}
                unit="V"
                min={0} max={500}
                alertLow={380} alertHigh={440}
            />

            <div className="h-10 w-px bg-slate-700 mx-1"></div>

             {/* Module Status & Share */}
             <div className="flex gap-2">
                 <ModuleStatus id="MOD 1" rectifier={state.modules.module1.rectifier.status} inverter={state.modules.module1.inverter.status} />
                 
                 {/* Share Bar */}
                <div className="flex flex-col justify-center w-24">
                    <div className="flex justify-between text-[8px] font-mono text-slate-400 mb-1">
                        <span>{share1.toFixed(0)}%</span>
                        <span>LOAD SHARE</span>
                        <span>{(100-share1).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative border border-white/5">
                        <div className="absolute left-1/2 top-0 h-full w-px bg-white/20 -translate-x-1/2 z-10"></div>
                        <motion.div 
                            className={`h-full ${Math.abs(share1 - 50) > 10 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            animate={{ width: `${share1}%` }}
                        />
                    </div>
                </div>

                <ModuleStatus id="MOD 2" rectifier={state.modules.module2.rectifier.status} inverter={state.modules.module2.inverter.status} />
             </div>

             {/* System Primary Metrics */}
            <MetricCard label="System Load" value={`${state.loadKW.toFixed(1)} kW`} icon={<Activity size={16} />} subValue={`${((state.loadKW / state.totalCapacityKW) * 100).toFixed(1)}% Capacity`} />
            <MetricCard label="Apparent Power" value={`${(state.kva || 0).toFixed(1)} kVA`} icon={<Zap size={16} />} subValue={`PF: ${(state.pf || 0.95).toFixed(2)}`} color="text-cyan-400" />
            <MetricCard label="System THD" value={`${(state.thd || 0).toFixed(1)}%`} icon={<BarChart3 size={16} />} subValue={state.thd < 3 ? "Excellent Quality" : "Heavy Harmonics"} color={state.thd < 5 ? "text-green-400" : "text-orange-400"} />
            <MetricCard label="Reactive Power" value={`${(state.currents.kvar || 0).toFixed(1)} kVAr`} icon={<Activity size={16} />} subValue="Phase Displaced" color="text-purple-400" />

             <div className="h-10 w-px bg-slate-700 mx-1"></div>

             {/* System Status Text */}
             <div className="flex flex-col justify-center min-w-[140px]">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">System Logic</div>
                <div className={`text-xs font-black tracking-tighter uppercase ${sysColor} truncate`}>{sysStatus}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    REDUNDANCY: <span className={state.redundancyOK ? "text-green-400" : "text-red-400"}>{state.redundancyOK ? 'N+1 OK' : 'LOST'}</span>
                </div>
            </div>

        </div>
    );
};
