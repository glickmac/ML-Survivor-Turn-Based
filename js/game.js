/**
 * OVERFIT: Model Survival
 * Tower-defense-style ML education game
 */

// ─── Defense definitions ───────────────────────────────────────────
const DEFENSES = {
  dropout: {
    id: 'dropout',
    name: 'Dropout Layer',
    icon: '🎲',
    desc: 'Randomly drops neurons during training. Strong overfit defense, but too much causes underfitting.',
    placeCost: 15,
    upgradeCosts: [25, 40],
    upkeep: [2, 4, 6],
    overfitReduction: [0.18, 0.30, 0.42],
    underfitPenalty: [0.10, 0.18, 0.28],
    trainSlowdown: [0.04, 0.08, 0.14],
  },
  regularization: {
    id: 'regularization',
    name: 'L1/L2 Regularization',
    icon: '📏',
    desc: 'Penalizes large weights. Cheaper than Dropout but weaker. Stacks underfit risk when combined.',
    placeCost: 10,
    upgradeCosts: [18, 30],
    upkeep: [1, 2, 3],
    overfitReduction: [0.12, 0.22, 0.32],
    underfitPenalty: [0.06, 0.12, 0.20],
    trainSlowdown: [0.03, 0.06, 0.10],
  },
  batchNorm: {
    id: 'batchNorm',
    name: 'Batch Normalization',
    icon: '⚡',
    desc: 'Stabilizes activations. Defends against gradient explosions and speeds convergence.',
    placeCost: 20,
    upgradeCosts: [35, 50],
    upkeep: [3, 5, 7],
    overfitReduction: [0.06, 0.10, 0.15],
    underfitPenalty: [0.02, 0.04, 0.06],
    gradientShield: [0.35, 0.65, 0.90],
    valBoost: [0.02, 0.04, 0.06],
  },
  dataAug: {
    id: 'dataAug',
    name: 'Data Augmentation',
    icon: '🔄',
    desc: 'Synthetic training examples. Helps with noisy labels, imbalance, and distribution shift.',
    placeCost: 18,
    upgradeCosts: [30, 45],
    upkeep: [2, 3, 5],
    overfitReduction: [0.14, 0.24, 0.34],
    underfitPenalty: [0.03, 0.06, 0.10],
    noisyDefense: [0.25, 0.45, 0.65],
    imbalanceDefense: [0.20, 0.40, 0.60],
    outlierDefense: [0.15, 0.30, 0.50],
  },
  earlyStopping: {
    id: 'earlyStopping',
    name: 'Early Stopping',
    icon: '🛑',
    desc: 'Watches validation accuracy and pauses training before overfitting runs away. Saves your run once per wave — but stop too soon and you never learn enough.',
    placeCost: 12,
    upgradeCosts: [20, 32],
    upkeep: [1, 2, 2],
    overfitReduction: [0.05, 0.08, 0.10],
    underfitPenalty: [0.03, 0.05, 0.07],
    triggerGap: [12, 10, 8],
    valSalvage: [3, 5, 8],
    freezeEpochs: [2, 3, 4],
  },
  crossVal: {
    id: 'crossVal',
    name: 'Cross-Validation Module',
    icon: '📋',
    desc: 'Scores the model on multiple held-out folds instead of one validation set. Noisy and imbalanced val metrics stop lying to you — expensive but you trust the dashboard.',
    placeCost: 28,
    upgradeCosts: [42, 58],
    upkeep: [4, 6, 8],
    overfitReduction: [0.08, 0.12, 0.16],
    underfitPenalty: [0.02, 0.03, 0.04],
    valStability: [0.25, 0.45, 0.65],
    valThresholdBonus: [2, 4, 6],
    noisyDefense: [0.15, 0.25, 0.35],
    imbalanceDefense: [0.10, 0.20, 0.30],
  },
  classWeighting: {
    id: 'classWeighting',
    name: 'Class Weighting / Focal Loss',
    icon: '⚖️',
    desc: 'Up-weights rare classes in the loss so the model can\'t ignore them. Fixes imbalance at the objective level — not by inventing new examples.',
    placeCost: 14,
    upgradeCosts: [22, 36],
    upkeep: [2, 3, 4],
    overfitReduction: [0.04, 0.06, 0.08],
    underfitPenalty: [0.02, 0.04, 0.06],
    imbalanceDefense: [0.35, 0.55, 0.75],
  },
  inputClip: {
    id: 'inputClip',
    name: 'Input Clipping & Normalization',
    icon: '📐',
    desc: 'Clips and scales raw features before they enter the model. Tames extreme input values — preprocessing, not in-network normalization.',
    placeCost: 16,
    upgradeCosts: [26, 40],
    upkeep: [1, 2, 3],
    overfitReduction: [0.03, 0.05, 0.07],
    underfitPenalty: [0.04, 0.07, 0.10],
    outlierDefense: [0.40, 0.60, 0.80],
  },
  gradClip: {
    id: 'gradClip',
    name: 'Gradient Clipping',
    icon: '✂️',
    desc: 'Caps the size of each gradient update before weights change. Stops exploding gradients from nuking your model in one step.',
    placeCost: 15,
    upgradeCosts: [24, 38],
    upkeep: [2, 3, 4],
    overfitReduction: [0, 0, 0],
    underfitPenalty: [0.02, 0.03, 0.04],
    gradientClipShield: [0.40, 0.65, 0.90],
  },
  lrScheduler: {
    id: 'lrScheduler',
    name: 'Learning Rate Scheduler',
    icon: '📉',
    desc: 'Lowers the learning rate when validation stops improving. Helps you converge cleanly and recover after instability.',
    placeCost: 17,
    upgradeCosts: [28, 42],
    upkeep: [2, 3, 4],
    overfitReduction: [0.10, 0.16, 0.22],
    underfitPenalty: [0.04, 0.06, 0.09],
    explosionRecovery: [0.25, 0.40, 0.55],
    schedulerSlowdown: [0.02, 0.03, 0.04],
  },
};

const SLOT_COUNT = 5;
const EPOCH_INTERVAL_MS = 2000;
const WAVE_EPOCHS = 8;
const STARTING_BUDGET = 100;
const WAVE_INCOME = [25, 30, 35, 40, 45];

// ─── Wave definitions (1–5 for prototype) ──────────────────────────
const WAVES = [
  {
    id: 1,
    name: 'Clean Data Wave',
    desc: 'Baseline i.i.d. training data — your model should learn easily if defenses are balanced.',
    mlProblem: 'Standard supervised learning on clean, representative data.',
    threshold: 55,
    trainRate: 3.2,
    valRate: 2.8,
    noiseLevel: 0,
    imbalanceLevel: 0,
    outlierLevel: 0,
    gradientRisk: 0,
  },
  {
    id: 2,
    name: 'Noisy Labels Wave',
    desc: '30% of labels are wrong. Train accuracy gets dragged down unless you have robust training.',
    mlProblem: 'Label noise — mislabeled examples poison gradient updates.',
    threshold: 58,
    trainRate: 2.8,
    valRate: 2.4,
    noiseLevel: 0.30,
    imbalanceLevel: 0,
    outlierLevel: 0,
    gradientRisk: 0,
  },
  {
    id: 3,
    name: 'Class Imbalance Wave',
    desc: 'Rare classes spike in validation. Val accuracy tanks unless you handle imbalance.',
    mlProblem: 'Class imbalance — model ignores minority classes, val metrics collapse.',
    threshold: 60,
    trainRate: 3.0,
    valRate: 1.6,
    noiseLevel: 0,
    imbalanceLevel: 0.45,
    outlierLevel: 0,
    gradientRisk: 0,
  },
  {
    id: 4,
    name: 'Outlier Storm',
    desc: 'Extreme feature values flood the batch. Normalization defenses are critical.',
    mlProblem: 'Outliers — unnormalized extremes destabilize weights and predictions.',
    threshold: 62,
    trainRate: 2.6,
    valRate: 2.0,
    noiseLevel: 0,
    imbalanceLevel: 0,
    outlierLevel: 0.50,
    gradientRisk: 0,
  },
  {
    id: 5,
    name: 'Gradient Explosion Event',
    desc: 'Unstable gradients strike randomly. Batch Norm and careful learning are your shield.',
    mlProblem: 'Exploding gradients — loss spikes destroy learned weights in a single step.',
    threshold: 65,
    trainRate: 3.4,
    valRate: 2.6,
    noiseLevel: 0.05,
    imbalanceLevel: 0.10,
    outlierLevel: 0.15,
    gradientRisk: 0.35,
  },
];

// ─── Game state ────────────────────────────────────────────────────
let state = {};
let chart = null;
let epochTimer = null;
let selectedSlot = null;
let running = false;

function initState() {
  state = {
    epoch: 1,
    waveIndex: 0,
    epochInWave: 0,
    trainAcc: 52,
    valAcc: 50,
    budget: STARTING_BUDGET,
    overfitRisk: 0.15,
    underfitRisk: 0.05,
    slots: Array(SLOT_COUNT).fill(null),
    underfitStreak: 0,
    gameOver: false,
    deathReason: null,
    history: [{ epoch: 0, train: 52, val: 50 }],
    lastGradientHit: false,
    peakTrain: 48,
    peakVal: 46,
    totalSpent: 0,
    wavesCleared: 0,
    prevValAcc: 50,
    prevPrevValAcc: 50,
    earlyStopUsed: false,
    earlyStopFrozen: 0,
    earlyStopRearmed: false,
  };
}

// ─── Defense effect aggregation ────────────────────────────────────
function getDefenseEffects() {
  const fx = {
    overfitReduction: 0,
    underfitPenalty: 0,
    trainSlowdown: 0,
    gradientShield: 0,
    gradientClipShield: 0,
    valBoost: 0,
    noisyDefense: 0,
    imbalanceDefense: 0,
    outlierDefense: 0,
    valStability: 0,
    valThresholdBonus: 0,
    explosionRecovery: 0,
    schedulerSlowdown: 0,
    earlyStopGap: 0,
    earlyStopSalvage: 0,
    earlyStopFreeze: 0,
    earlyStopTier: -1,
    upkeep: 0,
    regCount: 0,
  };

  for (const slot of state.slots) {
    if (!slot) continue;
    const def = DEFENSES[slot.type];
    const t = slot.tier;
    if (def.overfitReduction) fx.overfitReduction += def.overfitReduction[t];
    if (def.underfitPenalty) fx.underfitPenalty += def.underfitPenalty[t];
    fx.upkeep += def.upkeep[t];
    if (def.trainSlowdown) fx.trainSlowdown += def.trainSlowdown[t];
    if (def.gradientShield) fx.gradientShield = Math.max(fx.gradientShield, def.gradientShield[t]);
    if (def.gradientClipShield) fx.gradientClipShield = Math.max(fx.gradientClipShield, def.gradientClipShield[t]);
    if (def.valBoost) fx.valBoost += def.valBoost[t];
    if (def.noisyDefense) fx.noisyDefense = Math.max(fx.noisyDefense, def.noisyDefense[t]);
    if (def.imbalanceDefense) fx.imbalanceDefense = Math.max(fx.imbalanceDefense, def.imbalanceDefense[t]);
    if (def.outlierDefense) fx.outlierDefense = Math.max(fx.outlierDefense, def.outlierDefense[t]);
    if (def.valStability) fx.valStability = Math.max(fx.valStability, def.valStability[t]);
    if (def.valThresholdBonus) fx.valThresholdBonus = Math.max(fx.valThresholdBonus, def.valThresholdBonus[t]);
    if (def.explosionRecovery) fx.explosionRecovery = Math.max(fx.explosionRecovery, def.explosionRecovery[t]);
    if (def.schedulerSlowdown) fx.schedulerSlowdown = Math.max(fx.schedulerSlowdown, def.schedulerSlowdown[t]);
    if (def.triggerGap) {
      if (t >= fx.earlyStopTier) {
        fx.earlyStopTier = t;
        fx.earlyStopGap = def.triggerGap[t];
        fx.earlyStopSalvage = def.valSalvage[t];
        fx.earlyStopFreeze = def.freezeEpochs[t];
      }
    }
    if (slot.type === 'dropout' || slot.type === 'regularization') fx.regCount++;
  }
  return fx;
}

function getCurrentWave() {
  return WAVES[Math.min(state.waveIndex, WAVES.length - 1)];
}

// ─── Core simulation tick ──────────────────────────────────────────
function simulateEpoch(forceRun = false) {
  if (state.gameOver || (!running && !forceRun)) return;

  const wave = getCurrentWave();
  const fx = getDefenseEffects();
  state.lastGradientHit = false;

  // Pay upkeep
  state.budget -= fx.upkeep;
  if (state.budget < 0 && state.budget + WAVE_INCOME[state.waveIndex] < 0) {
    endGame('bankrupt');
    return;
  }

  // Base learning rates modified by underfit
  const underfitFactor = Math.max(0.25, 1 - fx.underfitPenalty - state.underfitRisk * 0.5);
  let trainDelta = wave.trainRate * underfitFactor - fx.trainSlowdown;
  let valDelta = wave.valRate * underfitFactor + fx.valBoost;

  // Wave-specific damage
  const stabilityMitigation = 1 - fx.valStability * 0.45;

  if (wave.noiseLevel > 0) {
    const noiseMitigation = fx.noisyDefense;
    const noiseDamage = wave.noiseLevel * (1 - noiseMitigation) * 8 * stabilityMitigation;
    trainDelta -= noiseDamage;
    valDelta -= noiseDamage * 0.6;
  }

  if (wave.imbalanceLevel > 0) {
    const imbMitigation = fx.imbalanceDefense;
    const imbDamage = wave.imbalanceLevel * (1 - imbMitigation) * 10 * stabilityMitigation;
    valDelta -= imbDamage;
  }

  if (wave.outlierLevel > 0) {
    const outMitigation = fx.outlierDefense + (fx.gradientShield > 0 ? fx.gradientShield * 0.3 : 0);
    const outDamage = wave.outlierLevel * (1 - Math.min(outMitigation, 0.85)) * 9;
    trainDelta -= outDamage * 0.5;
    valDelta -= outDamage;
  }

  // Learning rate scheduler slows training when val plateaus mid-wave
  if (fx.schedulerSlowdown > 0 && state.epochInWave >= 3 && state.valAcc <= state.prevValAcc) {
    trainDelta -= fx.schedulerSlowdown * 4;
    valDelta -= fx.schedulerSlowdown * 1.5;
  }

  // Gradient explosion (wave 5)
  let explosionDamage = 0;
  if (wave.gradientRisk > 0 && Math.random() < wave.gradientRisk) {
    state.lastGradientHit = true;
    const shield = Math.max(fx.gradientShield, fx.gradientClipShield);
    explosionDamage = (1 - shield) * (18 + Math.random() * 12);
    state.valAcc -= explosionDamage;
    state.trainAcc -= explosionDamage * 0.3;
    showToast('⚡ Gradient Explosion! Val accuracy took a hit.', 'danger');
    if (fx.explosionRecovery > 0) {
      const recovery = explosionDamage * fx.explosionRecovery;
      state.valAcc += recovery;
      state.trainAcc += recovery * 0.2;
    }
  }

  // Apply learning
  state.trainAcc = clamp(state.trainAcc + trainDelta, 0, 99.5);
  state.valAcc = clamp(state.valAcc + valDelta, 0, 99.5);

  // Overfit gap mechanics — THE core teaching moment
  const gap = state.trainAcc - state.valAcc;
  const effectiveGap = Math.max(0, gap - fx.overfitReduction * 100);

  // Overfit risk rises when gap is large
  const targetOverfit = clamp(effectiveGap / 35, 0, 1);
  state.overfitRisk = lerp(state.overfitRisk, targetOverfit, 0.35);

  // Overfit penalty: val acc actively drops when gap too wide
  if (effectiveGap > 8 && state.earlyStopFrozen <= 0) {
    const overfitDrain = (effectiveGap - 8) * 0.15 * (1 - fx.overfitReduction);
    state.valAcc -= overfitDrain;
  }

  // Early stopping — reactive once per wave
  if (fx.earlyStopGap > 0 && state.earlyStopFrozen <= 0) {
    const gapNow = state.trainAcc - state.valAcc;
    const valDroppedTwice =
      state.valAcc < state.prevValAcc && state.prevValAcc < state.prevPrevValAcc;
    const canTrigger = !state.earlyStopUsed || (fx.earlyStopTier >= 2 && state.earlyStopRearmed);
    if (canTrigger && (gapNow >= fx.earlyStopGap || valDroppedTwice)) {
      if (!state.earlyStopUsed) {
        state.earlyStopUsed = true;
      } else {
        state.earlyStopRearmed = false;
      }
      state.earlyStopFrozen = fx.earlyStopFreeze;
      state.valAcc = clamp(state.valAcc + fx.earlyStopSalvage, 0, state.trainAcc);
      showToast('🛑 Early stopping saved your checkpoint.', 'warning');
    }
  }

  if (state.earlyStopFrozen > 0) {
    state.earlyStopFrozen--;
    if (fx.earlyStopTier >= 2 && state.earlyStopUsed && !state.earlyStopRearmed && state.earlyStopFrozen === 0) {
      state.earlyStopRearmed = true;
    }
  }

  // Val tries to track train, pulled by gap
  const valPull = (state.trainAcc - fx.overfitReduction * 80 - state.valAcc) * 0.08;
  state.valAcc += valPull;
  state.valAcc = clamp(state.valAcc, 0, state.trainAcc);

  // Underfit risk from stacked regularization
  const regStack = fx.regCount >= 2 ? 1.3 : 1;
  const targetUnderfit = clamp(
    (fx.underfitPenalty * regStack + fx.trainSlowdown * 2) * 1.2,
    0,
    1
  );
  state.underfitRisk = lerp(state.underfitRisk, targetUnderfit, 0.3);

  // Underfit caps learning ceiling
  if (state.underfitRisk > 0.5) {
    const ceiling = 55 + (1 - state.underfitRisk) * 40;
    state.trainAcc = Math.min(state.trainAcc, ceiling);
    state.valAcc = Math.min(state.valAcc, ceiling - 5);
  }

  // Track peaks
  state.peakTrain = Math.max(state.peakTrain, state.trainAcc);
  state.peakVal = Math.max(state.peakVal, state.valAcc);

  // History for chart
  state.history.push({
    epoch: state.epoch,
    train: round1(state.trainAcc),
    val: round1(state.valAcc),
  });
  if (state.history.length > 60) state.history.shift();

  // Underfit lockout: only when model is regularized too heavily and still below threshold
  const effectiveVal = state.valAcc + fx.valThresholdBonus;
  const cleared = effectiveVal >= wave.threshold;
  const underfitLockoutActive =
    state.epochInWave >= 3 &&
    state.underfitRisk > 0.28 &&
    state.trainAcc < wave.threshold + 5;

  if (!cleared && underfitLockoutActive) {
    state.underfitStreak++;
  } else {
    state.underfitStreak = 0;
  }

  // Game over checks
  if (state.valAcc <= 0) {
    endGame('collapsed');
    return;
  }
  if (state.underfitStreak >= 3) {
    endGame('underfit');
    return;
  }

  state.epoch++;
  state.epochInWave++;

  state.prevPrevValAcc = state.prevValAcc;
  state.prevValAcc = state.valAcc;

  // Wave transition
  if (state.epochInWave >= WAVE_EPOCHS) {
    if (effectiveVal < wave.threshold) {
      endGame('wave_failed');
      return;
    }
    advanceWave();
  }

  updateUI();
}

function advanceWave() {
  state.wavesCleared++;
  state.waveIndex++;
  state.epochInWave = 0;
  state.earlyStopUsed = false;
  state.earlyStopFrozen = 0;
  state.earlyStopRearmed = false;

  if (state.waveIndex >= WAVES.length) {
    endGame('victory');
    return;
  }

  const income = WAVE_INCOME[Math.min(state.waveIndex, WAVE_INCOME.length - 1)] ?? 45;
  state.budget += income;
  showToast(`Wave ${state.waveIndex + 1} incoming! +$${income} compute budget`, 'warning');
}

// ─── Player actions ────────────────────────────────────────────────
function placeDefense(type) {
  if (selectedSlot === null) return false;
  if (state.slots[selectedSlot]) return false;

  const def = DEFENSES[type];
  if (state.budget < def.placeCost) return false;

  state.budget -= def.placeCost;
  state.totalSpent += def.placeCost;
  state.slots[selectedSlot] = { type, tier: 0 };
  selectedSlot = null;
  updateUI();
  return true;
}

function upgradeDefense(slotIndex) {
  const slot = state.slots[slotIndex];
  if (!slot) return false;

  const def = DEFENSES[slot.type];
  if (slot.tier >= 2) return false;

  const cost = def.upgradeCosts[slot.tier];
  if (state.budget < cost) return false;

  state.budget -= cost;
  state.totalSpent += cost;
  slot.tier++;
  updateUI();
  return true;
}

function removeDefense(slotIndex) {
  const slot = state.slots[slotIndex];
  if (!slot || state.gameOver) return false;

  const def = DEFENSES[slot.type];
  let invested = def.placeCost;
  for (let t = 0; t < slot.tier; t++) invested += def.upgradeCosts[t];

  const refund = Math.floor(invested * 0.5);
  state.budget += refund;
  state.slots[slotIndex] = null;
  if (selectedSlot === slotIndex) selectedSlot = null;

  showToast(`Removed ${def.name} (+$${refund} refund)`, 'warning');
  updateUI();
  return true;
}

// ─── Wave failure diagnosis ─────────────────────────────────────────
function diagnoseWaveFailure(wave, fx) {
  const effectiveVal = round1(state.valAcc + fx.valThresholdBonus);
  const required = wave.threshold;
  const shortfall = round1(Math.max(0, required - effectiveVal));
  const gap = round1(state.trainAcc - state.valAcc);
  const reasons = [];
  const fixes = [];

  const bonusNote = fx.valThresholdBonus > 0
    ? ` (incl. +${fx.valThresholdBonus}% CV bonus)`
    : '';
  reasons.push(
    `Wave ended after ${WAVE_EPOCHS} epochs — needed <strong>${required}%</strong> val accuracy but reached <strong>${effectiveVal}%</strong>${bonusNote}, <strong>${shortfall}% short</strong>.`
  );

  const tooMuchReg = state.underfitRisk > 0.45 || fx.regCount >= 2;
  const cantLearn = state.trainAcc < required - 3;

  if (tooMuchReg && cantLearn) {
    reasons.push(
      `<strong>Underfit</strong> — ${fx.regCount} regularizer(s) capped learning (Underfit Risk ${round1(state.underfitRisk * 100)}%). Train Acc only ${round1(state.trainAcc)}%, so val could not reach ${required}%.`
    );
    fixes.push('Remove or downgrade Dropout / L1-L2 — stacking them lowers your learning ceiling.');
    if (fx.regCount >= 2) {
      fixes.push('Keep at most one heavy regularizer early; add wave-specific defenses instead.');
    }
  } else if (gap > 10 && state.overfitRisk > 0.35) {
    reasons.push(
      `<strong>Overfit gap</strong> — Train (${round1(state.trainAcc)}%) outran Val (${round1(state.valAcc)}%) by ${gap}%. Validation bled while training looked healthy.`
    );
    fixes.push('Add Dropout, L1/L2, or Early Stopping before the train/val gap exceeds ~10%.');
    if (fx.earlyStopTier < 0) {
      fixes.push('Early Stopping gives a one-per-wave save when the gap widens — place it by Wave 2.');
    } else if (!state.earlyStopUsed) {
      fixes.push('Early Stopping was available but never triggered — act before val starts dropping.');
    }
  } else if (shortfall <= 5) {
    reasons.push(
      `<strong>Close miss</strong> — val climbed too slowly; you were ${shortfall}% from clearing with ${round1(state.valAcc)}% raw val.`
    );
    fixes.push('Upgrade key defenses one tier (↑) mid-wave instead of buying new ones late.');
    if (fx.valThresholdBonus === 0) {
      fixes.push('Cross-Validation adds up to +6% threshold bonus — can turn a near-miss into a clear.');
    }
  }

  if (wave.noiseLevel > 0.2 && fx.noisyDefense < 0.35) {
    reasons.push(
      `<strong>Noisy labels</strong> — ~${round1(wave.noiseLevel * 100)}% bad labels hurt metrics. Noisy defense: ${round1(fx.noisyDefense * 100)}%.`
    );
    fixes.push('Deploy Data Augmentation and/or Cross-Validation before the noisy-label wave ends.');
  }
  if (wave.imbalanceLevel > 0.3 && fx.imbalanceDefense < 0.35) {
    reasons.push(
      `<strong>Class imbalance</strong> — validation punishes minority classes. Imbalance defense: ${round1(fx.imbalanceDefense * 100)}%.`
    );
    fixes.push('Add Class Weighting / Focal Loss or upgrade Data Augmentation for imbalance.');
  }
  if (wave.outlierLevel > 0.3 && fx.outlierDefense < 0.4) {
    reasons.push(
      `<strong>Outlier storm</strong> — extreme inputs destabilized training. Outlier defense: ${round1(fx.outlierDefense * 100)}%.`
    );
    fixes.push('Input Clipping & Normalization clips raw features — Batch Norm alone is not enough.');
  }
  if (wave.gradientRisk > 0.2) {
    const shield = Math.max(fx.gradientShield, fx.gradientClipShield);
    if (shield < 0.55) {
      reasons.push(
        `<strong>Gradient explosions</strong> — unstable updates damaged val (shield ${round1(shield * 100)}%).`
      );
      fixes.push('Stack Gradient Clipping + Batch Normalization before Wave 5.');
    }
  }

  const placed = state.slots.filter(Boolean).length;
  if (placed === 0) {
    reasons.push('<strong>No defenses</strong> — raw training could not counter wave hazards.');
    fixes.push('Use the shop before epoch 3 — even one tier-1 defense changes the curve.');
  } else if (placed < 2 && state.waveIndex >= 2) {
    fixes.push('Later waves need 2–3 complementary defenses — not one maxed-out regularizer.');
  }

  if (fixes.length === 0) {
    fixes.push('Read the wave panel before it starts — match the specialist defense to the hazard.');
    fixes.push('Balance regularizers with val-boosting tools (Batch Norm, LR Scheduler, Cross-Val).');
  }

  return {
    reasons,
    fixes,
    shortfall,
    waveName: wave.name,
    summary: `${shortfall}% below ${wave.name} threshold`,
  };
}

function getWaveFailurePreview(wave, fx, effectiveVal) {
  const shortfall = round1(wave.threshold - effectiveVal);
  if (shortfall <= 0) return null;
  if (state.underfitRisk > 0.5 && state.trainAcc < wave.threshold) {
    return `⚠ ${shortfall}% short — remove regularizers`;
  }
  if (state.trainAcc - state.valAcc > 12) {
    return `⚠ ${shortfall}% short — stop overfitting`;
  }
  if (wave.noiseLevel > 0 && fx.noisyDefense < 0.3) {
    return `⚠ ${shortfall}% short — add noisy-label defenses`;
  }
  if (wave.imbalanceLevel > 0 && fx.imbalanceDefense < 0.3) {
    return `⚠ ${shortfall}% short — add class weighting`;
  }
  if (wave.outlierLevel > 0 && fx.outlierDefense < 0.35) {
    return `⚠ ${shortfall}% short — add input clipping`;
  }
  if (wave.gradientRisk > 0 && Math.max(fx.gradientShield, fx.gradientClipShield) < 0.5) {
    return `⚠ ${shortfall}% short — add gradient clipping`;
  }
  return `⚠ ${shortfall}% short — upgrade defenses`;
}

// ─── Game over & postmortem ─────────────────────────────────────────
function endGame(reason) {
  state.gameOver = true;
  state.deathReason = reason;
  running = false;
  if (epochTimer) clearInterval(epochTimer);

  saveTrainExport({
    valAcc: state.valAcc,
    trainAcc: state.trainAcc,
    overfitRisk: state.overfitRisk,
    underfitRisk: state.underfitRisk,
    outcome: reason,
  });

  if (reason === 'wave_failed') {
    const dx = diagnoseWaveFailure(getCurrentWave(), getDefenseEffects());
    showToast(`Wave failed — ${dx.summary}. See postmortem for fixes.`, 'danger');
  }

  showPostmortem(reason);
  updateUI();
}

function showPostmortem(reason) {
  const wave = getCurrentWave();
  const gap = round1(state.peakTrain - state.peakVal);
  const fx = getDefenseEffects();

  let cause = '';
  let advice = '';

  switch (reason) {
    case 'collapsed':
      cause = `Your model <strong>collapsed to 0% validation accuracy</strong> on Epoch ${state.epoch} during the ${wave.name}. Train accuracy was ${round1(state.trainAcc)}% but validation completely failed — classic catastrophic overfitting or unstable training.`;
      advice = gap > 20
        ? `<strong>Try this:</strong> Your train/val gap peaked at ${gap}%. Add Dropout or L1/L2 Regularization earlier — before train accuracy runs away from validation.`
        : `<strong>Try this:</strong> Val accuracy collapsed suddenly. Batch Normalization helps stabilize training. Check if gradient explosions (Wave 5) caught you without defenses.`;
      break;

    case 'bankrupt':
      cause = `You went <strong>bankrupt</strong> on Epoch ${state.epoch}. Compute budget hit $${round1(state.budget)} and couldn't recover. Defense upkeep ($${fx.upkeep}/epoch) exceeded your income.`;
      advice = `<strong>Try this:</strong> Cheaper defenses like L1/L2 Regularization ($10) give good value. Don't max-upgrade everything — tier 1 is often enough early on. You cleared ${state.wavesCleared} wave(s).`;
      break;

    case 'underfit':
      cause = `Your model <strong>underfit</strong> — validation accuracy stayed below the ${wave.threshold}% threshold for 3 consecutive epochs. Train: ${round1(state.trainAcc)}%, Val: ${round1(state.valAcc)}%. Too much regularization prevented learning.`;
      advice = `<strong>Try this:</strong> Underfit risk was ${round1(state.underfitRisk * 100)}%. You had ${fx.regCount} regularization defense(s). Remove or downgrade Dropout/L1/L2 — stacking them caps your learning ceiling.`;
      break;

    case 'wave_failed': {
      const dx = diagnoseWaveFailure(wave, fx);
      cause = `<strong>Why this happened — ${dx.waveName}</strong><ul class="postmortem-list">${dx.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>`;
      advice = `<strong>How to fix it</strong><ul class="postmortem-list fix">${dx.fixes.map((f) => `<li>${f}</li>`).join('')}</ul>`;
      break;
    }

    case 'victory':
      cause = `<strong>Victory!</strong> You survived all ${WAVES.length} waves. Final Train: ${round1(state.trainAcc)}%, Val: ${round1(state.valAcc)}%, Gap: ${gap}%.`;
      advice = `<strong>Well done!</strong> You balanced bias-variance tradeoffs. Peak overfit risk: ${round1(state.overfitRisk * 100)}%, underfit risk: ${round1(state.underfitRisk * 100)}%.`;
      break;

    default:
      cause = 'Training run ended unexpectedly.';
      advice = 'Adjust your defense strategy and try again.';
  }

  document.getElementById('postmortem-cause').innerHTML = cause;
  document.getElementById('postmortem-stats').innerHTML = `
    Epoch reached: ${state.epoch}<br>
    Waves cleared: ${state.wavesCleared} / ${WAVES.length}<br>
    Peak Train Acc: ${round1(state.peakTrain)}% · Peak Val Acc: ${round1(state.peakVal)}%<br>
    Final gap: ${round1(state.trainAcc - state.valAcc)}% · Budget spent: $${state.totalSpent}<br>
    Defenses placed: ${state.slots.filter(Boolean).length}
  `;
  document.getElementById('postmortem-advice').innerHTML = advice;
  document.getElementById('postmortem-overlay').classList.remove('hidden');

  const deployBtn = document.getElementById('deploy-btn');
  const titleEl = document.getElementById('postmortem-title');
  if (deployBtn && titleEl) {
    const canDeploy = reason === 'victory' || state.valAcc >= 55;
    deployBtn.classList.toggle('hidden', !canDeploy);
    titleEl.textContent = reason === 'victory'
      ? 'Training Complete!'
      : reason === 'wave_failed'
        ? 'Wave Failed — Postmortem'
        : 'Run Failed — Postmortem';
  }
}

// ─── UI updates ────────────────────────────────────────────────────
function updateUI() {
  const wave = getCurrentWave();
  const fx = getDefenseEffects();

  document.getElementById('train-acc').textContent = `${round1(state.trainAcc)}%`;
  document.getElementById('val-acc').textContent = `${round1(state.valAcc)}%`;
  document.getElementById('budget').textContent = `$${Math.floor(state.budget)}`;
  document.getElementById('epoch').textContent = state.epoch;

  document.getElementById('train-bar').style.width = `${state.trainAcc}%`;
  document.getElementById('val-bar').style.width = `${state.valAcc}%`;

  document.getElementById('overfit-meter').style.width = `${state.overfitRisk * 100}%`;
  document.getElementById('underfit-meter').style.width = `${state.underfitRisk * 100}%`;

  const overfitHint = state.overfitRisk > 0.6
    ? '⚠ Gap widening — val acc at risk!'
    : state.overfitRisk > 0.3
      ? 'Train outpacing validation'
      : 'Gap under control';
  document.getElementById('overfit-hint').textContent = overfitHint;

  const underfitHint = state.underfitRisk > 0.6
    ? '⚠ Learning ceiling too low!'
    : state.underfitRisk > 0.3
      ? 'Regularization stacking up'
      : 'Model capacity OK';
  document.getElementById('underfit-hint').textContent = underfitHint;

  const waveBadgeEl = document.getElementById('wave-badge');
  if (waveBadgeEl) waveBadgeEl.textContent = `Wave ${state.waveIndex + 1}`;
  const waveNameEl = document.getElementById('wave-name');
  if (waveNameEl) waveNameEl.textContent = wave.name;
  const waveDescEl = document.getElementById('wave-desc');
  if (waveDescEl) waveDescEl.textContent = wave.desc;
  const waveThresholdEl = document.getElementById('wave-threshold');
  if (waveThresholdEl) waveThresholdEl.textContent = `${wave.threshold}%`;

  const epochsLeft = WAVE_EPOCHS - state.epochInWave;
  const statusEl = document.getElementById('threshold-status');
  if (statusEl) {
    const effectiveVal = state.valAcc + fx.valThresholdBonus;
    if (effectiveVal >= wave.threshold) {
      statusEl.textContent = fx.valThresholdBonus > 0 ? '✓ Clearing (CV bonus)' : '✓ Clearing';
      statusEl.className = 'threshold-status pass';
    } else if (state.underfitStreak >= 2) {
      statusEl.textContent = `⚠ Underfit lockout in ${3 - state.underfitStreak} epoch(s)`;
      statusEl.className = 'threshold-status fail';
    } else if (epochsLeft <= 2 && running && !state.gameOver) {
      const preview = getWaveFailurePreview(wave, fx, effectiveVal);
      statusEl.textContent = preview || `⚠ ${round1(wave.threshold - effectiveVal)}% short — ${epochsLeft} left`;
      statusEl.className = 'threshold-status fail';
    } else {
      statusEl.textContent = '✗ Below threshold';
      statusEl.className = 'threshold-status warn';
    }
  }
  const waveTimerEl = document.getElementById('wave-timer');
  if (waveTimerEl) {
    waveTimerEl.textContent = running
      ? `Next batch: ${epochsLeft} epoch${epochsLeft !== 1 ? 's' : ''}`
      : 'Paused';
  }

  const modelNode = document.getElementById('model-node');
  if (modelNode) {
    modelNode.classList.toggle('danger', state.valAcc < wave.threshold * 0.85 || state.overfitRisk > 0.7);
  }
  const modelStatusEl = document.getElementById('model-status');
  if (modelStatusEl) {
    modelStatusEl.textContent =
      state.earlyStopFrozen > 0 ? 'Checkpoint saved…' :
      state.valAcc < 30 ? 'Collapsing!' :
      state.overfitRisk > 0.6 ? 'Overfitting…' :
      state.underfitRisk > 0.6 ? 'Underfitting…' : 'Learning…';
  }

  renderSlots();
  renderDefenseCards();
  updateChart();
}

function renderSlots() {
  const container = document.getElementById('defense-slots');
  container.innerHTML = '';

  state.slots.forEach((slot, i) => {
    const el = document.createElement('div');
    el.className = 'defense-slot';
    if (slot) el.classList.add('occupied');
    if (selectedSlot === i) el.classList.add('selected');

    if (slot) {
      const def = DEFENSES[slot.type];
      el.innerHTML = `
        <button class="remove-btn" data-slot="${i}" title="Remove (50% refund)">×</button>
        <span class="defense-tier">${slot.tier + 1}</span>
        <span class="defense-icon">${def.icon}</span>
        <span class="defense-name">${def.name.split(' ')[0]}</span>
        ${slot.tier < 2 ? `<button class="upgrade-btn" data-slot="${i}">↑ $${def.upgradeCosts[slot.tier]}</button>` : ''}
      `;
      const removeBtn = el.querySelector('.remove-btn');
      if (removeBtn) {
        removeBtn.disabled = state.gameOver;
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeDefense(i);
        });
      }
      const upgradeBtn = el.querySelector('.upgrade-btn');
      if (upgradeBtn) {
        upgradeBtn.disabled = state.budget < def.upgradeCosts[slot.tier];
        upgradeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          upgradeDefense(i);
        });
      }
    } else {
      el.innerHTML = `<span class="slot-empty">+ Slot ${i + 1}</span>`;
    }

    el.addEventListener('click', () => {
      selectedSlot = selectedSlot === i ? null : i;
      updateUI();
    });

    container.appendChild(el);
  });
}

function getDefenseCardStats(def) {
  const t = 0;
  const lines = [];

  if (def.id === 'earlyStopping') {
    lines.push(`<span class="stat-good">Reactive: saves once/wave</span>`);
    lines.push(`<span class="stat-bad">+${round1(def.underfitPenalty[t] * 100)}% underfit risk</span>`);
  } else if (def.id === 'crossVal') {
    lines.push(`<span class="stat-good">−${round1(def.valStability[t] * 100)}% val variance</span>`);
    lines.push(`<span class="stat-good">+${def.valThresholdBonus[t]} threshold bonus</span>`);
  } else if (def.id === 'classWeighting') {
    lines.push(`<span class="stat-good">+${round1(def.imbalanceDefense[t] * 100)}% vs imbalance</span>`);
    lines.push(`<span class="stat-bad">+${round1(def.underfitPenalty[t] * 100)}% underfit risk</span>`);
  } else if (def.id === 'inputClip') {
    lines.push(`<span class="stat-good">+${round1(def.outlierDefense[t] * 100)}% vs outliers</span>`);
    lines.push(`<span class="stat-bad">+${round1(def.underfitPenalty[t] * 100)}% underfit risk</span>`);
  } else if (def.id === 'gradClip') {
    lines.push(`<span class="stat-good">+${round1(def.gradientClipShield[t] * 100)}% gradient shield</span>`);
    lines.push(`<span class="stat-bad">+${round1(def.underfitPenalty[t] * 100)}% underfit risk</span>`);
  } else if (def.id === 'lrScheduler') {
    lines.push(`<span class="stat-good">−${round1(def.overfitReduction[t] * 100)}% overfit</span>`);
    lines.push(`<span class="stat-good">+${round1(def.explosionRecovery[t] * 100)}% explosion recovery</span>`);
  } else {
    const tier0 = def.overfitReduction[t];
    const tier0u = def.underfitPenalty[t];
    lines.push(`<span class="stat-good">−${round1(tier0 * 100)}% overfit</span>`);
    lines.push(`<span class="stat-bad">+${round1(tier0u * 100)}% underfit risk</span>`);
  }

  lines.push(`<span>Upkeep: $${def.upkeep[t]}/epoch</span>`);
  return lines.join('');
}

function renderDefenseCards() {
  const container = document.getElementById('defense-cards');
  container.innerHTML = '';

  Object.values(DEFENSES).forEach((def) => {
    const canAfford = state.budget >= def.placeCost;
    const hasSlot = selectedSlot !== null && !state.slots[selectedSlot];
    const card = document.createElement('div');
    card.className = 'defense-card';
    if (!canAfford || !hasSlot || state.gameOver) card.classList.add('disabled');

    card.innerHTML = `
      <div class="defense-card-header">
        <span class="defense-card-icon">${def.icon}</span>
        <span class="defense-card-name">${def.name}</span>
      </div>
      <p class="defense-card-desc">${def.desc}</p>
      <div class="defense-card-stats">
        ${getDefenseCardStats(def)}
      </div>
      <div class="defense-card-cost">Place: $${def.placeCost}</div>
    `;

    card.addEventListener('click', () => {
      if (canAfford && hasSlot && !state.gameOver) {
        placeDefense(def.id);
      }
    });

    container.appendChild(card);
  });
}

function showToast(msg, type = 'danger') {
  const toast = document.getElementById('event-toast');
  toast.textContent = msg;
  toast.className = 'event-toast' + (type === 'warning' ? ' warning' : '');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ─── Chart ─────────────────────────────────────────────────────────
function initChart() {
  const ctx = document.getElementById('accuracy-chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Train',
          data: [],
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34, 211, 238, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        },
        {
          label: 'Val',
          data: [],
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167, 139, 250, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      scales: {
        x: {
          display: true,
          title: { display: true, text: 'Epoch', color: '#94a3b8', font: { size: 10 } },
          ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 9 } },
          grid: { color: 'rgba(45, 58, 82, 0.5)' },
        },
        y: {
          min: 0,
          max: 100,
          title: { display: true, text: 'Accuracy %', color: '#94a3b8', font: { size: 10 } },
          ticks: { color: '#64748b', font: { size: 9 } },
          grid: { color: 'rgba(45, 58, 82, 0.5)' },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

function updateChart() {
  if (!chart) return;
  const labels = state.history.map((h) => h.epoch);
  chart.data.labels = labels;
  chart.data.datasets[0].data = state.history.map((h) => h.train);
  chart.data.datasets[1].data = state.history.map((h) => h.val);
  chart.update('none');
}

// ─── Utilities ─────────────────────────────────────────────────────
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// ─── Game lifecycle ─────────────────────────────────────────────────
function startGame() {
  initState();
  selectedSlot = null;
  running = true;
  document.getElementById('start-overlay').classList.add('hidden');
  document.getElementById('postmortem-overlay').classList.add('hidden');

  if (epochTimer) clearInterval(epochTimer);
  epochTimer = setInterval(simulateEpoch, EPOCH_INTERVAL_MS);

  updateUI();
}

function init() {
  initChart();
  initState();
  renderSlots();
  renderDefenseCards();
  updateUI();

  document.getElementById('start-btn')?.addEventListener('click', startGame);
  document.getElementById('restart-btn')?.addEventListener('click', startGame);
}

if (!window.ML_SURVIVOR_NO_AUTO_INIT) {
  document.addEventListener('DOMContentLoaded', init);
}
