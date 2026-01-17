
/**
 * Audio Service - Professional Industrial Sound Effects
 * Provides realistic audio feedback for UPS simulator interactions
 */

type SoundType =
    | 'breaker_close'
    | 'breaker_open'
    | 'static_switch'
    | 'alarm_critical'
    | 'alarm_warning'
    | 'alarm_info'
    | 'button_click'
    | 'component_start'
    | 'component_stop'
    | 'success'
    | 'error';

class AudioService {
    private enabled: boolean = true;
    private volume: number = 0.5;
    private audioContext: AudioContext | null = null;

    constructor() {
        // Initialize Web Audio API context on first user interaction
        if (typeof window !== 'undefined') {
            document.addEventListener('click', this.initAudioContext, { once: true });
        }
    }

    private initAudioContext = () => {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    };

    /**
     * Generate procedural sound effects using Web Audio API
     * This avoids the need for external audio files
     */
    private createSound(type: SoundType): void {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);

        switch (type) {
            case 'breaker_close':
                // Heavy metallic click with resonance
                this.playClickSound(ctx, gainNode, now, 0.3, 150, 0.05);
                setTimeout(() => this.playClickSound(ctx, gainNode, now + 0.02, 0.15, 180, 0.03), 20);
                break;

            case 'breaker_open':
                // Lighter click with slight reverb
                this.playClickSound(ctx, gainNode, now, 0.25, 200, 0.04);
                break;

            case 'static_switch':
                // Fast relay transfer - double click
                this.playClickSound(ctx, gainNode, now, 0.2, 300, 0.02);
                setTimeout(() => this.playClickSound(ctx, gainNode, now + 0.015, 0.2, 280, 0.02), 15);
                break;

            case 'alarm_critical':
                // Urgent repeating beep
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => this.playBeep(ctx, gainNode, now + i * 0.15, 0.4, 800, 0.1), i * 150);
                }
                break;

            case 'alarm_warning':
                // Medium priority beep
                this.playBeep(ctx, gainNode, now, 0.3, 600, 0.15);
                break;

            case 'alarm_info':
                // Soft notification beep
                this.playBeep(ctx, gainNode, now, 0.2, 400, 0.1);
                break;

            case 'button_click':
                // UI button click
                this.playClickSound(ctx, gainNode, now, 0.1, 400, 0.02);
                break;

            case 'component_start':
                // Smooth ramp up sound
                this.playRampSound(ctx, gainNode, now, 0.2, 100, 300, 0.3);
                break;

            case 'component_stop':
                // Smooth ramp down sound
                this.playRampSound(ctx, gainNode, now, 0.15, 300, 100, 0.2);
                break;

            case 'success':
                // Pleasant success tone
                this.playBeep(ctx, gainNode, now, 0.25, 523.25, 0.1); // C5
                setTimeout(() => this.playBeep(ctx, gainNode, now + 0.1, 0.25, 659.25, 0.15), 100); // E5
                break;

            case 'error':
                // Harsh error buzz
                this.playBeep(ctx, gainNode, now, 0.3, 200, 0.2);
                break;
        }
    }

    private playClickSound(
        ctx: AudioContext,
        gainNode: GainNode,
        time: number,
        volume: number,
        frequency: number,
        duration: number
    ): void {
        const osc = ctx.createOscillator();
        const clickGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, time);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, time + duration);

        clickGain.gain.setValueAtTime(volume * this.volume, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(clickGain);
        clickGain.connect(gainNode);

        osc.start(time);
        osc.stop(time + duration);
    }

    private playBeep(
        ctx: AudioContext,
        gainNode: GainNode,
        time: number,
        volume: number,
        frequency: number,
        duration: number
    ): void {
        const osc = ctx.createOscillator();
        const beepGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, time);

        beepGain.gain.setValueAtTime(0, time);
        beepGain.gain.linearRampToValueAtTime(volume * this.volume, time + 0.01);
        beepGain.gain.setValueAtTime(volume * this.volume, time + duration - 0.01);
        beepGain.gain.linearRampToValueAtTime(0.01, time + duration);

        osc.connect(beepGain);
        beepGain.connect(gainNode);

        osc.start(time);
        osc.stop(time + duration);
    }

    private playRampSound(
        ctx: AudioContext,
        gainNode: GainNode,
        time: number,
        volume: number,
        startFreq: number,
        endFreq: number,
        duration: number
    ): void {
        const osc = ctx.createOscillator();
        const rampGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

        rampGain.gain.setValueAtTime(0, time);
        rampGain.gain.linearRampToValueAtTime(volume * this.volume, time + duration * 0.3);
        rampGain.gain.linearRampToValueAtTime(0.01, time + duration);

        osc.connect(rampGain);
        rampGain.connect(gainNode);

        osc.start(time);
        osc.stop(time + duration);
    }

    // Public API
    play(sound: SoundType): void {
        this.initAudioContext();
        this.createSound(sound);
    }

    setVolume(level: number): void {
        this.volume = Math.max(0, Math.min(1, level));
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    getVolume(): number {
        return this.volume;
    }
}

// Singleton instance
export const audioService = new AudioService();
