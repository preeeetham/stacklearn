// Adapted from Aceternity UI — Text Generate Effect
// (https://ui.aceternity.com/components/text-generate-effect)
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";
import { cn } from "../../lib/utils";

export const TextGenerateEffect = ({
    words,
    className,
    wordClassName,
    filter = true,
    duration = 0.5,
}: {
    words: string;
    className?: string;
    /** Per-word classes; receives the word index so a phrase can be accented. */
    wordClassName?: (index: number) => string | undefined;
    filter?: boolean;
    duration?: number;
}) => {
    const [scope, animate] = useAnimate();
    const wordsArray = words.split(" ");

    useEffect(() => {
        animate(
            "span",
            { opacity: 1, filter: filter ? "blur(0px)" : "none" },
            { duration, delay: stagger(0.12) }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope.current]);

    return (
        <motion.div ref={scope} className={cn(className)}>
            {wordsArray.map((word, idx) => (
                <motion.span
                    key={word + idx}
                    className={cn("opacity-0", wordClassName?.(idx))}
                    style={{ filter: filter ? "blur(10px)" : "none" }}
                >
                    {word}{" "}
                </motion.span>
            ))}
        </motion.div>
    );
};
