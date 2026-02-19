import React from "react";

interface FileTreeProps {
    files: Record<string, string>;
    activeFile: string;
    onSelectFile: (path: string) => void;
}

interface TreeNode {
    name: string;
    path: string;
    isFile: boolean;
    children: TreeNode[];
}

function buildTree(files: Record<string, string>): TreeNode[] {
    const root: TreeNode[] = [];

    const sortedPaths = Object.keys(files).sort();

    for (const filePath of sortedPaths) {
        const parts = filePath.split("/");
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const name = parts[i];
            const path = parts.slice(0, i + 1).join("/");
            const isFile = i === parts.length - 1;

            let existing = current.find((n) => n.name === name);
            if (!existing) {
                existing = { name, path, isFile, children: [] };
                current.push(existing);
            }
            current = existing.children;
        }
    }

    return root;
}

const FileIcon: React.FC<{ name: string }> = ({ name }) => {
    const ext = name.split(".").pop()?.toLowerCase();
    const iconMap: Record<string, { color: string; label: string }> = {
        ts: { color: "text-blue-400", label: "TS" },
        tsx: { color: "text-blue-400", label: "TX" },
        js: { color: "text-yellow-400", label: "JS" },
        jsx: { color: "text-yellow-400", label: "JX" },
        json: { color: "text-yellow-300", label: "{}" },
        md: { color: "text-surface-400", label: "MD" },
        css: { color: "text-pink-400", label: "CS" },
        html: { color: "text-orange-400", label: "HT" },
    };
    const icon = iconMap[ext || ""] || { color: "text-surface-500", label: "F" };

    return (
        <span className={`text-[9px] font-bold font-mono ${icon.color} w-5 text-center flex-shrink-0`}>
            {icon.label}
        </span>
    );
};

const TreeItem: React.FC<{
    node: TreeNode;
    activeFile: string;
    onSelect: (path: string) => void;
    depth: number;
}> = ({ node, activeFile, onSelect, depth }) => {
    const [expanded, setExpanded] = React.useState(true);
    const isActive = node.path === activeFile;

    if (node.isFile) {
        return (
            <button
                onClick={() => onSelect(node.path)}
                className={`
          w-full flex items-center gap-1.5 px-2 py-1 text-xs text-left rounded transition-colors duration-150
          ${isActive
                        ? "bg-brand-500/15 text-brand-300 border-l-2 border-brand-400"
                        : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 border-l-2 border-transparent"
                    }
        `}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
                <FileIcon name={node.name} />
                <span className="truncate">{node.name}</span>
            </button>
        );
    }

    return (
        <div>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-1 px-2 py-1 text-xs text-surface-400 hover:text-surface-200 transition-colors"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
                <svg
                    className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M9 6l6 6-6 6z" />
                </svg>
                <span className="font-medium">{node.name}</span>
            </button>
            {expanded && (
                <div>
                    {node.children.map((child) => (
                        <TreeItem
                            key={child.path}
                            node={child}
                            activeFile={activeFile}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const FileTree: React.FC<FileTreeProps> = ({
    files,
    activeFile,
    onSelectFile,
}) => {
    const tree = buildTree(files);

    return (
        <div className="h-full overflow-y-auto py-1" id="file-tree">
            {tree.map((node) => (
                <TreeItem
                    key={node.path}
                    node={node}
                    activeFile={activeFile}
                    onSelect={onSelectFile}
                    depth={0}
                />
            ))}
        </div>
    );
};
