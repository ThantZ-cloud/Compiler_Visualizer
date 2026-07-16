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
          className={`skeleton ${className}`}
          style={{
            height,
            width,
            backgroundColor: 'var(--color-surface)',
            borderRadius: '2px',
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

export default Skeleton;
