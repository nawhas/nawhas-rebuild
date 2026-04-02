# Tailwind CSS + Accessibility Best Practices

This guide extends [ACCESSIBILITY.md](./ACCESSIBILITY.md) with Tailwind-specific patterns for building accessible components in Nawhas.

## Focus Management

### Focus Ring Utilities

Always show focus indicators. Tailwind provides built-in focus utilities:

```tsx
// ✅ Good - visible focus ring
<button className="px-4 py-2 bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
  Click me
</button>

// ✅ Good - focus-visible for mouse users (shows ring only on keyboard)
<button className="px-4 py-2 bg-blue-600 text-white rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500">
  Click me
</button>

// ❌ Bad - no focus indicator
<button className="px-4 py-2 bg-blue-600 text-white rounded focus:outline-none">
  Click me
</button>
```

### Focus Trap Helpers

For modals, dropdowns, and overlays — manage focus with these patterns:

```tsx
// ✅ Good - trap focus in modal
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
  onClick={(e) => e.target === e.currentTarget && onClose()}
>
  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
    <h2 id="dialog-title" className="text-xl font-bold mb-4">
      Confirm Action
    </h2>
    {/* Modal content */}
    <button
      autoFocus
      className="mt-6 px-4 py-2 bg-blue-600 text-white rounded focus-visible:ring-2"
      onClick={onClose}
    >
      Close
    </button>
  </div>
</div>
```

## Color Contrast

### Use Tailwind Color Scale

Tailwind's color scale is designed for contrast. Pair colors strategically:

```tsx
// ✅ Good contrast ratios
<p className="text-gray-900 bg-white">High contrast (normal text)</p>
<p className="text-blue-600 bg-white">WCAG AA compliant (4.5:1+)</p>
<p className="text-gray-700 bg-white">WCAG AA compliant</p>

// ⚠️ Borderline - test before shipping
<p className="text-gray-600 bg-white">4.5:1 ratio - verify with tools</p>

// ❌ Poor contrast - fails WCAG AA
<p className="text-gray-400 bg-white">Insufficient (2.3:1)</p>
```

### Large Text Exception (3:1 ratio)

For text ≥ 18px or ≥ 14px bold, 3:1 contrast is sufficient:

```tsx
// ✅ Good - large text with 3:1 contrast
<h2 className="text-2xl font-bold text-gray-700 bg-white">
  Section Heading (3:1 is enough for large text)
</h2>

// ✅ Good - button with 3:1 contrast
<button className="px-4 py-3 text-lg bg-green-600 text-white rounded">
  Large Button (3:1 is acceptable)
</button>
```

### Test Colors Before Using

Use this quick test:
- Install: `npm install -D wcag-contrast`
- Test: Check contrast of custom colors before committing

```tsx
// Color utilities to avoid
<p className="text-gray-500 bg-gray-50">  {/* ~2.5:1 - FAILS */}
<p className="text-blue-300 bg-white">    {/* ~2.8:1 - FAILS */}
```

## Semantic HTML with Tailwind

### Use `<button>` not `<div role="button">`

Tailwind makes real buttons look good — no need for div hacks:

```tsx
// ✅ Good - real button
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
  Click me
</button>

// ✅ Good - semantic with Tailwind
<a href="/recitations" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block">
  View Recitations
</a>

// ❌ Bad - div pretending to be button
<div role="button" onClick={...} className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer">
  Click me
</div>
```

### Form Inputs with Tailwind

Always pair inputs with visible labels:

```tsx
// ✅ Good - clear label association
<label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-2">
  Search Recitations
</label>
<input
  id="search-input"
  type="search"
  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
  placeholder="Enter reciter or album name"
/>

// ✅ Good - inline label with icon
<label className="flex items-center">
  <input
    type="checkbox"
    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
  />
  <span className="ml-2 text-sm text-gray-700">Subscribe to updates</span>
</label>

// ❌ Bad - placeholder as label
<input
  type="search"
  className="w-full px-3 py-2 border border-gray-300 rounded-md"
  placeholder="Search..."
/>
```

### Error States with ARIA

Use Tailwind for visual styling + ARIA for screen readers:

```tsx
const [error, setError] = useState('');

<div>
  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
    Email
  </label>
  <input
    id="email"
    type="email"
    aria-invalid={Boolean(error)}
    aria-describedby={error ? 'email-error' : undefined}
    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
      error
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:ring-blue-500'
    }`}
  />
  {error && (
    <p id="email-error" className="mt-2 text-sm text-red-600">
      {error}
    </p>
  )}
</div>
```

## Text Sizing & Readability

### Use Tailwind's Scale

Don't make text too small or too large:

```tsx
// ✅ Good - Tailwind's semantic scale
<h1 className="text-4xl font-bold">   {/* ~36px */}
<h2 className="text-3xl font-bold">   {/* ~30px */}
<h3 className="text-2xl font-bold">   {/* ~24px */}
<p className="text-base">              {/* 16px - body text default */}
<small className="text-sm">           {/* 14px */}

// ⚠️ Be careful
<p className="text-xs">                {/* 12px - harder to read */}
<p className="text-lg">                {/* 18px - good for emphasis */}
```

### Line Height for Readability

Always add generous line height:

```tsx
// ✅ Good - readable body text
<article className="text-base leading-7 text-gray-900">
  {articleContent}
</article>

// ✅ Good - heading with room to breathe
<h1 className="text-4xl font-bold leading-tight">
  {title}
</h1>

// ❌ Bad - cramped, hard to read
<p className="text-base leading-none">
  {text}
</p>
```

## Skip Links

Always include a skip-to-main-content link at the top of your layout:

```tsx
// ✅ Good - skip link hidden by default, visible on focus
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="absolute -top-40 left-0 bg-black text-white px-4 py-2 focus:top-0 focus:z-50 transition-all"
        >
          Skip to main content
        </a>

        <nav className="bg-gray-900 text-white p-4">
          {/* Navigation */}
        </nav>

        <main id="main-content" className="p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
```

## Responsive Design & Touch Targets

### Minimum Touch Target Size (44×44 CSS pixels)

Ensure interactive elements are big enough on mobile:

```tsx
// ✅ Good - 44px minimum height
<button className="px-4 py-3 bg-blue-600 text-white rounded">
  Tap me
</button>

// ✅ Good - explicit sizing
<button className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 text-white">
  ✕
</button>

// ❌ Bad - too small for touch
<button className="px-2 py-1 text-xs bg-blue-600 text-white rounded">
  X
</button>
```

### Spacing for Touch-Friendly Layout

Add spacing between interactive elements:

```tsx
// ✅ Good - separated buttons with gap
<div className="flex gap-4">
  <button className="flex-1 px-4 py-3 bg-blue-600 text-white rounded">
    Save
  </button>
  <button className="flex-1 px-4 py-3 bg-gray-300 text-gray-900 rounded">
    Cancel
  </button>
</div>

// ❌ Bad - touching buttons (easy to misclick)
<div className="flex">
  <button className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-l">
    Save
  </button>
  <button className="flex-1 px-4 py-3 bg-gray-300 text-gray-900 rounded-r">
    Cancel
  </button>
</div>
```

## RTL Support (Arabic)

### Tailwind RTL Utilities

Use logical properties for RTL compatibility:

```tsx
// ✅ Good - uses logical properties (auto-mirrors in RTL)
<div className="flex items-center gap-4 p-4">
  <img src="avatar.jpg" className="w-12 h-12 rounded-full" alt="User" />
  <div>
    <p className="font-semibold">Name</p>
    <p className="text-sm text-gray-600">Email</p>
  </div>
</div>

// ✅ Good - flex-row-reverse for RTL
<div className="flex flex-row-reverse items-center gap-4 rtl:flex-row">
  {/* Content */}
</div>

// ✅ Good - margin utilities (auto-adjusted for RTL)
<p className="ml-4">   {/* margin-left in LTR, margin-right in RTL */}
<p className="pr-4">   {/* padding-right in LTR, padding-left in RTL */}

// ⚠️ Avoid directional hardcoding
<p className="ml-4 rtl:mr-4">  {/* Redundant - use margin-inline-start */}
```

### Lang Attribute for RTL Content

Always set `lang="ar"` and `dir="rtl"`:

```tsx
// ✅ Good - Arabic content
<html lang="ar" dir="rtl">
  <body>{children}</body>
</html>

// ✅ Good - mixed language
<html lang="en" dir="ltr">
  <body>
    <section lang="ar" dir="rtl">
      {arabicContent}
    </section>
  </body>
</html>
```

## Animations & Reduced Motion

Respect user motion preferences:

```tsx
// ✅ Good - respects prefers-reduced-motion
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-300 motion-reduce:transition-none">
  Hover me
</button>

// ✅ Good - animation with motion respect
<div className="animate-fade motion-reduce:animate-none">
  {content}
</div>

// ❌ Bad - ignores user preferences
<div className="animate-bounce">
  {content}
</div>
```

## Quick Checklist for Every Component

Before shipping a component:

- [ ] **Focus ring visible?** - `focus:ring-2 focus:ring-offset-2`
- [ ] **Contrast sufficient?** - Test with WebAIM Contrast Checker
- [ ] **Touch target ≥ 44×44?** - `py-3` minimum for buttons
- [ ] **Label present?** - `<label htmlFor="id">` for inputs
- [ ] **Semantic HTML?** - `<button>` not `<div role="button">`
- [ ] **Error states clear?** - Visual + `aria-invalid` + error text
- [ ] **Keyboard navigable?** - Tab through without mouse
- [ ] **RTL safe?** - Uses logical properties, not left/right
- [ ] **Animations respectful?** - `motion-reduce:` utilities applied

## Resources

- [Tailwind Accessibility Docs](https://tailwindcss.com/docs/accessibility)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Focus Management](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Keyboard)

---

Use these patterns throughout the project. Questions? See [ACCESSIBILITY.md](./ACCESSIBILITY.md) or tag `@accessibility-engineer`.
