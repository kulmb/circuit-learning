import {
  serializeCircuit,
  type SandboxCircuit,
  type SandboxCircuitInput,
} from '@circuits/shared';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { useLanguage } from '../i18n/LanguageContext';
import { fr } from '../narration/fr';
import { useProgress } from '../progress/ProgressContext';
import { DEFAULT_BOARD } from './constants';
import {
  createEmptySandbox,
  nextSandboxName,
  sandboxFingerprint,
  sandboxPaletteItems,
  type SandboxWorkMeta,
} from './sandbox';
import {
  captureSandboxPhoto,
  sandboxPhotoDownloadName,
  type SandboxCapture,
  type SandboxPhoto,
} from './snapshot';
import { SandboxSnapshot } from './SandboxSnapshot';
import { WorkbenchPage } from './WorkbenchPage';
import { useWorkbenchStore } from './workbenchStore';
import './Sandbox.css';

export interface SandboxPageProps {
  onBack: () => void;
  capture?: SandboxCapture;
}

interface PhotoPreview extends SandboxPhoto {
  name: string;
  saved: boolean;
}

type PanelStatus = 'idle' | 'saved' | 'error';

const workDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
});

export function SandboxPage({
  onBack,
  capture = captureSandboxPhoto,
}: SandboxPageProps) {
  const { repository, ready, session } = useProgress();
  const ownerKey =
    session?.user.role === 'eleve' ? session.user.id : 'guest';
  const circuit = useWorkbenchStore((state) => state.circuit);
  const simulation = useWorkbenchStore((state) => state.simulation);
  const displayMode = useWorkbenchStore((state) => state.displayMode);
  const sandboxActive = useWorkbenchStore((state) => state.sandboxActive);
  const sandboxWork = useWorkbenchStore((state) => state.sandboxWork);
  const savedFingerprint = useWorkbenchStore(
    (state) => state.sandboxSavedFingerprint,
  );
  const loadSandboxCircuit = useWorkbenchStore(
    (state) => state.loadSandboxCircuit,
  );
  const markSandboxSaved = useWorkbenchStore(
    (state) => state.markSandboxSaved,
  );
  const clearSandboxCircuit = useWorkbenchStore(
    (state) => state.clearSandboxCircuit,
  );

  const [works, setWorks] = useState<SandboxCircuit[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [photo, setPhoto] = useState<PhotoPreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [status, setStatus] = useState<PanelStatus>('idle');
  const [photoError, setPhotoError] = useState(false);
  const [worksError, setWorksError] = useState(false);
  const snapshotRef = useRef<SVGSVGElement | null>(null);
  const savingRef = useRef(false);
  const photoBusyRef = useRef(false);
  const openingRef = useRef(false);

  const { language } = useLanguage();
  const paletteItems = useMemo(
    () => sandboxPaletteItems(),
    [language],
  );
  const currentName = sandboxWork?.name ?? nextSandboxName(works);
  const fingerprint = useMemo(
    () => sandboxFingerprint(circuit),
    [circuit],
  );
  const dirty =
    savedFingerprint !== null && fingerprint !== savedFingerprint;
  const overlayOpen = panelOpen || confirmClear || photo !== null;

  useEffect(() => {
    if (!ready) {
      return;
    }

    let active = true;
    setInitializing(true);
    setWorksError(false);

    void (async () => {
      try {
        const loadedWorks = await repository.listSandbox().catch(() => []);

        if (!active) {
          return;
        }

        const sorted = sortWorks(loadedWorks);
        setWorks(sorted);

        const store = useWorkbenchStore.getState();
        const keepCurrent =
          store.sandboxActive && store.sandboxOwnerKey === ownerKey;

        if (!keepCurrent) {
          const latest = sorted[0];

          if (latest !== undefined) {
            try {
              loadSandboxCircuit(
                latest.data,
                toWorkMeta(latest),
                ownerKey,
              );
            } catch {
              loadSandboxCircuit(
                createEmptySandbox(),
                null,
                ownerKey,
              );
            }
          } else {
            loadSandboxCircuit(createEmptySandbox(), null, ownerKey);
          }
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [ready, repository, ownerKey, loadSandboxCircuit]);

  useEffect(() => {
    setStatus('idle');
  }, [circuit]);

  useEffect(() => {
    if (!overlayOpen) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [overlayOpen]);

  const refreshWorks = useCallback(async () => {
    try {
      const loaded = await repository.listSandbox();
      setWorks(sortWorks(loaded));
      setWorksError(false);
    } catch {
      setWorksError(true);
    }
  }, [repository]);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    setPhotoError(false);
    setStatus('idle');
    setWorksError(false);
    void refreshWorks();
  }, [refreshWorks]);

  const sandboxChrome = useMemo(
    () => ({
      items: paletteItems,
      dirty,
      pauseCuriosity: overlayOpen,
      onOpenWorkshop: openPanel,
    }),
    [dirty, openPanel, overlayOpen, paletteItems],
  );

  async function captureCurrent(
    name: string,
  ): Promise<SandboxPhoto | null> {
    const svg = snapshotRef.current;

    if (svg === null) {
      return null;
    }

    try {
      return await capture(svg, { name });
    } catch {
      return null;
    }
  }

  async function saveCurrent(
    thumbnail?: string,
  ): Promise<SandboxCircuit | null> {
    if (savingRef.current) {
      return null;
    }

    savingRef.current = true;
    setSaving(true);
    setStatus('idle');

    try {
      const data = serializeCircuit(
        useWorkbenchStore.getState().circuit,
      );
      const dataFingerprint = JSON.stringify(data);
      const name = currentName;
      let nextThumbnail = thumbnail ?? sandboxWork?.thumbnail;

      if (thumbnail === undefined && nextThumbnail === undefined) {
        const captured = await captureCurrent(name);
        nextThumbnail = captured?.thumbnail;
      }

      const input: SandboxCircuitInput = {
        name,
        data,
      };

      if (sandboxWork !== null) {
        input.id = sandboxWork.id;
      }
      if (nextThumbnail !== undefined) {
        input.thumbnail = nextThumbnail;
      }

      const saved = await repository.saveSandbox(input);
      markSandboxSaved(toWorkMeta(saved), dataFingerprint);
      setWorks((previous) =>
        sortWorks([
          saved,
          ...previous.filter((work) => work.id !== saved.id),
        ]),
      );
      setStatus('saved');
      return saved;
    } catch {
      setStatus('error');
      return null;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handlePhoto(): Promise<void> {
    if (photoBusyRef.current || savingRef.current) {
      return;
    }

    photoBusyRef.current = true;
    setPhotoBusy(true);
    setPhotoError(false);
    setStatus('idle');

    try {
      const svg = snapshotRef.current;
      if (svg === null) {
        throw new Error('Snapshot is not ready.');
      }

      const captured = await capture(svg, { name: currentName });
      const saved = await saveCurrent(captured.thumbnail);

      setPhoto({
        photo: captured.photo,
        thumbnail: captured.thumbnail,
        name: saved?.name ?? currentName,
        saved: saved !== null,
      });
      setPanelOpen(false);
    } catch {
      setPhotoError(true);
    } finally {
      photoBusyRef.current = false;
      setPhotoBusy(false);
    }
  }

  async function handleOpenWork(work: SandboxCircuit): Promise<void> {
    if (openingRef.current || savingRef.current) {
      return;
    }

    openingRef.current = true;

    try {
      if (dirty) {
        const saved = await saveCurrent();
        if (saved === null) {
          return;
        }
      }

      loadSandboxCircuit(work.data, toWorkMeta(work), ownerKey);
      setPanelOpen(false);
      setPhotoError(false);
      setStatus('idle');
    } catch {
      setWorksError(true);
    } finally {
      openingRef.current = false;
    }
  }

  function handleClearConfirmed(): void {
    clearSandboxCircuit();
    setConfirmClear(false);
    setPanelOpen(false);
    setPhotoError(false);
    setStatus('idle');
  }

  if (!ready || initializing || !sandboxActive) {
    return (
      <div className="sandbox-loading">
        <div className="sandbox-loading__spinner" aria-hidden="true" />
        <p role="status">{fr.sandbox.loading}</p>
        <button
          type="button"
          className="sandbox-button sandbox-button--neutral"
          onPointerDown={(event) => activate(event, onBack)}
        >
          {fr.workbench.back}
        </button>
      </div>
    );
  }

  return (
    <div className="sandbox-page">
      <WorkbenchPage onBack={onBack} sandbox={sandboxChrome} />

      {panelOpen ? (
        <SandboxSnapshot
          circuit={circuit}
          simulation={simulation}
          displayMode={displayMode}
          board={DEFAULT_BOARD}
          svgRef={(node) => {
            snapshotRef.current = node;
          }}
        />
      ) : null}

      {panelOpen ? (
        <div
          className="sandbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sandbox-panel-title"
        >
          <section className="sandbox-panel">
            <header className="sandbox-panel__header">
              <div>
                <p className="sandbox-panel__eyebrow">
                  {fr.sandbox.title}
                </p>
                <h2 id="sandbox-panel-title">
                  {fr.sandbox.panelTitle}
                </h2>
              </div>
              <button
                type="button"
                className="sandbox-close"
                onPointerDown={(event) =>
                  activate(event, () => setPanelOpen(false))
                }
              >
                {fr.sandbox.close}
              </button>
            </header>

            <p className="sandbox-panel__name">
              <span>{currentName}</span>
              <span
                className={`sandbox-panel__badge${dirty ? ' is-dirty' : ''}`}
              >
                {dirty ? fr.sandbox.unsaved : fr.sandbox.current}
              </span>
            </p>

            <div className="sandbox-panel__actions">
              <button
                type="button"
                className="sandbox-button sandbox-button--primary"
                disabled={saving}
                onPointerDown={(event) =>
                  activate(event, () => {
                    void saveCurrent();
                  })
                }
              >
                <SaveIcon />
                <span>
                  {saving ? fr.sandbox.saving : fr.sandbox.save}
                </span>
              </button>

              <button
                type="button"
                className="sandbox-button sandbox-button--photo"
                disabled={saving || photoBusy}
                onPointerDown={(event) =>
                  activate(event, () => {
                    void handlePhoto();
                  })
                }
              >
                <CameraIcon />
                <span>
                  {photoBusy ? fr.sandbox.photoBusy : fr.sandbox.photo}
                </span>
              </button>

              <button
                type="button"
                className="sandbox-button sandbox-button--danger"
                disabled={saving || photoBusy}
                onPointerDown={(event) =>
                  activate(event, () => {
                    setPanelOpen(false);
                    setConfirmClear(true);
                  })
                }
              >
                <BroomIcon />
                <span>{fr.sandbox.clear}</span>
              </button>
            </div>

            <p
              className={`sandbox-panel__status sandbox-panel__status--${status}`}
              role="status"
              aria-live="polite"
            >
              {status === 'saved' ? fr.sandbox.saved : null}
              {status === 'error' ? fr.sandbox.saveError : null}
            </p>

            {photoError ? (
              <p className="sandbox-panel__error" role="alert">
                {fr.sandbox.photoError}
              </p>
            ) : null}

            {worksError ? (
              <p className="sandbox-panel__error" role="alert">
                {fr.sandbox.worksError}
              </p>
            ) : null}

            <section className="sandbox-works">
              <h3>{fr.sandbox.worksTitle}</h3>
              <p className="sandbox-works__hint">
                {works.length === 0
                  ? fr.sandbox.noWorks
                  : fr.sandbox.worksHint}
              </p>

              {works.length > 0 ? (
                <ul className="sandbox-works__grid">
                  {works.map((work) => {
                    const isCurrent = work.id === sandboxWork?.id;

                    return (
                      <li key={work.id}>
                        <button
                          type="button"
                          className={`sandbox-work${isCurrent ? ' is-current' : ''}`}
                          disabled={saving || photoBusy}
                          aria-current={isCurrent ? 'true' : undefined}
                          aria-label={`${fr.sandbox.openWork} ${work.name}`}
                          onPointerDown={(event) =>
                            activate(event, () => {
                              void handleOpenWork(work);
                            })
                          }
                        >
                          <span className="sandbox-work__thumb">
                            {work.thumbnail !== undefined ? (
                              <img
                                src={work.thumbnail}
                                alt=""
                                draggable={false}
                              />
                            ) : (
                              <span
                                className="sandbox-work__placeholder"
                                aria-hidden="true"
                              >
                                ⚡
                              </span>
                            )}
                          </span>
                          <span className="sandbox-work__name">
                            {work.name}
                          </span>
                          <span className="sandbox-work__date">
                            {workDateFormatter.format(work.updatedAt)}
                          </span>
                          {isCurrent ? (
                            <span className="sandbox-work__badge">
                              {fr.sandbox.current}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>

          </section>
        </div>
      ) : null}

      {confirmClear ? (
        <div
          className="sandbox-overlay sandbox-overlay--center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sandbox-clear-title"
        >
          <section className="sandbox-confirm">
            <h2 id="sandbox-clear-title">{fr.sandbox.clearTitle}</h2>
            <p>{fr.sandbox.clearText}</p>
            <div className="sandbox-confirm__choices">
              <button
                type="button"
                className="sandbox-button sandbox-button--danger"
                onPointerDown={(event) =>
                  activate(event, handleClearConfirmed)
                }
              >
                {fr.sandbox.clearYes}
              </button>
              <button
                type="button"
                className="sandbox-button sandbox-button--neutral"
                onPointerDown={(event) =>
                  activate(event, () => setConfirmClear(false))
                }
              >
                {fr.sandbox.clearNo}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {photo !== null ? (
        <div
          className="sandbox-overlay sandbox-overlay--center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sandbox-photo-title"
        >
          <section className="sandbox-photo-dialog">
            <h2 id="sandbox-photo-title">{fr.sandbox.photoReady}</h2>
            <img
              className="sandbox-photo-dialog__image"
              src={photo.photo}
              alt={fr.sandbox.photoAlt}
            />
            <p
              className={`sandbox-photo-dialog__status${photo.saved ? '' : ' is-error'}`}
              role="status"
            >
              {photo.saved
                ? fr.sandbox.photoSaved
                : fr.sandbox.photoNotSaved}
            </p>
            <a
              className="sandbox-button sandbox-button--primary sandbox-photo-dialog__download"
              href={photo.photo}
              download={sandboxPhotoDownloadName(photo.name)}
              target="_blank"
              rel="noopener"
            >
              {fr.sandbox.download}
            </a>
            <button
              type="button"
              className="sandbox-button sandbox-button--neutral"
              onPointerDown={(event) =>
                activate(event, () => setPhoto(null))
              }
            >
              {fr.sandbox.close}
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function activate(
  event: ReactPointerEvent<HTMLElement>,
  action: () => void,
): void {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  event.preventDefault();
  action();
}

function sortWorks(works: readonly SandboxCircuit[]): SandboxCircuit[] {
  return [...works].sort((left, right) => right.updatedAt - left.updatedAt);
}

function toWorkMeta(work: SandboxCircuit): SandboxWorkMeta {
  const meta: SandboxWorkMeta = {
    id: work.id,
    name: work.name,
    updatedAt: work.updatedAt,
  };

  if (work.thumbnail !== undefined) {
    meta.thumbnail = work.thumbnail;
  }

  return meta;
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 4h12l2 2v14H5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 4v5h7V4M8 20v-6h8v6" fill="currentColor" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect
        x="3"
        y="7"
        width="18"
        height="13"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 7l1.5-3h5L16 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" fill="currentColor" />
    </svg>
  );
}

function BroomIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M15 4l4 4-7 7-4-4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 11l5 5-3 4-5-5z"
        fill="currentColor"
      />
    </svg>
  );
}
