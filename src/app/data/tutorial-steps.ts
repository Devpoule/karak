export interface TutorialStep {
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly tips: readonly string[];
}

/** Parcours d'introduction consultatif, sans mutation de l'état d'une partie. */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    eyebrow: 'Étape 1 sur 5',
    title: 'Préparez votre aventure',
    summary: 'Choisissez le nombre de joueurs, puis attribuez un héros à chacun avant d’entrer dans le donjon.',
    tips: [
      'Chaque héros possède ses propres forces et pouvoirs.',
      'Le Codex reste disponible pour consulter l’univers et les capacités.',
    ],
  },
  {
    eyebrow: 'Étape 2 sur 5',
    title: 'Explorez les catacombes',
    summary: 'Déplacez votre héros dans le donjon et révélez de nouvelles salles au fil de votre exploration.',
    tips: [
      'Le compteur de mouvements vous indique les déplacements encore possibles.',
      'Observez le plateau et les panneaux du joueur actif pour garder le cap.',
    ],
  },
  {
    eyebrow: 'Étape 3 sur 5',
    title: 'Affrontez les monstres',
    summary: 'Lorsqu’un combat commence, lancez les dés et prenez les décisions proposées par votre héros.',
    tips: [
      'Les armes et les pouvoirs peuvent modifier vos choix pendant un combat.',
      'Les décisions obligatoires restent prioritaires sur les actions facultatives.',
    ],
  },
  {
    eyebrow: 'Étape 4 sur 5',
    title: 'Rassemblez les trésors',
    summary: 'Explorez les salles et résolvez leurs effets pour enrichir votre inventaire et votre score.',
    tips: [
      'Les trésors sont affichés dans le panneau dédié de votre héros.',
      'Les malédictions et les équipements font partie des choix à surveiller.',
    ],
  },
  {
    eyebrow: 'Étape 5 sur 5',
    title: 'Vainquez le Dragon',
    summary: 'La partie s’achève lorsque le Dragon est vaincu : le classement final départage alors les héros.',
    tips: [
      'Le score final est calculé à partir des trésors collectés.',
      'Vous pouvez rouvrir ce tutoriel à tout moment depuis l’en-tête.',
    ],
  },
];
