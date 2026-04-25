'use client';

import { useTranslations } from 'next-intl';

type RoleKey = 'user' | 'contributor' | 'moderator';

const ROLE_BADGE: Record<
  RoleKey,
  { labelKey: 'roleMember' | 'roleContributor' | 'roleModerator'; color: string }
> = {
  user:        { labelKey: 'roleMember',      color: '#8a8a90' },
  contributor: { labelKey: 'roleContributor', color: '#2ecc71' },
  moderator:   { labelKey: 'roleModerator',   color: '#e8524e' },
};

interface RoleBadgeProps {
  role: string | null | undefined;
}

/** Color-coded uppercase role pill matching POC dropdown header treatment. */
export function RoleBadge({ role }: RoleBadgeProps): React.JSX.Element {
  const t = useTranslations('nav');
  const key: RoleKey = role === 'contributor' || role === 'moderator' ? role : 'user';
  const badge = ROLE_BADGE[key];
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{ color: badge.color, borderColor: badge.color }}
    >
      {t(badge.labelKey)}
    </span>
  );
}
