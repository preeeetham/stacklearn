// Adapted from Aceternity UI — Placeholders And Vanish Input
// (https://ui.aceternity.com/components/placeholders-and-vanish-input).
// Changes: themed with the app's tokens, a loading state, the submitted text
// handed to onSubmit directly, and the model picker placed underneath.
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { ModelSelector } from "../Layout/ModelSelector";

interface Particle {
    x: number;
    y: number;
    r: number;
    color: string;
}

interface PromptInputProps {
    onSubmit: (value: string) => void;
    isLoading: boolean;
    placeholders: string[];
    autoFocus?: boolean;
    id?: string;
    className?: string;
}

export const PromptInput: React.FC<PromptInputProps> = ({
    onSubmit,
    isLoading,
    placeholders,
    autoFocus = false,
    id = "chat-input",
    className,
}) => {
    const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const start = () => {
            intervalRef.current = setInterval(
                () => setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length),
                3000
            );
        };
        const onVisibility = () => {
            if (document.visibilityState !== "visible" && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            } else if (document.visibilityState === "visible" && !intervalRef.current) {
                start();
            }
        };
        start();
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [placeholders]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState("");
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    // Rasterise the current text into particles (drawn at 2x, shown at 50%).
    const draw = useCallback(() => {
        const input = inputRef.current;
        const canvas = canvasRef.current;
        if (!input || !canvas) return;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = 800;
        canvas.height = 800;
        ctx.clearRect(0, 0, 800, 800);
        const styles = getComputedStyle(input);
        const fontSize = parseFloat(styles.getPropertyValue("font-size"));
        ctx.font = `${fontSize * 2}px ${styles.fontFamily}`;
        ctx.fillStyle = styles.color;
        ctx.fillText(value, 16, 40);

        const data = ctx.getImageData(0, 0, 800, 800).data;
        const particles: Particle[] = [];
        for (let y = 0; y < 800; y++) {
            const row = 4 * y * 800;
            for (let x = 0; x < 800; x++) {
                const e = row + 4 * x;
                if (data[e + 3] > 0) {
                    particles.push({
                        x,
                        y,
                        r: 1,
                        color: `rgba(${data[e]}, ${data[e + 1]}, ${data[e + 2]}, ${data[e + 3] / 255})`,
                    });
                }
            }
        }
        particlesRef.current = particles;
    }, [value]);

    useEffect(() => {
        draw();
    }, [value, draw]);

    const animate = (start: number) => {
        const frame = (pos: number) => {
            requestAnimationFrame(() => {
                const next: Particle[] = [];
                for (const p of particlesRef.current) {
                    if (p.x < pos) {
                        next.push(p);
                    } else {
                        if (p.r <= 0) continue;
                        p.x += Math.random() > 0.5 ? 1 : -1;
                        p.y += Math.random() > 0.5 ? 1 : -1;
                        p.r -= 0.05 * Math.random();
                        next.push(p);
                    }
                }
                particlesRef.current = next;
                const ctx = canvasRef.current?.getContext("2d");
                if (ctx) {
                    ctx.clearRect(pos, 0, 800, 800);
                    for (const { x, y, r, color } of particlesRef.current) {
                        if (x > pos) {
                            ctx.beginPath();
                            ctx.rect(x, y, r, r);
                            ctx.fillStyle = color;
                            ctx.strokeStyle = color;
                            ctx.stroke();
                        }
                    }
                }
                if (particlesRef.current.length > 0) {
                    frame(pos - 8);
                } else {
                    setValue("");
                    setAnimating(false);
                }
            });
        };
        frame(start);
    };

    const submit = () => {
        const text = value.trim();
        if (!text || isLoading || animating) return;
        setAnimating(true);
        draw();
        const maxX = particlesRef.current.reduce((m, p) => (p.x > m ? p.x : m), 0);
        animate(maxX);
        onSubmit(text);
    };

    return (
        <div className={className} id={`${id}-container`}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
                className={cn(
                    "relative h-11 w-full overflow-hidden rounded-full border border-surface-700 bg-surface-900 shadow-float transition duration-200 focus-within:border-surface-500",
                    value && "bg-surface-850"
                )}
            >
                <canvas
                    ref={canvasRef}
                    className={cn(
                        "pointer-events-none absolute left-3 top-[22%] origin-top-left scale-50 pr-20 text-base",
                        animating ? "opacity-100" : "opacity-0"
                    )}
                />
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => !animating && setValue(e.target.value)}
                    type="text"
                    aria-label="Ask StackLearn"
                    id={`${id}-textarea`}
                    autoComplete="off"
                    className={cn(
                        "relative z-50 h-full w-full rounded-full border-none bg-transparent pl-5 pr-14 text-sm text-surface-100 focus:outline-none",
                        animating && "text-transparent"
                    )}
                />

                <button
                    type="submit"
                    disabled={!value.trim() || isLoading}
                    id={`${id}-send`}
                    aria-label="Send"
                    className="absolute right-1.5 top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand-500 text-white transition duration-200 hover:bg-brand-600 disabled:bg-surface-800 disabled:text-surface-500"
                >
                    {isLoading ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <motion.svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <motion.path
                                d="M5 12l14 0"
                                initial={{ strokeDasharray: "50%", strokeDashoffset: "50%" }}
                                animate={{ strokeDashoffset: value ? 0 : "50%" }}
                                transition={{ duration: 0.3, ease: "linear" }}
                            />
                            <path d="M13 18l6 -6" />
                            <path d="M13 6l6 6" />
                        </motion.svg>
                    )}
                </button>

                <div className="pointer-events-none absolute inset-0 flex items-center rounded-full">
                    <AnimatePresence mode="wait">
                        {!value && (
                            <motion.p
                                key={`placeholder-${currentPlaceholder}`}
                                initial={{ y: 5, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -15, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "linear" }}
                                className="w-[calc(100%-4rem)] truncate pl-5 text-left text-sm font-normal text-surface-500"
                            >
                                {placeholders[currentPlaceholder]}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            </form>

            <div className="mt-1.5 flex justify-end">
                <ModelSelector />
            </div>
        </div>
    );
};
