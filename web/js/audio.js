// Chiptune music and sound effects, synthesised live with the Web Audio API in
// the style of the NES sound chip: two pulse channels (lead and arpeggio), a
// triangle bass and a noise drum kit. No audio files. All tunes are original.
//
// Browsers only allow sound after a tap or key press, so nothing plays until
// unlock() runs from one; music asked for before then starts at that moment.

import { THEME_SONGS } from './songs.js';

const PREFS_KEY = 'slop-sound';
const LOOKAHEAD = 0.15;  // seconds of music scheduled ahead of the clock
const TICK_MS = 40;

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let noiseBuf = null;
let crunchBuf = null;
const waves = {};
let prefs = { music: true, sfx: true };
try { Object.assign(prefs, JSON.parse(globalThis.localStorage?.getItem(PREFS_KEY)) || {}); } catch { /* storage unavailable */ }

const MUSIC_LEVEL = 0.32;
const SFX_LEVEL = 0.5;

function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
}

// A pulse wave with the given duty cycle (0.125, 0.25 or 0.5 on the NES).
function pulseWave(duty) {
  const n = 64;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty);
    im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty);
  }
  return ctx.createPeriodicWave(re, im);
}

// Sample-and-hold noise: `hold` samples per random level. Longer holds sound
// lower and grittier, like the NES noise channel at a low rate.
function noiseBuffer(hold) {
  const len = ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let v = 0;
  for (let i = 0; i < len; i++) {
    if (i % hold === 0) v = Math.random() < 0.5 ? -1 : 1;
    d[i] = v;
  }
  return buf;
}

function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = prefs.music ? MUSIC_LEVEL : 0;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = prefs.sfx ? SFX_LEVEL : 0;
  sfxBus.connect(master);
  waves[0.125] = pulseWave(0.125);
  waves[0.25] = pulseWave(0.25);
  waves[0.5] = pulseWave(0.5);
  noiseBuf = noiseBuffer(1);
  crunchBuf = noiseBuffer(6);
  return true;
}

// A tiny silent WAV. Playing it through an <audio> element in a tap moves iOS
// into its "media playback" audio session, so the game is heard even with
// the ring/silent switch on silent (Web Audio alone counts as a ringer sound).
function silentWav() {
  const n = 800;
  const b = new Uint8Array(44 + n);
  const v = new DataView(b.buffer);
  const str = (o, t) => [...t].forEach((c, i) => { b[o + i] = c.charCodeAt(0); });
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
let keepAlive = null;

// Call from any user gesture. Safe to call repeatedly.
export function unlock() {
  // Newer iOS lets a page ask for the playback session directly.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* unsupported */ }
  if (!init()) return;
  // iOS also reports 'interrupted' (after a call, or coming back to the app).
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  if (!keepAlive && typeof Audio !== 'undefined') {
    keepAlive = new Audio(silentWav());
    keepAlive.loop = true;
    keepAlive.setAttribute('playsinline', '');
  }
  if (keepAlive?.paused && !document.hidden) keepAlive.play().catch(() => {});
  if (!timer && wanted) startTrack(wanted);
}

// Stop everything while the app is hidden (phones keep tabs alive).
globalThis.document?.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) {
    keepAlive?.pause();
    ctx.suspend().catch(() => {});
  } else if (ctx.state !== 'running') ctx.resume().catch(() => {});
});

export const musicOn = () => prefs.music;
export const sfxOn = () => prefs.sfx;

export function setMusic(on) {
  prefs.music = on;
  savePrefs();
  if (musicBus) musicBus.gain.setTargetAtTime(on ? MUSIC_LEVEL * duck : 0, ctx.currentTime, 0.05);
}
export function setSfx(on) {
  prefs.sfx = on;
  savePrefs();
  if (sfxBus) sfxBus.gain.setTargetAtTime(on ? SFX_LEVEL : 0, ctx.currentTime, 0.05);
}

let duck = 1;
// Quieter music behind the pause menu.
export function duckMusic(on) {
  duck = on ? 0.4 : 1;
  if (musicBus && prefs.music) musicBus.gain.setTargetAtTime(MUSIC_LEVEL * duck, ctx.currentTime, 0.1);
}

// ── Voices ─────────────────────────────────────────────────────────────────
const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// 'C#4', 'Bb3' → MIDI number.
function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

function tone(bus, { wave = 'square', f, f2, t, dur, vol, attack = 0.004, release = 0.03, vibrato = 0 }) {
  const o = ctx.createOscillator();
  if (typeof wave === 'number') o.setPeriodicWave(waves[wave]);
  else o.type = wave;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, Math.max(t + attack, t + dur - release));
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(bus);
  if (vibrato && dur > 0.3) {
    // A late, gentle wobble on long notes, as NES composers liked.
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 6;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f * vibrato, t + Math.min(0.4, dur));
    lfo.connect(depth).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.02);
  }
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(bus, { t, dur, vol, rate = 1, gritty = false, cutoff = 0, cutoff2 = 0 }) {
  const s = ctx.createBufferSource();
  s.buffer = gritty ? crunchBuf : noiseBuf;
  s.playbackRate.value = rate;
  s.loop = true;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  let out = s;
  if (cutoff) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff, t);
    if (cutoff2) lp.frequency.exponentialRampToValueAtTime(cutoff2, t + dur);
    out = s.connect(lp);
  }
  out.connect(g).connect(bus);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

// ── Music ──────────────────────────────────────────────────────────────────
// Each track: tempo, and per channel a list of [note, sixteenths] (null rests),
// or a drum string with one character per sixteenth (k kick, s snare, h hat).
// Chords drive the bass and arpeggio channels.

// 'Dm', 'Bb', 'A7', 'Gaug', 'C#dim' → the bass root (MIDI) and the chord's
// intervals above it.
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], aug: [0, 4, 8], dim: [0, 3, 6] };
function chord(name) {
  const [, r, q] = /^([A-G][#b]?)(.*)$/.exec(name);
  let root = midi(`${r}2`);
  if (root % 12 >= 10) root -= 12; // Bb and B sit an octave down
  return { root, tones: QUALITY[q] };
}

// Driving octave bass: root low/high on every eighth, NES style.
function octaveBass(chords) {
  const out = [];
  for (const c of chords) {
    const { root } = chord(c);
    for (let i = 0; i < 8; i++) out.push([i % 2 ? root + 12 : root, 2]);
  }
  return out;
}
// Steady root-fifth bass for slower tunes.
function walkBass(chords) {
  const out = [];
  for (const c of chords) {
    const { root, tones } = chord(c);
    const fifth = root + tones[2];
    out.push([root, 4], [fifth, 4], [root + 12, 4], [fifth, 4]);
  }
  return out;
}
// Oom-pah: root and the fifth below on the beats, gaps for the "pah".
function oompahBass(chords) {
  const out = [];
  for (const c of chords) {
    const { root, tones } = chord(c);
    const low = root + tones[2] - 12;
    out.push([root, 2], [null, 2], [low, 2], [null, 2], [root, 2], [null, 2], [low, 2], [null, 2]);
  }
  return out;
}
// Jazz walking bass: root, third, fifth, then a half-step into the next chord.
function jazzBass(chords) {
  return chords.flatMap((c, i) => {
    const { root, tones } = chord(c);
    const next = chord(chords[(i + 1) % chords.length]).root;
    return [[root, 4], [root + tones[1], 4], [root + tones[2], 4], [next + (next > root ? -1 : 1), 4]];
  });
}
// A galloping horseback rhythm on the root and fifth.
function gallopBass(chords) {
  const out = [];
  for (const c of chords) {
    const { root, tones } = chord(c);
    for (const n of [root, root, root + tones[2], root + 12]) out.push([n, 2], [n, 1], [n, 1]);
  }
  return out;
}
const BASS = { octave: octaveBass, walk: walkBass, oompah: oompahBass, jazz: jazzBass, gallop: gallopBass };

// The chord's notes from `oct` up, in the order of `pattern` (indexes into the
// chord, wrapping), `len` sixteenths each.
function broken(chords, oct, len, pattern) {
  const out = [];
  for (const c of chords) {
    const { root, tones } = chord(c);
    const base = root % 12 + 12 * (oct + 1);
    for (let i = 0; i < 16 / len; i++) out.push([base + tones[pattern[i % pattern.length] % tones.length], len]);
  }
  return out;
}
// Fast broken chords on the quiet pulse channel.
function arpeggio(chords, oct = 4) { return broken(chords, oct, 1, [0, 1, 2, 1]); }
// Off-beat chord stabs: the "pah" of oom-pah.
function stabs(chords, oct = 4) {
  return broken(chords, oct, 2, [1, 2]).map(([n], i) => (i % 2 ? [n, 2] : [null, 2]));
}
const ARP = {
  up: (cs, o) => (chord(cs[0]).tones.length > 3 ? broken(cs, o, 1, [0, 1, 2, 3]) : arpeggio(cs, o)),
  slow: (cs, o) => broken(cs, o, 2, [0, 1, 2, 1]),
  stab: stabs,
  none: (cs) => [[null, cs.length * 16]],
};

// 'E5:2 G5:2 -:4' → [['E5', 2], ['G5', 2], [null, 4]]
const melody = (text) => text.trim().split(/\s+/).map((tok) => {
  const [n, len] = tok.split(':');
  return [n === '-' ? null : n, Number(len)];
});

// A theme's song from songs.js, in the same shape as the tracks below.
function themeTrack(song) {
  const sections = [song.A, song.B];
  const chords = sections.map((sec) => sec.chords.split(' '));
  return {
    bpm: song.bpm,
    voices: song.voices,
    lead: sections.flatMap((sec) => melody(sec.lead)),
    bass: chords.flatMap((cs) => BASS[song.bass](cs)),
    arp: chords.flatMap((cs) => ARP[song.arp](cs, song.arpOct ?? 4)),
    drums: sections.map((sec) => sec.drums[0].repeat(7) + sec.drums[1]).join(''),
  };
}

const BEAT = 'k.h.s.h.kkh.s.hh';
const FILL = 'k.h.s.h.s.ssssss';

const BATTLE_A = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A'];
const BATTLE_B = ['Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A'];
const TITLE_P = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'C', 'A'];

const TRACKS = {
  title: {
    bpm: 116,
    lead: [
      [null, 16], [null, 16], [null, 16], [null, 16], [null, 16], [null, 16], [null, 16], [null, 16],
      ['D5', 8], ['A5', 8], ['F5', 4], ['G5', 4], ['F5', 4], ['D5', 4],
      ['C5', 8], ['F5', 8], ['E5', 12], ['G5', 4],
      ['A5', 8], ['D6', 8], ['Bb5', 4], ['A5', 4], ['G5', 4], ['F5', 4],
      ['G5', 8], ['E5', 4], ['C5', 4], ['C#5', 8], ['E5', 4], ['A5', 4],
    ],
    bass: [...walkBass(TITLE_P), ...walkBass(TITLE_P)],
    arp: [...arpeggio(TITLE_P), ...arpeggio(TITLE_P)],
    drums: `${'k...h...s...h...'.repeat(7)}k...h...s.s.ssss${BEAT.repeat(7)}${FILL}`,
  },
  battle: {
    bpm: 150,
    lead: [
      // A
      ['D5', 4], ['A4', 2], ['D5', 2], ['F5', 4], ['E5', 2], ['D5', 2],
      ['E5', 2], ['F5', 2], ['G5', 4], ['F5', 2], ['E5', 2], ['D5', 4],
      ['F5', 6], ['D5', 2], ['Bb4', 4], ['D5', 4],
      ['E5', 6], ['C5', 2], ['G4', 4], ['C5', 2], ['E5', 2],
      ['D5', 4], ['A4', 2], ['D5', 2], ['F5', 4], ['A5', 4],
      ['G5', 2], ['F5', 2], ['E5', 2], ['F5', 2], ['D5', 8],
      ['Bb5', 4], ['A5', 4], ['G5', 4], ['F5', 4],
      ['E5', 4], ['C#5', 4], ['A4', 4], ['E5', 4],
      // B
      ['G5', 6], ['F5', 2], ['D5', 4], ['Bb4', 4],
      ['C5', 2], ['D5', 2], ['Bb4', 4], ['G4', 8],
      ['A4', 6], ['D5', 2], ['F5', 4], ['A5', 4],
      ['G5', 2], ['A5', 2], ['F5', 4], ['D5', 8],
      ['D5', 4], ['F5', 4], ['Bb5', 4], ['A5', 2], ['G5', 2],
      ['G5', 4], ['E5', 4], ['C5', 4], ['E5', 2], ['G5', 2],
      ['A5', 8], ['G5', 2], ['F5', 2], ['E5', 4],
      ['C#5', 4], ['E5', 4], ['A5', 4], [null, 4],
    ],
    bass: [...octaveBass(BATTLE_A), ...octaveBass(BATTLE_B)],
    arp: [...arpeggio(BATTLE_A), ...arpeggio(BATTLE_B)],
    drums: `${BEAT.repeat(7)}${FILL}${BEAT.repeat(7)}${FILL}`,
  },
  victory: {
    bpm: 140,
    once: true,
    lead: [['A4', 2], ['D5', 2], ['F#5', 2], ['A5', 6], ['F#5', 2], ['A5', 2], ['G5', 2], ['B5', 2], ['D6', 16]],
    bass: [['D3', 2], ['D3', 2], ['D3', 2], ['D3', 6], ['D3', 4], ['G2', 4], ['D3', 16]],
    arp: [[null, 12], ['D5', 2], ['F#5', 2], ['B4', 2], ['D5', 2], ['A5', 16]],
    drums: 'k.k.k.s.....s.s.k.s.k...........',
  },
  defeat: {
    bpm: 84,
    once: true,
    lead: [['D5', 4], ['C#5', 4], ['C5', 4], ['B4', 4], ['Bb4', 8], ['A4', 16]],
    bass: [['D3', 8], ['G2', 8], ['Bb1', 8], ['A1', 16]],
    arp: [[null, 40]],
    drums: 'k...............k.......k...............',
  },
};

// Lead (25% duty), arpeggio (12.5%), triangle bass, noise drums.
const CHANNELS = {
  lead: { wave: 0.25, vol: 0.22, vibrato: 0.012 },
  arp: { wave: 0.125, vol: 0.07 },
  bass: { wave: 'triangle', vol: 0.42 },
};

function drum(ch, t) {
  if (ch === 'k') {
    tone(musicBus, { wave: 'triangle', f: 180, f2: 45, t, dur: 0.12, vol: 0.55 });
    noise(musicBus, { t, dur: 0.05, vol: 0.12, rate: 0.3, cutoff: 1200 });
  } else if (ch === 's') {
    noise(musicBus, { t, dur: 0.13, vol: 0.26, rate: 0.6, gritty: true });
  } else if (ch === 'h') {
    noise(musicBus, { t, dur: 0.035, vol: 0.06, rate: 1 });
  } else if (ch === 't') {
    tone(musicBus, { wave: 'triangle', f: 150, f2: 80, t, dur: 0.16, vol: 0.45 });
  } else if (ch === 'c') {
    noise(musicBus, { t, dur: 0.9, vol: 0.14, rate: 0.5, cutoff: 6000, cutoff2: 1200 });
    tone(musicBus, { wave: 'triangle', f: 110, f2: 98, t, dur: 0.6, vol: 0.3 });
  }
}

// Turn channel lists into a flat, time-sorted list of events (in sixteenths).
function compile(track) {
  const events = [];
  let length = 0;
  for (const name of ['lead', 'arp', 'bass']) {
    let pos = 0;
    for (const [n, len] of track[name]) {
      if (n != null) events.push({ pos, len, ch: name, m: typeof n === 'number' ? n : midi(n) });
      pos += len;
    }
    length = Math.max(length, pos);
  }
  [...track.drums].forEach((c, pos) => { if (c !== '.') events.push({ pos, ch: 'drum', d: c }); });
  length = Math.max(length, track.drums.length);
  events.sort((a, b) => a.pos - b.pos);
  return { events, length, step: 60 / track.bpm / 4, once: !!track.once, voices: { ...CHANNELS, ...track.voices } };
}

let wanted = null;   // the track that should be playing: 'title', 'battle', …
let playing = null;  // { key, song, start, index, loop }
let timer = 0;
let musicTheme = 'classic';

// Classic has its own title and battle tunes; every other theme plays its
// song from songs.js on the menus and in battle alike.
function trackKey(name) {
  if ((name === 'title' || name === 'battle') && THEME_SONGS[musicTheme]) return `theme:${musicTheme}`;
  return name;
}
const compiled = {};
function trackFor(key) {
  compiled[key] ??= compile(key.startsWith('theme:') ? themeTrack(THEME_SONGS[key.slice(6)]) : TRACKS[key]);
  return compiled[key];
}

function startTrack(name) {
  stopTimer();
  const key = trackKey(name);
  playing = { key, song: trackFor(key), start: ctx.currentTime + 0.08, index: 0, loop: 0 };
  timer = setInterval(schedule, TICK_MS);
  schedule();
}

// Follow the chosen theme: the menu music changes as you flick through them.
export function setMusicTheme(id) {
  musicTheme = id;
  try {
    if (timer && wanted && playing && trackKey(wanted) !== playing.key) startTrack(wanted);
  } catch { /* never let the music break the menus */ }
}

function stopTimer() {
  clearInterval(timer);
  timer = 0;
  playing = null;
}

function schedule() {
  if (!playing || !ctx) return;
  const p = playing;
  const { song } = p;
  const horizon = ctx.currentTime + LOOKAHEAD;
  for (;;) {
    if (p.index >= song.events.length) {
      if (song.once) { stopTimer(); wanted = null; return; }
      p.index = 0;
      p.loop++;
    }
    const e = song.events[p.index];
    const t = p.start + (p.loop * song.length + e.pos) * song.step;
    if (t > horizon) return;
    p.index++;
    if (t < ctx.currentTime - 0.05) continue; // fell behind (tab throttled): skip
    if (e.ch === 'drum') drum(e.d, t);
    else {
      const c = { ...CHANNELS[e.ch], ...song.voices[e.ch] };
      const dur = e.len * song.step * (e.ch === 'arp' ? 0.9 : 0.94);
      tone(musicBus, { wave: c.wave, f: freq(e.m), t, dur, vol: c.vol, vibrato: c.vibrato });
    }
  }
}

// 'title', 'battle', 'victory', 'defeat', or null for silence.
export function playMusic(name) {
  if (wanted === name && (timer || TRACKS[name]?.once)) return;
  wanted = name;
  if (!ctx || ctx.state !== 'running') {
    if (!name) stopTimer();
    return; // starts on unlock()
  }
  if (!name) { stopTimer(); return; }
  startTrack(name);
}

// ── Sound effects ──────────────────────────────────────────────────────────
const last = {};
// Rate-limit each effect so a big battle doesn't turn into white noise.
function ready(name, gap) {
  const now = ctx.currentTime;
  if (last[name] && now - last[name] < gap) return false;
  last[name] = now;
  return true;
}

const SFX = {
  shot(t) {
    tone(sfxBus, { wave: 0.125, f: 1400 + Math.random() * 300, f2: 300, t, dur: 0.06, vol: 0.09 });
    noise(sfxBus, { t, dur: 0.04, vol: 0.05, rate: 0.8 });
  },
  shell(t) {
    noise(sfxBus, { t, dur: 0.18, vol: 0.22, rate: 0.35, gritty: true, cutoff: 2500, cutoff2: 300 });
    tone(sfxBus, { wave: 'square', f: 220, f2: 60, t, dur: 0.1, vol: 0.08 });
  },
  lob(t) {
    tone(sfxBus, { wave: 'triangle', f: 160, f2: 50, t, dur: 0.15, vol: 0.5 });
    noise(sfxBus, { t, dur: 0.12, vol: 0.12, rate: 0.25, gritty: true });
  },
  bomb(t) {
    tone(sfxBus, { wave: 0.25, f: 1800, f2: 500, t, dur: 0.35, vol: 0.05 });
  },
  boom(t) {
    noise(sfxBus, { t, dur: 0.45, vol: 0.32, rate: 0.22, gritty: true, cutoff: 3000, cutoff2: 150 });
    tone(sfxBus, { wave: 'triangle', f: 120, f2: 35, t, dur: 0.3, vol: 0.4 });
  },
  death(t) {
    noise(sfxBus, { t, dur: 0.12, vol: 0.12, rate: 0.5, gritty: true });
    tone(sfxBus, { wave: 0.25, f: 500, f2: 120, t, dur: 0.12, vol: 0.05 });
  },
  collapse(t) {
    noise(sfxBus, { t, dur: 1.2, vol: 0.4, rate: 0.15, gritty: true, cutoff: 2000, cutoff2: 80 });
    tone(sfxBus, { wave: 'triangle', f: 90, f2: 30, t, dur: 0.9, vol: 0.5 });
    noise(sfxBus, { t: t + 0.18, dur: 0.6, vol: 0.25, rate: 0.2, gritty: true, cutoff: 1500, cutoff2: 100 });
  },
  place(t) {
    tone(sfxBus, { wave: 0.25, f: freq(midi('G4')), t, dur: 0.05, vol: 0.12 });
    tone(sfxBus, { wave: 0.25, f: freq(midi('C5')), t: t + 0.05, dur: 0.07, vol: 0.12 });
  },
  built(t) {
    ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tone(sfxBus, { wave: 0.125, f: freq(midi(n)), t: t + i * 0.06, dur: 0.08, vol: 0.12 }));
  },
  trained(t) {
    tone(sfxBus, { wave: 0.25, f: freq(midi('A5')), t, dur: 0.06, vol: 0.1 });
    tone(sfxBus, { wave: 0.25, f: freq(midi('E6')), t: t + 0.07, dur: 0.09, vol: 0.1 });
  },
  order(t) {
    tone(sfxBus, { wave: 0.125, f: 880, t, dur: 0.035, vol: 0.08 });
    tone(sfxBus, { wave: 0.125, f: 1320, t: t + 0.04, dur: 0.035, vol: 0.08 });
  },
  select(t) {
    tone(sfxBus, { wave: 0.125, f: 1050, t, dur: 0.03, vol: 0.07 });
  },
  error(t) {
    tone(sfxBus, { wave: 'square', f: 110, t, dur: 0.16, vol: 0.06 });
  },
  click(t) {
    tone(sfxBus, { wave: 0.125, f: 660, f2: 990, t, dur: 0.04, vol: 0.07 });
  },
  alarm(t) {
    for (let i = 0; i < 3; i++) {
      tone(sfxBus, { wave: 0.25, f: 880, t: t + i * 0.22, dur: 0.1, vol: 0.09 });
      tone(sfxBus, { wave: 0.25, f: 660, t: t + i * 0.22 + 0.1, dur: 0.1, vol: 0.09 });
    }
  },
};
const GAPS = { shot: 0.07, shell: 0.12, lob: 0.15, bomb: 0.3, boom: 0.09, death: 0.08, collapse: 0.4, alarm: 8 };

export function sfx(name) {
  if (!ctx || !prefs.sfx || ctx.state !== 'running' || !SFX[name]) return;
  if (!ready(name, GAPS[name] ?? 0.05)) return;
  SFX[name](ctx.currentTime + 0.005);
}

// ── Battle listener ────────────────────────────────────────────────────────
// Works out what just happened by comparing this frame's game state with the
// last one, so it works the same for the host, offline games and online
// guests (whose game is a copy rebuilt from the host's updates).
let seen = null;

export function listen(game, you, visible) {
  if (!ctx || !prefs.sfx) { seen = null; return; }
  if (!seen || seen.game !== game) {
    seen = { game, units: new Set(game.units.map((u) => u.id)), fx: new WeakSet(game.effects), shots: new Map(), blds: new Map(), hqHp: 0 };
    for (const b of game.buildings) seen.blds.set(b.id, { c: b.constructing, b });
    seen.hqHp = game.players[you]?.hq?.hp ?? 0;
    return;
  }

  for (const u of game.units) if (!seen.units.has(u.id) && u.faction === you) { sfx('trained'); break; }
  seen.units = new Set(game.units.map((u) => u.id));
  // Fallen soldiers and wrecks are left behind as effects.
  for (const e of game.effects) {
    if (seen.fx.has(e)) continue;
    seen.fx.add(e);
    if (e.kind === 'fall' && visible(e)) sfx('death');
    else if (e.kind === 'wreck' && visible(e)) sfx('boom');
  }

  const shots = new Map();
  for (const p of game.projectiles) {
    const was = seen.shots.get(p.id);
    shots.set(p.id, p.exploded > 0);
    if (!visible(p)) continue;
    if (was === undefined) sfx(p.kind === 'shell' ? 'shell' : p.kind === 'lob' ? 'lob' : p.kind === 'bomb' ? 'bomb' : 'shot');
    if (p.exploded > 0 && !was) sfx('boom');
  }
  seen.shots = shots;

  const blds = new Map();
  for (const b of game.buildings) {
    const was = seen.blds.get(b.id);
    blds.set(b.id, { c: b.constructing, b });
    if (b.faction !== you) continue;
    if (!was) sfx('place');
    else if (was.c && !b.constructing) sfx('built');
  }
  for (const [id, { b }] of seen.blds) {
    // Selling removes a building too, but rarely one that's nearly destroyed.
    // (Online guests only see its last reported health, so allow some.)
    if (!blds.has(id) && b.hp < b.maxHp * 0.25 && visible(b)) { sfx('collapse'); break; }
  }
  seen.blds = blds;

  // Our HQ under fire: a short klaxon, at most every few seconds.
  const hq = game.players[you]?.hq;
  if (hq && hq.hp < seen.hqHp - 0.5) sfx('alarm');
  seen.hqHp = hq?.hp ?? 0;
}
