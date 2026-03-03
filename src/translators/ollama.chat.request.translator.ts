import 'reflect-metadata';
import {OllamaChatRequest, OllamaChatRequestDefaults, OllamaOptions} from "../types";
import {OllamaToolTranslator} from "./ollama.tool.translators";
import {OllamaOptionsTranslator} from "./ollama.options.translators";
import {OllamaMessageTranslator} from "./ollama.message.translators";
import {injectable} from 'tsyringe';
import {BaseTranslator} from "@holokai/sdk/provider";
import {HoloRequestDefaults, pickDefined} from "@holokai/sdk";
import type {HoloRequest, HoloResponseFormat} from "@holokai/types/holo";

@injectable()
export class OllamaChatRequestTranslator extends BaseTranslator<HoloRequest, OllamaChatRequest> {
    protected holoDefaults: Partial<HoloRequest> = HoloRequestDefaults;
    protected providerDefaults: Partial<OllamaChatRequest> = OllamaChatRequestDefaults;

    constructor(
        private readonly messageTranslator: OllamaMessageTranslator,
        private readonly toolTranslator: OllamaToolTranslator,
        private readonly optionsTranslator: OllamaOptionsTranslator
    ) {
        super();
    }

    protected async fromHoloImpl(source: HoloRequest): Promise<Partial<OllamaChatRequest>> {
        const [msgOut, toolsOut, optionsOut] = await Promise.all([
            source.messages ? this.messageTranslator.fromHoloArray(source.messages) : Promise.resolve([]),
            source.tools ? this.toolTranslator.fromHoloArray(source.tools) : Promise.resolve(undefined),
            this.optionsTranslator.fromHolo(source),
        ]);

        const messages =
            source.system
                ? [{role: 'system' as const, content: source.system}, ...msgOut]
                : msgOut;

        const format = this.mapResponseFormat(source.response_format);

        return pickDefined({
            model: source.model,
            messages: messages.length ? messages : undefined,
            tools: toolsOut?.length ? toolsOut : undefined,
            stream: source.stream,
            options: Object.keys(optionsOut).length ? optionsOut : undefined,
            format,
        }) as Partial<OllamaChatRequest>;
    }

    protected async toHoloImpl(target: OllamaChatRequest): Promise<Partial<HoloRequest>> {
        const translated = target.messages
            ? await this.messageTranslator.toHoloArray(target.messages)
            : undefined;

        let system: string | undefined;
        let messages = translated;

        if (target.messages?.length && target.messages[0].role === 'system') {
            system = target.messages[0].content;
            messages = translated?.slice(1);
        }

        const [tools, holoOptions] = await Promise.all([
            target.tools ? this.toolTranslator.toHoloArray(target.tools) : Promise.resolve(undefined),
            target.options ? this.optionsTranslator.toHolo(target.options as OllamaOptions) : Promise.resolve({}),
        ]);

        const response_format = this.mapFromFormat((target as unknown as {
            format?: string | Record<string, unknown>
        }).format);

        const base = pickDefined({
            model: target.model,
            messages: messages?.length ? messages : undefined,
            tools: tools?.length ? tools : undefined,
            stream: target.stream,
            system,
            response_format,
        }) as Partial<HoloRequest>;

        return Object.keys(holoOptions).length ? {...base, ...holoOptions} : base;
    }

    private mapResponseFormat(response_format?: HoloResponseFormat): string | Record<string, unknown> | undefined {
        if (!response_format) return undefined;
        return response_format.type === 'json_object'
            ? 'json'
            : response_format.type === 'json_schema'
                ? response_format.schema
                : undefined;
    }

    private mapFromFormat(format?: string | Record<string, unknown>): HoloResponseFormat | undefined {
        if (!format) return undefined;
        if (format === 'json') return {type: 'json_object'};
        if (typeof format === 'object') return {type: 'json_schema', schema: format};
        return undefined;
    }
}
