import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioService } from './audio.service';
import { TOAST_LABELS, ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('centralise les notifications d équipements avec leur quantité exacte', () => {
    expect(TOAST_LABELS.equipment('daggers')).toBe('+2 Poignards');
    expect(TOAST_LABELS.equipment('sword')).toBe('+1 Épée');
    expect(TOAST_LABELS.equipment('axe')).toBe('+1 Hache');
    expect(TOAST_LABELS.equipment('key')).toBe('+1 Clé');
    expect(TOAST_LABELS.equipment('fire-sword')).toBe('+1 Épée de feu');
    expect(TOAST_LABELS.equipment('heart')).toBe('+1 Sort de soin');
    expect(TOAST_LABELS.key()).toBe('+1 Clé');
    expect(TOAST_LABELS.treasure()).toBe('+1 Trésor');
    expect(TOAST_LABELS.treasure(2)).toBe('+2 Trésors');
    expect(TOAST_LABELS.cursed()).toBe('Malédiction');
    expect(TOAST_LABELS.lifeMax()).toBe('PV au max');
    expect(TOAST_LABELS.damage(2)).toBe('−2 PV');
    expect(TOAST_LABELS.healing()).toBe('+1 PV');
    expect(TOAST_LABELS.defeat()).toBe('−1 PV');
  });

  it('prolonge la durée d’affichage de moitié avant le fondu de sortie', () => {
    const service = new ToastService();
    service.show('Notification courte');

    vi.advanceTimersByTime(6600);
    expect(service.current()).not.toBeNull();
    expect(service.isDismissing()).toBe(true);

    vi.advanceTimersByTime(300);
    expect(service.current()).toBeNull();
  });

  it('affiche le toast suivant après la disparition complète du précédent', () => {
    const service = new ToastService();
    service.show('Premier message');
    service.show('Second message');

    vi.advanceTimersByTime(6600 + 300);

    expect(service.current()?.text).toBe('Second message');
    expect(service.isDismissing()).toBe(false);
  });

  it('affiche immédiatement un résultat de combat sans attendre la FIFO', () => {
    const service = new ToastService();
    service.show('Ancienne information');
    service.show('Victoire !', 'success', undefined, {
      context: 'combat',
      priority: 'critical',
    });

    expect(service.current()?.text).toBe('Victoire !');
    expect(service.current()?.context).toBe('combat');
  });

  it('supprime les résultats de combat devenus obsolètes au début du combat suivant', () => {
    const service = new ToastService();
    service.show('Victoire précédente', 'success', undefined, {
      context: 'combat',
      priority: 'critical',
    });

    service.cancelContext('combat');

    expect(service.current()).toBeNull();
    expect(service.history().map(message => message.text)).toEqual(['Victoire précédente']);
  });

  it('synchronise le son avec l affichage initial puis avec chaque toast sorti de la file', () => {
    const audio = { play: vi.fn() } as unknown as AudioService;
    const service = new ToastService(audio);

    service.show('Premier message', 'info', undefined, { audioCue: 'AXE_ACQUIRED' });
    service.show('Second message', 'info', undefined, { audioCue: 'SWORD_ACQUIRED' });

    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.play).toHaveBeenNthCalledWith(1, 'AXE_ACQUIRED');

    vi.advanceTimersByTime(6600 + 300);

    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.play).toHaveBeenNthCalledWith(2, 'SWORD_ACQUIRED');
  });

  it('n emet aucun bip generique pour une notification sans bruitage dedie', () => {
    const audio = { play: vi.fn() } as unknown as AudioService;
    const service = new ToastService(audio);

    service.show('Notification informative');

    expect(audio.play).not.toHaveBeenCalled();
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

  it('conserve les metadonnees visuelles du heros et du type d evenement', () => {
    const service = new ToastService();

    service.show(
      'Aderyn perd 1 point de vie.',
      'combat',
      { playerIndex: 0, anchor: 'inventory-top' },
      { eventType: 'life-loss', heroId: 'aderyn', icon: '♥', duration: 1200 },
    );

    expect(service.current()).toMatchObject({
      heroId: 'aderyn',
      eventType: 'life-loss',
      icon: '♥',
      duration: 1200,
      target: { playerIndex: 0, anchor: 'inventory-top' },
    });
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
