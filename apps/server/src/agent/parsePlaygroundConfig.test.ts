import { describe, it, expect } from "bun:test";
import {
    parsePlaygroundConfig,
    parseFollowUps,
    normalizePlaygroundConfig,
    safeVisibleLength,
    stripThinkBlocks,
    inferImportedPackages,
    inferPreviewPort,
} from "./parsePlaygroundConfig.js";

function buildResponse(opts: {
    meta: Record<string, unknown>;
    files: Record<string, string>;
    followUps?: string[];
}): string {
    const fileBlocks = Object.entries(opts.files)
        .map(([path, contents]) => `<file path="${path}">\n${contents}\n</file>`)
        .join("\n");
    const followUps = opts.followUps
        ? `\n<follow_ups>\n${JSON.stringify(opts.followUps)}\n</follow_ups>`
        : "";
    return `Here's an explanation of the thing.\n\n<playground_config>\n${JSON.stringify(
        opts.meta
    )}\n</playground_config>\n${fileBlocks}${followUps}`;
}

describe("parsePlaygroundConfig", () => {
    it("parses a well-formed response into a valid config", () => {
        const text = buildResponse({
            meta: {
                runtime: "node",
                entry: "index.ts",
                installCommand: "npm install",
                startCommand: "npx tsx index.ts",
                previewPort: null,
            },
            files: {
                "index.ts": "console.log('hi')",
                "package.json": JSON.stringify({ name: "demo", version: "1.0.0" }),
            },
        });

        const result = parsePlaygroundConfig(text);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.entry).toBe("index.ts");
            expect(result.config.files["index.ts"]).toBe("console.log('hi')");
        }
    });

    it("returns reason:null when there's no playground_config block at all", () => {
        const result = parsePlaygroundConfig("Just a plain explanation, no playground needed.");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBeNull();
    });

    it("reports a typed error when the meta JSON is malformed", () => {
        const text =
            "Explanation.\n<playground_config>\n{not valid json\n</playground_config>\n<file path=\"index.ts\">\ncode\n</file>";
        const result = parsePlaygroundConfig(text);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toMatch(/JSON/);
    });

    it("reports a typed error when no file blocks are present", () => {
        const text = `Explanation.\n<playground_config>\n${JSON.stringify({
            runtime: "node",
            entry: "index.ts",
        })}\n</playground_config>`;
        const result = parsePlaygroundConfig(text);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toMatch(/file blocks/);
    });

    it("falls back to the first file when entry doesn't match any emitted file", () => {
        // The model declared entry: "index.ts" but only emitted "src/main.ts" —
        // the old `meta.entry || firstFile` fallback would keep the bogus
        // entry since it's truthy, producing a config that can't run.
        const text = buildResponse({
            meta: { runtime: "node", entry: "index.ts", previewPort: null },
            files: { "src/main.ts": "console.log('hi')" },
        });
        const result = parsePlaygroundConfig(text);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.config.entry).toBe("src/main.ts");
    });

    it("does not truncate on a control-tag substring that isn't line-anchored", () => {
        // Explanation text mentions a `<file-icon>` custom element mid-sentence —
        // a plain substring search for "<file" would have misidentified this as
        // the start of a file block and corrupted parsing.
        const text = buildResponse({
            meta: { runtime: "node", entry: "index.ts", previewPort: null },
            files: {
                "index.ts": "Render a <file-icon> component here, then more code.",
            },
        });
        const result = parsePlaygroundConfig(text);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.files["index.ts"]).toContain("<file-icon>");
        }
    });

    it("infers missing dependencies from imports", () => {
        const text = buildResponse({
            meta: { runtime: "node", entry: "index.ts", previewPort: null },
            files: {
                "index.ts": `import express from "express";\nimport { z } from "zod";`,
                "package.json": JSON.stringify({ name: "demo", dependencies: {} }),
            },
        });
        const result = parsePlaygroundConfig(text);
        expect(result.ok).toBe(true);
        if (result.ok) {
            const pkg = JSON.parse(result.config.files["package.json"]);
            expect(pkg.dependencies.express).toBeDefined();
            expect(pkg.dependencies.zod).toBeDefined();
        }
    });

    it("does not infer relative imports or node builtins as dependencies", () => {
        const files = {
            "index.ts": `import { readFileSync } from "fs";\nimport { helper } from "./util.js";`,
        };
        const inferred = inferImportedPackages(files);
        expect(inferred.has("fs")).toBe(false);
        expect(inferred.has("./util.js")).toBe(false);
        expect(inferred.size).toBe(0);
    });

    it("coerces a stringified previewPort into a number", () => {
        const config = normalizePlaygroundConfig({
            entry: "index.ts",
            files: { "index.ts": "x" },
            previewPort: "3000" as unknown as number,
        });
        expect(config.previewPort).toBe(3000);
    });

    it("infers previewPort from code when the model left it null", () => {
        const config = normalizePlaygroundConfig({
            entry: "index.ts",
            files: { "index.ts": "app.listen(4000)" },
            previewPort: null,
        });
        expect(config.previewPort).toBe(4000);
    });

    it("replaces ts-node with tsx in the start command", () => {
        const config = normalizePlaygroundConfig({
            entry: "index.ts",
            files: { "index.ts": "x" },
            startCommand: "ts-node index.ts",
        });
        expect(config.startCommand).toBe("tsx index.ts");
    });
});

describe("parseFollowUps", () => {
    it("parses up to 3 follow-up questions", () => {
        const text = buildResponse({
            meta: { runtime: "node", entry: "index.ts", previewPort: null },
            files: { "index.ts": "x" },
            followUps: ["Q1?", "Q2?", "Q3?", "Q4?"],
        });
        const questions = parseFollowUps(text);
        expect(questions).toHaveLength(3);
        expect(questions?.[0]).toBe("Q1?");
    });

    it("returns null when the block is absent", () => {
        expect(parseFollowUps("no follow ups here")).toBeNull();
    });
});

describe("stripThinkBlocks", () => {
    it("removes a complete <think> block", () => {
        expect(stripThinkBlocks("<think>reasoning here</think>The actual answer.")).toBe(
            "The actual answer."
        );
    });

    it("holds back a trailing unclosed <think> block", () => {
        expect(stripThinkBlocks("Before.<think>still reasoning")).toBe("Before.");
    });

    it("leaves normal text untouched", () => {
        expect(stripThinkBlocks("Just a normal response.")).toBe("Just a normal response.");
    });
});

describe("safeVisibleLength", () => {
    it("cuts at a line-anchored playground_config tag", () => {
        const text = "Explanation text.\n<playground_config>\n{}\n</playground_config>";
        expect(safeVisibleLength(text)).toBe(text.indexOf("<playground_config>"));
    });

    it("does not cut on a non-line-anchored occurrence of a control tag", () => {
        const text = "Check out this <file-icon> component, it's neat.";
        expect(safeVisibleLength(text)).toBe(text.length);
    });

    it("holds back a trailing partial tag at a line start", () => {
        const text = "Some text.\n<play";
        expect(safeVisibleLength(text)).toBe(text.indexOf("\n<play") + 1);
    });
});

describe("inferPreviewPort", () => {
    it("finds a port from .listen(", () => {
        expect(inferPreviewPort({ "index.ts": "app.listen(8080)" })).toBe(8080);
    });

    it("finds a port from a port: field", () => {
        expect(inferPreviewPort({ "index.ts": "serve({ fetch: app.fetch, port: 3000 })" })).toBe(
            3000
        );
    });

    it("returns null when no port is present", () => {
        expect(inferPreviewPort({ "index.ts": "console.log('no server here')" })).toBeNull();
    });
});
