/**
 * Deploy Mode Sandbox — adapter layer (does not modify deploy.js)
 */
(function () {
  const cfg = {
    startingBudget: 120,
    trafficIntensity: 1.0,
    driftSpeed: 1.0,
    freeInfra: false,
    waveIndex: 0,
    modelPreset: 'wellTrained',
  };

  let waveOrig = null;
  let sandboxProfile = null;
  const orig = {};

  function cacheWaveOrigins() {
    if (waveOrig) return;
    waveOrig = WAVES.map((w) => ({ ...w }));
  }

  function applyWaveScalars() {
    cacheWaveOrigins();
    const t = cfg.trafficIntensity;
    const d = cfg.driftSpeed;
    WAVES.forEach((w, idx) => {
      const o = waveOrig[idx];
      w.baseRps = Math.round(o.baseRps * t);
      w.driftRate = o.driftRate * d;
      w.conceptDrift = o.conceptDrift * d;
      w.dataDriftBoost = o.dataDriftBoost * d;
    });
  }

  function loadProfile() {
    sandboxProfile = presetToProfile(cfg.modelPreset) || presetToProfile('wellTrained');
    sandboxProfile.label = MODEL_PRESETS[cfg.modelPreset]?.label || 'Sandbox';
  }

  function setWaveIndex(index) {
    cfg.waveIndex = clamp(index, 0, WAVES.length - 1);
    if (state && state.epoch !== undefined) {
      state.waveIndex = cfg.waveIndex;
      state.epochInWave = 0;
      state.currentRps = WAVES[cfg.waveIndex].baseRps;
    }
    applyWaveScalars();
    if (typeof updateUI === 'function') updateUI();
  }

  function withFreeCosts(fn) {
    if (!cfg.freeInfra) return fn();
    const backups = {};
    Object.values(INFRA).forEach((def) => {
      backups[def.id] = {
        placeCost: def.placeCost,
        upgradeCosts: [...def.upgradeCosts],
        upkeep: [...def.upkeep],
        retrainCost: def.retrainCost ? [...def.retrainCost] : null,
      };
      def.placeCost = 0;
      def.upgradeCosts = [0, 0];
      def.upkeep = [0, 0, 0];
      if (def.retrainCost) def.retrainCost = [0, 0, 0];
    });
    const result = fn();
    Object.values(INFRA).forEach((def) => {
      const b = backups[def.id];
      def.placeCost = b.placeCost;
      def.upgradeCosts = b.upgradeCosts;
      def.upkeep = b.upkeep;
      if (b.retrainCost) def.retrainCost = b.retrainCost;
    });
    return result;
  }

  function patchDeploy() {
    orig.endGame = endGame;
    orig.simulateTick = simulateTick;
    orig.getCurrentWave = getCurrentWave;
    orig.placeInfra = placeInfra;
    orig.upgradeInfra = upgradeInfra;
    orig.init = init;
    orig.updateUI = updateUI;
    orig.triggerRetrain = triggerRetrain;
    orig.updateDriftCanvas = updateDriftCanvas;

    endGame = function sandboxEndGame(reason) {
      let msg = `[Sandbox] Would have ended: ${reason.replace(/_/g, ' ')}`;
      if (reason === 'wave_sla_failed' && typeof diagnoseDeployWaveFailure === 'function') {
        const dx = diagnoseDeployWaveFailure(getCurrentWave(), getInfraEffects());
        msg = `[Sandbox] Wave would fail — ${dx.summary}. Fix: ${dx.fixes[0] || 'see postmortem advice'}`;
      }
      showToast(msg, 'warning');
      state.gameOver = false;
      running = false;
      document.getElementById('postmortem-overlay')?.classList.add('hidden');
    };

    getCurrentWave = function () {
      return WAVES[Math.min(state.waveIndex, WAVES.length - 1)];
    };

    simulateTick = function sandboxSimulateTick() {
      if (!running) return;
      applyWaveScalars();
      orig.simulateTick();
      state.gameOver = false;
      state.slaStreak = 0;
      state.latencyStreak = 0;
      document.getElementById('postmortem-overlay')?.classList.add('hidden');
      updateSandboxReadouts();
    };

    placeInfra = function (type) {
      return withFreeCosts(() => orig.placeInfra(type));
    };

    upgradeInfra = function (slotIndex) {
      return withFreeCosts(() => orig.upgradeInfra(slotIndex));
    };

    triggerRetrain = function () {
      return withFreeCosts(() => orig.triggerRetrain());
    };

    updateDriftCanvas = function (fx) {
      orig.updateDriftCanvas(fx);
      if (!fx.hasMonitoring && document.getElementById('sb-force-drift')?.checked) {
        const canvas = document.getElementById('drift-canvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const separation = state.drift * 55;
        ctx.beginPath();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        for (let x = 0; x < w; x++) {
          const t = (x - w * 0.35) / 22;
          const y = h - 8 - Math.exp(-t * t * 0.5) * (h - 16);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = '#f472b6';
        for (let x = 0; x < w; x++) {
          const t = (x - w * 0.35 - separation) / 22;
          const y = h - 8 - Math.exp(-t * t * 0.5) * (h - 16);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        document.getElementById('drift-blind-tag')?.classList.remove('hidden');
        document.getElementById('drift-hint').textContent =
          `Sandbox peek: drift ${round1(state.drift * 100)}% (monitoring off)`;
      }
    };

    updateUI = function () {
      orig.updateUI();
      const timer = document.getElementById('wave-timer');
      if (timer) {
        timer.textContent = running ? 'Sandbox — auto stepping' : 'Sandbox — step manually or enable auto';
      }
      const hint = document.getElementById('sla-hint');
      if (hint) hint.textContent = 'Sandbox (no SLA fail)';
      updateSandboxReadouts();
    };

    orig.renderInfraCards = renderInfraCards;
    renderInfraCards = function () {
      orig.renderInfraCards();
      if (cfg.freeInfra && selectedSlot !== null) {
        document.querySelectorAll('#infra-cards .defense-card').forEach((c) => {
          c.classList.remove('disabled');
        });
      }
    };

    init = function sandboxInit() {
      loadProfile();
      initChart();
      initState(sandboxProfile);
      profile = sandboxProfile;
      state.budget = cfg.startingBudget;
      state.waveIndex = cfg.waveIndex;
      state.currentRps = WAVES[cfg.waveIndex].baseRps;
      running = false;
      applyWaveScalars();

      document.getElementById('setup-overlay')?.classList.add('hidden');
      document.getElementById('postmortem-overlay')?.classList.add('hidden');

      renderSlots();
      renderInfraCards();
      updateUI();
      bindControls();

      document.getElementById('retrain-btn')?.addEventListener('click', triggerRetrain);
    };
  }

  function updateSandboxReadouts() {
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    if (!state.epoch) return;
    set('sb-live', `${round1(state.liveAccuracy)}%`);
    set('sb-ghost', `${round1(state.ghostAccuracy)}%`);
    set('sb-drift', `${round1(state.drift * 100)}%`);
    set('sb-latency', `${round1(state.latency)}ms`);
    set('sb-rps', String(state.currentRps));
    set('sb-fragility', `${round1((profile?.fragility || 0) * 100)}%`);
  }

  function bindControls() {
    const budget = document.getElementById('sb-budget');
    const traffic = document.getElementById('sb-traffic');
    const drift = document.getElementById('sb-drift');
    const wave = document.getElementById('sb-wave');
    const preset = document.getElementById('sb-preset');
    const free = document.getElementById('sb-free-infra');
    const forceDrift = document.getElementById('sb-force-drift');
    const stepBtn = document.getElementById('sb-step');
    const autoBtn = document.getElementById('sb-auto');
    const resetBtn = document.getElementById('sb-reset');

    budget?.addEventListener('input', () => {
      cfg.startingBudget = Number(budget.value);
      document.getElementById('sb-budget-val').textContent = `$${cfg.startingBudget}`;
      state.budget = cfg.startingBudget;
      updateUI();
    });

    traffic?.addEventListener('input', () => {
      cfg.trafficIntensity = Number(traffic.value) / 100;
      document.getElementById('sb-traffic-val').textContent = `${traffic.value}%`;
      applyWaveScalars();
      state.currentRps = getCurrentWave().baseRps;
      updateUI();
    });

    drift?.addEventListener('input', () => {
      cfg.driftSpeed = Number(drift.value) / 100;
      document.getElementById('sb-drift-val').textContent = `${drift.value}%`;
      applyWaveScalars();
    });

    wave?.addEventListener('change', () => setWaveIndex(Number(wave.value)));

    preset?.addEventListener('change', () => {
      cfg.modelPreset = preset.value;
      loadProfile();
      profile = sandboxProfile;
      state.baselineAccuracy = profile.valAcc;
      state.liveAccuracy = profile.valAcc;
      state.ghostAccuracy = profile.valAcc;
      updateUI();
    });

    free?.addEventListener('change', () => {
      cfg.freeInfra = free.checked;
      renderInfraCards();
      updateUI();
    });

    forceDrift?.addEventListener('change', () => updateUI());

    stepBtn?.addEventListener('click', () => {
      running = true;
      simulateTick();
      running = false;
    });

    autoBtn?.addEventListener('click', () => {
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
        running = false;
        autoBtn.textContent = 'Enable Auto Step (2s)';
        updateUI();
        return;
      }
      running = true;
      autoBtn.textContent = 'Stop Auto Step';
      tickTimer = setInterval(simulateTick, TICK_MS);
      updateUI();
    });

    resetBtn?.addEventListener('click', () => {
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = null;
      running = false;
      if (autoBtn) autoBtn.textContent = 'Enable Auto Step (2s)';
      loadProfile();
      initState(sandboxProfile);
      profile = sandboxProfile;
      state.budget = cfg.startingBudget;
      state.waveIndex = cfg.waveIndex;
      selectedSlot = null;
      applyWaveScalars();
      updateUI();
    });
  }

  patchDeploy();

  function bootSandbox() {
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSandbox);
  } else {
    bootSandbox();
  }
})();
