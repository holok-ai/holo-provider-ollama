import 'reflect-metadata';
import {OllamaTool} from "../types";
import {injectable} from 'tsyringe';
import {BaseTranslator, HoloTool, pickDefined} from "@holokai/sdk";

@injectable()
export class OllamaToolTranslator extends BaseTranslator<HoloTool, OllamaTool> {
    protected holoDefaults: Partial<HoloTool> = {};
    protected providerDefaults: Partial<OllamaTool> = {};

    constructor() {
        super();
    }

    protected async toHoloImpl(source: OllamaTool): Promise<Partial<HoloTool>> {
        const fn = source.function;

        // Guard + normalize
        const name = (fn?.name ?? "").toString();
        const description = typeof fn?.description === "string" ? fn.description : undefined;
        const parameters = this.extractParametersFromSchema(fn?.parameters);

        return pickDefined({name, description, parameters}) as Partial<HoloTool>;
    }

    protected async fromHoloImpl(source: HoloTool): Promise<Partial<OllamaTool>> {
        const parameters = this.createJsonSchemaParameters(source.parameters);
        return pickDefined({
            type: "function" as const,                 // what you emit
            function: pickDefined({
                name: source.name,
                description: source.description,
                parameters,                              // normalized for downstream
            }),
        });
    }

    private createJsonSchemaParameters(
        parameters: Record<string, unknown> | undefined
    ): Record<string, unknown> {
        if (!parameters || Object.keys(parameters).length === 0) {
            return {type: "object", properties: {}, required: [] as string[]};
        }
        if (typeof parameters === "object" && "type" in parameters) {
            return parameters as Record<string, unknown>;
        }
        return {type: "object", properties: parameters, required: [] as string[]};
    }

    private extractParametersFromSchema(
        parameters: unknown
    ): Record<string, unknown> | undefined {
        if (!parameters || typeof parameters !== "object") return undefined;
        // If JSON Schema object with properties, return properties; else pass object through
        // (mirrors original behavior)
        return "properties" in (parameters as any)
            ? ((parameters as any).properties ?? {})
            : (parameters as Record<string, unknown>);
    }
}
