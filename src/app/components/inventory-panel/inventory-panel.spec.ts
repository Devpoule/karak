import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { getEquipmentDefinition } from '../../data/equipment-definitions';
import { InventoryPanel } from './inventory-panel';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';
import { DungeonService } from '../../services/dungeon.service';
import { ExplorationService } from '../../services/exploration.service';

describe('InventoryPanel', () => {
  function createReadyPanel(): {
    fixture: ReturnType<typeof TestBed.createComponent<InventoryPanel>>;
    gameService: GameService;
    playerService: PlayerService;
    dungeonService: DungeonService;
    explorationService: ExplorationService;
  } {
    TestBed.configureTestingModule({
      imports: [InventoryPanel],
      providers: [GameService, PlayerService],
    });

    const fixture = TestBed.createComponent(InventoryPanel);
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    const explorationService = TestBed.inject(ExplorationService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    return { fixture, gameService, playerService, dungeonService, explorationService };
  }

  it('actualise le DOM lorsqu une clé est ajoutée puis consommée', async () => {
    TestBed.configureTestingModule({
      imports: [InventoryPanel],
      providers: [GameService, PlayerService],
    });

    const fixture = TestBed.createComponent(InventoryPanel);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    const player = playerService.players[0];
    fixture.componentInstance.player = player;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img[alt="Clé"]')).toBeNull();

    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    await fixture.whenStable();
    fixture.detectChanges();

    const keyImage = fixture.nativeElement.querySelector('img[alt="Clé"]') as HTMLImageElement | null;
    expect(keyImage).not.toBeNull();
    expect(keyImage?.getAttribute('src')).toBe('/assets/tokens/key.png');

    playerService.removeEquipment(player, 'key', 0);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img[alt="Clé"]')).toBeNull();
  });

  it('affiche le bon inventaire lorsqu un autre joueur est transmis', async () => {
    TestBed.configureTestingModule({
      imports: [InventoryPanel],
      providers: [GameService, PlayerService],
    });

    const fixture = TestBed.createComponent(InventoryPanel);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    const firstPlayer = playerService.players[0];
    const secondPlayer = playerService.players[1];

    fixture.componentInstance.player = firstPlayer;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img[alt="Clé"]')).toBeNull();

    fixture.componentInstance.player = secondPlayer;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img[alt="Clé"]')).toBeNull();

    playerService.addEquipment(secondPlayer, getEquipmentDefinition('key')!);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img[alt="Clé"]')).not.toBeNull();
  });

  it('invalide une sélection lorsque le joueur se déplace', () => {
    const { fixture, playerService } = createReadyPanel();
    const player = playerService.players[0];
    const weapon = getEquipmentDefinition('sword')!;
    player.position = { x: 1, y: 1 };
    playerService.addEquipment(player, weapon);
    fixture.componentInstance.player = player;
    fixture.detectChanges();

    fixture.componentInstance.selectDrop('weapon', 0, weapon);
    expect(fixture.componentInstance.selectedDrop).not.toBeNull();

    player.position = { x: 2, y: 1 };
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedDrop).toBeNull();
  });

  it('invalide une sélection si le slot contient un autre exemplaire', () => {
    const { fixture, playerService } = createReadyPanel();
    const player = playerService.players[0];
    const firstWeapon = getEquipmentDefinition('sword')!;
    player.position = { x: 1, y: 1 };
    playerService.addEquipment(player, firstWeapon);
    fixture.componentInstance.player = player;
    fixture.detectChanges();

    fixture.componentInstance.selectDrop('weapon', 0, firstWeapon);
    playerService.removeEquipment(player, 'weapon', 0);
    playerService.addEquipment(player, { ...firstWeapon });
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedDrop).toBeNull();
  });

  it('invalide une sélection lorsque le joueur actif change', () => {
    const { fixture, gameService, playerService, dungeonService } = createReadyPanel();
    const player = playerService.players[0];
    const weapon = getEquipmentDefinition('sword')!;
    player.position = { x: 1, y: 1 };
    playerService.addEquipment(player, weapon);
    fixture.componentInstance.player = player;
    fixture.detectChanges();

    fixture.componentInstance.selectDrop('weapon', 0, weapon);
    gameService.activePlayerIndex.set(1);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedDrop).toBeNull();
  });

  it('active la confirmation et dépose le sort sélectionné sur la tuile courante', () => {
    const { fixture, gameService, playerService, dungeonService } = createReadyPanel();
    const player = playerService.players[0];
    const spell = getEquipmentDefinition('fire-sword')!;
    player.position = { x: 0, y: 0 };
    playerService.addEquipment(player, spell);
    playerService.addEquipment(player, { ...spell });
    fixture.componentInstance.player = player;
    fixture.detectChanges();

    fixture.componentInstance.selectDrop('spell', 0, player.inventory.spells[0]!);
    expect(fixture.componentInstance.canDropEquipment).toBe(true);
    expect(fixture.componentInstance.selectedDrop).not.toBeNull();

    fixture.componentInstance.confirmDrop();

    expect(player.inventory.spells[0]).toBeNull();
    expect(gameService.getGroundEquipment(dungeonService.getTileAt(0, 0)!)).toHaveLength(1);
    expect(fixture.componentInstance.selectedDrop).toBeNull();
  });

  it('interdit et invalide le dépôt pendant une exploration en attente', () => {
    const { fixture, playerService, explorationService } = createReadyPanel();
    const player = playerService.players[0];
    const spell = getEquipmentDefinition('fire-sword')!;
    player.position = { x: 0, y: 0 };
    playerService.addEquipment(player, spell);
    fixture.componentInstance.player = player;
    fixture.detectChanges();

    fixture.componentInstance.selectDrop('spell', 0, spell);
    expect(fixture.componentInstance.selectedDrop).not.toBeNull();

    explorationService.pendingTile = {
      sourceTile: { x: 0, y: 0 } as never,
      direction: 'north',
      definition: {} as never,
      rotation: 0,
    };
    fixture.detectChanges();

    expect(fixture.componentInstance.canDropEquipment).toBe(false);
    expect(fixture.componentInstance.selectedDrop).toBeNull();
    expect(player.inventory.spells[0]).toBe(spell);
  });
});
