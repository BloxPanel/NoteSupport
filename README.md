# NoteSupport

NoteSupport is a student-focused note-taking app built with React, TypeScript, Vite, Tailwind, Dexie, and Tiptap. It stores notes locally in IndexedDB, supports subjects and timelines, and is prepared for static deployment through BuiltByBuzz Hosting.

## Features

- Dashboard with search, stats, and quick actions
- Subject management with color coding and note counts
- Tiptap document editor with paper-style Document View and Continuous View
- Rich formatting, colored highlights, text colors, alignment, nested lists, and keyboard indentation
- Browser printing and Save as PDF support
- Timeline view grouped by class date
- Backup export/import with schema validation
- Local-only storage mode with clear browser-data warning
- Responsive layout for desktop, tablet, and mobile
- Hash routing for static-hosting compatibility

## Tech stack

- React + TypeScript
- Vite
- Tailwind CSS
- React Router
- Dexie + IndexedDB
- Tiptap rich-text editor
- Lucide React
- Vitest + Testing Library

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The production files are generated in `dist/`.

## Testing

```bash
npm run test
```

## GitHub Actions

The repository includes:

- `.github/workflows/build.yml` to install dependencies, run type checks, execute tests, and build the app.
- `.github/workflows/publish.yml` to build the static bundle and publish `site-dist` on demand.

## BuiltByBuzz Hosting notes

This project is intended for public GitHub repository deployment via BuiltByBuzz Hosting. It is built as a static frontend and uses hash-based routing to avoid reliance on server rewrite rules. The final deployment directory must be confirmed against the actual BuiltByBuzz Hosting implementation.

## Local storage and security

- Notes are stored locally in the browser via IndexedDB.
- Notes do not synchronize automatically between devices.
- Clearing browser data can remove locally stored notes.
- No fake authentication or fake cloud sync is implemented in v0.1.
- The architecture is prepared for a future Cloudflare Worker + D1 backend.

## Backup and restore

- Use Settings → Export backup to save a JSON file.
- Use Settings → Import backup to restore a file.
- Imports require confirmation before replacing local data.
- Invalid or oversized files are rejected with clear error messages.

## Known limitations

- v0.1 is frontend-only and uses local browser storage.
- Cloud sync, authentication, and server-side ownership are intentionally not implemented.
- BuiltByBuzz Hosting deployment behavior depends on the provider's static hosting capabilities.
