
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialStep {
    title: string;
    content: string;
    target?: string; // CSS selector for highlighting
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        title: 'Welcome to SafeOps UPS Simulator! 👋',
        content: 'This is a professional-grade training simulator for double-conversion UPS systems. You\'ll learn real operational procedures used in data centers and industrial facilities worldwide.',
        position: 'center'
    },
    {
        title: '🖱️ Interactive Single Line Diagram (SLD)',
        content: 'The SLD is FULLY INTERACTIVE! • Click any BREAKER (Q1, Q2, Q3, Q4) to toggle it OPEN/CLOSED • Click on RECT, INV, or STS boxes to open faceplate controls • You can START/STOP components and transfer the static switch directly from the diagram!',
        target: '.sld-container',
        position: 'right'
    },
    {
        title: 'Component Tooltips 💡',
        content: 'Hover over any component to see detailed information, current status, and engineering tips. This is your reference manual built into the interface!',
        position: 'center'
    },
    {
        title: 'Dashboard & Gauges',
        content: 'Monitor critical system parameters in real-time. These gauges show voltage, frequency, load, and battery status - just like a real UPS control panel.',
        target: '.dashboard',
        position: 'bottom'
    },
    {
        title: 'Waveforms & Logs',
        content: 'The bottom panel shows live voltage/current waveforms and an event log. Watch for automatic transfers and alarm conditions logged here.',
        position: 'top'
    },
    {
        title: 'Procedure Panel',
        content: 'Select from 6 real-world procedures here. Each guides you step-by-step through critical operations. Your performance is tracked for achievements!',
        target: '.procedure-panel',
        position: 'left'
    },
    {
        title: 'Realistic Physics ⚡',
        content: 'This simulator uses industrial-grade physics models: rectifier walk-in delays, Peukert battery discharge curves, thermal dynamics, and more. It behaves like real equipment!',
        position: 'center'
    },
    {
        title: 'Sound Effects & Feedback 🔊',
        content: 'Enable your audio for an immersive experience. You\'ll hear realistic breaker clicks, alarm tones, and transfer switching sounds.',
        position: 'center'
    },
    {
        title: 'Ready to Begin!',
        content: 'Start with the "Cold Start" or "Maintenance Bypass" procedures to get familiar. Click on components, read tooltips, and don\'t worry about mistakes - this is a safe training environment!',
        position: 'center'
    }
];

interface TutorialOverlayProps {
    show: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ show, onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [highlighting, setHighlighting] = useState<Element | null>(null);

    const currentTutorial = TUTORIAL_STEPS[currentStep];

    useEffect(() => {
        if (show && currentTutorial.target) {
            const element = document.querySelector(currentTutorial.target);
            setHighlighting(element);
        } else {
            setHighlighting(null);
        }
    }, [currentStep, show, currentTutorial]);

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        setCurrentStep(0);
        onSkip();
    };

    const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

    return (
        <AnimatePresence>
            {show && (
                <>
                    {/* Backdrop with spotlight effect */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400]"
                        style={{ pointerEvents: 'none' }}
                    />

                    {/* Highlight target element */}
                    {highlighting && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed z-[401] pointer-events-none"
                            style={{
                                left: highlighting.getBoundingClientRect().left - 8,
                                top: highlighting.getBoundingClientRect().top - 8,
                                width: highlighting.getBoundingClientRect().width + 16,
                                height: highlighting.getBoundingClientRect().height + 16,
                                border: '3px solid #22d3ee',
                                borderRadius: '12px',
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.7), 0 0 30px #22d3ee',
                                animation: 'pulse 2s ease-in-out infinite'
                            }}
                        />
                    )}

                    {/* Tutorial Card */}
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.3 }}
                        className="fixed z-[402] max-w-lg"
                        style={getPositionStyles(currentTutorial.position || 'center')}
                    >
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500 rounded-2xl shadow-2xl shadow-cyan-500/30 overflow-hidden">

                            {/* Progress Bar */}
                            <div className="h-2 bg-slate-700">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                                />
                            </div>

                            <div className="p-6">
                                {/* Step Counter */}
                                <div className="text-xs font-mono text-cyan-400 mb-3 uppercase tracking-widest">
                                    Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl font-black text-white mb-4 leading-tight">
                                    {currentTutorial.title}
                                </h2>

                                {/* Content */}
                                <p className="text-slate-300 leading-relaxed text-sm mb-6">
                                    {currentTutorial.content}
                                </p>

                                {/* Navigation */}
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        onClick={handleSkip}
                                        className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
                                    >
                                        Skip Tutorial
                                    </button>

                                    <div className="flex gap-2">
                                        {currentStep > 0 && (
                                            <button
                                                onClick={handlePrevious}
                                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-sm transition-colors"
                                            >
                                                ← Back
                                            </button>
                                        )}
                                        <button
                                            onClick={handleNext}
                                            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 rounded-lg text-white font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all"
                                        >
                                            {currentStep === TUTORIAL_STEPS.length - 1 ? 'Get Started! 🚀' : 'Next →'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Pulsing animation keyframes */}
                    <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          `}</style>
                </>
            )}
        </AnimatePresence>
    );
};

function getPositionStyles(position: string): React.CSSProperties {
    switch (position) {
        case 'center':
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
        case 'top':
            return {
                top: '100px',
                left: '50%',
                transform: 'translateX(-50%)'
            };
        case 'bottom':
            return {
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)'
            };
        case 'left':
            return {
                top: '50%',
                left: '100px',
                transform: 'translateY(-50%)'
            };
        case 'right':
            return {
                top: '50%',
                right: '100px',
                transform: 'translateY(-50%)'
            };
        default:
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
    }
}

// Hook to manage tutorial state - HELP IS NOW USER-CHOICE ONLY
export function useTutorial() {
    const [showTutorial, setShowTutorial] = useState(false);

    // REMOVED: No auto-show on first visit - help is now user-initiated only

    const completeTutorial = () => {
        setShowTutorial(false);
    };

    const skipTutorial = () => {
        setShowTutorial(false);
    };

    const showHelp = () => {
        setShowTutorial(true);
    };

    return {
        showTutorial,
        completeTutorial,
        skipTutorial,
        showHelp
    };
}
