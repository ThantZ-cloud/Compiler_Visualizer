import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_PREFIX = 'cv-scroll:';
const SCROLL_ATTR = 'data-scroll-root';

/**
 * Remembers the scroll position of a route's scrollable container and restores
 * it when the user returns to the same route (e.g. via the browser/React Router
 * back button).
 *
 * Pages that scroll inside their own container should place the container under
 * a `ref` and either:
 *   - pass the ref to this hook, OR
 *   - mark the element with `data-scroll-root` and let the hook discover it
 *     by walking up from the component.
 *
 * Storage is per-pathname in `sessionStorage` so it survives SPA navigations
 * but resets on hard reload — this matches the natural expectation of "back
 * to where I was in this session".
 *
 * Race note: browsers fire native scroll-restoration events right after a back
 * navigation, which would overwrite the saved value. So persistence only becomes
 * active AFTER the restoration has settled (double rAF + timeout), and every
 * restore pass writes the canonical value back to storage.
 */
export function useScrollMemory(
  containerRef?: React.RefObject<HTMLElement | null>,
) {
  const location = useLocation();
  const pathname = location.pathname + location.search;

  // Resolve the scrollable element. Priority:
  //   1. explicit ref
  //   2. closest ancestor (or self) with [data-scroll-root]
  //   3. window (fallback)
  const resolveContainer = useCallback((): { el: HTMLElement | null; isWindow: boolean } => {
    if (containerRef?.current) {
      return { el: containerRef.current, isWindow: false };
    }
    if (typeof document !== 'undefined') {
      const marked = document.querySelector<HTMLElement>(`[${SCROLL_ATTR}]`);
      if (marked) return { el: marked, isWindow: false };
    }
    return { el: null, isWindow: true };
  }, [containerRef]);

  const writeScroll = (key: string, value: number) => {
    try {
      sessionStorage.setItem(key, String(value));
    } catch {
      /* sessionStorage may be unavailable (private mode, quota) */
    }
  };

  useEffect(() => {
    const key = STORAGE_PREFIX + pathname;
    let restored = false;
    let raf1 = 0;
    let raf2 = 0;
    let settleTimeout: ReturnType<typeof setTimeout> | undefined;
    let lateTimeout: ReturnType<typeof setTimeout> | undefined;
    let scrollRaf = 0;

    const { el, isWindow } = resolveContainer();

    // Track the latest user-visible scroll value. Read from here on unmount,
    // because the live element may already have been re-laid-out by the time
    // React runs cleanup (e.g. Layout flips the container to overflow:hidden),
    // which clamps el.scrollTop and would corrupt the saved position.
    const lastValueRef = { current: isWindow ? window.scrollY : el ? el.scrollTop : 0 };

    // Apply the saved position (or 0 if none). Writes the canonical value back
    // to storage so any later native scroll event is corrected.
    const applySaved = () => {
      try {
        const saved = sessionStorage.getItem(key);
        const hasSaved = saved !== null && !Number.isNaN(Number(saved));
        const target = hasSaved ? Number(saved) : 0;
        if (isWindow) {
          window.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
          lastValueRef.current = target;
        } else if (el) {
          el.scrollTop = target;
          lastValueRef.current = target;
        }
        if (hasSaved) writeScroll(key, target);
      } catch {
        /* ignore */
      }
    };

    // Restore after layout settles. Multiple passes win the race against the
    // browser's own scroll restoration on back navigation.
    raf1 = requestAnimationFrame(() => {
      applySaved();
      raf2 = requestAnimationFrame(() => {
        applySaved();
        settleTimeout = setTimeout(() => {
          applySaved();
          restored = true;
          // One late pass: Chrome's native back-navigation scroll restoration can
          // land after the settle timeout and would clobber our restored position.
          lateTimeout = setTimeout(() => {
            applySaved();
          }, 500);
        }, 120);
      });
    });

    // Persist scroll position, but only after restoration has settled.
    const onScroll = () => {
      if (!restored) return; // ignore native restoration events
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const value = isWindow ? window.scrollY : el ? el.scrollTop : 0;
        lastValueRef.current = value;
        writeScroll(key, value);
      });
    };

    if (isWindow) {
      window.addEventListener('scroll', onScroll, { passive: true });
    } else {
      el?.addEventListener('scroll', onScroll, { passive: true });
    }

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (settleTimeout) clearTimeout(settleTimeout);
      if (lateTimeout) clearTimeout(lateTimeout);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (isWindow) {
        window.removeEventListener('scroll', onScroll);
      } else {
        el?.removeEventListener('scroll', onScroll);
      }
      // Final snapshot on unmount — use the tracked value, not the live
      // element (which may already be clamped by a layout change), and use
      // the captured key, not the current pathname.
      writeScroll(key, lastValueRef.current);
    };
  }, [pathname, resolveContainer]);
}

/**
 * Wipes a route's saved scroll position. Useful for "fresh entry" links
 * (e.g. logo click) so we don't restore a stale position.
 */
export function clearScrollMemory(pathname: string) {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + pathname);
  } catch {
    /* ignore */
  }
}