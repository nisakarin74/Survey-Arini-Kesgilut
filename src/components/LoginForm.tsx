import React, { useState, useEffect } from 'react';
import { Lock, User, KeyRound, ShieldCheck, RefreshCw, LogIn, Sparkles, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
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

    // Validate Username & Password
    const trimmedUser = username.trim();
    if (trimmedUser !== 'Survey Arini') {
      setErrorMsg('Username salah! Gunakan "Survey Arini".');
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

    // Success
    onLoginSuccess();
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
            Aplikasi Pemeriksaan & Rekap Data Dental
          </p>
        </div>

        {/* Card Form */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-pink-200/80 dark:border-pink-900/50 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between border-b border-pink-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
              <Lock className="w-5 h-5 text-pink-600 dark:text-pink-400" /> Sign In Petugas
            </h2>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-pink-100 dark:bg-pink-950/80 text-pink-800 dark:text-pink-200 border border-pink-200 dark:border-pink-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-pink-600" /> Akses Terproteksi
            </span>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

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
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Contoh: Survey Arini</p>
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
              <LogIn className="w-4 h-4" /> Masuk Aplikasi
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Pertanyaan & Bantuan: Hubungi Administrator Survey Arini
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
