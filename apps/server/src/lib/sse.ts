import type { SSEEvent } from "../types/index.js";

/**
 * Encode an SSE event into the wire format.
 */
export function encodeSSE(event: SSEEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}

// Reasoning models (e.g. Nemotron on NVIDIA NIM) can think for tens of
// seconds without emitting visible text, and the server deliberately holds
// back the playground block while it streams. A comment line every few
// seconds keeps proxies and Bun's idle timeout from closing a quiet stream.
const HEARTBEAT_MS = 5_000;

/**
 * Create an SSE-compatible ReadableStream that you can write events to.
 * Writes after the client disconnects are dropped instead of throwing.
 */
export function createSSEStream(): {
    readable: ReadableStream<Uint8Array>;
    writer: SSEWriter;
} {
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
    let closed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const enqueue = (chunk: string) => {
        if (!controller || closed) return;
        try {
            controller.enqueue(encoder.encode(chunk));
        } catch {
            // Stream already closed (client went away) — stop writing.
            markClosed();
        }
    };

    const markClosed = () => {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = null;
    };

    const readable = new ReadableStream<Uint8Array>({
        start(c) {
            controller = c;
            heartbeat = setInterval(() => enqueue(": ping\n\n"), HEARTBEAT_MS);
        },
        cancel() {
            markClosed();
        },
    });

    const writer: SSEWriter = {
        send(event: SSEEvent) {
            enqueue(encodeSSE(event));
        },
        close() {
            if (!controller || closed) return;
            markClosed();
            try {
                controller.close();
            } catch {
                // already closed
            }
        },
    };

    return { readable, writer };
}

export interface SSEWriter {
    send(event: SSEEvent): void;
    close(): void;
}
