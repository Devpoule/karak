/** Section documentaire consultable rapidement depuis le Codex. */
export interface CodexRuleSection { readonly id?: string; readonly title: string; readonly official: string; readonly complement?: string; }

/** Synthèse issue du livret officiel, complétée par les états actuellement implémentés. */
export const CODEX_RULE_SECTIONS: readonly CodexRuleSection[] = [
  { id: 'rules-objective', title: 'Présentation et objectif', official: 'Karak est un jeu d’aventures où les héros explorent les catacombes, affrontent des monstres et découvrent des trésors. La partie s’achève lorsqu’un héros vainc le Dragon ; le vainqueur est le joueur qui possède le plus de points de trésor.', complement: 'Le Codex présente les règles documentaires ; le moteur reste la source de vérité pour l’état courant de la partie.' },
  { id: 'rules-preparation', title: 'Préparation', official: 'Placez la tuile de départ, mélangez les tuiles et préparez le sachet. Chaque joueur reçoit un plateau d’inventaire, cinq points de vie et un héros tiré au sort.' },
  { id: 'rules-turns', title: 'Tours et déplacements', official: 'Les joueurs jouent à tour de rôle et disposent de quatre déplacements. Un déplacement permet de rejoindre une tuile accessible ; l’exploration, un combat, un soin ou la collecte d’un objet terminent le tour.' },
  { id: 'rules-exploration', title: 'Exploration', official: 'Lorsqu’un héros entre dans un secteur inexploré, une tuile est piochée et ajoutée au plan. Dans une pièce nouvellement découverte, piochez un jeton de monstre ou de trésor.' },
  { title: 'Rencontres et combats', official: 'Lancez les deux dés et ajoutez la force de l’équipement ainsi que les bonus applicables. Pour vaincre un monstre, la force totale d’attaque doit être supérieure à sa force. Une égalité est un match nul.' },
  { title: 'Équipements, armes et sorts', official: 'Les monstres vaincus peuvent fournir des armes, des tours de magie ou une clé. Les armes ajoutent leur valeur aux dés ; les tours de magie sont utilisables après le lancer selon leur effet.' },
  { title: 'Clés, coffres et trésors', official: 'Une clé permet d’ouvrir un coffre situé sur la même tuile. Un coffre ouvert rapporte un trésor. Les trésors classiques valent un point ; le trésor avec rubis obtenu en vainquant le Dragon vaut un point et demi.' },
  { title: 'Points de vie et guérison', official: 'Après un combat perdu, retournez un point de vie. Quand le dernier point est perdu, le héros perd connaissance et récupère lors du tour suivant ; une fontaine d’eau curative soigne complètement le héros.' },
  { title: 'Malédiction de Karak', official: 'Vaincre une Momie permet de transmettre le jeton de malédiction à un autre joueur. Le joueur maudit ne peut pas utiliser les pouvoirs de son héros jusqu’à la guérison complète.' },
  { id: 'rules-powers', title: 'Pouvoirs des héros', official: 'Chaque héros possède deux pouvoirs propres. Leurs descriptions sont consultables dans la rubrique Héros ; leur disponibilité dépend de l’état du héros et de la partie.' },
  { title: 'Fin de partie', official: 'La partie prend fin lorsqu’un héros terrasse le Dragon. Le joueur qui a accumulé la plus grande valeur de trésors remporte la partie.' },
];
