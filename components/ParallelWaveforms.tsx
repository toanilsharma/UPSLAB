
import React, { useEffect, useRef } from 'react';
import { ParallelSimulationState, ComponentStatus } from '../parallel_types';

interface WaveformsProps {
    state: ParallelSimulationState;
}

export const ParallelWaveforms: React.FC<WaveformsProps> = ({ state }) => {
    const inputCanvasRef = useRef<HTMLCanvasElement>(null);
    const outputCanvasRef = useRef<HTMLCanvasElement>(null);
    const timeRef = useRef(0);

    useEffect(() => {
        const inputCanvas = inputCanvasRef.current;
        const outputCanvas = outputCanvasRef.current;
        if (!inputCanvas || !outputCanvas) return;

        const inputCtx = inputCanvas.getContext('2d');
        const outputCtx = outputCanvas.getContext('2d');
        if (!inputCtx || !outputCtx) return;

        let animationId: number;

        const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
            ctx.fillStyle = '#020617'; // Darker Slate-950
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            const step = 20;
            for (let x = 0; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
            for (let y = 0; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
            ctx.stroke();
            
             // Center crosshair
            ctx.strokeStyle = '#334155'; 
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
            ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
            ctx.stroke();
            ctx.setLineDash([]);
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
            ctx.lineWidth = 2; 
            ctx.lineJoin = 'round';

            const freq = 0.08; 

            for (let x = 0; x < w; x++) {
                let y = 0;
                if (amplitude > 0) {
                    y = Math.sin((x * freq) + time) * amplitude;
                    if (distorted) {
                        y += Math.sin((x * freq * 3) + time) * (amplitude * 0.15);
                        y += Math.sin((x * freq * 5) + time) * (amplitude * 0.10);
                        y *= (1 + Math.sin(time * 0.1) * 0.05); 
                        y += (Math.random() - 0.5) * 2;
                    } else {
                        y += (Math.random() - 0.5) * 0.5;
                    }
                } else {
                    y = (Math.random() - 0.5) * 0.5;
                }
                ctx.lineTo(x, offsetY + y);
            }

            // Glow 
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.stroke();
            
            // Core
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff'; 
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        };

        const drawMetrics = (ctx: CanvasRenderingContext2D, w: number, h: number, voltage: number, freq: number, thd: number, color: string, label: string) => {
             // HUD Style Overlay
             
             // Top Right: Label
             ctx.fillStyle = color;
             ctx.font = 'bold 12px monospace';
             ctx.textAlign = 'right';
             ctx.fillText(label, w - 8, 14);

             ctx.textAlign = 'right';
             ctx.fillStyle = '#94a3b8';
             ctx.font = '12px monospace';
             
             ctx.fillText(`${voltage.toFixed(0)}V`, w - 8, h - 34);
             ctx.fillText(`${freq.toFixed(1)}Hz`, w - 8, h - 22);
             ctx.fillText(`THD ${thd.toFixed(1)}%`, w - 8, h - 10);
        };

        const draw = () => {
            timeRef.current -= 0.2;

            // INPUT
            const iw = inputCanvas.width = inputCanvas.parentElement?.clientWidth || 200;
            const ih = inputCanvas.height = inputCanvas.parentElement?.clientHeight || 100;
            drawGrid(inputCtx, iw, ih);

            const utilVoltage = state.voltages.utilityInput;
            const utilAmp = utilVoltage > 50 ? (ih / 2) * 0.7 : 0; 
            const inputTHD = utilVoltage > 50 ? calculateTHD([0.15, 0.10]) : 0;
            
            drawDistortedWave(inputCtx, ih / 2, utilAmp, '#f59e0b', timeRef.current, true);
            drawMetrics(inputCtx, iw, ih, utilVoltage, state.frequencies.utility, inputTHD, '#fbbf24', 'INPUT A (UTIL)');

            // OUTPUT
            const ow = outputCanvas.width = outputCanvas.parentElement?.clientWidth || 200;
            const oh = outputCanvas.height = outputCanvas.parentElement?.clientHeight || 100;
            drawGrid(outputCtx, ow, oh);

            // Parallel Logic: Clean if either inverter is active AND not on bypass
            const m1OnBypass = state.modules.module1.staticSwitch.mode === 'BYPASS';
            const m2OnBypass = state.modules.module2.staticSwitch.mode === 'BYPASS';
            const anyOnBypass = m1OnBypass || m2OnBypass; // In parallel, if one is bypass, system is commonly bypass or segmented
            
            const m1Active = state.modules.module1.inverter.status === ComponentStatus.NORMAL;
            const m2Active = state.modules.module2.inverter.status === ComponentStatus.NORMAL;
            const anyInverterActive = m1Active || m2Active;

            const outputIsClean = anyInverterActive && !anyOnBypass;
            
            const loadVoltage = state.voltages.loadBus;
            const loadAmp = loadVoltage > 50 ? (oh / 2) * 0.7 : 0;
            const outputTHD = outputIsClean ? 1.2 : inputTHD;
            const outputColor = outputIsClean ? '#22c55e' : '#f59e0b';

            drawDistortedWave(outputCtx, oh / 2, loadAmp, outputColor, timeRef.current, !outputIsClean);
            drawMetrics(outputCtx, ow, oh, loadVoltage, state.frequencies.load, outputTHD, outputColor, outputIsClean ? 'OUTPUT B (INV)' : 'OUTPUT B (BYP)');

            animationId = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(animationId);
    }, [state]);

   return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-md p-1.5 h-32 flex flex-col shadow-lg"> {/* Compact Height: h-32 (128px) */}
            <div className="flex items-center justify-between px-1 mb-1 flex-none">
                <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_cyan]"></div>
                     <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Dual-Channel Analyzer</span>
                </div>
                <div className="text-[9px] text-slate-600 font-mono">Synced</div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-2 h-full min-h-0">
                {/* Channel 1: Input */}
                <div className="relative rounded overflow-hidden border border-slate-700/50 bg-black shadow-inner group">
                    <canvas ref={inputCanvasRef} className="w-full h-full block" />
                     <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-amber-500/30"></div>
                     <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-amber-500/30"></div>
                </div>

                {/* Channel 2: Output */}
                <div className="relative rounded overflow-hidden border border-slate-700/50 bg-black shadow-inner group">
                    <canvas ref={outputCanvasRef} className="w-full h-full block" />
                     <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500/30"></div>
                     <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500/30"></div>
                </div>
            </div>
        </div>
    );
};
