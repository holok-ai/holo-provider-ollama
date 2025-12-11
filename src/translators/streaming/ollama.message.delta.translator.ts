import 'reflect-metadata';
import {injectable} from 'tsyringe';
import {OllamaChatResponse, OllamaGenerateResponse} from '../../types';
import {HoloFinishReason, HoloStreamChunk, pickDefined} from "@holokai/sdk";
import {StreamTranslator} from "@holokai/sdk/provider";

type OllamaStreamResponse = Partial<OllamaChatResponse> | Partial<OllamaGenerateResponse>;

@injectable()
export class OllamaMessageDeltaTranslator extends StreamTranslator<HoloStreamChunk, OllamaStreamResponse> {
    protected holoDefaults: Partial<HoloStreamChunk> = {};
    protected providerDefaults: Partial<OllamaStreamResponse> = {};

    constructor() {
        super();
    }

    protected async toHoloManyImpl(source: OllamaStreamResponse): Promise<Partial<HoloStreamChunk>[]> {
        // Check for tool calls (can appear in any chunk)
        const isChat = 'message' in source;
        const toolCalls = isChat ? (source as any).message?.tool_calls : undefined;
        const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0;

        // For non-final chunks, only emit if there are tool calls
        if (!source.done) {
            if (!hasToolCalls) return [];

            return [pickDefined({
                delta: {
                    provider: 'ollama',
                    type: 'message_delta' as const,
                    delta: {
                        tool_calls: toolCalls
                    },
                    provider_delta: source
                }
            }) as Partial<HoloStreamChunk>];
        }

        // For done chunks, handle usage and/or tool calls
        const usage = pickDefined({
            input_tokens: source.prompt_eval_count,
            output_tokens: source.eval_count,
            total_tokens: source.prompt_eval_count != null && source.eval_count != null
                ? source.prompt_eval_count + source.eval_count
                : undefined
        });

        const hasUsage = Object.keys(usage).length > 0;
        const finish_reason = this.mapOllamaFinishReason(source.done_reason);

        // If there's nothing to report, avoid emitting
        if (!hasUsage && !finish_reason && !hasToolCalls) return [];

        return [pickDefined({
            delta: {
                provider: 'ollama',
                type: 'message_delta' as const,
                delta: hasToolCalls ? {tool_calls: toolCalls} : {},
                usage: hasUsage ? usage : undefined,
                provider_delta: source
            },
            finish_reason
        }) as Partial<HoloStreamChunk>];
    }

    protected async fromHoloManyImpl(source: HoloStreamChunk): Promise<Partial<OllamaStreamResponse>[]> {
        const d = source.delta;
        if (!d || d.type !== 'message_delta') return [];

        // Fast pass-through for Ollama→Ollama streaming
        if (d.provider === 'ollama' && d.provider_delta) {
            return [d.provider_delta];
        }

        const results: Partial<OllamaStreamResponse>[] = [];

        // 1) Map tool_calls → ChatResponse-shaped partial
        const toolCalls = d.delta?.tool_calls;
        if (Array.isArray(toolCalls) && toolCalls.length > 0) {
            results.push({
                // Chat format: tool_calls live under message
                message: {
                    role: 'assistant',
                    content: '',  // Ollama allows empty content with tool_calls
                    tool_calls: toolCalls
                },
                done: false
            } as Partial<OllamaStreamResponse>);
        }

        // 2) Map usage if present
        if (d.usage) {
            results.push(pickDefined({
                done: false,
                prompt_eval_count: d.usage.input_tokens,
                eval_count: d.usage.output_tokens
            }) as Partial<OllamaStreamResponse>);
        }

        return results;
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
}
