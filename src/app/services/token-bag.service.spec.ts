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
});
