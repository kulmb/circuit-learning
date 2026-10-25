import { getLevelById } from '@circuits/shared/levels';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LayoutContext } from '../layout/LayoutContext';
import type { LayoutMode } from '../layout/layoutMode';
import { getText, getVocabulary } from '../narration/fr';
import { DEFAULT_BOARD } from './constants';
import { boardToScreen, defaultView } from './viewport';
import { WorkbenchPage } from './WorkbenchPage';
import { renderAllWires, terminalPointMap } from './wireLayout';
import { useWorkbenchStore } from './workbenchStore';

function mockSvg(svg: SVGSVGElement): void {
  Object.assign(svg, {
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

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('draws palette icons instead of text abbreviations', () => {
    render(<WorkbenchPage onBack={() => undefined} />);

    const bulb = screen.getByRole('button', { name: 'Ampoule' });

    expect(bulb.querySelector('.palette-item__swatch svg')).not.toBeNull();
    expect(bulb.querySelector('.palette-item__swatch')?.textContent).toBe('');
    expect(screen.queryByText('Lampe')).not.toBeInTheDocument();
    expect(screen.queryByText('Inter.')).not.toBeInTheDocument();
  });

  it('returns a palette component smoothly when dropped outside the board', () => {
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 320,
      height: 200,
      right: 320,
      bottom: 200,
      toJSON: () => ({}),
    } as DOMRect);

    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    const button = screen.getByRole('button', { name: /ampoule/i });
    Object.assign(button, {
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    });
    const down = {
      pointerId: 7,
      pointerType: 'mouse',
      button: 0,
      clientX: 600,
      clientY: 500,
    };

    fireEvent.pointerDown(button, down);
    fireEvent.pointerMove(button, { ...down, clientX: 650, clientY: 540 });
    fireEvent.pointerUp(button, { ...down, clientX: 650, clientY: 540 });

    expect(useWorkbenchStore.getState().circuit.components).toHaveLength(2);
    expect(document.querySelector('.palette-ghost--returning')).not.toBeNull();
  });

  it('drags a palette component out with a touch', () => {
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 320,
      height: 200,
      right: 320,
      bottom: 200,
      toJSON: () => ({}),
    } as DOMRect);

    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    const button = screen.getByRole('button', { name: /ampoule/i });
    Object.assign(button, {
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    });
    const down = {
      pointerId: 11,
      pointerType: 'touch',
      button: 0,
      clientX: 600,
      clientY: 500,
    };

    fireEvent.pointerDown(button, down);
    fireEvent.pointerMove(button, { ...down, clientX: 160, clientY: 100 });
    fireEvent.pointerUp(button, { ...down, clientX: 160, clientY: 100 });

    expect(useWorkbenchStore.getState().circuit.components).toHaveLength(3);
  });

  it('splices a palette component dropped on an existing wire', () => {
    const rect = {
      left: 0,
      top: 0,
      width: 320,
      height: 200,
      right: 320,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(
      rect,
    );

    const store = useWorkbenchStore.getState();
    store.addWire(
      { componentId: 'battery-1', terminalId: 'positive' },
      { componentId: 'bulb-1', terminalId: 'a' },
    );
    const wired = useWorkbenchStore.getState();
    const routes = renderAllWires(
      wired.circuit.wires,
      wired.circuit.components,
      terminalPointMap(wired.circuit.components),
      DEFAULT_BOARD,
    );
    const midpoint = routes[0]?.mid;
    if (midpoint === undefined) {
      throw new Error('Wire route missing');
    }
    const target = boardToScreen(
      midpoint,
      rect,
      defaultView(DEFAULT_BOARD),
      DEFAULT_BOARD,
    );

    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    const button = screen.getByRole('button', { name: /interrupteur/i });
    Object.assign(button, {
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    });
    const down = {
      pointerId: 19,
      pointerType: 'mouse',
      button: 0,
      clientX: 600,
      clientY: 500,
    };

    fireEvent.pointerDown(button, down);
    fireEvent.pointerMove(button, {
      ...down,
      clientX: target.x,
      clientY: target.y,
    });
    fireEvent.pointerUp(button, {
      ...down,
      clientX: target.x,
      clientY: target.y,
    });

    const state = useWorkbenchStore.getState();
    const inserted = state.circuit.components.find(
      (component) => component.type === 'switch',
    );

    expect(inserted).toBeDefined();
    expect(state.circuit.wires).toHaveLength(2);
    expect(
      state.circuit.wires.some((wire) => wire.id === 'wire-1'),
    ).toBe(false);
    expect(
      state.circuit.wires.filter(
        (wire) =>
          wire.from.componentId === inserted?.id ||
          wire.to.componentId === inserted?.id,
      ),
    ).toHaveLength(2);
  });

  it('scrolls the palette instead of dragging when it overflows', () => {
    render(<WorkbenchPage onBack={() => undefined} />);

    const palette = document.querySelector('.palette');
    if (!(palette instanceof HTMLElement)) {
      throw new Error('Palette not found');
    }
    Object.defineProperties(palette, {
      scrollWidth: { configurable: true, value: 1000 },
      clientWidth: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 400 },
      clientHeight: { configurable: true, value: 400 },
      scrollLeft: { configurable: true, writable: true, value: 100 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    const button = screen.getByRole('button', { name: /ampoule/i });
    Object.assign(button, {
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    });
    const down = {
      pointerId: 12,
      pointerType: 'touch',
      button: 0,
      clientX: 500,
      clientY: 500,
    };

    fireEvent.pointerDown(button, down);
    fireEvent.pointerMove(button, { ...down, clientX: 380, clientY: 508 });

    expect(palette.scrollLeft).toBe(220);
    expect(document.querySelector('.palette-ghost')).toBeNull();

    fireEvent.pointerUp(button, { ...down, clientX: 380, clientY: 508 });

    expect(useWorkbenchStore.getState().circuit.components).toHaveLength(2);
  });

  it('keeps unrelated wires still while a component is dragged', () => {
    const store = useWorkbenchStore.getState();
    store.addComponent('switch', { closed: false }, { x: 2, y: 2 });
    const switchComponent = useWorkbenchStore
      .getState()
      .circuit.components.find((component) => component.type === 'switch');

    if (switchComponent === undefined) {
      throw new Error('Switch not added');
    }

    store.addWire(
      { componentId: 'battery-1', terminalId: 'positive' },
      { componentId: switchComponent.id, terminalId: 'a' },
    );
    store.addWire(
      { componentId: 'battery-1', terminalId: 'negative' },
      { componentId: 'bulb-1', terminalId: 'b' },
    );

    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    const wires = useWorkbenchStore.getState().circuit.wires;
    const unrelated = wires.find(
      (wire) =>
        wire.from.componentId === switchComponent.id ||
        wire.to.componentId === switchComponent.id,
    );
    const attached = wires.find(
      (wire) =>
        wire.from.componentId === 'bulb-1' ||
        wire.to.componentId === 'bulb-1',
    );

    if (unrelated === undefined || attached === undefined) {
      throw new Error('Wires not created');
    }

    const pathOf = (wireId: string): string | null | undefined =>
      document
        .querySelector(`[data-wire-id="${wireId}"] path`)
        ?.getAttribute('d');
    const unrelatedBefore = pathOf(unrelated.id);
    const attachedBefore = pathOf(attached.id);
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

    expect(pathOf(unrelated.id)).toBe(unrelatedBefore);
    expect(pathOf(attached.id)).not.toBe(attachedBefore);
    expect(pathOf(attached.id)).not.toContain('Q');

    fireEvent.pointerUp(svg, { ...down, clientX: 640 });
  });

  it('draws a straight dashed guide while pulling a wire', () => {
    render(<WorkbenchPage onBack={() => undefined} />);
    const svg = getSvg();
    const down = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 100,
      clientY: 100,
    };

    fireEvent.pointerDown(getTerminal('battery-1', 'positive'), down);
    fireEvent.pointerMove(svg, { ...down, clientX: 240, clientY: 190 });

    const preview = svg.querySelector('path[stroke-dasharray="10 10"]');
    const path = preview?.getAttribute('d') ?? '';

    expect(path).toMatch(/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/u);
    expect(path).not.toContain('Q');

    fireEvent.pointerUp(svg, { ...down, clientX: 240, clientY: 190 });
  });

  it('activates the trash when the dragged body touches it, not the finger', () => {
    vi.spyOn(
      SVGSVGElement.prototype,
      'getBoundingClientRect',
    ).mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 768,
      height: 512,
      right: 768,
      bottom: 512,
      toJSON: () => ({}),
    } as DOMRect);

    render(<WorkbenchPage onBack={() => undefined} />);
    const svg = getSvg();
    const trash = document.querySelector('.trash-zone');

    if (!(trash instanceof HTMLElement)) {
      throw new Error('Trash not found');
    }

    trash.getBoundingClientRect = () =>
      ({
        x: 540,
        y: 245,
        left: 540,
        top: 245,
        width: 80,
        height: 55,
        right: 620,
        bottom: 300,
        toJSON: () => ({}),
      }) as DOMRect;

    const down = {
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
      clientX: 512,
      clientY: 256,
    };

    fireEvent.pointerDown(getComponent('bulb-1'), down);
    // The touch point stays outside the trash; the component body, drawn
    // 40 px above it, overlaps the trash.
    fireEvent.pointerMove(svg, { ...down, clientX: 530, clientY: 296 });

    expect(trash.classList.contains('is-active')).toBe(true);

    fireEvent.pointerUp(svg, { ...down, clientX: 530, clientY: 296 });

    expect(
      useWorkbenchStore
        .getState()
        .circuit.components.some((component) => component.id === 'bulb-1'),
    ).toBe(false);
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

  it('dims the bulb with the rheostat slider on a locked variator', async () => {
    const level = getLevelById('current-05');
    if (!level) throw new Error('Level missing');

    render(
      <WorkbenchPage level={level} onBack={() => undefined} />,
    );
    getSvg();

    expect(useWorkbenchStore.getState().simulation.states['bulb-1']?.state)
      .toBe('normal');

    tap(getComponent('rheostat-1'), 200, 200);

    const slider = document.querySelector(
      '[data-rheostat-slider="rheostat-1"]',
    );
    expect(slider).not.toBeNull();
    if (!(slider instanceof Element)) throw new Error('Slider missing');

    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 144,
      height: 56,
      right: 144,
      bottom: 56,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.pointerDown(slider, {
      pointerId: 2,
      pointerType: 'mouse',
      button: 0,
      clientX: 144,
      clientY: 28,
    });
    fireEvent.pointerUp(slider, {
      pointerId: 2,
      pointerType: 'mouse',
      button: 0,
      clientX: 144,
      clientY: 28,
    });

    expect(useWorkbenchStore.getState().simulation.states['bulb-1']?.state)
      .toBe('dim');
    expect(
      await screen.findByRole('heading', { name: getText('success.title') }),
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

  it('toggles the switch even when the tap lands on a terminal hit ring', () => {
    useWorkbenchStore
      .getState()
      .addComponent('switch', { closed: false }, { x: 5, y: 2 });

    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    // The hit ring is large for touch, but the body centre must still toggle.
    tap(getTerminal('switch-1', 'a'), 320, 128);

    const switchComponent = useWorkbenchStore
      .getState()
      .circuit.components.find((component) => component.id === 'switch-1');

    expect(
      switchComponent?.type === 'switch' ? switchComponent.closed : null,
    ).toBe(true);
    expect(useWorkbenchStore.getState().pendingTerminal).toBeNull();
  });

  it('still starts a wire from the outer terminal ring', () => {
    useWorkbenchStore
      .getState()
      .addComponent('switch', { closed: false }, { x: 5, y: 2 });

    render(<WorkbenchPage onBack={() => undefined} />);
    getSvg();

    tap(getTerminal('switch-1', 'a'), 281.6, 128);

    expect(useWorkbenchStore.getState().pendingTerminal).toEqual({
      componentId: 'switch-1',
      terminalId: 'a',
    });
    const switchComponent = useWorkbenchStore
      .getState()
      .circuit.components.find((component) => component.id === 'switch-1');
    expect(
      switchComponent?.type === 'switch' ? switchComponent.closed : null,
    ).toBe(false);
  });

  it('vibrates twice when the battery is shorted', () => {
    const vibrate = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vibrate,
    });

    try {
      render(<WorkbenchPage onBack={() => undefined} />);
      getSvg();

      act(() => {
        useWorkbenchStore.getState().addWire(
          { componentId: 'battery-1', terminalId: 'positive' },
          { componentId: 'battery-1', terminalId: 'negative' },
        );
      });

      expect(vibrate).toHaveBeenCalledWith([45, 60, 45]);
    } finally {
      Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    }
  });

  it('vibrates once when a level succeeds', async () => {
    const vibrate = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vibrate,
    });

    const level = getLevelById('light-01');
    if (!level) throw new Error('Level missing');

    try {
      render(<WorkbenchPage level={level} onBack={() => undefined} />);
      getSvg();

      tap(getTerminal('battery-1', 'positive'), 100, 100);
      tap(getTerminal('bulb-1', 'a'), 200, 100);
      tap(getTerminal('bulb-1', 'b'), 260, 100);
      tap(getTerminal('battery-1', 'negative'), 100, 200);

      expect(
        await screen.findByRole('heading', { name: getText('success.title') }),
      ).toBeInTheDocument();
      expect(vibrate).toHaveBeenCalledWith(25);
    } finally {
      Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    }
  });

  it('fits tiny screens, zooms with the wheel and restores the full board', async () => {
    vi.spyOn(
      SVGSVGElement.prototype,
      'getBoundingClientRect',
    ).mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 320,
      height: 200,
      right: 320,
      bottom: 200,
      toJSON: () => ({}),
    } as DOMRect);

    render(<WorkbenchPage onBack={() => undefined} />);
    const svg = getSvg();
    const showAll = await screen.findByRole('button', {
      name: getText('workbench.showAll'),
    });

    expect(screen.getByText(getText('workbench.zoomHint'))).toBeInTheDocument();
    expect(svg.getAttribute('viewBox')).toBe('0 0 768 512');

    fireEvent.wheel(svg, { deltaY: -300, clientX: 160, clientY: 100 });

    expect(svg.getAttribute('viewBox')).not.toBe('0 0 768 512');
    expect(
      screen.queryByText(getText('workbench.zoomHint')),
    ).not.toBeInTheDocument();

    fireEvent.pointerDown(showAll);

    expect(svg.getAttribute('viewBox')).toBe('0 0 768 512');
  });
});

describe('workbench responsive layout', () => {
  const compactLandscape: LayoutMode = {
    size: 'compact',
    orientation: 'landscape',
    width: 740,
    height: 360,
  };
  const compactPortrait: LayoutMode = {
    size: 'compact',
    orientation: 'portrait',
    width: 390,
    height: 844,
  };

  it('moves undo and trash into a rail and folds instructions away', () => {
    const level = getLevelById('light-01');
    if (!level) throw new Error('Level missing');

    render(
      <LayoutContext.Provider value={compactLandscape}>
        <WorkbenchPage level={level} onBack={() => undefined} />
      </LayoutContext.Provider>,
    );
    getSvg();

    expect(
      screen.getByRole('button', { name: getText('workbench.instructions') }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: getText('workbench.undo') }),
    ).toHaveLength(1);
    expect(document.querySelectorAll('.workbench-toolrail')).toHaveLength(1);
    expect(document.querySelectorAll('.trash-zone')).toHaveLength(1);
    expect(document.querySelectorAll('.workbench-svg')).toHaveLength(1);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: getText('workbench.instructions') }),
    );
    expect(screen.getByText(getText(level.goalTextId))).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole('button', { name: getText('workbench.close') }),
    );
    expect(
      screen.queryByText(getText(level.goalTextId)),
    ).not.toBeInTheDocument();
  });

  it('keeps the component rail on the left and hides an empty palette', () => {
    const level = getLevelById('light-01');
    if (!level) throw new Error('Level missing');

    const sandboxLike = render(
      <LayoutContext.Provider value={compactLandscape}>
        <WorkbenchPage onBack={() => undefined} />
      </LayoutContext.Provider>,
    );
    getSvg();

    expect(
      document.querySelector('.workbench-page')?.classList.contains(
        'has-palette',
      ),
    ).toBe(true);
    expect(document.querySelector('.palette')).not.toBeNull();

    sandboxLike.unmount();

    render(
      <LayoutContext.Provider value={compactLandscape}>
        <WorkbenchPage level={level} onBack={() => undefined} />
      </LayoutContext.Provider>,
    );

    expect(
      document.querySelector('.workbench-page')?.classList.contains(
        'has-palette',
      ),
    ).toBe(false);
    expect(document.querySelector('.palette')).toBeNull();
  });

  it('asks the child to rotate a phone held upright', () => {
    const level = getLevelById('light-01');
    if (!level) throw new Error('Level missing');

    render(
      <LayoutContext.Provider value={compactPortrait}>
        <WorkbenchPage level={level} onBack={() => undefined} />
      </LayoutContext.Provider>,
    );

    expect(
      screen.getByText(getText('workbench.rotateDevice')),
    ).toBeInTheDocument();
    expect(document.querySelector('.workbench-svg')).toBeNull();
    expect(
      screen.getByRole('button', { name: getText('workbench.back') }),
    ).toBeInTheDocument();
  });

  it('shows only the qualitative meters requested by the level', () => {
    const level = getLevelById('current-02');
    if (!level) throw new Error('Level missing');

    render(<WorkbenchPage level={level} onBack={() => undefined} />);

    expect(document.querySelector('.workbench-meters')).not.toBeNull();
    expect(document.querySelectorAll('[data-meter-id]')).toHaveLength(1);
    expect(
      document
        .querySelector('[data-meter-id="tension"]')
        ?.getAttribute('aria-label'),
    ).toContain('Tension');
    expect(document.querySelector('.workbench-page')?.classList).toContain(
      'has-meters',
    );
  });

  it('does not show meters on a level that does not measure anything', () => {
    const level = getLevelById('light-01');
    if (!level) throw new Error('Level missing');

    render(<WorkbenchPage level={level} onBack={() => undefined} />);

    expect(document.querySelector('.workbench-meters')).toBeNull();
    expect(document.querySelector('.workbench-page')?.classList).not.toContain(
      'has-meters',
    );
  });
});
