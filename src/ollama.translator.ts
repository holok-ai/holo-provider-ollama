import 'reflect-metadata';
import {injectable} from "tsyringe";
import type {IProviderTranslator} from "@holokai/types/provider";
import type {HoloMessage, HoloRequest, HoloResponse, HoloStreamChunk} from "@holokai/types/holo";
import {RequestType} from "@holokai/types/holo";
import {
    OllamaChatRequestTranslator,
    OllamaChatResponseTranslator,
    OllamaContentDeltaTranslator,
    OllamaGenerateRequestTranslator,
    OllamaGenerateResponseTranslator,
    OllamaMessageDeltaTranslator,
    OllamaMessageStopTranslator,
    OllamaMessageTranslator,
    OllamaOptionsTranslator,
    OllamaStreamTranslator,
    OllamaToolTranslator
} from "./translators";
import {
    isGenerateRequest,
    isGenerateResponse,
    OllamaChatRequest,
    OllamaChatResponse,
    OllamaGenerateRequest,
    OllamaGenerateResponse,
    OllamaMessage,
    OllamaResponse
} from "./types";

@injectable()
export class OllamaTranslator implements IProviderTranslator {
    constructor(
        private ollamaGenerateRequestTranslator: OllamaGenerateRequestTranslator,
        private ollamaChatRequestTranslator: OllamaChatRequestTranslator,
        private ollamaMessageTranslator: OllamaMessageTranslator,
        private ollamaChatResponseTranslator: OllamaChatResponseTranslator,
        private ollamaGenerateResponseTranslator: OllamaGenerateResponseTranslator,
        private ollamaStreamTranslator: OllamaStreamTranslator
    ) {

    }

    static instance(): IProviderTranslator {
        const messageTranslator = new OllamaMessageTranslator();
        const toolTranslator = new OllamaToolTranslator();
        const optionsTranslator = new OllamaOptionsTranslator();

        const generateRequestTranslator = new OllamaGenerateRequestTranslator();
        const chatRequestTranslator = new OllamaChatRequestTranslator(messageTranslator, toolTranslator, optionsTranslator);

        const generateResponseTranslator = new OllamaGenerateResponseTranslator();
        const chatResponseTranslator = new OllamaChatResponseTranslator(messageTranslator);

        const contentDeltaTranslator = new OllamaContentDeltaTranslator();
        const messageDeltaTranslator = new OllamaMessageDeltaTranslator();
        const messageStopTranslator = new OllamaMessageStopTranslator();

        const streamTranslator = new OllamaStreamTranslator(
            contentDeltaTranslator,
            messageDeltaTranslator,
            messageStopTranslator
        );

        return new OllamaTranslator(
            generateRequestTranslator,
            chatRequestTranslator,
            messageTranslator,
            chatResponseTranslator,
            generateResponseTranslator,
            streamTranslator
        );
    }

    async fromHoloResponse(response: HoloResponse): Promise<Partial<OllamaResponse>> {
        // Default to Chat response
        return this.ollamaChatResponseTranslator.fromHolo(response);
    }

    async toHoloResponse(response: OllamaResponse): Promise<Partial<HoloResponse>> {
        // Check if it's a Generate response (has 'response' field) or Chat response (has 'message' field)
        if (isGenerateResponse(response)) {
            return this.ollamaGenerateResponseTranslator.toHolo(response as OllamaGenerateResponse);
        } else {
            return this.ollamaChatResponseTranslator.toHolo(response as OllamaChatResponse);
        }
    }

    async fromHoloRequest(request: HoloRequest): Promise<Partial<OllamaChatRequest>> {
        if (request.capability === RequestType.GENERATE) {
            return this.ollamaGenerateRequestTranslator.fromHolo(request);
        }
        return this.ollamaChatRequestTranslator.fromHolo(request);
    }

    async toHoloRequest(request: OllamaChatRequest | OllamaGenerateRequest): Promise<Partial<HoloRequest>> {
        if (isGenerateRequest(request)) {
            return this.ollamaGenerateRequestTranslator.toHolo(request as OllamaGenerateRequest);
        }
        return this.ollamaChatRequestTranslator.toHolo(request);
    }

    async fromHoloMessages(messages: HoloMessage[]): Promise<Partial<OllamaMessage>[]> {
        return this.ollamaMessageTranslator.fromHoloArray(messages);
    }

    async toHoloMessages(messages: OllamaMessage[]): Promise<Partial<HoloMessage>[]> {
        return this.ollamaMessageTranslator.toHoloArray(messages);
    }

    async fromHoloStreamChunks(chunks: HoloStreamChunk[]): Promise<unknown> {
        return this.ollamaStreamTranslator.fromHoloManyArray(chunks);
    }
}
