import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Board } from '../../components/board/board';
import { GameHeader } from '../../components/game-header/game-header';
import { PlayerHud } from '../../components/player-hud/player-hud';
import { TutorialChecklist } from '../../components/tutorial-checklist/tutorial-checklist';
import { TutorialHelp } from '../../components/tutorial-help/tutorial-help';
import { TutorialSessionService } from '../../services/tutorial-session.service';
import { AudioService } from '../../services/audio.service';

/** Page autonome du didacticiel jouable. */
@Component({
  selector: 'app-tutorial',
  imports: [Board, GameHeader, PlayerHud, TutorialChecklist, TutorialHelp],
  templateUrl: './tutorial.html',
  styleUrl: './tutorial.scss',
})
export class Tutorial implements OnInit, OnDestroy {
  readonly isCompactChecklist = signal(false);
  private compactChecklistQuery: MediaQueryList | null = null;
  private readonly syncCompactChecklist = (): void => {
    this.isCompactChecklist.set(this.compactChecklistQuery?.matches ?? false);
  };

  constructor(
    readonly session: TutorialSessionService,
    private readonly router: Router,
    private readonly audioService: AudioService,
  ) {}

  ngOnInit(): void {
    this.compactChecklistQuery = window.matchMedia('(max-width: 899px)');
    this.syncCompactChecklist();
    this.compactChecklistQuery.addEventListener('change', this.syncCompactChecklist);
    this.audioService.playGameplayTransition();
    this.session.initialize();
  }

  ngOnDestroy(): void {
    this.compactChecklistQuery?.removeEventListener('change', this.syncCompactChecklist);
    this.session.reset();
  }

  leaveTutorial(): void {
    this.session.reset();
    void this.router.navigateByUrl('/');
  }

  playNormalGame(): void {
    this.session.reset();
    void this.router.navigateByUrl('/play');
  }
}

