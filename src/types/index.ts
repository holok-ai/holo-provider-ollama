import {OllamaChatRequest, OllamaGenerateRequest} from "./request.types";

export * from './request.types';
export * from './response.types';
export const OllamaGenerateRequestDefaults: Partial<OllamaGenerateRequest> = {
    stream: false
};

export const OllamaChatRequestDefaults: Partial<OllamaChatRequest> = {
    stream: true,
    messages: []
};
// Ollama streams reuse ChatResponse and GenerateResponse types
