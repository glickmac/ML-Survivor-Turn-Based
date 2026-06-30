/**
 * ML Survivor — slide-based mode tutorials
 * Phases: watch (top of screen) → build (pipeline) → reference (shop cards)
 */
const TUTORIAL_STORAGE_PREFIX = 'ml-survivor-tutorial-seen-';

const TUTORIAL_PHASE_LABELS = {
  watch: 'Step 1 — Watch (top of screen)',
  build: 'Step 2 — Build (middle)',
  reference: 'Step 3 — Pick cards (bottom shop)',
};

const TUTORIAL_CONTENT = {
  train: {
    title: 'Train Mode',
    subtitle: 'Watch stats first. Then add ML defenses.',
    cta: 'Start Training Run',
    slides: [
      {
        phase: 'watch',
        icon: '👀',
        name: 'Screen Layout',
        body: 'The page flows top → bottom:<br><br><strong>① Top</strong> — Val Acc, risk meters, wave info, chart<br><strong>② Middle</strong> — 5 pipeline slots<br><strong>③ Bottom</strong> — ML defense shop<br><br>Watch ① before picking cards in ③.',
      },
      {
        phase: 'watch',
        icon: '🎯',
        name: 'Your Goal',
        body: 'Keep <strong>Validation Accuracy</strong> above each wave threshold. Clear all 5 waves to win.',
      },
      {
        phase: 'watch',
        icon: '📊',
        name: 'HUD Stats (top)',
        body: '<strong>Val Acc</strong> (purple) — your health bar.<br><strong>Train Acc</strong> (cyan) — rises easily, not health.<br><strong>Budget ($)</strong> — pays defenses + upkeep.',
      },
      {
        phase: 'watch',
        icon: '⚠️',
        name: 'Risk Meters (top)',
        body: '<strong>Overfit</strong> — Train Acc outruns Val Acc; val drains.<br><strong>Underfit</strong> — too many regularizers; can\'t hit thresholds.',
      },
      {
        phase: 'watch',
        icon: '🌊',
        name: 'Wave Panel (top)',
        body: 'Shows wave type + <strong>Val Acc threshold</strong>. Read the hint — tells you which defense to pick later.',
      },
      {
        phase: 'watch',
        icon: '📈',
        name: 'Live Chart (top)',
        body: 'Cyan = Train, Purple = Val. Lines spreading apart = overfitting. Both stalling below threshold = underfitting.',
      },
      {
        phase: 'watch',
        icon: '🌊',
        name: 'Training Waves',
        body: '1 Clean · 2 Noisy Labels · 3 Imbalance · 4 Outliers · 5 Gradient Explosion. Threshold rises each wave.',
      },
      {
        phase: 'build',
        icon: '🔧',
        name: 'Pipeline (middle)',
        body: 'Click <strong>+ Slot</strong>, then scroll down to pick a defense. Only <strong>5 slots</strong>.<br><strong>↑</strong> upgrade · <strong>×</strong> remove (50% refund).',
      },
      {
        phase: 'build',
        icon: '💀',
        name: 'Game Over',
        body: 'Lose if Val Acc hits 0%, budget bankrupt, or underfit lockout. Postmortem explains what went wrong.',
      },
      {
        phase: 'reference',
        icon: '🎲',
        name: 'Regularization (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Dropout</strong> — strong overfit cut; stacks underfit</li><li><strong>L1/L2</strong> — cheaper; don\'t stack with Dropout</li></ul>',
      },
      {
        phase: 'reference',
        icon: '⚡',
        name: 'Stabilization (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Batch Norm</strong> — stabilizes; gradient shield</li><li><strong>Gradient Clipping</strong> — Wave 5</li><li><strong>LR Scheduler</strong> — slows when val stalls</li></ul>',
      },
      {
        phase: 'reference',
        icon: '🔄',
        name: 'Data & Validation (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Data Augmentation</strong> — noise &amp; imbalance</li><li><strong>Cross-Validation</strong> — reliable val metrics</li><li><strong>Early Stopping</strong> — one save per wave</li></ul>',
      },
      {
        phase: 'reference',
        icon: '⚖️',
        name: 'Wave Counters (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Class Weighting</strong> — Wave 3 imbalance</li><li><strong>Input Clipping</strong> — Wave 4 outliers</li></ul>Now scroll to ③ and build your loadout.',
      },
    ],
  },

  trainSandbox: {
    title: 'Train Sandbox',
    subtitle: 'Watch stats first. Then experiment with defenses.',
    cta: 'Enter Sandbox',
    slides: [
      {
        phase: 'watch',
        icon: '👀',
        name: 'Screen Layout',
        body: '<strong>Left</strong> — sandbox sliders &amp; readouts<br><strong>① Top right</strong> — stats, risks, chart<br><strong>② Middle</strong> — pipeline slots<br><strong>③ Bottom</strong> — ML defense shop',
      },
      {
        phase: 'watch',
        icon: '🧪',
        name: 'Sandbox Controls',
        body: 'Adjust <strong>budget</strong>, <strong>wave intensity</strong>, <strong>drift speed</strong>. Pick any wave. Toggle <strong>free defenses</strong> to ignore costs.',
      },
      {
        phase: 'watch',
        icon: '📋',
        name: 'Live Readouts',
        body: 'Left panel tracks Train/Val Acc, gap, Overfit/Underfit Risk, upkeep. Stack 3 regularizers and watch Underfit Risk spike.',
      },
      {
        phase: 'watch',
        icon: '⏭️',
        name: 'Stepping Time',
        body: '<strong>Step 1 Epoch</strong> or <strong>Auto Step</strong>. Stats update live when you place defenses — watch ① while stepping.',
      },
      {
        phase: 'build',
        icon: '🔧',
        name: 'Pipeline (middle)',
        body: 'Click slot → pick defense in ③ below. <strong>↑</strong> upgrade · <strong>×</strong> remove. Only 5 slots.',
      },
      {
        phase: 'reference',
        icon: '🎲',
        name: 'Regularization (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Dropout</strong> · <strong>L1/L2</strong></li></ul>',
      },
      {
        phase: 'reference',
        icon: '⚡',
        name: 'Stabilization (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Batch Norm</strong> · <strong>Grad Clip</strong> · <strong>LR Scheduler</strong></li></ul>',
      },
      {
        phase: 'reference',
        icon: '🔄',
        name: 'Data & Validation (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Data Aug</strong> · <strong>Cross-Val</strong> · <strong>Early Stopping</strong></li></ul>',
      },
      {
        phase: 'reference',
        icon: '⚖️',
        name: 'Wave Counters (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Class Weighting</strong> · <strong>Input Clipping</strong></li></ul>All 10 defenses — experiment freely.',
      },
    ],
  },

  deploy: {
    title: 'Deploy Mode',
    subtitle: 'Watch production stats first. Then add infra.',
    cta: 'Choose Model & Deploy',
    slides: [
      {
        phase: 'watch',
        icon: '👀',
        name: 'Screen Layout',
        body: 'Top → bottom:<br><br><strong>① Top</strong> — Live Acc, SLA, drift, latency, chart<br><strong>② Middle</strong> — 5 infra slots<br><strong>③ Bottom</strong> — infra shop + green retrain button<br><br>Watch ① before picking cards in ③.',
      },
      {
        phase: 'watch',
        icon: '🎯',
        name: 'Your Goal',
        body: 'Keep <strong>Live Accuracy</strong> above <strong>70% SLA</strong>. Fight drift and latency. Survive 5 waves without going bankrupt.',
      },
      {
        phase: 'watch',
        icon: '🧠',
        name: 'Model Profile (top)',
        body: 'Your model from Train Mode (or preset). <strong>Baseline val acc</strong> = starting Live Acc. <strong>Fragility</strong> makes drift decay faster.',
      },
      {
        phase: 'watch',
        icon: '📊',
        name: 'HUD Stats (top)',
        body: '<strong>Live Accuracy</strong> — health bar.<br><strong>Latency</strong> — spikes when RPS &gt; capacity.<br><strong>RPS</strong> — load. <strong>Budget ($)</strong> — upkeep vs revenue.',
      },
      {
        phase: 'watch',
        icon: '📡',
        name: 'SLA & Drift (top)',
        body: '<strong>SLA</strong> — stay above 70%.<br><strong>Drift Meter</strong> — curves separating = data diverging.<br>Blind without <strong>Monitoring Node</strong> (add later in ③).',
      },
      {
        phase: 'watch',
        icon: '🌊',
        name: 'Production Waves (top)',
        body: '1 Normal · 2 Spike · 3 Concept Drift · 4 Data Drift · 5 Adversarial. Each hits a different stat.',
      },
      {
        phase: 'watch',
        icon: '📈',
        name: 'Dual Chart (top)',
        body: 'Solid green = Live Acc (with retrains). Dashed gray = <strong>Ghost</strong> if you never retrained.',
      },
      {
        phase: 'build',
        icon: '🔧',
        name: 'Pipeline (middle)',
        body: 'Click <strong>+ Slot</strong>, scroll down to pick infra. Only <strong>5 of 8</strong> tools fit.<br><strong>↑</strong> upgrade · <strong>×</strong> remove (50% refund).',
      },
      {
        phase: 'build',
        icon: '🔁',
        name: 'Trigger Retrain (green button)',
        body: 'Green button at bottom of ③. Needs <strong>Retraining Pipeline</strong> placed first. Costs $, restores accuracy, resets drift. Pair with <strong>Canary</strong>.',
      },
      {
        phase: 'build',
        icon: '💀',
        name: 'Game Over',
        body: 'SLA breach, latency timeout, or bankruptcy. Postmortem explains the MLOps lesson.',
      },
      {
        phase: 'reference',
        icon: '⚖️',
        name: 'Core Infra (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Load Balancer</strong> — cuts latency spikes</li><li><strong>Model Replica</strong> — RPS capacity</li><li><strong>Monitoring</strong> — reveals drift meter</li></ul>',
      },
      {
        phase: 'reference',
        icon: '☁️',
        name: 'Scaling Infra (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Serverless</strong> — burst scale; cold starts</li><li><strong>Prediction Cache</strong> — saves $; hides drift</li></ul>',
      },
      {
        phase: 'reference',
        icon: '🛡️',
        name: 'Safety Infra (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Retraining Pipeline</strong> — enables green button</li><li><strong>Canary</strong> — safe retrains</li><li><strong>Rate Limit</strong> — Wave 5 abuse</li></ul>Now scroll to ③ and build your stack.',
      },
    ],
  },

  deploySandbox: {
    title: 'Deploy Sandbox',
    subtitle: 'Watch stats first. Then experiment with infra.',
    cta: 'Enter Sandbox',
    slides: [
      {
        phase: 'watch',
        icon: '👀',
        name: 'Screen Layout',
        body: '<strong>Left</strong> — sliders &amp; readouts<br><strong>① Top right</strong> — Live Acc, SLA, drift, chart<br><strong>② Middle</strong> — pipeline<br><strong>③ Bottom</strong> — infra shop + retrain button',
      },
      {
        phase: 'watch',
        icon: '🧪',
        name: 'Sandbox Controls',
        body: 'Budget, traffic intensity, drift speed, wave, model profile. Toggle free infra or peek drift without Monitoring.',
      },
      {
        phase: 'watch',
        icon: '📋',
        name: 'Live Readouts',
        body: 'Live vs Ghost accuracy, drift %, latency, RPS, fragility. Compare Overfit vs Well-Trained profiles.',
      },
      {
        phase: 'watch',
        icon: '⏭️',
        name: 'Stepping Time',
        body: '<strong>Step 1 Epoch</strong> or auto-step. Watch ① while you step — then adjust infra in ③.',
      },
      {
        phase: 'build',
        icon: '🔧',
        name: 'Pipeline (middle)',
        body: 'Click slot → pick infra in ③. Only 5 slots. <strong>↑</strong> upgrade · <strong>×</strong> remove.',
      },
      {
        phase: 'build',
        icon: '🔁',
        name: 'Trigger Retrain (green button)',
        body: 'Place <strong>Retraining Pipeline</strong> first, then click green button. Watch canary rollout on serving status.',
      },
      {
        phase: 'reference',
        icon: '⚖️',
        name: 'All 8 Infra Cards (shop)',
        body: '<ul class="tutorial-bullets"><li><strong>Load Balancer</strong> · <strong>Model Replica</strong> · <strong>Monitoring</strong></li><li><strong>Retraining Pipeline</strong> · <strong>Serverless</strong> · <strong>Cache</strong></li><li><strong>Canary</strong> · <strong>Rate Limit Gateway</strong></li></ul>Experiment with combos.',
      },
    ],
  },
};

function showTutorial(mode, onComplete, force = false) {
  const config = TUTORIAL_CONTENT[mode];
  if (!config) {
    onComplete?.();
    return;
  }

  const storageKey = TUTORIAL_STORAGE_PREFIX + mode;
  if (!force && localStorage.getItem(storageKey) === '1') {
    onComplete?.();
    return;
  }

  let overlay = document.getElementById('tutorial-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.className = 'overlay tutorial-overlay';
    overlay.innerHTML = `
      <div class="overlay-content tutorial-content">
        <div class="tutorial-header">
          <h2 id="tutorial-title"></h2>
          <p class="tutorial-subtitle" id="tutorial-subtitle"></p>
          <div class="tutorial-progress">
            <span class="tutorial-slide-indicator" id="tutorial-slide-indicator"></span>
            <div class="tutorial-dots" id="tutorial-dots"></div>
          </div>
        </div>
        <span class="tutorial-phase-badge" id="tutorial-phase"></span>
        <article class="tutorial-slide" id="tutorial-slide">
          <div class="tutorial-slide-head">
            <span class="tutorial-slide-icon" id="tutorial-slide-icon"></span>
            <h3 id="tutorial-slide-title"></h3>
          </div>
          <div class="tutorial-slide-body" id="tutorial-slide-body"></div>
        </article>
        <label class="tutorial-skip-label">
          <input type="checkbox" id="tutorial-dont-show"> Don't show again
        </label>
        <div class="tutorial-actions">
          <button type="button" class="btn-secondary tutorial-nav-btn" id="tutorial-prev">← Back</button>
          <button type="button" class="btn-secondary" id="tutorial-close-btn">Skip</button>
          <button type="button" class="btn-primary tutorial-nav-btn" id="tutorial-next">Next →</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  document.getElementById('tutorial-title').textContent = config.title;
  document.getElementById('tutorial-subtitle').textContent = config.subtitle;

  const slides = config.slides;
  let index = 0;

  const dotsEl = document.getElementById('tutorial-dots');
  dotsEl.innerHTML = slides
    .map(
      (s, i) =>
        `<button type="button" class="tutorial-dot phase-${s.phase || 'watch'}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`
    )
    .join('');

  function renderSlide() {
    const slide = slides[index];
    const phaseEl = document.getElementById('tutorial-phase');
    const phase = slide.phase || 'watch';

    phaseEl.textContent = TUTORIAL_PHASE_LABELS[phase] || '';
    phaseEl.className = `tutorial-phase-badge phase-${phase}`;

    document.getElementById('tutorial-slide-icon').textContent = slide.icon;
    document.getElementById('tutorial-slide-title').textContent = slide.name;
    document.getElementById('tutorial-slide-body').innerHTML = slide.body;
    document.getElementById('tutorial-slide-indicator').textContent = `${index + 1} / ${slides.length}`;

    document.getElementById('tutorial-prev').disabled = index === 0;
    document.getElementById('tutorial-next').textContent =
      index === slides.length - 1 ? config.cta : 'Next →';

    dotsEl.querySelectorAll('.tutorial-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function dismiss() {
    const dontShow = document.getElementById('tutorial-dont-show')?.checked;
    if (dontShow) localStorage.setItem(storageKey, '1');
    overlay.classList.add('hidden');
    onComplete?.();
  }

  function goNext() {
    if (index < slides.length - 1) {
      index += 1;
      renderSlide();
    } else {
      dismiss();
    }
  }

  function goPrev() {
    if (index > 0) {
      index -= 1;
      renderSlide();
    }
  }

  index = 0;
  document.getElementById('tutorial-dont-show').checked = false;
  renderSlide();
  overlay.classList.remove('hidden');

  document.getElementById('tutorial-next').onclick = goNext;
  document.getElementById('tutorial-prev').onclick = goPrev;
  document.getElementById('tutorial-close-btn').onclick = dismiss;

  dotsEl.querySelectorAll('.tutorial-dot').forEach((dot) => {
    dot.onclick = () => {
      index = Number(dot.dataset.index);
      renderSlide();
    };
  });
}

function reopenTutorial(mode) {
  showTutorial(mode, () => {}, true);
}

function addTutorialHelpLink(mode) {
  const nav = document.querySelector('.mode-nav');
  if (!nav || nav.querySelector('.tutorial-help-link')) return;

  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'tutorial-help-link';
  link.textContent = '? How to Play';
  link.addEventListener('click', () => reopenTutorial(mode));
  nav.appendChild(link);
}
