/**
 * Ollama Provider Plugin Implementation
 *
 * Implements IProviderPlugin contract for Ollama API
 */

import {BasePlugin, IProviderPlugin, PluginContext} from '@holokai/sdk/plugin';
import {manifest} from "./manifest.js";
import {ProviderCapabilities, ProviderConfig} from "@holokai/sdk/provider";

export class OllamaProviderPlugin extends BasePlugin implements IProviderPlugin {
    createProvider(_config: ProviderConfig): Promise<unknown> {
        throw new Error("Method not implemented.");
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

    manifest = manifest;

    protected onInitialize(_context: PluginContext): Promise<void> {
        return Promise.resolve();
    }

    protected onDestroy(): Promise<void> {
        return Promise.resolve();
    }

}
