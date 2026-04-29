import bgmAudioUrl from './audio.mp3';

class NeonAudio {
    ctx: AudioContext | null = null;
    initialized = false;

    globalVolume = 1.0;
    
    globalGain: GainNode | null = null;
    sfxGain: GainNode | null = null;
    
    bgmElement: HTMLAudioElement | null = null;

    init() {
        if (!this.initialized) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                
                const savedVol = localStorage.getItem('neon_volume');
                if (savedVol !== null) {
                    this.globalVolume = parseFloat(savedVol);
                }

                this.globalGain = this.ctx.createGain();
                this.sfxGain = this.ctx.createGain();
                
                this.globalGain.gain.value = this.globalVolume;
                
                this.sfxGain.connect(this.globalGain);
                this.globalGain.connect(this.ctx.destination);

                this.initialized = true;
            }
            
            if (!this.bgmElement) {
                this.bgmElement = new Audio(bgmAudioUrl);
                this.bgmElement.loop = true;
                this.bgmElement.volume = this.globalVolume;
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(level: number) {
        this.globalVolume = level;
        if (this.globalGain && this.ctx) {
            this.globalGain.gain.setValueAtTime(level, this.ctx.currentTime);
        }
        if (this.bgmElement) {
            this.bgmElement.volume = level;
        }
        localStorage.setItem('neon_volume', level.toString());
    }

    playGameBGM() {
        this.init();
        if (this.bgmElement) {
            this.bgmElement.play().catch(e => console.log('BGM play prevented:', e));
        }
    }

    stopGameBGM() {
        if (this.bgmElement) {
            this.bgmElement.pause();
            this.bgmElement.currentTime = 0;
        }
    }

    playTap() {
        this.init();
        if (!this.ctx || !this.sfxGain) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        osc.start(now);
        osc.stop(now + 0.05);
    }

    playSlide() {
        this.init();
        if (!this.ctx) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        
        // The satisfying futuristic "Thwock-tick"
        
        // 1. The metallic impact (thump)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(250, now);
        osc1.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        
        const filter1 = ctx.createBiquadFilter();
        filter1.type = 'lowpass';
        filter1.frequency.setValueAtTime(2000, now);
        filter1.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.sfxGain!);
        
        osc1.start(now);
        osc1.stop(now + 0.1);
        
        // 2. The glassy transient
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1500, now);
        osc2.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.4, now + 0.002);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        osc2.connect(gain2);
        gain2.connect(this.sfxGain!);
        
        osc2.start(now);
        osc2.stop(now + 0.06);

        // 3. A delayed "click" for snapping into place
        const snapTime = now + 0.04;
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(2400, snapTime);
        osc3.frequency.exponentialRampToValueAtTime(1200, snapTime + 0.03);
        
        gain3.gain.setValueAtTime(0, snapTime);
        gain3.gain.linearRampToValueAtTime(0.2, snapTime + 0.002);
        gain3.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.03);
        
        osc3.connect(gain3);
        gain3.connect(this.sfxGain!);
        
        osc3.start(snapTime);
        osc3.stop(snapTime + 0.04);
    }

    playError() {
        this.init();
        if (!this.ctx || !this.sfxGain) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        
        // Soft "thud" for invalid move or dropping back to place
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }

    playWin() {
        this.init();
        if (!this.ctx || !this.sfxGain) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        
        const notes = [440, 554.37, 659.25, 880]; // A major chord
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(this.sfxGain!);
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const time = now + i * 0.1;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
            gain.gain.linearRampToValueAtTime(0.001, time + 0.4);
            
            osc.start(time);
            osc.stop(time + 0.4);
        });
    }

    playCollect() {
        this.init();
        if (!this.ctx || !this.sfxGain) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playShatter() {
        this.init();
        if (!this.ctx || !this.sfxGain) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        
        // Multi-oscillator noise burst for shattering effect
        const count = 5;
        for (let i = 0; i < count; i++) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.connect(g);
            g.connect(this.sfxGain);
            
            osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
            const freq = 400 + Math.random() * 800;
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.2);
            
            g.gain.setValueAtTime(0.15 / count, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + Math.random() * 0.1);
            
            osc.start(now);
            osc.stop(now + 0.3);
        }
        
        // Low thump
        const b = ctx.createOscillator();
        const bg = ctx.createGain();
        b.connect(bg);
        bg.connect(this.sfxGain);
        b.frequency.setValueAtTime(150, now);
        b.frequency.exponentialRampToValueAtTime(10, now + 0.15);
        bg.gain.setValueAtTime(0.3, now);
        bg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        b.start(now);
        b.stop(now + 0.15);
    }
}

export const audio = new NeonAudio();
