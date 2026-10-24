import { getLevelById } from '@circuits/shared';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { getText, getVocabulary } from '../narration/fr';
import { WorkbenchPage } from './WorkbenchPage';
import { useWorkbenchStore } from './workbenchStore';

function mockSvg(svg: SVGSVGElement): void {
  Object.assign(svg, {
    getScreenCTM: () => ({ a: 1, d: 1, inverse: () => ({}) }),
    createSVGPoint: () => {
      const point = {
        x: 0,
        y: 0,
        matrixTransform: () => ({ x: point.x, y: point.y }),
      };
      return point;
    },
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    hasPointerCapture: () => false,
  });
}

function getSvg(): SVGSVGElement {
  const svg = document.querySelector('svg.workbench-svg');
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error('Workbench SVG not found');
  }
  mockSvg(svg);
  return svg;
}

function getTerminal(componentId: string, terminalId: string): Element {
  const element = document.querySelector(
    `[data-terminal-component="${componentId}"][data-terminal-id="${terminalId}"]`,
  );
  if (!element) {
    throw new Error(`Terminal ${componentId}.${terminalId} not found`);
  }
  return element;
}

function getComponent(componentId: string): Element {
  const element = document.querySelector(`[data-component-id="${componentId}"]`);
  if (!element) {
    throw new Error(`Component ${componentId} not found`);
  }
  return element;
}

function tap(element: Element, x: number, y: number): void {
  const init = {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    clientX: x,
    clientY: y,
  };
  fireEvent.pointerDown(element, init);
  fireEvent.pointerUp(element, init);
}

describe('workbench interactions', () => {
  beforeEach(() => {
    useWorkbenchStore.getState().resetWorkbench();
    window.localStorage.clear();
  });

  it('creates a wire by tapping two terminals', () => {
    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    tap(getTerminal('battery-1', 'positive'), 100, 100);

    expect(useWorkbenchStore.getState().pendingTerminal).toEqual({
      componentId: 'battery-1',
      terminalId: 'positive',
    });

    tap(getTerminal('bulb-1', 'a'), 200, 100);

    expect(useWorkbenchStore.getState().circuit.wires).toHaveLength(1);
    expect(useWorkbenchStore.getState().pendingTerminal).toBeNull();

    tap(getTerminal('bulb-1', 'b'), 260, 100);
    tap(getTerminal('battery-1', 'negative'), 100, 200);

    expect(useWorkbenchStore.getState().circuit.wires).toHaveLength(2);
    expect(useWorkbenchStore.getState().simulation.ok).toBe(true);
  });

  it('drags a placed component and snaps it to the grid', () => {
    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    const svg = getSvg();
    const down = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 512,
      clientY: 256,
    };

    fireEvent.pointerDown(getComponent('bulb-1'), down);
    fireEvent.pointerMove(svg, { ...down, clientX: 640 });
    fireEvent.pointerUp(svg, { ...down, clientX: 640 });

    const moved = useWorkbenchStore
      .getState()
      .circuit.components.find((component) => component.id === 'bulb-1');

    expect(moved?.position).toEqual({ x: 10, y: 4 });
  });

  it('cycles the display mode from the header', () => {
    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /affichage : réaliste/i }),
    );

    expect(useWorkbenchStore.getState().displayMode).toBe('symbol');
    expect(
      screen.getByRole('button', { name: /affichage : symboles/i }),
    ).toBeInTheDocument();
  });

  it('plays the first level to success and shows the learned words', async () => {
    const level = getLevelById('light-01');
    if (!level) throw new Error('Level missing');

    render(
      <WorkbenchPage
        level={level}
        onBack={() => undefined}
        onNextLevel={() => undefined}
      />,
    );
    getSvg();

    expect(
      await screen.findByRole('heading', { name: 'Allume l’ampoule' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(getText('level.noComponents')),
    ).toBeInTheDocument();

    tap(getTerminal('battery-1', 'positive'), 100, 100);
    tap(getTerminal('bulb-1', 'a'), 200, 100);
    tap(getTerminal('bulb-1', 'b'), 260, 100);
    tap(getTerminal('battery-1', 'negative'), 100, 200);

    expect(
      await screen.findByRole('heading', { name: getText('success.title') }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('.level-complete-stars')?.getAttribute('aria-label'),
    ).toBe('3 / 3');

    fireEvent.pointerDown(
      screen.getByRole('button', { name: getText('success.continue') }),
    );

    expect(
      screen.getByText(getText('success.learned')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(getVocabulary('circuitFerme')?.word ?? ''),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: getText('success.next') }),
    ).toBeInTheDocument();
  });

  it('uses level hints and lowers the star rating', async () => {
    const level = getLevelById('light-01');
    if (!level) throw new Error('Level missing');

    render(
      <WorkbenchPage level={level} onBack={() => undefined} />,
    );
    getSvg();

    const zapButton = screen.getByRole('button', {
      name: /demander un indice/i,
    });

    fireEvent.pointerDown(zapButton);
    expect(screen.getByText(getText('level.01.hint.1'))).toBeInTheDocument();
    fireEvent.pointerDown(zapButton);
    expect(screen.getByText(getText('level.01.hint.2'))).toBeInTheDocument();
    fireEvent.pointerDown(zapButton);
    expect(screen.getByText(getText('level.01.hint.3'))).toBeInTheDocument();

    tap(getTerminal('battery-1', 'positive'), 100, 100);
    tap(getTerminal('bulb-1', 'a'), 200, 100);
    tap(getTerminal('bulb-1', 'b'), 260, 100);
    tap(getTerminal('battery-1', 'negative'), 100, 200);

    expect(
      await screen.findByRole('heading', { name: getText('success.title') }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('.level-complete-stars')?.getAttribute('aria-label'),
    ).toBe('1 / 3');
  });

  it('gives three progressively precise hints and highlights the issue', () => {
    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    const zapButton = screen.getByRole('button', {
      name: /demander un indice/i,
    });

    fireEvent.pointerDown(zapButton);
    expect(screen.getByText(getText('zap.hint.open.1'))).toBeInTheDocument();

    fireEvent.pointerDown(zapButton);
    expect(screen.getByText(getText('zap.hint.open.2'))).toBeInTheDocument();

    fireEvent.pointerDown(zapButton);
    expect(screen.getByText(getText('zap.hint.open.3'))).toBeInTheDocument();
    expect(
      document.querySelectorAll('.hint-terminal').length,
    ).toBeGreaterThan(0);
    expect(
      document.querySelectorAll('.component-hint').length,
    ).toBeGreaterThan(0);
  });

  it('warns with Zap when the battery is shorted', () => {
    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    act(() => {
      useWorkbenchStore.getState().addWire(
        { componentId: 'battery-1', terminalId: 'positive' },
        { componentId: 'battery-1', terminalId: 'negative' },
      );
    });

    expect(screen.getByText(getText('zap.short'))).toBeInTheDocument();
  });

  it('toggles the global mute and exposes replay', () => {
    render(<WorkbenchPage onBack={() => undefined} />);

    expect(
      screen.getByRole('button', { name: /réécouter/i }),
    ).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /couper le son/i }),
    );
    expect(
      screen.getByRole('button', { name: /activer le son/i }),
    ).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /activer le son/i }),
    );
    expect(
      screen.getByRole('button', { name: /couper le son/i }),
    ).toBeInTheDocument();
  });

  it('toggles a switch with a tap', () => {
    useWorkbenchStore
      .getState()
      .addComponent('switch', { closed: false }, { x: 5, y: 2 });

    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    tap(getComponent('switch-1'), 320, 128);

    const switchComponent = useWorkbenchStore
      .getState()
      .circuit.components.find((component) => component.id === 'switch-1');

    expect(switchComponent?.type === 'switch' ? switchComponent.closed : null).toBe(
      true,
    );
  });
});
