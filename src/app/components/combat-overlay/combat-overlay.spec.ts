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

  function prepareCombat(
    withMagicBolt: boolean,
    heroId: 'horan' | 'victorius' = 'horan',
    controller: 'human' | 'ai' = 'human',
    rollInitial = true,
  ) {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fixture = TestBed.createComponent(CombatOverlay);
    const overlay = fixture.componentInstance;
    const playerService = TestBed.inject(PlayerService);
    const gameService = TestBed.inject(GameService);
    const combatService = TestBed.inject(CombatService);
    const dungeonService = TestBed.inject(DungeonService);
    const turnService = TestBed.inject(TurnService);

    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    player.heroId = heroId;
    player.controller = controller;
    if (withMagicBolt) {
      playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    }

    combatService.startCombat(player, dungeonService.tiles[0], createMonster());
    fixture.detectChanges();

    if (rollInitial) {
      combatService.rollPendingCombat();
      overlay.presentationState.set('decision');
      fixture.detectChanges();
    }

    return { fixture, overlay, combatService, gameService, turnService };
  }

  function prepareIntegratedUnstoppableDecision() {
    const setup = prepareCombat(false, 'victorius');
    const { combatService, gameService, overlay, turnService } = setup;

    turnService.resetMovements();
    turnService.consumeMovement();
    turnService.stopMovements();

    const combat = combatService.pendingCombat()!;
    (combat.monster as { strength: number }).strength = 20;
    const roll = combatService.pendingCombatRoll()!;
    combatService.pendingCombatRoll.set({
      ...roll,
      die1: 6,
      die2: 1,
      diceTotal: 7,
      attackPower: 7,
      monsterStrength: 20,
    });
    const result = combatService.resolvePendingCombat()!;

    expect(result.unstoppableEligible).toBe(true);
    expect(gameService.registerUnstoppableContinuation(result)).toBe(true);
    expect(gameService.finalizeUnstoppableContinuation()).toBe(true);
    overlay.presentedResult.set(result);
    overlay.presentationState.set('result');
    setup.fixture.detectChanges();

    expect(overlay.isUnstoppableDecisionVisible).toBe(true);
    return { ...setup, result };
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

  it('anime les deux dés lors de la relance de Horan avant d afficher le nouveau résultat', () => {
    const { fixture, overlay } = prepareCombat(false);
    overlay.displayedDice.set({ die1: 6, die2: 5 });
    fixture.detectChanges();

    overlay.useHeroReroll('both');
    fixture.detectChanges();

    expect(overlay.presentationState()).toBe('rolling');
    expect(overlay.displayedDice()).toEqual({ die1: 6, die2: 5 });
    expect(fixture.nativeElement.querySelectorAll('.combat-overlay__die--rolling')).toHaveLength(2);

    vi.advanceTimersByTime(1840);
    fixture.detectChanges();

    expect(overlay.displayedDice()).toEqual({ die1: 1, die2: 1 });
    fixture.destroy();
  });

  it('anime uniquement le dé relancé par Victorius et conserve l autre visuellement', () => {
    const { fixture, overlay } = prepareCombat(false, 'victorius');
    overlay.displayedDice.set({ die1: 6, die2: 5 });
    fixture.detectChanges();

    overlay.useHeroReroll('die1');
    fixture.detectChanges();

    expect(overlay.presentationState()).toBe('rolling');
    expect(overlay.displayedDice()).toEqual({ die1: 6, die2: 5 });
    expect(fixture.nativeElement.querySelectorAll('.combat-overlay__die--rolling')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.combat-overlay__die:nth-child(2)')?.classList.contains('combat-overlay__die--rolling')).toBe(false);

    vi.advanceTimersByTime(1840);
    fixture.detectChanges();

    expect(overlay.displayedDice()).toEqual({ die1: 1, die2: 5 });
    fixture.destroy();
  });

  it('anime aussi la relance déclenchée par l IA', () => {
    const { fixture, overlay } = prepareCombat(false, 'horan', 'ai', false);
    const clearTimers = (overlay as unknown as { clearTimers: () => void }).clearTimers.bind(overlay);
    const performCombatResolution = (overlay as unknown as { performCombatResolution: () => void }).performCombatResolution.bind(overlay);

    clearTimers();
    overlay.displayedDice.set({ die1: 6, die2: 5 });
    overlay.presentationState.set('ready');
    performCombatResolution();
    fixture.detectChanges();

    vi.advanceTimersByTime(4690);
    fixture.detectChanges();

    expect(overlay.presentationState()).toBe('rolling');
    expect(fixture.nativeElement.querySelectorAll('.combat-overlay__die--rolling')).toHaveLength(2);
    fixture.destroy();
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
    const combatOverlay = fixture.nativeElement.querySelector('.combat-overlay') as HTMLElement | null;

    expect(heroScore?.classList.contains(`combat-overlay__score--${heroClass}`)).toBe(true);
    expect(monsterScore?.classList.contains(`combat-overlay__score--${monsterClass}`)).toBe(true);
    expect(combatOverlay?.classList.contains('combat-overlay--wave-target-hero')).toBe(outcome === 'defeat');
    expect(combatOverlay?.classList.contains('combat-overlay--wave-target-monster')).toBe(outcome === 'victory');
    expect(heroScore?.textContent).toContain(`${result.attackPower} pts`);
    expect(monsterScore?.textContent).toContain(`${result.monsterStrength} pts`);
    expect(heroScore?.textContent).not.toContain('Score de combat');
    expect(monsterScore?.textContent).not.toContain('Force');
    const verdict = fixture.nativeElement.querySelector('.combat-overlay__verdict') as HTMLElement | null;
    expect(verdict?.getAttribute('role')).toBe('status');
    expect(verdict?.getAttribute('aria-live')).toBe('assertive');
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

  it('intègre la continuation Inarrêtable et ne termine pas le tour après acceptation', () => {
    const { fixture, overlay, gameService, turnService } = prepareIntegratedUnstoppableDecision();
    const endTurn = vi.spyOn(gameService, 'endTurn');

    const continueButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find(button => button.textContent?.includes('Continuer le tour'));
    expect(continueButton).toBeDefined();

    continueButton?.click();
    fixture.detectChanges();

    expect(endTurn).not.toHaveBeenCalled();
    expect(turnService.remainingMovements()).toBe(3);
    expect(gameService.pendingUnstoppableDecision()).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Choix Inarrêtable"]')).toBeNull();
    expect(overlay.presentedResult()).toBeNull();
    fixture.destroy();
  });

  it('termine le tour une seule fois après le refus intégré d Inarrêtable', () => {
    const { fixture, overlay, gameService } = prepareIntegratedUnstoppableDecision();
    const endTurn = vi.spyOn(gameService, 'endTurn');

    const finishButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find(button => button.textContent?.includes('Terminer le tour'));
    expect(finishButton).toBeDefined();

    finishButton?.click();
    fixture.detectChanges();

    expect(endTurn).toHaveBeenCalledTimes(1);
    expect(gameService.pendingUnstoppableDecision()).toBeNull();
    expect(overlay.presentedResult()).toBeNull();
    fixture.destroy();
  });
});
