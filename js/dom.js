// ══════════════════════════════════════════
// DOM REGISTRY
// ══════════════════════════════════════════

export const el = id => document.getElementById(id);
export const area = document.getElementById('canvas-area');

export const els = {
  red:el('c-red'),blue:el('c-blue'),green:el('c-green'),
  gold:el('gold-orb'),hole:el('black-hole'),ring:el('boss-ring'),
  beamSvg:el('beam-svg'),beamRB:el('beam-rb'),beamRG:el('beam-rg'),beamBG:el('beam-bg'),
  flash:el('flash'),fusionMsg:el('fusion-msg'),fusionTitle:el('fusion-title'),fusionSub:el('fusion-sub'),
  status:el('status'),restartBtn:el('restart-btn'),
  energyBar:el('energy-bar'),energyFill:el('energy-fill'),energyVal:el('energy-val'),
  timerDisplay:el('timer-display'),timerVal:el('timer-val'),
  levelBadge:el('level-badge'),
  warp:el('warp'),pCanvas:el('particle-canvas'),swCanvas:el('shockwave-canvas'),
  recipeHint:el('recipe-hint'),discoveryLog:el('discovery-log'),
  pr:el('pr'),pb:el('pb'),pg:el('pg'),
  bossHpBar:el('boss-hpbar'),bossHpFill:el('boss-hpbar-fill'),
  bossPhaseInd:el('boss-phase-indicator'),bossPhaseLabel:el('boss-phase-label'),
  orbIcon:el('orb-icon'),orbText:el('orb-text'),
  bossOverlay:el('boss-overlay'),bossWarningText:el('boss-warning-text'),
  bossWarningSub:el('boss-warning-sub'),bossVignette:el('boss-vignette'),
  rewardBanner:el('reward-banner'),rewardTitle:el('reward-title'),
  rewardDesc:el('reward-desc'),rewardScore:el('reward-score'),rewardSub:el('reward-sub'),
  bossTier:el('boss-tier'),
  header:el('main-header'),
  fusionCharge:el('fusion-charge'),
  fusionChargeCvs:el('fusion-charge-canvas'),
  comboDisplay:el('combo-display'),
  sepBarBig:el('sep-bar-big'),
  sepBarBigFill:el('sep-bar-big-fill'),
  sepBarBigPct:el('sep-bar-big-pct'),
  sepBarBigHint:el('sep-bar-big-hint'),
  meltdownOverlay:el('meltdown-overlay'),
  meltdownLine1:el('meltdown-line1'),
  meltdownLine2:el('meltdown-line2'),
  supernovaFlash:el('supernova-flash'),
  spaceDistort:el('space-distort'),
  stars:el('stars'),
};
