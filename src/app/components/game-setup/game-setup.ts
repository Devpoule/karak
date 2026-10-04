import { Component, signal } from '@angular/core';

import {
  getHeroDefinition,
  HERO_CARD_BACK,
  HERO_DEFINITIONS,
} from '../../data/hero-definitions';
import { GameService } from '../../services/game.service';
import { MAX_PLAYER_COUNT } from '../../services/player.service';

/**
 * États visuels du tirage des héros.
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * - hidden   : les cartes sont encore face cachée ;
 * - drawing  : le tirage est en cours de mise en scène ;
 * - revealed : les héros attribués sont définitivement révélés.
 *
 * Cet état concerne uniquement la présentation du tirage.
 * L'attribution réelle des héros reste gérée par le moteur.
 */
type HeroDrawState =
  | 'hidden'
  | 'drawing'
  | 'revealed';

@Component({
  selector: 'app-game-setup',
  imports: [],
  templateUrl: './game-setup.html',
  styleUrl: './game-setup.scss',
})
export class GameSetup {
  /**
   * Nombres de joueurs proposés par l'interface.
   *
   * Le maximum correspond aux 5 plateaux d'inventaire
   * disponibles dans le jeu.
   */
  readonly playerCounts = Array.from(
    { length: MAX_PLAYER_COUNT },
    (_, index) => index + 1,
  );

  /**
   * Nombre de joueurs actuellement sélectionné.
   *
   * Aucune valeur n'est présélectionnée afin que le joueur
   * effectue explicitement son choix.
   */
  selectedPlayerCount: number | null = null;

  /**
   * Ressource graphique utilisée pour représenter
   * une carte Héros encore face cachée.
   */
  readonly heroCardBack = HERO_CARD_BACK;

  /**
   * État visuel actuel du tirage des héros.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * un signal est utilisé afin que les changements produits
   * pendant l'animation soient immédiatement répercutés
   * dans le template Angular.
   */
  readonly heroDrawState =
    signal<HeroDrawState>('hidden');

  /**
   * Cartes temporairement affichées pendant l'animation
   * du tirage.
   *
   * Ces cartes n'ont aucune incidence sur le résultat réel :
   * elles servent uniquement à créer l'effet de défilement.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * cette collection est également représentée par un signal
   * afin que chaque étape asynchrone de l'animation soit
   * immédiatement répercutée dans le template.
   */
  readonly drawingHeroCards =
    signal<string[]>([]);

  constructor(
    readonly gameService: GameService,
  ) {}

  /**
   * Sélectionne le nombre de joueurs qui participeront
   * à la partie.
   *
   * Cette action ne prépare pas encore les joueurs :
   * elle représente uniquement le choix effectué dans l'UI.
   */
  selectPlayerCount(playerCount: number): void {
    this.selectedPlayerCount = playerCount;
  }

  /**
   * Confirme le nombre de joueurs sélectionné.
   *
   * GameSetup ne crée pas directement les joueurs :
   * cette responsabilité est déléguée à GameService,
   * qui orchestre la préparation de la partie.
   */
  confirmPlayerCount(): void {
    if (this.selectedPlayerCount === null) {
      return;
    }

    this.gameService.initializePlayers(
      this.selectedPlayerCount,
    );
  }

  /**
   * Effectue le tirage puis anime les cartes avant
   * d'afficher les héros réellement attribués.
   *
   * Le résultat définitif est déterminé immédiatement
   * par le moteur. L'animation est uniquement visuelle.
   */
  drawHeroes(): void {
    if (this.heroDrawState() !== 'hidden') {
      return;
    }

    // Le moteur détermine immédiatement le résultat réel.
    this.gameService.drawHeroes();

    // L'interface entre dans l'état d'animation.
    this.heroDrawState.set('drawing');

    const speeds = [
      70,
      70,
      80,
      90,
      110,
      140,
      180,
      240,
      320,
    ];

    let step = 0;

    const animate = (): void => {
      // Lorsque toutes les étapes ont été jouées,
      // l'animation prend fin et les véritables héros
      // attribués par le moteur sont révélés.
      if (step >= speeds.length) {
        this.drawingHeroCards.set([]);
        this.heroDrawState.set('revealed');

        return;
      }

      // Toutes les cartes affichées pendant une étape
      // sont différentes les unes des autres.
      this.drawingHeroCards.set(
        this.getRandomUniqueHeroCards(),
      );

      const delay = speeds[step];

      step++;

      window.setTimeout(
        animate,
        delay,
      );
    };

    animate();
  }

  /**
   * Poursuit la préparation après la révélation des héros
   * et déclenche leur placement sur la tuile Départ.
   */
  placeHeroesOnStart(): void {
    if (this.heroDrawState() !== 'revealed') {
      return;
    }

    this.gameService.placeHeroesOnStart();
  }

  /**
   * Retourne la carte actuellement visible pour un joueur.
   *
   * - hidden   : dos de carte ;
   * - drawing  : carte temporaire de l'animation ;
   * - revealed : héros réellement attribué.
   */
  getHeroCard(playerIndex: number): string {
    if (this.heroDrawState() === 'hidden') {
      return this.heroCardBack;
    }

    if (this.heroDrawState() === 'drawing') {
      return (
        this.drawingHeroCards()[playerIndex]
        ?? HERO_DEFINITIONS[0].card
      );
    }

    const heroId =
      this.gameService.players[playerIndex]?.heroId;

    if (!heroId) {
      return this.heroCardBack;
    }

    return (
      getHeroDefinition(heroId)?.card
      ?? this.heroCardBack
    );
  }

  /**
   * Produit une combinaison aléatoire de cartes Héros
   * sans doublon.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * cette méthode concerne uniquement l'animation visuelle.
   * Elle reproduit néanmoins la contrainte du tirage réel :
   * un même héros ne peut pas apparaître simultanément
   * pour plusieurs joueurs.
   */
  private getRandomUniqueHeroCards(): string[] {
    const availableCards = HERO_DEFINITIONS.map(
      (hero) => hero.card,
    );

    // Mélange de Fisher-Yates.
    for (
      let i = availableCards.length - 1;
      i > 0;
      i--
    ) {
      const randomIndex = Math.floor(
        Math.random() * (i + 1),
      );

      [
        availableCards[i],
        availableCards[randomIndex],
      ] = [
        availableCards[randomIndex],
        availableCards[i],
      ];
    }

    return availableCards.slice(
      0,
      this.gameService.playerCount,
    );
  }
}
