import { TestBed } from '@angular/core/testing';

import { PLAYER_INVENTORY_CAPACITY } from '../models/inventory';
import { PlayerService } from './player.service';

describe('PlayerService', () => {
  let service: PlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    service = TestBed.inject(PlayerService);
  });

  it('crée chaque joueur avec 5 points de vie', () => {
    service.initialize(5);

    expect(
      service.players.map(
        (player) => player.lives,
      ),
    ).toEqual([5, 5, 5, 5, 5]);
  });

  it('crée un inventaire vide pour chaque joueur', () => {
    service.initialize(2);

    for (const player of service.players) {
      expect(player.inventory.weapons).toEqual([
        null,
        null,
      ]);
      expect(player.inventory.spells).toEqual([
        null,
        null,
        null,
      ]);
      expect(player.inventory.key).toBeNull();
    }
  });

  it('ne partage pas les références mutables entre deux inventaires', () => {
    service.initialize(2);

    expect(
      service.players[0].inventory,
    ).not.toBe(
      service.players[1].inventory,
    );

    expect(
      service.players[0].inventory.weapons,
    ).not.toBe(
      service.players[1].inventory.weapons,
    );

    expect(
      service.players[0].inventory.spells,
    ).not.toBe(
      service.players[1].inventory.spells,
    );
  });

  it('respecte la capacité d inventaire documentée', () => {
    service.initialize(2);

    for (const player of service.players) {
      expect(
        player.inventory.weapons.length,
      ).toBe(
        PLAYER_INVENTORY_CAPACITY.weapons,
      );

      expect(
        player.inventory.spells.length,
      ).toBe(
        PLAYER_INVENTORY_CAPACITY.spells,
      );

      expect(
        PLAYER_INVENTORY_CAPACITY.key,
      ).toBe(1);
    }
  });
});
