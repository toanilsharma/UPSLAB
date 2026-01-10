
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BatteryDetail } from '../parallel_types';

interface BatteryUnitProps {
    x: number;
    y: number;
    data: BatteryDetail;
    onClick?: () => void;
    label: string;
}

export const BatteryUnit: React.FC<BatteryUnitProps> = ({ x, y, data, onClick, label }) => {
    const chargeColor = data.chargeLevel > 20 ? '#22c55e' : '#ef4444'; // Green or Red
    const isCharging = false; // Need simulation state for this, but simplistic for now

    return (
        <g transform={`translate(${x},${y})`} onClick={onClick} className="cursor-pointer group">
            {/* Container */}
            <rect x="-30" y="0" width="60" height="40" rx="4" className="fill-slate-900 stroke-slate-600 stroke-2 group-hover:stroke-slate-400 transition-colors" />

            {/* Header */}
            <text x="0" y="-8" textAnchor="middle" className="fill-slate-500 text-[9px] font-bold tracking-wider">{label}</text>

            {/* Cells Grid */}
            <g transform="translate(-22, 8)">
                {[0, 1, 2, 3].map(i => (
                    <motion.rect
                        key={i}
                        x={i * 12}
                        y={0}
                        width="8"
                        height="24"
                        rx="1"
                        initial={{ fillOpacity: 0.2 }}
                        animate={{
                            fill: chargeColor,
                            fillOpacity: data.chargeLevel > (i * 25) ? 1 : 0.2,
                        }}
                        transition={{ duration: 0.5 }}
                    />
                ))}
            </g>

            {/* Level Indicator Line */}
            <g transform="translate(-25, 36)">
                <rect width="50" height="3" className="fill-slate-800" rx="1.5" />
                <motion.rect
                    width="50"
                    height="3"
                    rx="1.5"
                    initial={{ width: 0 }}
                    animate={{
                        width: 50 * (data.chargeLevel / 100),
                        fill: chargeColor
                    }}
                    transition={{ type: 'spring', stiffness: 50 }}
                />
            </g>

            <text x="0" y="25" textAnchor="middle" className="fill-white font-mono text-[10px] font-bold drop-shadow-md">
                {data.chargeLevel.toFixed(0)}%
            </text>
        </g>
    );
};
