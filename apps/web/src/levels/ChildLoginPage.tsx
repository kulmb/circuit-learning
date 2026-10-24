import {
  JOIN_CODE_ALPHABET,
  PICTURE_PATTERNS,
  authSessionResponseSchema,
  avatarEmoji,
  groupChildrenResponseSchema,
  type AuthSessionResponse,
  type GroupChildrenResponse,
  type PicturePatternId,
} from '@circuits/shared';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { ApiClientError, apiRequest } from '../api/client';
import { ZapCharacter } from '../components/Zap';
import { getText } from '../narration/fr';
import { unlockNarration } from '../narration/narrationService';
import { useNarration } from '../narration/useNarration';
import { useProgress } from '../progress/ProgressContext';
import { navigate } from '../router';
import './ChildLoginPage.css';

const CODE_LENGTH = 6;
const KEYS = [...JOIN_CODE_ALPHABET];

type Stage = 'group' | 'students' | 'pictures';

export interface ChildLoginPageProps {
  onCancel: () => void;
  onGuest: () => void;
  onSuccess: () => void;
}

export function ChildLoginPage({
  onCancel,
  onGuest,
  onSuccess,
}: ChildLoginPageProps) {
  const { setSession } = useProgress();
  const narration = useNarration();
  const [stage, setStage] = useState<Stage>('group');
  const [code, setCode] = useState('');
  const [group, setGroup] = useState<GroupChildrenResponse | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [sequence, setSequence] = useState<PicturePatternId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);
  const submittedRef = useRef(false);

  useEffect(() => {
    let active = true;

    void apiRequest('/auth/device-pin', groupChildrenResponseSchema)
      .then((pinned) => {
        if (active) {
          setGroup(pinned);
          setStage('students');
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setCheckingPin(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const student =
    group?.students.find((candidate) => candidate.id === studentId) ?? null;

  useEffect(() => {
    if (stage === 'group' && !checkingPin) {
      narration.say('login.groupTitle');
    } else if (stage === 'students') {
      narration.say('login.chooseAvatar');
    } else if (stage === 'pictures') {
      narration.say('login.pictureTitle');
    }
  }, [checkingPin, narration.say, stage]);

  function pressKey(key: string): void {
    if (busy || code.length >= CODE_LENGTH) {
      return;
    }

    const next = `${code}${key}`;
    setCode(next);
    setError(null);

    if (next.length === CODE_LENGTH) {
      void lookUpGroup(next);
    }
  }

  async function lookUpGroup(value: string): Promise<void> {
    setBusy(true);
    setError(null);

    try {
      const found = await apiRequest(
        `/auth/children/group/${encodeURIComponent(value)}`,
        groupChildrenResponseSchema,
      );
      setGroup(found);
      setStage('students');
      setCode('');
    } catch {
      setCode('');
      setError(getText('login.groupError'));
      narration.say('login.groupError');
    } finally {
      setBusy(false);
    }
  }

  function chooseStudent(id: string): void {
    setStudentId(id);
    setSequence([]);
    setError(null);
    submittedRef.current = false;
    setStage('pictures');
  }

  function choosePicture(picture: PicturePatternId): void {
    if (busy || sequence.length >= 3 || submittedRef.current) {
      return;
    }

    unlockNarration();
    narration.say(`picture.${picture}`);
    const next = [...sequence, picture];
    setSequence(next);
    setError(null);

    if (next.length === 3) {
      submittedRef.current = true;
      void submitPassword(next);
    }
  }

  async function submitPassword(pattern: PicturePatternId[]): Promise<void> {
    if (group === null || student === null) {
      return;
    }

    setBusy(true);

    try {
      const session: AuthSessionResponse = await apiRequest(
        '/auth/children/login',
        authSessionResponseSchema,
        {
          method: 'POST',
          body: {
            ...(group.pinned ? {} : { joinCode: group.group.joinCode }),
            studentId: student.id,
            pattern,
          },
        },
      );
      setSession(session);
      onSuccess();
    } catch (caught) {
      submittedRef.current = false;
      setSequence([]);

      if (caught instanceof ApiClientError && caught.status === 423) {
        setError(getText('login.locked'));
        narration.say('login.locked');
      } else if (caught instanceof ApiClientError && caught.status === 401) {
        setError(getText('login.wrong'));
        narration.say('login.wrong');
      } else {
        setError(getText('login.connectionError'));
        narration.say('login.connectionError');
      }
    } finally {
      setBusy(false);
    }
  }

  function restart(): void {
    setSequence([]);
    setError(null);
    submittedRef.current = false;
  }

  function goBack(): void {
    if (stage === 'pictures') {
      setStudentId(null);
      setSequence([]);
      setError(null);
      submittedRef.current = false;
      setStage('students');
      return;
    }

    if (stage === 'students' && group?.pinned === true) {
      onCancel();
      return;
    }

    setGroup(null);
    setStudentId(null);
    setSequence([]);
    setError(null);
    setStage('group');
  }

  return (
    <main className={`child-login${error === null ? '' : ' has-error'}`}>
      <header className="child-login__top">
        <button
          type="button"
          className="child-login__small"
          onPointerDown={(event) => activate(event, onCancel)}
        >
          ← {getText('map.back')}
        </button>
        <p className="child-login__eyebrow">{getText('login.title')}</p>
        <button
          type="button"
          className="child-login__small"
          onPointerDown={(event) => activate(event, () => navigate('/admin'))}
        >
          {getText('login.adult')}
        </button>
      </header>

      <div className="child-login__zap" aria-live="polite">
        <ZapCharacter
          expression={error === null ? 'content' : 'surprised'}
          speaking={narration.speaking}
          className="child-login__robot"
        />
        <p className="child-login__bubble">
          {error ??
            (stage === 'pictures' && narration.text !== ''
              ? narration.text
              : stage === 'students'
                ? getText('login.chooseAvatar')
                : getText('login.groupHint'))}
        </p>
      </div>

      {checkingPin ? (
        <div className="child-login__spinner" aria-hidden="true" />
      ) : stage === 'group' ? (
        <section className="group-code">
          <h1>{getText('login.groupTitle')}</h1>
          <p>{getText('login.groupHint')}</p>

          <div className="group-code__entry">
            <div
              className="group-code__slots"
              aria-label={getText('login.groupTitle')}
            >
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <span
                  key={index}
                  className={`group-code__slot${code[index] === undefined ? '' : ' is-filled'}`}
                >
                  {code[index] ?? ''}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="group-code__delete"
              disabled={busy}
              aria-label={getText('login.delete')}
              onPointerDown={(event) =>
                activate(event, () => {
                  setCode((current) => current.slice(0, -1));
                  setError(null);
                })
              }
            >
              ⌫
            </button>
          </div>

          <button
            type="button"
            className="group-code__guest"
            onPointerDown={(event) => activate(event, onGuest)}
          >
            {getText('login.guest')}
          </button>

          <div className="group-code__keys">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className="group-code__key"
                disabled={busy}
                onPointerDown={(event) =>
                  activate(event, () => pressKey(key))
                }
              >
                {key}
              </button>
            ))}
          </div>

        </section>
      ) : stage === 'students' && group !== null ? (
        <section className="avatar-picker">
          <div className="avatar-picker__heading">
            <button
              type="button"
              className="child-login__small"
              onPointerDown={(event) => activate(event, goBack)}
            >
              ← {getText('login.back')}
            </button>
            <h1>{group.group.name}</h1>
          </div>

          {group.pinned ? (
            <p className="avatar-picker__pinned">{getText('login.pinned')}</p>
          ) : null}

          {group.students.length === 0 ? (
            <p className="avatar-picker__pinned">
              {getText('login.emptyGroup')}
            </p>
          ) : null}

          <div className="avatar-picker__grid">
            {group.students.map((child) => (
              <button
                key={child.id}
                type="button"
                className="avatar-picker__card"
                onPointerDown={(event) =>
                  activate(event, () => chooseStudent(child.id))
                }
              >
                <span className="avatar-picker__emoji" aria-hidden="true">
                  {avatarEmoji(child.avatarId)}
                </span>
                <span className="avatar-picker__name">{child.displayName}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="group-code__guest"
            onPointerDown={(event) => activate(event, onGuest)}
          >
            {getText('login.guest')}
          </button>
        </section>
      ) : stage === 'pictures' && student !== null ? (
        <section className="picture-password">
          <div className="picture-password__heading">
            <button
              type="button"
              className="child-login__small"
              onPointerDown={(event) => activate(event, goBack)}
            >
              ← {getText('login.back')}
            </button>
            <div>
              <h1>
                {avatarEmoji(student.avatarId)} {student.displayName}
              </h1>
              <p>{getText('login.pictureHint')}</p>
            </div>
          </div>

          <div className="picture-password__progress" aria-label="3 / 3">
            {Array.from({ length: 3 }, (_, index) => {
              const chosen = sequence[index];

              return (
                <span
                  key={index}
                  className={`picture-password__dot${chosen === undefined ? '' : ' is-filled'}`}
                >
                  {chosen === undefined
                    ? ''
                    : PICTURE_PATTERNS.find((pattern) => pattern.id === chosen)
                        ?.emoji ?? ''}
                </span>
              );
            })}
          </div>

          <div className="picture-password__grid">
            {PICTURE_PATTERNS.map((picture) => (
              <button
                key={picture.id}
                type="button"
                className="picture-password__card"
                aria-label={picture.label}
                disabled={busy}
                onPointerDown={(event) =>
                  activate(event, () => choosePicture(picture.id))
                }
              >
                <span aria-hidden="true">{picture.emoji}</span>
                <span className="picture-password__label">
                  {picture.label}
                </span>
              </button>
            ))}
          </div>

          {sequence.length > 0 && !busy ? (
            <button
              type="button"
              className="picture-password__restart"
              onPointerDown={(event) => activate(event, restart)}
            >
              {getText('login.retry')}
            </button>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function activate(
  event: ReactPointerEvent<HTMLButtonElement>,
  action: () => void,
): void {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  event.preventDefault();
  action();
}
