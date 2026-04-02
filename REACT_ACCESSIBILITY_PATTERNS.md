# React Accessibility Patterns

This guide provides copy-paste-ready accessible React component patterns for Nawhas. All patterns follow WCAG 2.1 AA standards.

## Table of Contents

1. [Buttons](#buttons)
2. [Links](#links)
3. [Forms](#forms)
4. [Modals & Dialogs](#modals--dialogs)
5. [Dropdowns & Menus](#dropdowns--menus)
6. [Tabs](#tabs)
7. [Lists & Navigation](#lists--navigation)
8. [Alerts & Notifications](#alerts--notifications)
9. [Audio Player](#audio-player)
10. [Search](#search)

---

## Buttons

### Basic Button

```tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Button({
  children,
  onClick,
  disabled = false,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="px-4 py-2 bg-blue-600 text-white rounded font-medium transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      {children}
    </button>
  );
}
```

### Icon Button

```tsx
interface IconButtonProps {
  icon: React.ReactNode;
  label: string; // Required! Screen readers need this
  onClick?: () => void;
  ariaPressed?: boolean;
}

export function IconButton({ icon, label, onClick, ariaPressed }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={ariaPressed}
      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {icon}
    </button>
  );
}

// Usage
<IconButton icon={<PlayIcon />} label="Play recitation" onClick={play} />
```

---

## Links

### Text Link

```tsx
interface LinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

export function Link({ href, children, external = false }: LinkProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="text-blue-600 hover:text-blue-800 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      {children}
      {external && <span aria-label="(opens in new tab)"> ↗</span>}
    </a>
  );
}
```

### Skip Link

```tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="absolute -top-40 left-0 bg-black text-white px-4 py-2 font-medium focus:top-0 focus:z-50 transition-all"
    >
      Skip to main content
    </a>
  );
}

// Add to root layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SkipLink />
        <nav>{/* ... */}</nav>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
```

---

## Forms

### Text Input with Label

```tsx
interface InputProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'tel';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function Input({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
}: InputProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span aria-label="required" className="text-red-600 ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

### Checkbox

```tsx
interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export function Checkbox({
  id,
  label,
  checked,
  onChange,
  description,
}: CheckboxProps) {
  return (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={description ? `${id}-description` : undefined}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
        />
      </div>
      <div className="ml-3 text-sm">
        <label htmlFor={id} className="font-medium text-gray-900 cursor-pointer">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="text-gray-600 mt-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
```

### Radio Group

```tsx
interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  name: string;
  legend: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
}

export function RadioGroup({
  name,
  legend,
  options,
  value,
  onChange,
}: RadioGroupProps) {
  return (
    <fieldset className="mb-4">
      <legend className="block text-sm font-medium text-gray-700 mb-3">
        {legend}
      </legend>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              id={`${name}-${option.value}`}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <label
              htmlFor={`${name}-${option.value}`}
              className="ml-2 text-sm text-gray-700 cursor-pointer"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
```

---

## Modals & Dialogs

### Basic Modal

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Trap focus in modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      contentRef.current?.focus();

      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className="bg-white rounded-lg shadow-lg max-w-md w-full p-6"
      >
        <h2 id="modal-title" className="text-xl font-bold mb-4">
          {title}
        </h2>
        {children}
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

---

## Dropdowns & Menus

### Simple Dropdown (Popover)

```tsx
interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  label?: string;
}

export function Dropdown({ trigger, children, label }: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={label}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded shadow-lg z-10"
        >
          {children}
        </div>
      )}
    </div>
  );
}
```

---

## Alerts & Notifications

### Alert Box

```tsx
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose?: () => void;
}

export function Alert({ type, title, message, onClose }: AlertProps) {
  const colorClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconRoles = {
    success: '✓',
    error: '!',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      role="alert"
      className={`border-l-4 p-4 rounded ${colorClasses[type]}`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-xl font-bold">
          {iconRoles[type]}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close alert"
            className="text-xl hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Audio Player

### Play/Pause Button

```tsx
interface AudioPlayerProps {
  src: string;
  title: string;
}

export function AudioPlayer({ src, title }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-100 p-6 rounded-lg">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      <div className="flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
          className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => {
              if (audioRef.current) {
                audioRef.current.currentTime = Number(e.target.value);
              }
            }}
            aria-label="Seek"
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="text-sm text-gray-700 whitespace-nowrap">
          <span aria-live="polite">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## Search

### Search Input with Results

```tsx
interface SearchResult {
  id: string;
  title: string;
  description: string;
}

interface SearchProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  placeholder?: string;
}

export function Search({ onSearch, placeholder = 'Search...' }: SearchProps) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  const handleSearch = async (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (value.trim()) {
      setIsLoading(true);
      const searchResults = await onSearch(value);
      setResults(searchResults);
      setIsLoading(false);
    } else {
      setResults([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev === 0 ? results.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      // Handle selection
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Search"
        aria-autocomplete="list"
        aria-expanded={results.length > 0}
        aria-controls="search-results"
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {isLoading && (
        <div role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">
          Searching...
        </div>
      )}

      {results.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded shadow-lg z-10"
        >
          {results.map((result, index) => (
            <li
              key={result.id}
              role="option"
              aria-selected={index === selectedIndex}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{result.title}</div>
              <div className="text-sm text-gray-600">{result.description}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Tips & Tricks

### Use `aria-live` for Dynamic Content

```tsx
// ✅ Good - announces updates to screen readers
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// ✅ Good - for important announcements
<div aria-live="assertive" aria-atomic="true" role="alert">
  {errorMessage}
</div>
```

### Use `aria-label` for Icon Buttons

```tsx
// ✅ Good - explains icon purpose
<button aria-label="Close modal">×</button>

// ❌ Bad - screen reader just says "button"
<button>×</button>
```

### Use `aria-expanded` for Toggleables

```tsx
// ✅ Good - announces state
<button aria-expanded={isOpen} onClick={toggle}>
  Menu
</button>

// ❌ Bad - state unknown to screen readers
<button onClick={toggle}>Menu</button>
```

---

## Resources

- [Nawhas ACCESSIBILITY.md](./ACCESSIBILITY.md) — WCAG 2.1 AA standards
- [Nawhas TAILWIND_ACCESSIBILITY.md](./TAILWIND_ACCESSIBILITY.md) — Tailwind patterns
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN React Accessibility](https://developer.mozilla.org/en-US/docs/Learn/Accessibility)

---

Questions? Tag `@accessibility-engineer` on your PR.
