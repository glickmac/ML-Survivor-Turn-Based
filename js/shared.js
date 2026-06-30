/**
 * Shared utilities & Train → Deploy data bridge
 */
const STORAGE_KEY = 'ml-survivor-train-export';

const MODEL_PRESETS = {
  wellTrained: {
    id: 'wellTrained',
    label: 'Well-Trained',
    valAcc: 82,
    trainAcc: 84,
    overfitRisk: 0.12,
    underfitRisk: 0.08,
    desc: 'Balanced model — slow drift, stable baseline.',
  },
  overfit: {
    id: 'overfit',
    label: 'Overfit',
    valAcc: 71,
    trainAcc: 94,
    overfitRisk: 0.72,
    underfitRisk: 0.05,
    desc: 'High train/val gap — degrades fast in production.',
  },
  underfit: {
    id: 'underfit',
    label: 'Underfit',
    valAcc: 63,
    trainAcc: 65,
    overfitRisk: 0.08,
    underfitRisk: 0.55,
    desc: 'Never learned enough — low ceiling, moderate fragility.',
  },
};

function computeFragility(overfitRisk, underfitRisk, trainAcc, valAcc) {
  const gap = Math.max(0, (trainAcc || 0) - (valAcc || 0));
  return clamp(
    overfitRisk * 0.55 + underfitRisk * 0.2 + (gap / 100) * 0.45,
    0.05,
    0.95
  );
}

function saveTrainExport(data) {
  const payload = {
    valAcc: data.valAcc,
    trainAcc: data.trainAcc,
    overfitRisk: data.overfitRisk,
    underfitRisk: data.underfitRisk,
    fragility: computeFragility(data.overfitRisk, data.underfitRisk, data.trainAcc, data.valAcc),
    outcome: data.outcome,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

function loadTrainExport() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.valAcc !== 'number') return null;
    data.fragility = data.fragility ?? computeFragility(
      data.overfitRisk, data.underfitRisk, data.trainAcc, data.valAcc
    );
    return data;
  } catch {
    return null;
  }
}

function presetToProfile(presetId) {
  const p = MODEL_PRESETS[presetId];
  if (!p) return null;
  return {
    valAcc: p.valAcc,
    trainAcc: p.trainAcc,
    overfitRisk: p.overfitRisk,
    underfitRisk: p.underfitRisk,
    fragility: computeFragility(p.overfitRisk, p.underfitRisk, p.trainAcc, p.valAcc),
    source: presetId,
    label: p.label,
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
