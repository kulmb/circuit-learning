/** Lines provided on a pipe, read once and consumed in order. */
let pipedLines: string[] | null = null;

async function readPipedLine(question: string): Promise<string> {
  if (pipedLines === null) {
    let input = '';

    for await (const chunk of process.stdin) {
      input += chunk;
    }

    pipedLines = input.split(/\r?\n/);
  }

  process.stdout.write(question);

  return pipedLines.shift() ?? '';
}

/**
 * Reads a secret without echoing it. On a real terminal the input is read in
 * raw mode; on a pipe (tests, automation) whole lines are used instead.
 */
export async function promptHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;

  if (!stdin.isTTY) {
    return readPipedLine(question);
  }

  return new Promise((resolve, reject) => {
    const wasRaw = stdin.isRaw;
    let value = '';
    let settled = false;

    function cleanup(): void {
      stdin.off('data', onData);
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
    }

    function finish(result: string, error?: Error): void {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      stdout.write('\n');

      if (error === undefined) {
        resolve(result);
      } else {
        reject(error);
      }
    }

    function onData(chunk: string): void {
      for (const character of chunk) {
        if (character === '\r' || character === '\n') {
          finish(value);
          return;
        }

        if (character === '\u0003' || character === '\u0004') {
          finish('', new Error('Saisie annulée.'));
          return;
        }

        if (character === '\u007f' || character === '\b') {
          value = Array.from(value).slice(0, -1).join('');
          continue;
        }

        value += character;
      }
    }

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });
}
