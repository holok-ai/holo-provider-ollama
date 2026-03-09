# @holokai/holo-provider-ollama

## 1.1.0

### Minor Changes

- af04a6e: Plugin/protocol system, audit table redesign, unified server lifecycle.
  - Added plugins table and protocol registration system (plugins define protocols with capabilities)
  - Replaced llm_requests/llm_responses with provider_requests/provider_responses (UUID FKs, metadata JSONB)
  - Renamed model_slug to access_model, added client_identifier column
  - Added ProviderRequest/ProviderResponse entity types with metadata
  - Added ProtocolCapability enum (chat, generate, embed, models)
  - Each plugin declares protocols in RouteTree with { name, capability } objects
  - Unified server startup: all servers extend BaseServer with mixins (withDB, withQueue, withAdmin)
  - API server converted to BaseServer subclass (ApiServer)
  - Centralized DI registrations in container/ directory
  - Server registration and periodic heartbeat via withDB mixin
  - Auth middleware: added allowJwt/allowHoloToken options, JWT email-to-UUID resolution
  - Guards use provider_id FK instead of provider name string lookup
  - ApplicationDB extracted from ApplicationService for proper layering

### Patch Changes

- fd64cb1: Moved app to separate workspace so that we can track with changeset.
- Updated dependencies [af04a6e]
- Updated dependencies [fd64cb1]
  - @holokai/sdk@1.1.0

## 1.0.0

### Minor Changes

- Broke up SDK to have dependency-less @holokai/types. Reorganized types and interfaces. Fixed up some types vs interfaces. Prefixed true interfaces that are used to describe classes vs TypeScript interfaces used to just describe an object.

### Patch Changes

- Updated dependencies
  - @holokai/sdk@1.0.0
