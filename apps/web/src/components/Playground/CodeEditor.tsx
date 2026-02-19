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

export const CodeEditor: React.FC<CodeEditorProps> = ({
    value,
    fileName,
    onChange,
    onSelectionChange,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

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

        const state = EditorState.create({
            doc: value,
            extensions: [
                basicSetup,
                oneDark,
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
            ],
        });

        const view = new EditorView({
            state,
            parent: editorRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        };
    }, [fileName]); // Re-create editor when file changes

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
