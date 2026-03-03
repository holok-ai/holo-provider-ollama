import 'reflect-metadata';
import {injectable} from 'tsyringe';
import {OllamaChatResponse, OllamaGenerateResponse} from '../../types';
import {StreamTranslator} from "@holokai/sdk/provider";
import {pickDefined} from "@holokai/sdk";
import type {HoloStreamChunk} from "@holokai/types/holo";

type OllamaStreamResponse = Partial<OllamaChatResponse> | Partial<OllamaGenerateResponse>;

@injectable()
export class OllamaContentDeltaTranslator extends StreamTranslator<HoloStreamChunk, OllamaStreamResponse> {
    protected holoDefaults: Partial<HoloStreamChunk> = {};
    protected providerDefaults: Partial<OllamaStreamResponse> = {};

    constructor() {
        super();
    }

    protected async toHoloManyImpl(source: OllamaStreamResponse): Promise<Partial<HoloStreamChunk>[]> {
        // Stateless - just map content if present

        // Determine if this is a chat or generate response
        const isChat = 'message' in source;

        // Extract text content based on format
        const content = isChat
            ? (source as any).message?.content
            : (source as any).response;

        // Only emit if there's actual text content
        if (typeof content === 'string' && content.length > 0) {
            return [{
                delta: {
                    provider: 'ollama',
                    type: 'content_delta' as const,
                    delta: {
                        content: content
                    },
                    provider_delta: source
                }
            }];
        }

        return [];
    }

    protected async fromHoloManyImpl(source: HoloStreamChunk): Promise<Partial<OllamaStreamResponse>[]> {
        const d = source.delta;
        if (!d || d.type !== 'content_delta') return [];

        if (typeof d.delta?.content === 'string') {
            // Need context to know if this should be chat or generate format
            // Check for role to determine format
            if (d.delta?.role) {
                // Chat format
                return [pickDefined({
                    message: {
                        role: 'assistant' as const,
                        content: d.delta.content
                    },
                    done: false
                }) as Partial<OllamaStreamResponse>];
            } else {
                // Generate format
                return [pickDefined({
                    response: d.delta.content,
                    done: false
                }) as Partial<OllamaStreamResponse>];
            }
        }

        return [];
    }
}