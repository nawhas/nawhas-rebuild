import * as React from 'react';
import { ReciterAvatar, TrustLevelPill, type TrustLevel } from '@nawhas/ui';

/**
 * Shared hero for both /contributor/[username] (variant=profile) and
 * /dashboard (variant=dashboard).
 * Profile variant: 200px avatar, larger heading.
 * Dashboard variant: 80px avatar, inline single-row layout, lives in a card.
 *
 * ReciterAvatar (from @nawhas/ui) uses `name` for both alt text and gradient
 * variant selection; initials are derived internally. We accept `avatarInitials`
 * for forward-compat / explicit override but the rendered initials are
 * derived from `name` to keep the gradient + a11y labels consistent with
 * the rest of the app.
 */
export function ContributorHero({
  name,
  username,
  bio,
  trustLevel,
  stats,
  variant = 'profile',
}: {
  name: string;
  username: string;
  bio: string | null;
  trustLevel: TrustLevel;
  avatarInitials?: string;
  stats?: { total: number; approved: number; approvalRate: number };
  variant?: 'profile' | 'dashboard';
}): React.JSX.Element {
  if (variant === 'dashboard') {
    return (
      <div className="mb-10 flex items-center gap-5 rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <div className="h-[80px] w-[80px] shrink-0">
          <ReciterAvatar name={name} size="lg" fluid />
        </div>
        <div>
          <h1 className="font-serif text-[24px] font-medium text-[var(--text)]">{name}</h1>
          <p className="text-sm text-[var(--text-dim)]">@{username}</p>
          <div className="mt-2"><TrustLevelPill level={trustLevel} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 md:grid-cols-[200px_1fr]">
      <div className="h-[200px] w-[200px]">
        <ReciterAvatar name={name} size="lg" fluid />
      </div>
      <div>
        <h1 className="mb-2 font-serif text-[40px] font-semibold text-[var(--text)]">{name}</h1>
        <div className="mb-4 text-base text-[var(--text-dim)]">@{username}</div>
        {bio && <p className="mb-4 max-w-[600px] text-base leading-relaxed">{bio}</p>}
        {stats && (
          <div className="mb-6 flex flex-wrap gap-5 text-sm">
            <span><strong>{stats.total}</strong> <span className="text-[var(--text-dim)]">Total Contributions</span></span>
            <span><strong>{stats.approved}</strong> <span className="text-[var(--text-dim)]">Approved</span></span>
            <span><strong>{Math.round(stats.approvalRate * 100)}%</strong> <span className="text-[var(--text-dim)]">Approval Rate</span></span>
          </div>
        )}
        <TrustLevelPill level={trustLevel} />
      </div>
    </div>
  );
}
