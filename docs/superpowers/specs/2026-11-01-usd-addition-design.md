# USD addition

Later authorization: after completing the local review, the user explicitly requested staging review, commit, and push from local `main` to `origin/main`. That instruction supersedes the original no-commit/no-push boundary recorded below. Superpowers use remains stopped at the user's request.

The user delegated the UI/UX decision to the main agent after consultation with a UI/UX designer subagent. The selected approach shows a live USD total and its JPY equivalent, with a compact expression inside the USD surface. The alternative, a conventional calculator showing only the current operand, would make USD and JPY refer to different amounts during entry.

- Add only addition and equals. Keep the existing React/TypeScript architecture and rate/cache/JPY behavior.
- `10 + 20` immediately shows `$30` and converts 30 USD, before equals. The expression shows the accumulated subtotal and the current operand; this is not a full calculation-history feature.
- Plus commits the subtotal and waits for the next entry without changing the total. Repeated plus/equals do not duplicate amounts.
- Equals completes the calculation. A digit/decimal after equals starts fresh; plus continues from the result.
- Clear resets everything. Backspace edits the current operand; immediately after plus it cancels that pending plus and restores the subtotal for editing. After equals it edits the result.
- Keep four rows: `1 2 3 backspace / 4 5 6 C / 7 8 9 + / 0 (two columns) . =`. Use a pale blue plus and a strong blue equals.
- Support keyboard `+`, `=`, and Enter alongside existing shortcuts.
- Add in integer cents. Preserve the existing 12 integer / 2 fractional digit entry limit and cap the total at `999999999999.99`. Reject an overflowing digit with a visible status message and allow correction.
- Keep narrow screens readable, with wrapping for the compact expression. No new dependencies, commit, push, or deployment.
- User refinement: remove visible `USD`/`JPY` labels because `$`/`¥` already identify the currencies. Preserve accessible output names. Place the entire rate details/notice/refresh panel below the keypad with a clear gap; keep the compact online/cached summary in the header.
- Final layout refinement: put the refresh/retry button to the left of the rate text. Reserve one expression line in the USD surface even initially and after clear, without exposing empty expression text to screen readers.

Acceptance: repeated addition, cent precision, corrections, reset/continuation, overflow recovery, keyboard, cached/loading/unavailable rates, and desktop/mobile layout are covered by focused automated and rendered checks.
