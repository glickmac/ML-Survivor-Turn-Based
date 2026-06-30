/**
 * Train Mode Sandbox — adapter layer (does not modify game.js)
 * Patches globals after game.js loads to disable game-over and expose controls.
 */
(function () {
  const cfg = {
    startingBudget: 100,
    waveIntensity: 1.0,
    driftSpeed: 1.0,
    freeDefenses: false,
    waveIndex: 0,
  };

  let waveOrig = null;
  const orig = {};
  let coreSimulateEpoch = null;

  function cacheWaveOrigins() {
    if (waveOrig) return;
    waveOrig = WAVES.map((w) => ({ ...w }));
  }

  function applyWaveScalars() {
    cacheWaveOrigins();
    const i = cfg.waveIntensity;
    WAVES.forEach((w, idx) => {
      const o = waveOrig[idx];
      w.trainRate = o.trainRate * i;
      w.valRate = o.valRate * i;
      w.noiseLevel = o.noiseLevel * i;
      w.imbalanceLevel = o.imbalanceLevel * i;
      w.outlierLevel = o.outlierLevel * i;
      w.gradientRisk = Math.min(1, o.gradientRisk * i);
    });
  }

  function setWaveIndex(index) {
    cfg.waveIndex = clamp(index, 0, WAVES.length - 1);
    if (typeof state === 'object' && state.epoch !== undefined) {
      state.waveIndex = cfg.waveIndex;
      state.epochInWave = 0;
    }
    applyWaveScalars();
    refreshRiskPreview();
    if (typeof updateUI === 'function') updateUI();
  }

  function refreshRiskPreview() {
    if (typeof getDefenseEffects !== 'function' || !state.slots) return;
    const fx = getDefenseEffects();
    const regStack = fx.regCount >= 2 ? 1.3 : 1;
    const targetUnderfit = clamp(
      (fx.underfitPenalty * regStack + fx.trainSlowdown * 2) * 1.2,
      0,
      1
    );
    state.underfitRisk = targetUnderfit;
    const gap = state.trainAcc - state.valAcc;
    const effectiveGap = Math.max(0, gap - fx.overfitReduction * 100);
    state.overfitRisk = clamp(effectiveGap / 35, 0, 1);
  }

  function withFreeCosts(fn) {
    if (!cfg.freeDefenses) return fn();
    const backups = {};
    Object.values(DEFENSES).forEach((def) => {
      backups[def.id] = {
        placeCost: def.placeCost,
        upgradeCosts: [...def.upgradeCosts],
        upkeep: [...def.upkeep],
      };
      def.placeCost = 0;
      def.upgradeCosts = [0, 0];
      def.upkeep = [0, 0, 0];
    });
    const result = fn();
    Object.values(DEFENSES).forEach((def) => {
      Object.assign(def, backups[def.id]);
      def.upgradeCosts = backups[def.id].upgradeCosts;
      def.upkeep = backups[def.id].upkeep;
    });
    return result;
  }

  function runSandboxEpoch() {
    if (!coreSimulateEpoch) return;
    applyWaveScalars();
    state.gameOver = false;
    coreSimulateEpoch(true);
    state.gameOver = false;
    state.underfitStreak = 0;
    document.getElementById('postmortem-overlay')?.classList.add('hidden');

    if (cfg.driftSpeed !== 1) {
      const gap = state.trainAcc - state.valAcc;
      const extra = (cfg.driftSpeed - 1) * gap * 0.04;
      state.valAcc = clamp(state.valAcc - extra, 0, 100);
      const fx = getDefenseEffects();
      const targetOverfit = clamp(Math.max(0, gap - fx.overfitReduction * 100) / 35, 0, 1);
      state.overfitRisk = clamp(state.overfitRisk + (targetOverfit - state.overfitRisk) * (cfg.driftSpeed - 1) * 0.3, 0, 1);
    }

    refreshRiskPreview();
    updateUI();
  }

  function patchGame() {
    coreSimulateEpoch = simulateEpoch;
    orig.endGame = endGame;
    orig.getCurrentWave = getCurrentWave;
    orig.placeDefense = placeDefense;
    orig.upgradeDefense = upgradeDefense;
    orig.removeDefense = removeDefense;
    orig.init = init;
    orig.updateUI = updateUI;
    orig.startGame = startGame;

    endGame = function sandboxEndGame(reason) {
      let msg = `[Sandbox] Would have ended: ${reason.replace(/_/g, ' ')}`;
      if (reason === 'wave_failed' && typeof diagnoseWaveFailure === 'function') {
        const dx = diagnoseWaveFailure(getCurrentWave(), getDefenseEffects());
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

    simulateEpoch = function sandboxSimulateEpoch() {
      if (!running) return;
      runSandboxEpoch();
    };

    placeDefense = function (type) {
      return withFreeCosts(() => {
        const ok = orig.placeDefense(type);
        if (ok) refreshRiskPreview();
        return ok;
      });
    };

    upgradeDefense = function (slotIndex) {
      return withFreeCosts(() => {
        const ok = orig.upgradeDefense(slotIndex);
        if (ok) refreshRiskPreview();
        return ok;
      });
    };

    removeDefense = function (slotIndex) {
      const ok = orig.removeDefense(slotIndex);
      if (ok) refreshRiskPreview();
      return ok;
    };

    updateUI = function () {
      orig.updateUI();
      const timer = document.getElementById('wave-timer');
      if (timer) {
        timer.textContent = running ? 'Sandbox — auto stepping' : 'Sandbox — step manually or enable auto';
      }
      const statusEl = document.getElementById('threshold-status');
      if (statusEl) {
        statusEl.textContent = 'Sandbox (no fail)';
        statusEl.className = 'threshold-status pass';
      }
      updateSandboxReadouts();
    };

    orig.renderDefenseCards = renderDefenseCards;
    renderDefenseCards = function () {
      orig.renderDefenseCards();
      if (cfg.freeDefenses && selectedSlot !== null) {
        document.querySelectorAll('#defense-cards .defense-card').forEach((c) => {
          c.classList.remove('disabled');
        });
      }
    };

    init = function sandboxInit() {
      try {
        initChart();
      } catch (err) {
        console.warn('[Train Sandbox] Chart init skipped:', err);
      }
      initState();
      state.budget = cfg.startingBudget;
      state.waveIndex = cfg.waveIndex;
      running = false;
      applyWaveScalars();
      renderSlots();
      renderDefenseCards();
      bindControls();
      refreshRiskPreview();
      updateUI();
      document.getElementById('start-overlay')?.classList.add('hidden');
      document.getElementById('postmortem-overlay')?.classList.add('hidden');
    };
  }

  function updateSandboxReadouts() {
    const fx = typeof getDefenseEffects === 'function' ? getDefenseEffects() : null;
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set('sb-train', `${round1(state.trainAcc)}%`);
    set('sb-val', `${round1(state.valAcc)}%`);
    set('sb-overfit', `${round1(state.overfitRisk * 100)}%`);
    set('sb-underfit', `${round1(state.underfitRisk * 100)}%`);
    set('sb-gap', `${round1(state.trainAcc - state.valAcc)}%`);
    if (fx) {
      set('sb-upkeep', `$${fx.upkeep}/epoch`);
      set('sb-reg-count', String(fx.regCount));
    }
  }

  function bindControls() {
    const stepBtn = document.getElementById('sb-step');
    const autoBtn = document.getElementById('sb-auto');
    const resetBtn = document.getElementById('sb-reset');
    if (stepBtn?.dataset.bound === '1') return;

    const budget = document.getElementById('sb-budget');
    const intensity = document.getElementById('sb-intensity');
    const drift = document.getElementById('sb-drift');
    const wave = document.getElementById('sb-wave');
    const free = document.getElementById('sb-free-defenses');

    budget?.addEventListener('input', () => {
      cfg.startingBudget = Number(budget.value);
      document.getElementById('sb-budget-val').textContent = `$${cfg.startingBudget}`;
      state.budget = cfg.startingBudget;
      updateUI();
    });

    intensity?.addEventListener('input', () => {
      cfg.waveIntensity = Number(intensity.value) / 100;
      document.getElementById('sb-intensity-val').textContent = `${intensity.value}%`;
      applyWaveScalars();
      updateUI();
    });

    drift?.addEventListener('input', () => {
      cfg.driftSpeed = Number(drift.value) / 100;
      document.getElementById('sb-drift-val').textContent = `${drift.value}%`;
    });

    wave?.addEventListener('change', () => setWaveIndex(Number(wave.value)));

    free?.addEventListener('change', () => {
      cfg.freeDefenses = free.checked;
      renderDefenseCards();
      updateUI();
    });

    const onStep = (e) => {
      e?.preventDefault?.();
      runSandboxEpoch();
    };

    stepBtn?.addEventListener('click', onStep);
    if (stepBtn) stepBtn.dataset.bound = '1';

    autoBtn?.addEventListener('click', () => {
      if (epochTimer) {
        clearInterval(epochTimer);
        epochTimer = null;
        running = false;
        autoBtn.textContent = 'Enable Auto Step (2s)';
        updateUI();
        return;
      }
      running = true;
      autoBtn.textContent = 'Stop Auto Step';
      epochTimer = setInterval(runSandboxEpoch, EPOCH_INTERVAL_MS);
      updateUI();
    });

    resetBtn?.addEventListener('click', () => {
      if (epochTimer) clearInterval(epochTimer);
      epochTimer = null;
      running = false;
      if (autoBtn) autoBtn.textContent = 'Enable Auto Step (2s)';
      initState();
      state.budget = cfg.startingBudget;
      state.waveIndex = cfg.waveIndex;
      selectedSlot = null;
      applyWaveScalars();
      refreshRiskPreview();
      updateUI();
    });
  }

  patchGame();

  window.trainSandboxStep = function trainSandboxStep() {
    runSandboxEpoch();
  };

  window.trainSandboxBoot = function trainSandboxBoot() {
    init();
  };
})();
