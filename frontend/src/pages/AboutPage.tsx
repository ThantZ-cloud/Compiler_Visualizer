import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, GraduationCap, Users } from 'lucide-react';
import { useScrollMemory } from '../hooks/useScrollMemory';

// ── Among Us crewmate avatar (placeholder — replace with real photos later) ──
const AmongUsAvatar: React.FC<{ color: string; shadow?: string; className?: string }> = ({ color, shadow, className }) => (
  <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="bodyShine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={shadow ?? color} stopOpacity="0.25" />
        <stop offset="45%" stopColor={color} />
        <stop offset="100%" stopColor={color} />
      </linearGradient>
      <linearGradient id="visorShine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#bfe8ff" />
        <stop offset="100%" stopColor="#7fc4ff" />
      </linearGradient>
    </defs>
    {/* Backpack */}
    <rect x="122" y="82" width="38" height="52" rx="12" fill={color} stroke={shadow ?? color} strokeOpacity="0.4" />
    {/* Body */}
    <path
      d="M60 70
         a50 50 0 0 1 100 0
         v40 a12 12 0 0 1 -12 12 h-76 a12 12 0 0 1 -12 -12 z"
      fill="url(#bodyShine)"
    />
    {/* Head */}
    <path
      d="M72 52
         a28 28 0 0 1 56 0
         v20 h-56 z"
      fill={color}
    />
    {/* Visor */}
    <ellipse cx="97" cy="62" rx="20" ry="14" fill="url(#visorShine)" />
    <ellipse cx="92" cy="59" rx="5" ry="3.5" fill="#ffffff" />
    {/* Legs */}
    <rect x="72" y="118" width="18" height="22" rx="8" fill={color} />
    <rect x="110" y="118" width="18" height="22" rx="8" fill={color} />
    {/* Boots */}
    <rect x="66" y="134" width="30" height="14" rx="7" fill={shadow ?? color} opacity="0.85" />
    <rect x="104" y="134" width="30" height="14" rx="7" fill={shadow ?? color} opacity="0.85" />
    {/* Outline */}
    <path
      d="M60 70
         a50 50 0 0 1 100 0
         v40 a12 12 0 0 1 -12 12 h-76 a12 12 0 0 1 -12 -12 z"
      fill="none" stroke="#000000" strokeOpacity="0.15" strokeWidth="2"
    />
  </svg>
);

// ── Social brand icons (inline SVG — lucide dropped brand icons) ──
type SocialIconProps = { className?: string };

const TikTokIcon: React.FC<SocialIconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const FacebookIcon: React.FC<SocialIconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TelegramIcon: React.FC<SocialIconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const InstagramIcon: React.FC<SocialIconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
);

// ── Team member type ──
interface Socials {
  tiktok: string;
  facebook: string;
  telegram: string;
  instagram: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  quote: string;
  gender: 'male' | 'female';
  accent: string;
  tint: string;
  avatar: string;
  avatarShadow: string;
  photoUrl: string;
  email: string;
  phone: string;
  socials: Socials;
}

// ── Reveal wrapper (same pattern as LandingPage) ──
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// ── Section eyebrow ──
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[var(--color-neon)] text-xs font-bold tracking-[0.25em] mb-4 font-mono uppercase">
      {children}
    </div>
  );
}

// ── Flip card ──
const FlipCard: React.FC<{ member: TeamMember; delay: number }> = ({ member, delay }) => {
  const reduce = useReducedMotion();

  const socials: { key: keyof Socials; Icon: React.FC<SocialIconProps>; label: string }[] = [
    { key: 'facebook', Icon: FacebookIcon, label: 'Facebook' },
    { key: 'instagram', Icon: InstagramIcon, label: 'Instagram' },
    { key: 'tiktok', Icon: TikTokIcon, label: 'TikTok' },
    { key: 'telegram', Icon: TelegramIcon, label: 'Telegram' },
  ];

  return (
    <motion.div
      className="group [perspective:1200px] h-[460px] cursor-pointer"
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-within:[transform:rotateY(180deg)]">
        {/* FRONT — photo + name + role + quote */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col">
          <div
            className="absolute inset-x-0 top-0 h-0.5"
            style={{ background: member.accent, opacity: 0.8 }}
          />
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: `radial-gradient(120% 100% at 50% 0%, ${member.tint}, transparent 70%)` }}
          />
          {/* Photo */}
          <div className="relative flex items-center justify-center pt-10 pb-5">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-40"
                style={{ background: member.accent }}
              />
              <div
                className="relative w-36 h-36 rounded-full overflow-hidden border-2"
                style={{ borderColor: member.accent }}
              >
                <img
                  src={member.photoUrl}
                  alt={`${member.name} profile photo`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = target.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.classList.remove('hidden');
                    target.classList.add('hidden');
                  }}
                />
                <div className="absolute inset-0 hidden flex items-center justify-center">
                  <AmongUsAvatar
                    color={member.avatar}
                    shadow={member.avatarShadow}
                    className="w-28 h-28"
                  />
                </div>
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border border-[var(--color-border)] bg-[var(--color-void)] flex items-center justify-center"
                aria-hidden="true"
              >
                <Users size={14} style={{ color: member.accent }} />
              </span>
            </div>
          </div>
          {/* Name + role + quote */}
          <div className="relative flex flex-col items-center text-center px-5 pb-6 flex-1">
            <h3 className="font-display text-base font-bold tracking-wider text-[var(--color-text)]">
              {member.name}
            </h3>
            <span
              className="mt-2.5 px-3.5 py-1 text-[10px] font-bold tracking-[0.15em] uppercase border rounded font-mono"
              style={{ color: member.accent, borderColor: member.accent, background: member.tint }}
            >
              {member.role}
            </span>
            <p
              className="mt-4 text-xs italic leading-relaxed text-[var(--color-text-dim)] font-mono max-w-[220px]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              "{member.quote}"
            </p>
            <span className="mt-auto pt-3 text-[10px] font-mono tracking-[0.2em] text-[var(--color-text-muted)]">
              HOVER TO CONNECT
            </span>
          </div>
        </div>

        {/* BACK — contact info + socials */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl border border-[var(--color-border)] bg-[var(--color-void-light)] overflow-hidden flex flex-col">
          <div
            className="absolute inset-x-0 top-0 h-0.5"
            style={{ background: member.accent, opacity: 0.8 }}
          />
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(120% 100% at 50% 0%, ${member.accent}, transparent 70%)` }}
          />
          <div className="relative flex-1 flex flex-col items-center justify-center px-5">
            <span className="text-[10px] font-bold tracking-[0.25em] font-mono uppercase mb-4" style={{ color: member.accent }}>
              {member.role}
            </span>
            <h3 className="font-display text-sm font-bold tracking-wider text-[var(--color-text)] mb-5 text-center">
              {member.name}
            </h3>

            {/* Email + phone */}
            <div className="w-full space-y-2.5 mb-6">
              <a
                href={`mailto:${member.email}`}
                className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-neon)] transition-colors text-[11px] text-[var(--color-text-dim)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <Mail size={13} style={{ color: member.accent }} />
                <span className="truncate">{member.email}</span>
              </a>
              <a
                href={`tel:${member.phone}`}
                className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-neon)] transition-colors text-[11px] text-[var(--color-text-dim)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <Phone size={13} style={{ color: member.accent }} />
                <span>{member.phone}</span>
              </a>
            </div>

            {/* Social icons — aligned to the same width/inset as email & phone rows */}
            <div className="w-full px-3 flex items-center justify-between gap-2">
              {socials.map(({ key, Icon, label }) => (
                <a
                  key={key}
                  href={member.socials[key]}
                  target={member.socials[key].startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-label={`${member.name} ${label}`}
                  className="flex-1 min-h-[44px] flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-void)] transition-all"
                  style={{ ['--hover-accent' as string]: member.accent }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = member.accent;
                    (e.currentTarget as HTMLElement).style.borderColor = member.accent;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${member.accent}44`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '';
                    (e.currentTarget as HTMLElement).style.borderColor = '';
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                  }}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Page ──
const AboutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Remember scroll position across navigations
  useScrollMemory();

  const members = useMemo<TeamMember[]>(() => {
    const m = (
      id: string,
      name: string,
      role: string,
      gender: 'male' | 'female',
      accent: string,
      tint: string,
      avatar: string,
      avatarShadow: string,
      photoUrl: string,
    ): TeamMember => ({
      id,
      name,
      role,
      quote: t(`about.members.${id}.quote`),
      gender,
      accent,
      tint,
      avatar,
      avatarShadow,
      photoUrl,
      email: t(`about.members.${id}.email`),
      phone: t(`about.members.${id}.phone`),
      socials: {
        tiktok: t(`about.members.${id}.socials.tiktok`),
        facebook: t(`about.members.${id}.socials.facebook`),
        telegram: t(`about.members.${id}.socials.telegram`),
        instagram: t(`about.members.${id}.socials.instagram`),
      },
    });

    return [
      m('thant', t('about.members.thant.name'), t('about.members.thant.role'), 'male', 'var(--color-neon)', 'var(--color-neon-dim)', '#00FF88', '#00994F', 'https://randomuser.me/api/portraits/men/32.jpg'),
      m('phyoLin', t('about.members.phyoLin.name'), t('about.members.phyoLin.role'), 'male', 'var(--color-cyan)', 'var(--color-cyan-dim)', '#00D4FF', '#0088A8', 'https://randomuser.me/api/portraits/men/75.jpg'),
      m('phyoThin', t('about.members.phyoThin.name'), t('about.members.phyoThin.role'), 'female', 'var(--color-magenta)', 'var(--color-magenta-dim)', '#FF00FF', '#A600A6', 'https://randomuser.me/api/portraits/women/44.jpg'),
      m('linLatt', t('about.members.linLatt.name'), t('about.members.linLatt.role'), 'female', 'var(--color-amber)', 'var(--color-amber-dim)', '#FFB000', '#A87000', 'https://randomuser.me/api/portraits/women/65.jpg'),
      m('hmone', t('about.members.hmone.name'), t('about.members.hmone.role'), 'female', 'var(--color-rose)', 'var(--color-rose-dim)', '#FF3366', '#A62042', 'https://randomuser.me/api/portraits/women/68.jpg'),
    ];
  }, [t]);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-void)] overflow-y-auto" data-scroll-root="true">
      {/* Header bar — matching Pipeline page style */}
      <div className="relative z-20 flex items-center gap-4 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-sm shrink-0">
        <button
          className="text-[var(--color-text-dim)] hover:text-[var(--color-neon)] transition-colors text-xs tracking-[0.1em]"
          style={{ fontFamily: 'var(--font-mono)' }}
          onClick={() => navigate(-1)}
        >
          {t('about.back')}
        </button>
        <span
          className="text-[10px] font-bold text-[var(--color-neon)] tracking-[0.3em] uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {'< '} ABOUT {' />'}
        </span>
      </div>

      {/* Content wrapper — z-10 ensures header bar stays on top */}
      <div className="relative z-10 flex-1">

      {/* ═══ HERO — university + team intro ═══ */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div className="absolute inset-0 band-grid opacity-40 pointer-events-none" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl bg-[var(--color-neon-dim)] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-24">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <SectionLabel>{t('about.label')}</SectionLabel>
            <h1 className="font-display font-black tracking-wider text-[var(--color-text)] text-4xl md:text-6xl leading-tight">
              {t('about.headline')}
            </h1>

            <div className="mt-8 flex flex-col md:flex-row md:items-center gap-4">
              <div className="inline-flex items-center gap-2.5 px-5 py-3 border border-[var(--color-border)] bg-[var(--color-card)] rounded-lg">
                <GraduationCap size={18} className="text-[var(--color-neon)]" />
                <div>
                  <div className="text-sm font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>
                    {t('about.university')}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                    {t('about.universityShort')}
                  </div>
                </div>
              </div>

              <div className="inline-flex items-center gap-2.5 px-5 py-3 border border-[var(--color-border)] bg-[var(--color-card)] rounded-lg">
                <MapPin size={18} className="text-[var(--color-cyan)]" />
                <div className="text-sm text-[var(--color-text)] font-mono">
                  {t('about.location')}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-6">
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-dim)]">
                <Users size={14} className="text-[var(--color-magenta)]" />
                {t('about.year')}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-dim)]">
                <span className="w-1.5 h-1.5 bg-[var(--color-amber)]" />
                {t('about.project')}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ TEAM GRID — flip cards ═══ */}
      <section className="relative py-20">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-6">
          <Reveal>
            <SectionLabel>{t('about.teamLabel')}</SectionLabel>
            <h2 className="text-2xl md:text-3xl font-black font-display text-[var(--color-text)] mb-3">
              {t('about.teamHeadline')}
            </h2>
            <p className="text-sm text-[var(--color-text-dim)] leading-relaxed font-sans max-w-2xl">
              {t('about.teamDescription')}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-5 mt-12">
            {members.map((m, i) => (
              <FlipCard key={m.id} member={m} delay={(i % 5) * 0.07} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CONTACT CTA ═══ */}
      <section className="relative py-16 bg-[var(--color-card)] border-t border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <SectionLabel>{t('about.contactLabel')}</SectionLabel>
            <h2 className="text-2xl md:text-3xl font-black font-display text-[var(--color-text)] mb-4">
              {t('about.contactHeadline')}
            </h2>
            <p className="text-sm text-[var(--color-text-dim)] leading-relaxed font-sans mb-8 max-w-xl mx-auto">
              {t('about.contactDescription')}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
              <a
                href={`mailto:${t('about.teamEmail')}`}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 btn-neon min-h-[48px]"
              >
                <Mail size={16} />
                {t('about.contactCta')}
              </a>
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[48px] text-xs font-bold tracking-[0.12em] text-[var(--color-text-dim)] border border-[var(--color-border)] hover:text-[var(--color-neon)] hover:border-[var(--color-neon)] transition-all"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t('about.back')}
              </button>
            </div>
          </Reveal>
        </div>
      </section>
      </div>
    </div>
  );
};

export default AboutPage;
