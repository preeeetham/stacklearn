// Adapted from Aceternity UI — Card Hover Effect
// (https://ui.aceternity.com/components/card-hover-effect)
// Items are actions (buttons) here rather than links.
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "../../lib/utils";

export interface HoverItem {
    title: string;
    description: string;
    tag?: string;
}

export const HoverEffect = ({
    items,
    onSelect,
    disabled,
    className,
}: {
    items: HoverItem[];
    onSelect: (item: HoverItem) => void;
    disabled?: boolean;
    className?: string;
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div className={cn("grid grid-cols-1 sm:grid-cols-2", className)}>
            {items.map((item, idx) => (
                <button
                    key={item.title}
                    onClick={() => onSelect(item)}
                    disabled={disabled}
                    className="group relative block h-full w-full p-1.5 text-left disabled:opacity-60"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                >
                    <AnimatePresence>
                        {hoveredIndex === idx && (
                            <motion.span
                                className="absolute inset-0 block h-full w-full rounded-2xl bg-surface-800/80"
                                layoutId="hoverBackground"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
                            />
                        )}
                    </AnimatePresence>
                    <div className="relative z-20 h-full w-full overflow-hidden rounded-xl border border-surface-800 bg-surface-900 p-4 transition-colors group-hover:border-surface-600">
                        <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-medium tracking-wide text-surface-100">{item.title}</h4>
                            {item.tag && (
                                <span className="text-[10px] font-medium uppercase tracking-wider text-surface-500">
                                    {item.tag}
                                </span>
                            )}
                        </div>
                        <p className="mt-2 text-xs leading-relaxed tracking-wide text-surface-400">{item.description}</p>
                    </div>
                </button>
            ))}
        </div>
    );
};
