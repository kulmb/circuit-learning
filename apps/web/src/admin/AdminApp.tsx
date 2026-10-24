import type { ReactNode } from 'react';

import { useProgress } from '../progress/ProgressContext';
import { matchPath, navigate, usePathname } from '../router';
import { AccountPage } from './AccountPage';
import { AdminLayout } from './AdminLayout';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminLoading, activate } from './AdminShared';
import { AuditLogsPage } from './AuditLogsPage';
import { adminTexts } from './fr';
import { GroupDashboardPage } from './GroupDashboardPage';
import { GroupDetailPage } from './GroupDetailPage';
import { GroupsPage } from './GroupsPage';
import { InstallPage } from './InstallPage';
import { InvitePage } from './InvitePage';
import { ParentHomePage } from './ParentHomePage';
import { StudentDetailPage } from './StudentDetailPage';
import { UsersPage } from './UsersPage';
import './Admin.css';

export interface AdminAppProps {
  path?: string;
}

export default function AdminApp({ path: pathOverride }: AdminAppProps = {}) {
  const currentPath = usePathname();
  const path = pathOverride ?? currentPath;
  const { session, ready } = useProgress();

  const invitation = matchPath('/invitation/:token', path);

  if (invitation !== null) {
    return <InvitePage token={invitation['token'] ?? ''} />;
  }

  if (!ready) {
    return <AdminLoading />;
  }

  if (session === null || session.user.role === 'eleve') {
    return <AdminLoginPage />;
  }

  const role = session.user.role;
  const teacher = role === 'admin' || role === 'encadrant';
  const groupDashboardMatch = matchPath(
    '/admin/groups/:groupId/dashboard',
    path,
  );
  const groupMatch = matchPath('/admin/groups/:groupId', path);
  const studentMatch = matchPath('/admin/students/:studentId', path);

  let content: ReactNode = null;

  if (path === '/admin' || path === '/admin/') {
    content = teacher ? <GroupsPage /> : <ParentHomePage />;
  } else if (groupDashboardMatch !== null) {
    content = teacher ? (
      <GroupDashboardPage groupId={groupDashboardMatch['groupId'] ?? ''} />
    ) : (
      <DeniedPage />
    );
  } else if (groupMatch !== null) {
    content = teacher ? (
      <GroupDetailPage groupId={groupMatch['groupId'] ?? ''} />
    ) : (
      <DeniedPage />
    );
  } else if (studentMatch !== null) {
    content = (
      <StudentDetailPage studentId={studentMatch['studentId'] ?? ''} />
    );
  } else if (path === '/admin/account') {
    content = <AccountPage />;
  } else if (path === '/admin/install') {
    content = <InstallPage />;
  } else if (path === '/admin/users') {
    content = role === 'admin' ? <UsersPage /> : <DeniedPage />;
  } else if (path === '/admin/audit') {
    content = role === 'admin' ? <AuditLogsPage /> : <DeniedPage />;
  } else {
    content = <NotFoundPage />;
  }

  return <AdminLayout session={session}>{content}</AdminLayout>;
}

function DeniedPage() {
  return (
    <section className="admin-page">
      <div className="admin-card">
        <h1>Accès refusé</h1>
        <p>Ton rôle ne permet pas d’ouvrir cette page.</p>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onPointerDown={(event) =>
            activate(event, () => navigate('/admin'))
          }
        >
          Retour
        </button>
      </div>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section className="admin-page">
      <div className="admin-card">
        <h1>Page introuvable</h1>
        <p>Cette adresse n’existe pas dans l’espace adulte.</p>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onPointerDown={(event) =>
            activate(event, () => navigate('/admin'))
          }
        >
          {adminTexts.nav.groups}
        </button>
      </div>
    </section>
  );
}
