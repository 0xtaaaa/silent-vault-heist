// Sound, all procedural: no audio files, just oscillators and filtered
// noise through WebAudio. Footsteps tell the player where a guard is,
// the sting says the run just went loud, the chime says a relic is pocketed.
export function createAudio() {
  let ctx = null;
  let master = null;
  let hum = null;
  let lastStep = 0;
  let lastGuardStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
      // The vault's ambient hum: a low sine plus a slow tremolo.
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 52;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.035;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.4;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(humGain.gain);
      osc.connect(humGain);
      humGain.connect(master);
      osc.start();
      lfo.start();
      hum = osc;
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, freq) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  return {
    /** Call every frame; the player's own steps tick from their pace. */
    step(running, moving, now) {
      if (!moving) return;
      const interval = running ? 0.28 : 0.45;
      if (now - lastStep < interval) return;
      lastStep = now;
      noiseBurst(0.06, running ? 0.16 : 0.08, running ? 900 : 500);
    },
    /** A guard's step, louder the closer they are (0..1). */
    guardStep(closeness, now) {
      if (closeness <= 0.05) return;
      if (now - lastGuardStep < 0.5) return;
      lastGuardStep = now;
      noiseBurst(0.07, 0.05 + closeness * 0.16, 380);
    },
    pickup() {
      tone(880, 0.12, 'sine', 0.22);
      tone(1318, 0.18, 'sine', 0.18, 0.07);
    },
    coin() {
      tone(2400, 0.05, 'square', 0.1);
      tone(1800, 0.09, 'square', 0.08, 0.05);
    },
    emp() {
      tone(1200, 0.5, 'sawtooth', 0.14, 0, 90);
      noiseBurst(0.25, 0.12, 2400);
    },
    alert() {
      tone(220, 0.32, 'sawtooth', 0.2, 0, 330);
      tone(233, 0.32, 'sawtooth', 0.16, 0.02, 349);
    },
    suspicious() {
      tone(520, 0.14, 'triangle', 0.16, 0, 660);
    },
    caught() {
      tone(392, 0.25, 'sawtooth', 0.2, 0, 196);
      tone(196, 0.5, 'sawtooth', 0.2, 0.22, 98);
    },
    levelClear() {
      tone(523, 0.14, 'sine', 0.2);
      tone(659, 0.14, 'sine', 0.2, 0.12);
      tone(784, 0.26, 'sine', 0.2, 0.24);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.2, i * 0.13));
    },
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
  };
}
