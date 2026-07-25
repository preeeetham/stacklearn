/**
 * Adaptive typewriter for streamed text.
 *
 * The model (Groq) often delivers text in a few large bursts, which makes the
 * chat jump. This buffers incoming text and reveals it at a steady cadence so it
 * reads like smooth typing. It's "adaptive": the more text is waiting, the more
 * characters are revealed per tick, so long answers never lag far behind while
 * short bursts still animate gently.
 */
export interface SmoothStreamer {
    /** Queue more streamed text to be revealed. */
    push(text: string): void;
    /** Signal the stream is complete; onComplete fires once the buffer drains. */
    finish(): void;
    /** Stop immediately, flushing all remaining text, then fire onComplete. */
    flushNow(): void;
    /** Stop without revealing the rest (e.g. on error/unmount). */
    cancel(): void;
}

interface Options {
    onReveal: (chunk: string) => void;
    onComplete: () => void;
    /** Milliseconds between reveal ticks. Lower = smoother/faster. */
    intervalMs?: number;
}

export function createSmoothStreamer(opts: Options): SmoothStreamer {
    const intervalMs = opts.intervalMs ?? 16;
    let pending = "";
    let finished = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    // Reveal a share of the backlog each tick (min 1 char) so playback speeds up
    // gracefully when the model is far ahead, but never dumps everything at once.
    function charsThisTick(): number {
        return Math.max(1, Math.ceil(pending.length * 0.18));
    }

    function stop() {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    }

    function tick() {
        if (pending.length > 0) {
            const n = Math.min(pending.length, charsThisTick());
            const chunk = pending.slice(0, n);
            pending = pending.slice(n);
            opts.onReveal(chunk);
        } else if (finished) {
            stop();
            opts.onComplete();
        }
    }

    function ensureRunning() {
        if (timer === null) {
            timer = setInterval(tick, intervalMs);
        }
    }

    return {
        push(text: string) {
            if (!text) return;
            pending += text;
            ensureRunning();
        },
        finish() {
            finished = true;
            ensureRunning();
        },
        flushNow() {
            stop();
            if (pending.length > 0) {
                opts.onReveal(pending);
                pending = "";
            }
            finished = true;
            opts.onComplete();
        },
        cancel() {
            stop();
            pending = "";
            finished = true;
        },
    };
}
