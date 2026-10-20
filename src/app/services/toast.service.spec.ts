import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('réduit la durée d’affichage d’un tiers avant le fondu de sortie', () => {
    const service = new ToastService();
    service.show('Notification courte');

    vi.advanceTimersByTime(2934);
    expect(service.current()).not.toBeNull();
    expect(service.isDismissing()).toBe(true);

    vi.advanceTimersByTime(300);
    expect(service.current()).toBeNull();
  });

  it('affiche le toast suivant après la disparition complète du précédent', () => {
    const service = new ToastService();
    service.show('Premier message');
    service.show('Second message');

    vi.advanceTimersByTime(2934 + 300);

    expect(service.current()?.text).toBe('Second message');
    expect(service.isDismissing()).toBe(false);
  });

  it('conserve les notifications acceptées dans leur ordre d apparition', () => {
    const service = new ToastService();

    service.show('Premier message');
    service.show('Second message', 'success');

    expect(service.history().map(message => message.text)).toEqual([
      'Premier message',
      'Second message',
    ]);
    expect(service.history()[1]?.tone).toBe('success');
  });

  it('ignore les doublons comme la file de notifications et ne les historise pas', () => {
    const service = new ToastService();

    service.show('Événement répété');
    service.show('Événement répété');

    expect(service.history()).toHaveLength(1);
  });

  it('limite et réinitialise l historique pour préserver la session courante', () => {
    const service = new ToastService();

    for (let index = 1; index <= 55; index++) service.show(`Événement ${index}`);

    expect(service.history()).toHaveLength(50);
    expect(service.history()[0]?.text).toBe('Événement 6');

    service.clearHistory();
    expect(service.history()).toEqual([]);
  });
});
