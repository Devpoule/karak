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
});
