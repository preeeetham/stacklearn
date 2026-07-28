import { z } from "zod";

/**
 * Canonical shape of a playground config, shared by the server (which builds
 * it from the LLM's raw output) and the web app (which consumes it to mount
 * and run the WebContainer sandbox). Validating against this schema at the
 * server boundary is what turns a malformed LLM response into a reported
 * `playground_error` instead of a config that silently fails to run.
 */
export const PlaygroundConfigSchema = z.object({
    runtime: z.literal("node"),
    entry: z.string().min(1, "entry must be a non-empty path"),
    files: z
        .record(z.string(), z.string())
        .refine((files) => Object.keys(files).length > 0, {
            message: "files must contain at least one file",
        }),
    installCommand: z.string().min(1, "installCommand must be a non-empty command"),
    startCommand: z.string().min(1, "startCommand must be a non-empty command"),
    previewPort: z.number().int().positive().max(65535).nullable(),
});

export type PlaygroundConfig = z.infer<typeof PlaygroundConfigSchema>;

/**
 * A config that failed validation even after repair. Carries a short,
 * human-readable reason so the chat UI can surface it and offer a retry
 * instead of silently dropping the playground.
 */
export interface PlaygroundConfigFailure {
    reason: string;
}
