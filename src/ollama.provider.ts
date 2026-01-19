import {ChatRequest, GenerateRequest, Ollama} from "ollama";
import {BaseProvider, IAuditor, ModelInfo, ProviderContext, RequestType, RunHandle} from "@holokai/sdk";
import {OllamaAuditor} from "./ollama.auditor";

export class OllamaProvider extends BaseProvider {
    protected readonly client: Ollama;
    public readonly auditor: IAuditor;

    constructor(
        public readonly name: string,
        public readonly family: string,
        public readonly version: string,
        protected readonly _config: any) {
        super(name, family, version, _config);
        this.client = new Ollama(this._config);
        this.auditor = new OllamaAuditor();
    }

    /**
     * Get available models
     */
    async getModels(): Promise<ModelInfo[]> {
        const logger = this.mlog(this.getModels);
        try {
            const response = await this.client.list();
            const modelList = response.models.map(model => ({
                id: model.name,
                name: model.name,
                modified_at: model.modified_at,
                size: model.size || 0
            }));

            // Update internal models cache
            this.models = modelList.reduce((acc, model) => {
                acc[model.id] = model;
                return acc;
            }, {} as Record<string, ModelInfo>);

            logger.debug(`Ollama models: ${JSON.stringify(Object.keys(this.models))}`);
            return modelList;
        } catch (error) {
            logger.error(`Error fetching Ollama models: ${(error as Error).stack}`);
            throw error;
        }
    }

    protected async handleRequest(payload: GenerateRequest | ChatRequest, ctx: ProviderContext): Promise<RunHandle<any>> {
        if (ctx.requestType === RequestType.GENERATE) {
            return this.ollamaGenerate(payload as GenerateRequest, ctx);
        }
        if (ctx.requestType === RequestType.CHAT) {
            return this.ollamaChat(payload, ctx);
        }
        throw new Error(`Unsupported requestType: ${ctx.requestType}`);
    }

    private async ollamaGenerate(request: GenerateRequest, ctx: ProviderContext): Promise<RunHandle<any>> {
        if (!request.stream) {
            return {
                final: async () => {
                    return await this.client.generate({...request, stream: false /* ensure */});
                },
            };
        }

        const finalPromise = (async () => {
            const streamResp = await this.client.generate({...request, stream: true});

            for await (const chunk of streamResp) {
                const token = chunk?.response ?? "";
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
                    const res = await this.client.chat({...request, stream: false});
                    return res;
                },
            };
        }

        const finalPromise = (async () => {
            const streamResp = await this.client.chat({...request, stream: true});

            for await (const chunk of streamResp) {
                const token = chunk?.message?.content ?? "";
                if (token) ctx.emitTextDelta(token);

                if (chunk?.done) return chunk;
            }

            return {done: true};
        })();

        return {final: () => finalPromise};
    }

}
