# @holokai/provider-ollama

Ollama provider plugin for Holo LLM Gateway.

## Installation

```bash
npm install @holokai/provider-ollama
```

## Usage

This plugin is automatically discovered and loaded by the Holo plugin system when installed in a Holo worker environment.

## Provider Configuration

```json
{
  "provider_type": "ollama",
  "plugin_id": "@holokai/provider-ollama",
  "base_url": "http://localhost:11434",
  "model": "llama2"
}
```

## Capabilities

- Chat completions
- Streaming responses
- Local model support

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run integration tests
npm run test:integration
```

## License

MIT
