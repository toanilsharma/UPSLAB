import React, { useEffect, useRef } from 'react';
import { SimulationState, ComponentStatus } from '../types';

interface WaveformsProps {
  state: SimulationState;
}

export const Waveforms: React.FC<WaveformsProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Physics Refs (Mutable state independent of renders)
  const timeRef = useRef(0);
  const transientRef = useRef(0);
  
  // State tracking for change detection
  const prevLoadVoltage = useRef(state.voltages.loadBus);
  const prevSource = useRef(state.components.staticSwitch.mode);

  useEffect(() => {
      // Trigger transient on significant voltage change OR source transfer
      const voltChange = Math.abs(state.voltages.loadBus - prevLoadVoltage.current) > 20;
      const sourceChange = state.components.staticSwitch.mode !== prevSource.current;

      if (voltChange || sourceChange) {
          transientRef.current = 25; // Inject transient spike
      }
      prevLoadVoltage.current = state.voltages.loadBus;
      prevSource.current = state.components.staticSwitch.mode;
  }, [state.voltages.loadBus, state.components.staticSwitch.mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    
    const draw = () => {
      // Decay transient effect physics
      if (transientRef.current > 0.5) {
          transientRef.current *= 0.92; // Smooth decay
      } else {
          transientRef.current = 0;
      }
      
      // Update time physics
      timeRef.current += 0.15;

      // Resize handling
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = canvas.parentElement?.clientHeight || 150;
      const w = canvas.width;
      const h = canvas.height;

      // Clear with dark CRT-style background
      ctx.fillStyle = '#020617'; // Darker slate
      ctx.fillRect(0, 0, w, h);
      
      // Draw CRT Grid
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Vertical lines
      for(let x=0; x<w; x+=30) { ctx.moveTo(x,0); ctx.lineTo(x,h); }
      // Horizontal lines
      for(let y=0; y<h; y+=30) { ctx.moveTo(0,y); ctx.lineTo(w,y); }
      ctx.stroke();

      // Advanced Waveform Drawer Function
      const drawWave = (
          offsetY: number, 
          amplitude: number, 
          color: string, 
          phase: number, 
          config: { 
              harmonics?: boolean, // Add industrial grid distortion (3rd, 5th)
              noiseLevel: number,  // Random noise/ripple
              isTransient?: boolean // Apply active switching transient spike
          }
      ) => {
         ctx.beginPath();
         ctx.strokeStyle = color;
         ctx.lineWidth = 2;
         ctx.lineJoin = 'round';
         ctx.lineCap = 'round';

         const freq = 0.05; // Visual frequency scaling

         for (let x = 0; x < w; x++) {
            let y = 0;
            
            if (amplitude > 0) {
                // 1. Fundamental Component
                y = Math.sin((x * freq) + timeRef.current + phase) * amplitude;

                // 2. Industrial Harmonics (Simulate Utility Distortion per IEEE 519)
                if (config.harmonics) {
                    // 3rd Harmonic (15%) - Common in 3-phase systems
                    y += Math.sin((x * freq * 3) + timeRef.current + phase) * (amplitude * 0.15);
                    // 5th Harmonic (5%)
                    y += Math.sin((x * freq * 5) + timeRef.current + phase) * (amplitude * 0.05);
                    
                    // Flat-topping simulation (Non-linear load effect on grid)
                    if (y > amplitude * 0.95) y = amplitude * 0.95 + (Math.random());
                    if (y < -amplitude * 0.95) y = -amplitude * 0.95 - (Math.random());
                }

                // 3. High Frequency Noise / Ripples
                if (config.noiseLevel > 0) {
                    y += (Math.random() - 0.5) * config.noiseLevel;
                }
            } else {
                // Zero line noise
                 y += (Math.random() - 0.5) * 0.5;
            }

            // 4. Apply Switching Transient (Decaying Spike)
            if (config.isTransient && transientRef.current > 0) {
                // Random spikes injection based on transient magnitude
                y += (Math.random() - 0.5) * transientRef.current * 2;
            }

            const finalY = offsetY + y;
            if (x === 0) ctx.moveTo(x, finalY);
            else ctx.lineTo(x, finalY);
         }
         
         // Apply glow effect for realism
         ctx.shadowBlur = 4;
         ctx.shadowColor = color;
         ctx.stroke();
         ctx.shadowBlur = 0;
      };

      // --- RENDER CHANNELS ---

      // Channel 1: Utility Input (Industrial Grid - Dirty)
      const utilAmp = state.voltages.utilityInput > 50 ? 22 : 0;
      drawWave(h * 0.2, utilAmp, '#f97316', 0, { 
          harmonics: true, 
          noiseLevel: 2 
      });

      // Channel 2: Inverter Output (PWM Generated - Clean)
      let invAmp = 0;
      let invNoise = 0;
      let invPhase = Math.PI / 4; // Shifted from Utility
      
      if (state.components.inverter.status === ComponentStatus.NORMAL) {
        invAmp = 22;
        invNoise = 0.5; // Very clean
      } else if (state.components.inverter.status === ComponentStatus.STARTING) {
        invAmp = 10 + Math.random() * 5; 
        invNoise = 4; // Unstable during soft start
      }
      
      drawWave(h * 0.5, invAmp, '#3b82f6', invPhase, { 
          harmonics: false, 
          noiseLevel: invNoise 
      });

      // Channel 3: Critical Load Bus (Dynamic Source)
      const loadAmp = state.voltages.loadBus > 50 ? 22 : 0;
      
      let loadPhase = 0;
      let loadHarmonics = false;
      let loadNoise = 0;

      // STRICT CHECK: Static Switch Logic for Waveform
      if (state.components.staticSwitch.mode === 'BYPASS') {
          // ON BYPASS: Load sees the dirty Utility Grid directly
          loadPhase = 0;
          loadHarmonics = true; 
          loadNoise = 2;       
      } else {
          // ON INVERTER (or OFF, but if OFF amp is 0 anyway): Clean Sine
          loadPhase = invPhase;
          loadHarmonics = false; 
          loadNoise = 0.5;       
      }

      drawWave(h * 0.8, loadAmp, '#22c55e', loadPhase, { 
          harmonics: loadHarmonics, 
          noiseLevel: loadNoise,
          isTransient: true // Apply switch transients here
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [state]); // Re-bind if state changes (layout/values)

  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-2 h-full flex flex-col">
      <div className="flex justify-between items-center mb-1 px-1 flex-none">
          <div className="text-[10px] text-slate-400 font-mono tracking-wider font-bold">POWER QUALITY ANALYZER</div>
          <div className="flex gap-3">
              <span className="text-[10px] text-orange-400 font-mono">● MAINS (THD ~5%)</span>
              <span className="text-[10px] text-blue-400 font-mono">● INV (THD &lt;1%)</span>
              <span className="text-[10px] text-green-400 font-mono">● LOAD</span>
          </div>
      </div>
      <div className="flex-1 relative bg-black/40 rounded border border-slate-700 overflow-hidden">
        {/* Grid Overlay for realism */}
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{
            backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)',
            backgroundSize: '20px 20px'
        }}></div>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};