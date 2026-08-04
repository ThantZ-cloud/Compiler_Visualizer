import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { useCompile } from '../context/CompileContext';
import { PRESETS } from '../data/presets';

/**
 * Quick preset picker shown in the top nav on the Studio route.
 * Loads a sample program into the editor (marking it dirty).
 */
const PresetSelect: React.FC = () => {
  const { t } = useTranslation();
  const { setCode } = useCompile();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = PRESETS.find(p => p.id === e.target.value);
    if (preset) {
      setCode(preset.source);
    }
    // Return the control to its placeholder so the same preset can be re-picked.
    e.target.value = '';
  };

  return (
    <div className="relative flex items-center">
      <select
        defaultValue=""
        onChange={handleChange}
        aria-label={t('presets.label')}
        className="appearance-none bg-[var(--color-card)] border border-[var(--color-border)]
          text-[var(--color-text-dim)] text-sm font-medium rounded-[10px] pl-3 pr-8 py-2
          hover:border-[var(--color-border-bright)] hover:text-[var(--color-text)]
          focus:border-[var(--color-neon)] cursor-pointer transition-colors outline-none"
      >
        <option value="" disabled>
          {t('presets.label')}
        </option>
        {PRESETS.map(p => (
          <option key={p.id} value={p.id}>
            {t(p.titleKey)}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 text-[var(--color-text-muted)]"
      />
    </div>
  );
};

export default PresetSelect;
