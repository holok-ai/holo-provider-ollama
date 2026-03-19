# @holokai/holo-provider-ollama

## 1.3.0

### Patch Changes

- update provider translators and auditors for SDK integration

## 1.2.2

### Patch Changes

- Add historical pricing datasets with compiled snapshot normalization
    - Add PricingDataset types and normalizePricingDataset() engine to SDK that compiles raw pricing snapshots into
      complete point-in-time sheets with model carry-forward, alias expansion, shutdown removal, and effective_to date
      ranges
    - Create historical pricing datasets for Claude (15 snapshots back to 2023-03), Gemini (7 snapshots back to
      2024-02), and OpenAI (12 snapshots back to 2023-06)
    - All plugins now implement getPricingSheets() returning full history; plugin service registers all sheets with
      effective_to for accurate historical cost calculation
    - Fix unhandled promise rejections in streaming paths for OpenAI, Gemini, and Ollama providers by deferring work
      into final() instead of starting floating IIFEs

## 1.2.1

## 1.2.0

### Minor Changes

- Pricing system, cache invalidation, `/holo/api` route prefix, model access checks, Claude SDK update.
    - Pricing system: plans, sheets, per-model token costs with bulk recalculation via CTE
    - Cache invalidation endpoints for Redis flush on application/provider updates
    - Moved Holo management APIs to `/holo/api` prefix to separate from provider routes
    - Model access validation in request pipeline
    - Updated Claude provider SDK and response translators
    - Plugin route and protocol type updates

## 1.1.0

### Minor Changes

- Adapted to plugin/protocol system with capability-based registration
- Protocol capability registration for `ollama.chat` (chat) and `ollama.generate` (generate)
- Proper request/response auditing with metadata

### Patch Changes

- fd64cb1: Moved app to separate workspace so that we can track with changeset.
- Updated dependencies
    - @holokai/sdk@1.1.0

## 1.0.0

### Minor Changes

- Broke up SDK to have dependency-less @holokai/types. Reorganized types and interfaces. Fixed up some types vs
  interfaces. Prefixed true interfaces that are used to describe classes vs TypeScript interfaces used to just describe
  an object.

### Patch Changes

- Updated dependencies
    - @holokai/sdk@1.0.0
