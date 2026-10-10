import React from 'react';

export const SlideHead: React.FC<{ kicker: string; title: string; accent?: 'neon' | 'cyan' | 'magenta' | 'amber' }> = ({
  kicker,
  title,
  accent = 'neon',
}) => {
  const color =
    accent === 'cyan'
      ? 'text-cyan'
      : accent === 'magenta'
        ? 'text-magenta'
        : accent === 'amber'
          ? 'text-amber'
          : 'text-neon';
  return (
    <div className="mb-4">
      <p className={`font-mono text-sm tracking-widest ${color}`}>{kicker}</p>
      <h2 className="font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
        {title}
      </h2>
      <div className="mt-2 h-0.5 w-16 bg-neon" />
    </div>
  );
};
