import type {FixtureScenario} from '@holokai/test-harness';
import {LlmStatus} from '@holokai/types/entities';

const chatResponse = {
    model: 'llama3.2',
    created_at: '2024-01-01T00:00:00Z',
    message: {
        role: 'assistant',
        content: 'Hello! How can I help you today?',
    },
    done: true,
    total_duration: 500_000_000,
    load_duration: 100_000_000,
    prompt_eval_count: 10,
    prompt_eval_duration: 50_000_000,
    eval_count: 8,
    eval_duration: 200_000_000,
};

const fixture: FixtureScenario = {
    name: 'ollama/chat-simple.nonstreaming',
    plugin: 'ollama',
    protocol: 'ollama.chat',
    streaming: false,

    providerChunks: [chatResponse],
    expectedText: 'Hello! How can I help you today?',

    expectedWire: [
        JSON.stringify(chatResponse),
    ],
    expectedStatus: 200,
    expectedHeaders: {'Content-Type': 'application/json'},

    expectedAudit: {
        access_model: 'llama3.2',
        input_tokens: 10,
        output_tokens: 8,
        status: LlmStatus.SUCCESS,
    },

    tags: ['chat', 'nonstreaming'],
};

export default fixture;
