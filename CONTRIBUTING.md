# Contributing to ML Survivor

Thanks for your interest in improving ML Survivor! This project is a vanilla JS educational game — contributions should stay simple, readable, and free of build tooling unless there's a strong reason.

## How to contribute

1. **Fork** the repository on GitHub.
2. **Create a branch** from `main`:
   - `feat/short-description` — new features
   - `fix/short-description` — bug fixes
   - `docs/short-description` — documentation only
3. **Make your changes** locally. Open `index.html` in a browser to test — no install step required.
4. **Keep scope focused.** One feature or fix per pull request when possible.
5. **Open a Pull Request** with:
   - What changed and why
   - How you tested it (browser, mode, steps)
   - Screenshots or GIFs for UI changes (optional but appreciated)

## Code style

- **Vanilla JS, HTML, CSS** — match existing patterns in `js/game.js`, `js/deploy.js`, and `css/styles.css`.
- **Do not add a build step** unless discussed in an issue first.
- **Sandbox adapters** (`js/train-sandbox.js`, `js/deploy-sandbox.js`) should patch via wrappers — avoid duplicating core simulation logic in sandbox files when a thin adapter suffices.
- **Naming:** camelCase for JS, kebab-case for HTML/CSS files, UPPER_SNAKE for game constants.
- **Comments:** only for non-obvious tradeoff math or adapter behavior — the code should read clearly on its own.

## What we're looking for

- New wave/event types with real ML/MLOps teaching value
- Additional defenses or infra nodes with documented tradeoffs
- Accessibility improvements (keyboard nav, contrast, ARIA labels)
- Mobile layout polish
- Bug fixes with a clear repro case

## What to avoid

- Heavy frameworks or bundlers without prior discussion
- Breaking the "open `index.html` and play" zero-setup experience
- Flavor-only changes that don't affect visible numbers/mechanics

## Questions?

Open a GitHub Issue for bugs, ideas, or questions before large refactors.
