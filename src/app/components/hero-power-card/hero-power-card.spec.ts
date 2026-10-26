import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HERO_DEFINITIONS } from '../../data/hero-definitions';
import { HeroPowerCard } from './hero-power-card';

@Component({
  standalone: true,
  imports: [HeroPowerCard],
  template: '<app-hero-power-card [hero]="hero" [power]="power" [mode]="displayMode" [conditions]="conditions" [choices]="choices" [choiceCancelable]="choiceCancelable" (activated)="onActivated()" (declined)="onDeclined()" (closed)="onClosed()" (choiceCancelled)="onChoiceCancelled()" />',
})
class HostComponent {
  hero = HERO_DEFINITIONS.find(candidate => candidate.id === 'aderyn')!;
  power = this.hero.powers.find(candidate => candidate.id === 'sneak')!;
  activated = 0;
  declined = 0;
  closed = 0;
  displayMode: 'decision' | 'choice' | 'announcement' | 'consultation' = 'decision';
  conditions = '';
  choices = [
    { label: 'Cible A', image: '/a.png', alt: 'Cible A' },
    { label: 'Cible B', image: '/b.png', alt: 'Cible B' },
  ];
  choiceCancelable = false;
  choiceCancelled = 0;

  onActivated(): void { this.activated += 1; }
  onDeclined(): void { this.declined += 1; }
  onClosed(): void { this.closed += 1; }
  onChoiceCancelled(): void { this.choiceCancelled += 1; }
}

describe('HeroPowerCard', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('présente le héros, le pouvoir et les deux décisions accessibles', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('Aderyn');
    expect(element.textContent).toContain('Marche rampante');
    expect(element.querySelector('button.hero-power-card__activate')?.textContent).toContain('Utiliser le pouvoir');
    expect(element.querySelector('button.hero-power-card__decline')?.textContent).toContain('Continuer sans');
  });

  it('émet une seule décision correspondant au bouton activé', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    buttons[1].click();
    expect(fixture.componentInstance.activated).toBe(1);
    expect(fixture.componentInstance.declined).toBe(1);
  });

  it('rend explicites le coût et les deux choix d’une décision de pouvoir', () => {
    const cardFixture = TestBed.createComponent(HeroPowerCard);
    cardFixture.componentRef.setInput('hero', HERO_DEFINITIONS.find(hero => hero.id === 'xanros')!);
    cardFixture.componentRef.setInput('power', HERO_DEFINITIONS.find(hero => hero.id === 'xanros')!.powers[0]);
    cardFixture.componentRef.setInput('embedded', true);
    cardFixture.componentRef.setInput('message', 'Sacrifiez 1 vie pour ajouter +1 à votre attaque.');
    cardFixture.componentRef.setInput('activateLabel', 'Sacrifier 1 PV pour +1 attaque');
    cardFixture.componentRef.setInput('declineLabel', 'Conserver mes PV');
    cardFixture.detectChanges();

    const element = cardFixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Sacrifiez 1 vie');
    expect(element.querySelector('.hero-power-card__activate')?.getAttribute('aria-label'))
      .toBe('Sacrifier 1 PV pour +1 attaque');
    expect(element.querySelector('.hero-power-card__decline')?.getAttribute('aria-label'))
      .toBe('Conserver mes PV');
  });

  it('n’affiche aucune décision en mode annonce et expose le message métier', () => {
    const cardFixture = TestBed.createComponent(HeroPowerCard);
    cardFixture.componentRef.setInput('hero', fixture.componentInstance.hero);
    cardFixture.componentRef.setInput('power', fixture.componentInstance.power);
    cardFixture.componentRef.setInput('mode', 'announcement');
    cardFixture.componentRef.setInput('message', 'Aderyn utilise Marche rampante.');
    cardFixture.detectChanges();
    const element = cardFixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Marche rampante');
    expect(element.querySelector('.hero-power-card__activate')).toBeNull();
    expect(element.querySelector('.hero-power-card__decline')).toBeNull();
    expect(element.querySelector('.hero-power-card__close')).toBeNull();
  });

  it('présente les conditions sans bouton de fermeture en mode consultation', () => {
    const cardFixture = TestBed.createComponent(HeroPowerCard);
    cardFixture.componentRef.setInput('hero', fixture.componentInstance.hero);
    cardFixture.componentRef.setInput('power', fixture.componentInstance.power);
    cardFixture.componentRef.setInput('mode', 'consultation');
    cardFixture.componentRef.setInput('conditions', 'Après le premier déplacement');
    cardFixture.detectChanges();
    const element = cardFixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Après le premier déplacement');
    expect(element.querySelector('.hero-power-card__close')).toBeNull();
  });

  it('affiche Utiliser uniquement pour une action volontaire et respecte son indisponibilité', () => {
    const cardFixture = TestBed.createComponent(HeroPowerCard);
    cardFixture.componentRef.setInput('hero', fixture.componentInstance.hero);
    cardFixture.componentRef.setInput('power', fixture.componentInstance.power);
    cardFixture.componentRef.setInput('mode', 'consultation');
    cardFixture.componentRef.setInput('showConsultationAction', true);
    cardFixture.componentRef.setInput('activationUnavailableReason', 'Le joueur actif doit avoir la main.');
    cardFixture.detectChanges();

    const element = cardFixture.nativeElement as HTMLElement;
    const button = element.querySelector('.hero-power-card__activate') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(element.textContent).toContain('Le joueur actif doit avoir la main.');

    let activationCount = 0;
    cardFixture.componentInstance.activationRequested.subscribe(() => activationCount++);
    cardFixture.componentRef.setInput('canActivate', true);
    cardFixture.detectChanges();
    (element.querySelector('.hero-power-card__activate') as HTMLButtonElement).click();
    expect(activationCount).toBe(1);
  });

  it('présente deux choix directs sans ajouter de confirmation', () => {
    const cardFixture = TestBed.createComponent(HeroPowerCard);
    cardFixture.componentRef.setInput('hero', fixture.componentInstance.hero);
    cardFixture.componentRef.setInput('power', fixture.componentInstance.power);
    cardFixture.componentRef.setInput('mode', 'choice');
    cardFixture.componentRef.setInput('choices', [
      { label: 'Jeton A', image: '/a.png', alt: 'Jeton A' },
      { label: 'Jeton B', image: '/b.png', alt: 'Jeton B' },
    ]);
    cardFixture.detectChanges();
    const buttons = cardFixture.nativeElement.querySelectorAll('.hero-power-card__choice');
    expect(buttons).toHaveLength(2);
    expect(cardFixture.nativeElement.querySelector('.hero-power-card__activate')).toBeNull();
    expect(cardFixture.nativeElement.querySelector('.hero-power-card__decline')).toBeNull();
  });

  it('expose uniquement l’annulation lorsque la sélection est facultative', () => {
    const cardFixture = TestBed.createComponent(HeroPowerCard);
    cardFixture.componentRef.setInput('hero', fixture.componentInstance.hero);
    cardFixture.componentRef.setInput('power', fixture.componentInstance.power);
    cardFixture.componentRef.setInput('mode', 'choice');
    cardFixture.componentRef.setInput('choices', fixture.componentInstance.choices);
    cardFixture.componentRef.setInput('choiceCancelable', true);
    cardFixture.detectChanges();
    const cancel = cardFixture.nativeElement.querySelector('.hero-power-card__decline') as HTMLButtonElement;
    expect(cancel?.textContent).toContain('Annuler');
    cancel.click();
    expect(cardFixture.componentInstance.choiceCancelled.emit).toBeDefined();
  });
});
