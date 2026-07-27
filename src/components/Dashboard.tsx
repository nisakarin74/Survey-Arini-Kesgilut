import React from 'react';
import { Award, CheckCircle, AlertTriangle, Users, BookOpen, Briefcase, ChevronRight, HelpCircle, FileBarChart2 } from 'lucide-react';
import { RespondentData } from '../types';
import { calculateSurveyStats } from '../lib/surveyEngine';

interface DashboardProps {
  respondents: RespondentData[];
}

export default function Dashboard({ respondents }: DashboardProps) {
  const stats = calculateSurveyStats(respondents);

  if (respondents.length === 0) {
    return (
      <div className="text-center py-16 glass-panel rounded-3xl max-w-3xl mx-auto p-8 animate-fadeIn" id="dashboard-empty-state">
        <div className="w-16 h-16 bg-white/50 backdrop-blur-md text-indigo-600 border border-white/50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
          <FileBarChart2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">Belum Ada Data Terkumpul</h3>
        <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          Sesi ini masih kosong. Silakan masuk ke tab <strong>"Input Pemeriksaan"</strong> untuk merekam data responden pertama Anda, atau buka tab <strong>"Koneksi Cloud"</strong> untuk memuat data simulasi 30 Oktober 2025.
        </p>
      </div>
    );
  }

  // Helper for progress bar
  const ProgressBar = ({ label, count, pct, colorClass = 'bg-pink-600' }: { label: string, count: number, pct: number, colorClass?: string, key?: React.Key }) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-slate-800 dark:text-slate-200 truncate max-w-[180px] font-bold">{label}</span>
        <span className="text-slate-900 dark:text-slate-100 font-extrabold font-mono">{count} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">org</span> ({pct.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-pink-200/30 dark:border-pink-900/30 backdrop-blur-xs">
        <div style={{ width: `${pct}%` }} className={`${colorClass} h-full rounded-full transition-all duration-500 shadow-xs`} />
      </div>
    </div>
  );

  // WHO Severity class finder for DMF-T
  const getSeverity = (index: number) => {
    if (index === 0) return { label: 'Bebas Karies', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800', desc: 'Sangat baik, tidak ada pengalaman karies.' };
    if (index < 1.2) return { label: 'Sangat Rendah', color: 'bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800', desc: 'Tingkat karies sangat rendah menurut standar WHO.' };
    if (index < 2.7) return { label: 'Rendah', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800', desc: 'Tingkat karies terkendali, pertahankan kebersihan mulut.' };
    if (index < 4.5) return { label: 'Sedang', color: 'bg-orange-50 dark:bg-orange-950/60 text-orange-900 dark:text-orange-300 border-orange-300 dark:border-orange-800', desc: 'Karies sedang, perlu peningkatan tindakan tumpat/segel.' };
    return { label: 'Tinggi / Sangat Tinggi', color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-800', desc: 'Indeks tinggi, memerlukan tindakan preventif dan kuratif masif.' };
  };

  const dmftSeverity = getSeverity(stats.indexAvg.dmft);
  const deftSeverity = getSeverity(stats.indexAvg.deft);

  // Sort breakdowns for clean rendering
  const sortedEdu = Object.entries(stats.pendidikanBreakdown)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  const sortedJob = Object.entries(stats.pekerjaanBreakdown)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 animate-fadeIn" id="dashboard-root">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards-grid">
        <div className="glass-panel p-5 rounded-2xl shadow-md shadow-pink-950/5 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-800 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-wider block">Total Responden</span>
            <span className="p-1.5 bg-pink-100 dark:bg-pink-950/80 text-pink-900 dark:text-pink-300 rounded-xl"><Users className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-950 dark:text-white font-mono tracking-tight">{stats.totalRespondents}</span>
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-300">Orang terdata</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-md shadow-pink-950/5 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-800 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-wider block">Rata-Rata def-t</span>
            <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 rounded-xl"><CheckCircle className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-800 dark:text-emerald-400 font-mono tracking-tight">{stats.indexAvg.deft.toFixed(2)}</span>
            <span className="text-[10px] text-emerald-950 dark:text-emerald-200 font-black font-mono">d:{stats.indexAvg.d.toFixed(1)} e:{stats.indexAvg.e.toFixed(1)} f:{stats.indexAvg.f.toFixed(1)}</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-md shadow-pink-950/5 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-800 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-wider block">Rata-Rata DMF-T</span>
            <span className="p-1.5 bg-pink-100 dark:bg-pink-950/80 text-pink-900 dark:text-pink-300 rounded-xl"><Award className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-pink-800 dark:text-pink-400 font-mono tracking-tight">{stats.indexAvg.dmft.toFixed(2)}</span>
            <span className="text-[10px] text-pink-950 dark:text-pink-200 font-black font-mono">D:{stats.indexAvg.D.toFixed(1)} M:{stats.indexAvg.M.toFixed(1)} F:{stats.indexAvg.F.toFixed(1)}</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-md shadow-pink-950/5 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-800 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-wider block">Tingkat Rujukan</span>
            <span className="p-1.5 bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 rounded-xl"><AlertTriangle className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-800 dark:text-rose-400 font-mono tracking-tight">{((stats.tindakLanjutPct.perluDirujuk || 0) * 100).toFixed(1)}%</span>
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-300">Butuh intervensi</span>
          </div>
        </div>
      </div>

      {/* Main Analysis Tabular Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gigi Sulung & Tetap comparative table */}
        <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4 lg:col-span-2" id="teeth-state-table-container">
          <div className="border-b border-pink-200/80 dark:border-pink-900/40 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-950 dark:text-slate-100 uppercase tracking-wider">I. Rata-Rata Temuan Klinis Gigi & Mulut</h3>
            <span className="text-[9px] bg-pink-100 dark:bg-pink-950 text-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-800 font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-black">Tabel Komparasi</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-pink-100/80 dark:bg-slate-800/80 text-slate-950 dark:text-slate-100 border-b border-pink-300 dark:border-slate-700">
                  <th className="py-3 px-3 font-black uppercase tracking-wider text-[10px]">Kategori Keadaan Gigi</th>
                  <th className="py-3 px-3 text-right font-black uppercase tracking-wider text-[10px]">Rata-Rata Gigi Sulung (def-t)</th>
                  <th className="py-3 px-3 text-right font-black uppercase tracking-wider text-[10px]">Rata-Rata Gigi Tetap (DMF-T)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-200 dark:divide-slate-800 text-slate-900 dark:text-slate-200">
                <tr className="hover:bg-pink-100/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-slate-100">Gigi Sehat</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-950 dark:text-slate-100 font-black">{stats.gigiSulungAvg.sehat.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-950 dark:text-slate-100 font-black">{stats.gigiTetapAvg.sehat.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-pink-100/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-slate-100">Gigi Berlubang / Karies (d / D)</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-800 dark:text-rose-300 font-black">{stats.gigiSulungAvg.karies.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-800 dark:text-rose-300 font-black">{stats.gigiTetapAvg.karies.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-pink-100/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-slate-100">Gigi dicabut karena karies (e / M)</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800 dark:text-amber-300 font-black">{stats.gigiSulungAvg.dicabutKaries.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800 dark:text-amber-300 font-black">{stats.gigiTetapAvg.dicabutKaries.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-pink-100/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-slate-100">Tumpatan dengan karies</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 font-bold">{stats.gigiSulungAvg.tumpatanKaries.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 font-bold">{stats.gigiTetapAvg.tumpatanKaries.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-pink-100/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-slate-100">Tumpatan tanpa karies (f / F)</td>
                  <td className="py-2.5 px-3 text-right font-mono text-pink-800 dark:text-pink-300 font-black">{stats.gigiSulungAvg.tumpatanTanpaKaries.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-pink-800 dark:text-pink-300 font-black">{stats.gigiTetapAvg.tumpatanTanpaKaries.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-pink-100/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-slate-100">Gigi dicabut sebab lain</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-300 font-bold">{stats.gigiSulungAvg.dicabutSebabLain.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-300 font-bold">{stats.gigiTetapAvg.dicabutSebabLain.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-pink-100/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-slate-100">Fissure Sealant</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-300 font-bold">{stats.gigiSulungAvg.fissureSealant.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-300 font-bold">{stats.gigiTetapAvg.fissureSealant.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-pink-100/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-slate-100">Protesa cekat/mahkota/implan/veneer</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-300 font-bold">{stats.gigiSulungAvg.protesaCekat.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-300 font-bold">{stats.gigiTetapAvg.protesaCekat.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-pink-100/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-slate-100">Gigi tidak tumbuh</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-300 font-bold">{stats.gigiSulungAvg.tidakTumbuh.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-300 font-bold">{stats.gigiTetapAvg.tidakTumbuh.toFixed(2)}</td>
                </tr>
                <tr className="bg-pink-200/80 dark:bg-pink-950/80 font-black border-t-2 border-pink-400 dark:border-pink-800">
                  <td className="py-3 px-3 font-black text-pink-950 dark:text-pink-100">Indeks Karies Gabungan (def-t / DMF-T)</td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-900 dark:text-emerald-300 font-black text-sm">{stats.indexAvg.deft.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono text-pink-950 dark:text-pink-200 font-black text-sm">{stats.indexAvg.dmft.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Interpretasi Klinis Box */}
        <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4 flex flex-col justify-between" id="clinical-interpretation-card">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-pink-950 dark:text-pink-200 border-b border-pink-200/80 dark:border-pink-900/40 pb-3 uppercase tracking-wider">II. Interpretasi Epidemiologis</h3>
            
            {/* DMF-T Level */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest">Keparahan Karies Gigi Tetap (DMF-T)</span>
              <div className={`p-3 rounded-2xl border font-black text-xs flex justify-between items-center shadow-xs backdrop-blur-md ${dmftSeverity.color}`}>
                <span>DMF-T: {stats.indexAvg.dmft.toFixed(2)}</span>
                <span className="uppercase text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 border border-pink-300 dark:border-slate-700 shadow-xs">{dmftSeverity.label}</span>
              </div>
              <p className="text-xs text-slate-900 dark:text-slate-200 font-bold leading-relaxed">{dmftSeverity.desc}</p>
            </div>

            {/* def-t Level */}
            <div className="space-y-2 pt-4 border-t border-pink-200 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest">Keparahan Karies Gigi Sulung (def-t)</span>
              <div className={`p-3 rounded-2xl border font-black text-xs flex justify-between items-center shadow-xs backdrop-blur-md ${deftSeverity.color}`}>
                <span>def-t: {stats.indexAvg.deft.toFixed(2)}</span>
                <span className="uppercase text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 border border-pink-300 dark:border-slate-700 shadow-xs">{deftSeverity.label}</span>
              </div>
              <p className="text-xs text-slate-900 dark:text-slate-200 font-bold leading-relaxed">{deftSeverity.desc}</p>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 rounded-2xl border border-pink-300 dark:border-slate-700 text-xs text-slate-950 dark:text-slate-100 space-y-2 shadow-xs">
            <strong className="text-pink-950 dark:text-pink-200 font-black block uppercase tracking-wide text-[10px]">Indeks Kebersihan Mulut & Mukosa</strong>
            {stats.ohisStats && (
              <div className="flex justify-between items-center font-extrabold">
                <span>Rata-Rata OHI-S</span>
                <span className="font-mono text-teal-950 dark:text-teal-200 font-black bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded-full border border-teal-300 dark:border-teal-800">
                  {stats.ohisStats.avgOHIS.toFixed(2)} ({stats.ohisStats.avgOHIS <= 1.2 ? 'Baik' : stats.ohisStats.avgOHIS <= 3.0 ? 'Sedang' : 'Buruk'})
                </span>
              </div>
            )}
            <div className="flex justify-between items-center font-extrabold">
              <span>Gusi Berdarah (BOP)</span>
              <span className="font-mono text-rose-950 dark:text-rose-200 font-black bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">{((stats.mukosaPct.gusiBerdarah || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center font-extrabold">
              <span>Lesi Mukosa Oral</span>
              <span className="font-mono text-amber-950 dark:text-amber-200 font-black bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">{((stats.mukosaPct.lesiMukosaOral || 0) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demographics Visualization (Custom SVG Charts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Gender Breakdown (Donut SVG Chart) */}
        <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4" id="gender-chart-container">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full" /> Karakteristik Jenis Kelamin
          </h4>
          
          <div className="flex items-center justify-around py-2">
            {/* Custom SVG Donut */}
            <div className="relative w-28 h-28">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                {stats.genderFilledCount > 0 && (
                  <>
                    {/* Laki-laki segment */}
                    <circle
                      cx="18" cy="18" r="15.915" fill="none"
                      stroke="#4f46e5" strokeWidth="3.5"
                      strokeDasharray={`${(stats.genderBreakdown['Laki-laki'] / stats.genderFilledCount) * 100} ${100 - ((stats.genderBreakdown['Laki-laki'] / stats.genderFilledCount) * 100)}`}
                      strokeDashoffset="0"
                    />
                    {/* Perempuan segment */}
                    <circle
                      cx="18" cy="18" r="15.915" fill="none"
                      stroke="#ec4899" strokeWidth="3.5"
                      strokeDasharray={`${(stats.genderBreakdown['Perempuan'] / stats.genderFilledCount) * 100} ${100 - ((stats.genderBreakdown['Perempuan'] / stats.genderFilledCount) * 100)}`}
                      strokeDashoffset={`${-((stats.genderBreakdown['Laki-laki'] / stats.genderFilledCount) * 100)}`}
                    />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                <span className="text-base font-black text-slate-900 font-mono">{stats.genderFilledCount}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded-full shadow-md shadow-indigo-600/30" />
                <div className="text-xs">
                  <span className="text-slate-500 block font-medium">Laki-laki</span>
                  <strong className="text-slate-800 font-extrabold font-mono">{stats.genderBreakdown['Laki-laki']} org ({stats.genderFilledCount ? ((stats.genderBreakdown['Laki-laki'] / stats.genderFilledCount) * 100).toFixed(0) : 0}%)</strong>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-500 rounded-full shadow-md shadow-pink-500/30" />
                <div className="text-xs">
                  <span className="text-slate-500 block font-medium">Perempuan</span>
                  <strong className="text-slate-800 font-extrabold font-mono">{stats.genderBreakdown['Perempuan']} org ({stats.genderFilledCount ? ((stats.genderBreakdown['Perempuan'] / stats.genderFilledCount) * 100).toFixed(0) : 0}%)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Age Group Breakdown (Vertical SVG bar charts) */}
        <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4" id="age-chart-container">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <span className="w-1.5 h-3 bg-indigo-500 rounded-full" /> Distribusi Kelompok Umur
          </h4>

          <div className="space-y-3 py-1">
            <ProgressBar
              label="5-10 tahun (anak-anak)"
              count={stats.ageGroupBreakdown['5-10']}
              pct={stats.ageGroupFilledCount ? (stats.ageGroupBreakdown['5-10'] / stats.ageGroupFilledCount) * 100 : 0}
              colorClass="bg-gradient-to-r from-emerald-400 to-emerald-600"
            />
            <ProgressBar
              label="10-18 tahun (remaja)"
              count={stats.ageGroupBreakdown['10-18']}
              pct={stats.ageGroupFilledCount ? (stats.ageGroupBreakdown['10-18'] / stats.ageGroupFilledCount) * 100 : 0}
              colorClass="bg-gradient-to-r from-indigo-400 to-indigo-600"
            />
            <ProgressBar
              label="18-60 tahun (produktif)"
              count={stats.ageGroupBreakdown['18-60']}
              pct={stats.ageGroupFilledCount ? (stats.ageGroupBreakdown['18-60'] / stats.ageGroupFilledCount) * 100 : 0}
              colorClass="bg-gradient-to-r from-amber-400 to-amber-600"
            />
            <ProgressBar
              label="60 tahun ke atas (lansia)"
              count={stats.ageGroupBreakdown['60+']}
              pct={stats.ageGroupFilledCount ? (stats.ageGroupBreakdown['60+'] / stats.ageGroupFilledCount) * 100 : 0}
              colorClass="bg-gradient-to-r from-rose-400 to-rose-600"
            />
          </div>
        </div>

        {/* RTL & Referral Distribution */}
        <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4" id="rtl-chart-container">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <span className="w-1.5 h-3 bg-rose-500 rounded-full" /> Rencana Tindak Lanjut (RTL)
          </h4>

          <div className="space-y-3.5 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center py-1 border-b border-white/20">
              <span className="text-slate-600">Perlu Perawatan Segera</span>
              <strong className="font-mono text-rose-600 font-extrabold">{((stats.tindakLanjutPct.perluPerawatanSegera || 0) * 100).toFixed(1)}%</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/20">
              <span className="text-slate-600">Perlu Perawatan Tidak Segera</span>
              <strong className="font-mono text-amber-600 font-extrabold">{((stats.tindakLanjutPct.perluPerawatanTidakSegera || 0) * 100).toFixed(1)}%</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/20">
              <span className="text-slate-600">Memerlukan Rujukan Klinis</span>
              <strong className="font-mono text-indigo-600 font-extrabold">{((stats.tindakLanjutPct.perluDirujuk || 0) * 100).toFixed(1)}%</strong>
            </div>

            {stats.tindakLanjutPct.perluDirujuk > 0 && (
              <div className="mt-2.5 space-y-2 bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/50 shadow-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Faskes Rujukan Terpilih</span>
                {stats.tindakLanjutPct.dirujukKePuskesmas > 0 && (
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Puskesmas</span>
                    <strong className="font-mono text-slate-800 font-bold">{((stats.tindakLanjutPct.dirujukKePuskesmas || 0) * 100).toFixed(1)}%</strong>
                  </div>
                )}
                {stats.tindakLanjutPct.dirujukKeRSUmum > 0 && (
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>RS Umum</span>
                    <strong className="font-mono text-slate-800 font-bold">{((stats.tindakLanjutPct.dirujukKeRSUmum || 0) * 100).toFixed(1)}%</strong>
                  </div>
                )}
                {stats.tindakLanjutPct.dirujukKeRSGM > 0 && (
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>RSGM / RS Gigi & Mulut</span>
                    <strong className="font-mono text-slate-800 font-bold">{((stats.tindakLanjutPct.dirujukKeRSGM || 0) * 100).toFixed(1)}%</strong>
                  </div>
                )}
                {stats.tindakLanjutPct.dirujukKeKlinikPratama > 0 && (
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Klinik Pratama</span>
                    <strong className="font-mono text-slate-800 font-bold">{((stats.tindakLanjutPct.dirujukKeKlinikPratama || 0) * 100).toFixed(1)}%</strong>
                  </div>
                )}
                {stats.tindakLanjutPct.dirujukKeKlinikUtama > 0 && (
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Klinik Utama</span>
                    <strong className="font-mono text-slate-800 font-bold">{((stats.tindakLanjutPct.dirujukKeKlinikUtama || 0) * 100).toFixed(1)}%</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Social Demographics Detail Progress Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pendidikan List */}
        <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4" id="education-chart-container">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-600" /> Pendidikan Terakhir / Orang Tua
          </h4>
          <div className="space-y-3.5">
            {sortedEdu.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Data pendidikan tidak tersedia</p>
            ) : (
              sortedEdu.map(([eduName, count]) => (
                <ProgressBar
                  key={eduName}
                  label={eduName}
                  count={count}
                  pct={stats.pendidikanFilledCount ? (count / stats.pendidikanFilledCount) * 100 : 0}
                  colorClass="bg-gradient-to-r from-indigo-500 to-indigo-600"
                />
              ))
            )}
          </div>
        </div>

        {/* Pekerjaan List */}
        <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4" id="occupation-chart-container">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-emerald-600" /> Pekerjaan / Orang Tua
          </h4>
          <div className="space-y-3.5">
            {sortedJob.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Data pekerjaan tidak tersedia</p>
            ) : (
              sortedJob.map(([jobName, count]) => (
                <ProgressBar
                  key={jobName}
                  label={jobName}
                  count={count}
                  pct={stats.pekerjaanFilledCount ? (count / stats.pekerjaanFilledCount) * 100 : 0}
                  colorClass="bg-gradient-to-r from-emerald-500 to-emerald-600"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
