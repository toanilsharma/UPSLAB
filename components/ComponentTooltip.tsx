
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipContent {
    title: string;
    description: string;
    currentState?: string;
    theory?: string;
    tips?: string[];
}

interface ComponentTooltipProps {
    content: TooltipContent;
    position: { x: number; y: number };
    visible: boolean;
}

export const ComponentTooltip: React.FC<ComponentTooltipProps> = ({ content, position, visible }) => {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="fixed z-[100] pointer-events-none"
                    style={{
                        left: position.x + 20,
                        top: position.y - 20,
                        maxWidth: '320px'
                    }}
                >
                    <div className="bg-slate-800 border border-cyan-500/30 rounded-lg shadow-2xl p-4 backdrop-blur-md">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
                            <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-wider">
                                {content.title}
                            </h3>
                        </div>

                        {/* Description */}
                        <p className="text-slate-300 text-xs leading-relaxed mb-3">
                            {content.description}
                        </p>

                        {/* Current State */}
                        {content.currentState && (
                            <div className="mb-3 p-2 bg-slate-900/50 rounded border border-slate-700">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                    Current Status
                                </div>
                                <div className="text-cyan-400 font-mono text-xs font-bold">
                                    {content.currentState}
                                </div>
                            </div>
                        )}

                        {/* Theory */}
                        {content.theory && (
                            <div className="mb-3 p-2 bg-blue-950/30 rounded border border-blue-800/30">
                                <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <span>💡</span> Theory
                                </div>
                                <div className="text-slate-300 text-[11px] leading-relaxed">
                                    {content.theory}
                                </div>
                            </div>
                        )}

                        {/* Tips */}
                        {content.tips && content.tips.length > 0 && (
                            <div className="space-y-1">
                                <div className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">
                                    ⚡ Tips
                                </div>
                                {content.tips.map((tip, index) => (
                                    <div key={index} className="flex items-start gap-2 text-[11px] text-slate-400">
                                        <span className="text-amber-400 mt-0.5">•</span>
                                        <span>{tip}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Arrow pointer */}
                    <div
                        className="absolute w-3 h-3 bg-slate-800 border-l border-b border-cyan-500/30 transform rotate-45"
                        style={{ left: '-6px', top: '20px' }}
                    ></div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Tooltip content database for different components
export const TOOLTIP_CONTENT: Record<string, TooltipContent> = {
    rectifier: {
        title: 'Rectifier/Charger Module',
        description: 'Converts AC input to regulated DC voltage for the inverter and charges the battery bank.',
        theory: 'Uses IGBT or SCR-based power electronics with PFC (Power Factor Correction) to achieve >95% efficiency and maintain DC bus at 220V nominal.',
        tips: [
            'Monitor input THD to ensure clean power draw',
            'Walk-in time prevents inrush current damage',
            'Temperature rise indicates loading'
        ]
    },
    inverter: {
        title: 'Inverter Module',
        description: 'Converts DC bus voltage to clean, regulated AC output power for critical loads.',
        theory: 'PWM (Pulse Width Modulation) with IGBT switching at 10-20kHz creates pure sine wave output. Double-conversion provides complete isolation from input anomalies.',
        tips: [
            'Output frequency locked to 50.00Hz ±0.01Hz',
            'Load > 80% reduces efficiency due to heat',
            'Requires >155V DC to maintain regulation'
        ]
    },
    staticSwitch: {
        title: 'Static Transfer Switch',
        description: 'Ultra-fast electronic bypass for seamless transfer between inverter and bypass power.',
        theory: 'SCR-based solid-state switch with <4ms transfer time. Monitors phase sync continuously to enable break-before-make transfers.',
        tips: [
            'Phase error >10° prevents auto-retransfer',
            'Bypass mode bypasses UPS protection',
            'Manual force-bypass overrides sync checks'
        ]
    },
    battery: {
        title: 'Battery Bank',
        description: 'Energy storage system providing backup power during mains failure.',
        theory: 'VRLA or Li-ion cells in series strings. Discharge follows Peukert\'s law - higher current draw reduces effective capacity.',
        tips: [
            'Charge level <20% triggers low battery alarm',
            'Temperature affects capacity significantly',
            'Full recharge takes 6-8 hours at C/10 rate'
        ]
    },
    Q1: {
        title: 'Main Input Breaker (Q1)',
        description: 'Primary AC input isolation and overcurrent protection for the rectifier.',
        theory: 'Molded case circuit breaker with magnetic trip. Must be rated for full rectifier inrush current (typically 150% FLA).',
        tips: [
            'Required to energize rectifier',
            'Creates inrush surge when closed',
            'Part of walk-in startup sequence'
        ]
    },
    Q2: {
        title: 'Bypass Input Breaker (Q2)',
        description: 'Isolates bypass power source for static transfer switch.',
        theory: 'Provides alternate power path. Must be same phase/frequency as main input for sync operation.',
        tips: [
            'Required for bypass mode operation',
            'Should remain closed for auto-transfer capability',
            'Opens during maintenance bypass procedures'
        ]
    },
    Q3: {
        title: 'Maintenance Bypass Breaker (Q3)',
        description: 'Manual bypass path allowing UPS isolation for servicing without load interruption.',
        theory: 'Wrap-around bypass creates parallel path with normal power. Interlocked to prevent backfeed.',
        tips: [
            'ONLY close when STS is in BYPASS mode',
            'Allows safe UPS maintenance',
            'Must open Q4 before opening Q3'
        ]
    },
    Q4: {
        title: 'Output Breaker (Q4)',
        description: 'UPS output isolation and load protection.',
        theory: 'Final isolation point. Interlocked with Q3 to prevent parallel operation with maintenance bypass.',
        tips: [
            'Closes to connect load to UPS',
            'Opens to isolate UPS from load',
            'Check load current before closing'
        ]
    },
    QF1: {
        title: 'Battery Breaker (QF1)',
        description: 'DC battery bank isolation and fault protection.',
        theory: 'DC-rated breaker with arc suppression. Protects against battery short circuits and allows safe disconnection.',
        tips: [
            'Required for battery backup operation',
            'Open before battery maintenance',
            'High DC current when charging'
        ]
    }
};
