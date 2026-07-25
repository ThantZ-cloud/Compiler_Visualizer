import { useEffect, useRef } from 'react';

const CHARS = '01';
const FONT_SIZE = 14;
const DROP_SPEED = 0.4;

function getThemeColors() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    bg: isLight ? 'rgba(240, 240, 248, 1)' : 'rgba(10, 10, 15, 1)',
    trail: isLight ? 'rgba(240, 240, 248, 0.15)' : 'rgba(10, 10, 15, 0.06)',
    bright: isLight ? '#00CC6A' : '#00FF88',
    brightGlow: isLight ? '#00CC6A' : '#00FF88',
    mid: isLight ? '#00CC6A88' : '#00FF8888',
    dim: isLight ? '#00CC6A33' : '#00FF8833',
    staticDim: isLight ? '#00CC6A22' : '#00FF8833',
    staticDim2: isLight ? '#00CC6A11' : '#00FF8811',
  };
}

const BinaryRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(getThemeColors());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update theme colors on theme switch
    const observer = new MutationObserver(() => {
      themeRef.current = getThemeColors();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // Draw a static frame instead of animating
      const c = themeRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FONT_SIZE}px JetBrains Mono, monospace`;
      for (let x = 0; x < canvas.width; x += FONT_SIZE * 3) {
        for (let y = 0; y < canvas.height; y += FONT_SIZE * 4) {
          ctx.fillStyle = Math.random() > 0.5 ? c.staticDim : c.staticDim2;
          ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, y);
        }
      }
      return;
    }

    let animId: number;
    let columns: number[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const colCount = Math.ceil(canvas.width / FONT_SIZE);
      columns = Array.from({ length: colCount }, () =>
        Math.random() * canvas.height / FONT_SIZE
      );
    };

    const draw = () => {
      const c = themeRef.current;
      ctx.fillStyle = c.trail;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px JetBrains Mono, monospace`;

      for (let i = 0; i < columns.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * FONT_SIZE;
        const y = columns[i] * FONT_SIZE;

        // Head character — bright green
        const brightness = Math.random();
        if (brightness > 0.7) {
          ctx.fillStyle = c.bright;
          ctx.shadowColor = c.brightGlow;
          ctx.shadowBlur = 8;
        } else if (brightness > 0.4) {
          ctx.fillStyle = c.mid;
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = c.dim;
          ctx.shadowBlur = 0;
        }

        ctx.fillText(char, x, y);
        ctx.shadowBlur = 0;

        if (y > canvas.height && Math.random() > 0.985) {
          columns[i] = 0;
        }
        columns[i] += DROP_SPEED;
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    // Pause animation when tab is hidden
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        draw();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 binary-rain-canvas"
      role="img"
      aria-label="Matrix-style binary rain background animation"
    />
  );
};

export default BinaryRain;
