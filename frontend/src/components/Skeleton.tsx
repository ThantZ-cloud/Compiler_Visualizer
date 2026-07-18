import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
  height?: string;
  width?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  count = 1,
  height = '20px',
  width = '100%',
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-[skeleton-pulse_1.5s_ease-in-out_infinite] ${className}`}
          style={{
            height,
            width,
            backgroundColor: 'var(--color-surface)',
            borderRadius: '2px',
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

export default Skeleton;
