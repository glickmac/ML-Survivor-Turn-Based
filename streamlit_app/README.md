# ML Survivor — Streamlit edition

A turn-based Python/Streamlit port of ML Survivor. Same simulation and teaching content as
the vanilla-JS game, restructured so it plays cleanly in the browser via Streamlit.

## Run it

```bash
cd streamlit_app
pip install -r requirements.txt
streamlit run app.py
```

Streamlit opens a browser tab (default `http://localhost:8501`).

## How it plays

Streamlit is request/response, so the original real-time `setInterval` epoch loop is replaced
with explicit controls:

- **▶ Run Epoch** — advance the simulation one epoch.
- **⏩ Run Wave** — fast-forward to the end of the current wave.

Between epochs you select a slot and buy defenses (Train) or infra (Deploy) from the shop, exactly
like the original. Everything else — waves, thresholds, overfit/underfit, drift, retraining, SLA,
postmortems, and the Train→Deploy fragility bridge — is preserved.

## Files

```
streamlit_app/
├── app.py              # Streamlit UI: menu, Train screen, Deploy setup + screen
├── engine_train.py     # Train Mode simulation (port of js/game.js) — pure, no UI
├── engine_deploy.py    # Deploy Mode simulation (port of js/deploy.js + shared.js)
└── requirements.txt
```

The engines are UI-free and import-safe, so they can be unit-tested or reused headlessly:

```python
from engine_train import TrainGame
g = TrainGame("Engineer", seed=42)
g.selected_slot = 0; g.place_defense("dropout")
g.step_epoch()
print(g.state["valAcc"], g.state["overfitRisk"])
```

## What changed vs. the original (and why)

These are deliberate improvements made during the port:

1. **Turn-based control** (required for Streamlit). It's also a teaching win: you can pause on any
   epoch, read the curves, and *react* to the train/val gap instead of fighting a 2-second timer.
2. **Difficulty selector that actually rebalances the game** — Student / Engineer / Researcher.
   The JS game had a single, punishing difficulty (you could lose Wave 1 just by over-regularizing).
   Each tier now scales *many* levers, not just one:
   - *Train:* hazard damage, starting budget, between-wave income, per-epoch upkeep, val thresholds,
     overfit-drain strength, learning speed, and gradient-explosion damage.
   - *Deploy:* drift & accuracy-decay rate, SLA target, budget, income, upkeep, imported-model
     fragility impact, bad-retrain chance, traffic (RPS) severity, and latency.

   **Student is the default and is genuinely accessible.** In automated playthroughs that follow the
   in-game guidance (match the specialist defense/infra to each wave, retrain on drift), Student wins
   ~90–100% of Train *and* Deploy runs, while still teaching the lessons (over-regularizing still
   underfits; skipping rate-limiting still loses Wave 5). Engineer is a true middle (~75–82%);
   **Researcher reproduces the original's brutal economy** for players who want the original challenge.
3. **Deterministic mode** — a fixed-seed toggle so a run is reproducible. Useful for classrooms
   (everyone gets the same wave 5 explosion) and for comparing strategies fairly.
4. **Persistent event log** — replaces the original's transient 3-second toasts, which were easy to
   miss. You can scroll back through what actually happened.
5. **Seedable RNG + pure engines** — makes the simulation testable (the port is verified end-to-end
   with Streamlit's `AppTest` harness).
6. **Robustness fix** — every Deploy wave now explicitly defines `adversarialLevel`. The JS relied on
   `undefined > 0` evaluating false; that's fragile and breaks if ported naively.

## Ideas for further improvement (not yet implemented)

- **Sandbox modes** — the JS version has Train/Deploy sandboxes (no game-over, free defenses,
  tunable intensity). Worth porting as a Streamlit sidebar of tuning sliders.
- **Defense effect inspector** — surface the aggregated `defense_effects()` dict live so players see
  exactly which mitigations are active. The data is already computed; it just needs a panel.
- **Strategy replay** — since runs are now seedable, you could save a build order and replay it.
- **Per-tier tutorials** — surface the wave-specific "best defense" hint more prominently on Student,
  fading it on harder tiers.
