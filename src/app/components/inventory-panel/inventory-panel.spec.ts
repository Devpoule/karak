import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createEmptyPlayerInventory } from '../../models/inventory';
import { InventoryPanel } from './inventory-panel';

describe('InventoryPanel', () => {
  let component: InventoryPanel;
  let fixture: ComponentFixture<InventoryPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reçoit l inventaire du joueur actif', () => {
    const inventory =
      createEmptyPlayerInventory();

    component.player = {
      controller: 'human',
      lives: 5,
      inventory,
    };

    fixture.detectChanges();

    expect(component.inventory).toBe(
      inventory,
    );
  });

  it('représente un inventaire initial vide', () => {
    component.player = {
      controller: 'human',
      lives: 5,
      inventory: createEmptyPlayerInventory(),
    };

    expect(component.weaponSlots).toEqual([
      null,
      null,
    ]);
    expect(component.spellSlots).toEqual([
      null,
      null,
      null,
    ]);
    expect(component.hasKey).toBe(false);
  });
});
