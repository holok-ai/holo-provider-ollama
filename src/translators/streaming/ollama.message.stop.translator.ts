import 'reflect-metadata';
import {injectable} from 'tsyringe';
import {OllamaChatResponse, OllamaGenerateResponse} from '../../types';
import {pickDefined} from "@holokai/sdk";
import {StreamTranslator} from "@holokai/sdk/provider";
import type {HoloFinishReason, HoloStreamChunk} from "@holokai/types/holo";

type OllamaStreamResponse = Partial<OllamaChatResponse> | Partial<OllamaGenerateResponse>;

@injectable()
export class OllamaMessageStopTranslator extends StreamTranslator<HoloStreamChunk, OllamaStreamResponse> {
    protected holoDefaults: Partial<HoloStreamChunk> = {};
    protected providerDefaults: Partial<OllamaStreamResponse> = {};

    constructor() {
        super();
    }

    protected async toHoloManyImpl(source: OllamaStreamResponse): Promise<Partial<HoloStreamChunk>[]> {
        // Only emit stop for done chunks
        if (!source.done) return [];

        return [pickDefined({
            delta: {
                provider: 'ollama',
                type: 'message_stop' as const,
                delta: {},
                provider_delta: source
            },
            done: true,
            finish_reason: source.done_reason ? this.mapOllamaFinishReason(source.done_reason) : undefined
        }) as Partial<HoloStreamChunk>];
    }

    protected async fromHoloManyImpl(source: HoloStreamChunk): Promise<Partial<OllamaStreamResponse>[]> {
        const d = source.delta;
        if (!d || d.type !== 'message_stop') return [];

        // Emit final chunk with done=true
        // Note: Usage is handled by message.delta translator, not here
        return [pickDefined({
            message: {
                role: 'assistant' as const,
                content: ""
            },
            done: true as const,
            done_reason: source.finish_reason ? this.mapHoloFinishReasonToOllama(source.finish_reason) : undefined
        }) as Partial<OllamaStreamResponse>];
    }

    private mapOllamaFinishReason(reason?: string): HoloFinishReason | undefined {
        if (!reason) return undefined;

        switch (reason) {
            case 'stop':
                return 'stop';
            case 'length':
                return 'length';
            case 'load':
                return undefined; // Model loading, not a real finish reason
            default:
                return undefined;
        }
    }

    private mapHoloFinishReasonToOllama(reason?: HoloFinishReason | null): string | undefined {
        if (!reason) return undefined;

        switch (reason) {
            case 'stop':
                return 'stop';
            case 'length':
                return 'length';
            case 'tool_calls':
            case 'function_call':
            case 'content_filter':
                // Ollama doesn't have explicit support for these - map to 'stop'
                return 'stop';
            default:
                return undefined;
        }
    }
}