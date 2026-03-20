import type {IResponseFactory} from "@holokai/holo-types/provider";
import {ErrorResponse} from "ollama";

export class OllamaResponseFactory implements IResponseFactory {
    static instance(): OllamaResponseFactory {
        return new OllamaResponseFactory();
    }

    createError(message: string): ErrorResponse {
        return {error: message};
    }
}