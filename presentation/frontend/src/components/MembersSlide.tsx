import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Mail, Send, Star } from 'lucide-react';
import { MEMBERS } from '../data/members';
import { SlideHead } from './SlideHead';

const roleStyle: Record<string, string> = {
  leader: 'border-amber text-amber',
  coLeader: 'border-cyan text-cyan',
  member: 'border-border-bright text-text-dim',
};

export const MembersSlide = () => {
  const { t } = useTranslation();
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  return (
    <div className="flex h-full flex-col p-5 sm:p-8">
      <SlideHead kicker={t('slides.members.kicker')} title={t('slides.members.title')} />
      <div className="grid flex-1 grid-cols-2 place-items-center gap-3 sm:grid-cols-5 sm:gap-1">
        {MEMBERS.map((m) => (
          <div
            key={m.key}
            className="card-lift flex w-full max-w-52 flex-col items-center gap-2 border border-border bg-surface p-3 text-center"
          >
            {failed[m.key] ? (
              <div className="flex h-32 w-32 items-center justify-center border border-neon font-display text-3xl font-bold text-neon sm:h-40 sm:w-40">
                {m.initials}
              </div>
            ) : (
              <img
                src={m.photo}
                alt={m.name}
                onError={() => setFailed((f) => ({ ...f, [m.key]: true }))}
                className="h-32 w-32 border border-border-bright object-cover sm:h-40 sm:w-40"
              />
            )}
            <p className="font-sans text-sm font-semibold leading-tight text-text sm:text-lg">
              {m.name}
            </p>
            <p className="font-mono text-xs tracking-widest text-text-dim sm:text-sm">{m.roll}</p>
            <div className="flex items-center gap-3">
              <a
                href={`https://t.me/${m.telegram}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Telegram ${m.telegram}`}
                title={`Telegram @${m.telegram}`}
                className="transition-colors hover:text-neon"
              >
                <Send size={16} className="text-cyan" />
              </a>
              <a
                href={`mailto:${m.email}`}
                aria-label={`Email ${m.email}`}
                title={m.email}
                className="transition-colors hover:text-neon"
              >
                <Mail size={16} className="text-amber" />
              </a>
            </div>
            <span
              className={`flex items-center gap-1 border px-2 py-0.5 font-mono text-xs tracking-widest ${roleStyle[m.roleKey]}`}
            >
              {m.roleKey === 'leader' ? (
                <Crown size={12} />
              ) : m.roleKey === 'coLeader' ? (
                <Star size={12} />
              ) : null}
              {t(`slides.members.roles.${m.roleKey}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
