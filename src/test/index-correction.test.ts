import { describe, expect, it } from 'vitest';
import { calculateIndexCorrection, correctionReferenceMonths } from '@/lib/finance/index-correction';
import { lateCharges } from '@/lib/finance/revenue';

describe('Correção monetária de contratos', () => {
  it('detecta índice IPCA de outubro não publicado em 11/11 e não considera a ausência como 0%', () => {
    const result = calculateIndexCorrection('2026-10-10', '2026-11-11', [
      { month: '2026-09', rate: 0.50 },
    ]);
    expect(result.missing).toEqual(['2026-10']);
    expect(result.months).toEqual([]);
  });

  it('aplica outubro quando o índice oficial estiver publicado', () => {
    const result = calculateIndexCorrection('2026-10-10', '2026-11-11', [
      { month: '2026-09', rate: 0.30 },
      { month: '2026-10', rate: 0.50 },
    ]);
    expect(result.missing).toEqual([]);
    expect(result.rate).toBeCloseTo(0.50);
    expect(lateCharges(30000, '2026-10-10', '2026-11-11', 2, 10, result.rate)).toEqual({
      days: 32, interestCents: 640, fineCents: 3000, correctionCents: 150, total: 33790,
    });
  });

  it('compõe taxas de várias competências sem somá-las linearmente', () => {
    const result = calculateIndexCorrection('2026-09-10', '2026-11-11', [
      { month: '2026-09', rate: 1 },
      { month: '2026-10', rate: 2 },
    ]);
    expect(result.missing).toEqual([]);
    expect(result.rate).toBeCloseTo(3.02);
  });

  it('não inventa valor para competência intermediária ausente', () => {
    const result = calculateIndexCorrection('2026-08-10', '2026-11-11', [
      { month: '2026-08', rate: 1 },
      { month: '2026-10', rate: 2 },
    ]);
    expect(result.missing).toEqual(['2026-09']);
  });

  it('preserva correção negativa para deflação publicada', () => {
    const result = calculateIndexCorrection('2026-10-10', '2026-11-11', [
      { month: '2026-10', rate: -0.2 },
    ]);
    expect(result.rate).toBeCloseTo(-0.2);
  });

  it('não aplica correção antes do vencimento ou no mesmo mês de referência', () => {
    expect(correctionReferenceMonths('2026-11-10', '2026-11-09')).toEqual([]);
    expect(correctionReferenceMonths('2026-11-10', '2026-11-20')).toEqual([]);
  });

  it('lida com a virada do ano', () => {
    expect(correctionReferenceMonths('2026-12-10', '2027-02-10')).toEqual([
      '2026-12', '2027-01',
    ]);
  });
});
