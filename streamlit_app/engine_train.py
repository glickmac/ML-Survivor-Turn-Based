"""
ML Survivor — Train Mode engine (Python port of js/game.js).

Pure simulation: no UI. The Streamlit layer drives it turn-by-turn.
State lives in a plain dict so it serialises cleanly into st.session_state.
"""
from __future__ import annotations

import random
from typing import Optional

# ─── Defense definitions (ported 1:1 from game.js) ──────────────────
DEFENSES = {
    "dropout": {
        "id": "dropout", "name": "Dropout Layer", "icon": "🎲",
        "desc": "Randomly drops neurons during training. Strong overfit defense, but too much causes underfitting.",
        "placeCost": 15, "upgradeCosts": [25, 40], "upkeep": [2, 4, 6],
        "overfitReduction": [0.18, 0.30, 0.42], "underfitPenalty": [0.10, 0.18, 0.28],
        "trainSlowdown": [0.04, 0.08, 0.14],
    },
    "regularization": {
        "id": "regularization", "name": "L1/L2 Regularization", "icon": "📏",
        "desc": "Penalizes large weights. Cheaper than Dropout but weaker. Stacks underfit risk when combined.",
        "placeCost": 10, "upgradeCosts": [18, 30], "upkeep": [1, 2, 3],
        "overfitReduction": [0.12, 0.22, 0.32], "underfitPenalty": [0.06, 0.12, 0.20],
        "trainSlowdown": [0.03, 0.06, 0.10],
    },
    "batchNorm": {
        "id": "batchNorm", "name": "Batch Normalization", "icon": "⚡",
        "desc": "Stabilizes activations. Defends against gradient explosions and speeds convergence.",
        "placeCost": 20, "upgradeCosts": [35, 50], "upkeep": [3, 5, 7],
        "overfitReduction": [0.06, 0.10, 0.15], "underfitPenalty": [0.02, 0.04, 0.06],
        "gradientShield": [0.35, 0.65, 0.90], "valBoost": [0.02, 0.04, 0.06],
    },
    "dataAug": {
        "id": "dataAug", "name": "Data Augmentation", "icon": "🔄",
        "desc": "Synthetic training examples. Helps with noisy labels, imbalance, and distribution shift.",
        "placeCost": 18, "upgradeCosts": [30, 45], "upkeep": [2, 3, 5],
        "overfitReduction": [0.14, 0.24, 0.34], "underfitPenalty": [0.03, 0.06, 0.10],
        "noisyDefense": [0.25, 0.45, 0.65], "imbalanceDefense": [0.20, 0.40, 0.60],
        "outlierDefense": [0.15, 0.30, 0.50],
    },
    "earlyStopping": {
        "id": "earlyStopping", "name": "Early Stopping", "icon": "🛑",
        "desc": "Watches validation accuracy and pauses training before overfitting runs away. Saves your run once per wave — but stop too soon and you never learn enough.",
        "placeCost": 12, "upgradeCosts": [20, 32], "upkeep": [1, 2, 2],
        "overfitReduction": [0.05, 0.08, 0.10], "underfitPenalty": [0.03, 0.05, 0.07],
        "triggerGap": [12, 10, 8], "valSalvage": [3, 5, 8], "freezeEpochs": [2, 3, 4],
    },
    "crossVal": {
        "id": "crossVal", "name": "Cross-Validation Module", "icon": "📋",
        "desc": "Scores the model on multiple held-out folds instead of one validation set. Noisy and imbalanced val metrics stop lying to you — expensive but you trust the dashboard.",
        "placeCost": 28, "upgradeCosts": [42, 58], "upkeep": [4, 6, 8],
        "overfitReduction": [0.08, 0.12, 0.16], "underfitPenalty": [0.02, 0.03, 0.04],
        "valStability": [0.25, 0.45, 0.65], "valThresholdBonus": [2, 4, 6],
        "noisyDefense": [0.15, 0.25, 0.35], "imbalanceDefense": [0.10, 0.20, 0.30],
    },
    "classWeighting": {
        "id": "classWeighting", "name": "Class Weighting / Focal Loss", "icon": "⚖️",
        "desc": "Up-weights rare classes in the loss so the model can't ignore them. Fixes imbalance at the objective level — not by inventing new examples.",
        "placeCost": 14, "upgradeCosts": [22, 36], "upkeep": [2, 3, 4],
        "overfitReduction": [0.04, 0.06, 0.08], "underfitPenalty": [0.02, 0.04, 0.06],
        "imbalanceDefense": [0.35, 0.55, 0.75],
    },
    "inputClip": {
        "id": "inputClip", "name": "Input Clipping & Normalization", "icon": "📐",
        "desc": "Clips and scales raw features before they enter the model. Tames extreme input values — preprocessing, not in-network normalization.",
        "placeCost": 16, "upgradeCosts": [26, 40], "upkeep": [1, 2, 3],
        "overfitReduction": [0.03, 0.05, 0.07], "underfitPenalty": [0.04, 0.07, 0.10],
        "outlierDefense": [0.40, 0.60, 0.80],
    },
    "gradClip": {
        "id": "gradClip", "name": "Gradient Clipping", "icon": "✂️",
        "desc": "Caps the size of each gradient update before weights change. Stops exploding gradients from nuking your model in one step.",
        "placeCost": 15, "upgradeCosts": [24, 38], "upkeep": [2, 3, 4],
        "overfitReduction": [0, 0, 0], "underfitPenalty": [0.02, 0.03, 0.04],
        "gradientClipShield": [0.40, 0.65, 0.90],
    },
    "lrScheduler": {
        "id": "lrScheduler", "name": "Learning Rate Scheduler", "icon": "📉",
        "desc": "Lowers the learning rate when validation stops improving. Helps you converge cleanly and recover after instability.",
        "placeCost": 17, "upgradeCosts": [28, 42], "upkeep": [2, 3, 4],
        "overfitReduction": [0.10, 0.16, 0.22], "underfitPenalty": [0.04, 0.06, 0.09],
        "explosionRecovery": [0.25, 0.40, 0.55], "schedulerSlowdown": [0.02, 0.03, 0.04],
    },
}

SLOT_COUNT = 5
WAVE_EPOCHS = 8
STARTING_BUDGET = 100
WAVE_INCOME = [25, 30, 35, 40, 45]

WAVES = [
    {"id": 1, "name": "Clean Data Wave",
     "desc": "Baseline i.i.d. training data — your model should learn easily if defenses are balanced.",
     "mlProblem": "Standard supervised learning on clean, representative data.",
     "threshold": 55, "trainRate": 3.2, "valRate": 2.8,
     "noiseLevel": 0, "imbalanceLevel": 0, "outlierLevel": 0, "gradientRisk": 0},
    {"id": 2, "name": "Noisy Labels Wave",
     "desc": "30% of labels are wrong. Train accuracy gets dragged down unless you have robust training.",
     "mlProblem": "Label noise — mislabeled examples poison gradient updates.",
     "threshold": 58, "trainRate": 2.8, "valRate": 2.4,
     "noiseLevel": 0.30, "imbalanceLevel": 0, "outlierLevel": 0, "gradientRisk": 0},
    {"id": 3, "name": "Class Imbalance Wave",
     "desc": "Rare classes spike in validation. Val accuracy tanks unless you handle imbalance.",
     "mlProblem": "Class imbalance — model ignores minority classes, val metrics collapse.",
     "threshold": 60, "trainRate": 3.0, "valRate": 1.6,
     "noiseLevel": 0, "imbalanceLevel": 0.45, "outlierLevel": 0, "gradientRisk": 0},
    {"id": 4, "name": "Outlier Storm",
     "desc": "Extreme feature values flood the batch. Normalization defenses are critical.",
     "mlProblem": "Outliers — unnormalized extremes destabilize weights and predictions.",
     "threshold": 62, "trainRate": 2.6, "valRate": 2.0,
     "noiseLevel": 0, "imbalanceLevel": 0, "outlierLevel": 0.50, "gradientRisk": 0},
    {"id": 5, "name": "Gradient Explosion Event",
     "desc": "Unstable gradients strike randomly. Batch Norm and careful learning are your shield.",
     "mlProblem": "Exploding gradients — loss spikes destroy learned weights in a single step.",
     "threshold": 65, "trainRate": 3.4, "valRate": 2.6,
     "noiseLevel": 0.05, "imbalanceLevel": 0.10, "outlierLevel": 0.15, "gradientRisk": 0.35},
]

# Difficulty scales many balance levers so the game can be made genuinely accessible.
# Train levers: hazard (wave damage), budget (start $), income_mult (between-wave $),
#   upkeep_mult (per-epoch cost), threshold_delta (added to val thresholds; negative = easier),
#   overfit_mult (overfit drain strength), learn_mult (train/val learning speed).
# Deploy levers (prefix d_/drift_/decay_/sla_/fragility_/bad_retrain_) are read by engine_deploy.
DIFFICULTY = {
    "Student": {
        "label": "Student (guided)",
        "hazard": 0.42, "budget": 175, "income_mult": 1.75, "upkeep_mult": 0.5,
        "threshold_delta": -9, "overfit_mult": 0.38, "learn_mult": 1.42,
        "d_budget": 195, "d_income_mult": 1.55, "d_upkeep_mult": 0.5,
        "drift_mult": 0.45, "decay_mult": 0.45, "sla_delta": -12,
        "fragility_mult": 0.5, "bad_retrain_mult": 0.3,
        "rps_mult": 0.65, "latency_mult": 0.6,
    },
    "Engineer": {
        "label": "Engineer (standard)",
        "hazard": 0.62, "budget": 130, "income_mult": 1.32, "upkeep_mult": 0.78,
        "threshold_delta": -5, "overfit_mult": 0.55, "learn_mult": 1.24,
        "d_budget": 150, "d_income_mult": 1.25, "d_upkeep_mult": 0.75,
        "drift_mult": 0.6, "decay_mult": 0.58, "sla_delta": -8,
        "fragility_mult": 0.65, "bad_retrain_mult": 0.45,
        "rps_mult": 0.8, "latency_mult": 0.78,
    },
    "Researcher": {
        "label": "Researcher (original)",
        "hazard": 1.0, "budget": 100, "income_mult": 1.0, "upkeep_mult": 1.0,
        "threshold_delta": 0, "overfit_mult": 1.0, "learn_mult": 1.0,
        "d_budget": 120, "d_income_mult": 1.0, "d_upkeep_mult": 1.0,
        "drift_mult": 1.0, "decay_mult": 1.0, "sla_delta": 0,
        "fragility_mult": 1.0, "bad_retrain_mult": 1.0,
        "rps_mult": 1.0, "latency_mult": 1.0,
    },
}
DEFAULT_DIFFICULTY = "Student"


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def lerp(a, b, t):
    return a + (b - a) * t


def round1(n):
    return round(n * 10) / 10


class TrainGame:
    """Turn-based Train Mode. Call step_epoch() to advance one epoch."""

    def __init__(self, difficulty: str = DEFAULT_DIFFICULTY, seed: Optional[int] = None):
        self.difficulty = difficulty if difficulty in DIFFICULTY else DEFAULT_DIFFICULTY
        self.cfg = DIFFICULTY[self.difficulty]
        self.rng = random.Random(seed)
        self.log: list[dict] = []
        self.selected_slot: Optional[int] = None
        self._init_state()

    def eff_threshold(self, wave=None):
        """Wave val threshold adjusted for difficulty (floored so it stays sensible)."""
        wave = wave or self.current_wave()
        return max(45, wave["threshold"] + self.cfg["threshold_delta"])

    # ── state ──
    def _init_state(self):
        self.state = {
            "epoch": 1, "waveIndex": 0, "epochInWave": 0,
            "trainAcc": 52, "valAcc": 50, "budget": self.cfg["budget"],
            "overfitRisk": 0.15, "underfitRisk": 0.05,
            "slots": [None] * SLOT_COUNT,
            "underfitStreak": 0, "gameOver": False, "deathReason": None,
            "history": [{"epoch": 0, "train": 52, "val": 50}],
            "lastGradientHit": False, "peakTrain": 48, "peakVal": 46,
            "totalSpent": 0, "wavesCleared": 0,
            "prevValAcc": 50, "prevPrevValAcc": 50,
            "earlyStopUsed": False, "earlyStopFrozen": 0, "earlyStopRearmed": False,
        }

    def emit(self, msg, kind="info"):
        self.log.append({"epoch": self.state["epoch"], "msg": msg, "kind": kind})

    # ── derived ──
    def current_wave(self):
        return WAVES[min(self.state["waveIndex"], len(WAVES) - 1)]

    def hazard_mult(self):
        return self.cfg["hazard"]

    def defense_effects(self):
        fx = {k: 0 for k in (
            "overfitReduction", "underfitPenalty", "trainSlowdown", "gradientShield",
            "gradientClipShield", "valBoost", "noisyDefense", "imbalanceDefense",
            "outlierDefense", "valStability", "valThresholdBonus", "explosionRecovery",
            "schedulerSlowdown", "earlyStopGap", "earlyStopSalvage", "earlyStopFreeze",
            "upkeep", "regCount")}
        fx["earlyStopTier"] = -1
        for slot in self.state["slots"]:
            if not slot:
                continue
            d = DEFENSES[slot["type"]]
            t = slot["tier"]
            for key in ("overfitReduction", "underfitPenalty", "trainSlowdown", "valBoost"):
                if key in d:
                    fx[key] += d[key][t]
            fx["upkeep"] += d["upkeep"][t]
            for key in ("gradientShield", "gradientClipShield", "noisyDefense",
                        "imbalanceDefense", "outlierDefense", "valStability",
                        "valThresholdBonus", "explosionRecovery", "schedulerSlowdown"):
                if key in d:
                    fx[key] = max(fx[key], d[key][t])
            if "triggerGap" in d:
                if t >= fx["earlyStopTier"]:
                    fx["earlyStopTier"] = t
                    fx["earlyStopGap"] = d["triggerGap"][t]
                    fx["earlyStopSalvage"] = d["valSalvage"][t]
                    fx["earlyStopFreeze"] = d["freezeEpochs"][t]
            if slot["type"] in ("dropout", "regularization"):
                fx["regCount"] += 1
        return fx

    # ── player actions ──
    def place_defense(self, type_):
        s = self.state
        if self.selected_slot is None or s["slots"][self.selected_slot] or s["gameOver"]:
            return False
        d = DEFENSES[type_]
        if s["budget"] < d["placeCost"]:
            return False
        s["budget"] -= d["placeCost"]
        s["totalSpent"] += d["placeCost"]
        s["slots"][self.selected_slot] = {"type": type_, "tier": 0}
        self.selected_slot = None
        return True

    def upgrade_defense(self, i):
        s = self.state
        slot = s["slots"][i]
        if not slot or slot["tier"] >= 2:
            return False
        d = DEFENSES[slot["type"]]
        cost = d["upgradeCosts"][slot["tier"]]
        if s["budget"] < cost:
            return False
        s["budget"] -= cost
        s["totalSpent"] += cost
        slot["tier"] += 1
        return True

    def remove_defense(self, i):
        s = self.state
        slot = s["slots"][i]
        if not slot or s["gameOver"]:
            return False
        d = DEFENSES[slot["type"]]
        invested = d["placeCost"] + sum(d["upgradeCosts"][:slot["tier"]])
        refund = invested // 2
        s["budget"] += refund
        s["slots"][i] = None
        if self.selected_slot == i:
            self.selected_slot = None
        self.emit(f"Removed {d['name']} (+${refund} refund)", "warning")
        return True

    # ── core tick ──
    def step_epoch(self):
        s = self.state
        if s["gameOver"]:
            return
        wave = self.current_wave()
        fx = self.defense_effects()
        haz = self.hazard_mult()
        learn = self.cfg["learn_mult"]
        s["lastGradientHit"] = False

        # upkeep (scaled by difficulty)
        upkeep = fx["upkeep"] * self.cfg["upkeep_mult"]
        s["budget"] -= upkeep
        next_income = WAVE_INCOME[s["waveIndex"]] * self.cfg["income_mult"]
        if s["budget"] < 0 and s["budget"] + next_income < 0:
            self._end("bankrupt")
            return

        underfit_factor = max(0.25, 1 - fx["underfitPenalty"] - s["underfitRisk"] * 0.5)
        train_delta = wave["trainRate"] * underfit_factor * learn - fx["trainSlowdown"]
        val_delta = wave["valRate"] * underfit_factor * learn + fx["valBoost"]

        stability_mit = 1 - fx["valStability"] * 0.45

        if wave["noiseLevel"] > 0:
            noise_dmg = wave["noiseLevel"] * (1 - fx["noisyDefense"]) * 8 * stability_mit * haz
            train_delta -= noise_dmg
            val_delta -= noise_dmg * 0.6
        if wave["imbalanceLevel"] > 0:
            imb_dmg = wave["imbalanceLevel"] * (1 - fx["imbalanceDefense"]) * 10 * stability_mit * haz
            val_delta -= imb_dmg
        if wave["outlierLevel"] > 0:
            out_mit = fx["outlierDefense"] + (fx["gradientShield"] * 0.3 if fx["gradientShield"] > 0 else 0)
            out_dmg = wave["outlierLevel"] * (1 - min(out_mit, 0.85)) * 9 * haz
            train_delta -= out_dmg * 0.5
            val_delta -= out_dmg

        if fx["schedulerSlowdown"] > 0 and s["epochInWave"] >= 3 and s["valAcc"] <= s["prevValAcc"]:
            train_delta -= fx["schedulerSlowdown"] * 4
            val_delta -= fx["schedulerSlowdown"] * 1.5

        # gradient explosion
        if wave["gradientRisk"] > 0 and self.rng.random() < wave["gradientRisk"] * haz:
            s["lastGradientHit"] = True
            shield = max(fx["gradientShield"], fx["gradientClipShield"])
            dmg = (1 - shield) * (18 + self.rng.random() * 12) * haz
            s["valAcc"] -= dmg
            s["trainAcc"] -= dmg * 0.3
            self.emit("⚡ Gradient Explosion! Val accuracy took a hit.", "danger")
            if fx["explosionRecovery"] > 0:
                rec = dmg * fx["explosionRecovery"]
                s["valAcc"] += rec
                s["trainAcc"] += rec * 0.2

        s["trainAcc"] = clamp(s["trainAcc"] + train_delta, 0, 99.5)
        s["valAcc"] = clamp(s["valAcc"] + val_delta, 0, 99.5)

        gap = s["trainAcc"] - s["valAcc"]
        eff_gap = max(0, gap - fx["overfitReduction"] * 100)
        target_overfit = clamp(eff_gap / 35, 0, 1)
        s["overfitRisk"] = lerp(s["overfitRisk"], target_overfit, 0.35)

        if eff_gap > 8 and s["earlyStopFrozen"] <= 0:
            s["valAcc"] -= (eff_gap - 8) * 0.15 * (1 - fx["overfitReduction"]) * self.cfg["overfit_mult"]

        # early stopping
        if fx["earlyStopGap"] > 0 and s["earlyStopFrozen"] <= 0:
            gap_now = s["trainAcc"] - s["valAcc"]
            val_dropped_twice = s["valAcc"] < s["prevValAcc"] and s["prevValAcc"] < s["prevPrevValAcc"]
            can_trigger = (not s["earlyStopUsed"]) or (fx["earlyStopTier"] >= 2 and s["earlyStopRearmed"])
            if can_trigger and (gap_now >= fx["earlyStopGap"] or val_dropped_twice):
                if not s["earlyStopUsed"]:
                    s["earlyStopUsed"] = True
                else:
                    s["earlyStopRearmed"] = False
                s["earlyStopFrozen"] = fx["earlyStopFreeze"]
                s["valAcc"] = clamp(s["valAcc"] + fx["earlyStopSalvage"], 0, s["trainAcc"])
                self.emit("🛑 Early stopping saved your checkpoint.", "warning")

        if s["earlyStopFrozen"] > 0:
            s["earlyStopFrozen"] -= 1
            if (fx["earlyStopTier"] >= 2 and s["earlyStopUsed"]
                    and not s["earlyStopRearmed"] and s["earlyStopFrozen"] == 0):
                s["earlyStopRearmed"] = True

        # val tracks train
        val_pull = (s["trainAcc"] - fx["overfitReduction"] * 80 - s["valAcc"]) * 0.08
        s["valAcc"] = clamp(s["valAcc"] + val_pull, 0, s["trainAcc"])

        # underfit risk
        reg_stack = 1.3 if fx["regCount"] >= 2 else 1
        target_underfit = clamp((fx["underfitPenalty"] * reg_stack + fx["trainSlowdown"] * 2) * 1.2, 0, 1)
        s["underfitRisk"] = lerp(s["underfitRisk"], target_underfit, 0.3)

        if s["underfitRisk"] > 0.5:
            ceiling = 55 + (1 - s["underfitRisk"]) * 40
            s["trainAcc"] = min(s["trainAcc"], ceiling)
            s["valAcc"] = min(s["valAcc"], ceiling - 5)

        s["peakTrain"] = max(s["peakTrain"], s["trainAcc"])
        s["peakVal"] = max(s["peakVal"], s["valAcc"])

        s["history"].append({"epoch": s["epoch"], "train": round1(s["trainAcc"]), "val": round1(s["valAcc"])})

        threshold = self.eff_threshold(wave)
        eff_val = s["valAcc"] + fx["valThresholdBonus"]
        cleared = eff_val >= threshold
        underfit_lockout = (s["epochInWave"] >= 3 and s["underfitRisk"] > 0.28
                            and s["trainAcc"] < threshold + 5)
        s["underfitStreak"] = s["underfitStreak"] + 1 if (not cleared and underfit_lockout) else 0

        if s["valAcc"] <= 0:
            self._end("collapsed")
            return
        if s["underfitStreak"] >= 3:
            self._end("underfit")
            return

        s["epoch"] += 1
        s["epochInWave"] += 1
        s["prevPrevValAcc"] = s["prevValAcc"]
        s["prevValAcc"] = s["valAcc"]

        if s["epochInWave"] >= WAVE_EPOCHS:
            if eff_val < threshold:
                self._end("wave_failed")
                return
            self._advance_wave()

    def _advance_wave(self):
        s = self.state
        s["wavesCleared"] += 1
        s["waveIndex"] += 1
        s["epochInWave"] = 0
        s["earlyStopUsed"] = False
        s["earlyStopFrozen"] = 0
        s["earlyStopRearmed"] = False
        if s["waveIndex"] >= len(WAVES):
            self._end("victory")
            return
        income = round(WAVE_INCOME[min(s["waveIndex"], len(WAVE_INCOME) - 1)] * self.cfg["income_mult"])
        s["budget"] += income
        self.emit(f"Wave {s['waveIndex'] + 1} incoming! +${income} compute budget", "warning")

    # ── end / diagnosis ──
    def _end(self, reason):
        self.state["gameOver"] = True
        self.state["deathReason"] = reason
        if reason == "wave_failed":
            dx = self.diagnose_failure()
            self.emit(f"Wave failed — {dx['summary']}.", "danger")
        elif reason == "victory":
            self.emit("Victory! All 5 waves cleared.", "warning")

    def export_profile(self):
        """Train→Deploy bridge payload (mirrors shared.js saveTrainExport)."""
        s = self.state
        frag = compute_fragility(s["overfitRisk"], s["underfitRisk"], s["trainAcc"], s["valAcc"])
        return {
            "valAcc": s["valAcc"], "trainAcc": s["trainAcc"],
            "overfitRisk": s["overfitRisk"], "underfitRisk": s["underfitRisk"],
            "fragility": frag, "outcome": s["deathReason"], "label": "From Train Mode",
            "source": "train",
        }

    def diagnose_failure(self):
        s = self.state
        wave = self.current_wave()
        fx = self.defense_effects()
        eff_val = round1(s["valAcc"] + fx["valThresholdBonus"])
        required = self.eff_threshold(wave)
        shortfall = round1(max(0, required - eff_val))
        gap = round1(s["trainAcc"] - s["valAcc"])
        reasons, fixes = [], []
        bonus = f" (incl. +{fx['valThresholdBonus']}% CV bonus)" if fx["valThresholdBonus"] > 0 else ""
        reasons.append(f"Wave ended after {WAVE_EPOCHS} epochs — needed {required}% val but reached "
                       f"{eff_val}%{bonus}, {shortfall}% short.")

        too_much_reg = s["underfitRisk"] > 0.45 or fx["regCount"] >= 2
        cant_learn = s["trainAcc"] < required - 3
        if too_much_reg and cant_learn:
            reasons.append(f"Underfit — {fx['regCount']} regularizer(s) capped learning "
                           f"(Underfit Risk {round1(s['underfitRisk']*100)}%). Train Acc only "
                           f"{round1(s['trainAcc'])}%.")
            fixes.append("Remove or downgrade Dropout / L1-L2 — stacking them lowers your learning ceiling.")
            if fx["regCount"] >= 2:
                fixes.append("Keep at most one heavy regularizer early; add wave-specific defenses instead.")
        elif gap > 10 and s["overfitRisk"] > 0.35:
            reasons.append(f"Overfit gap — Train ({round1(s['trainAcc'])}%) outran Val "
                           f"({round1(s['valAcc'])}%) by {gap}%.")
            fixes.append("Add Dropout, L1/L2, or Early Stopping before the train/val gap exceeds ~10%.")
            if fx["earlyStopTier"] < 0:
                fixes.append("Early Stopping gives a one-per-wave save when the gap widens — place it by Wave 2.")
            elif not s["earlyStopUsed"]:
                fixes.append("Early Stopping was available but never triggered — act before val drops.")
        elif shortfall <= 5:
            reasons.append(f"Close miss — val climbed too slowly; {shortfall}% from clearing.")
            fixes.append("Upgrade key defenses one tier mid-wave instead of buying new ones late.")
            if fx["valThresholdBonus"] == 0:
                fixes.append("Cross-Validation adds up to +6% threshold bonus — can turn a near-miss into a clear.")

        if wave["noiseLevel"] > 0.2 and fx["noisyDefense"] < 0.35:
            reasons.append(f"Noisy labels — ~{round1(wave['noiseLevel']*100)}% bad labels. "
                           f"Noisy defense: {round1(fx['noisyDefense']*100)}%.")
            fixes.append("Deploy Data Augmentation and/or Cross-Validation before the noisy-label wave ends.")
        if wave["imbalanceLevel"] > 0.3 and fx["imbalanceDefense"] < 0.35:
            reasons.append(f"Class imbalance — imbalance defense: {round1(fx['imbalanceDefense']*100)}%.")
            fixes.append("Add Class Weighting / Focal Loss or upgrade Data Augmentation for imbalance.")
        if wave["outlierLevel"] > 0.3 and fx["outlierDefense"] < 0.4:
            reasons.append(f"Outlier storm — outlier defense: {round1(fx['outlierDefense']*100)}%.")
            fixes.append("Input Clipping & Normalization clips raw features — Batch Norm alone is not enough.")
        if wave["gradientRisk"] > 0.2:
            shield = max(fx["gradientShield"], fx["gradientClipShield"])
            if shield < 0.55:
                reasons.append(f"Gradient explosions — shield {round1(shield*100)}%.")
                fixes.append("Stack Gradient Clipping + Batch Normalization before Wave 5.")

        placed = sum(1 for x in s["slots"] if x)
        if placed == 0:
            reasons.append("No defenses — raw training could not counter wave hazards.")
            fixes.append("Use the shop before epoch 3 — even one tier-1 defense changes the curve.")
        elif placed < 2 and s["waveIndex"] >= 2:
            fixes.append("Later waves need 2–3 complementary defenses — not one maxed-out regularizer.")

        if not fixes:
            fixes.append("Read the wave panel before it starts — match the specialist defense to the hazard.")
            fixes.append("Balance regularizers with val-boosting tools (Batch Norm, LR Scheduler, Cross-Val).")

        return {"reasons": reasons, "fixes": fixes, "shortfall": shortfall,
                "waveName": wave["name"], "summary": f"{shortfall}% below {wave['name']} threshold"}

    def postmortem(self):
        s = self.state
        wave = self.current_wave()
        fx = self.defense_effects()
        gap = round1(s["peakTrain"] - s["peakVal"])
        reason = s["deathReason"]
        if reason == "collapsed":
            title = "Run Failed — Postmortem"
            cause = (f"Your model collapsed to 0% validation accuracy on Epoch {s['epoch']} during the "
                     f"{wave['name']}. Train accuracy was {round1(s['trainAcc'])}% but validation failed.")
            advice = ("Your train/val gap peaked at %s%%. Add Dropout or L1/L2 earlier." % gap
                      if gap > 20 else
                      "Val collapsed suddenly. Batch Normalization stabilizes training; watch for gradient explosions.")
        elif reason == "bankrupt":
            title = "Run Failed — Postmortem"
            cause = (f"You went bankrupt on Epoch {s['epoch']}. Budget hit ${round1(s['budget'])}. "
                     f"Defense upkeep (${round1(fx['upkeep'] * self.cfg['upkeep_mult'])}/epoch) exceeded income.")
            advice = (f"Cheaper defenses like L1/L2 (${DEFENSES['regularization']['placeCost']}) give good value. "
                      f"Don't max-upgrade everything. You cleared {s['wavesCleared']} wave(s).")
        elif reason == "underfit":
            title = "Run Failed — Postmortem"
            cause = (f"Your model underfit — val stayed below the {self.eff_threshold(wave)}% threshold for 3 epochs. "
                     f"Train: {round1(s['trainAcc'])}%, Val: {round1(s['valAcc'])}%.")
            advice = (f"Underfit risk was {round1(s['underfitRisk']*100)}% with {fx['regCount']} regularizer(s). "
                      f"Remove or downgrade Dropout/L1/L2 — stacking caps your learning ceiling.")
        elif reason == "wave_failed":
            dx = self.diagnose_failure()
            title = "Wave Failed — Postmortem"
            cause = "Why this happened — " + dx["waveName"] + "\n- " + "\n- ".join(dx["reasons"])
            advice = "How to fix it\n- " + "\n- ".join(dx["fixes"])
        elif reason == "victory":
            title = "Training Complete!"
            cause = (f"Victory! You survived all {len(WAVES)} waves. Final Train: {round1(s['trainAcc'])}%, "
                     f"Val: {round1(s['valAcc'])}%, Gap: {gap}%.")
            advice = (f"You balanced bias-variance tradeoffs. Peak overfit risk: "
                      f"{round1(s['overfitRisk']*100)}%, underfit risk: {round1(s['underfitRisk']*100)}%.")
        else:
            title, cause, advice = "Run Ended", "Training run ended.", "Try again."

        stats = (f"Epoch reached: {s['epoch']} | Waves cleared: {s['wavesCleared']}/{len(WAVES)} | "
                 f"Peak Train {round1(s['peakTrain'])}% · Peak Val {round1(s['peakVal'])}% | "
                 f"Final gap {round1(s['trainAcc']-s['valAcc'])}% | Spent ${s['totalSpent']} | "
                 f"Defenses placed {sum(1 for x in s['slots'] if x)}")
        can_deploy = reason == "victory" or s["valAcc"] >= 55
        return {"title": title, "cause": cause, "advice": advice, "stats": stats, "canDeploy": can_deploy}


def compute_fragility(overfit_risk, underfit_risk, train_acc, val_acc):
    gap = max(0, (train_acc or 0) - (val_acc or 0))
    return clamp((overfit_risk or 0) * 0.55 + (underfit_risk or 0) * 0.2 + (gap / 100) * 0.45, 0.05, 0.95)
