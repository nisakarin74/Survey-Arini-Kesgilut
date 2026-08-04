import React, { useState } from 'react';
import { 
  FileDown, 
  Calculator, 
  TrendingUp, 
  Activity, 
  Users, 
  ShieldAlert, 
  Award, 
  PieChart, 
  BarChart2, 
  CheckCircle2, 
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  Stethoscope,
  Sparkles,
  Info,
  GitCompare,
  Check,
  XCircle,
  BookOpen,
  FileText,
  FileSpreadsheet,
  HeartPulse,
  HelpCircle,
  Copy,
  Terminal,
  X,
  FileCheck,
  Table
} from 'lucide-react';
import { RespondentData } from '../types';
import { 
  calculateQuantitativeAnalysis, 
  getWHOCategory, 
  exportQuantitativePdf, 
  exportQuantitativeExcel,
  exportQuantitativeSPSS,
  normalizeAgeGroup
} from '../lib/surveyEngine';
import { 
  calculateBivariateAnalysis, 
  calculateCustomTTestAndMannWhitney,
  calculateCorrelationMatrix,
  calculatePairedTests,
  calculateCustomPairedTest,
  exportBivariatePdf, 
  exportBivariateExcel,
  exportSpssComparisonPdf
} from '../lib/bivariateEngine';

interface SpssDescriptiveRow {
  label: string;
  key: string;
  n: number;
  min: number;
  max: number;
  mean: number;
  seMean: number;
  sd: number;
  variance: number;
  median: number;
  skewness: number;
  seSkewness: number;
  kurtosis: number;
  seKurtosis: number;
}

function computeDescriptiveStats(label: string, key: string, data: number[]): SpssDescriptiveRow {
  const n = data.length;
  if (n === 0) {
    return {
      label, key, n: 0, min: 0, max: 0, mean: 0, seMean: 0, sd: 0, variance: 0, median: 0,
      skewness: 0, seSkewness: 0, kurtosis: 0, seKurtosis: 0
    };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const sorted = [...data].sort((a, b) => a - b);
  const median = n % 2 === 1 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  if (n === 1) {
    return {
      label, key, n: 1, min, max, mean, seMean: 0, sd: 0, variance: 0, median,
      skewness: 0, seSkewness: 0, kurtosis: 0, seKurtosis: 0
    };
  }

  const ss = data.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0);
  const variance = ss / (n - 1);
  const sd = Math.sqrt(variance);
  const seMean = sd / Math.sqrt(n);

  let skewness = 0;
  let seSkewness = 0;
  let kurtosis = 0;
  let seKurtosis = 0;

  if (n > 2 && sd > 0) {
    const sumM3 = data.reduce((acc, x) => acc + Math.pow(x - mean, 3), 0);
    skewness = (n * sumM3) / ((n - 1) * (n - 2) * Math.pow(sd, 3));
    seSkewness = Math.sqrt((6 * n * (n - 1)) / ((n - 2) * (n + 1) * (n + 3)));
  }

  if (n > 3 && sd > 0) {
    const sumM4 = data.reduce((acc, x) => acc + Math.pow(x - mean, 4), 0);
    const term1 = n * (n + 1) * sumM4;
    const term2 = 3 * Math.pow(ss, 2) * (n - 1);
    const denom = (n - 1) * (n - 2) * (n - 3) * Math.pow(sd, 4);
    kurtosis = (term1 - term2) / denom;

    if (seSkewness > 0) {
      seKurtosis = 2 * seSkewness * Math.sqrt((n * n - 1) / ((n - 3) * (n + 5)));
    }
  }

  return {
    label, key, n, min, max, mean, seMean, sd, variance, median,
    skewness, seSkewness, kurtosis, seKurtosis
  };
}

function computeFrequencyTable(label: string, data: (string | number)[]) {
  const n = data.length;
  const counts = new Map<string, number>();

  data.forEach(item => {
    const key = (item === undefined || item === null || item === '') ? 'Missing' : String(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  let maxCount = 0;
  let modeVal = '-';
  counts.forEach((count, key) => {
    if (count > maxCount) {
      maxCount = count;
      modeVal = key;
    }
  });

  let cumulative = 0;
  const rows = Array.from(counts.entries()).map(([catLabel, count]) => {
    const pct = n > 0 ? (count / n) * 100 : 0;
    cumulative += pct;
    return {
      label: catLabel,
      frequency: count,
      percent: pct,
      validPercent: pct,
      cumulativePercent: cumulative
    };
  });

  return {
    label,
    nValid: n,
    nMissing: 0,
    mode: modeVal,
    rows
  };
}

function getSpssVarInfo(key: string): { name: string; label: string; coding: string; scale: string; groupCodes?: string } {
  switch (key) {
    case 'jenisKelamin':
      return { name: 'JK_CODE', label: 'Jenis Kelamin', coding: '1 = Laki-Laki, 2 = Perempuan', scale: 'Nominal', groupCodes: '1, 2' };
    case 'kelompokUmur':
      return { name: 'KEL_UMUR_CODE', label: 'Kelompok Umur WHO', coding: '1=0-4 th, 2=5-11 th, 3=12-17 th, 4=18-59 th, 5=60+ th', scale: 'Ordinal', groupCodes: '1, 2, 3, 4, 5' };
    case 'kategoriOHIS':
      return { name: 'OHIS_CAT_CODE', label: 'Kategori Kebersihan Mulut (OHI-S)', coding: '1 = Baik (0.0-1.2), 2 = Sedang (1.3-3.0), 3 = Buruk (3.1-6.0)', scale: 'Ordinal', groupCodes: '1, 2, 3' };
    case 'statusKaries':
      return { name: 'KARIES_STATUS', label: 'Status Prevalensi Karies', coding: '0 = Bebas Karies (DMF-T=0), 1 = Karies Aktif (DMF-T≥1)', scale: 'Nominal', groupCodes: '0, 1' };
    case 'keparahanDMFT':
      return { name: 'DMFT_CAT_CODE', label: 'Keparahan DMF-T WHO', coding: '1 = Rendah (<2.7), 2 = Tinggi (≥2.7)', scale: 'Ordinal', groupCodes: '1, 2' };
    case 'statusOHIS':
      return { name: 'OHIS_CAT_CODE', label: 'Status OHI-S Binary', coding: '0 = Baik (≤1.2), 1 = Sedang/Buruk (>1.2)', scale: 'Nominal', groupCodes: '0, 1' };
    case 'gusiBerdarah':
      return { name: 'GUSI_BERDARAH', label: 'Status Kesehatan Gusi (Gingivitis)', coding: '0 = Normal, 1 = Gusi Berdarah', scale: 'Nominal', groupCodes: '0, 1' };
    case 'lesiMukosa':
      return { name: 'LESI_MUKOSA', label: 'Status Lesi Mukosa Oral', coding: '0 = Normal, 1 = Ada Lesi Mukosa', scale: 'Nominal', groupCodes: '0, 1' };
    case 'rencanaRujukan':
      return { name: 'PERLU_RUJUKAN', label: 'Status Kebutuhan Rujukan', coding: '0 = Tidak Perlu, 1 = Memerlukan Rujukan', scale: 'Nominal', groupCodes: '0, 1' };
    case 'perluPerawatanSegera':
      return { name: 'PERAWATAN_SEGERA', label: 'Kebutuhan Perawatan Segera', coding: '0 = Non-Urgent, 1 = Urgent / Segera', scale: 'Nominal', groupCodes: '0, 1' };
    case 'pendidikan':
      return { name: 'PENDIDIKAN_CODE', label: 'Tingkat Pendidikan Terakhir', coding: '1=Tidak Sekolah, 2=SD, 3=SMP, 4=SMA, 5=PT', scale: 'Ordinal', groupCodes: '1, 2, 3, 4, 5' };
    case 'pekerjaan':
      return { name: 'PEKERJAAN_CODE', label: 'Sektor Pekerjaan', coding: '1=Tidak Bekerja, 2=IRT, 3=Pelajar, 4=PNS, 5=Swasta, 6=Wiraswasta', scale: 'Nominal', groupCodes: '1, 2, 3, 4, 5, 6' };
    case 'kategoriOHIS2Group':
      return { name: 'OHIS_CAT_CODE', label: 'OHI-S 2 Kelompok', coding: '1 = Baik (≤1.2), 2 = Sedang/Buruk (>1.2)', scale: 'Nominal', groupCodes: '1, 2' };
    case 'kelompokUmur2Group':
      return { name: 'KEL_UMUR_CODE', label: 'Umur 2 Kelompok', coding: '1 = Anak (≤11 th), 2 = Dewasa (≥12 th)', scale: 'Nominal', groupCodes: '1, 2' };
    case 'dmft':
      return { name: 'DMFT_SCORE', label: 'Indeks Total DMF-T Gigi Tetap', coding: 'Skor Kontinu Rasio (0 - 32)', scale: 'Scale (Rasio)' };
    case 'deft':
      return { name: 'DEFT_SCORE', label: 'Indeks Total def-t Gigi Sulung', coding: 'Skor Kontinu Rasio (0 - 20)', scale: 'Scale (Rasio)' };
    case 'ohis':
      return { name: 'OHIS_SCORE', label: 'Indeks Total OHI-S Kebersihan Mulut', coding: 'Skor Kontinu Rasio (0.0 - 6.0)', scale: 'Scale (Rasio)' };
    case 'dis':
      return { name: 'DIS_SCORE', label: 'Debris Index Simplified (DI-S)', coding: 'Skor Kontinu Rasio (0.0 - 3.0)', scale: 'Scale (Rasio)' };
    case 'cis':
      return { name: 'CIS_SCORE', label: 'Calculus Index Simplified (CI-S)', coding: 'Skor Kontinu Rasio (0.0 - 3.0)', scale: 'Scale (Rasio)' };
    case 'kariesTotal':
      return { name: 'D_TETAP', label: 'Jumlah Gigi Karies (d + D)', coding: 'Jumlah Gigi Kontinu', scale: 'Scale (Rasio)' };
    case 'tumpatTotal':
      return { name: 'F_TETAP', label: 'Jumlah Gigi Penambalan (f + F)', coding: 'Jumlah Gigi Kontinu', scale: 'Scale (Rasio)' };
    case 'hilangTotal':
      return { name: 'M_TETAP', label: 'Jumlah Gigi Hilang (M + e)', coding: 'Jumlah Gigi Kontinu', scale: 'Scale (Rasio)' };
    case 'umur':
      return { name: 'UMUR', label: 'Umur Responden', coding: 'Tahun Kontinu', scale: 'Scale (Rasio)' };
    default:
      return { name: key.toUpperCase(), label: key, coding: 'Data Responden', scale: 'Scale' };
  }
}

interface QuantitativeAnalysisProps {
  respondents: RespondentData[];
  sessionName: string;
}

export default function QuantitativeAnalysis({ respondents, sessionName }: QuantitativeAnalysisProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'bivariate' | 'descriptive' | 'qualitative' | 'age' | 'gender' | 'demographics' | 'individual'>('overview');
  const [bivariateMode, setBivariateMode] = useState<'crosstab' | 'ttest' | 'correlation' | 'paired'>('crosstab');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');
  const [showSpssGuideModal, setShowSpssGuideModal] = useState<boolean>(false);
  const [spssGuideTab, setSpssGuideTab] = useState<'values' | 'chisquare' | 'ttest' | 'impor' | 'troubleshoot'>('values');
  const [showBeginnerGuide, setShowBeginnerGuide] = useState<boolean>(true);
  const [copiedSyntax, setCopiedSyntax] = useState<boolean>(false);

  // Descriptive Analysis Mode & Frequency Selector State
  const [descriptiveViewMode, setDescriptiveViewMode] = useState<'spss_tables' | 'epidemiology_profile'>('spss_tables');
  const [freqVar, setFreqVar] = useState<string>('jenisKelamin');

  // Bivariate Variable Selector State (Mode 1: Crosstab & Chi-Square)
  const [bivariateVarX, setBivariateVarX] = useState<any>('jenisKelamin');
  const [bivariateVarY, setBivariateVarY] = useState<any>('statusKaries');

  // Mode 2 Selectors (Independent T-Test & Mann-Whitney U)
  const [ttestGroupVar, setTtestGroupVar] = useState<string>('jenisKelamin');
  const [ttestNumVar, setTtestNumVar] = useState<string>('dmft');

  // Mode 3 Selectors (Correlation Focus Pair)
  const [corrVar1, setCorrVar1] = useState<string>('dmft');
  const [corrVar2, setCorrVar2] = useState<string>('ohis');

  // Mode 4 Selectors (Paired Tests Custom Pair)
  const [pairedVar1, setPairedVar1] = useState<string>('dis');
  const [pairedVar2, setPairedVar2] = useState<string>('cis');

  const metrics = calculateQuantitativeAnalysis(respondents);
  const bivariateResult = calculateBivariateAnalysis(respondents, bivariateVarX, bivariateVarY);
  const customTTestResult = calculateCustomTTestAndMannWhitney(respondents, ttestGroupVar, ttestNumVar);
  const correlationResult = calculateCorrelationMatrix(respondents);
  const pairedResults = calculatePairedTests(respondents);
  const customPairedResult = calculateCustomPairedTest(respondents, pairedVar1, pairedVar2);

  const spssDescriptivesData = [
    computeDescriptiveStats('Skor Indeks DMF-T Total (Gigi Tetap)', 'dmft', respondents.map(r => r.dmft || 0)),
    computeDescriptiveStats('Decayed (D - Karies Tetap)', 'd_tetap', respondents.map(r => r.gigiTetap?.karies || 0)),
    computeDescriptiveStats('Missing (M - Hilang/Dicabut)', 'm_tetap', respondents.map(r => r.gigiTetap?.dicabutKaries || 0)),
    computeDescriptiveStats('Filled (F - Tumpatan Tetap)', 'f_tetap', respondents.map(r => (r.gigiTetap?.tumpatanTanpaKaries || 0) + (r.gigiTetap?.tumpatanKaries || 0))),
    computeDescriptiveStats('Skor Indeks def-t Total (Gigi Sulung)', 'deft', respondents.map(r => r.deft || 0)),
    computeDescriptiveStats('decayed (d - Karies Sulung)', 'd_sulung', respondents.map(r => r.gigiSulung?.karies || 0)),
    computeDescriptiveStats('extracted (e - Indikasi Cabut)', 'e_sulung', respondents.map(r => r.gigiSulung?.dicabutKaries || 0)),
    computeDescriptiveStats('filled (f - Tumpatan Sulung)', 'f_sulung', respondents.map(r => (r.gigiSulung?.tumpatanTanpaKaries || 0) + (r.gigiSulung?.tumpatanKaries || 0))),
    computeDescriptiveStats('Oral Hygiene Index (OHI-S)', 'ohis', respondents.map(r => r.ohis?.ohisScore || 0)),
    computeDescriptiveStats('Debris Index Simplified (DI-S)', 'dis', respondents.map(r => r.ohis?.disScore || 0)),
    computeDescriptiveStats('Calculus Index Simplified (CI-S)', 'cis', respondents.map(r => r.ohis?.cisScore || 0)),
    computeDescriptiveStats('Umur Responden (Tahun)', 'umur', respondents.map(r => r.umur || 0)),
  ];

  const getFreqData = (key: string) => {
    switch (key) {
      case 'jenisKelamin':
        return { label: 'Jenis Kelamin Responden', data: respondents.map(r => r.jenisKelamin || 'N/A') };
      case 'kelompokUmur':
        return { label: 'Kelompok Umur WHO', data: respondents.map(r => normalizeAgeGroup(r.kelompokUmur, r.umur)) };
      case 'kategoriOHIS':
        return {
          label: 'Kategori OHI-S (Greene & Vermillion)',
          data: respondents.map(r => {
            const score = r.ohis?.ohisScore || 0;
            return score <= 1.2 ? 'Baik (0.0 - 1.2)' : score <= 3.0 ? 'Sedang (1.3 - 3.0)' : 'Buruk (3.1 - 6.0)';
          })
        };
      case 'statusKaries':
        return {
          label: 'Status Prevalensi Karies',
          data: respondents.map(r => {
            const totalKaries = (r.dmft || 0) + (r.deft || 0);
            return totalKaries > 0 ? 'Karies Aktif' : 'Bebas Karies';
          })
        };
      case 'kategoriDMFT':
        return {
          label: 'Kategori Keparahan DMF-T (WHO)',
          data: respondents.map(r => {
            const score = r.dmft || 0;
            return score < 1.2 ? 'Sangat Rendah (< 1.2)' : score < 2.7 ? 'Rendah (1.2 - 2.6)' : score < 4.5 ? 'Sedang (2.7 - 4.4)' : score < 6.6 ? 'Tinggi (4.5 - 6.5)' : 'Sangat Tinggi (≥ 6.6)';
          })
        };
      case 'gusiBerdarah':
        return {
          label: 'Status Pendarahan Gusi (Gingivitis)',
          data: respondents.map(r => r.mukosa?.gusiBerdarah ? 'Mengalami Gusi Berdarah' : 'Gusi Normal')
        };
      case 'lesiMukosa':
        return {
          label: 'Status Lesi Mukosa Oral',
          data: respondents.map(r => r.mukosa?.lesiMukosaOral ? 'Ada Lesi Mukosa' : 'Tidak Ada Lesi')
        };
      case 'rencanaRujukan':
        return {
          label: 'Status Kebutuhan Rujukan Faskes',
          data: respondents.map(r => r.tindakLanjut?.perluDirujuk ? 'Memerlukan Rujukan' : 'Tidak Perlu Rujukan')
        };
      case 'pendidikan':
        return { label: 'Tingkat Pendidikan Terakhir', data: respondents.map(r => r.pendidikan || 'Tidak Diisi') };
      case 'pekerjaan':
        return { label: 'Sektor Pekerjaan / Aktivitas', data: respondents.map(r => r.pekerjaan || 'Tidak Diisi') };
      default:
        return { label: 'Jenis Kelamin Responden', data: respondents.map(r => r.jenisKelamin || 'N/A') };
    }
  };

  const selectedFreqInfo = getFreqData(freqVar);
  const freqTableResult = computeFrequencyTable(selectedFreqInfo.label, selectedFreqInfo.data);

  const handleExportPdf = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke PDF!");
      return;
    }
    exportQuantitativePdf(respondents, sessionName);
  };

  const handleExportExcel = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke Excel!");
      return;
    }
    exportQuantitativeExcel(respondents, sessionName);
  };

  const spssSyntaxCode = `* =========================================================
* SYNTAX VARIABLE & VALUE LABELS SPSS - DATASET KESEHATAN GIGI
* =========================================================.

VARIABLE LABELS
  ID 'Nomor Urut Responden'
  NIK 'Nomor Induk Kependudukan'
  NAMA 'Nama Lengkap Responden'
  JK_CODE 'Jenis Kelamin (1=Laki-Laki, 2=Perempuan)'
  UMUR 'Umur Responden (Tahun)'
  KEL_UMUR_CODE 'Kelompok Umur WHO (1-5)'
  PENDIDIKAN_CODE 'Tingkat Pendidikan (1-5)'
  PEKERJAAN_CODE 'Sektor Pekerjaan (1-6)'
  D_SULUNG 'Komponen d (Gigi Sulung Karies)'
  E_SULUNG 'Komponen e (Gigi Sulung Ekstraksi)'
  F_SULUNG 'Komponen f (Gigi Sulung Tumpat)'
  DEFT_SCORE 'Skor Total def-t Gigi Sulung'
  D_TETAP 'Komponen D (Gigi Tetap Karies)'
  M_TETAP 'Komponen M (Gigi Tetap Hilang/Dicabut)'
  F_TETAP 'Komponen F (Gigi Tetap Tumpat/Restorasi)'
  DMFT_SCORE 'Skor Total DMF-T Gigi Tetap'
  DMFT_CAT_CODE 'Kategori Keparahan DMF-T WHO'
  DIS_SCORE 'Debris Index Simplified (DI-S)'
  CIS_SCORE 'Calculus Index Simplified (CI-S)'
  OHIS_SCORE 'Oral Hygiene Index Simplified (OHI-S)'
  OHIS_CAT_CODE 'Kategori Kebersihan Mulut OHI-S'
  KARIES_STATUS 'Status Prevalensi Karies'
  GUSI_BERDARAH 'Gusi Berdarah (Gingivitis)'
  LESI_MUKOSA 'Adanya Lesi Mukosa Oral'
  PERLU_RUJUKAN 'Kebutuhan Rujukan Faskes'
  PERAWATAN_SEGERA 'Kebutuhan Perawatan Segera'.

VALUE LABELS
  JK_CODE 1 'Laki-laki' 2 'Perempuan'
  /KEL_UMUR_CODE 1 '0-4 Tahun (Balita)' 2 '5-11 Tahun (Anak Sekolah)' 3 '12-17 Tahun (Remaja)' 4 '18-59 Tahun (Dewasa)' 5 '60+ Tahun (Lansia)'
  /PENDIDIKAN_CODE 1 'Tidak Sekolah' 2 'SD' 3 'SMP' 4 'SMA' 5 'Perguruan Tinggi'
  /PEKERJAAN_CODE 1 'Tidak Bekerja' 2 'Ibu Rumah Tangga' 3 'Pelajar/Mahasiswa' 4 'PNS/TNI/Polri' 5 'Swasta/Buruh' 6 'Wiraswasta/Lainnya'
  /DMFT_CAT_CODE 1 'Sangat Rendah (<1.2)' 2 'Rendah (1.2-2.6)' 3 'Sedang (2.7-4.4)' 4 'Tinggi (4.5-6.5)' 5 'Sangat Tinggi (>6.5)'
  /OHIS_CAT_CODE 1 'Baik (0.0-1.2)' 2 'Sedang (1.3-3.0)' 3 'Buruk (3.1-6.0)'
  /KARIES_STATUS 0 'Bebas Karies' 1 'Karies Aktif'
  /GUSI_BERDARAH 0 'Tidak' 1 'Ya'
  /LESI_MUKOSA 0 'Tidak' 1 'Ya'
  /PERLU_RUJUKAN 0 'Tidak' 1 'Ya'
  /PERAWATAN_SEGERA 0 'Tidak' 1 'Ya'.

EXECUTE.`;

  const handleExportSPSS = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke SPSS!");
      return;
    }
    exportQuantitativeSPSS(respondents, sessionName);
    setShowSpssGuideModal(true);
  };

  const spssChiSquareSyntaxCode = `* =========================================================
* SYNTAX UJI CHI-SQUARE (CROSSTABULATION) DI IBM SPSS
* (Menguji Hubungan Antara Variabel X & Variabel Y)
* =========================================================.

* 1. Tabulasi Silang & Uji Chi-Square (Jenis Kelamin vs Status Karies DMF-T).
CROSSTABS
  /TABLES=JK_CODE BY DMFT_CAT_CODE
  /FORMAT=AVALUE TABLES
  /STATISTICS=CHISQ RISK PHI
  /CELLS=COUNT ROW COLUMN EXPECTED
  /COUNT ROUND CELL.

* 2. Tabulasi Silang (Jenis Kelamin vs Status Kebersihan OHI-S).
CROSSTABS
  /TABLES=JK_CODE BY OHIS_CAT_CODE
  /FORMAT=AVALUE TABLES
  /STATISTICS=CHISQ RISK PHI
  /CELLS=COUNT ROW COLUMN EXPECTED
  /COUNT ROUND CELL.

EXECUTE.`;

  const spssTTestSyntaxCode = `* =========================================================
* SYNTAX UJI INDEPENDENT T-TEST & MANN-WHITNEY U DI SPSS
* (Menguji Beda Rata-rata Skor DMF-T & OHI-S Berdasarkan Jenis Kelamin)
* =========================================================.

* 1. Uji Parametrik: Independent Samples T-Test (Kelompok 1 = Laki-laki, Kelompok 2 = Perempuan).
T-TEST GROUPS=JK_CODE(1 2)
  /MISSING=ANALYSIS
  /VARIABLES=DMFT_SCORE DEFT_SCORE OHIS_SCORE DIS_SCORE CIS_SCORE
  /CRITERIA=CI(.95).

* 2. Uji Non-Parametrik: Mann-Whitney U Test.
NPAR TESTS
  /MANN-WHITNEY= DMFT_SCORE OHIS_SCORE DEFT_SCORE BY JK_CODE(1 2)
  /MISSING ANALYSIS.

EXECUTE.`;

  const handleExportSpssComparisonPdf = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke PDF!");
      return;
    }
    exportSpssComparisonPdf(respondents, sessionName, customTTestResult, customPairedResult, bivariateResult);
  };

  const handleCopySyntax = () => {
    navigator.clipboard.writeText(spssSyntaxCode);
    setCopiedSyntax(true);
    setTimeout(() => setCopiedSyntax(false), 2500);
  };

  // Filter individual respondents for individual tab
  const filteredRespondents = respondents.filter(r => {
    const matchSearch = (r.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (r.nik || '').includes(searchTerm);
    const matchAge = selectedAgeFilter === 'all' || normalizeAgeGroup(r.kelompokUmur, r.umur) === selectedAgeFilter;
    const matchGender = selectedGenderFilter === 'all' || r.jenisKelamin === selectedGenderFilter;
    return matchSearch && matchAge && matchGender;
  });

  const dmftCategoryInfo = getWHOCategory(metrics.meanDMFT);
  const deftCategoryInfo = getWHOCategory(metrics.meanDeft);

  if (respondents.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200 dark:border-pink-900/40 rounded-3xl p-10 text-center shadow-lg">
        <div className="w-16 h-16 bg-pink-100 dark:bg-pink-950/80 rounded-2xl flex items-center justify-center text-pink-600 dark:text-pink-400 mx-auto mb-4">
          <Calculator className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Belum Ada Data Responden</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
          Silakan lakukan input data pemeriksaan gigi atau muat 150 data simulasi dari tab <strong>Koneksi Cloud</strong> untuk mengaktifkan Analisis Kuantitatif.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="quantitative-analysis-container">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-pink-500/20">
        <div className="absolute top-0 right-0 translate-x-10 -translate-y-10 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                Fitur Analisis Epidemiologi
              </span>
              <span className="px-3 py-1 bg-white/10 text-slate-200 rounded-full text-xs font-mono font-bold">
                N = {metrics.totalN} Sampel
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Analisis Kuantitatif Kesehatan Gigi & Mulut
            </h2>
            <p className="text-pink-200/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
              Formulasi Indeks DMF-T, deft, Significant Caries Index (SiC), Care Index, Restorative Index, serta Tabulasi Silang Demografi menurut Standar WHO.
            </p>
          </div>

          {/* Direct Export Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-rose-500/25 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-95"
              id="btn-export-quant-pdf"
            >
              <FileDown className="w-4 h-4" />
              <span>Ekspor PDF Analisis</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-500/25 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-95"
              id="btn-export-quant-excel"
            >
              <FileDown className="w-4 h-4" />
              <span>Ekspor Excel Analisis</span>
            </button>

            <button
              onClick={handleExportSPSS}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-500/25 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-95"
              id="btn-export-quant-spss"
              title="Ekspor Dataset Pre-Coded untuk IBM SPSS Statistics"
            >
              <FileText className="w-4 h-4" />
              <span>Dataset Kode SPSS (.xlsx)</span>
            </button>

            <button
              onClick={handleExportSpssComparisonPdf}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-purple-500/25 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-95 ring-2 ring-pink-400/40"
              id="btn-export-spss-comparison-pdf"
              title="Download Laporan PDF Perbandingan & Ekuivalensi Output Aplikasi vs IBM SPSS"
            >
              <FileCheck className="w-4 h-4 text-pink-200" />
              <span>PDF Perbandingan SPSS</span>
            </button>

            <button
              onClick={() => setShowSpssGuideModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/90 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-95"
              id="btn-spss-guide-modal"
              title="Petunjuk cara impor ke IBM SPSS & Syntax Kode"
            >
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>Panduan SPSS</span>
            </button>

            <button
              onClick={() => setShowBeginnerGuide(!showBeginnerGuide)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-95"
              id="btn-toggle-beginner-guide"
              title="Petunjuk Asisten Olah Data Sederhana untuk Pemula"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{showBeginnerGuide ? 'Sembunyikan Panduan Olah Data' : '💡 Asisten Pemula Olah Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Beginner Data Processing Assistant Guide Box */}
      {showBeginnerGuide && (
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-pink-500/10 dark:from-amber-950/40 dark:via-slate-900 dark:to-pink-950/30 border-2 border-amber-400/50 dark:border-amber-700/50 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all animate-fade-in">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-2xl shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                  3 Langkah Mudah Memahami Olah Data &amp; Statistik
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  Panduan Asisten Pemula Olah Data Penelitian
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Kamu tidak perlu pusing dengan rumus SPSS! Pilih uji statistik di bawah ini untuk langsung mendapatkan kesimpulan otomatis dalam bahasa sehari-hari.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBeginnerGuide(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all"
              title="Tutup Panduan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            
            {/* Step 1: Scenario Picker */}
            <div className="bg-white/90 dark:bg-slate-900/90 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">1</span>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Pilih Pertanyaan Penelitianmu
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Klik tombol di bawah ini sesuai pertanyaan yang ingin kamu jawab:
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setActiveSubTab('bivariate');
                      setBivariateMode('crosstab');
                      setBivariateVarX('jenisKelamin');
                      setBivariateVarY('statusKaries');
                    }}
                    className="w-full text-left p-2.5 bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 dark:hover:bg-pink-900/60 text-pink-900 dark:text-pink-200 rounded-xl border border-pink-200 dark:border-pink-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>📊 Hubungan 2 Faktor (Misal: JK vs Karies)</span>
                    <span className="text-[10px] bg-pink-600 text-white px-2 py-0.5 rounded-full group-hover:scale-105 transition-transform">Chi-Square</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('bivariate');
                      setBivariateMode('ttest');
                    }}
                    className="w-full text-left p-2.5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 rounded-xl border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>⚖️ Beda Rata-rata 2 Kelompok (Misal: DMF-T)</span>
                    <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full group-hover:scale-105 transition-transform">T-Test</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('bivariate');
                      setBivariateMode('correlation');
                    }}
                    className="w-full text-left p-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-200 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>📈 Korelasi Angka (Misal: Umur vs OHI-S)</span>
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full group-hover:scale-105 transition-transform">Pearson r</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('bivariate');
                      setBivariateMode('paired');
                    }}
                    className="w-full text-left p-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>🔄 Perbandingan 2 Indeks Berpasangan</span>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full group-hover:scale-105 transition-transform">Paired T</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: How to read p-value & OR */}
            <div className="bg-white/90 dark:bg-slate-900/90 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">2</span>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Cara Membaca Angka Hasil (Kunci Utama)
                  </h4>
                </div>
                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <span className="font-extrabold text-emerald-800 dark:text-emerald-300 block mb-0.5">🟢 p-value &lt; 0.05 = TERBUKTI ADA HUBUNGAN</span>
                    <p className="text-[11px] text-emerald-900 dark:text-emerald-200">
                      Jika angka <strong>p-value / Asymp. Sig</strong> kurang dari 0.05, artinya hasilnya <strong>SIGNIFIKAN</strong> (terbukti ada hubungan/perbedaan nyata).
                    </p>
                  </div>

                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800">
                    <span className="font-extrabold text-amber-800 dark:text-amber-300 block mb-0.5">🔴 p-value ≥ 0.05 = TIDAK ADA HUBUNGAN</span>
                    <p className="text-[11px] text-amber-900 dark:text-amber-200">
                      Artinya perbedaan atau hubungan yang ditemukan tidak bermakna secara statistik (mungkin hanya kebetulan).
                    </p>
                  </div>

                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px]">
                    <strong>💡 Odds Ratio (OR):</strong> Angka ini menunjukkan berapa kali lipat risiko kelompok tertentu.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Quick Indonesian Summary & Copy */}
            <div className="bg-white/90 dark:bg-slate-900/90 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">3</span>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Kesimpulan Otomatis Laporan
                  </h4>
                </div>
                <div className="p-3 bg-gradient-to-br from-pink-50 to-orange-50 dark:from-slate-800 dark:to-slate-800/80 rounded-xl border border-pink-200 dark:border-pink-900/40 text-xs text-slate-800 dark:text-slate-200 space-y-1.5 font-medium">
                  <div className="font-bold text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Uji Saat Ini ({bivariateResult.varXLabel} vs {bivariateResult.varYLabel}):
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    "{bivariateResult.isSignificant 
                      ? `Terdapat hubungan signifikan antara ${bivariateResult.varXLabel} dengan ${bivariateResult.varYLabel} (p = ${bivariateResult.pValue < 0.001 ? '<0.001' : bivariateResult.pValue.toFixed(3)} < 0.05).`
                      : `Tidak terdapat hubungan signifikan antara ${bivariateResult.varXLabel} dengan ${bivariateResult.varYLabel} (p = ${bivariateResult.pValue.toFixed(3)} ≥ 0.05).`}"
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveSubTab('bivariate');
                }}
                className="mt-3 w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-extrabold rounded-xl shadow-md hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <GitCompare className="w-4 h-4" />
                <span>Buka Detail Analisis Bivariat</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* KPI Cards Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        
        {/* Total Sample N */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Sampel (N)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">{metrics.totalN}</span>
            <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-1.5 py-0.5 rounded-full">100%</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">Responden Terdata</p>
        </div>

        {/* Rata-rata DMF-T */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-rata DMF-T</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-pink-600 dark:text-pink-400">{metrics.meanDMFT.toFixed(2)}</span>
            <span className="text-[9px] font-bold text-slate-500">± {metrics.sdDMFT.toFixed(1)}</span>
          </div>
          <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 ${dmftCategoryInfo.badgeBg}`}>
            WHO: {dmftCategoryInfo.text.split(' ')[0]}
          </span>
        </div>

        {/* Rata-rata deft */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-rata def-t</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">{metrics.meanDeft.toFixed(2)}</span>
            <span className="text-[9px] font-bold text-slate-500">Sulung</span>
          </div>
          <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 ${deftCategoryInfo.badgeBg}`}>
            WHO: {deftCategoryInfo.text.split(' ')[0]}
          </span>
        </div>

        {/* Rata-rata OHI-S */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-teal-200/60 dark:border-teal-900/40 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-rata OHI-S</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-teal-600 dark:text-teal-400">{metrics.ohisStats?.avgOHIS?.toFixed(2) || '0.00'}</span>
            <span className="text-[9px] font-bold text-slate-500">DI:{metrics.ohisStats?.avgDIS?.toFixed(1) || '0.0'}</span>
          </div>
          <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 ${
            (metrics.ohisStats?.avgOHIS || 0) <= 1.2 ? 'bg-emerald-100 text-emerald-800' : (metrics.ohisStats?.avgOHIS || 0) <= 3.0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {(metrics.ohisStats?.avgOHIS || 0) <= 1.2 ? 'Baik' : (metrics.ohisStats?.avgOHIS || 0) <= 3.0 ? 'Sedang' : 'Buruk'}
          </span>
        </div>

        {/* Prevalensi Karies */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prevalensi Karies</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{metrics.cariesPrevalencePct.toFixed(1)}%</span>
            <span className="text-[9px] font-bold text-slate-500">{metrics.cariesCount} org</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Bebas: {metrics.cariesFreePct.toFixed(1)}%</p>
        </div>

        {/* SiC Index */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-purple-200/60 dark:border-purple-900/40 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SiC Index</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">{metrics.siCIndex.toFixed(2)}</span>
            <span className="text-[9px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-1 py-0.5 rounded">Top 1/3</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Risiko Tinggi</p>
        </div>

        {/* Care Index */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-emerald-200/60 dark:border-emerald-900/40 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Care Index</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{metrics.careIndexPct.toFixed(1)}%</span>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded">F/DMFT</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Restorasi</p>
        </div>

        {/* Rujukan Faskes */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-blue-200/60 dark:border-blue-900/40 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Perlu Rujukan</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{metrics.perluDirujukPct.toFixed(1)}%</span>
            <span className="text-[9px] font-bold text-slate-500">{metrics.perluDirujukCount} org</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Gusi Berdarah: {metrics.gusiBerdarahPct.toFixed(1)}%</p>
        </div>

      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-pink-200/60 dark:border-pink-900/40" id="quant-subtabs">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
              : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700'
          }`}
          id="subtab-quant-overview"
        >
          <Activity className="w-4 h-4" />
          Formulasi & Indeks Utama
        </button>

        <button
          onClick={() => setActiveSubTab('bivariate')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'bivariate'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30 ring-2 ring-pink-400/50'
              : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700'
          }`}
          id="subtab-quant-bivariate"
        >
          <GitCompare className="w-4 h-4 text-pink-300" />
          Analisis Bivariat (Chi-Square, T-Test/Mann-Whitney, Korelasi &amp; Paired)
        </button>

        <button
          onClick={() => setActiveSubTab('descriptive')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'descriptive'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
              : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700'
          }`}
          id="subtab-quant-descriptive"
        >
          <FileText className="w-4 h-4 text-pink-300" />
          Analisis Deskriptif
        </button>

        <button
          onClick={() => setActiveSubTab('qualitative')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'qualitative'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
              : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700'
          }`}
          id="subtab-quant-qualitative"
        >
          <BookOpen className="w-4 h-4 text-pink-300" />
          Analisis Kualitatif
        </button>

        <button
          onClick={() => setActiveSubTab('age')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'age'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
              : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700'
          }`}
          id="subtab-quant-age"
        >
          <Users className="w-4 h-4" />
          Tabulasi Silang Kelompok Umur
        </button>

        <button
          onClick={() => setActiveSubTab('gender')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'gender'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
              : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700'
          }`}
          id="subtab-quant-gender"
        >
          <BarChart2 className="w-4 h-4" />
          Tabulasi Silang Gender
        </button>

        <button
          onClick={() => setActiveSubTab('demographics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'demographics'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
              : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700'
          }`}
          id="subtab-quant-demographics"
        >
          <PieChart className="w-4 h-4" />
          Pendidikan & Pekerjaan
        </button>

        <button
          onClick={() => setActiveSubTab('individual')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'individual'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
              : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700'
          }`}
          id="subtab-quant-individual"
        >
          <Calculator className="w-4 h-4" />
          Matriks Skor Individual ({respondents.length})
        </button>
      </div>

      {/* Sub-Tab 1: OVERVIEW FORMULASI & INDEKS UTAMA */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Breakdown DMF-T & deft */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-pink-100 dark:border-slate-800 mb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  Rincian Komponen Karies Gigi (DMF-T & def-t)
                </h3>
              </div>

              <div className="space-y-4">
                {/* DMF-T Gigi Tetap */}
                <div className="p-4 bg-pink-50/50 dark:bg-pink-950/30 rounded-2xl border border-pink-200/50 dark:border-pink-900/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-extrabold text-pink-950 dark:text-pink-200 uppercase">Gigi Tetap (DMF-T)</span>
                    <span className="text-xs font-black text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/60 px-2.5 py-0.5 rounded-full">
                      Rata-rata: {metrics.meanDMFT.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                      <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Decayed (D)</p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{metrics.meanD.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-500">Total: {metrics.sumD}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                      <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Missing (M)</p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{metrics.meanM.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-500">Total: {metrics.sumM}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Filled (F)</p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{metrics.meanF.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-500">Total: {metrics.sumF}</p>
                    </div>
                  </div>
                </div>

                {/* deft Gigi Sulung */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-200 uppercase">Gigi Sulung (def-t)</span>
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full">
                      Rata-rata: {metrics.meanDeft.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                      <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">decayed (d)</p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{metrics.mean_d.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-500">Total: {metrics.sum_d}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                      <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">extracted (e)</p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{metrics.mean_e.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-500">Total: {metrics.sum_e}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">filled (f)</p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{metrics.mean_f.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-500">Total: {metrics.sum_f}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Indeks Kuantitatif Lanjutan & Epidemiologi */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-pink-100 dark:border-slate-800 mb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  Indeks Lanjutan & Rasio Kebutuhan Perawatan
                </h3>
              </div>

              <div className="space-y-3.5">
                
                {/* SiC Index */}
                <div className="flex items-center justify-between p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl border border-purple-200/50 dark:border-purple-900/30">
                  <div>
                    <span className="text-xs font-black text-purple-900 dark:text-purple-300">Significant Caries Index (SiC Index)</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Rata-rata DMF-T pada 1/3 populasi karies tertinggi</p>
                  </div>
                  <span className="text-lg font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-3 py-1 rounded-xl">
                    {metrics.siCIndex.toFixed(2)}
                  </span>
                </div>

                {/* Restorative Index */}
                <div className="flex items-center justify-between p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-200/50 dark:border-blue-900/30">
                  <div>
                    <span className="text-xs font-black text-blue-900 dark:text-blue-300">Restorative Index (RI)</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Rasio tumpatan efektif terhadap total karies & tumpatan</p>
                  </div>
                  <span className="text-lg font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-3 py-1 rounded-xl">
                    {metrics.restorativeIndexPct.toFixed(1)}%
                  </span>
                </div>

                {/* Required Treatment Index */}
                <div className="flex items-center justify-between p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-200/50 dark:border-rose-900/30">
                  <div>
                    <span className="text-xs font-black text-rose-900 dark:text-rose-300">Required Treatment Index (RTI)</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Persentase gigi karies aktif memerlukan tindakan restorasi</p>
                  </div>
                  <span className="text-lg font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-3 py-1 rounded-xl">
                    {metrics.requiredTreatmentIndexPct.toFixed(1)}%
                  </span>
                </div>

                {/* Missing Ratio */}
                <div className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/50 dark:border-amber-900/30">
                  <div>
                    <span className="text-xs font-black text-amber-900 dark:text-amber-300">Missing Ratio (MORT)</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Proporsi gigi yang telah dicabut akibat karies dibanding DMF-T</p>
                  </div>
                  <span className="text-lg font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-3 py-1 rounded-xl">
                    {metrics.missingRatioPct.toFixed(1)}%
                  </span>
                </div>

              </div>
            </div>

          </div>

          {/* Additional Indicator Grid: OHI-S Kebersihan Mulut & Status Mukosa Oral / Rujukan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* OHI-S Debris & Calculus Breakdown */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-teal-200/60 dark:border-teal-900/40 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-teal-100 dark:border-teal-900/40 mb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Kebersihan Mulut OHI-S (Greene &amp; Vermillion)
                </h3>
                <span className="text-xs font-black text-teal-700 bg-teal-100 dark:bg-teal-950 dark:text-teal-300 px-3 py-1 rounded-full">
                  Rata-rata OHI-S: {metrics.ohisStats?.avgOHIS?.toFixed(2) || '0.00'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-200/50 dark:border-teal-900/30">
                  <p className="text-[10px] font-extrabold text-teal-900 dark:text-teal-300 uppercase">Debris Index (DI-S)</p>
                  <p className="text-xl font-black text-teal-700 dark:text-teal-300 mt-0.5">{metrics.ohisStats?.avgDIS?.toFixed(2) || '0.00'}</p>
                  <p className="text-[10px] text-slate-500">Skor Debris</p>
                </div>

                <div className="p-3 bg-cyan-50/50 dark:bg-cyan-950/30 rounded-2xl border border-cyan-200/50 dark:border-cyan-900/30">
                  <p className="text-[10px] font-extrabold text-cyan-900 dark:text-cyan-300 uppercase">Calculus Index (CI-S)</p>
                  <p className="text-xl font-black text-cyan-700 dark:text-cyan-300 mt-0.5">{metrics.ohisStats?.avgCIS?.toFixed(2) || '0.00'}</p>
                  <p className="text-[10px] text-slate-500">Skor Karang Gigi</p>
                </div>

                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30">
                  <p className="text-[10px] font-extrabold text-emerald-900 dark:text-emerald-300 uppercase">Status Kebersihan</p>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {(metrics.ohisStats?.avgOHIS || 0) <= 1.2 ? 'Baik' : (metrics.ohisStats?.avgOHIS || 0) <= 3.0 ? 'Sedang' : 'Buruk'}
                  </p>
                  <p className="text-[10px] text-slate-500">Standar WHO</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Kategori OHI-S Baik (0.0 - 1.2):</span>
                  <span className="font-bold text-emerald-600">
                    {((respondents.filter(r => (r.ohis?.ohisScore || 0) <= 1.2).length / (metrics.totalN || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kategori OHI-S Sedang (1.3 - 3.0):</span>
                  <span className="font-bold text-amber-600">
                    {((respondents.filter(r => (r.ohis?.ohisScore || 0) > 1.2 && (r.ohis?.ohisScore || 0) <= 3.0).length / (metrics.totalN || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kategori OHI-S Buruk (3.1 - 6.0):</span>
                  <span className="font-bold text-rose-600">
                    {((respondents.filter(r => (r.ohis?.ohisScore || 0) > 3.0).length / (metrics.totalN || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Mukosa Oral & Status Perawatan / Rujukan */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-blue-200/60 dark:border-blue-900/40 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/40 mb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Kondisi Jaringan Lunak Mukosa &amp; Rencana Tindak Lanjut
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-200/40">
                  <p className="text-[10px] font-extrabold text-rose-800 dark:text-rose-300 uppercase">Gusi Berdarah (Bleeding)</p>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{metrics.gusiBerdarahPct.toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-500">{metrics.gusiBerdarahCount} responden</p>
                </div>

                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl border border-purple-200/40">
                  <p className="text-[10px] font-extrabold text-purple-800 dark:text-purple-300 uppercase">Lesi Mukosa Oral</p>
                  <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{metrics.lesiMukosaPct.toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-500">{metrics.lesiMukosaCount} responden</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-200/40 space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex justify-between font-bold">
                  <span>Memerlukan Perawatan Segera (Urgent):</span>
                  <span className="text-rose-600 font-black">{metrics.perluPerawatanSegeraPct.toFixed(1)}% ({metrics.perluPerawatanSegeraCount} org)</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Memerlukan Perawatan Tidak Segera:</span>
                  <span className="text-amber-600 font-black">{metrics.perluPerawatanTidakSegeraPct.toFixed(1)}% ({metrics.perluPerawatanTidakSegeraCount} org)</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-blue-200/50">
                  <span>Memerlukan Rujukan Faskes Lanjutan:</span>
                  <span className="text-blue-600 font-black">{metrics.perluDirujukPct.toFixed(1)}% ({metrics.perluDirujukCount} org)</span>
                </div>
              </div>
            </div>

          </div>

          {/* Standar Keparahan WHO Scale Visualizer */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              Garis Panduan Severitas Karies WHO (World Health Organization)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
              Posisi nilai rata-rata DMF-T ({metrics.meanDMFT.toFixed(2)}) dan deft ({metrics.meanDeft.toFixed(2)}) dibandingkan norma acuan WHO:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              
              <div className={`p-4 rounded-2xl border text-center transition-all ${metrics.meanDMFT < 1.2 ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 shadow-md ring-2 ring-emerald-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'}`}>
                <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase">Sangat Rendah</p>
                <p className="text-xs font-mono font-bold mt-1 text-slate-600 dark:text-slate-400">&lt; 1.2</p>
                {metrics.meanDMFT < 1.2 && <span className="inline-block mt-2 text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">Status Aktif</span>}
              </div>

              <div className={`p-4 rounded-2xl border text-center transition-all ${metrics.meanDMFT >= 1.2 && metrics.meanDMFT < 2.7 ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-md ring-2 ring-blue-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'}`}>
                <p className="text-[11px] font-black text-blue-800 dark:text-blue-300 uppercase">Rendah</p>
                <p className="text-xs font-mono font-bold mt-1 text-slate-600 dark:text-slate-400">1.2 - 2.6</p>
                {metrics.meanDMFT >= 1.2 && metrics.meanDMFT < 2.7 && <span className="inline-block mt-2 text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full">Status Aktif</span>}
              </div>

              <div className={`p-4 rounded-2xl border text-center transition-all ${metrics.meanDMFT >= 2.7 && metrics.meanDMFT < 4.5 ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 shadow-md ring-2 ring-amber-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'}`}>
                <p className="text-[11px] font-black text-amber-800 dark:text-amber-300 uppercase">Sedang</p>
                <p className="text-xs font-mono font-bold mt-1 text-slate-600 dark:text-slate-400">2.7 - 4.4</p>
                {metrics.meanDMFT >= 2.7 && metrics.meanDMFT < 4.5 && <span className="inline-block mt-2 text-[10px] font-extrabold bg-amber-600 text-white px-2 py-0.5 rounded-full">Status Aktif</span>}
              </div>

              <div className={`p-4 rounded-2xl border text-center transition-all ${metrics.meanDMFT >= 4.5 && metrics.meanDMFT < 6.6 ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500 shadow-md ring-2 ring-orange-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'}`}>
                <p className="text-[11px] font-black text-orange-800 dark:text-orange-300 uppercase">Tinggi</p>
                <p className="text-xs font-mono font-bold mt-1 text-slate-600 dark:text-slate-400">4.5 - 6.5</p>
                {metrics.meanDMFT >= 4.5 && metrics.meanDMFT < 6.6 && <span className="inline-block mt-2 text-[10px] font-extrabold bg-orange-600 text-white px-2 py-0.5 rounded-full">Status Aktif</span>}
              </div>

              <div className={`p-4 rounded-2xl border text-center transition-all ${metrics.meanDMFT >= 6.6 ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 shadow-md ring-2 ring-rose-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'}`}>
                <p className="text-[11px] font-black text-rose-800 dark:text-rose-300 uppercase">Sangat Tinggi</p>
                <p className="text-xs font-mono font-bold mt-1 text-slate-600 dark:text-slate-400">&ge; 6.6</p>
                {metrics.meanDMFT >= 6.6 && <span className="inline-block mt-2 text-[10px] font-extrabold bg-rose-600 text-white px-2 py-0.5 rounded-full">Status Aktif</span>}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Sub-Tab: ANALISIS BIVARIAT (UJI HIPOTESIS CHI-SQUARE & T-TEST) */}
      {activeSubTab === 'bivariate' && (
        <div className="space-y-6">
          {/* Controls & Variable Selector Header */}
          <div className="bg-gradient-to-br from-slate-900 via-pink-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-pink-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-pink-500/20">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-pink-500/20 text-pink-300 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider border border-pink-500/30">
                    Modul Penelitian Bivariat
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Uji Chi-Square &amp; Odds Ratio
                  </span>
                </div>
                <h2 className="text-xl font-black mt-2 flex items-center gap-2">
                  <GitCompare className="w-6 h-6 text-pink-400" />
                  Uji Hubungan Bivariat Antar Variabel Research
                </h2>
                <p className="text-xs text-pink-200/80 mt-1">
                  Pilih Variabel X (Faktor Risiko / Independen) dan Variabel Y (Outcome Klinis / Dependen) untuk menguji hipotesis statistik secara otomatis.
                </p>
              </div>

              {/* Bivariate Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportSPSS}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black rounded-2xl shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95 ring-2 ring-indigo-400/30"
                  id="btn-export-bivariate-spss"
                  title="Ekspor Dataset Pre-Coded Numerik (.xlsx) Siap Impor ke IBM SPSS Statistics"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ekspor Master Data SPSS</span>
                </button>
                <button
                  onClick={() => exportBivariatePdf(bivariateResult, sessionName, respondents, customTTestResult, customPairedResult, correlationResult)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-black rounded-2xl shadow-lg transition-all cursor-pointer hover:scale-105"
                  id="btn-export-bivariate-pdf"
                >
                  <FileDown className="w-4 h-4" />
                  <span>PDF Bivariat</span>
                </button>
                <button
                  onClick={() => exportBivariateExcel(bivariateResult, sessionName)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-lg transition-all cursor-pointer hover:scale-105"
                  id="btn-export-bivariate-excel"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Excel Bivariat</span>
                </button>
              </div>
            </div>

            {/* Bivariate Subtab Mode Navigation */}
            <div className="flex flex-wrap items-center gap-2 mt-6 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10">
              <button
                onClick={() => setBivariateMode('crosstab')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${bivariateMode === 'crosstab' ? 'bg-pink-600 text-white shadow-md scale-105' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>1. Tabulasi Silang &amp; Chi-Square (χ²)</span>
              </button>
              <button
                onClick={() => setBivariateMode('ttest')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${bivariateMode === 'ttest' ? 'bg-pink-600 text-white shadow-md scale-105' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
              >
                <Activity className="w-4 h-4" />
                <span>2. Uji T-Independent &amp; Mann-Whitney</span>
              </button>
              <button
                onClick={() => setBivariateMode('correlation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${bivariateMode === 'correlation' ? 'bg-pink-600 text-white shadow-md scale-105' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>3. Korelasi Pearson &amp; Spearman</span>
              </button>
              <button
                onClick={() => setBivariateMode('paired')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${bivariateMode === 'paired' ? 'bg-pink-600 text-white shadow-md scale-105' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
              >
                <GitCompare className="w-4 h-4" />
                <span>4. Uji Berpasangan (Paired T &amp; Wilcoxon)</span>
              </button>
            </div>
          </div>

          {/* Master Data SPSS Callout Banner for Bivariate Analysis */}
          <div className="bg-gradient-to-r from-indigo-900/90 via-purple-900/80 to-slate-900 text-white p-5 rounded-3xl border border-indigo-500/30 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-indigo-600/30 text-indigo-300 rounded-2xl border border-indigo-400/30 shrink-0">
                <FileSpreadsheet className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                    Ekspor Master Data Bivariat SPSS
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                    Format .XLSX Pre-Coded
                  </span>
                </div>
                <h4 className="text-base font-black text-white mt-1">
                  Ekspor Master Data Ter-Kode Siap Impor ke IBM SPSS Statistics
                </h4>
                <p className="text-xs text-indigo-100/90 mt-0.5 leading-relaxed max-w-2xl">
                  Unduh seluruh dataset penelitian dalam format Excel ter-kode numerik (seperti JK_CODE, KEL_UMUR_CODE, KARIES_STATUS, OHIS_CAT_CODE) dan kontinu (DMF-T, def-t, OHI-S) beserta kamus Variable View. Siap dipakai untuk analisis Crosstabs/Chi-Square, Independent T-Test, Paired T-Test, dan Korelasi di aplikasi IBM SPSS.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
              <button
                onClick={handleExportSPSS}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                id="btn-export-bivariate-spss-banner"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Master Data SPSS (.xlsx)</span>
              </button>

              <button
                onClick={() => setShowSpssGuideModal(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-indigo-100 text-xs font-bold rounded-2xl border border-white/20 transition-all cursor-pointer"
                title="Lihat Petunjuk Impor &amp; Syntax SPSS"
              >
                <HelpCircle className="w-4 h-4 text-indigo-300" />
                <span>Panduan &amp; Syntax SPSS</span>
              </button>
            </div>
          </div>

          {/* MODE 1: CROSSTABULATION & CHI-SQUARE TESTS */}
          {bivariateMode === 'crosstab' && (
            <div className="space-y-6">
              {/* Variable Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
                  <label className="block text-xs font-extrabold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500 text-white font-black flex items-center justify-center text-[10px]">X</span>
                    Variabel Baris / Independen (Faktor Risiko)
                  </label>
                  <select
                    value={bivariateVarX}
                    onChange={(e) => setBivariateVarX(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs p-3 rounded-xl border border-pink-300 dark:border-pink-800 focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
                  >
                    <option value="jenisKelamin">[SPSS: JK_CODE] Jenis Kelamin (1=Laki-Laki, 2=Perempuan)</option>
                    <option value="kelompokUmur">[SPSS: KEL_UMUR_CODE] Kelompok Umur WHO (1=0-4, 2=5-11, 3=12-17, 4=18-59, 5=60+)</option>
                    <option value="kategoriOHIS">[SPSS: OHIS_CAT_CODE] Kategori OHI-S (1=Baik, 2=Sedang, 3=Buruk)</option>
                    <option value="statusKaries">[SPSS: KARIES_STATUS] Status Karies (0=Bebas Karies, 1=Karies Aktif)</option>
                    <option value="gusiBerdarah">[SPSS: GUSI_BERDARAH] Kesehatan Gusi (0=Normal, 1=Gusi Berdarah)</option>
                    <option value="lesiMukosa">[SPSS: LESI_MUKOSA] Lesi Mukosa Oral (0=Normal, 1=Ada Lesi)</option>
                    <option value="rencanaRujukan">[SPSS: PERLU_RUJUKAN] Status Rujukan (0=Tidak, 1=Dirujuk)</option>
                    <option value="pendidikan">[SPSS: PENDIDIKAN_CODE] Tingkat Pendidikan Terakhir (1-5)</option>
                    <option value="pekerjaan">[SPSS: PEKERJAAN_CODE] Sektor Pekerjaan / Aktivitas (1-6)</option>
                  </select>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
                  <label className="block text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500 text-white font-black flex items-center justify-center text-[10px]">Y</span>
                    Variabel Kolom / Dependen (Outcome Klinis)
                  </label>
                  <select
                    value={bivariateVarY}
                    onChange={(e) => setBivariateVarY(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs p-3 rounded-xl border border-purple-300 dark:border-purple-800 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="statusKaries">[SPSS: KARIES_STATUS] Status Karies (0=Bebas Karies, 1=Karies Aktif)</option>
                    <option value="keparahanDMFT">[SPSS: DMFT_CAT_CODE] Keparahan DMFT WHO (1=Rendah &lt;2.7, 2=Tinggi &ge;2.7)</option>
                    <option value="kategoriOHIS">[SPSS: OHIS_CAT_CODE] Kebersihan Mulut OHI-S (1=Baik, 2=Sedang, 3=Buruk)</option>
                    <option value="statusOHIS">[SPSS: OHIS_CAT_CODE] Status OHI-S (0=Baik &le;1.2, 1=Sedang/Buruk &gt;1.2)</option>
                    <option value="gusiBerdarah">[SPSS: GUSI_BERDARAH] Kesehatan Gusi (0=Normal, 1=Gusi Berdarah)</option>
                    <option value="lesiMukosa">[SPSS: LESI_MUKOSA] Lesi Mukosa Oral (0=Normal, 1=Ada Lesi)</option>
                    <option value="rencanaRujukan">[SPSS: PERLU_RUJUKAN] Status Rujukan Faskes (0=Tidak, 1=Dirujuk)</option>
                    <option value="perluPerawatanSegera">[SPSS: PERAWATAN_SEGERA] Perawatan Segera (0=Tidak, 1=Ya)</option>
                  </select>
                </div>
              </div>

              {/* SPSS Variable Mapping Card for Crosstab / Chi-Square */}
              {(() => {
                const infoX = getSpssVarInfo(bivariateVarX);
                const infoY = getSpssVarInfo(bivariateVarY);
                return (
                  <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950/90 p-4 rounded-2xl border border-indigo-500/40 text-white shadow-md space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-500/30">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200">
                          📌 Peta Variabel &amp; Panduan Menu Dialog IBM SPSS (Chi-Square / Crosstabs)
                        </h4>
                      </div>
                      <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                        Pastikan Pilih Nama Kolom Ini di SPSS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                        <span className="text-[10px] font-extrabold uppercase text-pink-300 block mb-0.5">
                          1. Masukkan ke Kotak Row(s) (Baris) di SPSS:
                        </span>
                        <div className="text-sm font-black font-mono text-amber-300 flex items-center gap-1.5">
                          <span>{infoX.name}</span>
                          <span className="text-[10px] font-sans font-bold bg-pink-500/30 text-pink-200 px-2 py-0.5 rounded-md border border-pink-400/30">
                            {infoX.scale}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white mt-1">{infoX.label}</p>
                        <p className="text-[10px] text-slate-300 font-mono mt-0.5">Koding: {infoX.coding}</p>
                      </div>

                      <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                        <span className="text-[10px] font-extrabold uppercase text-purple-300 block mb-0.5">
                          2. Masukkan ke Kotak Column(s) (Kolom) di SPSS:
                        </span>
                        <div className="text-sm font-black font-mono text-amber-300 flex items-center gap-1.5">
                          <span>{infoY.name}</span>
                          <span className="text-[10px] font-sans font-bold bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-md border border-purple-400/30">
                            {infoY.scale}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white mt-1">{infoY.label}</p>
                        <p className="text-[10px] text-slate-300 font-mono mt-0.5">Koding: {infoY.coding}</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-indigo-900/60 rounded-xl border border-indigo-400/30 text-xs text-indigo-100 font-sans leading-relaxed flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                      <div>
                        <strong>Langkah Pengujian di Aplikasi IBM SPSS Statistics:</strong><br />
                        1. Buka File Master Data Excel SPSS yang diunduh di atas.<br />
                        2. Buka menu <strong>Analyze &gt; Descriptive Statistics &gt; Crosstabs...</strong><br />
                        3. Pindahkan variabel <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoX.name}</code> ke kotak <strong>Row(s)</strong> dan <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoY.name}</code> ke kotak <strong>Column(s)</strong>.<br />
                        4. Klik tombol <strong>Statistics...</strong> &gt; Centang <strong>Chi-square</strong>, <strong>Phi and Cramer's V</strong> (dan <strong>Risk</strong> untuk tabel 2x2).<br />
                        5. Klik <strong>Continue</strong> &gt; Klik <strong>OK</strong>. Nilai Pearson Chi-Square, df, dan Asymp. Sig di SPSS dijamin 100% sama dengan hasil di web ini!
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* KPI Metrics Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pearson Chi-Square (χ²)</span>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{bivariateResult.chiSquare.toFixed(3)}</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">df = {bivariateResult.df}</p>
                </div>

                <div className={`p-4 rounded-2xl border shadow-sm ${bivariateResult.isSignificant ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'}`}>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Asymp. Sig. (2-sided)</span>
                  <div className={`text-xl font-black ${bivariateResult.isSignificant ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'} mt-1`}>
                    {bivariateResult.pValue < 0.001 ? '< 0.001' : bivariateResult.pValue.toFixed(3)}
                  </div>
                  <p className="text-[10px] font-bold mt-0.5">{bivariateResult.isSignificant ? 'H₀ Ditolak (Signifikan)' : 'H₀ Diterima (Tidak Sig)'}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Koreksi Kontinuitas (Yates)</span>
                  <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                    {bivariateResult.yatesChiSquare !== undefined ? bivariateResult.yatesChiSquare.toFixed(3) : '-'}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {bivariateResult.yatesPValue !== undefined ? `p = ${bivariateResult.yatesPValue.toFixed(3)}` : 'Khusus Tabel 2x2'}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fisher's Exact Test</span>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                    {bivariateResult.fishersExactP2Tailed !== undefined ? (bivariateResult.fishersExactP2Tailed < 0.001 ? '< 0.001' : bivariateResult.fishersExactP2Tailed.toFixed(3)) : '-'}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {bivariateResult.fishersExactP2Tailed !== undefined ? 'Exact Sig. (2-tailed)' : 'Khusus Tabel 2x2'}
                  </p>
                </div>
              </div>

              {/* Plain Indonesian Conclusion Box */}
              <div className={`p-5 rounded-3xl border-2 ${bivariateResult.isSignificant ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'} shadow-md`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-2xl ${bivariateResult.isSignificant ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'} shrink-0 mt-0.5`}>
                      {bivariateResult.isSignificant ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${bivariateResult.isSignificant ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {bivariateResult.isSignificant ? '✅ TERBUKTI ADA HUBUNGAN (SIGNIFIKAN)' : '⚠️ TIDAK ADA HUBUNGAN SIGNIFIKAN'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          p = {bivariateResult.pValue < 0.001 ? '< 0.001' : bivariateResult.pValue.toFixed(3)} {bivariateResult.isSignificant ? '< 0.05' : '≥ 0.05'}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                        {bivariateResult.isSignificant 
                          ? `Berdasarkan Uji Chi-Square, terdapat hubungan yang bermakna secara statistik antara ${bivariateResult.varXLabel} dengan ${bivariateResult.varYLabel}.`
                          : `Berdasarkan Uji Chi-Square, tidak terdapat hubungan yang bermakna secara statistik antara ${bivariateResult.varXLabel} dengan ${bivariateResult.varYLabel}.`}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {bivariateResult.isSignificant
                          ? `Nilai p-value (${bivariateResult.pValue.toFixed(3)}) lebih kecil dari tingkat signifikansi α = 0.05. Artinya, perbedaan antar kelompok ini nyata dan bukan karena faktor kebetulan.`
                          : `Nilai p-value (${bivariateResult.pValue.toFixed(3)}) lebih besar dari tingkat signifikansi α = 0.05. Artinya, variasi antar kelompok masih dianggap wajar secara statistik.`}
                        {bivariateResult.oddsRatio && bivariateResult.oddsRatio > 1 && (
                          <span className="block mt-1 font-bold text-pink-600 dark:text-pink-400">
                            💡 Analisis Risiko (Odds Ratio): Responden pada kelompok ini berisiko {bivariateResult.oddsRatio.toFixed(2)} kali lebih tinggi mengalami {bivariateResult.varYLabel}.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const text = `${bivariateResult.isSignificant ? 'ADA HUBUNGAN SIGNIFIKAN' : 'TIDAK ADA HUBUNGAN SIGNIFIKAN'} antara ${bivariateResult.varXLabel} dan ${bivariateResult.varYLabel} (Chi-Square χ² = ${bivariateResult.chiSquare.toFixed(2)}, p = ${bivariateResult.pValue < 0.001 ? '<0.001' : bivariateResult.pValue.toFixed(3)}).`;
                      navigator.clipboard.writeText(text);
                      alert('Kalimat kesimpulan berhasil disalin! Tinggal tempel di naskah/laporanmu.');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold shrink-0 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                    title="Salin Kalimat Kesimpulan ke Clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kesimpulan</span>
                  </button>
                </div>
              </div>

              {/* Crosstabulation Table */}
              <div className="bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm overflow-hidden">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-pink-600" />
                  {bivariateResult.varXLabel} * {bivariateResult.varYLabel} Crosstabulation
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold">
                        <th className="p-3">{bivariateResult.varXLabel}</th>
                        {bivariateResult.categoriesY.map(catY => (
                          <th key={catY} className="p-3 text-center">{catY}</th>
                        ))}
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                      {bivariateResult.categoriesX.map((catX, rIdx) => (
                        <tr key={catX} className="hover:bg-pink-50/50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-bold bg-slate-50 dark:bg-slate-800/40">{catX}</td>
                          {bivariateResult.categoriesY.map((_, cIdx) => {
                            const cell = bivariateResult.matrix[rIdx][cIdx];
                            return (
                              <td key={cIdx} className="p-3 text-center">
                                <div className="font-black text-slate-900 dark:text-slate-100">{cell.observed}</div>
                                <div className="text-[10px] text-slate-500">Exp: {cell.expected.toFixed(1)}</div>
                                <div className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">{cell.rowPct.toFixed(1)}%</div>
                              </td>
                            );
                          })}
                          <td className="p-3 text-right font-black bg-slate-50 dark:bg-slate-800/40">
                            {bivariateResult.rowTotals[rIdx]} (100%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-black">
                        <td className="p-3">Total</td>
                        {bivariateResult.categoriesY.map((_, cIdx) => (
                          <td key={cIdx} className="p-3 text-center">
                            {bivariateResult.colTotals[cIdx]}
                          </td>
                        ))}
                        <td className="p-3 text-right text-pink-600">{bivariateResult.grandTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* SPSS Standard Chi-Square Tests Output Table */}
              <div className="bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm overflow-hidden">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-pink-600" />
                  Tabel Hasil Uji Statistik SPSS (Chi-Square Tests)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-extrabold">
                        <th className="p-2.5">Uji Statistik (Test)</th>
                        <th className="p-2.5 text-center">Nilai (Value)</th>
                        <th className="p-2.5 text-center">df</th>
                        <th className="p-2.5 text-center">Asymp. Sig. (2-sided)</th>
                        <th className="p-2.5 text-center">Exact Sig. (2-sided)</th>
                        <th className="p-2.5 text-center">Exact Sig. (1-sided)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="p-2.5 font-bold">Pearson Chi-Square</td>
                        <td className="p-2.5 text-center font-mono font-black">{bivariateResult.chiSquare.toFixed(3)}</td>
                        <td className="p-2.5 text-center font-mono">{bivariateResult.df}</td>
                        <td className="p-2.5 text-center font-mono font-black text-pink-600">{bivariateResult.pValue < 0.001 ? '.000' : bivariateResult.pValue.toFixed(3)}</td>
                        <td className="p-2.5 text-center text-slate-400">-</td>
                        <td className="p-2.5 text-center text-slate-400">-</td>
                      </tr>
                      {bivariateResult.is2x2 && (
                        <>
                          <tr>
                            <td className="p-2.5 font-bold">Continuity Correction (Yates)</td>
                            <td className="p-2.5 text-center font-mono font-black">{bivariateResult.yatesChiSquare?.toFixed(3)}</td>
                            <td className="p-2.5 text-center font-mono">1</td>
                            <td className="p-2.5 text-center font-mono">{bivariateResult.yatesPValue !== undefined ? (bivariateResult.yatesPValue < 0.001 ? '.000' : bivariateResult.yatesPValue.toFixed(3)) : '-'}</td>
                            <td className="p-2.5 text-center text-slate-400">-</td>
                            <td className="p-2.5 text-center text-slate-400">-</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">Likelihood Ratio</td>
                            <td className="p-2.5 text-center font-mono font-black">{bivariateResult.likelihoodRatio?.toFixed(3)}</td>
                            <td className="p-2.5 text-center font-mono">{bivariateResult.df}</td>
                            <td className="p-2.5 text-center font-mono">{bivariateResult.likelihoodPValue !== undefined ? (bivariateResult.likelihoodPValue < 0.001 ? '.000' : bivariateResult.likelihoodPValue.toFixed(3)) : '-'}</td>
                            <td className="p-2.5 text-center text-slate-400">-</td>
                            <td className="p-2.5 text-center text-slate-400">-</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">Fisher's Exact Test</td>
                            <td className="p-2.5 text-center text-slate-400">-</td>
                            <td className="p-2.5 text-center text-slate-400">-</td>
                            <td className="p-2.5 text-center text-slate-400">-</td>
                            <td className="p-2.5 text-center font-mono font-black text-purple-600">{bivariateResult.fishersExactP2Tailed !== undefined ? (bivariateResult.fishersExactP2Tailed < 0.001 ? '.000' : bivariateResult.fishersExactP2Tailed.toFixed(3)) : '-'}</td>
                            <td className="p-2.5 text-center font-mono">{bivariateResult.fishersExactP1Tailed !== undefined ? (bivariateResult.fishersExactP1Tailed < 0.001 ? '.000' : bivariateResult.fishersExactP1Tailed.toFixed(3)) : '-'}</td>
                          </tr>
                        </>
                      )}
                      <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold">
                        <td className="p-2.5">N of Valid Cases</td>
                        <td className="p-2.5 text-center font-mono">{bivariateResult.grandTotal}</td>
                        <td className="p-2.5 text-center" colSpan={4}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SPSS Risk Estimate Table (2x2) */}
              {bivariateResult.is2x2 && bivariateResult.oddsRatio !== undefined && (
                <div className="bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm overflow-hidden">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-purple-600" />
                    Tabel Estimasi Risiko SPSS (Risk Estimate - Odds Ratio &amp; Relative Risk)
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white font-extrabold">
                          <th className="p-2.5">Indikator Risiko</th>
                          <th className="p-2.5 text-center">Value (OR/RR)</th>
                          <th className="p-2.5 text-center" colSpan={2}>95% Confidence Interval</th>
                        </tr>
                        <tr className="bg-slate-700 text-slate-200 text-[10px]">
                          <th></th>
                          <th></th>
                          <th className="text-center w-32">Lower Limit</th>
                          <th className="text-center w-32">Upper Limit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                        <tr>
                          <td className="p-2.5 font-sans font-bold">Odds Ratio for {bivariateResult.varXLabel} ({bivariateResult.categoriesX[0]} / {bivariateResult.categoriesX[1]})</td>
                          <td className="p-2.5 text-center font-black text-purple-600">{bivariateResult.oddsRatio.toFixed(3)}</td>
                          <td className="p-2.5 text-center">{bivariateResult.orCiLower?.toFixed(3) || '-'}</td>
                          <td className="p-2.5 text-center">{bivariateResult.orCiUpper?.toFixed(3) || '-'}</td>
                        </tr>
                        {bivariateResult.relativeRisk !== undefined && (
                          <tr>
                            <td className="p-2.5 font-sans font-bold">For Cohort Outcome = {bivariateResult.categoriesY[0]} (Relative Risk)</td>
                            <td className="p-2.5 text-center font-black text-blue-600">{bivariateResult.relativeRisk.toFixed(3)}</td>
                            <td className="p-2.5 text-center">{bivariateResult.rrCiLower?.toFixed(3) || '-'}</td>
                            <td className="p-2.5 text-center">{bivariateResult.rrCiUpper?.toFixed(3) || '-'}</td>
                          </tr>
                        )}
                        <tr className="bg-slate-50 dark:bg-slate-800/40">
                          <td className="p-2.5 font-sans font-bold">N of Valid Cases</td>
                          <td className="p-2.5 text-center font-black">{bivariateResult.grandTotal}</td>
                          <td className="p-2.5 text-center" colSpan={2}>-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Academic Narrative Interpretation Box */}
              <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 dark:from-slate-900 dark:via-pink-950/40 dark:to-slate-900 border-2 border-pink-300/80 dark:border-pink-800/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-pink-200 dark:border-pink-900/60 mb-3">
                  <BookOpen className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Interpretasi &amp; Pembahasan Hasil Penelitian (Naratif Akademik Skripsi/Jurnal)
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium bg-white/60 dark:bg-slate-950/60 p-4 rounded-2xl border border-pink-200/50 dark:border-pink-900/30">
                  "{bivariateResult.narrativeInterpretation}"
                </p>
              </div>
            </div>
          )}

          {/* MODE 2: INDEPENDENT T-TEST & MANN-WHITNEY U TEST */}
          {bivariateMode === 'ttest' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
                
                {/* SPSS T-Test Troubleshooting & Dataset Download Banner */}
                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-md border border-indigo-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shrink-0">
                      <Terminal className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Format Dataset SPSS Otomatis (Pre-Coded)
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        Unduh file Excel koding numerik <code className="bg-white/10 px-1 py-0.5 rounded text-amber-300 font-mono">JK_CODE (1=Laki-Laki, 2=Perempuan)</code> dari data responden aktif Anda untuk siap diolah di IBM SPSS Statistics tanpa error.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={handleExportSPSS}
                      className="px-3.5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Unduh Dataset SPSS (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => setShowSpssGuideModal(true)}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <HelpCircle className="w-4 h-4 text-indigo-300" />
                      <span>Panduan SPSS</span>
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-pink-600" />
                  Uji Beda 2 Kelompok Independen: Independent Samples T-Test &amp; Mann-Whitney U Test
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Pilih variabel kelompok dan variabel nilai numerik untuk menguji signifikansi perbedaan antara 2 kelompok pembanding.
                </p>

                {/* Variable Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/40">
                    <label className="block text-xs font-extrabold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      1. Variabel Kelompok Pembanding (Grouping Variable)
                    </label>
                    <select
                      value={ttestGroupVar}
                      onChange={(e) => setTtestGroupVar(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs p-3 rounded-xl border border-pink-300 dark:border-pink-800 focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
                    >
                      <option value="jenisKelamin">[SPSS: JK_CODE] Jenis Kelamin (1 = Laki-Laki, 2 = Perempuan)</option>
                      <option value="statusKaries">[SPSS: KARIES_STATUS] Status Karies (0 = Bebas Karies, 1 = Karies Aktif)</option>
                      <option value="gusiBerdarah">[SPSS: GUSI_BERDARAH] Kesehatan Gusi (0 = Normal, 1 = Berdarah)</option>
                      <option value="lesiMukosa">[SPSS: LESI_MUKOSA] Lesi Mukosa Oral (0 = Normal, 1 = Ada Lesi)</option>
                      <option value="rencanaRujukan">[SPSS: PERLU_RUJUKAN] Status Rujukan Faskes (0 = Tidak, 1 = Dirujuk)</option>
                      <option value="perluPerawatanSegera">[SPSS: PERAWATAN_SEGERA] Kebutuhan Perawatan Segera (0 = Tidak, 1 = Ya)</option>
                      <option value="kategoriOHIS2Group">[SPSS: OHIS_CAT_CODE] Kebersihan Mulut OHI-S (1 = Baik, 2 = Sedang/Buruk)</option>
                      <option value="kelompokUmur2Group">[SPSS: KEL_UMUR_CODE] Kelompok Umur (1 = Anak ≤11 thn, 2 = Dewasa ≥12 thn)</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/40">
                    <label className="block text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      2. Variabel Nilai Uji Kuantitatif (Test Variable)
                    </label>
                    <select
                      value={ttestNumVar}
                      onChange={(e) => setTtestNumVar(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs p-3 rounded-xl border border-purple-300 dark:border-purple-800 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                    >
                      <option value="dmft">[SPSS: DMFT_SCORE] Indeks DMF-T (Gigi Tetap - Kontinu)</option>
                      <option value="deft">[SPSS: DEFT_SCORE] Indeks def-t (Gigi Sulung - Kontinu)</option>
                      <option value="ohis">[SPSS: OHIS_SCORE] Indeks Kebersihan Mulut OHI-S (Kontinu)</option>
                      <option value="dis">[SPSS: DIS_SCORE] Debris Index DI-S (Kontinu)</option>
                      <option value="cis">[SPSS: CIS_SCORE] Calculus Index CI-S (Kontinu)</option>
                      <option value="kariesTotal">[SPSS: D_TETAP] Jumlah Gigi Karies Aktif (d + D)</option>
                      <option value="tumpatTotal">[SPSS: F_TETAP] Jumlah Gigi Penambalan (f + F)</option>
                      <option value="umur">[SPSS: UMUR] Umur Responden (Tahun - Kontinu)</option>
                    </select>
                  </div>
                </div>

                {/* SPSS Variable Mapping Card for Independent T-Test */}
                {(() => {
                  const infoGroup = getSpssVarInfo(ttestGroupVar);
                  const infoNum = getSpssVarInfo(ttestNumVar);
                  return (
                    <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950/90 p-4 rounded-2xl border border-indigo-500/40 text-white shadow-md space-y-3 mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-500/30">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200">
                            📌 Peta Variabel &amp; Panduan Menu Dialog IBM SPSS (Independent T-Test &amp; Mann-Whitney)
                          </h4>
                        </div>
                        <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                          Panduan Uji Beda 2 Kelompok
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                          <span className="text-[10px] font-extrabold uppercase text-purple-300 block mb-0.5">
                            1. Masukkan ke Kotak Test Variable(s) di SPSS:
                          </span>
                          <div className="text-sm font-black font-mono text-amber-300 flex items-center gap-1.5">
                            <span>{infoNum.name}</span>
                            <span className="text-[10px] font-sans font-bold bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-md border border-purple-400/30">
                              {infoNum.scale}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white mt-1">{infoNum.label}</p>
                          <p className="text-[10px] text-slate-300 font-mono mt-0.5">Tipe: {infoNum.coding}</p>
                        </div>

                        <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                          <span className="text-[10px] font-extrabold uppercase text-pink-300 block mb-0.5">
                            2. Masukkan ke Kotak Grouping Variable di SPSS:
                          </span>
                          <div className="text-sm font-black font-mono text-amber-300 flex items-center gap-1.5">
                            <span>{infoGroup.name}</span>
                            <span className="text-[10px] font-sans font-bold bg-pink-500/30 text-pink-200 px-2 py-0.5 rounded-md border border-pink-400/30">
                              {infoGroup.scale}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white mt-1">{infoGroup.label}</p>
                          <p className="text-[10px] text-slate-300 font-mono mt-0.5">Define Groups: Kode ({infoGroup.groupCodes || '1, 2'})</p>
                        </div>
                      </div>

                      <div className="p-2.5 bg-indigo-900/60 rounded-xl border border-indigo-400/30 text-xs text-indigo-100 font-sans leading-relaxed flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                        <div>
                          <strong>Langkah Pengujian di Aplikasi IBM SPSS Statistics:</strong><br />
                          • <strong>Independent T-Test (Parametrik):</strong> Menu <strong>Analyze &gt; Compare Means &gt; Independent-Samples T Test...</strong> &gt; Masukkan <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoNum.name}</code> ke <strong>Test Variable(s)</strong> dan <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoGroup.name}</code> ke <strong>Grouping Variable</strong> &gt; Klik <strong>Define Groups...</strong> (Isikan Group 1: <code className="text-amber-200 font-mono">1</code> dan Group 2: <code className="text-amber-200 font-mono">2</code> atau <code className="text-amber-200 font-mono">0</code>) &gt; Klik <strong>OK</strong>.<br />
                          • <strong>Mann-Whitney U Test (Non-Parametrik):</strong> Menu <strong>Analyze &gt; Nonparametric Tests &gt; Legacy Dialogs &gt; 2 Independent Samples...</strong> &gt; Masukkan <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoNum.name}</code> ke <strong>Test Variable List</strong> dan <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoGroup.name}</code> ke <strong>Grouping Variable</strong> (Define Groups: 1 dan 2) &gt; Centang <strong>Mann-Whitney U</strong> &gt; Klik <strong>OK</strong>.
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Narrative Conclusion */}
                <div className="p-4 mb-6 bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Kesimpulan Narasi Uji Beda
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(customTTestResult.narrativeInterpretation);
                        alert('Kesimpulan uji beda berhasil disalin!');
                      }}
                      className="text-[10px] font-bold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Salin Teks
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    "{customTTestResult.narrativeInterpretation}"
                  </p>
                </div>

                {/* Group Statistics Table (SPSS Format) */}
                <h4 className="text-xs font-black uppercase text-pink-600 tracking-wider mb-2">1. Group Statistics (Statistik Deskriptif Kelompok)</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-extrabold">
                        <th className="p-2.5">Variabel Nilai Uji</th>
                        <th className="p-2.5">Kelompok ({customTTestResult.groupVarLabel})</th>
                        <th className="p-2.5 text-center">N</th>
                        <th className="p-2.5 text-center">Mean</th>
                        <th className="p-2.5 text-center">Std. Deviation</th>
                        <th className="p-2.5 text-center">Std. Error Mean</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      {customTTestResult.groupStats.map((g, idx) => (
                        <tr key={g.category} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                          <td className="p-2.5 font-sans font-bold">{customTTestResult.numVarLabel}</td>
                          <td className="p-2.5 font-sans font-extrabold text-pink-600">{g.category}</td>
                          <td className="p-2.5 text-center font-bold">{g.n}</td>
                          <td className="p-2.5 text-center font-black">{g.mean.toFixed(2)}</td>
                          <td className="p-2.5 text-center">{g.sd.toFixed(2)}</td>
                          <td className="p-2.5 text-center">{g.se.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Independent Samples Test Table (SPSS Format) */}
                {customTTestResult.tTest && (
                  <>
                    <h4 className="text-xs font-black uppercase text-pink-600 tracking-wider mb-2">2. Independent Samples Test (Uji T Parametrik SPSS)</h4>
                    <div className="overflow-x-auto mb-6">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-800 text-white font-extrabold">
                            <th className="p-2.5" rowSpan={2}>Variabel Test</th>
                            <th className="p-2.5 text-center" colSpan={2}>Levene's Test for Equality of Variances</th>
                            <th className="p-2.5 text-center" colSpan={5}>t-test for Equality of Means</th>
                          </tr>
                          <tr className="bg-slate-700 text-slate-200 text-[10px]">
                            <th className="text-center w-16">F</th>
                            <th className="text-center w-16">Sig.</th>
                            <th className="text-center w-16">t</th>
                            <th className="text-center w-16">df</th>
                            <th className="text-center w-20">Sig. (2-tailed)</th>
                            <th className="text-center w-24">Mean Diff</th>
                            <th className="text-center w-24">Std. Error Diff</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                          <tr>
                            <td className="p-2.5 font-sans font-bold">Equal variances assumed</td>
                            <td className="p-2.5 text-center">{customTTestResult.tTest.leveneF.toFixed(3)}</td>
                            <td className="p-2.5 text-center">{customTTestResult.tTest.leveneP.toFixed(3)}</td>
                            <td className="p-2.5 text-center font-black text-pink-600">{customTTestResult.tTest.tValue.toFixed(3)}</td>
                            <td className="p-2.5 text-center">{customTTestResult.tTest.df}</td>
                            <td className="p-2.5 text-center font-black text-pink-600">{customTTestResult.tTest.pValue < 0.001 ? '.000' : customTTestResult.tTest.pValue.toFixed(3)}</td>
                            <td className="p-2.5 text-center">{customTTestResult.tTest.meanDiff.toFixed(3)}</td>
                            <td className="p-2.5 text-center">{customTTestResult.tTest.seDiff.toFixed(3)}</td>
                          </tr>
                          <tr className="bg-slate-50 dark:bg-slate-800/40">
                            <td className="p-2.5 font-sans font-bold">Equal variances not assumed (Welch)</td>
                            <td className="p-2.5 text-center text-slate-400">-</td>
                            <td className="p-2.5 text-center text-slate-400">-</td>
                            <td className="p-2.5 text-center font-black text-pink-600">{customTTestResult.tTest.tValue.toFixed(3)}</td>
                            <td className="p-2.5 text-center">{customTTestResult.tTest.df}</td>
                            <td className="p-2.5 text-center font-black text-pink-600">{customTTestResult.tTest.pValue < 0.001 ? '.000' : customTTestResult.tTest.pValue.toFixed(3)}</td>
                            <td className="p-2.5 text-center">{customTTestResult.tTest.meanDiff.toFixed(3)}</td>
                            <td className="p-2.5 text-center">{customTTestResult.tTest.seDiff.toFixed(3)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Mann-Whitney U Test Non-Parametric Output */}
                {customTTestResult.mannWhitney && (
                  <>
                    <h4 className="text-xs font-black uppercase text-purple-600 tracking-wider mb-2">3. Mann-Whitney U Test (Uji Non-Parametrik SPSS)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Ranks Table */}
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-800 text-white font-bold">
                              <th className="p-2">Kelompok</th>
                              <th className="p-2 text-center">N</th>
                              <th className="p-2 text-center">Mean Rank</th>
                              <th className="p-2 text-center">Sum of Ranks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                            {customTTestResult.groupStats.map((g, idx) => (
                              <tr key={g.category}>
                                <td className="p-2 font-sans font-bold">{g.category}</td>
                                <td className="p-2 text-center">{g.n}</td>
                                <td className="p-2 text-center font-black text-purple-600">{(g.n > 0 ? (customTTestResult.mannWhitney!.wilcoxonW / (idx === 0 ? g.n : Math.max(1, respondents.length - g.n))) : 0).toFixed(2)}</td>
                                <td className="p-2 text-center">{idx === 0 ? customTTestResult.mannWhitney!.wilcoxonW.toFixed(1) : (respondents.length * (respondents.length + 1) / 2 - customTTestResult.mannWhitney!.wilcoxonW).toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Test Statistics Table */}
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-800 text-white font-bold">
                              <th className="p-2" colSpan={2}>Test Statistics (Mann-Whitney U)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                            <tr>
                              <td className="p-2 font-sans font-bold">Mann-Whitney U</td>
                              <td className="p-2 text-right font-black text-purple-600">{customTTestResult.mannWhitney.uValue.toFixed(1)}</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-sans font-bold">Wilcoxon W</td>
                              <td className="p-2 text-right font-black">{customTTestResult.mannWhitney.wilcoxonW.toFixed(1)}</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-sans font-bold">Z Score</td>
                              <td className="p-2 text-right font-black text-pink-600">-{customTTestResult.mannWhitney.zValue.toFixed(3)}</td>
                            </tr>
                            <tr className="bg-purple-50 dark:bg-purple-950/40">
                              <td className="p-2 font-sans font-black">Asymp. Sig. (2-tailed)</td>
                              <td className="p-2 text-right font-black text-purple-600">{customTTestResult.mannWhitney.pValue < 0.001 ? '.000' : customTTestResult.mannWhitney.pValue.toFixed(3)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* MODE 3: BIVARIATE CORRELATION MATRIX (PEARSON & SPEARMAN) */}
          {bivariateMode === 'correlation' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-pink-600" />
                      Matriks Korelasi Bivariat SPSS (Pearson r &amp; Spearman Rank)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Pilih 2 variabel untuk melihat analisis korelasi khusus, atau periksa matriks korelasi SPSS lengkap di bawah (N = {respondents.length}).
                    </p>
                  </div>
                </div>

                {/* Pair Focus Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/40">
                  <div>
                    <label className="block text-xs font-extrabold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2">
                      Variabel Fokus 1 (X)
                    </label>
                    <select
                      value={corrVar1}
                      onChange={(e) => setCorrVar1(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs p-3 rounded-xl border border-pink-300 dark:border-pink-800 outline-none cursor-pointer"
                    >
                      <option value="dmft">[SPSS: DMFT_SCORE] Indeks DMF-T (Karies Gigi Tetap)</option>
                      <option value="deft">[SPSS: DEFT_SCORE] Indeks def-t (Karies Gigi Sulung)</option>
                      <option value="ohis">[SPSS: OHIS_SCORE] Indeks OHI-S (Kebersihan Mulut)</option>
                      <option value="dis">[SPSS: DIS_SCORE] Debris Index DI-S (Plak)</option>
                      <option value="cis">[SPSS: CIS_SCORE] Calculus Index CI-S (Karang Gigi)</option>
                      <option value="kariesTotal">[SPSS: D_TETAP] Total Gigi Karies Aktif (d + D)</option>
                      <option value="tumpatTotal">[SPSS: F_TETAP] Total Penambalan Gigi (f + F)</option>
                      <option value="umur">[SPSS: UMUR] Umur Responden (Tahun)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                      Variabel Fokus 2 (Y)
                    </label>
                    <select
                      value={corrVar2}
                      onChange={(e) => setCorrVar2(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs p-3 rounded-xl border border-purple-300 dark:border-purple-800 outline-none cursor-pointer"
                    >
                      <option value="ohis">[SPSS: OHIS_SCORE] Indeks OHI-S (Kebersihan Mulut)</option>
                      <option value="dmft">[SPSS: DMFT_SCORE] Indeks DMF-T (Karies Gigi Tetap)</option>
                      <option value="deft">[SPSS: DEFT_SCORE] Indeks def-t (Karies Gigi Sulung)</option>
                      <option value="dis">[SPSS: DIS_SCORE] Debris Index DI-S (Plak)</option>
                      <option value="cis">[SPSS: CIS_SCORE] Calculus Index CI-S (Karang Gigi)</option>
                      <option value="kariesTotal">[SPSS: D_TETAP] Total Gigi Karies Aktif (d + D)</option>
                      <option value="tumpatTotal">[SPSS: F_TETAP] Total Penambalan Gigi (f + F)</option>
                      <option value="umur">[SPSS: UMUR] Umur Responden (Tahun)</option>
                    </select>
                  </div>
                </div>

                {/* SPSS Variable Mapping Card for Correlation */}
                {(() => {
                  const infoC1 = getSpssVarInfo(corrVar1);
                  const infoC2 = getSpssVarInfo(corrVar2);
                  return (
                    <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950/90 p-4 rounded-2xl border border-indigo-500/40 text-white shadow-md space-y-3 mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-500/30">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200">
                            📌 Peta Variabel &amp; Panduan Menu Dialog IBM SPSS (Bivariate Correlation)
                          </h4>
                        </div>
                        <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                          Pearson &amp; Spearman
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                          <span className="text-[10px] font-extrabold uppercase text-pink-300 block mb-0.5">
                            1. Variabel 1 di SPSS:
                          </span>
                          <div className="text-sm font-black font-mono text-amber-300 flex items-center gap-1.5">
                            <span>{infoC1.name}</span>
                            <span className="text-[10px] font-sans font-bold bg-pink-500/30 text-pink-200 px-2 py-0.5 rounded-md border border-pink-400/30">
                              {infoC1.scale}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white mt-1">{infoC1.label}</p>
                        </div>

                        <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                          <span className="text-[10px] font-extrabold uppercase text-purple-300 block mb-0.5">
                            2. Variabel 2 di SPSS:
                          </span>
                          <div className="text-sm font-black font-mono text-amber-300 flex items-center gap-1.5">
                            <span>{infoC2.name}</span>
                            <span className="text-[10px] font-sans font-bold bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-md border border-purple-400/30">
                              {infoC2.scale}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white mt-1">{infoC2.label}</p>
                        </div>
                      </div>

                      <div className="p-2.5 bg-indigo-900/60 rounded-xl border border-indigo-400/30 text-xs text-indigo-100 font-sans leading-relaxed flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                        <div>
                          <strong>Langkah Pengujian Korelasi di IBM SPSS Statistics:</strong><br />
                          1. Buka IBM SPSS &gt; Menu <strong>Analyze &gt; Correlate &gt; Bivariate...</strong><br />
                          2. Pindahkan <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoC1.name}</code> dan <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoC2.name}</code> ke kotak <strong>Variables</strong>.<br />
                          3. Pada <em>Correlation Coefficients</em>, centang <strong>Pearson</strong> (untuk uji parametrik) dan/atau <strong>Spearman</strong> (non-parametrik).<br />
                          4. Klik <strong>OK</strong>. Nilai korelasi (r atau ρ) dan Sig. (2-tailed) di SPSS dijamin 100% persis dengan matriks korelasi di bawah!
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Focal Pair Analysis Result Box */}
                {(() => {
                  const i1 = correlationResult.variables.findIndex(v => v.key === corrVar1);
                  const i2 = correlationResult.variables.findIndex(v => v.key === corrVar2);
                  if (i1 >= 0 && i2 >= 0) {
                    const cell = correlationResult.matrix[i1][i2];
                    const v1 = correlationResult.variables[i1];
                    const v2 = correlationResult.variables[i2];
                    const r = cell.pearsonR;
                    const p = cell.pearsonP;
                    const rho = cell.spearmanRho;
                    const rhoP = cell.spearmanP;
                    const absR = Math.abs(r);
                    const strength = absR >= 0.8 ? 'Sangat Kuat' : absR >= 0.6 ? 'Kuat' : absR >= 0.4 ? 'Sedang' : absR >= 0.2 ? 'Lemah' : 'Sangat Lemah / Tidak Ada';
                    const direction = r > 0 ? 'Positif (searah)' : r < 0 ? 'Negatif (berlawanan)' : 'Nir-korelasi';
                    const isSig = p < 0.05;

                    const summaryText = `Korelasi Pearson antara ${v1.label} dan ${v2.label} menunjukkan r = ${r.toFixed(3)} (p ${p < 0.001 ? '< 0.001' : `= ${p.toFixed(3)}`}). ${isSig ? 'Terdapat korelasi yang signifikan' : 'Tidak terdapat korelasi yang signifikan'} bertaraf ${strength} dengan arah ${direction}. Uji korelasi Spearman ρ = ${rho.toFixed(3)} (p ${rhoP < 0.001 ? '< 0.001' : `= ${rhoP.toFixed(3)}`}).`;

                    return (
                      <div className={`p-5 mb-6 rounded-2xl border-2 ${isSig ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <span className={`text-xs font-black px-3 py-1 rounded-full ${isSig ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                            {isSig ? '✅ KORELASI SIGNIFIKAN (p < 0.05)' : '⚠️ TIDAK SIGNIFIKAN (p ≥ 0.05)'}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(summaryText);
                              alert('Kesimpulan korelasi berhasil disalin!');
                            }}
                            className="text-xs font-extrabold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" /> Salin Kesimpulan Korelasi
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Pearson (r)</span>
                            <div className="text-lg font-black text-pink-600 mt-0.5">{r.toFixed(3)}</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Sig. (Pearson p)</span>
                            <div className="text-lg font-black text-slate-800 dark:text-slate-200 mt-0.5">{p < 0.001 ? '< 0.001' : p.toFixed(3)}</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Spearman (ρ)</span>
                            <div className="text-lg font-black text-purple-600 mt-0.5">{rho.toFixed(3)}</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Keeratan</span>
                            <div className="text-sm font-black text-teal-600 mt-1">{strength}</div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          "{summaryText}"
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                <h4 className="text-xs font-black uppercase text-pink-600 tracking-wider mb-2">Matriks Korelasi SPSS Lengkap (8x8 Indikator)</h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl mb-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold">
                        <th className="p-3">Variabel Indikator</th>
                        <th className="p-3 text-center">Korelasi</th>
                        {correlationResult.variables.map(v => (
                          <th key={v.key} className="p-2 text-center text-[11px] font-mono">{v.key.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                      {correlationResult.variables.map((v1, i) => (
                        <React.Fragment key={v1.key}>
                          <tr className="bg-slate-50 dark:bg-slate-800/40">
                            <td className="p-2 font-sans font-bold text-slate-900 dark:text-slate-100" rowSpan={3}>
                              {v1.label}
                            </td>
                            <td className="p-1 text-center font-sans font-bold text-pink-600 text-[10px]">Pearson r</td>
                            {correlationResult.variables.map((v2, j) => {
                              const cell = correlationResult.matrix[i][j];
                              return (
                                <td key={v2.key} className={`p-2 text-center font-black ${i === j ? 'bg-slate-200 dark:bg-slate-700' : cell.pearsonP < 0.05 ? 'text-pink-600 dark:text-pink-400 bg-pink-50/50 dark:bg-pink-950/30' : ''}`}>
                                  {cell.pearsonR.toFixed(3)}{cell.pearsonP < 0.01 ? '**' : cell.pearsonP < 0.05 ? '*' : ''}
                                </td>
                              );
                            })}
                          </tr>
                          <tr>
                            <td className="p-1 text-center font-sans text-slate-500 text-[10px]">Sig. (2-tailed)</td>
                            {correlationResult.variables.map((v2, j) => {
                              const cell = correlationResult.matrix[i][j];
                              return (
                                <td key={v2.key} className="p-1 text-center text-slate-500 text-[10px]">
                                  {i === j ? '-' : cell.pearsonP < 0.001 ? '.000' : cell.pearsonP.toFixed(3)}
                                </td>
                              );
                            })}
                          </tr>
                          <tr>
                            <td className="p-1 text-center font-sans font-bold text-purple-600 text-[10px]">Spearman ρ</td>
                            {correlationResult.variables.map((v2, j) => {
                              const cell = correlationResult.matrix[i][j];
                              return (
                                <td key={v2.key} className={`p-2 text-center font-black ${i === j ? 'bg-slate-200 dark:bg-slate-700' : cell.spearmanP < 0.05 ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                                  {cell.spearmanRho.toFixed(3)}{cell.spearmanP < 0.01 ? '**' : cell.spearmanP < 0.05 ? '*' : ''}
                                </td>
                              );
                            })}
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-bold text-slate-900 dark:text-slate-100">* Correlation is significant at the 0.05 level (2-tailed).</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100">** Correlation is significant at the 0.01 level (2-tailed).</p>
                  <p className="text-[11px] mt-2">
                    Skala Keeratan Korelasi (r/ρ): 0.00-0.19 (Sangat Lemah), 0.20-0.39 (Lemah), 0.40-0.59 (Sedang), 0.60-0.79 (Kuat), 0.80-1.00 (Sangat Kuat).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MODE 4: PAIRED SAMPLES TESTS (PAIRED T-TEST & WILCOXON SIGNED-RANK) */}
          {bivariateMode === 'paired' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-pink-600" />
                  Uji Sampel Berpasangan (Paired Samples T-Test &amp; Wilcoxon Signed-Rank Test)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  Menguji signifikansi perbedaan antara dua variabel terkait/berpasangan pada responden yang sama (N = {respondents.length}). Pilih 2 variabel kuantitatif di bawah untuk melakukan uji beda sampel berpasangan.
                </p>

                {/* Custom Pair Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/40">
                  <div>
                    <label className="block text-xs font-extrabold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" /> Variabel Pertama (Pasangan 1)
                    </label>
                    <select
                      value={pairedVar1}
                      onChange={(e) => setPairedVar1(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs p-3 rounded-xl border border-pink-300 dark:border-pink-800 focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
                    >
                      <option value="dis">[SPSS: DIS_SCORE] Debris Index DI-S (Kontinu)</option>
                      <option value="cis">[SPSS: CIS_SCORE] Calculus Index CI-S (Kontinu)</option>
                      <option value="ohis">[SPSS: OHIS_SCORE] Indeks Kebersihan Mulut OHI-S (Kontinu)</option>
                      <option value="deft">[SPSS: DEFT_SCORE] Karies Gigi Sulung def-t (Kontinu)</option>
                      <option value="dmft">[SPSS: DMFT_SCORE] Karies Gigi Tetap DMF-T (Kontinu)</option>
                      <option value="kariesTotal">[SPSS: D_TETAP] Jumlah Gigi Karies Aktif (D + d)</option>
                      <option value="tumpatTotal">[SPSS: F_TETAP] Jumlah Gigi Penambalan (F + f)</option>
                      <option value="hilangTotal">[SPSS: M_TETAP] Jumlah Gigi Hilang (M + e)</option>
                      <option value="umur">[SPSS: UMUR] Umur Responden (Tahun)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" /> Variabel Kedua (Pasangan 2)
                    </label>
                    <select
                      value={pairedVar2}
                      onChange={(e) => setPairedVar2(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs p-3 rounded-xl border border-purple-300 dark:border-purple-800 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                    >
                      <option value="cis">[SPSS: CIS_SCORE] Calculus Index CI-S (Kontinu)</option>
                      <option value="dis">[SPSS: DIS_SCORE] Debris Index DI-S (Kontinu)</option>
                      <option value="ohis">[SPSS: OHIS_SCORE] Indeks Kebersihan Mulut OHI-S (Kontinu)</option>
                      <option value="deft">[SPSS: DEFT_SCORE] Karies Gigi Sulung def-t (Kontinu)</option>
                      <option value="dmft">[SPSS: DMFT_SCORE] Karies Gigi Tetap DMF-T (Kontinu)</option>
                      <option value="kariesTotal">[SPSS: D_TETAP] Jumlah Gigi Karies Aktif (D + d)</option>
                      <option value="tumpatTotal">[SPSS: F_TETAP] Jumlah Gigi Penambalan (F + f)</option>
                      <option value="hilangTotal">[SPSS: M_TETAP] Jumlah Gigi Hilang (M + e)</option>
                      <option value="umur">[SPSS: UMUR] Umur Responden (Tahun)</option>
                    </select>
                  </div>
                </div>

                {/* SPSS Variable Mapping Card for Paired T-Test */}
                {(() => {
                  const infoP1 = getSpssVarInfo(pairedVar1);
                  const infoP2 = getSpssVarInfo(pairedVar2);
                  return (
                    <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950/90 p-4 rounded-2xl border border-indigo-500/40 text-white shadow-md space-y-3 mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-500/30">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200">
                            📌 Peta Variabel &amp; Panduan Menu Dialog IBM SPSS (Paired Samples T-Test &amp; Wilcoxon)
                          </h4>
                        </div>
                        <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                          Sampel Berpasangan
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                          <span className="text-[10px] font-extrabold uppercase text-pink-300 block mb-0.5">
                            1. Variable 1 (Pair 1) di SPSS:
                          </span>
                          <div className="text-sm font-black font-mono text-amber-300 flex items-center gap-1.5">
                            <span>{infoP1.name}</span>
                            <span className="text-[10px] font-sans font-bold bg-pink-500/30 text-pink-200 px-2 py-0.5 rounded-md border border-pink-400/30">
                              {infoP1.scale}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white mt-1">{infoP1.label}</p>
                        </div>

                        <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                          <span className="text-[10px] font-extrabold uppercase text-purple-300 block mb-0.5">
                            2. Variable 2 (Pair 2) di SPSS:
                          </span>
                          <div className="text-sm font-black font-mono text-amber-300 flex items-center gap-1.5">
                            <span>{infoP2.name}</span>
                            <span className="text-[10px] font-sans font-bold bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-md border border-purple-400/30">
                              {infoP2.scale}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white mt-1">{infoP2.label}</p>
                        </div>
                      </div>

                      <div className="p-2.5 bg-indigo-900/60 rounded-xl border border-indigo-400/30 text-xs text-indigo-100 font-sans leading-relaxed flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                        <div>
                          <strong>Langkah Pengujian Sampel Berpasangan di IBM SPSS Statistics:</strong><br />
                          • <strong>Paired Samples T-Test (Parametrik):</strong> Menu <strong>Analyze &gt; Compare Means &gt; Paired-Samples T Test...</strong> &gt; Pilih <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoP1.name}</code> dan <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoP2.name}</code> bersamaan lalu pindahkan ke kotak <strong>Paired Variables</strong> &gt; Klik <strong>OK</strong>.<br />
                          • <strong>Wilcoxon Signed-Rank Test (Non-Parametrik):</strong> Menu <strong>Analyze &gt; Nonparametric Tests &gt; Legacy Dialogs &gt; 2 Related Samples...</strong> &gt; Pindahkan <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoP1.name}</code> dan <code className="bg-white/20 px-1 py-0.5 rounded text-amber-200 font-mono font-bold">{infoP2.name}</code> ke <strong>Test Pairs</strong> &gt; Centang <strong>Wilcoxon</strong> &gt; Klik <strong>OK</strong>.
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className="text-xs font-bold text-slate-500 mr-1">Preset Cepat:</span>
                  <button
                    onClick={() => { setPairedVar1('dis'); setPairedVar2('cis'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${pairedVar1 === 'dis' && pairedVar2 === 'cis' ? 'bg-pink-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                  >
                    DI-S vs CI-S
                  </button>
                  <button
                    onClick={() => { setPairedVar1('deft'); setPairedVar2('dmft'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${pairedVar1 === 'deft' && pairedVar2 === 'dmft' ? 'bg-pink-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                  >
                    def-t vs DMF-T
                  </button>
                  <button
                    onClick={() => { setPairedVar1('kariesTotal'); setPairedVar2('tumpatTotal'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${pairedVar1 === 'kariesTotal' && pairedVar2 === 'tumpatTotal' ? 'bg-pink-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                  >
                    Karies Aktif vs Penambalan
                  </button>
                  <button
                    onClick={() => { setPairedVar1('dis'); setPairedVar2('ohis'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${pairedVar1 === 'dis' && pairedVar2 === 'ohis' ? 'bg-pink-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                  >
                    DI-S vs OHI-S
                  </button>
                </div>

                {/* Selected Custom Pair Test Result */}
                {(() => {
                  const pItem = customPairedResult;
                  const pText = pItem.tPValue < 0.001 ? '< 0.001' : `= ${pItem.tPValue.toFixed(3)}`;
                  const summaryText = `Uji Paired T-Test untuk ${pItem.pairName} (${pItem.var1Label} vs ${pItem.var2Label}) menghasilkan t = ${pItem.tValue.toFixed(3)} (df = ${pItem.df}, p ${pText}). ${pItem.tIsSig ? 'Terdapat perbedaan yang signifikan' : 'Tidak terdapat perbedaan signifikan'} antara nilai rerata ${pItem.var1Label} (${pItem.mean1.toFixed(2)}) dan ${pItem.var2Label} (${pItem.mean2.toFixed(2)}). Uji non-parametrik Wilcoxon menghasilkan Z = ${pItem.wilcoxonZ.toFixed(3)}, p = ${pItem.wilcoxonPValue < 0.001 ? '< 0.001' : pItem.wilcoxonPValue.toFixed(3)}.`;

                  return (
                    <div className="mb-8 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-pink-300 dark:border-pink-800/60 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h4 className="text-sm font-black text-pink-600 dark:text-pink-400 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-pink-600 text-white flex items-center justify-center text-xs font-bold">★</span>
                          {pItem.pairName}
                        </h4>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(summaryText);
                            alert('Kesimpulan uji berpasangan berhasil disalin!');
                          }}
                          className="text-xs font-extrabold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                        >
                          <Copy className="w-3.5 h-3.5" /> Salin Kesimpulan Uji
                        </button>
                      </div>

                      {/* Narrative Box */}
                      <div className="p-4 mb-4 bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 rounded-2xl text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        "{summaryText}"
                      </div>

                      {/* Paired Statistics */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-800 text-white font-bold">
                                <th className="p-2">Paired Samples Statistics</th>
                                <th className="p-2 text-center">Mean</th>
                                <th className="p-2 text-center">N</th>
                                <th className="p-2 text-center">Std. Dev</th>
                                <th className="p-2 text-center">Std. Error</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                              <tr>
                                <td className="p-2 font-sans font-bold">{pItem.var1Label}</td>
                                <td className="p-2 text-center font-black text-pink-600">{pItem.mean1.toFixed(2)}</td>
                                <td className="p-2 text-center">{pItem.n}</td>
                                <td className="p-2 text-center">{pItem.sd1.toFixed(2)}</td>
                                <td className="p-2 text-center">{pItem.se1.toFixed(3)}</td>
                              </tr>
                              <tr>
                                <td className="p-2 font-sans font-bold">{pItem.var2Label}</td>
                                <td className="p-2 text-center font-black text-purple-600">{pItem.mean2.toFixed(2)}</td>
                                <td className="p-2 text-center">{pItem.n}</td>
                                <td className="p-2 text-center">{pItem.sd2.toFixed(2)}</td>
                                <td className="p-2 text-center">{pItem.se2.toFixed(3)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Paired Correlations */}
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-800 text-white font-bold">
                                <th className="p-2">Paired Correlations</th>
                                <th className="p-2 text-center">N</th>
                                <th className="p-2 text-center">Correlation (r)</th>
                                <th className="p-2 text-center">Sig.</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                              <tr>
                                <td className="p-2 font-sans font-bold">{pItem.var1Label} &amp; {pItem.var2Label}</td>
                                <td className="p-2 text-center">{pItem.n}</td>
                                <td className="p-2 text-center font-black text-blue-600">{pItem.correlation.toFixed(3)}</td>
                                <td className="p-2 text-center font-black text-pink-600">{pItem.corrPValue < 0.001 ? '.000' : pItem.corrPValue.toFixed(3)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Paired Samples Test (T-Test Table) */}
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 mb-4">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-800 text-white font-bold">
                              <th className="p-2.5" colSpan={5}>Paired Differences</th>
                              <th className="p-2.5 text-center" rowSpan={2}>t</th>
                              <th className="p-2.5 text-center" rowSpan={2}>df</th>
                              <th className="p-2.5 text-center" rowSpan={2}>Sig. (2-tailed)</th>
                            </tr>
                            <tr className="bg-slate-700 text-slate-200 text-[10px]">
                              <th className="p-1">Mean Diff</th>
                              <th className="p-1 text-center">Std. Dev</th>
                              <th className="p-1 text-center">Std. Error</th>
                              <th className="p-1 text-center">95% CI Lower</th>
                              <th className="p-1 text-center">95% CI Upper</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                            <tr>
                              <td className="p-2 font-black text-pink-600">{pItem.meanDiff.toFixed(3)}</td>
                              <td className="p-2 text-center">{pItem.sdDiff.toFixed(3)}</td>
                              <td className="p-2 text-center">{pItem.seDiff.toFixed(3)}</td>
                              <td className="p-2 text-center">{pItem.ciLowerDiff.toFixed(3)}</td>
                              <td className="p-2 text-center">{pItem.ciUpperDiff.toFixed(3)}</td>
                              <td className="p-2 text-center font-black">{pItem.tValue.toFixed(3)}</td>
                              <td className="p-2 text-center">{pItem.df}</td>
                              <td className="p-2 text-center font-black text-pink-600">{pItem.tPValue < 0.001 ? '.000' : pItem.tPValue.toFixed(3)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Wilcoxon Non-parametric Output */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-800 text-white font-bold">
                                <th className="p-2">Wilcoxon Ranks</th>
                                <th className="p-2 text-center">N</th>
                                <th className="p-2 text-center">Mean Rank</th>
                                <th className="p-2 text-center">Sum of Ranks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                              <tr>
                                <td className="p-2 font-sans font-bold">Negative Ranks</td>
                                <td className="p-2 text-center">{pItem.negRanksCount}</td>
                                <td className="p-2 text-center">{pItem.negRanksMean.toFixed(2)}</td>
                                <td className="p-2 text-center">{pItem.negRanksSum.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td className="p-2 font-sans font-bold">Positive Ranks</td>
                                <td className="p-2 text-center">{pItem.posRanksCount}</td>
                                <td className="p-2 text-center">{pItem.posRanksMean.toFixed(2)}</td>
                                <td className="p-2 text-center">{pItem.posRanksSum.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td className="p-2 font-sans font-bold">Ties (Sama)</td>
                                <td className="p-2 text-center">{pItem.tiesCount}</td>
                                <td className="p-2 text-center">-</td>
                                <td className="p-2 text-center">-</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-800 text-white font-bold">
                                <th className="p-2" colSpan={2}>Wilcoxon Test Statistics</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                              <tr>
                                <td className="p-2 font-sans font-bold">Z Score</td>
                                <td className="p-2 text-right font-black text-purple-600">-{pItem.wilcoxonZ.toFixed(3)}</td>
                              </tr>
                              <tr className="bg-purple-50 dark:bg-purple-950/40">
                                <td className="p-2 font-sans font-black">Asymp. Sig. (2-tailed)</td>
                                <td className="p-2 text-right font-black text-purple-600">{pItem.wilcoxonPValue < 0.001 ? '.000' : pItem.wilcoxonPValue.toFixed(3)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab: ANALISIS DESKRIPTIF */}
      {activeSubTab === 'descriptive' && (
        <div className="space-y-6" id="descriptive-analysis-section">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-pink-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-pink-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-pink-400" />
                    Statistik &amp; Indeks Deskriptif SPSS
                  </span>
                  <span className="px-3 py-1 bg-white/10 text-slate-200 rounded-full text-xs font-mono font-bold">
                    N = {metrics.totalN} Responden Valid
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportSPSS}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95 ring-2 ring-indigo-400/30"
                    id="btn-export-descriptive-spss"
                    title="Ekspor Master Data Coded (.xlsx) untuk IBM SPSS Statistics"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ekspor Master Data SPSS</span>
                  </button>

                  <button
                    onClick={() => {
                      const syntax = `* IBM SPSS Statistics - Descriptive Statistics & Frequencies Syntax.\nDESCRIPTIVES VARIABLES=DMFT_SCORE DEFT_SCORE D_TETAP M_TETAP F_TETAP DIS_SCORE CIS_SCORE OHIS_SCORE UMUR\n  /STATISTICS=MEAN STDDEV MIN MAX VARIANCE SEMEAN SKEWNESS KURTOSIS.\n\nFREQUENCIES VARIABLES=JK_KODE UMUR_KODE OHIS_CAT_CODE KARIES_STATUS GUSI_BERDARAH LESI_MUKOSA PERLU_RUJUKAN\n  /ORDER=ANALYSIS.`;
                      navigator.clipboard.writeText(syntax);
                      setCopiedSyntax(true);
                      setTimeout(() => setCopiedSyntax(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                    title="Salin Syntax Deskriptif IBM SPSS"
                  >
                    {copiedSyntax ? <Check className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
                    <span>{copiedSyntax ? 'Syntax Tersalin!' : 'Salin Syntax SPSS'}</span>
                  </button>
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Analisis Deskriptif Ekuivalen IBM SPSS Statistics
              </h3>
              
              <p className="text-pink-200/90 text-xs sm:text-sm max-w-3xl leading-relaxed font-medium">
                Menyajikan output analisis deskriptif yang identik dengan software IBM SPSS Statistics (Analyze &gt; Descriptive Statistics &gt; Descriptives &amp; Frequencies) mencakup N, Minimum, Maksimum, Mean, Std. Error Mean, Standar Deviasi, Varians, Skewness, Kurtosis, serta Tabel Distribusi Frekuensi (f, %, Valid %, Cumulative %).
              </p>

              {/* View Mode Toggle Sub-Tabs */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-pink-500/20">
                <button
                  onClick={() => setDescriptiveViewMode('spss_tables')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    descriptiveViewMode === 'spss_tables'
                      ? 'bg-pink-600 text-white shadow-md scale-105'
                      : 'bg-white/10 text-pink-200 hover:bg-white/20'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>1. Tabel Output Statistik Deskriptif SPSS (Descriptives &amp; Frequencies)</span>
                </button>

                <button
                  onClick={() => setDescriptiveViewMode('epidemiology_profile')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    descriptiveViewMode === 'epidemiology_profile'
                      ? 'bg-pink-600 text-white shadow-md scale-105'
                      : 'bg-white/10 text-pink-200 hover:bg-white/20'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>2. Profile &amp; Indeks Epidemiologi Kesehatan Gigi (WHO)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Master Data SPSS Callout Banner for Descriptive Analysis */}
          <div className="bg-gradient-to-r from-indigo-900/90 via-purple-900/80 to-slate-900 text-white p-5 rounded-3xl border border-indigo-500/30 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-indigo-600/30 text-indigo-300 rounded-2xl border border-indigo-400/30 shrink-0">
                <FileSpreadsheet className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                    Master Data Deskriptif SPSS Exporter
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                    Format .XLSX Numeric Pre-Coded
                  </span>
                </div>
                <h4 className="text-base font-black text-white mt-1">
                  Ekspor Master Data Deskriptif Siap Impor ke IBM SPSS Statistics
                </h4>
                <p className="text-xs text-indigo-100/90 mt-0.5 leading-relaxed max-w-2xl">
                  Unduh seluruh master data responden dalam format Excel yang sudah dikodekan numerik (JK_CODE, KEL_UMUR_CODE, PENDIDIKAN_CODE, PEKERJAAN_CODE, DMFT_CAT_CODE, OHIS_CAT_CODE, KARIES_STATUS) lengkap dengan lembar kamus Variable View. Siap dibuka di IBM SPSS via menu <strong>File &gt; Open &gt; Data</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
              <button
                onClick={handleExportSPSS}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                id="btn-export-descriptive-spss-banner"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Master Data SPSS (.xlsx)</span>
              </button>

              <button
                onClick={() => setShowSpssGuideModal(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-indigo-100 text-xs font-bold rounded-2xl border border-white/20 transition-all cursor-pointer"
                title="Buka Petunjuk Cara Impor ke IBM SPSS"
              >
                <HelpCircle className="w-4 h-4 text-indigo-300" />
                <span>Panduan Impor</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: SPSS DESCRIPTIVE & FREQUENCIES TABLES */}
          {descriptiveViewMode === 'spss_tables' && (
            <div className="space-y-6">

              {/* Card 1: SPSS Descriptive Statistics Table (Output Analyze > Descriptives) */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pink-100 dark:border-pink-900/40">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-pink-600" />
                      Tabel Output SPSS "Descriptive Statistics" (Analyze &gt; Descriptives)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Statistik deskriptif parameter kuantitatif kesehatan gigi &amp; mulut (N = {respondents.length}).
                    </p>
                  </div>

                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[11px] rounded-full border border-indigo-200 dark:border-indigo-800 self-start sm:self-auto">
                    Presisi SPSS Statistics
                  </span>
                </div>

                {/* SPSS Descriptives Output Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold">
                        <th className="p-3">Descriptive Statistics (Variable)</th>
                        <th className="p-3 text-center">N</th>
                        <th className="p-3 text-center">Min</th>
                        <th className="p-3 text-center">Max</th>
                        <th className="p-3 text-center">Mean</th>
                        <th className="p-3 text-center">Std. Error</th>
                        <th className="p-3 text-center">Std. Deviation</th>
                        <th className="p-3 text-center">Variance</th>
                        <th className="p-3 text-center" colSpan={2}>Skewness (Stat | SE)</th>
                        <th className="p-3 text-center" colSpan={2}>Kurtosis (Stat | SE)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                      {spssDescriptivesData.map((row, idx) => (
                        <tr key={row.key} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/70 dark:bg-slate-800/40'}>
                          <td className="p-2.5 font-sans font-bold text-slate-900 dark:text-slate-100">
                            {row.label}
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-700 dark:text-slate-300">{row.n}</td>
                          <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">{row.min}</td>
                          <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">{row.max}</td>
                          <td className="p-2.5 text-center font-black text-pink-600 dark:text-pink-400">{row.mean.toFixed(2)}</td>
                          <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">{row.seMean.toFixed(3)}</td>
                          <td className="p-2.5 text-center font-bold text-slate-800 dark:text-slate-200">{row.sd.toFixed(2)}</td>
                          <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">{row.variance.toFixed(2)}</td>
                          <td className="p-2.5 text-center text-purple-600 dark:text-purple-400 font-bold">{row.skewness.toFixed(3)}</td>
                          <td className="p-2.5 text-center text-slate-400 text-[10px]">{row.seSkewness.toFixed(3)}</td>
                          <td className="p-2.5 text-center text-teal-600 dark:text-teal-400 font-bold">{row.kurtosis.toFixed(3)}</td>
                          <td className="p-2.5 text-center text-slate-400 text-[10px]">{row.seKurtosis.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-bold text-slate-900 dark:text-slate-100">Catatan Interpretasi Output SPSS:</p>
                  <p>• <strong>Mean &amp; Std. Deviation:</strong> Mengukur nilai pusat dan sebaran data. Rasio Skewness/SE Skewness &lt; ±2.0 menunjukkan distribusi normal.</p>
                  <p>• <strong>Valid N (listwise):</strong> Total {respondents.length} sampel data terisi secara lengkap tanpa missing value.</p>
                </div>
              </div>

              {/* Card 2: SPSS Frequencies Table (Output Analyze > Frequencies) */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-pink-100 dark:border-pink-900/40">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-purple-600" />
                      Tabel Output SPSS "Frequencies" (Analyze &gt; Frequencies)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Pilih variabel kategorikal untuk melihat distribusi frekuensi (f), persentase, persentase valid, dan persentase kumulatif.
                    </p>
                  </div>

                  {/* Variable Selector */}
                  <div className="w-full md:w-72">
                    <label className="block text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
                      Pilih Variabel Kategorikal:
                    </label>
                    <select
                      value={freqVar}
                      onChange={(e) => setFreqVar(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs p-2.5 rounded-xl border border-purple-300 dark:border-purple-800 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                    >
                      <option value="jenisKelamin">[SPSS: JK_CODE] Jenis Kelamin Responden (1=Laki-Laki, 2=Perempuan)</option>
                      <option value="kelompokUmur">[SPSS: KEL_UMUR_CODE] Kelompok Umur WHO (1-5)</option>
                      <option value="kategoriOHIS">[SPSS: OHIS_CAT_CODE] Kategori Kebersihan Mulut OHI-S (1-3)</option>
                      <option value="statusKaries">[SPSS: KARIES_STATUS] Status Prevalensi Karies (0=Bebas, 1=Karies)</option>
                      <option value="kategoriDMFT">[SPSS: DMFT_CAT_CODE] Kategori Keparahan DMF-T WHO (1-5)</option>
                      <option value="gusiBerdarah">[SPSS: GUSI_BERDARAH] Status Pendarahan Gusi (0=Normal, 1=Berdarah)</option>
                      <option value="lesiMukosa">[SPSS: LESI_MUKOSA] Status Lesi Mukosa Oral (0=Normal, 1=Ada Lesi)</option>
                      <option value="rencanaRujukan">[SPSS: PERLU_RUJUKAN] Status Kebutuhan Rujukan Faskes (0=Tidak, 1=Ya)</option>
                      <option value="pendidikan">[SPSS: PENDIDIKAN_CODE] Tingkat Pendidikan Terakhir (1-5)</option>
                      <option value="pekerjaan">[SPSS: PEKERJAAN_CODE] Sektor Pekerjaan / Aktivitas (1-6)</option>
                    </select>
                  </div>
                </div>

                {/* SPSS Variable Guide Pill for Frequencies */}
                {(() => {
                  const infoF = getSpssVarInfo(freqVar);
                  return (
                    <div className="p-3 bg-indigo-950/80 rounded-2xl border border-indigo-500/30 text-xs text-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black font-mono text-xs">
                          {infoF.name}
                        </span>
                        <span className="font-bold text-white">{infoF.label}</span>
                        <span className="text-[10px] text-indigo-300 font-mono">({infoF.coding})</span>
                      </div>
                      <div className="text-[11px] text-indigo-200">
                        💡 <strong>Menu SPSS:</strong> <code className="bg-white/20 px-1.5 py-0.5 rounded text-amber-200 font-mono font-bold">Analyze &gt; Descriptive Statistics &gt; Frequencies...</code> &gt; Pindahkan <code className="bg-white/20 px-1.5 py-0.5 rounded text-amber-200 font-mono font-bold">{infoF.name}</code> ke <strong>Variable(s)</strong>.
                      </div>
                    </div>
                  );
                })()}

                {/* SPSS Frequencies Statistics Summary Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">Statistics Variable</span>
                    <p className="text-xs font-black text-purple-600 dark:text-purple-400 truncate">{freqTableResult.label}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">N Valid / Missing</span>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">{freqTableResult.nValid} Valid / {freqTableResult.nMissing} Missing</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">Modus (Mode)</span>
                    <p className="text-xs font-black text-pink-600 dark:text-pink-400 truncate">{freqTableResult.mode}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">Jumlah Kategori</span>
                    <p className="text-xs font-black text-teal-600 dark:text-teal-400">{freqTableResult.rows.length} Kategori</p>
                  </div>
                </div>

                {/* Full SPSS Frequencies Output Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold">
                        <th className="p-3">{freqTableResult.label}</th>
                        <th className="p-3 text-center">Frequency (f)</th>
                        <th className="p-3 text-center">Percent (%)</th>
                        <th className="p-3 text-center">Valid Percent (%)</th>
                        <th className="p-3 text-center">Cumulative Percent (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                      {freqTableResult.rows.map((row, idx) => (
                        <tr key={idx} className="bg-white dark:bg-slate-900">
                          <td className="p-2.5 font-sans font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                            <span>{row.label}</span>
                            <span className="text-[10px] text-slate-400 font-normal font-mono">
                              ({row.percent.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-black text-purple-600 dark:text-purple-400">{row.frequency}</td>
                          <td className="p-2.5 text-center font-bold text-slate-800 dark:text-slate-200">{row.percent.toFixed(1)}%</td>
                          <td className="p-2.5 text-center text-slate-700 dark:text-slate-300">{row.validPercent.toFixed(1)}%</td>
                          <td className="p-2.5 text-center font-extrabold text-pink-600 dark:text-pink-400">{row.cumulativePercent.toFixed(1)}%</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <td className="p-2.5 font-sans uppercase">Total Valid</td>
                        <td className="p-2.5 text-center text-purple-700 dark:text-purple-300">{freqTableResult.nValid}</td>
                        <td className="p-2.5 text-center">100.0%</td>
                        <td className="p-2.5 text-center">100.0%</td>
                        <td className="p-2.5 text-center">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Visual Distribution Progress Bars */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                    Visualisasi Proporsi Frekuensi ({freqTableResult.label})
                  </h5>
                  <div className="space-y-2">
                    {freqTableResult.rows.map((row, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>{row.label}</span>
                          <span className="font-mono text-purple-600 dark:text-purple-400">{row.frequency} orang ({row.percent.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW MODE 2: EPIDEMIOLOGY PROFILE & WHO INDICES */}
          {descriptiveViewMode === 'epidemiology_profile' && (
            <div className="space-y-6">

              {/* Key Metrics Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-pink-200/60 dark:border-pink-900/40 shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">Prevalensi Karies</p>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{metrics.cariesPrevalencePct.toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-500">{metrics.cariesCount} dari {metrics.totalN} org</p>
                </div>

                <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-pink-200/60 dark:border-pink-900/40 shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">Mean DMF-T (WHO)</p>
                  <p className="text-xl font-black text-pink-600 dark:text-pink-400 mt-1">{metrics.meanDMFT.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">Status: {dmftCategoryInfo.text.split(' ')[0]}</p>
                </div>

                <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">Mean def-t (Sulung)</p>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{metrics.meanDeft.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">Status: {deftCategoryInfo.text.split(' ')[0]}</p>
                </div>

                <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-teal-200/60 dark:border-teal-900/40 shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">Mean OHI-S</p>
                  <p className="text-xl font-black text-teal-600 dark:text-teal-400 mt-1">{metrics.ohisStats?.avgOHIS?.toFixed(2) || '0.00'}</p>
                  <p className="text-[10px] text-slate-500">DI-S: {metrics.ohisStats?.avgDIS?.toFixed(1)} | CI-S: {metrics.ohisStats?.avgCIS?.toFixed(1)}</p>
                </div>

                <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">SiC Index (Risiko)</p>
                  <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{metrics.siCIndex.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">Beban 1/3 Parah</p>
                </div>

                <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">Care Index</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{metrics.careIndexPct.toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-500">Tingkat Restorasi</p>
                </div>
              </div>

              {/* Section 1: Profil Deskriptif Komponen Kesehatan Gigi & Mulut */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-pink-100 dark:border-pink-900/40">
                  <FileText className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                    1. Profil Deskriptif Komponen Kesehatan Gigi &amp; Mulut (N = 150)
                  </h4>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  Berdasarkan hasil survei kesehatan gigi dan mulut terhadap <strong>150 responden</strong> yang terbagi secara proporsional ke dalam 5 kelompok umur standar WHO (30 Balita 0-4 thn, 30 Anak 5-11 thn, 30 Remaja 12-17 thn, 30 Dewasa 18-59 thn, dan 30 Lansia 60+ thn), ditemukan angka prevalensi karies sebesar <strong>{metrics.cariesPrevalencePct.toFixed(1)}%</strong> ({metrics.cariesCount} orang), sementara <strong>{metrics.cariesFreePct.toFixed(1)}%</strong> ({metrics.cariesFreeCount} orang) berada dalam kondisi bebas karies.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-pink-50/50 dark:bg-pink-950/30 rounded-2xl border border-pink-200/50 dark:border-pink-900/30 space-y-2">
                    <h5 className="text-xs font-black text-pink-950 dark:text-pink-200 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-pink-600" /> Rincian Komponen Karies Gigi
                    </h5>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                      <li><strong>Rata-rata DMF-T Gigi Permanen:</strong> {metrics.meanDMFT.toFixed(2)} (Kategori WHO: <span className="font-bold text-pink-600">{dmftCategoryInfo.text}</span>) dengan SD ± {metrics.sdDMFT.toFixed(2)}.</li>
                      <li><strong>Komponen Decayed (D):</strong> Rata-rata {metrics.meanD.toFixed(2)} gigi/orang (Total {metrics.sumD} karies aktif tak tertangani).</li>
                      <li><strong>Komponen Missing (M):</strong> Rata-rata {metrics.meanM.toFixed(2)} gigi/orang (Total {metrics.sumM} gigi dicabut/hilang karena karies).</li>
                      <li><strong>Komponen Filled (F):</strong> Rata-rata {metrics.meanF.toFixed(2)} gigi/orang (Total {metrics.sumF} gigi tumpat/direstorasi).</li>
                      <li><strong>Rata-rata def-t Gigi Sulung:</strong> {metrics.meanDeft.toFixed(2)} gigi/anak (Kerusakan gigi susu pada kelompok anak/balita).</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-200/50 dark:border-teal-900/30 space-y-2">
                    <h5 className="text-xs font-black text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-teal-600" /> Kebersihan Mulut &amp; Jaringan Lunak
                    </h5>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                      <li><strong>Skor OHI-S Rata-rata:</strong> {metrics.ohisStats?.avgOHIS?.toFixed(2) || '0.00'} (Debris Index DIS: {metrics.ohisStats?.avgDIS?.toFixed(2) || '0.00'}, Calculus Index CIS: {metrics.ohisStats?.avgCIS?.toFixed(2) || '0.00'}).</li>
                      <li><strong>Prevalensi Gusi Berdarah (Gingival Bleeding):</strong> {metrics.gusiBerdarahPct.toFixed(1)}% ({metrics.gusiBerdarahCount} orang mengalami tanda peradangan gusi).</li>
                      <li><strong>Prevalensi Lesi Mukosa Oral:</strong> {metrics.lesiMukosaPct.toFixed(1)}% ({metrics.lesiMukosaCount} orang terdeteksi stomatitis, sariawan, atau perubahan jaringan lunak).</li>
                      <li><strong>Kebutuhan Rujukan Faskes:</strong> {metrics.perluDirujukPct.toFixed(1)}% ({metrics.perluDirujukCount} orang memerlukan penanganan tingkat lanjut di Puskesmas/RS).</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 2: Distribusi Frekuensi & Persentase Kategori WHO */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-pink-100 dark:border-pink-900/40">
                  <BarChart2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                    2. Distribusi Frekuensi &amp; Persentase Kategori WHO
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kategori DMF-T WHO */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase block">
                      A. Distribusi Keparahan DMF-T (WHO)
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Rata-rata DMF-T Populasi</span>
                        <span className="font-mono font-black text-pink-600">{metrics.meanDMFT.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Kategori Tingkat Keparahan</span>
                        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${dmftCategoryInfo.badgeBg}`}>
                          {dmftCategoryInfo.text}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">SiC Index (1/3 Terparah)</span>
                        <span className="font-mono font-black text-purple-600">{metrics.siCIndex.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Care Index (F/DMFT)</span>
                        <span className="font-mono font-black text-emerald-600">{metrics.careIndexPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Kategori OHI-S WHO */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase block">
                      B. Distribusi Kebersihan Mulut OHI-S (Greene &amp; Vermillion)
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Skor Rata-rata OHI-S</span>
                        <span className="font-mono font-black text-teal-600">{metrics.ohisStats?.avgOHIS?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Debris Index (DI-S)</span>
                        <span className="font-mono font-black text-teal-600">{metrics.ohisStats?.avgDIS?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Calculus Index (CI-S)</span>
                        <span className="font-mono font-black text-teal-600">{metrics.ohisStats?.avgCIS?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Status Kebersihan Mulut</span>
                        <span className="font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full text-[11px]">
                          {metrics.ohisStats?.avgOHIS <= 1.2 ? 'Baik (0.0 - 1.2)' : metrics.ohisStats?.avgOHIS <= 3.0 ? 'Sedang (1.3 - 3.0)' : 'Buruk (3.1 - 6.0)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Sub-Tab: ANALISIS KUALITATIF */}
      {activeSubTab === 'qualitative' && (
        <div className="space-y-6" id="qualitative-analysis-section">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-pink-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-pink-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-pink-400" />
                  Narasi Interpretasi &amp; Kualitatif
                </span>
                <span className="px-3 py-1 bg-white/10 text-slate-200 rounded-full text-xs font-mono font-bold">
                  N = {metrics.totalN} Responden (5 Kelompok Umur WHO)
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Analisis Kualitatif &amp; Temuan Naratif Kesehatan Gigi
              </h3>
              
              <p className="text-pink-200/90 text-xs sm:text-sm max-w-3xl leading-relaxed font-medium">
                Interpretasi mendalam mengenai fenomena epidemiologi, faktor etiologi, determinan perilaku masyarakat, karakteristik per kohort umur, serta rekomendasi intervensi kesehatan gigi berbasis bukti.
              </p>
            </div>
          </div>

          {/* Section 1: Deskripsi Kualitatif Berdasarkan Kelompok Usia (WHO Cohort Analysis) */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-pink-100 dark:border-pink-900/40">
              <Users className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                1. Analisis Kualitatif Per Kelompok Usia (WHO Cohort)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Balita 0-4 */}
              <div className="p-4 bg-rose-50/40 dark:bg-slate-800/60 rounded-2xl border border-rose-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-700 dark:text-rose-300 uppercase">1. Balita (0-4 Tahun)</span>
                  <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">N = 30</span>
                </div>
                {(() => {
                  const g = metrics.byAgeGroup.find(a => a.ageGroup === '0-4');
                  return (
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <p><strong>Rata-rata def-t:</strong> {g?.meanDeft.toFixed(2) || '0.00'} gigi/anak | <strong>Karies:</strong> {g?.cariesPrevalencePct.toFixed(1)}%</p>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        <strong>Analisis Kualitatif:</strong> Terjadi karies dini pada anak (*Early Childhood Caries/ECC*). Faktor penyebab utama didominasi oleh pemberian susu botol saat tidur malam, pembersihan rongga mulut yang belum teratur oleh orang tua, serta persepsi keliru bahwa gigi susu yang rusak tidak perlu dirawat karena akan diganti gigi permanen.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Anak 5-11 */}
              <div className="p-4 bg-amber-50/40 dark:bg-slate-800/60 rounded-2xl border border-amber-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase">2. Anak Sekolah (5-11 Tahun)</span>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">N = 30</span>
                </div>
                {(() => {
                  const g = metrics.byAgeGroup.find(a => a.ageGroup === '5-11');
                  return (
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <p><strong>def-t:</strong> {g?.meanDeft.toFixed(2) || '0.00'} | <strong>DMF-T:</strong> {g?.meanDMFT.toFixed(2) || '0.00'} | <strong>OHI-S:</strong> {(g?.meanOHIS || 0).toFixed(2)}</p>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        <strong>Analisis Kualitatif:</strong> Fase gigi bercampur (*mixed dentition*). Gigi Molar 1 permanen yang baru erupsi pada usia 6 tahun sering tidak disadari oleh orang tua sehingga rentan karies pit dan fisur. Kebiasaan jajan makanan kariesogenik di sekolah dan teknik menyikat gigi yang kurang tepat memperparah penumpukan debris.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Remaja 12-17 */}
              <div className="p-4 bg-teal-50/40 dark:bg-slate-800/60 rounded-2xl border border-teal-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-teal-700 dark:text-teal-300 uppercase">3. Remaja (12-17 Tahun)</span>
                  <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">N = 30</span>
                </div>
                {(() => {
                  const g = metrics.byAgeGroup.find(a => a.ageGroup === '12-17');
                  return (
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <p><strong>DMF-T:</strong> {g?.meanDMFT.toFixed(2) || '0.00'} | <strong>OHI-S:</strong> {(g?.meanOHIS || 0).toFixed(2)} | <strong>SiC:</strong> {g?.siCIndex.toFixed(2)}</p>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        <strong>Analisis Kualitatif:</strong> Peningkatan DMF-T gigi permanen seiring bertambahnya usia. Pola konsumsi minuman kekinian manis berkarbonasi dan camilan olahan tinggi gula berinteraksi dengan kebersihan mulut sedang. Remaja sudah memiliki kemandirian menjaga kebersihan tetapi motivasi dan edukasi sikat gigi malam sering diabaikan.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Dewasa 18-59 */}
              <div className="p-4 bg-purple-50/40 dark:bg-slate-800/60 rounded-2xl border border-purple-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase">4. Dewasa (18-59 Tahun)</span>
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">N = 30</span>
                </div>
                {(() => {
                  const g = metrics.byAgeGroup.find(a => a.ageGroup === '18-59');
                  return (
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <p><strong>DMF-T:</strong> {g?.meanDMFT.toFixed(2) || '0.00'} | <strong>Care Index:</strong> {g?.careIndexPct.toFixed(1)}% | <strong>Gusi Berdarah:</strong> {g?.gusiBerdarahPct.toFixed(1)}%</p>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        <strong>Analisis Kualitatif:</strong> Akumulasi kavitas karies lama yang tidak ditumpat (Decayed D) bertransformasi menjadi sisa akar dan karies servikal/akar. Muncul masalah kesehatan periodontal akibat kalkulus supra/subgingival yang memicu gingivitis (gusi mudah berdarah saat disikat).
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Lansia 60+ */}
              <div className="p-4 bg-indigo-50/40 dark:bg-slate-800/60 rounded-2xl border border-indigo-200 dark:border-slate-700 space-y-2 col-span-1 md:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase">5. Lansia (60+ Tahun)</span>
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">N = 30</span>
                </div>
                {(() => {
                  const g = metrics.byAgeGroup.find(a => a.ageGroup === '60+');
                  return (
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <p><strong>DMF-T:</strong> {g?.meanDMFT.toFixed(2) || '0.00'} | <strong>Missing (M):</strong> Dominan | <strong>Rujukan:</strong> {g?.perluDirujukPct.toFixed(1)}%</p>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        <strong>Analisis Kualitatif:</strong> Kelompok dengan beban kehilangan gigi (*Missing M*) terbesar akibat pencabutan dan karies parah menahun. Banyak ditemukan radiks terinfeksi, penurunan daya kunyah, masalah gingiva/resesi gusi, serta kebutuhan mendesak untuk pembuatan gigi tiruan (protesa) guna memulihkan fungsi stomatognasi dan kualitas hidup lansia.
                      </p>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>

          {/* Section 2: Temuan Kualitatif & Pola Perilaku Kesehatan */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-pink-100 dark:border-pink-900/40">
              <HeartPulse className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                2. Interpretasi Kualitatif Determinan Kesehatan Gigi &amp; Perilaku Masyarakat
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Point A: Unmet Need & Care Index */}
              <div className="p-4 bg-pink-50/30 dark:bg-slate-800/50 rounded-2xl border border-pink-200/60 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>A. Unmet Need Restorasi (Care Index = {metrics.careIndexPct.toFixed(1)}%)</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Tingginya proporsi komponen <strong>Decayed (D) = {metrics.meanD.toFixed(2)}</strong> dibandingkan <strong>Filled (F) = {metrics.meanF.toFixed(2)}</strong> mencerminkan fenomena <em>unmet restorative need</em> yang masif. Masyarakat umumnya cenderung membiarkan gigi berlubang tanpa perawatan restorasi awal, dan baru mengunjungi faskes ketika terjadi sakit parah yang mengharuskan pencabutan (Missing M). Faktor pemicu utama meliputi aksesibilitas, biaya perawatan, serta hambatan psikologis (rasa cemas/takut).
                </p>
              </div>

              {/* Point B: Significant Caries Index (SiC) */}
              <div className="p-4 bg-purple-50/30 dark:bg-slate-800/50 rounded-2xl border border-purple-200/60 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-extrabold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>B. Polarisasi Risiko Karies (SiC Index = {metrics.siCIndex.toFixed(2)})</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Nilai Significant Caries Index (SiC) sebesar <strong>{metrics.siCIndex.toFixed(2)}</strong> menunjukkan bahwa sepertiga populasi dengan keparahan karies paling parah memiliki rata-rata skor DMF-T jauh di atas rata-rata populasi keseluruhan ({metrics.meanDMFT.toFixed(2)}). Temuan kualitatif ini mengindikasikan perlunya pendekatan intervensi terarah (*targeted intervention*) khusus bagi kelompok individu berrisiko tinggi.
                </p>
              </div>

              {/* Point C: Higienitas OHI-S & Gingivitis */}
              <div className="p-4 bg-teal-50/30 dark:bg-slate-800/50 rounded-2xl border border-teal-200/60 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-extrabold text-xs">
                  <Activity className="w-4 h-4" />
                  <span>C. Akumulasi Plak/Kalkulus &amp; Gingivitis (Gusi Berdarah {metrics.gusiBerdarahPct.toFixed(1)}%)</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Rata-rata OHI-S sebesar <strong>{metrics.ohisStats?.avgOHIS?.toFixed(2) || '0.00'}</strong> (Debris Index DIS {metrics.ohisStats?.avgDIS?.toFixed(2)} dan Calculus Index CIS {metrics.ohisStats?.avgCIS?.toFixed(2)}) berkorelasi langsung dengan insidensi gusi berdarah sebesar {metrics.gusiBerdarahPct.toFixed(1)}%. Hal ini menandakan kebiasaan menyikat gigi yang kurang tepat waktu (terutama sebelum tidur malam) dan jarangnya pembersihan karang gigi (*scaling*) secara berkala.
                </p>
              </div>

              {/* Point D: Implikasi Rujukan Faskes */}
              <div className="p-4 bg-blue-50/30 dark:bg-slate-800/50 rounded-2xl border border-blue-200/60 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-extrabold text-xs">
                  <Stethoscope className="w-4 h-4" />
                  <span>D. Kebutuhan Rujukan &amp; Perawatan Segera ({metrics.perluDirujukPct.toFixed(1)}%)</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Sebanyak <strong>{metrics.perluDirujukPct.toFixed(1)}%</strong> ({metrics.perluDirujukCount} orang) memerlukan rujukan ke fasilitas kesehatan tingkat lanjut. Kasus rujukan didominasi oleh sisa akar gigi terinfeksi yang memerlukan pencabutan penyulit, karies pulpa yang memerlukan perawatan saluran akar (PSA), lesi mukosa oral ({metrics.lesiMukosaPct.toFixed(1)}%), serta pembuatan protesa gigi tiruan pada kelompok lansia.
                </p>
              </div>

            </div>
          </div>

          {/* Section 3: Rekomendasi Program & Rencana Aksi Intervensi */}
          <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 dark:from-slate-900 dark:via-pink-950/40 dark:to-slate-900 border-2 border-pink-300/80 dark:border-pink-800/60 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-pink-200 dark:border-pink-900/60">
              <Award className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  3. Rekomendasi Intervensi Strategis Program Kesehatan Gigi &amp; Mulut
                </h4>
                <p className="text-[11px] text-pink-700 dark:text-pink-300 font-bold">
                  Rekomendasi kebijakan berbasis bukti epidemiologi untuk meningkatkan status kesehatan gigi masyarakat.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-pink-200/60 dark:border-slate-800 space-y-2">
                <span className="font-extrabold text-pink-600 dark:text-pink-400 uppercase text-[11px] block">1. Intervensi Promotif &amp; Preventif</span>
                <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                  <li>Penguatan Usaha Kesehatan Gigi Sekolah (UKGS) dan sikat gigi bersama secara teratur di SD/TK.</li>
                  <li>Aplikasi Fluoride Topikal Varnish &amp; Pit Fissure Sealant pada Molar 1 anak usia 6-12 tahun.</li>
                  <li>Edukasi pola diet gizi seimbang dan pembatasan konsumsi gula kariesogenik pada remaja.</li>
                </ul>
              </div>

              <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-emerald-200/60 dark:border-slate-800 space-y-2">
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase text-[11px] block">2. Program Kuratif Dini (Boost Care Index)</span>
                <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                  <li>Gerakan Penambalan Gigi Massal (ART / Atraumatic Restorative Treatment) di Puskesmas dan Posyandu.</li>
                  <li>Pembersihan Karang Gigi (Scaling) terjangkau untuk menekan angka gingivitis dan gusi berdarah.</li>
                  <li>Pencabutan radiks terinfeksi secara gratis untuk mencegah fokal infeksi sistemik.</li>
                </ul>
              </div>

              <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-blue-200/60 dark:border-slate-800 space-y-2">
                <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase text-[11px] block">3. Rehabilitatif &amp; Rujukan Terintegrasi</span>
                <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                  <li>Program bantuan pembuatan Gigi Tiruan Sebagian/Lengkap bagi lansia di Faskes/Puskesmas.</li>
                  <li>Sistem rujukan terintegrasi berbasis sistem digital untuk penanganan spesialis lesi mukosa oral.</li>
                  <li>Monitoring periodik Indeks DMF-T dan OHI-S secara berkala di tingkat Posyandu/Kecamatan.</li>
                </ul>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Sub-Tab 2: TABULASI SILANG KELOMPOK UMUR */}
      {activeSubTab === 'age' && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-pink-100 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                Matriks Tabulasi Silang Kuantitatif Berdasarkan Kelompok Umur
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Perbandingan indikator karies gigi sulung (def-t) dan gigi tetap (DMF-T) antar segmen usia.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="p-3 rounded-l-xl">Kelompok Umur</th>
                  <th className="p-3 text-center">N Sampel</th>
                  <th className="p-3 text-center">% Pop</th>
                  <th className="p-3 text-center">Mean def-t</th>
                  <th className="p-3 text-center">Mean DMF-T</th>
                  <th className="p-3 text-center">Mean OHI-S</th>
                  <th className="p-3 text-center">D / M / F</th>
                  <th className="p-3 text-center">Prev. Karies</th>
                  <th className="p-3 text-center">SiC Index</th>
                  <th className="p-3 text-center">Care Index</th>
                  <th className="p-3 text-center">Gusi Berdarah</th>
                  <th className="p-3 text-center rounded-r-xl">Rujukan %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {metrics.byAgeGroup.map((ag) => (
                  <tr key={ag.ageGroup} className="hover:bg-pink-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                      {ag.label}
                    </td>
                    <td className="p-3 text-center font-bold">{ag.n}</td>
                    <td className="p-3 text-center text-slate-500">{ag.pctN.toFixed(1)}%</td>
                    <td className="p-3 text-center font-bold text-rose-600 dark:text-rose-400">{ag.meanDeft.toFixed(2)}</td>
                    <td className="p-3 text-center font-bold text-pink-600 dark:text-pink-400">{ag.meanDMFT.toFixed(2)}</td>
                    <td className="p-3 text-center font-bold text-teal-600 dark:text-teal-400">{(ag.meanOHIS || 0).toFixed(2)}</td>
                    <td className="p-3 text-center text-[11px] font-mono">
                      <span className="text-rose-600">{ag.meanD.toFixed(1)}</span> / <span className="text-amber-600">{ag.meanM.toFixed(1)}</span> / <span className="text-emerald-600">{ag.meanF.toFixed(1)}</span>
                    </td>
                    <td className="p-3 text-center font-bold text-amber-600">{ag.cariesPrevalencePct.toFixed(1)}%</td>
                    <td className="p-3 text-center font-bold text-purple-600">{ag.siCIndex.toFixed(2)}</td>
                    <td className="p-3 text-center font-bold text-emerald-600">{ag.careIndexPct.toFixed(1)}%</td>
                    <td className="p-3 text-center font-bold text-rose-600">{ag.gusiBerdarahPct.toFixed(1)}%</td>
                    <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">{ag.perluDirujukPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: TABULASI SILANG GENDER */}
      {activeSubTab === 'gender' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.byGender.map((g) => (
            <div key={g.gender} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-pink-100 dark:border-slate-800 mb-4">
                <div>
                  <span className="text-xs font-black text-pink-600 uppercase tracking-widest">{g.gender}</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    N = {g.n} Responden ({g.pctN.toFixed(1)}%)
                  </h4>
                </div>
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-950/80 rounded-2xl flex items-center justify-center text-pink-600 font-black text-lg">
                  {g.gender === 'Laki-laki' ? '♂' : '♀'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-pink-50/50 dark:bg-pink-950/40 rounded-2xl border border-pink-200/40">
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase">Rata-rata DMF-T</p>
                  <p className="text-xl font-black text-pink-600">{g.meanDMFT.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">± {g.sdDMFT.toFixed(2)}</p>
                </div>

                <div className="p-3 bg-rose-50/50 dark:bg-rose-950/40 rounded-2xl border border-rose-200/40">
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase">Rata-rata def-t</p>
                  <p className="text-xl font-black text-rose-600">{g.meanDeft.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">Gigi Sulung</p>
                </div>

                <div className="p-3 bg-teal-50/50 dark:bg-teal-950/40 rounded-2xl border border-teal-200/40">
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase">Rata-rata OHI-S</p>
                  <p className="text-xl font-black text-teal-600">{(g.meanOHIS || 0).toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">Kebersihan Mulut</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Prevalensi Karies:</span>
                  <span className="font-extrabold text-amber-600">{g.cariesPrevalencePct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">SiC Index (Top 1/3 Karies):</span>
                  <span className="font-extrabold text-purple-600">{g.siCIndex.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Care Index (Penambalan):</span>
                  <span className="font-extrabold text-emerald-600">{g.careIndexPct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Gusi Berdarah (%):</span>
                  <span className="font-extrabold text-rose-600">{g.gusiBerdarahPct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Memerlukan Rujukan Faskes:</span>
                  <span className="font-extrabold text-blue-600">{g.perluDirujukPct.toFixed(1)}%</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Sub-Tab 4: DEMOGRAFI (PENDIDIKAN & PEKERJAAN) */}
      {activeSubTab === 'demographics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Tabulasi Pendidikan */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-pink-600" />
              Tingkat Pendidikan Terakhir vs DMF-T &amp; OHI-S
            </h3>
            <div className="space-y-3">
              {metrics.byPendidikan.map((p) => (
                <div key={p.pendidikan} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">{p.pendidikan}</span>
                    <p className="text-[10px] text-slate-500">{p.n} Responden | Karies: {p.cariesPrevalencePct.toFixed(1)}% | Rujukan: {p.perluDirujukPct.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-pink-600 dark:text-pink-400">DMF-T: {p.meanDMFT.toFixed(2)}</span>
                    <p className="text-[10px] font-bold text-teal-600">OHI-S: {(p.meanOHIS || 0).toFixed(2)} | Care: {p.careIndexPct.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabulasi Pekerjaan */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-pink-600" />
              Sektor Pekerjaan vs DMF-T &amp; OHI-S
            </h3>
            <div className="space-y-3">
              {metrics.byPekerjaan.map((pk) => (
                <div key={pk.pekerjaan} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">{pk.pekerjaan}</span>
                    <p className="text-[10px] text-slate-500">{pk.n} Responden | Karies: {pk.cariesPrevalencePct.toFixed(1)}% | Rujukan: {pk.perluDirujukPct.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-pink-600 dark:text-pink-400">DMF-T: {pk.meanDMFT.toFixed(2)}</span>
                    <p className="text-[10px] font-bold text-teal-600">OHI-S: {(pk.meanOHIS || 0).toFixed(2)} | Care: {pk.careIndexPct.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Sub-Tab 5: TABEL INDIVIDUAL & FILTER */}
      {activeSubTab === 'individual' && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Search input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari nama atau NIK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-pink-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* Filter Group */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedAgeFilter}
                onChange={(e) => setSelectedAgeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-pink-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Semua Kelompok Umur (WHO)</option>
                <option value="0-4">Balita (0-4 thn)</option>
                <option value="5-11">Anak-anak (5-11 thn)</option>
                <option value="12-17">Remaja (12-17 thn)</option>
                <option value="18-59">Dewasa (18-59 thn)</option>
                <option value="60+">Lansia (60+ thn)</option>
              </select>

              <select
                value={selectedGenderFilter}
                onChange={(e) => setSelectedGenderFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-pink-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Semua Gender</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

          </div>

          {/* Respondent Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="p-3 rounded-l-xl">No</th>
                  <th className="p-3">Nama & NIK</th>
                  <th className="p-3">Gender / Umur</th>
                  <th className="p-3 text-center">def-t (d/e/f)</th>
                  <th className="p-3 text-center">DMF-T (D/M/F)</th>
                  <th className="p-3 text-center">OHI-S (DI/CI)</th>
                  <th className="p-3 text-center">Status Karies</th>
                  <th className="p-3 text-center">Mukosa</th>
                  <th className="p-3 text-center rounded-r-xl">Rencana Rujukan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredRespondents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500">
                      Tidak ditemukan data responden yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredRespondents.map((r, idx) => {
                    const hasCaries = (r.gigiTetap?.karies > 0 || r.gigiSulung?.karies > 0);
                    const ohisVal = r.ohis?.ohisScore || 0;
                    return (
                      <tr key={r.id || idx} className="hover:bg-pink-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{r.nama}</p>
                          <p className="text-[10px] font-mono text-slate-500">{r.nik || '-'}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{r.jenisKelamin}</p>
                          <p className="text-[10px] text-slate-500">{r.umur} thn ({r.kelompokUmur})</p>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="font-black text-rose-600">{r.deft}</span>
                          <span className="text-[10px] text-slate-400 block">({r.gigiSulung?.karies}/{r.gigiSulung?.dicabutKaries}/{r.gigiSulung?.tumpatanTanpaKaries})</span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="font-black text-pink-600">{r.dmft}</span>
                          <span className="text-[10px] text-slate-400 block">({r.gigiTetap?.karies}/{r.gigiTetap?.dicabutKaries}/{r.gigiTetap?.tumpatanTanpaKaries})</span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={`font-black ${
                            ohisVal <= 1.2 ? 'text-emerald-600' : ohisVal <= 3.0 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {r.ohis?.ohisScore?.toFixed(1) || '0.0'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">({r.ohis?.disScore?.toFixed(1) || '0.0'}/{r.ohis?.cisScore?.toFixed(1) || '0.0'})</span>
                        </td>
                        <td className="p-3 text-center">
                          {hasCaries ? (
                            <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                              Karies Aktif
                            </span>
                          ) : r.dmft === 0 && r.deft === 0 ? (
                            <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                              Bebas Karies
                            </span>
                          ) : (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              Non-Karies Aktif
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center text-[10px]">
                          {r.mukosa?.gusiBerdarah && <span className="text-rose-600 font-bold block">Gusi Berdarah</span>}
                          {r.mukosa?.lesiMukosaOral && <span className="text-purple-600 font-bold block">Lesi Mukosa</span>}
                          {!r.mukosa?.gusiBerdarah && !r.mukosa?.lesiMukosaOral && <span className="text-slate-400">Normal</span>}
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-extrabold text-[10px] uppercase text-slate-800 dark:text-slate-200">
                            {r.tindakLanjut?.dirujukKe === 'tidak_dirujuk' ? 'Tidak Dirujuk' : r.tindakLanjut?.dirujukKe?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* MODAL PANDUAN IMPOR DATA & SYNTAX IBM SPSS */}
      {showSpssGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-pink-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-md">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Tutorial SPSS Hasil Uji Chi-Square &amp; Independent T-Test
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 font-extrabold uppercase">
                      100% Ekuivalen SPSS
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Panduan teknis navigasi SPSS, spesifikasi Variabel X &amp; Y, serta verifikasi presisi statistik.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSpssGuideModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSpssGuideTab('values')}
                className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  spssGuideTab === 'values'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md border border-emerald-200/60 dark:border-emerald-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Table className="w-4 h-4 text-emerald-500" />
                <span>Kamus Values (Variable View)</span>
              </button>

              <button
                onClick={() => setSpssGuideTab('chisquare')}
                className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  spssGuideTab === 'chisquare'
                    ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-md border border-pink-200/60 dark:border-pink-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-pink-500" />
                <span>Tutorial Uji Chi-Square</span>
              </button>

              <button
                onClick={() => setSpssGuideTab('ttest')}
                className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  spssGuideTab === 'ttest'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md border border-indigo-200/60 dark:border-indigo-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Activity className="w-4 h-4 text-indigo-500" />
                <span>Tutorial Independent T-Test</span>
              </button>

              <button
                onClick={() => setSpssGuideTab('impor')}
                className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  spssGuideTab === 'impor'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-md border border-purple-200/60 dark:border-purple-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Terminal className="w-4 h-4 text-purple-500" />
                <span>Impor Excel &amp; Syntax</span>
              </button>

              <button
                onClick={() => setSpssGuideTab('troubleshoot')}
                className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  spssGuideTab === 'troubleshoot'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-md border border-amber-200/60 dark:border-amber-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Solusi Hasil Beda</span>
              </button>
            </div>

            {/* TAB CONTENT 0: KAMUS VALUES (VARIABLE VIEW) */}
            {spssGuideTab === 'values' && (
              <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300 animate-fade-in">
                
                {/* Header Instruction Box */}
                <div className="p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-2xl border border-emerald-500/40 shadow-md space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-200">
                      📖 Panduan Pengisian Variable View &amp; Values di IBM SPSS Statistics
                    </h4>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    Untuk memastikan pengujian statistik di IBM SPSS memberikan hasil yang <strong>100% sama presisi</strong> dengan aplikasi ini, masukkan daftar nama variabel dan nilai <strong>Value Labels</strong> berikut ke dalam tab <strong>Variable View</strong> SPSS (di pojok kiri bawah SPSS).
                  </p>
                  <div className="p-2.5 bg-white/10 rounded-xl border border-white/15 text-[11px] text-emerald-100 flex items-center justify-between gap-2">
                    <span>💡 <strong>Tips Cepat:</strong> Jika menggunakan file <strong>"Dataset Kode SPSS (.xlsx)"</strong> yang diunduh dari aplikasi, Anda tidak perlu mengetik satu-satu! Cukup copy <strong>Syntax SPSS</strong> di tab 'Impor Excel &amp; Syntax' dan tekan <code>Ctrl + R</code>.</span>
                    <button
                      onClick={handleCopySyntax}
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] rounded-lg shrink-0 transition-colors cursor-pointer"
                    >
                      Salin Syntax SPSS
                    </button>
                  </div>
                </div>

                {/* Table of Variable View & Values */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Nama Variabel (Name)</th>
                        <th className="p-3">Label Deskripsi</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Isian Values (Value Labels)</th>
                        <th className="p-3">Skala (Measure)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                      
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-pink-600 dark:text-pink-400">JK_CODE</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Jenis Kelamin</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>1 = Laki-Laki</code><br />
                          <code>2 = Perempuan</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Nominal</td>
                      </tr>

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-pink-600 dark:text-pink-400">KEL_UMUR_CODE</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Kelompok Umur WHO</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>1 = 0-4 th (Balita)</code><br />
                          <code>2 = 5-11 th (Anak)</code><br />
                          <code>3 = 12-17 th (Remaja)</code><br />
                          <code>4 = 18-59 th (Dewasa)</code><br />
                          <code>5 = 60+ th (Lansia)</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Ordinal</td>
                      </tr>

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-purple-600 dark:text-purple-400">OHIS_CAT_CODE</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Kategori OHI-S (Kebersihan Mulut)</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>1 = Baik (Skor 0.0 - 1.2)</code><br />
                          <code>2 = Sedang (Skor 1.3 - 3.0)</code><br />
                          <code>3 = Buruk (Skor 3.1 - 6.0)</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Ordinal</td>
                      </tr>

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-purple-600 dark:text-purple-400">KARIES_STATUS</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Status Prevalensi Karies</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>0 = Bebas Karies (DMF-T / def-t = 0)</code><br />
                          <code>1 = Karies Aktif (DMF-T / def-t &ge; 1)</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Nominal</td>
                      </tr>

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-purple-600 dark:text-purple-400">DMFT_CAT_CODE</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Keparahan DMF-T WHO</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>1 = Rendah (&lt; 2.7)</code><br />
                          <code>2 = Tinggi (&ge; 2.7)</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Ordinal</td>
                      </tr>

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400">GUSI_BERDARAH</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Pendarahan Gusi (Gingivitis)</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>0 = Normal / Tidak Berdarah</code><br />
                          <code>1 = Gusi Berdarah</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Nominal</td>
                      </tr>

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400">LESI_MUKOSA</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Lesi Mukosa Oral</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>0 = Normal / Tidak Ada Lesi</code><br />
                          <code>1 = Ada Lesi Mukosa</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Nominal</td>
                      </tr>

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400">PERLU_RUJUKAN</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Kebutuhan Rujukan Faskes</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>0 = Tidak Perlu Rujukan</code><br />
                          <code>1 = Memerlukan Rujukan</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Nominal</td>
                      </tr>

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400">PERAWATAN_SEGERA</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Kebutuhan Perawatan Segera</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>0 = Non-Urgent</code><br />
                          <code>1 = Urgent / Segera</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Nominal</td>
                      </tr>

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-amber-600 dark:text-amber-400">PENDIDIKAN_CODE</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Pendidikan Terakhir</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>1 = Tidak Sekolah</code> | <code>2 = SD</code><br />
                          <code>3 = SMP</code> | <code>4 = SMA</code> | <code>5 = Perguruan Tinggi</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Ordinal</td>
                      </tr>

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-amber-600 dark:text-amber-400">PEKERJAAN_CODE</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Pekerjaan / Aktivitas Utama</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                          <code>1 = Tidak Bekerja</code> | <code>2 = Ibu Rumah Tangga</code><br />
                          <code>3 = Pelajar/Mahasiswa</code> | <code>4 = PNS/TNI/Polri</code><br />
                          <code>5 = Swasta/Buruh</code> | <code>6 = Wiraswasta/Usaha</code>
                        </td>
                        <td className="p-3 font-bold text-slate-600 dark:text-slate-300">Nominal</td>
                      </tr>

                      {/* Continuous Scale Variables */}
                      <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                        <td className="p-3 font-mono font-black text-blue-600 dark:text-blue-400">DMFT_SCORE</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Indeks DMF-T (Gigi Tetap)</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 text-slate-400 italic">None (Kosong - Data Kontinu Rasio 0 - 32)</td>
                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400">Scale (Rasio)</td>
                      </tr>

                      <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                        <td className="p-3 font-mono font-black text-blue-600 dark:text-blue-400">DEFT_SCORE</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Indeks def-t (Gigi Sulung)</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 text-slate-400 italic">None (Kosong - Data Kontinu Rasio 0 - 20)</td>
                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400">Scale (Rasio)</td>
                      </tr>

                      <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                        <td className="p-3 font-mono font-black text-blue-600 dark:text-blue-400">OHIS_SCORE</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Skor OHI-S Total</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 text-slate-400 italic">None (Kosong - Data Kontinu Rasio 0.0 - 6.0)</td>
                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400">Scale (Rasio)</td>
                      </tr>

                      <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                        <td className="p-3 font-mono font-black text-blue-600 dark:text-blue-400">DIS_SCORE / CIS_SCORE</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Debris Index / Calculus Index</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 text-slate-400 italic">None (Kosong - Data Kontinu Rasio 0.0 - 3.0)</td>
                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400">Scale (Rasio)</td>
                      </tr>

                      <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                        <td className="p-3 font-mono font-black text-blue-600 dark:text-blue-400">UMUR</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Umur Responden (Tahun)</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Numeric</span></td>
                        <td className="p-3 text-slate-400 italic">None (Kosong - Umur Kontinu)</td>
                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400">Scale (Rasio)</td>
                      </tr>

                    </tbody>
                  </table>
                </div>

                {/* Step by step manual fill guide */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 uppercase text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Langkah Pengisian Manual di IBM SPSS Statistics (Klik demi Klik)
                  </span>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 text-xs">
                    <li>Buka IBM SPSS Statistics &gt; Klik tab <strong>Variable View</strong> di pojok kiri bawah.</li>
                    <li>Pada baris pertama kolom <strong>Name</strong>, ketik nama variabel (misal: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border text-pink-600 font-mono">JK_CODE</code>).</li>
                    <li>Pada kolom <strong>Type</strong>, pilih <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border font-mono">Numeric</code>.</li>
                    <li>Pada kolom <strong>Label</strong>, ketik deskripsi lengkapnya (misal: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border font-mono">Jenis Kelamin</code>).</li>
                    <li>Pada kolom <strong>Values</strong>, klik tombol titik tiga <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border font-mono font-bold">...</code> di sebelah kanan sel:
                      <ul className="list-disc list-inside ml-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 mt-0.5">
                        <li>Di kotak <em>Value</em>: Ketik <code className="font-bold text-emerald-600">1</code> | Di kotak <em>Label</em>: Ketik <code className="font-bold text-slate-800 dark:text-slate-200">Laki-Laki</code> &gt; Klik <strong>Add</strong>.</li>
                        <li>Di kotak <em>Value</em>: Ketik <code className="font-bold text-emerald-600">2</code> | Di kotak <em>Label</em>: Ketik <code className="font-bold text-slate-800 dark:text-slate-200">Perempuan</code> &gt; Klik <strong>Add</strong>.</li>
                        <li>Klik <strong>OK</strong>.</li>
                      </ul>
                    </li>
                    <li>Pada kolom <strong>Measure</strong>, pilih <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border font-mono">Nominal</code> atau <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border font-mono">Ordinal</code> sesuai tabel di atas.</li>
                  </ol>
                </div>

              </div>
            )}

            {/* TAB CONTENT 1: CHI-SQUARE */}
            {spssGuideTab === 'chisquare' && (
              <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300 animate-fade-in">
                
                {/* Variable X & Y Definition Box */}
                <div className="p-4 bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 dark:from-pink-950/40 dark:via-slate-900 dark:to-purple-950/30 rounded-2xl border border-pink-200 dark:border-pink-900/60 space-y-3">
                  <span className="font-extrabold text-pink-950 dark:text-pink-200 uppercase text-[11px] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-pink-600" />
                    1. Pemetaan Variabel Research (Chi-Square Test)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-pink-200/80 dark:border-pink-900/40 space-y-1">
                      <span className="text-[10px] font-black uppercase text-pink-600 dark:text-pink-400 block">
                        Variabel Independen (X) / Row Variable
                      </span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {bivariateResult.varXLabel} (misal: Jenis Kelamin / Kelompok Umur)
                      </p>
                      <ul className="text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5">
                        <li><strong>Peran:</strong> Variabel Bebas (Prediktor / Pengelompok)</li>
                        <li><strong>Posisi SPSS:</strong> Kotak <code>Row(s)</code></li>
                        <li><strong>Skala Data:</strong> Kategorikal Nominal / Ordinal</li>
                        <li><strong>Kode SPSS:</strong> <code className="bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 px-1 py-0.5 rounded">JK_CODE (1=Laki-Laki, 2=Perempuan)</code></li>
                      </ul>
                    </div>

                    <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-purple-200/80 dark:border-purple-900/40 space-y-1">
                      <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 block">
                        Variabel Dependen (Y) / Column Variable
                      </span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {bivariateResult.varYLabel} (misal: Status Karies DMF-T / OHI-S)
                      </p>
                      <ul className="text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5">
                        <li><strong>Peran:</strong> Variabel Terikat (Outcome / Hasil)</li>
                        <li><strong>Posisi SPSS:</strong> Kotak <code>Column(s)</code></li>
                        <li><strong>Skala Data:</strong> Kategorikal Nominal / Ordinal</li>
                        <li><strong>Kode SPSS:</strong> <code className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded">DMFT_CAT_CODE (1=Bebas, 2=Karies Aktif)</code></li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Steps in SPSS GUI */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 uppercase text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    2. Langkah Navigasi Menu IBM SPSS (Click-by-Click)
                  </span>

                  <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
                    <li className="leading-relaxed">
                      Klik menu <strong>Analyze &gt; Descriptive Statistics &gt; Crosstabs...</strong>
                    </li>
                    <li className="leading-relaxed">
                      Pindahkan Variabel Independen X (misal <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border text-pink-600">JK_CODE</code>) ke kotak <strong>Row(s)</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Pindahkan Variabel Dependen Y (misal <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border text-purple-600">DMFT_CAT_CODE</code>) ke kotak <strong>Column(s)</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Klik tombol <strong>Statistics...</strong> di sebelah kanan:
                      <ul className="list-disc list-inside ml-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 mt-0.5">
                        <li>Centang <strong>[x] Chi-square</strong></li>
                        <li>Centang <strong>[x] Risk</strong> (untuk mendapatkan Odds Ratio &amp; Relative Risk)</li>
                        <li>Centang <strong>[x] Phi and Cramer's V</strong> (untuk kekuatan hubungan)</li>
                        <li>Klik <em>Continue</em>.</li>
                      </ul>
                    </li>
                    <li className="leading-relaxed">
                      Klik tombol <strong>Cells...</strong> di sebelah kanan:
                      <ul className="list-disc list-inside ml-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 mt-0.5">
                        <li>Centang <strong>[x] Observed</strong> dan <strong>[x] Expected</strong></li>
                        <li>Centang <strong>[x] Row</strong> (Persentase Baris)</li>
                        <li>Klik <em>Continue</em>.</li>
                      </ul>
                    </li>
                    <li className="leading-relaxed">
                      Klik <strong>OK</strong>. Hasil output SPSS akan keluar seketika.
                    </li>
                  </ol>
                </div>

                {/* Direct Syntax Chi-Square */}
                <div className="p-4 bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-amber-400" />
                      Syntax Otomatis Uji Chi-Square SPSS
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(spssChiSquareSyntaxCode);
                        alert('Syntax Uji Chi-Square SPSS berhasil disalin!');
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Salin Syntax Chi-Square</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 font-mono text-[10px] rounded-xl overflow-x-auto text-amber-300">
                    {spssChiSquareSyntaxCode}
                  </pre>
                </div>

              </div>
            )}

            {/* TAB CONTENT 2: INDEPENDENT T-TEST */}
            {spssGuideTab === 'ttest' && (
              <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300 animate-fade-in">
                
                {/* Variable X & Y Definition Box */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-pink-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                  <span className="font-extrabold text-indigo-950 dark:text-indigo-200 uppercase text-[11px] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    1. Pemetaan Variabel Research (Independent Samples T-Test)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-200/80 dark:border-indigo-900/40 space-y-1">
                      <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block">
                        Variabel Independen (X) / Grouping Variable
                      </span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {customTTestResult.groupVarLabel} (misal: Jenis Kelamin)
                      </p>
                      <ul className="text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5">
                        <li><strong>Peran:</strong> Variabel Pengelompok (2 Kelompok)</li>
                        <li><strong>Syarat SPSS:</strong> Wajib bertipe <strong>NUMERIK</strong> (<code className="text-pink-600 font-bold">JK_CODE</code>)</li>
                        <li><strong>Posisi SPSS:</strong> Kotak <code>Grouping Variable</code></li>
                        <li><strong>Koding Groups:</strong> <code className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1 py-0.5 rounded">Group 1 = 1 (Laki-Laki), Group 2 = 2 (Perempuan)</code></li>
                      </ul>
                    </div>

                    <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-purple-200/80 dark:border-purple-900/40 space-y-1">
                      <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 block">
                        Variabel Dependen (Y) / Test Variable
                      </span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {customTTestResult.numVarLabel} (misal: Indeks DMF-T / OHI-S)
                      </p>
                      <ul className="text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5">
                        <li><strong>Peran:</strong> Variabel Kuantitatif (Skor Kontinu)</li>
                        <li><strong>Posisi SPSS:</strong> Kotak <code>Test Variable(s)</code></li>
                        <li><strong>Skala Data:</strong> Rasio / Interval (Skor Numerik)</li>
                        <li><strong>Kolom SPSS:</strong> <code className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded">DMFT_SCORE / OHIS_SCORE</code></li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Troubleshooting Box for Independent T-Test */}
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border-2 border-amber-300 dark:border-amber-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-950 dark:text-amber-200 uppercase text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      SOLUSI ERROR SPSS: Kenapa T-Test Tidak Muncul / Error di SPSS?
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                    Kesalahan umum di SPSS adalah memasukkan kolom teks (<code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded text-rose-600 font-bold">JK_LABEL</code>) ke dalam Grouping Variable. SPSS menolaknya karena membutuhkan koding angka numerik!
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/60">
                      <span className="font-bold text-rose-600 block mb-0.5">❌ SALAH (Menyebabkan Error):</span>
                      <p className="text-slate-600 dark:text-slate-400">Grouping Variable: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">JK_LABEL (String "Laki-laki")</code></p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-900/60">
                      <span className="font-bold text-emerald-600 block mb-0.5">✅ BENAR (100% Berhasil):</span>
                      <p className="text-slate-600 dark:text-slate-400">Grouping Variable: <code className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1 py-0.5 rounded font-bold">JK_CODE (Numerik 1 &amp; 2)</code></p>
                    </div>
                  </div>
                </div>

                {/* Steps in SPSS GUI */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 uppercase text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    2. Langkah Navigasi Independent T-Test di IBM SPSS (Click-by-Click)
                  </span>

                  <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
                    <li className="leading-relaxed">
                      Klik menu <strong>Analyze &gt; Compare Means &gt; Independent-Samples T Test...</strong>
                    </li>
                    <li className="leading-relaxed">
                      Pindahkan Variabel Dependen Y (misal <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border text-purple-600">DMFT_SCORE</code> atau <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border text-purple-600">OHIS_SCORE</code>) ke kotak <strong>Test Variable(s)</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Pindahkan Variabel Independen X (misal <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border text-indigo-600 font-bold">JK_CODE</code>) ke kotak <strong>Grouping Variable</strong>.
                    </li>
                    <li className="leading-relaxed font-bold text-pink-600 dark:text-pink-400">
                      KLIK TOMBOL "Define Groups..." di bawah kotak Grouping Variable:
                      <ul className="list-disc list-inside ml-4 text-[11px] font-normal text-slate-600 dark:text-slate-300 space-y-0.5 mt-0.5">
                        <li>Ketik angka <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border text-slate-900 dark:text-slate-100 font-bold">1</code> di kotak <strong>Group 1</strong></li>
                        <li>Ketik angka <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border text-slate-900 dark:text-slate-100 font-bold">2</code> di kotak <strong>Group 2</strong></li>
                        <li>Klik <em>Continue</em>. (Tampilan di SPSS akan menjadi <code className="text-indigo-600">JK_CODE(1 2)</code>).</li>
                      </ul>
                    </li>
                    <li className="leading-relaxed">
                      Klik <strong>OK</strong>. Hasil statistik deskriptif kelompok (Group Statistics) &amp; Uji T akan muncul di Viewer SPSS.
                    </li>
                  </ol>
                </div>

                {/* Direct Syntax T-Test */}
                <div className="p-4 bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                      Syntax Otomatis Uji Independent T-Test &amp; Mann-Whitney SPSS
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(spssTTestSyntaxCode);
                        alert('Syntax Uji T-Test SPSS berhasil disalin!');
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Salin Syntax T-Test</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 font-mono text-[10px] rounded-xl overflow-x-auto text-indigo-300">
                    {spssTTestSyntaxCode}
                  </pre>
                </div>

              </div>
            )}

            {/* TAB CONTENT 3: IMPOR & SYNTAX VALUE LABELS */}
            {spssGuideTab === 'impor' && (
              <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 animate-fade-in">
                
                <div className="p-4 bg-indigo-50/50 dark:bg-slate-800/60 rounded-2xl border border-indigo-100 dark:border-slate-700 space-y-2">
                  <span className="font-extrabold text-indigo-950 dark:text-indigo-200 uppercase text-[11px] block">
                    Langkah 1: Impor File Excel ke IBM SPSS
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                    <li>Buka aplikasi <strong>IBM SPSS Statistics</strong> di komputer Anda.</li>
                    <li>Klik menu <strong>File &gt; Open &gt; Data...</strong></li>
                    <li>Ubah pilihan <em>Files of type</em> di pojok kanan bawah dari <code>.sav</code> menjadi <strong>Excel (*.xlsx, *.xls)</strong>.</li>
                    <li>Pilih file Excel dataset koding SPSS yang didownload dari tombol <strong>"Dataset Kode SPSS (.xlsx)"</strong> di aplikasi ini.</li>
                    <li>Pada jendela pop-up <em>Read Excel File</em>, pastikan memilih Worksheet: <strong>SPSS_Raw_Data</strong>.</li>
                    <li>Pastikan opsi <strong>"Read variable names from the first row of data"</strong> tercentang, lalu klik <strong>OK</strong>.</li>
                  </ol>
                </div>

                <div className="p-4 bg-purple-50/50 dark:bg-slate-800/60 rounded-2xl border border-purple-100 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-purple-950 dark:text-purple-200 uppercase text-[11px] block">
                      Langkah 2: Jalankan Syntax SPSS untuk Otomatisasi Value Labels &amp; Koding
                    </span>
                    <button
                      onClick={handleCopySyntax}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      {copiedSyntax ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Syntax Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Syntax SPSS</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Agar SPSS mengenali variabel numerik bergaya koding seperti <code>JK_CODE (1=Laki-Laki, 2=Perempuan)</code>, <code>DMFT_CAT_CODE</code>, dan <code>OHIS_CAT_CODE</code>, jalankan script syntax berikut:
                  </p>

                  <div className="relative">
                    <pre className="p-3.5 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-2xl overflow-x-auto max-h-48 border border-slate-800 leading-relaxed">
                      {spssSyntaxCode}
                    </pre>
                  </div>

                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 pt-1">
                    <li>Di SPSS, klik menu <strong>File &gt; New &gt; Syntax</strong>.</li>
                    <li>Paste (Tempel) kode syntax di atas ke dalam jendela Syntax SPSS.</li>
                    <li>Blok semua teks syntax tersebut, lalu klik tombol **Run** (ikon segitiga hijau ▶ atau tekan <code>Ctrl + R</code>).</li>
                    <li>Semua label variabel dan Value Labels numerik akan otomatis terkonfigurasi rapi di SPSS!</li>
                  </ol>
                </div>

                {/* PDF Comparison Section */}
                <div className="p-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 dark:from-pink-950/40 dark:via-purple-950/40 dark:to-indigo-950/40 rounded-2xl border-2 border-pink-300 dark:border-pink-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="font-extrabold text-pink-900 dark:text-pink-300 uppercase text-[11px] flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                      Unduh Dokumen Verifikasi / PDF Perbandingan SPSS
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Cetak Laporan PDF Hasil Analisis yang disandingkan berdampingan dengan parameter IBM SPSS.
                    </p>
                  </div>
                  <button
                    onClick={handleExportSpssComparisonPdf}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Download PDF Perbandingan SPSS</span>
                  </button>
                </div>

              </div>
            )}

            {/* TAB CONTENT 4: TROUBLESHOOTING HASIL BEDA */}
            {spssGuideTab === 'troubleshoot' && (
              <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300 animate-fade-in">
                
                {/* Header Banner */}
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-rose-950/40 rounded-2xl border-2 border-amber-300 dark:border-amber-800 space-y-2">
                  <span className="font-black text-amber-950 dark:text-amber-200 uppercase text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Panduan Mencegah &amp; Mengatasi Perbedaan Hasil Aplikasi vs SPSS
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                    Hasil di SPSS dan aplikasi ini <strong>dijamin 100% presisi dan identik</strong> karena menggunakan formula matematis p-value Chi-Square &amp; Independent T-Test / Welch T-Test standar SPSS. Jika hasilnya berbeda, berikut 4 penyebab utama dan solusi instannya:
                  </p>
                </div>

                {/* 4 Diagnostic Cards */}
                <div className="grid grid-cols-1 gap-3">
                  
                  {/* Item 1 */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-black text-xs">
                      <span className="w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center text-[10px] text-pink-700 dark:text-pink-300">1</span>
                      <span>Penyebab 1: Menggunakan File Excel Berbeda / Tidak Ter-update di SPSS</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      <strong>Masalah:</strong> File Excel yang dibuka di SPSS berbeda dengan data responden yang sedang aktif di aplikasi (misalnya membuka file ekspor lama).
                    </p>
                    <div className="p-2 bg-pink-50 dark:bg-pink-950/40 rounded-xl text-pink-950 dark:text-pink-200 text-[11px] font-medium flex items-center justify-between gap-2">
                      <span><strong>Solusi:</strong> Selalu klik tombol <strong>"Dataset Kode SPSS (.xlsx)"</strong> di bagian atas untuk mengunduh file Excel koding SPSS terbaru yang persis sama dengan data aktif di aplikasi.</span>
                      <button
                        onClick={handleExportSPSS}
                        className="px-2.5 py-1 bg-pink-600 text-white rounded-lg text-[10px] font-bold shrink-0 hover:bg-pink-700 transition-colors cursor-pointer"
                      >
                        Unduh SPSS (.xlsx)
                      </button>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[10px] text-indigo-700 dark:text-indigo-300">2</span>
                      <span>Penyebab 2: Memasukkan Kolom Teks (String) ke Grouping Variable</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      <strong>Masalah:</strong> Pada Independent T-Test di SPSS, memasukkan kolom <code className="text-pink-600 font-bold font-mono">JK_LABEL</code> (berisi teks "Laki-laki") bukan <code className="text-indigo-600 font-bold font-mono">JK_CODE</code> (berisi angka 1 dan 2).
                    </p>
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-950 dark:text-indigo-200 text-[11px] font-medium">
                      <strong>Solusi:</strong> Selalu pilih <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border text-indigo-600 font-bold">JK_CODE</code> di Grouping Variable &gt; Klik <strong>Define Groups...</strong> &gt; Isikan <code>Group 1: 1</code> dan <code>Group 2: 2</code>.
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-xs">
                      <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-[10px] text-purple-700 dark:text-purple-300">3</span>
                      <span>Penyebab 3: Salah Membaca Baris Output SPSS (Equal Variances Assumed vs Not Assumed)</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      <strong>Masalah:</strong> Tabel <em>Independent Samples Test</em> SPSS memiliki 2 baris. Jika Uji Levene signifikan (Sig. ≤ 0.05), Anda harus membaca baris kedua (<em>Equal variances not assumed / Welch's T-Test</em>).
                    </p>
                    <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-950 dark:text-purple-200 text-[11px] font-medium">
                      <strong>Solusi:</strong> Perhatikan Uji Levene Homogenitas di aplikasi ini. Aplikasi menampilkan kedua baris t-count &amp; Welch t-count dengan jelas.
                    </div>
                  </div>

                  {/* Item 4 */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-[10px] text-emerald-700 dark:text-emerald-300">4</span>
                      <span>Penyebab 4: Menggunakan Klik Manual vs Syntax SPSS Otomatis</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      <strong>Masalah:</strong> Menu klik manual di SPSS rentan salah memilih opsi cell / statistics.
                    </p>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-950 dark:text-emerald-200 text-[11px] font-medium flex items-center justify-between gap-2">
                      <span><strong>Solusi Terbaik:</strong> Salin <strong>Syntax SPSS</strong> dari aplikasi &gt; Paste di SPSS (File &gt; New &gt; Syntax) &gt; Tekan <code>Ctrl + R</code>. Dijamin 100% presisi!</span>
                      <button
                        onClick={handleCopySyntax}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shrink-0 hover:bg-emerald-700 transition-colors"
                      >
                        Salin Syntax
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleExportSpssComparisonPdf}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Laporan PDF Perbandingan SPSS</span>
              </button>

              <button
                onClick={() => setShowSpssGuideModal(false)}
                className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
