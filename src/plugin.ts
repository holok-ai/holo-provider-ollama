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
import {Capability} from "@holokai/types/holo";
import type {RouteTree} from "@holokai/types/routing";
import {RouteHandler} from "@holokai/types/routing";
import {OllamaTranslator} from "./ollama.translator";

export class OllamaProviderPlugin extends BasePlugin implements IProviderPlugin {
    manifest = manifest;
    translator = OllamaTranslator.instance();
    defaultRouteHandler = RouteHandler.PASSTHROUGH;

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

    getRoutes(): RouteTree {
        return {
            api: {
                chat: {
                    method: 'POST',
                    handler: RouteHandler.REQUEST,
                    protocol: 'chat',
                    capability: Capability.CHAT
                },
                generate: {
                    method: 'POST',
                    handler: RouteHandler.REQUEST,
                    protocol: 'generate',
                    capability: Capability.GENERATE
                },
                tags: {
                    method: 'GET',
                    handler: RouteHandler.MODELS,
                    protocol: 'models',
                    capability: Capability.MODELS
                },
                embed: {
                    method: 'POST',
                    handler: RouteHandler.REQUEST,
                    protocol: 'embeddings',
                    capability: Capability.EMBED
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
