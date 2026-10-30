import mongoose, { Types } from 'mongoose';

import {
  SandboxCircuitModel,
  isValidSandboxData,
  type SandboxCircuitDocument,
} from '../db/models/index.js';
import { ApiError } from './errors.js';

/** Per-child ceiling. Each record can hold 200 KB plus a 300 KB thumbnail. */
export const MAX_SANDBOX_CIRCUITS = 20;

export interface SandboxInput {
  name: string;
  data: unknown;
  thumbnail?: string | null | undefined;
}

export async function listSandboxCircuits(
  userId: Types.ObjectId,
): Promise<SandboxCircuitDocument[]> {
  const circuits = await SandboxCircuitModel.find({ userId }).sort({
    updatedAt: -1,
  });

  return circuits.filter((circuit) => circuit.clientId !== null);
}

export async function saveSandboxCircuit(options: {
  userId: Types.ObjectId;
  id: string;
  input: SandboxInput;
}): Promise<SandboxCircuitDocument> {
  if (!isValidSandboxData(options.input.data)) {
    throw new ApiError(
      400,
      'invalid_sandbox',
      'Le circuit est invalide ou dépasse 200 Ko.',
    );
  }

  const existing = await SandboxCircuitModel.exists({
    userId: options.userId,
    clientId: options.id,
  });

  if (existing === null) {
    const count = await SandboxCircuitModel.countDocuments({
      userId: options.userId,
      clientId: mongoose.trusted({ $type: 'string' }),
    });

    if (count >= MAX_SANDBOX_CIRCUITS) {
      throw new ApiError(
        429,
        'sandbox_quota',
        'Tu as assez de créations. Supprime-en une avant d’en garder une nouvelle.',
      );
    }
  }

  const circuit = await SandboxCircuitModel.findOneAndUpdate(
    { userId: options.userId, clientId: options.id },
    {
      $set: {
        name: options.input.name,
        data: options.input.data,
        thumbnail: options.input.thumbnail ?? null,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    },
  );

  if (circuit === null) {
    throw new Error('L’atelier n’a pas pu être enregistré.');
  }

  return circuit;
}
