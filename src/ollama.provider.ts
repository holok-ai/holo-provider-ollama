import {ChatResponse, GenerateResponse, Ollama} from "ollama";
import {BaseProvider, ModelInfo, RequestType} from "@holokai/sdk";

export class OllamaProvider extends BaseProvider {
    protected client: Ollama = new Ollama();

    async init(): Promise<void> {
        this.client = new Ollama(this._config);
    }

    /**
     * Get available models
     */
    async getModels(): Promise<ModelInfo[]> {
        const logger = this.mlog(this.getModels);
        try {
            if (!this.client) {
                await this.init();
            }

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

    async handleRequest(request: any, type: RequestType): Promise<void> {
        if (type === RequestType.GENERATE) {
            return await this.ollamaGenerate(request);
        } else if (type === RequestType.CHAT) {
            return await this.ollamaChat(request);
        }
    }

    private async ollamaGenerate(request: any): Promise<void> {
        // const logger = this.mlog(this.ollamaGenerate);
        let fullResponse = '';

        const response = await this.client.generate(request);

        if (request.stream) {
            try {
                // Use Ollama streaming API
                for await (const chunk of response) {
                    if (chunk.done) {
                        this.done(chunk, fullResponse);
                        break;
                    }

                    const token = chunk.response;
                    fullResponse += token;

                    if (token) {
                        this.data(token);
                    }
                }
            } catch (error) {
                this.error(response);
                throw error;
            }
        } else {
            fullResponse = (response as unknown as GenerateResponse).response;
            this.done(fullResponse);
        }
    }

    private async ollamaChat(request: any): Promise<void> {
        // const logger = this.mlog(this.ollamaChat);

        let fullResponse = '';
        // Pass the request directly to the client since it extends request
        // @ts-ignore
        const response = await this.client.chat(request);

        if (request.stream) {
            try {
                for await (const chunk of response) {
                    // TODO: Simplify stream completion logic - consider extracting to a shared method
                    // The chunk.done pattern is repeated across generate and chat methods
                    if (chunk.done) {
                        this.done(chunk, fullResponse);
                        break;
                    }

                    const token = chunk.message?.content || '';
                    fullResponse += token;

                    if (token) {
                        this.data(chunk);
                    }
                }
            } catch (error) {
                this.error(error);
            }
        } else {
            fullResponse = (response as unknown as ChatResponse).message?.content || '';
            this.data(fullResponse);
        }
    }
}
