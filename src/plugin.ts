/**
 * Ollama Provider Plugin Implementation
 *
 * Implements IProviderPlugin contract for Ollama API
 */

import {BasePlugin} from '@holokai/sdk/plugin';
import type {IProviderPlugin, PluginContext} from '@holokai/types/plugin';
import {manifest} from "./manifest.js";
import type {IProvider, IWireAdapter, ProviderCapabilities, WireAdapterParams} from "@holokai/types/provider";
import {OllamaProvider} from "./ollama.provider";
import {OllamaWireAdapter} from "./ollama.wire.adapter";
import type {RouteTree} from "@holokai/types/routing";
import {RouteHandler} from "@holokai/types/routing";
import {OllamaTranslator} from "./ollama.translator";
import {ProtocolCapability} from "@holokai/types/entities";
import type {PluginPricingSheet} from "@holokai/types/plugin";

export const OllamaProtocols = {
    EMBED: 'ollama.embed',
    CHAT: 'ollama.chat',
    GENERATE: 'ollama.generate',
    MODELS: 'ollama.models'
} as const;

export type OllamaProtocols = typeof OllamaProtocols[keyof typeof OllamaProtocols];


export class OllamaProviderPlugin extends BasePlugin implements IProviderPlugin {
    manifest = manifest;
    translator = OllamaTranslator.instance();
    defaultRouteHandler = RouteHandler.PASSTHROUGH;
    protocols = OllamaProtocols;
    defaultProtocol = OllamaProtocols.GENERATE;

    async createProvider(id: string, name: string, config: any): Promise<IProvider> {
        return new OllamaProvider(
            id,
            name,
            this,
            config
        );
    }

    async createWireAdapter(params: WireAdapterParams): Promise<IWireAdapter> {
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

    getRoutes(): RouteTree {
        return {
            api: {
                chat: {
                    method: 'POST',
                    handler: RouteHandler.REQUEST,
                    protocol: {
                        name: OllamaProtocols.CHAT,
                        capability: ProtocolCapability.CHAT
                    }
                },
                generate: {
                    method: 'POST',
                    handler: RouteHandler.REQUEST,
                    protocol: {
                        name: OllamaProtocols.GENERATE,
                        capability: ProtocolCapability.GENERATE
                    }
                },
                tags: {
                    method: 'GET',
                    handler: RouteHandler.MODELS,
                    protocol: {
                        name: OllamaProtocols.MODELS,
                        capability: ProtocolCapability.MODELS
                    }
                },
                embed: {
                    method: 'POST',
                    handler: RouteHandler.REQUEST,
                    protocol: {
                        name: OllamaProtocols.EMBED,
                        capability: ProtocolCapability.EMBED
                    }
                }
            }
        }
    }

    getDefaultPricing(): PluginPricingSheet {
        return {
            name: 'Ollama Local 2026-03',
            version: '2026-03',
            effective_from: '2026-03-01',
            models: [
                // All local models are $0 — no API costs
                ...[
                    // Llama
                    'llama3:latest', 'llama-3.3-70b-instruct', 'llama3.3:70b-instruct-q4_0',
                    'meta-llama-3.1-8b-instruct',

                    // Gemma
                    'gemma3:latest', 'gemma3:12b', 'gemma3:27b',
                    'gemma-3-1b-it', 'gemma-3-12b-it', 'gemma-3-27b-it',

                    // Mistral
                    'mistral:latest', 'mistral-7b-instruct-v0.3', 'mistral-nemo-instruct-2407',
                    'mistral-small-3.1-24b-instruct-2503', 'mistral-small:24b-instruct-2501-q8_0',

                    // Qwen
                    'qwq-32b', 'qwen3-coder-30b-a3b-instruct-mlx', 'qwen/qwen3-next-80b',

                    // Embeddings
                    'nomic-embed-text:latest', 'text-embedding-nomic-embed-text-v1.5',
                ].map(m => ({model_name: m, input_cost: 0, output_cost: 0})),
            ]
        };
    }

    protected onInitialize(_context: PluginContext): Promise<void> {
        return Promise.resolve();
    }

    protected onDestroy(): Promise<void> {
        return Promise.resolve();
    }

}
