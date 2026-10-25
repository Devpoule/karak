import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { getEquipmentDefinition } from '../../data/equipment-definitions';
import { getTokenDefinition } from '../../data/token-definitions';
import { PlacedTile } from '../../models/tile';
import { Board } from './board';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';
import { DungeonService } from '../../services/dungeon.service';
import { ExplorationService } from '../../services/exploration.service';
import { TileDeckService } from '../../services/tile-deck.service';
import { TurnService } from '../../services/turn.service';

describe('Board affichage des récompenses et équipements au sol', () => {
  function createBoard() {
    TestBed.configureTestingModule({
      imports: [Board],
      providers: [GameService, PlayerService],
    });
    const fixture = TestBed.createComponent(Board);
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    return { fixture, gameService, playerService, dungeonService };
  }

  it('ne duplique pas l’annonce de Substitution pour un joueur humain', () => {
    const { fixture, gameService, playerService } = createBoard();
    const player = playerService.players[0];
    player.heroId = 'xanros';
    player.controller = 'human';

    gameService.lastXanrosSubstitutionPlayer.set(player);
    gameService.xanrosSubstitutionRevision.update(revision => revision + 1);
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(fixture.componentInstance.powerAnnouncement()).toBeNull();
  });

  it('conserve le verso tant qu’une récompense du jeton est en attente', () => {
    const { fixture, gameService, playerService, dungeonService } = createBoard();
    const player = playerService.players[0];
    const tile = dungeonService.getTileAt(0, 0)!;
    tile.tokenId = 'giant-rat';
    tile.tokenFace = 'back';
    gameService.pendingReward.set({
      player,
      monster: getTokenDefinition('giant-rat') as any,
      rewardTile: tile,
      sourceTile: { x: -1, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'daggers' }],
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.getTileTokenImage(tile))
      .toBe(getEquipmentDefinition('daggers')?.image);
    expect(fixture.nativeElement.querySelectorAll('.board__token')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.board__ground-item img')).toHaveLength(0);
  });

  it('expose le nom du monstre ou l’état du coffre sur le jeton révélé', () => {
    const { fixture, dungeonService } = createBoard();
    const tile = dungeonService.getTileAt(0, 0)!;
    tile.tokenId = 'giant-rat';
    tile.tokenFace = 'front';
    expect(fixture.componentInstance.getTileTokenAlt(tile)).toBe('Le Rat Géant');
    tile.tokenId = 'closed-chest';
    expect(fixture.componentInstance.getTileTokenAlt(tile)).toBe('Coffre fermé');
  });

  it('rend une seule fois l’équipement déposé après résolution complète du verso', () => {
    const { fixture, gameService, playerService, dungeonService } = createBoard();
    const player = playerService.players[0];
    player.controller = 'ai';
    const tile = dungeonService.getTileAt(0, 0)!;
    tile.tokenId = 'giant-rat';
    tile.tokenFace = 'back';
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, { ...getEquipmentDefinition('sword')! });
    gameService.pendingReward.set({
      player,
      monster: getTokenDefinition('giant-rat') as any,
      rewardTile: tile,
      sourceTile: { x: -1, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'daggers' }],
    });

    expect(gameService.resolvePendingRewardEquipment()).toBe(true);
    fixture.detectChanges();

    expect(gameService.getRemainingMonsterRewards(tile)).toEqual([]);
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['daggers']);
    expect(fixture.componentInstance.getTileTokenImage(tile)).toBeUndefined();
    expect(fixture.nativeElement.querySelectorAll('.board__token')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.board__ground-item img')).toHaveLength(1);
  });

  it('ne montre pas de fenêtre de décision pour une récompense d’équipement automatiquement laissée au sol', () => {
    const { fixture, gameService, playerService, dungeonService } = createBoard();
    const player = playerService.players[0];
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('axe')!);
    const tile = dungeonService.getTileAt(0, 0)!;
    tile.tokenId = 'giant-rat';
    tile.tokenFace = 'back';

    expect(gameService.resolveTileEntry(player, { x: -1, y: 0 } as PlacedTile, tile)).toBe('reward');
    fixture.detectChanges();

    expect(gameService.pendingReward()).toBeNull();
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['daggers']);
    expect(fixture.nativeElement.querySelectorAll('.board__reward-backdrop')).toHaveLength(0);
  });

  it('affiche le choix de remplacement pour un sort lorsque l’inventaire est plein', () => {
    const { fixture, gameService, playerService, dungeonService } = createBoard();
    const player = playerService.players[0];
    const tile = dungeonService.getTileAt(0, 0)!;
    tile.tokenId = 'fallen';
    tile.tokenFace = 'back';
    playerService.addEquipment(player, { ...getEquipmentDefinition('heart')! });
    playerService.addEquipment(player, { ...getEquipmentDefinition('heart')! });
    playerService.addEquipment(player, { ...getEquipmentDefinition('heart')! });
    gameService.pendingReward.set({
      player,
      monster: getTokenDefinition('fallen') as any,
      rewardTile: tile,
      sourceTile: { x: -1, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'fire-sword' }],
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.board__reward-backdrop')).toHaveLength(1);
    expect(fixture.componentInstance.pendingRewardActions.map(action => action.label)).toEqual([
      'Remplacer l’emplacement 1',
      'Remplacer l’emplacement 2',
      'Remplacer l’emplacement 3',
      'Laisser l’équipement sur la tuile',
    ]);
  });

  it('recentre la caméra et conserve les coordonnées logiques du donjon', () => {
    const { fixture } = createBoard();
    const board = fixture.componentInstance;

    board.centerOnStartTile();
    const startTransform = board.worldTransform;
    board.offsetX = 240;
    board.offsetY = -120;
    const draggedTransform = board.worldTransform;

    expect(startTransform).toContain('translate(');
    expect(draggedTransform).not.toBe(startTransform);
    expect(board.cameraTransitionEnabled).toBe(true);
  });

  it('n’affiche plus les contrôles visuels de recentrage du plateau', () => {
    const { fixture } = createBoard();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.board__camera-tools')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.board__camera-tool')).toHaveLength(0);
  });

  it('déplace la caméra au pointeur avec capture et sans modifier la carte logique', () => {
    const { fixture } = createBoard();
    const board = fixture.componentInstance;
    const element = {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
    } as unknown as HTMLElement;

    board.startDragging({ currentTarget: element, clientX: 10, clientY: 20, pointerId: 7 } as unknown as PointerEvent);
    board.drag({ clientX: 30, clientY: 5 } as unknown as PointerEvent);
    board.stopDragging({ currentTarget: element, pointerId: 7 } as unknown as PointerEvent);

    expect(board.offsetX).toBe(20);
    expect(board.offsetY).toBe(-15);
    expect(board.cameraTransitionEnabled).toBe(false);
    expect(element.setPointerCapture).toHaveBeenCalledWith(7);
    expect(element.releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it('conserve un sprite avec une orientation absente ou invalide', () => {
    const { fixture, playerService } = createBoard();
    const player = playerService.players[0];
    player.heroId = 'taia';
    player.position = { x: 0, y: 0 };

    expect(fixture.componentInstance.getHeroPawnImage(player)).toBe('/assets/heroes/taia/sprite-south.png');

    player.facing = 'invalid' as never;
    expect(fixture.componentInstance.getHeroPawnImage(player)).toBe('/assets/heroes/taia/sprite-south.png');

    player.facing = 'east';
    expect(fixture.componentInstance.getHeroPawnImage(player)).toBe('/assets/heroes/taia/sprite-east.png');
  });

  it('traite les touches de sélection du portail de guérison', () => {
    const { fixture, gameService, playerService, dungeonService } = createBoard();
    const player = playerService.players[0];
    player.controller = 'human';
    player.inventory.spells.push({ ...getEquipmentDefinition('heart')! } as any);
    dungeonService.tiles.push({ definitionId: 'healing-corner', x: 2, y: 0, rotation: 0 });
    dungeonService.tiles.push({ definitionId: 'healing-corner', x: -2, y: 0, rotation: 0 });
    expect(gameService.openHealingPortalSelection()).toBe(true);
    const moveSelection = vi.spyOn(gameService, 'moveHealingPortalSelection');

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
    fixture.componentInstance.handleHealingPortalKeyboard(event);

    expect(event.defaultPrevented).toBe(true);
    expect(moveSelection).toHaveBeenCalledWith(1);
  });

  it('rend l’action fontaine native, accessible et désactivée sans bénéfice', () => {
    const { fixture, playerService } = createBoard();
    const player = playerService.players[0];
    player.position = { x: 0, y: 0 };
    player.lives = 5;
    player.isCursed = false;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.board__context-action--fountain') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    expect(button?.type).toBe('button');
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('aria-label')).toBe('Utiliser la fontaine de régénération');
    expect(button?.querySelector('.board__fountain-icon')).not.toBeNull();
  });

  it('ne mélange pas l’action fontaine avec les contrôles de portail', () => {
    const { fixture, gameService, playerService, dungeonService } = createBoard();
    const player = playerService.players[0];
    player.position = { x: 0, y: 0 };
    player.lives = 2;
    playerService.addEquipment(player, { ...getEquipmentDefinition('heart')! } as any);
    dungeonService.tiles.push({ definitionId: 'portal-straight-01', x: 2, y: 0, rotation: 0 });
    fixture.detectChanges();
    expect(gameService.healingPortalSelection()).toBeNull();
    expect(fixture.nativeElement.querySelector('.board__context-action--fountain')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.board__portal-travel-controls')).toBeNull();
  });

  it('élève la tuile du héros actif pour garder ses actions visibles', () => {
    const { fixture, playerService } = createBoard();
    playerService.players[0].position = { x: 0, y: 0 };
    fixture.detectChanges();

    const tile = fixture.nativeElement.querySelector('.board__tile--active-player') as HTMLElement | null;
    expect(tile).not.toBeNull();
    expect(tile ? getComputedStyle(tile).zIndex : '').toBe('10');
  });

  it('affiche le pion au-dessus de la tuile active et sous ses contrôles', () => {
    const { fixture, playerService } = createBoard();
    const player = playerService.players[0];
    player.heroId = 'taia';
    player.position = { x: 0, y: 0 };
    player.facing = 'south';
    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.board__hero') as HTMLElement | null;
    const tile = fixture.nativeElement.querySelector('.board__tile--active-player') as HTMLElement | null;
    const controls = fixture.nativeElement.querySelector('.board__movement-controls') as HTMLElement | null;

    expect(hero).not.toBeNull();
    expect(tile).not.toBeNull();
    expect(controls).not.toBeNull();
    expect(Number(getComputedStyle(hero!).zIndex)).toBeGreaterThan(Number(getComputedStyle(tile!).zIndex));
    expect(Number(getComputedStyle(hero!).zIndex)).toBeLessThan(Number(getComputedStyle(controls!).zIndex));
  });

  it('révèle la tuile avant le choix de direction et conserve les contrôles pending', () => {
    const { fixture, playerService } = createBoard();
    const explorationService = TestBed.inject(ExplorationService);
    const tileDeckService = TestBed.inject(TileDeckService);
    const turnService = TestBed.inject(TurnService);
    const player = playerService.players[0];
    player.position = { x: 0, y: 0 };

    (tileDeckService as unknown as { deck: string[] }).deck = ['straight-01'];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.board__explore-action')).toBeNull();
    expect(fixture.nativeElement.querySelector('.board__tile--pending')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.board__exploration-target').length).toBeGreaterThan(0);

    (fixture.nativeElement.querySelector('.board__exploration-target') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(explorationService.pendingTile?.direction).not.toBeNull();
    expect(tileDeckService.remainingTiles).toBe(0);
    expect(turnService.remainingMovements()).toBe(4);
    expect(fixture.nativeElement.querySelector('.board__exploration-reveal')).toBeNull();
    expect(fixture.nativeElement.querySelector('.board__tile--pending')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.board__movement-controls')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.board__exploration-target').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('.board__exploration-target--selected')).not.toBeNull();
    expect((fixture.nativeElement.querySelector('.board__rotate') as HTMLButtonElement).disabled).toBe(false);

    fixture.componentInstance.rotatePendingTile();
    fixture.componentInstance.confirmPendingTile();
    fixture.detectChanges();

    expect(explorationService.pendingTile).toBeNull();
    expect(player.position).toEqual({ x: 0, y: -1 });
    expect(turnService.remainingMovements()).toBe(3);
  });

  it('conserve le déplacement direct sans tirer de tuile', () => {
    const { fixture, playerService, dungeonService } = createBoard();
    const explorationService = TestBed.inject(ExplorationService);
    const tileDeckService = TestBed.inject(TileDeckService);
    const turnService = TestBed.inject(TurnService);
    const player = playerService.players[0];
    player.position = { x: 0, y: 0 };
    dungeonService.placeTile({ definitionId: 'straight-01', x: 0, y: -1, rotation: 90 });
    (tileDeckService as unknown as { deck: string[] }).deck = ['straight-02'];
    fixture.detectChanges();

    const destination = dungeonService.getTileAt(0, -1)!;
    const destinationElement = fixture.nativeElement.querySelector('.board__tile[role="button"]') as HTMLElement | null;
    expect(destinationElement).not.toBeNull();
    expect(destinationElement?.classList.contains('board__tile--reachable')).toBe(true);
    expect(destinationElement?.querySelector('.board__move-icon')).not.toBeNull();
    fixture.componentInstance.handleTileClick(destination);

    expect(explorationService.pendingTile).toBeNull();
    expect(tileDeckService.remainingTiles).toBe(1);
    expect(player.position).toEqual({ x: 0, y: -1 });
    expect(turnService.remainingMovements()).toBe(3);
  });

  it('permet de comparer plusieurs emplacements avec la même tuile révélée', () => {
    const { fixture, playerService } = createBoard();
    const explorationService = TestBed.inject(ExplorationService);
    const tileDeckService = TestBed.inject(TileDeckService);
    const turnService = TestBed.inject(TurnService);
    const player = playerService.players[0];
    player.position = { x: 0, y: 0 };
    (tileDeckService as unknown as { deck: string[] }).deck = ['straight-01'];

    fixture.detectChanges();
    const initialTargetButtons = fixture.nativeElement.querySelectorAll('.board__exploration-target') as NodeListOf<HTMLButtonElement>;
    initialTargetButtons[0].click();
    fixture.detectChanges();

    const [firstTarget, secondTarget] = fixture.componentInstance.pendingExplorationTargets;
    expect(firstTarget).toBeDefined();
    expect(secondTarget).toBeDefined();
    const drawnTileId = explorationService.pendingTile?.definition.id;
    expect(drawnTileId).toBeDefined();
    expect(tileDeckService.remainingTiles).toBe(0);
    expect(turnService.remainingMovements()).toBe(4);

    const targetButtons = fixture.nativeElement.querySelectorAll('.board__exploration-target') as NodeListOf<HTMLButtonElement>;
    targetButtons[1].click();
    fixture.detectChanges();
    expect(explorationService.pendingTile?.direction).toBe(secondTarget.direction);
    expect(explorationService.pendingTile?.definition.id).toBe(drawnTileId);
    expect(tileDeckService.remainingTiles).toBe(0);
    expect(turnService.remainingMovements()).toBe(4);
  });

  it('pioche immédiatement depuis une sortie unique', () => {
    const { fixture, playerService } = createBoard();
    const explorationService = TestBed.inject(ExplorationService);
    const tileDeckService = TestBed.inject(TileDeckService);
    const turnService = TestBed.inject(TurnService);
    playerService.players[0].position = { x: 0, y: 0 };
    (tileDeckService as unknown as { deck: string[] }).deck = ['straight-01'];
    vi.spyOn(explorationService, 'canExplore').mockImplementation((_tile, direction) => direction === 'north');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.board__exploration-target') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(explorationService.pendingTile?.direction).toBe('north');
    expect(fixture.nativeElement.querySelector('.board__exploration-reveal')).toBeNull();
    expect(fixture.nativeElement.querySelector('.board__tile--pending')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.board__rotate')).not.toBeNull();
    expect(turnService.remainingMovements()).toBe(4);
  });

  it('affiche une action portail désactivée sans destination', () => {
    const { fixture, dungeonService, playerService } = createBoard();
    dungeonService.tiles[0] = { definitionId: 'portal-straight-01', x: 0, y: 0, rotation: 0 };
    playerService.players[0].position = { x: 0, y: 0 };
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.board__context-action--portal') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('aria-label')).toBe('Utiliser le portail de téléportation');
    expect(button?.querySelector('.board__portal-icon')).not.toBeNull();
  });

  it('ouvre le sélecteur portail au clavier lorsqu’une destination existe', () => {
    const { fixture, gameService, dungeonService, playerService } = createBoard();
    dungeonService.tiles[0] = { definitionId: 'portal-straight-01', x: 0, y: 0, rotation: 0 };
    dungeonService.tiles.push({ definitionId: 'portal-straight-01', x: 2, y: 0, rotation: 0 });
    playerService.players[0].position = { x: 0, y: 0 };
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.board__context-action--portal') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.focus();
    button.click();
    expect(gameService.portalTravelSelection()?.destinations).toHaveLength(1);
  });
});
