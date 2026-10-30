import type { AuthSessionResponse } from '@circuits/shared';
import type { ReactNode } from 'react';

import { LanguageSwitcher } from '../i18n/LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';
import { useProgress } from '../progress/ProgressContext';
import { navigate, usePathname } from '../router';
import { APP_VERSION } from '../version';
import { activate, AvatarPill, roleLabel } from './AdminShared';
import { adminTextsI18n as adminTexts } from './fr';

interface NavigationItem {
  label: string;
  path: string;
  active: (path: string) => boolean;
}

function navigationFor(role: string): NavigationItem[] {
  const account: NavigationItem = {
    label: adminTexts.nav.account,
    path: '/admin/account',
    active: (path) => path === '/admin/account',
  };
  const install: NavigationItem = {
    label: adminTexts.nav.install,
    path: '/admin/install',
    active: (path) => path === '/admin/install',
  };

  if (role === 'admin') {
    return [
      {
        label: adminTexts.nav.groups,
        path: '/admin',
        active: (path) => path === '/admin' || path.startsWith('/admin/groups/'),
      },
      {
        label: adminTexts.nav.users,
        path: '/admin/users',
        active: (path) => path.startsWith('/admin/users'),
      },
      {
        label: adminTexts.nav.audit,
        path: '/admin/audit',
        active: (path) => path.startsWith('/admin/audit'),
      },
      install,
      account,
    ];
  }

  if (role === 'encadrant') {
    return [
      {
        label: adminTexts.nav.groups,
        path: '/admin',
        active: (path) => path === '/admin' || path.startsWith('/admin/groups/'),
      },
      install,
      account,
    ];
  }

  return [
    {
      label: adminTexts.nav.children,
      path: '/admin',
      active: (path) =>
        path === '/admin' || path.startsWith('/admin/students/'),
    },
    install,
    account,
  ];
}

export function AdminLayout({
  session,
  children,
}: {
  session: AuthSessionResponse;
  children: ReactNode;
}) {
  useLanguage();
  const path = usePathname();
  const { logout } = useProgress();
  const navigation = navigationFor(session.user.role);

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <button
          type="button"
          className="admin-brand"
          onPointerDown={(event) => activate(event, () => navigate('/admin'))}
        >
          <span className="admin-brand__mark" aria-hidden="true">
            Z
          </span>
          <span>
            <strong>{adminTexts.appName}</strong>
            <small>{adminTexts.adultSpace}</small>
          </span>
        </button>

        <div className="admin-top__user">
          <LanguageSwitcher className="admin-top__language" />
          <AvatarPill
            avatarId={session.user.avatarId}
            name={`${session.user.displayName} · ${roleLabel(session.user.role)}`}
          />
          <button
            type="button"
            className="admin-button admin-button--ghost admin-button--small"
            onPointerDown={(event) =>
              activate(event, () => {
                void logout().then(() => navigate('/admin'));
              })
            }
          >
            {adminTexts.nav.logout}
          </button>
        </div>
      </header>

      <nav className="admin-nav" aria-label={adminTexts.adultSpace}>
        {navigation.map((item) => (
          <button
            key={item.path}
            type="button"
            className={`admin-nav__item${item.active(path) ? ' is-active' : ''}`}
            onPointerDown={(event) =>
              activate(event, () => navigate(item.path))
            }
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="admin-main">{children}</main>

      <footer className="admin-footer">
        <button
          type="button"
          className="admin-link"
          onPointerDown={(event) => activate(event, () => navigate('/'))}
        >
          ← {adminTexts.backToGame}
        </button>
        <span className="admin-version">Version {APP_VERSION}</span>
      </footer>
    </div>
  );
}
