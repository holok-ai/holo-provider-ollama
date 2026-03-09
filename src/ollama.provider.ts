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

export class OllamaProvider extends BaseProvider<Ollama, GenerateRequest | ChatRequest> {

    async getModelNameFromRequest(payload: GenerateRequest | ChatRequest): Promise<string> {
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

    async ollamaEmbed(payload: EmbedRequest, _ctx: ProviderContext) {
        return {
            final: async () => {
                try {
                    return await this.client.embed(payload);
                } catch (error) {
                    this.log.error(`Ollama embed error: ${error instanceof Error ? error.message : String(error)}`);
                    throw error;
                }
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

    protected async handleRequest(payload: GenerateRequest | ChatRequest | EmbedRequest, ctx: ProviderContext): Promise<RunHandle<any>> {
        switch (ctx.protocol.name) {
            case OllamaProtocols.GENERATE:
                return this.ollamaGenerate(payload as GenerateRequest, ctx);
            case OllamaProtocols.CHAT:
                return this.ollamaChat(payload as ChatRequest, ctx);
            case OllamaProtocols.EMBED:
                return this.ollamaEmbed(payload as EmbedRequest, ctx);
        }
        throw new Error(`Unsupported requestType: ${JSON.stringify(ctx)}`);
    }

    private async ollamaGenerate(request: GenerateRequest, ctx: ProviderContext): Promise<RunHandle<any>> {
        if (!request.stream) {
            return {
                final: async () => {
                    try {
                        return await this.client.generate({...request, stream: false /* ensure */});
                    } catch (error) {
                        this.log.error(`Ollama generate error: ${error instanceof Error ? error.message : String(error)}`, {
                            config: JSON.stringify(this._config),
                            request: JSON.stringify(request)
                        });
                        throw error;
                    }
                },
            };
        }

        const finalPromise = (async () => {
            const streamResp = await this.client.generate({...request, stream: true});

            for await (const chunk of streamResp) {
                ctx.emitStreamEvent(chunk);

                const token = chunk?.response ?? '';
                if (token) ctx.emitTextDelta(token);

                if (chunk?.done) return chunk;   // authoritative completion value
            }

            // If Ollama ends without a done flag
            return {done: true};
        })();

        return {final: () => finalPromise};
    }

    private async ollamaChat(request: ChatRequest, ctx: ProviderContext): Promise<RunHandle<any>> {
        if (!request.stream) {
            return {
                final: async () => {
                    try {
                        return await this.client.chat({...request, stream: false});
                    } catch (error) {
                        this.log.error(`Ollama chat error: ${error instanceof Error ? error.message : String(error)}`, {
                            config: JSON.stringify(this._config),
                            request: JSON.stringify(request)
                        });
                        throw error;
                    }
                },
            };
        }

        const finalPromise = (async () => {
            const streamResp = await this.client.chat({...request, stream: true});

            for await (const chunk of streamResp) {
                ctx.emitStreamEvent(chunk);

                const token = chunk?.message?.content ?? '';
                if (token) ctx.emitTextDelta(token);

                if (chunk?.done) return chunk;
            }

            return {done: true};
        })();

        return {final: () => finalPromise};
    }

}
