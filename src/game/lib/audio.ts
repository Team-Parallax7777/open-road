// Ambient audio engine built on WebAudio synthesis — no external samples
// needed. We layer:
//   - A soft tanpura-style drone (two detuned saw oscillators through a
//     lowpass + slow LFO on the filter cutoff for a breathing feel).
//   - A subtle wind noise (filtered white noise whose volume tracks the
//     vehicle's speed).
//   - An engine hum whose pitch tracks vehicle speed.
//
// All voices start silent and fade in on user gesture (browser policy).

export class AmbientAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private started = false;
  private muted = false;

  start() {
    if (this.started) return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    // --- Drone (tanpura-inspired) -----------------------------------------
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.18;
    droneGain.connect(master);
    this.droneGain = droneGain;

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 600;
    droneFilter.Q.value = 4;
    droneFilter.connect(droneGain);

    // Sa (root) and Pa (fifth) — a calm, open drone.
    const rootFreq = 110; // A2
    const fifthFreq = 165; // E3
    const oscs: OscillatorNode[] = [];
    for (const f of [rootFreq, rootFreq * 1.005, fifthFreq, fifthFreq * 0.995]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.connect(droneFilter);
      o.start();
      oscs.push(o);
    }

    // Slow LFO on the filter for a breathing quality.
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(droneFilter.frequency);
    lfo.start();

    // --- Wind (filtered white noise) --------------------------------------
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 500;
    windFilter.Q.value = 0.7;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    noise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    noise.start();
    this.windGain = windGain;
    this.noiseSource = noise;

    // --- Engine hum -------------------------------------------------------
    const engineOsc = ctx.createOscillator();
    engineOsc.type = "triangle";
    engineOsc.frequency.value = 60;
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    this.engineOsc = engineOsc;
    this.engineGain = engineGain;

    // Fade in master.
    master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2.5);
    this.started = true;
  }

  setEngine(speedFrac: number, baseHz: number) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const target = baseHz + speedFrac * 140;
    this.engineOsc.frequency.setTargetAtTime(
      target,
      this.ctx.currentTime,
      0.08,
    );
    this.engineGain.gain.setTargetAtTime(
      0.04 + speedFrac * 0.1,
      this.ctx.currentTime,
      0.1,
    );
  }

  setWind(speedFrac: number) {
    if (!this.ctx || !this.windGain) return;
    this.windGain.gain.setTargetAtTime(
      0.02 + speedFrac * 0.18,
      this.ctx.currentTime,
      0.2,
    );
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(
      m ? 0 : 0.9,
      this.ctx.currentTime,
      0.3,
    );
  }

  isMuted() {
    return this.muted;
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  dispose() {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.started = false;
    }
  }
}

let singleton: AmbientAudio | null = null;
export function getAmbient(): AmbientAudio {
  if (!singleton) singleton = new AmbientAudio();
  return singleton;
}
