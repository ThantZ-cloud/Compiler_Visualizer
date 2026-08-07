import { useCallback, useEffect, useState } from 'react';

/**
 * Tracks which element (by index) is currently intersecting the viewport's
 * vertical center band, plus the scroll progress (0..1) of a scroll container.
 *
 * @param containerRef ref to the scrollable container (scroll progress source)
 * @param refs array of element refs to spy on
 * @param threshold visibility ratio required for a section to become active
 */
export function useScrollSpy(
  containerRef: React.RefObject<HTMLElement | null>,
  refs: React.MutableRefObject<(HTMLElement | null)[]>,
  threshold = 0.4,
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Scroll progress inside the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = container.scrollHeight - container.clientHeight;
        setScrollProgress(max > 0 ? container.scrollTop / max : 0);
      });
    };
    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [containerRef]);

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

  return { activeIndex, scrollProgress, scrollTo };
}