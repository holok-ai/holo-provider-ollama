import 'reflect-metadata';
import {injectable} from 'tsyringe';
import {OllamaChatResponse, OllamaGenerateResponse} from '../../types';
import {OllamaContentDeltaTranslator} from './ollama.content.delta.translator';
import {OllamaMessageDeltaTranslator} from './ollama.message.delta.translator';
import {OllamaMessageStopTranslator} from './ollama.message.stop.translator';
import {StreamTranslator} from "@holokai/sdk/provider";
import type {HoloStreamChunk} from "@holokai/types/holo";

// Union type for Ollama streaming responses (partials with done flag)
type OllamaStreamResponse = Partial<OllamaChatResponse> | Partial<OllamaGenerateResponse>;

@injectable()
export class OllamaStreamTranslator extends StreamTranslator<HoloStreamChunk, OllamaStreamResponse> {
    protected holoDefaults: Partial<HoloStreamChunk> = {};
    protected providerDefaults: Partial<OllamaStreamResponse> = {};

    constructor(
        private readonly contentDeltaTranslator: OllamaContentDeltaTranslator,
        private readonly messageDeltaTranslator: OllamaMessageDeltaTranslator,
        private readonly messageStopTranslator: OllamaMessageStopTranslator
    ) {
        super();
    }

    protected async toHoloManyImpl(source: OllamaStreamResponse): Promise<Partial<HoloStreamChunk>[]> {
        const results: Partial<HoloStreamChunk>[] = [];

        // Non-final chunks
        if (!source.done) {
            // 1) Content deltas first
            results.push(...await this.contentDeltaTranslator.toHoloMany(source));

            // 2) Tool calls if present (chat-only)
            const isChat = 'message' in source;
            const toolCalls = isChat ? (source as any).message?.tool_calls : undefined;
            if (Array.isArray(toolCalls) && toolCalls.length > 0) {
                // Message delta translator will handle tool calls
                results.push(...await this.messageDeltaTranslator.toHoloMany(source));
            }
        }

        // Final chunk: emit usage/metrics and stop
        if (source.done) {
            // Message delta for usage and any final tool calls
            results.push(...await this.messageDeltaTranslator.toHoloMany(source));
            // Message stop for completion
            results.push(...await this.messageStopTranslator.toHoloMany(source));
        }

        return results;
    }

    protected async fromHoloManyImpl(source: HoloStreamChunk): Promise<Partial<OllamaStreamResponse>[]> {
        const d = source.delta;
        if (!d) return [];

        // Fast pass-through for Ollama→Ollama streaming
        if (d.provider === 'ollama' && d.provider_delta) {
            return [d.provider_delta];
        }

        // Route based on delta type
        switch (d.type) {
            case 'message_start':
                // No-op: Ollama has no equivalent to message_start
                return [];

            case 'content_delta':
                return this.contentDeltaTranslator.fromHoloMany(source);

            case 'message_delta':
                return this.messageDeltaTranslator.fromHoloMany(source);

            case 'message_stop':
                return this.messageStopTranslator.fromHoloMany(source);

            default:
                return [];
        }
    }
}