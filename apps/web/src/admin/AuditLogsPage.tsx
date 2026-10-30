import {
  auditLogsResponseSchema,
  type AuditLogEntry,
} from '@circuits/shared';
import { useCallback, useEffect, useState } from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  activate,
  formatDate,
} from './AdminShared';
import { adminTextsI18n as adminTexts } from './fr';

const PAGE_SIZE = 25;

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const response = await apiRequest(
        `/audit-logs?limit=${PAGE_SIZE}&offset=${offset}`,
        auditLogsResponseSchema,
      );
      setLogs(response.logs);
      setTotal(response.total);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : adminTexts.error,
      );
    }
  }, [offset]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>{adminTexts.audit.title}</h1>
          <p>{adminTexts.audit.subtitle}</p>
        </div>
      </header>

      {error !== null ? <AdminError message={error} onRetry={() => void load()} /> : null}

      {logs === null ? (
        <AdminLoading />
      ) : logs.length === 0 ? (
        <AdminEmpty message={adminTexts.audit.empty} />
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{adminTexts.audit.date}</th>
                <th>{adminTexts.audit.actor}</th>
                <th>{adminTexts.audit.action}</th>
                <th>{adminTexts.audit.target}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} data-label={formatDate(log.createdAt)}>
                  <td data-label={adminTexts.audit.date}>{formatDate(log.createdAt)}</td>
                  <td data-label={adminTexts.audit.actor}>{log.actorName ?? '—'}</td>
                  <td data-label={adminTexts.audit.action}>
                    {adminTexts.auditActions[log.action] ?? log.action}
                  </td>
                  <td data-label={adminTexts.audit.target}>
                    {adminTexts.targetTypes[log.targetType] ?? log.targetType}
                    <small className="admin-mono">{log.targetId}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="admin-pagination">
            <button
              type="button"
              className="admin-button admin-button--ghost admin-button--small"
              disabled={offset === 0}
              onPointerDown={(event) =>
                activate(event, () => setOffset(Math.max(0, offset - PAGE_SIZE)))
              }
            >
              {adminTexts.audit.previous}
            </button>
            <span>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} sur {total}
            </span>
            <button
              type="button"
              className="admin-button admin-button--ghost admin-button--small"
              disabled={offset + PAGE_SIZE >= total}
              onPointerDown={(event) =>
                activate(event, () => setOffset(offset + PAGE_SIZE))
              }
            >
              {adminTexts.audit.next}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
