import {injectable} from 'tsyringe';
import {OllamaChatRequest, OllamaGenerateRequest} from "./types";
import {BaseAuditor} from "@holokai/sdk/provider";
import {pickDefined} from "@holokai/sdk";
import type {HoloWorkerRequest, WorkerResponseEnvelope} from "@holokai/types/worker";
import type {ProviderEnvelope, ProviderEvent} from "@holokai/types/provider";
import type {ProviderRequest} from "@holokai/types/entities";
import {ChatRequest, ChatResponse, GenerateRequest, GenerateResponse} from "ollama";
import {OllamaProtocols} from "./plugin";

@injectable()
export class OllamaAuditor extends BaseAuditor {
    readonly provider = 'ollama';

    protected toHoloRequest(workerRequest: HoloWorkerRequest, llmRequest: Omit<ProviderRequest, 'id'>): void {
        const payload = workerRequest.payload as OllamaChatRequest | OllamaGenerateRequest;

        llmRequest.access_model = payload.model;

        if (workerRequest.protocol.name === OllamaProtocols.CHAT) {
            const chatPayload = payload as OllamaChatRequest;
            const userPrompt = this.extractUserPromptFromMessages(chatPayload.messages);
            const systemPrompt = this.extractSystemPromptFromMessages(chatPayload.messages);
            if (userPrompt !== undefined) {
                llmRequest.metadata.user_prompt = userPrompt;
            }
            if (systemPrompt !== undefined) {
                llmRequest.metadata.system_prompt = systemPrompt;
            }
        } else if (workerRequest.protocol.name === OllamaProtocols.GENERATE) {
            const generatePayload = payload as OllamaGenerateRequest;
            if (generatePayload.prompt !== undefined) {
                llmRequest.metadata.user_prompt = generatePayload.prompt;
            }
            if (generatePayload.system !== undefined) {
                llmRequest.metadata.system_prompt = generatePayload.system;
            }
        }
    }

    protected mapProviderPayload(workerRequest: HoloWorkerRequest, llmRequest: Omit<ProviderRequest, 'id'>): void {
        const payload = workerRequest.payload as OllamaChatRequest | OllamaGenerateRequest;
        if (payload.options !== undefined) {
            llmRequest.metadata.options = payload.options;
        }
    }

    protected async mapResponseMetrics(providerEvent: Extract<ProviderEvent, { type: 'done' | 'error' }>, envelope: WorkerResponseEnvelope) {
        const metrics = await super.mapResponseMetrics(providerEvent, envelope);
        if (providerEvent.type === 'error') {
            return metrics;
        }

        const payload = providerEvent.message as ChatResponse | GenerateResponse;
        const usage = {
            input_tokens: payload.prompt_eval_count || metrics.input_tokens,
            output_tokens: payload.eval_count || metrics.output_tokens,
            time_to_first_token: this.calculateTimeToFirstToken(payload) || metrics.time_to_first_token,
            total_processing_time: payload.total_duration ? Math.round(payload.total_duration / 1000000) : metrics.total_processing_time
        }

        return pickDefined({
            usage_raw: usage,
            ...usage
        });
    }

    protected async createProviderEnvelope(payload: GenerateRequest | ChatRequest): Promise<ProviderEnvelope> {
        return pickDefined({
            access_model: payload.model
        }) as ProviderEnvelope;
    }

    protected extractExtraTokens(_metrics: Record<string, any>, base: Record<string, number>): Record<string, number> {
        return base;
    }

    private extractUserPromptFromMessages(messages?: any[]): string | undefined {
        if (!messages || !Array.isArray(messages)) return undefined;

        const userMessages = messages.filter(msg => msg.role === 'user');
        if (userMessages.length === 0) return undefined;

        // Return the last user message content
        const lastUserMessage = userMessages[userMessages.length - 1];
        return typeof lastUserMessage.content === 'string' ? lastUserMessage.content : undefined;
    }

    private extractSystemPromptFromMessages(messages?: any[]): string | undefined {
        if (!messages || !Array.isArray(messages)) return undefined;

        const systemMessage = messages.find(msg => msg.role === 'system');
        return systemMessage && typeof systemMessage.content === 'string' ? systemMessage.content : undefined;
    }

    /**
     * Calculate time to first token using Ollama's timing data
     * Time to first token = load_duration + prompt_eval_duration
     * This represents the time spent loading the model and evaluating the prompt before generating the first token
     * @param payload - Ollama response payload with timing information
     * @returns Time to first token in milliseconds, or undefined if timing data is unavailable
     */
    private calculateTimeToFirstToken(payload: any): number | undefined {
        const loadDuration = payload.load_duration;
        const promptEvalDuration = payload.prompt_eval_duration;

        if (loadDuration !== undefined && promptEvalDuration !== undefined) {
            // Convert nanoseconds to milliseconds and sum the durations
            const timeToFirstTokenNs = loadDuration + promptEvalDuration;
            return Math.round(timeToFirstTokenNs / 1000000);
        }
        return undefined;
    }
}
