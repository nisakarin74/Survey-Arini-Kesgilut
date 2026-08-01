import React, { useState } from 'react';
import { Search, Trash2, Eye, Edit3, ShieldAlert, CheckCircle2, User, ChevronLeft, ChevronRight, X, Heart, AlertCircle, Sparkles, Save, Check, UserCheck, Calendar, Cake, FileSpreadsheet, FileDown, HelpCircle, FileText } from 'lucide-react';
import { RespondentData, DeciduousTeethState, PermanentTeethState } from '../types';
import Odontogram from './Odontogram';
import { calculateDetailedAge, extractDobFromNik, generateDefaultOHIS, normalizeAgeGroup, exportQuantitativeSPSS, exportQuantitativeExcel } from '../lib/surveyEngine';

interface RespondentsListProps {
  respondents: RespondentData[];
  onDeleteRespondent: (id: string) => Promise<void>;
  onUpdateRespondent?: (id: string, updatedData: Partial<RespondentData>) => Promise<void>;
  isReadOnly?: boolean;
  sessionName?: string;
}

export default function RespondentsList({ respondents, onDeleteRespondent, onUpdateRespondent, isReadOnly = false, sessionName = 'Stan Pemeriksaan Gigi Arini' }: RespondentsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  const [referralFilter, setReferralFilter] = useState('all');
  
  const [selectedRespondent, setSelectedRespondent] = useState<RespondentData | null>(null);
  const [editingRespondent, setEditingRespondent] = useState<RespondentData | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showSpssGuideModal, setShowSpssGuideModal] = useState(false);

  const handleExportSPSS = () => {
    if (respondents.length === 0) {
      showNotice("Tidak ada data responden untuk diekspor!");
      return;
    }
    exportQuantitativeSPSS(respondents, sessionName);
    showNotice(`Master data (${respondents.length} responden) berhasil diekspor ke format SPSS Excel!`);
  };

  const handleExportExcelMaster = () => {
    if (respondents.length === 0) {
      showNotice("Tidak ada data responden untuk diekspor!");
      return;
    }
    exportQuantitativeExcel(respondents, sessionName);
    showNotice(`Master data (${respondents.length} responden) berhasil diekspor ke Excel Laporan Kuantitatif!`);
  };
  
  // Custom Delete Confirmation State
  type DeleteTarget = 
    | { type: 'single'; id: string; name: string }
    | { type: 'bulk'; ids: string[] }
    | { type: 'all'; count: number }
    | null;

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const itemsPerPage = 10;

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Handle Filtering
  const filtered = respondents.filter(r => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = r.nama.toLowerCase().includes(term) || 
                          (r.nik && r.nik.toLowerCase().includes(term)) ||
                          (r.pemeriksa && r.pemeriksa.toLowerCase().includes(term));
    const matchesGender = genderFilter === 'all' || r.jenisKelamin === genderFilter;
    const matchesAgeGroup = ageGroupFilter === 'all' || normalizeAgeGroup(r.kelompokUmur, r.umur) === ageGroupFilter;
    
    let matchesReferral = true;
    if (referralFilter === 'rujuk') matchesReferral = r.tindakLanjut.perluDirujuk;
    else if (referralFilter === 'tidak') matchesReferral = !r.tindakLanjut.perluDirujuk;
    
    return matchesSearch && matchesGender && matchesAgeGroup && matchesReferral;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = (id: string | undefined, name: string) => {
    const validId = id || '';
    if (!validId) {
      showNotice("ID data responden tidak ditemukan.");
      return;
    }
    setDeleteTarget({ type: 'single', id: validId, name });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteTarget({ type: 'bulk', ids: [...selectedIds] });
  };

  const handleDeleteAll = () => {
    if (respondents.length === 0) return;
    setDeleteTarget({ type: 'all', count: respondents.length });
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'single') {
        const { id, name } = deleteTarget;
        await onDeleteRespondent(id);
        if (selectedRespondent?.id === id) setSelectedRespondent(null);
        if (editingRespondent?.id === id) setEditingRespondent(null);
        setSelectedIds(prev => prev.filter(i => i !== id));
        showNotice(`Data responden "${name}" telah berhasil dihapus.`);
      } else if (deleteTarget.type === 'bulk') {
        const count = deleteTarget.ids.length;
        for (const id of deleteTarget.ids) {
          await onDeleteRespondent(id);
          if (selectedRespondent?.id === id) setSelectedRespondent(null);
          if (editingRespondent?.id === id) setEditingRespondent(null);
        }
        setSelectedIds([]);
        showNotice(`${count} data responden yang dipilih telah berhasil dihapus.`);
      } else if (deleteTarget.type === 'all') {
        const total = respondents.length;
        for (const r of respondents) {
          if (r.id) {
            await onDeleteRespondent(r.id);
          }
        }
        setSelectedIds([]);
        setSelectedRespondent(null);
        setEditingRespondent(null);
        showNotice(`Semua (${total}) data responden pada sesi ini telah berhasil dihapus.`);
      }
    } catch (err) {
      console.error("Gagal menghapus data:", err);
      showNotice("Gagal menghapus data responden.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const toggleSelectAll = () => {
    const currentFilteredIds = filtered.map(r => r.id!).filter(Boolean);
    const allSelected = currentFilteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Safe division helper
  const renderIndexBadge = (val: number, limit: number) => {
    let color = 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';
    if (val > 0 && val < limit) color = 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    else if (val >= limit) color = 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    return <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full border ${color}`}>{val}</span>;
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto p-2" id="respondents-list-root">
      
      {/* Toast Notification for actions */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 text-xs font-black shadow-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="p-1 hover:bg-emerald-200/50 rounded-lg text-emerald-700 dark:text-emerald-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Read-Only Notice Banner */}
      {isReadOnly && (
        <div className="p-3.5 px-4 bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-2xl text-amber-950 dark:text-amber-200 text-xs font-bold flex items-center justify-between shadow-xs" id="banner-readonly-respondents">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span><strong>Mode Pelihat (Read-Only):</strong> Tombol Edit dan Hapus disembunyikan. Anda dapat mengeklik ikon mata untuk melihat detail responden secara lengkap.</span>
          </div>
        </div>
      )}

      {/* Top Header & Quick Actions Bar */}
      <div className="glass-panel p-4 px-5 rounded-2xl shadow-sm border border-pink-200/60 dark:border-pink-900/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-pink-100 dark:bg-pink-950/80 border border-pink-200 dark:border-pink-800 text-pink-900 dark:text-pink-100 font-extrabold text-xs rounded-xl flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-pink-600" />
            <span>Total Responden: {filtered.length} {filtered.length !== respondents.length ? `(dari ${respondents.length})` : ''}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {respondents.length > 0 && (
            <>
              <button
                onClick={handleExportSPSS}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                title="Ekspor Master Data (150 Responden) ke format Excel Pre-Coded untuk IBM SPSS Statistics"
                id="btn-export-master-spss"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-200" />
                <span>Ekspor SPSS (.xlsx)</span>
              </button>

              <button
                onClick={handleExportExcelMaster}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                title="Ekspor Master Data Laporan Kuantitatif Excel (.xlsx)"
                id="btn-export-master-excel"
              >
                <FileDown className="w-4 h-4 text-emerald-200" />
                <span>Ekspor Excel Master</span>
              </button>

              <button
                onClick={() => setShowSpssGuideModal(true)}
                className="px-3 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                title="Petunjuk cara membuka file SPSS di IBM SPSS Statistics"
                id="btn-open-spss-guide"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span>Panduan SPSS</span>
              </button>
            </>
          )}

          {respondents.length > 0 && !isReadOnly && (
            <button
              onClick={handleDeleteAll}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-xs ml-1"
              title="Hapus seluruh data responden"
              id="btn-delete-all-respondents"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Semua</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtering Header */}
      <div className="glass-panel p-5 rounded-2xl shadow-md grid grid-cols-1 md:grid-cols-4 gap-3 border border-pink-200/50 dark:border-pink-900/40" id="filters-container">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-pink-600 dark:text-pink-400" />
          <input
            type="text"
            placeholder="Cari nama responden..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/70 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold shadow-xs"
          />
        </div>

        {/* Gender */}
        <select
          value={genderFilter}
          onChange={e => { setGenderFilter(e.target.value); setCurrentPage(1); }}
          className="px-3.5 py-2.5 bg-white/70 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold shadow-xs"
        >
          <option value="all">Semua Jenis Kelamin</option>
          <option value="Laki-laki">Laki-laki</option>
          <option value="Perempuan">Perempuan</option>
        </select>

        {/* Age Group */}
        <select
          value={ageGroupFilter}
          onChange={e => { setAgeGroupFilter(e.target.value); setCurrentPage(1); }}
          className="px-3.5 py-2.5 bg-white/70 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold shadow-xs"
        >
          <option value="all">Semua Kelompok Umur (WHO)</option>
          <option value="0-4">Balita (0-4 th)</option>
          <option value="5-11">Anak-anak (5-11 th)</option>
          <option value="12-17">Remaja (12-17 th)</option>
          <option value="18-59">Dewasa (18-59 th)</option>
          <option value="60+">Lansia (60+ th)</option>
        </select>

        {/* Referral Status */}
        <select
          value={referralFilter}
          onChange={e => { setReferralFilter(e.target.value); setCurrentPage(1); }}
          className="px-3.5 py-2.5 bg-white/70 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold shadow-xs"
        >
          <option value="all">Semua Status Rujukan</option>
          <option value="rujuk">Memerlukan Rujukan</option>
          <option value="tidak">Tidak Perlu Rujukan</option>
        </select>
      </div>

      {/* Bulk Action Bar when items selected */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-500 text-white p-3.5 px-5 rounded-2xl shadow-lg flex items-center justify-between border border-rose-600 animate-fadeIn" id="bulk-action-bar">
          <div className="flex items-center gap-2 text-xs font-black">
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
              {selectedIds.length}
            </span>
            <span>Responden Dipilih</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-1.5 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
              id="btn-bulk-delete"
            >
              <Trash2 className="w-4 h-4" /> Hapus Terpilih ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="glass-panel rounded-3xl shadow-lg border border-pink-200/50 dark:border-pink-900/40 overflow-hidden" id="respondents-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-pink-100/80 dark:bg-slate-800/80 text-slate-950 dark:text-slate-100 border-b border-pink-300 dark:border-slate-700 font-black uppercase tracking-wider">
                <th className="py-4 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every(r => r.id && selectedIds.includes(r.id))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded-md accent-pink-600 cursor-pointer"
                    title="Pilih Semua Responden"
                  />
                </th>
                <th className="py-4 px-4 text-[10px]">Nama Responden</th>
                <th className="py-4 px-3 text-[10px]">NIK</th>
                <th className="py-4 px-3 text-[10px]">Umur</th>
                <th className="py-4 px-3 text-[10px]">Gender</th>
                <th className="py-4 px-3 text-[10px] text-center">Indeks def-t</th>
                <th className="py-4 px-3 text-[10px] text-center">Indeks DMF-T</th>
                <th className="py-4 px-3 text-[10px] text-center">OHI-S</th>
                <th className="py-4 px-3 text-[10px]">Mukosa</th>
                <th className="py-4 px-3 text-[10px]">Tindak Lanjut</th>
                <th className="py-4 px-4 text-[10px] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-200 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-800 dark:text-slate-300 font-extrabold bg-pink-50/50 dark:bg-slate-900/50">
                    Tidak ada responden yang cocok dengan kriteria pencarian atau filter.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((r) => (
                  <tr key={r.id} className={`transition-colors ${r.id && selectedIds.includes(r.id) ? 'bg-pink-100/80 dark:bg-slate-800/80' : 'hover:bg-pink-100/50 dark:hover:bg-slate-800/50'}`}>
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!(r.id && selectedIds.includes(r.id))}
                        onChange={() => r.id && toggleSelectOne(r.id)}
                        className="w-4 h-4 rounded-md accent-pink-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-950 dark:text-slate-100 max-w-[170px]">
                      <div className="truncate" title={r.nama}>{r.nama}</div>
                      {r.pemeriksa && (
                        <div className="text-[10px] text-pink-700 dark:text-pink-300 font-bold truncate flex items-center gap-1" title={`Pemeriksa: ${r.pemeriksa}`}>
                          <UserCheck className="w-3 h-3 shrink-0" /> {r.pemeriksa}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <div>{r.nik || '-'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 mt-0.5" title={`Tanggal Pemeriksaan: ${r.tanggalInput}`}>
                        <Calendar className="w-2.5 h-2.5 text-pink-500 shrink-0" />
                        {r.tanggalInput}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-extrabold font-mono text-slate-900 dark:text-slate-200">
                      <div>{r.umur} th</div>
                      {(r.umurLengkap || (r.tanggalLahir ? calculateDetailedAge(r.tanggalLahir, r.tanggalInput).formatted : '')) && (
                        <div className="text-[9px] font-semibold text-pink-600 dark:text-pink-400 mt-0.5 whitespace-nowrap">
                          {r.umurLengkap || calculateDetailedAge(r.tanggalLahir, r.tanggalInput).formatted}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${r.jenisKelamin === 'Laki-laki' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-950 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800' : 'bg-pink-100 dark:bg-pink-950 text-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-800'}`}>
                        {r.jenisKelamin}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {renderIndexBadge(r.deft, 3)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {renderIndexBadge(r.dmft, 2)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {(() => {
                        const ohis = r.ohis || generateDefaultOHIS(r);
                        const colorClass = ohis.kategori === 'Baik'
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
                          : ohis.kategori === 'Sedang'
                          ? 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                          : 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800';
                        return (
                          <span className={`inline-flex flex-col items-center px-2 py-0.5 rounded-lg text-[10px] font-black border font-mono ${colorClass}`}>
                            <span>{ohis.ohisScore.toFixed(2)}</span>
                            <span className="text-[8px] font-sans font-bold uppercase">{ohis.kategori}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-0.5 text-[10px]">
                        {r.mukosa.gusiBerdarah && <span className="text-rose-600 font-bold">• Gusi Berdarah</span>}
                        {r.mukosa.lesiMukosaOral && <span className="text-amber-600 font-bold">• Lesi Mukosa</span>}
                        {!r.mukosa.gusiBerdarah && !r.mukosa.lesiMukosaOral && <span className="text-slate-400 font-medium">Sehat</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      {r.tindakLanjut.perluDirujuk ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100/40 border border-rose-200/20 px-2.5 py-1 rounded-full">
                          Rujuk ({r.tindakLanjut.dirujukKe.toUpperCase().replace('_', ' ')})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/40 border border-emerald-200/20 px-2.5 py-1 rounded-full">
                          Perawatan Mandiri
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedRespondent(r)}
                          className="p-1.5 bg-white/50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-white/50 rounded-xl transition-all hover:scale-105 cursor-pointer"
                          title="Lihat Detail Pemeriksaan"
                          id={`btn-view-${r.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isReadOnly && (
                          <>
                            <button
                              onClick={() => setEditingRespondent(JSON.parse(JSON.stringify(r)))}
                              className="p-1.5 bg-white/50 hover:bg-amber-600 text-amber-600 hover:text-white border border-white/50 rounded-xl transition-all hover:scale-105 cursor-pointer"
                              title="Edit Data Responden"
                              id={`btn-edit-${r.id}`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id, r.nama)}
                              className="p-1.5 bg-white/50 hover:bg-rose-600 text-rose-600 hover:text-white border border-white/50 rounded-xl transition-all hover:scale-105 cursor-pointer"
                              title="Hapus Responden"
                              id={`btn-delete-${r.id || 'item'}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-white/20 border-t border-white/25 px-4 py-3.5 flex items-center justify-between" id="pagination-controls">
            <span className="text-xs text-slate-600 font-semibold">
              Menampilkan <strong>{startIndex + 1}</strong> - <strong>{Math.min(startIndex + itemsPerPage, filtered.length)}</strong> dari <strong>{filtered.length}</strong> responden
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 bg-white/50 border border-white/60 rounded-xl text-slate-700 hover:bg-white/90 disabled:opacity-30 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-indigo-950 px-2 font-mono">Halaman {currentPage} / {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 bg-white/50 border border-white/60 rounded-xl text-slate-700 hover:bg-white/90 disabled:opacity-30 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Detail Modal (Dental Record Map) */}
      {selectedRespondent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn" id="respondent-detail-modal">
          <div className="glass-panel-heavy rounded-3xl border border-white/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-scaleIn">
            
            {/* Modal Header */}
            <div className="bg-indigo-950/90 backdrop-blur-md text-white px-6 py-4.5 rounded-t-3xl flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-300 shadow-inner">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{selectedRespondent.nama}</h3>
                  <p className="text-[10px] text-indigo-200 font-extrabold font-mono tracking-wide">NIK: {selectedRespondent.nik || '-'} | Umur: {selectedRespondent.umurLengkap || (selectedRespondent.tanggalLahir ? calculateDetailedAge(selectedRespondent.tanggalLahir, selectedRespondent.tanggalInput).formatted : `${selectedRespondent.umur} Tahun`)} | Gender: {selectedRespondent.jenisKelamin}{selectedRespondent.pemeriksa ? ` | Pemeriksa: ${selectedRespondent.pemeriksa}` : ''}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRespondent(null)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition text-indigo-200 cursor-pointer"
                id="btn-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-sm text-slate-700">
              
              {/* Characteristics Summary */}
              <div className="grid grid-cols-3 gap-3 bg-white/40 p-4 rounded-2xl border border-white/50 shadow-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tgl Periksa</span>
                  <span className="text-xs font-black text-indigo-950 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                    {selectedRespondent.tanggalInput || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Pendidikan</span>
                  <span className="text-xs font-bold text-indigo-950">{selectedRespondent.pendidikan || 'Tidak Sekolah'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Pekerjaan</span>
                  <span className="text-xs font-bold text-indigo-950">{selectedRespondent.pekerjaan || 'Tidak Bekerja'}</span>
                </div>
              </div>

              {/* AI Plaque & Debris Analysis Result Card (If present) */}
              {(selectedRespondent.aiPlaqueAnalysis || selectedRespondent.ohis?.aiPlaqueAnalysis) && (() => {
                const aiData = selectedRespondent.aiPlaqueAnalysis || selectedRespondent.ohis.aiPlaqueAnalysis;
                if (!aiData) return null;
                return (
                  <div className="p-4 rounded-2xl border border-pink-300 dark:border-pink-800 bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-purple-500/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-pink-200 dark:border-slate-700 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-pink-600" />
                        <span className="text-xs font-black uppercase text-pink-950 dark:text-pink-200">
                          Analisis AI Detektor Plak (PTUPT Kemenkes RI)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {aiData.timestamp}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-pink-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 font-bold block">Persentase Plak</span>
                        <span className="text-base font-black font-mono text-pink-600">{aiData.plaquePercentage.toFixed(1)}%</span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-pink-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 font-bold block">Debris Index (DI-S)</span>
                        <span className="text-base font-black font-mono text-teal-600">Skor {aiData.debrisIndexScore} ({aiData.kategoriKebersihan})</span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-pink-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 font-bold block">Area Plak Terbanyak</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">1/3 Servikal ({aiData.areaDistribution.servikalPct.toFixed(0)}%)</span>
                      </div>
                    </div>

                    {aiData.imageUrl && (
                      <div className="mt-2 text-center">
                        <img
                          src={aiData.imageUrl}
                          alt="Foto Segmentasi Plak"
                          className="max-h-44 mx-auto rounded-xl border border-pink-300 dark:border-pink-800 shadow-sm object-cover"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Comparative Tooth Chart Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Primary Teeth */}
                <div className="border border-emerald-200/30 bg-emerald-50/20 p-4.5 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex justify-between items-center border-b border-emerald-200/20 pb-2">
                    <span className="font-extrabold text-emerald-900 text-xs uppercase tracking-wider">I. Gigi Sulung (Deciduous)</span>
                    <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200/20">def-t: {selectedRespondent.deft}</span>
                  </div>
                  <div className="space-y-2 text-xs font-medium">
                    <div className="flex justify-between text-slate-600">
                      <span>Sehat</span>
                      <strong className="font-mono text-slate-900 font-black">{selectedRespondent.gigiSulung.sehat}</strong>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Berlubang / Karies (d)</span>
                      <strong className="font-mono font-black">{selectedRespondent.gigiSulung.karies}</strong>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>Dicabut karies (e)</span>
                      <strong className="font-mono font-black">{selectedRespondent.gigiSulung.dicabutKaries}</strong>
                    </div>
                    <div className="flex justify-between text-indigo-600">
                      <span>Tumpatan tanpa karies (f)</span>
                      <strong className="font-mono font-black">{selectedRespondent.gigiSulung.tumpatanTanpaKaries}</strong>
                    </div>
                    {selectedRespondent.gigiSulung.tumpatanKaries > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Tumpatan dgn karies</span>
                        <strong className="font-mono font-black">{selectedRespondent.gigiSulung.tumpatanKaries}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Permanent Teeth */}
                <div className="border border-indigo-200/30 bg-indigo-50/20 p-4.5 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex justify-between items-center border-b border-indigo-200/20 pb-2">
                    <span className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider">II. Gigi Tetap (Permanent)</span>
                    <span className="bg-indigo-100 text-indigo-800 font-mono text-[10px] font-black px-2.5 py-0.5 rounded-full border border-indigo-200/20">DMF-T: {selectedRespondent.dmft}</span>
                  </div>
                  <div className="space-y-2 text-xs font-medium">
                    <div className="flex justify-between text-slate-600">
                      <span>Sehat</span>
                      <strong className="font-mono text-slate-900 font-black">{selectedRespondent.gigiTetap.sehat}</strong>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Berlubang / Karies (D)</span>
                      <strong className="font-mono font-black">{selectedRespondent.gigiTetap.karies}</strong>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>Dicabut karies (M)</span>
                      <strong className="font-mono font-black">{selectedRespondent.gigiTetap.dicabutKaries}</strong>
                    </div>
                    <div className="flex justify-between text-indigo-600">
                      <span>Tumpatan tanpa karies (F)</span>
                      <strong className="font-mono font-black">{selectedRespondent.gigiTetap.tumpatanTanpaKaries}</strong>
                    </div>
                    {selectedRespondent.gigiTetap.tumpatanKaries > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Tumpatan dgn karies</span>
                        <strong className="font-mono font-black">{selectedRespondent.gigiTetap.tumpatanKaries}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Odontogram Record (Read-Only) */}
              <div className="border border-white/30 rounded-3xl overflow-hidden shadow-sm">
                <Odontogram 
                  teethStatus={selectedRespondent.teethStatus || {}} 
                  readOnly={true} 
                />
              </div>

              {/* Mukosa Detail & Follow Up Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-white/20 pt-5">
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Kondisi Mukosa Oral</span>
                  <div className="flex flex-col gap-1.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold border ${selectedRespondent.mukosa.gusiBerdarah ? 'text-rose-700 bg-rose-100/40 border-rose-200/20' : 'text-slate-600 bg-white/40 border-white/50'}`}>
                      {selectedRespondent.mukosa.gusiBerdarah ? '● Gusi Berdarah (BOP)' : '○ Gusi Sehat (Tanpa Berdarah)'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold border ${selectedRespondent.mukosa.lesiMukosaOral ? 'text-amber-700 bg-amber-100/40 border-amber-200/20' : 'text-slate-600 bg-white/40 border-white/50'}`}>
                      {selectedRespondent.mukosa.lesiMukosaOral ? '● Ada Lesi Mukosa Oral' : '○ Mukosa Oral Normal'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Rencana Tindak Lanjut</span>
                  <div className="space-y-1.5 text-xs font-semibold">
                    {selectedRespondent.tindakLanjut.perluPerawatanSegera && (
                      <div className="flex items-center gap-2 text-rose-700 bg-rose-100/40 border border-rose-200/20 px-3 py-1.5 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-rose-500" /> Perlu Perawatan Segera
                      </div>
                    )}
                    {selectedRespondent.tindakLanjut.perluPerawatanTidakSegera && (
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-100/40 border border-amber-200/20 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-amber-500" /> Perlu Perawatan Rutin
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl border ${selectedRespondent.tindakLanjut.perluDirujuk ? 'bg-rose-100/20 border-rose-200/20' : 'bg-emerald-100/20 border-emerald-200/20'}`}>
                      <strong className="block text-[9px] uppercase tracking-widest text-slate-400 mb-0.5">Rujukan Faskes</strong>
                      <span className="font-extrabold text-indigo-950 text-xs">
                        {selectedRespondent.tindakLanjut.perluDirujuk 
                          ? `Dirujuk ke ${selectedRespondent.tindakLanjut.dirujukKe.toUpperCase().replace('_', ' ')}` 
                          : 'Tidak memerlukan rujukan lanjutan'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white/30 dark:bg-slate-900/60 backdrop-blur-md px-6 py-4 rounded-b-3xl border-t border-pink-200/40 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = selectedRespondent;
                    setSelectedRespondent(null);
                    setEditingRespondent(JSON.parse(JSON.stringify(target)));
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md shadow-amber-600/10 cursor-pointer transition flex items-center gap-1.5"
                  id="btn-open-edit-from-detail"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Data Ini
                </button>
                <button
                  onClick={() => selectedRespondent.id && handleDelete(selectedRespondent.id, selectedRespondent.nama)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/10 cursor-pointer transition flex items-center gap-1.5"
                  id="btn-delete-from-detail"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Data
                </button>
              </div>
              <button
                onClick={() => setSelectedRespondent(null)}
                className="px-4.5 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-black rounded-xl shadow-md shadow-pink-600/10 cursor-pointer transition"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Respondent Modal */}
      {editingRespondent && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" id="edit-respondent-modal">
          <div className="glass-panel max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-pink-200/50 dark:border-pink-900/50 bg-white/95 dark:bg-slate-900/95 my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-pink-200/50 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded-xl border border-amber-300 dark:border-amber-800">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-slate-100 tracking-tight">Edit Data Responden</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-extrabold">ID: {editingRespondent.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRespondent(null)}
                className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-pink-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 space-y-6 text-xs text-slate-900 dark:text-slate-100">
              {/* 0. Operator / Pemeriksa & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gradient-to-r from-pink-100/70 to-rose-100/70 dark:from-slate-800/80 dark:to-slate-800/60 p-4 rounded-2xl border border-pink-300/60 dark:border-slate-700">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-pink-950 dark:text-pink-200 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-pink-600 dark:text-pink-400" /> Nama Operator / Pemeriksa
                  </label>
                  <input
                    type="text"
                    value={editingRespondent.pemeriksa || ''}
                    onChange={(e) => setEditingRespondent({ ...editingRespondent, pemeriksa: e.target.value })}
                    placeholder="drg. Nama Pemeriksa / Operator"
                    className="w-full px-3 py-2 glass-input rounded-xl text-slate-950 dark:text-slate-100 font-bold focus:outline-none"
                    id="edit-input-pemeriksa"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-pink-950 dark:text-pink-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-pink-600 dark:text-pink-400" /> Tanggal Pemeriksaan
                  </label>
                  <input
                    type="date"
                    value={editingRespondent.tanggalInput || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditingRespondent({ ...editingRespondent, tanggalInput: e.target.value })}
                    className="w-full px-3 py-2 glass-input rounded-xl text-slate-950 dark:text-slate-100 font-bold font-mono focus:outline-none"
                    id="edit-input-tanggal"
                  />
                </div>
              </div>

              {/* 1. Demografi */}
              <div className="space-y-4 bg-pink-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-pink-200/50 dark:border-slate-700/60">
                <h4 className="text-xs font-black uppercase tracking-wider text-pink-950 dark:text-pink-200 flex items-center gap-2">
                  <User className="w-4 h-4" /> 1. Identitas Responden
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Nama Responden</label>
                    <input
                      type="text"
                      value={editingRespondent.nama}
                      onChange={(e) => setEditingRespondent({ ...editingRespondent, nama: e.target.value })}
                      className="w-full px-3 py-2 glass-input rounded-xl text-slate-950 dark:text-slate-100 font-bold focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">NIK (16 Digit)</label>
                    <input
                      type="text"
                      maxLength={16}
                      value={editingRespondent.nik || ''}
                      onChange={(e) => {
                        const cleanNik = e.target.value.replace(/\D/g, '');
                        const updates: Partial<RespondentData> = { nik: cleanNik };
                        if (cleanNik.length === 16) {
                          const extracted = extractDobFromNik(cleanNik);
                          if (extracted) {
                            updates.tanggalLahir = extracted.dobStr;
                            const ref = editingRespondent.tanggalInput || new Date().toISOString().split('T')[0];
                            const detailed = calculateDetailedAge(extracted.dobStr, ref);
                            updates.umurLengkap = detailed.formatted;
                            if (detailed.years >= 0) updates.umur = detailed.years;
                            if (extracted.gender) updates.jenisKelamin = extracted.gender;
                          }
                        }
                        setEditingRespondent({ ...editingRespondent, ...updates });
                      }}
                      placeholder="3201xxxxxxxxxxxx"
                      className="w-full px-3 py-2 glass-input rounded-xl text-slate-950 dark:text-slate-100 font-bold font-mono focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={editingRespondent.tanggalLahir || ''}
                      onChange={(e) => {
                        const dobStr = e.target.value;
                        const ref = editingRespondent.tanggalInput || new Date().toISOString().split('T')[0];
                        const detailed = calculateDetailedAge(dobStr, ref);
                        setEditingRespondent({
                          ...editingRespondent,
                          tanggalLahir: dobStr,
                          umurLengkap: detailed.formatted,
                          umur: detailed.years >= 0 ? detailed.years : editingRespondent.umur
                        });
                      }}
                      className="w-full px-3 py-2 glass-input rounded-xl text-slate-950 dark:text-slate-100 font-bold font-mono focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Umur (Tahun)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={editingRespondent.umur}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setEditingRespondent({
                          ...editingRespondent,
                          umur: val,
                          umurLengkap: editingRespondent.tanggalLahir ? calculateDetailedAge(editingRespondent.tanggalLahir, editingRespondent.tanggalInput).formatted : `${val} tahun`
                        });
                      }}
                      className="w-full px-3 py-2 glass-input rounded-xl text-slate-950 dark:text-slate-100 font-bold focus:outline-none text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
                    <select
                      value={editingRespondent.jenisKelamin}
                      onChange={(e) => setEditingRespondent({ ...editingRespondent, jenisKelamin: e.target.value as 'Laki-laki' | 'Perempuan' })}
                      className="w-full px-3 py-2 glass-input rounded-xl text-slate-950 dark:text-slate-100 font-bold focus:outline-none bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                </div>

                {/* Edit Modal Age Badge */}
                {(editingRespondent.umurLengkap || editingRespondent.tanggalLahir) && (
                  <div className="bg-pink-100/70 dark:bg-slate-800/80 border border-pink-300 dark:border-pink-800 p-2.5 rounded-xl flex items-center gap-2 text-xs">
                    <Cake className="w-4 h-4 text-pink-600 shrink-0" />
                    <span className="font-extrabold text-pink-950 dark:text-pink-200">
                      Umur Otomatis: {editingRespondent.umurLengkap || calculateDetailedAge(editingRespondent.tanggalLahir, editingRespondent.tanggalInput).formatted}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Pendidikan</label>
                    <input
                      type="text"
                      value={editingRespondent.pendidikan || ''}
                      onChange={(e) => setEditingRespondent({ ...editingRespondent, pendidikan: e.target.value })}
                      placeholder="SD, SMP, SMA, S1, dsb."
                      className="w-full px-3 py-2 glass-input rounded-xl text-slate-950 dark:text-slate-100 font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Pekerjaan</label>
                    <input
                      type="text"
                      value={editingRespondent.pekerjaan || ''}
                      onChange={(e) => setEditingRespondent({ ...editingRespondent, pekerjaan: e.target.value })}
                      placeholder="Pelajar, Swasta, Ibu Rumah Tangga, dsb."
                      className="w-full px-3 py-2 glass-input rounded-xl text-slate-950 dark:text-slate-100 font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Gigi Sulung & Gigi Tetap Summary Counts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gigi Sulung */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/40 border border-emerald-200/60 dark:border-slate-700/60 space-y-3">
                  <span className="font-black text-emerald-950 dark:text-emerald-300 text-xs uppercase tracking-wider block">Gigi Sulung (def-t)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">Karies (d)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRespondent.gigiSulung?.karies ?? 0}
                        onChange={(e) => setEditingRespondent({
                          ...editingRespondent,
                          gigiSulung: { ...editingRespondent.gigiSulung, karies: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1.5 glass-input rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">Dicabut (e)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRespondent.gigiSulung?.dicabutKaries ?? 0}
                        onChange={(e) => setEditingRespondent({
                          ...editingRespondent,
                          gigiSulung: { ...editingRespondent.gigiSulung, dicabutKaries: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1.5 glass-input rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">Tumpatan (f)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRespondent.gigiSulung?.tumpatanTanpaKaries ?? 0}
                        onChange={(e) => setEditingRespondent({
                          ...editingRespondent,
                          gigiSulung: { ...editingRespondent.gigiSulung, tumpatanTanpaKaries: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1.5 glass-input rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">Sehat</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRespondent.gigiSulung?.sehat ?? 0}
                        onChange={(e) => setEditingRespondent({
                          ...editingRespondent,
                          gigiSulung: { ...editingRespondent.gigiSulung, sehat: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1.5 glass-input rounded-lg font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Gigi Tetap */}
                <div className="p-4 rounded-2xl bg-pink-50/50 dark:bg-slate-800/40 border border-pink-200/60 dark:border-slate-700/60 space-y-3">
                  <span className="font-black text-pink-950 dark:text-pink-300 text-xs uppercase tracking-wider block">Gigi Tetap (DMF-T)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">Karies (D)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRespondent.gigiTetap?.karies ?? 0}
                        onChange={(e) => setEditingRespondent({
                          ...editingRespondent,
                          gigiTetap: { ...editingRespondent.gigiTetap, karies: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1.5 glass-input rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">Dicabut (M)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRespondent.gigiTetap?.dicabutKaries ?? 0}
                        onChange={(e) => setEditingRespondent({
                          ...editingRespondent,
                          gigiTetap: { ...editingRespondent.gigiTetap, dicabutKaries: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1.5 glass-input rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">Tumpatan (F)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRespondent.gigiTetap?.tumpatanTanpaKaries ?? 0}
                        onChange={(e) => setEditingRespondent({
                          ...editingRespondent,
                          gigiTetap: { ...editingRespondent.gigiTetap, tumpatanTanpaKaries: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1.5 glass-input rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">Sehat</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRespondent.gigiTetap?.sehat ?? 0}
                        onChange={(e) => setEditingRespondent({
                          ...editingRespondent,
                          gigiTetap: { ...editingRespondent.gigiTetap, sehat: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-2 py-1.5 glass-input rounded-lg font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Kondisi Mukosa */}
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-pink-200/50 dark:border-slate-700/60 space-y-3">
                <span className="font-black text-slate-950 dark:text-slate-100 text-xs uppercase tracking-wider block">Kondisi Mukosa Oral</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                    <input
                      type="checkbox"
                      checked={editingRespondent.mukosa?.gusiBerdarah ?? false}
                      onChange={(e) => setEditingRespondent({
                        ...editingRespondent,
                        mukosa: { ...editingRespondent.mukosa, gusiBerdarah: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Gusi Berdarah (BOP)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                    <input
                      type="checkbox"
                      checked={editingRespondent.mukosa?.lesiMukosaOral ?? false}
                      onChange={(e) => setEditingRespondent({
                        ...editingRespondent,
                        mukosa: { ...editingRespondent.mukosa, lesiMukosaOral: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Lesi Mukosa Oral</span>
                  </label>
                </div>
              </div>

              {/* 4. Tindak Lanjut & Rujukan */}
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-pink-200/50 dark:border-slate-700/60 space-y-3">
                <span className="font-black text-slate-950 dark:text-slate-100 text-xs uppercase tracking-wider block">Tindak Lanjut & Rujukan</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                      <input
                        type="checkbox"
                        checked={editingRespondent.tindakLanjut?.perluPerawatanSegera ?? false}
                        onChange={(e) => setEditingRespondent({
                          ...editingRespondent,
                          tindakLanjut: { ...editingRespondent.tindakLanjut, perluPerawatanSegera: e.target.checked }
                        })}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span>Perlu Perawatan Segera</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                      <input
                        type="checkbox"
                        checked={editingRespondent.tindakLanjut?.perluPerawatanTidakSegera ?? false}
                        onChange={(e) => setEditingRespondent({
                          ...editingRespondent,
                          tindakLanjut: { ...editingRespondent.tindakLanjut, perluPerawatanTidakSegera: e.target.checked }
                        })}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Perlu Perawatan Rutin</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Status Rujukan Faskes</label>
                    <select
                      value={editingRespondent.tindakLanjut?.dirujukKe ?? 'tidak_dirujuk'}
                      onChange={(e) => {
                        const dirujukVal = e.target.value as 'puskesmas' | 'rs_umum' | 'spesialis' | 'tidak_dirujuk';
                        setEditingRespondent({
                          ...editingRespondent,
                          tindakLanjut: {
                            ...editingRespondent.tindakLanjut,
                            dirujukKe: dirujukVal,
                            perluDirujuk: dirujukVal !== 'tidak_dirujuk'
                          }
                        });
                      }}
                      className="w-full px-3 py-2 glass-input rounded-xl text-slate-950 dark:text-slate-100 font-bold focus:outline-none bg-white dark:bg-slate-800"
                    >
                      <option value="tidak_dirujuk">Tidak Dirujuk (Perawatan Mandiri)</option>
                      <option value="puskesmas">Puskesmas / Klinik Utama</option>
                      <option value="rs_umum">Rumah Sakit Umum (RSU)</option>
                      <option value="spesialis">Dokter Gigi Spesialis</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-pink-200/50 dark:border-slate-800 flex justify-between items-center gap-3 bg-white/90 dark:bg-slate-900/90 rounded-b-3xl">
              <button
                type="button"
                onClick={() => editingRespondent.id && handleDelete(editingRespondent.id, editingRespondent.nama)}
                className="px-4 py-2.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-rose-300 dark:border-rose-800"
                id="btn-delete-from-edit"
              >
                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Hapus Responden Ini
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRespondent(null)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                onClick={async () => {
                  if (!editingRespondent || !editingRespondent.id) return;
                  
                  // Recalculate deft and dmft
                  const newDeft = (editingRespondent.gigiSulung?.karies || 0) +
                                  (editingRespondent.gigiSulung?.dicabutKaries || 0) +
                                  (editingRespondent.gigiSulung?.tumpatanTanpaKaries || 0) +
                                  (editingRespondent.gigiSulung?.tumpatanKaries || 0);
                  
                  const newDmft = (editingRespondent.gigiTetap?.karies || 0) +
                                  (editingRespondent.gigiTetap?.dicabutKaries || 0) +
                                  (editingRespondent.gigiTetap?.tumpatanTanpaKaries || 0) +
                                  (editingRespondent.gigiTetap?.tumpatanKaries || 0);

                  const updatedPayload: Partial<RespondentData> = {
                    ...editingRespondent,
                    deft: newDeft,
                    dmft: newDmft,
                    tindakLanjut: {
                      ...editingRespondent.tindakLanjut,
                      perluDirujuk: editingRespondent.tindakLanjut.dirujukKe !== 'tidak_dirujuk'
                    }
                  };

                  if (onUpdateRespondent) {
                    await onUpdateRespondent(editingRespondent.id, updatedPayload);
                  }
                  setEditingRespondent(null);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-pink-600/20 cursor-pointer transition flex items-center gap-2"
                id="btn-save-edit-respondent"
              >
                <Save className="w-4 h-4" /> Simpan Perubahan
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Deletion Confirmation Modal Overlay */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn" id="delete-confirmation-modal">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Konfirmasi Hapus Data</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
              {deleteTarget.type === 'single' && (
                <p>
                  Apakah Anda yakin ingin menghapus data responden <strong className="font-black text-rose-700 dark:text-rose-300">"{deleteTarget.name}"</strong>? Data ini akan terhapus secara permanen.
                </p>
              )}
              {deleteTarget.type === 'bulk' && (
                <p>
                  Apakah Anda yakin ingin menghapus <strong className="font-black text-rose-700 dark:text-rose-300">{deleteTarget.ids.length} data responden</strong> yang dipilih sekaligus?
                </p>
              )}
              {deleteTarget.type === 'all' && (
                <p>
                  <strong className="text-rose-600 font-black">PERINGATAN!</strong> Anda akan menghapus <strong className="font-black text-rose-700 dark:text-rose-300">SELURUH ({deleteTarget.count}) data responden</strong> pada sesi ini.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                id="btn-cancel-delete"
              >
                Batal
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDeleteAction}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-600/20 transition cursor-pointer flex items-center gap-2"
                id="btn-confirm-delete-now"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SPSS Import Guide Modal */}
      {showSpssGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn" id="spss-guide-modal">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-200 dark:border-indigo-900 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-indigo-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 font-display">Panduan Impor Master Data ke IBM SPSS Statistics</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">Format Excel Pre-Coded Siap Analisis Uji Bivariat/Multivariat</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSpssGuideModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                <p className="font-extrabold text-indigo-900 dark:text-indigo-200 mb-1">💡 Ringkasan Struktur Dataset SPSS (.xlsx):</p>
                <ul className="list-disc list-inside space-y-1 text-indigo-800 dark:text-indigo-300">
                  <li><strong>Sheet 1 (SPSS_Raw_Data):</strong> Berisi seluruh data numerik responden (150 sampel) yang telah dikodekan secara kuantitatif (1=Laki-laki, 2=Perempuan, 1-5 Kelompok Umur, d-e-f, D-M-F, OHI-S, DI-S, CI-S, karies, pendarahan gusi, rujukan).</li>
                  <li><strong>Sheet 2 (SPSS_Variable_View):</strong> Kamus data variabel lengkap (Keterangan Nama, Tipe, Lebar, Desimal, Label, dan Koding Value).</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <span>📌 Langkah Impor ke IBM SPSS Statistics:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <li>Buka aplikasi <strong>IBM SPSS Statistics</strong> di komputer Anda.</li>
                  <li>Klik menu <strong>File &gt; Open &gt; Data...</strong></li>
                  <li>Pada dropdown <i>Files of type</i>, pilih <strong>Excel (*.xls, *.xlsx)</strong>.</li>
                  <li>Pilih file <strong>Dataset_SPSS_Kesehatan_Gigi_...xlsx</strong> yang baru saja Anda unduh.</li>
                  <li>Pada dialog <i>Read Excel File</i>:
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                      <li>Pilih WorkSheet: <strong>SPSS_Raw_Data</strong></li>
                      <li>Centang pilihan <strong>"Read variable names from the first row of data"</strong>.</li>
                      <li>Klik <strong>OK</strong>.</li>
                    </ul>
                  </li>
                  <li>Data 150 responden siap dianalisis dengan uji Chi-Square, Independent T-Test, One-Way ANOVA, atau Regresi Logistik!</li>
                </ol>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    handleExportSPSS();
                    setShowSpssGuideModal(false);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-xl shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Unduh Dataset SPSS (.xlsx) Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
