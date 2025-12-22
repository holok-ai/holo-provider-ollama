/**
 * Ollama Provider Plugin
 *
 * Entry point for the Ollama provider plugin.
 * Exports the plugin instance as default export per Holo plugin contract.
 */

import {OllamaProviderPlugin} from './plugin.js';

export * from './translators';
export * from './types';
export * from './manifest';
export * from './ollama.auditor';
export * from './ollama.provider';
export * from './ollama.translator';
export * from './plugin';

// Export singleton instance as default for plugin loading
export default new OllamaProviderPlugin();