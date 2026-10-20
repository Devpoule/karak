import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PlayerService } from '../../services/player.service';
import { PlayerSidebar } from './player-sidebar';

describe('PlayerSidebar codex', () => {
  function createSidebar() {
    const service = new PlayerService();
    service.initialize(2);
    service.drawHeroes();
    const sidebar = new PlayerSidebar();
    sidebar.side = 'left';
    sidebar.player = service.players[0];
    return sidebar;
  }

  it('utilise les médaillons PNG correspondant aux deux pouvoirs', () => {
    const sidebar = createSidebar();
    const heroId = sidebar.heroDefinition!.id;

    expect(sidebar.heroDefinition!.nickname).toBeTruthy();
    expect(sidebar.powerImage(0)).toBe(`/assets/heroes/${heroId}/character-primary-power.png`);
    expect(sidebar.powerImage(1)).toBe(`/assets/heroes/${heroId}/character-secondary-power.png`);
  });

  it('ouvre une seule fiche à la fois et referme la fiche active au second clic', () => {
    const sidebar = createSidebar();
    const [firstPower, secondPower] = sidebar.heroDefinition!.powers;

    sidebar.toggleBiography();
    expect(sidebar.biographyOpen).toBe(true);
    expect(sidebar.selectedPowerId).toBeNull();

    sidebar.togglePower(firstPower.id);
    expect(sidebar.biographyOpen).toBe(false);
    expect(sidebar.selectedPowerId).toBe(firstPower.id);

    sidebar.togglePower(secondPower.id);
    expect(sidebar.selectedPowerId).toBe(secondPower.id);
    sidebar.togglePower(secondPower.id);
    expect(sidebar.selectedPowerId).toBeNull();
  });

  it('ferme la fiche avec Échap', () => {
    const sidebar = createSidebar();
    sidebar.togglePower(sidebar.heroDefinition!.powers[0].id);

    sidebar.onEscape();

    expect(sidebar.selectedPowerId).toBeNull();
    expect(sidebar.biographyOpen).toBe(false);
  });

  it('rend ensemble les panneaux héros, vie, inventaire et trésors', () => {
    TestBed.configureTestingModule({ imports: [PlayerSidebar] });
    const fixture = TestBed.createComponent(PlayerSidebar);
    const service = TestBed.inject(PlayerService);
    service.initialize(2);
    service.drawHeroes();

    fixture.componentInstance.side = 'left';
    fixture.componentInstance.player = service.players[0];
    fixture.componentInstance.playerIndex = 0;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-hero-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-life-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-inventory-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-treasure-panel')).not.toBeNull();
  });

  it('réserve l’état sélectionné à la consultation et synchronise aria-pressed', () => {
    TestBed.configureTestingModule({ imports: [PlayerSidebar] });
    const fixture = TestBed.createComponent(PlayerSidebar);
    const service = TestBed.inject(PlayerService);
    service.initialize(2);
    service.drawHeroes();
    fixture.componentInstance.side = 'left';
    fixture.componentInstance.player = service.players[0];
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.player-sidebar__power-badge') as NodeListOf<HTMLButtonElement>;
    expect(buttons).toHaveLength(2);
    expect(buttons[0].classList.contains('player-sidebar__power-badge--selected')).toBe(false);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');

    buttons[0].click();
    fixture.detectChanges();
    expect(buttons[0].classList.contains('player-sidebar__power-badge--selected')).toBe(true);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');

    fixture.componentInstance.clearPowerSelection();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedPowerId).toBeNull();
  });
});
