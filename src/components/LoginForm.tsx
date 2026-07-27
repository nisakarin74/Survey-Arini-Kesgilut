import React, { useState, useEffect } from 'react';
import { Lock, User, KeyRound, ShieldCheck, RefreshCw, LogIn, Sparkles, AlertCircle, Eye, ShieldAlert } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (role: 'admin' | 'viewer') => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [activeTab, setActiveTab] = useState<'admin' | 'viewer'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  
  // Captcha Numbers
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 12) + 1;
    const n2 = Math.floor(Math.random() * 12) + 1;
    setNum1(n1);
    setNum2(n2);
    setCaptchaInput('');
    setErrorMsg('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim();
    const lowerUser = trimmedUser.toLowerCase();

    // Direct check for Viewer login credentials
    if (lowerUser === 'pelihat' || lowerUser === 'viewer' || lowerUser === 'pelihat saja') {
      if (password !== 'Pelihat123' && password !== 'Arini123' && password !== '123456' && password !== 'pelihat') {
        setErrorMsg('Password Pelihat salah! Gunakan "Pelihat123".');
        generateCaptcha();
        return;
      }
      onLoginSuccess('viewer');
      return;
    }

    // Validate Petugas / Admin Username & Password
    if (trimmedUser !== 'Survey Arini') {
      setErrorMsg('Username salah! Gunakan "Survey Arini" untuk Petugas atau "Pelihat" untuk Viewer.');
      generateCaptcha();
      return;
    }

    if (password !== 'Arini123') {
      setErrorMsg('Password salah! Silakan periksa kembali password Anda.');
      generateCaptcha();
      return;
    }

    // Validate CAPTCHA
    const expectedSum = num1 + num2;
    const userSum = parseInt(captchaInput.trim(), 10);

    if (isNaN(userSum) || userSum !== expectedSum) {
      setErrorMsg(`Jawaban CAPTCHA penjumlahan (${num1} + ${num2}) salah!`);
      generateCaptcha();
      return;
    }

    // Success Petugas
    onLoginSuccess('admin');
  };

  const handleQuickViewerLogin = () => {
    onLoginSuccess('viewer');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-rose-50 to-purple-100 dark:from-slate-950 dark:via-slate-900 dark:to-pink-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-600 to-rose-400 text-white shadow-xl shadow-pink-500/30 transform hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Survey Kesehatan Gigi
          </h1>
          <p className="text-xs font-bold text-pink-700 dark:text-pink-300 uppercase tracking-widest">
            Aplikasi Pemeriksaan &amp; Rekap Data Dental
          </p>
        </div>

        {/* Card Form */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-pink-200/80 dark:border-pink-900/50 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl space-y-5">
          
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-pink-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { setActiveTab('admin'); setErrorMsg(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-sm border border-pink-200 dark:border-pink-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Akses Petugas
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('viewer'); setErrorMsg(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'viewer'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-200 dark:border-amber-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="w-4 h-4" /> Pelihat Saja
            </button>
          </div>

          <div className="flex items-center justify-between border-b border-pink-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-black flex items-center gap-2 text-slate-900 dark:text-white">
              {activeTab === 'admin' ? (
                <>
                  <Lock className="w-4 h-4 text-pink-600 dark:text-pink-400" /> Login Petugas (Akses Penuh)
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Sesi Pelihat Saja (Read-Only)
                </>
              )}
            </h2>
            {activeTab === 'admin' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-100 dark:bg-pink-950/80 text-pink-800 dark:text-pink-200 border border-pink-200 dark:border-pink-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-pink-600" /> Full Access
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Eye className="w-3 h-3 text-amber-600" /> Read-Only
              </span>
            )}
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'viewer' ? (
            /* Viewer Info and Direct Login */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-slate-800 dark:text-slate-200 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-300 uppercase tracking-wide text-[11px]">
                  <Eye className="w-4 h-4 text-amber-600 shrink-0" />
                  Sesi Pelihat (Mode Baca Sahaja)
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Sesi ini ditujukan untuk pemantau, dosen pembimbing, atau tamu yang ingin melihat rekapitulasi data, grafik real-time, dan analisis kuantitatif bivariat.
                </p>
                <ul className="list-disc list-inside font-bold text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                  <li>Dapat melihat seluruh statistik &amp; data responden</li>
                  <li>Dapat mengunduh laporan PDF &amp; Excel</li>
                  <li><strong className="text-rose-600 dark:text-rose-400">Tidak dapat</strong> menambah, mengedit, atau menghapus data</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleQuickViewerLogin}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                id="btn-login-as-viewer"
              >
                <Eye className="w-4 h-4" /> Masuk Sebagai Pelihat Saja
              </button>

              <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
                >
                  Atau Login dengan Akun Petugas / Admin &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* Admin Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-pink-600" /> Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full px-4 py-3 pl-10 glass-input rounded-2xl text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none transition-all"
                    id="input-login-username"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Gunakan: <strong>Survey Arini</strong> (Petugas) atau <strong>Pelihat</strong> (Guest)</p>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-pink-600" /> Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full px-4 py-3 pl-10 glass-input rounded-2xl text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none transition-all"
                    id="input-login-password"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Captcha Penjumlahan */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 dark:from-slate-800/80 dark:to-slate-800/50 border border-pink-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-pink-950 dark:text-pink-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-pink-600" /> Verifikasi CAPTCHA
                  </label>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="p-1.5 hover:bg-pink-200/60 dark:hover:bg-slate-700 rounded-lg text-pink-700 dark:text-pink-300 transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                    title="Acak ulang pertanyaaan captcha"
                  >
                    <RefreshCw className="w-3 h-3" /> Ganti
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-pink-300 dark:border-pink-800 font-mono text-base font-black text-pink-900 dark:text-pink-100 shadow-xs tracking-wider shrink-0 select-none">
                    {num1} + {num2} = ?
                  </div>
                  <input
                    type="number"
                    required
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Hasil penjumlahan"
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-900 dark:text-slate-100 font-black font-mono text-sm focus:outline-none"
                    id="input-login-captcha"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 hover:from-pink-700 hover:to-rose-800 text-white font-black text-sm rounded-2xl shadow-lg shadow-pink-500/30 transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-2"
                id="button-submit-login"
              >
                <LogIn className="w-4 h-4" /> Masuk Sebagai Petugas
              </button>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Ingin melihat data saja?</span>
                <button
                  type="button"
                  onClick={handleQuickViewerLogin}
                  className="font-extrabold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Akses Pelihat Saja
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}

