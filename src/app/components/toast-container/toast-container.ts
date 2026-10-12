import { Component } from '@angular/core';
import { ToastService } from '../../services/toast.service';

/** Affichage commun des notifications du jeu. */
@Component({
  selector: 'app-toast-container',
  imports: [],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss',
})
export class ToastContainer {
  constructor(readonly toastService: ToastService) {}
}
