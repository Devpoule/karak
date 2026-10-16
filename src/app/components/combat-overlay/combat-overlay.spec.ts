import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { getEquipmentDefinition } from '../../data/equipment-definitions';
import { PlacedTile } from '../../models/tile';
import { AiService } from '../../services/ai.service';
import { CombatService } from '../../services/combat.service';
import { DungeonService } from '../../services/dungeon.service';
import { ExplorationService } from '../../services/exploration.service';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';
import { TileDeckService } from '../../services/tile-deck.service';
import { ToastService } from '../../services/toast.service';
import { TurnService } from '../../services/turn.service';
import { CombatOverlay } from './combat-overlay';

describe('CombatOverlay décisions facultatives de Horan', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createMonster(): PlacedTile {
    return {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'giant-rat',
      tokenFace: 'front',
    } as PlacedTile;
  }

  function prepareCombat(withMagicBolt: boolean, heroId: 'horan' | 'victorius' = 'horan') {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fixture = TestBed.createComponent(CombatOverlay);
    const overlay = fixture.componentInstance;
    const playerService = TestBed.inject(PlayerService);
    const gameService = TestBed.inject(GameService);
    const combatService = TestBed.inject(CombatService);
    const dungeonService = TestBed.inject(DungeonService);

    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    player.heroId = heroId;
    if (withMagicBolt) {
      playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    }

    combatService.startCombat(player, dungeonService.tiles[0], createMonster());
    combatService.rollPendingCombat();
    fixture.detectChanges();
    overlay.presentationState.set('decision');
    fixture.detectChanges();

    return { fixture, overlay, combatService };
  }

  it.each([false, true])('propose de conserver le résultat avec%s Tir magique', (withMagicBolt) => {
    const { fixture, overlay, combatService } = prepareCombat(withMagicBolt);
    const keepButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find(button => button.textContent?.includes('Conserver ce résultat'));

    expect(overlay.canKeepCombatResult).toBe(true);
    expect(keepButton).toBeDefined();

    (overlay as unknown as { resolving: boolean }).resolving = true;
    keepButton?.click();
    expect(combatService.pendingCombat()).toBeNull();
    expect(combatService.lastCombatResult()?.outcome).toBe('defeat');

    keepButton?.click();
    expect(combatService.lastCombatResult()?.outcome).toBe('defeat');
    fixture.destroy();
  });

  it('propose aussi de conserver le résultat pour Victorius sans Tir magique', () => {
    const { fixture, overlay, combatService } = prepareCombat(false, 'victorius');
    const keepButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find(button => button.textContent?.includes('Conserver ce résultat'));

    expect(overlay.availableHeroRerolls).toEqual(['die1', 'die2']);
    expect(keepButton).toBeDefined();
    (overlay as unknown as { resolving: boolean }).resolving = true;
    keepButton?.click();
    expect(combatService.pendingCombat()).toBeNull();
    expect(combatService.lastCombatResult()).not.toBeNull();
    fixture.destroy();
  });

  it('ne résout ni ne nettoie le combat automatiquement lors de sa destruction', () => {
    const { fixture, combatService } = prepareCombat(false);
    const result = combatService.resolvePendingCombat();

    expect(result).not.toBeNull();
    expect(combatService.pendingCombat()).toBeNull();
    expect(combatService.lastCombatResult()).toBe(result);

    fixture.destroy();

    expect(combatService.lastCombatResult()).toBe(result);
  });
});
