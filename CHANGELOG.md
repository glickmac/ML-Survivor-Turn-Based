# Changelog

All notable changes to ML Survivor are documented here. Version tags reflect logical shipping order for commit history and README.

## v1.0 — Core Train Loop

- **TRAIN: Model Survival** playable prototype
- Pipeline UI (Data → Defenses → Model → Output)
- 5 training waves with escalating ML data problems
- 4 defenses with 3 upgrade tiers and real tradeoff math (Dropout, L1/L2, Batch Norm, Data Augmentation)
- Overfit Risk / Underfit Risk meters driven by live numbers
- Live Train vs Val accuracy chart (Chart.js)
- Game-over conditions: val collapse, bankruptcy, underfit lockout
- Postmortem screen with plain-English ML advice

## v1.1 — Polish & Postmortem

- Underfit lockout tuned to avoid false early game-overs
- Wave threshold UX and risk meter hints
- Postmortem copy refined for teaching payoff
- Train run export to `localStorage` for Deploy handoff
- Shared menu (`index.html`) and `train.html` route split

## v1.2 — Deploy Mode & Lifecycle Bridge

- **DEPLOY: Model in Production** mode
- Train → Deploy fragility bridge (overfit models degrade faster in prod)
- Preset model profiles (Well-Trained / Overfit / Underfit)
- 4 production waves: Normal Traffic, Traffic Spike, Concept Drift, Data Drift
- 4 infra nodes: Load Balancer, Model Replica, Monitoring, Retraining Pipeline
- Dual accuracy graph (live vs ghost without retrains)
- Drift meter canvas (two separating bell curves)
- MLOps postmortem screen

## v1.5 — Deploy Infra Expansion (current)

- **4 new infra cards:** Serverless Endpoint, Prediction Cache, Canary Deployment, Rate Limit Gateway
- **Wave 5:** Adversarial Traffic
- Canary rollout on retrain (limits bad-retrain damage, delays full promotion)
- Cache stale-drift penalty; serverless cold-start + sustained overload tax
- Dynamic infra shop card stats

## v1.4 — Expanded Train Defenses

- **6 new defenses** chosen for max wave coverage and teaching value:
  - Early Stopping (reactive)
  - Cross-Validation Module (validation strategy)
  - Class Weighting / Focal Loss (Wave 3)
  - Input Clipping & Normalization (Wave 4)
  - Gradient Clipping (Wave 5, distinct from Batch Norm)
  - Learning Rate Scheduler (optimization + explosion recovery)
- Dynamic defense card stats in shop UI
- Postmortem advice references new specialists

## v1.3 — Sandbox & Open Source

- **Train Sandbox** and **Deploy Sandbox** — no game-over, manual/auto step
- Sandbox sliders: budget, wave/traffic intensity, drift speed, free costs toggle
- Live stat readout panel for recruiters/explorers
- README, MIT LICENSE, CONTRIBUTING.md
- Four-button menu: Train, Train Sandbox, Deploy, Deploy Sandbox
- GitHub Pages–ready static layout

## Unreleased / stretch goals

- A/B Testing Router, Shadow Deployment, Model Version Rollback
- Stale Model Penalty tuning as explicit wave mechanic
- Gameplay GIF in `assets/gameplay.gif`
- GitHub Pages deploy workflow
