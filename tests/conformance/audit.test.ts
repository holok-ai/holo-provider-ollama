import {describe, it} from 'vitest';
import {runAuditContract} from '@holokai/holo-test';
import chatStreaming from '../fixtures/chat-simple.streaming.fixture';
import chatNonStreaming from '../fixtures/chat-simple.nonstreaming.fixture';
import toolcallNonStreaming from '../fixtures/chat-toolcall.nonstreaming.fixture';

const fixtures = [chatStreaming, chatNonStreaming, toolcallNonStreaming];

describe('ollama audit conformance', () => {
    for (const fixture of fixtures) {
        it(fixture.name, () => runAuditContract('ollama', fixture));
    }
});
