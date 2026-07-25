import React, { useRef, useEffect } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, type Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import type { ViewUpdate } from "@codemirror/view";
import { useThemeStore } from "../../store/themeStore";

interface CodeEditorProps {
    value: string;
    fileName: string;
    onChange: (value: string) => void;
    onSelectionChange?: (selectedText: string) => void;
}

function getLanguageExtension(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "ts":
        case "tsx":
            return javascript({ typescript: true, jsx: ext === "tsx" });
        case "js":
        case "jsx":
            return javascript({ jsx: ext === "jsx" });
        case "json":
            return json();
        case "css":
            return css();
        case "html":
            return html();
        case "md":
            return markdown();
        default:
            return javascript({ typescript: true });
    }
}

/**
 * Cache of serialised EditorState per file path so that switching tabs
 * preserves cursor position, scroll offset, and undo history.
 */
const stateCache = new Map<string, { json: unknown; scrollTop: number }>();

export const CodeEditor: React.FC<CodeEditorProps> = ({
    value,
    fileName,
    onChange,
    onSelectionChange,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const fileNameRef = useRef(fileName);
    const theme = useThemeStore((state) => state.theme);

    useEffect(() => {
        if (!editorRef.current) return;

        // Save current view state before switching
        if (viewRef.current && fileNameRef.current !== fileName) {
            const prevView = viewRef.current;
            stateCache.set(fileNameRef.current, {
                json: prevView.state.toJSON(),
                scrollTop: prevView.scrollDOM.scrollTop,
            });
            prevView.destroy();
            viewRef.current = null;
        }

        fileNameRef.current = fileName;

        const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
            if (update.docChanged) {
                onChange(update.state.doc.toString());
            }
            if (update.selectionSet && onSelectionChange) {
                const selection = update.state.selection.main;
                if (!selection.empty) {
                    const text = update.state.doc.sliceString(selection.from, selection.to);
                    onSelectionChange(text);
                }
            }
        });

        const extensions: Extension[] = [
            basicSetup,
            ...(theme === "dark" ? [oneDark] : []),
            getLanguageExtension(fileName),
            updateListener,
            EditorView.theme({
                "&": {
                    height: "100%",
                    fontSize: "13px",
                },
                ".cm-scroller": {
                    fontFamily: "'JetBrains Mono', monospace",
                },
            }),
        ];

        // Try to restore cached state for this file
        const cached = stateCache.get(fileName);
        let state: EditorState;

        if (cached) {
            try {
                state = EditorState.fromJSON(
                    cached.json,
                    { extensions },
                    {
                        // Field serializers for basicSetup internals
                    }
                );
                // If the doc content changed externally, update it
                if (state.doc.toString() !== value) {
                    state = EditorState.create({ doc: value, extensions });
                }
            } catch {
                // Fallback: create fresh state
                state = EditorState.create({ doc: value, extensions });
            }
        } else {
            state = EditorState.create({ doc: value, extensions });
        }

        const view = new EditorView({
            state,
            parent: editorRef.current,
        });

        // Restore scroll position
        if (cached) {
            requestAnimationFrame(() => {
                view.scrollDOM.scrollTop = cached.scrollTop;
            });
        }

        viewRef.current = view;

        return () => {
            // Save state on unmount too
            if (viewRef.current) {
                stateCache.set(fileName, {
                    json: viewRef.current.state.toJSON(),
                    scrollTop: viewRef.current.scrollDOM.scrollTop,
                });
            }
            view.destroy();
        };
    }, [fileName, theme]); // Re-create editor when file or theme changes

    // Update content when value changes externally
    useEffect(() => {
        const view = viewRef.current;
        if (view && view.state.doc.toString() !== value) {
            view.dispatch({
                changes: {
                    from: 0,
                    to: view.state.doc.length,
                    insert: value,
                },
            });
        }
    }, [value]);

    return (
        <div ref={editorRef} className="h-full overflow-hidden" id="code-editor" />
    );
};
