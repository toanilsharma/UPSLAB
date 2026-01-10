
import React from 'react';
import { ParallelBreakerId, ComponentStatus, ParallelSimulationState } from '../parallel_types';

interface SLDProps {
    state: ParallelSimulationState;
    onBreakerToggle: (id: string) => void;
    onComponentClick: (component: string) => void;
}

// --- REUSED SYMBOLS ---

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

const PowerLine = ({ d, energized, warning = false, thick = false, currentFlow }: any) => {
    let stroke = 'stroke-slate-600';
    let animationClass = '';
    let opacity = 'opacity-40';
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
                <path d={d} fill="none" strokeWidth={thick ? 3 : 2} className={`${stroke} ${animationClass} opacity-80`} strokeDasharray="12,12" style={{ animationDuration: animSpeed }} />
            )}
        </>
    );
};

const Breaker = ({ id, x, y, isOpen, onClick, label, vertical = false, isEnergized = false }: any) => {
    const bodyColor = isOpen ? '#ef4444' : '#22c55e';
    const glow = isOpen ? '' : (isEnergized ? 'filter drop-shadow(0 0 6px currentColor)' : '');
    return (
        <g transform={`translate(${x}, ${y})`} className="cursor-pointer group" onClick={onClick}>
            <rect x={-25} y={-25} width={50} height={50} fill="transparent" />
            <text x={vertical ? 25 : 0} y={vertical ? 0 : -20} textAnchor="middle" className="fill-slate-300 text-[10px] font-bold">{label}</text>
            <rect x={-8} y={-8} width={16} height={16} rx="2" className="fill-slate-800 stroke-slate-500 stroke-2" />
            {vertical ? (
                isOpen ? <path d="M0,-20 L0,-8 M0,8 L0,20 M-6,-4 L12,10" stroke={bodyColor} strokeWidth="4" /> :
                    <path d="M0,-20 L0,20" stroke={bodyColor} strokeWidth="4" className={glow} />
            ) : (
                isOpen ? <path d="M-20,0 L-8,0 M8,0 L20,0 M-4,6 L10,-12" stroke={bodyColor} strokeWidth="4" /> :
                    <path d="M-20,0 L20,0" stroke={bodyColor} strokeWidth="4" className={glow} />
            )}
        </g>
    );
};

const ComponentBox = ({ x, y, w, h, label, status, onClick, children, type }: any) => {
    let borderColor = 'stroke-cyan-500';
    if (status === ComponentStatus.OFF) borderColor = 'stroke-slate-600';
    if (status === ComponentStatus.FAULT) borderColor = 'stroke-red-500';

    return (
        <g transform={`translate(${x}, ${y})`} onClick={() => onClick(type)} className="cursor-pointer">
            <rect width={w} height={h} rx="4" className={`${borderColor} fill-slate-800/90 stroke-2`} />
            <text x={w / 2} y={-5} textAnchor="middle" className="fill-slate-400 text-[10px] font-bold">{label}</text>
            <g transform={`translate(${w / 2 - 15}, ${h / 2 - 15})`}>{children}</g>
        </g>
    );
};

export const ParallelSLD: React.FC<SLDProps> = ({ state, onBreakerToggle, onComponentClick }) => {
    const { breakers, voltages, modules } = state;

    return (
        <div className="w-full h-full bg-slate-950 border border-slate-700 rounded-lg relative overflow-hidden select-none">
            <svg viewBox="0 0 800 500" className="w-full h-full">
                <defs>
                    <pattern id="pgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.3" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#pgrid)" />

                {/* --- MODULE 1 (TOP) --- */}
                <g transform="translate(0, 0)">
                    <text x="50" y="30" className="fill-cyan-500 text-xs font-bold">MODULE 1</text>

                    {/* M1 Lines */}
                    <PowerLine d="M50,100 L150,100" energized={voltages.utilityInput > 0} />
                    <PowerLine d="M150,100 L250,100" energized={breakers[ParallelBreakerId.Q1_1]} /> {/* Rect In */}
                    <PowerLine d="M310,100 L400,100" energized={modules.module1.dcBusVoltage > 50} thick /> {/* DC Bus */}
                    <PowerLine d="M460,100 L550,100" energized={modules.module1.inverter.status === ComponentStatus.NORMAL} /> {/* Inv Out */}

                    {/* Battery M1 */}
                    <Node x={350} y={100} />
                    <PowerLine d="M350,100 L350,160" energized={modules.module1.dcBusVoltage > 50} />
                    <Breaker id={ParallelBreakerId.QF1_1} x={350} y={180} label="QF1-1" vertical isOpen={!breakers[ParallelBreakerId.QF1_1]} isEnergized={breakers[ParallelBreakerId.QF1_1]} onClick={() => onBreakerToggle(ParallelBreakerId.QF1_1)} />

                    {/* Components M1 */}
                    <ComponentBox x={250} y={70} w={60} h={60} label="RECT 1" type="module1.rectifier" status={modules.module1.rectifier.status} onClick={onComponentClick}>
                        <DiodeBridge size={30} color="#22d3ee" />
                    </ComponentBox>
                    <ComponentBox x={400} y={70} w={60} h={60} label="INV 1" type="module1.inverter" status={modules.module1.inverter.status} onClick={onComponentClick}>
                        <IGBT size={30} color="#22d3ee" />
                    </ComponentBox>

                    {/* STS M1 */}
                    <ComponentBox x={550} y={50} w={50} h={100} label="STS 1" type="module1.staticSwitch" status={ComponentStatus.NORMAL} onClick={onComponentClick}>
                        {/* Simplified STS Visual */}
                        <rect x="10" y="20" width="30" height="60" fill="transparent" stroke="white" />
                    </ComponentBox>

                    <Breaker id={ParallelBreakerId.Q1_1} x={150} y={100} label="Q1-1" isOpen={!breakers[ParallelBreakerId.Q1_1]} isEnergized={voltages.utilityInput > 0} onClick={() => onBreakerToggle(ParallelBreakerId.Q1_1)} />
                    <Breaker id={ParallelBreakerId.Q4_1} x={630} y={100} label="Q4-1" isOpen={!breakers[ParallelBreakerId.Q4_1]} isEnergized={state.modules.module1.inverter.status === ComponentStatus.NORMAL} onClick={() => onBreakerToggle(ParallelBreakerId.Q4_1)} />

                    {/* Maint Bypass 1 */}
                    <PowerLine d="M100,100 L100,40 L680,40 L680,100" energized={breakers[ParallelBreakerId.Q3_1]} warning />
                    <Breaker id={ParallelBreakerId.Q3_1} x={350} y={40} label="Q3-1" isOpen={!breakers[ParallelBreakerId.Q3_1]} isEnergized={breakers[ParallelBreakerId.Q3_1]} onClick={() => onBreakerToggle(ParallelBreakerId.Q3_1)} />
                </g>

                {/* --- MODULE 2 (BOTTOM) --- */}
                <g transform="translate(0, 250)">
                    <text x="50" y="30" className="fill-cyan-500 text-xs font-bold">MODULE 2</text>

                    {/* M2 Lines */}
                    <PowerLine d="M50,100 L150,100" energized={voltages.utilityInput > 0} />
                    <PowerLine d="M150,100 L250,100" energized={breakers[ParallelBreakerId.Q1_2]} />
                    <PowerLine d="M310,100 L400,100" energized={modules.module2.dcBusVoltage > 50} thick />
                    <PowerLine d="M460,100 L550,100" energized={modules.module2.inverter.status === ComponentStatus.NORMAL} />

                    {/* Battery M2 */}
                    <Node x={350} y={100} />
                    <PowerLine d="M350,100 L350,160" energized={modules.module2.dcBusVoltage > 50} />
                    <Breaker id={ParallelBreakerId.QF1_2} x={350} y={180} label="QF1-2" vertical isOpen={!breakers[ParallelBreakerId.QF1_2]} isEnergized={breakers[ParallelBreakerId.QF1_2]} onClick={() => onBreakerToggle(ParallelBreakerId.QF1_2)} />

                    {/* Components M2 */}
                    <ComponentBox x={250} y={70} w={60} h={60} label="RECT 2" type="module2.rectifier" status={modules.module2.rectifier.status} onClick={onComponentClick}>
                        <DiodeBridge size={30} color="#22d3ee" />
                    </ComponentBox>
                    <ComponentBox x={400} y={70} w={60} h={60} label="INV 2" type="module2.inverter" status={modules.module2.inverter.status} onClick={onComponentClick}>
                        <IGBT size={30} color="#22d3ee" />
                    </ComponentBox>

                    <ComponentBox x={550} y={50} w={50} h={100} label="STS 2" type="module2.staticSwitch" status={ComponentStatus.NORMAL} onClick={onComponentClick}>
                        <rect x="10" y="20" width="30" height="60" fill="transparent" stroke="white" />
                    </ComponentBox>

                    <Breaker id={ParallelBreakerId.Q1_2} x={150} y={100} label="Q1-2" isOpen={!breakers[ParallelBreakerId.Q1_2]} isEnergized={voltages.utilityInput > 0} onClick={() => onBreakerToggle(ParallelBreakerId.Q1_2)} />
                    <Breaker id={ParallelBreakerId.Q4_2} x={630} y={100} label="Q4-2" isOpen={!breakers[ParallelBreakerId.Q4_2]} isEnergized={state.modules.module2.inverter.status === ComponentStatus.NORMAL} onClick={() => onBreakerToggle(ParallelBreakerId.Q4_2)} />

                    {/* Maint Bypass 2 */}
                    <PowerLine d="M100,100 L100,40 L680,40 L680,100" energized={breakers[ParallelBreakerId.Q3_2]} warning />
                    <Breaker id={ParallelBreakerId.Q3_2} x={350} y={40} label="Q3-2" isOpen={!breakers[ParallelBreakerId.Q3_2]} isEnergized={breakers[ParallelBreakerId.Q3_2]} onClick={() => onBreakerToggle(ParallelBreakerId.Q3_2)} />
                </g>

                {/* --- COMMON LOAD BUS --- */}
                <g transform="translate(680, 0)">
                    {/* Joins M1 and M2 outputs */}
                    <PowerLine d="M0,100 L50,100 L50,225" energized={voltages.loadBus > 50} thick />
                    <PowerLine d="M0,350 L50,350 L50,225" energized={voltages.loadBus > 50} thick />

                    {/* To Loads */}
                    <Node x={50} y={225} />
                    <PowerLine d="M50,225 L100,225" energized={voltages.loadBus > 50} thick />
                </g>

                <Breaker id={ParallelBreakerId.Load1} x={780} y={200} label="L1" vertical isOpen={!breakers[ParallelBreakerId.Load1]} isEnergized={voltages.loadBus > 50} onClick={() => onBreakerToggle(ParallelBreakerId.Load1)} />
            </svg>
        </div>
    );
};
