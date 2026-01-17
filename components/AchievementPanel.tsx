
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { achievementService, Achievement } from '../services/achievementService';

interface AchievementPanelProps {
    visible: boolean;
    onClose: () => void;
}

export const AchievementPanel: React.FC<AchievementPanelProps> = ({ visible, onClose }) => {
    const achievements = achievementService.getAchievements();
    const stats = achievementService.getStats();
    const progress = achievementService.getProgress();

    const categories = {
        procedures: achievements.filter(a => a.category === 'procedures'),
        speed: achievements.filter(a => a.category === 'speed'),
        mastery: achievements.filter(a => a.category === 'mastery'),
        streak: achievements.filter(a => a.category === 'streak'),
        discovery: achievements.filter(a => a.category === 'discovery')
    };

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[201] flex items-center justify-center p-8"
                    >
                        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">

                            {/* Header */}
                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-cyan-500/30 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-black text-cyan-400 tracking-tight">
                                            🏆 Achievements
                                        </h2>
                                        <p className="text-slate-400 text-sm mt-1">
                                            {progress.unlocked} of {progress.total} unlocked ({progress.percentage}%)
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 font-bold text-sm transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4 bg-slate-800 rounded-full h-3 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress.percentage}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                                    />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">

                                {/* Stats Overview */}
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                        <div className="text-3xl font-black text-cyan-400">{stats.proceduresCompleted}</div>
                                        <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Procedures Done</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                        <div className="text-3xl font-black text-green-400">{stats.perfectProcedures}</div>
                                        <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Perfect Runs</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                        <div className="text-3xl font-black text-orange-400">{stats.bestStreak}</div>
                                        <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Best Streak</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                        <div className="text-3xl font-black text-purple-400">
                                            {stats.fastestProcedureTime === Infinity ? '--' : `${Math.round(stats.fastestProcedureTime)}s`}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Fastest Time</div>
                                    </div>
                                </div>

                                {/* Achievement Groups */}
                                {Object.entries(categories).map(([category, items]) => (
                                    items.length > 0 && (
                                        <div key={category} className="mb-6">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <span className="w-12 h-px bg-slate-700"></span>
                                                {category}
                                                <span className="flex-1 h-px bg-slate-700"></span>
                                            </h3>

                                            <div className="grid grid-cols-2 gap-3">
                                                {items.map(achievement => (
                                                    <motion.div
                                                        key={achievement.id}
                                                        whileHover={{ scale: achievement.unlocked ? 1.02 : 1 }}
                                                        className={`
                              p-4 rounded-lg border transition-all
                              ${achievement.unlocked
                                                                ? 'bg-gradient-to-br from-cyan-950/50 to-purple-950/50 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                                                                : 'bg-slate-800/30 border-slate-700/50 opacity-60'
                                                            }
                            `}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`text-3xl ${achievement.unlocked ? '' : 'grayscale opacity-40'}`}>
                                                                {achievement.icon}
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className={`font-bold text-sm ${achievement.unlocked ? 'text-cyan-400' : 'text-slate-500'}`}>
                                                                    {achievement.name}
                                                                </h4>
                                                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                                    {achievement.description}
                                                                </p>
                                                                {achievement.unlocked && achievement.unlockedAt && (
                                                                    <div className="text-[10px] text-slate-500 mt-2">
                                                                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {achievement.unlocked && (
                                                                <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                                                                    <span className="text-white text-xs">✓</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// Achievement Notification Toast
interface AchievementToastProps {
    achievement: Achievement | null;
    onDismiss: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onDismiss }) => {
    React.useEffect(() => {
        if (achievement) {
            const timer = setTimeout(onDismiss, 5000);
            return () => clearTimeout(timer);
        }
    }, [achievement, onDismiss]);

    return (
        <AnimatePresence>
            {achievement && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -50, scale: 0.9 }}
                    className="fixed top-24 left-1/2 -translate-x-1/2 z-[300]"
                >
                    <div className="bg-gradient-to-br from-cyan-900 to-purple-900 border-2 border-cyan-400 rounded-xl shadow-2xl shadow-cyan-500/50 p-5 min-w-[350px]">
                        <div className="flex items-center gap-4">
                            <motion.div
                                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.5, repeat: 2 }}
                                className="text-5xl"
                            >
                                {achievement.icon}
                            </motion.div>
                            <div className="flex-1">
                                <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">
                                    Achievement Unlocked!
                                </div>
                                <h3 className="text-xl font-black text-white mb-1">
                                    {achievement.name}
                                </h3>
                                <p className="text-sm text-cyan-200">
                                    {achievement.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
