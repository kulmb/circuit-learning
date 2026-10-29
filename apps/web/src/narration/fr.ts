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
  'home.back': 'Retour',
  'home.adultSpace': 'Espace adulte',
  'home.parentSettings': 'Réglages parents',

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

  'sandbox.title': 'Atelier libre',
  'sandbox.subtitle': 'Invente ton circuit !',
  'sandbox.intro':
    'Bienvenue dans mon atelier ! Invente le circuit que tu veux.',
  'sandbox.myWorkshop': 'Mon atelier',
  'sandbox.panelTitle': 'Mon atelier',
  'sandbox.close': 'Fermer',
  'sandbox.save': 'Enregistrer',
  'sandbox.saving': 'J’enregistre…',
  'sandbox.saved': 'Circuit enregistré !',
  'sandbox.saveError': 'Je n’ai pas réussi à enregistrer. Réessaie.',
  'sandbox.unsaved': 'Pas encore enregistré',
  'sandbox.current': 'Sur le plan',
  'sandbox.photo': 'Prendre une photo',
  'sandbox.photoBusy': 'Je prépare la photo…',
  'sandbox.photoReady': 'Ta photo est prête !',
  'sandbox.photoError': 'Je n’ai pas réussi à prendre la photo. Réessaie.',
  'sandbox.photoSaved': 'Ton circuit est enregistré avec la photo.',
  'sandbox.photoNotSaved':
    'La photo est prête, mais le circuit n’est pas enregistré.',
  'sandbox.photoAlt': 'Ton circuit en photo',
  'sandbox.download': 'Télécharger la photo',
  'sandbox.clear': 'Tout effacer',
  'sandbox.clearTitle': 'Tout effacer ?',
  'sandbox.clearText': 'Tous les composants vont disparaître du plan.',
  'sandbox.clearYes': 'Oui, tout effacer',
  'sandbox.clearNo': 'Non, je garde',
  'sandbox.worksTitle': 'Mes créations',
  'sandbox.noWorks': 'Aucune création pour le moment.',
  'sandbox.worksHint': 'Choisis une création pour la rouvrir.',
  'sandbox.worksError': 'Je n’ai pas réussi à lire mes créations.',
  'sandbox.openWork': 'Ouvrir',
  'sandbox.defaultName': 'Mon circuit',
  'sandbox.photoTitle': 'Les Circuits de Zap',
  'sandbox.photoFooter': 'Créé avec Zap',
  'sandbox.loading': 'J’ouvre mon atelier…',
  'sandbox.curiosity.empty': 'Et si tu posais une pile et une ampoule ?',
  'sandbox.curiosity.battery': 'Et si tu ajoutais une pile ?',
  'sandbox.curiosity.bulb': 'Et si tu ajoutais une ampoule ?',
  'sandbox.curiosity.secondBattery':
    'Et si tu ajoutais une deuxième pile ?',
  'sandbox.curiosity.secondBulb':
    'Et si tu ajoutais une deuxième ampoule ?',
  'sandbox.curiosity.switch': 'Et si tu ajoutais un interrupteur ?',
  'sandbox.curiosity.motor': 'Et si tu ajoutais un moteur ?',
  'sandbox.curiosity.led': 'Et si tu ajoutais une LED ?',
  'sandbox.curiosity.material':
    'Et si tu essayais le métal et la gomme ?',
  'sandbox.curiosity.photo':
    'Et si tu prenais une photo de ton circuit ?',
  'sandbox.curiosity.rotate': 'Et si tu tournais un composant ?',

  'display.mode': 'Affichage',
  'display.realistic': 'Réaliste',
  'display.symbol': 'Symboles',
  'display.overlay': 'Les deux',

  'workbench.meters': 'Les mesures de Zap',
  'meter.tension': 'Tension',
  'meter.tension.low': 'poussée douce',
  'meter.tension.medium': 'poussée moyenne',
  'meter.tension.high': 'poussée forte',
  'meter.courant': 'Courant',
  'meter.courant.low': 'débit faible',
  'meter.courant.medium': 'débit moyen',
  'meter.courant.high': 'débit fort',
  'meter.resistance': 'Résistance',
  'meter.resistance.low': 'frein faible',
  'meter.resistance.medium': 'frein moyen',
  'meter.resistance.high': 'frein fort',
  'meter.puissance': 'Puissance',
  'meter.puissance.low': 'peu d’énergie',
  'meter.puissance.medium': 'énergie moyenne',
  'meter.puissance.high': 'beaucoup d’énergie',
  'meter.off': 'circuit ouvert',
  'meter.alert': 'attention',

  'challenge.new': 'Nouveau défi',
  'challenge.badge': 'Défi',
  'challenge.hint': 'Chaque défi mélange les pièces.',

  'component.battery.label': 'Pile',
  'component.bulb.label': 'Ampoule',
  'component.switch.label': 'Interrupteur',
  'component.motor.label': 'Moteur',
  'component.buzzer.label': 'Sonnerie',
  'component.led.label': 'LED',
  'component.resistor.label': 'Résistance',
  'component.rheostat.label': 'Variateur',
  'component.wire.label': 'Fil',
  'component.metal.label': 'Métal',
  'component.gum.label': 'Gomme',

  'zap.help': 'Aide',
  'zap.hide': 'Cacher Zap',
  'zap.show': 'Afficher Zap',
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
  'zap.hint.led.2': 'Le + de la pile va sur A.',
  'zap.hint.led.3': 'Le − de la pile va sur K.',
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
  'chapter.current.title': 'Chapitre 2 : La force du courant',
  'chapter.assemblies.title': 'Chapitre 3 : En série ou en parallèle ?',
  'chapter.challenges.title': 'Chapitre 4 : Les défis de Zap',
  'map.title': 'Carte des niveaux',
  'map.subtitle': 'Choisis un niveau.',
  'map.back': 'Accueil',
  'map.locked': 'Verrouillé',
  'map.level': 'Niveau',
  'map.transition': 'Transition',
  'map.final': 'Chapitre terminé !',
  'map.guestNotice':
    'Tu joues en invité. Ta progression reste sur cet appareil.',
  'map.collection': 'Ma collection',
  'map.sandbox': 'Atelier libre',
  'map.bye': 'Au revoir',

  'pwa.updateDone': 'Mise à jour terminée !',
  'pwa.updateDoneDetail': 'Tu joues avec la dernière version.',
  'pwa.updateDoneClose': 'Fermer',

  'parentSettings.title': 'Réglages parents',
  'parentSettings.subtitle': 'Pour les adultes qui accompagnent l’enfant.',
  'parentSettings.back': 'Retour',
  'parentSettings.gateTitle': 'Petite question',
  'parentSettings.question': 'Combien font',
  'parentSettings.gateError': 'Ce n’est pas la bonne réponse. Réessaie.',
  'parentSettings.gateHint':
    'Cette question protège les réglages des jeunes enfants.',
  'parentSettings.unlocked': 'Réglages déverrouillés.',
  'parentSettings.soundTitle': 'Son',
  'parentSettings.soundHint': 'La voix de Zap et les effets sonores.',
  'parentSettings.soundOn': 'Son activé',
  'parentSettings.soundOff': 'Son coupé',
  'parentSettings.voiceTitle': 'Vitesse de la voix',
  'parentSettings.voiceHint': 'Choisis le rythme qui convient à l’enfant.',
  'parentSettings.voiceSlow': 'Lent',
  'parentSettings.voiceNormal': 'Normal',
  'parentSettings.voiceFast': 'Rapide',
  'parentSettings.voiceSample': 'Bonjour ! Je suis Zap. Voici ma voix.',
  'parentSettings.vibrationTitle': 'Vibrations',
  'parentSettings.vibrationHint':
    'Une petite vibration quand un niveau est réussi, deux en cas de court-circuit.',
  'parentSettings.vibrationOn': 'Vibrations activées',
  'parentSettings.vibrationOff': 'Vibrations coupées',
  'parentSettings.vibrationUnsupported':
    'Les vibrations ne sont pas disponibles sur cet appareil.',
  'parentSettings.lowTitle': 'Mode faible performance',
  'parentSettings.lowHint':
    'Moins de points de courant et moins d’effets lumineux.',
  'parentSettings.lowOn': 'Activé',
  'parentSettings.lowOff': 'Désactivé',
  'parentSettings.lowAuto': 'Réduit automatiquement car le jeu ralentit.',
  'parentSettings.lowReduced': 'Réduit par les réglages du système.',
  'parentSettings.resetTitle': 'Progression locale',
  'parentSettings.resetHint':
    'Efface les niveaux et les étoiles enregistrés sur cet appareil. Les créations de l’atelier sont gardées.',
  'parentSettings.resetAccountNote':
    'La progression d’un compte enfant reste enregistrée sur le serveur.',
  'parentSettings.reset': 'Effacer la progression locale',
  'parentSettings.resetConfirmTitle': 'Effacer la progression locale ?',
  'parentSettings.resetConfirmText':
    'Les niveaux et les étoiles de cet appareil seront effacés.',
  'parentSettings.resetYes': 'Oui, effacer',
  'parentSettings.resetNo': 'Non, garder',
  'parentSettings.resetDone': 'La progression locale a été effacée.',

  'login.title': 'Qui joue ?',
  'login.groupTitle': 'Entre le code du groupe',
  'login.groupHint': 'Demande le code à ton encadrant.',
  'login.groupError':
    'Ce code ne marche pas. Vérifie avec ton encadrant.',
  'login.delete': 'Effacer',
  'login.guest': 'Jouer en invité',
  'login.adult': 'Espace adulte',
  'login.emptyGroup': 'Aucun élève dans ce groupe pour le moment.',
  'login.chooseAvatar': 'Choisis ton avatar',
  'login.pictureTitle': 'Touche tes trois images',
  'login.pictureHint': 'Dans le bon ordre.',
  'login.back': 'Retour',
  'login.pinned': 'Cet appareil est déjà fixé à ce groupe.',
  'login.wrong': 'Ce n’est pas le bon dessin. Essaie encore.',
  'login.locked': 'Demande de l’aide à ton encadrant.',
  'login.connectionError':
    'Oups, je n’arrive pas à te connecter. Réessaie.',
  'login.retry': 'Recommencer',

  'collection.title': 'Ma collection',
  'collection.subtitle': 'Les mots que tu as appris.',
  'collection.empty': 'Joue des niveaux pour gagner des mots !',
  'collection.listen': 'Écouter',
  'collection.back': 'Carte des niveaux',
  'collection.wordAria': 'Écouter le mot',

  'picture.renard': 'Le renard',
  'picture.panda': 'Le panda',
  'picture.grenouille': 'La grenouille',
  'picture.pomme': 'La pomme',
  'picture.banane': 'La banane',
  'picture.fraise': 'La fraise',
  'picture.ballon': 'Le ballon',
  'picture.voiture': 'La voiture',
  'picture.etoile': 'L’étoile',

  'progress.saveError':
    'Oups, je n’arrive pas à sauvegarder. On réessaie plus tard !',
  'progress.mergeAdult': 'Pour l’adulte',
  'progress.mergeTitle': 'Progression d’invité',
  'progress.mergeQuestion':
    'Cet appareil a une progression d’invité. La fusionner avec ce compte ?',
  'progress.mergeYes': 'Oui, fusionner',
  'progress.mergeNo': 'Non, garder le compte',
  'progress.mergeBusy': 'Fusion en cours…',
  'progress.mergeError':
    'La fusion n’a pas marché. Réessaie plus tard.',

  'level.backToMap': 'Carte des niveaux',

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

  'level.05.title': 'Deux ampoules en série',
  'level.05.goal': 'Relie les deux ampoules l’une après l’autre.',
  'level.05.intro':
    'En série, les ampoules brillent moins fort.',
  'level.05.hint.1': 'Place la deuxième ampoule.',
  'level.05.hint.2': 'Relie-les l’une après l’autre.',
  'level.05.hint.3': 'Les deux ampoules doivent être plus faibles.',

  'level.06.title': 'Deux ampoules en parallèle',
  'level.06.goal': 'Relie chaque ampoule directement à la pile.',
  'level.06.intro': 'En parallèle, les ampoules brillent autant.',
  'level.06.hint.1': 'Place la deuxième ampoule.',
  'level.06.hint.2': 'Relie chaque ampoule directement à la pile.',
  'level.06.hint.3': 'Les ampoules en parallèle brillent normalement.',

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

  'level.current.01.title': 'Les deux bornes',
  'level.current.01.goal': 'Allume la LED.',
  'level.current.01.intro': 'Le courant sort par + et revient par −.',
  'level.current.01.hint.1': 'Regarde les signes + et −.',
  'level.current.01.hint.2': 'Le + de la pile va sur A.',
  'level.current.01.hint.3': 'Le − de la pile va sur K.',

  'level.current.02.title': 'La force de la pile',
  'level.current.02.goal': 'Fais briller l’ampoule plus fort.',
  'level.current.02.intro':
    'Avec une pile, l’ampoule brille. Avec deux, elle brille fort !',
  'level.current.02.hint.1': 'Prends une pile dans la palette.',
  'level.current.02.hint.2': 'Pose la pile sur le fil du +.',
  'level.current.02.hint.3':
    'Annule, puis recommence sur le fil du +.',

  'level.current.03.title': 'Le courant',
  'level.current.03.goal': 'Mets l’ampoule sur le chemin du moteur.',
  'level.current.03.intro': 'Le même courant traverse tout le circuit.',
  'level.current.03.hint.1': 'Prends une ampoule dans la palette.',
  'level.current.03.hint.2': 'Pose-la sur un fil.',
  'level.current.03.hint.3': 'Le courant doit passer par les deux.',

  'level.current.04.title': 'La résistance',
  'level.current.04.goal': 'Fais briller l’ampoule faiblement.',
  'level.current.04.intro': 'La résistance freine le courant.',
  'level.current.04.hint.1': 'Prends la résistance dans la palette.',
  'level.current.04.hint.2': 'Pose-la sur un fil.',
  'level.current.04.hint.3': 'Le courant passe par la résistance.',

  'level.current.05.title': 'Le variateur',
  'level.current.05.goal': 'Baisse la lumière.',
  'level.current.05.intro':
    'Touche le variateur, puis glisse le curseur.',
  'level.current.05.hint.1': 'Touche le variateur.',
  'level.current.05.hint.2': 'Glisse le curseur vers la droite.',
  'level.current.05.hint.3': 'L’ampoule doit briller faiblement.',

  'level.current.06.title': 'La veilleuse',
  'level.current.06.goal': 'Allume la veilleuse doucement.',
  'level.current.06.intro':
    'Un interrupteur et un variateur pour la veilleuse.',
  'level.current.06.hint.1':
    'Place l’interrupteur, l’ampoule et le variateur.',
  'level.current.06.hint.2': 'Relie-les en file avec la pile.',
  'level.current.06.hint.3':
    'Ferme l’interrupteur et baisse la lumière.',

  'level.current.07.title': 'La puissance',
  'level.current.07.goal': 'Fais briller l’ampoule très fort.',
  'level.current.07.intro':
    'Plus l’ampoule brille, plus elle utilise d’énergie.',
  'level.current.07.hint.1': 'Touche le variateur.',
  'level.current.07.hint.2': 'Glisse le curseur vers la gauche.',
  'level.current.07.hint.3':
    'Plus la lumière monte, plus la puissance augmente.',

  'level.assembly.01.title': 'En série',
  'level.assembly.01.goal': 'Relie les deux ampoules en série.',
  'level.assembly.01.intro':
    'En série, le courant passe par les deux.',
  'level.assembly.01.hint.1': 'Place la deuxième ampoule.',
  'level.assembly.01.hint.2': 'Relie-la après la première.',
  'level.assembly.01.hint.3':
    'Les deux ampoules doivent être plus faibles.',

  'level.assembly.02.title': 'En parallèle',
  'level.assembly.02.goal': 'Relie chaque ampoule à la pile.',
  'level.assembly.02.intro':
    'En parallèle, chaque ampoule a son chemin.',
  'level.assembly.02.hint.1': 'Place la deuxième ampoule.',
  'level.assembly.02.hint.2':
    'Relie chaque ampoule directement à la pile.',
  'level.assembly.02.hint.3':
    'Les deux ampoules brillent normalement.',

  'level.assembly.03.title': 'Le circuit combiné',
  'level.assembly.03.goal': 'Une ampoule forte, deux faibles.',
  'level.assembly.03.intro':
    'Mélange une ampoule en série et deux en parallèle.',
  'level.assembly.03.hint.1':
    'La première ampoule est seule sur son chemin.',
  'level.assembly.03.hint.2':
    'Les deux autres sont en parallèle.',
  'level.assembly.03.hint.3':
    'Relie les deux dernières à la même borne.',

  'level.assembly.04.title': 'Les deux commandes',
  'level.assembly.04.goal':
    'Un interrupteur pour tout, un pour une ampoule.',
  'level.assembly.04.intro':
    'Le premier coupe tout, le second une ampoule.',
  'level.assembly.04.hint.1':
    'Le premier interrupteur commande les deux ampoules.',
  'level.assembly.04.hint.2':
    'Le second commande seulement la deuxième.',
  'level.assembly.04.hint.3':
    'Relie le premier interrupteur avant les deux chemins.',

  'level.defi.01.title': 'Première lumière',
  'level.defi.01.goal': 'Allume l’ampoule.',
  'level.defi.01.intro':
    'Zap a mélangé les pièces. À toi de jouer !',
  'level.defi.01.hint.1': 'Il manque peut-être un fil.',
  'level.defi.01.hint.2': 'Relie la pile à l’ampoule.',
  'level.defi.01.hint.3':
    'Le courant doit faire un tour complet.',

  'level.defi.02.title': 'Deux ampoules',
  'level.defi.02.goal': 'Relie les deux ampoules en file.',
  'level.defi.02.intro':
    'Même nombre de pièces, un nouveau circuit.',
  'level.defi.02.hint.1': 'Place la deuxième ampoule.',
  'level.defi.02.hint.2': 'Relie-les l’une après l’autre.',
  'level.defi.02.hint.3':
    'Le courant passe par les deux ampoules.',

  'level.defi.03.title': 'Les deux chemins',
  'level.defi.03.goal':
    'Un interrupteur pour une seule ampoule.',
  'level.defi.03.intro':
    'Deux chemins, un interrupteur. À toi de trouver !',
  'level.defi.03.hint.1':
    'Chaque ampoule a son propre chemin.',
  'level.defi.03.hint.2':
    'L’interrupteur coupe un seul chemin.',
  'level.defi.03.hint.3':
    'Ferme l’interrupteur pour allumer la deuxième.',

  'level.defi.04.title': 'L’atelier du moteur',
  'level.defi.04.goal':
    'Le moteur tourne et l’ampoule reste douce.',
  'level.defi.04.intro':
    'Un moteur, une ampoule et un variateur.',
  'level.defi.04.hint.1':
    'Le moteur et l’ampoule ont chacun leur chemin.',
  'level.defi.04.hint.2':
    'L’interrupteur commande le moteur.',
  'level.defi.04.hint.3':
    'Baisse la lumière avec le variateur.',

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
  'vocab.serie.definition': 'Elles sont sur le même chemin.',
  'vocab.parallele.word': 'En parallèle',
  'vocab.parallele.definition': 'Chaque ampoule a son propre chemin.',
  'vocab.courtCircuit.word': 'Court-circuit',
  'vocab.courtCircuit.definition':
    'Le courant passe directement, la pile chauffe.',
  'vocab.moteur.word': 'Moteur',
  'vocab.moteur.definition': 'Le courant le fait tourner.',
  'vocab.polarite.word': 'Polarité',
  'vocab.polarite.definition': 'Une LED a un côté A et un côté K.',
  'vocab.borne.word': 'Borne',
  'vocab.borne.definition': 'Le + et le − de la pile.',
  'vocab.tension.word': 'Tension',
  'vocab.tension.definition': 'C’est la force qui pousse le courant.',
  'vocab.courant.word': 'Courant',
  'vocab.courant.definition': 'C’est ce qui coule dans les fils.',
  'vocab.resistance.word': 'Résistance',
  'vocab.resistance.definition': 'Elle freine le courant.',
  'vocab.variateur.word': 'Variateur',
  'vocab.variateur.definition': 'Il règle la force du courant.',
  'vocab.puissance.word': 'Puissance',
  'vocab.puissance.definition': 'C’est l’énergie que l’ampoule utilise.',
  'vocab.combinaison.word': 'Combinaison',
  'vocab.combinaison.definition':
    'Plusieurs chemins dans le même circuit.',
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
    meters: texts['workbench.meters'],
  },
  challenge: {
    new: texts['challenge.new'],
    badge: texts['challenge.badge'],
    hint: texts['challenge.hint'],
  },
  sandbox: {
    title: texts['sandbox.title'],
    subtitle: texts['sandbox.subtitle'],
    myWorkshop: texts['sandbox.myWorkshop'],
    panelTitle: texts['sandbox.panelTitle'],
    close: texts['sandbox.close'],
    save: texts['sandbox.save'],
    saving: texts['sandbox.saving'],
    saved: texts['sandbox.saved'],
    saveError: texts['sandbox.saveError'],
    unsaved: texts['sandbox.unsaved'],
    current: texts['sandbox.current'],
    photo: texts['sandbox.photo'],
    photoBusy: texts['sandbox.photoBusy'],
    photoReady: texts['sandbox.photoReady'],
    photoError: texts['sandbox.photoError'],
    photoSaved: texts['sandbox.photoSaved'],
    photoNotSaved: texts['sandbox.photoNotSaved'],
    photoAlt: texts['sandbox.photoAlt'],
    download: texts['sandbox.download'],
    clear: texts['sandbox.clear'],
    clearTitle: texts['sandbox.clearTitle'],
    clearText: texts['sandbox.clearText'],
    clearYes: texts['sandbox.clearYes'],
    clearNo: texts['sandbox.clearNo'],
    worksTitle: texts['sandbox.worksTitle'],
    noWorks: texts['sandbox.noWorks'],
    worksHint: texts['sandbox.worksHint'],
    worksError: texts['sandbox.worksError'],
    openWork: texts['sandbox.openWork'],
    defaultName: texts['sandbox.defaultName'],
    loading: texts['sandbox.loading'],
  },
  components: {
    battery: {
      label: texts['component.battery.label'],
    },
    bulb: {
      label: texts['component.bulb.label'],
    },
    switch: {
      label: texts['component.switch.label'],
    },
    motor: {
      label: texts['component.motor.label'],
    },
    buzzer: {
      label: texts['component.buzzer.label'],
    },
    led: {
      label: texts['component.led.label'],
    },
    resistor: {
      label: texts['component.resistor.label'],
    },
    rheostat: {
      label: texts['component.rheostat.label'],
    },
    wire: {
      label: texts['component.wire.label'],
    },
    metal: {
      label: texts['component.metal.label'],
    },
    gum: {
      label: texts['component.gum.label'],
    },
  },
  zap: {
    help: texts['zap.help'],
    hide: texts['zap.hide'],
    show: texts['zap.show'],
    hintAria: texts['zap.hintAria'],
    replay: texts['zap.replay'],
    mute: texts['zap.mute'],
    unmute: texts['zap.unmute'],
  },
} as const;
