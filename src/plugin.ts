/**
 * Ollama Provider Plugin Implementation
 *
 * Implements IProviderPlugin contract for Ollama API
 */

import {BasePlugin, IProviderPlugin, PluginContext} from '@holokai/sdk/plugin';
import {manifest} from "./manifest.js";
import {IProvider, IWireAdapter, ProviderCapabilities, WireAdapterParams} from "@holokai/sdk/provider";
import {OllamaProvider} from "./ollama.provider";
import {OllamaWireAdapter} from "./ollama.wire.adapter";

export class OllamaProviderPlugin extends BasePlugin implements IProviderPlugin {
    manifest = manifest;

    async createProvider(config: any): Promise<IProvider> {
        return new OllamaProvider(
            this.name,
            this.family,
            this.version,
            config
        );
    }

    createWireAdapter(params: WireAdapterParams): IWireAdapter {
        return new OllamaWireAdapter(params.requestId, params.isStreaming);
    }

    getCapabilities(): ProviderCapabilities {
        return {
            streaming: true,
            tools: false,
            vision: false,
            functionCalling: false,
            maxTokens: 128000
        };
    }

    getSupportedModels(): string[] {
        return [
            'llama2',
            'llama3',
            'mistral',
            'mixtral',
            'codellama',
            'phi',
            'gemma'
        ];
    }

    protected onInitialize(_context: PluginContext): Promise<void> {
        return Promise.resolve();
    }

    protected onDestroy(): Promise<void> {
        return Promise.resolve();
    }

}
