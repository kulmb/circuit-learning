import { OBJECT_ID_PATTERN } from '@circuits/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { SessionKind } from '../db/models/index.js';
import {
  ADULT_SESSION_TTL_MS,
  CHILD_SESSION_TTL_MS,
} from './sessions.js';

export const SESSION_COOKIE = 'zap_session';
export const DEVICE_PIN_COOKIE = 'zap_device';
/**
 * The __Host- prefix pins the cookie to this exact origin: it must be Secure,
 * Path=/, and carry no Domain. It blocks cookie tossing from a sibling
 * subdomain. Development runs on http, where the prefix is not allowed.
 */
export const SECURE_SESSION_COOKIE = '__Host-zap_session';
export const SECURE_DEVICE_PIN_COOKIE = '__Host-zap_device';

export const DEVICE_PIN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CookieSettings {
  secure: boolean;
}

function cookieBase(settings: CookieSettings) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: settings.secure,
    path: '/',
  };
}

function sessionCookieName(settings: CookieSettings): string {
  return settings.secure ? SECURE_SESSION_COOKIE : SESSION_COOKIE;
}

function devicePinCookieName(settings: CookieSettings): string {
  return settings.secure ? SECURE_DEVICE_PIN_COOKIE : DEVICE_PIN_COOKIE;
}

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  kind: SessionKind,
  settings: CookieSettings,
): void {
  reply.setCookie(sessionCookieName(settings), token, {
    ...cookieBase(settings),
    maxAge:
      (kind === 'adult' ? ADULT_SESSION_TTL_MS : CHILD_SESSION_TTL_MS) / 1000,
  });
}

export function clearSessionCookie(
  reply: FastifyReply,
  settings: CookieSettings,
): void {
  reply.clearCookie(SESSION_COOKIE, cookieBase(settings));

  if (settings.secure) {
    reply.clearCookie(SECURE_SESSION_COOKIE, cookieBase(settings));
  }
}

export function readSessionCookie(request: FastifyRequest): string | null {
  const value =
    request.cookies[SECURE_SESSION_COOKIE] ?? request.cookies[SESSION_COOKIE];

  return typeof value === 'string' && value.length > 0 ? value : null;
}

function devicePinValue(groupId: string): string {
  return `${groupId}.${Date.now() + DEVICE_PIN_TTL_MS}`;
}

export function setDevicePinCookie(
  reply: FastifyReply,
  groupId: string,
  settings: CookieSettings,
): void {
  reply.setCookie(devicePinCookieName(settings), devicePinValue(groupId), {
    ...cookieBase(settings),
    signed: true,
    maxAge: DEVICE_PIN_TTL_MS / 1000,
  });
}

export function clearDevicePinCookie(
  reply: FastifyReply,
  settings: CookieSettings,
): void {
  reply.clearCookie(DEVICE_PIN_COOKIE, cookieBase(settings));

  if (settings.secure) {
    reply.clearCookie(SECURE_DEVICE_PIN_COOKIE, cookieBase(settings));
  }
}

/**
 * The signed cookie contains `<groupId>.<expiry>`. The signature stops a child
 * from editing the group id in the browser.
 */
export function readDevicePin(request: FastifyRequest): string | null {
  const raw =
    request.cookies[SECURE_DEVICE_PIN_COOKIE] ??
    request.cookies[DEVICE_PIN_COOKIE];

  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }

  const unsigned = request.unsignCookie(raw);

  if (!unsigned.valid || unsigned.value === null) {
    return null;
  }

  const separator = unsigned.value.lastIndexOf('.');
  if (separator <= 0) {
    return null;
  }

  const groupId = unsigned.value.slice(0, separator);
  const expiresAt = Number.parseInt(unsigned.value.slice(separator + 1), 10);

  if (!OBJECT_ID_PATTERN.test(groupId)) {
    return null;
  }

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  return groupId;
}
