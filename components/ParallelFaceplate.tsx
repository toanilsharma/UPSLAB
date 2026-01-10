
import React from 'react';
import { ComponentDetail, ComponentStatus } from '../parallel_types';

interface FaceplateProps {
    type: string;
    data: ComponentDetail | any;
    onClose: () => void;
    onAction: (action: string) => void;
}

export const ParallelFaceplate: React.FC<FaceplateProps> = ({ type, data, onClose, onAction }) => {
    // Parse type string "moduleX.component"
    const [moduleName, compName] = type.split('.');

    const title = `${moduleName.toUpperCase()} ${compName?.toUpperCase() || 'UNIT'}`;

    // Helpers to format data safely
    const temp = data.temperature ? data.temperature.toFixed(1) : '--';
    const load = data.loadPct ? data.loadPct.toFixed(1) : '--';
    const eff = data.efficiency ? (data.efficiency * 100).toFixed(1) : '96.5';
    const volt = data.voltageOut ? data.voltageOut.toFixed(1) : '--';
    const status = data.status || (data.mode ? data.mode : 'UNKNOWN');

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-600 w-96 rounded shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-slate-700 p-3 flex justify-between items-center border-b border-slate-600">
                    <h3 className="text-white font-bold text-sm tracking-wider">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                {/* Content */}
                <div className="p-6">

                    {/* Status Indicator */}
                    <div className="flex items-center gap-4 mb-6 bg-slate-900/50 p-3 rounded border border-slate-700">
                        <div className={`w-3 h-3 rounded-full ${status === 'NORMAL' || status === 'INVERTER' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : status === 'STARTING' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase">Current Status</div>
                            <div className="text-lg font-mono font-bold text-white">{status}</div>
                        </div>
                    </div>

                    {/* Telemetry Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {compName !== 'staticSwitch' ? (
                            <>
                                <div className="bg-slate-900 p-2 rounded">
                                    <div className="text-[10px] text-slate-500">TEMPERATURE</div>
                                    <div className="text-sm font-mono text-cyan-400">{temp}°C</div>
                                </div>
                                <div className="bg-slate-900 p-2 rounded">
                                    <div className="text-[10px] text-slate-500">LOAD PCT</div>
                                    <div className="text-sm font-mono text-cyan-400">{load}%</div>
                                </div>
                                <div className="bg-slate-900 p-2 rounded">
                                    <div className="text-[10px] text-slate-500">OUTPUT VOLT</div>
                                    <div className="text-sm font-mono text-cyan-400">{volt}V</div>
                                </div>
                                <div className="bg-slate-900 p-2 rounded">
                                    <div className="text-[10px] text-slate-500">EFFICIENCY</div>
                                    <div className="text-sm font-mono text-cyan-400">{eff}%</div>
                                </div>
                            </>
                        ) : (
                            <div className="col-span-2 bg-slate-900 p-2 rounded">
                                <div className="text-[10px] text-slate-500">SYNC STATUS</div>
                                <div className={`text-sm font-mono ${data.syncError < 5 ? 'text-green-400' : 'text-orange-400'}`}>
                                    {data.syncError < 5 ? 'SYNCHRONIZED' : `PHASE DEV: ${data.syncError.toFixed(1)}°`}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-2 gap-3">
                        {compName === 'staticSwitch' ? (
                            <>
                                <button onClick={() => onAction('TO_INVERTER')} className="bg-slate-700 hover:bg-cyan-600 text-white py-2 rounded text-xs font-bold border border-slate-600 transition-colors">
                                    FORCE INVERTER
                                </button>
                                <button onClick={() => onAction('TO_BYPASS')} className="bg-slate-700 hover:bg-amber-600 text-white py-2 rounded text-xs font-bold border border-slate-600 transition-colors">
                                    FORCE BYPASS
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => onAction('START')}
                                    disabled={status === 'NORMAL' || status === 'STARTING'}
                                    className="bg-green-900/50 hover:bg-green-600 disabled:opacity-30 text-green-100 py-3 rounded text-xs font-bold border border-green-800 transition-colors"
                                >
                                    START
                                </button>
                                <button
                                    onClick={() => onAction('STOP')}
                                    disabled={status === 'OFF'}
                                    className="bg-red-900/50 hover:bg-red-600 disabled:opacity-30 text-red-100 py-3 rounded text-xs font-bold border border-red-800 transition-colors"
                                >
                                    STOP
                                </button>
                                <button
                                    onClick={() => onAction('RESET')}
                                    className="col-span-2 bg-blue-900/30 hover:bg-blue-600 text-blue-100 py-2 rounded text-xs font-bold border border-blue-800 transition-colors"
                                >
                                    FAULT RESET / ACKNOWLEDGE
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-slate-950 p-2 text-[10px] text-slate-600 text-center font-mono">
                    ID: {type.toUpperCase()} | FW: v4.2.1-PARALLEL
                </div>
            </div>
        </div>
    );
};
