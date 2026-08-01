import { RespondentData } from '../types';
import { generateDefaultOHIS } from './surveyEngine';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Types for Bivariate Analysis
export interface ContingencyCell {
  observed: number;
  expected: number;
  rowPct: number;
  colPct: number;
  totalPct: number;
}

export interface GroupMeanData {
  category: string;
  n: number;
  meanDMFT: number;
  sdDMFT: number;
  seDMFT: number;
  meanDeft: number;
  sdDeft: number;
  seDeft: number;
  meanOHIS: number;
  sdOHIS: number;
  seOHIS: number;
  meanDIS: number;
  sdDIS: number;
  seDIS: number;
  meanCIS: number;
  sdCIS: number;
  seCIS: number;
}

export interface BivariateResult {
  varXLabel: string;
  varYLabel: string;
  categoriesX: string[];
  categoriesY: string[];
  matrix: ContingencyCell[][]; // [row][col]
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
  
  // Statistical Test Results
  chiSquare: number;
  df: number;
  pValue: number;
  isSignificant: boolean; // p < 0.05
  
  // Additional Chi-Square Test Variants (SPSS Style)
  yatesChiSquare?: number; // Continuity Correction for 2x2
  yatesPValue?: number;
  likelihoodRatio?: number;
  likelihoodPValue?: number;
  fishersExactP2Tailed?: number;
  fishersExactP1Tailed?: number;

  // Risk measures for 2x2 tables
  is2x2: boolean;
  oddsRatio?: number;
  orCiLower?: number;
  orCiUpper?: number;
  relativeRisk?: number;
  rrCiLower?: number;
  rrCiUpper?: number;

  // Mean & SD breakdown for numerical variable comparisons
  groupMeans: GroupMeanData[];
  
  // T-Test / ANOVA result
  tTest?: {
    tValue: number;
    df: number;
    pValue: number;
    isSignificant: boolean;
    leveneF?: number;
    leveneP?: number;
    meanDiff?: number;
    seDiff?: number;
    ciLower?: number;
    ciUpper?: number;
  };

  // Mann-Whitney U Test (Non-parametric for 2 groups)
  mannWhitney?: {
    uValue: number;
    wilcoxonW: number;
    zValue: number;
    pValue: number;
    isSignificant: boolean;
  };

  narrativeInterpretation: string;
}

// Bivariate Correlation Pair Result
export interface CorrelationPair {
  var1Key: string;
  var1Label: string;
  var2Key: string;
  var2Label: string;
  n: number;
  pearsonR: number;
  pearsonP: number;
  pearsonSig: string; // '**', '*', or ''
  spearmanRho: number;
  spearmanP: number;
  spearmanSig: string;
}

export interface CorrelationMatrixResult {
  variables: { key: string; label: string }[];
  matrix: {
    var1Key: string;
    var2Key: string;
    pearsonR: number;
    pearsonP: number;
    spearmanRho: number;
    spearmanP: number;
    n: number;
  }[][];
  pairs: CorrelationPair[];
}

// Paired Test Result (Paired T-Test & Wilcoxon Signed-Rank Test)
export interface PairedTestItem {
  pairName: string;
  var1Label: string;
  var2Label: string;
  mean1: number;
  sd1: number;
  se1: number;
  mean2: number;
  sd2: number;
  se2: number;
  n: number;
  correlation: number;
  corrPValue: number;
  // Paired T-test
  meanDiff: number;
  sdDiff: number;
  seDiff: number;
  ciLowerDiff: number;
  ciUpperDiff: number;
  tValue: number;
  df: number;
  tPValue: number;
  tIsSig: boolean;
  // Wilcoxon Signed-Rank
  negRanksCount: number;
  negRanksMean: number;
  negRanksSum: number;
  posRanksCount: number;
  posRanksMean: number;
  posRanksSum: number;
  tiesCount: number;
  wilcoxonZ: number;
  wilcoxonPValue: number;
  wilcoxonIsSig: boolean;
}

// Math Helpers for Statistical Distributions
export function zToPValue(z: number): number {
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * absZ * absZ) / Math.sqrt(2 * Math.PI);
  const tail = pdf * poly;
  const pTwoTailed = 2 * tail;
  return Math.max(0.0001, Math.min(0.9999, pTwoTailed));
}

export function tToPValue(t: number, df: number): number {
  if (df <= 0 || isNaN(t)) return 1.0;
  const absT = Math.abs(t);
  // Wilson-Hilferty transformation approximation from t to z
  const z = absT * Math.sqrt((df - 0.5) / df) * (1 - 1 / (4 * df));
  return zToPValue(z);
}

// Chi-Square Cumulative Distribution Function (Wilson-Hilferty transformation approximation)
export function chiSquarePValue(chiSq: number, df: number): number {
  if (chiSq <= 0 || df < 1 || isNaN(chiSq)) return 1.0;
  
  const term1 = Math.pow(chiSq / df, 1 / 3);
  const term2 = 1 - 2 / (9 * df);
  const term3 = Math.sqrt(2 / (9 * df));
  const z = (term1 - term2) / term3;

  return zToPValue(z);
}

// Log Factorial for Exact Tests
function logFactorial(n: number): number {
  if (n <= 1) return 0;
  let logF = 0;
  for (let i = 2; i <= n; i++) logF += Math.log(i);
  return logF;
}

// Fisher's Exact Test for 2x2 Contingency Table
export function fishersExact2x2(a: number, b: number, c: number, d: number): { pExact2Tailed: number, pExact1Tailed: number } {
  const n = a + b + c + d;
  if (n === 0) return { pExact2Tailed: 1, pExact1Tailed: 1 };
  
  const r1 = a + b, r2 = c + d, c1 = a + c, c2 = b + d;

  const logHyper = (x: number) => {
    return logFactorial(r1) + logFactorial(r2) + logFactorial(c1) + logFactorial(c2) - logFactorial(n) - logFactorial(x) - logFactorial(r1 - x) - logFactorial(c1 - x) - logFactorial(r2 - c1 + x);
  };

  const pObserved = Math.exp(logHyper(a));
  const minA = Math.max(0, c1 - r2);
  const maxA = Math.min(r1, c1);

  let pSum2Tailed = 0;
  let pSum1Tailed = 0;

  for (let x = minA; x <= maxA; x++) {
    const pX = Math.exp(logHyper(x));
    if (pX <= pObserved + 1e-10) {
      pSum2Tailed += pX;
    }
    if ((a >= (r1 * c1) / n && x >= a) || (a < (r1 * c1) / n && x <= a)) {
      pSum1Tailed += pX;
    }
  }

  return {
    pExact2Tailed: Math.min(1, Math.max(0.0001, pSum2Tailed)),
    pExact1Tailed: Math.min(1, Math.max(0.0001, pSum1Tailed))
  };
}

// Calculate Bivariate Analysis for selected X and Y variables
export function calculateBivariateAnalysis(
  respondents: RespondentData[],
  varXKey: 'kelompokUmur' | 'jenisKelamin' | 'pendidikan' | 'pekerjaan' | 'kategoriOHIS',
  varYKey: 'statusKaries' | 'keparahanDMFT' | 'kategoriOHIS' | 'statusOHIS' | 'gusiBerdarah' | 'lesiMukosa' | 'rencanaRujukan' | 'perluPerawatanSegera'
): BivariateResult {
  // Label mappings
  const varXLabels: Record<string, string> = {
    kelompokUmur: 'Kelompok Umur (WHO)',
    jenisKelamin: 'Jenis Kelamin',
    pendidikan: 'Tingkat Pendidikan',
    pekerjaan: 'Sektor Pekerjaan',
    kategoriOHIS: 'Kategori OHI-S (Kebersihan Mulut)'
  };

  const varYLabels: Record<string, string> = {
    statusKaries: 'Status Karies (Karies vs Bebas)',
    keparahanDMFT: 'Keparahan WHO (Rendah vs Tinggi)',
    kategoriOHIS: 'Kebersihan Mulut OHI-S (Baik / Sedang / Buruk)',
    statusOHIS: 'Status OHI-S (Sedang/Buruk vs Baik)',
    gusiBerdarah: 'Gusi Berdarah (Gingival Bleeding)',
    lesiMukosa: 'Lesi Mukosa Oral',
    rencanaRujukan: 'Status Rujukan Faskes',
    perluPerawatanSegera: 'Kebutuhan Perawatan Segera (Urgent Treatment)'
  };

  // Helper to extract category values for X
  const getXValue = (r: RespondentData): string => {
    if (varXKey === 'kelompokUmur') {
      const ag = r.kelompokUmur;
      if (ag === '0-4' || ag === '5-11' || ag === '12-17' || ag === '18-59' || ag === '60+') return ag;
      if (ag === '5-10') return '5-11';
      if (ag === '10-18') return '12-17';
      if (ag === '18-60') return '18-59';
      if (typeof r.umur === 'number') {
        if (r.umur < 5) return '0-4';
        if (r.umur <= 11) return '5-11';
        if (r.umur <= 17) return '12-17';
        if (r.umur <= 59) return '18-59';
        return '60+';
      }
      return '18-59';
    }
    if (varXKey === 'jenisKelamin') return r.jenisKelamin || 'Tidak Terdata';
    if (varXKey === 'pendidikan') return r.pendidikan || 'Lainnya';
    if (varXKey === 'pekerjaan') return r.pekerjaan || 'Lainnya';
    if (varXKey === 'kategoriOHIS') {
      const ohis = r.ohis || generateDefaultOHIS(r);
      return ohis.kategori || 'Baik';
    }
    return 'Lainnya';
  };

  // Helper to extract category values for Y
  const getYValue = (r: RespondentData): string => {
    if (varYKey === 'statusKaries') {
      const hasCaries = (r.gigiTetap?.karies > 0 || r.gigiSulung?.karies > 0);
      return hasCaries ? 'Karies Aktif' : 'Bebas Karies';
    }
    if (varYKey === 'keparahanDMFT') {
      return (r.dmft || 0) >= 2.7 ? 'DMFT Tinggi (>=2.7)' : 'DMFT Rendah (<2.7)';
    }
    if (varYKey === 'kategoriOHIS') {
      const ohis = r.ohis || generateDefaultOHIS(r);
      return ohis.kategori || 'Baik';
    }
    if (varYKey === 'statusOHIS') {
      const ohis = r.ohis || generateDefaultOHIS(r);
      return (ohis.kategori === 'Buruk' || ohis.kategori === 'Sedang' || ohis.ohisScore > 1.2) ? 'OHI-S Sedang/Buruk (>1.2)' : 'OHI-S Baik (0.0-1.2)';
    }
    if (varYKey === 'gusiBerdarah') {
      return r.mukosa?.gusiBerdarah ? 'Gusi Berdarah' : 'Normal / Tidak Berdarah';
    }
    if (varYKey === 'lesiMukosa') {
      return r.mukosa?.lesiMukosaOral ? 'Ada Lesi Mukosa' : 'Normal / Tanpa Lesi';
    }
    if (varYKey === 'rencanaRujukan') {
      return (r.tindakLanjut?.dirujukKe && r.tindakLanjut.dirujukKe !== 'tidak_dirujuk') ? 'Memerlukan Rujukan' : 'Tidak Dirujuk';
    }
    if (varYKey === 'perluPerawatanSegera') {
      return r.tindakLanjut?.perluPerawatanSegera ? 'Perlu Perawatan Segera' : 'Perlu Perawatan Tidak Segera';
    }
    return 'Lainnya';
  };

  // Extract unique categories preserving logical order
  let categoriesX = Array.from(new Set(respondents.map(getXValue))).filter(Boolean);
  let categoriesY = Array.from(new Set(respondents.map(getYValue))).filter(Boolean);

  // Custom ordering for X
  if (varXKey === 'kelompokUmur') {
    const order = ['0-4', '5-11', '12-17', '18-59', '60+'];
    categoriesX.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  } else if (varXKey === 'jenisKelamin') {
    const order = ['Laki-laki', 'Perempuan'];
    categoriesX.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  } else if (varXKey === 'kategoriOHIS') {
    const order = ['Baik', 'Sedang', 'Buruk'];
    categoriesX.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  // Custom ordering for Y
  if (varYKey === 'statusKaries') {
    categoriesY = ['Karies Aktif', 'Bebas Karies'];
  } else if (varYKey === 'keparahanDMFT') {
    categoriesY = ['DMFT Tinggi (>=2.7)', 'DMFT Rendah (<2.7)'];
  } else if (varYKey === 'kategoriOHIS') {
    categoriesY = ['Baik', 'Sedang', 'Buruk'];
  } else if (varYKey === 'statusOHIS') {
    categoriesY = ['OHI-S Sedang/Buruk (>1.2)', 'OHI-S Baik (0.0-1.2)'];
  } else if (varYKey === 'gusiBerdarah') {
    categoriesY = ['Gusi Berdarah', 'Normal / Tidak Berdarah'];
  } else if (varYKey === 'lesiMukosa') {
    categoriesY = ['Ada Lesi Mukosa', 'Normal / Tanpa Lesi'];
  } else if (varYKey === 'rencanaRujukan') {
    categoriesY = ['Memerlukan Rujukan', 'Tidak Dirujuk'];
  } else if (varYKey === 'perluPerawatanSegera') {
    categoriesY = ['Perlu Perawatan Segera', 'Perlu Perawatan Tidak Segera'];
  }

  const grandTotal = respondents.length;

  // Initialize count matrix
  const counts: number[][] = categoriesX.map(() => categoriesY.map(() => 0));

  respondents.forEach(r => {
    const xVal = getXValue(r);
    const yVal = getYValue(r);
    const xIdx = categoriesX.indexOf(xVal);
    const yIdx = categoriesY.indexOf(yVal);
    if (xIdx !== -1 && yIdx !== -1) {
      counts[xIdx][yIdx]++;
    }
  });

  // Calculate row and column totals
  const rowTotals = categoriesX.map((_, rIdx) => counts[rIdx].reduce((a, b) => a + b, 0));
  const colTotals = categoriesY.map((_, cIdx) => categoriesX.reduce((acc, _, rIdx) => acc + counts[rIdx][cIdx], 0));

  // Construct contingency cells with Expected values & percentages
  const matrix: ContingencyCell[][] = categoriesX.map((_, rIdx) => {
    return categoriesY.map((_, cIdx) => {
      const observed = counts[rIdx][cIdx];
      const expected = grandTotal > 0 ? (rowTotals[rIdx] * colTotals[cIdx]) / grandTotal : 0;
      const rowPct = rowTotals[rIdx] > 0 ? (observed / rowTotals[rIdx]) * 100 : 0;
      const colPct = colTotals[cIdx] > 0 ? (observed / colTotals[cIdx]) * 100 : 0;
      const totalPct = grandTotal > 0 ? (observed / grandTotal) * 100 : 0;
      return { observed, expected, rowPct, colPct, totalPct };
    });
  });

  // Chi-square calculation
  let chiSquare = 0;
  categoriesX.forEach((_, rIdx) => {
    categoriesY.forEach((_, cIdx) => {
      const cell = matrix[rIdx][cIdx];
      if (cell.expected > 0) {
        chiSquare += Math.pow(cell.observed - cell.expected, 2) / cell.expected;
      }
    });
  });

  const df = Math.max(1, (categoriesX.length - 1) * (categoriesY.length - 1));
  const pValue = chiSquarePValue(chiSquare, df);
  const isSignificant = pValue < 0.05;

  // 2x2 Risk calculation flag
  const is2x2 = categoriesX.length === 2 && categoriesY.length === 2;

  // Additional Chi-Square Test Variants (Likelihood Ratio, Yates, Fisher's)
  let yatesChiSquare: number | undefined;
  let yatesPValue: number | undefined;
  let likelihoodRatio: number | undefined;
  let likelihoodPValue: number | undefined;
  let fishersExactP2Tailed: number | undefined;
  let fishersExactP1Tailed: number | undefined;

  let gSqSum = 0;
  categoriesX.forEach((_, rIdx) => {
    categoriesY.forEach((_, cIdx) => {
      const cell = matrix[rIdx][cIdx];
      if (cell.observed > 0 && cell.expected > 0) {
        gSqSum += cell.observed * Math.log(cell.observed / cell.expected);
      }
    });
  });
  likelihoodRatio = 2 * gSqSum;
  likelihoodPValue = chiSquarePValue(likelihoodRatio, df);

  if (is2x2) {
    const a = matrix[0][0].observed;
    const b = matrix[0][1].observed;
    const c = matrix[1][0].observed;
    const d = matrix[1][1].observed;

    // Yates Continuity Correction
    let yatesSum = 0;
    categoriesX.forEach((_, rIdx) => {
      categoriesY.forEach((_, cIdx) => {
        const cell = matrix[rIdx][cIdx];
        if (cell.expected > 0) {
          const diff = Math.max(0, Math.abs(cell.observed - cell.expected) - 0.5);
          yatesSum += Math.pow(diff, 2) / cell.expected;
        }
      });
    });
    yatesChiSquare = yatesSum;
    yatesPValue = chiSquarePValue(yatesChiSquare, 1);

    // Fisher's Exact Test
    const fe = fishersExact2x2(a, b, c, d);
    fishersExactP2Tailed = fe.pExact2Tailed;
    fishersExactP1Tailed = fe.pExact1Tailed;
  }

  // Odds Ratio & Relative Risk
  let oddsRatio: number | undefined;
  let orCiLower: number | undefined;
  let orCiUpper: number | undefined;
  let relativeRisk: number | undefined;
  let rrCiLower: number | undefined;
  let rrCiUpper: number | undefined;

  if (is2x2) {
    const a = matrix[0][0].observed; // Exposed / Risk + Outcome +
    const b = matrix[0][1].observed; // Exposed / Risk + Outcome -
    const c = matrix[1][0].observed; // Non-exposed / Risk - Outcome +
    const d = matrix[1][1].observed; // Non-exposed / Risk - Outcome -

    // Odds Ratio
    if (b > 0 && c > 0) {
      oddsRatio = (a * d) / (b * c);
      if (a > 0 && d > 0) {
        const seLnOR = Math.sqrt((1 / a) + (1 / b) + (1 / c) + (1 / d));
        orCiLower = Math.exp(Math.log(oddsRatio) - 1.96 * seLnOR);
        orCiUpper = Math.exp(Math.log(oddsRatio) + 1.96 * seLnOR);
      }
    }

    // Relative Risk
    const risk1 = (a + b) > 0 ? a / (a + b) : 0;
    const risk2 = (c + d) > 0 ? c / (c + d) : 0;
    if (risk2 > 0) {
      relativeRisk = risk1 / risk2;
      if (a > 0 && c > 0 && (a + b) > a && (c + d) > c) {
        const seLnRR = Math.sqrt((1 / a) - (1 / (a + b)) + (1 / c) - (1 / (c + d)));
        rrCiLower = Math.exp(Math.log(relativeRisk) - 1.96 * seLnRR);
        rrCiUpper = Math.exp(Math.log(relativeRisk) + 1.96 * seLnRR);
      }
    }
  }

  // Mean & SD & SE per group for continuous variables (DMF-T, deft, OHI-S)
  const groupMeans: GroupMeanData[] = categoriesX.map(cat => {
    const groupRespondents = respondents.filter(r => getXValue(r) === cat);
    const n = groupRespondents.length;
    
    // Mean & SD DMFT
    const dmftVals = groupRespondents.map(r => r.dmft || 0);
    const meanDMFT = n > 0 ? dmftVals.reduce((a, b) => a + b, 0) / n : 0;
    const varianceDMFT = n > 1 ? dmftVals.reduce((a, b) => a + Math.pow(b - meanDMFT, 2), 0) / (n - 1) : 0;
    const sdDMFT = Math.sqrt(varianceDMFT);
    const seDMFT = n > 0 ? sdDMFT / Math.sqrt(n) : 0;

    // Mean & SD deft
    const deftVals = groupRespondents.map(r => r.deft || 0);
    const meanDeft = n > 0 ? deftVals.reduce((a, b) => a + b, 0) / n : 0;
    const varianceDeft = n > 1 ? deftVals.reduce((a, b) => a + Math.pow(b - meanDeft, 2), 0) / (n - 1) : 0;
    const sdDeft = Math.sqrt(varianceDeft);
    const seDeft = n > 0 ? sdDeft / Math.sqrt(n) : 0;

    // Mean & SD OHI-S
    const ohisVals = groupRespondents.map(r => (r.ohis || generateDefaultOHIS(r)).ohisScore || 0);
    const meanOHIS = n > 0 ? ohisVals.reduce((a, b) => a + b, 0) / n : 0;
    const varianceOHIS = n > 1 ? ohisVals.reduce((a, b) => a + Math.pow(b - meanOHIS, 2), 0) / (n - 1) : 0;
    const sdOHIS = Math.sqrt(varianceOHIS);
    const seOHIS = n > 0 ? sdOHIS / Math.sqrt(n) : 0;

    // Mean & SD DI-S
    const disVals = groupRespondents.map(r => (r.ohis || generateDefaultOHIS(r)).disScore || 0);
    const meanDIS = n > 0 ? disVals.reduce((a, b) => a + b, 0) / n : 0;
    const sdDIS = Math.sqrt(n > 1 ? disVals.reduce((a, b) => a + Math.pow(b - meanDIS, 2), 0) / (n - 1) : 0);
    const seDIS = n > 0 ? sdDIS / Math.sqrt(n) : 0;

    // Mean & SD CI-S
    const cisVals = groupRespondents.map(r => (r.ohis || generateDefaultOHIS(r)).cisScore || 0);
    const meanCIS = n > 0 ? cisVals.reduce((a, b) => a + b, 0) / n : 0;
    const sdCIS = Math.sqrt(n > 1 ? cisVals.reduce((a, b) => a + Math.pow(b - meanCIS, 2), 0) / (n - 1) : 0);
    const seCIS = n > 0 ? sdCIS / Math.sqrt(n) : 0;

    return { category: cat, n, meanDMFT, sdDMFT, seDMFT, meanDeft, sdDeft, seDeft, meanOHIS, sdOHIS, seOHIS, meanDIS, sdDIS, seDIS, meanCIS, sdCIS, seCIS };
  });

  // T-Test & Mann-Whitney U calculation for 2 groups
  let tTest: BivariateResult['tTest'] | undefined;
  let mannWhitney: BivariateResult['mannWhitney'] | undefined;

  if (categoriesX.length === 2) {
    const cat1 = categoriesX[0];
    const cat2 = categoriesX[1];
    const g1 = groupMeans[0];
    const g2 = groupMeans[1];
    
    if (g1.n > 1 && g2.n > 1) {
      const meanDiff = g1.meanDMFT - g2.meanDMFT;
      const seDiff = Math.sqrt((Math.pow(g1.sdDMFT, 2) / g1.n) + (Math.pow(g2.sdDMFT, 2) / g2.n));
      
      if (seDiff > 0) {
        const tVal = meanDiff / seDiff;
        const num = Math.pow((Math.pow(g1.sdDMFT, 2) / g1.n) + (Math.pow(g2.sdDMFT, 2) / g2.n), 2);
        const den = (Math.pow(Math.pow(g1.sdDMFT, 2) / g1.n, 2) / (g1.n - 1)) + (Math.pow(Math.pow(g2.sdDMFT, 2) / g2.n, 2) / (g2.n - 1));
        const tDf = den > 0 ? Math.round(num / den) : (g1.n + g2.n - 2);
        const tPVal = tToPValue(tVal, tDf);

        // Approximate Levene's test for equality of variances
        const vRatio = Math.max(Math.pow(g1.sdDMFT, 2), Math.pow(g2.sdDMFT, 2)) / Math.max(0.001, Math.min(Math.pow(g1.sdDMFT, 2), Math.pow(g2.sdDMFT, 2)));
        const leveneP = chiSquarePValue(vRatio, 1);

        tTest = {
          tValue: Math.abs(tVal),
          df: tDf,
          pValue: tPVal,
          isSignificant: tPVal < 0.05,
          leveneF: vRatio,
          leveneP,
          meanDiff,
          seDiff,
          ciLower: meanDiff - 1.96 * seDiff,
          ciUpper: meanDiff + 1.96 * seDiff
        };
      }

      // Mann-Whitney U test calculation
      const respGroup1 = respondents.filter(r => getXValue(r) === cat1).map(r => r.dmft || 0);
      const respGroup2 = respondents.filter(r => getXValue(r) === cat2).map(r => r.dmft || 0);
      
      const pooled = [
        ...respGroup1.map(val => ({ val, group: 1 })),
        ...respGroup2.map(val => ({ val, group: 2 }))
      ].sort((a, b) => a.val - b.val);

      // Assign ranks with tie handling
      const ranked: { val: number; group: number; rank: number }[] = [];
      let i = 0;
      while (i < pooled.length) {
        let j = i;
        while (j < pooled.length && pooled[j].val === pooled[i].val) j++;
        const avgRank = (i + 1 + j) / 2;
        for (let k = i; k < j; k++) {
          ranked.push({ ...pooled[k], rank: avgRank });
        }
        i = j;
      }

      const r1 = ranked.filter(item => item.group === 1).reduce((acc, curr) => acc + curr.rank, 0);
      const u1 = (g1.n * g2.n) + ((g1.n * (g1.n + 1)) / 2) - r1;
      const u2 = (g1.n * g2.n) - u1;
      const uVal = Math.min(u1, u2);
      const wilcoxonW = r1;

      const meanU = (g1.n * g2.n) / 2;
      const varU = (g1.n * g2.n * (g1.n + g2.n + 1)) / 12;
      const zVal = varU > 0 ? (uVal - meanU) / Math.sqrt(varU) : 0;
      const mwPVal = zToPValue(zVal);

      mannWhitney = {
        uValue: uVal,
        wilcoxonW,
        zValue: Math.abs(zVal),
        pValue: mwPVal,
        isSignificant: mwPVal < 0.05
      };
    }
  }

  // Academic Narrative Interpretation
  const xLabel = varXLabels[varXKey];
  const yLabel = varYLabels[varYKey];
  const pFormatted = pValue < 0.001 ? '< 0.001' : `= ${pValue.toFixed(3)}`;

  let narrativeInterpretation = `Berdasarkan hasil analisis kuantitatif bivariat antara ${xLabel} dan ${yLabel}, diperoleh nilai Chi-Square (χ²) sebesar ${chiSquare.toFixed(3)} dengan derajat kebebasan (df) = ${df} dan asymp. sig (p-value) ${pFormatted}. `;

  if (isSignificant) {
    narrativeInterpretation += `Karena nilai p < 0.05, maka H₀ ditolak dan H₁ diterima. Secara statistik terdapat hubungan yang signifikan antara ${xLabel} dengan ${yLabel} pada sampel survey kesehatan gigi ini (N = ${grandTotal}).`;
    if (is2x2 && oddsRatio !== undefined) {
      narrativeInterpretation += ` Nilai Odds Ratio (OR) = ${oddsRatio.toFixed(2)} (${orCiLower && orCiUpper ? `95% CI: ${orCiLower.toFixed(2)} - ${orCiUpper.toFixed(2)}` : ''}), yang mengindikasikan kelompok ${categoriesX[0]} memiliki peluang ${oddsRatio.toFixed(2)} kali lebih besar mengalami ${categoriesY[0]} dibanding kelompok ${categoriesX[1]}.`;
    }
  } else {
    narrativeInterpretation += `Karena nilai p ≥ 0.05, maka H₀ diterima dan H₁ ditolak. Secara statistik tidak terdapat hubungan yang signifikan antara ${xLabel} dengan ${yLabel} pada populasi sampel yang diteliti (N = ${grandTotal}).`;
  }

  return {
    varXLabel: xLabel,
    varYLabel: yLabel,
    categoriesX,
    categoriesY,
    matrix,
    rowTotals,
    colTotals,
    grandTotal,
    chiSquare,
    df,
    pValue,
    isSignificant,
    yatesChiSquare,
    yatesPValue,
    likelihoodRatio,
    likelihoodPValue,
    fishersExactP2Tailed,
    fishersExactP1Tailed,
    is2x2,
    oddsRatio,
    orCiLower,
    orCiUpper,
    relativeRisk,
    rrCiLower,
    rrCiUpper,
    groupMeans,
    tTest,
    mannWhitney,
    narrativeInterpretation
  };
}

// Correlation Matrix Calculation (Pearson r & Spearman rho)
export function calculateCorrelationMatrix(respondents: RespondentData[]): CorrelationMatrixResult {
  const vars = [
    { key: 'umur', label: 'Umur Responden (Tahun)' },
    { key: 'dmft', label: 'Indeks DMF-T (Gigi Tetap)' },
    { key: 'deft', label: 'Indeks def-t (Gigi Sulung)' },
    { key: 'ohis', label: 'Indeks Kebersihan OHI-S' },
    { key: 'dis', label: 'Debris Index (DI-S)' },
    { key: 'cis', label: 'Calculus Index (CI-S)' },
    { key: 'kariesTotal', label: 'Jumlah Gigi Karies (d + D)' },
    { key: 'tumpatTotal', label: 'Jumlah Gigi Tumpat (f + F)' }
  ];

  const getNumVal = (r: RespondentData, key: string): number => {
    if (key === 'umur') return Number(r.umur) || 0;
    if (key === 'dmft') return Number(r.dmft) || 0;
    if (key === 'deft') return Number(r.deft) || 0;
    if (key === 'ohis') return Number((r.ohis || generateDefaultOHIS(r)).ohisScore) || 0;
    if (key === 'dis') return Number((r.ohis || generateDefaultOHIS(r)).disScore) || 0;
    if (key === 'cis') return Number((r.ohis || generateDefaultOHIS(r)).cisScore) || 0;
    if (key === 'kariesTotal') return (r.gigiTetap?.karies || 0) + (r.gigiSulung?.karies || 0);
    if (key === 'tumpatTotal') {
      const f1 = (r.gigiTetap?.tumpatanTanpaKaries || 0) + (r.gigiTetap?.tumpatanKaries || 0);
      const f2 = (r.gigiSulung?.tumpatanTanpaKaries || 0) + (r.gigiSulung?.tumpatanKaries || 0);
      return f1 + f2;
    }
    return 0;
  };

  const n = respondents.length;

  const pairs: CorrelationPair[] = [];
  const matrix = vars.map((v1, i) => {
    return vars.map((v2, j) => {
      if (i === j) {
        return {
          var1Key: v1.key,
          var2Key: v2.key,
          pearsonR: 1.0,
          pearsonP: 0,
          spearmanRho: 1.0,
          spearmanP: 0,
          n
        };
      }

      const x = respondents.map(r => getNumVal(r, v1.key));
      const y = respondents.map(r => getNumVal(r, v2.key));

      // Pearson r calculation
      const meanX = n > 0 ? x.reduce((a, b) => a + b, 0) / n : 0;
      const meanY = n > 0 ? y.reduce((a, b) => a + b, 0) / n : 0;

      let numR = 0, denX = 0, denY = 0;
      for (let k = 0; k < n; k++) {
        const dx = x[k] - meanX;
        const dy = y[k] - meanY;
        numR += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }

      const denR = Math.sqrt(denX * denY);
      const pearsonR = denR > 0 ? numR / denR : 0;

      // Pearson t and p-value
      const dfR = Math.max(1, n - 2);
      const tPearson = Math.abs(pearsonR) < 1 ? pearsonR * Math.sqrt(dfR / (1 - pearsonR * pearsonR)) : 999;
      const pearsonP = Math.abs(pearsonR) === 1 ? 0 : tToPValue(tPearson, dfR);
      const pearsonSig = pearsonP < 0.01 ? '**' : pearsonP < 0.05 ? '*' : '';

      // Spearman Rho calculation (ranking)
      const rankVector = (arr: number[]) => {
        const sorted = arr.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
        const ranks = new Array(arr.length);
        let k = 0;
        while (k < sorted.length) {
          let m = k;
          while (m < sorted.length && sorted[m].val === sorted[k].val) m++;
          const avgRank = (k + 1 + m) / 2;
          for (let p = k; p < m; p++) ranks[sorted[p].idx] = avgRank;
          k = m;
        }
        return ranks;
      };

      const rankX = rankVector(x);
      const rankY = rankVector(y);

      const meanRX = rankX.reduce((a, b) => a + b, 0) / n;
      const meanRY = rankY.reduce((a, b) => a + b, 0) / n;

      let numRho = 0, denRX = 0, denRY = 0;
      for (let k = 0; k < n; k++) {
        const drx = rankX[k] - meanRX;
        const dry = rankY[k] - meanRY;
        numRho += drx * dry;
        denRX += drx * drx;
        denRY += dry * dry;
      }

      const denRho = Math.sqrt(denRX * denRY);
      const spearmanRho = denRho > 0 ? numRho / denRho : 0;
      const tSpearman = Math.abs(spearmanRho) < 1 ? spearmanRho * Math.sqrt(dfR / (1 - spearmanRho * spearmanRho)) : 999;
      const spearmanP = Math.abs(spearmanRho) === 1 ? 0 : tToPValue(tSpearman, dfR);
      const spearmanSig = spearmanP < 0.01 ? '**' : spearmanP < 0.05 ? '*' : '';

      if (i < j) {
        pairs.push({
          var1Key: v1.key,
          var1Label: v1.label,
          var2Key: v2.key,
          var2Label: v2.label,
          n,
          pearsonR,
          pearsonP,
          pearsonSig,
          spearmanRho,
          spearmanP,
          spearmanSig
        });
      }

      return {
        var1Key: v1.key,
        var2Key: v2.key,
        pearsonR,
        pearsonP,
        spearmanRho,
        spearmanP,
        n
      };
    });
  });

  return { variables: vars, matrix, pairs };
}

// Paired Tests Calculation (Paired T-Test & Wilcoxon Signed-Rank Test)
export function calculatePairedTests(respondents: RespondentData[]): PairedTestItem[] {
  const n = respondents.length;
  if (n === 0) return [];

  const pairDefinitions = [
    {
      pairName: 'Pasangan 1: Debris Index (DI-S) vs Calculus Index (CI-S)',
      var1Label: 'Debris Index (DI-S)',
      var2Label: 'Calculus Index (CI-S)',
      getVal1: (r: RespondentData) => Number((r.ohis || generateDefaultOHIS(r)).disScore) || 0,
      getVal2: (r: RespondentData) => Number((r.ohis || generateDefaultOHIS(r)).cisScore) || 0
    },
    {
      pairName: 'Pasangan 2: Karies Gigi Sulung (def-t) vs Karies Gigi Tetap (DMF-T)',
      var1Label: 'Karies Gigi Sulung (def-t)',
      var2Label: 'Karies Gigi Tetap (DMF-T)',
      getVal1: (r: RespondentData) => Number(r.deft) || 0,
      getVal2: (r: RespondentData) => Number(r.dmft) || 0
    },
    {
      pairName: 'Pasangan 3: Gigi Karies Aktif (D/d) vs Gigi Penambalan (F/f)',
      var1Label: 'Gigi Karies Aktif (D + d)',
      var2Label: 'Gigi Penambalan (F + f)',
      getVal1: (r: RespondentData) => (r.gigiTetap?.karies || 0) + (r.gigiSulung?.karies || 0),
      getVal2: (r: RespondentData) => {
        const f1 = (r.gigiTetap?.tumpatanTanpaKaries || 0) + (r.gigiTetap?.tumpatanKaries || 0);
        const f2 = (r.gigiSulung?.tumpatanTanpaKaries || 0) + (r.gigiSulung?.tumpatanKaries || 0);
        return f1 + f2;
      }
    }
  ];

  return pairDefinitions.map(def => {
    const v1 = respondents.map(def.getVal1);
    const v2 = respondents.map(def.getVal2);

    const mean1 = v1.reduce((a, b) => a + b, 0) / n;
    const mean2 = v2.reduce((a, b) => a + b, 0) / n;

    const sd1 = Math.sqrt(v1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) / Math.max(1, n - 1));
    const sd2 = Math.sqrt(v2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / Math.max(1, n - 1));

    const se1 = sd1 / Math.sqrt(n);
    const se2 = sd2 / Math.sqrt(n);

    // Correlation between pair
    let numCorr = 0, den1 = 0, den2 = 0;
    for (let k = 0; k < n; k++) {
      numCorr += (v1[k] - mean1) * (v2[k] - mean2);
      den1 += Math.pow(v1[k] - mean1, 2);
      den2 += Math.pow(v2[k] - mean2, 2);
    }
    const correlation = (den1 > 0 && den2 > 0) ? numCorr / Math.sqrt(den1 * den2) : 0;
    const dfCorr = Math.max(1, n - 2);
    const tCorr = Math.abs(correlation) < 1 ? correlation * Math.sqrt(dfCorr / (1 - correlation * correlation)) : 999;
    const corrPValue = Math.abs(correlation) === 1 ? 0 : tToPValue(tCorr, dfCorr);

    // Differences for Paired T-test
    const diffs = v1.map((val, idx) => val - v2[idx]);
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;
    const sdDiff = Math.sqrt(diffs.reduce((a, b) => a + Math.pow(b - meanDiff, 2), 0) / Math.max(1, n - 1));
    const seDiff = sdDiff / Math.sqrt(n);

    const tValue = seDiff > 0 ? meanDiff / seDiff : 0;
    const df = Math.max(1, n - 1);
    const tPValue = tToPValue(tValue, df);
    const tIsSig = tPValue < 0.05;

    // Wilcoxon Signed-Rank Test
    const pairedDiffs = diffs.map((d, idx) => ({ d, absD: Math.abs(d), idx })).filter(item => item.d !== 0);
    const tiesCount = n - pairedDiffs.length;

    pairedDiffs.sort((a, b) => a.absD - b.absD);

    const ranked: { d: number; absD: number; rank: number }[] = [];
    let i = 0;
    while (i < pairedDiffs.length) {
      let j = i;
      while (j < pairedDiffs.length && pairedDiffs[j].absD === pairedDiffs[i].absD) j++;
      const avgRank = (i + 1 + j) / 2;
      for (let k = i; k < j; k++) {
        ranked.push({ ...pairedDiffs[k], rank: avgRank });
      }
      i = j;
    }

    const negRanks = ranked.filter(r => r.d < 0);
    const posRanks = ranked.filter(r => r.d > 0);

    const negRanksCount = negRanks.length;
    const negRanksSum = negRanks.reduce((a, b) => a + b.rank, 0);
    const negRanksMean = negRanksCount > 0 ? negRanksSum / negRanksCount : 0;

    const posRanksCount = posRanks.length;
    const posRanksSum = posRanks.reduce((a, b) => a + b.rank, 0);
    const posRanksMean = posRanksCount > 0 ? posRanksSum / posRanksCount : 0;

    const wStat = Math.min(negRanksSum, posRanksSum);
    const nActive = pairedDiffs.length;
    const meanW = (nActive * (nActive + 1)) / 4;
    const varW = (nActive * (nActive + 1) * (2 * nActive + 1)) / 24;
    const wilcoxonZ = varW > 0 ? (wStat - meanW) / Math.sqrt(varW) : 0;
    const wilcoxonPValue = zToPValue(wilcoxonZ);
    const wilcoxonIsSig = wilcoxonPValue < 0.05;

    return {
      pairName: def.pairName,
      var1Label: def.var1Label,
      var2Label: def.var2Label,
      mean1,
      sd1,
      se1,
      mean2,
      sd2,
      se2,
      n,
      correlation,
      corrPValue,
      meanDiff,
      sdDiff,
      seDiff,
      ciLowerDiff: meanDiff - 1.96 * seDiff,
      ciUpperDiff: meanDiff + 1.96 * seDiff,
      tValue: Math.abs(tValue),
      df,
      tPValue,
      tIsSig,
      negRanksCount,
      negRanksMean,
      negRanksSum,
      posRanksCount,
      posRanksMean,
      posRanksSum,
      tiesCount,
      wilcoxonZ: Math.abs(wilcoxonZ),
      wilcoxonPValue,
      wilcoxonIsSig
    };
  });
}

// Export Bivariate PDF Report
export function exportBivariatePdf(result: BivariateResult, sessionName: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Color palette
  const primaryColor = '#BE185D'; // Pink-700
  const headerBg = [15, 23, 42];  // Slate-900

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('LAPORAN HASIL ANALISIS KUANTITATIF BIVARIAT', 14, 13);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Uji Hipotesis & Tabulasi Silang Epidemiologi Kesehatan Gigi | Sesi: ${sessionName}`, 14, 19);
  doc.text(`Pemeriksa/Analyst: Arini Haerunnisa | Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 25);

  let y = 40;

  // Section 1: Dual Variables Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(190, 24, 93);
  doc.text(`1. Hubungan Antara: ${result.varXLabel} (X) VS ${result.varYLabel} (Y)`, 14, y);

  y += 7;

  // Contingency Table
  const tableHead = [
    [`${result.varXLabel} (X)`, ...result.categoriesY.map(c => `${c} (n / %)`), 'Total N (%)']
  ];

  const tableBody = result.categoriesX.map((catX, rIdx) => {
    const rowCells = result.categoriesY.map((_, cIdx) => {
      const cell = result.matrix[rIdx][cIdx];
      return `${cell.observed} (${cell.rowPct.toFixed(1)}%)`;
    });
    const totalN = result.rowTotals[rIdx];
    const totalPct = ((totalN / result.grandTotal) * 100).toFixed(1);
    return [catX, ...rowCells, `${totalN} (100%)` ];
  });

  // Total Row
  const totalRowCells = result.categoriesY.map((_, cIdx) => {
    const colN = result.colTotals[cIdx];
    const colPct = ((colN / result.grandTotal) * 100).toFixed(1);
    return `${colN} (${colPct}%)`;
  });
  tableBody.push(['Total Populasi', ...totalRowCells, `${result.grandTotal} (100%)`]);

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [190, 24, 93], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [253, 242, 248] },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Section 2: Statistical Test Summary Table
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(190, 24, 93);
  doc.text('2. Hasil Uji Statistik Chi-Square (χ²) & Indikator Risiko', 14, y);

  y += 6;

  const statRows: string[][] = [
    ['Uji Statistik', 'Nilai Statistik', 'df', 'p-value (Sig.)', 'Kesimpulan Statistik'],
    ['Chi-Square (χ²)', result.chiSquare.toFixed(3), String(result.df), result.pValue < 0.001 ? '< 0.001' : result.pValue.toFixed(3), result.isSignificant ? 'Signifikan (p < 0.05)' : 'Tidak Signifikan (p ≥ 0.05)']
  ];

  if (result.is2x2) {
    if (result.oddsRatio !== undefined) {
      statRows.push(['Odds Ratio (OR)', result.oddsRatio.toFixed(2), '-', '-', `95% CI: ${result.orCiLower?.toFixed(2)} - ${result.orCiUpper?.toFixed(2)}`]);
    }
    if (result.relativeRisk !== undefined) {
      statRows.push(['Relative Risk (RR)', result.relativeRisk.toFixed(2), '-', '-', `95% CI: ${result.rrCiLower?.toFixed(2)} - ${result.rrCiUpper?.toFixed(2)}`]);
    }
  }

  if (result.tTest) {
    statRows.push(['Uji Beda Rata-rata (T-Test)', `t = ${result.tTest.tValue.toFixed(3)}`, String(result.tTest.df), result.tTest.pValue < 0.001 ? '< 0.001' : result.tTest.pValue.toFixed(3), result.tTest.isSignificant ? 'Signifikan (p < 0.05)' : 'Tidak Signifikan']);
  }

  autoTable(doc, {
    startY: y,
    head: [statRows[0]],
    body: statRows.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Section 3: Group Mean Comparison (DMF-T, deft, OHI-S)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(190, 24, 93);
  doc.text('3. Perbandingan Rata-rata & Standar Deviasi Indeks Klinis (DMF-T, def-t & OHI-S)', 14, y);

  y += 6;

  const meanRows = result.groupMeans.map(g => [
    g.category,
    String(g.n),
    `${g.meanDMFT.toFixed(2)} ± ${g.sdDMFT.toFixed(2)}`,
    `${g.meanDeft.toFixed(2)} ± ${g.sdDeft.toFixed(2)}`,
    `${g.meanOHIS.toFixed(2)} ± ${g.sdOHIS.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: y,
    head: [[`Kategori ${result.varXLabel}`, 'N Sampel', 'Rata-rata DMF-T ± SD', 'Rata-rata def-t ± SD', 'Rata-rata OHI-S ± SD']],
    body: meanRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Section 4: Narrative Interpretation
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(190, 24, 93);
  doc.text('4. Interpretasi Akademik & Pembahasan Hasil', 14, y);

  y += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const splitNarrative = doc.splitTextToSize(result.narrativeInterpretation, 180);
  doc.text(splitNarrative, 14, y);

  y += (splitNarrative.length * 4) + 15;

  // Signatures
  doc.text('Mengetahui,', 14, y);
  doc.text('Analyst / Pemeriksa Survey', 14, y + 4);
  doc.text('___________________________', 14, y + 18);
  doc.text('Arini Haerunnisa', 14, y + 23);

  doc.text('Disetujui oleh,', 130, y);
  doc.text('Penanggung Jawab Wilayah', 130, y + 4);
  doc.text('___________________________', 130, y + 18);
  doc.text('NIP. ', 130, y + 23);

  const cleanX = result.varXLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const cleanY = result.varYLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`Analisis_Bivariat_${cleanX}_vs_${cleanY}.pdf`);
}

// Export Bivariate Excel Report (.xlsx)
export function exportBivariateExcel(result: BivariateResult, sessionName: string) {
  const wb = XLSX.utils.book_new();

  const rows = [
    ['LAPORAN ANALISIS KUANTITATIF BIVARIAT'],
    ['Sesi Survey:', sessionName],
    ['Variabel Independen (X):', result.varXLabel],
    ['Variabel Dependen (Y):', result.varYLabel],
    ['Tanggal Analisis:', new Date().toLocaleDateString('id-ID')],
    ['Total Sampel (N):', result.grandTotal],
    [],
    ['I. TABEL KONTINGENSI (CROSSTABULATION)'],
    [`${result.varXLabel} \\ ${result.varYLabel}`, ...result.categoriesY, 'Total N', 'Persentase (%)'],
    ...result.categoriesX.map((catX, rIdx) => [
      catX,
      ...result.categoriesY.map((_, cIdx) => `${result.matrix[rIdx][cIdx].observed} (${result.matrix[rIdx][cIdx].rowPct.toFixed(1)}%)`),
      result.rowTotals[rIdx],
      `${((result.rowTotals[rIdx] / result.grandTotal) * 100).toFixed(1)}%`
    ]),
    ['Total Populasi', ...result.categoriesY.map((_, cIdx) => `${result.colTotals[cIdx]} (${((result.colTotals[cIdx] / result.grandTotal) * 100).toFixed(1)}%)`), result.grandTotal, '100%'],
    [],
    ['II. HASIL UJI STATISTIK BIVARIAT'],
    ['Uji Statistik', 'Nilai Statistic', 'df', 'p-value (Asymp. Sig)', 'Kesimpulan (alpha = 0.05)'],
    ['Chi-Square (χ²)', result.chiSquare.toFixed(3), result.df, result.pValue < 0.001 ? '< 0.001' : result.pValue.toFixed(3), result.isSignificant ? 'Ada Hubungan Signifikan (H0 Ditolak)' : 'Tidak Ada Hubungan Signifikan (H0 Diterima)'],
    ...(result.is2x2 ? [
      ['Odds Ratio (OR)', result.oddsRatio?.toFixed(2) || '-', '-', '-', `95% CI: ${result.orCiLower?.toFixed(2)} - ${result.orCiUpper?.toFixed(2)}`],
      ['Relative Risk (RR)', result.relativeRisk?.toFixed(2) || '-', '-', '-', `95% CI: ${result.rrCiLower?.toFixed(2)} - ${result.rrCiUpper?.toFixed(2)}`]
    ] : []),
    ...(result.tTest ? [
      ['Independent T-Test (Beda Mean)', result.tTest.tValue.toFixed(3), result.tTest.df, result.tTest.pValue < 0.001 ? '< 0.001' : result.tTest.pValue.toFixed(3), result.tTest.isSignificant ? 'Beda Mean Signifikan' : 'Beda Mean Tidak Signifikan']
    ] : []),
    [],
    ['III. UJI BEDA RATA-RATA INDEKS KLINIS (DMF-T, def-t & OHI-S)'],
    [`Kategori ${result.varXLabel}`, 'N', 'Mean DMF-T', 'SD DMF-T', 'Mean def-t', 'SD def-t', 'Mean OHI-S', 'SD OHI-S'],
    ...result.groupMeans.map(g => [
      g.category,
      g.n,
      g.meanDMFT.toFixed(2),
      g.sdDMFT.toFixed(2),
      g.meanDeft.toFixed(2),
      g.sdDeft.toFixed(2),
      g.meanOHIS.toFixed(2),
      g.sdOHIS.toFixed(2)
    ]),
    [],
    ['IV. INTERPRETASI NARRATIVE RESEARCH'],
    [result.narrativeInterpretation]
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Analisis_Bivariat');

  const cleanX = result.varXLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const cleanY = result.varYLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `Analisis_Bivariat_${cleanX}_vs_${cleanY}.xlsx`);
}
