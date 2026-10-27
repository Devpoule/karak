import { describe, expect, it, vi } from 'vitest';

import { TokenBagService } from './token-bag.service';

describe('TokenBagService', () => {
  it('remélange le sachet lorsqu’un token refusé y est replacé', () => {
    const tokenBagService = new TokenBagService();
    tokenBagService.initialize();
    const returnedToken = tokenBagService.draw();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(returnedToken).toBeDefined();
    tokenBagService.returnToken(returnedToken!.id);

    expect(randomSpy).toHaveBeenCalled();
    expect(tokenBagService.remainingTokens()).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('conserve le nombre de jetons aprÃ¨s deux tirages et le retour d’un seul', () => {
    const tokenBagService = new TokenBagService();
    tokenBagService.initialize();
    const initialCount = tokenBagService.remainingTokens();
    const first = tokenBagService.draw();
    const second = tokenBagService.draw();

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(tokenBagService.remainingTokens()).toBe(initialCount - 2);

    tokenBagService.returnToken(first!.id);

    expect(tokenBagService.remainingTokens()).toBe(initialCount - 1);
  });

  it('remplace un monstre interdit par chacun des monstres autorisés selon le tirage', () => {
    const tokenBagService = new TokenBagService();
    const allowed = ['giant-spider', 'giant-rat'] as const;

    tokenBagService.restore(['giant-rat']);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(tokenBagService.drawWithMonsterRestriction(allowed)?.id).toBe('giant-spider');

    vi.restoreAllMocks();
    tokenBagService.restore(['giant-rat']);
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(tokenBagService.drawWithMonsterRestriction(allowed)?.id).toBe('giant-rat');

    vi.restoreAllMocks();
  });

  it('conserve les objets tirés sans les remplacer', () => {
    const tokenBagService = new TokenBagService();
    tokenBagService.restore(['closed-chest']);

    expect(tokenBagService.drawWithMonsterRestriction(['giant-spider', 'giant-rat'])?.id)
      .toBe('closed-chest');
  });
});
