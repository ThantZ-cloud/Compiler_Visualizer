import { useCallback, useEffect, useState } from 'react';

/**
 * Tracks which element (by index) is currently intersecting the viewport
 * and provides a scrollTo helper. Scroll progress removed with Three.js.
 *
 * @param containerRef ref to the scrollable container (unused for progress, kept for API compat)
 * @param refs array of element refs to spy on
 * @param threshold visibility ratio required for a section to become active
 */
export function useScrollSpy(
  _containerRef: React.RefObject<HTMLElement | null>,
  refs: React.MutableRefObject<(HTMLElement | null)[]>,
  threshold = 0.4,
) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Active section via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = refs.current.indexOf(entry.target as HTMLElement);
            if (index !== -1) setActiveIndex(index);
          }
        });
      },
      { threshold },
    );

    refs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [refs, threshold]);

  const scrollTo = useCallback(
    (index: number) => {
      refs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [refs],
  );

  return { activeIndex, scrollTo };
}