# USD Addition Implementation Plan

Status: implementation and verification completed; see `docs/usd-addition-final-audit-2026-11-01.md`. The user later stopped Superpowers use and explicitly authorized staging, committing, and pushing local `main` to `origin/main`. That later instruction supersedes this plan's original no-Git-operation boundary. This file is a retained planning record, not a request to resume the skill workflow.

> **For agentic workers:** Execute inline with test-driven development. UI/UX consultation was requested by the user; the main agent owns implementation and validation.

**Goal:** Add continuous USD addition with automatic JPY conversion of the live total.

**Architecture:** Keep the existing amount-entry reducer and wrap it with a pure addition state reducer. App composes derived total/expression, AmountDisplay renders them, and Keypad sends arithmetic actions. Rate services and storage stay unchanged.

**Tech Stack:** Existing React, TypeScript, Vite, Vitest, Testing Library; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-01-usd-addition-design.md`

## Constraints and review focus

- Work in the current checkout for the user-visible local preview. No commit, push, or deployment.
- Use integer cents for addition; total at most `999999999999.99`.
- Check repeated operators, decimal-entry reset, backspace after plus/result, and recovery after rejecting an overflow.
- Keep the keypad usable while rate retrieval is pending or unavailable.
- Verify mobile wrapping and tap targets after adding arithmetic controls.

## Task 1: Addition state and calculator UI

Files: create `src/domain/addition.ts`, `src/domain/addition.test.ts`; modify `src/App.tsx`, `src/App.test.tsx`, `src/components/AmountDisplay.tsx`, `src/components/Keypad.tsx`, `src/styles.css`.

Interfaces: `CalculatorAction = AmountAction | {type: 'add'} | {type: 'equals'}`; `initialCalculatorState`; `reduceCalculator(state, action)`; `getCalculatorDisplay(state)` returning `amount`, `expression`, and `error`.

- [x] Write pure tests with literal totals: `10+20+5=35`, `0.1+0.2=0.3`, pending/repeated operators, backspace, clear, post-result entry/continuation, and total overflow recovery. Write UI tests for live USD/JPY totals and keyboard behavior.
- [x] Run the new tests and confirm failure from missing arithmetic behavior.
- [x] Implement integer-cent state transitions and derive live display values without effects.
- [x] Connect App/AmountDisplay/Keypad; retain four rows and existing JPY/rate surfaces.
- [x] Run the relevant domain and App tests, then the suite (small shared calculator surface), lint, and production build.
- [x] Reload the existing local preview; verify real keypad addition and desktop/mobile rendering, and inspect browser console.
- [x] Have a fresh reviewer inspect the final change; fix material findings and report verification limits.
