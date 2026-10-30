export interface ParentChallenge {
  a: number;
  b: number;
  answer: number;
  choices: number[];
}

/**
 * A small multiplication gate for the parent settings. It is a child lock,
 * not a security boundary: a determined parent can always bypass client code.
 */
export function createParentChallenge(
  random: () => number = Math.random,
): ParentChallenge {
  const a = 3 + Math.floor(random() * 5);
  const b = 6 + Math.floor(random() * 4);
  const answer = a * b;
  const choices = shuffle([answer, answer - a, answer + b], random);

  return { a, b, answer, choices };
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const current = result[index];
    const other = result[target];

    if (current !== undefined && other !== undefined) {
      result[index] = other;
      result[target] = current;
    }
  }

  return result;
}
