
import React from 'react';
import { motion } from 'framer-motion';
import { ParallelBreakerId, ComponentStatus, ParallelSimulationState } from '../parallel_types';
import { BatteryUnit } from './BatteryUnit';

interface SLDProps {
    state: ParallelSimulationState;
    onBreakerToggle: (id: ParallelBreakerId) => void;
    onComponentClick: (type: string) => void;
}

// --- PROFESSIONAL OEM COMPONENTS ---

// Ground Symbol (Safety Critical)
const GroundSymbol = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x}, ${y})`}>
        <line x1="0" y1="0" x2="0" y2="8" stroke="#4ade80" strokeWidth="2.5" />
        <line x1="-8" y1="8" x2="8" y2="8" stroke="#4ade80" strokeWidth="2.5" />
        <line x1="-5" y1="11" x2="5" y2="11" stroke="#4ade80" strokeWidth="2" />
        <line x1="-3" y1="14" x2="3" y2="14" stroke="#4ade80" strokeWidth="1.5" />
        <text y="25" textAnchor="middle" className="fill-green-400 text-[8px] font-bold">⏚</text>
    </g>
);

// Amp Rating Label (OEM Standard)
const AmpRating = ({ x, y, rating }: { x: number; y: number; rating: string }) => (
    <text x={x} y={y} textAnchor="middle" className="fill-amber-400 text-[9px] font-bold tracking-wide">
        {rating}
    </text>
);

const LoadSymbol = ({ x, y, label, isEnergized, loadKW, onClick }: any) => {
    const color = isEnergized ? '#22c55e' : '#ef4444';  // Green when energized, RED when power lost
    const fillColor = isEnergized ? '#166534' : '#7f1d1d';  // Dark green or dark red
    const glowColor = isEnergized ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.5)';

    return (
        <g transform={`translate(${x}, ${y})`} className="cursor-pointer group" onClick={onClick}>
            {/* Server Rack Icon */}
            <rect x="-20" y="0" width="40" height="50" rx="2"
                className="stroke-2 transition-all group-hover:stroke-white"
                fill={fillColor}
                stroke={color}
                style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
            />

            {/* Rack Slots */}
            {[0, 1, 2, 3].map(i => (
                <g key={i}>
                    <rect x="-16" y={8 + i * 10} width="32" height="6" rx="1" className="fill-slate-800" />
                    {isEnergized && (
                        <>
                            <circle cx="-10" cy={11 + i * 10} r="1" className="fill-green-400 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                            <circle cx="-4" cy={11 + i * 10} r="1" className="fill-green-400 animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.05}s` }} />
                        </>
                    )}
                    {/* Show red indicators when power is lost */}
                    {!isEnergized && (
                        <>
                            <circle cx="-10" cy={11 + i * 10} r="1.5" className="fill-red-500" />
                            <circle cx="-4" cy={11 + i * 10} r="1.5" className="fill-red-500" />
                        </>
                    )}
                </g>
            ))}

            {/* Label - Increased font size */}
            <text x="0" y="65" textAnchor="middle" className="fill-slate-400 text-[11px] font-bold tracking-wider group-hover:fill-white transition-colors pointer-events-none">{label}</text>

            {/* Power Indicator */}
            {isEnergized ? (
                <text x="0" y="77" textAnchor="middle" className="fill-green-400 text-[10px] font-mono pointer-events-none">{loadKW.toFixed(1)} kW</text>
            ) : (
                <text x="0" y="77" textAnchor="middle" className="fill-red-500 text-[10px] font-mono font-bold pointer-events-none animate-pulse">!! LOST !!</text>
            )}
        </g>
    );
};

// --- SVG SYMBOLS (Matching Single Module Design) ---

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

// --- ANIMATED SYMBOLS ---

const Node = ({ x, y }: { x: number, y: number }) => (
    <circle cx={x} cy={y} r={3} className="fill-slate-200" />
);

const AnimatedPowerLine = ({ d, energized, warning = false, thick = false, currentFlow }: any) => {
    const color = warning ? '#f59e0b' : '#22d3ee';
    const strokeWidth = thick ? 6 : 4;  // Increased from 4:2 to 6:4 for better visibility
    const duration = currentFlow && currentFlow > 100 ? 0.5 : 1.5;

    // Determine opacity based on energized state
    const baseOpacity = energized ? 0.4 : 0.3;
    const animOpacity = energized ? 0.8 : 0;

    return (
        <g>
            {/* Base line - always visible */}
            <path
                d={d}
                fill="none"
                stroke={energized ? color : '#475569'}
                strokeWidth={strokeWidth}
                style={{ opacity: baseOpacity }}
                className="transition-all duration-500"
            />
            {energized && (
                <>
                    {/* Solid overlay for brightness */}
                    <motion.path
                        d={d}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                    {/* Animated dashed line for flow indication */}
                    <motion.path
                        d={d}
                        fill="none"
                        stroke={color}
                        strokeWidth={thick ? 3 : 2}
                        strokeDasharray="12, 12"
                        animate={{ strokeDashoffset: -24 }}
                        transition={{ duration: duration, repeat: Infinity, ease: "linear" }}
                        style={{ opacity: animOpacity }}
                    />
                </>
            )}
        </g>
    );
};

const Breaker = ({ id, x, y, isOpen, onClick, label, vertical = false, isEnergized = false }: any) => {
    const bodyColor = isOpen ? '#ef4444' : '#22c55e';

    return (
        <g transform={`translate(${x}, ${y})`} className="cursor-pointer group" onClick={onClick}>
            <rect x={-25} y={-25} width={50} height={50} fill="transparent" />
            <text x={vertical ? 25 : 0} y={vertical ? 0 : -20} textAnchor="middle" className="fill-slate-400 text-[12px] font-bold tracking-wider group-hover:fill-white transition-colors pointer-events-none">{label}</text>
            <rect x={-8} y={-8} width={16} height={16} rx="2" className="fill-slate-900 stroke-slate-500 stroke-2 group-hover:stroke-white transition-all" />
            <motion.path
                d={vertical ? (isOpen ? "M0,-20 L0,-8 M0,8 L0,20 M-8,-4 L12,12" : "M0,-20 L0,20") : (isOpen ? "M-20,0 L-8,0 M8,0 L20,0 M-4,8 L12,-12" : "M-20,0 L20,0")}
                stroke={bodyColor} strokeWidth="4" strokeLinecap="round" className="pointer-events-none"
                initial={false}
                animate={{ d: vertical ? (isOpen ? "M0,-20 L0,-8 M0,8 L0,20 M-8,-4 L12,12" : "M0,-20 L0,20") : (isOpen ? "M-20,0 L-8,0 M8,0 L20,0 M-4,8 L12,-12" : "M-20,0 L20,0") }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
            {!isOpen && isEnergized && (
                <circle cx={0} cy={0} r={6} fill={bodyColor} style={{ filter: 'blur(4px)', opacity: 0.5 }} className="pointer-events-none" />
            )}
        </g>
    );
};

const ComponentBox = ({ x, y, w, h, label, status, onClick, children, type }: any) => {
    let borderColor = '#0ea5e9';
    let shadowColor = 'rgba(14, 165, 233, 0.2)';

    if (status === ComponentStatus.OFF) { borderColor = '#475569'; shadowColor = 'transparent'; }
    if (status === ComponentStatus.FAULT) { borderColor = '#ef4444'; shadowColor = 'rgba(239, 68, 68, 0.3)'; }
    if (status === ComponentStatus.STARTING) { borderColor = '#3b82f6'; }

    return (
        <g transform={`translate(${x}, ${y})`} onClick={() => onClick(type)} className="cursor-pointer group">
            <rect width={w} height={h} rx="6" fill="rgba(15, 23, 42, 0.9)" stroke={borderColor} strokeWidth="2"
                className="group-hover:stroke-white transition-all"
                style={{ filter: `drop-shadow(0 0 10px ${shadowColor})` }}
            />
            <g transform={`translate(${w / 2}, ${h / 2})`} className="pointer-events-none">{children}</g>
            <text x={w / 2} y={-8} textAnchor="middle" className="fill-slate-400 text-[12px] font-bold tracking-widest group-hover:fill-white transition-colors pointer-events-none">{label}</text>
            {status !== ComponentStatus.OFF && (
                <circle cx={w - 8} cy={8} r={3} fill={status === ComponentStatus.FAULT ? '#ef4444' : '#22c55e'} className="pointer-events-none" />
            )}
        </g>
    );
};

export const ParallelSLD: React.FC<SLDProps> = ({ state, onBreakerToggle, onComponentClick }) => {
    const { breakers, voltages, modules } = state;
    const loadAmps = state.currents.totalOutput;
    const load1kW = (breakers[ParallelBreakerId.Load1] && voltages.loadBus > 50) ? 44 : 0;
    const load2kW = (breakers[ParallelBreakerId.Load2] && voltages.loadBus > 50) ? 32 : 0;

    return (
        <div className="w-full h-full bg-slate-950 border border-slate-800 rounded-lg relative overflow-hidden select-none shadow-2xl">
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.3 }}></div>

            <svg viewBox="0 0 850 500" className="w-full h-full">

                {/* Title Block (Like real schematics) */}
                <g transform="translate(10, 10)">
                    <text className="fill-slate-500 text-[11px] font-mono">DWG: UPS-PARALLEL-001</text>
                    <text y="14" className="fill-slate-600 text-[9px] font-mono">IEEE 62040-3 / IEC 62040-3</text>
                </g>

                {/* --- MODULE 1 (TOP) --- */}
                <g transform="translate(0, 0)">
                    <text x="50" y="25" className="fill-cyan-500 text-sm font-black tracking-widest opacity-50 pointer-events-none">MODULE 1</text>

                    {/* DUAL INPUT SOURCE LABELS - OEM Standard */}
                    <text x="15" y="40" className="fill-amber-500 text-[9px] font-bold">UTILITY-B</text>
                    <text x="15" y="48" className="fill-amber-500 text-[7px]">(BYPASS)</text>
                    <text x="15" y="115" className="fill-cyan-400 text-[9px] font-bold">UTILITY-A</text>
                    <text x="15" y="123" className="fill-cyan-400 text-[7px]">(MAIN)</text>

                    {/* Bypass Input Line - HIGH at y=50 for clearance */}
                    <AnimatedPowerLine d="M30,50 L250,50" energized={voltages.utilityInput > 50} warning thick />
                    <AnimatedPowerLine d="M250,50 L530,50" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1]} warning thick />

                    {/* Q2-1 BYPASS BREAKER - PROMINENT */}
                    <Breaker id={ParallelBreakerId.Q2_1} x={250} y={50} label="Q2-1" isOpen={!breakers[ParallelBreakerId.Q2_1]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q2_1)} />
                    <AmpRating x={250} y={70} rating="250A" />
                    <GroundSymbol x={200} y={55} />

                    {/* Main Utility Input - at y=130 */}
                    <AnimatedPowerLine d="M30,130 L150,130" energized={voltages.utilityInput > 50} thick />
                    <AnimatedPowerLine d="M150,130 L250,130" energized={breakers[ParallelBreakerId.Q1_1]} />

                    {/* Q1-1 INPUT BREAKER */}
                    <Breaker id={ParallelBreakerId.Q1_1} x={150} y={130} label="Q1-1" isOpen={!breakers[ParallelBreakerId.Q1_1]} isEnergized={voltages.utilityInput > 0} onClick={() => onBreakerToggle(ParallelBreakerId.Q1_1)} />
                    <AmpRating x={150} y={150} rating="250A" />
                    <GroundSymbol x={100} y={135} />

                    {/* Rectifier to DC Bus */}
                    <AnimatedPowerLine d="M310,130 L400,130" energized={modules.module1.dcBusVoltage > 50} thick />
                    <Node x={400} y={130} />

                    {/* DC VOLTAGE LABEL - Safety Warning */}
                    <text x={350} y={120} className="fill-yellow-400 text-[10px] font-bold">⚡ 540VDC</text>

                    {/* Inverter Input */}
                    <AnimatedPowerLine d="M400,130 L450,130" energized={modules.module1.dcBusVoltage > 50} />

                    {/* Inverter Output */}
                    <AnimatedPowerLine d="M510,130 L530,130" energized={modules.module1.inverter.status === ComponentStatus.NORMAL} />

                    {/* DC Bus to Battery (vertical) */}
                    <AnimatedPowerLine d="M400,130 L400,180" energized={modules.module1.dcBusVoltage > 50} />
                    <Node x={400} y={180} />
                    <BatteryUnit x={400} y={220} label="BATT 1" data={modules.module1.battery} onClick={() => onComponentClick('module1.battery')} />

                    {/* QF1-1 BATTERY BREAKER */}
                    <Breaker id={ParallelBreakerId.QF1_1} x={400} y={180} label="QF1-1" vertical isOpen={!breakers[ParallelBreakerId.QF1_1]} isEnergized={breakers[ParallelBreakerId.QF1_1]} onClick={() => onBreakerToggle(ParallelBreakerId.QF1_1)} />
                    <AmpRating x={420} y={185} rating="100A DC" />
                    <GroundSymbol x={400} y={270} />

                    {/* Components - centered vertically around y=130 */}
                    <ComponentBox x={250} y={100} w={60} h={60} label="RECT" type="module1.rectifier" status={modules.module1.rectifier.status} onClick={onComponentClick}>
                        <DiodeBridge size={30} color={modules.module1.rectifier.status === ComponentStatus.NORMAL ? '#22d3ee' : '#94a3b8'} />
                    </ComponentBox>

                    <ComponentBox x={450} y={100} w={60} h={60} label="INV" type="module1.inverter" status={modules.module1.inverter.status} onClick={onComponentClick}>
                        <IGBT size={30} color={modules.module1.inverter.status === ComponentStatus.NORMAL ? '#22d3ee' : '#94a3b8'} />
                    </ComponentBox>

                    {/* MODULE 1 LOAD PERCENTAGE DISPLAY */}
                    <g transform="translate(480, 170)">
                        <rect x="-25" y="-12" width="50" height="24" rx="4" className={
                            modules.module1.inverter.loadPct > 100 ? "fill-red-900/80" :
                                modules.module1.inverter.loadPct > 80 ? "fill-amber-900/80" :
                                    "fill-green-900/80"
                        } stroke={
                            modules.module1.inverter.loadPct > 100 ? "#ef4444" :
                                modules.module1.inverter.loadPct > 80 ? "#f59e0b" :
                                    "#22c55e"
                        } strokeWidth="2" />
                        <text textAnchor="middle" y="5" className={
                            modules.module1.inverter.loadPct > 100 ? "fill-red-400 text-[12px] font-black" :
                                modules.module1.inverter.loadPct > 80 ? "fill-amber-400 text-[12px] font-black" :
                                    "fill-green-400 text-[12px] font-black"
                        }>
                            {Math.round(modules.module1.inverter.loadPct)}%
                        </text>
                    </g>

                    {/* ENHANCED STS - Double Border for Critical Component */}
                    <Node x={530} y={50} />  {/* Bypass input node */}
                    <Node x={530} y={130} />  {/* Inverter input node */}

                    {/* STS Protective Frame */}
                    <rect x={527} y={57} width={66} height={106} rx="4" className="fill-transparent stroke-amber-500/30 stroke-2" strokeDasharray="4,4" />

                    <ComponentBox x={530} y={60} w={60} h={100} label="STS" type="module1.staticSwitch" status={ComponentStatus.NORMAL} onClick={onComponentClick}>
                        <StaticSwitchInternal mode={modules.module1.staticSwitch.mode} />
                    </ComponentBox>
                    <text x={560} y={55} textAnchor="middle" className="fill-amber-400 text-[7px] font-bold">STATIC TRANSFER</text>
                    <text x={560} y={175} textAnchor="middle" className="fill-slate-500 text-[7px]">Transfer: \u003c4ms</text>

                    {/* STS Output to Q4 */}
                    <Node x={590} y={110} />
                    <AnimatedPowerLine d="M590,110 L640,110 L640,130" energized={modules.module1.staticSwitch.mode === 'INVERTER' ? modules.module1.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1])} thick />

                    {/* Q4-1 OUTPUT BREAKER */}
                    <Breaker id={ParallelBreakerId.Q4_1} x={640} y={130} label="Q4-1" isOpen={!breakers[ParallelBreakerId.Q4_1]} isEnergized={modules.module1.staticSwitch.mode === 'INVERTER' ? modules.module1.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1])} onClick={() => onBreakerToggle(ParallelBreakerId.Q4_1)} />
                    <AmpRating x={640} y={150} rating="300A" />

                    {/* Q4 Output to Load Bus */}
                    <AnimatedPowerLine d="M640,130 L680,130" energized={breakers[ParallelBreakerId.Q4_1] && (modules.module1.staticSwitch.mode === 'INVERTER' ? modules.module1.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1]))} thick />
                    <GroundSymbol x={680} y={135} />

                    {/* MAINTENANCE BYPASS - Routed Along LEFT EDGE (x=30) - OEM Standard */}
                    <text x="30" y="20" className="fill-orange-500 text-[9px] font-bold">MAINT BYPASS</text>
                    <AnimatedPowerLine d="M30,130 L30,30 L680,30 L680,130" energized={breakers[ParallelBreakerId.Q3_1] && voltages.utilityInput > 50} warning thick />
                    <Node x={30} y={130} />
                    <Node x={680} y={130} />

                    {/* Q3-1 MAINTENANCE BYPASS BREAKER */}
                    <Breaker id={ParallelBreakerId.Q3_1} x={350} y={30} label="Q3-1 MAINT" isOpen={!breakers[ParallelBreakerId.Q3_1]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q3_1)} />
                    <AmpRating x={350} y={50} rating="400A" />
                </g>

                {/* --- INTER-MODULE CONTROL BUS --- OEM CRITICAL */}
                {/* Load Share / Sync Bus between modules */}
                <g>
                    <line
                        x1="420" y1="180"
                        x2="420" y2="450"
                        stroke="#22c55e"
                        strokeWidth="3"
                        strokeDasharray="8,8"
                        className="opacity-70"
                    />
                    <text x="430" y="315" className="fill-green-400 text-[8px] font-bold" transform="rotate(90, 430, 315)">
                        LOAD SHARE / SYNC BUS
                    </text>
                    <circle cx="420" cy="200" r="4" fill="#22c55e" />
                    <circle cx="420" cy="430" r="4" fill="#22c55e" />
                </g>

                {/* --- MODULE 2 (BOTTOM) --- */}
                <g transform="translate(0, 260)">
                    <text x="50" y="25" className="fill-cyan-500 text-sm font-black tracking-widest opacity-50 pointer-events-none">MODULE 2</text>

                    {/* DUAL INPUT SOURCE LABELS - OEM Standard */}
                    <text x="15" y="40" className="fill-amber-500 text-[9px] font-bold">UTILITY-B</text>
                    <text x="15" y="48" className="fill-amber-500 text-[7px]">(BYPASS)</text>
                    <text x="15" y="115" className="fill-cyan-400 text-[9px] font-bold">UTILITY-A</text>
                    <text x="15" y="123" className="fill-cyan-400 text-[7px]">(MAIN)</text>

                    {/* Bypass Input Line - HIGH at y=50 for clearance */}
                    <AnimatedPowerLine d="M30,50 L250,50" energized={voltages.utilityInput > 50} warning thick />
                    <AnimatedPowerLine d="M250,50 L530,50" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2]} warning thick />

                    {/* Q2-2 BYPASS BREAKER - PROMINENT */}
                    <Breaker id={ParallelBreakerId.Q2_2} x={250} y={50} label="Q2-2" isOpen={!breakers[ParallelBreakerId.Q2_2]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q2_2)} />
                    <AmpRating x={250} y={70} rating="250A" />
                    <GroundSymbol x={200} y={55} />

                    {/* Main Utility Input - at y=130 */}
                    <AnimatedPowerLine d="M30,130 L150,130" energized={voltages.utilityInput > 50} thick />
                    <AnimatedPowerLine d="M150,130 L250,130" energized={breakers[ParallelBreakerId.Q1_2]} />

                    {/* Q1-2 INPUT BREAKER */}
                    <Breaker id={ParallelBreakerId.Q1_2} x={150} y={130} label="Q1-2" isOpen={!breakers[ParallelBreakerId.Q1_2]} isEnergized={voltages.utilityInput > 0} onClick={() => onBreakerToggle(ParallelBreakerId.Q1_2)} />
                    <AmpRating x={150} y={150} rating="250A" />
                    <GroundSymbol x={100} y={135} />

                    {/* Rectifier to DC Bus */}
                    <AnimatedPowerLine d="M310,130 L400,130" energized={modules.module2.dcBusVoltage > 50} thick />
                    <Node x={400} y={130} />

                    {/* DC VOLTAGE LABEL - Safety Warning */}
                    <text x={350} y={120} className="fill-yellow-400 text-[10px] font-bold">⚡ 540VDC</text>

                    {/* Inverter Input */}
                    <AnimatedPowerLine d="M400,130 L450,130" energized={modules.module2.dcBusVoltage > 50} />

                    {/* Inverter Output */}
                    <AnimatedPowerLine d="M510,130 L530,130" energized={modules.module2.inverter.status === ComponentStatus.NORMAL} />

                    {/* DC Bus to Battery (vertical) */}
                    <AnimatedPowerLine d="M400,130 L400,180" energized={modules.module2.dcBusVoltage > 50} />
                    <Node x={400} y={180} />
                    <BatteryUnit x={400} y={220} label="BATT 2" data={modules.module2.battery} onClick={() => onComponentClick('module2.battery')} />

                    {/* QF1-2 BATTERY BREAKER */}
                    <Breaker id={ParallelBreakerId.QF1_2} x={400} y={180} label="QF1-2" vertical isOpen={!breakers[ParallelBreakerId.QF1_2]} isEnergized={breakers[ParallelBreakerId.QF1_2]} onClick={() => onBreakerToggle(ParallelBreakerId.QF1_2)} />
                    <AmpRating x={420} y={185} rating="100A DC" />
                    <GroundSymbol x={400} y={270} />

                    {/* Components - centered vertically around y=130 */}
                    <ComponentBox x={250} y={100} w={60} h={60} label="RECT" type="module2.rectifier" status={modules.module2.rectifier.status} onClick={onComponentClick}>
                        <DiodeBridge size={30} color={modules.module2.rectifier.status === ComponentStatus.NORMAL ? '#22d3ee' : '#94a3b8'} />
                    </ComponentBox>

                    <ComponentBox x={450} y={100} w={60} h={60} label="INV" type="module2.inverter" status={modules.module2.inverter.status} onClick={onComponentClick}>
                        <IGBT size={30} color={modules.module2.inverter.status === ComponentStatus.NORMAL ? '#22d3ee' : '#94a3b8'} />
                    </ComponentBox>

                    {/* MODULE 2 LOAD PERCENTAGE DISPLAY */}
                    <g transform="translate(480, 170)">
                        <rect x="-25" y="-12" width="50" height="24" rx="4" className={
                            modules.module2.inverter.loadPct > 100 ? "fill-red-900/80" :
                                modules.module2.inverter.loadPct > 80 ? "fill-amber-900/80" :
                                    "fill-green-900/80"
                        } stroke={
                            modules.module2.inverter.loadPct > 100 ? "#ef4444" :
                                modules.module2.inverter.loadPct > 80 ? "#f59e0b" :
                                    "#22c55e"
                        } strokeWidth="2" />
                        <text textAnchor="middle" y="5" className={
                            modules.module2.inverter.loadPct > 100 ? "fill-red-400 text-[12px] font-black" :
                                modules.module2.inverter.loadPct > 80 ? "fill-amber-400 text-[12px] font-black" :
                                    "fill-green-400 text-[12px] font-black"
                        }>
                            {Math.round(modules.module2.inverter.loadPct)}%
                        </text>
                    </g>

                    {/* ENHANCED STS - Double Border for Critical Component */}
                    <Node x={530} y={50} />  {/* Bypass input node */}
                    <Node x={530} y={130} />  {/* Inverter input node */}

                    {/* STS Protective Frame */}
                    <rect x={527} y={57} width={66} height={106} rx="4" className="fill-transparent stroke-amber-500/30 stroke-2" strokeDasharray="4,4" />

                    <ComponentBox x={530} y={60} w={60} h={100} label="STS" type="module2.staticSwitch" status={ComponentStatus.NORMAL} onClick={onComponentClick}>
                        <StaticSwitchInternal mode={modules.module2.staticSwitch.mode} />
                    </ComponentBox>
                    <text x={560} y={55} textAnchor="middle" className="fill-amber-400 text-[7px] font-bold">STATIC TRANSFER</text>
                    <text x={560} y={175} textAnchor="middle" className="fill-slate-500 text-[7px]">Transfer: \u003c4ms</text>

                    {/* STS Output to Q4 */}
                    <Node x={590} y={110} />
                    <AnimatedPowerLine d="M590,110 L640,110 L640,130" energized={modules.module2.staticSwitch.mode === 'INVERTER' ? modules.module2.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2])} thick />

                    {/* Q4-2 OUTPUT BREAKER */}
                    <Breaker id={ParallelBreakerId.Q4_2} x={640} y={130} label="Q4-2" isOpen={!breakers[ParallelBreakerId.Q4_2]} isEnergized={modules.module2.staticSwitch.mode === 'INVERTER' ? modules.module2.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2])} onClick={() => onBreakerToggle(ParallelBreakerId.Q4_2)} />
                    <AmpRating x={640} y={150} rating="300A" />

                    {/* Q4 Output to Load Bus */}
                    <AnimatedPowerLine d="M640,130 L680,130" energized={breakers[ParallelBreakerId.Q4_2] && (modules.module2.staticSwitch.mode === 'INVERTER' ? modules.module2.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2]))} thick />
                    <GroundSymbol x={680} y={135} />

                    {/* MAINTENANCE BYPASS - Routed Along LEFT EDGE (x=30) - OEM Standard */}
                    <text x="30" y="20" className="fill-orange-500 text-[9px] font-bold">MAINT BYPASS</text>
                    <AnimatedPowerLine d="M30,130 L30,30 L680,30 L680,130" energized={breakers[ParallelBreakerId.Q3_2] && voltages.utilityInput > 50} warning thick />
                    <Node x={30} y={130} />
                    <Node x={680} y={130} />

                    {/* Q3-2 MAINTENANCE BYPASS BREAKER */}
                    <Breaker id={ParallelBreakerId.Q3_2} x={350} y={30} label="Q3-2 MAINT" isOpen={!breakers[ParallelBreakerId.Q3_2]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q3_2)} />
                    <AmpRating x={350} y={50} rating="400A" />
                </g>

                {/* --- LOAD BUS & DISTRIBUTION --- */}
                <g transform="translate(680, 0)">
                    {/* Module 1 output at y=130 */}
                    <AnimatedPowerLine d="M0,130 L50,130 L50,260" energized={voltages.loadBus > 50} thick currentFlow={loadAmps} />
                    {/* Module 2 output at y=390 (260+130) */}
                    <AnimatedPowerLine d="M0,390 L50,390 L50,260" energized={voltages.loadBus > 50} thick currentFlow={loadAmps} />
                    <Node x={50} y={260} />
                    <GroundSymbol x={50} y={380} />

                    {/* PROFESSIONAL BUS BAR - OEM Standard (Wider, Copper Color) */}
                    <rect
                        x="46"
                        y="180"
                        width="8"
                        height="200"
                        className={voltages.loadBus > 50 ? "fill-orange-600" : "fill-slate-700"}
                        style={{ filter: voltages.loadBus > 50 ? 'drop-shadow(0 0 6px rgba(234, 88, 12, 0.6))' : 'none' }}
                    />

                    {/* Bus Bar Rating Label */}
                    <text x="60" y="190" className="fill-orange-400 text-[9px] font-bold">800A</text>
                    <text x="60" y="198" className="fill-orange-400 text-[7px]">BUS</text>

                    {/* Load Branches */}
                    <AnimatedPowerLine d="M50,220 L100,220" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} currentFlow={load1kW * 2.5} />
                    <AnimatedPowerLine d="M50,300 L100,300" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} currentFlow={load2kW * 2.5} />

                    {/* Load Breakers with Ratings */}
                    <Breaker id={ParallelBreakerId.Load1} x={100} y={220} label="L1" isOpen={!breakers[ParallelBreakerId.Load1]} isEnergized={voltages.loadBus > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Load1)} />
                    <AmpRating x={100} y={240} rating="200A" />

                    <Breaker id={ParallelBreakerId.Load2} x={100} y={300} label="L2" isOpen={!breakers[ParallelBreakerId.Load2]} isEnergized={voltages.loadBus > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Load2)} />
                    <AmpRating x={100} y={320} rating="200A" />

                    {/* Load Connections */}
                    <AnimatedPowerLine d="M100,220 L130,220" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} />
                    <AnimatedPowerLine d="M100,300 L130,300" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} />
                </g>

                {/* Load Equipment */}
                <LoadSymbol x={810} y={190} label="CRITICAL-A" isEnergized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} loadKW={load1kW} onClick={() => onComponentClick('load1')} />
                <LoadSymbol x={810} y={270} label="CRITICAL-B" isEnergized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} loadKW={load2kW} onClick={() => onComponentClick('load2')} />

                {/* Legend */}
                <g transform="translate(10, 470)">
                    <text className="fill-slate-600 text-[9px] font-mono">UTILITY: 400VAC 3Ø | DC BUS: 540VDC | OUTPUT: 400VAC 3Ø 50Hz</text>
                </g>

            </svg>
        </div>
    );
};
