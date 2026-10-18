import { Pipe, PipeTransform } from '@angular/core';

const FRENCH_NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');

/**
 * Formate une quantité avec son libellé au singulier ou au pluriel.
 *
 * La règle d'affichage de Karak considère 0 et 1 comme singuliers.
 * Les deux formes sont obligatoires afin de ne pas déduire abusivement
 * un pluriel en ajoutant simplement un « s ».
 */
@Pipe({
  name: 'quantity',
  standalone: true,
})
export class QuantityPipe implements PipeTransform {
/** Gere transform et applique les gardes necessaires avant mutation. */
/** Gere transform et applique les gardes necessaires avant mutation. */
  transform(
    value: number | null | undefined,
    singular: string,
    plural: string,
    separator = ' ',
  ): string {
    const quantity = typeof value === 'number' && Number.isFinite(value)
      ? value
      : 0;
    const label = quantity >= 0 && quantity <= 1 ? singular : plural;

    return `${FRENCH_NUMBER_FORMATTER.format(quantity)}${separator}${label}`;
  }
}
