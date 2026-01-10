
import React, { useEffect, useRef } from 'react';
import { ParallelSimulationState, ComponentStatus } from '../parallel_types';

interface WaveformsProps {
    state: ParallelSimulationState;
}

export const ParallelWaveforms: React.FC<WaveformsProps> = ({ state }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timeRef = useRef(0);
    const transientRef = useRef(0);
    const prevLoadVoltage = useRef(state.voltages.loadBus);

    useEffect(() => {
        const voltChange = Math.abs(state.voltages.loadBus - prevLoadVoltage.current) > 20;
        if (voltChange) {
            transientRef.current = 25;
        }
        prevLoadVoltage.current = state.voltages.loadBus;
    }, [state.voltages.loadBus]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const draw = () => {
            if (transientRef.current > 0.5) transientRef.current *= 0.92;
            else transientRef.current = 0;

            timeRef.current += 0.15;

            canvas.width = canvas.parentElement?.clientWidth || 300;
            canvas.height = canvas.parentElement?.clientHeight || 200;
            const w = canvas.width;
            const h = canvas.height;

            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, w, h);

            // Draw grid
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x < w; x += 30) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
            for (let y = 0; y < h; y += 30) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
            ctx.stroke();

            const drawWave = (offsetY: number, amplitude: number, color: string, phase: number, config: any) => {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';
                const freq = 0.05;
                for (let x = 0; x < w; x++) {
                    let y = 0;
                    if (amplitude > 0) {
                        y = Math.sin((x * freq) + timeRef.current + (phase || 0)) * amplitude;
                        if (config.harmonics) y += Math.sin((x * freq * 3) + timeRef.current) * (amplitude * 0.15);
                        if (config.noise) y += (Math.random() - 0.5) * config.noise;
                    } else {
                        y += (Math.random() - 0.5) * 0.5; // low noise when off
                    }
                    if (config.isTransient && transientRef.current > 0) y += (Math.random() - 0.5) * transientRef.current * 2; // Spike
                    ctx.lineTo(x, offsetY + y);
                }
                ctx.shadowBlur = 4;
                ctx.shadowColor = color;
                ctx.stroke();
                ctx.shadowBlur = 0;
            };

            // Channels
            const utilAmp = state.voltages.utilityInput > 50 ? 20 : 0;
            drawWave(h * 0.2, utilAmp, '#f97316', 0, { harmonics: true, noise: 1.5 }); // Utility

            const m1Amp = state.modules.module1.inverter.status === ComponentStatus.NORMAL ? 20 : 0;
            drawWave(h * 0.4, m1Amp, '#3b82f6', Math.PI / 4, { noise: 0.5 }); // M1

            const m2Amp = state.modules.module2.inverter.status === ComponentStatus.NORMAL ? 20 : 0;
            drawWave(h * 0.6, m2Amp, '#a855f7', Math.PI / 4, { noise: 0.5 }); // M2 (Same phase if sync)

            const loadAmp = state.voltages.loadBus > 50 ? 20 : 0;
            // Load sees harmonics if on bypass
            const onBypass = state.modules.module1.staticSwitch.mode === 'BYPASS' || state.modules.module2.staticSwitch.mode === 'BYPASS';
            drawWave(h * 0.8, loadAmp, '#22c55e', onBypass ? 0 : Math.PI / 4, {
                harmonics: onBypass,
                isTransient: true,
                noise: onBypass ? 1.5 : 0.5
            }); // Load

            animationId = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(animationId);
    }, [state]);

    return (
        <div className="bg-slate-800 border border-slate-700 rounded p-2 h-full flex flex-col">
            <div className="flex justify-between items-center mb-1 px-1 flex-none">
                <div className="text-[10px] text-slate-400 font-mono tracking-wider font-bold">POWER QUALITY (4-CH)</div>
                <div className="flex gap-2">
                    <span className="text-[10px] text-orange-400 font-mono">UTIL</span>
                    <span className="text-[10px] text-blue-400 font-mono">M1</span>
                    <span className="text-[10px] text-purple-400 font-mono">M2</span>
                    <span className="text-[10px] text-green-400 font-mono">LOAD</span>
                </div>
            </div>
            <div className="flex-1 relative bg-black/40 rounded border border-slate-700 overflow-hidden">
                <canvas ref={canvasRef} className="w-full h-full block" />
            </div>
        </div>
    );
};
