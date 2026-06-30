/**
 * DEPLOY: Model in Production
 * MLOps tower-defense — traffic + drift
 */

const INFRA = {
  loadBalancer: {
    id: 'loadBalancer',
    name: 'Load Balancer',
    icon: '⚖️',
    desc: 'Distributes requests across replicas. Cuts latency spikes when load exceeds capacity.',
    placeCost: 18,
    upgradeCosts: [28, 42],
    upkeep: [2, 4, 6],
    capacityMult: [1.12, 1.28, 1.45],
    latencyReduction: [0.10, 0.20, 0.30],
  },
  modelReplica: {
    id: 'modelReplica',
    name: 'Model Replica',
    icon: '🖥️',
    desc: 'Inference compute node. More tiers = more RPS capacity, but higher $/epoch upkeep.',
    placeCost: 22,
    upgradeCosts: [38, 52],
    upkeep: [4, 8, 13],
    capacity: [40, 85, 135],
  },
  monitoring: {
    id: 'monitoring',
    name: 'Monitoring Node',
    icon: '📡',
    desc: 'Reveals the Drift Meter. Without it, drift is invisible until accuracy crashes.',
    placeCost: 12,
    upgradeCosts: [20, 30],
    upkeep: [1, 2, 3],
    driftWarning: [0, 0.08, 0.15],
  },
  retraining: {
    id: 'retraining',
    name: 'Retraining Pipeline',
    icon: '🔁',
    desc: 'Refresh the model on new data. Fixes drift but costs $, takes epochs, and can fail.',
    placeCost: 28,
    upgradeCosts: [45, 65],
    upkeep: [3, 5, 7],
    retrainCost: [40, 32, 26],
    retrainDuration: [5, 4, 3],
    accuracyRestore: [0.82, 0.90, 0.96],
    driftReset: [0.55, 0.72, 0.88],
    badRetrainChance: [0.20, 0.14, 0.09],
    postDeployFragile: [2, 1, 1],
  },
  serverless: {
    id: 'serverless',
    name: 'Serverless Endpoint',
    icon: '☁️',
    desc: 'Auto-scales inference on traffic spikes. Great for bursts — cold starts hurt latency, and sustained load gets expensive.',
    placeCost: 20,
    upgradeCosts: [32, 48],
    upkeep: [1, 2, 3],
    burstCapacity: [50, 80, 105],
    coldStartLatency: [50, 30, 12],
    sustainedTax: [6, 4, 2],
  },
  cacheLayer: {
    id: 'cacheLayer',
    name: 'Prediction Cache',
    icon: '💾',
    desc: 'Caches repeated predictions to cut compute and latency. Saves money — but stale cache hides drift when the world changes.',
    placeCost: 16,
    upgradeCosts: [26, 40],
    upkeep: [2, 3, 4],
    cacheHitRate: [0.25, 0.40, 0.55],
    loadReduction: [0.22, 0.35, 0.48],
    driftBlindness: [0.12, 0.18, 0.24],
    incomeBonus: [1.08, 1.12, 1.18],
  },
  canary: {
    id: 'canary',
    name: 'Canary Deployment',
    icon: '🐤',
    desc: 'Rolls out a retrained model to a tiny traffic slice first. Catches bad retrains before they tank everyone — full rollout takes longer.',
    placeCost: 24,
    upgradeCosts: [36, 52],
    upkeep: [3, 4, 5],
    canaryShare: [0.05, 0.10, 0.20],
    promoteEpochs: [2, 1, 1],
    badRetrainMitigation: [0.88, 0.94, 0.98],
  },
  rateLimit: {
    id: 'rateLimit',
    name: 'Rate Limit Gateway',
    icon: '🛡️',
    desc: 'Throttles abusive request floods and rejects garbage inputs. Stops probing attacks — but set it too tight and real spike traffic gets blocked.',
    placeCost: 14,
    upgradeCosts: [22, 34],
    upkeep: [2, 3, 4],
    adversarialDefense: [0.35, 0.55, 0.75],
    latencyOverhead: [12, 20, 28],
    spikeThrottle: [0.08, 0.04, 0.01],
  },
};

const SLOT_COUNT = 5;
const TICK_MS = 2000;
const WAVE_EPOCHS = 8;
const STARTING_BUDGET = 120;
const SLA_THRESHOLD = 70;
const SLA_FAIL_EPOCHS = 5;
const LATENCY_TIMEOUT = 480;
const LATENCY_FAIL_EPOCHS = 4;
const STALE_EPOCHS = 10;

const WAVES = [
  {
    id: 1,
    name: 'Normal Traffic',
    desc: 'Steady production load. Drift accumulates slowly — the default production reality.',
    mlConcept: 'Baseline serving: models decay even when nothing "breaks."',
    baseRps: 35,
    driftRate: 0.025,
    conceptDrift: 0,
    dataDriftBoost: 0,
  },
  {
    id: 2,
    name: 'Traffic Spike',
    desc: 'RPS surges like a flash sale or viral moment. Under-provisioned infra = latency death spiral.',
    mlConcept: 'Auto-scaling vs cost — same tradeoff as Server Survival under DDoS-like load.',
    baseRps: 95,
    driftRate: 0.03,
    conceptDrift: 0,
    dataDriftBoost: 0,
  },
  {
    id: 3,
    name: 'Concept Drift Event',
    desc: 'User behavior shifted (post-holiday, new UI). Live accuracy drops unless you retrain.',
    mlConcept: 'Concept drift — P(y|X) changed. Retraining is the fix, but it\'s not free.',
    baseRps: 45,
    driftRate: 0.04,
    conceptDrift: 12,
    dataDriftBoost: 0,
  },
  {
    id: 4,
    name: 'Data Drift Event',
    desc: 'Input feature distributions shifted (new devices, demographics). Silent decay accelerates.',
    mlConcept: 'Data drift — P(X) changed. Only visible if you\'re measuring with Monitoring.',
    baseRps: 40,
    driftRate: 0.035,
    conceptDrift: 0,
    dataDriftBoost: 0.045,
    adversarialLevel: 0,
  },
  {
    id: 5,
    name: 'Adversarial Traffic',
    desc: 'Automated probes and adversarial inputs flood the API. Rate limiting and input validation are critical.',
    mlConcept: 'Adversarial/abuse traffic — garbage inputs and probing attacks degrade model metrics and stability.',
    baseRps: 55,
    driftRate: 0.028,
    conceptDrift: 0,
    dataDriftBoost: 0.02,
    adversarialLevel: 0.42,
  },
];

let state = {};
let profile = null;
let chart = null;
let tickTimer = null;
let selectedSlot = null;
let running = false;

function getInfraEffects() {
  const fx = {
    capacity: 0,
    capacityMult: 1,
    latencyReduction: 0,
    upkeep: 0,
    hasMonitoring: false,
    driftWarning: 0,
    retrainTier: -1,
    hasRetraining: false,
    serverlessCapacity: 0,
    coldStartLatency: 0,
    sustainedTax: 0,
    cacheHitRate: 0,
    loadReduction: 0,
    driftBlindness: 0,
    incomeBonus: 1,
    canaryTier: -1,
    canaryShare: 0,
    canaryPromoteEpochs: 0,
    badRetrainMitigation: 0,
    adversarialDefense: 0,
    latencyOverhead: 0,
    spikeThrottle: 0,
  };

  for (const slot of state.slots) {
    if (!slot) continue;
    const def = INFRA[slot.type];
    const t = slot.tier;
    fx.upkeep += def.upkeep[t];

    if (slot.type === 'loadBalancer') {
      fx.capacityMult = def.capacityMult[t];
      fx.latencyReduction = def.latencyReduction[t];
    }
    if (slot.type === 'modelReplica') {
      fx.capacity += def.capacity[t];
    }
    if (slot.type === 'monitoring') {
      fx.hasMonitoring = true;
      fx.driftWarning = def.driftWarning[t];
    }
    if (slot.type === 'retraining') {
      fx.hasRetraining = true;
      fx.retrainTier = t;
    }
    if (slot.type === 'serverless') {
      fx.serverlessCapacity = Math.max(fx.serverlessCapacity, def.burstCapacity[t]);
      fx.coldStartLatency = def.coldStartLatency[t];
      fx.sustainedTax = def.sustainedTax[t];
    }
    if (slot.type === 'cacheLayer') {
      fx.cacheHitRate = Math.max(fx.cacheHitRate, def.cacheHitRate[t]);
      fx.loadReduction = Math.max(fx.loadReduction, def.loadReduction[t]);
      fx.driftBlindness = Math.max(fx.driftBlindness, def.driftBlindness[t]);
      fx.incomeBonus = Math.max(fx.incomeBonus, def.incomeBonus[t]);
    }
    if (slot.type === 'canary') {
      if (t >= fx.canaryTier) {
        fx.canaryTier = t;
        fx.canaryShare = def.canaryShare[t];
        fx.canaryPromoteEpochs = def.promoteEpochs[t];
        fx.badRetrainMitigation = def.badRetrainMitigation[t];
      }
    }
    if (slot.type === 'rateLimit') {
      fx.adversarialDefense = Math.max(fx.adversarialDefense, def.adversarialDefense[t]);
      fx.latencyOverhead = Math.max(fx.latencyOverhead, def.latencyOverhead[t]);
      fx.spikeThrottle = def.spikeThrottle[t];
    }
  }

  fx.effectiveCapacity = Math.round((fx.capacity + fx.serverlessCapacity) * fx.capacityMult);
  return fx;
}

function getCurrentWave() {
  return WAVES[Math.min(state.waveIndex, WAVES.length - 1)];
}

function initState(modelProfile) {
  profile = modelProfile;
  const baseline = profile.valAcc;

  state = {
    epoch: 1,
    waveIndex: 0,
    epochInWave: 0,
    baselineAccuracy: baseline,
    liveAccuracy: baseline,
    ghostAccuracy: baseline,
    drift: 0,
    latency: 85,
    currentRps: WAVES[0].baseRps,
    budget: STARTING_BUDGET,
    slots: Array(SLOT_COUNT).fill(null),
    gameOver: false,
    deathReason: null,
    slaStreak: 0,
    latencyStreak: 0,
    epochsSinceRetrain: 0,
    retrainActive: false,
    retrainEpochsLeft: 0,
    retrainFragileEpochs: 0,
    totalRetrains: 0,
    badRetrains: 0,
    silentDriftEpochs: 0,
    peakLive: baseline,
    totalSpent: 0,
    totalEarned: 0,
    history: [{ epoch: 0, live: baseline, ghost: baseline }],
    hadMonitoring: false,
    canaryEpochsLeft: 0,
    canaryBonusPending: 0,
    serverlessColdEpochs: 0,
    overloadEpochs: 0,
  };
}

function simulateTick() {
  if (state.gameOver || !running) return;

  const wave = getCurrentWave();
  const fx = getInfraEffects();
  state.currentRps = wave.baseRps;

  state.budget -= fx.upkeep;

  const effectiveRps = Math.round(state.currentRps * (1 - fx.loadReduction * fx.cacheHitRate));
  const capacity = Math.max(fx.effectiveCapacity, 8);
  const loadRatio = effectiveRps / capacity;
  let servedRatio = clamp(loadRatio > 1 ? capacity / effectiveRps : 1, 0.15, 1);

  if (wave.baseRps >= 90 && fx.spikeThrottle > 0) {
    servedRatio *= (1 - fx.spikeThrottle);
  }

  let latency = 70 + Math.max(0, loadRatio - 1) * 220;
  latency *= (1 - fx.latencyReduction);
  latency += fx.latencyOverhead;
  if (state.retrainActive) latency += 65;
  if (state.retrainFragileEpochs > 0) latency += 25;

  if (fx.serverlessCapacity > 0 && state.epochInWave <= 2 && wave.baseRps >= 70) {
    latency += fx.coldStartLatency;
    state.serverlessColdEpochs = Math.max(state.serverlessColdEpochs, 1);
  }

  state.latency = round1(latency);

  if (loadRatio > 1) {
    state.overloadEpochs++;
    if (fx.sustainedTax > 0 && fx.serverlessCapacity > 0 && state.overloadEpochs >= 3) {
      state.budget -= fx.sustainedTax;
    }
  } else {
    state.overloadEpochs = 0;
  }

  const fragility = profile.fragility;
  let driftRate = wave.driftRate * (1 + fragility * 0.85);

  if (state.epochsSinceRetrain >= STALE_EPOCHS) {
    driftRate *= 1 + (state.epochsSinceRetrain - STALE_EPOCHS) * 0.08;
  }
  if (state.retrainFragileEpochs > 0) {
    driftRate *= 1.25;
    state.retrainFragileEpochs--;
  }

  if (wave.dataDriftBoost > 0) {
    driftRate += wave.dataDriftBoost * (fx.hasMonitoring ? 1 : 1.35);
  }

  state.drift = clamp(state.drift + driftRate, 0, 1);

  let accDecay = driftRate * 18 * (1 + fragility * 0.6);
  if (wave.conceptDrift > 0) {
    const retrainMitigation = state.retrainActive ? 0.4 : 0;
    accDecay += wave.conceptDrift * (1 - retrainMitigation) * 0.35;
  }
  if (wave.dataDriftBoost > 0 && fx.driftBlindness > 0) {
    accDecay += wave.dataDriftBoost * fx.driftBlindness * 12;
  }
  if (wave.adversarialLevel > 0) {
    accDecay += wave.adversarialLevel * (1 - fx.adversarialDefense) * 14;
  }

  state.ghostAccuracy = clamp(state.ghostAccuracy - accDecay, 0, 100);
  state.liveAccuracy = clamp(state.liveAccuracy - accDecay, 0, 100);

  if (state.canaryEpochsLeft > 0) {
    state.canaryEpochsLeft--;
    if (state.canaryEpochsLeft <= 0 && state.canaryBonusPending > 0) {
      state.liveAccuracy = clamp(state.liveAccuracy + state.canaryBonusPending, 0, 100);
      state.canaryBonusPending = 0;
      showToast('🐤 Canary promoted — full rollout complete.', 'warning');
    }
  }

  if (!fx.hasMonitoring) {
    if (state.drift > 0.15) state.silentDriftEpochs++;
  } else {
    state.hadMonitoring = true;
    state.silentDriftEpochs = 0;
  }

  if (state.retrainActive) {
    state.retrainEpochsLeft--;
    if (state.retrainEpochsLeft <= 0) {
      completeRetrain(fx);
    }
  } else {
    state.epochsSinceRetrain++;
  }

  const requestIncome = servedRatio * state.currentRps * 0.22 * fx.incomeBonus;
  const latencyBonus = state.latency < 200 ? 1.15 : state.latency < 350 ? 1 : 0.55;
  const income = requestIncome * latencyBonus;
  state.budget += income;
  state.totalEarned += income;

  if (state.latency > LATENCY_TIMEOUT) {
    state.latencyStreak++;
  } else {
    state.latencyStreak = 0;
  }

  if (state.liveAccuracy < SLA_THRESHOLD) {
    state.slaStreak++;
  } else {
    state.slaStreak = 0;
  }

  state.peakLive = Math.max(state.peakLive, state.liveAccuracy);

  state.history.push({
    epoch: state.epoch,
    live: round1(state.liveAccuracy),
    ghost: round1(state.ghostAccuracy),
  });
  if (state.history.length > 60) state.history.shift();

  if (state.liveAccuracy <= 0) {
    endGame('accuracy_zero');
    return;
  }
  if (state.slaStreak >= SLA_FAIL_EPOCHS) {
    endGame('sla_breach');
    return;
  }
  if (state.latencyStreak >= LATENCY_FAIL_EPOCHS) {
    endGame('latency_timeout');
    return;
  }
  if (state.budget < -15 && state.budget + income < 0) {
    endGame('bankrupt');
    return;
  }

  state.epoch++;
  state.epochInWave++;

  if (state.epochInWave >= WAVE_EPOCHS) {
    if (state.liveAccuracy < SLA_THRESHOLD) {
      endGame('wave_sla_failed');
      return;
    }
    advanceWave();
  }

  updateUI();
}

function completeRetrain(fx) {
  state.retrainActive = false;
  state.totalRetrains++;

  const def = INFRA.retraining;
  const t = fx.retrainTier;
  const badRoll = Math.random() < def.badRetrainChance[t];
  const hasCanary = fx.canaryTier >= 0;

  if (badRoll) {
    state.badRetrains++;
    let damage = 8 + Math.random() * 6;
    if (hasCanary) {
      damage *= 1 - fx.canaryShare * fx.badRetrainMitigation;
      showToast('🐤 Bad retrain caught by canary — limited blast radius.', 'warning');
    } else {
      showToast('Bad retrain! New data was dirty — accuracy dropped.', 'danger');
    }
    state.liveAccuracy -= damage;
  } else {
    const restoreTarget = clamp(
      Math.max(state.liveAccuracy, state.baselineAccuracy * def.accuracyRestore[t]) +
        (state.baselineAccuracy - state.liveAccuracy) * 0.15,
      0,
      state.baselineAccuracy + 2
    );
    const gain = restoreTarget - state.liveAccuracy;

    if (hasCanary && gain > 0) {
      const immediate = gain * (1 - fx.canaryShare);
      state.canaryBonusPending = gain * fx.canaryShare;
      state.canaryEpochsLeft = fx.canaryPromoteEpochs;
      state.liveAccuracy = clamp(state.liveAccuracy + immediate, 0, 100);
      showToast(`Retrain OK — canary rolling out (${fx.canaryPromoteEpochs} epoch(s) to full).`, 'warning');
    } else {
      state.liveAccuracy = restoreTarget;
      showToast('Retrain complete — model refreshed.', 'warning');
    }
    state.drift = clamp(state.drift * (1 - def.driftReset[t]), 0, 1);
  }

  state.epochsSinceRetrain = 0;
  state.retrainFragileEpochs = def.postDeployFragile[t];
}

function advanceWave() {
  state.waveIndex++;
  state.epochInWave = 0;
  state.overloadEpochs = 0;
  state.serverlessColdEpochs = 0;
  state.budget += 20 + state.waveIndex * 8;

  if (state.waveIndex >= WAVES.length) {
    endGame('victory');
    return;
  }

  showToast(`Wave ${state.waveIndex + 1}: ${WAVES[state.waveIndex].name}`, 'warning');
}

function triggerRetrain() {
  if (state.retrainActive || state.gameOver) return false;

  const fx = getInfraEffects();
  if (!fx.hasRetraining || fx.retrainTier < 0) return false;

  const def = INFRA.retraining;
  const t = fx.retrainTier;
  const cost = def.retrainCost[t];

  if (state.budget < cost) return false;

  state.budget -= cost;
  state.totalSpent += cost;
  state.retrainActive = true;
  state.retrainEpochsLeft = def.retrainDuration[t];
  showToast(`Retraining started — ${def.retrainDuration[t]} epochs, $${cost} spent.`, 'warning');
  updateUI();
  return true;
}

function placeInfra(type) {
  if (selectedSlot === null || state.slots[selectedSlot]) return false;

  const def = INFRA[type];
  if (state.budget < def.placeCost) return false;

  state.budget -= def.placeCost;
  state.totalSpent += def.placeCost;
  state.slots[selectedSlot] = { type, tier: 0 };
  selectedSlot = null;
  updateUI();
  return true;
}

function upgradeInfra(slotIndex) {
  const slot = state.slots[slotIndex];
  if (!slot) return false;

  const def = INFRA[slot.type];
  if (slot.tier >= 2) return false;

  const cost = def.upgradeCosts[slot.tier];
  if (state.budget < cost) return false;

  state.budget -= cost;
  state.totalSpent += cost;
  slot.tier++;
  updateUI();
  return true;
}

function removeInfra(slotIndex) {
  const slot = state.slots[slotIndex];
  if (!slot || state.gameOver) return false;

  if (slot.type === 'retraining' && state.retrainActive) {
    showToast('Cannot remove Retraining Pipeline while a retrain is running.', 'warning');
    return false;
  }

  const def = INFRA[slot.type];
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

// ─── Wave SLA failure diagnosis ─────────────────────────────────────
function diagnoseDeployWaveFailure(wave, fx) {
  const live = round1(state.liveAccuracy);
  const shortfall = round1(Math.max(0, SLA_THRESHOLD - live));
  const reasons = [];
  const fixes = [];

  reasons.push(
    `Wave ended after ${WAVE_EPOCHS} epochs — live accuracy must stay ≥ <strong>${SLA_THRESHOLD}%</strong>. You ended at <strong>${live}%</strong> (<strong>${shortfall}% below SLA</strong>).`
  );

  if (wave.conceptDrift > 0 && state.totalRetrains === 0) {
    reasons.push(
      `<strong>Concept drift</strong> — user behavior shifted (+${wave.conceptDrift} decay/epoch). No retrain was triggered.`
    );
    fixes.push('Deploy Retraining Pipeline and click Trigger Retrain when concept drift hits.');
  } else if (wave.conceptDrift > 0 && state.epochsSinceRetrain > 4) {
    reasons.push(
      `<strong>Stale model</strong> — last retrain was ${state.epochsSinceRetrain} epochs ago; drift kept eating accuracy.`
    );
    fixes.push('Retrain earlier in concept-drift waves — do not wait until SLA is already red.');
  }

  if (wave.dataDriftBoost > 0) {
    if (!fx.hasMonitoring) {
      reasons.push('<strong>Silent data drift</strong> — input distributions shifted but no Monitoring Node was deployed.');
      fixes.push('Monitoring Node surfaces drift early — pair it with scheduled retrains.');
    }
    if (fx.driftBlindness > 0.2) {
      reasons.push(
        `<strong>Cache blindness</strong> — Cache Layer stale hits (${round1(fx.driftBlindness * 100)}% drift blindness) accelerated decay.`
      );
      fixes.push('High cache tiers hide drift — retrain more often or use lower cache on drift waves.');
    }
  }

  if (wave.baseRps >= 90) {
    if (fx.effectiveCapacity < wave.baseRps) {
      reasons.push(
        `<strong>Traffic spike</strong> — ${wave.baseRps} RPS vs ${fx.effectiveCapacity} capacity. Overload throttled served traffic.`
      );
      fixes.push('Add Model Replicas or Serverless before Wave 2 — Load Balancer alone does not add capacity.');
    }
    if (fx.serverlessCapacity > 0 && state.serverlessColdEpochs > 0) {
      reasons.push('<strong>Cold starts</strong> — Serverless added latency at spike onset.');
      fixes.push('Pair Serverless with warm replicas or upgrade the Serverless tier.');
    }
  }

  if (wave.adversarialLevel > 0 && fx.adversarialDefense < 0.4) {
    reasons.push(
      `<strong>Adversarial traffic</strong> — probes degraded accuracy (defense ${round1(fx.adversarialDefense * 100)}%).`
    );
    fixes.push('Deploy Rate Limit Gateway before Wave 5.');
  }

  if (profile && profile.fragility > 0.45) {
    reasons.push(
      `<strong>Fragile model</strong> — imported model had ${round1(profile.fragility * 100)}% fragility; drift decay was amplified.`
    );
    fixes.push('Improve val accuracy in Train Mode before deploy — fragile models decay faster in production.');
  }

  if (state.drift > 0.35) {
    reasons.push(`<strong>High drift</strong> — accumulated ${round1(state.drift * 100)}% drift this wave.`);
    if (!fx.hasRetraining) {
      fixes.push('Retraining Pipeline is required for sustained production accuracy.');
    }
  }

  if (state.totalRetrains === 0 && wave.id >= 3) {
    reasons.push('<strong>No retrains</strong> — drift compounded across multiple production events.');
    fixes.push('Trigger Retrain when live accuracy dips or drift rises — ghost accuracy shows what happens without it.');
  }

  if (fixes.length === 0) {
    fixes.push('Balance infra spend: enough capacity for spikes plus monitoring/retrain for drift.');
    fixes.push('Watch the SLA meter — retrain proactively when the drift curve rises, not after breach.');
  }

  return {
    reasons,
    fixes,
    shortfall,
    waveName: wave.name,
    summary: `${shortfall}% below SLA at end of ${wave.name}`,
  };
}

function getDeployWaveFailurePreview(wave, fx) {
  const shortfall = round1(SLA_THRESHOLD - state.liveAccuracy);
  if (shortfall <= 0) return null;
  const epochsLeft = WAVE_EPOCHS - state.epochInWave;
  if (wave.conceptDrift > 0 && state.totalRetrains === 0) {
    return `⚠ ${shortfall}% below SLA — trigger retrain (${epochsLeft} left)`;
  }
  if (wave.baseRps >= 90 && fx.effectiveCapacity < wave.baseRps) {
    return `⚠ ${shortfall}% below SLA — add capacity (${epochsLeft} left)`;
  }
  if (wave.adversarialLevel > 0 && fx.adversarialDefense < 0.4) {
    return `⚠ ${shortfall}% below SLA — add rate limiting (${epochsLeft} left)`;
  }
  if (!fx.hasMonitoring && state.drift > 0.2) {
    return `⚠ ${shortfall}% below SLA — deploy monitoring (${epochsLeft} left)`;
  }
  return `⚠ ${shortfall}% below SLA — ${epochsLeft} epoch(s) left`;
}

function endGame(reason) {
  state.gameOver = true;
  state.deathReason = reason;
  running = false;
  if (tickTimer) clearInterval(tickTimer);

  if (reason === 'wave_sla_failed') {
    const dx = diagnoseDeployWaveFailure(getCurrentWave(), getInfraEffects());
    showToast(`Wave failed — ${dx.summary}. See postmortem for fixes.`, 'danger');
  }

  showPostmortem(reason);
  updateUI();
}

function showPostmortem(reason) {
  const wave = getCurrentWave();
  const fx = getInfraEffects();
  let cause = '';
  let advice = '';

  switch (reason) {
    case 'sla_breach':
      cause = `Live accuracy stayed below the <strong>${SLA_THRESHOLD}% SLA</strong> for ${SLA_FAIL_EPOCHS} consecutive epochs. Clients churned — contract terminated at epoch ${state.epoch}. Final accuracy: ${round1(state.liveAccuracy)}%.`;
      advice = state.silentDriftEpochs > 3 && !state.hadMonitoring
        ? `<strong>Lesson:</strong> Drift was invisible for ${state.silentDriftEpochs} epochs — no Monitoring Node was deployed. You can't fix drift you're not measuring.`
        : state.totalRetrains === 0
          ? `<strong>Lesson:</strong> You never retrained. Concept/data drift compounded — retrain before the SLA death spiral.`
          : `<strong>Lesson:</strong> Retrain timing matters. Ghost accuracy (no retrains) ended at ${round1(state.ghostAccuracy)}% vs your live ${round1(state.liveAccuracy)}%.`;
      break;

    case 'latency_timeout':
      cause = `Latency exceeded <strong>${LATENCY_TIMEOUT}ms</strong> for ${LATENCY_FAIL_EPOCHS} epochs. Peak load: ${state.currentRps} RPS vs ${fx.effectiveCapacity} capacity.`;
      advice = fx.serverlessCapacity > 0 && fx.capacity === 0
        ? `<strong>Lesson:</strong> Serverless cold starts hurt on sudden spikes — pair with warm replicas or upgrade tier.`
        : `<strong>Lesson:</strong> Add Model Replicas or Serverless before Wave 2. Load Balancer alone doesn't create capacity.`;
      break;

    case 'bankrupt':
      cause = `Compute budget went bankrupt at epoch ${state.epoch}. Infra upkeep ($${fx.upkeep}/epoch) exceeded revenue from served requests.`;
      advice = `<strong>Lesson:</strong> Max replicas 24/7 burns cash on Wave 1. Scale for the spike, not the average — or accept SLA risk on quiet waves.`;
      break;

    case 'wave_sla_failed': {
      const dx = diagnoseDeployWaveFailure(wave, fx);
      cause = `<strong>Why this happened — ${dx.waveName}</strong><ul class="postmortem-list">${dx.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>`;
      advice = `<strong>How to fix it</strong><ul class="postmortem-list fix">${dx.fixes.map((f) => `<li>${f}</li>`).join('')}</ul>`;
      break;
    }

    case 'accuracy_zero':
      cause = `Model accuracy hit 0% in production. Drift and ${profile.label || 'model'} fragility (${round1(profile.fragility * 100)}%) destroyed all predictive power.`;
      advice = profile.fragility > 0.45
        ? `<strong>Lesson:</strong> This model was overfit in Train Mode — it degraded ${round1(profile.fragility * 100)}% faster in production. Train better before deploy.`
        : `<strong>Lesson:</strong> Deploy is not the finish line. Continuous monitoring and retraining are part of the model lifecycle.`;
      break;

    case 'victory':
      cause = `<strong>Production stable!</strong> Survived all ${WAVES.length} waves. Live: ${round1(state.liveAccuracy)}%, Ghost without retrains: ${round1(state.ghostAccuracy)}%. Retrains: ${state.totalRetrains} (${state.badRetrains} bad).`;
      advice = `<strong>Well done!</strong> You balanced infra cost (${round1(state.totalSpent)} spent) vs drift response. Fragility was ${round1(profile.fragility * 100)}% — ${profile.fragility > 0.4 ? 'a fragile model made this harder.' : 'a healthy model helped.'}`;
      break;

    default:
      cause = 'Production run ended unexpectedly.';
      advice = 'Adjust infra and retrain strategy.';
  }

  document.getElementById('postmortem-cause').innerHTML = cause;
  document.getElementById('postmortem-stats').innerHTML = `
    Epochs served: ${state.epoch}<br>
    Waves cleared: ${state.waveIndex} / ${WAVES.length}<br>
    Peak live accuracy: ${round1(state.peakLive)}% · Final drift: ${round1(state.drift * 100)}%<br>
    Retrains: ${state.totalRetrains} · Bad retrains: ${state.badRetrains}<br>
    Budget earned: $${round1(state.totalEarned)} · spent: $${state.totalSpent}<br>
    Monitoring deployed: ${state.hadMonitoring ? 'Yes' : 'No'}
  `;
  document.getElementById('postmortem-advice').innerHTML = advice;
  document.getElementById('postmortem-title').textContent =
    reason === 'victory'
      ? 'Production Stable!'
      : reason === 'wave_sla_failed'
        ? 'Wave Failed — Postmortem'
        : 'Production Failed — Postmortem';
  document.getElementById('postmortem-overlay').classList.remove('hidden');
}

function updateUI() {
  const wave = getCurrentWave();
  const fx = getInfraEffects();
  const loadPct = fx.effectiveCapacity > 0
    ? round1((state.currentRps / fx.effectiveCapacity) * 100)
    : 999;

  document.getElementById('live-acc').textContent = `${round1(state.liveAccuracy)}%`;
  document.getElementById('latency').textContent = `${round1(state.latency)}ms`;
  document.getElementById('rps').textContent = `${state.currentRps}`;
  document.getElementById('budget').textContent = `$${Math.floor(state.budget)}`;
  document.getElementById('epoch').textContent = state.epoch;

  document.getElementById('live-bar').style.width = `${state.liveAccuracy}%`;

  const slaPct = clamp((state.liveAccuracy / SLA_THRESHOLD) * 100, 0, 100);
  document.getElementById('sla-meter').style.width = `${slaPct}%`;
  const epochsLeft = WAVE_EPOCHS - state.epochInWave;
  const slaHintEl = document.getElementById('sla-hint');
  if (state.slaStreak >= 3) {
    slaHintEl.textContent = `⚠ SLA breach in ${SLA_FAIL_EPOCHS - state.slaStreak} epoch(s)!`;
  } else if (epochsLeft <= 2 && running && !state.gameOver && state.liveAccuracy < SLA_THRESHOLD) {
    slaHintEl.textContent = getDeployWaveFailurePreview(wave, fx)
      || `⚠ ${round1(SLA_THRESHOLD - state.liveAccuracy)}% below SLA — ${epochsLeft} left`;
  } else if (state.liveAccuracy >= SLA_THRESHOLD) {
    slaHintEl.textContent = 'Contract active';
  } else {
    slaHintEl.textContent = 'Below SLA — clients watching';
  }

  document.getElementById('wave-badge').textContent = `Wave ${state.waveIndex + 1}`;
  document.getElementById('wave-name').textContent = wave.name;
  document.getElementById('wave-desc').textContent = wave.desc;
  document.getElementById('wave-ml').textContent = `MLOps: ${wave.mlConcept}`;

  document.getElementById('wave-timer').textContent = running
    ? `Next event: ${epochsLeft} epoch${epochsLeft !== 1 ? 's' : ''}`
    : 'Paused';

  document.getElementById('capacity-stat').textContent = fx.effectiveCapacity;
  document.getElementById('load-stat').textContent = `${loadPct}%`;
  document.getElementById('load-stat').style.color =
    loadPct > 100 ? 'var(--danger)' : loadPct > 80 ? 'var(--warning)' : 'var(--success)';

  const retrainEl = document.getElementById('retrain-status');
  if (state.retrainActive) {
    retrainEl.classList.remove('hidden');
    retrainEl.textContent = `Retraining… ${state.retrainEpochsLeft} epoch(s) left`;
  } else if (state.canaryEpochsLeft > 0) {
    retrainEl.classList.remove('hidden');
    retrainEl.textContent = `🐤 Canary rollout… ${state.canaryEpochsLeft} epoch(s) to full`;
  } else {
    retrainEl.classList.add('hidden');
  }

  const servingNode = document.getElementById('serving-node');
  servingNode.classList.toggle('danger', state.latency > LATENCY_TIMEOUT * 0.85 || state.liveAccuracy < SLA_THRESHOLD);
  document.getElementById('serving-status').textContent =
    state.retrainActive ? 'Retraining…' :
    state.canaryEpochsLeft > 0 ? 'Canary deploy…' :
    state.latency > LATENCY_TIMEOUT ? 'Overloaded!' :
    state.liveAccuracy < SLA_THRESHOLD ? 'SLA risk' : 'Online';

  document.getElementById('profile-label').textContent = `Model: ${profile.label || 'Custom'}`;
  document.getElementById('profile-baseline').textContent = `Baseline: ${round1(profile.valAcc)}% val`;
  document.getElementById('profile-fragility').textContent = `Fragility: ${round1(profile.fragility * 100)}%`;

  updateDriftCanvas(fx);
  renderSlots();
  renderInfraCards();
  updateRetrainButton(fx);
  updateChart();
}

function updateDriftCanvas(fx) {
  const canvas = document.getElementById('drift-canvas');
  const blindTag = document.getElementById('drift-blind-tag');
  const hint = document.getElementById('drift-hint');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  if (!fx.hasMonitoring) {
    blindTag.classList.remove('hidden');
    hint.textContent = 'Deploy Monitoring to see drift';
    ctx.fillStyle = '#2d3a52';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('???  drift invisible', w / 2, h / 2 + 4);
    return;
  }

  blindTag.classList.add('hidden');
  const separation = state.drift * 55;
  hint.textContent = `Drift ${round1(state.drift * 100)}% — distributions separating`;

  function drawBell(cx, color, alpha) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x++) {
      const t = (x - cx) / 22;
      const y = h - 8 - Math.exp(-t * t * 0.5) * (h - 16);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawBell(w * 0.35, '#22d3ee', 0.9);
  drawBell(w * 0.35 + separation, '#f472b6', 0.85);
}

function renderSlots() {
  const container = document.getElementById('infra-slots');
  container.innerHTML = '';

  state.slots.forEach((slot, i) => {
    const el = document.createElement('div');
    el.className = 'defense-slot';
    if (slot) el.classList.add('occupied');
    if (selectedSlot === i) el.classList.add('selected');

    if (slot) {
      const def = INFRA[slot.type];
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
          removeInfra(i);
        });
      }
      const upgradeBtn = el.querySelector('.upgrade-btn');
      if (upgradeBtn) {
        upgradeBtn.disabled = state.budget < def.upgradeCosts[slot.tier];
        upgradeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          upgradeInfra(i);
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

function getInfraCardStats(def) {
  const t = 0;
  const lines = [];

  switch (def.id) {
    case 'loadBalancer':
      lines.push(`<span class="stat-good">+${round1((def.capacityMult[t] - 1) * 100)}% capacity mult</span>`);
      lines.push(`<span class="stat-good">−${round1(def.latencyReduction[t] * 100)}% latency under load</span>`);
      break;
    case 'modelReplica':
      lines.push(`<span class="stat-good">+${def.capacity[t]} RPS capacity</span>`);
      break;
    case 'monitoring':
      lines.push(`<span class="stat-good">Reveals drift meter</span>`);
      break;
    case 'retraining':
      lines.push(`<span>Retrain: $${def.retrainCost[t]}, ${def.retrainDuration[t]} epochs</span>`);
      lines.push(`<span class="stat-bad">~${round1(def.badRetrainChance[t] * 100)}% bad retrain risk</span>`);
      break;
    case 'serverless':
      lines.push(`<span class="stat-good">+${def.burstCapacity[t]} burst RPS</span>`);
      lines.push(`<span class="stat-bad">+${def.coldStartLatency[t]}ms cold start on spikes</span>`);
      break;
    case 'cacheLayer':
      lines.push(`<span class="stat-good">${round1(def.cacheHitRate[t] * 100)}% cache hit rate</span>`);
      lines.push(`<span class="stat-bad">Stale cache hurts drift waves</span>`);
      break;
    case 'canary':
      lines.push(`<span class="stat-good">${round1(def.canaryShare[t] * 100)}% canary traffic</span>`);
      lines.push(`<span class="stat-good">Catches bad retrains</span>`);
      break;
    case 'rateLimit':
      lines.push(`<span class="stat-good">+${round1(def.adversarialDefense[t] * 100)}% vs abuse traffic</span>`);
      lines.push(`<span class="stat-bad">+${def.latencyOverhead[t]}ms base latency</span>`);
      break;
    default:
      break;
  }

  lines.push(`<span>Upkeep: $${def.upkeep[t]}/epoch</span>`);
  return lines.join('');
}

function renderInfraCards() {
  const container = document.getElementById('infra-cards');
  container.innerHTML = '';

  Object.values(INFRA).forEach((def) => {
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
        ${getInfraCardStats(def)}
      </div>
      <div class="defense-card-cost">Place: $${def.placeCost}</div>
    `;

    card.addEventListener('click', () => {
      if (canAfford && hasSlot && !state.gameOver) placeInfra(def.id);
    });

    container.appendChild(card);
  });
}

function updateRetrainButton(fx) {
  const btn = document.getElementById('retrain-btn');
  if (!fx.hasRetraining) {
    btn.disabled = true;
    btn.textContent = 'Trigger Retrain (needs Retraining Pipeline)';
    return;
  }

  const cost = INFRA.retraining.retrainCost[fx.retrainTier];
  btn.textContent = state.retrainActive
    ? `Retraining… ${state.retrainEpochsLeft} left`
    : `Trigger Retrain ($${cost})`;
  btn.disabled = state.gameOver || state.retrainActive || state.budget < cost;
}

function showToast(msg, type = 'danger') {
  const toast = document.getElementById('event-toast');
  toast.textContent = msg;
  toast.className = 'event-toast' + (type === 'warning' ? ' warning' : '');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3200);
}

function initChart() {
  const ctx = document.getElementById('accuracy-chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Live',
          data: [],
          borderColor: '#34d399',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
        },
        {
          label: 'Ghost',
          data: [],
          borderColor: 'rgba(148, 163, 184, 0.45)',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      scales: {
        x: {
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
      plugins: { legend: { display: false } },
    },
  });
}

function updateChart() {
  if (!chart) return;
  chart.data.labels = state.history.map((h) => h.epoch);
  chart.data.datasets[0].data = state.history.map((h) => h.live);
  chart.data.datasets[1].data = state.history.map((h) => h.ghost);
  chart.update('none');
}

function startGame(modelProfile) {
  initState(modelProfile);
  selectedSlot = null;
  running = true;

  document.getElementById('setup-overlay').classList.add('hidden');
  document.getElementById('postmortem-overlay').classList.add('hidden');

  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(simulateTick, TICK_MS);

  updateUI();
}

function showSetup() {
  const trainExport = loadTrainExport();
  const importPanel = document.getElementById('train-import-panel');
  const presetPanel = document.getElementById('preset-panel');
  const presetHeading = document.getElementById('preset-heading');
  const forcePreset = document.getElementById('force-preset-btn');

  if (trainExport) {
    importPanel.classList.remove('hidden');
    presetHeading.textContent = 'Or pick a preset instead';
    forcePreset.classList.add('hidden');

    document.getElementById('import-card').innerHTML = `
      <strong>${round1(trainExport.valAcc)}% val accuracy</strong><br>
      Train: ${round1(trainExport.trainAcc)}% · Overfit risk: ${round1((trainExport.overfitRisk || 0) * 100)}%<br>
      Fragility in production: <strong>${round1(trainExport.fragility * 100)}%</strong>
    `;

    document.getElementById('use-import-btn').onclick = () => {
      startGame({
        valAcc: trainExport.valAcc,
        trainAcc: trainExport.trainAcc,
        overfitRisk: trainExport.overfitRisk,
        underfitRisk: trainExport.underfitRisk,
        fragility: trainExport.fragility,
        label: 'From Train Mode',
        source: 'train',
      });
    };
  } else {
    importPanel.classList.add('hidden');
    presetHeading.textContent = 'Pick a model profile';
    document.getElementById('setup-intro').textContent =
      'No Train Mode save found. Pick a preset to deploy standalone.';
  }

  const presetContainer = document.getElementById('preset-cards');
  presetContainer.innerHTML = '';

  Object.values(MODEL_PRESETS).forEach((preset) => {
    const p = presetToProfile(preset.id);
    const card = document.createElement('button');
    card.className = 'preset-card';
    card.innerHTML = `
      <strong>${preset.label}</strong>
      <span>${preset.desc}</span>
      <span class="preset-stat">${preset.valAcc}% val · fragility ${round1(p.fragility * 100)}%</span>
    `;
    card.addEventListener('click', () => startGame({ ...p, label: preset.label }));
    presetContainer.appendChild(card);
  });
}

function init() {
  initChart();
  showSetup();

  document.getElementById('retrain-btn')?.addEventListener('click', triggerRetrain);
  document.getElementById('restart-btn')?.addEventListener('click', () => {
    document.getElementById('postmortem-overlay').classList.add('hidden');
    showSetup();
    document.getElementById('setup-overlay').classList.remove('hidden');
  });
}

if (!window.ML_SURVIVOR_NO_AUTO_INIT) {
  document.addEventListener('DOMContentLoaded', init);
}
