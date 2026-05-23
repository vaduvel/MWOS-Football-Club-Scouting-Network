import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { useEffect, useRef, useState, type TouchEvent } from 'react';

type LoginOnboardingProps = {
  onFinish: () => void;
};

type OnboardingSlide = {
  id: string;
  label: string;
  description: string;
  image: string;
  alt: string;
};

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'coach',
    label: 'Coach',
    description: 'Plan training, tactics and squad communication before the week starts.',
    image: '/branding/onboarding/coach.jpg',
    alt: 'MWOS coach onboarding poster.',
  },
  {
    id: 'driver',
    label: 'Driver',
    description: 'Manage transport, pickup times and travel plans for every away day.',
    image: '/branding/onboarding/driver.jpg',
    alt: 'MWOS driver onboarding poster.',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Organize fixtures, records and the day-to-day operating view of the club.',
    image: '/branding/onboarding/admin.jpg',
    alt: 'MWOS admin onboarding poster.',
  },
  {
    id: 'players',
    label: 'Players',
    description: 'Keep training, fixtures and team updates visible for everyone who needs them.',
    image: '/branding/onboarding/players.jpg',
    alt: 'MWOS players onboarding poster.',
  },
];

const SWIPE_THRESHOLD = 40;
const ONBOARDING_BACKGROUND_POSITION = 'calc(50% - 12px) center';

export default function LoginOnboarding({ onFinish }: LoginOnboardingProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    ONBOARDING_SLIDES.slice(1).forEach((slide) => {
      const preloadImage = new Image();
      preloadImage.src = slide.image;
    });
  }, []);

  const activeSlide = ONBOARDING_SLIDES[activeIndex];
  const isFirstSlide = activeIndex === 0;
  const isLastSlide = activeIndex === ONBOARDING_SLIDES.length - 1;

  const goToPrevious = () => {
    setActiveIndex((current) => Math.max(0, current - 1));
  };

  const goToNext = () => {
    if (isLastSlide) {
      onFinish();
      return;
    }

    setActiveIndex((current) => Math.min(ONBOARDING_SLIDES.length - 1, current + 1));
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      goToNext();
      return;
    }

    goToPrevious();
  };

  return (
    <div
      className="relative h-dvh overflow-hidden bg-[#020617]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${activeSlide.image}')`,
          backgroundPosition: ONBOARDING_BACKGROUND_POSITION,
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.08)_42%,rgba(2,6,23,0.82)_100%)]" />
      <span className="sr-only">{activeSlide.alt}</span>

      <main className="relative flex h-dvh items-end justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
        <section className="w-full max-w-[25rem] rounded-[28px] border border-white/16 bg-[rgba(7,12,35,0.5)] p-4 text-white shadow-[0_24px_64px_rgba(2,6,23,0.28)] backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/58">
                MWOS role
              </p>
              <h1 className="mt-1 text-3xl font-black uppercase leading-none text-white">
                {activeSlide.label}
              </h1>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-3">
              <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-black text-white/82">
                {activeIndex + 1} / {ONBOARDING_SLIDES.length}
              </span>
              <div className="flex items-center gap-2">
                {ONBOARDING_SLIDES.map((slide, index) => (
                  <span
                    key={slide.id}
                    className={`h-2 rounded-full transition-all ${
                      index === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/28'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-[15px] font-semibold leading-6 text-white/78">
            {activeSlide.description}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={goToPrevious}
              disabled={isFirstSlide}
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/16 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white/12"
              aria-label="Previous onboarding slide"
            >
              <ArrowLeft size={22} />
            </button>

            <button
              type="button"
              onClick={goToNext}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-3 rounded-2xl border border-white/16 bg-white px-4 py-3 text-base font-black text-[var(--color-primary)] shadow-[0_16px_34px_rgba(2,6,23,0.24),inset_0_1px_0_rgba(255,255,255,0.5)] transition hover:bg-white/92"
            >
              <span>{isLastSlide ? 'Play intro' : 'Continue'}</span>
              {isLastSlide ? <Play size={20} /> : <ArrowRight size={22} />}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
