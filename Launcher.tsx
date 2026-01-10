
import React, { useState } from 'react';
import App from './App';
import ParallelApp from './ParallelApp';

const Launcher = () => {
    const [mode, setMode] = useState<'SELECT' | 'SINGLE' | 'PARALLEL'>('SELECT');

    if (mode === 'SINGLE') return <div className="relative"><button onClick={() => setMode('SELECT')} className="absolute top-4 left-24 z-50 px-3 py-1 bg-slate-800 text-xs text-slate-400 border border-slate-600 rounded hover:text-white">BACK TO MENU</button><App /></div>;
    if (mode === 'PARALLEL') return <div className="relative"><button onClick={() => setMode('SELECT')} className="absolute top-4 left-24 z-50 px-3 py-1 bg-slate-800 text-xs text-slate-400 border border-slate-600 rounded hover:text-white">BACK TO MENU</button><ParallelApp /></div>;

    return (
        <div className="flex h-screen w-screen bg-slate-950 items-center justify-center p-8 font-sans">
            <div className="max-w-4xl w-full grid grid-cols-2 gap-8">

                {/* Header */}
                <div className="col-span-2 text-center mb-8">
                    <h1 className="text-5xl font-black text-slate-100 italic tracking-tighter">OMNI<span className="text-cyan-500">POWER</span></h1>
                    <p className="text-slate-500 mt-2 font-mono tracking-widest text-sm">DIGITAL TWIN SIMULATION SUITE</p>
                </div>

                {/* Single Module Card */}
                <button onClick={() => setMode('SINGLE')} className="group relative h-64 bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-cyan-500 transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] text-left flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-9xl leading-none select-none group-hover:opacity-20 transition-opacity">1</div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                            <span className="text-cyan-400 text-xs font-bold tracking-widest">STANDARD</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Single Module</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Single UPS module simulation with dedicated battery bank.
                            Ideal for learning basic conversion logic, fault clearing, and standard operational procedures.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-cyan-400 text-sm font-bold transition-colors">
                        LAUNCH SIMULATOR <span>→</span>
                    </div>
                </button>

                {/* Parallel Card */}
                <button onClick={() => setMode('PARALLEL')} className="group relative h-64 bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500 transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] text-left flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-9xl leading-none select-none group-hover:opacity-20 transition-opacity">2</div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                            <span className="text-purple-400 text-xs font-bold tracking-widest">ADVANCED</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Parallel Redundant</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Dual-module (N+1) configuration with parallel load sharing.
                            Master synchronization, load balancing, maintenance isolation, and redundancy bypass operations.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-purple-400 text-sm font-bold transition-colors">
                        LAUNCH SIMULATOR <span>→</span>
                    </div>
                </button>

                <div className="col-span-2 text-center text-slate-600 text-xs font-mono mt-8">
                    v2.5.0-STABLE | POWERED BY REACT PHYSICS ENGINE
                </div>

            </div>
        </div>
    );
};

export default Launcher;
