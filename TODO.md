# Ollama Provider Plugin - Todo List

> **Context**: This plugin was extracted from the monolithic `src/providers/ollama/` architecture as part of the migration to plugin-based providers. This TODO tracks remaining work to complete the migration and achieve full Holo format compliance.

---

## Migration Status

### ✅ Completed

- [x] Extract provider logic from monolith to plugin package
- [x] Create plugin manifest with configuration schema
- [x] Migrate to `@holokai/sdk` imports
- [x] Implement `ProviderPlugin` contract
- [x] Add auto-discovery support
- [x] Preserve dual mode support (Chat + Generate)
- [x] Maintain streaming orchestration logic
- [x] Document complete Holo format mappings in README

### 🔄 In Progress

- [ ] Complete SDK type migration (#SDK-1)
- [ ] Fix ID synthesis across all translators (#CRITICAL-1)
- [ ] Fix timestamp conversions (#CRITICAL-2, #CRITICAL-3)
- [ ] Implement message_start emission (#STREAM-1)
- [ ] Add finish_reason defaulting (#CRITICAL-4)

---

## High Priority (P0 - Critical)

### #CRITICAL-1: Synthesize ID Field in All Response Translators

**Files**:
- `src/translators/ollama.chat.response.translator.ts`
- `src/translators/ollama.generate.response.translator.ts`
- `src/translators/streaming/ollama.content.delta.translator.ts`
- `src/translators/streaming/ollama.message.delta.translator.ts`
- `src/translators/streaming/ollama.message.stop.translator.ts`

**Issue**: Ollama responses lack stable `id` fields. Per [SDK Provider Mappings](../../packages/sdk/docs/PROVIDER_MAPPINGS.md#ollama--holo-responses), translators MUST synthesize UUIDs.

**Required Action**:

```typescript
import { randomUUID } from 'crypto';

// In toHoloImpl/toHoloManyImpl:
const holoResponse: HoloResponse = {
    id: randomUUID(),  // Synthesize UUID
    model: source.model,
    created: source.created_at ? Date.parse(source.created_at) : undefined,
    messages: [/* ... */],
    // ...
};
```

**Streaming Consideration**:
- Generate ID at stream start
- Reuse same ID across all chunks in session
- Requires state tracking or passing ID through context

**Reference**: [SDK Provider Mappings - Ollama ID Synthesis](../../packages/sdk/docs/PROVIDER_MAPPINGS.md#ollama--holo-responses)

**Impact**: HoloResponse/HoloStreamChunk missing required `id` field

**Priority**: P0 (Critical)

---

### #CRITICAL-2: Fix Timestamp Conversion in Generate Response Translator

**File**: `src/translators/ollama.generate.response.translator.ts`
**Line**: ~98

**Issue**: Passes ISO8601 string directly instead of converting to milliseconds.

**Current Code**:
```typescript
created: source.created_at  // ❌ String, not number
```

**Required Fix**:
```typescript
created: source.created_at ? Date.parse(source.created_at) : undefined  // ✅ Milliseconds
```

**Reference**: [SDK Provider Mappings - Timestamp Normalization](../../packages/sdk/docs/PROVIDER_MAPPINGS.md#ollama--holo-responses)

**Note**: Chat response translator already correctly uses `new Date(source.created_at).getTime()` ✓

**Impact**: Timestamp type mismatch; consumers expect milliseconds per Holo spec

**Priority**: P0 (Critical)

---

### #CRITICAL-3: Add Timestamp Extraction in All Streaming Translators

**Files**:
- `src/translators/streaming/ollama.content.delta.translator.ts`
- `src/translators/streaming/ollama.message.delta.translator.ts`
- `src/translators/streaming/ollama.message.stop.translator.ts`

**Issue**: Streaming translators don't extract or convert `created_at` timestamps.

**Required Action**: Add to all streaming translators' `toHoloManyImpl`:

```typescript
{
    id: /* synthesized or reused */,
    model: source.model,
    created: source.created_at ? Date.parse(source.created_at) : undefined,  // ✅ Convert to ms
    delta: { /* ... */ }
}
```

**Reference**: [SDK Capability Analysis - Timestamp Normalization](../../packages/sdk/docs/CAPABILITY_ANALYSIS.md#timestamp-normalization)

**Impact**: Missing timestamps in streaming events

**Priority**: P0 (Critical)

---

### #CRITICAL-4: Default finish_reason to 'stop' When Missing

**Files**:
- `src/translators/ollama.chat.response.translator.ts`
- `src/translators/ollama.generate.response.translator.ts`
- `src/translators/streaming/ollama.message.delta.translator.ts`
- `src/translators/streaming/ollama.message.stop.translator.ts`

**Issue**: Per [SDK Provider Mappings](../../packages/sdk/docs/PROVIDER_MAPPINGS.md#ollama--holo-responses), should default to `'stop'` when `done=true && !done_reason`. Current mappers return `null` for missing reasons.

**Required Action**: Modify `mapFinishReasonToHolo` methods:

```typescript
private mapFinishReasonToHolo(
    doneReason: string | null | undefined,
    done: boolean
): HoloFinishReason | null {
    if (!doneReason) {
        // Default to 'stop' when done=true but done_reason is missing
        return done ? 'stop' : null;
    }

    switch (doneReason) {
        case 'stop': return 'stop';
        case 'length': return 'length';
        default:
            this.mlog(this.mapFinishReasonToHolo).warn(
                'Unknown done_reason from Ollama',
                { doneReason }
            );
            return null;
    }
}
```

**Reference**: [SDK Provider Mappings - Finish Reason Mapping](../../packages/sdk/docs/PROVIDER_MAPPINGS.md#finish-reason-mappings)

**Impact**: Missing finish_reason in completed responses

**Priority**: P0 (Critical)

---

### #CRITICAL-5: Add Warning Log for Unsupported tool_choice

**File**: `src/translators/ollama.chat.request.translator.ts`

**Issue**: Per README, Ollama doesn't support `tool_choice`. Should log warning when provided.

**Required Action**: Add in `fromHoloImpl`:

```typescript
if (source.tool_choice) {
    const logger = this.mlog(this.fromHoloImpl);
    logger.warn(
        'Ollama does not support tool_choice; model will auto-select tools',
        { tool_choice: source.tool_choice, model: source.model }
    );
}
```

**Reference**: [SDK Provider Mappings - Tool Choice](../../packages/sdk/docs/PROVIDER_MAPPINGS.md#tool-choice)

**Impact**: Observability for debugging; users unaware feature is unsupported

**Priority**: P0 (User Experience)

---

## High Priority (P1)

### #STREAM-1: Implement message_start Emission on First Frame

**File**: `src/translators/streaming/ollama.stream.translator.ts`
**Lines**: ~30-56 (`toHoloManyImpl`)

**Issue**: Per [SDK Provider Mappings](../../packages/sdk/docs/PROVIDER_MAPPINGS.md#streaming-mappings), orchestrator must emit `message_start` on first frame. Ollama has no explicit start event.

**Problem**: Orchestrator is currently stateless, cannot track "first frame".

**Required Action** (Stateful Orchestrator):

```typescript
export class OllamaStreamTranslator extends BaseStreamTranslator {
    private sessionState = new Map<string, {
        id: string;
        hasEmittedStart: boolean;
    }>();

    protected async toHoloManyImpl(source: OllamaStreamChunk): Promise<Partial<HoloStreamChunk>[]> {
        const results: Partial<HoloStreamChunk>[] = [];

        // Generate or reuse session ID
        const sessionKey = this.getSessionKey(source);
        if (!this.sessionState.has(sessionKey)) {
            this.sessionState.set(sessionKey, {
                id: randomUUID(),
                hasEmittedStart: false
            });
        }

        const session = this.sessionState.get(sessionKey)!;

        // Emit message_start on first content frame
        if (!source.done && !session.hasEmittedStart) {
            results.push({
                id: session.id,
                model: source.model,
                created: source.created_at ? Date.parse(source.created_at) : undefined,
                delta: {
                    provider: 'ollama',
                    type: 'message_start',
                    delta: { role: 'assistant' },
                    provider_delta: source
                }
            });
            session.hasEmittedStart = true;
        }

        // Clean up on completion
        if (source.done) {
            this.sessionState.delete(sessionKey);
        }

        // Continue with existing logic...
        return results;
    }

    private getSessionKey(source: OllamaStreamChunk): string {
        // Generate key from model + timestamp or other unique identifier
        return `${source.model}-${/* session identifier */}`;
    }
}
```

**Architecture Decision Needed**:
- Violates "stateless translator" principle
- Alternative: Handle at higher layer (WorkerServer)
- Need to decide: Are streaming orchestrators exempt from statelessness?

**Reference**:
- [SDK Streaming Docs](../../packages/sdk/docs/README.md#streaming)
- [Provider Mappings - Ollama Streaming](../../packages/sdk/docs/PROVIDER_MAPPINGS.md#ollama-streaming-completion)

**Impact**: Missing `message_start` event; consumers expect it per Holo spec

**Priority**: P1 (Architecture)

---

### #SDK-1: Complete SDK Type Migration

**Files**: Multiple translator files

**Status**: 🔄 In Progress

**Priority**: P1

**Current State**:
- Plugin imports from `@holokai/sdk` for public APIs
- Internal translators may still use legacy type patterns
- Need audit of all `Record<string, unknown>` instances

**Required Actions**:

1. **Audit all type usages**:
   ```bash
   grep -r "Record<string, unknown>" src/
   grep -r ": any" src/
   ```

2. **Replace with SDK types**:
   - Tool parameters: Use `HoloJsonSchema` instead of `Record<string, unknown>`
   - Tool arguments: Use `HoloFunctionArguments` instead of flexible types
   - All Holo types: Import from `@holokai/sdk`

3. **Update validators** to match SDK types

**Reference**: [SDK Capability Analysis - Type Safety](../../packages/sdk/docs/CAPABILITY_ANALYSIS.md#type-safety-analysis)

**Impact**: Critical for type safety compliance with Holo spec

---

### #TEST-1: Add Comprehensive Validation Tests

**Status**: ❌ Not Started
**Priority**: P1

**Current State**:
- Basic unit tests exist
- No comprehensive SDK validation tests
- No round-trip translation tests
- No dual-mode translation tests

**Required Actions**:

1. **Add SDK compliance tests**:
   ```typescript
   describe('SDK Type Compliance', () => {
     it('should use HoloJsonSchema for tool parameters', () => {
       // Verify no Record<string, unknown>
     });

     it('should synthesize IDs for all responses', () => {
       // Verify UUID generation
     });

     it('should convert timestamps to milliseconds', () => {
       // Verify Date.parse() usage
     });
   });
   ```

2. **Add round-trip tests**:
   ```typescript
   describe('Round-Trip Translation', () => {
     it('should preserve core fields: Holo → Ollama Chat → Holo', () => {
       const original: HoloRequest = { /* ... */ };
       const ollama = translator.fromHolo(original);
       const roundTrip = translator.toHolo(ollama);
       expect(roundTrip).toMatchObject(original);
     });

     it('should drop Ollama-specific fields gracefully', () => {
       // Verify keep_alive, context, etc. don't leak to Holo
     });
   });
   ```

3. **Add dual-mode tests**:
   ```typescript
   describe('Dual Mode Support', () => {
     it('should translate to Chat mode when tools present', () => {
       // Test Chat endpoint selection
     });

     it('should translate to Generate mode when configured', () => {
       // Test Generate endpoint selection
     });

     it('should reject tools in Generate mode', () => {
       // Test validation
     });
   });
   ```

4. **Add validation tests per SDK docs**:
   - See [SDK README Testing Section](../../packages/sdk/docs/README.md#testing)
   - Verify all mappings from [Provider Mappings](../../packages/sdk/docs/PROVIDER_MAPPINGS.md)

**Impact**: Confidence in migration completeness and SDK compliance

---

## Medium Priority (P2)

### #CONFIG-1: Validate Plugin Configuration Against Manifest Schema

**File**: `src/plugin.ts`
**Status**: ❌ Not Started
**Priority**: P2

**Required Actions**:
- Add runtime validation of plugin config against manifest.configSchema
- Throw descriptive errors for invalid configurations
- Add tests for config validation

**Example**:
```typescript
import Ajv from 'ajv';
import { manifest } from './manifest';

const ajv = new Ajv();
const validateConfig = ajv.compile(manifest.configSchema);

export class OllamaProviderPlugin {
  constructor(config: unknown) {
    if (!validateConfig(config)) {
      throw new ConfigurationError(validateConfig.errors);
    }
    // ...
  }
}
```

---

### #REFACTOR-1: Centralize Options Translation

**File**: `src/translators/ollama.options.translator.ts` (if exists)

**Issue**: Options mapping (`temperature`, `top_p`, `top_k`, etc.) scattered across request translators.

**Current State**:
- Generate request translator: Maps options directly ✓
- Chat request translator: May have inconsistent mapping

**Required Action**:
- Centralize all option mappings in one utility
- OR: Document intentional pattern and enforce consistency

**Impact**: Architectural consistency, easier maintenance

**Priority**: P2 (Refactoring)

---

### #DOC-1: Align README with SDK Mappings

**File**: `README.md`
**Status**: ✅ **COMPLETED** (2025-12-18)
**Priority**: P2

**Actions Taken**:
- ✅ Added complete Holo format mapping tables
- ✅ Referenced SDK documentation
- ✅ Documented migration from monolith
- ✅ Added type safety migration examples
- ✅ Cross-referenced Provider Mappings docs
- ✅ Documented dual mode support
- ✅ Added finish reason mapping table
- ✅ Documented streaming orchestration
- ✅ Added known issues and workarounds

---

### #FEAT-1: Add Integration Tests with Real Ollama

**Status**: ❌ Not Started
**Priority**: P2

**Required Actions**:
1. Add `tests/integration/` directory
2. Implement real Ollama tests:
   ```typescript
   describe('Ollama API Integration', () => {
     it('should complete chat request', async () => {
       // Requires Ollama running locally
     });

     it('should stream responses', async () => {
       // Test real streaming
     });

     it('should handle tool calls', async () => {
       // Test function calling
     });

     it('should work in generate mode', async () => {
       // Test Generate endpoint
     });
   });
   ```
3. Add CI/CD integration with local Ollama setup

---

## Low Priority (P3)

### #DOC-2: Document Context Continuation Pattern (Generate Mode)

**Status**: ❌ Not Started
**Priority**: P3

**Issue**: Generate mode `context` array is mentioned but usage pattern not fully documented.

**Required Actions**:
- Document how to preserve `context` between Generate requests
- Show examples of stateful continuation
- Clarify that this is NOT part of Holo format (out-of-band state)

---

### #DOC-3: Add Architecture Decision Record for Stateful vs Stateless Orchestrators

**Status**: ❌ Not Started
**Priority**: P3

**Issue**: Tension between stateless translator principle and `message_start` requirement.

**Required Actions**:
- Document architectural decision
- Either: Relax stateless requirement for streaming orchestrators
- Or: Handle `message_start` emission at higher layer
- Update ARCHITECTURE.md with clarification

**Impact**: Clarity for future contributors

---

## Completed Items (Archive)

### ~~Empty Frame Handling~~ ✅

**Status**: ✅ Working as expected
**Location**: `src/translators/streaming/ollama.content.delta.translator.ts`

Correctly skips frames with empty content to avoid no-op events.

### ~~Image Extraction~~ ✅

**Status**: ✅ Working as expected
**Location**: `src/translators/ollama.message.translator.ts`

Correctly extracts images to `messages[].images` array for Chat mode.

### ~~Dual Mode Support~~ ✅

**Status**: ✅ Working as expected

Separate chat and generate translators properly handle mode detection.

### ~~provider_delta Preservation~~ ✅

**Status**: ✅ Working as expected

All streaming translators include `provider_delta: source` for round-trip fidelity.

---

## Notes

### Migration Philosophy

This plugin maintains the core translation logic from the monolithic architecture while:
1. ✅ Using SDK types exclusively for public contracts
2. ✅ Implementing plugin discovery and lifecycle
3. ✅ Providing independent versioning
4. 🔄 Achieving full SDK compliance (in progress)

### SDK Compliance Checklist

- [x] Uses `@holokai/sdk` imports
- [ ] No `Record<string, unknown>` in production paths (#SDK-1)
- [ ] No `any` types in production paths (#SDK-1)
- [ ] ID synthesis in all responses (#CRITICAL-1)
- [ ] Timestamp conversion to ms (#CRITICAL-2, #CRITICAL-3)
- [ ] Finish reason defaulting (#CRITICAL-4)
- [ ] Full round-trip testing (#TEST-1)
- [ ] Streaming message_start emission (#STREAM-1)
- [ ] Config validation (#CONFIG-1)

### Reference Documentation

**Primary**:
- [SDK Provider Mappings](../../packages/sdk/docs/PROVIDER_MAPPINGS.md) - Authoritative mapping reference
- [SDK Capability Analysis](../../packages/sdk/docs/CAPABILITY_ANALYSIS.md) - Type safety requirements
- [SDK Holo Format](../../packages/sdk/docs/HOLO_FORMAT.md) - Format specification

**Legacy** (Archived):
- `src/providers/docs/archive/` - Original monolithic provider docs
- Use SDK docs as source of truth; legacy docs for historical context only

---

## Contributing

When picking up a task:
1. Check SDK documentation first for latest guidance
2. Write tests before implementation
3. Update README.md if adding features
4. Ensure all types come from `@holokai/sdk`
5. Add integration tests for user-facing changes

---

**Last Updated**: 2025-12-18
**Plugin Version**: 0.1.0
**SDK Version**: ^0.1.0
**Ollama SDK**: ^0.6.3
