type BrandSplashScreenProps = {
  message?: string;
  eyebrow?: string;
};

export default function BrandSplashScreen({
  message = 'Loading your workspace…',
  eyebrow = 'MWOS Club Management',
}: BrandSplashScreenProps) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#081126]">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/branding/mwos-fc-300-2.png"
      >
        <source src="/branding/mwos-loading-splash.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(49,39,131,0.08),rgba(5,10,24,0.66)_56%,rgba(3,7,19,0.9)_100%)]" />

      <div className="absolute inset-x-6 bottom-[max(2rem,env(safe-area-inset-bottom))] rounded-[24px] border border-white/12 bg-[rgba(6,12,28,0.52)] px-5 py-4 text-center shadow-[0_18px_48px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/68">{eyebrow}</p>
        <p className="mt-2 text-sm font-semibold text-white/92">{message}</p>
      </div>
    </div>
  );
}
