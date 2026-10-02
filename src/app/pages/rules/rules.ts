import { Component } from '@angular/core';
import { GameHeader } from '../../components/game-header/game-header';

@Component({
  selector: 'app-rules',
  imports: [GameHeader],
  templateUrl: './rules.html',
  styleUrl: './rules.scss',
})
export class Rules {
  readonly totalPages = 8;

  currentPage = 1;

  get currentPageImage(): string {
    const page = this.currentPage.toString().padStart(2, '0');

    return `/assets/rules/karak_base_${page}.jpg`;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}