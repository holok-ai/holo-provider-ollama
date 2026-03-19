import type {FixtureScenario} from '@holokai/test-harness';
import {ProviderResponseStatus} from '@holokai/types/entities';

const chunk1 = {
    model: 'llama3.2',
    created_at: '2024-01-01T00:00:00Z',
    message: {role: 'assistant', content: 'Hello'},
    done: false,
};

const chunk2 = {
    model: 'llama3.2',
    created_at: '2024-01-01T00:00:01Z',
    message: {role: 'assistant', content: '! How can I help?'},
    done: false,
};

const doneChunk = {
    model: 'llama3.2',
    created_at: '2024-01-01T00:00:02Z',
    message: {role: 'assistant', content: ''},
    done: true,
    total_duration: 500_000_000,
    load_duration: 100_000_000,
    prompt_eval_count: 10,
    prompt_eval_duration: 50_000_000,
    eval_count: 6,
    eval_duration: 200_000_000,
};

const fixture: FixtureScenario = {
    name: 'ollama/chat-simple.streaming',
    plugin: 'ollama',
    protocol: 'ollama.chat',
    streaming: true,

    providerChunks: [chunk1, chunk2, doneChunk],
    expectedText: 'Hello! How can I help?',

    expectedWire: [
        `${JSON.stringify(chunk1)}\n`,
        `${JSON.stringify(chunk2)}\n`,
        `${JSON.stringify(doneChunk)}\n`,
    ],
    expectedStatus: 200,
    expectedHeaders: {
        'Content-Type': 'application/x-ndjson',
    },

    expectedAudit: {
        access_model: 'llama3.2',
        input_tokens: 10,
        output_tokens: 6,
        status: ProviderResponseStatus.SUCCESS,
    },

    tags: ['chat', 'streaming'],
};

export default fixture;
