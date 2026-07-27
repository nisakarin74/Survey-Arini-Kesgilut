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
  BookOpen
} from 'lucide-react';
import { RespondentData } from '../types';
import { 
  calculateQuantitativeAnalysis, 
  getWHOCategory, 
  exportQuantitativePdf, 
  exportQuantitativeExcel 
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
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'bivariate' | 'age' | 'gender' | 'demographics' | 'individual'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');

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

  // Filter individual respondents for individual tab
  const filteredRespondents = respondents.filter(r => {
    const matchSearch = (r.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (r.nik || '').includes(searchTerm);
    const matchAge = selectedAgeFilter === 'all' || r.kelompokUmur === selectedAgeFilter;
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
          Silakan lakukan input data pemeriksaan gigi atau muat 100 data simulasi dari tab <strong>Koneksi Cloud</strong> untuk mengaktifkan Analisis Kuantitatif.
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
          </div>
        </div>
      </div>

      {/* KPI Cards Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        
        {/* Total Sample N */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Sampel (N)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{metrics.totalN}</span>
            <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded-full">100%</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">Responden Terdata</p>
        </div>

        {/* Rata-rata DMF-T */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-rata DMF-T</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-pink-600 dark:text-pink-400">{metrics.meanDMFT.toFixed(2)}</span>
            <span className="text-[10px] font-bold text-slate-500">± {metrics.sdDMFT.toFixed(1)}</span>
          </div>
          <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-1.5 ${dmftCategoryInfo.badgeBg}`}>
            WHO: {dmftCategoryInfo.text.split(' ')[0]}
          </span>
        </div>

        {/* Rata-rata deft */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-rata def-t</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{metrics.meanDeft.toFixed(2)}</span>
            <span className="text-[10px] font-bold text-slate-500">Sulung</span>
          </div>
          <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-1.5 ${deftCategoryInfo.badgeBg}`}>
            WHO: {deftCategoryInfo.text.split(' ')[0]}
          </span>
        </div>

        {/* Rata-rata OHI-S */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-teal-200/60 dark:border-teal-900/40 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rata-rata OHI-S</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">{metrics.ohisStats?.avgOHIS?.toFixed(2) || '0.00'}</span>
            <span className="text-[10px] font-bold text-slate-500">DI: {metrics.ohisStats?.avgDIS?.toFixed(1) || '0.0'}</span>
          </div>
          <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-1.5 ${
            (metrics.ohisStats?.avgOHIS || 0) <= 1.2 ? 'bg-emerald-100 text-emerald-800' : (metrics.ohisStats?.avgOHIS || 0) <= 3.0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {(metrics.ohisStats?.avgOHIS || 0) <= 1.2 ? 'Baik' : (metrics.ohisStats?.avgOHIS || 0) <= 3.0 ? 'Sedang' : 'Buruk'}
          </span>
        </div>

        {/* Prevalensi Karies */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prevalensi Karies</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.cariesPrevalencePct.toFixed(1)}%</span>
            <span className="text-[10px] font-bold text-slate-500">{metrics.cariesCount} org</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Bebas Karies: {metrics.cariesFreePct.toFixed(1)}%</p>
        </div>

        {/* SiC Index */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SiC Index (WHO)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{metrics.siCIndex.toFixed(2)}</span>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">Top 1/3</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Grup Risiko Tinggi</p>
        </div>

        {/* Care Index */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Care Index (F/DMF-T)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.careIndexPct.toFixed(1)}%</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Restorasi</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Rasio Penambalan</p>
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
                  <option value="kelompokUmur">Kelompok Umur (5-10, 10-18, 18-60, 60+)</option>
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
                  <th className="p-3 text-center">D / M / F</th>
                  <th className="p-3 text-center">Prev. Karies</th>
                  <th className="p-3 text-center">SiC Index</th>
                  <th className="p-3 text-center">Care Index</th>
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
                    <td className="p-3 text-center text-[11px] font-mono">
                      <span className="text-rose-600">{ag.meanD.toFixed(1)}</span> / <span className="text-amber-600">{ag.meanM.toFixed(1)}</span> / <span className="text-emerald-600">{ag.meanF.toFixed(1)}</span>
                    </td>
                    <td className="p-3 text-center font-bold text-amber-600">{ag.cariesPrevalencePct.toFixed(1)}%</td>
                    <td className="p-3 text-center font-bold text-purple-600">{ag.siCIndex.toFixed(2)}</td>
                    <td className="p-3 text-center font-bold text-emerald-600">{ag.careIndexPct.toFixed(1)}%</td>
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

              <div className="grid grid-cols-2 gap-3 mb-4">
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
              Tingkat Pendidikan Terakhir vs DMF-T
            </h3>
            <div className="space-y-3">
              {metrics.byPendidikan.map((p) => (
                <div key={p.pendidikan} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">{p.pendidikan}</span>
                    <p className="text-[10px] text-slate-500">{p.n} Responden | Prev. Karies: {p.cariesPrevalencePct.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-pink-600 dark:text-pink-400">DMF-T: {p.meanDMFT.toFixed(2)}</span>
                    <p className="text-[10px] font-bold text-emerald-600">Care Index: {p.careIndexPct.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabulasi Pekerjaan */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-pink-200/60 dark:border-pink-900/40 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-pink-600" />
              Sektor Pekerjaan vs DMF-T
            </h3>
            <div className="space-y-3">
              {metrics.byPekerjaan.map((pk) => (
                <div key={pk.pekerjaan} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">{pk.pekerjaan}</span>
                    <p className="text-[10px] text-slate-500">{pk.n} Responden | Prev. Karies: {pk.cariesPrevalencePct.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-pink-600 dark:text-pink-400">DMF-T: {pk.meanDMFT.toFixed(2)}</span>
                    <p className="text-[10px] font-bold text-emerald-600">Care Index: {pk.careIndexPct.toFixed(1)}%</p>
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
                <option value="all">Semua Kelompok Umur</option>
                <option value="5-10">Anak (5-10 thn)</option>
                <option value="10-18">Remaja (10-18 thn)</option>
                <option value="18-60">Dewasa (18-60 thn)</option>
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
                  <th className="p-3 text-center">Status Karies</th>
                  <th className="p-3 text-center">Mukosa</th>
                  <th className="p-3 text-center rounded-r-xl">Rencana Rujukan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredRespondents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      Tidak ditemukan data responden yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredRespondents.map((r, idx) => {
                    const hasCaries = (r.gigiTetap?.karies > 0 || r.gigiSulung?.karies > 0);
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

    </div>
  );
}
