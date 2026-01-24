import {IResponseFactory} from "@holokai/sdk";
import {ErrorResponse} from "ollama";

export class OllamaResponseFactory implements IResponseFactory {
    createError(message: string): ErrorResponse {
        return {error: message};
    }

    static instance(): OllamaResponseFactory {
        return new OllamaResponseFactory();
    }
}