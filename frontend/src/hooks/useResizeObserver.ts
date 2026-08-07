import { useEffect, useState } from 'react';

/**
 * Observes an element's size with a ResizeObserver and returns { width, height }.
 * Returns 0s until the element is measured. Useful for D3 charts that need
 * responsive dimensions.
 */
export function useResizeObserver<T extends HTMLElement = HTMLDivElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ref, setRef] = useState<T | null>(null);

  useEffect(() => {
    if (!ref) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      }
    });
    ro.observe(ref);
    return () => ro.disconnect();
  }, [ref]);

  return { ref: setRef, ...size };
}