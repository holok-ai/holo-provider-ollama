import {BaseWireAdapter} from "@holokai/sdk";

export class OllamaWireAdapter extends BaseWireAdapter {
    protected streamingHeaders(): Record<string, string> {
        // Ollama streams NDJSON
        return {"Content-Type": "application/x-ndjson"};
    }

    public formatWire(data: any): string {
        return `${JSON.stringify(data)}\n`;
    }
}