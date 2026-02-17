import {ChatRequest, ErrorResponse, GenerateRequest, ListResponse, Ollama} from 'ollama';
import {
    BaseProvider,
    IAuditor,
    IProviderTranslator,
    IResponseFactory,
    ProviderContext,
    RequestType,
    RunHandle
} from '@holokai/sdk';
import {OllamaAuditor} from './ollama.auditor';
import {OllamaTranslator} from './ollama.translator';
import {OllamaResponseFactory} from './ollama.response.factory';

export class OllamaProvider extends BaseProvider<Ollama, GenerateRequest | ChatRequest> {

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

    protected async handleError(error: Error): Promise<ErrorResponse> {
        return {error: error.message}
    }

    protected async handleRequest(payload: GenerateRequest | ChatRequest, ctx: ProviderContext): Promise<RunHandle<any>> {
        this.log.trace(`ollama request: ${JSON.stringify(payload)}`);
        switch (ctx.requestType) {
            case RequestType.GENERATE:
                return this.ollamaGenerate(payload as GenerateRequest, ctx);
            case RequestType.CHAT:
                return this.ollamaChat(payload, ctx);
        }
        throw new Error(`Unsupported requestType: ${JSON.stringify(ctx)}`);
    }

    private async ollamaGenerate(request: GenerateRequest, ctx: ProviderContext): Promise<RunHandle<any>> {
        if (!request.stream) {
            return {
                final: async () => {
                    this.log.trace(`Ollama generate request: ${JSON.stringify(request)}`);
                    try {
                        const response = await this.client.generate({...request, stream: false /* ensure */});
                        this.log.debug(`Ollama generate response: ${JSON.stringify(response)}`);
                        return response;
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
                    this.log.trace(`Ollama chat request: ${JSON.stringify(request)}`);
                    try {
                        const response = await this.client.chat({...request, stream: false});
                        this.log.trace(`Ollama chat response: ${JSON.stringify(response)}`);
                        return response;
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
