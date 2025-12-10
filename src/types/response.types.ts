// Ollama response type aliases (map to Ollama SDK types)
import type {
    ChatResponse,
    EmbeddingsResponse,
    EmbedResponse,
    ErrorResponse,
    GenerateResponse,
    ListResponse,
    ModelDetails,
    ModelResponse,
    ProgressResponse,
    ShowResponse,
    StatusResponse
} from "ollama";


export type OllamaGenerateResponse = GenerateResponse;
export type OllamaChatResponse = ChatResponse;
export type OllamaEmbedResponse = EmbedResponse;
export type OllamaEmbeddingsResponse = EmbeddingsResponse;
export type OllamaProgressResponse = ProgressResponse;
export type OllamaModelDetails = ModelDetails;
export type OllamaModelResponse = ModelResponse;
export type OllamaShowResponse = ShowResponse;
export type OllamaListResponse = ListResponse;
export type OllamaErrorResponse = ErrorResponse;
export type OllamaStatusResponse = StatusResponse;
export type OllamaResponse =
    GenerateResponse
    | ChatResponse
    | EmbedResponse
    | EmbeddingsResponse
    | ProgressResponse
    | ModelResponse
    | ShowResponse
    | ListResponse
    | ErrorResponse
    | StatusResponse;

export type OllamaOnlyResponseFields = readonly[
    'done',
    'done_reason',
    'response',
    'context',
    'total_duration',
    'load_duration',
    'prompt_eval_count',
    'prompt_eval_duration',
    'eval_count',
    'eval_duration'
];
export type OllamaOnlyResponse = {
    done?: boolean;
    done_reason?: string;
    response?: string;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
};

export function isGenerateResponse(
    res: OllamaResponse
): res is OllamaGenerateResponse {
    // Generate mode has top-level "response" string
    return 'response' in res && typeof (res as any).response === 'string';
}

export function isChatResponse(
    res: OllamaResponse
): res is OllamaChatResponse {
    // Chat mode has "message" with role/content
    return 'message' in res;
}