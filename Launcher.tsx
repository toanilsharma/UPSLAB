
import React, { useState, useEffect, useRef } from 'react';
import App from './App';
import ParallelApp from './ParallelApp';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion';

// --- VISUAL & UI COMPONENTS ---

const CircuitBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-cyan-900" />
                    <circle cx="20" cy="20" r="0.5" fill="currentColor" className="text-cyan-600" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#020617] via-transparent to-[#020617]"></div>
    </div>
);

const GlowingOrb = ({ color = "cyan", x, y, size = 500 }: any) => (
    <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute rounded-full blur-[120px] pointer-events-none mix-blend-screen z-0`}
        style={{
            backgroundColor: color === "cyan" ? "#06b6d4" : "#a855f7",
            width: size,
            height: size,
            left: x,
            top: y,
            transform: "translate(-50%, -50%)"
        }}
    />
);

const SectionHeading = ({ number, title, subtitle, color = "cyan" }: any) => (
    <div className="flex items-end gap-4 mb-12 border-b border-white/10 pb-4">
        <div className={`text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-600 opacity-20`}>{number}</div>
        <div className="mb-2">
            <h2 className="text-4xl font-black text-white tracking-tight">{title}</h2>
            <div className={`text-sm font-bold font-mono tracking-widest uppercase text-${color}-400`}>{subtitle}</div>
        </div>
    </div>
);

const FeatureSpec = ({ label, value, detail }: any) => (
    <div className="border-b border-white/10 py-4 group hover:bg-white/5 transition-colors px-3">
        <div className="flex justify-between items-baseline mb-1">
            <span className="text-slate-300 text-base font-medium font-mono">{label}</span>
            <span className="text-cyan-300 font-bold text-lg tracking-wide">{value}</span>
        </div>
        {detail && <div className="text-slate-400 text-xs font-medium leading-tight opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">{detail}</div>}
    </div>
);

const CodeBlock = ({ items }: any) => (
    <div className="font-mono text-[10px] leading-relaxed text-slate-400 bg-black/40 p-4 rounded-lg border border-white/5 shadow-inner">
        {items.map((line: string, i: number) => (
            <div key={i} className="flex gap-4">
                <span className="text-slate-700 select-none">{(i + 1).toString().padStart(2, '0')}</span>
                <span dangerouslySetInnerHTML={{ __html: line }} />
            </div>
        ))}
    </div>
);

const TechCard = ({ title, subtitle, icon, features, activeColor, onClick, delay }: any) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.6 }}
            onClick={onClick}
            className={`group relative h-auto min-h-[300px] w-full cursor-pointer bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 overflow-hidden transition-all duration-500 hover:border-${activeColor}-500/50 hover:bg-slate-900/60 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
        >
            <div className={`absolute top-0 right-0 p-4 opacity-10 font-black text-8xl text-white pointer-events-none group-hover:scale-110 transition-transform duration-700 ease-out`}>
                {icon}
            </div>

            <div className="relative z-10">
                <div className={`w-10 h-10 rounded-md bg-${activeColor}-500/20 flex items-center justify-center text-xl mb-6 text-${activeColor}-400 border border-${activeColor}-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]`}>
                    {icon}
                </div>

                <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-white transition-colors">{title}</h3>
                <p className={`text-${activeColor}-400 text-xs font-mono tracking-widest uppercase mb-6`}>{subtitle}</p>

                <ul className="space-y-3 mb-8">
                    {features.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300 text-base font-medium">
                            <span className={`mt-2 w-1.5 h-1.5 rounded-full bg-${activeColor}-500 shadow-[0_0_5px_currentColor]`}></span>
                            {f}
                        </li>
                    ))}
                </ul>

                <div className={`flex items-center gap-2 text-xs font-bold text-white tracking-widest group-hover:translate-x-2 transition-transform duration-300`}>
                    LAUNCH SIMULATION <span className={`text-${activeColor}-400`}>→</span>
                </div>
            </div>
        </motion.div>
    );
};

// --- MAIN LAUNCHER ---

const Launcher = () => {
    const [mode, setMode] = useState<'BOOT' | 'SELECT' | 'SINGLE' | 'PARALLEL'>('BOOT');

    useEffect(() => {
        const timer = setTimeout(() => setMode('SELECT'), 2500);
        return () => clearTimeout(timer);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const WaveformCanvas = () => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            let t = 0;
            const loop = () => {
                t += 0.05;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.lineWidth = 2;
                // Draw multiple harmonics
                [1, 3, 5].forEach((h, i) => {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(${34 + i * 50}, ${211 - i * 30}, ${238 - i * 20}, ${0.8 - i * 0.2})`;
                    for (let x = 0; x < canvas.width; x++) {
                        const y = canvas.height / 2 + Math.sin(x * 0.02 * h + t * h) * (40 / h);
                        ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                });
                requestAnimationFrame(loop);
            };
            loop();
        }, []);
        return <canvas ref={canvasRef} width={600} height={200} className="w-full h-48 opacity-60" />;
    };

    if (mode === 'BOOT') {
        return (
            <div className="flex h-screen w-screen bg-[#020617] items-center justify-center overflow-hidden font-mono">
                <div className="w-96">
                    <div className="flex justify-between text-xs text-cyan-500 mb-2">
                        <span>BIOS CHECK... OK</span>
                        <span>KERNEL v2.4.0</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-4">
                        <motion.div
                            initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.2, ease: "easeInOut" }}
                            className="h-full bg-cyan-500"
                        />
                    </div>
                    <div className="space-y-1 text-[10px] text-slate-500">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>&gt; MOUNTING PHYSICS ENGINE...</motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>&gt; LOADING ASSETS (220V DC_BUS)...</motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>&gt; INITIALIZING UI LAYER...</motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }} className="text-green-500">&gt; READY.</motion.div>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'SINGLE') return <App onReturnToMenu={() => setMode('SELECT')} />;
    if (mode === 'PARALLEL') return <ParallelApp onReturnToMenu={() => setMode('SELECT')} />;

    return (
        <div className="min-h-screen w-screen bg-[#020617] text-slate-200 font-sans overflow-x-hidden selection:bg-cyan-500/30">
            <CircuitBackground />

            <nav className="fixed top-0 w-full z-50 bg-slate-950/95 backdrop-blur-xl border-b border-cyan-500/30 shadow-2xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <span className="text-black font-black text-lg">S</span>
                        </div>
                        <span className="font-black text-white tracking-tight text-xl">SafeOps <span className="text-cyan-400 italic">UPS</span></span>
                    </div>
                    <div className="flex items-center gap-8 text-sm font-bold tracking-wider text-white">
                        <button onClick={() => scrollToSection('physics')} className="hidden md:inline hover:text-cyan-400 cursor-pointer transition-all hover:scale-105 bg-transparent border-0 p-0 shadow-none uppercase opacity-90 hover:opacity-100">Physics</button>
                        <button onClick={() => scrollToSection('modules')} className="hidden md:inline hover:text-cyan-400 cursor-pointer transition-all hover:scale-105 bg-transparent border-0 p-0 shadow-none uppercase opacity-90 hover:opacity-100">Modules</button>
                        <span className="px-4 py-1.5 bg-cyan-950/50 rounded-full border border-cyan-500/30 text-cyan-300 text-xs shadow-[0_0_10px_rgba(6,182,212,0.1)]">V2.4 STABLE</span>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10">

                {/* HERO AREA */}
                <div className="grid lg:grid-cols-2 gap-16 mb-32 items-center">
                    <div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="inline-block px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-800/50 text-cyan-400 text-[10px] font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                                    Industrial Digital Twin
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/50">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Engineered By</span>
                                    <span className="text-[10px] font-black text-cyan-400 tracking-wide">ANIL SHARMA</span>
                                </div>
                            </div>
                            <h1 className="text-7xl md:text-8xl font-black text-white italic tracking-tighter leading-[0.9] mb-10 drop-shadow-2xl">
                                Master <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 filter drop-shadow-lg">Power Reliability</span>
                            </h1>
                            <div className="mb-10 max-w-xl border-l-4 border-cyan-500/30 pl-6 space-y-4">
                                <p className="text-2xl text-slate-200 leading-relaxed font-medium drop-shadow-md">
                                    <span className="text-white font-bold">Don't Fear - Learn to Operate.</span> Experience the true fidelity of a <span className="text-cyan-400 font-bold">live industrial UPS</span>.
                                    Master complex switching, fault recovery, and parallel systems in a fearless, high-stakes simulation environment.
                                </p>
                                <p className="text-lg text-slate-400 leading-relaxed font-medium">
                                    Discover the <span className="text-white font-bold">Real Features</span> of both Single & Parallel modules. Built on a rigorous physics engine modeling
                                    <span className="text-cyan-400 font-bold"> 220V DC</span> bus dynamics,
                                    <span className="text-purple-400 font-bold"> IGBT</span> switching, and
                                    <span className="text-green-400 font-bold"> electrochemical</span> battery states.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <button onClick={() => setMode('SINGLE')} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 text-white font-bold rounded-lg transition-all flex items-center gap-2 group shadow-lg">
                                    <span>SINGLE MODULE</span>
                                    <span className="group-hover:translate-x-1 transition-transform text-cyan-400">→</span>
                                </button>
                                <button onClick={() => setMode('PARALLEL')} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center gap-2 group">
                                    <span>PARALLEL SYSTEM</span>
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="relative"
                    >
                        <GlowingOrb color="cyan" x="50%" y="50%" size={600} />
                        <div className="relative bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                                <span className="text-xs font-mono text-cyan-500">OSCILLOSCOPE :: CHANNEL A/B</span>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                                </div>
                            </div>
                            <WaveformCanvas />
                            <div className="grid grid-cols-4 gap-4 mt-4 text-center">
                                {['V_rms: 415.2V', 'I_load: 65.4A', 'Freq: 50.00Hz', 'THD: 0.45%'].map(stat => (
                                    <div key={stat} className="bg-white/5 rounded py-2 text-[10px] font-mono text-slate-300">{stat}</div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* PHYSICS ENGINE DEEP DIVE */}
                {/* SIMULATION MODES - MOVED TO TOP */}
                <section className="mb-32" id="modules">
                    <SectionHeading number="01" title="Simulation Modules" subtitle="Select Training Environment" color="purple" />

                    <div className="grid md:grid-cols-2 gap-8">
                        <TechCard
                            title="Single Module UPS"
                            subtitle="Standard Edition"
                            icon="I"
                            activeColor="cyan"
                            onClick={() => setMode('SINGLE')}
                            delay={0.2}
                            features={[
                                "Fundamental Power Flow (AC-DC-AC)",
                                "Rectifier Walk-in & Soft Start Visualization",
                                "Battery Discharge & Recharge Curves",
                                "Static Switch (STS) Transfer Operations",
                                "Maintenance Bypass (Q3) Procedures",
                                "Basic Fault Finding & Alarm Management"
                            ]}
                        />
                        <TechCard
                            title="Parallel Redundant (N+1)"
                            subtitle="Enterprise Edition"
                            icon="II"
                            activeColor="purple"
                            onClick={() => setMode('PARALLEL')}
                            delay={0.4}
                            features={[
                                "Complex N+1 Multi-Module Architecture",
                                "Active Load Sharing & Circulation Current",
                                "Module Synchronization & Phase Matching",
                                "Safe Module Isolation (Hot Swappable)",
                                "Sequential Startup/Shutdown SOPs",
                                "Advanced Fault Injection (EPO, Bus Fail)"
                            ]}
                        />
                    </div>
                </section>

                {/* SIMULATION MODES */}
                {/* PHYSICS ENGINE DEEP DIVE */}
                <section className="mb-32" id="physics">
                    <SectionHeading number="02" title="Physics Core Specs" subtitle="Under The Hood" />

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Electrical */}
                        <div className="bg-slate-900/30 border border-white/10 rounded-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="text-cyan-500">⚡</span> Electrical Model
                            </h3>
                            <div className="space-y-1">
                                <FeatureSpec label="DC Bus Voltage" value="220 VDC" detail="Nominal bus voltage with capacitor discharge modeling" />
                                <FeatureSpec label="AC Input/Output" value="415 VAC" detail="3-Phase 50Hz with 120° phase separation" />
                                <FeatureSpec label="Rectifier Logic" value="6-Pulse + PFC" detail="Simulated walk-in soft start (0-100% in 15s)" />
                                <FeatureSpec label="Inverter PWM" value="10 kHz" detail="Simulated IGBT switching with generated harmonics" />
                            </div>
                        </div>

                        {/* Battery */}
                        <div className="bg-slate-900/30 border border-white/10 rounded-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="text-green-500">🔋</span> Battery Chemistry
                            </h3>
                            <div className="space-y-1">
                                <FeatureSpec label="Cell Type" value="VRLA/Li-ion" detail="Valve Regulated Lead Acid generic model" />
                                <FeatureSpec label="Discharge Curve" value="Non-Linear" detail="Based on Peukert's Law implementation" />
                                <FeatureSpec label="Float Voltage" value="2.27 V/cell" detail="Precision constant-voltage charging phase" />
                                <FeatureSpec label="Temp Coeff" value="-3mV / °C" detail="Capacity degradation at extremes modeled" />
                            </div>
                        </div>

                        {/* Control Logic */}
                        <div className="bg-slate-900/30 border border-white/10 rounded-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="text-purple-500">🧠</span> Control Loops
                            </h3>
                            <div className="space-y-1">
                                <FeatureSpec label="V-Loop Update" value="20 ms" detail="Voltage regulation PID loop cycle time" />
                                <FeatureSpec label="PLL Sync" value="< 2° Error" detail="Phase Locked Loop for Utility/Bypass sync" />
                                <FeatureSpec label="Load Share" value="Active Droop" detail="Parallel module current balancing logic" />
                                <FeatureSpec label="Interlock" value="Hard/Soft" detail="IEC 62040-3 compliant breaker permission logic" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* LOGIC PREVIEW */}
                <section className="mb-32">
                    <SectionHeading number="03" title="Algorithm Logic" subtitle="Transparent Code Execution" color="green" />
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h4 className="text-2xl font-bold text-white mb-4">Real-Time State Machine</h4>
                            <p className="text-slate-400 leading-relaxed mb-6">
                                The simulator doesn't just play animations. It runs a continuous state machine processing
                                hundreds of variables per second. Every Breaker (Q1-Q4), Contactor (K1-K2), and
                                IGBT Gate is logically modeled.
                            </p>
                            <ul className="space-y-3 mb-8">
                                {['Deterministic State Transitions', 'Race Condition Simulation (Interlocks)', 'Boolean Logic Gates for Safety'].map(item => (
                                    <li key={item} className="flex gap-3 text-slate-300 text-sm">
                                        <span className="text-cyan-500 font-bold">✓</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <CodeBlock items={[
                            "<span class='text-purple-400'>function</span> <span class='text-blue-300'>processTick</span>(state, dt) {",
                            "  <span class='text-slate-500'>// 1. Calculate DC Bus Dynamics</span>",
                            "  <span class='text-purple-400'>const</span> inputP = state.rectifier.active ? <span class='text-yellow-300'>calcRectifierPower()</span> : 0;",
                            "  <span class='text-purple-400'>const</span> battP = state.battery.connected ? <span class='text-yellow-300'>calcBatteryDisharge()</span> : 0;",
                            "",
                            "  <span class='text-slate-500'>// 2. Solve Thermal Dissipation</span>",
                            "  state.temp += (load * <span class='text-cyan-300'>HEAT_COEFF</span> - fan_speed * <span class='text-cyan-300'>COOL_COEFF</span>) * dt;",
                            "",
                            "  <span class='text-slate-500'>// 3. Check Safety Interlocks</span>",
                            "  <span class='text-purple-400'>if</span> (state.Q3_Maintenance && state.Inverter_Active) {",
                            "    <span class='text-red-400'>triggerFault</span>(<span class='text-green-300'>'BACKFEED_CRITICAL'</span>);",
                            "  }",
                            "}"
                        ]} />
                    </div>
                </section>

                {/* ENDORSEMENTS / FOOTER */}
                <div className="mt-40 -mx-6 px-6 py-16 bg-slate-950 border-t border-cyan-900/50">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left">
                            <h5 className="text-2xl font-black text-white mb-2 tracking-tight">SafeOps UPS <span className="text-cyan-500 font-normal">Digital Twin</span></h5>
                            <div className="text-base text-slate-300 font-mono tracking-wide mt-2">
                                COMPLIANT: <span className="text-white font-bold">IEC 62040-3</span> • <span className="text-white font-bold">IEEE 1188</span> • <span className="text-white font-bold">IEEE 142</span>
                            </div>
                        </div>

                        <div className="flex gap-12 opacity-80 grayscale hover:grayscale-0 transition-all duration-700">
                            {/* Mock Logos for standards */}
                            <div className="flex flex-col items-center group cursor-help">
                                <span className="text-3xl font-black text-slate-200 group-hover:text-blue-400 transition-colors">IEC</span>
                                <span className="text-[12px] tracking-[0.2em] font-bold text-slate-400 mt-1">INTERNATIONAL</span>
                            </div>
                            <div className="flex flex-col items-center group cursor-help">
                                <span className="text-3xl font-black text-slate-200 group-hover:text-blue-400 transition-colors">IEEE</span>
                                <span className="text-[12px] tracking-[0.2em] font-bold text-slate-400 mt-1">STANDARDS</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="flex items-center gap-4 bg-slate-900 border border-slate-700/50 rounded-2xl px-6 py-4 shadow-xl hover:border-cyan-500/30 transition-colors">
                                <div className="text-right">
                                    <div className="text-xs text-slate-300 uppercase tracking-wider font-bold mb-1">Engineered By</div>
                                    <div className="text-lg font-black text-cyan-400 tracking-wide">ANIL SHARMA</div>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 border-2 border-slate-900 shadow-lg ring-2 ring-cyan-500/20"></div>
                            </div>
                            <div className="text-xs text-slate-400 mt-4 tracking-[0.2em] uppercase font-bold">Electrical Reliability Expert</div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800/50 text-center">
                        <p className="text-sm text-slate-400 leading-relaxed max-w-4xl mx-auto font-mono">
                            DISCLAIMER: 'SafeOps UPS Digital Twin' is an educational simulation tool.
                            References to **IEC** and **IEEE** standards indicate modeled physics behavior only.
                            This tool is not officially affiliated with or endorsed by IEC or IEEE.
                            Use standard site safety procedures. © 2026 Anil Sharma.
                        </p>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default Launcher;
