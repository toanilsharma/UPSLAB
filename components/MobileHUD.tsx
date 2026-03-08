
import React from 'react';
import { SimulationState, UPSMode } from '../types';

interface MobileHUDProps {
    state: SimulationState;
}

export const MobileHUD: React.FC<MobileHUDProps> = ({ state }) => {
    const { voltages, battery, upsMode } = state;
    
    const getModeColor = (mode: UPSMode) => {
        switch (mode) {
            case UPSMode.ONLINE: return 'text-green-400';
            case UPSMode.BATTERY_MODE: return 'text-orange-400 animate-pulse';
            case UPSMode.STATIC_BYPASS: return 'text-amber-500';
            case UPSMode.EMERGENCY_SHUTDOWN: return 'text-red-500 animate-pulse';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="fixed top-0 left-0 right-0 h-12 bg-slate-900/90 backdrop-blur-md border-b border-cyan-500/30 z-[60] px-4 flex items-center justify-between pointer-events-none">
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold leading-none">MODE</span>
                <span className={`text-[11px] font-black tracking-tighter uppercase ${getModeColor(upsMode)}`}>
                    {upsMode}
                </span>
            </div>
            
            <div className="flex gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 font-bold leading-none">IN</span>
                    <span className="text-[12px] font-mono text-white">{voltages.utilityInput.toFixed(0)}V</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 font-bold leading-none">OUT</span>
                    <span className="text-[12px] font-mono text-cyan-400">{voltages.loadBus.toFixed(0)}V</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 font-bold leading-none">BATT</span>
                    <span className={`text-[12px] font-mono ${battery.chargeLevel < 20 ? 'text-red-500' : 'text-green-500'}`}>
                        {battery.chargeLevel.toFixed(0)}%
                    </span>
                </div>
            </div>
        </div>
    );
};
