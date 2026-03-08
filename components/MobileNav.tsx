
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Layout, Terminal, BookOpen } from 'lucide-react';

export type MobileTab = 'SLD' | 'METRICS' | 'LOGS' | 'PROCEDURES';

interface MobileNavProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'SLD', label: 'Schematic', icon: Layout },
        { id: 'METRICS', label: 'Metrics', icon: Activity },
        { id: 'LOGS', label: 'Events', icon: Terminal },
        { id: 'PROCEDURES', label: 'Guides', icon: BookOpen },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-md border-t border-cyan-500/20 px-2 flex items-center justify-around z-50">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id as MobileTab)}
                        className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-cyan-500/10' : ''}`}>
                            <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
                        {isActive && (
                            <motion.div
                                layoutId="activeTabMobile"
                                className="absolute -bottom-1 w-1 h-1 bg-cyan-400 rounded-full"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
