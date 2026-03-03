# @holokai/holo-provider-ollama

> **Official Ollama provider plugin for Holo LLM Gateway**

[![npm version](https://img.shields.io/npm/v/@holokai/holo-provider-ollama.svg)](https://www.npmjs.com/package/@holokai/holo-provider-ollama)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview

The Ollama provider plugin enables Holo to communicate with locally-hosted Ollama models through the universal Holo
format. This plugin is part of the migration from the monolithic provider architecture to a plugin-based system,
providing complete bidirectional translation between Ollama's native API and the portable Holo format.

### Key Features

- ✅ **Full Holo SDK Integration** - Uses `@holokai/sdk` types for strict type safety
- ✅ **Bidirectional Translation** - Ollama ↔ Holo format with lossless core fields
- ✅ **Dual Mode Support** - Both Chat and Generate endpoints
- ✅ **Streaming Support** - Frame-based streaming with proper orchestration
- ✅ **Tool Calling** - Function calling support (Chat mode only)
- ✅ **Vision/Multimodal** - Image support via URLs and base64
- ✅ **Local Deployment** - No external API dependencies
- ✅ **Plugin Architecture** - Auto-discovered, hot-reloadable, independently versioned

---

## Installation

```bash
npm install @holokai/holo-provider-ollama
```

### Peer Dependencies

This plugin requires:

- `@holokai/sdk` ^0.1.0 - Holo universal format types and plugin contracts
- `ollama` ^0.6.3 - Official Ollama JavaScript SDK

### Prerequisites

- Ollama must be installed and running locally: https://ollama.com/download
- Default endpoint: `http://localhost:11434`

---

## Quick Start

### Automatic Discovery

When installed in a Holo worker environment, this plugin is automatically discovered and loaded by the plugin system. No
manual registration required.

### Configuration

Add a provider configuration to your Holo deployment:

```json
{
  "id": "ollama-local",
  "provider_type": "ollama",
  "plugin_id": "@holokai/holo-provider-ollama",
  "base_url": "http://localhost:11434",
  "model": "llama2",
  "config": {
    "defaultModel": "llama2",
    "timeoutMs": 60000
  }
}
```

### Usage in Code

```typescript
import { HoloRequest, HoloResponse } from '@holokai/sdk';

const request: HoloRequest = {
  model: 'llama2',
  messages: [
    { role: 'user', content: 'Explain quantum entanglement briefly.' }
  ],
  max_tokens: 500,
  temperature: 0.7
};

// Plugin handles translation automatically
const response: HoloResponse = await holoClient.chat(request);
```

---

## Migration from Monolithic Architecture

### What Changed

This plugin represents the extraction of Ollama provider logic from the monolithic `src/providers/ollama/` codebase into
a standalone, independently versioned package.

**Before** (Monolithic):

```
src/providers/ollama/
├── ollama.translator.ts
├── translators/
│   ├── chat/
│   └── generate/
├── streaming/
└── types/
```

**After** (Plugin):

```
@holokai/holo-provider-ollama
├── src/
│   ├── plugin.ts            # Plugin entrypoint
│   ├── manifest.ts          # Plugin metadata
│   ├── ollama.provider.ts   # Provider implementation
│   └── translators/         # Translation logic (preserved)
└── package.json
```

### Migration Benefits

1. **Independent Versioning** - Update Ollama support without core releases
2. **Hot Reload** - Deploy new Ollama versions without downtime
3. **Type Safety** - Strict SDK types eliminate `Record<string, unknown>`
4. **Reduced Coupling** - Plugin contracts enforce clean boundaries
5. **Local First** - No external API keys or dependencies

### Breaking Changes

- **Import paths changed**: Use `@holokai/sdk` for types instead of `../../types`
- **Configuration schema**: Now validated via plugin manifest
- **Dependency injection**: Uses plugin container instead of core DI

---

## Architecture

### Plugin Structure

```
@holokai/holo-provider-ollama/
├── src/
│   ├── plugin.ts                              # ProviderPlugin implementation
│   ├── manifest.ts                            # Plugin metadata & config schema
│   ├── ollama.provider.ts                     # Core provider logic
│   ├── ollama.translator.ts                   # Main translator facade
│   ├── translators/
│   │   ├── ollama.chat.request.translator.ts
│   │   ├── ollama.chat.response.translator.ts
│   │   ├── ollama.generate.request.translator.ts
│   │   ├── ollama.generate.response.translator.ts
│   │   ├── ollama.message.translator.ts
│   │   └── streaming/
│   │       ├── ollama.stream.translator.ts       # Orchestrator
│   │       ├── ollama.content.delta.translator.ts
│   │       ├── ollama.message.delta.translator.ts
│   │       └── ollama.message.stop.translator.ts
│   ├── types/
│   │   └── (Re-exports from ollama SDK)
│   └── utils/
│       └── (Helper functions)
└── package.json
```

### Translation Flow

```
┌─────────────────┐
│  Holo Request   │
│  (SDK types)    │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│ OllamaRequestTranslator │
│  - Detects mode         │
│  - Maps to Chat/Gen     │
│  - Nests in options     │
└────────┬────────────────┘
         │
         ↓
┌─────────────────┐
│  Ollama API     │
│  (local/remote) │
└────────┬────────┘
         │
         ↓
┌──────────────────────────┐
│ OllamaResponseTranslator │
│  - Detects mode          │
│  - Synthesizes ID        │
│  - Converts timestamp    │
└────────┬─────────────────┘
         │
         ↓
┌─────────────────┐
│  Holo Response  │
│  (SDK types)    │
└─────────────────┘
```

---

## Holo Format Mapping

This plugin implements the official Holo format mappings as documented in the SDK.

### Request Mapping: Holo → Ollama

| Holo Field                            | Ollama Field                       | Transformation                   | Notes               |
|---------------------------------------|------------------------------------|----------------------------------|---------------------|
| **Direct 1:1**                        |                                    |                                  |                     |
| `model`                               | `model`                            | Direct                           | Required            |
| `stream`                              | `stream`                           | Direct                           | Optional            |
| **Structure Transforms**              |                                    |                                  |                     |
| `system` (Chat)                       | First message with `role:'system'` | Inject as message                | Optional            |
| `system` (Generate)                   | `system`                           | Top-level field                  | Optional            |
| `messages` (Chat)                     | `messages`                         | Flatten to text + extract images | Required            |
| `messages` (Generate)                 | `prompt`                           | Extract from single user message | Converted to string |
| `temperature`                         | `options.temperature`              | Nest in options                  | Optional            |
| `top_p`                               | `options.top_p`                    | Nest in options                  | Optional            |
| `top_k`                               | `options.top_k`                    | Nest in options                  | Optional            |
| `max_tokens`                          | `options.num_predict`              | Nest + rename                    | Optional            |
| `stop_sequences`                      | `options.stop`                     | Nest in options                  | Array format        |
| `frequency_penalty`                   | `options.frequency_penalty`        | Nest in options                  | Optional            |
| `presence_penalty`                    | `options.presence_penalty`         | Nest in options                  | Optional            |
| `seed`                                | `options.seed`                     | Nest in options                  | Optional            |
| `response_format.type: 'json_object'` | `format: "json"`                   | Map to string                    | Optional            |
| `response_format.schema`              | `format: {...}`                    | Pass schema object               | Optional            |
| `tools` (Chat)                        | `tools`                            | Direct                           | Chat mode only      |

**Dropped Fields** (Holo → Ollama):

- `tool_choice` - Ollama doesn't support explicit tool selection (log warning)
- `service_tier` - Not applicable to local models
- `metadata` - Provider-specific field

**Ollama-Specific Fields** (not in Holo):

- `keep_alive` - Model memory duration (handled via config)
- `options.*` - Runtime-specific hardware options
- `raw` - Skip prompt formatting (Generate mode only)

### Response Mapping: Ollama → Holo

| Ollama Field                       | Holo Field                  | Transformation      | Notes                    |
|------------------------------------|-----------------------------|---------------------|--------------------------|
| **Direct 1:1**                     |                             |                     |                          |
| `model`                            | `model`                     | Direct              | Always present           |
| `message.role` (Chat)              | `messages[0].role`          | Wrap in array       | Always 'assistant'       |
| `message.content` (Chat)           | `messages[0].content`       | Direct              | Text content             |
| `response` (Generate)              | `messages[0].content`       | Wrap in message     | Text content             |
| `message.tool_calls`               | `messages[0].tool_calls`    | Direct              | If present               |
| **Structure Transforms**           |                             |                     |                          |
| N/A                                | `id`                        | Synthesize UUID     | Ollama lacks ID          |
| `created_at`                       | `created`                   | Parse ISO8601 to ms | `Date.parse(created_at)` |
| `done_reason: 'stop'`              | `finish_reason: 'stop'`     | Direct              | Optional                 |
| `done_reason: 'length'`            | `finish_reason: 'length'`   | Direct              | Optional                 |
| `done: true` with no `done_reason` | `finish_reason: 'stop'`     | Default             | Fallback behavior        |
| `prompt_eval_count`                | `usage.input_tokens`        | Rename              | Optional                 |
| `eval_count`                       | `usage.output_tokens`       | Rename              | Optional                 |
| Computed                           | `usage.total_tokens`        | `input + output`    | Derived                  |
| `total_duration` (ns)              | `usage.timings.total`       | Direct              | Optional; nanoseconds    |
| `load_duration` (ns)               | `usage.timings.load`        | Direct              | Optional; nanoseconds    |
| `prompt_eval_duration` (ns)        | `usage.timings.prompt_eval` | Direct              | Optional; nanoseconds    |
| `eval_duration` (ns)               | `usage.timings.eval`        | Direct              | Optional; nanoseconds    |

**ID Synthesis**:

- Ollama responses do NOT include `id` fields
- Translators MUST synthesize UUIDs for all responses and streaming chunks
- For streaming: Generate once at start, reuse across all chunks

**Timestamp Conversion**:

- Ollama: ISO8601 string (e.g., `"2024-01-01T12:00:00Z"`)
- Holo: Milliseconds since epoch (`number`)
- Conversion: `Date.parse(created_at)`

**Finish Reason Mapping**:

| Ollama `done_reason`             | Holo `finish_reason` | Notes              |
|----------------------------------|----------------------|--------------------|
| `'stop'`                         | `'stop'`             | Natural completion |
| `'length'`                       | `'length'`           | Hit token limit    |
| `null` or missing + `done: true` | `'stop'`             | Default fallback   |

### Content Mapping

#### Text Content

```typescript
// Holo
{ type: 'text', text: 'Hello' }

// Ollama Chat (flattened)
{ role: 'user', content: 'Hello' }

// Ollama Generate (string)
{ prompt: 'Hello' }
```

#### Image Content

```typescript
// Holo
{
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image', url: 'https://example.com/image.png' }
  ]
}

// Ollama Chat (extracted to images array)
{
  role: 'user',
  content: 'What is in this image?',
  images: ['https://example.com/image.png']
}

// Ollama Generate (NOT SUPPORTED)
// Images cannot be used in Generate mode
```

#### Tool Calls

```typescript
// Ollama Response (OpenAI-style)
{
    message: {
        role: 'assistant',
            content
    :
        '',
            tool_calls
    :
        [{
            id: 'call_abc',
            type: 'function',
            function: {name: 'get_weather', arguments: {location: 'SF'}}
        }]
    }
}

// Holo Response (direct mapping)
{
    messages: [{
        role: 'assistant',
        content: '',
        tool_calls: [{
            id: 'call_abc',
            type: 'function',
            function: {name: 'get_weather', arguments: {location: 'SF'}}
        }]
    }]
}
```

**Note**: Ollama uses OpenAI-style tool call format, so mapping is direct (no extraction needed).

---

## Dual Mode Support

### Chat Mode vs Generate Mode

Ollama provides two distinct endpoints with different capabilities:

| Feature                  | Chat Mode (`/api/chat`) | Generate Mode (`/api/generate`) |
|--------------------------|-------------------------|---------------------------------|
| **Endpoint**             | `/api/chat`             | `/api/generate`                 |
| **Input**                | `messages[]` array      | `prompt` string                 |
| **Conversation**         | ✅ Multi-turn history    | ❌ Single prompt only            |
| **System Prompt**        | ✅ As first message      | ✅ Top-level field               |
| **Tools**                | ✅ Function calling      | ❌ Not supported                 |
| **Images**               | ✅ Via `images[]`        | ❌ Not supported                 |
| **Context Continuation** | ❌ Use message history   | ✅ Via `context` array           |
| **Use Case**             | Interactive chat        | Single completion               |

### Mode Selection

The plugin automatically selects the appropriate mode based on the request:

```typescript
// Auto-detected as Chat Mode (has tools)
const chatRequest: HoloRequest = {
    model: 'llama2',
    messages: [{role: 'user', content: 'What is the weather?'}],
    tools: [{name: 'get_weather', parameters: {...}}]
};

// Can be either mode (no tools, single message)
const simpleRequest: HoloRequest = {
    model: 'llama2',
    messages: [{role: 'user', content: 'Complete this sentence...'}]
};

// Force Generate Mode via provider config
const generateRequest: HoloRequest = {
    model: 'llama2',
    messages: [{role: 'user', content: 'Complete: Once upon a time'}],
    provider_config: {
        mode: 'generate'  // Force Generate endpoint
    }
};
```

**Default**: Chat mode is preferred unless explicitly configured otherwise.

---

## Streaming

### Frame-Based Streaming

Ollama uses a simpler frame-based streaming model compared to Claude's event-based approach:

#### Streaming Frames

```typescript
// Frame 1: First content
{
  model: 'llama2',
  created_at: '2024-01-01T12:00:00Z',
  message: { role: 'assistant', content: 'Hello' },  // Chat mode
  // response: 'Hello',                              // Generate mode
  done: false
}

// Frame 2: More content
{
  model: 'llama2',
  created_at: '2024-01-01T12:00:01Z',
  message: { role: 'assistant', content: ' there' },
  done: false
}

// Frame 3: Final frame with usage
{
  model: 'llama2',
  created_at: '2024-01-01T12:00:02Z',
  message: { role: 'assistant', content: '!' },
  done: true,
  done_reason: 'stop',
  prompt_eval_count: 10,
  eval_count: 3,
  total_duration: 1500000000  // nanoseconds
}
```

#### Holo Mapping

The plugin translates Ollama frames to Holo streaming events:

| Ollama Frame                   | Holo Event                        | Notes                       |
|--------------------------------|-----------------------------------|-----------------------------|
| First frame (`done: false`)    | `message_start` + `content_delta` | Synthesized by orchestrator |
| Content frames (`done: false`) | `content_delta`                   | Incremental text            |
| Final frame (`done: true`)     | `message_delta` + `message_stop`  | Usage + completion          |

### Streaming Example

```typescript
import { HoloStreamChunk } from '@holokai/sdk';

const stream = await ollamaProvider.streamChat(request);

for await (const chunk: HoloStreamChunk of stream) {
  switch (chunk.delta?.type) {
    case 'message_start':
      console.log('Message started:', chunk.id);
      break;
    case 'content_delta':
      process.stdout.write(chunk.delta.delta.content ?? '');
      break;
    case 'message_delta':
      console.log('Usage:', chunk.usage);
      break;
    case 'message_stop':
      console.log('Complete. Reason:', chunk.finish_reason);
      break;
  }
}
```

---

## Ollama-Specific Features

### Keep Alive

Control how long models stay in memory:

```typescript
const request: HoloRequest = {
  model: 'llama2',
  messages: [{ role: 'user', content: 'Hello' }],
  provider_config: {
    keep_alive: '5m'  // Keep model loaded for 5 minutes
    // or: keep_alive: 300  // 300 seconds
  }
};
```

### Hardware Control

Configure GPU and NUMA settings:

```typescript
const request: HoloRequest = {
  model: 'llama2',
  messages: [{ role: 'user', content: 'Hello' }],
  provider_config: {
    options: {
      num_gpu: 1,        // Number of GPUs to use
      main_gpu: 0,       // Primary GPU index
      numa: true         // Enable NUMA optimization
    }
  }
};
```

### Context Window Override

Override model's default context size:

```typescript
const request: HoloRequest = {
  model: 'llama2',
  messages: [{ role: 'user', content: 'Hello' }],
  provider_config: {
    options: {
      num_ctx: 4096  // Override context window
    }
  }
};
```

### Raw Mode (Generate Only)

Skip prompt formatting in Generate mode:

```typescript
const request: HoloRequest = {
  model: 'llama2',
  messages: [{ role: 'user', content: 'Raw prompt text' }],
  provider_config: {
    mode: 'generate',
    raw: true  // Skip Ollama's prompt template
  }
};
```

---

## Type Safety

### SDK Integration

This plugin uses strict SDK types exclusively:

```typescript
import type {
  HoloRequest,
  HoloResponse,
  HoloMessage,
  HoloTool,
  HoloJsonSchema
} from '@holokai/sdk';

// ❌ NO: Record<string, unknown>
// ✅ YES: Proper SDK types
```

### Migration from Legacy Types

**Before** (Legacy provider):

```typescript
import { HoloTool } from '../../types/holo/requests';

interface HoloTool {
  parameters?: Record<string, unknown>; // ❌ Loose typing
}
```

**After** (Plugin SDK):

```typescript
import type { HoloTool, HoloJsonSchema } from '@holokai/sdk';

interface HoloTool {
  parameters?: HoloJsonSchema; // ✅ Strict JSON Schema Draft 7
}
```

### Type Safety

All interfaces use strict TypeScript types from `@holokai/sdk` for compile-time validation.

---

## Configuration Schema

The plugin exposes a JSON Schema for configuration validation:

```typescript
{
  baseUrl?: string;            // Ollama endpoint (default: http://localhost:11434)
  defaultModel?: string;       // Fallback model (e.g., "llama2")
  allowedModels?: string[];    // Model allowlist
  timeoutMs?: number;          // Request timeout (default: 60000)
  maxRetries?: number;         // Retry attempts (default: 2)
  defaultKeepAlive?: string;   // Default keep_alive ("5m", 300)
  logRequests?: boolean;       // Observability (default: false)
}
```

See [manifest.ts](./src/manifest.ts) for the complete schema.

---

## Development

### Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Type checking
npm run type-check

# Run tests
npm test
```

### Testing

```bash
# Unit tests
npm test

# Integration tests (requires Ollama running)
npm run test:integration

# Watch mode
npm run test:watch
```

### Building

```bash
# Production build
npm run build

# Watch mode
npm run build:watch

# Clean
npm run clean
```

---

## Known Issues & Workarounds

### Missing Response IDs

**Issue**: Ollama responses don't include `id` fields.

**Workaround**: Plugin automatically synthesizes UUIDs for all responses. For streaming, the same ID is used across all
chunks in a session.

### Timestamp Format

**Issue**: Ollama returns timestamps as ISO8601 strings, not milliseconds.

**Workaround**: Plugin automatically converts to milliseconds: `Date.parse(created_at)`.

### Missing Finish Reasons

**Issue**: Some models return `done: true` without `done_reason`.

**Workaround**: Plugin defaults to `finish_reason: 'stop'` when missing.

### Tool Choice Not Supported

**Issue**: Ollama doesn't support explicit `tool_choice` like Claude/OpenAI.

**Behavior**: Plugin logs a warning and ignores `tool_choice` field. Model auto-selects tools when provided.

### Empty Streaming Frames

**Issue**: Ollama may emit empty frames (`content: ""`) during slow tokenization.

**Workaround**: Plugin skips empty frames to avoid emitting no-op events.

---

## Related Documentation

### SDK Documentation

- [SDK README](../sdk/README.md) - Plugin development guide and templates

### Ollama Documentation

- [Official API Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Model Library](https://ollama.com/library)
- [Model Files](https://github.com/ollama/ollama/blob/main/docs/modelfile.md)
- [FAQ](https://github.com/ollama/ollama/blob/main/docs/faq.md)

### Migration Notes

- This plugin was extracted from the monolithic `src/providers/ollama/` codebase
- Migration to plugin architecture is complete

---

## Contributing

### Adding Features

1. Update types in `@holokai/sdk` first (if needed)
2. Implement translator logic
3. Write tests (unit + integration)
4. Update this README

### Reporting Issues

Found a bug or have a feature request?

- GitHub Issues: https://github.com/holokai/holo-provider-ollama/issues
- Include: Holo version, Ollama version, model name, request/response samples

---

## License

MIT © Holokai

---

## Changelog

### v0.1.0 (Current)

- ✅ Initial plugin release
- ✅ Extracted from monolithic architecture
- ✅ Migrated to SDK types
- ✅ Validated against Holo format spec
- ✅ Dual mode support (Chat + Generate)
- ✅ Complete streaming orchestration
- ✅ Tool calling support
- ✅ Vision/multimodal support
- ✅ Local model deployment

---

**Last Updated**: 2025-12-18
**Plugin Version**: 0.1.0
**SDK Version**: ^0.1.0
**Ollama SDK**: ^0.6.3
