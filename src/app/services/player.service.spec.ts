import { PlayerService } from './player.service';
import { calculateTreasurePoints } from '../models/treasure';

describe('PlayerService treasures', () => {
  it('initialise les trésors vides pour la création et la réinitialisation', () => {
    const service = new PlayerService();

    expect(service.player.treasures).toEqual([]);
    service.initialize(2);
    expect(service.players.every(player => player.treasures.length === 0)).toBe(true);

    service.players[0].treasures.push('dragon-ruby');
    service.initialize(2);
    expect(service.players.every(player => player.treasures.length === 0)).toBe(true);
  });

  it('attribue un trésor uniquement à un joueur de la partie', () => {
    const service = new PlayerService();
    service.initialize(2);
    const outsider = { ...service.players[0], treasures: [] };

    expect(service.addTreasure(outsider, 'opened-chest')).toBe(false);
    expect(service.players[0].treasures).toEqual([]);
    expect(service.addTreasure(service.players[0], 'opened-chest')).toBe(true);
    expect(service.players[0].treasures).toEqual(['opened-chest']);
  });

  it('calcule les points sans stocker de score redondant', () => {
    expect(calculateTreasurePoints([
      'opened-chest',
      'monster-treasure',
      'dragon-ruby',
    ])).toBe(3.5);
  });
});

describe('PlayerService récupération', () => {
  it('marque une perte totale puis soigne exactement une vie au tour de récupération', () => {
    const service = new PlayerService();
    service.initialize(2);
    const player = service.players[0];
    player.lives = 1;

    service.loseLife(player);
    expect(player.lives).toBe(0);
    expect(player.recoveryState).toBe('pending');

    expect(service.beginRecoveryTurn(player)).toBe(true);
    expect(player.lives).toBe(1);
    expect(player.recoveryState).toBe('resting');
    expect(service.beginRecoveryTurn(player)).toBe(false);
    expect(player.lives).toBe(1);

    expect(service.completeRecoveryTurn(player)).toBe(true);
    expect(player.recoveryState).toBe('none');
  });
});
