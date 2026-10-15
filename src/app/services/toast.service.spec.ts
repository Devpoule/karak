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
});
