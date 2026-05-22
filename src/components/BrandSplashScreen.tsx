type BrandSplashScreenProps = {
  loop?: boolean;
  onEnded?: () => void;
};

export default function BrandSplashScreen({
  loop = true,
  onEnded,
}: BrandSplashScreenProps) {
  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[#020617]">
      <video
        className="block h-full w-full object-cover"
        autoPlay
        loop={loop}
        muted
        playsInline
        preload="auto"
        onEnded={onEnded}
      >
        <source src="/branding/mwos-loading-splash.mp4" type="video/mp4" />
      </video>
      <span className="sr-only">MWOS intro video</span>
    </div>
  );
}
