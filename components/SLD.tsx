
import React, { useState } from 'react';
import { BreakerId, SimulationState, ComponentStatus } from '../types';

interface SLDProps {
    state: SimulationState;
    onBreakerToggle: (id: BreakerId) => void;
    onComponentClick: (component: string) => void;
}

// --- SVG SYMBOLS ---

const Node = ({ x, y }: { x: number, y: number }) => (
    <circle cx={x} cy={y} r={3} className="fill-slate-200" />
);

const DiodeBridge = ({ size, color }: { size: number, color: string }) => (
    <g stroke={color} fill="none" strokeWidth="3">
        <path d={`M${size * 0.2},${size * 0.8} L${size * 0.5},${size * 0.2} L${size * 0.8},${size * 0.8} Z`} />
        <path d={`M${size * 0.2},${size * 0.2} L${size * 0.8},${size * 0.2}`} />
        <line x1={size * 0.5} y1={size * 0.2} x2={size * 0.5} y2={0} />
        <line x1={size * 0.5} y1={size * 0.8} x2={size * 0.5} y2={size} />
    </g>
);

const IGBT = ({ size, color }: { size: number, color: string }) => (
    <g stroke={color} fill="none" strokeWidth="3">
        <circle cx={size / 2} cy={size / 2} r={size * 0.4} strokeOpacity="0.5" />
        <path d={`M${size * 0.3},${size * 0.3} L${size * 0.3},${size * 0.7}`} strokeWidth="4" />
        <path d={`M${size * 0.3},${size * 0.5} L${size * 0.7},${size * 0.5}`} />
        <path d={`M${size * 0.7},${size * 0.2} L${size * 0.7},${size * 0.8}`} />
    </g>
);

const StaticSwitchInternal = ({ mode }: { mode: 'INVERTER' | 'BYPASS' }) => {
    const activeColor = '#22d3ee';
    const inactiveColor = '#475569';
    const isBypass = mode === 'BYPASS';

    return (
        <g>
            {/* Labels */}
            <text x="-12" y="-15" className="fill-slate-500 text-[9px] font-bold" textAnchor="end">BYP</text>
            <text x="-12" y="48" className="fill-slate-500 text-[9px] font-bold" textAnchor="end">INV</text>

            {/* Bypass Path (Top to Center) */}
            <path d="M-10,-15 L15,15" stroke={isBypass ? activeColor : inactiveColor} strokeWidth={isBypass ? 4 : 2} className="transition-all duration-300" />

            {/* Inverter Path (Bottom to Center) */}
            <path d="M-10,45 L15,15" stroke={!isBypass ? activeColor : inactiveColor} strokeWidth={!isBypass ? 4 : 2} className="transition-all duration-300" />

            {/* Bypass SCR Symbol */}
            <g transform="translate(2, 0) rotate(45)">
                <path d="M-3,-6 L3,0 L-3,6 Z" fill={isBypass ? activeColor : 'none'} stroke={isBypass ? activeColor : inactiveColor} strokeWidth="1" />
            </g>

            {/* Inverter SCR Symbol */}
            <g transform="translate(2, 30) rotate(-45)">
                <path d="M-3,-6 L3,0 L-3,6 Z" fill={!isBypass ? activeColor : 'none'} stroke={!isBypass ? activeColor : inactiveColor} strokeWidth="1" />
            </g>

            {/* Common Output Point */}
            <circle cx="15" cy="15" r="4" fill="white" />

            {/* Output Line */}
            <line x1="15" y1="15" x2="40" y2="15" stroke={activeColor} strokeWidth="4" />
        </g>
    );
};

const Capacitor = ({ x, y }: { x: number, y: number }) => (
    <g transform={`translate(${x},${y})`} stroke="#94a3b8" strokeWidth="3">
        <line x1="0" y1="0" x2="0" y2="10" />
        <line x1="-15" y1="10" x2="15" y2="10" />
        <line x1="-15" y1="18" x2="15" y2="18" />
        <line x1="0" y1="18" x2="0" y2="28" />
    </g>
);

const Transformer = ({ x, y }: { x: number, y: number }) => (
    <g transform={`translate(${x},${y})`} stroke="#94a3b8" strokeWidth="3" fill="none">
        <circle cx="0" cy="0" r="14" />
        <circle cx="0" cy="20" r="14" />
    </g>
);

const Breaker = ({ id, x, y, isOpen, onClick, label, vertical = false, isEnergized = false, isWarning = false }: any) => {
    const bodyColor = isOpen ? '#ef4444' : (isWarning ? '#f97316' : '#22c55e');
    const glow = isOpen ? '' : (isEnergized ? 'filter drop-shadow(0 0 6px currentColor)' : '');
    const labelY = vertical ? 0 : -25;
    const labelX = vertical ? 30 : 0;

    return (
        <g transform={`translate(${x}, ${y})`} className="cursor-pointer group" onClick={onClick}>
            {/* Hitbox */}
            <rect x={-30} y={-35} width={60} height={70} fill="transparent" />

            {/* Interaction Cue */}
            <rect x={-20} y={-20} width={40} height={40} rx="4" className="stroke-white stroke-2 fill-none opacity-0 group-hover:opacity-30 transition-opacity" strokeDasharray="4,4" />

            {/* Label */}
            <text x={labelX} y={labelY} textAnchor={vertical ? "start" : "middle"} className="fill-slate-300 text-[14px] font-mono font-bold tracking-wider group-hover:fill-white transition-colors shadow-black drop-shadow-md">{label}</text>

            {/* Switch Housing */}
            <rect x={-10} y={-10} width={20} height={20} rx="3" className="fill-slate-800 stroke-slate-500 stroke-2" />

            {vertical ? (
                isOpen ?
                    <path d="M0,-30 L0,-10 M0,10 L0,30 M-8,-6 L15,12" stroke={bodyColor} strokeWidth="5" strokeLinecap="round" className="transition-all duration-300" /> :
                    <path d="M0,-30 L0,30" stroke={bodyColor} strokeWidth="5" strokeLinecap="round" className={`transition-all duration-300 ${glow}`} />
            ) : (
                isOpen ?
                    <path d="M-30,0 L-10,0 M10,0 L30,0 M-6,8 L12,-15" stroke={bodyColor} strokeWidth="5" strokeLinecap="round" className="transition-all duration-300" /> :
                    <path d="M-30,0 L30,0" stroke={bodyColor} strokeWidth="5" strokeLinecap="round" className={`transition-all duration-300 ${glow}`} />
            )}
        </g>
    );
};

const LoadBox = ({ x, y, label, isSwitchedOn, isPowered }: any) => {
    let stroke = 'stroke-slate-600';
    let fill = 'fill-slate-800';
    let text = 'fill-slate-500';
    let glow = '';

    if (isSwitchedOn) {
        if (isPowered) {
            // Normal Operation
            stroke = 'stroke-cyan-400';
            fill = 'fill-cyan-900/20';
            text = 'fill-cyan-300';
            glow = 'filter drop-shadow(0 0 5px rgba(34,211,238,0.3))';
        } else {
            // LOAD DROP (Fault)
            stroke = 'stroke-red-500 animate-pulse';
            fill = 'fill-red-900/40';
            text = 'fill-red-500';
            glow = 'filter drop-shadow(0 0 8px rgba(239,68,68,0.6))';
        }
    }

    return (
        <g transform={`translate(${x}, ${y})`}>
            {/* Connection Line from Top (Breaker) */}
            <line x1={0} y1={-30} x2={0} y2={0} stroke={stroke} strokeWidth="2" />

            {/* Server Rack Symbol */}
            <rect x={-20} y={0} width={40} height={35} rx="2" className={`${stroke} ${fill} stroke-2 transition-all duration-300`} style={{ filter: glow }} />

            {/* Status Lights */}
            {isSwitchedOn && isPowered && (
                <g>
                    <circle cx={-10} cy={10} r={2} className="fill-green-400 animate-pulse" />
                    <circle cx={-10} cy={18} r={2} className="fill-green-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <circle cx={-10} cy={26} r={2} className="fill-green-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                </g>
            )}

            {/* Label */}
            <text x={0} y={15} textAnchor="middle" className={`${text} text-[9px] font-bold tracking-wider`}>{label}</text>
            <text x={0} y={28} textAnchor="middle" className={`${text} text-[8px] font-mono`}>{isSwitchedOn ? (isPowered ? 'RUNNING' : '!! LOST !!') : 'OFF'}</text>
        </g>
    );
}

const PowerLine = ({ d, energized, warning = false, thick = false, currentFlow }: { d: string, energized: boolean, warning?: boolean, thick?: boolean, currentFlow?: number }) => {
    let stroke = 'stroke-slate-600';
    let animationClass = '';
    let opacity = 'opacity-40';

    // Dynamic Animation Speed based on Amperage
    let animSpeed = '1s';
    if (currentFlow && currentFlow > 0) {
        if (currentFlow > 100) animSpeed = '0.5s';
        else if (currentFlow > 50) animSpeed = '1s';
        else animSpeed = '2s';
    }

    if (energized) {
        stroke = warning ? 'stroke-amber-500' : 'stroke-cyan-400';
        animationClass = warning ? 'flow-warning' : 'flow-active';
        opacity = 'opacity-100';
    }

    return (
        <>
            <path d={d} fill="none" strokeWidth={thick ? 6 : 4} className={`${stroke} ${opacity} transition-colors duration-500`} />
            {energized && (
                <path
                    d={d}
                    fill="none"
                    strokeWidth={thick ? 3 : 2}
                    className={`${stroke} ${animationClass} opacity-80`}
                    strokeDasharray="12,12"
                    style={{ animationDuration: animSpeed }}
                />
            )}
        </>
    );
}

const ComponentBox = ({ x, y, w, h, label, status, onClick, children, type }: any) => {
    let borderColor = 'stroke-slate-500';
    let labelColor = 'fill-slate-400';
    let bgFill = 'fill-slate-800/90';

    if (status === ComponentStatus.NORMAL) {
        borderColor = 'stroke-cyan-500';
        labelColor = 'fill-cyan-400';
        bgFill = 'fill-cyan-900/30';
    } else if (status === ComponentStatus.ALARM) {
        borderColor = 'stroke-amber-500';
        labelColor = 'fill-amber-400';
        bgFill = 'fill-amber-900/30';
    } else if (status === ComponentStatus.FAULT) {
        borderColor = 'stroke-red-500';
        labelColor = 'fill-red-400';
        bgFill = 'fill-red-900/40';
    } else if (status === ComponentStatus.STARTING) {
        borderColor = 'stroke-blue-400';
        labelColor = 'fill-blue-300';
        bgFill = 'fill-blue-900/30';
    }

    return (
        <g transform={`translate(${x}, ${y})`} onClick={() => onClick(type)} className="cursor-pointer group">
            {status === ComponentStatus.NORMAL && <rect x={-4} y={-4} width={w + 8} height={h + 8} rx="6" className="fill-cyan-500/20 blur-md" />}

            <rect width={w} height={h} rx="6" className={`${borderColor} ${bgFill} stroke-[3px] transition-all duration-300 group-hover:stroke-white`} />
            <text x={w / 2} y={-10} textAnchor="middle" className={`${labelColor} text-[14px] font-bold tracking-widest group-hover:fill-white`}>{label}</text>

            <g transform={`translate(${w / 2 - 15}, ${h / 2 - 15})`}>
                {children}
            </g>

            <circle cx={w - 12} cy={12} r={4} className={status === ComponentStatus.NORMAL ? 'fill-cyan-400 animate-pulse' : 'fill-slate-600'} />

            <text x={w / 2} y={h + 15} textAnchor="middle" className="fill-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">CLICK TO VIEW</text>
        </g>
    );
};

export const SLD: React.FC<SLDProps> = ({ state, onBreakerToggle, onComponentClick }) => {
    const { breakers, voltages, components, currents } = state;

    const utilityLive = voltages.utilityInput > 50;
    const inputToRect = utilityLive && breakers[BreakerId.Q1];
    const dcBusLive = voltages.dcBus > 50;

    const invActive = components.inverter.status === ComponentStatus.NORMAL && components.inverter.voltageOut > 10;

    const bypassLive = voltages.bypassInput > 50;
    const bypassPostQ2 = bypassLive && breakers[BreakerId.Q2];
    const q3Live = bypassLive && breakers[BreakerId.Q3];

    const stsInverter = components.staticSwitch.mode === 'INVERTER';
    const staticSwitchLive = (stsInverter && invActive) || (!stsInverter && bypassPostQ2);
    const loadLive = voltages.loadBus > 50;

    // Power Flow Current Estimations for Animation Speed
    const outputAmps = currents.output;
    const inputAmps = outputAmps > 0 ? outputAmps + 10 : 0;
    const battAmps = Math.abs(currents.battery);

    return (
        <div className="w-full h-full bg-slate-950 border border-slate-700 rounded-lg shadow-xl overflow-hidden relative select-none sld-container">

            {/* Instructions Overlay */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 p-3 rounded border border-slate-700 backdrop-blur pointer-events-none z-10 shadow-lg">
                <div className="text-[10px] text-slate-500 font-bold mb-2 border-b border-slate-700 pb-1">LEGEND</div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-green-500 rounded-sm"></div> <span className="text-[10px] text-slate-300">BREAKER CLOSED</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div> <span className="text-[10px] text-slate-300">BREAKER OPEN</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-1 bg-cyan-400"></div> <span className="text-[10px] text-slate-300">ENERGIZED</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-amber-500"></div> <span className="text-[10px] text-slate-300">BYPASS LINE</span>
                </div>
            </div>

            <svg viewBox="0 0 800 400" className="w-full h-full">
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.3" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* --- MAINTENANCE BYPASS ZONE --- */}
                <rect x="230" y="5" width="440" height="60" rx="8" className="fill-amber-900/5 stroke-amber-700/20 stroke-2 border-dashed" strokeDasharray="8,8" />
                <text x="450" y="20" textAnchor="middle" className="fill-amber-600/50 text-[10px] font-bold tracking-[0.2em] uppercase">Maintenance Bypass Interlock Zone</text>

                {/* --- POWER LINES --- */}

                {/* Input Feeds */}
                <PowerLine d="M50,140 L160,140" energized={utilityLive} warning thick currentFlow={inputAmps} />
                <text x="50" y="125" className="fill-slate-400 text-xs font-bold">MAINS 400V</text>

                <PowerLine d="M50,80 L160,80" energized={bypassLive} warning currentFlow={inputAmps} />
                <text x="50" y="65" className="fill-slate-400 text-xs font-bold">BYPASS</text>

                {/* Rectifier Section */}
                <PowerLine d="M160,140 L220,140" energized={inputToRect} />
                <PowerLine d="M280,140 L350,140" energized={components.rectifier.voltageOut > 50} thick currentFlow={inputAmps} />

                {/* DC Link */}
                <Node x={350} y={140} />
                <PowerLine d="M350,140 L350,260" energized={dcBusLive} thick currentFlow={inputAmps + battAmps} />
                <Capacitor x={350} y={180} />
                <text x="370" y="185" className="fill-slate-400 text-xs font-bold">DC LINK</text>

                {/* Battery */}
                <Node x={350} y={260} />
                <PowerLine d="M350,260 L350,330" energized={dcBusLive || state.battery.chargeLevel > 0} currentFlow={battAmps} />

                {/* Inverter Input */}
                <PowerLine d="M350,140 L400,140" energized={dcBusLive} currentFlow={outputAmps} />

                {/* Inverter Output */}
                <PowerLine d="M460,140 L520,140" energized={invActive} currentFlow={outputAmps} />

                {/* Bypass Path */}
                <PowerLine d="M160,80 L520,80" energized={bypassPostQ2} currentFlow={outputAmps} />
                <PowerLine d="M110,80 L110,40 L650,40 L650,140" energized={q3Live} warning thick currentFlow={outputAmps} />
                <Node x={110} y={80} />
                <Node x={650} y={140} />

                {/* STS Output */}
                <Node x={570} y={110} />
                <PowerLine d="M570,110 L620,110" energized={staticSwitchLive} thick currentFlow={outputAmps} />

                {/* Load Bus */}
                <Node x={620} y={110} />
                <PowerLine d="M620,110 L750,110" energized={loadLive} thick currentFlow={outputAmps} />

                {/* Load Drops (Breakers to Loads) */}
                <Node x={680} y={110} />
                <PowerLine d="M680,110 L680,200" energized={loadLive} currentFlow={outputAmps / 2} />

                <Node x={730} y={110} />
                <PowerLine d="M730,110 L730,200" energized={loadLive} currentFlow={outputAmps / 2} />

                {/* --- COMPONENTS --- */}

                <ComponentBox x={220} y={110} w={60} h={60} label="RECT" type="rectifier" status={components.rectifier.status} onClick={onComponentClick}>
                    <DiodeBridge size={30} color={components.rectifier.status === ComponentStatus.NORMAL ? '#22d3ee' : '#94a3b8'} />
                </ComponentBox>

                <ComponentBox x={400} y={110} w={60} h={60} label="INV" type="inverter" status={components.inverter.status} onClick={onComponentClick}>
                    <IGBT size={30} color={components.inverter.status === ComponentStatus.NORMAL ? '#22d3ee' : '#94a3b8'} />
                </ComponentBox>

                {/* Static Switch (STS) */}
                <ComponentBox x={520} y={60} w={50} h={100} label="STS" type="staticSwitch" status={components.staticSwitch.status === 'OK' ? ComponentStatus.NORMAL : ComponentStatus.ALARM} onClick={onComponentClick}>
                    <StaticSwitchInternal mode={components.staticSwitch.mode} />
                </ComponentBox>

                {/* Battery Visual */}
                <g transform="translate(320, 330)">
                    <rect width="60" height="40" className="fill-slate-800 stroke-slate-500 stroke-2" />
                    <text x="30" y="25" textAnchor="middle" className="fill-slate-300 text-xs font-bold">BATT</text>
                    <rect x="5" y="32" width={50} height="5" className="fill-slate-700" />
                    <rect x="5" y="32" width={50 * (state.battery.chargeLevel / 100)} height="5" className={`${state.battery.chargeLevel < 20 ? 'fill-red-500' : 'fill-green-500'} transition-all duration-1000`} />
                    <text x="30" y="45" textAnchor="middle" className="fill-slate-500 text-[10px]">{state.battery.chargeLevel.toFixed(0)}%</text>
                </g>

                <Transformer x={590} y={110} />

                {/* --- BREAKERS --- */}
                <Breaker id={BreakerId.Q1} x={160} y={140} label="Q1" isOpen={!breakers[BreakerId.Q1]} isEnergized={inputToRect} onClick={() => onBreakerToggle(BreakerId.Q1)} />
                <Breaker id={BreakerId.Q2} x={160} y={80} label="Q2" isOpen={!breakers[BreakerId.Q2]} isEnergized={bypassPostQ2} onClick={() => onBreakerToggle(BreakerId.Q2)} />

                <g>
                    <rect x={320} y={15} width={60} height={50} className="fill-amber-500/10 stroke-none" />
                    <Breaker id={BreakerId.Q3} x={350} y={40} label="Q3" isOpen={!breakers[BreakerId.Q3]} isEnergized={q3Live} isWarning onClick={() => onBreakerToggle(BreakerId.Q3)} />
                </g>

                <Breaker id={BreakerId.Q4} x={620} y={110} label="Q4" isOpen={!breakers[BreakerId.Q4]} isEnergized={loadLive && breakers[BreakerId.Q4]} onClick={() => onBreakerToggle(BreakerId.Q4)} />
                <Breaker id={BreakerId.QF1} x={350} y={290} label="QF1" vertical isOpen={!breakers[BreakerId.QF1]} isEnergized={breakers[BreakerId.QF1] && (dcBusLive || state.battery.chargeLevel > 0)} onClick={() => onBreakerToggle(BreakerId.QF1)} />

                <Breaker id={BreakerId.Load1} x={680} y={200} label="CB-L1" vertical isOpen={!breakers[BreakerId.Load1]} isEnergized={loadLive && breakers[BreakerId.Load1]} onClick={() => onBreakerToggle(BreakerId.Load1)} />
                <Breaker id={BreakerId.Load2} x={730} y={200} label="CB-L2" vertical isOpen={!breakers[BreakerId.Load2]} isEnergized={loadLive && breakers[BreakerId.Load2]} onClick={() => onBreakerToggle(BreakerId.Load2)} />

                {/* --- LOAD BOXES (End of Line) --- */}
                <LoadBox x={680} y={260} label="SERVER RACK A" isSwitchedOn={breakers[BreakerId.Load1]} isPowered={loadLive && breakers[BreakerId.Load1]} />
                <LoadBox x={730} y={260} label="SERVER RACK B" isSwitchedOn={breakers[BreakerId.Load2]} isPowered={loadLive && breakers[BreakerId.Load2]} />

            </svg>
        </div>
    );
};
