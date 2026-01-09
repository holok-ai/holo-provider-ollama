import {BaseWireAdapter, ProviderEvent, WireChunk} from "@holokai/sdk";

export class OllamaWireAdapter extends BaseWireAdapter {
    protected streamingHeaders(): Record<string, string> {
        return {"Content-Type": "application/x-ndjson"};
    }

    protected onStreamEvent(ev: Extract<ProviderEvent, { type: "stream_event" }>): WireChunk[] {
        return [{
            requestId: ev.requestId,
            seq: ev.seq,
            body: `${JSON.stringify(ev.event)}\n`,
        }];
    }

    protected onDoneStreaming(ev: Extract<ProviderEvent, { type: "done" }>): WireChunk[] {
        return [{
            requestId: ev.requestId,
            seq: ev.seq,
            body: "",
            done: true,
        }];
    }

    protected onErrorStreaming(ev: Extract<ProviderEvent, { type: "error" }>): WireChunk[] {
        const errObj = {error: ev.error.message, code: ev.error.code};
        return [{
            requestId: ev.requestId,
            seq: ev.seq,
            body: `${JSON.stringify(errObj)}\n`,
            done: true,
        }];
    }

    protected nonStreamingErrorBody(ev: Extract<ProviderEvent, { type: "error" }>): any {
        return {error: ev.error.message, code: ev.error.code};
    }
}