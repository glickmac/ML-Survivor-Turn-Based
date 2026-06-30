"""
ML Survivor — Deploy Mode engine (Python port of js/deploy.js + js/shared.js).

Turn-based: call step_tick() to advance one production epoch.
"""
from __future__ import annotations

import random
from typing import Optional

from engine_train import clamp, round1, compute_fragility, DIFFICULTY, DEFAULT_DIFFICULTY

INFRA = {
    "loadBalancer": {
        "id": "loadBalancer", "name": "Load Balancer", "icon": "⚖️",
        "desc": "Distributes requests across replicas. Cuts latency spikes when load exceeds capacity.",
        "placeCost": 18, "upgradeCosts": [28, 42], "upkeep": [2, 4, 6],
        "capacityMult": [1.12, 1.28, 1.45], "latencyReduction": [0.10, 0.20, 0.30],
    },
    "modelReplica": {
        "id": "modelReplica", "name": "Model Replica", "icon": "🖥️",
        "desc": "Inference compute node. More tiers = more RPS capacity, but higher $/epoch upkeep.",
        "placeCost": 22, "upgradeCosts": [38, 52], "upkeep": [4, 8, 13],
        "capacity": [40, 85, 135],
    },
    "monitoring": {
        "id": "monitoring", "name": "Monitoring Node", "icon": "📡",
        "desc": "Reveals the Drift Meter. Without it, drift is invisible until accuracy crashes.",
        "placeCost": 12, "upgradeCosts": [20, 30], "upkeep": [1, 2, 3],
        "driftWarning": [0, 0.08, 0.15],
    },
    "retraining": {
        "id": "retraining", "name": "Retraining Pipeline", "icon": "🔁",
        "desc": "Refresh the model on new data. Fixes drift but costs $, takes epochs, and can fail.",
        "placeCost": 28, "upgradeCosts": [45, 65], "upkeep": [3, 5, 7],
        "retrainCost": [40, 32, 26], "retrainDuration": [5, 4, 3],
        "accuracyRestore": [0.82, 0.90, 0.96], "driftReset": [0.55, 0.72, 0.88],
        "badRetrainChance": [0.20, 0.14, 0.09], "postDeployFragile": [2, 1, 1],
    },
    "serverless": {
        "id": "serverless", "name": "Serverless Endpoint", "icon": "☁️",
        "desc": "Auto-scales inference on traffic spikes. Great for bursts — cold starts hurt latency, and sustained load gets expensive.",
        "placeCost": 20, "upgradeCosts": [32, 48], "upkeep": [1, 2, 3],
        "burstCapacity": [50, 80, 105], "coldStartLatency": [50, 30, 12], "sustainedTax": [6, 4, 2],
    },
    "cacheLayer": {
        "id": "cacheLayer", "name": "Prediction Cache", "icon": "💾",
        "desc": "Caches repeated predictions to cut compute and latency. Saves money — but stale cache hides drift when the world changes.",
        "placeCost": 16, "upgradeCosts": [26, 40], "upkeep": [2, 3, 4],
        "cacheHitRate": [0.25, 0.40, 0.55], "loadReduction": [0.22, 0.35, 0.48],
        "driftBlindness": [0.12, 0.18, 0.24], "incomeBonus": [1.08, 1.12, 1.18],
    },
    "canary": {
        "id": "canary", "name": "Canary Deployment", "icon": "🐤",
        "desc": "Rolls out a retrained model to a tiny traffic slice first. Catches bad retrains before they tank everyone — full rollout takes longer.",
        "placeCost": 24, "upgradeCosts": [36, 52], "upkeep": [3, 4, 5],
        "canaryShare": [0.05, 0.10, 0.20], "promoteEpochs": [2, 1, 1],
        "badRetrainMitigation": [0.88, 0.94, 0.98],
    },
    "rateLimit": {
        "id": "rateLimit", "name": "Rate Limit Gateway", "icon": "🛡️",
        "desc": "Throttles abusive request floods and rejects garbage inputs. Stops probing attacks — but set it too tight and real spike traffic gets blocked.",
        "placeCost": 14, "upgradeCosts": [22, 34], "upkeep": [2, 3, 4],
        "adversarialDefense": [0.35, 0.55, 0.75], "latencyOverhead": [12, 20, 28],
        "spikeThrottle": [0.08, 0.04, 0.01],
    },
}

SLOT_COUNT = 5
WAVE_EPOCHS = 8
STARTING_BUDGET = 120
SLA_THRESHOLD = 70
SLA_FAIL_EPOCHS = 5
LATENCY_TIMEOUT = 480
LATENCY_FAIL_EPOCHS = 4
STALE_EPOCHS = 10

WAVES = [
    {"id": 1, "name": "Normal Traffic",
     "desc": "Steady production load. Drift accumulates slowly — the default production reality.",
     "mlConcept": "Baseline serving: models decay even when nothing \"breaks.\"",
     "baseRps": 35, "driftRate": 0.025, "conceptDrift": 0, "dataDriftBoost": 0, "adversarialLevel": 0},
    {"id": 2, "name": "Traffic Spike",
     "desc": "RPS surges like a flash sale or viral moment. Under-provisioned infra = latency death spiral.",
     "mlConcept": "Auto-scaling vs cost — same tradeoff as Server Survival under DDoS-like load.",
     "baseRps": 95, "driftRate": 0.03, "conceptDrift": 0, "dataDriftBoost": 0, "adversarialLevel": 0},
    {"id": 3, "name": "Concept Drift Event",
     "desc": "User behavior shifted (post-holiday, new UI). Live accuracy drops unless you retrain.",
     "mlConcept": "Concept drift — P(y|X) changed. Retraining is the fix, but it's not free.",
     "baseRps": 45, "driftRate": 0.04, "conceptDrift": 12, "dataDriftBoost": 0, "adversarialLevel": 0},
    {"id": 4, "name": "Data Drift Event",
     "desc": "Input feature distributions shifted (new devices, demographics). Silent decay accelerates.",
     "mlConcept": "Data drift — P(X) changed. Only visible if you're measuring with Monitoring.",
     "baseRps": 40, "driftRate": 0.035, "conceptDrift": 0, "dataDriftBoost": 0.045, "adversarialLevel": 0},
    {"id": 5, "name": "Adversarial Traffic",
     "desc": "Automated probes and adversarial inputs flood the API. Rate limiting and input validation are critical.",
     "mlConcept": "Adversarial/abuse traffic — garbage inputs and probing attacks degrade model metrics.",
     "baseRps": 55, "driftRate": 0.028, "conceptDrift": 0, "dataDriftBoost": 0.02, "adversarialLevel": 0.42},
]

MODEL_PRESETS = {
    "wellTrained": {"id": "wellTrained", "label": "Well-Trained", "valAcc": 82, "trainAcc": 84,
                    "overfitRisk": 0.12, "underfitRisk": 0.08, "desc": "Balanced model — slow drift, stable baseline."},
    "overfit": {"id": "overfit", "label": "Overfit", "valAcc": 71, "trainAcc": 94,
                "overfitRisk": 0.72, "underfitRisk": 0.05, "desc": "High train/val gap — degrades fast in production."},
    "underfit": {"id": "underfit", "label": "Underfit", "valAcc": 63, "trainAcc": 65,
                 "overfitRisk": 0.08, "underfitRisk": 0.55, "desc": "Never learned enough — low ceiling, moderate fragility."},
}


def preset_to_profile(preset_id):
    p = MODEL_PRESETS[preset_id]
    return {
        "valAcc": p["valAcc"], "trainAcc": p["trainAcc"], "overfitRisk": p["overfitRisk"],
        "underfitRisk": p["underfitRisk"],
        "fragility": compute_fragility(p["overfitRisk"], p["underfitRisk"], p["trainAcc"], p["valAcc"]),
        "source": preset_id, "label": p["label"],
    }


class DeployGame:
    """Turn-based Deploy Mode. step_tick() advances one production epoch."""

    def __init__(self, profile: dict, seed: Optional[int] = None,
                 difficulty: str = DEFAULT_DIFFICULTY):
        self.difficulty = difficulty if difficulty in DIFFICULTY else DEFAULT_DIFFICULTY
        self.cfg = DIFFICULTY[self.difficulty]
        # SLA target eased by difficulty (floored so it stays a meaningful bar).
        self.sla = max(55, SLA_THRESHOLD + self.cfg["sla_delta"])
        self.rng = random.Random(seed)
        self.log: list[dict] = []
        self.selected_slot: Optional[int] = None
        self._init_state(profile)

    def _init_state(self, profile):
        self.profile = dict(profile)
        if "fragility" not in self.profile:
            self.profile["fragility"] = compute_fragility(
                profile.get("overfitRisk"), profile.get("underfitRisk"),
                profile.get("trainAcc"), profile.get("valAcc"))
        # Effective fragility softened by difficulty (drives drift/decay).
        self.frag = clamp(self.profile["fragility"] * self.cfg["fragility_mult"], 0.03, 0.95)
        baseline = self.profile["valAcc"]
        self.state = {
            "epoch": 1, "waveIndex": 0, "epochInWave": 0,
            "baselineAccuracy": baseline, "liveAccuracy": baseline, "ghostAccuracy": baseline,
            "drift": 0, "latency": 85, "currentRps": WAVES[0]["baseRps"], "budget": self.cfg["d_budget"],
            "slots": [None] * SLOT_COUNT, "gameOver": False, "deathReason": None,
            "slaStreak": 0, "latencyStreak": 0, "epochsSinceRetrain": 0,
            "retrainActive": False, "retrainEpochsLeft": 0, "retrainFragileEpochs": 0,
            "totalRetrains": 0, "badRetrains": 0, "silentDriftEpochs": 0, "peakLive": baseline,
            "totalSpent": 0, "totalEarned": 0,
            "history": [{"epoch": 0, "live": baseline, "ghost": baseline}],
            "hadMonitoring": False, "canaryEpochsLeft": 0, "canaryBonusPending": 0,
            "serverlessColdEpochs": 0, "overloadEpochs": 0,
        }

    def emit(self, msg, kind="info"):
        self.log.append({"epoch": self.state["epoch"], "msg": msg, "kind": kind})

    def current_wave(self):
        return WAVES[min(self.state["waveIndex"], len(WAVES) - 1)]

    def infra_effects(self):
        fx = {
            "capacity": 0, "capacityMult": 1, "latencyReduction": 0, "upkeep": 0,
            "hasMonitoring": False, "driftWarning": 0, "retrainTier": -1, "hasRetraining": False,
            "serverlessCapacity": 0, "coldStartLatency": 0, "sustainedTax": 0,
            "cacheHitRate": 0, "loadReduction": 0, "driftBlindness": 0, "incomeBonus": 1,
            "canaryTier": -1, "canaryShare": 0, "canaryPromoteEpochs": 0, "badRetrainMitigation": 0,
            "adversarialDefense": 0, "latencyOverhead": 0, "spikeThrottle": 0,
        }
        for slot in self.state["slots"]:
            if not slot:
                continue
            d = INFRA[slot["type"]]
            t = slot["tier"]
            fx["upkeep"] += d["upkeep"][t]
            tp = slot["type"]
            if tp == "loadBalancer":
                fx["capacityMult"] = d["capacityMult"][t]
                fx["latencyReduction"] = d["latencyReduction"][t]
            elif tp == "modelReplica":
                fx["capacity"] += d["capacity"][t]
            elif tp == "monitoring":
                fx["hasMonitoring"] = True
                fx["driftWarning"] = d["driftWarning"][t]
            elif tp == "retraining":
                fx["hasRetraining"] = True
                fx["retrainTier"] = t
            elif tp == "serverless":
                fx["serverlessCapacity"] = max(fx["serverlessCapacity"], d["burstCapacity"][t])
                fx["coldStartLatency"] = d["coldStartLatency"][t]
                fx["sustainedTax"] = d["sustainedTax"][t]
            elif tp == "cacheLayer":
                fx["cacheHitRate"] = max(fx["cacheHitRate"], d["cacheHitRate"][t])
                fx["loadReduction"] = max(fx["loadReduction"], d["loadReduction"][t])
                fx["driftBlindness"] = max(fx["driftBlindness"], d["driftBlindness"][t])
                fx["incomeBonus"] = max(fx["incomeBonus"], d["incomeBonus"][t])
            elif tp == "canary":
                if t >= fx["canaryTier"]:
                    fx["canaryTier"] = t
                    fx["canaryShare"] = d["canaryShare"][t]
                    fx["canaryPromoteEpochs"] = d["promoteEpochs"][t]
                    fx["badRetrainMitigation"] = d["badRetrainMitigation"][t]
            elif tp == "rateLimit":
                fx["adversarialDefense"] = max(fx["adversarialDefense"], d["adversarialDefense"][t])
                fx["latencyOverhead"] = max(fx["latencyOverhead"], d["latencyOverhead"][t])
                fx["spikeThrottle"] = d["spikeThrottle"][t]
        fx["effectiveCapacity"] = round((fx["capacity"] + fx["serverlessCapacity"]) * fx["capacityMult"])
        return fx

    # ── player actions ──
    def place_infra(self, type_):
        s = self.state
        if self.selected_slot is None or s["slots"][self.selected_slot] or s["gameOver"]:
            return False
        d = INFRA[type_]
        if s["budget"] < d["placeCost"]:
            return False
        s["budget"] -= d["placeCost"]
        s["totalSpent"] += d["placeCost"]
        s["slots"][self.selected_slot] = {"type": type_, "tier": 0}
        self.selected_slot = None
        return True

    def upgrade_infra(self, i):
        s = self.state
        slot = s["slots"][i]
        if not slot or slot["tier"] >= 2:
            return False
        d = INFRA[slot["type"]]
        cost = d["upgradeCosts"][slot["tier"]]
        if s["budget"] < cost:
            return False
        s["budget"] -= cost
        s["totalSpent"] += cost
        slot["tier"] += 1
        return True

    def remove_infra(self, i):
        s = self.state
        slot = s["slots"][i]
        if not slot or s["gameOver"]:
            return False
        if slot["type"] == "retraining" and s["retrainActive"]:
            self.emit("Cannot remove Retraining Pipeline while a retrain is running.", "warning")
            return False
        d = INFRA[slot["type"]]
        invested = d["placeCost"] + sum(d["upgradeCosts"][:slot["tier"]])
        refund = invested // 2
        s["budget"] += refund
        s["slots"][i] = None
        if self.selected_slot == i:
            self.selected_slot = None
        self.emit(f"Removed {d['name']} (+${refund} refund)", "warning")
        return True

    def trigger_retrain(self):
        s = self.state
        if s["retrainActive"] or s["gameOver"]:
            return False
        fx = self.infra_effects()
        if not fx["hasRetraining"] or fx["retrainTier"] < 0:
            return False
        d = INFRA["retraining"]
        cost = d["retrainCost"][fx["retrainTier"]]
        if s["budget"] < cost:
            return False
        s["budget"] -= cost
        s["totalSpent"] += cost
        s["retrainActive"] = True
        s["retrainEpochsLeft"] = d["retrainDuration"][fx["retrainTier"]]
        self.emit(f"Retraining started — {s['retrainEpochsLeft']} epochs, ${cost} spent.", "warning")
        return True

    # ── core tick ──
    def step_tick(self):
        s = self.state
        if s["gameOver"]:
            return
        wave = self.current_wave()
        fx = self.infra_effects()
        s["currentRps"] = round(wave["baseRps"] * self.cfg["rps_mult"])
        s["budget"] -= fx["upkeep"] * self.cfg["d_upkeep_mult"]

        effective_rps = round(s["currentRps"] * (1 - fx["loadReduction"] * fx["cacheHitRate"]))
        capacity = max(fx["effectiveCapacity"], 8)
        load_ratio = effective_rps / capacity
        served_ratio = clamp(capacity / effective_rps if load_ratio > 1 else 1, 0.15, 1)
        if wave["baseRps"] >= 90 and fx["spikeThrottle"] > 0:
            served_ratio *= (1 - fx["spikeThrottle"])

        latency = 70 + max(0, load_ratio - 1) * 220
        latency *= (1 - fx["latencyReduction"])
        latency += fx["latencyOverhead"]
        if s["retrainActive"]:
            latency += 65
        if s["retrainFragileEpochs"] > 0:
            latency += 25
        if fx["serverlessCapacity"] > 0 and s["epochInWave"] <= 2 and wave["baseRps"] >= 70:
            latency += fx["coldStartLatency"]
            s["serverlessColdEpochs"] = max(s["serverlessColdEpochs"], 1)
        s["latency"] = round1(latency * self.cfg["latency_mult"])

        if load_ratio > 1:
            s["overloadEpochs"] += 1
            if fx["sustainedTax"] > 0 and fx["serverlessCapacity"] > 0 and s["overloadEpochs"] >= 3:
                s["budget"] -= fx["sustainedTax"]
        else:
            s["overloadEpochs"] = 0

        fragility = self.frag
        drift_rate = wave["driftRate"] * (1 + fragility * 0.85) * self.cfg["drift_mult"]
        if s["epochsSinceRetrain"] >= STALE_EPOCHS:
            drift_rate *= 1 + (s["epochsSinceRetrain"] - STALE_EPOCHS) * 0.08
        if s["retrainFragileEpochs"] > 0:
            drift_rate *= 1.25
            s["retrainFragileEpochs"] -= 1
        if wave["dataDriftBoost"] > 0:
            drift_rate += wave["dataDriftBoost"] * (1 if fx["hasMonitoring"] else 1.35) * self.cfg["drift_mult"]
        s["drift"] = clamp(s["drift"] + drift_rate, 0, 1)

        acc_decay = drift_rate * 18 * (1 + fragility * 0.6)
        if wave["conceptDrift"] > 0:
            retrain_mit = 0.4 if s["retrainActive"] else 0
            acc_decay += wave["conceptDrift"] * (1 - retrain_mit) * 0.35
        if wave["dataDriftBoost"] > 0 and fx["driftBlindness"] > 0:
            acc_decay += wave["dataDriftBoost"] * fx["driftBlindness"] * 12
        if wave["adversarialLevel"] > 0:
            acc_decay += wave["adversarialLevel"] * (1 - fx["adversarialDefense"]) * 14

        acc_decay *= self.cfg["decay_mult"]

        s["ghostAccuracy"] = clamp(s["ghostAccuracy"] - acc_decay, 0, 100)
        s["liveAccuracy"] = clamp(s["liveAccuracy"] - acc_decay, 0, 100)

        if s["canaryEpochsLeft"] > 0:
            s["canaryEpochsLeft"] -= 1
            if s["canaryEpochsLeft"] <= 0 and s["canaryBonusPending"] > 0:
                s["liveAccuracy"] = clamp(s["liveAccuracy"] + s["canaryBonusPending"], 0, 100)
                s["canaryBonusPending"] = 0
                self.emit("🐤 Canary promoted — full rollout complete.", "warning")

        if not fx["hasMonitoring"]:
            if s["drift"] > 0.15:
                s["silentDriftEpochs"] += 1
        else:
            s["hadMonitoring"] = True
            s["silentDriftEpochs"] = 0

        if s["retrainActive"]:
            s["retrainEpochsLeft"] -= 1
            if s["retrainEpochsLeft"] <= 0:
                self._complete_retrain(fx)
        else:
            s["epochsSinceRetrain"] += 1

        request_income = served_ratio * s["currentRps"] * 0.22 * fx["incomeBonus"]
        latency_bonus = 1.15 if s["latency"] < 200 else (1 if s["latency"] < 350 else 0.55)
        income = request_income * latency_bonus * self.cfg["d_income_mult"]
        s["budget"] += income
        s["totalEarned"] += income

        s["latencyStreak"] = s["latencyStreak"] + 1 if s["latency"] > LATENCY_TIMEOUT else 0
        s["slaStreak"] = s["slaStreak"] + 1 if s["liveAccuracy"] < self.sla else 0
        s["peakLive"] = max(s["peakLive"], s["liveAccuracy"])

        s["history"].append({"epoch": s["epoch"], "live": round1(s["liveAccuracy"]),
                             "ghost": round1(s["ghostAccuracy"])})

        if s["liveAccuracy"] <= 0:
            self._end("accuracy_zero"); return
        if s["slaStreak"] >= SLA_FAIL_EPOCHS:
            self._end("sla_breach"); return
        if s["latencyStreak"] >= LATENCY_FAIL_EPOCHS:
            self._end("latency_timeout"); return
        if s["budget"] < -15 and s["budget"] + income < 0:
            self._end("bankrupt"); return

        s["epoch"] += 1
        s["epochInWave"] += 1
        if s["epochInWave"] >= WAVE_EPOCHS:
            if s["liveAccuracy"] < self.sla:
                self._end("wave_sla_failed"); return
            self._advance_wave()

    def _complete_retrain(self, fx):
        s = self.state
        s["retrainActive"] = False
        s["totalRetrains"] += 1
        d = INFRA["retraining"]
        t = fx["retrainTier"]
        bad = self.rng.random() < d["badRetrainChance"][t] * self.cfg["bad_retrain_mult"]
        has_canary = fx["canaryTier"] >= 0
        if bad:
            s["badRetrains"] += 1
            damage = 8 + self.rng.random() * 6
            if has_canary:
                damage *= 1 - fx["canaryShare"] * fx["badRetrainMitigation"]
                self.emit("🐤 Bad retrain caught by canary — limited blast radius.", "warning")
            else:
                self.emit("Bad retrain! New data was dirty — accuracy dropped.", "danger")
            s["liveAccuracy"] -= damage
        else:
            restore_target = clamp(
                max(s["liveAccuracy"], s["baselineAccuracy"] * d["accuracyRestore"][t])
                + (s["baselineAccuracy"] - s["liveAccuracy"]) * 0.15,
                0, s["baselineAccuracy"] + 2)
            gain = restore_target - s["liveAccuracy"]
            if has_canary and gain > 0:
                immediate = gain * (1 - fx["canaryShare"])
                s["canaryBonusPending"] = gain * fx["canaryShare"]
                s["canaryEpochsLeft"] = fx["canaryPromoteEpochs"]
                s["liveAccuracy"] = clamp(s["liveAccuracy"] + immediate, 0, 100)
                self.emit(f"Retrain OK — canary rolling out ({fx['canaryPromoteEpochs']} epoch(s) to full).", "warning")
            else:
                s["liveAccuracy"] = restore_target
                self.emit("Retrain complete — model refreshed.", "warning")
            s["drift"] = clamp(s["drift"] * (1 - d["driftReset"][t]), 0, 1)
        s["epochsSinceRetrain"] = 0
        s["retrainFragileEpochs"] = d["postDeployFragile"][t]

    def _advance_wave(self):
        s = self.state
        s["waveIndex"] += 1
        s["epochInWave"] = 0
        s["overloadEpochs"] = 0
        s["serverlessColdEpochs"] = 0
        s["budget"] += round((20 + s["waveIndex"] * 8) * self.cfg["d_income_mult"])
        if s["waveIndex"] >= len(WAVES):
            self._end("victory"); return
        self.emit(f"Wave {s['waveIndex'] + 1}: {WAVES[s['waveIndex']]['name']}", "warning")

    def _end(self, reason):
        self.state["gameOver"] = True
        self.state["deathReason"] = reason
        if reason == "wave_sla_failed":
            dx = self.diagnose_failure()
            self.emit(f"Wave failed — {dx['summary']}.", "danger")
        elif reason == "victory":
            self.emit("Production stable! All 5 waves survived.", "warning")

    # ── diagnosis ──
    def diagnose_failure(self):
        s = self.state
        wave = self.current_wave()
        fx = self.infra_effects()
        live = round1(s["liveAccuracy"])
        shortfall = round1(max(0, self.sla - live))
        reasons, fixes = [], []
        reasons.append(f"Wave ended after {WAVE_EPOCHS} epochs — live accuracy must stay ≥ {self.sla}%. "
                       f"You ended at {live}% ({shortfall}% below SLA).")
        if wave["conceptDrift"] > 0 and s["totalRetrains"] == 0:
            reasons.append(f"Concept drift — user behavior shifted (+{wave['conceptDrift']} decay/epoch). No retrain triggered.")
            fixes.append("Deploy Retraining Pipeline and click Trigger Retrain when concept drift hits.")
        elif wave["conceptDrift"] > 0 and s["epochsSinceRetrain"] > 4:
            reasons.append(f"Stale model — last retrain was {s['epochsSinceRetrain']} epochs ago; drift kept eating accuracy.")
            fixes.append("Retrain earlier in concept-drift waves — do not wait until SLA is already red.")
        if wave["dataDriftBoost"] > 0:
            if not fx["hasMonitoring"]:
                reasons.append("Silent data drift — input distributions shifted but no Monitoring Node deployed.")
                fixes.append("Monitoring Node surfaces drift early — pair it with scheduled retrains.")
            if fx["driftBlindness"] > 0.2:
                reasons.append(f"Cache blindness — stale hits ({round1(fx['driftBlindness']*100)}% drift blindness) accelerated decay.")
                fixes.append("High cache tiers hide drift — retrain more often or use lower cache on drift waves.")
        if wave["baseRps"] >= 90:
            if fx["effectiveCapacity"] < wave["baseRps"]:
                reasons.append(f"Traffic spike — {wave['baseRps']} RPS vs {fx['effectiveCapacity']} capacity. Overload throttled served traffic.")
                fixes.append("Add Model Replicas or Serverless before Wave 2 — Load Balancer alone does not add capacity.")
            if fx["serverlessCapacity"] > 0 and s["serverlessColdEpochs"] > 0:
                reasons.append("Cold starts — Serverless added latency at spike onset.")
                fixes.append("Pair Serverless with warm replicas or upgrade the Serverless tier.")
        if wave["adversarialLevel"] > 0 and fx["adversarialDefense"] < 0.4:
            reasons.append(f"Adversarial traffic — probes degraded accuracy (defense {round1(fx['adversarialDefense']*100)}%).")
            fixes.append("Deploy Rate Limit Gateway before Wave 5.")
        if self.profile["fragility"] > 0.45:
            reasons.append(f"Fragile model — imported model had {round1(self.profile['fragility']*100)}% fragility; decay amplified.")
            fixes.append("Improve val accuracy in Train Mode before deploy — fragile models decay faster.")
        if s["drift"] > 0.35:
            reasons.append(f"High drift — accumulated {round1(s['drift']*100)}% drift this wave.")
            if not fx["hasRetraining"]:
                fixes.append("Retraining Pipeline is required for sustained production accuracy.")
        if s["totalRetrains"] == 0 and wave["id"] >= 3:
            reasons.append("No retrains — drift compounded across multiple production events.")
            fixes.append("Trigger Retrain when live accuracy dips or drift rises — ghost accuracy shows the no-retrain path.")
        if not fixes:
            fixes.append("Balance infra spend: enough capacity for spikes plus monitoring/retrain for drift.")
            fixes.append("Watch the SLA meter — retrain proactively when the drift curve rises, not after breach.")
        return {"reasons": reasons, "fixes": fixes, "shortfall": shortfall,
                "waveName": wave["name"], "summary": f"{shortfall}% below SLA at end of {wave['name']}"}

    def postmortem(self):
        s = self.state
        wave = self.current_wave()
        fx = self.infra_effects()
        reason = s["deathReason"]
        if reason == "sla_breach":
            title = "Production Failed — Postmortem"
            cause = (f"Live accuracy stayed below the {self.sla}% SLA for {SLA_FAIL_EPOCHS} consecutive epochs. "
                     f"Contract terminated at epoch {s['epoch']}. Final accuracy: {round1(s['liveAccuracy'])}%.")
            if s["silentDriftEpochs"] > 3 and not s["hadMonitoring"]:
                advice = f"Drift was invisible for {s['silentDriftEpochs']} epochs — no Monitoring Node. You can't fix drift you're not measuring."
            elif s["totalRetrains"] == 0:
                advice = "You never retrained. Concept/data drift compounded — retrain before the SLA death spiral."
            else:
                advice = f"Retrain timing matters. Ghost (no retrains) ended at {round1(s['ghostAccuracy'])}% vs your live {round1(s['liveAccuracy'])}%."
        elif reason == "latency_timeout":
            title = "Production Failed — Postmortem"
            cause = f"Latency exceeded {LATENCY_TIMEOUT}ms for {LATENCY_FAIL_EPOCHS} epochs. Peak load: {s['currentRps']} RPS vs {fx['effectiveCapacity']} capacity."
            advice = ("Serverless cold starts hurt on sudden spikes — pair with warm replicas or upgrade tier."
                      if fx["serverlessCapacity"] > 0 and fx["capacity"] == 0
                      else "Add Model Replicas or Serverless before Wave 2. Load Balancer alone doesn't create capacity.")
        elif reason == "bankrupt":
            title = "Production Failed — Postmortem"
            cause = f"Compute budget went bankrupt at epoch {s['epoch']}. Infra upkeep (${fx['upkeep']}/epoch) exceeded revenue."
            advice = "Max replicas 24/7 burns cash on Wave 1. Scale for the spike, not the average."
        elif reason == "wave_sla_failed":
            dx = self.diagnose_failure()
            title = "Wave Failed — Postmortem"
            cause = "Why this happened — " + dx["waveName"] + "\n- " + "\n- ".join(dx["reasons"])
            advice = "How to fix it\n- " + "\n- ".join(dx["fixes"])
        elif reason == "accuracy_zero":
            title = "Production Failed — Postmortem"
            cause = f"Model accuracy hit 0% in production. Drift and {self.profile.get('label','model')} fragility ({round1(self.profile['fragility']*100)}%) destroyed predictive power."
            advice = (f"This model was overfit in Train Mode — it degraded {round1(self.profile['fragility']*100)}% faster. Train better before deploy."
                      if self.profile["fragility"] > 0.45
                      else "Deploy is not the finish line. Continuous monitoring and retraining are part of the lifecycle.")
        elif reason == "victory":
            title = "Production Stable!"
            cause = (f"Survived all {len(WAVES)} waves. Live: {round1(s['liveAccuracy'])}%, Ghost without retrains: "
                     f"{round1(s['ghostAccuracy'])}%. Retrains: {s['totalRetrains']} ({s['badRetrains']} bad).")
            advice = (f"You balanced infra cost (${round1(s['totalSpent'])} spent) vs drift response. "
                      f"Fragility was {round1(self.profile['fragility']*100)}% — "
                      f"{'a fragile model made this harder.' if self.profile['fragility'] > 0.4 else 'a healthy model helped.'}")
        else:
            title, cause, advice = "Run Ended", "Production run ended.", "Adjust infra and retry."

        stats = (f"Epochs served: {s['epoch']} | Waves cleared: {s['waveIndex']}/{len(WAVES)} | "
                 f"Peak live {round1(s['peakLive'])}% · Final drift {round1(s['drift']*100)}% | "
                 f"Retrains {s['totalRetrains']} ({s['badRetrains']} bad) | "
                 f"Earned ${round1(s['totalEarned'])} · Spent ${s['totalSpent']} | "
                 f"Monitoring: {'Yes' if s['hadMonitoring'] else 'No'}")
        return {"title": title, "cause": cause, "advice": advice, "stats": stats}
