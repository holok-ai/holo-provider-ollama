import 'reflect-metadata';
import {OllamaGenerateResponse} from "../types";
import {injectable} from 'tsyringe';
import {HoloFinishReason, HoloMessage, HoloResponse, HoloUsage} from "@holokai/sdk";
import {BaseTranslator} from "@holokai/sdk/provider";

/**
 * Translator for Ollama Generate API responses.
 * Uses `response: string` and `context: number[]` (context omitted when reconstructing from Holo).
 */
@injectable()
export class OllamaGenerateResponseTranslator extends BaseTranslator<HoloResponse, OllamaGenerateResponse> {
    protected holoDefaults: Partial<HoloResponse> = {};
    protected providerDefaults: Partial<OllamaGenerateResponse> = {};

    constructor() {
        super();
    }

    protected async fromHoloImpl(source: HoloResponse): Promise<Partial<OllamaGenerateResponse>> {
        const firstMessage = source.messages?.[0];
        const responseText = typeof firstMessage?.content === 'string'
            ? firstMessage.content
            : Array.isArray(firstMessage?.content)
                ? firstMessage.content.map(c => c.type === 'text' ? c.text : '').join('')
                : '';

        const usage = source.usage ? this.mapUsageFromHolo(source.usage) : {};

        return pickDefined({
            model: source.model,
            created_at: source.created instanceof Date ? source.created : new Date(source.created ?? Date.now()),
            response: responseText,
            done: true,
            done_reason: this.mapFinishReasonFromHolo(source.finish_reason),
            ...usage
        }) as Partial<OllamaGenerateResponse>;
    }

    protected async toHoloImpl(source: OllamaGenerateResponse): Promise<Partial<HoloResponse>> {
        const usage = this.mapUsageToHolo(source);

        const message: HoloMessage = {
            role: 'assistant',
            content: source.response
        };

        return pickDefined({
            model: source.model,
            created: source.created_at,
            messages: [message],
            finish_reason: this.mapFinishReasonToHolo(source.done_reason),
            usage
        }) as Partial<HoloResponse>;
    }

    private mapUsageFromHolo(usage?: HoloUsage): Partial<OllamaGenerateResponse> {
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

    private mapUsageToHolo(resp: OllamaGenerateResponse): HoloUsage | undefined {
        const timings = pickDefined({
            total: resp.total_duration,
            load: resp.load_duration,
            prompt_eval: resp.prompt_eval_duration,
            eval: resp.eval_duration,
        });

        const usage = pickDefined({
            input_tokens: resp.prompt_eval_count,
            output_tokens: resp.eval_count,
            total_tokens:
                resp.prompt_eval_count != null && resp.eval_count != null
                    ? resp.prompt_eval_count + resp.eval_count
                    : undefined,
            timings: Object.keys(timings).length ? timings : undefined,
        });

        return Object.keys(usage).length ? usage as HoloUsage : undefined;
    }

    // ---------- Finish reason mapping ----------
    private mapFinishReasonFromHolo(reason?: HoloFinishReason): string {
        if (reason === 'length') return 'length';
        return 'stop';
    }

    private mapFinishReasonToHolo(reason?: string): HoloFinishReason | null {
        if (reason === 'length') return 'length';
        if (reason === 'stop') return 'stop';
        return null;
    }
}
