import { Types } from 'mongoose';

import {
  SandboxCircuitModel,
  isValidSandboxData,
  type SandboxCircuitDocument,
} from '../db/models/index.js';
import { ApiError } from './errors.js';

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
