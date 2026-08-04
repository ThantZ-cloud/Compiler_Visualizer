import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useCompile } from './CompileContext';
import { buildSteps, type Step, type StageId } from '../lib/buildSteps';

export type StageState = 'pending' | 'active' | 'complete';

interface StageRange {
  first: number;
  last: number;
}

interface StepperContextValue {
  steps: Step[];
  /** Current step index; -1 means reset / nothing stepped yet. */
  index: number;
  playing: boolean;
  /** Playback speed multiplier (0.5–4). */
  speed: number;
  currentStep: Step | null;
  currentStage: StageId | null;
  explainerText: string;
  hasSteps: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBack: () => void;
  reset: () => void;
  setSpeed: (s: number) => void;
  jumpToStage: (s: StageId) => void;
  getStageState: (s: StageId) => StageState;
  hasStageData: (s: StageId) => boolean;
  /** How many items of the given stage are revealed at the current index. */
  revealedCountForStage: (s: StageId) => number;
}

const StepperContext = createContext<StepperContextValue | undefined>(undefined);

const BASE_MS = 1000;
const MIN_SPEED = 0.5;
const MAX_SPEED = 4;

export const useStepper = (): StepperContextValue => {
  const ctx = useContext(StepperContext);
  if (!ctx) throw new Error('useStepper must be used within a StepperProvider');
  return ctx;
};

export const StepperProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { result } = useCompile();
  const steps = useMemo(() => (result ? buildSteps(result) : []), [result]);

  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);

  // First/last global step index for each stage.
  const stageRange = useMemo(() => {
    const map: Record<StageId, StageRange | null> = {
      lexer: null,
      parser: null,
      semantic: null,
      ir: null,
      codegen: null,
    };
    steps.forEach((s, i) => {
      const r = map[s.stage];
      if (!r) map[s.stage] = { first: i, last: i };
      else r.last = i;
    });
    return map;
  }, [steps]);

  // When a fresh compile produces a new step list, restart and auto-play.
  useEffect(() => {
    if (steps.length > 0) {
      setIndex(0);
      setPlaying(true);
    } else {
      setIndex(-1);
      setPlaying(false);
    }
  }, [steps]);

  // Advance on an interval while playing.
  useEffect(() => {
    if (!playing) return;
    const ms = BASE_MS / speed;
    const id = setInterval(() => {
      setIndex(prev => (prev >= steps.length - 1 ? prev : prev + 1));
    }, ms);
    return () => clearInterval(id);
  }, [playing, speed, steps.length]);

  // Auto-pause at the end.
  useEffect(() => {
    if (playing && index >= steps.length - 1) setPlaying(false);
  }, [index, playing, steps.length]);

  const play = useCallback(() => {
    setIndex(prev => (prev >= steps.length - 1 ? 0 : prev)); // replay from start if at end
    setPlaying(true);
  }, [steps.length]);

  const pause = useCallback(() => setPlaying(false), []);

  const togglePlay = useCallback(() => {
    setPlaying(p => {
      if (p) return false;
      setIndex(prev => (prev >= steps.length - 1 ? 0 : prev));
      return true;
    });
  }, [steps.length]);

  const stepForward = useCallback(() => {
    setPlaying(false);
    setIndex(prev => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const stepBack = useCallback(() => {
    setPlaying(false);
    setIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    setIndex(-1);
  }, []);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(Math.min(MAX_SPEED, Math.max(MIN_SPEED, s)));
  }, []);

  const jumpToStage = useCallback((stage: StageId) => {
    const r = stageRange[stage];
    if (!r) return;
    setPlaying(false);
    setIndex(r.first);
  }, [stageRange]);

  const getStageState = useCallback((stage: StageId): StageState => {
    const r = stageRange[stage];
    if (!r) return 'pending';
    if (index < r.first) return 'pending';
    if (index > r.last) return 'complete';
    return 'active';
  }, [stageRange, index]);

  const hasStageData = useCallback((stage: StageId): boolean => {
    return stageRange[stage] !== null;
  }, [stageRange]);

  const revealedCountForStage = useCallback((stage: StageId): number => {
    const r = stageRange[stage];
    if (!r || index < r.first) return 0;
    if (index > r.last) return r.last - r.first + 1;
    return index - r.first + 1;
  }, [stageRange, index]);

  const currentStep = index >= 0 && index < steps.length ? steps[index] : null;
  const currentStage = currentStep ? currentStep.stage : null;
  const explainerText = currentStep ? currentStep.text : '';

  const value: StepperContextValue = {
    steps,
    index,
    playing,
    speed,
    currentStep,
    currentStage,
    explainerText,
    hasSteps: steps.length > 0,
    play,
    pause,
    togglePlay,
    stepForward,
    stepBack,
    reset,
    setSpeed,
    jumpToStage,
    getStageState,
    hasStageData,
    revealedCountForStage,
  };

  return <StepperContext.Provider value={value}>{children}</StepperContext.Provider>;
};
