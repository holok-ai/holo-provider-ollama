import {describe, it} from 'vitest';
import {runWireContract} from '@holokai/test-utils';
import chatStreaming from '../fixtures/chat-simple.streaming.fixture.js';
import chatNonStreaming from '../fixtures/chat-simple.nonstreaming.fixture.js';

const fixtures = [chatStreaming, chatNonStreaming];

describe('ollama wire conformance', () => {
    for (const fixture of fixtures) {
        it(fixture.name, () => runWireContract('ollama', fixture));
    }
});
