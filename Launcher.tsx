
import React, { useState, useEffect, useRef } from 'react';
import App from './App';
import ParallelApp from './ParallelApp';
import { motion, AnimatePresence } from 'framer-motion';

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

const FeatureList = ({ items, color }: { items: string[], color: string }) => (
    <ul className="space-y-1 mb-3">
        {items.map((item, i) => (
            <motion.li 
                key={i} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-start gap-2 text-slate-300 text-xs font-medium"
            >
                <span className={`mt-1 w-1.5 h-1.5 rounded-full bg-${color}-500 shadow-[0_0_5px_currentColor]`}></span>
                {item}
            </motion.li>
        ))}
    </ul>
);

const StatBadge = ({ label, value }: { label: string, value: string }) => (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded flex flex-col items-center min-w-[70px]">
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
        <span className="text-xs font-black text-white">{value}</span>
    </div>
);

// --- MAIN LAUNCHER ---

const Launcher = () => {
    const [mode, setMode] = useState<'BOOT' | 'SELECT' | 'SINGLE' | 'PARALLEL'>('BOOT');
    const [hoveredCard, setHoveredCard] = useState<'SINGLE' | 'PARALLEL' | null>(null);
    const [showInfo, setShowInfo] = useState(false);

    useEffect(() => {
        // Retrieve skipped boot preference if implemented later on
        const timer = setTimeout(() => setMode('SELECT'), 2800);
        return () => clearTimeout(timer);
    }, []);

    // --- BOOT SCREEN (Kept for "Wow" factor) ---
    if (mode === 'BOOT') {
        return (
            <div className="flex h-screen w-screen bg-[#020617] items-center justify-center overflow-hidden font-mono selection:bg-cyan-500/30">
                <div className="w-96 relative z-10">
                    <div className="flex justify-between text-xs text-cyan-500 mb-2 font-bold tracking-widest">
                        <span>BIOS CHECK... OK</span>
                        <span>KERNEL v2.4.0</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-4 border border-slate-700/50">
                        <motion.div
                            initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.5, ease: "easeInOut" }}
                            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                        />
                    </div>
                    <div className="space-y-1 text-[10px] text-slate-500 font-medium">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>&gt; MOUNTING PHYSICS ENGINE...</motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>&gt; LOADING ASSETS (220V DC_BUS)...</motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>&gt; INITIALIZING UI LAYER...</motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="text-green-500 font-bold">&gt; SYSTEM READY.</motion.div>
                    </div>
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#020617] to-[#020617]"></div>
            </div>
        );
    }

    if (mode === 'SINGLE') return <App onReturnToMenu={() => setMode('SELECT')} />;
    if (mode === 'PARALLEL') return <ParallelApp onReturnToMenu={() => setMode('SELECT')} />;

    return (
        <div className="h-screen w-screen bg-[#020617] text-slate-200 font-sans overflow-hidden selection:bg-cyan-500/30 flex flex-col">
            <CircuitBackground />
            
            {/* HEADER */}
            <header className="fixed top-0 w-full z-50 h-14 px-6 flex items-center justify-between border-b border-white/5 bg-[#020617]/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <span className="text-white font-black text-base">S</span>
                    </div>
                    <div>
                        <h1 className="font-black text-white tracking-tight text-lg leading-none">SafeOps <span className="text-cyan-400 italic">UPS</span></h1>
                        <span className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase">Digital Twin Simulator</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-lg">
                        <span className="text-amber-400 text-[10px]">⚠️</span>
                        <span className="text-amber-200/80 text-[10px] font-medium">Best experienced on <b className="text-amber-300">Laptop / Desktop</b></span>
                    </div>
                    <button 
                        onClick={() => setShowInfo(!showInfo)}
                        className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                        <span className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">?</span>
                        <span className="hidden sm:inline">How to Use</span>
                    </button>
                    <div className="px-2 py-0.5 bg-cyan-950/30 border border-cyan-500/20 rounded text-[9px] font-bold text-cyan-400 tracking-wider">
                        V2.4
                    </div>
                </div>
            </header>

            {/* OPTIMAL EXPERIENCE BANNER - Mobile only (full banner). Desktop uses inline header badge above. */}
            <div className="absolute top-16 left-0 right-0 z-40 px-6 flex justify-center text-center pointer-events-none md:hidden">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="bg-amber-950/80 border border-amber-500/50 text-amber-200 px-5 py-3 rounded-xl text-xs shadow-[0_0_25px_rgba(245,158,11,0.2)] max-w-md backdrop-blur-xl pointer-events-auto"
                >
                    <div className="font-black tracking-widest uppercase mb-1 text-amber-400">⚠️ Engineering Precision Required</div>
                    <div className="text-amber-100/80 leading-relaxed">
                        This high-fidelity Digital Twin features intricate technical controls and dynamic Single Line Diagrams. For the optimal interactive experience, we highly recommend launching this platform on a <b>Laptop or Desktop workstation</b>.
                    </div>
                </motion.div>
            </div>

            {/* MAIN CONTENT - SPLIT SCREEN */}
            <main className="flex-1 flex flex-col md:flex-row relative z-10 pt-14 pb-10">
                
                {/* --- SINGLE MODULE CARD --- */}
                <motion.div 
                    className="flex-1 relative group cursor-pointer border-r border-white/5 overflow-hidden"
                    onHoverStart={() => setHoveredCard('SINGLE')}
                    onHoverEnd={() => setHoveredCard(null)}
                    onClick={() => setMode('SINGLE')}
                    animate={{ 
                        flex: hoveredCard === 'SINGLE' ? 1.5 : hoveredCard === 'PARALLEL' ? 0.8 : 1,
                        backgroundColor: hoveredCard === 'SINGLE' ? 'rgba(8, 145, 178, 0.05)' : 'transparent'
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <GlowingOrb color="cyan" x="50%" y="30%" size={600} />
                    
                    <div className="relative h-full flex flex-col justify-center px-8 md:px-14 max-w-3xl mx-auto py-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-2"
                        >
                            <span className="inline-block px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black tracking-widest uppercase mb-1">
                                Level 1
                            </span>
                            <h2 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter mb-1 group-hover:text-cyan-100 transition-colors">
                                Single <span className="text-cyan-500">Module</span>
                            </h2>
                            <p className="text-slate-400 text-xs font-medium max-w-md leading-snug group-hover:text-slate-300 transition-colors">
                                Master average power flow, battery chemistry, and static switch operations in a standard industrial environment.
                            </p>
                        </motion.div>

                        <motion.div
                             animate={{ 
                                height: 'auto', 
                                opacity: hoveredCard === 'SINGLE' ? 1 : 0.7,
                                y: hoveredCard === 'SINGLE' ? 0 : 10 
                            }}
                             className="space-y-2"
                        >
                             <div className="flex gap-2 mb-2">
                                <StatBadge label="Input" value="415 VAC" />
                                <StatBadge label="Output" value="110 VAC" />
                                <StatBadge label="DC Bus" value="220 V" />
                            </div>

                            <FeatureList 
                                color="cyan"
                                items={[
                                    "Interactive Block Diagram (SLD)",
                                    "Rectifier Walk-in & Soft Start",
                                    "Maintenance Bypass Procedures (Q3)",
                                    "Fault Finding & Alarm Management"
                                ]} 
                            />

                            <button className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm tracking-wider uppercase rounded shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center gap-3 group-hover:gap-6 transition-all w-fit">
                                Launch Simulation <span className="text-lg">→</span>
                            </button>
                        </motion.div>
                    </div>
                </motion.div>

                 {/* --- PARALLEL MODULE CARD --- */}
                 <motion.div 
                    className="flex-1 relative group cursor-pointer border-l border-white/5 overflow-hidden"
                    onHoverStart={() => setHoveredCard('PARALLEL')}
                    onHoverEnd={() => setHoveredCard(null)}
                    onClick={() => setMode('PARALLEL')}
                    animate={{ 
                        flex: hoveredCard === 'PARALLEL' ? 1.5 : hoveredCard === 'SINGLE' ? 0.8 : 1,
                        backgroundColor: hoveredCard === 'PARALLEL' ? 'rgba(147, 51, 234, 0.05)' : 'transparent'
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <GlowingOrb color="purple" x="50%" y="70%" size={600} />

                    <div className="relative h-full flex flex-col justify-center px-8 md:px-14 max-w-3xl mx-auto py-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mb-2"
                        >
                             <span className="inline-block px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black tracking-widest uppercase mb-1">
                                Level 2
                            </span>
                            <h2 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter mb-1 group-hover:text-purple-100 transition-colors">
                                Parallel <span className="text-purple-500">System</span>
                            </h2>
                            <p className="text-slate-400 text-xs font-medium max-w-md leading-snug group-hover:text-slate-300 transition-colors">
                                Advanced N+1 redundancy training. Manage load sharing, synchronization, and complex isolation procedures.
                            </p>
                        </motion.div>
                        
                         <motion.div
                             animate={{ 
                                height: 'auto', 
                                opacity: hoveredCard === 'PARALLEL' ? 1 : 0.7,
                                y: hoveredCard === 'PARALLEL' ? 0 : 10 
                            }}
                             className="space-y-2"
                        >
                            <div className="flex gap-2 mb-2">
                                <StatBadge label="Modules" value="2 + 1" />
                                <StatBadge label="Sync" value="Active PLL" />
                                <StatBadge label="Sharing" value="Droop Control" />
                            </div>

                            <FeatureList 
                                color="purple"
                                items={[
                                    "Active Load Sharing & Circulation Current",
                                    "Module Synchro & Phase Matching",
                                    "Hot-Swappable Module Isolation",
                                    "Sequential Startup Logic"
                                ]} 
                            />

                             <button className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm tracking-wider uppercase rounded shadow-[0_0_20px_rgba(147,51,234,0.4)] flex items-center gap-3 group-hover:gap-6 transition-all w-fit">
                                Enter System <span className="text-lg">→</span>
                            </button>
                        </motion.div>
                    </div>
                </motion.div>

            </main>

            {/* FLOATING INSTRUCTIONS MODAL */}
            <AnimatePresence>
                {showInfo && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
                        onClick={() => setShowInfo(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl max-w-4xl w-full p-12 relative shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowInfo(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">✕</button>
                            
                            <div className="grid md:grid-cols-2 gap-12">
                                <div>
                                    <h3 className="text-3xl font-black text-white italic tracking-tight mb-6">Why This Simulator?</h3>
                                    <p className="text-slate-300 leading-relaxed mb-6">
                                        Real UPS systems are dangerous to experiment with. This Digital Twin provides a <span className="text-cyan-400 font-bold">100% safe environment</span> to practice critical switching operations without risk of arc flash or load loss.
                                    </p>
                                    <ul className="space-y-4">
                                        <li className="flex gap-4">
                                            <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold shrink-0">1</div>
                                            <div>
                                                <div className="font-bold text-white">Learn the Physics</div>
                                                <div className="text-sm text-slate-400">Not just animations. Voltages, currents, and temperatures are calculated in real-time.</div>
                                            </div>
                                        </li>
                                         <li className="flex gap-4">
                                            <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold shrink-0">2</div>
                                            <div>
                                                <div className="font-bold text-white">Practice Procedures</div>
                                                <div className="text-sm text-slate-400">Execute Maintenance Bypasses and Black Starts using correct breaker sequences.</div>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div className="border-l border-white/5 pl-12 flex flex-col justify-center">
                                    <h4 className="text-xl font-bold text-white mb-4">How to Operate</h4>
                                    <div className="space-y-4 text-sm text-slate-300">
                                        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                            <strong className="text-cyan-400 block mb-1">Click Switches</strong>
                                            Toggle breakers (Q1, Q2, etc.) to route power.
                                        </div>
                                         <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                            <strong className="text-purple-400 block mb-1">Open Faceplates</strong>
                                            Click on components (Rectifier, Inverter) to see detailed metrics and controls.
                                        </div>
                                         <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                            <strong className="text-green-400 block mb-1">Follow Guides</strong>
                                            Use the "Procedures" panel on the right for step-by-step Standard Operating Procedures (SOPs).
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FOOTER */}
            <footer className="fixed bottom-0 w-full z-20 py-2 px-6 border-t border-white/5 bg-[#020617]/90 backdrop-blur flex justify-between items-center text-[9px] uppercase font-bold tracking-widest text-slate-500">
                <div className="flex gap-6">
                    <span className="hover:text-cyan-400 transition-colors cursor-pointer">Physics Specs</span>
                    <span className="hover:text-cyan-400 transition-colors cursor-pointer">About Dev</span>
                </div>
                <div>
                     Engineered by <span className="text-cyan-600">Anil Sharma</span>
                </div>
            </footer>
        </div>
    );
};

export default Launcher;
