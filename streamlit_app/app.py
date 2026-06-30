"""
ML Survivor — Streamlit edition.

Turn-based browser port of the vanilla-JS ML Survivor game.
Run with:  streamlit run app.py
"""
from __future__ import annotations

import pandas as pd
import streamlit as st

import engine_train as ET
import engine_deploy as ED
from engine_train import TrainGame, DEFENSES, round1
from engine_deploy import DeployGame, INFRA, MODEL_PRESETS, preset_to_profile, SLA_THRESHOLD

st.set_page_config(page_title="ML Survivor", page_icon="🧠", layout="wide")

# ─── tiny stylesheet ────────────────────────────────────────────────
st.markdown("""
<style>
  .block-container {padding-top: 2rem; max-width: 1200px;}
  .wave-card {background:#11192e;border:1px solid #2d3a52;border-radius:10px;padding:12px 16px;margin-bottom:8px;}
  .slot-occupied {background:#162447;border:1px solid #3b82f6;border-radius:8px;padding:6px;text-align:center;}
  .slot-empty {background:#0d1424;border:1px dashed #2d3a52;border-radius:8px;padding:6px;text-align:center;color:#64748b;}
  .log-line {font-family:monospace;font-size:0.82rem;padding:1px 0;}
  .log-danger{color:#f87171;} .log-warning{color:#fbbf24;} .log-info{color:#94a3b8;}
  .pm-box{background:#11192e;border-left:4px solid #3b82f6;border-radius:8px;padding:14px 18px;}
</style>
""", unsafe_allow_html=True)


def ss():
    return st.session_state


def init_session():
    s = ss()
    s.setdefault("screen", "menu")
    s.setdefault("train_game", None)
    s.setdefault("deploy_game", None)
    s.setdefault("deploy_profile", None)        # exported model from Train Mode
    s.setdefault("train_diff", ET.DEFAULT_DIFFICULTY)
    s.setdefault("deploy_diff", ET.DEFAULT_DIFFICULTY)
    s.setdefault("seed_lock", False)


# ─── shared widgets ─────────────────────────────────────────────────
def render_log(game, n=8):
    st.markdown("**Event log**")
    if not game.log:
        st.caption("No events yet.")
        return
    for e in game.log[-n:][::-1]:
        cls = {"danger": "log-danger", "warning": "log-warning"}.get(e["kind"], "log-info")
        st.markdown(f"<div class='log-line {cls}'>e{e['epoch']}: {e['msg']}</div>", unsafe_allow_html=True)


def accuracy_chart(history, cols, colors):
    df = pd.DataFrame(history).set_index("epoch")
    df = df[[c for c in cols if c in df.columns]]
    st.line_chart(df, height=240, color=colors)


# ═══════════════════════════════════════════════════════════════════
# MENU
# ═══════════════════════════════════════════════════════════════════
def screen_menu():
    st.title("🧠 ML Survivor")
    st.caption("Learn machine learning & MLOps by keeping models alive. Turn-based Streamlit edition.")

    c1, c2 = st.columns(2)
    with c1:
        st.markdown("### 🏋️ Train Mode")
        st.write("Survive 5 training waves. Balance overfit vs underfit under a compute budget. "
                 "Your final model exports to Deploy Mode.")
        ss().train_diff = st.selectbox("Difficulty", list(ET.DIFFICULTY.keys()),
                                       index=list(ET.DIFFICULTY.keys()).index(ss().train_diff),
                                       format_func=lambda k: ET.DIFFICULTY[k]["label"],
                                       key="train_diff_select")
        if st.button("Start Train Mode", type="primary", use_container_width=True):
            seed = 12345 if ss().seed_lock else None
            ss().train_game = TrainGame(ss().train_diff, seed=seed)
            ss().screen = "train"
            st.rerun()
    with c2:
        st.markdown("### 🚀 Deploy Mode")
        st.write("Serve production traffic for 5 waves. Fight drift, traffic spikes and latency to "
                 "hold a 70% SLA. Uses your trained model — or a preset.")
        if ss().deploy_profile:
            p = ss().deploy_profile
            st.success(f"Trained model ready: {round1(p['valAcc'])}% val · "
                       f"fragility {round1(p['fragility']*100)}%")
        if st.button("Go to Deploy Setup", use_container_width=True):
            ss().screen = "deploy_setup"
            st.rerun()

    st.divider()
    ss().seed_lock = st.checkbox("🔒 Deterministic mode (fixed seed — same hazards every run)",
                                 value=ss().seed_lock, key="seed_lock_chk",
                                 help="Improvement over the original: reproducible runs for teaching & comparison.")
    with st.expander("How to play"):
        st.markdown("""
**Each wave is 8 epochs.** Between epochs you set up *defenses* (Train) or *infra* (Deploy) from the shop,
then click **Run Epoch** to advance one step, or **Run Wave** to fast-forward to the next wave.

- **Train Mode** — keep *Validation Accuracy* above each wave's threshold. Too little regularization → overfit
  (val collapses); too much → underfit (model can't learn). Each wave maps to a real failure mode
  (noisy labels, class imbalance, outliers, exploding gradients).
- **Deploy Mode** — keep *Live Accuracy* ≥ 70% SLA. Models decay from drift even when nothing breaks;
  retrain to recover, but retrains cost money, take epochs, and can fail. *Ghost accuracy* shows what
  would happen with no retrains.
""")


# ═══════════════════════════════════════════════════════════════════
# TRAIN MODE
# ═══════════════════════════════════════════════════════════════════
def run_full_wave(game, kind="train"):
    start = game.state["waveIndex"]
    guard = 0
    step = game.step_epoch if kind == "train" else game.step_tick
    while (not game.state["gameOver"] and game.state["waveIndex"] == start and guard < ET.WAVE_EPOCHS + 1):
        step()
        guard += 1


def slot_grid(game, defs, place_fn, upgrade_fn, remove_fn):
    """Render the 5 build slots with select / upgrade / remove controls."""
    cols = st.columns(ET.SLOT_COUNT)
    for i, col in enumerate(cols):
        slot = game.state["slots"][i]
        with col:
            if slot:
                d = defs[slot["type"]]
                st.markdown(f"<div class='slot-occupied'>{d['icon']}<br><b>{d['name'].split(' ')[0]}</b>"
                            f"<br>Tier {slot['tier']+1}</div>", unsafe_allow_html=True)
                if slot["tier"] < 2:
                    cost = d["upgradeCosts"][slot["tier"]]
                    if st.button(f"↑ ${cost}", key=f"up{i}", use_container_width=True,
                                 disabled=game.state["budget"] < cost or game.state["gameOver"]):
                        upgrade_fn(i); st.rerun()
                if st.button("× remove", key=f"rm{i}", use_container_width=True,
                             disabled=game.state["gameOver"]):
                    remove_fn(i); st.rerun()
            else:
                selected = game.selected_slot == i
                label = f"🟦 Slot {i+1}" if selected else f"Slot {i+1}"
                st.markdown(f"<div class='slot-empty'>+ empty</div>", unsafe_allow_html=True)
                if st.button(label, key=f"sel{i}", use_container_width=True,
                             type="primary" if selected else "secondary",
                             disabled=game.state["gameOver"]):
                    game.selected_slot = None if selected else i
                    st.rerun()


def screen_train():
    game = ss().train_game
    s = game.state
    wave = game.current_wave()
    fx = game.defense_effects()

    top = st.columns([1, 1, 6])
    with top[0]:
        if st.button("← Menu", key="t_back"):
            ss().screen = "menu"; st.rerun()
    with top[2]:
        st.markdown(f"**Wave {s['waveIndex']+1}/5 — {wave['name']}**  ·  Difficulty: {ET.DIFFICULTY[game.difficulty]['label']}")

    # ── HUD ──
    m = st.columns(5)
    threshold = game.eff_threshold(wave)
    m[0].metric("Train Acc", f"{round1(s['trainAcc'])}%")
    m[1].metric("Val Acc", f"{round1(s['valAcc'])}%", help="Your health bar — keep above the wave threshold.")
    m[2].metric("Threshold", f"{threshold}%",
                delta=f"{round1(s['valAcc']+fx['valThresholdBonus']-threshold)}",
                delta_color="normal")
    m[3].metric("Budget", f"${int(s['budget'])}")
    m[4].metric("Epoch", f"{s['epoch']}  (e{s['epochInWave']+1}/8 this wave)")

    rc = st.columns(2)
    rc[0].progress(min(1.0, s["overfitRisk"]), text=f"Overfit risk {round1(s['overfitRisk']*100)}%")
    rc[1].progress(min(1.0, s["underfitRisk"]), text=f"Underfit risk {round1(s['underfitRisk']*100)}%")

    st.markdown(f"<div class='wave-card'>🎯 <b>{wave['name']}</b> — {wave['desc']}<br>"
                f"<span style='color:#94a3b8'>ML problem: {wave['mlProblem']}</span></div>",
                unsafe_allow_html=True)

    left, right = st.columns([3, 2])
    with left:
        accuracy_chart(s["history"], ["train", "val"], ["#22d3ee", "#a78bfa"])
    with right:
        render_log(game)

    # ── controls ──
    if not s["gameOver"]:
        ctrl = st.columns([1, 1, 3])
        if ctrl[0].button("▶ Run Epoch", type="primary", use_container_width=True):
            game.step_epoch(); st.rerun()
        if ctrl[1].button("⏩ Run Wave", use_container_width=True):
            run_full_wave(game, "train"); st.rerun()
        if game.selected_slot is not None:
            ctrl[2].info(f"Slot {game.selected_slot+1} selected — pick a defense from the shop below.")
        else:
            ctrl[2].caption("Tip: select an empty slot, then buy a defense. Act before the gap widens.")

    # ── build slots ──
    st.markdown("#### 🛠️ Build — pipeline slots")
    slot_grid(game, DEFENSES, game.place_defense, game.upgrade_defense, game.remove_defense)

    # ── shop ──
    st.markdown("#### 🛒 Shop — ML defenses")
    can_place = game.selected_slot is not None and not s["gameOver"]
    items = list(DEFENSES.values())
    for row_start in range(0, len(items), 2):
        cols = st.columns(2)
        for j, d in enumerate(items[row_start:row_start+2]):
            with cols[j]:
                with st.container(border=True):
                    st.markdown(f"{d['icon']} **{d['name']}** — ${d['placeCost']}")
                    st.caption(d["desc"])
                    afford = s["budget"] >= d["placeCost"]
                    if st.button(f"Place (${d['placeCost']})", key=f"buy_{d['id']}",
                                 disabled=not (can_place and afford), use_container_width=True):
                        game.place_defense(d["id"]); st.rerun()

    if s["gameOver"]:
        render_train_postmortem(game)


def render_train_postmortem(game):
    pm = game.postmortem()
    st.divider()
    st.subheader(pm["title"])
    st.markdown(f"<div class='pm-box'>{pm['cause'].replace(chr(10),'<br>')}</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='pm-box'>{pm['advice'].replace(chr(10),'<br>')}</div>", unsafe_allow_html=True)
    st.caption(pm["stats"])
    cols = st.columns(3)
    if cols[0].button("🔁 Retry Train Mode", type="primary", key="t_pm_retry"):
        seed = 12345 if ss().seed_lock else None
        ss().train_game = TrainGame(game.difficulty, seed=seed); st.rerun()
    if pm["canDeploy"]:
        if cols[1].button("🚀 Deploy this model", key="t_pm_deploy"):
            ss().deploy_profile = game.export_profile()
            ss().deploy_diff = game.difficulty
            ss().screen = "deploy_setup"; st.rerun()
    if cols[2].button("← Menu", key="t_pm_back"):
        ss().screen = "menu"; st.rerun()


# ═══════════════════════════════════════════════════════════════════
# DEPLOY SETUP
# ═══════════════════════════════════════════════════════════════════
def screen_deploy_setup():
    st.title("🚀 Deploy Setup")
    if st.button("← Menu", key="ds_back"):
        ss().screen = "menu"; st.rerun()

    ss().deploy_diff = st.selectbox(
        "Difficulty", list(ET.DIFFICULTY.keys()),
        index=list(ET.DIFFICULTY.keys()).index(ss().deploy_diff),
        format_func=lambda k: ET.DIFFICULTY[k]["label"], key="deploy_diff_select",
        help="Student eases drift, SLA, traffic and retrain risk so you can learn the loop.")

    prof = ss().deploy_profile
    if prof:
        st.success(f"**Imported from Train Mode** — {round1(prof['valAcc'])}% val · "
                   f"train {round1(prof['trainAcc'])}% · fragility "
                   f"**{round1(prof['fragility']*100)}%** (lower = decays slower)")
        if st.button("Deploy imported model", type="primary"):
            start_deploy(prof); st.rerun()
        st.caption("Or pick a preset instead:")
    else:
        st.info("No Train Mode model found. Pick a preset to deploy standalone.")

    cols = st.columns(3)
    for col, key in zip(cols, MODEL_PRESETS):
        preset = MODEL_PRESETS[key]
        p = preset_to_profile(key)
        with col:
            with st.container(border=True):
                st.markdown(f"**{preset['label']}**")
                st.caption(preset["desc"])
                st.write(f"{preset['valAcc']}% val · fragility {round1(p['fragility']*100)}%")
                if st.button(f"Deploy {preset['label']}", key=f"preset_{key}", use_container_width=True):
                    start_deploy({**p, "label": preset["label"]}); st.rerun()


def start_deploy(profile):
    seed = 999 if ss().seed_lock else None
    ss().deploy_game = DeployGame(profile, seed=seed, difficulty=ss().deploy_diff)
    ss().screen = "deploy"


# ═══════════════════════════════════════════════════════════════════
# DEPLOY MODE
# ═══════════════════════════════════════════════════════════════════
def screen_deploy():
    game = ss().deploy_game
    s = game.state
    wave = game.current_wave()
    fx = game.infra_effects()

    top = st.columns([1, 6])
    if top[0].button("← Menu", key="d_back"):
        ss().screen = "menu"; st.rerun()
    top[1].markdown(f"**Wave {s['waveIndex']+1}/5 — {wave['name']}**  ·  "
                    f"Model: {game.profile.get('label','Custom')} (fragility {round1(game.profile['fragility']*100)}%)")

    m = st.columns(5)
    m[0].metric("Live Acc", f"{round1(s['liveAccuracy'])}%", delta=f"{round1(s['liveAccuracy']-game.sla)} vs SLA")
    m[1].metric("Latency", f"{round1(s['latency'])} ms", help="Lose after 4 epochs above 480ms.")
    m[2].metric("RPS / Capacity", f"{s['currentRps']} / {fx['effectiveCapacity']}")
    m[3].metric("Budget", f"${int(s['budget'])}")
    m[4].metric("Epoch", f"{s['epoch']}  (e{s['epochInWave']+1}/8)")

    rc = st.columns(2)
    rc[0].progress(min(1.0, s["liveAccuracy"] / 100), text=f"SLA: {round1(s['liveAccuracy'])}% (need ≥{game.sla}%)")
    if fx["hasMonitoring"]:
        rc[1].progress(min(1.0, s["drift"]), text=f"Drift {round1(s['drift']*100)}%")
    else:
        rc[1].progress(0.0, text="Drift: 🔒 deploy Monitoring Node to reveal")

    st.markdown(f"<div class='wave-card'>📡 <b>{wave['name']}</b> — {wave['desc']}<br>"
                f"<span style='color:#94a3b8'>MLOps: {wave['mlConcept']}</span></div>",
                unsafe_allow_html=True)

    left, right = st.columns([3, 2])
    with left:
        accuracy_chart(s["history"], ["live", "ghost"], ["#34d399", "#94a3b8"])
        st.caption("Solid = live (with your retrains). Faint = ghost (no retrains ever).")
    with right:
        render_log(game)

    if not s["gameOver"]:
        ctrl = st.columns([1, 1, 1, 2])
        if ctrl[0].button("▶ Run Epoch", type="primary", use_container_width=True):
            game.step_tick(); st.rerun()
        if ctrl[1].button("⏩ Run Wave", use_container_width=True):
            run_full_wave(game, "deploy"); st.rerun()
        cost = INFRA["retraining"]["retrainCost"][fx["retrainTier"]] if fx["hasRetraining"] else None
        rt_label = (f"🔁 Retrain (${cost})" if fx["hasRetraining"] else "🔁 Retrain (needs Pipeline)")
        if ctrl[2].button(rt_label, use_container_width=True,
                          disabled=not fx["hasRetraining"] or s["retrainActive"]
                          or (cost is not None and s["budget"] < cost)):
            game.trigger_retrain(); st.rerun()
        if s["retrainActive"]:
            ctrl[3].info(f"Retraining… {s['retrainEpochsLeft']} epoch(s) left")
        elif s["canaryEpochsLeft"] > 0:
            ctrl[3].info(f"🐤 Canary rollout… {s['canaryEpochsLeft']} epoch(s) to full")
        elif game.selected_slot is not None:
            ctrl[3].info(f"Slot {game.selected_slot+1} selected — pick infra from the shop.")

    st.markdown("#### 🛠️ Build — infra slots")
    slot_grid(game, INFRA, game.place_infra, game.upgrade_infra, game.remove_infra)

    st.markdown("#### 🛒 Shop — deployment infra")
    can_place = game.selected_slot is not None and not s["gameOver"]
    items = list(INFRA.values())
    for row_start in range(0, len(items), 2):
        cols = st.columns(2)
        for j, d in enumerate(items[row_start:row_start+2]):
            with cols[j]:
                with st.container(border=True):
                    st.markdown(f"{d['icon']} **{d['name']}** — ${d['placeCost']}")
                    st.caption(d["desc"])
                    afford = s["budget"] >= d["placeCost"]
                    if st.button(f"Place (${d['placeCost']})", key=f"dbuy_{d['id']}",
                                 disabled=not (can_place and afford), use_container_width=True):
                        game.place_infra(d["id"]); st.rerun()

    if s["gameOver"]:
        render_deploy_postmortem(game)


def render_deploy_postmortem(game):
    pm = game.postmortem()
    st.divider()
    st.subheader(pm["title"])
    st.markdown(f"<div class='pm-box'>{pm['cause'].replace(chr(10),'<br>')}</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='pm-box'>{pm['advice'].replace(chr(10),'<br>')}</div>", unsafe_allow_html=True)
    st.caption(pm["stats"])
    cols = st.columns(3)
    if cols[0].button("🔁 Retry Deploy", type="primary", key="d_pm_retry"):
        start_deploy(game.profile); st.rerun()
    if cols[1].button("🏋️ Back to Train", key="d_pm_train"):
        ss().screen = "menu"; st.rerun()
    if cols[2].button("← Menu", key="d_pm_back"):
        ss().screen = "menu"; st.rerun()


# ═══════════════════════════════════════════════════════════════════
def main():
    init_session()
    screen = ss().screen
    if screen == "menu":
        screen_menu()
    elif screen == "train":
        screen_train()
    elif screen == "deploy_setup":
        screen_deploy_setup()
    elif screen == "deploy":
        screen_deploy()
    else:
        ss().screen = "menu"; st.rerun()


main()
