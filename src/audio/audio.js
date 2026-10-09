// Original short notes and synthesized effects: no sampled or remote audio.
export function createAudio() {
  let context, master, userSound = true, platformMuted = false, active = false, star = false;
  let nextNote = 0, note = 0, lastFlapAt = -Infinity;
  let pendingEvents = [], pendingUnlock = null;
  const sources = new Set();
  const normal = [0, 4, 7, 12, 7, 4, 2, 7, 9, 7, 4, 2, 0, 4, 7, 4];
  const golden = [12, 16, 19, 24, 19, 16, 14, 19];
  const audible = () => context?.state === 'running' && userSound && !platformMuted;
  function hold(gain, at) {
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(at);
    else { const value = gain.value; gain.cancelScheduledValues(at); gain.setValueAtTime(value, at); }
  }
  function stopSources() {
    for (const source of sources) {
      const at = context.currentTime;
      // Release ongoing notes instead of cutting a waveform mid-cycle.
      hold(source.envelope, at);
      source.envelope.linearRampToValueAtTime(0, at + .012);
      try { source.stop(at + .016); } catch {}
    }
    sources.clear(); pendingEvents = []; nextNote = 0; lastFlapAt = -Infinity;
  }
  function track(source, gain) {
    sources.add(source);
    source.envelope = gain.gain;
    source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); };
  }
  function tone(frequency, at, duration, volume = .035, type = 'sine', target = frequency) {
    if (!audible()) return;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, target), at + duration);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration - .012);
    gain.gain.linearRampToValueAtTime(0, at + duration);
    oscillator.connect(gain); gain.connect(master); track(oscillator, gain);
    oscillator.start(at); oscillator.stop(at + duration + .01);
  }
  function unlock() {
    if (pendingUnlock) return pendingUnlock;
    pendingUnlock = (async () => {
      try {
        if (!context) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return false;
          context = new AudioContext(); master = context.createGain(); master.connect(context.destination);
          master.gain.value = userSound && !platformMuted ? .7 : 0;
        }
        if (context.state !== 'running') await context.resume();
        if (!nextNote) nextNote = context.currentTime + .02;
        const queued = pendingEvents; pendingEvents = [];
        if (queued.length) consume(queued.filter(({ queuedAt }) => performance.now() - queuedAt < 500).map(({ event }) => event));
        return context.state === 'running';
      } catch { pendingEvents = []; return false; }
    })();
    pendingUnlock.finally(() => { pendingUnlock = null; });
    return pendingUnlock;
  }
  function setMuted(sound, muted) {
    if (userSound === sound && platformMuted === muted) return;
    userSound = sound; platformMuted = muted;
    if (master) {
      hold(master.gain, context.currentTime);
      master.gain.linearRampToValueAtTime(sound && !muted ? .7 : 0, context.currentTime + .012);
    }
    if (!sound || muted) stopSources();
  }
  function setPlaying(value, invincible = false) {
    if (active !== value || star !== invincible) { stopSources(); note = 0; }
    active = value; star = invincible;
  }
  function tick() {
    if (!active || !audible()) return;
    const now = context.currentTime, melody = star ? golden : normal, beat = star ? .17 : .26;
    if (nextNote < now) nextNote = now + .015;
    while (nextNote < now + .13) {
      const midi = 60 + melody[note % melody.length];
      tone(440 * 2 ** ((midi - 69) / 12), nextNote, .13, .028, 'sine');
      if (note % 4 === 0) tone(130.81, nextNote, .16, .025, 'triangle');
      nextNote += beat; note++;
    }
  }
  function consume(events) {
    if (!audible()) {
      if (context && userSound && !platformMuted) {
        pendingEvents = [...pendingEvents, ...events.map(event => ({ event, queuedAt: performance.now() }))].slice(-8);
      }
      return;
    }
    const now = context.currentTime;
    for (const event of events) {
      if (event.type === 'flap') {
        // Keep every gameplay flap; bound audio stacking from rapid taps.
        if (now - lastFlapAt < .045) continue;
        lastFlapAt = now;
        tone(240, now + .005, .105, .085, 'sine', 115);
        tone(360, now + .005, .085, .025, 'sine', 170);
      } else if (event.type === 'damage') tone(310, now, .19, .055, 'triangle', 100);
      else if (event.type === 'perfect') {
        // Two-note shimmering confirmation, reserved for precisely centered gates.
        const pitch = 690 + Math.min(event.combo || 1, 7) * 48;
        tone(pitch, now, .15, .047, 'triangle', pitch * 1.22);
        tone(pitch * 1.5, now + .048, .21, .032, 'sine', pitch * 1.86);
      } else if (event.type === 'rush-start') {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, now + i * .065, .18, .05, 'triangle'));
      } else if (event.type === 'heal' || event.type === 'star') {
        [523.25, 659.25, 783.99].forEach((f, i) => tone(f, now + i * .08, .13, .04));
      } else if (event.type === 'gameover') {
        [392, 329.63, 261.63].forEach((f, i) => tone(f, now + i * .12, .17, .035));
      }
    }
  }
  function suspend() { stopSources(); if (context?.state === 'running') void context.suspend().catch(() => {}); }
  return {
    unlock, setMuted, setPlaying, tick, consume, suspend,
    dispose() { stopSources(); if (context) void context.close().catch(() => {}); },
  };
}
