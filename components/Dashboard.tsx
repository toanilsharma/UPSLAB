
import React from 'react';

const DigitalMeter = ({ label, value, unit, min, max, alertLow, alertHigh }: any) => {
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
        <div className={`flex flex-col bg-slate-950 border ${borderColor} ${bgGlow} rounded p-2 min-w-[100px] relative overflow-hidden transition-all duration-300`}>
            <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1">{label}</div>

            <div className="flex items-baseline gap-1 z-10">
                <span className={`text-2xl font-mono font-black ${statusColor} leading-none`}>
                    {value.toFixed(0)}
                </span>
                <span className="text-xs text-slate-500 font-bold">{unit}</span>
            </div>

            {/* Progress Bar Background */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800">
                <div
                    className={`h-full transition-all duration-500 ${value < alertLow || value > alertHigh ? 'bg-red-500' : 'bg-cyan-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export const Dashboard = ({ state }: { state: any }) => {
    // Determine System Status Text
    let sysStatus = "SYSTEM NORMAL";
    let sysColor = "text-green-400";

    if (state.alarms.length > 0) {
        // Show the highest priority alarm (Last added usually, or specific check)
        // Prioritize "CRITICAL" alarms
        const critAlarm = state.alarms.find((a: string) => a.includes('CRITICAL'));
        sysStatus = critAlarm || state.alarms[0]; // Show specific alarm text
        sysColor = "text-red-500 animate-pulse";
    } else if (state.components.staticSwitch.mode === 'BYPASS') {
        sysStatus = "ON BYPASS";
        sysColor = "text-amber-400";
    } else if (state.components.rectifier.voltageOut < 300 && state.battery.chargeLevel > 0 && state.currents.output > 0) {
        sysStatus = "BATTERY DISCHARGE";
        sysColor = "text-orange-500";
    }

    return (
        <div className="dashboard flex items-center gap-3 px-4 py-2 bg-slate-900 border-l border-r border-slate-700 h-full shadow-inner">
            <DigitalMeter
                label="Mains Input"
                value={state.voltages.utilityInput}
                unit="V"
                min={0} max={500}
                alertLow={360} alertHigh={440}
            />
            <DigitalMeter
                label="DC Link"
                value={state.voltages.dcBus}
                unit="V"
                min={0} max={600}
                alertLow={400} alertHigh={580}
            />
            <DigitalMeter
                label="Output"
                value={state.voltages.loadBus}
                unit="V"
                min={0} max={500}
                alertLow={380} alertHigh={420}
            />
            <DigitalMeter
                label="Battery"
                value={state.battery.chargeLevel}
                unit="%"
                min={0} max={100}
                alertLow={20} alertHigh={110}
            />

            <div className="h-10 w-px bg-slate-700 mx-2"></div>

            <div className="flex flex-col justify-center min-w-[160px]">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">System Status</div>
                <div className={`text-sm font-black tracking-tighter uppercase ${sysColor}`}>{sysStatus}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                    LOAD: <span className="text-white">{(state.currents.output * 0.4).toFixed(1)} kW</span>
                </div>
            </div>
        </div>
    );
};
