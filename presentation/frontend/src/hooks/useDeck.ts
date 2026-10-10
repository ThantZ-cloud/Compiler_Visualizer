import { useCallback, useEffect, useState } from 'react';

export const TOTAL_SLIDES = 12;

function stepFromHash(): number {
  const n = parseInt(window.location.hash.replace('#', ''), 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(Math.max(n - 1, 0), TOTAL_SLIDES - 1);
}

export function useDeck() {
  const [step, setStep] = useState<number>(() => stepFromHash());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    window.location.hash = String(step + 1);
  }, [step]);

  useEffect(() => {
    const onHash = () => setStep(stepFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_SLIDES - 1)), []);
  const prev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);
  const goTo = useCallback(
    (n: number) => setStep(Math.min(Math.max(n, 0), TOTAL_SLIDES - 1)),
    [],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }, []);

  return { step, next, prev, goTo, toggleFullscreen, isFullscreen };
}
