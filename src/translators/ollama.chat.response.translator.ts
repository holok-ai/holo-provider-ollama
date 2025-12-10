import 'reflect-metadata';
import {OllamaChatResponse} from "../types";
import {injectable} from 'tsyringe';
import {OllamaMessageTranslator} from "./ollama.message.translators";
import {BaseTranslator} from "@holokai/sdk/provider";
import {HoloFinishReason, HoloMessage, HoloResponse, HoloUsage, pickDefined} from "@holokai/sdk";

/**
 * Translator for Ollama Chat API responses.
 * Uses `message: OllamaMessage` (no `context` field).
 */
@injectable()
export class OllamaChatResponseTranslator extends BaseTranslator<HoloResponse, OllamaChatResponse> {
    protected holoDefaults: Partial<HoloResponse> = {};
    protected providerDefaults: Partial<OllamaChatResponse> = {};

    constructor(private readonly messageTranslator: OllamaMessageTranslator) {
        super();
    }

    // ---------- Implementations ----------
    protected async fromHoloImpl(source: HoloResponse): Promise<Partial<OllamaChatResponse>> {
        // Build a single assistant message from the last assistant message in Holo (or synthesize empty)
        const holoMsgs = source.messages ?? [];
        const lastAssistant: HoloMessage | undefined =
            [...holoMsgs].reverse().find(m => m.role === 'assistant');

        // Reuse your message translator rather than duplicating content/image/tool parsing
        const message = lastAssistant
            ? await this.messageTranslator.fromHolo(lastAssistant)
            : {role: 'assistant' as const, content: ''};

        const usageFields = this.mapUsageFromHolo(source.usage);

        return pickDefined({
            model: source.model,
            created_at: source.created ? new Date(source.created).toISOString() : undefined,
            message,
            done_reason: this.mapFinishReasonFromHolo(source.finish_reason ?? null),
            done: true,
            ...usageFields,
        }) as Partial<OllamaChatResponse>;
    }

    protected async toHoloImpl(source: OllamaChatResponse): Promise<Partial<HoloResponse>> {
        // Convert provider message back to Holo via your message translator
        const holoAssistant = await this.messageTranslator.toHolo(source.message);

        // Ensure we produce a Holo message array; omit empty content when possible
        const messages: HoloMessage[] = [];
        if (Object.keys(holoAssistant).length) {
            messages.push(holoAssistant as HoloMessage);
        }

        const usage = this.mapUsageToHolo(source);

        return pickDefined({
            model: source.model,
            messages: messages.length ? messages : undefined,
            created: source.created_at ? new Date(source.created_at).getTime() : undefined,
            finish_reason: this.mapFinishReasonToHolo(source.done_reason),
            usage,
        }) as Partial<HoloResponse>;
    }

    // ---------- Usage mapping ----------
    private mapUsageFromHolo(usage?: HoloUsage): Partial<OllamaChatResponse> {
        if (!usage) return {};
        const t = usage.timings ?? {};
        return pickDefined({
            prompt_eval_count: usage.input_tokens,
            eval_count: usage.output_tokens,
            total_duration: t.total,
            load_duration: t.load,
            prompt_eval_duration: t.prompt_eval,
            eval_duration: t.eval,
        });
    }

    private mapUsageToHolo(resp: OllamaChatResponse): Partial<HoloUsage> {
        const timings = pickDefined({
            total: resp.total_duration,
            load: resp.load_duration,
            prompt_eval: resp.prompt_eval_duration,
            eval: resp.eval_duration,
        });

        return pickDefined({
            input_tokens: resp.prompt_eval_count,
            output_tokens: resp.eval_count,
            total_tokens:
                resp.prompt_eval_count != null && resp.eval_count != null
                    ? resp.prompt_eval_count + resp.eval_count
                    : undefined,
            timings: Object.keys(timings).length ? timings : undefined,
        }) as Partial<HoloUsage> as HoloUsage;
    }

    // ---------- Finish reason mapping ----------
    private mapFinishReasonFromHolo(reason?: HoloFinishReason | null): OllamaChatResponse["done_reason"] | undefined {
        if (!reason) return undefined;
        switch (reason) {
            case 'stop':
            case 'length':
            case 'content_filter':
                return reason;
            case 'tool_calls':
            case 'function_call':
                return 'tool_calls';
            default:
                return undefined; // unknowns omitted (safer than guessing)
        }
    }

    private mapFinishReasonToHolo(reason?: string): HoloFinishReason | null {
        switch (reason) {
            case 'stop':
            case 'length':
            case 'content_filter':
                return reason;
            case 'tool_calls':
                return 'tool_calls';
            default:
                return null; // unknown → null
        }
    }
}
