import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import { JOIN_CODE_PATTERN } from '../../services/joinCode.js';

export const GROUP_MEMBER_ROLES = ['encadrant', 'eleve'] as const;

export type GroupMemberRole = (typeof GROUP_MEMBER_ROLES)[number];

export interface GroupMember {
  userId: Types.ObjectId;
  roleInGroup: GroupMemberRole;
  joinedAt: Date;
}

export interface Group {
  name: string;
  joinCode: string;
  createdBy: Types.ObjectId;
  archivedAt: Date | null;
  members: GroupMember[];
  createdAt: Date;
  updatedAt: Date;
}

export type GroupDocument = HydratedDocument<Group>;

const memberSchema = new Schema<GroupMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roleInGroup: {
      type: String,
      required: true,
      enum: GROUP_MEMBER_ROLES,
    },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false, strict: 'throw' },
);

const groupSchema = new Schema<Group>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    joinCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: JOIN_CODE_PATTERN,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    archivedAt: { type: Date, default: null },
    members: { type: [memberSchema], default: [] },
  },
  {
    collection: 'groups',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

groupSchema.index(
  { joinCode: 1 },
  { name: 'groups_join_code_unique', unique: true },
);
groupSchema.index({ 'members.userId': 1 }, { name: 'groups_members_user_id' });

export const GroupModel: Model<Group> =
  (mongoose.models['Group'] as Model<Group> | undefined) ??
  model<Group>('Group', groupSchema);
