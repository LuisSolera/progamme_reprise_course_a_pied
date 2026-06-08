// session.js — Single source of truth for all session data and step building
const StepType = Object.freeze({ JOG: 'jog', WALK: 'walk' });

/** @typedef {{ warmup: number, intervals: { jog: number, walk: number, count: number }, cooldown: number }} SessionDef */

export const SESSIONS = {
  'w1s1': { warmup:10, intervals:{ jog:5, walk:5, count:3  }, cooldown:10 },
  'w1s2': { warmup:300, intervals:{ jog:60, walk:60, count:4  }, cooldown:300 },
  'w1s3': { warmup:300, intervals:{ jog:60, walk:60, count:5  }, cooldown:300 },
  'w1s4': { warmup:300, intervals:{ jog:60, walk:60, count:6  }, cooldown:300 },
  'w1s5': { warmup:300, intervals:{ jog:60, walk:60, count:7  }, cooldown:300 },
  'w2s1': { warmup:300, intervals:{ jog:60, walk:60, count:8  }, cooldown:300 },
  'w2s2': { warmup:300, intervals:{ jog:60, walk:60, count:9  }, cooldown:300 },
  'w2s3': { warmup:300, intervals:{ jog:60, walk:60, count:10 }, cooldown:300 },
  'w2s4': { warmup:300, intervals:{ jog:60, walk:60, count:11 }, cooldown:300 },
  'w2s5': { warmup:300, intervals:{ jog:60, walk:60, count:12 }, cooldown:300 },
  'w3s1': { warmup:300, intervals:{ jog:60, walk:60, count:13 }, cooldown:300 },
  'w3s2': { warmup:300, intervals:{ jog:60, walk:60, count:14 }, cooldown:300 },
  'w3s3': { warmup:300, intervals:{ jog:60, walk:60, count:15 }, cooldown:300 },
  'w3s4': { warmup:300, intervals:{ jog:120, walk:60, count:3 }, cooldown:300 },
  'w3s5': { warmup:300, intervals:{ jog:120, walk:60, count:4 }, cooldown:300 },
  'w4s1': { warmup:300, intervals:{ jog:120, walk:60, count:5 }, cooldown:300 },
  'w4s2': { warmup:300, intervals:{ jog:120, walk:60, count:6 }, cooldown:300 },
  'w4s3': { warmup:300, intervals:{ jog:120, walk:60, count:7 }, cooldown:300 },
  'w4s4': { warmup:300, intervals:{ jog:120, walk:60, count:8 }, cooldown:300 },
  'w4s5': { warmup:300, intervals:{ jog:120, walk:60, count:9 }, cooldown:300 },
  'w5s1': { warmup:300, intervals:{ jog:120, walk:60, count:10}, cooldown:300 },
  'w5s2': { warmup:300, intervals:{ jog:180, walk:60, count:3 }, cooldown:300 },
  'w5s3': { warmup:300, intervals:{ jog:180, walk:60, count:4 }, cooldown:300 },
  'w5s4': { warmup:300, intervals:{ jog:180, walk:60, count:5 }, cooldown:300 },
  'w5s5': { warmup:300, intervals:{ jog:180, walk:60, count:6 }, cooldown:300 },
  'w6s1': { warmup:300, intervals:{ jog:180, walk:60, count:7 }, cooldown:300 },
  'w6s2': { warmup:300, intervals:{ jog:180, walk:60, count:8 }, cooldown:300 },
  'w6s3': { warmup:300, intervals:{ jog:240, walk:60, count:2 }, cooldown:300 },
  'w6s4': { warmup:300, intervals:{ jog:240, walk:60, count:3 }, cooldown:300 },
  'w6s5': { warmup:300, intervals:{ jog:240, walk:60, count:4 }, cooldown:300 },
  'w7s1': { warmup:300, intervals:{ jog:240, walk:60, count:5 }, cooldown:300 },
  'w7s2': { warmup:300, intervals:{ jog:240, walk:60, count:6 }, cooldown:300 },
  'w7s3': { warmup:300, intervals:{ jog:540, walk:60, count:1 }, cooldown:300 },
  'w7s4': { warmup:300, intervals:{ jog:540, walk:60, count:2 }, cooldown:300 },
  'w7s5': { warmup:300, intervals:{ jog:540, walk:60, count:3 }, cooldown:300 },
  'w8s1': { warmup:300, intervals:{ jog:840, walk:60, count:1 }, cooldown:300 },
  'w8s2': { warmup:300, intervals:{ jog:840, walk:60, count:2 }, cooldown:300 },
  'w8s3': { warmup:300, intervals:{ jog:1200, walk:0, count:1 }, cooldown:300 },
  'w8s4': { warmup:300, intervals:{ jog:1500, walk:0, count:1 }, cooldown:300 },
  'w8s5': { warmup:300, intervals:{ jog:1800, walk:0, count:1 }, cooldown:300 },
};

/**
 * Converts a SessionDef into a flat ordered array of steps.
 * @param {SessionDef} def
 */
export function buildSteps(def) {
  const steps = [];

  steps.push({
    label: 'Échauffement',
    detail: '5 min de marche',
    duration: def.warmup,
    type: StepType.WALK,
  });

  for (let i = 1; i <= def.intervals.count; i++) {
    steps.push({
      label: `Course ${i} / ${def.intervals.count}`,
      detail: `${formatDuration(def.intervals.jog)} de jogging`,
      duration: def.intervals.jog,
      type: StepType.JOG,
    });
    if (def.intervals.walk > 0) {
      steps.push({
        label: `Marche ${i} / ${def.intervals.count}`,
        detail: `${formatDuration(def.intervals.walk)} de marche`,
        duration: def.intervals.walk,
        type: StepType.WALK,
      });
    }
  }

  steps.push({
    label: 'Retour au calme',
    detail: '5 min de marche',
    duration: def.cooldown,
    type: StepType.WALK,
  });

  return steps;
}

/**
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m}m${s}s`; 
}

/**
 * @param {number} seconds
 * @returns {string}  e.g. "4:07"
 */
export function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}