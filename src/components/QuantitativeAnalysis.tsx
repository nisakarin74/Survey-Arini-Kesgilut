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
  HeartPulse,
  HelpCircle,
  Copy,
  Terminal,
  X
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
  exportBivariatePdf, 
  exportBivariateExcel 
} from '../lib/bivariateEngine';

interface QuantitativeAnalysisProps {
  respondents: RespondentData[];
  sessionName: string;
}

export default function QuantitativeAnalysis({ respondents, sessionName }: QuantitativeAnalysisProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'bivariate' | 'descriptive' | 'qualitative' | 'age' | 'gender' | 'demographics' | 'individual'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');
  const [showSpssGuideModal, setShowSpssGuideModal] = useState<boolean>(false);
  const [copiedSyntax, setCopiedSyntax] = useState<boolean>(false);

  // Bivariate Variable Selector State
  const [bivariateVarX, setBivariateVarX] = useState<'kelompokUmur' | 'jenisKelamin' | 'pendidikan' | 'pekerjaan' | 'kategoriOHIS'>('jenisKelamin');
  const [bivariateVarY, setBivariateVarY] = useState<'statusKaries' | 'keparahanDMFT' | 'kategoriOHIS' | 'statusOHIS' | 'gusiBerdarah' | 'lesiMukosa' | 'rencanaRujukan'>('statusKaries');

  const metrics = calculateQuantitativeAnalysis(respondents);
  const bivariateResult = calculateBivariateAnalysis(respondents, bivariateVarX, bivariateVarY);

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
              onClick={() => setShowSpssGuideModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/90 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-95"
              id="btn-spss-guide-modal"
              title="Petunjuk cara impor ke IBM SPSS & Syntax Kode"
            >
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>Panduan SPSS</span>
            </button>
          </div>
        </div>
      </div>

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
          Analisis Bivariat (Uji Chi-Square & T-Test)
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportBivariatePdf(bivariateResult, sessionName)}
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

            {/* Variable Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Variable X Selector */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <label className="block text-xs font-extrabold text-pink-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white font-black flex items-center justify-center text-[10px]">X</span>
                  Variabel Independen (Faktor Risiko / Demografi)
                </label>
                <select
                  value={bivariateVarX}
                  onChange={(e) => setBivariateVarX(e.target.value as any)}
                  className="w-full bg-slate-900/90 text-white font-bold text-xs p-3 rounded-xl border border-pink-500/40 focus:ring-2 focus:ring-pink-400 outline-none cursor-pointer"
                  id="select-bivariate-var-x"
                >
                  <option value="jenisKelamin">Jenis Kelamin (Laki-laki vs Perempuan)</option>
                  <option value="kelompokUmur">Kelompok Umur WHO (0-4 Balita, 5-11 Anak, 12-17 Remaja, 18-59 Dewasa, 60+ Lansia)</option>
                  <option value="kategoriOHIS">Kategori OHI-S (Baik, Sedang, Buruk)</option>
                  <option value="pendidikan">Tingkat Pendidikan Terakhir</option>
                  <option value="pekerjaan">Sektor Pekerjaan / Aktivitas</option>
                </select>
                <p className="text-[11px] text-slate-300 mt-2">
                  Mengelompokkan data responden berdasarkan kategori pembanding sosial/demografi/status OHI-S.
                </p>
              </div>

              {/* Variable Y Selector */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <label className="block text-xs font-extrabold text-pink-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-white font-black flex items-center justify-center text-[10px]">Y</span>
                  Variabel Dependen (Outcome Klinis Gigi &amp; Mulut)
                </label>
                <select
                  value={bivariateVarY}
                  onChange={(e) => setBivariateVarY(e.target.value as any)}
                  className="w-full bg-slate-900/90 text-white font-bold text-xs p-3 rounded-xl border border-purple-500/40 focus:ring-2 focus:ring-purple-400 outline-none cursor-pointer"
                  id="select-bivariate-var-y"
                >
                  <option value="statusKaries">Status Karies (Karies Aktif vs Bebas Karies)</option>
                  <option value="keparahanDMFT">Keparahan DMFT WHO (Rendah &lt;2.7 vs Tinggi &ge;2.7)</option>
                  <option value="kategoriOHIS">Kebersihan Mulut OHI-S (Baik / Sedang / Buruk)</option>
                  <option value="statusOHIS">Status OHI-S (Sedang/Buruk &gt;1.2 vs Baik &le;1.2)</option>
                  <option value="gusiBerdarah">Kesehatan Gusi (Gusi Berdarah vs Normal)</option>
                  <option value="lesiMukosa">Lesi Mukosa Oral (Ada Lesi vs Normal)</option>
                  <option value="rencanaRujukan">Status Rujukan Faskes (Memerlukan Rujukan vs Tidak)</option>
                  <option value="perluPerawatanSegera">Kebutuhan Perawatan Segera (Urgent vs Non-Urgent)</option>
                </select>
                <p className="text-[11px] text-slate-300 mt-2">
                  Indikator status kesehatan gigi atau kebutuhan perawatan yang diuji hubungannya.
                </p>
              </div>
            </div>
          </div>

          {/* Test Statistic KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Chi Square */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nilai Chi-Square (χ²)</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{bivariateResult.chiSquare.toFixed(3)}</span>
                <span className="text-[10px] font-extrabold bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 px-2 py-0.5 rounded-full">
                  df = {bivariateResult.df}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Uji Independensi Pearson</p>
            </div>

            {/* p-value */}
            <div className={`p-5 rounded-3xl border shadow-sm ${bivariateResult.isSignificant ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'}`}>
              <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">p-value (Asymp. Sig)</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className={`text-2xl font-black ${bivariateResult.isSignificant ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {bivariateResult.pValue < 0.001 ? '< 0.001' : bivariateResult.pValue.toFixed(3)}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${bivariateResult.isSignificant ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                  α = 0.05
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {bivariateResult.isSignificant ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span className="text-[11px] font-black">{bivariateResult.isSignificant ? 'Hubungan Signifikan (H₀ Ditolak)' : 'Tidak Signifikan (H₀ Diterima)'}</span>
              </div>
            </div>

            {/* Odds Ratio OR */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Odds Ratio (OR) / Risiko</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {bivariateResult.oddsRatio !== undefined ? bivariateResult.oddsRatio.toFixed(2) : '-'}
                </span>
                {bivariateResult.is2x2 && (
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded">Tabel 2x2</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {bivariateResult.orCiLower && bivariateResult.orCiUpper ? `95% CI: ${bivariateResult.orCiLower.toFixed(2)} - ${bivariateResult.orCiUpper.toFixed(2)}` : 'Memerlukan format 2x2'}
              </p>
            </div>

            {/* T-Test Mean Comparison */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-pink-200 dark:border-pink-900/40 shadow-sm">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Uji T-Test (Beda Mean DMFT)</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {bivariateResult.tTest ? `t = ${bivariateResult.tTest.tValue.toFixed(2)}` : '-'}
                </span>
                {bivariateResult.tTest && (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${bivariateResult.tTest.isSignificant ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800'}`}>
                    {bivariateResult.tTest.isSignificant ? 'p < 0.05' : 'p ≥ 0.05'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {bivariateResult.tTest ? `df = ${bivariateResult.tTest.df}, p = ${bivariateResult.tTest.pValue.toFixed(3)}` : 'Perbandingan 2 Kelompok'}
              </p>
            </div>

          </div>

          {/* Contingency Table (Crosstab) */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-pink-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  Tabel Kontingensi Crosstabulation: {bivariateResult.varXLabel} vs {bivariateResult.varYLabel}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Menampilkan frekuensi teramati (Observed Count), nilai harapan (Expected Count), serta persentase baris &amp; kolom.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold border-b border-slate-700">
                    <th className="p-3 rounded-tl-2xl">{bivariateResult.varXLabel} (X)</th>
                    {bivariateResult.categoriesY.map(catY => (
                      <th key={catY} className="p-3 text-center">
                        {catY}
                        <span className="block text-[10px] font-normal text-slate-300">Observed (Expected)</span>
                      </th>
                    ))}
                    <th className="p-3 text-right rounded-tr-2xl">Total N (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-100 dark:divide-slate-800 font-medium">
                  {bivariateResult.categoriesX.map((catX, rIdx) => {
                    const rowTotal = bivariateResult.rowTotals[rIdx];
                    const rowTotalPct = ((rowTotal / bivariateResult.grandTotal) * 100).toFixed(1);

                    return (
                      <tr key={catX} className="hover:bg-pink-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-black text-slate-900 dark:text-slate-100 border-r border-pink-100 dark:border-slate-800 bg-pink-50/30 dark:bg-slate-800/30">
                          {catX}
                        </td>

                        {bivariateResult.categoriesY.map((_, cIdx) => {
                          const cell = bivariateResult.matrix[rIdx][cIdx];
                          return (
                            <td key={cIdx} className="p-3 text-center border-r border-pink-100 dark:border-slate-800">
                              <div className="font-black text-sm text-slate-900 dark:text-slate-100">
                                {cell.observed} <span className="text-xs text-slate-500 font-normal">({cell.expected.toFixed(1)})</span>
                              </div>
                              <div className="text-[10px] text-pink-600 dark:text-pink-400 font-bold mt-0.5">
                                % Baris: {cell.rowPct.toFixed(1)}%
                              </div>
                              <div className="text-[10px] text-slate-400">
                                % Kolom: {cell.colPct.toFixed(1)}%
                              </div>
                            </td>
                          );
                        })}

                        <td className="p-3 text-right font-black text-slate-900 dark:text-slate-100 bg-pink-50/20 dark:bg-slate-800/20">
                          <div>{rowTotal} org</div>
                          <div className="text-[10px] text-slate-500 font-bold">{rowTotalPct}%</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-slate-100 border-t-2 border-pink-300 dark:border-pink-800">
                    <td className="p-3">Total Populasi (N)</td>
                    {bivariateResult.categoriesY.map((_, cIdx) => {
                      const colTotal = bivariateResult.colTotals[cIdx];
                      const colTotalPct = ((colTotal / bivariateResult.grandTotal) * 100).toFixed(1);
                      return (
                        <td key={cIdx} className="p-3 text-center">
                          <div>{colTotal} org</div>
                          <div className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">{colTotalPct}%</div>
                        </td>
                      );
                    })}
                    <td className="p-3 text-right text-pink-600 dark:text-pink-400 font-extrabold">
                      {bivariateResult.grandTotal} (100%)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Group Means & Continuous Variables Comparison (DMF-T, def-t & OHI-S) */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              Perbandingan Rata-rata &amp; Standar Deviasi Indeks Klinis Per Kelompok
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Distribusi nilai kontinu DMF-T (gigi tetap), def-t (gigi sulung), dan OHI-S (kebersihan mulut) berdasarkan variabel {bivariateResult.varXLabel}.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {bivariateResult.groupMeans.map(g => (
                <div key={g.category} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-pink-200/50 dark:border-slate-700">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 mb-2">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">{g.category}</span>
                    <span className="text-[10px] font-bold bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 px-2 py-0.5 rounded-full">
                      N = {g.n}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px]">Rata-rata OHI-S:</span>
                      <span className="font-mono font-black text-teal-600 dark:text-teal-400">{(g.meanOHIS || 0).toFixed(2)} ± {(g.sdOHIS || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px]">Rata-rata DMF-T:</span>
                      <span className="font-mono font-black text-pink-600 dark:text-pink-400">{g.meanDMFT.toFixed(2)} ± {g.sdDMFT.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px]">Rata-rata def-t:</span>
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400">{g.meanDeft.toFixed(2)} ± {g.sdDeft.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Narrative Interpretation Box */}
          <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 dark:from-slate-900 dark:via-pink-950/40 dark:to-slate-900 border-2 border-pink-300/80 dark:border-pink-800/60 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-pink-200 dark:border-pink-900/60 mb-3">
              <BookOpen className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Interpretasi &amp; Pembahasan Hasil Penelitian (Naratif Akademik Skripsi/Jurnal)
                </h4>
                <p className="text-[11px] text-pink-700 dark:text-pink-300 font-bold">
                  Diformulasikan secara otomatis sesuai standar penulisan metodologi penelitian epidemiologi.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium bg-white/60 dark:bg-slate-950/60 p-4 rounded-2xl border border-pink-200/50 dark:border-pink-900/30">
              "{bivariateResult.narrativeInterpretation}"
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1 bg-white/80 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-pink-200 dark:border-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-pink-600" /> Tingkat Kepercayaan: 95% (α = 0.05)
              </span>
              <span className="flex items-center gap-1 bg-white/80 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-pink-200 dark:border-slate-700">
                <Info className="w-3.5 h-3.5 text-purple-600" /> Sampel Teranalisis: N = {bivariateResult.grandTotal} Responden
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab: ANALISIS DESKRIPTIF */}
      {activeSubTab === 'descriptive' && (
        <div className="space-y-6" id="descriptive-analysis-section">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-pink-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-pink-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-pink-400" />
                  Statistik &amp; Indeks Deskriptif Epidemiologi
                </span>
                <span className="px-3 py-1 bg-white/10 text-slate-200 rounded-full text-xs font-mono font-bold">
                  N = {metrics.totalN} Responden (5 Kelompok Umur WHO)
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Analisis Deskriptif Kesehatan Gigi &amp; Mulut
              </h3>
              
              <p className="text-pink-200/90 text-xs sm:text-sm max-w-3xl leading-relaxed font-medium">
                Penyajikan gambaran kuantitatif populasi mencakup distribusi frekuensi, nilai rata-rata (mean), standar deviasi, proporsi karies (DMF-T &amp; def-t), skor OHI-S, serta sebaran kategori WHO.
              </p>
            </div>
          </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-pink-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Panduan Praktis Impor Dataset ke IBM SPSS
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Langkah mudah impor file Excel &amp; penerapan otomatis Label Variabel / Kode
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

            {/* Step-by-Step Instructions */}
            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
              
              <div className="p-4 bg-indigo-50/50 dark:bg-slate-800/60 rounded-2xl border border-indigo-100 dark:border-slate-700 space-y-2">
                <span className="font-extrabold text-indigo-950 dark:text-indigo-200 uppercase text-[11px] block">
                  Langkah 1: Impor File Excel ke IBM SPSS
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li>Buka aplikasi <strong>IBM SPSS Statistics</strong> di komputer Anda.</li>
                  <li>Klik menu <strong>File &gt; Open &gt; Data...</strong></li>
                  <li>Ubah pilihan <em>Files of type</em> di pojok kanan bawah dari <code>.sav</code> menjadi <strong>Excel (*.xlsx, *.xls)</strong>.</li>
                  <li>Pilih file <code>Dataset_SPSS_Kesehatan_Gigi_*.xlsx</code> yang baru didownload.</li>
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

              <div className="p-4 bg-emerald-50/50 dark:bg-slate-800/60 rounded-2xl border border-emerald-100 dark:border-slate-700 space-y-1.5">
                <span className="font-extrabold text-emerald-950 dark:text-emerald-200 uppercase text-[11px] block">
                  Langkah 3: Siap Diuji Statistik (Chi-Square, Mann-Whitney, T-Test, dll)
                </span>
                <p className="text-slate-600 dark:text-slate-300">
                  Data Anda sekarang siap dianalisis di SPSS melalui menu <strong>Analyze &gt; Descriptive Statistics &gt; Crosstabs</strong> (uji Bivariat Chi-Square) atau <strong>Analyze &gt; Compare Means</strong>!
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowSpssGuideModal(false)}
                className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs rounded-2xl hover:opacity-90 transition-opacity cursor-pointer"
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
