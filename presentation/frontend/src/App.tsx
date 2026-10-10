import { useEffect } from 'react';
import { useDeck } from './hooks/useDeck';
import { useLanguage } from './context/LanguageContext';
import { SlideFrame } from './components/SlideFrame';
import { TitleSlide } from './components/TitleSlide';
import { MembersSlide } from './components/MembersSlide';
import { ContentsSlide } from './components/ContentsSlide';
import { IntroSlide } from './components/IntroSlide';
import { ObjectivesSlide } from './components/ObjectivesSlide';
import { StackSlide } from './components/StackSlide';
import { ERSlide } from './components/ERSlide';
import { StateSlide } from './components/StateSlide';
import { ListSlide } from './components/ListSlide';
import { ConclusionSlide } from './components/ConclusionSlide';
import { QASlide } from './components/QASlide';

function App() {
  const { step, next, prev, goTo, toggleFullscreen, isFullscreen } = useDeck();
  const { toggle } = useLanguage();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prev();
          break;
        case 'Home':
          e.preventDefault();
          goTo(0);
          break;
        case 'End':
          e.preventDefault();
          goTo(11);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'l':
        case 'L':
          toggle();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, goTo, toggleFullscreen, toggle]);

  return (
    <SlideFrame
      step={step}
      onPrev={prev}
      onNext={next}
      onGoTo={goTo}
      onFullscreen={toggleFullscreen}
      isFullscreen={isFullscreen}
    >
      {step === 0 && <TitleSlide />}
      {step === 1 && <MembersSlide />}
      {step === 2 && <ContentsSlide />}
      {step === 3 && <IntroSlide />}
      {step === 4 && <ObjectivesSlide />}
      {step === 5 && <StackSlide />}
      {step === 6 && <ERSlide />}
      {step === 7 && <StateSlide />}
      {step === 8 && <ListSlide kind="limitations" />}
      {step === 9 && <ListSlide kind="future" />}
      {step === 10 && <ConclusionSlide />}
      {step === 11 && <QASlide />}
    </SlideFrame>
  );
}

export default App;
