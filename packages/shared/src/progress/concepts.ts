export interface ProgressConcept {
  readonly id: string;
  readonly label: string;
  readonly vocabularyIds: readonly string[];
}

/** The eight concepts tracked on the adult dashboards. */
export const PROGRESS_CONCEPTS: readonly ProgressConcept[] = [
  {
    id: 'circuit_ferme',
    label: 'Circuit fermé',
    vocabularyIds: ['circuitFerme'],
  },
  {
    id: 'interrupteur',
    label: 'Interrupteur',
    vocabularyIds: ['interrupteur'],
  },
  {
    id: 'conducteur_isolant',
    label: 'Conducteur / isolant',
    vocabularyIds: ['conducteur', 'isolant'],
  },
  {
    id: 'serie',
    label: 'En série',
    vocabularyIds: ['serie'],
  },
  {
    id: 'derivation',
    label: 'Dérivation',
    vocabularyIds: ['parallele'],
  },
  {
    id: 'court_circuit',
    label: 'Court-circuit',
    vocabularyIds: ['courtCircuit'],
  },
  {
    id: 'moteur',
    label: 'Moteur',
    vocabularyIds: ['moteur'],
  },
  {
    id: 'polarite',
    label: 'Polarité',
    vocabularyIds: ['polarite'],
  },
];
