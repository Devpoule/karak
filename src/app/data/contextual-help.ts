/** Référence documentaire utilisée par une aide contextuelle. */
export interface ContextualHelp {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly codexFragment: string;
  readonly category: 'preparation';
}

/** Textes courts dérivés des sections détaillées du Codex. */
export interface PreparationHelp {
  readonly players: ContextualHelp;
  readonly heroes: ContextualHelp;
  readonly firstPlayer: ContextualHelp;
  readonly adventure: ContextualHelp;
}

export const PREPARATION_HELP: PreparationHelp = {
  players: {
    id: 'help-preparation-players',
    title: 'Choisir les joueurs',
    summary: 'Sélectionnez le nombre d’aventuriers qui participeront à la partie. Le premier joueur sera humain ; les autres peuvent être confiés à l’IA ou à des joueurs locaux.',
    codexFragment: 'rules-preparation',
    category: 'preparation',
  },
  heroes: {
    id: 'help-preparation-heroes',
    title: 'Tirer les héros',
    summary: 'Les héros sont attribués aux aventuriers avant l’entrée dans les catacombes. Chacun possède deux pouvoirs particuliers, consultables dans le Codex.',
    codexFragment: 'rules-powers',
    category: 'preparation',
  },
  firstPlayer: {
    id: 'help-preparation-first-player',
    title: 'Désigner le premier joueur',
    summary: 'Les aventuriers lancent les dés à tour de rôle. Le total le plus élevé désigne le premier joueur ; en cas d’égalité, les joueurs concernés relancent.',
    codexFragment: 'rules-turns',
    category: 'preparation',
  },
  adventure: {
    id: 'help-preparation-adventure',
    title: 'Entrer dans le donjon',
    summary: 'Une fois le premier joueur désigné, entrez dans les catacombes pour explorer le labyrinthe, affronter ses créatures et rechercher les trésors.',
    codexFragment: 'rules-exploration',
    category: 'preparation',
  },
};
