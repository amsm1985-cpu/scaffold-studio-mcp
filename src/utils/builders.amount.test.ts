/**
 * Round-trip tests for formatTokenAmount and parseTokenAmount
 *
 * Verifies bidirectional conversion between human-readable strings
 * and Soroban contract integer string amounts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatTokenAmount, parseTokenAmount } from './builders.js';

describe('Token Amount Conversion Round-trips', () => {
  it('round-trips whole numbers with standard 7 decimals', () => {
    const testCases = ['1', '10', '100', '5000', '1000000'];
    for (const human of testCases) {
      const contract = formatTokenAmount(human, 7);
      const reconstructed = parseTokenAmount(contract, 7);
      assert.strictEqual(reconstructed, human, `Failed round-trip for ${human}`);
    }
  });

  it('round-trips fractional amounts up to 7 decimals', () => {
    const testCases = [
      '0.1',
      '0.01',
      '0.001',
      '0.0001',
      '0.00001',
      '0.000001',
      '0.0000001',
      '12.34567',
      '999.1234567',
    ];
    for (const human of testCases) {
      const contract = formatTokenAmount(human, 7);
      const reconstructed = parseTokenAmount(contract, 7);
      assert.strictEqual(reconstructed, human, `Failed fractional round-trip for ${human}`);
    }
  });

  it('round-trips with 0 decimals', () => {
    const testCases = ['0', '1', '50', '123456'];
    for (const human of testCases) {
      const contract = formatTokenAmount(human, 0);
      const reconstructed = parseTokenAmount(contract, 0);
      assert.strictEqual(reconstructed, human, `Failed 0-decimal round-trip for ${human}`);
    }
  });

  it('handles zero and edge contract representations', () => {
    // Zero in contract form returns "0"
    const parsedZero = parseTokenAmount('0', 7);
    assert.strictEqual(parsedZero, '0');

    // Trailing-zero contract case: 1000000000 = 100 * 10^7
    const parsedTrailing = parseTokenAmount('1000000000', 7);
    assert.strictEqual(parsedTrailing, '100');
  });

  it('throws on non-numeric amount inputs', () => {
    assert.throws(
      () => formatTokenAmount('invalid', 7),
      /Invalid amount: invalid/
    );
    assert.throws(
      () => formatTokenAmount('abc', 7),
      /Invalid amount: abc/
    );
    assert.throws(
      () => formatTokenAmount('', 7),
      /Invalid amount:/
    );
  });

  /**
   * Floating-Point Precision Boundary Documentation:
   *
   * formatTokenAmount relies on JavaScript parseFloat(amount) and Math.floor(value * 10^decimals).
   * JavaScript IEEE-754 double precision maintains 53 bits of precision (~15-17 significant digits).
   *
   * For decimals = 7, the maximum safe integer is Number.MAX_SAFE_INTEGER (9,007,199,254,740,991).
   * Beyond Math.floor(Number.MAX_SAFE_INTEGER / 10^7) = 900,719,925, float multiplication
   * begins to experience sub-cent / low-digit rounding distortion.
   */
  it('asserts and documents largest safely-representable amount without float distortion', () => {
    const decimals = 7;
    const maxSafeWholeAmount = Math.floor(Number.MAX_SAFE_INTEGER / Math.pow(10, decimals)); // 900719925
    const human = maxSafeWholeAmount.toString();
    const contract = formatTokenAmount(human, decimals);
    const reconstructed = parseTokenAmount(contract, decimals);

    assert.strictEqual(reconstructed, human, `Safe integer ceiling ${human} must round-trip exactly`);
    assert.strictEqual(contract, (BigInt(maxSafeWholeAmount) * BigInt(10 ** decimals)).toString());
  });
});
