import type {FixtureScenario} from '@holokai/holo-test';
import {ProviderResponseStatus} from '@holokai/holo-types/entities';

const chatResponse = {
    model: 'llama3.2',
    created_at: '2024-01-01T00:00:00Z',
    message: {
        role: 'assistant',
        content: '',
        tool_calls: [
            {
                function: {
                    name: 'calculate',
                    arguments: {expression: '2 + 2'},
                },
            }
        ],
    },
    done: true,
    total_duration: 500_000_000,
    load_duration: 100_000_000,
    prompt_eval_count: 50,
    prompt_eval_duration: 50_000_000,
    eval_count: 20,
    eval_duration: 200_000_000,
};

const fixture: FixtureScenario = {
    name: 'ollama/chat-toolcall.nonstreaming',
    plugin: 'ollama',
    protocol: 'ollama.chat',
    streaming: false,

    providerChunks: [chatResponse],
    expectedText: '',

    expectedWire: [
        JSON.stringify(chatResponse),
    ],
    expectedStatus: 200,
    expectedHeaders: {'Content-Type': 'application/json'},

    expectedAudit: {
        access_model: 'llama3.2',
        input_tokens: 50,
        output_tokens: 20,
        status: ProviderResponseStatus.SUCCESS,
    },

    tags: ['chat', 'nonstreaming', 'tool_call'],
};

export default fixture;
