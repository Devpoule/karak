import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
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
});
