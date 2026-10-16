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

  it.each([
    { outcome: 'victory' as const, heroClass: 'winner', monsterClass: 'loser' },
    { outcome: 'defeat' as const, heroClass: 'loser', monsterClass: 'winner' },
    { outcome: 'tie' as const, heroClass: 'tie', monsterClass: 'tie' },
  ])('affiche les scores et le traitement visuel d une $outcome', ({ outcome, heroClass, monsterClass }) => {
    const { fixture, overlay, combatService } = prepareCombat(false);
    const roll = combatService.pendingCombatRoll()!;
    const result = {
      ...roll,
      outcome,
    };

    overlay.presentedResult.set(result);
    overlay.presentationState.set('result');
    fixture.detectChanges();

    const heroScore = fixture.nativeElement.querySelector('.combat-overlay__score--hero') as HTMLElement | null;
    const monsterScore = fixture.nativeElement.querySelector('.combat-overlay__score--monster') as HTMLElement | null;

    expect(heroScore?.classList.contains(`combat-overlay__score--${heroClass}`)).toBe(true);
    expect(monsterScore?.classList.contains(`combat-overlay__score--${monsterClass}`)).toBe(true);
    expect(heroScore?.textContent).toContain(`${result.attackPower} pts`);
    expect(monsterScore?.textContent).toContain(`${result.monsterStrength} pts`);
    expect(heroScore?.textContent).not.toContain('Score de combat');
    expect(monsterScore?.textContent).not.toContain('Force');
    fixture.destroy();
  });

  it('conserve le résultat pendant quatre secondes avant sa fermeture automatique', () => {
    const { fixture, overlay } = prepareCombat(false);
    const clearTimers = (overlay as unknown as { clearTimers: () => void }).clearTimers.bind(overlay);
    const resolveAfterRoll = (overlay as unknown as { resolveCombatAfterRoll: () => void }).resolveCombatAfterRoll.bind(overlay);

    clearTimers();
    resolveAfterRoll();
    expect(overlay.presentationState()).toBe('result');

    vi.advanceTimersByTime(3999);
    expect(overlay.presentationState()).toBe('result');

    vi.advanceTimersByTime(1);
    expect(overlay.presentationState()).toBe('intro');
    fixture.destroy();
  });
});
