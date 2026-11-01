# Copilot instructions for Casa Clara

## Project context
- This repository is a TypeScript React application for the Casa Clara product.
- Keep the existing architecture and conventions in place unless a change requires a focused fix.
- Prefer small, targeted edits over broad refactors.

## Core stack
- React + TypeScript + Vite
- TanStack Router for routing
- TanStack Query for async data state
- Supabase for auth and storage
- UI primitives under `src/components/ui` and utility helpers under `src/lib`

## Architecture rules
- Preserve the existing project structure and naming conventions.
- Keep route files under `src/routes`, shared UI under `src/components`, and domain logic under `src/lib`.
- Prefer reusing existing abstractions, utilities, and patterns already present in the codebase before creating new ones.
- Do not introduce unrelated frameworks or patterns.

## Supabase / storage rules
- If a file storage bucket is needed, use the exact bucket name `cloud-docs`.
- Keep bucket access private (`public = false`) unless a specific requirement says otherwise.
- Use authenticated-only access rules for storage operations.
- When implementing document vaults or encrypted storage, keep file contents encrypted at rest and avoid exposing plaintext data unnecessarily.
- Do not silently share plaintext files to external channels such as email, WhatsApp, Telegram, X, Instagram, or similar. If export/share is required, handle it as an explicit export action that creates a cleartext copy only for user-driven export.

## Nuvem / vault rules
- Preserve the secure vault model already in use: encrypted content, encrypted metadata, local offline cache, and explicit unlock flow.
- Keep file names, metadata, and folder labels protected unless explicitly needed in a user-facing decrypted view.
- Support rename, move, and delete operations inside the secure vault without exposing plaintext content.
- For printing or exporting to external ecosystems, use a cleartext export step, not direct sharing from the encrypted vault.

## UI / navigation rules
- If adding a new section to the app, integrate it into `AppShell` and keep the active menu state consistent.
- Use the existing `AppPage` pattern and route labels when updating navigation.
- Maintain a consistent experience with the project's current design tokens and button variants.

## Runtime / stability rules
- Always validate imports before adding or changing modules.
- Prefer guarded runtime checks for missing environment variables, missing bucket configuration, or auth state.
- Surface actionable errors to the user when Supabase configuration is missing or storage access is blocked.
- Avoid broad changes to authentication, storage, or route bootstrapping unless required.

## Quality bar
- Keep changes small, reviewed, and easy to reason about.
- Do not remove existing functionality unless the task explicitly requires it.
- Preserve the repository's current behavior and patterns while fixing the requested issue.
