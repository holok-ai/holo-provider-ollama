import {describe, it} from 'vitest';
import {runWireContract} from '@holokai/holo-test';
import chatStreaming from '../fixtures/chat-simple.streaming.fixture.js';
import chatNonStreaming from '../fixtures/chat-simple.nonstreaming.fixture.js';
import toolcallNonStreaming from '../fixtures/chat-toolcall.nonstreaming.fixture.js';

const fixtures = [chatStreaming, chatNonStreaming, toolcallNonStreaming];

describe('ollama wire conformance', () => {
    for (const fixture of fixtures) {
        it(fixture.name, () => runWireContract('ollama', fixture));
    }
});
