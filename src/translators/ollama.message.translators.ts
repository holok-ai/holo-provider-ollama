import 'reflect-metadata';
import {OllamaMessage} from "../types";
import {injectable} from 'tsyringe';
import {BaseTranslator} from "@holokai/sdk/provider";
import {HoloContent, HoloMessage, isUint8Array, pickDefined, uint8ToDataUrl} from "@holokai/sdk";

@injectable()
export class OllamaMessageTranslator extends BaseTranslator<HoloMessage, OllamaMessage> {
    protected holoDefaults: Partial<HoloMessage> = {};
    protected providerDefaults: Partial<OllamaMessage> = {};

    constructor() {
        super();
    }

    protected async fromHoloImpl(source: HoloMessage): Promise<Partial<OllamaMessage>> {
        const {content, images} = this.extractContentAndImages(source.content);

        const tool_calls = source.tool_calls?.flatMap(tc => {
            const name = tc.function?.name;
            if (!name) return [];
            return [{
                function: {
                    name,
                    arguments: tc.function.arguments ?? {},
                },
            }];
        });

        return pickDefined({
            role: source.role as OllamaMessage["role"],
            content,
            images,
            tool_calls,
        }) as Partial<OllamaMessage>;
    }

    protected async toHoloImpl(target: OllamaMessage): Promise<Partial<HoloMessage>> {
        const role: HoloMessage["role"] =
            target.role === "assistant" || target.role === "user" || target.role === "tool"
                ? target.role
                : "user";

        const content = this.buildHoloContent(target.content, target.images);

        const tool_calls = target.tool_calls?.flatMap((tc, idx) => {
            const name = tc.function?.name;
            if (!name) return [];
            return [{
                id: `${name}#${idx}`,
                type: "function" as const,
                function: {
                    name,
                    arguments: (tc.function?.arguments as Record<string, unknown>) ?? {},
                },
            }];
        });

        return pickDefined({
            role,
            content,
            tool_calls,
        }) as Partial<HoloMessage>;
    }

    private extractContentAndImages(content: string | HoloContent[]): Partial<OllamaMessage> {
        if (typeof content === "string") {
            const text = content.trim();
            return text ? {content: text} : {};
        }

        let hasText = false;
        const texts: string[] = [];
        const images: string[] = [];

        for (const part of content) {
            if (part.type === "text") {
                const t = part.text.trim();
                if (t) {
                    hasText = true;
                    texts.push(t);
                }
            } else if (part.type === "image") {
                images.push(part.url);
            }
        }

        return pickDefined({
            content: hasText ? texts.join("\n") : undefined,
            images: images.length ? images : undefined,
        }) as Partial<OllamaMessage>;
    }

    private buildHoloContent(content?: string, images?: (string | Uint8Array)[]): string | HoloContent[] {
        const contentParts: HoloContent[] = [];

        if (content) {
            contentParts.push({type: "text", text: String(content)});
        }

        if (Array.isArray(images) && images.length) {
            for (const img of images) {
                if (typeof img === "string") {
                    contentParts.push({type: "image", url: img});
                } else if (isUint8Array(img)) {
                    contentParts.push({type: "image", url: uint8ToDataUrl(img)});
                }
            }
        }

        if (!contentParts.length) return "";
        if (contentParts.length === 1 && contentParts[0].type === "text") {
            return contentParts[0].text;
        }
        return contentParts;
    }
}
