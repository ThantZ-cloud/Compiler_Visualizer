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

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
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
