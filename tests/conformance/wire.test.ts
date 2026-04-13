import {describe, it} from 'vitest';
import {runWireContract} from '@holokai/holo-test';
import chatStreaming from '../fixtures/chat-simple.streaming.fixture';
import chatNonStreaming from '../fixtures/chat-simple.nonstreaming.fixture';
import toolcallNonStreaming from '../fixtures/chat-toolcall.nonstreaming.fixture';

const fixtures = [chatStreaming, chatNonStreaming, toolcallNonStreaming];

describe('ollama wire conformance', () => {
    for (const fixture of fixtures) {
        it(fixture.name, () => runWireContract('ollama', fixture));
    }
});
