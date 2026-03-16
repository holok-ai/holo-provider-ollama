import {describe, it} from 'vitest';
import {runAuditContract} from '@holokai/test-utils';
import chatStreaming from '../fixtures/chat-simple.streaming.fixture.js';
import chatNonStreaming from '../fixtures/chat-simple.nonstreaming.fixture.js';

const fixtures = [chatStreaming, chatNonStreaming];

describe('ollama audit conformance', () => {
    for (const fixture of fixtures) {
        it(fixture.name, () => runAuditContract('ollama', fixture));
    }
});
