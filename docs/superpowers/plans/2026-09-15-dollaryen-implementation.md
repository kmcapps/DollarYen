# DollarYen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved mobile-first USD-to-JPY calculator PWA and stop with every file ready to commit but uncommitted.

**Architecture:** React composes focused display, keypad, rate-status, and update-prompt components. Pure amount and money modules are independent from a validated Frankfurter client, versioned local cache, and one exchange-rate hook. Workbox-generated Service Worker precaches only the app shell; localStorage remains the sole rate cache.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, ESLint, vite-plugin-pwa, Workbox.

**Spec:** `docs/superpowers/specs/2026-09-15-dollaryen-design.md`

## Global Constraints

- Frankfurter endpoint is exactly `https://api.frankfurter.dev/v2/rate/USD/JPY`; the rate is a daily reference rate, not a trading price.
- Amount state is a string with 12 integer digits and 2 fractional digits maximum.
- Cached rates are usable only for `0 <= Date.now() - fetchedAt <= 7 * 24 hours`.
- Vite `base`, manifest `start_url`, and manifest `scope` are `"./"`.
- The accepted visual references are the four files under `design/concepts/`.
- Do not commit, push, create a GitHub repository, deploy, release, or publish.
- Use TDD for behavior: add a focused failing test, verify the expected failure, implement the minimum behavior, and verify green before refactoring.
- Temporary browser scripts, screenshots, traces, and reports stay outside the repository and are removed after use.
- The newer user instruction authorizes local `git init` and overrides only the design spec's earlier no-`git init` boundary. Commit, stage, push, deploy, release, and publication remain prohibited.
- Because no initial commit exists and commits are prohibited, SDD uses task-owned before/after snapshots and no-index review packages rather than worktrees or commit ranges.

---

### Task 1: Project foundation and test harness

**Files:**
- Create: `.gitignore`, `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `src/vite-env.d.ts`, `src/main.tsx`, `src/App.test.tsx`, `src/App.tsx`, `tests/setup.ts`

**Interfaces:**
- Produces a working React/Vitest/Testing Library/ESLint/Vite harness and a minimal `DollarYen` shell.

- [ ] Initialize Git locally and create `.gitignore` with `.superpowers/`, `node_modules/`, `dist/`, coverage, logs, and editor/OS noise.
- [ ] Create package/config files with scripts `dev`, `build`, `preview`, `test`, `test:run`, `typecheck`, and `lint`; install and lock React, Vite, Vitest, Testing Library, ESLint, TypeScript, and vite-plugin-pwa.
- [ ] Write a render test that expects the `DollarYen` heading; run it and verify failure because App does not exist.
- [ ] Add the minimal App/main entry and verify the render test passes.
- [ ] Run typecheck, lint, test, and production build.

### Task 2: Amount input and conversion domain

**Files:**
- Create: `src/domain/amountInput.test.ts`, `src/domain/amountInput.ts`, `src/domain/money.test.ts`, `src/domain/money.ts`

**Interfaces:**
- Produces `reduceAmount(current, action): AmountTransition`, `formatUsdInput`, `convertUsdToRoundedJpy`, `formatJpyInteger`, and `formatRate` using the exact types in the design spec and Sol review.

- [ ] Write literal table cases for zero normalization, leading/repeated decimal, 12/2 digit limits, rejected actions, backspace boundaries, and clear; verify red.
- [ ] Implement the string reducer minimally and verify green.
- [ ] Write literal money cases for trailing decimal grouping, `100 * 154.31 = 15431`, rounding, JPY digits without a currency glyph, and rate formatting; verify red.
- [ ] Implement money formatting/conversion and run domain plus full regression, typecheck, and lint.

### Task 3: Frankfurter service and versioned cache

**Files:**
- Create: `src/rates/types.ts`, `src/rates/rateService.test.ts`, `src/rates/rateService.ts`, `src/rates/rateCache.test.ts`, `src/rates/rateCache.ts`

**Interfaces:**
- Produces `parseRateResponse`, `fetchUsdJpyRate`, `readFreshRate`, `writeRate`, and `RATE_CACHE_KEY` around `RateObservation` and version-1 `StoredRate`.

- [ ] Write service tests for valid response, wrong pair, non-positive/non-finite rate, invalid/impossible date, HTTP failure, malformed JSON, timeout, and abort; verify red.
- [ ] Implement the exact Frankfurter endpoint, internal AbortController, eight-second default, schema validation, and safe normalized observation; verify green.
- [ ] Write cache tests for exact seven-day boundary, expiration, future/invalid timestamps, unknown version/source, corrupt JSON, invalid rate, and storage exceptions; verify red.
- [ ] Implement defensive reads and boolean writes, then run rate/domain/full regression, typecheck, and lint.

### Task 4: Exchange-rate state hook

**Files:**
- Create: `src/hooks/useExchangeRate.test.tsx`, `src/hooks/useExchangeRate.ts`

**Interfaces:**
- Produces `useExchangeRate(deps?): ExchangeRateController` with discriminated `loading`, `online`, `cached`, and `unavailable` states.

- [ ] Write hook tests for cache-present/absent loading, online success, cached/unavailable failure, refresh preservation, duplicate refresh suppression, late result, unmount, and storage failure; verify red.
- [ ] Implement the controller with safe dependency injection, one initial refresh, duplicate suppression, request sequence protection, and cleanup; verify green.
- [ ] Run hook, rate, domain, and full regression plus typecheck and lint.

### Task 5: Accessible calculator UI and responsive fidelity

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/AmountDisplay.tsx`, `src/components/Keypad.tsx`, `src/components/RateStatus.tsx`, `src/styles.css`
- Modify/Create tests: `src/App.test.tsx` and focused component tests if isolation materially helps.

**Interfaces:**
- Consumes Task 2 domain and Task 4 controller; produces the complete concept-faithful screen and stable accessible names `1文字削除`, `為替レートを更新`, `小数点`, and `クリア`.

- [ ] Write interaction tests for every keypad action, synchronous conversion, unchanged rejected input, repeatable live announcement, non-editable outputs, and no textbox; verify red.
- [ ] Write state/copy tests for loading with/without cache, online, cached, unavailable, refresh-disabled, and keypad availability during refresh; verify red.
- [ ] Implement focused components and App with derived state calculated during render.
- [ ] Implement mobile-first CSS matching the accepted palette, white surfaces, four-column/full-width-zero geometry, 56px targets, safe areas, 520px desktop max-width, focus visibility, reduced motion, and semantic colors.
- [ ] Run UI plus full regression, typecheck, lint, and build.

### Task 6: PWA manifest, icons, update prompt, and offline shell

**Files:**
- Modify: `vite.config.ts`, `src/main.tsx`, `src/App.tsx`
- Create: `src/pwa.test.tsx`, `src/pwa.tsx`, `src/components/PwaUpdatePrompt.tsx`, `public/icons/pwa-192x192.png`, `public/icons/pwa-512x512.png`, `public/icons/pwa-maskable-512x512.png`, `public/favicon.png`

**Interfaces:**
- Produces a testable `PwaUpdatePrompt` props surface and PWA registration bridge. Manifest includes all exact spec fields and no API runtime cache.

- [ ] Derive deterministic PNG sizes from the approved icon and verify dimensions and maskable safe-zone placement.
- [ ] Write failing prompt/registration tests for visible copy, dismiss, and user-triggered update; verify red.
- [ ] Configure relative base, `generateSW`, manifest, app-shell precache, and prompt registration; implement the bridge and verify green.
- [ ] Build and inspect manifest fields, icon declarations/files, Service Worker output, manifest link, and relative asset paths.
- [ ] Serve the production build and verify HTTP 200 assets, activated-and-controlling Service Worker after reload, and offline shell reload.

### Task 7: In-App Browser QA, regression, and Sol final audit

**Files:**
- Modify only files implicated by reproducible findings; retain no temporary QA artifacts.

**Interfaces:**
- Consumes the complete app and concepts; produces current browser evidence and an uncommitted, commit-ready project.

- [ ] Start production preview and test the flow app load -> rate state -> keypad actions -> synchronized output.
- [ ] Verify URL, title, meaningful DOM, no framework overlay, console health, and screenshots in IAB.
- [ ] At 390 x 844 exercise `123.45`, repeated decimal, backspace, clear, limits, focus/keyboard activation, refresh suppression, and announcements.
- [ ] Exercise real online fetch, cache-present/absent loading, cached, unavailable, expired, offline reload, retry, and Service Worker update/cache behavior.
- [ ] At 1440 x 900 verify centered responsive layout, hierarchy, target sizing, wrapping, clipping, and overflow.
- [ ] Compare mobile/desktop/state renders and accepted concepts with `view_image`; keep a temporary ledger for copy, layout, typography, palette, container model, spacing, controls, semantic states, and responsiveness.
- [ ] Reproduce behavioral defects with a failing test before fixing; use screenshots for pure CSS defects; rerun affected checks.
- [ ] Run fresh full test, typecheck, lint, build, PWA checks, Git status, temporary-artifact scan, and Sol whole-project review.
- [ ] Stop without commit, stage, push, GitHub action, deployment, release, or publication.
