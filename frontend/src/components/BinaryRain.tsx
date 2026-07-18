import { useEffect, useRef } from 'react';

const CHARS = '01';
const FONT_SIZE = 14;
const DROP_SPEED = 0.4;

const BinaryRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // Draw a static frame instead of animating
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = 'rgba(10, 10, 15, 1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FONT_SIZE}px JetBrains Mono, monospace`;
      for (let x = 0; x < canvas.width; x += FONT_SIZE * 3) {
        for (let y = 0; y < canvas.height; y += FONT_SIZE * 4) {
          ctx.fillStyle = Math.random() > 0.5 ? '#00FF8833' : '#00FF8811';
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
      ctx.fillStyle = 'rgba(10, 10, 15, 0.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px JetBrains Mono, monospace`;

      for (let i = 0; i < columns.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * FONT_SIZE;
        const y = columns[i] * FONT_SIZE;

        // Head character — bright green
        const brightness = Math.random();
        if (brightness > 0.7) {
          ctx.fillStyle = '#00FF88';
          ctx.shadowColor = '#00FF88';
          ctx.shadowBlur = 8;
        } else if (brightness > 0.4) {
          ctx.fillStyle = '#00FF8888';
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = '#00FF8833';
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
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      style={{ opacity: 0.35 }}
    />
  );
};

export default BinaryRain;
