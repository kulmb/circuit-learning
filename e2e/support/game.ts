import { expect, type Locator, type Page } from '@playwright/test';

import {
  E2E_ADULT_PASSWORD,
  E2E_CHILD_PATTERN,
  E2E_GROUPS,
} from '../../apps/api/test/e2e/fixtures';

export interface InteractionOptions {
  hasTouch: boolean;
}

export async function press(
  locator: Locator,
  { hasTouch }: InteractionOptions,
): Promise<void> {
  if (hasTouch) {
    await locator.tap();
  } else {
    await locator.click();
  }
}

export async function loginAdult(
  page: Page,
  username: string,
): Promise<void> {
  await page.goto('/admin');
  await page.getByLabel('Identifiant').fill(username);
  await page.getByLabel('Mot de passe').fill(E2E_ADULT_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.locator('.admin-shell')).toBeVisible();
}

export async function loginChild(
  page: Page,
  childName: string,
  options: InteractionOptions,
): Promise<void> {
  await page.goto('/');
  await press(
    page.getByRole('button', { name: 'Jouer', exact: true }),
    options,
  );
  await expect(
    page.getByRole('heading', { name: 'Entre le code du groupe' }),
  ).toBeVisible();

  const key = page.getByRole('button', { name: 'A', exact: true });
  const codeLength = E2E_GROUPS.a.joinCode.length;

  for (let index = 0; index < codeLength; index += 1) {
    await press(key, options);

    // The sixth key submits the code and replaces the keypad with the
    // avatar picker, so there is no filled-slot count left to observe.
    if (index < codeLength - 1) {
      await expect(page.locator('.group-code__slot.is-filled')).toHaveCount(
        index + 1,
      );
    }
  }

  await expect(page.locator('.avatar-picker')).toBeVisible();
  await press(
    page.getByRole('button', { name: childName, exact: true }),
    options,
  );
  await expect(page.locator('.picture-password__grid')).toBeVisible();

  const pictureLabels = ['Renard', 'Pomme', 'Ballon'];

  for (let index = 0; index < E2E_CHILD_PATTERN.length; index += 1) {
    const label = pictureLabels[index];

    if (label === undefined) {
      continue;
    }

    await press(
      page.getByRole('button', { name: label, exact: true }),
      options,
    );

    // The third picture submits the sequence and replaces the grid with the
    // level map, so only the first two dots can be observed here.
    if (index < E2E_CHILD_PATTERN.length - 1) {
      await expect(
        page.locator('.picture-password__dot.is-filled'),
      ).toHaveCount(index + 1);
    }
  }

  await expect(
    page.getByRole('heading', { name: 'Chapitre 1 : La lumière' }),
  ).toBeVisible();
}

export async function openLevelOne(
  page: Page,
  options: InteractionOptions,
): Promise<void> {
  await press(
    page.locator('.level-node[data-level-id="light-01"]'),
    options,
  );
  await expect(page.locator('.workbench-svg')).toBeVisible();
  await expect(page.locator('[data-component-id]')).toHaveCount(2);
}

function terminal(
  page: Page,
  componentId: string,
  terminalId: string,
): Locator {
  return page.locator(
    `[data-terminal-component="${componentId}"][data-terminal-id="${terminalId}"]`,
  );
}

export async function tapTerminal(
  page: Page,
  componentId: string,
  terminalId: string,
  options: InteractionOptions,
): Promise<void> {
  await press(terminal(page, componentId, terminalId), options);
  await nextPaint(page);
}

export async function completeLevelOne(
  page: Page,
  options: InteractionOptions,
): Promise<void> {
  await tapTerminal(page, 'battery-1', 'positive', options);
  await tapTerminal(page, 'bulb-1', 'a', options);
  await expect(page.locator('[data-wire-id]')).toHaveCount(1);

  await dragTerminal(
    page,
    terminal(page, 'bulb-1', 'b'),
    terminal(page, 'battery-1', 'negative'),
    options,
  );
  await expect(page.locator('[data-wire-id]')).toHaveCount(2);
  await expect(
    page.getByRole('heading', { name: 'Bravo !' }),
  ).toBeVisible();
}

export async function dragTerminal(
  page: Page,
  source: Locator,
  target: Locator,
  { hasTouch }: InteractionOptions,
): Promise<void> {
  const sourceCircle = source.locator('circle').first();
  const targetCircle = target.locator('circle').first();
  const sourceBox = await sourceCircle.boundingBox();
  const targetBox = await targetCircle.boundingBox();

  if (sourceBox === null || targetBox === null) {
    throw new Error('Terminal introuvable pour le glisser-déposer.');
  }

  const start = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  // The board moves the touch point 40 px up, away from the finger.
  const end = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2 + (hasTouch ? 40 : 0),
  };

  if (!hasTouch) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 12, start.y + 6, { steps: 2 });
    await page.mouse.move(end.x, end.y, { steps: 4 });
    await page.mouse.up();
    return;
  }

  if (page.context().browser()?.browserType().name() === 'chromium') {
    await dragWithCdp(page, start, end);
    return;
  }

  await dragWithPointerEvents(page, source, start, end);
}

async function dragWithCdp(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
): Promise<void> {
  const session = await page.context().newCDPSession(page);

  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: start.x, y: start.y, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: start.x + 16, y: start.y + 8, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: end.x, y: end.y, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
}

/**
 * WebKit exposes no touch-drag command in Playwright. These pointer events
 * exercise the same touch code path; the capture shim only replaces the
 * browser API that is unavailable for synthetic pointers.
 */
async function dragWithPointerEvents(
  page: Page,
  source: Locator,
  start: { x: number; y: number },
  end: { x: number; y: number },
): Promise<void> {
  await page.evaluate(() => {
    const prototype = Element.prototype;
    const marker = prototype as unknown as { __zapE2eCapture?: boolean };

    if (marker.__zapE2eCapture === true) {
      return;
    }

    marker.__zapE2eCapture = true;
    prototype.setPointerCapture = () => undefined;
    prototype.releasePointerCapture = () => undefined;
    prototype.hasPointerCapture = () => true;
  });

  const base = {
    pointerId: 41,
    pointerType: 'touch',
    isPrimary: true,
    bubbles: true,
    cancelable: true,
    button: 0,
  };
  const svg = page.locator('.workbench-svg');

  await source.dispatchEvent('pointerdown', {
    ...base,
    buttons: 1,
    clientX: start.x,
    clientY: start.y,
  });
  await svg.dispatchEvent('pointermove', {
    ...base,
    buttons: 1,
    clientX: start.x + 16,
    clientY: start.y + 8,
  });
  await svg.dispatchEvent('pointermove', {
    ...base,
    buttons: 1,
    clientX: end.x,
    clientY: end.y,
  });
  await svg.dispatchEvent('pointerup', {
    ...base,
    buttons: 0,
    clientX: end.x,
    clientY: end.y,
  });
}

export async function gotoGuestMap(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Entre le code du groupe' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Jouer en invité' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Chapitre 1 : La lumière',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Chapitre 2 : La force du courant',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.level-node')).toHaveCount(46);
}

export async function nextPaint(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );
}
