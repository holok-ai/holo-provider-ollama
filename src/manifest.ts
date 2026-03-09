import {PluginManifest, PluginType} from "@holokai/types/plugin";

export const manifest: PluginManifest = {
    name: '@holokai/provider-ollama',
    version: '1.0.0',
    pluginType: PluginType.PROVIDER,
    family: 'ollama',
    displayName: 'Ollama Provider',
    description: 'Ollama provider plugin for Holo.',
};
