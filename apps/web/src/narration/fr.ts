/**
 * Single source of truth for every French string shown to the child or the adults.
 * Narration services look texts up by id through getText().
 */
export const texts = {
  'home.eyebrow': 'Avec Zap, le petit robot',
  'home.title': 'Les Circuits de Zap',
  'home.tagline': 'Allume les lumières en reliant les bons fils !',
  'home.play': 'Jouer',
  'home.sandbox': 'Atelier libre',
  'home.sandboxPlaceholder': 'L’atelier libre arrive bientôt !',
  'home.back': 'Retour',

  'workbench.title': 'Plan de travail',
  'workbench.hint': 'Relie les composants avec des fils.',
  'workbench.back': 'Retour',
  'workbench.undo': 'Annuler',
  'workbench.trash': 'Corbeille',
  'workbench.rotate': 'Tourner',
  'workbench.delete': 'Supprimer',
  'workbench.instructions': 'Consignes',
  'workbench.close': 'Fermer',
  'workbench.rotateDevice': 'Tourne ton téléphone !',
  'workbench.rotateDeviceHint': 'Le plan de travail se joue en paysage.',
  'workbench.showAll': 'Tout voir',
  'workbench.zoomHint': 'Deux doigts pour zoomer',
  'workbench.paletteTitle': 'Composants',
  'workbench.empty': 'Glisse un composant sur le plan.',
  'workbench.statusClosed': 'Le circuit est fermé !',
  'workbench.statusOpen': 'Le circuit est ouvert.',
  'workbench.statusShort': 'Attention, court-circuit !',
  'workbench.statusMissingBattery': 'Il manque une pile.',
  'workbench.statusSwitchOpen': 'L’interrupteur est ouvert.',
  'workbench.statusInsulator': 'Ce matériau ne laisse pas passer le courant.',
  'workbench.statusLedReversed': 'La LED est à l’envers.',
  'workbench.statusBulbOneSide': 'L’ampoule n’est reliée que d’un côté.',
  'workbench.statusError': 'Oups, je n’arrive pas à calculer le circuit.',

  'display.mode': 'Affichage',
  'display.realistic': 'Réaliste',
  'display.symbol': 'Symboles',
  'display.overlay': 'Les deux',

  'component.battery.label': 'Pile',
  'component.battery.short': '+ −',
  'component.bulb.label': 'Ampoule',
  'component.bulb.short': 'Lampe',
  'component.switch.label': 'Interrupteur',
  'component.switch.short': 'Inter.',
  'component.motor.label': 'Moteur',
  'component.motor.short': 'Moteur',
  'component.buzzer.label': 'Buzzer',
  'component.buzzer.short': 'Buzzer',
  'component.led.label': 'LED',
  'component.led.short': 'LED',
  'component.resistor.label': 'Résistance',
  'component.resistor.short': 'R',
  'component.wire.label': 'Fil',
  'component.wire.short': '—',
  'component.metal.label': 'Métal',
  'component.metal.short': 'Métal',
  'component.gum.label': 'Gomme',
  'component.gum.short': 'Gomme',

  'zap.help': 'Aide',
  'zap.hintAria': 'Demander un indice à Zap',
  'zap.replay': 'Réécouter',
  'zap.mute': 'Couper le son',
  'zap.unmute': 'Activer le son',
  'zap.welcome': 'Bonjour ! Je suis Zap. Relie les composants avec des fils.',
  'zap.successBulb': 'Bravo ! L’ampoule s’allume, ton circuit est fermé !',
  'zap.successGeneric': 'Bravo, le circuit est fermé !',
  'zap.short':
    'Attention ! Les deux bouts de la pile se touchent directement. C’est un court-circuit, la pile chauffe !',
  'zap.error': 'Oups, je n’arrive pas à lire le circuit.',

  'zap.hint.open.1': 'Regarde bien : le courant doit faire un tour complet !',
  'zap.hint.open.2': 'Un fil ne touche peut-être pas son voisin.',
  'zap.hint.open.3': 'Les bornes orange ne sont pas reliées.',
  'zap.hint.bulb.1': 'Le fil ne touche qu’un côté de l’ampoule.',
  'zap.hint.bulb.2': 'Relie l’autre côté de l’ampoule.',
  'zap.hint.bulb.3': 'Touche la borne libre de l’ampoule.',
  'zap.hint.switch.1': 'Il y a un interrupteur sur le chemin.',
  'zap.hint.switch.2': 'L’interrupteur est ouvert.',
  'zap.hint.switch.3': 'Touche l’interrupteur pour le fermer.',
  'zap.hint.insulator.1': 'Tout ne laisse pas passer le courant.',
  'zap.hint.insulator.2': 'Ce matériau bloque le courant.',
  'zap.hint.insulator.3': 'Essaie un matériau qui laisse passer le courant.',
  'zap.hint.led.1': 'Une LED a un sens.',
  'zap.hint.led.2': 'La LED est à l’envers.',
  'zap.hint.led.3': 'Tourne la LED pour la retourner.',
  'zap.hint.battery.1': 'Il manque quelque chose pour donner de l’énergie.',
  'zap.hint.battery.2': 'Ajoute une pile au circuit.',
  'zap.hint.battery.3': 'Prends une pile dans la palette.',
  'zap.hint.short.1': 'Attention, le courant passe trop vite !',
  'zap.hint.short.2': 'Les deux bouts de la pile se touchent directement.',
  'zap.hint.short.3': 'Sépare les deux bornes de la pile.',
  'zap.hint.error.1': 'Oups, je ne comprends pas encore ce circuit.',
  'zap.hint.error.2': 'Essaie de déplacer un composant.',
  'zap.hint.error.3': 'Vérifie les bornes du circuit.',

  'chapter.light.title': 'Chapitre 1 : La lumière',
  'map.subtitle': 'Choisis un niveau.',
  'map.back': 'Accueil',
  'map.locked': 'Verrouillé',
  'map.level': 'Niveau',
  'map.transition': 'Transition',
  'map.final': 'Chapitre terminé !',

  'level.01.title': 'Allume l’ampoule',
  'level.01.goal': 'Relie la pile à l’ampoule.',
  'level.01.intro':
    'Zap a besoin de toi. Relie la pile et l’ampoule avec deux fils.',
  'level.01.hint.1': 'Relie le + de la pile à un côté de l’ampoule.',
  'level.01.hint.2': 'Relie l’autre côté de l’ampoule au − de la pile.',
  'level.01.hint.3': 'Les deux fils doivent faire un tour complet.',

  'level.02.title': 'Le circuit fermé',
  'level.02.goal': 'Trouve le fil qui manque.',
  'level.02.intro': 'Le courant a besoin d’un tour complet.',
  'level.02.hint.1': 'Il manque un fil pour fermer le tour.',
  'level.02.hint.2': 'Regarde les bornes libres.',
  'level.02.hint.3': 'Relie la borne libre de l’ampoule à celle de la pile.',

  'level.03.title': 'L’interrupteur',
  'level.03.goal': 'Ferme l’interrupteur pour allumer l’ampoule.',
  'level.03.intro': 'L’interrupteur ouvre et ferme le chemin.',
  'level.03.hint.1': 'L’interrupteur est ouvert.',
  'level.03.hint.2': 'Touche l’interrupteur pour le fermer.',
  'level.03.hint.3': 'Le courant passera quand il sera fermé.',

  'level.04.title': 'Conducteur ou isolant ?',
  'level.04.goal': 'Classe les matériaux.',
  'level.04.intro':
    'Certains matériaux laissent passer le courant, d’autres non.',
  'level.04.hint.1': 'Glisse un matériau dans le circuit.',
  'level.04.hint.2': 'Regarde si l’ampoule s’allume.',
  'level.04.hint.3': 'Range les matériaux dans la bonne boîte.',

  'level.05.title': 'Deux ampoules en file',
  'level.05.goal': 'Relie les deux ampoules l’une après l’autre.',
  'level.05.intro':
    'Avec deux ampoules en file, la lumière est plus faible.',
  'level.05.hint.1': 'Place la deuxième ampoule.',
  'level.05.hint.2': 'Relie-les l’une après l’autre.',
  'level.05.hint.3': 'Les deux ampoules doivent être plus faibles.',

  'level.06.title': 'Deux ampoules côte à côte',
  'level.06.goal': 'Relie les deux ampoules côte à côte.',
  'level.06.intro': 'Côte à côte, les ampoules brillent autant.',
  'level.06.hint.1': 'Place la deuxième ampoule.',
  'level.06.hint.2': 'Relie chaque ampoule directement à la pile.',
  'level.06.hint.3': 'Les ampoules côte à côte brillent normalement.',

  'level.07.title': 'Danger : court-circuit !',
  'level.07.goal': 'Enlève le court-circuit.',
  'level.07.intro':
    'Attention ! La pile chauffe. Trouve le fil qui relie ses deux bornes.',
  'level.07.hint.1': 'Cherche un fil qui va d’une borne à l’autre.',
  'level.07.hint.2': 'Enlève ce fil.',
  'level.07.hint.3': 'L’ampoule doit s’allumer sans court-circuit.',

  'level.08.title': 'Le moteur',
  'level.08.goal': 'Fais tourner le moteur.',
  'level.08.intro': 'Le moteur transforme le courant en mouvement.',
  'level.08.hint.1': 'Place le moteur sur le plan.',
  'level.08.hint.2': 'Relie le moteur à la pile.',
  'level.08.hint.3': 'Le moteur doit tourner.',

  'level.09.title': 'Le sens du courant',
  'level.09.goal': 'Allume la LED.',
  'level.09.intro':
    'Une LED a deux côtés différents. Regarde bien A et K.',
  'level.09.hint.1': 'Place la LED sur le plan.',
  'level.09.hint.2': 'Le + de la pile va sur A.',
  'level.09.hint.3': 'Le − de la pile va sur K.',

  'level.10.title': 'Défi final',
  'level.10.goal': 'Un interrupteur pour le moteur, un pour l’ampoule.',
  'level.10.intro': 'Deux interrupteurs, deux appareils. À toi de jouer !',
  'level.10.hint.1':
    'Place les deux interrupteurs, le moteur et l’ampoule.',
  'level.10.hint.2': 'Fais deux chemins séparés.',
  'level.10.hint.3': 'Chaque interrupteur contrôle son appareil.',

  'symbols.title': 'Les symboles',
  'symbols.goal': 'Associe chaque dessin à son symbole.',
  'symbols.intro':
    'Les ingénieurs dessinent les composants avec des symboles.',
  'symbols.hint.1': 'Regarde la forme du symbole.',
  'symbols.hint.2': 'La pile a une grande et une petite barre.',
  'symbols.hint.3': 'L’ampoule a une croix dans un cercle.',
  'symbols.instructions': 'Glisse chaque dessin sur son symbole.',
  'symbols.component': 'Le composant',
  'symbols.symbol': 'Le symbole',
  'symbols.wrong': 'Essaie encore.',
  'symbols.correct': 'Bien joué !',

  'material.key': 'Clé en métal',
  'material.gum': 'Gomme',
  'material.spoon': 'Cuillère',
  'material.pencil': 'Crayon en bois',
  'material.aluminum': 'Papier aluminium',
  'materials.tray': 'Les matériaux',
  'materials.conductiveBin': 'Le courant passe',
  'materials.insulatingBin': 'Le courant ne passe pas',
  'materials.instructions':
    'Glisse un matériau dans le circuit, puis range-le.',
  'materials.gap': 'Le circuit attend un matériau.',
  'materials.wrong': 'Regarde si l’ampoule s’allume.',
  'materials.correct': 'Bien joué !',

  'level.noComponents': 'Utilise les composants déjà sur le plan.',
  'success.title': 'Bravo !',
  'success.continue': 'Continuer',
  'success.learned': 'Tu as appris…',
  'success.next': 'Niveau suivant',
  'success.map': 'Carte des niveaux',

  'vocab.circuitFerme.word': 'Circuit fermé',
  'vocab.circuitFerme.definition': 'Le courant peut faire un tour complet.',
  'vocab.fil.word': 'Fil',
  'vocab.fil.definition': 'Il transporte le courant.',
  'vocab.circuitOuvert.word': 'Circuit ouvert',
  'vocab.circuitOuvert.definition': 'Le courant ne peut pas passer.',
  'vocab.interrupteur.word': 'Interrupteur',
  'vocab.interrupteur.definition': 'Il ouvre ou ferme le circuit.',
  'vocab.conducteur.word': 'Conducteur',
  'vocab.conducteur.definition': 'Il laisse passer le courant.',
  'vocab.isolant.word': 'Isolant',
  'vocab.isolant.definition': 'Il bloque le courant.',
  'vocab.serie.word': 'En série',
  'vocab.serie.definition': 'Les ampoules sont l’une après l’autre.',
  'vocab.parallele.word': 'En parallèle',
  'vocab.parallele.definition': 'Les ampoules sont côte à côte.',
  'vocab.courtCircuit.word': 'Court-circuit',
  'vocab.courtCircuit.definition':
    'Le courant passe directement, la pile chauffe.',
  'vocab.moteur.word': 'Moteur',
  'vocab.moteur.definition': 'Le courant le fait tourner.',
  'vocab.polarite.word': 'Polarité',
  'vocab.polarite.definition': 'Une LED a un côté A et un côté K.',
  'vocab.symbole.word': 'Symbole',
  'vocab.symbole.definition': 'Un dessin simple pour un composant.',
} as const;

export type TextId = keyof typeof texts;

export function getText(id: string): string {
  return texts[id as TextId] ?? '';
}

export interface VocabularyEntry {
  word: string;
  definition: string;
}

export function getVocabulary(id: string): VocabularyEntry | null {
  const word = getText(`vocab.${id}.word`);
  const definition = getText(`vocab.${id}.definition`);
  return word === '' ? null : { word, definition };
}

export const fr = {
  home: {
    eyebrow: texts['home.eyebrow'],
    title: texts['home.title'],
    tagline: texts['home.tagline'],
    play: texts['home.play'],
    sandbox: texts['home.sandbox'],
    sandboxPlaceholder: texts['home.sandboxPlaceholder'],
    back: texts['home.back'],
  },
  workbench: {
    title: texts['workbench.title'],
    hint: texts['workbench.hint'],
    back: texts['workbench.back'],
    undo: texts['workbench.undo'],
    trash: texts['workbench.trash'],
    rotate: texts['workbench.rotate'],
    delete: texts['workbench.delete'],
    instructions: texts['workbench.instructions'],
    close: texts['workbench.close'],
    rotateDevice: texts['workbench.rotateDevice'],
    rotateDeviceHint: texts['workbench.rotateDeviceHint'],
    showAll: texts['workbench.showAll'],
    zoomHint: texts['workbench.zoomHint'],
    paletteTitle: texts['workbench.paletteTitle'],
    empty: texts['workbench.empty'],
    statusClosed: texts['workbench.statusClosed'],
    statusOpen: texts['workbench.statusOpen'],
    statusShort: texts['workbench.statusShort'],
    statusMissingBattery: texts['workbench.statusMissingBattery'],
    statusSwitchOpen: texts['workbench.statusSwitchOpen'],
    statusInsulator: texts['workbench.statusInsulator'],
    statusLedReversed: texts['workbench.statusLedReversed'],
    statusBulbOneSide: texts['workbench.statusBulbOneSide'],
    statusError: texts['workbench.statusError'],
    displayMode: texts['display.mode'],
    displayRealistic: texts['display.realistic'],
    displaySymbol: texts['display.symbol'],
    displayOverlay: texts['display.overlay'],
  },
  components: {
    battery: {
      label: texts['component.battery.label'],
      short: texts['component.battery.short'],
    },
    bulb: {
      label: texts['component.bulb.label'],
      short: texts['component.bulb.short'],
    },
    switch: {
      label: texts['component.switch.label'],
      short: texts['component.switch.short'],
    },
    motor: {
      label: texts['component.motor.label'],
      short: texts['component.motor.short'],
    },
    buzzer: {
      label: texts['component.buzzer.label'],
      short: texts['component.buzzer.short'],
    },
    led: {
      label: texts['component.led.label'],
      short: texts['component.led.short'],
    },
    resistor: {
      label: texts['component.resistor.label'],
      short: texts['component.resistor.short'],
    },
    wire: {
      label: texts['component.wire.label'],
      short: texts['component.wire.short'],
    },
    metal: {
      label: texts['component.metal.label'],
      short: texts['component.metal.short'],
    },
    gum: {
      label: texts['component.gum.label'],
      short: texts['component.gum.short'],
    },
  },
  zap: {
    help: texts['zap.help'],
    hintAria: texts['zap.hintAria'],
    replay: texts['zap.replay'],
    mute: texts['zap.mute'],
    unmute: texts['zap.unmute'],
  },
} as const;
