import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HeroDefinition, HeroPowerDefinition } from '../../models/hero';

export interface HeroPowerCardChoice {
  readonly label: string;
  readonly image: string;
  readonly alt: string;
}

/** Carte cinématique présentant une décision facultative déjà ouverte par le moteur. */
@Component({
  selector: 'app-hero-power-card',
  standalone: true,
  templateUrl: './hero-power-card.html',
  styleUrl: './hero-power-card.scss',
})
export class HeroPowerCard {
  /** Contexte visuel de la carte : choix, annonce métier ou consultation. */
  @Input() mode: 'decision' | 'choice' | 'announcement' | 'consultation' = 'decision';

  /** Rend la carte dans le rectangle d'une carte de combattant existante. */
  @Input() embedded = false;

  /** Héros dont le pouvoir est actuellement proposé. */
  @Input({ required: true }) hero!: HeroDefinition;

  /** Pouvoir autorisé par les gardes métier du parcours courant. */
  @Input({ required: true }) power!: HeroPowerDefinition;

  /** Libellé de l’action principale, conservé personnalisable pour les relances. */
  @Input() activateLabel = 'Utiliser le pouvoir';

  /** Masque les actions lorsque le moteur présente une décision déjà pilotée par l’IA. */
  @Input() showActions = true;

  /** Message contextualisé d’une activation déjà confirmée. */
  @Input() message = '';

  /** Conditions détaillées affichées uniquement dans le mode consultation. */
  @Input() conditions = '';

  /** Affiche l'action métier volontaire dans la fiche descriptive. */
  @Input() showConsultationAction = false;

  /** Indique si l'action volontaire peut être lancée au moment du rendu. */
  @Input() canActivate = false;

  /** Motif court présenté lorsque l'action volontaire est indisponible. */
  @Input() activationUnavailableReason = '';

  /** Choix directs affichés dans le mode obligatoire multi-options. */
  @Input() choices: readonly HeroPowerCardChoice[] = [];

  /** Autorise l'annulation d'une sélection facultative, comme Substitution. */
  @Input() choiceCancelable = false;

  /** Émet l’acceptation, sans appeler directement le domaine. */
  @Output() activated = new EventEmitter<void>();

  /** Émet le refus, sans modifier l’état métier dans le composant visuel. */
  @Output() declined = new EventEmitter<void>();

  /** Ferme une carte de consultation ou une annonce terminée. */
  @Output() closed = new EventEmitter<void>();

  /** Émet l’index du choix sélectionné sans appeler le domaine. */
  @Output() choiceSelected = new EventEmitter<number>();

  /** Émet l'annulation d'une sélection lorsque le domaine l'autorise. */
  @Output() choiceCancelled = new EventEmitter<void>();

  /** Demande au parent de revalider puis de lancer l'action métier. */
  @Output() activationRequested = new EventEmitter<void>();
}
