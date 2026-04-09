/**
 * Ollama Provider Plugin Implementation
 *
 * Implements IProviderPlugin contract for Ollama API
 */

import {BasePlugin} from '@holokai/holo-sdk/plugin';
import type {IProviderPlugin, PluginContext, PluginPricingSheet, PluginSchema} from '@holokai/holo-types/plugin';
import {manifest} from "./manifest.js";
import type {IProvider, IWireAdapter, ProviderCapabilities, WireAdapterParams} from "@holokai/holo-types/provider";
import {OllamaProvider} from "./ollama.provider";
import {OllamaWireAdapter} from "./ollama.wire.adapter";
import type {RouteDefinition} from "@holokai/holo-types/routing";
import {RouteHandler} from "@holokai/holo-types/routing";
import {OllamaTranslator} from "./ollama.translator";
import {ProtocolCapability} from "@holokai/holo-types/entities";

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
    defaultProtocol = OllamaProtocols.CHAT;

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

    getProtocolByCapability(capability: ProtocolCapability): string | undefined {
        const route = this.getRoutes().find(r => r.protocol.capability === capability);
        return route?.protocol.name;
    }

    getSchema(): PluginSchema {
        return {
            connection: {
                type: 'object',
                properties: {
                    baseUrl: {type: 'string', title: 'Base URL', format: 'uri', default: 'http://localhost:11434'},
                },
                required: ['baseUrl'],
            },
            parameters: {
                type: 'object',
                properties: {
                    temperature: {type: 'number', title: 'Temperature', minimum: 0, maximum: 2},
                    num_predict: {type: 'integer', title: 'Max Tokens (num_predict)', minimum: 1},
                    top_p: {type: 'number', title: 'Top P', minimum: 0, maximum: 1},
                    top_k: {type: 'integer', title: 'Top K', minimum: 1},
                },
            },
        };
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

    getRoutes(): RouteDefinition[] {
        return [
            {
                paths: ['/api/chat'],
                method: 'POST',
                handler: RouteHandler.REQUEST,
                protocol: {
                    name: OllamaProtocols.CHAT,
                    capability: ProtocolCapability.CHAT,
                    streamEventSequence: {
                        ordered: ['content_delta', 'message_delta', 'message_stop'],
                        repeatable: ['content_delta'],
                    }
                }
            },
            {
                paths: ['/api/generate'],
                method: 'POST',
                handler: RouteHandler.REQUEST,
                protocol: {
                    name: OllamaProtocols.GENERATE,
                    capability: ProtocolCapability.GENERATE
                }
            },
            {
                paths: ['/api/tags'],
                method: 'GET',
                handler: RouteHandler.MODELS,
                protocol: {
                    name: OllamaProtocols.MODELS,
                    capability: ProtocolCapability.MODELS
                }
            },
            {
                paths: ['/api/embed'],
                method: 'POST',
                handler: RouteHandler.REQUEST,
                protocol: {
                    name: OllamaProtocols.EMBED,
                    capability: ProtocolCapability.EMBED
                }
            }

        ];
    }

    getPricingSheets(): Map<string, PluginPricingSheet> {
        const sheet = this.getDefaultPricing();
        return new Map([[sheet.version, sheet]]);
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

    protected calculateExtraCosts(_tokens: Record<string, number>, _pricing: any) {
        return {total: 0, detail: {}};
    }

    protected onInitialize(_context: PluginContext): Promise<void> {
        return Promise.resolve();
    }

    protected onDestroy(): Promise<void> {
        return Promise.resolve();
    }

}
