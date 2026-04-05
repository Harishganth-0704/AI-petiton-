
import { useEffect, useState } from "react";
import { motion, useSpring, useTransform, animate } from "framer-motion";

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    className?: string;
}

export function AnimatedCounter({ value, duration = 2, className }: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const controls = animate(0, value, {
            duration: duration,
            onUpdate: (latest) => setDisplayValue(Math.floor(latest)),
            ease: "easeOut",
        });

        return () => controls.stop();
    }, [value, duration]);

    return (
        <span className={className}>
            {displayValue}
        </span>
    );
}
