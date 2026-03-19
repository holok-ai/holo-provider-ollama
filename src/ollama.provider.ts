import {ChatRequest, EmbedRequest, ErrorResponse, GenerateRequest, ListResponse, Ollama} from 'ollama';
import {BaseProvider} from '@holokai/sdk/provider';
import type {
    IAuditor,
    IProviderTranslator,
    IResponseFactory,
    ProviderContext,
    RunHandle
} from '@holokai/types/provider';
import {OllamaAuditor} from './ollama.auditor';
import {OllamaTranslator} from './ollama.translator';
import {OllamaResponseFactory} from './ollama.response.factory';
import {OllamaProtocols} from "./plugin";

export class OllamaProvider extends BaseProvider<Ollama, EmbedRequest | GenerateRequest | ChatRequest> {

    async getModelNameFromRequest(payload: EmbedRequest | GenerateRequest | ChatRequest): Promise<string> {
        return payload.model;
    }

    async getModels(allowedModels: string[] | true): Promise<ListResponse> {
        const response = await this.client.list();

        if (allowedModels === true) {
            return response;
        }
        const models = response.models.filter(model => allowedModels.includes(model.name));

        return {
            ...response,
            models
        }
    }

    async ollamaEmbed(payload: EmbedRequest) {
        return {
            start: async () => {
                return await this.client.embed(payload);
            }
        }
    }

    protected createAuditor(): IAuditor {
        return new OllamaAuditor();
    }

    protected createClient(): Ollama {
        return new Ollama(this._config);
    }

    protected createTranslator(): IProviderTranslator {
        return OllamaTranslator.instance();
    }

    protected createResponseFactory(): IResponseFactory {
        return OllamaResponseFactory.instance();
    }

    protected async handleError(error: Error): Promise<ErrorResponse> {
        return {error: error.message}
    }

    protected async createRequestRunner(payload: GenerateRequest | ChatRequest | EmbedRequest, ctx: ProviderContext): Promise<RunHandle<any>> {
        switch (ctx.protocol.name) {
            case OllamaProtocols.GENERATE:
                return this.ollamaGenerate(payload as GenerateRequest, ctx);
            case OllamaProtocols.CHAT:
                return this.ollamaChat(payload as ChatRequest, ctx);
            case OllamaProtocols.EMBED:
                return this.ollamaEmbed(payload as EmbedRequest);
        }
        throw new Error(`Unsupported requestType: ${JSON.stringify(ctx)}`);
    }

    private async ollamaGenerate(request: GenerateRequest, ctx: ProviderContext): Promise<RunHandle<any>> {
        if (!request.stream) {
            return {
                start: async () => {
                    const result = await this.client.generate({...request, stream: false /* ensure */});
                    ctx.emitTextDelta(result.response);
                    return result;
                },
            };
        }

        return {
            start: async () => {
                const streamResp = await this.client.generate({...request, stream: true});

                for await (const chunk of streamResp) {
                    if (chunk.done) return chunk;
                    ctx.emitStreamEvent(chunk);

                    const token = chunk.response ?? '';
                    if (token) ctx.emitTextDelta(token);
                }

                return {done: true};
            }
        };
    }

    private async ollamaChat(request: ChatRequest, ctx: ProviderContext): Promise<RunHandle<any>> {
        if (!request.stream) {
            return {
                start: async () => {
                    const result = await this.client.chat({...request, stream: false});
                    ctx.emitTextDelta(result.message.content);
                    return result;
                },
            };
        }

        return {
            start: async () => {
                const streamResp = await this.client.chat({...request, stream: true});

                for await (const chunk of streamResp) {
                    if (chunk.done) return chunk;
                    ctx.emitStreamEvent(chunk);

                    const token = chunk.message.content ?? '';
                    if (token) ctx.emitTextDelta(token);
                }

                return {done: true};
            }
        };
    }

}
