import type { SSEEvent } from "../types/index.js";

/**
 * Encode an SSE event into the wire format.
 */
export function encodeSSE(event: SSEEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Create an SSE-compatible ReadableStream that you can write events to.
 */
export function createSSEStream(): {
    readable: ReadableStream<Uint8Array>;
    writer: SSEWriter;
} {
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

    const readable = new ReadableStream<Uint8Array>({
        start(c) {
            controller = c;
        },
    });

    const writer: SSEWriter = {
        send(event: SSEEvent) {
            if (controller) {
                controller.enqueue(encoder.encode(encodeSSE(event)));
            }
        },
        close() {
            if (controller) {
                controller.close();
            }
        },
    };

    return { readable, writer };
}

export interface SSEWriter {
    send(event: SSEEvent): void;
    close(): void;
}
