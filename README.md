# ML Survivor

**Learn machine learning and MLOps by keeping models alive** — a [Server Survival](https://github.com/pshenok/server-survival)–style browser game.

Train a model through hostile data waves, then deploy it to production and fight drift, traffic spikes, and SLA pressure. No install required: vanilla HTML, CSS, and JavaScript with zero build step.

---

## Quick start

1. Clone or download this repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. Pick a mode from the menu and play.

For local development with live reload, serve the folder with any static file server:

```bash
# Python
python -m http.server 8080

# Node (npx, no install needed)
npx serve .
```

Then visit `http://localhost:8080`.

---

## Game modes

| Mode | File | Description |
|------|------|-------------|
| **Train Mode** | `train.html` | Full game — survive 5 training waves. Balance overfit vs underfit under budget pressure. |
| **Train Sandbox** | `train-sandbox.html` | No game over. Step epochs manually, tune wave intensity, explore defenses freely. |
| **Deploy Mode** | `deploy.html` | Full game — serve production traffic for 5 waves. Manage infra cost vs SLA and retrain on drift. |
| **Deploy Sandbox** | `deploy-sandbox.html` | No SLA failure. Tune traffic, drift, and model fragility. Compare live vs ghost (no-retrain) accuracy. |

Each full game mode includes a slide-based **How to Play** tutorial (watch → build → reference). Use the **? How to Play** link in-game to replay it.

---

## How it works

### The lifecycle loop

```
Train Mode  ──export──▶  Deploy Mode
   (fit)                    (serve + drift)
```

When you finish (or fail) a Train run, your model stats are saved to `localStorage`. Deploy Mode reads that export and uses it as your production model profile — including **fragility**, which controls how fast accuracy decays under drift.

If you skip Train Mode, Deploy offers preset profiles: Well-Trained, Overfit, and Underfit.

### UI layout (all play modes)

The screen flows top → bottom:

1. **Watch (top)** — HUD stats, risk meters, wave info, live chart  
2. **Build (middle)** — 5 pipeline slots (place, upgrade ↑, remove × for 50% refund)  
3. **Shop (bottom)** — ML defenses (Train) or deployment infra (Deploy)

---

## Train Mode

**Goal:** Keep **Validation Accuracy** above each wave's threshold. Clear all 5 waves to win.

### Core stats

- **Train Accuracy** — rises easily; not your health bar  
- **Validation Accuracy** — your health bar  
- **Overfit Risk** — train outruns val; val accuracy drains  
- **Underfit Risk** — too much regularization; learning ceiling drops  
- **Compute Budget ($)** — pays placement, upgrades, and per-epoch upkeep  

### Training waves

| Wave | Name | ML concept | Val threshold |
|------|------|------------|---------------|
| 1 | Clean Data | Standard supervised learning | 55% |
| 2 | Noisy Labels | Label noise poisons gradients | 58% |
| 3 | Class Imbalance | Minority classes ignored | 60% |
| 4 | Outlier Storm | Extreme inputs destabilize weights | 62% |
| 5 | Gradient Explosion | Unstable updates destroy progress | 65% |

Each wave lasts **8 epochs**. You earn passive income between waves.

### ML defenses (shop)

| Defense | Role |
|---------|------|
| Dropout Layer | Strong overfit reduction; stacks underfit risk |
| L1/L2 Regularization | Cheaper regularization; don't stack with Dropout |
| Batch Normalization | Stabilizes training; helps gradient explosions |
| Data Augmentation | Noisy labels, imbalance, mild outliers |
| Early Stopping | One save per wave when train/val gap widens |
| Cross-Validation Module | Val stability + threshold bonus |
| Class Weighting / Focal Loss | Class imbalance specialist |
| Input Clipping & Normalization | Outlier preprocessing |
| Gradient Clipping | Exploding gradient shield |
| Learning Rate Scheduler | Clean convergence and recovery |

### Failure conditions

- Validation accuracy hits **0%** (collapsed model)  
- **Bankruptcy** — budget cannot recover  
- **Underfit lockout** — val stays below threshold for 3 consecutive epochs while over-regularized  
- **Wave failed** — wave ends before clearing the val threshold  

On wave failure, you get a **postmortem** with structured **Why this happened** and **How to fix it** advice, plus in-wave warnings in the last 2 epochs if you're below threshold.

---

## Deploy Mode

**Goal:** Keep **Live Accuracy** at or above the **70% SLA** through all 5 production waves.

### Core stats

- **Live Accuracy** — model performance in production (health bar)  
- **Ghost Accuracy** — what would happen without any retrains (shown on chart)  
- **Latency** — must stay under 480 ms or you lose after 4 consecutive breaches  
- **Requests/sec** — traffic load vs your infra capacity  
- **Drift Meter** — visible only with Monitoring Node deployed  
- **Compute Budget ($)** — earned from served requests minus infra upkeep  

### Production waves

| Wave | Name | MLOps concept |
|------|------|---------------|
| 1 | Normal Traffic | Baseline drift — models decay even when nothing breaks |
| 2 | Traffic Spike | Capacity vs cost under flash-sale load |
| 3 | Concept Drift Event | P(y\|X) changed — retrain to recover |
| 4 | Data Drift Event | P(X) changed — monitoring + retraining loop |
| 5 | Adversarial Traffic | Abuse/probing traffic degrades metrics |

Each wave lasts **8 epochs**. Click **Trigger Retrain** (requires Retraining Pipeline) to fight drift — retrains cost money, take time, and can fail.

### Deployment infra (shop)

| Component | Role |
|-----------|------|
| Load Balancer | Latency reduction; capacity multiplier |
| Model Replica | Raw inference capacity (RPS) |
| Monitoring Node | Reveals drift; required to react early |
| Retraining Pipeline | Refresh model on new data |
| Serverless Endpoint | Burst capacity; cold-start latency tradeoff |
| Prediction Cache | Cuts load and cost; can hide drift |
| Canary Deployment | Limits blast radius of bad retrains |
| Rate Limit Gateway | Adversarial/abuse traffic defense |

### Failure conditions

- Live accuracy hits **0%**  
- **SLA breach** — below 70% for 5 consecutive epochs  
- **Latency timeout** — above 480 ms for 4 consecutive epochs  
- **Bankruptcy**  
- **Wave SLA failed** — wave ends below 70% live accuracy  

Wave failures include the same structured postmortem diagnosis as Train Mode.

---

## Sandboxes

Sandboxes patch the core game logic to disable hard game-over. They are ideal for classrooms, experimentation, and learning mechanics without pressure.

### Train Sandbox controls

- **Step 1 Epoch** — manual epoch advance  
- **Wave selector** — jump to any training wave  
- **Wave intensity** — scale hazard severity  
- **Drift speed** — accelerate overfit gap widening  
- **Free defenses** — zero-cost placement and upkeep  
- **Starting budget** slider  

Failures show a toast explaining what *would* have ended the run, with fix hints — but the run continues.

### Deploy Sandbox controls

- Similar tuning for traffic, drift rate, model fragility, and infra  
- Compare live accuracy vs ghost (no-retrain) curve on the dual chart  

---

## Project structure

```
ML survivor/
├── index.html              # Menu hub — pick a mode
├── train.html              # Train Mode (full game)
├── train-sandbox.html      # Train Sandbox
├── deploy.html             # Deploy Mode (full game)
├── deploy-sandbox.html     # Deploy Sandbox
├── css/
│   └── styles.css          # Shared styles (menu, HUD, tutorial, postmortem)
├── js/
│   ├── shared.js           # Utilities, localStorage Train→Deploy bridge
│   ├── game.js             # Train Mode simulation
│   ├── deploy.js           # Deploy Mode simulation
│   ├── tutorial.js         # Slide tutorials for all modes
│   ├── train-sandbox.js    # Train Sandbox adapter (patches game.js)
│   └── deploy-sandbox.js   # Deploy Sandbox adapter (patches deploy.js)
├── LICENSE                 # MIT
└── README.md
```

Sandboxes set `window.ML_SURVIVOR_NO_AUTO_INIT = true` before loading core scripts, then boot via their own adapter on `DOMContentLoaded`.

---

## Tech stack

- **Vanilla JavaScript** — no framework, no bundler, no transpiler  
- **Chart.js 4** (CDN) — train/val and live/ghost accuracy charts  
- **localStorage** — Train Mode export persists across sessions  
- **Playwright** (optional dev dependency) — used for local browser testing  

---

## Design philosophy

ML Survivor teaches real ML/MLOps tradeoffs through gameplay:

- **Bias–variance** — regularize too much and you underfit; too little and val collapses  
- **Specialist defenses** — each wave maps to a real failure mode (noise, imbalance, outliers, gradients)  
- **Production reality** — drift, retraining cost, monitoring blind spots, cache staleness, canary rollouts  
- **Model fragility** — a model you train poorly degrades faster in Deploy Mode  

Inspired by [Server Survival](https://github.com/pshenok/server-survival) — infrastructure tower defense reimagined for the model lifecycle.

---

## License

[MIT License](LICENSE) — Copyright (c) 2026 ML Survivor Contributors.
