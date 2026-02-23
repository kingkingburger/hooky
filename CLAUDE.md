# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hooky** is a browser-based thumbnail editor ("Thumbnailer") built as a single-page React application. Users compose thumbnails on an HTML Canvas using draggable text and image layers, then download the result as PNG. The UI is in Korean.

## Commands

- **Dev server:** `bun run dev` (Vite HMR)
- **Build:** `bun run build` (runs `tsc -b && vite build`, outputs to `dist/`)
- **Lint:** `bun run lint` (ESLint with TypeScript + React hooks/refresh rules)
- **Preview production build:** `bun run preview`
- **Install dependencies:** `bun install`

Package manager is **Bun** (bun.lock present). No test framework is configured yet.

## Tech Stack

- React 19 + TypeScript (strict mode, `noUnusedLocals`/`noUnusedParameters` enabled)
- Vite 7 with `@vitejs/plugin-react-swc` (SWC-based Fast Refresh)
- Tailwind CSS 3 (via PostCSS + Autoprefixer)
- ESM modules (`"type": "module"` in package.json)

## Architecture

The entire application lives in `src/App.tsx` as a single component. There is no routing, state management library, or component decomposition yet.

### Key concepts in App.tsx:

- **Layer system:** A `layers: Layer[]` state array where each layer is either a `TextLayer` (with font, stroke, shadow properties) or an `ImageLayer` (with src, width, height). Layers render in array order on the canvas.
- **Canvas rendering:** A `useEffect` redraws the entire canvas on every state change — background, border, date overlay, all layers, and selection indicator.
- **Drag-and-drop:** Mouse events on the canvas (`handleMouseDown`/`Move`/`Up`) use a `dragInfo` ref to track which layer is being dragged. Hit detection works in reverse layer order (topmost first).
- **Image management:** `imageObjects` state (`Record<string, HTMLImageElement>`) caches loaded `Image` objects keyed by data URL. A `useEffect` loads images for any new image layers or background image.
- **Templates:** Saved/loaded via `localStorage` under key `thumbnailer_templates`. A template captures the full editor state (layers, canvas size, background, border, date options).
- **Download:** Temporarily deselects layers (to hide selection outline), then exports canvas to PNG via `toDataURL`.

### UI layout:
- **Header:** App title + download button
- **Left sidebar (280px):** Layer add buttons, layer property editor (contextual — text vs image), canvas settings (shown when no layer selected), template management
- **Main area:** The canvas element, scaled to fit viewport
