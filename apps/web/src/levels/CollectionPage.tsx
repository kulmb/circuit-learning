import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { ZapCharacter } from '../components/Zap';
import {
  getText,
  getVocabulary,
  type VocabularyEntry,
} from '../narration/fr';
import { unlockNarration } from '../narration/narrationService';
import { useNarration } from '../narration/useNarration';
import { useProgressRepository } from '../progress/ProgressContext';
import './CollectionPage.css';

export interface CollectionPageProps {
  onBack: () => void;
}

interface Card {
  id: string;
  entry: VocabularyEntry;
}

export function CollectionPage({ onBack }: CollectionPageProps) {
  const repository = useProgressRepository();
  const narration = useNarration();
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    let active = true;

    void repository.getProgress().then((progress) => {
      if (!active) {
        return;
      }

      const unique = [...new Set(progress.vocabulary)].flatMap((id) => {
        const entry = getVocabulary(id);
        return entry === null ? [] : [{ id, entry }];
      });
      setCards(unique);
    });

    return () => {
      active = false;
    };
  }, [repository]);

  function listen(card: Card): void {
    unlockNarration();
    narration.say(`vocab.${card.id}.word`);
  }

  return (
    <main className="collection">
      <header className="collection__header">
        <button
          type="button"
          className="collection__back"
          onPointerDown={(event) => activate(event, onBack)}
        >
          ← {getText('collection.back')}
        </button>
        <div className="collection__heading">
          <h1>{getText('collection.title')}</h1>
          <p>{getText('collection.subtitle')}</p>
        </div>
        <ZapCharacter
          expression="content"
          speaking={narration.speaking}
          className="collection__zap"
        />
      </header>

      {narration.text !== '' ? (
        <p className="collection__bubble" role="status">
          {narration.text}
        </p>
      ) : null}

      {cards === null ? (
        <div className="collection__spinner" aria-hidden="true" />
      ) : cards.length === 0 ? (
        <p className="collection__empty">{getText('collection.empty')}</p>
      ) : (
        <ul className="collection__grid">
          {cards.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                className="collection-card"
                aria-label={`${getText('collection.wordAria')} : ${card.entry.word}`}
                onPointerDown={(event) => activate(event, () => listen(card))}
              >
                <span className="collection-card__word">{card.entry.word}</span>
                <span className="collection-card__definition">
                  {card.entry.definition}
                </span>
                <span className="collection-card__listen" aria-hidden="true">
                  🔊 {getText('collection.listen')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
