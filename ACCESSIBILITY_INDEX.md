# Accessibility Resources Index

Complete guide to accessibility standards, patterns, and testing for Nawhas.

## Quick Start

**Never shipped inaccessible code.** Every feature must pass:
- ✅ WCAG 2.1 AA compliance
- ✅ Keyboard navigation test
- ✅ Screen reader test
- ✅ Color contrast check (4.5:1 normal, 3:1 large text)
- ✅ Accessibility engineer sign-off

## Documentation

### 1. [ACCESSIBILITY.md](./ACCESSIBILITY.md)
**Your WCAG 2.1 AA Bible**

Contains:
- Complete WCAG 2.1 AA checklist (40+ criteria)
- Perceivable, Operable, Understandable, Robust (POUR) breakdown
- Feature-specific requirements (audio player, forms, navigation, Arabic RTL)
- Code practices and best practices
- Testing procedures (automated, manual, screen reader, mobile)
- Review process workflow

**Use this when:**
- Starting a new feature
- Reviewing someone's PR
- Debugging accessibility issues
- Onboarding new team members

**Key sections:**
- Text alternatives and semantic HTML
- Keyboard navigation and focus management
- Color contrast and distinguishable content
- Form accessibility and error handling
- Audio player accessibility
- Arabic RTL rendering

---

### 2. [TAILWIND_ACCESSIBILITY.md](./TAILWIND_ACCESSIBILITY.md)
**Tailwind CSS + Accessibility Patterns**

Contains:
- Focus ring utilities and patterns
- Color contrast with Tailwind scale
- Semantic HTML examples (button, input, form)
- Form inputs with labels and errors
- Text sizing and readability
- Touch target sizing (44×44 minimum)
- Skip links implementation
- RTL support for Arabic
- Animations with motion preferences
- Quick component checklist

**Use this when:**
- Building components with Tailwind
- Unsure about color pairings
- Styling forms, buttons, or interactive elements
- Need RTL guidance

**Quick reference:**
```tsx
// Focus ring - always include
className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"

// Contrast - pair colors from Tailwind scale
className="text-gray-900 bg-white"  // ✅ 4.5:1+

// Touch targets - minimum 44px height
className="px-4 py-3"  // ✅ 44px

// Labels - always paired with inputs
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

---

### 3. [REACT_ACCESSIBILITY_PATTERNS.md](./REACT_ACCESSIBILITY_PATTERNS.md)
**Copy-Paste Ready Components**

Contains 8 production-ready accessible components:
1. **Button** - Basic button with keyboard support
2. **Link** - Text link, skip link, external link handling
3. **Input** - Text input with label and error handling
4. **Checkbox** - Semantic checkbox with description
5. **RadioGroup** - Radio buttons with fieldset/legend
6. **Modal** - Dialog with focus trap and escape key
7. **Dropdown** - Menu with keyboard navigation
8. **AudioPlayer** - Play/pause, seek, time with ARIA
9. **Alert** - Alert box with role="alert"
10. **Search** - Search input with keyboard navigation

**Use this when:**
- Building UI components
- Need a pattern for a feature
- Unsure how to handle focus or ARIA

**All components include:**
- TypeScript types
- Keyboard navigation
- Screen reader support
- Focus management
- Error handling
- Responsive design

**Example: Copy-paste a button**
```tsx
// From REACT_ACCESSIBILITY_PATTERNS.md
<Button onClick={handleClick} ariaLabel="Specific action">
  Click me
</Button>
```

---

## Testing & QA

### Automated Testing

**Lighthouse CI** (already configured in monorepo)
```bash
npm run perf:lighthouse
```
- Checks accessibility score ≥ 0.9 (error threshold)
- Checks contrast, ARIA, semantic HTML
- Reports in CI/CD pipeline

**Axe Core** (included in this setup)
```bash
npm run test:a11y
```
- Scans for WCAG violations
- Runs in your test suite
- Used in unit and integration tests

### Manual Testing

1. **Keyboard Navigation**
   - Tab through every interactive element
   - Verify tab order is logical
   - Test escape key closes modals
   - Test arrow keys in sliders/lists

2. **Screen Reader Testing**
   - Test with NVDA (Windows) or VoiceOver (Mac)
   - Verify page structure announced correctly
   - Verify form labels associated
   - Verify error messages announced

3. **Color Contrast**
   - Use WebAIM Contrast Checker
   - Normal text: 4.5:1
   - Large text: 3:1
   - UI components: 3:1

4. **Zoom & Resize**
   - Browser zoom to 200%
   - Content readable and not broken
   - No horizontal scroll at 200%

5. **Mobile & Touch**
   - Test on iOS and Android
   - Touch targets ≥ 44×44 CSS pixels
   - Orientation changes work

---

## Review Checklist

**Before you merge:**

- [ ] **ACCESSIBILITY.md checklist** - All 40+ criteria pass
- [ ] **Keyboard navigation** - Tab through entire feature
- [ ] **Screen reader** - Test with NVDA/VoiceOver (or ask accessibility-engineer)
- [ ] **Color contrast** - Verified with WebAIM
- [ ] **Focus indicators** - Always visible
- [ ] **Labels/ARIA** - All inputs and buttons properly labeled
- [ ] **Error messages** - Announced to screen readers
- [ ] **Arabic RTL** - If relevant, text renders correctly
- [ ] **Touch targets** - ≥ 44×44 CSS pixels
- [ ] **Animations** - Respect motion preferences

**Tag on PR:**
```
@accessibility-engineer - ready for accessibility review
```

The accessibility engineer will:
1. Test keyboard navigation
2. Test with screen reader
3. Verify color contrast
4. Check ARIA implementation
5. Verify focus management
6. Post sign-off comment

**No merge without accessibility sign-off.**

---

## Integration Points

### GitHub Actions CI
- Lighthouse CI runs on every PR
- Reports accessibility score
- Fails if accessibility < 0.9

### PR Review Workflow
1. Developer creates PR
2. Tags @accessibility-engineer
3. Code review happens
4. Accessibility review happens
5. Both approvals required to merge

### Component Library
- All components use REACT_ACCESSIBILITY_PATTERNS.md as templates
- All styling uses TAILWIND_ACCESSIBILITY.md patterns
- All compliance tracked against ACCESSIBILITY.md

---

## Common Issues & Fixes

### "Focus ring not visible"
See: TAILWIND_ACCESSIBILITY.md → Focus Management

### "Form label not associated"
See: REACT_ACCESSIBILITY_PATTERNS.md → Forms

### "Color contrast fails"
See: TAILWIND_ACCESSIBILITY.md → Color Contrast

### "Keyboard can't navigate dropdown"
See: REACT_ACCESSIBILITY_PATTERNS.md → Dropdowns & Menus

### "Screen reader doesn't announce error"
See: REACT_ACCESSIBILITY_PATTERNS.md → Forms (aria-invalid, aria-describedby)

### "Audio player not keyboard operable"
See: REACT_ACCESSIBILITY_PATTERNS.md → Audio Player

### "Arabic text renders left-to-right"
See: TAILWIND_ACCESSIBILITY.md → RTL Support

### "Touch targets too small"
See: TAILWIND_ACCESSIBILITY.md → Touch Targets

---

## Standards

**WCAG 2.1 Level AA is non-negotiable.**

Not a suggestion. Not a nice-to-have. Every single feature.

**Why AA not AAA?**

- AA is the international standard for web accessibility
- AA is achievable without major design changes
- AA provides solid access for 95% of users with disabilities
- AAA has diminishing returns (rare use cases, high cost)

**What does AA cover?**

✅ Text alternatives (alt text)
✅ Color contrast (4.5:1)
✅ Keyboard navigation
✅ Focus management
✅ Form labels and error handling
✅ Semantic HTML
✅ Screen reader support (ARIA)
✅ Audio descriptions (future)

---

## Resources

- [WCAG 2.1 Official Spec](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Tailwind Accessibility](https://tailwindcss.com/docs/accessibility)
- [React Accessibility](https://react.dev/reference/react-dom/components/input#providing-a-label)

---

## Questions?

Tag `@accessibility-engineer` on:
- PRs with UI changes
- Issues about accessibility
- Questions about patterns
- Design reviews

Accessibility is collaborative. No assumptions. Ask questions.

---

## Next Steps

1. **Monorepo scaffold merges** → PR #1 merges
2. **Accessibility setup merges** → PR #6 merges
3. **Frontend-dev builds first feature** → Tags accessibility-engineer
4. **Accessibility review happens** → Sign-off or feedback
5. **Feature ships** → Accessible from day 1

All resources ready. Team set up. Standards clear.

Let's build something accessible.
