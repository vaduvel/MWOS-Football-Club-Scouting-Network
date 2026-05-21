type BrandSplashScreenProps = {
  message?: string;
  eyebrow?: string;
  loop?: boolean;
  onEnded?: () => void;
};

export default function BrandSplashScreen({
  message = 'Loading your workspace…',
  eyebrow = 'MWOS Club Management',
  loop = true,
  onEnded,
}: BrandSplashScreenProps) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#081126] px-5 py-6">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-22 blur-sm"
        style={{ backgroundImage: "url('/branding/mwos-fc-300-2.png')" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(68,109,255,0.16),rgba(6,10,24,0.72)_52%,rgba(3,7,19,0.94)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,9,24,0.24),rgba(4,9,24,0.76))]" />

      <div className="relative z-10 flex w-full max-w-[28rem] flex-col items-center gap-5">
        <div className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-[rgba(9,15,34,0.78)] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
          <video
            className="block h-auto max-h-[72dvh] w-full object-contain"
            autoPlay
            loop={loop}
            muted
            playsInline
            preload="auto"
            poster="/branding/mwos-fc-300-2.png"
            onEnded={onEnded}
          >
            <source src="/branding/mwos-loading-splash.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="w-full rounded-[24px] border border-white/12 bg-[rgba(6,12,28,0.56)] px-5 py-4 text-center shadow-[0_18px_48px_rgba(0,0,0,0.24)] backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/68">{eyebrow}</p>
          <p className="mt-2 text-sm font-semibold text-white/92">{message}</p>
        </div>
      </div>
    </div>
  );
}
