import React, { useState } from 'react';
import { Users, Plus, Key, Copy, Check, Info, Database, Trash2, Wifi, Eye } from 'lucide-react';
import { RespondentData } from '../types';
import { generateMockRespondents } from '../lib/surveyEngine';

interface SessionManagerProps {
  currentSessionId: string;
  currentSessionName: string;
  sessionPasscode: string;
  onJoinSession: (id: string, name: string, passcode: string) => void;
  onLoadMockData: (mockData: RespondentData[]) => void;
  onClearSessionData: () => void;
  respondentsCount: number;
  isReadOnly?: boolean;
}

export default function SessionManager({
  currentSessionId,
  currentSessionName,
  sessionPasscode,
  onJoinSession,
  onLoadMockData,
  onClearSessionData,
  respondentsCount,
  isReadOnly = false
}: SessionManagerProps) {
  const [newSessionName, setNewSessionName] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  
  const [joinId, setJoinId] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    
    // Generate clean ID from name + random suffix
    const cleanId = newSessionName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
    const passcode = newPasscode.trim() || '123456';
    
    onJoinSession(cleanId, newSessionName.trim(), passcode);
    setSuccessMsg(`Sesi "${newSessionName}" berhasil dibuat!`);
    setNewSessionName('');
    setNewPasscode('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    
    // Look up or just join direct
    const passcode = joinPasscode.trim() || '123456';
    // Split to extract readable name
    const parts = joinId.trim().split('-');
    const name = parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || 'Sesi Kustom';
    
    onJoinSession(joinId.trim(), name, passcode);
    setSuccessMsg(`Berhasil bergabung dengan Sesi: ${joinId}`);
    setJoinId('');
    setJoinPasscode('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const copySessionInfo = () => {
    const text = `Sesi Survey: ${currentSessionName}\nID Sesi: ${currentSessionId}\nPasscode: ${sessionPasscode}\nBuka aplikasi ini dan gabung dengan kode di atas untuk sinkronisasi real-time!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadMock = () => {
    const mock = generateMockRespondents();
    onLoadMockData(mock);
    setSuccessMsg('100 Data survey simulasi (25 Anak, 25 Remaja, 25 Dewasa, 25 Lansia) berhasil diunggah ke Cloud!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2" id="session-manager-root">
      {/* Active Session Card */}
      <div className="glass-panel-dark text-slate-100 rounded-3xl shadow-xl p-6 border border-white/10" id="active-session-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
              </span>
              <span className="text-xs font-mono text-emerald-300 font-bold uppercase tracking-widest flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" /> Terhubung ke Cloud Firestore (Real-Time)
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white font-display">{currentSessionName}</h2>
            <p className="text-slate-400 text-xs font-mono">ID Sesi: {currentSessionId}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={copySessionInfo}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl transition-all border border-white/10 shadow-xs cursor-pointer"
              title="Salin Info Sesi"
              id="btn-copy-session"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-300" />}
              {copied ? 'Tersalin!' : 'Bagikan Info Sesi'}
            </button>

            {!isReadOnly && (
              <>
                <button
                  onClick={handleLoadMock}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-900/30 hover:scale-[1.02] cursor-pointer"
                  id="btn-load-mock"
                >
                  <Database className="w-4 h-4 text-indigo-200" />
                  Muat Data Simulasi
                </button>

                {respondentsCount > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Hapus seluruh data responden dalam sesi ini dari cloud? Tindakan ini tidak dapat dibatalkan.')) {
                        onClearSessionData();
                      }
                    }}
                    className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold py-2.5 px-3.5 rounded-xl transition-all border border-rose-500/20 cursor-pointer"
                    id="btn-clear-session"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus Semua Data
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
          <div className="bg-slate-950/30 p-4.5 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-1 uppercase tracking-widest font-bold">Total Responden Sesi Ini</span>
            <span className="text-3xl font-black text-white font-mono">{respondentsCount}</span>
            <span className="text-[10px] text-slate-400 block mt-1 font-semibold">Orang terdata di cloud</span>
          </div>
          
          <div className="bg-slate-950/30 p-4.5 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-1 uppercase tracking-widest font-bold">Passcode Sinkronisasi</span>
            <span className="text-2xl font-black text-indigo-300 font-mono flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-indigo-400" /> {sessionPasscode}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1 font-semibold">Digunakan untuk verifikasi</span>
          </div>

          <div className="bg-slate-950/30 p-4.5 rounded-2xl border border-white/5 flex items-start gap-2.5">
            <Info className="w-4.5 h-4.5 text-indigo-300 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed font-medium">
              <strong className="text-white font-extrabold">Akses Kolaboratif:</strong> Berikan <strong className="text-indigo-200">ID Sesi</strong> dan <strong className="text-indigo-200">Passcode</strong> kepada rekan sejawat Anda. Mereka dapat mengisi data di ponsel/tablet masing-masing secara bersamaan!
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 rounded-xl text-xs font-bold shadow-xs animate-fadeIn" id="session-success-alert">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/25 text-rose-200 rounded-xl text-xs font-bold shadow-xs animate-fadeIn" id="session-error-alert">
          {errorMsg}
        </div>
      )}

      {/* Forms to Join / Create */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Session Card */}
        <div className="glass-panel p-6 rounded-3xl shadow-md border border-pink-200/50 dark:border-pink-900/40" id="create-session-form-container">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 rounded-2xl border border-pink-200 dark:border-pink-800 shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-pink-950 dark:text-pink-100 tracking-tight">Buat Sesi Survey Baru</h3>
              <p className="text-xs text-slate-800 dark:text-slate-300 font-bold">Mulai survey kesehatan baru di cloud</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 mb-1.5 uppercase tracking-widest">Nama Sesi Survey</label>
              <input
                type="text"
                placeholder="Contoh: Survey Gigi Puskesmas Depok"
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm focus:outline-none transition-all placeholder-slate-500 font-bold"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 mb-1.5 uppercase tracking-widest">Passcode Pengaman (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: 123456"
                value={newPasscode}
                onChange={e => setNewPasscode(e.target.value)}
                className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm focus:outline-none transition-all placeholder-slate-500 font-bold"
              />
              <span className="text-[10px] text-slate-700 dark:text-slate-400 mt-1.5 block font-bold leading-relaxed">Rekan Anda perlu memasukkan passcode ini untuk bergabung. Default: 123456</span>
            </div>

            <button
              type="submit"
              className="w-full bg-pink-950 hover:bg-pink-900 text-white font-black text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-pink-950/10 flex items-center justify-center gap-2 mt-4 cursor-pointer uppercase tracking-widest"
              id="btn-submit-create-session"
            >
              <Plus className="w-4 h-4" /> Buat Sesi Baru
            </button>
          </form>
        </div>

        {/* Join Session Card */}
        <div className="glass-panel p-6 rounded-3xl shadow-md border border-pink-200/50 dark:border-pink-900/40" id="join-session-form-container">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 rounded-2xl border border-pink-200 dark:border-pink-800 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-pink-950 dark:text-pink-100 tracking-tight">Gabung Sesi Survey Cloud</h3>
              <p className="text-xs text-slate-800 dark:text-slate-300 font-bold">Hubungkan perangkat ini ke sesi rekan Anda</p>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 mb-1.5 uppercase tracking-widest">ID Sesi Survey</label>
              <input
                type="text"
                placeholder="Contoh: stan-pemeriksaan-gigi-30-oktober-2025-1234"
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm focus:outline-none transition-all placeholder-slate-500 font-bold"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 mb-1.5 uppercase tracking-widest">Passcode Sesi</label>
              <input
                type="password"
                placeholder="Masukkan passcode"
                value={joinPasscode}
                onChange={e => setJoinPasscode(e.target.value)}
                className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm focus:outline-none transition-all placeholder-slate-500 font-bold"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-black text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-pink-600/10 flex items-center justify-center gap-2 mt-4 cursor-pointer uppercase tracking-widest"
              id="btn-submit-join-session"
            >
              <Users className="w-4 h-4" /> Gabung Sesi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
