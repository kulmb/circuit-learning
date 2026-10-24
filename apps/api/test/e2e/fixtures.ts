/**
 * Deterministic data shared by the Playwright server and the browser tests.
 * The test database is an in-memory replica set, so these ids never touch a
 * real environment.
 */

export const E2E_PROJECTS = [
  'desktop-chrome',
  'desktop-safari',
  'ipad-landscape',
  'ipad-portrait',
  'galaxy-tab-s4',
  'iphone-13-landscape',
  'pixel-7-landscape',
] as const;

export const E2E_ADULT_PASSWORD = 'Circuits-E2E-2026';

export const E2E_CHILD_PATTERN = ['renard', 'pomme', 'ballon'] as const;

export const E2E_IDS = {
  teacherA: '100000000000000000000001',
  teacherB: '100000000000000000000002',
  parent: '100000000000000000000003',
  lina: '100000000000000000000004',
  groupA: '200000000000000000000001',
  groupB: '200000000000000000000002',
} as const;

export const E2E_ACCOUNTS = {
  teacherA: { username: 'maitresse-a', displayName: 'Maitresse A' },
  teacherB: { username: 'maitresse-b', displayName: 'Maitresse B' },
  parent: { username: 'parent-lina', displayName: 'Parent de Lina' },
} as const;

export const E2E_GROUPS = {
  a: { id: E2E_IDS.groupA, name: 'Groupe A', joinCode: 'AAAAAA' },
  b: { id: E2E_IDS.groupB, name: 'Groupe B', joinCode: 'BBBBBB' },
} as const;

/** Two children per browser project: one for the child flow, one for offline. */
export const E2E_CHILD_NAMES = E2E_PROJECTS.flatMap((_project, index) => [
  `Lina ${index * 2 + 1}`,
  `Lina ${index * 2 + 2}`,
]);

export const E2E_CHILD_IDS = E2E_CHILD_NAMES.map(
  (_name, index) =>
    `4000000000000000000000${String(index + 1).padStart(2, '0')}`,
);

export type E2EChildPurpose = 'child' | 'offline';

/**
 * Each project works on its own children, so running the suite on seven
 * devices never makes one project depend on the progress of another.
 */
export function e2eChildFor(
  projectName: string,
  purpose: E2EChildPurpose,
): { id: string; name: string } {
  const projectIndex = E2E_PROJECTS.indexOf(
    projectName as (typeof E2E_PROJECTS)[number],
  );
  const safeProjectIndex = projectIndex === -1 ? 0 : projectIndex;
  const index = safeProjectIndex * 2 + (purpose === 'offline' ? 1 : 0);

  return {
    id: E2E_CHILD_IDS[index] ?? E2E_CHILD_IDS[0]!,
    name: E2E_CHILD_NAMES[index] ?? E2E_CHILD_NAMES[0]!,
  };
}
