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
  meanDeft: number;
  sdDeft: number;
  meanOHIS: number;
  sdOHIS: number;
  meanDIS: number;
  sdDIS: number;
  meanCIS: number;
  sdCIS: number;
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
  };

  narrativeInterpretation: string;
}

// Chi-Square Cumulative Distribution Function (Wilson-Hilferty transformation approximation)
export function chiSquarePValue(chiSq: number, df: number): number {
  if (chiSq <= 0 || df < 1) return 1.0;
  
  // Wilson-Hilferty transformation from Chi-Sq to Standard Normal Z
  const term1 = Math.pow(chiSq / df, 1 / 3);
  const term2 = 1 - 2 / (9 * df);
  const term3 = Math.sqrt(2 / (9 * df));
  const z = (term1 - term2) / term3;

  // Standard Normal Tail Probability approximation
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * absZ * absZ) / Math.sqrt(2 * Math.PI);
  const tail = pdf * poly;

  const p = z >= 0 ? tail : 1 - tail;
  return Math.max(0.0001, Math.min(0.9999, p));
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

  // 2x2 Risk calculation (Odds Ratio & Relative Risk)
  const is2x2 = categoriesX.length === 2 && categoriesY.length === 2;
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

  // Mean & SD per group for continuous variables (DMF-T, deft, OHI-S)
  const groupMeans: GroupMeanData[] = categoriesX.map(cat => {
    const groupRespondents = respondents.filter(r => getXValue(r) === cat);
    const n = groupRespondents.length;
    
    // Mean & SD DMFT
    const dmftVals = groupRespondents.map(r => r.dmft || 0);
    const meanDMFT = n > 0 ? dmftVals.reduce((a, b) => a + b, 0) / n : 0;
    const varianceDMFT = n > 1 ? dmftVals.reduce((a, b) => a + Math.pow(b - meanDMFT, 2), 0) / (n - 1) : 0;
    const sdDMFT = Math.sqrt(varianceDMFT);

    // Mean & SD deft
    const deftVals = groupRespondents.map(r => r.deft || 0);
    const meanDeft = n > 0 ? deftVals.reduce((a, b) => a + b, 0) / n : 0;
    const varianceDeft = n > 1 ? deftVals.reduce((a, b) => a + Math.pow(b - meanDeft, 2), 0) / (n - 1) : 0;
    const sdDeft = Math.sqrt(varianceDeft);

    // Mean & SD OHI-S
    const ohisVals = groupRespondents.map(r => (r.ohis || generateDefaultOHIS(r)).ohisScore || 0);
    const meanOHIS = n > 0 ? ohisVals.reduce((a, b) => a + b, 0) / n : 0;
    const varianceOHIS = n > 1 ? ohisVals.reduce((a, b) => a + Math.pow(b - meanOHIS, 2), 0) / (n - 1) : 0;
    const sdOHIS = Math.sqrt(varianceOHIS);

    // Mean & SD DI-S
    const disVals = groupRespondents.map(r => (r.ohis || generateDefaultOHIS(r)).disScore || 0);
    const meanDIS = n > 0 ? disVals.reduce((a, b) => a + b, 0) / n : 0;
    const sdDIS = Math.sqrt(n > 1 ? disVals.reduce((a, b) => a + Math.pow(b - meanDIS, 2), 0) / (n - 1) : 0);

    // Mean & SD CI-S
    const cisVals = groupRespondents.map(r => (r.ohis || generateDefaultOHIS(r)).cisScore || 0);
    const meanCIS = n > 0 ? cisVals.reduce((a, b) => a + b, 0) / n : 0;
    const sdCIS = Math.sqrt(n > 1 ? cisVals.reduce((a, b) => a + Math.pow(b - meanCIS, 2), 0) / (n - 1) : 0);

    return { category: cat, n, meanDMFT, sdDMFT, meanDeft, sdDeft, meanOHIS, sdOHIS, meanDIS, sdDIS, meanCIS, sdCIS };
  });

  // T-Test calculation for 2 groups
  let tTest: BivariateResult['tTest'] | undefined;
  if (categoriesX.length === 2) {
    const g1 = groupMeans[0];
    const g2 = groupMeans[1];
    if (g1.n > 1 && g2.n > 1) {
      const seDiff = Math.sqrt((Math.pow(g1.sdDMFT, 2) / g1.n) + (Math.pow(g2.sdDMFT, 2) / g2.n));
      if (seDiff > 0) {
        const tVal = (g1.meanDMFT - g2.meanDMFT) / seDiff;
        // Welch-Satterthwaite df
        const num = Math.pow((Math.pow(g1.sdDMFT, 2) / g1.n) + (Math.pow(g2.sdDMFT, 2) / g2.n), 2);
        const den = (Math.pow(Math.pow(g1.sdDMFT, 2) / g1.n, 2) / (g1.n - 1)) + (Math.pow(Math.pow(g2.sdDMFT, 2) / g2.n, 2) / (g2.n - 1));
        const tDf = den > 0 ? Math.round(num / den) : (g1.n + g2.n - 2);
        
        // Approximate p-value for T
        const tPVal = chiSquarePValue(Math.pow(tVal, 2), 1);
        tTest = {
          tValue: Math.abs(tVal),
          df: tDf,
          pValue: tPVal,
          isSignificant: tPVal < 0.05
        };
      }
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
    is2x2,
    oddsRatio,
    orCiLower,
    orCiUpper,
    relativeRisk,
    rrCiLower,
    rrCiUpper,
    groupMeans,
    tTest,
    narrativeInterpretation
  };
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
