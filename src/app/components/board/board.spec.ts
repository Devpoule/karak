import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { getEquipmentDefinition } from '../../data/equipment-definitions';
import { getTokenDefinition } from '../../data/token-definitions';
import { PlacedTile } from '../../models/tile';
import { Board } from './board';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';
import { DungeonService } from '../../services/dungeon.service';

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
});
