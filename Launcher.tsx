
import React, { useState, useEffect } from 'react';
import App from './App';
import ParallelApp from './ParallelApp';
import { motion, AnimatePresence } from 'framer-motion';

const Launcher = () => {
    const [mode, setMode] = useState<'BOOT' | 'SELECT' | 'SINGLE' | 'PARALLEL'>('BOOT');

    useEffect(() => {
        // Fake Boot Sequence
        const timer = setTimeout(() => setMode('SELECT'), 2500);
        return () => clearTimeout(timer);
    }, []);

    if (mode === 'BOOT') {
        return (
            <div className="flex h-screen w-screen bg-black items-center justify-center overflow-hidden">
                <div className="text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1, type: "spring" }}
                        className="text-6xl font-black text-white italic tracking-tighter mb-4"
                    >
                        OMNI<span className="text-cyan-500">POWER</span>
                    </motion.div>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: 200 }}
                        transition={{ delay: 0.5, duration: 1.5 }}
                        className="h-1 bg-cyan-600 mx-auto rounded-full"
                    />
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="mt-4 text-cyan-500/60 font-mono text-xs tracking-[0.5em]"
                    >
                        INITIALIZING PHYSICS KERNEL...
                    </motion.p>
                </div>
            </div>
        );
    }

    if (mode === 'SINGLE') return <App onReturnToMenu={() => setMode('SELECT')} />;
    if (mode === 'PARALLEL') return <ParallelApp onReturnToMenu={() => setMode('SELECT')} />;

    return (
        <div className="flex h-screen w-screen bg-[#020617] items-center justify-center p-8 font-sans overflow-hidden relative">

            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/40 via-black to-black opacity-80 pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-5xl w-full grid grid-cols-2 gap-12 relative z-10"
            >

                {/* Header */}
                <div className="col-span-2 text-center mb-8">
                    <div className="text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl cursor-pointer group" onClick={() => {/* Could add home functionality */ }}>
                        SafeOps <span className="text-cyan-500">UPS</span>
                        <div className="text-[8px] text-slate-500 tracking-widest uppercase mt-0.5">Digital Twin Platform</div>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4">
                        <div className="h-px w-12 bg-slate-800"></div>
                        <p className="text-slate-500 font-mono tracking-[0.3em] text-xs">DIGITAL TWIN SIMULATION SUITE</p>
                        <div className="h-px w-12 bg-slate-800"></div>
                    </div>
                </div>

                {/* Single Module Card */}
                <button
                    onClick={() => setMode('SINGLE')}
                    className="group relative h-80 bg-slate-900/50 backdrop-blur-md border border-slate-800/60 rounded-2xl p-8 text-left flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-cyan-900/20 hover:border-cyan-500/50 transition-all duration-500"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-5 font-black text-[12rem] leading-none select-none group-hover:opacity-10 transition-opacity translate-x-12 -translate-y-12 pointer-events-none">1</div>

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-800/30 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>
                            <span className="text-cyan-400 text-[10px] font-bold tracking-widest">STANDARD EDITION</span>
                        </div>
                        <h2 className="text-4xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">Single Module</h2>
                        <p className="text-slate-400 text-sm leading-relaxed pr-8">
                            Master the fundamentals of double-conversion UPS topology.
                            Simulate rectifier walk-in, battery discharge curves, and static bypass transfers in a controlled environment.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 group-hover:text-cyan-400 text-xs font-bold tracking-widest transition-colors mt-8">
                        LAUNCH SIMULATION <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                    </div>
                </button>

                {/* Parallel Card */}
                <button
                    onClick={() => setMode('PARALLEL')}
                    className="group relative h-80 bg-slate-900/50 backdrop-blur-md border border-slate-800/60 rounded-2xl p-8 text-left flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-purple-900/20 hover:border-purple-500/50 transition-all duration-500"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-5 font-black text-[12rem] leading-none select-none group-hover:opacity-10 transition-opacity translate-x-12 -translate-y-12 pointer-events-none">2</div>

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/50 border border-purple-800/30 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_10px_#a855f7]"></div>
                            <span className="text-purple-400 text-[10px] font-bold tracking-widest">ENTERPRISE EDITION</span>
                        </div>
                        <h2 className="text-4xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">Parallel Redundant</h2>
                        <p className="text-slate-400 text-sm leading-relaxed pr-8">
                            Advanced N+1 architecture simulation.
                            Execute complex load sharing strategies, synchronization fault injection, and maintenance isolation without load loss.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 group-hover:text-purple-400 text-xs font-bold tracking-widest transition-colors mt-8">
                        LAUNCH SIMULATION <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                    </div>
                </button>

            </motion.div>
        </div>
    );
};

export default Launcher;
