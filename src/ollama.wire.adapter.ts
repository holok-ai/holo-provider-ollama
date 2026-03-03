import {BaseWireAdapter} from "@holokai/sdk/provider";

export class OllamaWireAdapter extends BaseWireAdapter {
    public formatWire(data: any): string {
        return `${JSON.stringify(data)}\n`;
    }

    protected streamingHeaders(): Record<string, string> {
        // Ollama streams NDJSON
        return {"Content-Type": "application/x-ndjson"};
    }
}