import { describe, expect, it } from 'vitest';
import { PlayerService } from '../../services/player.service';
import { TreasurePanel } from './treasure-panel';

describe('TreasurePanel', () => {
  it('affiche un état vide sans trésor', () => {
    const playerService = new PlayerService();
    playerService.initialize(2);
    const panel = new TreasurePanel(playerService);
    panel.player = playerService.players[0];

    expect(panel.groups).toEqual([]);
    expect(panel.points).toBe(0);
  });

  it('regroupe les exemplaires et calcule le score décimal', () => {
    const playerService = new PlayerService();
    playerService.initialize(2);
    const player = playerService.players[0];
    const panel = new TreasurePanel(playerService);
    panel.player = player;

    playerService.addTreasure(player, 'opened-chest');
    playerService.addTreasure(player, 'opened-chest');
    playerService.addTreasure(player, 'monster-treasure');
    playerService.addTreasure(player, 'dragon-ruby');

    expect(panel.groups.map(group => ({ type: group.type, count: group.count }))).toEqual([
      { type: 'opened-chest', count: 2 },
      { type: 'monster-treasure', count: 1 },
      { type: 'dragon-ruby', count: 1 },
    ]);
    expect(panel.points).toBe(4.5);
  });

  it('se met à jour après une attribution sans changer de joueur', () => {
    const playerService = new PlayerService();
    playerService.initialize(2);
    const player = playerService.players[0];
    const panel = new TreasurePanel(playerService);
    panel.player = player;

    expect(panel.points).toBe(0);
    playerService.addTreasure(player, 'dragon-ruby');

    expect(panel.groups[0].type).toBe('dragon-ruby');
    expect(panel.points).toBe(1.5);
  });
});
