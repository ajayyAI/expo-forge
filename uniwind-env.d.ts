/// <reference types="uniwind/types" />

// Allow side-effect CSS imports (e.g. `import './global.css'`) which Metro
// handles via the uniwind plugin. Uniwind does not ship this ambient module
// declaration, so we provide it here.
declare module '*.css';
