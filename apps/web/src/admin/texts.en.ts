import type { adminTexts as adminTextsFr } from './fr';

/**
 * The French dictionary is declared `as const`, so `typeof adminTextsFr`
 * carries the French literal strings. This helper keeps the same nested shape
 * and function signatures while widening the translated values to `string`.
 */
type Translatable<T> = T extends string
  ? string
  : T extends (...args: infer Args) => string
    ? (...args: Args) => string
    : T extends readonly (infer Item)[]
      ? Translatable<Item>[]
      : T extends object
        ? { [Key in keyof T]: Translatable<T[Key]> }
        : T;

const adminTextsEnShape = {
  appName: "Zap's Circuits",
  adultSpace: 'Parent space',
  backToGame: 'Back to game',
  loading: 'Loading…',
  cancel: 'Cancel',
  close: 'Close',
  copy: 'Copy',
  copied: 'Link copied!',
  save: 'Save',
  retry: 'Try again',
  error: 'The request failed. Try again.',
  required: 'This field is required.',
  deniedPage: {
    title: 'Access denied',
    text: 'Your role cannot open this page.',
    back: 'Back',
  },
  notFoundPage: {
    title: 'Page not found',
    text: 'This address does not exist in the parent space.',
    back: 'Back',
  },
  roles: {
    admin: 'Administrator',
    encadrant: 'Coach',
    parent: 'Parent',
    eleve: 'Student',
  },
  nav: {
    groups: 'My groups',
    children: 'My children',
    users: 'Users',
    audit: 'Audit log',
    install: 'Install',
    account: 'My account',
    logout: 'Sign out',
  },
  login: {
    title: 'Parent login',
    subtitle: 'Enter your username and password.',
    username: 'Username',
    password: 'Password',
    submit: 'Sign in',
    forgot:
      'Forgot your password? Ask an administrator for a reset link.',
  },
  invite: {
    title: 'Welcome!',
    resetTitle: 'New password',
    subtitle: 'Choose your password to activate your account.',
    resetSubtitle: 'Choose your new password.',
    password: 'Password (at least 12 characters)',
    confirm: 'Confirm the password',
    submit: 'Activate my account',
    resetSubmit: 'Change the password',
    mismatch: 'The two passwords do not match.',
    invalid: 'This invitation is no longer valid.',
    back: 'Go to sign in',
  },
  groups: {
    title: 'My groups',
    subtitle: 'Create a group, add students and print their cards.',
    createTitle: 'New group',
    name: 'Group name',
    create: 'Create group',
    empty: 'No groups yet.',
    archived: 'Archived',
    active: 'Active',
    studentCount: (count: number) =>
      count === 1 ? '1 student' : `${count} students`,
    open: 'Open',
  },
  group: {
    back: 'My groups',
    code: 'Group code',
    rekey: 'New code',
    rename: 'Rename',
    renameLabel: 'New name',
    archive: 'Archive',
    unarchive: 'Reactivate',
    archivedNotice:
      'This group is archived. Children can no longer sign in.',
    addTitle: 'Add a student',
    name: 'First name',
    avatar: 'Avatar',
    add: 'Add',
    bulkTitle: 'Add several students',
    bulkHint: 'One first name per line (40 maximum).',
    bulk: 'Create students',
    renamed: 'Group renamed.',
    rekeyed: 'New code created.',
    notPinned: 'This device is not pinned to a group.',
    createdTitle: 'Picture passwords created',
    createdHint:
      'Show each picture sequence to the student. It will not be shown again.',
    studentsTitle: 'Students',
    noStudents: 'No students in this group.',
    openStudent: 'View profile',
    print: 'Print cards',
    printHint:
      'The cards contain the first name, avatar and code. The pictures stay separate.',
    pin: 'Link this device to this group',
    unpin: 'Unlink this device',
    pinned: 'This device is linked to this group.',
    pinnedOther: 'This device is linked to another group.',
    picturePassword: 'Pictures',
  },
  student: {
    back: 'Back',
    groups: 'Groups',
    noGroup: 'No group',
    export: 'Download data (JSON)',
    delete: 'Delete permanently',
    deleteTitle: 'Delete this student?',
    deleteWarning:
      "This cannot be undone. All the student's data will be erased.",
    deleteConfirm: "Type the student's first name to confirm.",
    deleteSubmit: 'Delete',
    resetPicture: 'Reset pictures',
    resetHint:
      'A new sequence of three pictures will be shown once only.',
    parents: 'Parents',
    noParents: 'No parent linked.',
    linkParent: 'Link an existing parent',
    linkParentAdminOnly:
      'To link a parent, use the parent invitation below. Only an administrator can link an existing account.',
    parentUsername: 'Parent username',
    link: 'Link',
    unlink: 'Remove',
    inviteParent: 'Invite a new parent',
    parentName: 'Parent display name',
    parentNewUsername: 'Username chosen for the parent',
    parentNewUsernameHint:
      '3 to 32 characters: lowercase letters, numbers, period, hyphen or underscore.',
    createInvite: 'Create invitation link',
    inviteReady: 'Link to give to the parent',
    locked: 'Pictures locked after several errors.',
  },
  users: {
    title: 'Users',
    subtitle: 'All the school accounts.',
    filter: 'Role',
    all: 'All',
    name: 'Name',
    role: 'Role',
    status: 'Status',
    actions: 'Actions',
    active: 'Active',
    disabled: 'Disabled',
    enable: 'Enable',
    disable: 'Disable',
    resetLink: 'Password link',
    resetReady: 'Reset link to give out',
    enabledNotice: 'Account enabled.',
    disabledNotice: 'Account disabled.',
    roleNotice: 'Role changed.',
    unlock: 'Unlock',
    unlocked: 'Account unlocked.',
    inviteTeacherTitle: 'Invite a coach',
    inviteTeacherName: 'Display name',
    inviteTeacherUsername: 'Username',
    inviteTeacherSubmit: 'Create invitation link',
    inviteTeacherReady: 'Invitation link to give out',
    inactiveTitle: 'Students with no activity for 24 months',
    inactiveHint: 'Check the profile before deleting an account.',
    inactiveShow: 'Show list',
    inactiveEmpty: 'No students inactive for 24 months.',
    inactiveSince: (date: string) => `Last activity: ${date}`,
    open: 'View profile',
    self: 'Your own account',
    previous: 'Previous',
    next: 'Next',
    page: (offset: number, size: number, total: number) =>
      `${offset + 1}–${Math.min(offset + size, total)} of ${total}`,
  },
  audit: {
    title: 'Audit log',
    subtitle: 'Sensitive actions by parents.',
    date: 'Date',
    actor: 'Actor',
    action: 'Action',
    target: 'Target',
    previous: 'Previous',
    next: 'Next',
    empty: 'No entries.',
  },
  install: {
    title: 'Install on this tablet',
    subtitle:
      'The app installs like a real app, without an app store.',
    benefit:
      'It opens full screen, works offline and keeps the levels already loaded.',
    ipadTitle: 'On iPad',
    ipadSteps: [
      'Open the game address in Safari.',
      'Tap the Share button.',
      'Choose “Add to Home Screen”.',
      'Tap “Add”.',
    ],
    androidTitle: 'On Android',
    androidSteps: [
      'Open the game address in Chrome.',
      'Tap the three-dot menu.',
      'Choose “Install app” or “Add to Home screen”.',
      'Confirm the installation.',
    ],
    pinTitle: 'Important: link the device again',
    pinText:
      'On iPad, the installed app has its own storage. If this device was linked to a group in Safari, open the installed app, sign in with the coach account, then tap “Link this device to this group” again.',
    pinDetail:
      'Safari data (guest progress, local creations) is not copied automatically to the app.',
    offlineTitle: 'Offline',
    offlineText:
      'After the first opening, the app and the levels already loaded stay available without a network. Progress is queued and synced when the connection returns.',
    orientationText:
      'The app opens full screen and in landscape, like the workbench.',
    note: 'Installation is done from the browser, not from an app store.',
  },
  account: {
    title: 'My account',
    role: 'Role',
    passwordTitle: 'Change my password',
    passwordHint:
      'Your current password is asked to confirm it is really you.',
    currentPassword: 'Current password',
    newPassword: 'New password (at least 12 characters)',
    confirm: 'Confirm the password',
    submit: 'Change the password',
    success: 'Password changed.',
    mismatch: 'The two passwords do not match.',
  },
  parent: {
    title: 'My children',
    subtitle: "Your children's progress.",
    empty: 'No child linked to your account.',
    open: 'View profile',
    completedLevels: (count: number) =>
      count === 1 ? '1 level completed' : `${count} levels completed`,
    stars: (count: number) =>
      count === 1 ? '1 star earned' : `${count} stars earned`,
    lastActivity: (value: string) => `Last played: ${value}`,
    noActivity: 'Not played yet.',
    concepts: 'Words and ideas learned',
  },
  dashboard: {
    groupTitle: 'Progress dashboard',
    backToGroup: 'Back to group',
    open: 'View progress',
    studentsInGroup: 'Students in the group',
    activeLast7: 'Active in the last 7 days',
    chartTitle: 'Success rate by level',
    levelHere: 'at this level',
    levelTransition: 'at the transition',
    levelAt: (label: string) => `at level ${label}`,
    statsTitle: 'Statistics by level',
    difficultiesTitle: 'Frequent difficulties',
    noDifficulties: 'No difficulties found yet.',
    matrixTitle: 'Student progress',
    noStudents: 'No students in this group.',
    level: 'Level',
    completion: 'Completion',
    averageAttempts: 'Average attempts',
    averageHints: 'Average hints',
    attempts: 'attempts',
    student: 'Student',
    openStudent: 'Open profile',
    notStarted: 'Not started',
    inProgress: 'In progress',
    starsLabel: (count: number) => `${count} / 3`,
    timelineTitle: 'Latest attempts',
    noTimeline: 'No attempts recorded.',
    conceptsTitle: 'Concepts mastered',
    conceptMastered: 'Mastered',
    conceptTodo: 'To discover',
    sandboxTitle: 'Free workshop creations',
    noSandbox: 'No creations saved.',
    success: 'Passed',
    failure: 'Needs work',
    hints: (count: number) =>
      count === 1 ? '1 hint' : `${count} hints`,
    difficulty: (students: number, phrase: string, level: string) =>
      students === 1
        ? `1 student had ${phrase} ${level}.`
        : `${students} students had ${phrase} ${level}.`,
    difficultyLabels: {
      open_circuit: 'an open circuit',
      short_circuit: 'a short circuit',
      switch_open: 'an open switch',
      insulating_material: 'an insulating material',
      bulb_one_side: 'a bulb connected on one side',
      led_reversed: 'an LED facing the wrong way',
      missing_battery: 'a missing battery',
      simulation_error: 'a circuit Zap could not understand',
    } as Record<string, string>,
  },
  auditActions: {
    create_group: 'Group created',
    rename_group: 'Group renamed',
    archive_group: 'Group archived',
    unarchive_group: 'Group reactivated',
    regenerate_join_code: 'New group code',
    create_student: 'Student created',
    bulk_create_students: 'Several students created',
    move_student: 'Student moved',
    export_student: 'Student data exported',
    delete_student: 'Student deleted',
    reset_picture_password: 'Pictures reset',
    link_parent: 'Parent linked',
    unlink_parent: 'Parent removed',
    create_invite: 'Invitation created',
    accept_invite: 'Invitation accepted',
    create_password_reset: 'Password reset link created',
    reset_password: 'Password reset',
    change_password: 'Password changed',
    pin_device: 'Device linked',
    unpin_device: 'Device unlinked',
    disable_user: 'Account disabled',
    enable_user: 'Account reactivated',
    change_user_role: 'Role changed',
  } as Record<string, string>,
  targetTypes: {
    user: 'Account',
    group: 'Group',
    invite: 'Invitation',
  } as Record<string, string>,
} satisfies Translatable<typeof adminTextsFr>;

/**
 * The admin scaffold types every language as `typeof adminTexts`, whose
 * literal types were frozen from the French values. The runtime object is
 * fully checked above; this assertion only widens those literal types so the
 * English dictionary can join the language registry.
 */
export const adminTextsEn: typeof adminTextsFr =
  adminTextsEnShape as unknown as typeof adminTextsFr;
