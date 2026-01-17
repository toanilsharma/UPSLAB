
/**
 * Achievement Service - Gamification & Progress Tracking
 * Tracks user accomplishments and unlocks achievements
 */

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedAt?: string;
    category: 'procedures' | 'mastery' | 'speed' | 'streak' | 'discovery';
}

export interface SessionStats {
    proceduresCompleted: number;
    perfectProcedures: number;
    totalMistakes: number;
    fastestProcedureTime: number;
    componentsExplored: Set<string>;
    faultsRecovered: number;
    sessionStartTime: string;
    bestStreak: number;
}

class AchievementService {
    private achievements: Achievement[] = [];
    private stats: SessionStats;

    constructor() {
        this.loadStats();
        this.initializeAchievements();
    }

    private initializeAchievements() {
        this.achievements = [
            // Procedure Achievements
            {
                id: 'first_procedure',
                name: 'First Steps',
                description: 'Complete your first procedure',
                icon: '🎯',
                category: 'procedures',
                unlocked: false
            },
            {
                id: 'maint_bypass_master',
                name: 'Maintenance Pro',
                description: 'Complete Maintenance Bypass procedure perfectly',
                icon: '🔧',
                category: 'procedures',
                unlocked: false
            },
            {
                id: 'black_start_hero',
                name: 'Dark Knight',
                description: 'Successfully execute Black Start recovery',
                icon: '⚡',
                category: 'procedures',
                unlocked: false
            },
            {
                id: 'all_procedures',
                name: 'Operations Expert',
                description: 'Complete all 6 procedures',
                icon: '🏆',
                category: 'procedures',
                unlocked: false
            },

            // Speed Achievements
            {
                id: 'speed_demon',
                name: 'Speed Demon',
                description: 'Complete any procedure in under 60 seconds',
                icon: '⚡',
                category: 'speed',
                unlocked: false
            },
            {
                id: 'lightning_fast',
                name: 'Lightning Fast',
                description: 'Complete procedure in under 30 seconds',
                icon: '⚡',
                category: 'speed',
                unlocked: false
            },

            // Mastery Achievements
            {
                id: 'flawless_victory',
                name: 'Flawless Victory',
                description: 'Complete 5 procedures with zero mistakes',
                icon: '💎',
                category: 'mastery',
                unlocked: false
            },
            {
                id: 'perfectionist',
                name: 'Perfectionist',
                description: 'Complete 10 procedures without any errors',
                icon: '🌟',
                category: 'mastery',
                unlocked: false
            },
            {
                id: 'error_free_streak',
                name: 'Untouchable',
                description: 'Achieve 3 perfect procedures in a row',
                icon: '🔥',
                category: 'streak',
                unlocked: false
            },

            // Discovery Achievements
            {
                id: 'curious_mind',
                name: 'Curious Mind',
                description: 'Inspect all UPS components',
                icon: '🔍',
                category: 'discovery',
                unlocked: false
            },
            {
                id: 'fault_handler',
                name: 'Fault Handler',
                description: 'Recover from 5 different fault conditions',
                icon: '🛡️',
                category: 'discovery',
                unlocked: false
            },
            {
                id: 'parallel_master',
                name: 'Parallel Master',
                description: 'Complete a parallel redundancy procedure',
                icon: '⚙️',
                category: 'procedures',
                unlocked: false
            }
        ];

        // Load unlocked state from localStorage
        const saved = localStorage.getItem('ups_achievements');
        if (saved) {
            try {
                const savedAchievements = JSON.parse(saved);
                this.achievements = this.achievements.map(achievement => {
                    const saved = savedAchievements.find((a: Achievement) => a.id === achievement.id);
                    return saved || achievement;
                });
            } catch (e) {
                console.error('Failed to load achievements', e);
            }
        }
    }

    private loadStats() {
        const saved = localStorage.getItem('ups_stats');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.stats = {
                    ...parsed,
                    componentsExplored: new Set(parsed.componentsExplored || [])
                };
            } catch (e) {
                this.stats = this.getDefaultStats();
            }
        } else {
            this.stats = this.getDefaultStats();
        }
    }

    private getDefaultStats(): SessionStats {
        return {
            proceduresCompleted: 0,
            perfectProcedures: 0,
            totalMistakes: 0,
            fastestProcedureTime: Infinity,
            componentsExplored: new Set<string>(),
            faultsRecovered: 0,
            sessionStartTime: new Date().toISOString(),
            bestStreak: 0
        };
    }

    private saveStats() {
        const toSave = {
            ...this.stats,
            componentsExplored: Array.from(this.stats.componentsExplored)
        };
        localStorage.setItem('ups_stats', JSON.stringify(toSave));
    }

    private saveAchievements() {
        localStorage.setItem('ups_achievements', JSON.stringify(this.achievements));
    }

    private unlock(achievementId: string): boolean {
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (achievement && !achievement.unlocked) {
            achievement.unlocked = true;
            achievement.unlockedAt = new Date().toISOString();
            this.saveAchievements();
            return true;
        }
        return false;
    }

    // Public API
    onProcedureComplete(procedureId: string, mistakes: number, timeSeconds: number) {
        this.stats.proceduresCompleted++;

        if (mistakes === 0) {
            this.stats.perfectProcedures++;
            this.stats.bestStreak++;

            // Check for perfect procedure achievements
            if (this.stats.perfectProcedures >= 5) {
                this.unlock('flawless_victory');
            }
            if (this.stats.perfectProcedures >= 10) {
                this.unlock('perfectionist');
            }
            if (this.stats.bestStreak >= 3) {
                this.unlock('error_free_streak');
            }
        } else {
            this.stats.bestStreak = 0;
            this.stats.totalMistakes += mistakes;
        }

        // Speed achievements
        if (timeSeconds < 60) {
            this.unlock('speed_demon');
        }
        if (timeSeconds < 30) {
            this.unlock('lightning_fast');
        }

        // Fastesttime
        if (timeSeconds < this.stats.fastestProcedureTime) {
            this.stats.fastestProcedureTime = timeSeconds;
        }

        // Specific procedure achievements
        if (this.stats.proceduresCompleted === 1) {
            this.unlock('first_procedure');
        }
        if (procedureId === 'maint_bypass' && mistakes === 0) {
            this.unlock('maint_bypass_master');
        }
        if (procedureId === 'black_start') {
            this.unlock('black_start_hero');
        }
        if (procedureId.includes('parallel')) {
            this.unlock('parallel_master');
        }

        this.saveStats();

        // Return any newly unlocked achievements
        return this.getRecentlyUnlocked();
    }

    onComponentInspected(componentId: string) {
        this.stats.componentsExplored.add(componentId);

        // Check if all components explored
        const requiredComponents = ['rectifier', 'inverter', 'staticSwitch', 'battery', 'Q1', 'Q2', 'Q3', 'Q4', 'QF1'];
        if (requiredComponents.every(c => this.stats.componentsExplored.has(c))) {
            this.unlock('curious_mind');
        }

        this.saveStats();
    }

    onFaultRecovered(faultType: string) {
        this.stats.faultsRecovered++;

        if (this.stats.faultsRecovered >= 5) {
            this.unlock('fault_handler');
        }

        this.saveStats();
    }

    getAchievements(): Achievement[] {
        return [...this.achievements];
    }

    getStats(): SessionStats {
        return { ...this.stats, componentsExplored: new Set(this.stats.componentsExplored) };
    }

    getRecentlyUnlocked(): Achievement[] {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        return this.achievements.filter(a =>
            a.unlocked && a.unlockedAt && a.unlockedAt > fiveMinutesAgo
        );
    }

    getProgress(): { unlocked: number; total: number; percentage: number } {
        const unlocked = this.achievements.filter(a => a.unlocked).length;
        const total = this.achievements.length;
        return {
            unlocked,
            total,
            percentage: Math.round((unlocked / total) * 100)
        };
    }

    reset() {
        this.stats = this.getDefaultStats();
        this.achievements.forEach(a => {
            a.unlocked = false;
            a.unlockedAt = undefined;
        });
        this.saveStats();
        this.saveAchievements();
    }
}

export const achievementService = new AchievementService();
