
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimulationState, ComponentStatus } from '../types';

/**
 * Quick Reference Card - IEC 62040-3 Compliant Parameters
 * Displays key UPS thresholds and real-time status comparison
 */

interface QuickReferenceCardProps {
    visible: boolean;
    onClose: () => void;
    state: SimulationState;
}

// IEC 62040-3 VFI Classification Thresholds
const IEC_THRESHOLDS = {
    // Input Voltage: 415V ±10% (IEC 62040-3)
    INPUT_VOLTAGE_NOMINAL: 415,
    INPUT_VOLTAGE_MIN: 374,  // -10%
    INPUT_VOLTAGE_MAX: 457,  // +10%

    // Output Voltage: 415V ±1% (IEC 62040-3 VFI)
    OUTPUT_VOLTAGE_NOMINAL: 415,
    OUTPUT_VOLTAGE_MIN: 411,  // -1%
    OUTPUT_VOLTAGE_MAX: 419,  // +1%

    // Frequency: 50Hz ±0.5% (IEC 62040-3 VFI)
    FREQUENCY_NOMINAL: 50.0,
    FREQUENCY_MIN: 49.75,  // -0.5%
    FREQUENCY_MAX: 50.25,  // +0.5%

    // DC Bus (Design Specification - 220V DC System)
    DC_BUS_NOMINAL: 220,
    DC_BUS_MIN_FOR_INVERTER: 155,

    // Battery (IEEE 1188 VRLA Guidelines - 220V System)
    BATTERY_FLOAT_VOLTAGE: 220,      // Float voltage
    BATTERY_CUTOFF_VOLTAGE: 155,     // End of discharge
    BATTERY_LOW_SOC: 20,             // % State of Charge

    // Synchronization (IEC 62040-3)
    MAX_SYNC_ERROR_DEGREES: 5,       // Max phase diff for transfer

    // Thermal (IEC 62040-3)
    COMPONENT_OVERTEMP: 85,          // °C
    BATTERY_OVERTEMP: 45,            // °C
};

// Helper to determine status color
function getStatusColor(value: number, min: number, max: number, nominal: number): string {
    if (value >= min && value <= max) return 'text-green-400';
    const deviation = Math.abs(value - nominal) / nominal;
    if (deviation < 0.15) return 'text-yellow-400';
    return 'text-red-400';
}

function getBatteryColor(soc: number): string {
    if (soc > 50) return 'text-green-400';
    if (soc > 20) return 'text-yellow-400';
    return 'text-red-400';
}

function getSyncColor(error: number): string {
    if (error < IEC_THRESHOLDS.MAX_SYNC_ERROR_DEGREES) return 'text-green-400';
    if (error < 10) return 'text-yellow-400';
    return 'text-red-400';
}

function getTempColor(temp: number, max: number): string {
    if (temp < max * 0.7) return 'text-green-400';
    if (temp < max) return 'text-yellow-400';
    return 'text-red-400';
}

export const QuickReferenceCard: React.FC<QuickReferenceCardProps> = ({ visible, onClose, state }) => {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ x: -320, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -320, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed left-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-md border-r border-cyan-500/30 shadow-2xl z-[300] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                        <div>
                            <h2 className="text-lg font-bold text-white">Quick Reference</h2>
                            <p className="text-[10px] text-cyan-400 font-mono tracking-wider">IEC 62040-3 • IEEE 142</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded bg-slate-700 hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">

                        {/* Input Section */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                AC Input (IEC 62040-3)
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Utility Voltage</span>
                                    <span className={getStatusColor(state.voltages.utilityInput, IEC_THRESHOLDS.INPUT_VOLTAGE_MIN, IEC_THRESHOLDS.INPUT_VOLTAGE_MAX, IEC_THRESHOLDS.INPUT_VOLTAGE_NOMINAL)}>
                                        {state.voltages.utilityInput.toFixed(0)}V
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Nominal</span>
                                    <span>415V ±10% (374-457V)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Frequency</span>
                                    <span className={getStatusColor(state.frequencies.utility, IEC_THRESHOLDS.FREQUENCY_MIN, IEC_THRESHOLDS.FREQUENCY_MAX, IEC_THRESHOLDS.FREQUENCY_NOMINAL)}>
                                        {state.frequencies.utility.toFixed(2)}Hz
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Nominal</span>
                                    <span>50Hz ±0.5%</span>
                                </div>
                            </div>
                        </div>

                        {/* DC Bus Section */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                DC Link
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">DC Bus Voltage</span>
                                    <span className={state.voltages.dcBus >= IEC_THRESHOLDS.DC_BUS_MIN_FOR_INVERTER ? 'text-green-400' : 'text-red-400'}>
                                        {state.voltages.dcBus.toFixed(0)}V
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Nominal / Min</span>
                                    <span>220V / 155V min</span>
                                </div>
                            </div>
                        </div>

                        {/* Output Section */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                AC Output (VFI Class)
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Load Bus Voltage</span>
                                    <span className={getStatusColor(state.voltages.loadBus, IEC_THRESHOLDS.OUTPUT_VOLTAGE_MIN, IEC_THRESHOLDS.OUTPUT_VOLTAGE_MAX, IEC_THRESHOLDS.OUTPUT_VOLTAGE_NOMINAL)}>
                                        {state.voltages.loadBus.toFixed(0)}V
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Tolerance</span>
                                    <span>415V ±1% (411-419V)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Inverter Output</span>
                                    <span className={state.components.inverter.voltageOut > 400 ? 'text-green-400' : 'text-red-400'}>
                                        {state.components.inverter.voltageOut.toFixed(0)}V
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Load Frequency</span>
                                    <span className={getStatusColor(state.frequencies.load, IEC_THRESHOLDS.FREQUENCY_MIN, IEC_THRESHOLDS.FREQUENCY_MAX, IEC_THRESHOLDS.FREQUENCY_NOMINAL)}>
                                        {state.frequencies.load.toFixed(2)}Hz
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Battery Section */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Battery (IEEE 1188)
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">State of Charge</span>
                                    <span className={getBatteryColor(state.battery.chargeLevel)}>
                                        {state.battery.chargeLevel.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Voltage</span>
                                    <span className={state.battery.voltage >= IEC_THRESHOLDS.BATTERY_CUTOFF_VOLTAGE ? 'text-green-400' : 'text-red-400'}>
                                        {state.battery.voltage.toFixed(0)}V
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Float / Cutoff</span>
                                    <span>220V / 155V</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Current</span>
                                    <span className={state.battery.current >= 0 ? 'text-cyan-400' : 'text-orange-400'}>
                                        {state.battery.current >= 0 ? '+' : ''}{state.battery.current.toFixed(1)}A
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Temperature</span>
                                    <span className={getTempColor(state.battery.temp, IEC_THRESHOLDS.BATTERY_OVERTEMP)}>
                                        {state.battery.temp.toFixed(1)}°C
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Max Temp</span>
                                    <span>&lt;45°C</span>
                                </div>
                            </div>
                        </div>

                        {/* Synchronization Section */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Synchronization
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Phase Error</span>
                                    <span className={getSyncColor(state.components.staticSwitch.syncError)}>
                                        {state.components.staticSwitch.syncError.toFixed(1)}°
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Max for Transfer</span>
                                    <span>&lt;5°</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">STS Mode</span>
                                    <span className={state.components.staticSwitch.mode === 'INVERTER' ? 'text-green-400' : 'text-yellow-400'}>
                                        {state.components.staticSwitch.mode}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Thermal Section */}
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Thermal Status
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Rectifier Temp</span>
                                    <span className={getTempColor(state.components.rectifier.temperature, IEC_THRESHOLDS.COMPONENT_OVERTEMP)}>
                                        {state.components.rectifier.temperature.toFixed(1)}°C
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Inverter Temp</span>
                                    <span className={getTempColor(state.components.inverter.temperature, IEC_THRESHOLDS.COMPONENT_OVERTEMP)}>
                                        {state.components.inverter.temperature.toFixed(1)}°C
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Overtemp Alarm</span>
                                    <span>&gt;85°C</span>
                                </div>
                            </div>
                        </div>

                        {/* Alarms Section */}
                        {state.alarms.length > 0 && (
                            <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/50">
                                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                                    Active Alarms ({state.alarms.length})
                                </h3>
                                <div className="space-y-1">
                                    {state.alarms.map((alarm, idx) => (
                                        <div key={idx} className="text-xs text-red-300 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                            {alarm}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-slate-700 bg-slate-800/50">
                        <p className="text-[9px] text-slate-500 text-center">
                            Reference: IEC 62040-3:2021 • IEEE 1188 • IEEE 142
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default QuickReferenceCard;
