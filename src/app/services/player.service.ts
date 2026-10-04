import { Injectable } from '@angular/core';

import { Player } from '../models/player';
import { Direction } from '../models/tile';
import { HERO_DEFINITIONS } from '../data/hero-definitions';
import { HeroId } from '../models/hero';

/**
 * Nombre maximal de joueurs pouvant participer à une partie.
 *
 * RÈGLE OFFICIELLE KARAK :
 *
 * le jeu contient 5 plateaux d'inventaire et chaque joueur
 * doit en recevoir un lors de la préparation.
 */
export const MAX_PLAYER_COUNT = 5;

/**
 * Gère l'état des joueurs pendant une partie.
 *
 * Les joueurs sont créés pendant le SETUP avant que les héros
 * ne leur soient attribués.
 *
 * Le service sera enrichi progressivement lorsque les étapes
 * suivantes de la préparation et du jeu seront introduites.
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
   * La liste reste vide tant que la préparation des joueurs
   * n'a pas été effectuée.
   */
  readonly players: Player[] = [];

  // ==========================================================
  // JOUEUR TEMPORAIRE DU PROTOTYPE
  // ==========================================================

  /**
   * Joueur actuellement utilisé par le prototype du plateau.
   *
   * TEMPORAIRE :
   *
   * cette propriété permet au Board existant de continuer
   * à fonctionner pendant la mise en place progressive
   * du véritable SETUP.
   *
   * Elle sera supprimée lorsque le Board utilisera le joueur
   * actif déterminé par le moteur de partie.
   */
  readonly player: Player = {
    lives: 5,
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
   * chaque joueur commence avec 5 points de vie.
   *
   * À cette étape, aucun héros n'est encore attribué :
   * leur tirage appartient à l'étape suivante du SETUP.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * le nombre de joueurs doit être un entier positif et ne
   * peut pas dépasser les 5 plateaux d'inventaire disponibles.
   */
  initialize(playerCount: number): void {
    if (!Number.isInteger(playerCount)) {
      return;
    }

    if (playerCount < 1 || playerCount > MAX_PLAYER_COUNT) {
      return;
    }

    this.players.length = 0;

    for (let i = 0; i < playerCount; i++) {
      this.players.push({
        lives: 5,
      });
    }
  }

  // ==========================================================
  // DÉPLACEMENT TEMPORAIRE
  // ==========================================================

  /**
   * Déplace le joueur utilisé actuellement par le prototype
   * du plateau.
   *
   * TEMPORAIRE :
   *
   * cette méthode sera remplacée lorsque Board utilisera
   * le joueur actif déterminé par le moteur de partie.
   */
  moveTo(x: number, y: number, direction: Direction): void {
    this.player.position = { x, y };
    this.player.facing = direction;
  }

  /**
   * Modifie uniquement l'orientation graphique du pion.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * cette orientation sert à la représentation visuelle du héros
   * et n'a aucune incidence sur les règles du jeu.
   */
  face(direction: Direction): void {
    this.player.facing = direction;
  }

  /**
   * Attribue aléatoirement un héros différent à chaque joueur.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * les 6 cartes Héros sont mélangées face cachée,
   * puis chaque joueur en pioche une.
   *
   * Les héros ne peuvent donc pas être attribués deux fois
   * au cours d'une même partie.
   */
  drawHeroes(): void {
    const heroIds: HeroId[] = HERO_DEFINITIONS.map((hero) => hero.id);

    // Mélange de Fisher-Yates :
    // chaque héros possède ainsi la même probabilité
    // d'occuper chacune des positions du paquet.
    for (let i = heroIds.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));

      [heroIds[i], heroIds[randomIndex]] = [heroIds[randomIndex], heroIds[i]];
    }

    this.players.forEach((player, index) => {
      player.heroId = heroIds[index];
    });
  }

  /**
   * Place tous les héros sur la tuile Départ.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * après avoir reçu leur héros, les joueurs prennent
   * le pion correspondant et le placent sur la tuile Départ.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * la tuile Départ occupe les coordonnées (0, 0)
   * dans notre représentation du donjon.
   *
   * L'orientation initiale vers le sud est uniquement
   * graphique et n'a aucune incidence sur les règles.
   */
  placeHeroesOnStart(): void {
    this.players.forEach((player) => {
      player.position = { x: 0, y: 0 };
      player.facing = 'south';
    });
  }
}
