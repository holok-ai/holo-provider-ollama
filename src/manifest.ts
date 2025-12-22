import {PluginManifest} from "@holokai/sdk";

export const manifest: PluginManifest = {
    // Required identity
    name: '@holokai/provider-ollama',
    family: 'ollama',
    version: '1.0.0',
    pluginType: 'provider',
    displayName: 'Ollama',
    description: 'First-party Ollama provider plugin for Holokai, providing local LLM support via the Holo universal format.',

    // Optional metadata
    author: {
        name: 'Holokai Team',
        url: 'https://holok.ai'
    },
    license: 'MIT',
    homepage: 'https://holok.ai/docs/providers/ollama',
    repository: {
        type: 'git',
        url: 'https://github.com/holokai/holokai',
        directory: 'packages/provider-ollama'
    },
    bugs: {
        url: 'https://github.com/holokai/holokai/issues'
    },
    keywords: [
        'holokai',
        'holo',
        'ollama',
        'provider',
        'llm',
        'local',
        'chat-completions',
        'streaming'
    ],

    // Engine / dependency requirements
    engineVersion: '>=1.0.0 <2.0.0',
    peerDependencies: {
        '@holokai/sdk': '^1.0.0'
    },
    dependencies: {
        ollama: '^0.6.3'
    },

    // Plugin-level capabilities
    capabilities: {
        supportsStreaming: true,
        supportsHotReload: true,
        supportsAsync: true,
        supportsBatching: false,
        supportsDistributed: true
    },

    // Permissions (what the host must allow)
    permissions: ['network'],

    // Configuration schema (what the operator configures for this plugin)
    configSchema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        title: 'Ollama Provider Configuration',
        description:
            'Configuration for the @holokai/provider-ollama plugin. Used by Holokai to connect to a local or remote Ollama instance.',
        properties: {
            baseUrl: {
                type: 'string',
                description:
                    'Base URL for the Ollama instance (e.g., "http://localhost:11434").',
                format: 'uri',
                default: 'http://localhost:11434'
            },
            defaultModel: {
                type: 'string',
                description:
                    'Default Ollama model to use when no model is specified in the HoloRequest (e.g., "llama2", "mistral").'
            },
            allowedModels: {
                type: 'array',
                description:
                    'Optional allowlist of Ollama model names that this plugin may use. If set, all requests will be validated against this list.',
                items: {
                    type: 'string'
                },
                uniqueItems: true
            },
            timeoutMs: {
                type: 'integer',
                description:
                    'Default request timeout in milliseconds for Ollama calls.',
                minimum: 1000,
                maximum: 600000,
                default: 120000
            },
            maxRetries: {
                type: 'integer',
                description:
                    'Maximum number of retry attempts for transient Ollama errors.',
                minimum: 0,
                maximum: 10,
                default: 2
            },
            logRequests: {
                type: 'boolean',
                description:
                    'If true, log summarized request/response metadata for observability.',
                default: false
            },
            telemetrySampleRate: {
                type: 'number',
                description:
                    'Sampling rate (0.0–1.0) for sending telemetry events related to this provider.',
                minimum: 0,
                maximum: 1,
                default: 1
            }
        },
        required: ['baseUrl'],
        additionalProperties: false
    },

    // Marketplace metadata
    category: 'ai-providers',
    screenshots: [
        'https://holok.ai/assets/screenshots/provider-ollama-1.png'
    ],
    changelog: 'https://holok.ai/docs/providers/ollama/changelog',

    pricing: {
        model: 'free',
        price: 0,
        currency: 'USD',
        billingPeriod: 'one-time'
    },

    support: {
        email: 'support@holok.ai',
        documentation: 'https://holok.ai/docs/providers/ollama'
    },

    // Upgrade semantics
    upgradeFrom: '>=1.0.0',

    // Entrypoints
    main: 'dist/index.js',
    types: 'dist/index.d.ts',

    // Custom metadata for host/runtime
    custom: {
        // Used by the host/plugin loader to auto-wire this plugin
        providerKind: 'ollama',
        // Hints for the host UI
        recommendedDefaultModel: 'llama2'
    }
};
