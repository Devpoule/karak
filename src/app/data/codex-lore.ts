/**
 * Contenu narratif du Codex.
 *
 * Sources : livret officiel Karak, pages 1, 5 et 6.
 * Les transitions sont rédactionnelles ; les faits narratifs sont
 * uniquement ceux présents dans les pages de référence locales.
 */
export interface CodexLoreSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
}

export const CODEX_LORE: readonly CodexLoreSection[] = [
  {
    id: 'lore-introduction',
    title: 'Sous les ruines de Karak',
    paragraphs: [
      'Au-dessus d’un désert aride s’élève la silhouette sombre du château de Karak. Sous ses murs en ruines s’étendent des catacombes abandonnées depuis longtemps, mais le château est loin d’être vide.',
      'Dans les profondeurs, un labyrinthe de couloirs abrite des créatures qui gardent les richesses oubliées. Les aventuriers qui osent y entrer découvrent bientôt que chaque détour peut mener à un trésor… ou à une menace.',
    ],
  },
  {
    id: 'lore-adventurers',
    title: 'Six destins convergents',
    paragraphs: [
      'Six héros pénètrent dans les souterrains de Karak, chacun guidé par une histoire et une ambition différentes. Aderyn cherche les moyens de venger son père ; Argentus veut comprendre le pouvoir caché sous le château ; Horan espère inscrire son nom dans une dernière grande conquête.',
      'Taia veut mettre fin aux souffrances de son peuple, Victorius convoite le rubis du dragon pour sa reine, et Xanros poursuit le pouvoir et l’immortalité. Malgré leurs motivations opposées, tous doivent affronter les mêmes profondeurs.',
    ],
  },
  {
    id: 'lore-threats',
    title: 'Les gardiens des profondeurs',
    paragraphs: [
      'Rats, araignées géantes, squelettes, momies et autres morts hantent les couloirs. Certains protègent des clés, des équipements ou des trésors ; d’autres semblent conserver une richesse qu’ils ne peuvent plus abandonner.',
      'Au cœur de ces légendes se trouve le Dragon. Certains disent avoir aperçu son ombre au-dessus du château, mais nul ne peut décrire précisément son apparence. Sa présence empoisonne les terres autour de Karak et menace tous ceux qui cherchent à atteindre ses richesses.',
    ],
  },
];
