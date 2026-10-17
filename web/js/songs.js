// A battle tune for each theme (Classic's own title and battle music live in
// audio.js). All original, written for the NES-style synth in audio.js.
//
// Each song has two eight-bar sections, A then B, and loops. Per section:
// - chords: one per bar, which drive the bass and the accompaniment.
// - lead: the melody as note:sixteenths ('-' is a rest), sixteen per bar.
// - drums: a one-bar pattern played seven times, then a one-bar fill
//   (k kick, s snare, h hat, t tom, c crash/gong, . nothing).
// bass: 'octave' (driving eighths), 'walk' (root-fifth), 'oompah', 'jazz'
// (walking quarters) or 'gallop'. arp: 'up' (fast broken chords), 'slow',
// 'stab' (off-beat chords, the "pah" of oom-pah) or 'none'.
// voices: duty cycle (0.125, 0.25, 0.5), volume and vibrato per channel.

export const THEME_SONGS = {
  // Rise of the Robots: cold, clipped and relentless.
  robots: {
    bpm: 168, bass: 'octave', arp: 'up', arpOct: 5,
    voices: { lead: { wave: 0.125, vol: 0.2, vibrato: 0 }, arp: { wave: 0.25, vol: 0.05 } },
    A: {
      chords: 'Em Em C D Em Em C B',
      lead: `E5:2 E5:2 B4:2 E5:2 G5:2 E5:2 B4:2 E5:2  F#5:2 G5:2 F#5:2 E5:2 D5:4 B4:4
             C5:2 E5:2 G5:2 C6:2 B5:2 G5:2 E5:2 G5:2  A5:4 F#5:2 D5:2 A5:4 F#5:4
             E5:2 E5:2 B4:2 E5:2 G5:2 E5:2 B4:2 E5:2  F#5:2 G5:2 F#5:2 E5:2 D5:4 B4:4
             C5:2 E5:2 G5:2 C6:2 B5:2 G5:2 E5:2 G5:2  B5:4 A5:2 G5:2 F#5:4 D#5:4`,
      drums: ['k.hhs.hhk.hhs.hh', 'k.hhs.hhs.s.ssss'],
    },
    B: {
      chords: 'Am Am Em Em C D B B',
      lead: `A5:2 A5:2 E5:2 A5:2 C6:4 B5:2 A5:2  G5:2 A5:2 E5:4 C5:4 E5:4
             B5:2 B5:2 G5:2 B5:2 E6:4 D6:2 B5:2  A5:2 B5:2 G5:4 E5:8
             C6:4 G5:4 E5:4 G5:4  D6:4 A5:4 F#5:4 A5:4
             B5:2 B5:2 F#5:2 B5:2 D#6:4 B5:4  F#5:2 D#5:2 B4:2 D#5:2 F#5:4 -:4`,
      drums: ['k.hhs.hhk.hhs.hh', 'kkhhs.hhs.s.ssss'],
    },
  },

  // Raise your banners: a lute and tabor marching song in the Dorian mode.
  medieval: {
    bpm: 112, bass: 'gallop', arp: 'slow', arpOct: 4,
    voices: { lead: { wave: 0.25, vol: 0.22, vibrato: 0.015 }, arp: { wave: 0.125, vol: 0.08 } },
    A: {
      chords: 'Dm C Dm C F C Dm Dm',
      lead: `D5:4 E5:2 F5:2 A5:6 G5:2  E5:4 G5:4 C5:8
             D5:2 F5:2 A5:4 B5:4 A5:4  G5:2 F5:2 E5:4 C5:4 E5:4
             F5:4 A5:2 C6:2 A5:4 F5:4  G5:4 E5:4 C5:4 E5:4
             F5:2 E5:2 D5:4 A4:4 C5:2 E5:2  D5:12 -:4`,
      drums: ['k...t.s.k...t.s.', 'k.k.s.s.t.t.ssss'],
    },
    B: {
      chords: 'F C G Dm F C Am Dm',
      lead: `C6:6 A5:2 F5:4 A5:4  G5:6 E5:2 C5:8
             B5:4 D6:4 B5:4 G5:4  A5:8 F5:4 D5:4
             A5:2 C6:2 A5:2 F5:2 A5:4 C6:4  G5:2 E5:2 C5:2 E5:2 G5:8
             E5:4 A5:4 C6:4 B5:2 A5:2  A5:4 F5:2 E5:2 D5:8`,
      drums: ['k...t.s.k...t.s.', 'c.k.s.s.t.t.ssss'],
    },
  },

  // Chicago, 1932: a swinging speakeasy number with a walking bass.
  gangster: {
    bpm: 138, bass: 'jazz', arp: 'stab', arpOct: 4,
    voices: { lead: { wave: 0.5, vol: 0.16, vibrato: 0.018 }, arp: { wave: 0.25, vol: 0.07 } },
    A: {
      chords: 'C A7 Dm G7 C A7 D7 G7',
      lead: `E5:3 G5:1 C6:4 B5:3 A5:1 G5:4  A5:3 G5:1 E5:4 C#5:4 E5:4
             F5:3 E5:1 D5:4 A5:4 F5:4  G5:3 F5:1 D5:4 B4:4 D5:4
             E5:3 G5:1 C6:4 E6:4 C6:4  C#6:3 B5:1 A5:4 G5:4 E5:4
             F#5:3 E5:1 D5:4 A5:3 F#5:1 C6:4  B5:4 G5:4 F5:4 D5:4`,
      drums: ['k..hs..hk..hs..h', 'k..hs..hs.s.ssss'],
    },
    B: {
      chords: 'F F C A7 D7 G7 C G7',
      lead: `A5:3 G5:1 F5:4 C6:8  A5:3 G#5:1 A5:4 F5:4 D5:4
             G5:3 E5:1 C5:4 E5:4 G5:4  E6:8 C#6:4 A5:4
             D6:3 C6:1 A5:4 F#5:4 D5:4  F5:3 D5:1 B4:4 G4:4 B4:4
             C5:4 E5:4 G5:4 C6:4  B5:4 G5:4 -:8`,
      drums: ['k..hs..hk..hs..h', 'k..hs..hs..ss.ss'],
    },
  },

  // Seven kingdoms: pentatonic flute over war drums and a gong.
  warring: {
    bpm: 120, bass: 'walk', arp: 'slow', arpOct: 4,
    voices: { lead: { wave: 0.125, vol: 0.22, vibrato: 0.025 }, arp: { wave: 0.25, vol: 0.06 } },
    A: {
      chords: 'Am Am G Am C G Am Am',
      lead: `A4:4 C5:2 D5:2 E5:8  G5:2 E5:2 D5:4 C5:4 A4:4
             G4:4 A4:2 C5:2 D5:8  E5:2 D5:2 C5:4 A4:8
             E5:4 G5:4 A5:4 G5:4  D5:4 E5:2 G5:2 D5:8
             C5:2 D5:2 E5:2 G5:2 A5:4 G5:4  E5:2 D5:2 C5:4 A4:8`,
      drums: ['c.....t.k...t...', 'k.k.t.t.k.k.tttt'],
    },
    B: {
      chords: 'C C G G Am Em Am Am',
      lead: `A5:4 C6:4 A5:4 G5:4  E5:8 G5:8
             D6:4 C6:2 A5:2 G5:8  E5:2 G5:2 A5:4 G5:8
             A5:6 G5:2 E5:4 D5:4  E5:4 G5:4 D5:4 E5:4
             C5:2 D5:2 E5:4 G5:2 E5:2 D5:4  A4:12 -:4`,
      drums: ['k.....t.k...t...', 'k.k.t.t.ttttc...'],
    },
  },

  // Steam over the Land of the Rising Sun: the in scale, koto and a train beat.
  steampunk: {
    bpm: 132, bass: 'octave', arp: 'up', arpOct: 4,
    voices: { lead: { wave: 0.25, vol: 0.21, vibrato: 0.02 }, arp: { wave: 0.125, vol: 0.06 } },
    A: {
      chords: 'Am F Am E Am F Dm E',
      lead: `E5:4 F5:2 A5:2 B5:4 A5:4  C6:4 B5:2 A5:2 F5:8
             E5:2 F5:2 E5:2 C5:2 B4:4 A4:4  B4:2 C5:2 B4:2 A4:2 E4:8
             A5:4 B5:2 C6:2 E6:4 C6:4  B5:2 A5:2 F5:4 E5:4 F5:4
             D5:2 E5:2 F5:4 A5:4 F5:4  E5:8 B4:4 E5:4`,
      drums: ['k.h.s.hhk.h.s.hh', 'k.k.s.s.k.k.ssss'],
    },
    B: {
      chords: 'F F Am Am Dm Dm E E',
      lead: `F5:4 A5:4 C6:6 B5:2  A5:4 F5:4 E5:8
             E6:4 C6:2 B5:2 A5:4 E5:4  F5:4 E5:4 C5:8
             D5:4 F5:2 A5:2 D6:4 C6:4  B5:2 A5:2 F5:4 D5:8
             E5:2 F5:2 E5:2 F5:2 B5:4 A5:4  G#5:4 F5:4 E5:8`,
      drums: ['k.h.s.hhk.h.s.hh', 'k.h.s.hhs.s.c...'],
    },
  },

  // Minus forty: a breakneck Finnish humppa on the accordion.
  winter: {
    bpm: 176, bass: 'oompah', arp: 'stab', arpOct: 4,
    voices: { lead: { wave: 0.25, vol: 0.2, vibrato: 0.012 }, arp: { wave: 0.5, vol: 0.06 } },
    A: {
      chords: 'Am Am E E E E Am Am',
      lead: `E5:2 A5:2 C6:2 A5:2 E5:4 A5:4  B5:2 C6:2 B5:2 A5:2 G#5:4 E5:4
             D5:2 E5:2 G#5:2 B5:2 D6:4 B5:4  C6:2 B5:2 A5:2 G#5:2 B5:8
             B5:2 G#5:2 E5:2 G#5:2 B5:4 D6:4  C6:2 B5:2 A5:2 B5:2 G#5:8
             A5:2 B5:2 C6:2 E6:2 C6:2 B5:2 A5:2 G#5:2  A5:4 E5:4 A5:4 -:4`,
      drums: ['k...s...k...s...', 'k...s...s.s.ssss'],
    },
    B: {
      chords: 'Dm Dm Am Am E E Am Am',
      lead: `F5:2 A5:2 D6:2 A5:2 F5:4 D5:4  E5:2 F5:2 G5:2 A5:2 F5:8
             E5:2 A5:2 C6:2 A5:2 E6:4 C6:4  B5:2 C6:2 B5:2 A5:2 E5:8
             G#5:2 B5:2 E6:2 B5:2 G#5:4 E5:4  F5:2 E5:2 D5:2 B4:2 G#4:8
             A4:2 C5:2 E5:2 A5:2 C6:2 B5:2 A5:2 G#5:2  A5:4 E5:4 A4:4 -:4`,
      drums: ['k...s...k...s...', 'k...s...ssssssss'],
    },
  },

  // Totally legitimate business: a mariachi trumpet ranchera.
  cartel: {
    bpm: 150, bass: 'oompah', arp: 'stab', arpOct: 4,
    voices: { lead: { wave: 0.25, vol: 0.2, vibrato: 0.022 }, arp: { wave: 0.125, vol: 0.08 } },
    A: {
      chords: 'G G D7 D7 D7 D7 G G',
      lead: `D5:2 G5:2 B5:2 G5:2 D6:6 B5:2  C6:2 B5:2 A5:2 G5:2 A5:8
             F#5:2 A5:2 C6:2 A5:2 F#5:6 D5:2  E5:2 F#5:2 G5:2 A5:2 C6:8
             B5:2 A5:2 F#5:2 A5:2 C6:6 A5:2  B5:2 C6:2 B5:2 A5:2 F#5:8
             G5:2 A5:2 B5:2 D6:2 G6:6 D6:2  B5:4 G5:4 G5:4 -:4`,
      drums: ['k...h.h.k...h.h.', 'k.h.k.h.s.s.ssss'],
    },
    B: {
      chords: 'C C G G D7 D7 G G',
      lead: `E5:2 G5:2 C6:2 E6:2 E6:6 C6:2  D6:2 C6:2 B5:2 C6:2 E6:8
             D6:2 B5:2 G5:2 B5:2 D6:6 B5:2  A5:2 B5:2 A5:2 G5:2 D5:8
             A5:2 C6:2 F#6:2 C6:2 E6:6 C6:2  D6:2 C6:2 A5:2 F#5:2 D5:8
             B4:2 D5:2 G5:2 B5:2 D6:4 B5:4  G5:12 -:4`,
      drums: ['k...h.h.k...h.h.', 'k.h.k.h.ssssc...'],
    },
  },

  // The other countries pay: a big, pompous brass-band march.
  tariff: {
    bpm: 120, bass: 'oompah', arp: 'stab', arpOct: 4,
    voices: { lead: { wave: 0.25, vol: 0.22, vibrato: 0.01 }, arp: { wave: 0.5, vol: 0.06 } },
    A: {
      chords: 'Bb Bb F F F7 F7 Bb Bb',
      lead: `F5:6 D5:2 Bb4:4 D5:4  F5:4 Bb5:4 D6:8
             C6:6 A5:2 F5:4 A5:4  C6:4 Eb6:4 C6:8
             A5:3 Bb5:1 C6:4 A5:3 Bb5:1 C6:4  Eb6:4 C6:4 A5:4 F5:4
             D6:4 Bb5:4 F5:4 D5:4  Bb4:4 -:4 Bb4:4 -:4`,
      drums: ['k...s.s.k...s...', 'k.s.s.s.ssssssss'],
    },
    B: {
      chords: 'Eb Eb Bb Bb F7 F7 Bb Bb',
      lead: `G5:6 Bb5:2 Eb6:8  D6:2 C6:2 Bb5:2 G5:2 Eb5:8
             F5:6 Bb5:2 D6:8  C6:2 Bb5:2 A5:2 Bb5:2 F5:8
             C6:6 A5:2 F5:4 C6:4  Eb6:4 D6:4 C6:4 A5:4
             Bb5:2 -:2 Bb5:2 -:2 D6:2 -:2 F6:4  Bb5:8 -:8`,
      drums: ['k...s.s.k...s...', 'k.s.s.s.s.s.c...'],
    },
  },

  // Brother against brother: fife and drum on the march.
  civil: {
    bpm: 116, bass: 'walk', arp: 'none',
    voices: { lead: { wave: 0.125, vol: 0.22, vibrato: 0.006 } },
    A: {
      chords: 'G G C G G G D G',
      lead: `D5:2 G5:2 G5:2 A5:2 B5:4 G5:4  D6:4 B5:2 G5:2 D5:8
             E5:2 G5:2 C6:2 B5:2 A5:4 G5:4  B5:2 A5:2 G5:2 A5:2 B5:8
             D5:2 G5:2 G5:2 A5:2 B5:4 D6:4  E6:2 D6:2 B5:2 G5:2 A5:8
             F#5:2 A5:2 D6:2 C6:2 B5:4 A5:4  G5:4 D5:4 G5:4 -:4`,
      drums: ['k.ssk.s.k.ssk.s.', 'ssssssssk.s.s.s.'],
    },
    B: {
      chords: 'D D G G C G D G',
      lead: `A5:4 F#5:2 A5:2 D6:4 A5:4  B5:2 A5:2 F#5:2 E5:2 D5:8
             G5:4 B5:2 D6:2 G6:4 D6:4  E6:2 D6:2 C6:2 B5:2 A5:8
             G5:2 C6:2 E6:2 C6:2 G5:4 E5:4  D5:2 G5:2 B5:2 G5:2 D6:8
             F#5:2 E5:2 F#5:2 A5:2 D6:4 C6:4  B5:4 G5:4 G5:8`,
      drums: ['k.ssk.s.k.ssk.s.', 'ssssssssk.k.k...'],
    },
  },

  // I see dead people: a wailing theremin over a haunted music box.
  ghost: {
    bpm: 100, bass: 'walk', arp: 'up', arpOct: 5,
    voices: { lead: { wave: 0.5, vol: 0.15, vibrato: 0.035 }, arp: { wave: 0.125, vol: 0.045 } },
    A: {
      chords: 'Dm Dm Gm A Dm Bb Gm A',
      lead: `A5:6 F5:2 D5:8  C#5:2 D5:2 E5:2 F5:2 E5:8
             Bb5:6 G5:2 D5:8  C#5:4 E5:4 A5:8
             D6:4 C#6:4 C6:4 B5:4  Bb5:4 A5:4 G#5:4 G5:4
             G5:2 Bb5:2 D6:4 Bb5:4 G5:4  A5:12 -:4`,
      drums: ['k.......s.......', 'k.......s...s.s.'],
    },
    B: {
      chords: 'Bb Bb Gm Gm Dm Dm A A',
      lead: `F5:4 D5:4 Bb4:4 D5:4  F5:2 G5:2 A5:2 Bb5:2 D6:8
             D6:6 Bb5:2 G5:8  Bb5:2 A5:2 G5:2 F5:2 D5:8
             F5:4 A5:4 D6:4 F6:4  E6:4 D6:4 C#6:4 A5:4
             Bb5:4 A5:4 G5:4 E5:4  C#5:8 A4:8`,
      drums: ['k.......s.......', 'k.......c.......'],
    },
  },

  // They mostly come at night: wobbling, off-kilter alien signals.
  alien: {
    bpm: 144, bass: 'octave', arp: 'up', arpOct: 5,
    voices: { lead: { wave: 0.125, vol: 0.2, vibrato: 0.03 }, arp: { wave: 0.5, vol: 0.04 } },
    A: {
      chords: 'Cm Cm Ab Gaug Cm Cm Ab Gaug',
      lead: `C5:2 Eb5:2 G5:2 C6:2 B5:4 G5:4  Ab5:2 G5:2 Eb5:2 D5:2 C5:8
             Ab4:2 C5:2 Eb5:2 Ab5:2 G5:4 E5:4  D#5:4 G5:4 B5:4 D#6:4
             C6:2 B5:2 C6:2 G5:2 Eb5:4 C5:4  D5:2 Eb5:2 F#5:2 G5:2 Ab5:8
             C6:4 Ab5:4 Eb5:4 E5:4  B5:8 G5:4 D#5:4`,
      drums: ['k.h.k.hsk.h.k.hs', 'k.k.s.k.s.s.ssss'],
    },
    B: {
      chords: 'Fm Fm Cm Cm Db Db Gaug Gaug',
      lead: `F5:4 Ab5:4 C6:6 B5:2  C6:2 Db6:2 C6:2 Ab5:2 F5:8
             G5:4 Eb5:4 C5:4 Eb5:4  F#5:4 G5:4 Eb5:8
             Db5:2 F5:2 Ab5:2 Db6:2 C6:4 Ab5:4  F5:4 E5:4 Eb5:4 D5:4
             D#5:2 G5:2 B5:2 D#6:2 G6:4 D#6:4  B5:4 G5:4 D#5:4 -:4`,
      drums: ['k.h.k.hsk.h.k.hs', 'k.k.s.k.c.......'],
    },
  },
};
