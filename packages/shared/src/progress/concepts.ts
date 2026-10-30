export interface ProgressConcept {
  readonly id: string;
  readonly label: string;
  readonly vocabularyIds: readonly string[];
}

/** The concepts tracked on the adult dashboards. */
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
  {
    id: 'tension',
    label: 'Tension',
    vocabularyIds: ['tension'],
  },
  {
    id: 'courant',
    label: 'Courant',
    vocabularyIds: ['courant'],
  },
  {
    id: 'resistance',
    label: 'Résistance',
    vocabularyIds: ['resistance'],
  },
  {
    id: 'variateur',
    label: 'Variateur',
    vocabularyIds: ['variateur'],
  },
  {
    id: 'puissance',
    label: 'Puissance',
    vocabularyIds: ['puissance'],
  },
  {
    id: 'combinaison',
    label: 'Circuit combiné',
    vocabularyIds: ['combinaison'],
  },
  {
    id: 'son',
    label: 'Sonnerie',
    vocabularyIds: ['sonnerie'],
  },
  {
    id: 'diode',
    label: 'Diode et sens unique',
    vocabularyIds: ['diode', 'sensUnique'],
  },
  {
    id: 'aimant',
    label: 'Électroaimant et bobine',
    vocabularyIds: ['electroAimant', 'bobine'],
  },
  {
    id: 'relais',
    label: 'Relais et lame souple',
    vocabularyIds: ['relais', 'lameSouple'],
  },
  {
    id: 'lumiere',
    label: 'Capteur de lumière et panneau solaire',
    vocabularyIds: ['capteurLumiere', 'panneauSolaire'],
  },
  {
    id: 'condensateur',
    label: 'Condensateur, charge et décharge',
    vocabularyIds: ['condensateur', 'charge', 'decharge', 'reserve'],
  },
];
