// ══════════════════════════════════════════
// SHARED STATE + EVENT BUS + CONSTANTS
// ══════════════════════════════════════════

// ── Constants ──
export const R = 55;
export const FUSION_CHARGE_DURATION = 900; // ms to hold before fusion fires
export const startOffsets = [{dx:-155,dy:-70},{dx:45,dy:-70},{dx:-55,dy:60}];

// ── Shared mutable state ──
export const state = {
  mode: null,
  merged: false,
  blackHoleActive: false,

  // Drag
  dragging: null,
  ox: 0,
  oy: 0,
  dragHistory: [],  // [{x,y,t}] last few samples

  // Gravity
  gravityActive: false,
  gravVels: [{x:0,y:0},{x:0,y:0},{x:0,y:0}],

  // Puzzle
  timerInterval: null,
  timeLeft: 30,
  moverInterval: null,
  moverDir: 1,
  puzzleLevel: 1,

  // Particles
  discoveredPairs: {},
  particles: [],
  shockwaves: [],

  // Fusion charge
  fusionCharging: false,
  fusionChargeTimer: null,
  fusionChargeStart: 0,
  fusionChargePct: 0,

  // Combo
  comboCount: 0,
  comboTimer: null,

  // Boss
  bossRun: 0,
  bossMaxHp: 100,
  bossCurrentHp: 100,
  bossPhase: 0,
  bossAlive: false,
  bossX: 0,
  bossY: 0,
  bossSize: 0,
  bossTargetSize: 0,
  bossMoveInterval: null,
  bossAttackInterval: null,
  bossRumbleInterval: null,
  bossSparkInterval: null,
  bossPhase2Reached: false,
  bossPhase3Reached: false,
  playerScore: 0,

  // Fusion / gold orb
  orbPersonalityTimer: null,

  // Infinite boss
  infiniteActive: false,

  // Adventure
  advActive: false,
  advScene: 'map',

  // Canvas internals
  _lastSwSfx: 0,
};

// ── Late-bound function registry (avoids circular imports) ──
// Mode modules register callbacks here; fusion.js calls them without importing mode files.
export const modeActions = {};

// ── Lightweight event bus ──
const listeners = {};

export const bus = {
  on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  },
  off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(f => f !== fn);
  },
  emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(fn => fn(data));
  },
};
