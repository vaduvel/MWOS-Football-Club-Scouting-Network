type MwosIdentityProps = {
  subtitle?: string;
  compact?: boolean;
  showBadge?: boolean;
  className?: string;
  align?: 'left' | 'center';
  theme?: 'light' | 'dark';
};

export default function MwosIdentity({
  subtitle = 'Club Management',
  compact = false,
  showBadge = false,
  className = '',
  align = 'left',
  theme = 'light',
}: MwosIdentityProps) {
  const wrapperAlignment = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const logoHeight = compact ? 'h-8 md:h-9' : 'h-10 md:h-12';
  const badgeSize = compact ? 'h-10 w-10' : 'h-14 w-14';
  const subtitleColor = theme === 'dark' ? 'text-white' : 'text-[var(--color-primary)]';
  const captionColor = theme === 'dark' ? 'text-white/70' : 'text-[var(--color-mid)]';

  return (
    <div className={`flex flex-col gap-3 ${wrapperAlignment} ${className}`}>
      <div className={`flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}>
        <div className="rounded-2xl bg-white/96 border border-white/70 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.18)]">
          <img src="/branding/mwos-logo-bar.png" alt="MWOS logo" className={`${logoHeight} w-auto`} />
        </div>
        {showBadge && (
          <img
            src="/branding/mwos-club-badge.png"
            alt="MWOS Football Club badge"
            className={`${badgeSize} rounded-full border border-white/30 shadow-[0_12px_25px_rgba(15,23,42,0.2)]`}
          />
        )}
      </div>
      {subtitle ? (
        <div>
          <p className={`mwos-display text-2xl uppercase leading-none tracking-[0.12em] ${subtitleColor}`}>
            {subtitle}
          </p>
          <p className={`mt-1 text-[10px] font-bold uppercase tracking-[0.28em] ${captionColor}`}>
            Moors World of Sport Football Club
          </p>
        </div>
      ) : null}
    </div>
  );
}
