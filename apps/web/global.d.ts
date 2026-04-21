// Ambient type declarations for non-JS side-effect imports.
//
// Since TypeScript 6, the compiler no longer ships an implicit ambient module
// for `*.css` imports under `moduleResolution: "bundler"`. Next.js relies on
// side-effect CSS imports (e.g. `import './globals.css'` in the root layout)
// which are processed by the bundler, not the type-checker. This declaration
// tells TypeScript those imports are valid and have no runtime exports.
declare module '*.css';
