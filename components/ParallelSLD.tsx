
import React from 'react';
import { motion } from 'framer-motion';
import { ParallelBreakerId, ComponentStatus, ParallelSimulationState } from '../parallel_types';
import { BatteryUnit } from './BatteryUnit';

interface SLDProps {
    state: ParallelSimulationState;
    onBreakerToggle: (id: ParallelBreakerId) => void;
    onComponentClick: (type: string) => void;
}

// ============================================================================
// CLEAN IEEE/IEC COMPLIANT COMPONENTS - NO BLUR, NO GLOW - SHARP LINES ONLY
// ============================================================================

// Ground Symbol per IEEE Std 315
const GroundSymbol = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x}, ${y})`}>
        <line x1="0" y1="0" x2="0" y2="8" stroke="#22c55e" strokeWidth="2" />
        <line x1="-8" y1="8" x2="8" y2="8" stroke="#22c55e" strokeWidth="2" />
        <line x1="-5" y1="12" x2="5" y2="12" stroke="#22c55e" strokeWidth="2" />
        <line x1="-2" y1="16" x2="2" y2="16" stroke="#22c55e" strokeWidth="2" />
    </g>
);

// Amp Rating Label - Clean and readable
const AmpRating = ({ x, y, rating }: { x: number; y: number; rating: string }) => (
    <text x={x} y={y} textAnchor="middle" className="fill-amber-400 text-[11px] font-bold">
        {rating}
    </text>
);

// Power Line - CLEAN solid lines, NO BLUR
const PowerLine = ({ d, energized, warning = false, thick = false }: any) => {
    const color = energized
        ? (warning ? '#f59e0b' : '#22d3ee')  // Amber for bypass, Cyan for normal
        : '#64748b';  // Gray when de-energized
    const strokeWidth = thick ? 4 : 3;

    return (
        <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    );
};

// Animated flow indicator - subtle white dashes
const FlowIndicator = ({ d, energized }: any) => {
    if (!energized) return null;
    return (
        <motion.path
            d={d}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2}
            strokeDasharray="8, 8"
            strokeLinecap="round"
            animate={{ strokeDashoffset: -16 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            opacity={0.6}
        />
    );
};

// Junction Node
const Node = ({ x, y }: { x: number, y: number }) => (
    <circle cx={x} cy={y} r={4} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
);

// Circuit Breaker - CLEAN, NO BLUR
const Breaker = ({ id, x, y, isOpen, onClick, label, vertical = false, isEnergized = false }: any) => {
    const closedColor = '#22c55e';  // Green when closed
    const openColor = '#ef4444';    // Red when open
    const bodyColor = isOpen ? openColor : closedColor;

    return (
        <g transform={`translate(${x}, ${y})`} className="cursor-pointer group" onClick={onClick}>
            {/* Hitbox */}
            <rect x={-30} y={-30} width={60} height={60} fill="transparent" />

            {/* Label - Clean white text */}
            <text
                x={vertical ? 25 : 0}
                y={vertical ? 5 : -22}
                textAnchor={vertical ? "start" : "middle"}
                className="fill-white text-[13px] font-bold pointer-events-none"
            >
                {label}
            </text>

            {/* Breaker housing */}
            <rect
                x={-10} y={-10} width={20} height={20} rx="3"
                fill="#1e293b"
                stroke={isEnergized && !isOpen ? closedColor : "#64748b"}
                strokeWidth="2"
                className="group-hover:stroke-white transition-colors"
            />

            {/* Contact paths */}
            <motion.path
                d={vertical
                    ? (isOpen ? "M0,-24 L0,-10 M0,10 L0,24 M-7,-4 L10,10" : "M0,-24 L0,24")
                    : (isOpen ? "M-24,0 L-10,0 M10,0 L24,0 M-4,8 L10,-10" : "M-24,0 L24,0")
                }
                stroke={bodyColor}
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                initial={false}
                animate={{
                    d: vertical
                        ? (isOpen ? "M0,-24 L0,-10 M0,10 L0,24 M-7,-4 L10,10" : "M0,-24 L0,24")
                        : (isOpen ? "M-24,0 L-10,0 M10,0 L24,0 M-4,8 L10,-10" : "M-24,0 L24,0")
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />

            {/* Status indicator dot */}
            <circle
                cx={12} cy={-12} r={4}
                fill={isOpen ? openColor : (isEnergized ? closedColor : "#64748b")}
            />
        </g>
    );
};

// Component Box - CLEAN design
const ComponentBox = ({ x, y, w, h, label, status, onClick, children, type }: any) => {
    let borderColor = '#3b82f6';  // Blue default
    if (status === ComponentStatus.OFF) borderColor = '#64748b';
    if (status === ComponentStatus.FAULT) borderColor = '#ef4444';
    if (status === ComponentStatus.NORMAL) borderColor = '#22d3ee';
    if (status === ComponentStatus.STARTING) borderColor = '#f59e0b';

    return (
        <g transform={`translate(${x}, ${y})`} onClick={() => onClick(type)} className="cursor-pointer group">
            <rect
                width={w} height={h} rx="4"
                fill="#0f172a"
                stroke={borderColor}
                strokeWidth="2"
                className="group-hover:stroke-white transition-colors"
            />
            <g transform={`translate(${w / 2}, ${h / 2})`}>{children}</g>
            <text
                x={w / 2} y={-8}
                textAnchor="middle"
                className="fill-white text-[12px] font-bold tracking-wide"
            >
                {label}
            </text>
            {/* Status LED */}
            {status !== ComponentStatus.OFF && (
                <circle
                    cx={w - 8} cy={8} r={4}
                    fill={status === ComponentStatus.FAULT ? '#ef4444' : '#22c55e'}
                />
            )}
        </g>
    );
};

// Diode Bridge Symbol
const DiodeBridge = ({ size, color }: { size: number, color: string }) => (
    <g stroke={color} fill="none" strokeWidth="2">
        <path d={`M${size * 0.2},${size * 0.8} L${size * 0.5},${size * 0.2} L${size * 0.8},${size * 0.8} Z`} />
        <path d={`M${size * 0.2},${size * 0.2} L${size * 0.8},${size * 0.2}`} />
        <line x1={size * 0.5} y1={size * 0.2} x2={size * 0.5} y2={0} />
        <line x1={size * 0.5} y1={size * 0.8} x2={size * 0.5} y2={size} />
    </g>
);

// IGBT Symbol
const IGBT = ({ size, color }: { size: number, color: string }) => (
    <g stroke={color} fill="none" strokeWidth="2">
        <circle cx={size / 2} cy={size / 2} r={size * 0.4} opacity={0.5} />
        <path d={`M${size * 0.3},${size * 0.3} L${size * 0.3},${size * 0.7}`} strokeWidth="3" />
        <path d={`M${size * 0.3},${size * 0.5} L${size * 0.7},${size * 0.5}`} />
        <path d={`M${size * 0.7},${size * 0.2} L${size * 0.7},${size * 0.8}`} />
    </g>
);

// Static Transfer Switch Internal
const StaticSwitchInternal = ({ mode }: { mode: 'INVERTER' | 'BYPASS' }) => {
    const activeColor = '#22d3ee';
    const inactiveColor = '#64748b';
    const isBypass = mode === 'BYPASS';

    return (
        <g>
            <text x="-8" y="-12" className="fill-slate-400 text-[8px] font-bold" textAnchor="end">BYP</text>
            <text x="-8" y="42" className="fill-slate-400 text-[8px] font-bold" textAnchor="end">INV</text>

            {/* Bypass path */}
            <path d="M-8,-12 L12,12" stroke={isBypass ? activeColor : inactiveColor} strokeWidth={isBypass ? 3 : 2} />

            {/* Inverter path */}
            <path d="M-8,38 L12,12" stroke={!isBypass ? activeColor : inactiveColor} strokeWidth={!isBypass ? 3 : 2} />

            {/* SCR symbols */}
            <g transform="translate(2, 0) rotate(45)">
                <path d="M-3,-5 L3,0 L-3,5 Z" fill={isBypass ? activeColor : 'none'} stroke={isBypass ? activeColor : inactiveColor} strokeWidth="1" />
            </g>
            <g transform="translate(2, 26) rotate(-45)">
                <path d="M-3,-5 L3,0 L-3,5 Z" fill={!isBypass ? activeColor : 'none'} stroke={!isBypass ? activeColor : inactiveColor} strokeWidth="1" />
            </g>

            {/* Output node */}
            <circle cx="12" cy="12" r="3" fill="#e2e8f0" />
            <line x1="12" y1="12" x2="32" y2="12" stroke={activeColor} strokeWidth="3" />
        </g>
    );
};

// Load Symbol - Clean server rack icon
const LoadSymbol = ({ x, y, label, isEnergized, loadKW, onClick }: any) => {
    const borderColor = isEnergized ? '#22c55e' : '#ef4444';
    const fillColor = isEnergized ? '#14532d' : '#7f1d1d';

    return (
        <g transform={`translate(${x}, ${y})`} className="cursor-pointer group" onClick={onClick}>
            <rect x="-20" y="0" width="40" height="50" rx="3"
                fill={fillColor}
                stroke={borderColor}
                strokeWidth="2"
                className="group-hover:stroke-white transition-colors"
            />

            {/* Server rack slots */}
            {[0, 1, 2, 3].map(i => (
                <g key={i}>
                    <rect x="-14" y={8 + i * 10} width="28" height="6" rx="1" fill="#1e293b" />
                    <circle cx="-8" cy={11 + i * 10} r="2" fill={isEnergized ? '#22c55e' : '#ef4444'} />
                    <circle cx="-2" cy={11 + i * 10} r="2" fill={isEnergized ? '#22c55e' : '#ef4444'} />
                </g>
            ))}

            <text x="0" y="62" textAnchor="middle" className="fill-white text-[11px] font-bold">{label}</text>
            <text x="0" y="74" textAnchor="middle" className={`text-[10px] font-mono ${isEnergized ? 'fill-green-400' : 'fill-red-400'}`}>
                {isEnergized ? `${loadKW.toFixed(1)} kW` : 'OFFLINE'}
            </text>
        </g>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ParallelSLD: React.FC<SLDProps> = ({ state, onBreakerToggle, onComponentClick }) => {
    const { breakers, voltages, modules } = state;
    const loadAmps = state.currents.totalOutput;
    const load1kW = (breakers[ParallelBreakerId.Load1] && voltages.loadBus > 50) ? 44 : 0;
    const load2kW = (breakers[ParallelBreakerId.Load2] && voltages.loadBus > 50) ? 32 : 0;

    return (
        <div className="w-full h-full bg-slate-950 rounded-lg overflow-hidden relative select-none">
            {/* Clean grid background */}
            <div className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    opacity: 0.3
                }}
            />

            <svg viewBox="0 0 900 500" className="w-full h-full">

                {/* Drawing title block */}
                <g transform="translate(10, 15)">
                    <text className="fill-slate-300 text-[12px] font-bold">UPS PARALLEL SYSTEM - SINGLE LINE DIAGRAM</text>
                    <text y="14" className="fill-slate-500 text-[9px] font-mono">DWG: UPS-PARALLEL-001 | IEEE 62040-3 / IEC 62040-3</text>
                </g>

                {/* ============ MODULE 1 (TOP) ============ */}
                <g transform="translate(0, 20)">
                    {/* Module label */}
                    <rect x="45" y="15" width="90" height="20" rx="3" fill="#0c4a6e" />
                    <text x="90" y="29" textAnchor="middle" className="fill-cyan-300 text-[12px] font-black">MODULE 1</text>

                    {/* Input source labels */}
                    <rect x="5" y="40" width="75" height="24" rx="2" fill="#78350f" fillOpacity="0.4" stroke="#f59e0b" strokeWidth="1" />
                    <text x="42" y="56" textAnchor="middle" className="fill-amber-300 text-[11px] font-bold">UTILITY-B</text>

                    <rect x="5" y="100" width="75" height="24" rx="2" fill="#164e63" fillOpacity="0.4" stroke="#22d3ee" strokeWidth="1" />
                    <text x="42" y="116" textAnchor="middle" className="fill-cyan-300 text-[11px] font-bold">UTILITY-A</text>

                    {/* BYPASS PATH (y=52) */}
                    <PowerLine d="M80,52 L220,52" energized={voltages.utilityInput > 50} warning thick />
                    <PowerLine d="M220,52 L500,52" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1]} warning thick />
                    <FlowIndicator d="M80,52 L500,52" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1]} />

                    <Breaker id={ParallelBreakerId.Q2_1} x={220} y={52} label="Q2-1" isOpen={!breakers[ParallelBreakerId.Q2_1]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q2_1)} />
                    <AmpRating x={220} y={78} rating="250A" />

                    {/* MAIN PATH (y=112) */}
                    <PowerLine d="M80,112 L140,112" energized={voltages.utilityInput > 50} thick />
                    <PowerLine d="M140,112 L230,112" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q1_1]} thick />
                    <FlowIndicator d="M80,112 L230,112" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q1_1]} />

                    <Breaker id={ParallelBreakerId.Q1_1} x={140} y={112} label="Q1-1" isOpen={!breakers[ParallelBreakerId.Q1_1]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q1_1)} />
                    <AmpRating x={140} y={138} rating="250A" />
                    <GroundSymbol x={100} y={118} />

                    {/* RECTIFIER */}
                    <ComponentBox x={230} y={88} w={50} h={48} label="RECT" type="module1.rectifier" status={modules.module1.rectifier.status} onClick={onComponentClick}>
                        <DiodeBridge size={24} color={modules.module1.rectifier.status === ComponentStatus.NORMAL ? '#22d3ee' : '#64748b'} />
                    </ComponentBox>

                    {/* DC Bus */}
                    <PowerLine d="M280,112 L370,112" energized={modules.module1.dcBusVoltage > 50} thick />
                    <text x="325" y="105" textAnchor="middle" className="fill-yellow-400 text-[10px] font-bold">⚡540VDC</text>
                    <Node x={370} y={112} />

                    {/* Battery branch */}
                    <PowerLine d="M370,112 L370,155" energized={modules.module1.dcBusVoltage > 50} />
                    <Breaker id={ParallelBreakerId.QF1_1} x={370} y={155} label="QF1-1" vertical isOpen={!breakers[ParallelBreakerId.QF1_1]} isEnergized={modules.module1.dcBusVoltage > 50} onClick={() => onBreakerToggle(ParallelBreakerId.QF1_1)} />
                    <AmpRating x={395} y={160} rating="100A" />
                    <BatteryUnit x={370} y={200} label="BATT 1" data={modules.module1.battery} onClick={() => onComponentClick('module1.battery')} />

                    {/* INVERTER */}
                    <PowerLine d="M370,112 L420,112" energized={modules.module1.dcBusVoltage > 50} />
                    <ComponentBox x={420} y={88} w={50} h={48} label="INV" type="module1.inverter" status={modules.module1.inverter.status} onClick={onComponentClick}>
                        <IGBT size={24} color={modules.module1.inverter.status === ComponentStatus.NORMAL ? '#22d3ee' : '#64748b'} />
                    </ComponentBox>

                    {/* Load % display */}
                    <g transform="translate(450, 145)">
                        <rect x="-22" y="-10" width="44" height="20" rx="3"
                            fill={modules.module1.inverter.loadPct > 80 ? "#7f1d1d" : "#14532d"}
                            stroke={modules.module1.inverter.loadPct > 80 ? "#ef4444" : "#22c55e"}
                            strokeWidth="1"
                        />
                        <text textAnchor="middle" y="4" className={`text-[11px] font-bold ${modules.module1.inverter.loadPct > 80 ? 'fill-red-400' : 'fill-green-400'}`}>
                            {Math.round(modules.module1.inverter.loadPct)}%
                        </text>
                    </g>

                    {/* INV output to STS */}
                    <PowerLine d="M470,112 L500,112" energized={modules.module1.inverter.status === ComponentStatus.NORMAL} />
                    <Node x={500} y={52} />
                    <Node x={500} y={112} />

                    {/* STS */}
                    <ComponentBox x={500} y={55} w={50} h={90} label="STS" type="module1.staticSwitch" status={ComponentStatus.NORMAL} onClick={onComponentClick}>
                        <StaticSwitchInternal mode={modules.module1.staticSwitch.mode} />
                    </ComponentBox>

                    {/* STS output to Q4 */}
                    <PowerLine d="M550,95 L600,95 L600,112" energized={modules.module1.staticSwitch.mode === 'INVERTER' ? modules.module1.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1])} thick />
                    <FlowIndicator d="M550,95 L600,112" energized={modules.module1.staticSwitch.mode === 'INVERTER' ? modules.module1.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1])} />

                    <Breaker id={ParallelBreakerId.Q4_1} x={600} y={112} label="Q4-1" isOpen={!breakers[ParallelBreakerId.Q4_1]} isEnergized={modules.module1.staticSwitch.mode === 'INVERTER' ? modules.module1.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1])} onClick={() => onBreakerToggle(ParallelBreakerId.Q4_1)} />
                    <AmpRating x={600} y={138} rating="300A" />

                    {/* Q4 to bus */}
                    <PowerLine d="M600,112 L660,112" energized={breakers[ParallelBreakerId.Q4_1] && voltages.loadBus > 50} thick />
                    <GroundSymbol x={660} y={118} />

                    {/* MAINTENANCE BYPASS - Separate path from UTILITY-B */}
                    <text x="155" y="30" textAnchor="middle" className="fill-orange-400 text-[9px] font-bold">MAINT BYPASS</text>
                    <PowerLine d="M100,52 L100,35 L660,35 L660,112" energized={breakers[ParallelBreakerId.Q3_1] && voltages.utilityInput > 50} warning />
                    <Node x={100} y={52} />
                    <Breaker id={ParallelBreakerId.Q3_1} x={330} y={35} label="Q3-1" isOpen={!breakers[ParallelBreakerId.Q3_1]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q3_1)} />
                    <AmpRating x={330} y={18} rating="400A" />
                </g>

                {/* Load share bus between modules */}
                <g>
                    <line x1="390" y1="190" x2="390" y2="295" stroke="#22c55e" strokeWidth="2" strokeDasharray="6,4" />
                    <text x="380" y="245" className="fill-green-400 text-[7px] font-bold" transform="rotate(-90, 380, 245)">SYNC</text>
                </g>

                {/* ============ MODULE 2 (BOTTOM) ============ */}
                <g transform="translate(0, 255)">
                    {/* Module label */}
                    <rect x="45" y="15" width="90" height="20" rx="3" fill="#0c4a6e" />
                    <text x="90" y="29" textAnchor="middle" className="fill-cyan-300 text-[12px] font-black">MODULE 2</text>

                    {/* Input source labels */}
                    <rect x="5" y="40" width="75" height="24" rx="2" fill="#78350f" fillOpacity="0.4" stroke="#f59e0b" strokeWidth="1" />
                    <text x="42" y="56" textAnchor="middle" className="fill-amber-300 text-[11px] font-bold">UTILITY-B</text>

                    <rect x="5" y="100" width="75" height="24" rx="2" fill="#164e63" fillOpacity="0.4" stroke="#22d3ee" strokeWidth="1" />
                    <text x="42" y="116" textAnchor="middle" className="fill-cyan-300 text-[11px] font-bold">UTILITY-A</text>

                    {/* BYPASS PATH */}
                    <PowerLine d="M80,52 L220,52" energized={voltages.utilityInput > 50} warning thick />
                    <PowerLine d="M220,52 L500,52" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2]} warning thick />
                    <FlowIndicator d="M80,52 L500,52" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2]} />

                    <Breaker id={ParallelBreakerId.Q2_2} x={220} y={52} label="Q2-2" isOpen={!breakers[ParallelBreakerId.Q2_2]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q2_2)} />
                    <AmpRating x={220} y={78} rating="250A" />

                    {/* MAIN PATH */}
                    <PowerLine d="M80,112 L140,112" energized={voltages.utilityInput > 50} thick />
                    <PowerLine d="M140,112 L230,112" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q1_2]} thick />
                    <FlowIndicator d="M80,112 L230,112" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q1_2]} />

                    <Breaker id={ParallelBreakerId.Q1_2} x={140} y={112} label="Q1-2" isOpen={!breakers[ParallelBreakerId.Q1_2]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q1_2)} />
                    <AmpRating x={140} y={138} rating="250A" />
                    <GroundSymbol x={100} y={118} />

                    {/* RECTIFIER */}
                    <ComponentBox x={230} y={88} w={50} h={48} label="RECT" type="module2.rectifier" status={modules.module2.rectifier.status} onClick={onComponentClick}>
                        <DiodeBridge size={24} color={modules.module2.rectifier.status === ComponentStatus.NORMAL ? '#22d3ee' : '#64748b'} />
                    </ComponentBox>

                    {/* DC Bus */}
                    <PowerLine d="M280,112 L370,112" energized={modules.module2.dcBusVoltage > 50} thick />
                    <text x="325" y="105" textAnchor="middle" className="fill-yellow-400 text-[10px] font-bold">⚡540VDC</text>
                    <Node x={370} y={112} />

                    {/* Battery branch */}
                    <PowerLine d="M370,112 L370,155" energized={modules.module2.dcBusVoltage > 50} />
                    <Breaker id={ParallelBreakerId.QF1_2} x={370} y={155} label="QF1-2" vertical isOpen={!breakers[ParallelBreakerId.QF1_2]} isEnergized={modules.module2.dcBusVoltage > 50} onClick={() => onBreakerToggle(ParallelBreakerId.QF1_2)} />
                    <AmpRating x={395} y={160} rating="100A" />
                    <BatteryUnit x={370} y={200} label="BATT 2" data={modules.module2.battery} onClick={() => onComponentClick('module2.battery')} />

                    {/* INVERTER */}
                    <PowerLine d="M370,112 L420,112" energized={modules.module2.dcBusVoltage > 50} />
                    <ComponentBox x={420} y={88} w={50} h={48} label="INV" type="module2.inverter" status={modules.module2.inverter.status} onClick={onComponentClick}>
                        <IGBT size={24} color={modules.module2.inverter.status === ComponentStatus.NORMAL ? '#22d3ee' : '#64748b'} />
                    </ComponentBox>

                    {/* Load % display */}
                    <g transform="translate(450, 145)">
                        <rect x="-22" y="-10" width="44" height="20" rx="3"
                            fill={modules.module2.inverter.loadPct > 80 ? "#7f1d1d" : "#14532d"}
                            stroke={modules.module2.inverter.loadPct > 80 ? "#ef4444" : "#22c55e"}
                            strokeWidth="1"
                        />
                        <text textAnchor="middle" y="4" className={`text-[11px] font-bold ${modules.module2.inverter.loadPct > 80 ? 'fill-red-400' : 'fill-green-400'}`}>
                            {Math.round(modules.module2.inverter.loadPct)}%
                        </text>
                    </g>

                    {/* INV output to STS */}
                    <PowerLine d="M470,112 L500,112" energized={modules.module2.inverter.status === ComponentStatus.NORMAL} />
                    <Node x={500} y={52} />
                    <Node x={500} y={112} />

                    {/* STS */}
                    <ComponentBox x={500} y={55} w={50} h={90} label="STS" type="module2.staticSwitch" status={ComponentStatus.NORMAL} onClick={onComponentClick}>
                        <StaticSwitchInternal mode={modules.module2.staticSwitch.mode} />
                    </ComponentBox>

                    {/* STS output to Q4 */}
                    <PowerLine d="M550,95 L600,95 L600,112" energized={modules.module2.staticSwitch.mode === 'INVERTER' ? modules.module2.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2])} thick />
                    <FlowIndicator d="M550,95 L600,112" energized={modules.module2.staticSwitch.mode === 'INVERTER' ? modules.module2.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2])} />

                    <Breaker id={ParallelBreakerId.Q4_2} x={600} y={112} label="Q4-2" isOpen={!breakers[ParallelBreakerId.Q4_2]} isEnergized={modules.module2.staticSwitch.mode === 'INVERTER' ? modules.module2.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2])} onClick={() => onBreakerToggle(ParallelBreakerId.Q4_2)} />
                    <AmpRating x={600} y={138} rating="300A" />

                    {/* Q4 to bus */}
                    <PowerLine d="M600,112 L660,112" energized={breakers[ParallelBreakerId.Q4_2] && voltages.loadBus > 50} thick />
                    <GroundSymbol x={660} y={118} />

                    {/* MAINTENANCE BYPASS */}
                    <text x="155" y="30" textAnchor="middle" className="fill-orange-400 text-[9px] font-bold">MAINT BYPASS</text>
                    <PowerLine d="M100,52 L100,35 L660,35 L660,112" energized={breakers[ParallelBreakerId.Q3_2] && voltages.utilityInput > 50} warning />
                    <Node x={100} y={52} />
                    <Breaker id={ParallelBreakerId.Q3_2} x={330} y={35} label="Q3-2" isOpen={!breakers[ParallelBreakerId.Q3_2]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q3_2)} />
                    <AmpRating x={330} y={18} rating="400A" />
                </g>

                {/* ============ LOAD BUS & DISTRIBUTION ============ */}
                <g transform="translate(660, 0)">
                    {/* Module outputs to bus */}
                    <PowerLine d="M0,132 L40,132 L40,260" energized={voltages.loadBus > 50} thick />
                    <PowerLine d="M0,367 L40,367 L40,260" energized={voltages.loadBus > 50} thick />
                    <FlowIndicator d="M0,132 L40,260" energized={voltages.loadBus > 50} />
                    <Node x={40} y={260} />

                    {/* Bus bar */}
                    <rect x="36" y="180" width="8" height="160"
                        fill={voltages.loadBus > 50 ? "#ea580c" : "#475569"}
                        rx="2"
                    />
                    <text x="55" y="265" className="fill-orange-400 text-[9px] font-bold">800A BUS</text>

                    {/* Load 1 branch */}
                    <PowerLine d="M40,220 L100,220" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} />
                    <Breaker id={ParallelBreakerId.Load1} x={100} y={220} label="CB-L1" isOpen={!breakers[ParallelBreakerId.Load1]} isEnergized={voltages.loadBus > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Load1)} />
                    <AmpRating x={100} y={246} rating="200A" />
                    <PowerLine d="M100,220 L160,220" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} />

                    {/* Load 2 branch */}
                    <PowerLine d="M40,300 L100,300" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} />
                    <Breaker id={ParallelBreakerId.Load2} x={100} y={300} label="CB-L2" isOpen={!breakers[ParallelBreakerId.Load2]} isEnergized={voltages.loadBus > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Load2)} />
                    <AmpRating x={100} y={326} rating="200A" />
                    <PowerLine d="M100,300 L160,300" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} />
                </g>

                {/* Load equipment */}
                <LoadSymbol x={840} y={195} label="CRITICAL-A" isEnergized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} loadKW={load1kW} onClick={() => onComponentClick('load1')} />
                <LoadSymbol x={840} y={275} label="CRITICAL-B" isEnergized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} loadKW={load2kW} onClick={() => onComponentClick('load2')} />

                {/* Legend */}
                <g transform="translate(10, 475)">
                    <text className="fill-slate-400 text-[10px] font-mono">UTILITY: 400VAC 3Ø | DC BUS: 540VDC | OUTPUT: 400VAC 3Ø 50Hz</text>
                </g>

            </svg>
        </div>
    );
};
