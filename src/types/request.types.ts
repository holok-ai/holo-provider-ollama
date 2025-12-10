// Ollama type aliases (map to Ollama SDK types)
import {ChatRequest, GenerateRequest, Message, Options, Tool, ToolCall} from "ollama";

export type OllamaToolCall = ToolCall;
export type OllamaMessage = Message;
export type OllamaTool = Tool;
export type OllamaOptions = Options;
export type OllamaGenerateRequest = GenerateRequest;
export type OllamaChatRequest = ChatRequest;
export type OllamaOnlyChatRequestFields = readonly['keep_alive', 'options'];
export type OllamaOnlyChatRequest = Pick<OllamaChatRequest, OllamaOnlyChatRequestFields[number]>;
export type OllamaSharedChatRequest = Omit<OllamaChatRequest, OllamaOnlyChatRequestFields[number]>;

// ---- type guards ---------------------------------------------------------

export function isGenerateRequest(
    req: OllamaChatRequest | OllamaGenerateRequest
): req is OllamaGenerateRequest {
    return 'prompt' in req && !('messages' in req);
}

export function isChatRequest(
    req: OllamaChatRequest | OllamaGenerateRequest
): req is OllamaChatRequest {
    return 'messages' in req;
}

