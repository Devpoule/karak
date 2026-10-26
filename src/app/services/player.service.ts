import { Injectable, signal } from '@angular/core';
import { HERO_DEFINITIONS } from '../data/hero-definitions';
import { HeroId } from '../models/hero';
import { createEmptyPlayerInventory, PLAYER_INVENTORY_CAPACITY } from '../models/inventory';
import { Equipment, EquipmentKind, KeyEquipment, SpellEquipment, WeaponEquipment } from '../models/equipment';
import { Player } from '../models/player';
import { createEmptyTreasures, Treasure } from '../models/treasure';
import { DIRECTIONS, Direction } from '../models/tile';
import { PlayerSaveV2 } from '../models/save';
import { getEquipmentDefinition } from '../data/equipment-definitions';
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
  /** Dernière perte de vie, consommée par les composants d'affichage. */
  readonly lastLifeLoss = signal<{ player: Player; amount: number; revision: number } | null>(null);
  /** Notification réactive des changements d’inventaire. */
  readonly inventoryRevision = signal(0);
  /** Notification réactive des changements de trésors. */
  readonly treasuresRevision = signal(0);
  /** Notification réactive des changements de malédiction. */
  readonly curseRevision = signal(0);
  private configurationRevision = 0;

  /** Version de la dernière configuration valide des participants. */
  get configurationVersion(): number {
    return this.configurationRevision;
  }

  /**
   * Efface l’état joueur d’une partie terminée ou abandonnée.
   *
   * Cette opération est distincte de `initialize`, qui crée une
   * nouvelle composition de joueurs. Elle permet à GameService de
   * remettre l’application dans l’état vierge de l’étape de choix
   * des participants, sans conserver de référence vers un ancien
   * héros dans les signaux d’interface.
   */
  reset(): void {
    this.players.length = 0;
    this.lastLifeLoss.set(null);
    this.livesRevision.update(revision => revision + 1);
    this.inventoryRevision.update(revision => revision + 1);
    this.treasuresRevision.update(revision => revision + 1);
    this.curseRevision.update(revision => revision + 1);
  }

  /** Prépare l'unique héros humain du didacticiel, hors configuration normale. */
  initializeTutorialPlayer(heroId: HeroId): void {
    if (!HERO_DEFINITIONS.some(hero => hero.id === heroId)) return;
    this.players.splice(0, this.players.length, {
      controller: 'human',
      heroId,
      lives: 5,
      recoveryState: 'none',
      isCursed: false,
      inventory: createEmptyPlayerInventory(),
      treasures: createEmptyTreasures(),
      position: { x: 0, y: 0 },
      facing: 'south',
    });
    this.configurationRevision += 1;
    this.lastLifeLoss.set(null);
    this.livesRevision.update(revision => revision + 1);
    this.inventoryRevision.update(revision => revision + 1);
    this.treasuresRevision.update(revision => revision + 1);
    this.curseRevision.update(revision => revision + 1);
  }

  /** Applique ou lève la malédiction sans modifier les autres attributs du héros. */
  setCursed(player: Player, isCursed: boolean): boolean {
    if (!this.players.includes(player) || player.isCursed === isCursed) return false;
    player.isCursed = isCursed;
    this.curseRevision.update(revision => revision + 1);
    return true;
  }
  /** Applique les dégâts au joueur réel, sans remplacer sa référence. */
  loseLife(player: Player, amount = 1): void {
    if (!this.players.includes(player) || !Number.isFinite(amount) || amount <= 0) return;
    const previous = player.lives;
    const next = Math.max(0, previous - Math.floor(amount));
    if (next === player.lives) return;
    player.lives = next;
    if (next === 0) player.recoveryState = 'pending';
    this.livesRevision.update((revision) => revision + 1);
    this.lastLifeLoss.set({
      player,
      amount: previous - next,
      revision: this.livesRevision(),
    });
  }

  /** Commence le tour obligatoire de récupération et soigne exactement une vie. */
  beginRecoveryTurn(player: Player): boolean {
    if (!this.players.includes(player) || player.recoveryState !== 'pending' || player.lives !== 0) return false;
    player.lives = 1;
    player.recoveryState = 'resting';
    this.livesRevision.update(revision => revision + 1);
    return true;
  }

  /** Libère le héros après son tour entièrement consacré à la récupération. */
  completeRecoveryTurn(player: Player): boolean {
    if (!this.players.includes(player) || player.recoveryState !== 'resting') return false;
    player.recoveryState = 'none';
    return true;
  }

  /** Restaure complètement un héros et lève son éventuelle malédiction. */
  restoreCompletely(player: Player, maximumLives: number): boolean {
    if (!this.players.includes(player) || !Number.isInteger(maximumLives) || maximumLives <= 0) return false;
    const changed = player.lives !== maximumLives || player.isCursed || player.recoveryState !== 'none';
    if (!changed) return false;
    player.lives = maximumLives;
    player.isCursed = false;
    player.recoveryState = 'none';
    this.livesRevision.update(revision => revision + 1);
    this.curseRevision.update(revision => revision + 1);
    return true;
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
    recoveryState: 'none',
    isCursed: false,
    inventory: createEmptyPlayerInventory(),
    treasures: createEmptyTreasures(),
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
     * Zéro humain est autorisé pour le mode simulation IA contre IA.
     * Le nombre d'humains ne peut évidemment pas dépasser le nombre
     * total de participants.
     */
    if (humanPlayerCount < 0 || humanPlayerCount > playerCount) {
      return;
    }
    /**
     * Une nouvelle initialisation remplace
     * complètement la composition précédente.
     */
    this.players.length = 0;
    this.configurationRevision += 1;
    this.livesRevision.update((revision) => revision + 1);
    this.curseRevision.update(revision => revision + 1);
    this.treasuresRevision.update(revision => revision + 1);
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
        recoveryState: 'none',
        isCursed: false,
        inventory: createEmptyPlayerInventory(),
        treasures: createEmptyTreasures(),
      });
    }
  }

  /** Reconstruit les joueurs persistés en conservant leur ordre. */
  restore(players: readonly PlayerSaveV2[]): boolean {
    const restored = players.map((saved) => {
      const player: Player = {
        controller: saved.controller,
        lives: saved.lives,
        recoveryState: saved.recoveryState,
        isCursed: saved.isCursed,
        inventory: createEmptyPlayerInventory(),
        treasures: saved.treasures
          .map((treasure) => this.restoreTreasure(treasure))
          .filter((treasure): treasure is Treasure => treasure !== null),
      };
      if (saved.heroId) player.heroId = saved.heroId as HeroId;
      if (saved.position) {
        player.position = { ...saved.position };
        player.facing = DIRECTIONS.includes(saved.facing as Direction)
          ? saved.facing as Direction
          : 'south';
      }
      const savedWeapons = Array.isArray(saved.inventory['weapons']) ? saved.inventory['weapons'] : [];
      const savedSpells = Array.isArray(saved.inventory['spells']) ? saved.inventory['spells'] : [];
      player.inventory.weapons = Array.from({ length: 2 }, (_, index) => this.restoreEquipment(savedWeapons[index], 'weapon'));
      player.inventory.spells = Array.from({ length: 3 }, (_, index) => this.restoreEquipment(savedSpells[index], 'spell'));
      player.inventory.key = this.restoreEquipment(saved.inventory['key'], 'key');
      return player;
    });
    if (restored.some((player) => player.lives < 0 || player.lives > 5 || player.inventory.weapons.length !== 2 || player.inventory.spells.length !== 3)) return false;
    this.players.splice(0, this.players.length, ...restored);
    this.configurationRevision += 1;
    this.livesRevision.update((revision) => revision + 1);
    this.inventoryRevision.update((revision) => revision + 1);
    this.treasuresRevision.update((revision) => revision + 1);
    this.curseRevision.update((revision) => revision + 1);
    return true;
  }

  /** Résout un équipement sauvegardé vers sa définition immuable du catalogue. */
  private restoreEquipment(value: unknown, kind: 'weapon'): WeaponEquipment | null;
  private restoreEquipment(value: unknown, kind: 'spell'): SpellEquipment | null;
  private restoreEquipment(value: unknown, kind: 'key'): KeyEquipment | null;
  private restoreEquipment(value: unknown, kind: EquipmentKind): Equipment | null {
    if (value === null || value === undefined) return null;
    const id = typeof value === 'string'
      ? value
      : typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)['id']
        : undefined;
    if (typeof id !== 'string') return null;
    const equipment = getEquipmentDefinition(id);
    return equipment?.kind === kind ? equipment : null;
  }

  /** Résout un trésor persisté vers l'un des identifiants métier autorisés. */
  private restoreTreasure(value: unknown): Treasure | null {
    const id = typeof value === 'string'
      ? value
      : typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)['id']
        : undefined;
    return id === 'opened-chest' || id === 'monster-treasure' || id === 'dragon-ruby' ? id : null;
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
   * Cette méthode modifie un joueur appartenant à \\\\`players\\\\`.
   * Elle ne concerne donc pas l'ancien joueur temporaire
   * \\\\`player\\\\`, conservé provisoirement pour compatibilité.
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
  // ==========================================================
  // INVENTAIRE DES JOUEURS
  // ==========================================================
  /**
   * Ajoute un trésor au joueur s'il appartient à la partie courante.
   *
   * Les doublons restent autorisés : plusieurs trésors identiques
   * correspondent à plusieurs récompenses effectivement collectées.
   */
  addTreasure(player: Player, treasure: Treasure): boolean {
    if (!this.players.includes(player)) return false;
    player.treasures.push(treasure);
    this.treasuresRevision.update(revision => revision + 1);
    return true;
  }
  /** Renvoie les emplacements correspondant au type d'équipement. */
  private getEquipmentSlots(player: Player, kind: 'weapon' | 'spell') {
    return kind === 'weapon'
      ? player.inventory.weapons
      : player.inventory.spells;
  }
  /** Indique si un équipement peut être ajouté sans remplacement. */
  canAddEquipment(player: Player, equipment: Equipment): boolean {
    if (!this.players.includes(player)) return false;
    if (equipment.kind === 'key') {
      return player.inventory.key === null;
    }
    return this.getEquipmentSlots(player, equipment.kind)
      .some((item) => item === null);
  }

  /**
   * Indique si un équipement peut légalement remplacer un objet existant.
   *
   * La validation porte sur le slot ciblé : une arme entrante doit
   * strictement améliorer l'arme de ce slot. Un doublon présent dans un
   * autre slot ne bloque pas cette amélioration.
   */
  canReplaceEquipment(player: Player, equipment: Equipment, slotIndex: number): boolean {
    if (!this.players.includes(player) || this.canAddEquipment(player, equipment)
      || !Number.isInteger(slotIndex)) return false;

    if (equipment.kind === 'key') {
      return slotIndex === 0
        && player.inventory.key !== null
        && player.inventory.key.id !== equipment.id;
    }

    const slots = this.getEquipmentSlots(player, equipment.kind);
    const current = slots[slotIndex];
    if (!current) return false;

    if (equipment.kind === 'weapon') {
      return current.kind === 'weapon' && equipment.attackBonus > current.attackBonus;
    }

    return current.kind === 'spell' && current.id !== equipment.id;
  }
  /**
   * Place un équipement dans le premier emplacement libre.
   * Ne remplace jamais implicitement un objet déjà possédé.
   */
  addEquipment(player: Player, equipment: Equipment): boolean {
    if (!this.canAddEquipment(player, equipment)) return false;
    if (equipment.kind === 'key') {
      player.inventory.key = equipment;
    } else if (equipment.kind === 'weapon') {
      const index = player.inventory.weapons.findIndex((item) => item === null);
      if (index < 0 || index >= PLAYER_INVENTORY_CAPACITY.weapons) return false;
      player.inventory.weapons[index] = equipment;
    } else {
      const index = player.inventory.spells.findIndex((item) => item === null);
      if (index < 0 || index >= PLAYER_INVENTORY_CAPACITY.spells) return false;
      player.inventory.spells[index] = equipment;
    }
    this.inventoryRevision.update((revision) => revision + 1);
    return true;
  }
  /**
   * Remplace explicitement un emplacement du type approprié.
   * Retourne l'ancien équipement, ou null si l'emplacement était vide.
   * undefined indique une opération invalide.
   */
  replaceEquipment(
    player: Player,
    equipment: Equipment,
    slotIndex: number,
  ): Equipment | null | undefined {
    if (!this.players.includes(player) || !Number.isInteger(slotIndex)) {
      return undefined;
    }
    if (equipment.kind === 'key') {
      if (slotIndex !== 0) return undefined;
      const previous = player.inventory.key;
      player.inventory.key = equipment;
      this.inventoryRevision.update((revision) => revision + 1);
      return previous;
    }
    if (equipment.kind === 'weapon') {
      if (slotIndex < 0 || slotIndex >= PLAYER_INVENTORY_CAPACITY.weapons) return undefined;
      const previous = player.inventory.weapons[slotIndex];
      player.inventory.weapons[slotIndex] = equipment;
      this.inventoryRevision.update((revision) => revision + 1);
      return previous;
    }
    if (slotIndex < 0 || slotIndex >= PLAYER_INVENTORY_CAPACITY.spells) return undefined;
    const previous = player.inventory.spells[slotIndex];
    player.inventory.spells[slotIndex] = equipment;
    this.inventoryRevision.update((revision) => revision + 1);
    return previous;
  }
  /** Retire un équipement d'un emplacement précis, sans décaler les autres. */
  removeEquipment(
    player: Player,
    kind: EquipmentKind,
    slotIndex: number,
  ): Equipment | null | undefined {
    if (!this.players.includes(player) || !Number.isInteger(slotIndex)) {
      return undefined;
    }
    if (kind === 'key') {
      if (slotIndex !== 0) return undefined;
      const previous = player.inventory.key;
      if (previous === null) return null;
      player.inventory.key = null;
      this.inventoryRevision.update((revision) => revision + 1);
      return previous;
    }
    if (kind === 'weapon') {
      if (slotIndex < 0 || slotIndex >= PLAYER_INVENTORY_CAPACITY.weapons) return undefined;
      const previous = player.inventory.weapons[slotIndex];
      if (previous === null) return null;
      player.inventory.weapons[slotIndex] = null;
      this.inventoryRevision.update((revision) => revision + 1);
      return previous;
    }
    if (slotIndex < 0 || slotIndex >= PLAYER_INVENTORY_CAPACITY.spells) return undefined;
    const previous = player.inventory.spells[slotIndex];
    if (previous === null) return null;
    player.inventory.spells[slotIndex] = null;
    this.inventoryRevision.update((revision) => revision + 1);
    return previous;
  }
}
