import React from 'react';
import { CFG_TRYIT_PRESETS } from '../../lib/cfg/cfgTryIt';

interface TryItEditorProps {
  code: string;
  onChange: (code: string) => void;
}

const TryItEditor: React.FC<TryItEditorProps> = ({ code, onChange }) => {
  return (
    <div className="flex flex-col gap-1.5 mb-3">
      {/* Preset chips */}
      <div className="flex flex-wrap gap-1">
        {CFG_TRYIT_PRESETS.map(preset => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.code)}
            className="px-2 py-0.5 rounded text-[9px] font-mono border bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-neon)] hover:border-[var(--color-neon)] transition-colors"
            title={preset.code.slice(0, 80)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {/* Editable textarea */}
      <textarea
        value={code}
        onChange={e => onChange(e.target.value)}
        rows={Math.max(3, Math.min(10, code.split('\n').length + 1))}
        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2.5 py-2 text-[11px] font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-neon)] resize-y min-h-[60px]"
        placeholder="Type Java code — e.g.  int a = b + c; if (a > 0) x = 1; else x = 2;"
        spellCheck={false}
      />
      <span className="text-[8px] font-mono text-[var(--color-text-muted)]">
        Supports: assignments, if/else, for, while, blocks {'{ }'} — CFG updates live
      </span>
    </div>
  );
};

export default TryItEditor;
