import { Injectable, signal } from '@angular/core';



import { HERO_DEFINITIONS } from '../data/hero-definitions';

import { HeroId } from '../models/hero';

import { createEmptyPlayerInventory } from '../models/inventory';

import { Player } from '../models/player';

import { Direction } from '../models/tile';



/**

 * Nombre minimal de joueurs participant

 * à une partie dans l'application.

 *

 * RÈGLE DE L'APPLICATION :

 *

 * une partie oppose toujours au minimum

 * deux aventuriers.

 *

 * Par défaut :

 *

 * J1 est humain ;

 * J2 est contrôlé par l'IA.

 */

export const MIN_PLAYER_COUNT = 2;



/**

 * Nombre maximal de joueurs pouvant

 * participer à une partie.

 *

 * RÈGLE OFFICIELLE KARAK :

 *

 * le jeu contient 5 plateaux d'inventaire

 * et chaque joueur doit en recevoir un

 * lors de la préparation.

 */

export const MAX_PLAYER_COUNT = 5;



/**

 * Gère l'état des joueurs pendant une partie.

 *

 * Les joueurs sont créés pendant le SETUP

 * avant que les héros ne leur soient attribués.

 *

 * Le service connaît également le type

 * de contrôleur de chaque joueur :

 *

 * - human : joueur humain ;

 * - ai : joueur contrôlé par l'ordinateur.

 *

 * Cette distinction permettra au moteur

 * de déterminer s'il doit :

 *

 * - attendre une action utilisateur ;

 * - ou déclencher automatiquement

 *   le comportement d'une IA.

 */

@Injectable({

  providedIn: 'root',

})

export class PlayerService {

  // ==========================================================

  // JOUEURS DE LA PARTIE

  // ==========================================================



  /**

   * Joueurs participant à la partie.

   *

   * La liste reste vide tant que

   * la préparation des joueurs

   * n'a pas été effectuée.

   */

  readonly players: Player[] = [];

  /** Notification réactive des changements de points de vie. */
  readonly livesRevision = signal(0);

  /** Applique les dégâts au joueur réel, sans remplacer sa référence. */
  loseLife(player: Player, amount = 1): void {
    if (!this.players.includes(player) || !Number.isFinite(amount) || amount <= 0) return;
    const next = Math.max(0, player.lives - Math.floor(amount));
    if (next === player.lives) return;
    player.lives = next;
    this.livesRevision.update((revision) => revision + 1);
  }




  // ==========================================================

  // JOUEUR TEMPORAIRE DU PROTOTYPE

  // ==========================================================



  /**

   * Joueur actuellement utilisé

   * par le prototype du plateau.

   *

   * TEMPORAIRE :

   *

   * cette propriété permet au Board existant

   * de continuer à fonctionner pendant

   * la mise en place progressive

   * du véritable SETUP.

   *

   * Elle sera supprimée lorsque le Board

   * utilisera le joueur actif déterminé

   * par le moteur de partie.

   *

   * Le joueur temporaire représente

   * un joueur humain.

   */

  readonly player: Player = {

    controller: 'human',

    lives: 5,

    inventory: createEmptyPlayerInventory(),

    heroId: 'argentus',



    position: {

      x: 0,

      y: 0,

    },



    facing: 'south',

  };



  // ==========================================================

  // INITIALISATION

  // ==========================================================



  /**

   * Prépare les joueurs pour une nouvelle partie.

   *

   * RÈGLE OFFICIELLE KARAK :

   *

   * chaque joueur commence avec

   * 5 points de vie.

   *

   * À cette étape, aucun héros

   * n'est encore attribué :

   *

   * leur tirage appartient à l'étape

   * suivante du SETUP.

   *

   * RÈGLE DE L'APPLICATION :

   *

   * une partie possède au minimum

   * deux participants.

   *

   * J1 est toujours humain.

   *

   * Tous les autres participants

   * sont contrôlés par l'IA par défaut.

   *

   * Lorsque plusieurs personnes jouent

   * sur le même appareil, les joueurs humains

   * supplémentaires occupent les premières

   * positions disponibles.

   *

   * Exemple par défaut :

   *

   * initialize(2)

   *

   * J1 humain

   * J2 IA

   *

   * Exemple :

   *

   * initialize(5)

   *

   * J1 humain

   * J2 IA

   * J3 IA

   * J4 IA

   * J5 IA

   *

   * Exemple multijoueur local :

   *

   * initialize(5, 3)

   *

   * J1 humain

   * J2 humain

   * J3 humain

   * J4 IA

   * J5 IA

   */

  initialize(playerCount: number, humanPlayerCount = 1): void {

    /**

     * Le nombre total de joueurs

     * doit être un entier.

     */

    if (!Number.isInteger(playerCount)) {

      return;

    }



    /**

     * Le nombre total de participants

     * doit respecter les limites

     * de l'application.

     */

    if (playerCount < MIN_PLAYER_COUNT || playerCount > MAX_PLAYER_COUNT) {

      return;

    }



    /**

     * Le nombre de joueurs humains

     * doit également être un entier.

     */

    if (!Number.isInteger(humanPlayerCount)) {

      return;

    }



    /**

     * Il doit toujours exister

     * au moins un humain.

     *

     * Le nombre d'humains ne peut évidemment

     * pas dépasser le nombre total

     * de participants.

     */

    if (humanPlayerCount < 1 || humanPlayerCount > playerCount) {

      return;

    }



    /**

     * Une nouvelle initialisation remplace

     * complètement la composition précédente.

     */

    this.players.length = 0;
    this.livesRevision.update((revision) => revision + 1);



    /**

     * Les humains occupent toujours

     * les premières positions.

     *

     * Exemple avec humanPlayerCount = 2 :

     *

     * index 0 → J1 humain

     * index 1 → J2 humain

     * index 2+ → IA

     */

    for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {

      this.players.push({

        controller: playerIndex < humanPlayerCount ? 'human' : 'ai',



        lives: 5,



        inventory: createEmptyPlayerInventory(),

      });

    }

  }



  // ==========================================================

  // DÉPLACEMENT TEMPORAIRE

  // ==========================================================



  /**

   * Déplace le joueur utilisé actuellement

   * par le prototype du plateau.

   *

   * TEMPORAIRE :

   *

   * cette méthode sera remplacée lorsque Board

   * utilisera le joueur actif déterminé

   * par le moteur de partie.

   */

  moveTo(x: number, y: number, direction: Direction): void {

    this.player.position = {

      x,

      y,

    };



    this.player.facing = direction;

  }



  /**

   * Modifie uniquement l'orientation

   * graphique du pion.

   *

   * CHOIX D'IMPLÉMENTATION :

   *

   * cette orientation sert uniquement

   * à la représentation visuelle du héros

   * et n'a aucune incidence

   * sur les règles du jeu.

   */

  face(direction: Direction): void {

    this.player.facing = direction;

  }



  // ==========================================================

  // DÉPLACEMENT DES JOUEURS RÉELS

  // ==========================================================



  /**

   * Déplace un joueur réel de la partie vers une nouvelle

   * position du donjon.

   *

   * IMPORTANT :

   *

   * Cette méthode modifie un joueur appartenant à \`players\`.

   * Elle ne concerne donc pas l'ancien joueur temporaire

   * \`player\`, conservé provisoirement pour compatibilité.

   *

   * La validation du déplacement n'appartient pas à ce service :

   *

   * - DungeonService vérifie les connexions entre les tuiles ;

   * - ExplorationService gère les nouvelles tuiles ;

   * - TurnService gère les mouvements disponibles.

   *

   * PlayerService applique uniquement la nouvelle position

   * et l'orientation graphique du héros.

   */

  movePlayerTo(player: Player, x: number, y: number, direction: Direction): void {

    if (!this.players.includes(player)) {

      return;

    }



    player.position = {

      x,

      y,

    };



    player.facing = direction;

  }



  /**

   * Modifie uniquement l'orientation graphique

   * d'un joueur réel de la partie.

   *

   * L'orientation n'a aucune incidence sur les règles

   * de déplacement : elle sert uniquement au rendu du pion.

   */

  facePlayer(player: Player, direction: Direction): void {

    if (!this.players.includes(player)) {

      return;

    }



    player.facing = direction;

  }



  // ==========================================================

  // TIRAGE DES HÉROS

  // ==========================================================



  /**

   * Attribue aléatoirement

   * un héros différent à chaque joueur.

   *

   * RÈGLE OFFICIELLE KARAK :

   *

   * les 6 cartes Héros sont mélangées

   * face cachée, puis chaque joueur

   * en pioche une.

   *

   * Les héros ne peuvent donc pas

   * être attribués deux fois

   * au cours d'une même partie.

   *

   * Le type de contrôleur du joueur

   * n'a aucune incidence sur le tirage :

   *

   * humains et IA reçoivent leur héros

   * selon exactement les mêmes règles.

   */

  drawHeroes(): void {

    const heroIds: HeroId[] = HERO_DEFINITIONS.map((hero) => hero.id);



    /**

     * Mélange de Fisher-Yates.

     *

     * Chaque héros possède ainsi

     * la même probabilité d'occuper

     * chacune des positions du paquet.

     */

    for (let i = heroIds.length - 1; i > 0; i--) {

      const randomIndex = Math.floor(Math.random() * (i + 1));



      [heroIds[i], heroIds[randomIndex]] = [heroIds[randomIndex], heroIds[i]];

    }



    /**

     * Une carte différente est attribuée

     * à chacun des participants.

     */

    this.players.forEach((player, index) => {

      player.heroId = heroIds[index];

    });

  }



  // ==========================================================

  // PLACEMENT INITIAL

  // ==========================================================



  /**

   * Place tous les héros

   * sur la tuile Départ.

   *

   * RÈGLE OFFICIELLE KARAK :

   *

   * après avoir reçu leur héros,

   * les joueurs prennent le pion

   * correspondant et le placent

   * sur la tuile Départ.

   *

   * CHOIX D'IMPLÉMENTATION :

   *

   * la tuile Départ occupe

   * les coordonnées (0, 0)

   * dans notre représentation

   * du donjon.

   *

   * L'orientation initiale vers le sud

   * est uniquement graphique

   * et n'a aucune incidence

   * sur les règles.

   */

  placeHeroesOnStart(): void {

    this.players.forEach((player) => {

      player.position = {

        x: 0,

        y: 0,

      };



      player.facing = 'south';

    });

  }

}
