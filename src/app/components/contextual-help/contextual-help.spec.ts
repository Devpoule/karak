import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ContextualHelpComponent } from './contextual-help';

describe('ContextualHelpComponent', () => {
  it('ferme le panneau lorsqu’un clic extérieur est reçu', () => {
    TestBed.configureTestingModule({ imports: [ContextualHelpComponent] });
    const fixture = TestBed.createComponent(ContextualHelpComponent);
    fixture.componentRef.setInput('help', {
      id: 'help-test',
      title: 'Aide de test',
      summary: 'Résumé de test',
      codexFragment: 'rules',
      category: 'preparation',
    });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.toggle();
    expect(component.isOpen).toBe(true);

    component.closeOnOutsideClick(new MouseEvent('click', { bubbles: true }));

    expect(component.isOpen).toBe(false);
  });
});
