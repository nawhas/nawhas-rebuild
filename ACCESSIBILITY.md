# Accessibility Standards — Nawhas

This document outlines accessibility requirements and standards for the Nawhas platform. We are committed to WCAG 2.1 Level AA compliance — the minimum bar for all features.

## Standards & Compliance

- **WCAG 2.1 Level AA** — all features must meet this standard
- **No exceptions** — accessibility is not optional
- **Arabic RTL** — all content must render correctly in RTL mode
- **Mobile-first** — accessibility includes mobile and touch devices
- **Keyboard navigation** — 100% of interactive elements must be keyboard operable

## WCAG 2.1 AA Checklist

### 1. Perceivable

#### 1.1 Text Alternatives
- [ ] All images have meaningful alt text or are marked decorative (`alt=""`)
- [ ] Icons have `aria-label` or are inside labeled containers
- [ ] Videos have captions or transcripts (future: video phase)
- [ ] Decorative images use `alt=""` and `role="presentation"`
- [ ] Background images via CSS are purely decorative

#### 1.3 Adaptable
- [ ] Content structure uses semantic HTML (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`)
- [ ] Headings follow a logical hierarchy (`<h1>` → `<h2>` → `<h3>`; no skipped levels)
- [ ] Form inputs are associated with labels (`<label for="input-id">`)
- [ ] Error messages are programmatically associated with form fields
- [ ] Reading order is logical when CSS is disabled
- [ ] Lists use `<ul>`, `<ol>`, `<li>` — not divs styled as lists

#### 1.4 Distinguishable
- [ ] **Contrast ratio:** Normal text ≥ 4.5:1, large text ≥ 3:1
- [ ] **Large text definition:** 18pt+ (24px+) or 14pt+ (18.5px+) bold
- [ ] Text is not a solid image (no text-as-PNG)
- [ ] Color is not the only means of conveying information (use icons, text, patterns)
- [ ] Focus indicators are visible (contrast ≥ 3:1 against background)
- [ ] Resize text to 200% without losing content or functionality
- [ ] No flashing content (≥ 3 flashes per second)

### 2. Operable

#### 2.1 Keyboard Accessible
- [ ] All functionality is keyboard operable (tab, enter, escape, arrow keys)
- [ ] No keyboard trap — users can tab away from all elements
- [ ] Tab order follows logical visual order
- [ ] Focus indicator is always visible
- [ ] Keyboard shortcuts do not conflict with browser/OS shortcuts
- [ ] Audio player is fully keyboard controllable (play/pause, seek, volume)

#### 2.2 Enough Time
- [ ] No time limits on interactions (or user can extend/disable)
- [ ] Auto-scrolling/auto-playing content can be paused
- [ ] Session timeouts warn users before expiring

#### 2.4 Navigable
- [ ] Skip links present to bypass repetitive content
- [ ] Purpose of each link is clear from link text alone
- [ ] Page title describes content/purpose
- [ ] Focus is managed on page load and modal open/close
- [ ] Multiple ways to find content (search, navigation, sitemap)

### 3. Understandable

#### 3.1 Readable
- [ ] Language of page is declared (`<html lang="en">` or `<html lang="ar">`)
- [ ] Language changes are marked (`<span lang="ar">النواح</span>`)
- [ ] Text is clear and simple
- [ ] No jargon without explanation
- [ ] Abbreviations and acronyms are spelled out on first use

#### 3.2 Predictable
- [ ] Navigation is consistent across pages
- [ ] Components behave predictably
- [ ] Unexpected context changes don't occur (e.g., form submission doesn't navigate)
- [ ] Links open in same window (not new tabs without warning)

#### 3.3 Input Assistance
- [ ] Form errors are identified programmatically
- [ ] Error messages describe the problem and suggest correction
- [ ] Labels or instructions are provided for form inputs
- [ ] Required fields are marked
- [ ] Prevent major data loss (confirmation or undo on submit)

### 4. Robust

#### 4.1 Compatible
- [ ] Valid HTML (no duplicate IDs, proper nesting)
- [ ] ARIA attributes are used correctly
- [ ] Components work with assistive technologies (screen readers, voice control)
- [ ] No ARIA that conflicts with native HTML semantics

## Feature-Specific Requirements

### Audio Player
- [ ] Play/pause button is keyboard operable
- [ ] Seek bar is keyboard operable (arrow keys to move)
- [ ] Volume control is keyboard operable
- [ ] Current time and duration are announced by screen readers
- [ ] All controls have descriptive `aria-label` attributes
- [ ] Playback state is announced (playing, paused, buffering)
- [ ] Keyboard shortcuts are documented and don't conflict

### Forms & Authentication
- [ ] All inputs have associated `<label>` elements
- [ ] Error messages are associated with form fields via `aria-describedby`
- [ ] Password fields are not auto-filled with wrong autocomplete attribute
- [ ] Checkbox and radio groups use `<fieldset>` and `<legend>`
- [ ] Success messages are announced to screen readers

### Search & Text Input
- [ ] Search results count is announced
- [ ] Results are inserted into the DOM in a way screen readers announce them
- [ ] Autocomplete/suggestions are keyboard navigable
- [ ] Search filters are accessible
- [ ] No auto-complete that bypasses user intent

### Navigation
- [ ] Navigation menu is keyboard navigable
- [ ] Current page is marked (e.g., `aria-current="page"`)
- [ ] Dropdown menus open/close with keyboard
- [ ] Mobile menu has proper ARIA roles and is keyboard accessible

### Arabic RTL Content
- [ ] HTML lang attribute is set to `ar` for Arabic content
- [ ] `dir="rtl"` is set on the root or content containers
- [ ] Text direction is not forced with CSS hacks
- [ ] Bidirectional text is handled correctly (mixed Arabic/English)
- [ ] Icons and images are not mirrored (unless semantically necessary)
- [ ] Keyboard navigation flows RTL (right to left)

## Testing Procedures

### Automated Testing
```bash
# Axe accessibility audit
npm run test:a11y

# Lighthouse CI (includes accessibility score)
npm run perf:lighthouse

# Keyboard navigation (interactive elements)
npm run test:keyboard
```

### Manual Testing

1. **Keyboard Navigation**
   - Tab through the entire page
   - Verify tab order is logical
   - Verify focus indicator is visible at all times
   - Test escape key closes modals/dropdowns
   - Test arrow keys work in sliders and lists

2. **Screen Reader Testing**
   - Test with NVDA (Windows) or VoiceOver (macOS/iOS)
   - Verify page structure is announced correctly
   - Verify form labels are associated
   - Verify error messages are announced
   - Verify dynamic content changes are announced

3. **Color Contrast**
   - Use WebAIM Contrast Checker or browser DevTools
   - Normal text: 4.5:1
   - Large text: 3:1
   - UI components: 3:1

4. **Zoom & Resize**
   - Set browser zoom to 200%
   - Verify content is readable
   - Verify layout doesn't break
   - Verify no horizontal scroll at 200% zoom

5. **Mobile & Touch**
   - Test on iPhone/Android
   - Verify touch targets are ≥ 44×44 CSS pixels
   - Verify orientation changes work
   - Verify no sticky headers trap content

## Code Practices

### Semantic HTML First
```tsx
// ✅ Good
<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

// ❌ Bad
<div className="navbar">
  <div className="nav-item"><span>Home</span></div>
  <div className="nav-item"><span>About</span></div>
</div>
```

### Form Labels
```tsx
// ✅ Good
<label htmlFor="search">Search recitations</label>
<input id="search" type="text" />

// ❌ Bad
<input type="text" placeholder="Search" />
```

### ARIA Only When Necessary
```tsx
// ✅ Good
<button>Play</button>

// ❌ Bad
<div role="button" onClick={...}>Play</div>
```

### Focus Management
```tsx
// ✅ Good - focus moves to modal on open
<Modal onOpenChange={(open) => {
  if (open) focusRef.current?.focus()
}}>
  <input ref={focusRef} />
</Modal>

// ❌ Bad - focus stays on trigger button
<Modal>
  <input />
</Modal>
```

### Alt Text
```tsx
// ✅ Good
<img src="reciter.jpg" alt="Reciter performing at event" />
<img src="divider.svg" alt="" role="presentation" />

// ❌ Bad
<img src="reciter.jpg" />
<img src="divider.svg" alt="divider" />
```

## Review Process

All UI changes must go through the accessibility review process:

1. **Developer** creates PR with UI changes
2. **Developer** tags `@accessibility-engineer` in PR description
3. **Accessibility Engineer** reviews against this checklist
4. **Accessibility Engineer** tests keyboard navigation, screen reader, contrast
5. **Accessibility Engineer** adds approval comment or requests changes
6. **Code review** happens after accessibility sign-off
7. **Merge** only after accessibility approval + code review

## Resources

- [WCAG 2.1 Specification](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Next.js Accessibility](https://nextjs.org/learn/seo/improve-accessibility)
- [Tailwind Accessibility](https://tailwindcss.com/docs/accessibility)

## Contact

For accessibility questions or issues, contact the Accessibility Engineer: `@accessibility-engineer`

All accessibility concerns are treated as blocking issues — no exceptions.
