import type {PluginPricingSheet} from '@holokai/holo-types/plugin';

export const OLLAMA_DEFAULT_PRICING: PluginPricingSheet = {
    name: 'Ollama Local 2026-03',
    version: '2026-03',
    effective_from: '2026-03-01',
    models: [
        ...[
            'llama3:latest', 'llama-3.3-70b-instruct', 'llama3.3:70b-instruct-q4_0',
            'meta-llama-3.1-8b-instruct',

            'gemma3:latest', 'gemma3:12b', 'gemma3:27b',
            'gemma-3-1b-it', 'gemma-3-12b-it', 'gemma-3-27b-it',

            'mistral:latest', 'mistral-7b-instruct-v0.3', 'mistral-nemo-instruct-2407',
            'mistral-small-3.1-24b-instruct-2503', 'mistral-small:24b-instruct-2501-q8_0',

            'qwq-32b', 'qwen3-coder-30b-a3b-instruct-mlx', 'qwen/qwen3-next-80b',

            'nomic-embed-text:latest', 'text-embedding-nomic-embed-text-v1.5',
        ].map(m => ({model_name: m, input_cost: 0, output_cost: 0})),
    ]
};
