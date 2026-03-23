import {injectable} from 'tsyringe';
import {OllamaChatRequest, OllamaGenerateRequest} from "./types";
import {BaseAuditor, extractPromptByRole, extractTextContent, normalizeText} from "@holokai/holo-sdk/provider";
import {nsToMs, pickDefined} from "@holokai/holo-sdk";
import type {HoloWorkerRequest, WorkerResponseEnvelope} from "@holokai/holo-types/worker";
import type {ProviderDoneEvent, ProviderEvent} from "@holokai/holo-types/provider";
import type {ProviderEnvelope, ProviderResponseMetrics} from "@holokai/holo-types/entities";
import {FinishReason} from "@holokai/holo-types/entities";
import type {HoloFinishReason, HoloUsage} from "@holokai/holo-types/holo";
import {ChatRequest, ChatResponse, EmbedRequest, GenerateRequest, GenerateResponse} from "ollama";
import {OllamaProtocols} from "./plugin";

@injectable()
export class OllamaAuditor extends BaseAuditor {
    readonly provider = 'ollama';

    protected async extractRequestOptions(workerRequest: HoloWorkerRequest): Promise<Record<string, any>> {
        return {
            ...(workerRequest.payload as EmbedRequest | OllamaChatRequest | OllamaGenerateRequest).options
        }
    }

    override mapFinishReason(nativeResponse: any, _protocolName?: string): HoloFinishReason {
        if (!nativeResponse) return 'stop';
        const doneReason = nativeResponse.done_reason;
        switch (doneReason) {
            case 'stop':
                return 'stop';
            case 'load':
                return 'error';
            case 'length':
                return 'length';
            default:
                return 'stop';
        }
    }

    override mapUsage(nativeResponse: any, _protocolName?: string): HoloUsage {
        if (!nativeResponse) return {};
        const {prompt_eval_count, eval_count, load_duration, prompt_eval_duration, total_duration} = nativeResponse;
        const usage: HoloUsage = pickDefined({
            input_tokens: prompt_eval_count,
            output_tokens: eval_count,
            total_tokens: (eval_count ?? 0) + (prompt_eval_count ?? 0) || undefined,
        });
        if (load_duration != null || total_duration != null) {
            const timings: NonNullable<HoloUsage['timings']> = {};
            if (total_duration != null) timings.total = Math.round(nsToMs(total_duration));
            if (load_duration != null) timings.load = Math.round(nsToMs(load_duration));
            if (prompt_eval_duration != null) timings.prompt_eval = Math.round(nsToMs(prompt_eval_duration));
            usage.timings = timings;
        }
        return usage;
    }

    protected async mapProviderResponseMetrics(providerEvent: ProviderDoneEvent) {
        const payload = providerEvent.message as ChatResponse | GenerateResponse;
        const {load_duration, eval_count, prompt_eval_count, prompt_eval_duration, total_duration} = payload;

        return pickDefined({
            input_tokens: prompt_eval_count,
            output_tokens: eval_count,
            total_tokens: (eval_count ?? 0) + (prompt_eval_count ?? 0) || undefined,
            time_to_first_token: load_duration != null && prompt_eval_duration != null ? Math.round(nsToMs(load_duration + prompt_eval_duration)) : undefined,
            total_processing_time: total_duration != null ? Math.round(nsToMs(total_duration)) : undefined,
            usage_raw: {
                load_duration,
                prompt_eval_duration,
                total_duration,
                eval_count,
                prompt_eval_count
            },
            metadata: {
                load_duration,
                prompt_eval_duration
            }
        }) as Partial<ProviderResponseMetrics>;
    }

    protected async extractFinishReason(providerEvent: ProviderEvent, _envelope: WorkerResponseEnvelope): Promise<FinishReason | undefined> {
        if (providerEvent.type === 'error') return FinishReason.ERROR;
        if (providerEvent.type !== 'done') return undefined;
        return this.mapFinishReason(providerEvent.message) as FinishReason;
    }

    protected async createProviderEnvelope(workerRequest: HoloWorkerRequest): Promise<ProviderEnvelope> {
        const payload = workerRequest.payload as ChatRequest | GenerateRequest;
        let last_user_prompt;
        let system_prompt;

        if (workerRequest.protocol.name === OllamaProtocols.GENERATE) {
            const generatePayload = (payload as GenerateRequest)
            last_user_prompt = normalizeText(generatePayload.prompt);
            system_prompt = generatePayload.system ? normalizeText(generatePayload.system) : generatePayload.system;
        } else {
            const chatPayload = (payload as ChatRequest);
            last_user_prompt = extractPromptByRole(
                chatPayload.messages,
                "user",
                "last",
                (msg) => extractTextContent(msg.content),
            )

            system_prompt = extractPromptByRole(
                chatPayload.messages,
                "system",
                "first",
                (msg) => extractTextContent(msg.content),
            );
        }

        return pickDefined({
            access_model: payload.model,
            last_user_prompt,
            system_prompt
        }) as ProviderEnvelope;
    }
}
