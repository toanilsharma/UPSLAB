
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
    <text x={x} y={y} textAnchor="middle" className="fill-amber-400 text-[13px] font-bold">
        {rating}
    </text>
);

// Power Line with Animation and Harmonic Noise (Phase 1)
const PowerLine = ({ d, energized, warning = false, thick = false, currentFlow = 0, reverse = false, thd = 0 }: any) => {
    const baseColor = energized
        ? (warning ? '#f59e0b' : '#22c55e')  // Amber for bypass, Green for normal
        : '#ffffff';  // White when de-energized
        
    const baseOpacity = energized ? 1 : 0.15; // Dim white
    const strokeWidth = thick ? 6 : 4;

    const isFlowing = energized;
    const flowColor = '#ffffff';

    // Speed
    let duration = 2; // slow
    if (currentFlow && currentFlow > 50) duration = 1;
    if (currentFlow && currentFlow > 100) duration = 0.5;

    // Harmonic Noise Visualization (Phase 1)
    // Subtle jitter/wave on the line if THD is high
    const noiseEffect = thd > 5 ? "animate-pulse" : "";

    return (
        <>
            {/* Base Path (Static) */}
            <path 
                d={d} 
                fill="none" 
                stroke={baseColor} 
                strokeWidth={strokeWidth} 
                opacity={baseOpacity}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-colors duration-500 ${noiseEffect}`}
            />
            
            {/* Flow Animation (Overlay) */}
            {isFlowing && (
                <motion.path
                    d={d}
                    fill="none"
                    stroke={flowColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray="10, 10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: reverse ? [0, 20] : [0, -20] }}
                    transition={{ 
                        duration: duration, 
                        repeat: Infinity, 
                        ease: "linear" 
                    }}
                    style={{ opacity: 0.8 }}
                />
            )}
            
            {/* Harmonic Distortion Ghosting (Phase 1) */}
            {thd > 3 && (
                <path
                    d={d}
                    fill="none"
                    stroke={baseColor}
                    strokeWidth={strokeWidth + 2}
                    opacity={0.15}
                    className="animate-pulse blur-sm"
                />
            )}
        </>
    );
};

// Animated flow indicator - subtle white dashes
const FlowIndicator = ({ d, energized, reverse = false }: { d: string, energized: boolean, reverse?: boolean }) => {
    // If energized, show it!
    if (!energized) return null;
    
    // Make it much more visible as requested
    return (
        <motion.path
            d={d}
            fill="none"
            stroke="#ffffff" // Bright white for max contrast against dark bg
            strokeWidth={4}
            strokeDasharray="10, 10"
            strokeLinecap="round"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: reverse ? [0, 20] : [0, -20] }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            opacity={0.9} // Increased opacity
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
            {/* Custom Instant Tooltip */}
            <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none drop-shadow-lg" style={{ zIndex: 50 }}>
                <rect x={-65} y={-55} width={130} height={20} rx="4" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1" />
                <text x={0} y={-41} textAnchor="middle" className="fill-white text-[11px] font-bold tracking-wider">CLICK TO OPERATE</text>
            </g>

            {/* Hitbox */}
            <rect x="-30" y="-30" width={60} height={60} fill="transparent" />

            {/* Label - Clean white text */}
            <text
                x={vertical ? 25 : 0}
                y={vertical ? 5 : -25}
                textAnchor={vertical ? "start" : "middle"}
                className="fill-white text-[15px] font-bold pointer-events-none"
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
const ComponentBox = ({ x, y, w, h, label, status, onClick, children, type, timer }: any) => {
    let borderColor = '#3b82f6';  // Blue default
    if (status === ComponentStatus.OFF) borderColor = '#475569';
    if (status === ComponentStatus.FAULT) borderColor = '#ef4444';
    if (status === ComponentStatus.NORMAL) borderColor = '#22c55e'; // Green
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
                x={w / 2} y={-10}
                textAnchor="middle"
                className="fill-white text-[14px] font-bold tracking-wide"
            >
                {label}
            </text>

            {status === ComponentStatus.STARTING && timer !== undefined && (
                <text x={w / 2} y={h / 2 + 20} textAnchor="middle" className="fill-white text-[16px] font-mono font-black drop-shadow-lg animate-pulse">{timer.toFixed(1)}s {type.includes('rect') ? 'DC BLD' : 'AC BLD'}</text>
            )}

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
const StaticSwitchInternal = ({ mode, inFlowing, byFlowing, isIsolated }: { mode: 'INVERTER' | 'BYPASS', inFlowing?: boolean, byFlowing?: boolean, isIsolated?: boolean }) => {
    const activeColor = isIsolated ? '#ef4444' : '#22c55e'; // Red if isolated
    const inactiveColor = '#64748b';
    const isBypass = mode === 'BYPASS';

    return (
        <g>
            {/* BYPASS NODE */}
            <circle cx="-8" cy="-28" r="4" fill={isBypass ? '#f59e0b' : '#334155'} />
            <text x="-8" y="-40" className="fill-slate-300 text-[12px] font-bold" textAnchor="end">BYP</text>
            {/* INVERTER NODE */}
            <circle cx="-8" cy="12" r="4" fill={!isBypass ? '#f59e0b' : '#334155'} />
            <text x="-8" y="8" className="fill-slate-300 text-[12px] font-bold" textAnchor="end">INV</text>
            {isIsolated && <text x="0" y="32" className="fill-red-500 text-[9px] font-black" textAnchor="middle">BLOCKED</text>}

            {/* Bypass path: M-25,-48 L0,12 */}
            <path d="M-25,-48 L12,12" stroke={isBypass ? activeColor : inactiveColor} strokeWidth={isBypass ? 4 : 3} />
            {byFlowing && (
                <motion.path
                    d="M-25,-48 L12,12"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={4}
                    strokeDasharray="6, 6"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -12 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    opacity={0.9}
                />
            )}

            {/* Inverter path: M-25,12 L12,12 */}
            <path d="M-25,12 L12,12" stroke={!isBypass ? activeColor : inactiveColor} strokeWidth={!isBypass ? 4 : 3} />
            {inFlowing && (
                <motion.path
                    d="M-25,12 L12,12"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={4}
                    strokeDasharray="6, 6"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -12 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    opacity={0.9}
                />
            )}

            {/* SCR symbols positioned on the paths */}
            {/* Bypass SCR: Midpoint of (-25,-48) and (12,12) approx (-6, -18) */}
            <g transform="translate(-6, -18) rotate(60)">
                <path d="M-3,-5 L3,0 L-3,5 Z" fill={isBypass ? activeColor : 'none'} stroke={isBypass ? activeColor : inactiveColor} strokeWidth="1" />
            </g>
            
            {/* Inverter SCR: Midpoint of (-25,12) and (12,12) approx (-6, 12) */}
            <g transform="translate(-6, 12)">
                <path d="M-3,-5 L3,0 L-3,5 Z" fill={!isBypass ? activeColor : 'none'} stroke={!isBypass ? activeColor : inactiveColor} strokeWidth="1" />
            </g>

            {/* Output node and line */}
            <circle cx="12" cy="12" r="3" fill="#e2e8f0" />
            <line x1="12" y1="12" x2="25" y2="12" stroke={activeColor} strokeWidth="4" />
            {(inFlowing || byFlowing) && (
                 <motion.path
                    d="M12,12 L25,12"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={4}
                    strokeDasharray="6, 6"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -12 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    opacity={0.9}
                />
            )}
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

            <text x="0" y="62" textAnchor="middle" className="fill-white text-[13px] font-bold">{label}</text>
            <text x="0" y="76" textAnchor="middle" className={`text-[12px] font-mono ${isEnergized ? 'fill-green-400' : 'fill-red-400'}`}>
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

            {/* Increased ViewBox Height to prevent bottom clipping after spacing adjustments */}
            <svg viewBox="0 0 900 520" className="w-full h-full">

                {/* Drawing title block */}
                <g transform="translate(10, 15)">
                    <text className="fill-slate-300 text-[14px] font-bold">UPS PARALLEL SYSTEM - SINGLE LINE DIAGRAM</text>
                    <text y="16" className="fill-slate-500 text-[11px] font-mono">DWG: UPS-PARALLEL-001 | IEEE 62040-3 / IEC 62040-3</text>
                </g>

                {/* ============ MODULE 1 (TOP) ============ */}
                <g transform="translate(0, 20)">
                    {/* Module label */}
                    <rect x="45" y="15" width="90" height="20" rx="3" fill="#0c4a6e" />
                    <text x="90" y="29" textAnchor="middle" className="fill-cyan-300 text-[14px] font-black">MODULE 1</text>

                    {/* Input source labels */}
                    <rect x="5" y="40" width="75" height="24" rx="2" fill="#78350f" fillOpacity="0.4" stroke="#f59e0b" strokeWidth="1" />
                    <text x="42" y="56" textAnchor="middle" className="fill-amber-300 text-[13px] font-bold">UTILITY-B</text>

                    <rect x="5" y="100" width="75" height="24" rx="2" fill="#164e63" fillOpacity="0.4" stroke="#22d3ee" strokeWidth="1" />
                    <text x="42" y="116" textAnchor="middle" className="fill-cyan-300 text-[13px] font-bold">UTILITY-A</text>

                    {/* BYPASS PATH (y=52) */}
                    <PowerLine d="M80,52 L196,52" energized={voltages.utilityInput > 50} warning thick />
                    <PowerLine d="M244,52 L500,52" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1]} warning thick />
                    <FlowIndicator d="M80,52 L196,52" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1]} />
                    <FlowIndicator d="M244,52 L500,52" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1]} />

                    <Breaker id={ParallelBreakerId.Q2_1} x={220} y={52} label="Q2-1" isOpen={!breakers[ParallelBreakerId.Q2_1]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q2_1)} />
                    <AmpRating x={220} y={78} rating="250A" />

                    {/* MAIN PATH (y=112) */}
                    <PowerLine d="M80,112 L116,112" energized={voltages.utilityInput > 50} thick />
                    <PowerLine d="M164,112 L230,112" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q1_1]} thick />
                    <FlowIndicator d="M80,112 L116,112" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q1_1]} />
                    <FlowIndicator d="M164,112 L230,112" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q1_1]} />

                    <Breaker id={ParallelBreakerId.Q1_1} x={140} y={112} label="Q1-1" isOpen={!breakers[ParallelBreakerId.Q1_1]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q1_1)} />
                    <AmpRating x={140} y={138} rating="250A" />
                    <GroundSymbol x={100} y={118} />

                    {/* RECTIFIER */}
                    <ComponentBox x={230} y={88} w={50} h={48} label="RECT" type="module1.rectifier" status={modules.module1.rectifier.status} timer={modules.module1.rectifier.startTimer} onClick={onComponentClick}>
                        <DiodeBridge size={24} color={modules.module1.rectifier.status === ComponentStatus.NORMAL ? '#22c55e' : '#64748b'} />
                    </ComponentBox>

                    {/* DC Bus */}
                    <PowerLine d="M280,112 L370,112" energized={modules.module1.dcBusVoltage > 50} thick />
                    <FlowIndicator d="M280,112 L370,112" energized={modules.module1.rectifier.status === ComponentStatus.NORMAL && modules.module1.inverter.status === ComponentStatus.NORMAL} />
                    <text x="325" y="105" textAnchor="middle" className="fill-yellow-400 text-[12px] font-bold">⚡220VDC</text>
                    <Node x={370} y={112} />

                    {/* Battery branch logic */}
                    {(() => {
                        const isDischarging = (modules.module1.rectifier.status !== ComponentStatus.NORMAL || voltages.utilityInput < 50) && modules.module1.inverter.status === ComponentStatus.NORMAL;
                        const battFlowActive = isDischarging ? true : (modules.module1.dcBusVoltage > 50 && breakers[ParallelBreakerId.QF1_1]);
                        // Fix for terminal inputs: QF1 is at y=155. Top terminal 131, Bottom 179.
                        const busToBreakerPath = isDischarging ? "M370,131 L370,112" : "M370,112 L370,131";
                        // Adjusted for BATT at y=185
                        const breakerToBattPath = isDischarging ? "M370,185 L370,179" : "M370,179 L370,185";

                        return (
                            <>
                                <PowerLine d="M370,112 L370,131" energized={modules.module1.dcBusVoltage > 50} />
                                <FlowIndicator d={busToBreakerPath} energized={battFlowActive} reverse={isDischarging} />
                                
                                <Breaker id={ParallelBreakerId.QF1_1} x={370} y={155} label="QF1-1" vertical isOpen={!breakers[ParallelBreakerId.QF1_1]} isEnergized={modules.module1.dcBusVoltage > 50} onClick={() => onBreakerToggle(ParallelBreakerId.QF1_1)} />
                                <AmpRating x={395} y={160} rating="100A" />

                                <PowerLine d="M370,179 L370,185" energized={modules.module1.dcBusVoltage > 50 || modules.module1.battery.voltage > 10} />
                                <FlowIndicator d={breakerToBattPath} energized={Math.abs(modules.module1.battery.current) > 1} reverse={isDischarging} />
                            </>
                        );
                    })()}
                    <BatteryUnit x={370} y={185} label="BATT 1" data={modules.module1.battery} onClick={() => onComponentClick('module1.battery')} />

                    {/* INVERTER */}
                    <PowerLine d="M370,112 L420,112" energized={modules.module1.dcBusVoltage > 50} />
                    <FlowIndicator d="M370,112 L420,112" energized={modules.module1.inverter.status === ComponentStatus.NORMAL} />
                    <ComponentBox x={420} y={88} w={50} h={48} label="INV" type="module1.inverter" status={modules.module1.inverter.status} timer={modules.module1.inverter.startTimer} onClick={onComponentClick}>
                        <IGBT size={24} color={modules.module1.inverter.status === ComponentStatus.NORMAL ? '#22c55e' : '#64748b'} />
                    </ComponentBox>

                    {/* Load % display */}
                    <g transform="translate(450, 145)">
                        <rect x="-22" y="-10" width="44" height="20" rx="3"
                            fill={modules.module1.inverter.loadPct > 80 ? "#7f1d1d" : "#14532d"}
                            stroke={modules.module1.inverter.loadPct > 80 ? "#ef4444" : "#22c55e"}
                            strokeWidth="1"
                        />
                        <text textAnchor="middle" y="4" className={`text-[13px] font-bold ${modules.module1.inverter.loadPct > 80 ? 'fill-red-400' : 'fill-green-400'}`}>
                            {Math.round(modules.module1.inverter.loadPct)}%
                        </text>
                    </g>

                    {/* INV output to STS */}
                    <PowerLine d="M470,112 L500,112" energized={modules.module1.inverter.status === ComponentStatus.NORMAL} />
                    <FlowIndicator d="M470,112 L500,112" energized={modules.module1.inverter.status === ComponentStatus.NORMAL} />
                    <Node x={500} y={52} />
                    <Node x={500} y={112} />

                    {/* STS */}
                    <ComponentBox x={500} y={55} w={50} h={90} label="STS" type="module1.staticSwitch" status={modules.module1.staticSwitch.isIsolated ? ComponentStatus.ALARM : ComponentStatus.NORMAL} onClick={onComponentClick}>
                        <StaticSwitchInternal 
                            mode={modules.module1.staticSwitch.mode} 
                            // Inverter Flow: Mode is INV AND Inverter is Normal AND NOT Isolated
                            inFlowing={modules.module1.staticSwitch.mode === 'INVERTER' && modules.module1.inverter.status === ComponentStatus.NORMAL && !modules.module1.staticSwitch.isIsolated}
                            // Bypass Flow: Mode is BYP AND Bypass is Energized AND NOT Isolated
                            byFlowing={modules.module1.staticSwitch.mode === 'BYPASS' && voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1] && !modules.module1.staticSwitch.isIsolated}
                            isIsolated={modules.module1.staticSwitch.isIsolated}
                        />
                    </ComponentBox>

                    {/* STS output to Q4 - FIX: Enter at terminal x-24 (576) from y=112 directly match STS output */}
                    <PowerLine d="M550,112 L576,112" energized={modules.module1.staticSwitch.mode === 'INVERTER' ? modules.module1.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1])} thick />
                    <FlowIndicator d="M550,112 L576,112" energized={modules.module1.staticSwitch.mode === 'INVERTER' ? modules.module1.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1])} />

                    <Breaker id={ParallelBreakerId.Q4_1} x={600} y={112} label="Q4-1" isOpen={!breakers[ParallelBreakerId.Q4_1]} isEnergized={modules.module1.staticSwitch.mode === 'INVERTER' ? modules.module1.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_1])} onClick={() => onBreakerToggle(ParallelBreakerId.Q4_1)} />
                    <AmpRating x={600} y={138} rating="300A" />

                    {/* Q4 to bus - FIX: Start at terminal x+24 (624) */}
                    <PowerLine d="M624,112 L660,112" energized={breakers[ParallelBreakerId.Q4_1] && voltages.loadBus > 50} thick />
                    <FlowIndicator d="M624,112 L660,112" energized={breakers[ParallelBreakerId.Q4_1] && voltages.loadBus > 50} />
                    <GroundSymbol x={660} y={118} />

                    {/* MAINTENANCE BYPASS - Separate path from UTILITY-B */}
                    {/* MAINTENANCE BYPASS - Fixed Text Overlap */}
                    <text x="203" y="30" textAnchor="middle" className="fill-orange-400 text-[11px] font-bold">MAINT BYPASS</text>
                    <PowerLine d="M100,52 L100,35 L306,35" energized={voltages.utilityInput > 50} warning />
                    <PowerLine d="M354,35 L660,35 L660,112" energized={breakers[ParallelBreakerId.Q3_1] && voltages.utilityInput > 50} warning />
                    <FlowIndicator d="M100,52 L100,35 L306,35" energized={voltages.utilityInput > 50} />
                    <FlowIndicator d="M354,35 L660,35 L660,112" energized={breakers[ParallelBreakerId.Q3_1] && voltages.utilityInput > 50} />
                    
                    <Node x={100} y={52} />
                    <Breaker id={ParallelBreakerId.Q3_1} x={330} y={35} label="Q3-1" isOpen={!breakers[ParallelBreakerId.Q3_1]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q3_1)} />
                    <AmpRating x={330} y={18} rating="400A" />
                </g>

                {/* Load share bus between modules - MOVED to x=460 to avoid Battery Overlap */}
                <g>
                    <line x1="460" y1="190" x2="460" y2="305" stroke="#22c55e" strokeWidth="2" strokeDasharray="6,4" />
                    <text x="450" y="245" className="fill-green-400 text-[9px] font-bold" transform="rotate(-90, 450, 245)">SYNC</text>
                </g>

                {/* ============ MODULE 2 (BOTTOM) ============ */}
                {/* Moved down by 10px to y=265 to prevent Battery 1 overlap */}
                <g transform="translate(0, 265)">
                    {/* Module label */}
                    <rect x="45" y="15" width="90" height="20" rx="3" fill="#0c4a6e" />
                    <text x="90" y="29" textAnchor="middle" className="fill-cyan-300 text-[14px] font-black">MODULE 2</text>

                    {/* Input source labels */}
                    <rect x="5" y="40" width="75" height="24" rx="2" fill="#78350f" fillOpacity="0.4" stroke="#f59e0b" strokeWidth="1" />
                    <text x="42" y="56" textAnchor="middle" className="fill-amber-300 text-[13px] font-bold">UTILITY-B</text>

                    <rect x="5" y="100" width="75" height="24" rx="2" fill="#164e63" fillOpacity="0.4" stroke="#22d3ee" strokeWidth="1" />
                    <text x="42" y="116" textAnchor="middle" className="fill-cyan-300 text-[13px] font-bold">UTILITY-A</text>

                    {/* BYPASS PATH */}
                    <PowerLine d="M80,52 L196,52" energized={voltages.utilityInput > 50} warning thick />
                    <PowerLine d="M244,52 L500,52" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2]} warning thick />
                    <FlowIndicator d="M80,52 L196,52" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2]} />
                    <FlowIndicator d="M244,52 L500,52" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2]} />

                    <Breaker id={ParallelBreakerId.Q2_2} x={220} y={52} label="Q2-2" isOpen={!breakers[ParallelBreakerId.Q2_2]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q2_2)} />
                    <AmpRating x={220} y={78} rating="250A" />

                    {/* MAIN PATH */}
                    <PowerLine d="M80,112 L116,112" energized={voltages.utilityInput > 50} thick />
                    <PowerLine d="M164,112 L230,112" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q1_2]} thick />
                    <FlowIndicator d="M80,112 L116,112" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q1_2]} />
                    <FlowIndicator d="M164,112 L230,112" energized={voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q1_2]} />

                    <Breaker id={ParallelBreakerId.Q1_2} x={140} y={112} label="Q1-2" isOpen={!breakers[ParallelBreakerId.Q1_2]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q1_2)} />
                    <AmpRating x={140} y={138} rating="250A" />
                    <GroundSymbol x={100} y={118} />

                    {/* RECTIFIER */}
                    <ComponentBox x={230} y={88} w={50} h={48} label="RECT" type="module2.rectifier" status={modules.module2.rectifier.status} timer={modules.module2.rectifier.startTimer} onClick={onComponentClick}>
                        <DiodeBridge size={24} color={modules.module2.rectifier.status === ComponentStatus.NORMAL ? '#22c55e' : '#64748b'} />
                    </ComponentBox>

                    {/* DC Bus */}
                    <PowerLine d="M280,112 L370,112" energized={modules.module2.dcBusVoltage > 50} thick />
                    <FlowIndicator d="M280,112 L370,112" energized={modules.module2.rectifier.status === ComponentStatus.NORMAL && modules.module2.inverter.status === ComponentStatus.NORMAL} />
                    <text x="325" y="105" textAnchor="middle" className="fill-yellow-400 text-[12px] font-bold">⚡220VDC</text>
                    <Node x={370} y={112} />

                    {/* Battery branch logic */}
                    {(() => {
                        const isDischarging = (modules.module2.rectifier.status !== ComponentStatus.NORMAL || voltages.utilityInput < 50) && modules.module2.inverter.status === ComponentStatus.NORMAL;
                        const battFlowActive = isDischarging ? true : (modules.module2.dcBusVoltage > 50 && breakers[ParallelBreakerId.QF1_2]);
                        const busToBreakerPath = isDischarging ? "M370,131 L370,112" : "M370,112 L370,131";
                        // Adjusted for BATT at y=185
                        const breakerToBattPath = isDischarging ? "M370,185 L370,179" : "M370,179 L370,185";

                        return (
                            <>
                                <PowerLine d="M370,112 L370,131" energized={modules.module2.dcBusVoltage > 50} />
                                <FlowIndicator d={busToBreakerPath} energized={battFlowActive} reverse={isDischarging} />
                                
                                <Breaker id={ParallelBreakerId.QF1_2} x={370} y={155} label="QF1-2" vertical isOpen={!breakers[ParallelBreakerId.QF1_2]} isEnergized={modules.module2.dcBusVoltage > 50} onClick={() => onBreakerToggle(ParallelBreakerId.QF1_2)} />
                                <AmpRating x={395} y={160} rating="100A" />

                                <PowerLine d="M370,179 L370,185" energized={modules.module2.dcBusVoltage > 50 || modules.module2.battery.voltage > 10} />
                                <FlowIndicator d={breakerToBattPath} energized={Math.abs(modules.module2.battery.current) > 1} reverse={isDischarging} />
                            </>
                        );
                    })()}
                    <BatteryUnit x={370} y={185} label="BATT 2" data={modules.module2.battery} onClick={() => onComponentClick('module2.battery')} />

                    {/* INVERTER */}
                    <PowerLine d="M370,112 L420,112" energized={modules.module2.dcBusVoltage > 50} />
                    <FlowIndicator d="M370,112 L420,112" energized={modules.module2.inverter.status === ComponentStatus.NORMAL} />
                    <ComponentBox x={420} y={88} w={50} h={48} label="INV" type="module2.inverter" status={modules.module2.inverter.status} timer={modules.module2.inverter.startTimer} onClick={onComponentClick}>
                        <IGBT size={24} color={modules.module2.inverter.status === ComponentStatus.NORMAL ? '#22c55e' : '#64748b'} />
                    </ComponentBox>

                    {/* Load % display */}
                    <g transform="translate(450, 145)">
                        <rect x="-22" y="-10" width="44" height="20" rx="3"
                            fill={modules.module2.inverter.loadPct > 80 ? "#7f1d1d" : "#14532d"}
                            stroke={modules.module2.inverter.loadPct > 80 ? "#ef4444" : "#22c55e"}
                            strokeWidth="1"
                        />
                        <text textAnchor="middle" y="4" className={`text-[13px] font-bold ${modules.module2.inverter.loadPct > 80 ? 'fill-red-400' : 'fill-green-400'}`}>
                            {Math.round(modules.module2.inverter.loadPct)}%
                        </text>
                    </g>

                    {/* INV output to STS */}
                    <PowerLine d="M470,112 L500,112" energized={modules.module2.inverter.status === ComponentStatus.NORMAL} />
                    <FlowIndicator d="M470,112 L500,112" energized={modules.module2.inverter.status === ComponentStatus.NORMAL} />
                    <Node x={500} y={52} />
                    <Node x={500} y={112} />

                    {/* STS */}
                    <ComponentBox x={500} y={55} w={50} h={90} label="STS" type="module2.staticSwitch" status={modules.module2.staticSwitch.isIsolated ? ComponentStatus.ALARM : ComponentStatus.NORMAL} onClick={onComponentClick}>
                        <StaticSwitchInternal 
                             mode={modules.module2.staticSwitch.mode}
                             inFlowing={modules.module2.staticSwitch.mode === 'INVERTER' && modules.module2.inverter.status === ComponentStatus.NORMAL && !modules.module2.staticSwitch.isIsolated}
                             byFlowing={modules.module2.staticSwitch.mode === 'BYPASS' && voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2] && !modules.module2.staticSwitch.isIsolated}
                             isIsolated={modules.module2.staticSwitch.isIsolated}
                        />
                    </ComponentBox>

                    {/* STS output to Q4 - FIXED BREAK */}
                    <PowerLine d="M550,112 L576,112" energized={modules.module2.staticSwitch.mode === 'INVERTER' ? modules.module2.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2])} thick />
                    <FlowIndicator d="M550,112 L576,112" energized={modules.module2.staticSwitch.mode === 'INVERTER' ? modules.module2.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2])} />

                    <Breaker id={ParallelBreakerId.Q4_2} x={600} y={112} label="Q4-2" isOpen={!breakers[ParallelBreakerId.Q4_2]} isEnergized={modules.module2.staticSwitch.mode === 'INVERTER' ? modules.module2.inverter.status === ComponentStatus.NORMAL : (voltages.utilityInput > 50 && breakers[ParallelBreakerId.Q2_2])} onClick={() => onBreakerToggle(ParallelBreakerId.Q4_2)} />
                    <AmpRating x={600} y={138} rating="300A" />

                    {/* Q4 to bus */}
                    <PowerLine d="M624,112 L660,112" energized={breakers[ParallelBreakerId.Q4_2] && voltages.loadBus > 50} thick />
                    <FlowIndicator d="M624,112 L660,112" energized={breakers[ParallelBreakerId.Q4_2] && voltages.loadBus > 50} />
                    <GroundSymbol x={660} y={118} />

                    {/* MAINTENANCE BYPASS - Fixed Text Overlap */}
                    <text x="203" y="30" textAnchor="middle" className="fill-orange-400 text-[11px] font-bold">MAINT BYPASS</text>
                    <PowerLine d="M100,52 L100,35 L306,35" energized={voltages.utilityInput > 50} warning />
                    <PowerLine d="M354,35 L660,35 L660,112" energized={breakers[ParallelBreakerId.Q3_2] && voltages.utilityInput > 50} warning />
                    <FlowIndicator d="M100,52 L100,35 L306,35" energized={voltages.utilityInput > 50} />
                    <FlowIndicator d="M354,35 L660,35 L660,112" energized={breakers[ParallelBreakerId.Q3_2] && voltages.utilityInput > 50} />
                    
                    <Node x={100} y={52} />
                    <Breaker id={ParallelBreakerId.Q3_2} x={330} y={35} label="Q3-2" isOpen={!breakers[ParallelBreakerId.Q3_2]} isEnergized={voltages.utilityInput > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Q3_2)} />
                    <AmpRating x={330} y={18} rating="400A" />
                </g>

                {/* ============ LOAD BUS & DISTRIBUTION ============ */}
                <g transform="translate(660, 0)">
                    {/* Module outputs to bus */}
                    <PowerLine d="M0,132 L40,132 L40,260" energized={voltages.loadBus > 50} thick />
                    {/* Adjusted for Module 2 new Y=265 + 112 = 377 */}
                    <PowerLine d="M0,377 L40,377 L40,260" energized={voltages.loadBus > 50} thick />
                    <FlowIndicator d="M0,132 L40,132 L40,260" energized={voltages.loadBus > 50} />
                    <FlowIndicator d="M0,377 L40,377 L40,260" energized={voltages.loadBus > 50} />
                    <Node x={40} y={260} />

                    {/* Bus bar */}
                    <rect x="36" y="180" width="8" height="160"
                        fill={voltages.loadBus > 50 ? "#ea580c" : "#475569"}
                        rx="2"
                    />
                    <text x="55" y="265" className="fill-orange-400 text-[11px] font-bold">800A BUS</text>

                    {/* Load 1 branch */}
                    <PowerLine d="M40,220 L100,220" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} />
                    <FlowIndicator d="M40,220 L100,220" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} />
                    <Breaker id={ParallelBreakerId.Load1} x={100} y={220} label="CB-L1" isOpen={!breakers[ParallelBreakerId.Load1]} isEnergized={voltages.loadBus > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Load1)} />
                    <AmpRating x={100} y={246} rating="200A" />
                    <PowerLine d="M100,220 L160,220" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} />
                    <FlowIndicator d="M100,220 L160,220" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} />

                    {/* Load 2 branch */}
                    <PowerLine d="M40,300 L100,300" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} />
                    <FlowIndicator d="M40,300 L100,300" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} />
                    <Breaker id={ParallelBreakerId.Load2} x={100} y={300} label="CB-L2" isOpen={!breakers[ParallelBreakerId.Load2]} isEnergized={voltages.loadBus > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Load2)} />
                    <AmpRating x={100} y={326} rating="200A" />
                    <PowerLine d="M100,300 L160,300" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} />
                    <FlowIndicator d="M100,300 L160,300" energized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} />
                </g>

                {/* Load equipment */}
                <LoadSymbol x={840} y={195} label="CRITICAL-A" isEnergized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load1]} loadKW={load1kW} onClick={() => onComponentClick('load1')} />
                <LoadSymbol x={840} y={275} label="CRITICAL-B" isEnergized={voltages.loadBus > 50 && breakers[ParallelBreakerId.Load2]} loadKW={load2kW} onClick={() => onComponentClick('load2')} />

                {/* Legend */}
                <g transform="translate(10, 500)">
                    <text className="fill-slate-400 text-[12px] font-mono">UTILITY: 415VAC 3Ø | DC BUS: 220VDC | OUTPUT: 415VAC 3Ø 50Hz</text>
                </g>

            </svg>
        </div>
    );
};
