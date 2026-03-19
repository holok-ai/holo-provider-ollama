import {injectable} from 'tsyringe';
import {OllamaChatRequest, OllamaGenerateRequest} from "./types";
import {BaseAuditor, extractPromptByRole, extractTextContent, normalizeText} from "@holokai/sdk/provider";
import {nsToMs, pickDefined} from "@holokai/sdk";
import type {HoloWorkerRequest, WorkerResponseEnvelope} from "@holokai/types/worker";
import type {ProviderDoneEvent, ProviderEvent} from "@holokai/types/provider";
import type {ProviderEnvelope, ProviderResponseMetrics} from "@holokai/types/entities";
import {FinishReason} from "@holokai/types/entities";
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

    protected async mapProviderResponseMetrics(providerEvent: ProviderDoneEvent) {
        const payload = providerEvent.message as ChatResponse | GenerateResponse;

        const {load_duration, eval_count, prompt_eval_count, prompt_eval_duration, total_duration} = payload;

        return pickDefined({
            input_tokens: prompt_eval_count,
            output_tokens: eval_count,
            total_tokens: eval_count + prompt_eval_count,
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

        const doneReason = providerEvent.message?.done_reason;
        switch (doneReason) {
            case 'stop':
                return FinishReason.STOP;
            case 'load':
                return FinishReason.ERROR;
            case 'length':
                return FinishReason.LENGTH;
            default:
                return FinishReason.STOP;
        }
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
