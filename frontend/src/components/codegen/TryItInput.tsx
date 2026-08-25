import React from 'react';

interface TryItInputProps {
  value: string;
  onChange: (value: string) => void;
  presets: readonly string[];
  placeholder?: string;
}

const TryItInput: React.FC<TryItInputProps> = ({ value, onChange, presets, placeholder }) => {
  return (
    <div className="flex flex-col gap-2">
      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`px-2 py-1 rounded text-[9px] font-mono border transition-colors ${
              value === preset
                ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]'
                : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)]'
            }`}
          >
            {preset.length > 28 ? preset.slice(0, 26) + '…' : preset}
          </button>
        ))}
      </div>
      {/* Editable input */}
      <textarea
        name="codegen-tryit-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Type Java code…'}
        rows={2}
        className="w-full px-3 py-2 bg-[var(--color-void)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-neon)] focus:ring-1 focus:ring-[var(--color-neon)]/20 resize-y min-h-[36px]"
        spellCheck={false}
      />
    </div>
  );
};

export default TryItInput;
