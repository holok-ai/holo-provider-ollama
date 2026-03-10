import {PluginManifest, PluginType} from "@holokai/types/plugin";
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const {version} = require('../package.json');

export const manifest: PluginManifest = {
    name: '@holokai/provider-ollama',
    version,
    pluginType: PluginType.PROVIDER,
    family: 'ollama',
    displayName: 'Ollama Provider',
    description: 'Ollama provider plugin for Holo.',
};
