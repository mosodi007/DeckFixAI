import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedCounter({ 
  value, 
  duration = 800,
  className = '',
  formatter = (val) => val.toLocaleString()
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'up' | 'down' | null>(null);
  const previousValueRef = useRef(value);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const previousValue = previousValueRef.current;
    
    // Only animate if value actually changed
    if (previousValue === value) {
      return;
    }

    // Determine direction
    const direction = value > previousValue ? 'up' : 'down';
    setAnimationDirection(direction);
    setIsAnimating(true);
    previousValueRef.current = value;

    const startValue = displayValue;
    const endValue = value;
    const difference = endValue - startValue;
    const startTime = performance.now();
    startTimeRef.current = startTime;

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic for smooth deceleration)
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);

      const currentValue = Math.round(startValue + (difference * easedProgress));
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at the target value
        setDisplayValue(endValue);
        // Keep animation state briefly for visual feedback
        setTimeout(() => {
          setIsAnimating(false);
          setAnimationDirection(null);
        }, 300);
        startTimeRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration, displayValue]);

  // Get base color from className if it contains a color class
  const baseColorClass = className.match(/(text-\w+-\d+)/)?.[0] || '';
  const otherClasses = className.replace(/(text-\w+-\d+)/g, '').trim();

  return (
    <span
      className={`inline-block transition-all duration-300 ${
        isAnimating
          ? animationDirection === 'down'
            ? '!text-red-600'
            : animationDirection === 'up'
            ? '!text-green-600'
            : ''
          : ''
      } ${baseColorClass} ${otherClasses}`}
      style={{
        transform: isAnimating 
          ? animationDirection === 'down'
            ? 'scale(1.15)'
            : animationDirection === 'up'
            ? 'scale(1.15)'
            : 'scale(1)'
          : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.4s ease-out',
        display: 'inline-block',
      }}
    >
      {formatter(displayValue)}
    </span>
  );
}

