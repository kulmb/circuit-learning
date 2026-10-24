import { getText } from '../narration/fr';
import { sandboxPhotoFileName } from './sandbox';

export interface SandboxPhoto {
  photo: string;
  thumbnail: string;
}

export type SandboxCapture = (
  svg: SVGSVGElement,
  options: { name: string },
) => Promise<SandboxPhoto>;

const PHOTO_WIDTH = 1200;
const PHOTO_PADDING = 24;
const PHOTO_HEADER = 96;
const PHOTO_FOOTER = 72;
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEADER = 34;
const THUMBNAIL_PADDING = 8;
const FONT_FAMILY = 'Nunito, system-ui, sans-serif';

/**
 * Turns the hidden, attribute-styled snapshot into a PNG for the family and
 * a compact JPEG thumbnail stored with the work.
 */
export async function captureSandboxPhoto(
  svg: SVGSVGElement,
  options: { name: string },
): Promise<SandboxPhoto> {
  await waitForFonts();

  const boardWidth = readLength(svg, 'width', 768);
  const boardHeight = readLength(svg, 'height', 512);
  const ratio = boardWidth / boardHeight;
  const image = await loadSvgImage(svg);

  const photoCanvas = createCanvas(
    PHOTO_WIDTH + PHOTO_PADDING * 2,
    PHOTO_HEADER +
      PHOTO_WIDTH / ratio +
      PHOTO_FOOTER +
      PHOTO_PADDING,
  );
  drawPhoto(photoCanvas, image, ratio, options.name);

  const thumbnailCanvas = createCanvas(
    THUMBNAIL_WIDTH,
    THUMBNAIL_HEADER +
      (THUMBNAIL_WIDTH - THUMBNAIL_PADDING * 2) / ratio +
      THUMBNAIL_PADDING,
  );
  drawThumbnail(thumbnailCanvas, image, ratio, options.name);

  return {
    photo: photoCanvas.toDataURL('image/png'),
    thumbnail: encodeThumbnail(thumbnailCanvas),
  };
}

export function sandboxPhotoDownloadName(name: string): string {
  return sandboxPhotoFileName(name);
}

function drawPhoto(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  ratio: number,
  name: string,
): void {
  const context = getContext(canvas);
  const boardHeight = PHOTO_WIDTH / ratio;

  context.fillStyle = '#fffaf0';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#24324a';
  context.font = `900 42px ${FONT_FAMILY}`;
  context.textBaseline = 'alphabetic';
  context.fillText(getText('sandbox.photoTitle'), PHOTO_PADDING, 64);

  context.fillStyle = '#5b6b82';
  context.font = `800 24px ${FONT_FAMILY}`;
  context.fillText(
    fitText(context, `${getText('sandbox.title')} · ${name}`, PHOTO_WIDTH),
    PHOTO_PADDING,
    96,
  );

  const boardY = PHOTO_HEADER + PHOTO_PADDING;
  roundedRectPath(
    context,
    PHOTO_PADDING,
    boardY,
    PHOTO_WIDTH,
    boardHeight,
    22,
  );
  context.save();
  context.clip();
  context.drawImage(image, PHOTO_PADDING, boardY, PHOTO_WIDTH, boardHeight);
  context.restore();

  context.strokeStyle = '#c7d8e8';
  context.lineWidth = 3;
  roundedRectPath(
    context,
    PHOTO_PADDING,
    boardY,
    PHOTO_WIDTH,
    boardHeight,
    22,
  );
  context.stroke();

  context.fillStyle = '#7c8ba1';
  context.font = `800 21px ${FONT_FAMILY}`;
  context.textAlign = 'right';
  context.fillText(
    getText('sandbox.photoFooter'),
    canvas.width - PHOTO_PADDING,
    canvas.height - 24,
  );
  context.textAlign = 'left';
}

function drawThumbnail(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  ratio: number,
  name: string,
): void {
  const context = getContext(canvas);
  const boardWidth = canvas.width - THUMBNAIL_PADDING * 2;
  const boardHeight = boardWidth / ratio;
  const boardY = THUMBNAIL_HEADER;

  context.fillStyle = '#fffaf0';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#24324a';
  context.font = `900 18px ${FONT_FAMILY}`;
  context.textBaseline = 'alphabetic';
  context.fillText(
    fitText(context, name, boardWidth),
    THUMBNAIL_PADDING,
    24,
  );

  roundedRectPath(
    context,
    THUMBNAIL_PADDING,
    boardY,
    boardWidth,
    boardHeight,
    10,
  );
  context.save();
  context.clip();
  context.drawImage(
    image,
    THUMBNAIL_PADDING,
    boardY,
    boardWidth,
    boardHeight,
  );
  context.restore();
}

function encodeThumbnail(canvas: HTMLCanvasElement): string {
  for (const quality of [0.72, 0.55, 0.4, 0.3]) {
    const data = canvas.toDataURL('image/jpeg', quality);
    if (data.length <= 250_000) {
      return data;
    }
  }

  return canvas.toDataURL('image/jpeg', 0.25);
}

function loadSvgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const markup = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Snapshot image could not load.'));
    image.src = url;
  });
}

async function waitForFonts(): Promise<void> {
  if (typeof document === 'undefined' || document.fonts === undefined) {
    return;
  }

  try {
    await document.fonts.ready;
  } catch {
    // The system sans-serif fallback keeps the photo readable.
  }
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  return canvas;
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('Canvas 2D is not available.');
  }

  return context;
}

function readLength(
  svg: SVGSVGElement,
  attribute: 'width' | 'height',
  fallback: number,
): number {
  const value = Number.parseFloat(svg.getAttribute(attribute) ?? '');
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let end = text.length;
  while (end > 1) {
    end -= 1;
    const candidate = `${text.slice(0, end).trimEnd()}…`;
    if (context.measureText(candidate).width <= maxWidth) {
      return candidate;
    }
  }

  return '…';
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}
