import { useEffect, useRef, useState } from 'react';

interface CounterProps {
    target: number;
    className?: string;
}

export const Counter = ({ target, className }: CounterProps) => {
    const [count, setCount] = useState(0);
    const counterRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const duration = 2000; // 2 seconds
        const increment = (target - 0) / (duration / 16); // 60fps
        let currentValue = 0;
        let animationFrameId: number;

        const updateCounter = () => {
            const value = Math.ceil(currentValue + increment);
            if (value <= target) {
                setCount(value);
                currentValue = value;
                animationFrameId = requestAnimationFrame(updateCounter);
            } else {
                setCount(target);
            }
        };

        // Start the counter animation when element is in view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        if (counterRef.current) {
            observer.observe(counterRef.current);
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (counterRef.current) {
                observer.unobserve(counterRef.current);
            }
        };
    }, [target]);

    return (
        <span ref={counterRef} className={className}>
            {count}
        </span>
    );
}; 