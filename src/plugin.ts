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

    protected onInitialize(_context: PluginContext): Promise<void> {
        return Promise.resolve();
    }

    protected onDestroy(): Promise<void> {
        return Promise.resolve();
    }

}
