
import React, { useEffect, useRef } from 'react';
import { ParallelSimulationState, ComponentStatus } from '../parallel_types';

interface WaveformsProps {
    state: ParallelSimulationState;
}

export const ParallelWaveforms: React.FC<WaveformsProps> = ({ state }) => {
    const inputCanvasRef = useRef<HTMLCanvasElement>(null);
    const outputCanvasRef = useRef<HTMLCanvasElement>(null);
    const timeRef = useRef(0);
    const transientTimeRef = useRef(0);
    const sagTimeRef = useRef(0);

    useEffect(() => {
        const inputCanvas = inputCanvasRef.current;
        const outputCanvas = outputCanvasRef.current;
        if (!inputCanvas || !outputCanvas) return;

        const inputCtx = inputCanvas.getContext('2d');
        const outputCtx = outputCanvas.getContext('2d');
        if (!inputCtx || !outputCtx) return;

        let animationId: number;

        const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x < w; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
            for (let y = 0; y < h; y += 40) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
            ctx.stroke();

            // Center line
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
        };

        const calculateTHD = (harmonics: number[]) => {
            const fundamental = 1.0;
            const sumSquares = harmonics.reduce((sum, h) => sum + h * h, 0);
            return Math.sqrt(sumSquares) / fundamental * 100;
        };

        const drawDistortedWave = (ctx: CanvasRenderingContext2D, offsetY: number, amplitude: number, color: string, time: number, distorted: boolean) => {
            const w = ctx.canvas.width;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';

            const freq = 0.06; // 50Hz equivalent

            for (let x = 0; x < w; x++) {
                let y = 0;

                if (amplitude > 0) {
                    // Fundamental (50Hz)
                    y = Math.sin((x * freq) + time) * amplitude;

                    if (distorted) {
                        // Add harmonics (3rd, 5th, 7th order)
                        y += Math.sin((x * freq * 3) + time) * (amplitude * 0.18); // 18% 3rd harmonic
                        y += Math.sin((x * freq * 5) + time) * (amplitude * 0.12); // 12% 5th harmonic
                        y += Math.sin((x * freq * 7) + time) * (amplitude * 0.08); // 8% 7th harmonic

                        // Voltage sag (periodic)
                        const sagCycle = Math.sin(time * 0.05) * 0.15;
                        y *= (1 + sagCycle);

                        // Random noise
                        y += (Math.random() - 0.5) * 2.5;

                        // Transients (spikes every few seconds)
                        if (Math.sin(time * 0.08) > 0.98) {
                            y += (Math.random() - 0.5) * 15;
                        }
                    } else {
                        // Clean inverter output - pure sine wave
                        // Minimal noise only
                        y += (Math.random() - 0.5) * 0.3;
                    }
                } else {
                    // Offline - just noise
                    y = (Math.random() - 0.5) * 1;
                }

                ctx.lineTo(x, offsetY + y);
            }

            ctx.shadowBlur = 6;
            ctx.shadowColor = color;
            ctx.stroke();
            ctx.shadowBlur = 0;
        };

        const drawMetrics = (ctx: CanvasRenderingContext2D, x: number, y: number, label: string, voltage: number, freq: number, thd: number, color: string) => {
            ctx.fillStyle = color;
            ctx.font = 'bold 11px monospace';
            ctx.fillText(label, x, y);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px monospace';
            ctx.fillText(`${voltage.toFixed(0)}V`, x, y + 14);
            ctx.fillText(`${freq.toFixed(1)}Hz`, x, y + 26);
            ctx.fillText(`THD ${thd.toFixed(1)}%`, x, y + 38);
        };

        const draw = () => {
            timeRef.current += 0.18;

            // INPUT CANVAS (LEFT) - Distorted utility power
            const iw = inputCanvas.width = inputCanvas.parentElement?.clientWidth || 300;
            const ih = inputCanvas.height = inputCanvas.parentElement?.clientHeight || 200;

            inputCtx.fillStyle = '#020617';
            inputCtx.fillRect(0, 0, iw, ih);
            drawGrid(inputCtx, iw, ih);

            // INPUT WAVEFORM - Always has harmonics and distortion
            const utilVoltage = state.voltages.utilityInput;
            const utilAmp = utilVoltage > 50 ? 35 : 0;
            const inputTHD = utilVoltage > 50 ? calculateTHD([0.18, 0.12, 0.08]) : 0;

            drawDistortedWave(inputCtx, ih / 2, utilAmp, '#f59e0b', timeRef.current, true);
            drawMetrics(inputCtx, 10, 20, 'INPUT', utilVoltage, state.frequencies.utility, inputTHD, '#f59e0b');

            // OUTPUT CANVAS (RIGHT) - Clean or distorted based on mode
            const ow = outputCanvas.width = outputCanvas.parentElement?.clientWidth || 300;
            const oh = outputCanvas.height = outputCanvas.parentElement?.clientHeight || 200;

            outputCtx.fillStyle = '#020617';
            outputCtx.fillRect(0, 0, ow, oh);
            drawGrid(outputCtx, ow, oh);

            // Determine if output is clean (on inverter) or distorted (on bypass)
            const m1OnBypass = state.modules.module1.staticSwitch.mode === 'BYPASS';
            const m2OnBypass = state.modules.module2.staticSwitch.mode === 'BYPASS';
            const anyOnBypass = m1OnBypass || m2OnBypass;

            const m1Active = state.modules.module1.inverter.status === ComponentStatus.NORMAL;
            const m2Active = state.modules.module2.inverter.status === ComponentStatus.NORMAL;
            const anyInverterActive = m1Active || m2Active;

            // Output is clean ONLY if at least one module is on inverter mode
            const outputIsClean = anyInverterActive && !anyOnBypass;

            const loadVoltage = state.voltages.loadBus;
            const loadAmp = loadVoltage > 50 ? 35 : 0;
            const outputTHD = outputIsClean ? 1.2 : inputTHD; // <2% on inverter, matches input on bypass

            const outputColor = outputIsClean ? '#22c55e' : '#f59e0b';
            drawDistortedWave(outputCtx, oh / 2, loadAmp, outputColor, timeRef.current, !outputIsClean);

            const modeLabel = outputIsClean ? 'OUTPUT (INV)' : 'OUTPUT (BYP)';
            drawMetrics(outputCtx, 10, 20, modeLabel, loadVoltage, state.frequencies.load, outputTHD, outputColor);

            animationId = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(animationId);
    }, [state]);

    return (
        <div className="bg-slate-900 border-2 border-slate-700 rounded-lg p-3 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 flex-none">
                <div className="text-sm text-slate-300 font-bold tracking-wide">⚡ POWER QUALITY ANALYZER</div>
                <div className="text-xs text-slate-500 font-mono">Real-time Waveform Analysis</div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-3">
                {/* INPUT CHANNEL (LEFT) */}
                <div className="flex flex-col bg-slate-950 rounded-lg border-2 border-amber-900/30 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 px-3 py-1.5 border-b-2 border-amber-900/50">
                        <div className="text-xs font-bold text-amber-400 tracking-widest">INPUT (UTILITY)</div>
                        <div className="text-[10px] text-amber-600">Raw Power with Harmonics</div>
                    </div>
                    <div className="flex-1 relative">
                        <canvas ref={inputCanvasRef} className="w-full h-full block" />
                    </div>
                </div>

                {/* OUTPUT CHANNEL (RIGHT) */}
                <div className="flex flex-col bg-slate-950 rounded-lg border-2 border-green-900/30 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 px-3 py-1.5 border-b-2 border-green-900/50">
                        <div className="text-xs font-bold text-green-400 tracking-widest">OUTPUT (LOAD)</div>
                        <div className="text-[10px] text-green-600">Conditioned Power</div>
                    </div>
                    <div className="flex-1 relative">
                        <canvas ref={outputCanvasRef} className="w-full h-full block" />
                    </div>
                </div>
            </div>

            {/* Info Footer */}
            <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-500 flex justify-between flex-none">
                <span>📊 THD: Total Harmonic Distortion</span>
                <span>🎯 Target: {'<2%'} on Inverter Mode</span>
            </div>
        </div>
    );
};
