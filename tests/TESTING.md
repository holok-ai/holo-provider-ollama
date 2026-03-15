# Ollama Plugin Test Fixtures

## Wire Formats

### Chat (`ollama.chat`)

**Non-streaming:** Single JSON body, `Content-Type: application/json`

```
{"model":"llama3.2","message":{"role":"assistant","content":"Hello"},"done":true,"prompt_eval_count":10,"eval_count":8,...}
```

**Streaming:** NDJSON (newline-delimited JSON), `Content-Type: application/x-ndjson`

```
{"model":"llama3.2","message":{"role":"assistant","content":"Hello"},"done":false}\n
{"model":"llama3.2","message":{"role":"assistant","content":" world"},"done":false}\n
{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true,"prompt_eval_count":10,"eval_count":6,...}\n
```

Ollama is the only plugin that uses NDJSON instead of SSE for streaming. Each line is a complete JSON object followed by
`\n`.

### Generate (`ollama.generate`)

Same wire format as chat, but the response has `response` (string) instead of `message` (object).

## Audit Token Mapping

| Source                                         | Field                   | Notes                      |
|------------------------------------------------|-------------------------|----------------------------|
| `prompt_eval_count`                            | `input_tokens`          |                            |
| `eval_count`                                   | `output_tokens`         |                            |
| `load_duration + prompt_eval_duration` (ns→ms) | `time_to_first_token`   | Converted from nanoseconds |
| `total_duration` (ns→ms)                       | `total_processing_time` | Converted from nanoseconds |

Ollama does not have extra token categories (no caching).

## Audit Status Mapping

| Condition   | LlmStatus |
|-------------|-----------|
| Done event  | `SUCCESS` |
| Error event | `ERROR`   |

## Adding a New Fixture

1. Create `tests/fixtures/{scenario}.{streaming|nonstreaming}.fixture.ts`
2. Use protocol `ollama.chat` for chat or `ollama.generate` for generate
3. Build `expectedWire`:
    - Non-streaming: `JSON.stringify(response)` with `application/json`
    - Streaming: each chunk → `${JSON.stringify(chunk)}\n` with `application/x-ndjson`
4. Add `expectedAudit` — token counts from `prompt_eval_count` and `eval_count`

### Duration Fields

Ollama reports durations in **nanoseconds**. The final streaming chunk (or the non-streaming response) includes:

- `total_duration` — total time including model loading
- `load_duration` — time to load model
- `prompt_eval_duration` — time to process the prompt
- `eval_duration` — time to generate the response

### Capturing Real Responses

```bash
# Non-streaming
curl http://localhost:11434/api/chat -d '{"model":"llama3.2","messages":[{"role":"user","content":"Hello"}],"stream":false}'

# Streaming (each line is a separate JSON object)
curl http://localhost:11434/api/chat -d '{"model":"llama3.2","messages":[{"role":"user","content":"Hello"}]}'
```

## Existing Fixtures

| Fixture                    | Protocol | Streaming | Round-trip |
|----------------------------|----------|-----------|------------|
| `chat-simple.nonstreaming` | chat     | no        | no         |
| `chat-simple.streaming`    | chat     | yes       | no         |

### Missing Coverage

- Generate protocol (`ollama.generate`)
- Error responses (model not found, timeout)
- Tool calling
- Embeddings protocol (`ollama.embed`)
- SDK round-trip adapter (Ollama HTTP client)
