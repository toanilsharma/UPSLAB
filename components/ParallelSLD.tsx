
import React from 'react';
import { motion } from 'framer-motion';
import { ParallelBreakerId, ComponentStatus, ParallelSimulationState } from '../parallel_types';
import { BatteryUnit } from './BatteryUnit';

interface SLDProps {
    state: ParallelSimulationState;
    onBreakerToggle: (id: string) => void;
    onComponentClick: (component: string) => void;
}

// --- ANIMATED SYMBOLS ---

const Node = ({ x, y }: { x: number, y: number }) => (
    <circle cx={x} cy={y} r={3} className="fill-slate-200" />
);

const AnimatedPowerLine = ({ d, energized, warning = false, thick = false, currentFlow }: any) => {
    const color = warning ? '#f59e0b' : '#22d3ee'; // Amber or Cyan
    const strokeWidth = thick ? 4 : 2;
    const opacity = energized ? 1 : 0.2;

    // Animation speed based on current
    const duration = currentFlow && currentFlow > 100 ? 0.5 : 1.5;

    return (
        <g>
            {/* Base Line */}
            <path d={d} fill="none" stroke={energized ? color : '#475569'} strokeWidth={strokeWidth} style={{ opacity: 0.3 }} />

            {/* Active Flow */}
            {energized && (
                <>
                    <motion.path
                        d={d}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                    {/* Flowing Dash */}
                    <motion.path
                        d={d}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray="10, 10"
                        animate={{ strokeDashoffset: -20 }}
                        transition={{ duration: duration, repeat: Infinity, ease: "linear" }}
                        style={{ opacity: 0.8 }}
                    />
                </>
            )}
        </g>
    );
};

const Breaker = ({ id, x, y, isOpen, onClick, label, vertical = false, isEnergized = false }: any) => {
    const bodyColor = isOpen ? '#ef4444' : '#22c55e';

    return (
        <motion.g
            transform={`translate(${x}, ${y})`}
            className="cursor-pointer group"
            onClick={onClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
        >
            {/* Hitbox */}
            <rect x={-25} y={-25} width={50} height={50} fill="transparent" />

            <text x={vertical ? 25 : 0} y={vertical ? 0 : -20} textAnchor="middle" className="fill-slate-400 text-[10px] font-bold tracking-wider group-hover:fill-white transition-colors">{label}</text>

            {/* Box */}
            <rect x={-8} y={-8} width={16} height={16} rx="2" className="fill-slate-900 stroke-slate-500 stroke-2" />

            {/* Switch Arm */}
            <motion.path
                d={vertical ? (isOpen ? "M0,-20 L0,-8 M0,8 L0,20 M-8,-4 L12,12" : "M0,-20 L0,20") : (isOpen ? "M-20,0 L-8,0 M8,0 L20,0 M-4,8 L12,-12" : "M-20,0 L20,0")}
                stroke={bodyColor}
                strokeWidth="4"
                strokeLinecap="round"
                initial={false}
                animate={{ d: vertical ? (isOpen ? "M0,-20 L0,-8 M0,8 L0,20 M-8,-4 L12,12" : "M0,-20 L0,20") : (isOpen ? "M-20,0 L-8,0 M8,0 L20,0 M-4,8 L12,-12" : "M-20,0 L20,0") }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />

            {/* Glow */}
            {!isOpen && isEnergized && (
                <circle cx={0} cy={0} r={6} fill={bodyColor} className="blur-md opacity-50" />
            )}
        </motion.g>
    );
};

const ComponentBox = ({ x, y, w, h, label, status, onClick, children, type }: any) => {
    let borderColor = '#0ea5e9'; // sky-500
    let shadowColor = 'rgba(14, 165, 233, 0.2)';

    if (status === ComponentStatus.OFF) { borderColor = '#475569'; shadowColor = 'transparent'; }
    if (status === ComponentStatus.FAULT) { borderColor = '#ef4444'; shadowColor = 'rgba(239, 68, 68, 0.3)'; }
    if (status === ComponentStatus.STARTING) { borderColor = '#3b82f6'; }

    return (
        <motion.g
            transform={`translate(${x}, ${y})`}
            onClick={() => onClick(type)}
            className="cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
        >
            <motion.rect
                width={w} height={h} rx="6"
                fill="rgba(15, 23, 42, 0.9)"
                stroke={borderColor} strokeWidth="2"
                initial={false}
                animate={{ stroke: borderColor, filter: `drop-shadow(0 0 10px ${shadowColor})` }}
                transition={{ duration: 0.3 }}
            />

            {/* Inner Content */}
            <g transform={`translate(${w / 2}, ${h / 2})`}>
                {children}
            </g>

            <text x={w / 2} y={-8} textAnchor="middle" className="fill-slate-400 text-[10px] font-bold tracking-widest">{label}</text>

            {status !== ComponentStatus.OFF && (
                <circle cx={w - 8} cy={8} r={3} fill={status === ComponentStatus.FAULT ? '#ef4444' : '#22c55e'} />
            )}
        </motion.g>
    );
};

export const ParallelSLD: React.FC<SLDProps> = ({ state, onBreakerToggle, onComponentClick }) => {
    const { breakers, voltages, modules } = state;
    const loadAmps = state.currents.totalOutput;

    return (
        <div className="w-full h-full bg-slate-950 border border-slate-800 rounded-lg relative overflow-hidden select-none shadow-2xl">
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.3 }}></div>

            <svg viewBox="0 0 800 500" className="w-full h-full">

                {/* --- MODULE 1 (TOP) --- */}
                <g transform="translate(0, 0)">
                    <text x="50" y="30" className="fill-cyan-500 text-xs font-black tracking-widest opacity-50">MODULE 1</text>

                    {/* Lines */}
                    <AnimatedPowerLine d="M50,100 L150,100" energized={voltages.utilityInput > 50} />
                    <AnimatedPowerLine d="M150,100 L250,100" energized={breakers[ParallelBreakerId.Q1_1]} />
                    <AnimatedPowerLine d="M310,100 L400,100" energized={modules.module1.dcBusVoltage > 50} thick />
                    <AnimatedPowerLine d="M460,100 L550,100" energized={modules.module1.inverter.status === ComponentStatus.NORMAL} />

                    {/* Battery Path M1 */}
                    <AnimatedPowerLine d="M350,100 L350,160" energized={modules.module1.dcBusVoltage > 50} />
                    <Node x={350} y={100} />

                    {/* Battery Unit M1 (Newly Added) */}
                    <BatteryUnit
                        x={350} y={200} label="BATT 1"
                        data={modules.module1.battery}
                        onClick={() => onComponentClick('module1.battery')}
                    />
                    <Breaker id={ParallelBreakerId.QF1_1} x={350} y={160} label="QF1-1" vertical isOpen={!breakers[ParallelBreakerId.QF1_1]} isEnergized={breakers[ParallelBreakerId.QF1_1]} onClick={() => onBreakerToggle(ParallelBreakerId.QF1_1)} />

                    {/* Rectifier M1 */}
                    <ComponentBox x={250} y={70} w={60} h={60} label="RECT" type="module1.rectifier" status={modules.module1.rectifier.status} onClick={onComponentClick}>
                        <path d="M-10,10 L-10,-10 L10,-10 L-10,10 Z" fill="none" stroke="currentColor" className="text-slate-400" strokeWidth="2" />
                        <path d="M-5,5 L5,5" stroke="currentColor" className="text-slate-400" />
                    </ComponentBox>

                    {/* Inverter M1 */}
                    <ComponentBox x={400} y={70} w={60} h={60} label="INV" type="module1.inverter" status={modules.module1.inverter.status} onClick={onComponentClick}>
                        <path d="M-10,10 L10,10 L10,-10 L-10,10 Z" fill="none" stroke="currentColor" className="text-slate-400" strokeWidth="2" />
                        <path d="M-8,-4 Q0,6 8,-4" fill="none" stroke="currentColor" className="text-slate-400" />
                    </ComponentBox>

                    {/* STS M1 */}
                    <ComponentBox x={550} y={50} w={50} h={100} label="STS" type="module1.staticSwitch" status={ComponentStatus.NORMAL} onClick={onComponentClick}>
                        <path d="M-10,-20 L10,0 L-10,20" fill="none" stroke="currentColor" className={modules.module1.staticSwitch.mode === 'BYPASS' ? 'text-amber-500' : 'text-slate-600'} strokeWidth="2" />
                        <path d="M-10,20 L10,0 L-10,-20" fill="none" stroke="currentColor" className={modules.module1.staticSwitch.mode === 'INVERTER' ? 'text-cyan-500' : 'text-slate-600'} strokeWidth="2" />
                    </ComponentBox>

                    <Breaker id={ParallelBreakerId.Q1_1} x={150} y={100} label="Q1-1" isOpen={!breakers[ParallelBreakerId.Q1_1]} isEnergized={voltages.utilityInput > 0} onClick={() => onBreakerToggle(ParallelBreakerId.Q1_1)} />
                    <Breaker id={ParallelBreakerId.Q4_1} x={630} y={100} label="Q4-1" isOpen={!breakers[ParallelBreakerId.Q4_1]} isEnergized={state.modules.module1.inverter.status === ComponentStatus.NORMAL} onClick={() => onBreakerToggle(ParallelBreakerId.Q4_1)} />

                    {/* Maint Bypass 1 */}
                    <AnimatedPowerLine d="M100,100 L100,40 L680,40 L680,100" energized={breakers[ParallelBreakerId.Q3_1]} warning />
                    <Breaker id={ParallelBreakerId.Q3_1} x={350} y={40} label="Q3-1" isOpen={!breakers[ParallelBreakerId.Q3_1]} isEnergized={breakers[ParallelBreakerId.Q3_1]} onClick={() => onBreakerToggle(ParallelBreakerId.Q3_1)} />
                </g>


                {/* --- MODULE 2 (BOTTOM) --- */}
                <g transform="translate(0, 250)">
                    <text x="50" y="30" className="fill-cyan-500 text-xs font-black tracking-widest opacity-50">MODULE 2</text>

                    <AnimatedPowerLine d="M50,100 L150,100" energized={voltages.utilityInput > 50} />
                    <AnimatedPowerLine d="M150,100 L250,100" energized={breakers[ParallelBreakerId.Q1_2]} />
                    <AnimatedPowerLine d="M310,100 L400,100" energized={modules.module2.dcBusVoltage > 50} thick />
                    <AnimatedPowerLine d="M460,100 L550,100" energized={modules.module2.inverter.status === ComponentStatus.NORMAL} />

                    {/* Battery Path M2 */}
                    <AnimatedPowerLine d="M350,100 L350,160" energized={modules.module2.dcBusVoltage > 50} />
                    <Node x={350} y={100} />

                    {/* Battery Unit M2 (Newly Added) */}
                    <BatteryUnit
                        x={350} y={200} label="BATT 2"
                        data={modules.module2.battery}
                        onClick={() => onComponentClick('module2.battery')}
                    />
                    <Breaker id={ParallelBreakerId.QF1_2} x={350} y={160} label="QF1-2" vertical isOpen={!breakers[ParallelBreakerId.QF1_2]} isEnergized={breakers[ParallelBreakerId.QF1_2]} onClick={() => onBreakerToggle(ParallelBreakerId.QF1_2)} />

                    <ComponentBox x={250} y={70} w={60} h={60} label="RECT" type="module2.rectifier" status={modules.module2.rectifier.status} onClick={onComponentClick}>
                        <path d="M-10,10 L-10,-10 L10,-10 L-10,10 Z" fill="none" stroke="currentColor" className="text-slate-400" strokeWidth="2" />
                        <path d="M-5,5 L5,5" stroke="currentColor" className="text-slate-400" />
                    </ComponentBox>
                    <ComponentBox x={400} y={70} w={60} h={60} label="INV" type="module2.inverter" status={modules.module2.inverter.status} onClick={onComponentClick}>
                        <path d="M-10,10 L10,10 L10,-10 L-10,10 Z" fill="none" stroke="currentColor" className="text-slate-400" strokeWidth="2" />
                        <path d="M-8,-4 Q0,6 8,-4" fill="none" stroke="currentColor" className="text-slate-400" />
                    </ComponentBox>

                    <ComponentBox x={550} y={50} w={50} h={100} label="STS" type="module2.staticSwitch" status={ComponentStatus.NORMAL} onClick={onComponentClick}>
                        <path d="M-10,-20 L10,0 L-10,20" fill="none" stroke="currentColor" className={modules.module2.staticSwitch.mode === 'BYPASS' ? 'text-amber-500' : 'text-slate-600'} strokeWidth="2" />
                        <path d="M-10,20 L10,0 L-10,-20" fill="none" stroke="currentColor" className={modules.module2.staticSwitch.mode === 'INVERTER' ? 'text-cyan-500' : 'text-slate-600'} strokeWidth="2" />
                    </ComponentBox>

                    <Breaker id={ParallelBreakerId.Q1_2} x={150} y={100} label="Q1-2" isOpen={!breakers[ParallelBreakerId.Q1_2]} isEnergized={voltages.utilityInput > 0} onClick={() => onBreakerToggle(ParallelBreakerId.Q1_2)} />
                    <Breaker id={ParallelBreakerId.Q4_2} x={630} y={100} label="Q4-2" isOpen={!breakers[ParallelBreakerId.Q4_2]} isEnergized={state.modules.module2.inverter.status === ComponentStatus.NORMAL} onClick={() => onBreakerToggle(ParallelBreakerId.Q4_2)} />

                    {/* Maint Bypass 2 */}
                    <AnimatedPowerLine d="M100,100 L100,40 L680,40 L680,100" energized={breakers[ParallelBreakerId.Q3_2]} warning />
                    <Breaker id={ParallelBreakerId.Q3_2} x={350} y={40} label="Q3-2" isOpen={!breakers[ParallelBreakerId.Q3_2]} isEnergized={breakers[ParallelBreakerId.Q3_2]} onClick={() => onBreakerToggle(ParallelBreakerId.Q3_2)} />
                </g>

                {/* --- COMMON LOAD BUS --- */}
                <g transform="translate(680, 0)">
                    {/* Joins M1 and M2 outputs */}
                    <AnimatedPowerLine d="M0,100 L50,100 L50,225" energized={voltages.loadBus > 50} thick currentFlow={loadAmps} />
                    <AnimatedPowerLine d="M0,350 L50,350 L50,225" energized={voltages.loadBus > 50} thick currentFlow={loadAmps} />

                    {/* To Loads */}
                    <Node x={50} y={225} />
                    <AnimatedPowerLine d="M50,225 L100,225" energized={voltages.loadBus > 50} thick currentFlow={loadAmps} />
                </g>

                <Breaker id={ParallelBreakerId.Load1} x={780} y={200} label="LOAD" vertical isOpen={!breakers[ParallelBreakerId.Load1]} isEnergized={voltages.loadBus > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Load1)} />

            </svg>
        </div>
    );
};
