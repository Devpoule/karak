import {
  Component,
  effect,
  OnDestroy,
  signal,
} from '@angular/core';

import { getHeroDefinition } from '../../data/hero-definitions';
import {
  CombatOutcome,
  CombatResult,
  CombatService,
  PendingCombat,
} from '../../services/combat.service';
import { GameService } from '../../services/game.service';


/**
 * Étapes purement visuelles d'un combat.
 *
 * Le moteur de jeu reste responsable du calcul réel du combat.
 *
 * L'overlay ne fait que présenter successivement :
 *
 * - l'arrivée des deux combattants ;
 * - le face-à-face ;
 * - le déclenchement du lancer ;
 * - l'animation des dés ;
 * - le résultat.
 */
type CombatPresentationState =
  | 'intro'
  | 'ready'
  | 'rolling'
  | 'result';


@Component({
  selector: 'app-combat-overlay',
  imports: [],
  templateUrl: './combat-overlay.html',
  styleUrl: './combat-overlay.scss',
})
export class CombatOverlay implements OnDestroy {

  /**
   * Étape actuellement affichée par l'interface.
   */
  readonly presentationState =
    signal<CombatPresentationState>('intro');


  /**
   * Valeurs actuellement visibles sur les dés.
   *
   * Pendant l'animation, ces valeurs sont purement visuelles.
   *
   * À la fin du lancer, elles sont remplacées par les véritables
   * valeurs déterminées par CombatService.
   */
  readonly displayedDice = signal({
    die1: 1,
    die2: 1,
  });


  /**
   * Combat conservé localement par l'overlay.
   *
   * CombatService supprime son pendingCombat dès que le combat
   * est résolu.
   *
   * L'interface doit néanmoins conserver les combattants à l'écran
   * pendant toute l'animation du résultat.
   */
  readonly presentedCombat =
    signal<PendingCombat | null>(null);


  /**
   * Résultat conservé localement le temps de sa présentation.
   */
  readonly presentedResult =
    signal<CombatResult | null>(null);


  /**
   * Référence du combat déjà pris en charge.
   *
   * Elle évite de relancer l'introduction lorsqu'un signal Angular
   * provoque une nouvelle évaluation de l'effet.
   */
  private trackedCombat: PendingCombat | null = null;


  /**
   * Timers utilisés par la présentation.
   *
   * Ils sont tous supprimés à la destruction du composant afin
   * d'éviter qu'une animation ancienne modifie un nouvel état.
   */
  private readonly timers: number[] = [];


  /**
   * Durée totale avant que l'action de lancer les dés soit proposée.
   *
   * Cette durée laisse volontairement respirer :
   *
   * - l'arrivée du héros ;
   * - l'arrivée du monstre ;
   * - l'impact du VS.
   */
  private readonly introDuration = 1900;


  constructor(
    private readonly combatService: CombatService,
    private readonly gameService: GameService,
  ) {
    /**
     * L'overlay observe uniquement l'apparition d'un nouveau combat.
     *
     * Il ne décide pas qu'un combat doit avoir lieu :
     * cette responsabilité appartient toujours au moteur de jeu.
     */
    effect(() => {
      const combat = this.combatService.pendingCombat();

      if (!combat || combat === this.trackedCombat) {
        return;
      }

      this.startPresentation(combat);
    });
  }


  /**
   * Combat actuellement présenté.
   */
  get combat(): PendingCombat | null {
    return this.presentedCombat();
  }


  /**
   * Résultat actuellement présenté.
   */
  get result(): CombatResult | null {
    return this.presentedResult();
  }


  /**
   * Le lancer manuel n'est disponible que pour un joueur humain
   * et uniquement lorsque l'introduction est terminée.
   */
  get canRoll(): boolean {
    return (
      this.presentationState() === 'ready'
      && this.combat?.player.controller === 'human'
    );
  }


  /**
   * Indique que les dés sont actuellement en mouvement.
   */
  get isRolling(): boolean {
    return this.presentationState() === 'rolling';
  }


  /**
   * Indique que le verdict peut être affiché.
   */
  get isResultVisible(): boolean {
    return (
      this.presentationState() === 'result'
      && this.result !== null
    );
  }


  /**
   * Carte du héros.
   *
   * Il s'agit volontairement du même asset que celui utilisé
   * dans HeroPanel.
   *
   * Le battle ne doit plus utiliser le pion directionnel du plateau.
   */
  getHeroImage(): string | undefined {
    const player =
      this.combat?.player
      ?? this.result?.player;

    if (!player?.heroId) {
      return undefined;
    }

    return getHeroDefinition(player.heroId)?.character;
  }


  /**
   * Lance réellement le combat.
   *
   * CombatService calcule immédiatement le résultat réel.
   *
   * Celui-ci est ensuite conservé par l'overlay pendant que
   * l'animation fait défiler des valeurs intermédiaires.
   *
   * Le hasard visuel n'a donc aucune incidence sur le gameplay.
   */
  resolveCombat(): void {
    if (!this.canRoll) {
      return;
    }

    const result =
      this.combatService.resolvePendingCombat();

    if (!result) {
      return;
    }

    this.presentedResult.set(result);
    this.presentationState.set('rolling');

    this.animateDice(result);
  }


  /**
   * Ferme le résultat du combat.
   */
  dismissResult(): void {
    this.clearTimers();

    this.combatService.clearLastCombatResult();

    this.presentedCombat.set(null);
    this.presentedResult.set(null);
    this.presentationState.set('intro');

    this.trackedCombat = null;
  }


  /**
   * Libellé du verdict.
   */
  getOutcomeLabel(outcome: CombatOutcome): string {
    switch (outcome) {
      case 'victory':
        return 'Victoire';

      case 'tie':
        return 'Égalité';

      case 'defeat':
        return 'Défaite';
    }
  }


  /**
   * Initialise la présentation d'un nouveau combat.
   */
  private startPresentation(combat: PendingCombat): void {
    this.clearTimers();

    this.trackedCombat = combat;

    this.presentedCombat.set(combat);
    this.presentedResult.set(null);

    this.displayedDice.set({
      die1: this.randomDie(),
      die2: this.randomDie(),
    });

    this.presentationState.set('intro');

    /**
     * Une fois l'introduction terminée, le joueur humain
     * peut déclencher son lancer.
     *
     * L'IA reste volontairement sous le contrôle de AiService.
     * CombatOverlay ne doit pas devenir un second moteur de jeu.
     */
    this.schedule(() => {
      if (
        this.presentedCombat() === combat
        && combat.player.controller === 'human'
      ) {
        this.presentationState.set('ready');
      }
    }, this.introDuration);
  }


  /**
   * Anime les dés avec le même principe que le tirage du
   * premier joueur :
   *
   * - changements rapides au départ ;
   * - ralentissement progressif ;
   * - arrêt sur les véritables valeurs du combat.
   */
  private animateDice(result: CombatResult): void {
    const speeds = [
      70,
      70,
      80,
      90,
      105,
      125,
      150,
      180,
      215,
      260,
      315,
    ];

    let elapsed = 0;

    for (const speed of speeds) {
      elapsed += speed;

      this.schedule(() => {
        this.displayedDice.set({
          die1: this.randomDie(),
          die2: this.randomDie(),
        });
      }, elapsed);
    }

    /**
     * Les dés s'arrêtent exactement sur les valeurs calculées
     * par CombatService.
     */
    elapsed += 180;

    this.schedule(() => {
      this.displayedDice.set({
        die1: result.die1,
        die2: result.die2,
      });
    }, elapsed);

    /**
     * Un court silence visuel laisse le joueur lire les dés
     * avant l'apparition du verdict.
     */
    elapsed += 650;

    this.schedule(() => {
      this.presentationState.set('result');

      /**
       * Le combat étant désormais entièrement résolu et présenté,
       * le moteur peut transmettre la main.
       *
       * Le snapshot local permet de conserver l'écran de résultat
       * jusqu'à ce que le joueur clique sur Continuer.
       */
      this.gameService.endTurn();
    }, elapsed);
  }


  /**
   * Retourne une face de dé purement visuelle.
   */
  private randomDie(): number {
    return Math.floor(Math.random() * 6) + 1;
  }


  /**
   * Programme une étape de présentation.
   */
  private schedule(
    callback: () => void,
    delay: number,
  ): void {
    const timer = window.setTimeout(
      callback,
      delay,
    );

    this.timers.push(timer);
  }


  /**
   * Supprime tous les timers encore enregistrés.
   */
  private clearTimers(): void {
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }

    this.timers.length = 0;
  }


  ngOnDestroy(): void {
    this.clearTimers();
  }
}