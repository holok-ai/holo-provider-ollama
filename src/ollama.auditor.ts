import {injectable} from 'tsyringe';
import {OllamaChatRequest, OllamaGenerateRequest} from "./types";
import {
    BaseAuditor,
    HoloWorkerRequest,
    HoloWorkerResponse,
    LlmRequest,
    LlmResponse,
    LlmStatus,
    pickDefined,
    ProviderEnvelope,
    RequestType
} from "@holokai/sdk";
import {ChatRequest, GenerateRequest} from "ollama";

@injectable()
export class OllamaAuditor extends BaseAuditor {
    readonly provider = 'ollama';

    protected toHoloRequest(workerRequest: HoloWorkerRequest, llmRequest: Omit<LlmRequest, 'id'>): void {
        const payload = workerRequest.payload as OllamaChatRequest | OllamaGenerateRequest;

        // Set model
        llmRequest.model_slug = payload.model;

        // Set prompt/message content based on request type
        if (workerRequest.type === RequestType.CHAT) {
            const chatPayload = payload as OllamaChatRequest;
            const userPrompt = this.extractUserPromptFromMessages(chatPayload.messages);
            const systemPrompt = this.extractSystemPromptFromMessages(chatPayload.messages);
            if (userPrompt !== undefined) {
                llmRequest.user_prompt = userPrompt;
            }
            if (systemPrompt !== undefined) {
                llmRequest.system_prompt = systemPrompt;
            }
        } else if (workerRequest.type === RequestType.GENERATE) {
            const generatePayload = payload as OllamaGenerateRequest;
            if (generatePayload.prompt !== undefined) {
                llmRequest.user_prompt = generatePayload.prompt;
            }
            if (generatePayload.system !== undefined) {
                llmRequest.system_prompt = generatePayload.system;
            }
        }
    }

    protected mapProviderPayload(workerRequest: HoloWorkerRequest, llmRequest: Omit<LlmRequest, 'id'>): void {
        const payload = workerRequest.payload as OllamaChatRequest | OllamaGenerateRequest;
        // Set options
        if (payload.options !== undefined) {
            llmRequest.options = payload.options;
        }
    }

    protected mapResponseToHolo(
        workerResponse: HoloWorkerResponse,
        llmResponse: Omit<LlmResponse, 'id'>
    ): void {
        const payload = workerResponse.payload;

        // Extract model from payload
        llmResponse.model_slug = payload.model || 'unknown';

        // Extract response text from final response
        if (workerResponse.fullResponse) {
            llmResponse.response = workerResponse.fullResponse;
        } else if (payload.response) {
            // Generate format
            llmResponse.response = payload.response;
        } else if (payload.message?.content) {
            // Chat format
            llmResponse.response = payload.message.content;
        }
    }

    protected collectResponseMetrics(
        workerResponse: HoloWorkerResponse,
        llmResponse: Omit<LlmResponse, 'id'>
    ): void {
        const payload = workerResponse.payload;

        // Extract token usage from metrics or payload
        if (workerResponse.metrics) {
            llmResponse.usage_raw = workerResponse.metrics;
            llmResponse.input_tokens = workerResponse.metrics.inputTokens;
            llmResponse.output_tokens = workerResponse.metrics.outputTokens;
            llmResponse.time_to_first_token = workerResponse.metrics.timeToFirstToken;
            llmResponse.total_processing_time = workerResponse.metrics.totalProcessingTime;
        } else {
            const promptTokens = payload.prompt_eval_count || 0;
            const responseTokens = payload.eval_count || 0;
            // Fallback to payload data
            llmResponse.input_tokens = promptTokens;
            llmResponse.output_tokens = responseTokens;

            if (payload.total_duration) {
                llmResponse.total_processing_time = Math.round(payload.total_duration / 1000000); // Convert nanoseconds to milliseconds
            }

            // Calculate time to first token using Ollama timing data
            llmResponse.time_to_first_token = this.calculateTimeToFirstToken(payload);

            const metrics = {
                input_tokens: promptTokens,
                output_tokens: responseTokens,
                time_to_first_token: this.calculateTimeToFirstToken(payload),
                total_processing_time: (payload.total_duration ? Math.round(payload.total_duration / 1000000) : undefined)
            };
            llmResponse.usage_raw = metrics;
        }

        // Set status based on completion
        if (payload.done === true) {
            llmResponse.status = LlmStatus.SUCCESS;
        } else {
            llmResponse.status = LlmStatus.PARTIAL;
        }
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

    protected async createProviderEnvelope(payload: GenerateRequest | ChatRequest): Promise<ProviderEnvelope> {
        return pickDefined({
            model_slug: payload.model
        }) as ProviderEnvelope;
    }
}
