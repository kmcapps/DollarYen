# DollarYen Design Specification

## Goal

DollarYen is a mobile-first, installable PWA for converting an amount from USD to JPY with an on-screen calculator keypad. It uses the latest daily reference rate published by Frankfurter and never presents a cached value as current.

## Technical approach

- React, TypeScript, and Vite for the application shell and stateful UI.
- Vitest and Testing Library for domain, service, and interaction tests.
- `vite-plugin-pwa` in `generateSW` mode for the manifest and application-shell precache.
- `GET https://api.frankfurter.dev/v2/rate/USD/JPY` as the only online rate source.
- Local storage as the single cache for rate data. The Service Worker does not cache API responses.
- Static-hosting-compatible output with no API key or server-side proxy.

Frankfurter provides keyless browser access, CORS support, and daily reference rates derived from central-bank and official sources. The UI states that the value is a daily reference rate rather than a tradable real-time market price.

## Visual specification

The accepted direction is a calm financial utility: cool gray background, true-white surfaces, deep navy text, a clear blue conversion result, and green, amber, or red only for meaningful rate status. The layout uses restrained shadows, modest radii, deliberate control typography, and generous spacing without gradients, glass effects, marketing content, charts, or decorative badges.

Concept references:

- `design/concepts/dollaryen-mobile.png` — primary online-state mobile direction.
- `design/concepts/dollaryen-desktop.png` — responsive online-state desktop direction.
- `design/concepts/dollaryen-states.png` — loading-with-cache, cached, unavailable, and PWA-update treatments.
- `design/concepts/dollaryen-icon.png` — `$` and `¥` PWA brand-mark direction.

The implementation will reproduce the concepts with code-native text and controls. Browser chrome and phone operating-system chrome shown in the mockups are not application UI. The generated source images are 853 x 1844 for mobile and 1586 x 992 for desktop; they are visual references, not literal device pixels. Browser verification uses 390 x 844 and 1440 x 900 CSS viewports and compares the rendered composition at equivalent scale.

The state sheet is authoritative for layout, wrapping, and semantic color, except that the PWA-update notice uses the normal blue informational accent rather than the red dot generated in the sheet. Red is reserved for an unavailable exchange rate. This recorded correction prevents a software update from being presented as an error.

### Responsive layout

- Mobile: a vertically ordered single-task screen using `100dvh`, safe-area padding, and safe scrolling on short viewports.
- Desktop and tablet: the same calculator surface centered at a maximum width of approximately 520 px. Keys do not stretch into a dashboard layout.
- Primary tap targets are at least 56 px with visible pressed, hover, and `focus-visible` states.

### Visible copy lock

The first viewport may contain only the following product copy, plus dynamic numbers, dates, times, error details, and accessibility announcements required by the specified states:

- `DollarYen`
- `USD`
- `JPY`
- `1 USD = ¥154.31` using the current rate
- `基準日 2026/09/15` using the API date
- `Frankfurter`
- `更新`
- `取得 14:32` using the device fetch time
- `オンライン取得済み`
- `保存済みレートを表示中・更新確認中`
- `保存済みレート・最新ではありません`
- `レートを取得できません`
- `通信状態を確認して再試行してください`
- `再試行`
- `※ このレートは日次の参考レートであり、取引価格ではありません。`
- `新しいバージョンがあります`
- `更新して再読み込み`
- `後で`

No currency selector is included because the product supports only USD to JPY.

## Components and data flow

- `App`: composition and connection of amount and rate state.
- `AmountDisplay`: formatted USD input and computed JPY result.
- `RateStatus`: current rate, source, rate date, fetch time, state message, and manual retry.
- `Keypad`: digits, decimal point, clear, and backspace with accessible names.
- `PwaUpdatePrompt`: user-controlled application update prompt shown whenever a waiting Service Worker is detected.
- `amountInput`: pure string-input reducer and limits.
- `money`: USD and JPY formatting and conversion.
- `rateService`: timeout, fetch, HTTP handling, JSON validation, and response mapping.
- `rateCache`: versioned local-storage persistence, validation, freshness calculation, and corruption handling.
- `useExchangeRate`: loading, online, cached, and unavailable state transitions.

At startup, the app reads and validates cached data, attempts an online fetch with an eight-second timeout, validates the response, stores it on success, and renders the resulting state. Keypad presses never trigger network requests. Manual refresh repeats only the rate fetch. The refresh control is disabled while a request is active, the keypad remains enabled, and a request sequence identifier prevents a late response from overwriting newer state. A failed refresh never deletes an existing valid cached rate.

## Amount input contract

- Canonical value is a string; initial and cleared value is `0`.
- Integer portion allows at most 12 digits and the fractional portion at most 2 digits.
- Maximum value is `999,999,999,999.99 USD`.
- A leading decimal becomes `0.`; repeated decimals are ignored.
- Leading zeroes are normalized without losing `0.`.
- Backspace returns to `0` when the remaining string is empty.
- Negative signs, exponent notation, paste, and free text entry are unavailable.
- Input exceeding a limit leaves the value unchanged and produces an accessible announcement.
- The USD display preserves a trailing decimal during entry while grouping the integer portion.
- JPY is rounded to the nearest yen. The number is grouped with `Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 })`; a code-native `¥` element is prefixed so the glyph matches the visual specification consistently.
- Every accepted keypad press updates both displays synchronously.

The keypad is a coherent four-column layout: three numeric columns plus an action column. Rows contain `1 2 3 backspace`, `4 5 6 C`, `7 8 9 decimal`, and a wide `0` spanning all four columns. There is no empty or disabled-looking tile.

Boundary examples are normative: `0` plus `0` remains `0`; `0` plus `5` becomes `5`; backspace changes `0.` to `0`, `0.0` to `0.`, and `0` to `0`. Repeated decimals and over-limit digits leave both USD and JPY unchanged.

## Rate states and failure behavior

Every API response must satisfy all of the following before use: `base === "USD"`, `quote === "JPY"`, a finite positive numeric `rate`, and a valid ISO date.

- `loading`: an online refresh is in progress. With a valid cache, conversion continues and the UI shows `保存済みレートを表示中・更新確認中` plus `保存済みレート・最新ではありません`. Without a valid cache, JPY is `—`. An expired cache is never displayed or used.
- `online`: the current request returned a validated value. Show `オンライン取得済み`, the API rate date, and the device fetch time.
- `cached`: the request failed and a validated saved value is no more than seven days old. Show `保存済みレート・最新ではありません` persistently and allow retry.
- `unavailable`: there is no valid saved value, it is corrupted, or it is older than seven days. Show `レートを取得できません`; render the JPY result as `—`; allow retry; never substitute an estimated or hard-coded rate.

After a failed fetch, state becomes `cached` only when a valid saved value exists; otherwise it becomes `unavailable`. The UI exposes only the fixed user-safe copy above and never displays raw exceptions, response bodies, or HTTP details.

The stored shape is `{ version: 1, rate, rateDate, fetchedAt, source: "Frankfurter" }`. `fetchedAt` is a UTC ISO timestamp. Freshness is `0 <= Date.now() - fetchedAt <= 7 * 24 hours`; future timestamps, invalid timestamps, unknown versions, and negative elapsed time are corrupt. `rateDate` must be a real calendar date in `YYYY-MM-DD` form. Freshness is based on `fetchedAt`, not `rateDate`; a weekend or holiday reference date remains valid when the API response was obtained successfully and is always displayed. HTTP failures, timeouts, malformed JSON, invalid schema, and storage exceptions are handled without crashing the calculator UI.

## PWA behavior

- Vite uses `base: "./"`. Manifest uses `DollarYen` for `name` and `short_name`, a stable `id`, `lang: "ja"`, `display: standalone`, `start_url: "./"`, and `scope: "./"`, with matching theme and background colors.
- Provide 192 px, 512 px, and maskable 512 px icons derived from the approved `$` and `¥` mark. The maskable version keeps the full mark inside the central safe zone.
- Precache the application shell, generated CSS and JS, and icons.
- Do not runtime-cache the exchange-rate API.
- An offline reload displays the calculator shell. Conversion is available only with a valid saved rate, which remains labelled as saved and not current.
- Application updates use a user-controlled prompt rather than a forced reload.

The manifest link and each icon must return HTTP 200. The manifest is checked for `name`, `short_name`, `id`, `start_url`, `scope`, `display`, `theme_color`, `background_color`, and `lang`. Icon dimensions, purpose, and maskable safe zone are verified. The Service Worker must be activated and, after reload, `navigator.serviceWorker.controller` must be present.

## Accessibility contract

- USD and JPY values are non-editable `output` or equivalent display elements and never open the software keyboard.
- JPY result and rate status use appropriately scoped `aria-live` regions without announcing every decorative change.
- Backspace has `aria-label="1文字削除"`; refresh has `aria-label="為替レートを更新"`.
- Decorative icons are `aria-hidden="true"`.
- Limit announcements can be repeated after successive rejected presses and do not rely on color.
- Loading and disabled states are communicated by text and ARIA state as well as appearance.

## Planned source structure

```text
index.html
package.json
vite.config.ts
tsconfig*.json
public/icons/
src/main.tsx
src/App.tsx
src/styles.css
src/domain/amountInput.ts
src/domain/money.ts
src/rates/types.ts
src/rates/rateService.ts
src/rates/rateCache.ts
src/hooks/useExchangeRate.ts
src/components/AmountDisplay.tsx
src/components/RateStatus.tsx
src/components/Keypad.tsx
src/components/PwaUpdatePrompt.tsx
tests/setup.ts
```

Tests are colocated with the modules they cover. `App.tsx` remains composition glue rather than containing domain and network logic.

## Verification and acceptance

- Unit tests cover initial zero, leading zeroes, leading and repeated decimals, fractional and integer limits, clear, backspace, conversion, rounding, and formatting.
- Service tests cover success, invalid rate, wrong currency pair, invalid date, timeout, HTTP failure, malformed JSON, valid cache, expired cache, and corrupt storage.
- Interaction tests cover keypad-only operation and synchronous USD/JPY updates.
- Type checking, linting, unit tests, and a production build pass.
- Production preview is checked in the In-App Browser at 390 x 844 and 1440 x 900, plus a subpath-equivalent URL for relative asset and Service Worker scope behavior.
- IAB checks include rate success, retry, cached fallback, unavailable and expired states, offline shell reload, overflow, tap sizing, focus visibility, title, manifest, icons, active and controlling Service Worker, and console errors. If the IAB cannot expose the native installation UI, actual installation is reported as unverified rather than passed.
- The accepted concept and final browser screenshot are inspected together with `view_image`. A fidelity ledger checks copy, layout, typography, palette, container model, spacing, controls, status treatment, and responsiveness.
- Any fixable mismatch or functional defect is corrected and the relevant checks are repeated.
- GPT-5.6 Sol performs the final requirements, UI, rate, failure, PWA, regression, and concept-fidelity audit.

## Model allocation

- GPT-5.6 Sol, medium/high: orchestration, contracts, reviews, integration decisions, and final audit.
- GPT-5.6 Luna, low: pure amount reducer, money functions, and focused unit tests.
- GPT-5.6 Terra, medium: rate service, cache and state transitions.
- GPT-5.6 Terra, medium: React integration, responsive and accessible UI, and PWA wiring.
- GPT-5.6 Luna, medium: mechanical regression expansion and build checks.
- GPT-5.6 Terra, medium: IAB functional, responsive, failure, and offline verification.

Independent domain and rate modules may be implemented in parallel. UI integration follows their contracts; PWA and IAB verification follow integration.

## Authorization boundary

The current directory is not a Git repository. The task does not authorize `git init`, commit, push, deploy, release, or publication. Work stops after the final audit with the implementation files uncommitted and the Git state reported as not under Git management.
