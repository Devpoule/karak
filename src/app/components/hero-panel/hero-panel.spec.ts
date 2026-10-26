import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeroPanel } from './hero-panel';
import { Player } from '../../models/player';
import { PlayerService } from '../../services/player.service';
import { GameService } from '../../services/game.service';

describe('HeroPanel brouillard d’inconscience', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function createPanel(recoveryState: Player['recoveryState']) {
    TestBed.configureTestingModule({ imports: [HeroPanel] });
    const fixture = TestBed.createComponent(HeroPanel);
    fixture.componentInstance.player = { recoveryState } as Player;
    fixture.detectChanges();
    return fixture;
  }

  it('affiche le voile pendant l’attente de récupération', () => {
    const fixture = createPanel('pending');

    expect(fixture.nativeElement.querySelector('.hero-panel--unconscious')).not.toBeNull();
  });

  it('conserve le voile pendant le tour de récupération', () => {
    const fixture = createPanel('resting');

    expect(fixture.nativeElement.querySelector('.hero-panel--unconscious')).not.toBeNull();
  });

  it('dissipe le voile lorsque le héros peut rejouer', () => {
    const fixture = createPanel('resting');
    fixture.componentRef.setInput('player', { recoveryState: 'none' } as Player);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hero-panel--unconscious')).toBeNull();
  });

  it('réserve la surbrillance chromatique au héros actif', () => {
    TestBed.configureTestingModule({ imports: [HeroPanel] });
    const fixture = TestBed.createComponent(HeroPanel);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    playerService.drawHeroes();
    fixture.componentRef.setInput('player', playerService.players[0]);
    fixture.componentRef.setInput('isActive', true);
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.hero-panel') as HTMLElement;
    expect(panel.classList.contains('hero-panel--active')).toBe(true);
    expect(panel.querySelector('.hero-panel__card')).not.toBeNull();

    fixture.componentRef.setInput('isActive', false);
    fixture.detectChanges();
    expect(panel.classList.contains('hero-panel--active')).toBe(false);
  });

  it('retourne le portrait de Xanros pendant 2,5 secondes après une Substitution informative', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [HeroPanel] });
    const fixture = TestBed.createComponent(HeroPanel);
    const playerService = TestBed.inject(PlayerService);
    const gameService = TestBed.inject(GameService);
    playerService.initialize(2);
    playerService.drawHeroes();
    const player = playerService.players[0];
    player.heroId = 'xanros';
    fixture.componentRef.setInput('player', player);
    fixture.componentRef.setInput('playerIndex', 0);
    fixture.detectChanges();

    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    gameService.lastXanrosSubstitutionPlayer.set(player);
    gameService.xanrosSubstitutionRevision.update(revision => revision + 1);
    TestBed.flushEffects();
    fixture.detectChanges();

    const stage = fixture.nativeElement.querySelector('.hero-panel__card-stage') as HTMLElement;
    expect(stage.classList.contains('hero-panel__card-stage--flipped')).toBe(true);
    expect(stage.querySelector('.hero-power-card--announcement')).not.toBeNull();
    expect(stage.querySelector('.hero-power-card__portrait')?.getAttribute('src'))
      .toBe('/assets/heroes/xanros/character-transparent.png');
    expect(stage.querySelector('.hero-power-card__power')?.textContent).toContain('Substitution');

    vi.advanceTimersByTime(2499);
    fixture.detectChanges();
    expect(stage.classList.contains('hero-panel__card-stage--flipped')).toBe(true);

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(stage.classList.contains('hero-panel__card-stage--flipped')).toBe(false);
  });

  it('conserve le verso tant qu’une action facultative de Substitution reste en attente', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [HeroPanel] });
    const fixture = TestBed.createComponent(HeroPanel);
    const playerService = TestBed.inject(PlayerService);
    const gameService = TestBed.inject(GameService);
    playerService.initialize(2);
    playerService.drawHeroes();
    const player = playerService.players[0];
    player.heroId = 'xanros';
    fixture.componentRef.setInput('player', player);
    fixture.componentRef.setInput('playerIndex', 0);
    fixture.detectChanges();

    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    gameService.pendingXanrosSubstitutionAction.set({ player, tile: {} as never });
    gameService.lastXanrosSubstitutionPlayer.set(player);
    gameService.xanrosSubstitutionRevision.update(revision => revision + 1);
    TestBed.flushEffects();
    fixture.detectChanges();

    const stage = fixture.nativeElement.querySelector('.hero-panel__card-stage') as HTMLElement;
    expect(stage.classList.contains('hero-panel__card-stage--flipped')).toBe(true);
    vi.advanceTimersByTime(2500);
    fixture.detectChanges();
    expect(stage.classList.contains('hero-panel__card-stage--flipped')).toBe(true);

    gameService.pendingXanrosSubstitutionAction.set(null);
    TestBed.flushEffects();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();
    expect(stage.classList.contains('hero-panel__card-stage--flipped')).toBe(false);
  });

  it('réaffiche le médaillon quand la malédiction métier change sans remplacer le joueur', async () => {
    TestBed.configureTestingModule({ imports: [HeroPanel] });
    const fixture = TestBed.createComponent(HeroPanel);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    fixture.componentInstance.player = player;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hero-panel__curse')).toBeNull();

    playerService.setCursed(player, true);
    await fixture.whenStable();
    fixture.detectChanges();

    const curse = fixture.nativeElement.querySelector('.hero-panel__curse');
    expect(curse).not.toBeNull();
    expect(curse.classList.contains('hero-panel__curse--appearing')).toBe(true);
  });

  it('conserve le médaillon pendant sa dissipation puis le retire après la levée', async () => {
    TestBed.configureTestingModule({ imports: [HeroPanel] });
    const fixture = TestBed.createComponent(HeroPanel);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    fixture.componentInstance.player = player;
    playerService.setCursed(player, true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hero-panel__curse--appearing')).toBeNull();

    playerService.setCursed(player, false);
    await fixture.whenStable();
    fixture.detectChanges();

    const curse = fixture.nativeElement.querySelector('.hero-panel__curse');
    expect(curse).not.toBeNull();
    expect(curse.classList.contains('hero-panel__curse--disappearing')).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 850));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-panel__curse')).toBeNull();
  });
});

describe('HeroPanel décisions de pouvoir', () => {
  function setup(heroId: NonNullable<Player['heroId']>) {
    TestBed.configureTestingModule({ imports: [HeroPanel] });
    const fixture = TestBed.createComponent(HeroPanel);
    const players = TestBed.inject(PlayerService);
    const game = TestBed.inject(GameService);
    players.initialize(2);
    const player = players.players[0];
    player.heroId = heroId;
    game.phase.set('playing');
    game.activePlayerIndex.set(0);
    fixture.componentRef.setInput('player', player);
    fixture.componentRef.setInput('playerIndex', 0);
    fixture.detectChanges();
    return { fixture, player, players, game };
  }

  it('présente le choix d’Aderyn sur le verso et délègue le combat', () => {
    const { fixture, player, game } = setup('aderyn');
    const choose = vi.spyOn(game, 'choosePendingSneak').mockReturnValue(true);
    game.pendingSneakChoice.set({ player } as never);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hero-panel__card-stage--flipped')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.hero-power-card__power').textContent).toContain('Marche rampante');
    (fixture.nativeElement.querySelector('.hero-power-card__decline') as HTMLButtonElement).click();
    expect(choose).toHaveBeenCalledWith('combat');
    game.pendingSneakChoice.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-panel__card-stage--flipped')).toBeNull();
  });

  it('présente les jetons de Taia et transmet le choix au service', () => {
    const { fixture, player, game } = setup('taia');
    const choose = vi.spyOn(game, 'choosePendingToken').mockReturnValue(true);
    game.pendingTokenChoice.set({ player, tokens: [
      { kind: 'monster', name: 'Rat', strength: 3, image: '/rat.png' },
      { kind: 'treasure', image: '/chest.png' },
    ] } as never);
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.hero-power-card__choice') as NodeListOf<HTMLButtonElement>;
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toContain('Rat');
    options[1].click();
    expect(choose).toHaveBeenCalledWith(1);
  });

  it('propose les cibles de Xanros sans activer la substitution avant sélection', () => {
    const { fixture, players, game } = setup('xanros');
    players.players[1].heroId = 'aderyn';
    players.players[1].position = { x: 1, y: 0 };
    const confirm = vi.spyOn(game, 'confirmXanrosSubstitution').mockReturnValue(true);
    game.xanrosSubstitutionSelectionOpen.set(true);
    fixture.detectChanges();

    expect(confirm).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('4 déplacements');
    (fixture.nativeElement.querySelector('.hero-power-card__choice') as HTMLButtonElement).click();
    expect(confirm).toHaveBeenCalledWith(players.players[1]);
  });

  it('délègue la fontaine de Réincarnation sélectionnée', () => {
    const { fixture, player, game } = setup('horan');
    const fountain = { definitionId: 'healing-corner', x: 2, y: 0, rotation: 0 };
    vi.spyOn(game, 'getHealingFountains').mockReturnValue([fountain]);
    const select = vi.spyOn(game, 'selectHoranReincarnationDestination').mockImplementation(() => {});
    const confirm = vi.spyOn(game, 'confirmHoranReincarnation').mockReturnValue(true);
    game.horanReincarnationSelection.set({ player, destination: fountain });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.hero-power-card__choice') as HTMLButtonElement).click();
    expect(select).toHaveBeenCalledWith(fountain);
    expect(confirm).toHaveBeenCalledOnce();
  });
});
