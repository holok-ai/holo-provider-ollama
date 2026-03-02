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
import {RequestType, RouteHandler, RouteTree} from "@holokai/sdk";
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
                    requestType: RequestType.CHAT,
                    handler: RouteHandler.REQUEST
                },
                generate: {
                    method: 'POST',
                    requestType: RequestType.GENERATE,
                    handler: RouteHandler.REQUEST
                },
                tags: {
                    method: 'GET',
                    handler: RouteHandler.MODELS
                },
                embed: {
                    method: 'POST',
                    requestType: RequestType.EMBED,
                    handler: RouteHandler.REQUEST
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
