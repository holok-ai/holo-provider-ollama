import {PluginManifest, PluginType} from "@holokai/holo-types/plugin";
import {VERSION} from './version';

export const manifest: PluginManifest = {
    name: '@holokai/provider-ollama',
    version: VERSION,
    pluginType: PluginType.PROVIDER,
    family: 'ollama',
    displayName: 'Ollama Provider',
    description: 'Ollama provider plugin for Holo.',
};
