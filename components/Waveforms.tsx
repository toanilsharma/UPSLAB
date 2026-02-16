
import React, { useEffect, useRef } from 'react';
import { SimulationState, ComponentStatus } from '../types';

interface WaveformsProps {
    state: SimulationState;
}

export const Waveforms: React.FC<WaveformsProps> = ({ state }) => {
    const inputCanvasRef = useRef<HTMLCanvasElement>(null);
    const outputCanvasRef = useRef<HTMLCanvasElement>(null);
    const timeRef = useRef(0);
    const transientRef = useRef(0);

    const prevLoadVoltage = useRef(state.voltages.loadBus);
    const prevSource = useRef(state.components.staticSwitch.mode);

    useEffect(() => {
        // Trigger transient on significant voltage change OR source transfer
        const voltChange = Math.abs(state.voltages.loadBus - prevLoadVoltage.current) > 20;
        const sourceChange = state.components.staticSwitch.mode !== prevSource.current;

        if (voltChange || sourceChange) {
            transientRef.current = 30; // Inject transient spike
        }
        prevLoadVoltage.current = state.voltages.loadBus;
        prevSource.current = state.components.staticSwitch.mode;
    }, [state.voltages.loadBus, state.components.staticSwitch.mode]);

    useEffect(() => {
        const inputCanvas = inputCanvasRef.current;
        const outputCanvas = outputCanvasRef.current;
        if (!inputCanvas || !outputCanvas) return;

        const inputCtx = inputCanvas.getContext('2d');
        const outputCtx = outputCanvas.getContext('2d');
        if (!inputCtx || !outputCtx) return;

        let animationId: number;

        const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
            // Dark grid background
            ctx.fillStyle = '#0f172a'; // Slate-900 background
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = '#1e293b'; // Slate-800 grid lines
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Draw grid
            const step = 20;
            for (let x = 0; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
            for (let y = 0; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
            ctx.stroke();

            // Center crosshair
            ctx.strokeStyle = '#334155'; // Slate-700
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); // Horizontal axis
            ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); // Vertical axis
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
            ctx.lineWidth = 2; // Thinner, sharper line
            ctx.lineJoin = 'round';

            const freq = 0.08; // Slightly faster for visual appeal

            for (let x = 0; x < w; x++) {
                let y = 0;

                if (amplitude > 0) {
                    // Fundamental
                    y = Math.sin((x * freq) + time) * amplitude;

                    if (distorted) {
                        // Harmonics for visual noise
                        y += Math.sin((x * freq * 3) + time) * (amplitude * 0.15);
                        y += Math.sin((x * freq * 5) + time) * (amplitude * 0.10);
                        
                        // Sag / Distortion
                        y *= (1 + Math.sin(time * 0.1) * 0.05); 
                        
                        // Noise
                        y += (Math.random() - 0.5) * 2;
                    } else {
                        // Clean Sine
                        y += (Math.random() - 0.5) * 0.5;
                    }
                    
                    // Apply transient if needed
                    if (transientRef.current > 0) {
                         y += (Math.random() - 0.5) * transientRef.current;
                    }

                } else {
                    y = (Math.random() - 0.5) * 0.5;
                }
                ctx.lineTo(x, offsetY + y);
            }

            // Glow Effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.stroke();
            
            // Second pass for intense core center (simulating phosphor beam)
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff'; // White hot center
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

             // Bottom Right: Live Values
             ctx.textAlign = 'right';
             ctx.fillStyle = '#94a3b8'; // Slate-400
             ctx.font = '12px monospace';
             
             const vText = `${voltage.toFixed(0)}V`;
             const fText = `${freq.toFixed(1)}Hz`;
             const thdText = `THD ${thd.toFixed(1)}%`;
             
             ctx.fillText(vText, w - 8, h - 34);
             ctx.fillText(fText, w - 8, h - 22);
             ctx.fillText(thdText, w - 8, h - 10);
        };

        const draw = () => {
            // Decay transient
            if (transientRef.current > 0.5) {
                transientRef.current *= 0.90;
            } else {
                transientRef.current = 0;
            }

            timeRef.current -= 0.2; // Move left to right (negative for standard scope feel)

            // INPUT CANVAS
            const iw = inputCanvas.width = inputCanvas.parentElement?.clientWidth || 200;
            const ih = inputCanvas.height = inputCanvas.parentElement?.clientHeight || 100;
            drawGrid(inputCtx, iw, ih);

            const utilVoltage = state.voltages.utilityInput;
            // Scale amplitude to fit canvas height (approx 80% of half-height)
            const utilAmp = utilVoltage > 50 ? (ih / 2) * 0.7 : 0; 
            const inputTHD = utilVoltage > 50 ? calculateTHD([0.15, 0.10]) : 0;
            
            drawDistortedWave(inputCtx, ih / 2, utilAmp, '#f59e0b', timeRef.current, true);
            drawMetrics(inputCtx, iw, ih, utilVoltage, state.frequencies.utility, inputTHD, '#fbbf24', 'INPUT A (UTIL)');

            // OUTPUT CANVAS
            const ow = outputCanvas.width = outputCanvas.parentElement?.clientWidth || 200;
            const oh = outputCanvas.height = outputCanvas.parentElement?.clientHeight || 100;
            drawGrid(outputCtx, ow, oh);

            const outputIsClean = (state.components.staticSwitch.mode !== 'BYPASS') && (state.components.inverter.status === ComponentStatus.NORMAL);
            const loadVoltage = state.voltages.loadBus;
            const loadAmp = loadVoltage > 50 ? (oh / 2) * 0.7 : 0;
            const outputTHD = outputIsClean ? 1.2 : inputTHD;
            const outputColor = outputIsClean ? '#22c55e' : '#f59e0b'; // Green or Amber

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
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_lime]"></div>
                     <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Power Analyzer</span>
                </div>
                <div className="text-[9px] text-slate-600 font-mono">500ms/div</div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-2 h-full min-h-0">
                {/* Channel 1: Input */}
                <div className="relative rounded overflow-hidden border border-slate-700/50 bg-black shadow-inner group">
                    <canvas ref={inputCanvasRef} className="w-full h-full block" />
                    {/* Corner accents */}
                     <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-amber-500/30"></div>
                     <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-amber-500/30"></div>
                </div>

                {/* Channel 2: Output */}
                <div className="relative rounded overflow-hidden border border-slate-700/50 bg-black shadow-inner group">
                    <canvas ref={outputCanvasRef} className="w-full h-full block" />
                     {/* Corner accents */}
                     <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500/30"></div>
                     <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500/30"></div>
                </div>
            </div>
        </div>
    );
};