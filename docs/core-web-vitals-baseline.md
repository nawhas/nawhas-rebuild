# Core Web Vitals Baseline — M5

**Date:** 2026-04-06
**Environment:** staging (`https://staging.nawhas.cititech.tech`)
**Method:** Lighthouse CLI — mobile simulation (`--throttling-method=simulate --emulated-form-factor=mobile`)
**Commit:** `3e8e15d` (post-PR #30 merge — Lighthouse CI gates + album hero priority)

---

## Results

### Homepage (`/`)

| Metric | Value | Target | Status |
|---|---|---|---|
| Performance Score | 81 | ≥ 80 | ✅ Pass |
| Accessibility Score | 100 | ≥ 95 | ✅ Pass |
| LCP (Largest Contentful Paint) | 2.9 s | < 2.5 s | ❌ Exceeds target |
| CLS (Cumulative Layout Shift) | 0 | < 0.1 | ✅ Pass |
| TBT (Total Blocking Time) | 580 ms | < 200 ms | ❌ Exceeds target |
| FCP (First Contentful Paint) | 0.9 s | < 1.8 s | ✅ Pass |
| TTI (Time to Interactive) | 4.5 s | < 3.8 s | ❌ Exceeds target |
| Speed Index | 0.9 s | < 3.4 s | ✅ Pass |

**LCP element:** Navigation link (`nav.relative > div.mx-auto > div.flex > a.rounded`) — text node, not an image.

### Reciters Page (`/reciters`)

| Metric | Value | Target | Status |
|---|---|---|---|
| Performance Score | 71 | ≥ 80 | ❌ **FAILS gate** |
| Accessibility Score | 100 | ≥ 95 | ✅ Pass |
| LCP (Largest Contentful Paint) | 4.6 s | < 2.5 s | ❌ Exceeds target |
| CLS (Cumulative Layout Shift) | 0 | < 0.1 | ✅ Pass |
| TBT (Total Blocking Time) | 500 ms | < 200 ms | ❌ Exceeds target |
| FCP (First Contentful Paint) | 1.0 s | < 1.8 s | ✅ Pass |
| TTI (Time to Interactive) | 4.6 s | < 3.8 s | ❌ Exceeds target |
| Speed Index | 1.0 s | < 3.4 s | ✅ Pass |

**LCP element:** `<h1>` heading — text node. No above-the-fold images on this page.

---

## Violations Summary

| Issue | Pages Affected | Severity |
|---|---|---|
| Performance score < 80 | `/reciters` (score: 71) | 🔴 High — fails Lighthouse CI gate |
| LCP > 2.5 s | Both pages (2.9 s, 4.6 s) | 🟠 Medium — Core Web Vitals target missed |
| TBT > 200 ms | Both pages (~500–580 ms) | 🟠 Medium — indicates JS blocking main thread |
| TTI > 3.8 s | Both pages (4.5 s, 4.6 s) | 🟡 Low — affects interactivity on slow connections |

---

## Root Cause Analysis

### LCP — Text-driven, not image-driven
Both pages have no above-the-fold images causing LCP — LCP is triggered by text nodes (nav link on `/`, h1 on `/reciters`). High LCP is caused by JS execution delaying rendering.

### TBT / TTI — Heavy JS on main thread
Main thread work breakdown (homepage):
- **Script Evaluation: 897 ms** — primary driver of TBT/TTI
- Other: 211 ms
- Script Parsing & Compilation: 115 ms
- Style & Layout: 113 ms

**Unused JS:** ~73 kB wasted in `8885-141a411732c053cc.js` chunk. This is the largest addressable opportunity.

### Reciters page failing score gate
The reciters page at 71 will cause Lighthouse CI to fail if that URL is added to `.lighthouserc.json`. The current CI config only tests `http://localhost:3000` (the root), so this is not currently caught in CI.

---

## Follow-up Actions

| Priority | Action |
|---|---|
| 🔴 High | Investigate `/reciters` performance regression (score 71 vs 81 on home) |
| 🟠 Medium | Reduce LCP on both pages — investigate what delays first render of main content |
| 🟠 Medium | Address 73 kB unused JS in chunk `8885-*` — code-split or tree-shake |
| 🟡 Low | Add `/reciters` to Lighthouse CI URL list to prevent regression |

---

## Notes

- **CLS is 0 on both pages** — skeleton dimension audit from PR #30 confirmed correct. No layout shift issues.
- **FCP is excellent (< 1 s)** — the server is fast and initial HTML is well-optimised.
- **No audio player performance tested** — audio streaming performance is a separate measurement outside this baseline scope.
- Lighthouse CI gate (`performance: error minScore 0.8`) currently only tests the root URL, so the reciters regression is not caught by CI.
