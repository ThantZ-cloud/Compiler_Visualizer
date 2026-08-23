import React, { useState } from 'react';

interface ExampleStep {
  title: string;
  description: string;
  highlight?: string;
}

interface ExampleBlockProps {
  phase: string;
  defaultCode: string;
  language?: string;
  steps: ExampleStep[];
}

const ExampleBlock: React.FC<ExampleBlockProps> = ({ phase, defaultCode, steps }) => {
  const [code, setCode] = useState(defaultCode);
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-[var(--color-neon)] font-display tracking-[0.1em] uppercase mb-1">
          Example walkthrough — {phase}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          Edit the code below and step through how the compiler sees it — from what you write to what it builds.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">Example code — editable</span>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="w-full min-h-[140px] p-3 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)] focus:shadow-[0_0_10px_var(--color-neon-dim)]"
            spellCheck={false}
          />
          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Tip: try changing a keyword, adding a loop, or introducing a type error.</span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">Steps</span>
          <div className="flex flex-wrap gap-1.5">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border transition-colors ${activeStep === i ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
              >
                {i + 1}. {s.title}
              </button>
            ))}
          </div>

          <div className="rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] p-3">
            <div className="text-[11px] font-bold text-[var(--color-neon)] font-display tracking-wide uppercase mb-1">
              Step {activeStep + 1}: {steps[activeStep].title}
            </div>
            <div className="text-xs font-mono leading-relaxed text-[var(--color-text-dim)] whitespace-pre-wrap">
              {steps[activeStep].description}
            </div>
            {steps[activeStep].highlight && (
              <pre className="mt-2 p-2 rounded bg-[var(--color-void)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text)] whitespace-pre-wrap break-words">
                {steps[activeStep].highlight}
              </pre>
            )}
            <div className="mt-2 p-2 rounded bg-[var(--color-void)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-muted)]">
              <span className="text-[var(--color-neon)]">// your code chip</span>
              <br />
              {code.slice(0, 200)}{code.length > 200 ? ' …' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExampleBlock;
