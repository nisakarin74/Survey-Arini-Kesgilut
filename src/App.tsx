import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileDown, 
  TrendingUp, 
  Calculator,
  PlusCircle, 
  TableProperties, 
  CloudSun, 
  Sparkles,
  Award,
  Users,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  ScanLine
} from 'lucide-react';
import { collection, doc, addDoc, onSnapshot, query, deleteDoc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { RespondentData, AIPlaqueAnalysisResult } from './types';
import { exportToExcel, exportToPdf, generateMockRespondents, ensureOHISForRespondent, exportQuantitativeSPSS } from './lib/surveyEngine';

// Subcomponents
import Dashboard from './components/Dashboard';
import QuantitativeAnalysis from './components/QuantitativeAnalysis';
import DentalForm from './components/DentalForm';
import RespondentsList from './components/RespondentsList';
import SessionManager from './components/SessionManager';
import LoginForm from './components/LoginForm';
import AIPlaqueDetector from './components/AIPlaqueDetector';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quantitative' | 'input' | 'ai-detector' | 'data' | 'cloud'>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Login Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('surveyAriniLoggedIn') === 'true';
    }
    return false;
  });

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    sessionStorage.setItem('surveyAriniLoggedIn', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('surveyAriniLoggedIn');
  };
  
  // Dark / Light Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dentaSyncTheme');
      return saved ? saved === 'dark' : false;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('dentaSyncTheme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  // Session Configuration
  const [currentSessionId, setCurrentSessionId] = useState('stan-pemeriksaan-gigi-arini-periode-juli-2026');
  const [currentSessionName, setCurrentSessionName] = useState('Stan Pemeriksaan Gigi Arini Periode Juli 2026');
  const [sessionPasscode, setSessionPasscode] = useState('123456');
  
  const [respondents, setRespondents] = useState<RespondentData[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync to Cloud Firestore when Session ID changes
  useEffect(() => {
    setLoading(true);
    const path = `sessions/${currentSessionId}/respondents`;
    const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
    const q = query(colRef);

    // Setup real-time listener
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: RespondentData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push(ensureOHISForRespondent({
          id: doc.id,
          ...data,
        } as RespondentData));
      });
      
      if (snapshot.empty || list.length === 0) {
        // Auto-seed with 150 fixed respondents
        console.log("Mendeteksi data cloud kosong, menginisialisasi 150 data responden tetap...");
        const default150 = generateMockRespondents();
        setRespondents(default150);
        
        try {
          const batch = writeBatch(db);
          default150.forEach((item) => {
            const docRef = doc(db, 'sessions', currentSessionId, 'respondents', item.id);
            const { id, ...payload } = item;
            batch.set(docRef, sanitizePayload(payload));
          });
          await batch.commit();
        } catch (err) {
          console.error("Gagal menyimpan 150 data tetap ke Cloud, tetap menggunakan versi lokal:", err);
        }
      } else {
        setRespondents(list);
      }
      setLoading(false);
    }, (error) => {
      console.error("Gagal mendengarkan data dari cloud, menggunakan 150 data tetap lokal:", error);
      setRespondents(generateMockRespondents());
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentSessionId]);

  // Helper to remove any undefined properties from objects before sending to Firestore
  const sanitizePayload = <T,>(obj: T): T => {
    if (!obj || typeof obj !== 'object') return obj;
    return JSON.parse(JSON.stringify(obj));
  };

  // Cloud Actions
  const handleSaveRespondent = async (data: Omit<RespondentData, 'id' | 'createdAt' | 'createdBy'>) => {
    const path = `sessions/${currentSessionId}/respondents`;
    try {
      const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
      const cleanData = sanitizePayload(data);
      const now = new Date().toISOString();
      const docRef = await addDoc(colRef, {
        ...cleanData,
        createdAt: now,
        createdBy: 'derumarahlaut@gmail.com' // Current active user email as auditor
      });
      
      // Optimistically add to state
      const newItem: RespondentData = {
        id: docRef.id,
        ...data,
        createdAt: now,
        createdBy: 'derumarahlaut@gmail.com'
      };
      setRespondents(prev => [newItem, ...prev.filter(r => r.id !== docRef.id)]);
    } catch (err) {
      console.error("Gagal menyimpan responden:", err);
      // Fallback local addition if cloud fails
      const fallbackItem: RespondentData = {
        id: `local-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        createdBy: 'derumarahlaut@gmail.com'
      };
      setRespondents(prev => [fallbackItem, ...prev]);
    }
  };

  const handleDeleteRespondent = async (id: string) => {
    if (!id) return;
    
    // Optimistically update local state immediately so item is removed from view
    setRespondents(prev => prev.filter(r => r.id !== id));

    // Try deleting from cloud if not a purely local ID
    if (!id.startsWith('local-')) {
      const path = `sessions/${currentSessionId}/respondents/${id}`;
      try {
        const docRef = doc(db, 'sessions', currentSessionId, 'respondents', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.error("Gagal menghapus responden dari Cloud:", err);
      }
    }
  };

  const handleUpdateRespondent = async (id: string, updatedData: Partial<RespondentData>) => {
    if (!id) return;

    // Optimistically update local state
    setRespondents(prev => prev.map(r => r.id === id ? { ...r, ...updatedData } : r));

    if (!id.startsWith('local-')) {
      const path = `sessions/${currentSessionId}/respondents/${id}`;
      try {
        const docRef = doc(db, 'sessions', currentSessionId, 'respondents', id);
        const cleanData = sanitizePayload(updatedData);
        await updateDoc(docRef, {
          ...cleanData,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Gagal memperbarui data responden di Cloud:", err);
      }
    }
  };

  const handleLoadMockData = async (mockData: RespondentData[]) => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
      
      const loadedList: RespondentData[] = [];
      mockData.forEach((item) => {
        const docRef = item.id 
          ? doc(db, 'sessions', currentSessionId, 'respondents', item.id)
          : doc(colRef);
        const { id, ...payload } = item;
        const cleanData = sanitizePayload(payload);
        const record = {
          ...cleanData,
          createdAt: item.createdAt || new Date().toISOString()
        };
        batch.set(docRef, record);
        loadedList.push({
          id: docRef.id,
          ...record
        } as RespondentData);
      });
      
      await batch.commit();
      setRespondents(loadedList);
    } catch (err) {
      console.error("Gagal mengunggah data kustom ke Cloud, menggunakan mode lokal:", err);
      const localList = mockData.map((item, idx) => ({
        ...item,
        id: item.id || `resp-who-150-${String(idx + 1).padStart(3, '0')}`
      }));
      setRespondents(localList);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSessionData = async () => {
    setLoading(true);
    try {
      const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
      const qSnapshot = await getDocs(colRef);
      
      const batch = writeBatch(db);
      qSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (err) {
      console.error("Gagal membersihkan data:", err);
      alert("Gagal mengosongkan data.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (id: string, name: string, passcode: string) => {
    setCurrentSessionId(id);
    setCurrentSessionName(name);
    setSessionPasscode(passcode);
    setActiveTab('dashboard');
  };

  // Trigger Exports
  const triggerPdfExport = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke PDF!");
      return;
    }
    exportToPdf(respondents, currentSessionName);
  };

  const triggerExcelExport = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke Excel!");
      return;
    }
    exportToExcel(respondents, currentSessionName);
  };

  const triggerSpssExport = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke SPSS!");
      return;
    }
    exportQuantitativeSPSS(respondents, currentSessionName);
  };

  if (!isLoggedIn) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${isDarkMode ? 'dark text-slate-100' : 'text-slate-900'}`} id="app-root">
      
      {/* Top Banner & Title Bar */}
      <header className="glass-panel border-b border-pink-200/40 dark:border-pink-900/40 sticky top-0 z-40 shadow-lg shadow-pink-950/5 backdrop-blur-xl" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left Brand Area with 3-line Hamburger Dropdown Menu */}
            <div className="flex items-center gap-3">
              {/* Garis 3 Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-pink-300/60 dark:border-pink-800/60 text-pink-900 dark:text-pink-200 transition-all shadow-xs flex items-center justify-center cursor-pointer hover:scale-[1.03] active:scale-95"
                  title="Menu Dashboard / Navigasi"
                  id="btn-hamburger-menu"
                >
                  {isMenuOpen ? <X className="w-5 h-5 text-pink-600 dark:text-pink-400" /> : <Menu className="w-5 h-5 text-pink-600 dark:text-pink-400" />}
                </button>

                {/* Dropdown Menu Container */}
                {isMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsMenuOpen(false)} 
                    />
                    <div className="absolute left-0 mt-2 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-pink-200 dark:border-pink-800/60 rounded-2xl shadow-2xl z-50 py-2 animate-fadeIn">
                      <div className="px-4 py-2 border-b border-pink-100 dark:border-slate-800 mb-1">
                        <p className="text-[10px] font-extrabold text-pink-700 dark:text-pink-400 uppercase tracking-wider font-mono">Menu Navigasi</p>
                      </div>

                      <button
                        onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors text-left ${activeTab === 'dashboard' ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 font-extrabold border-r-4 border-pink-600' : 'text-slate-800 dark:text-slate-200 hover:bg-pink-50/50 dark:hover:bg-slate-800'}`}
                        id="dropdown-menu-dashboard"
                      >
                        <TrendingUp className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        Analisis Real-Time
                      </button>

                      <button
                        onClick={() => { setActiveTab('quantitative'); setIsMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors text-left ${activeTab === 'quantitative' ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 font-extrabold border-r-4 border-pink-600' : 'text-slate-800 dark:text-slate-200 hover:bg-pink-50/50 dark:hover:bg-slate-800'}`}
                        id="dropdown-menu-quantitative"
                      >
                        <Calculator className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        Analisis Kuantitatif
                      </button>

                      <button
                        onClick={() => { setActiveTab('input'); setIsMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors text-left ${activeTab === 'input' ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 font-extrabold border-r-4 border-pink-600' : 'text-slate-800 dark:text-slate-200 hover:bg-pink-50/50 dark:hover:bg-slate-800'}`}
                        id="dropdown-menu-input"
                      >
                        <PlusCircle className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        Input Pemeriksaan
                      </button>

                      <button
                        onClick={() => { setActiveTab('ai-detector'); setIsMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors text-left ${activeTab === 'ai-detector' ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 font-extrabold border-r-4 border-pink-600' : 'text-slate-800 dark:text-slate-200 hover:bg-pink-50/50 dark:hover:bg-slate-800'}`}
                        id="dropdown-menu-ai-detector"
                      >
                        <ScanLine className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        Scanner AI Plak (CNN)
                      </button>

                      <button
                        onClick={() => { setActiveTab('data'); setIsMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors text-left ${activeTab === 'data' ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 font-extrabold border-r-4 border-pink-600' : 'text-slate-800 dark:text-slate-200 hover:bg-pink-50/50 dark:hover:bg-slate-800'}`}
                        id="dropdown-menu-data"
                      >
                        <TableProperties className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        Data Responden
                      </button>

                      <button
                        onClick={() => { setActiveTab('cloud'); setIsMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors text-left ${activeTab === 'cloud' ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 font-extrabold border-r-4 border-pink-600' : 'text-slate-800 dark:text-slate-200 hover:bg-pink-50/50 dark:hover:bg-slate-800'}`}
                        id="dropdown-menu-cloud"
                      >
                        <CloudSun className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        Koneksi Cloud
                      </button>

                      <div className="border-t border-pink-100 dark:border-slate-800 my-1 pt-1">
                        <button
                          onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                          id="dropdown-menu-logout"
                        >
                          <LogOut className="w-4 h-4" />
                          Keluar / Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
                <FileSpreadsheet className="w-5.5 h-5.5" />
              </div>
              <div>
                <h1 className="text-md sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">Survey Kesehatan Gigi Dan Mulut</h1>
                <p className="text-[11px] text-pink-700 dark:text-pink-300 font-extrabold tracking-wide">By Arini Haerunnisa</p>
              </div>
            </div>

            {/* Right Export / Mode / Status / Logout Area */}
            <div className="flex items-center gap-2">
              
              {/* Dark / Light Mode Toggle Button */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-pink-300/60 dark:border-pink-800/60 text-slate-800 dark:text-slate-200 text-xs font-extrabold rounded-xl shadow-xs transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
                id="btn-theme-toggle"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline font-bold">Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-pink-600" />
                    <span className="hidden sm:inline font-bold">Gelap</span>
                  </>
                )}
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100/80 dark:bg-rose-950/80 hover:bg-rose-200 dark:hover:bg-rose-900/80 border border-rose-300/70 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs font-extrabold rounded-xl shadow-xs transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                title="Keluar dari akun petugas"
                id="btn-header-logout"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span className="hidden sm:inline font-bold">Keluar</span>
              </button>

              {respondents.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={triggerSpssExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-xs transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                    title="Ekspor Dataset Master Data ke Format IBM SPSS (.xlsx)"
                    id="btn-global-export-spss"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-indigo-200" />
                    <span className="hidden lg:inline">Ekspor SPSS (.xlsx)</span>
                  </button>

                  <button
                    onClick={triggerPdfExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl shadow-xs transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                    title="Unduh Laporan PDF Lengkap"
                    id="btn-global-export-pdf"
                  >
                    <FileDown className="w-4 h-4 text-rose-500" />
                    <span className="hidden sm:inline">Ekspor PDF</span>
                  </button>

                  <button
                    onClick={triggerExcelExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-pink-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl shadow-xs transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                    title="Unduh Data Excel Mentah"
                    id="btn-global-export-excel"
                  >
                    <FileDown className="w-4 h-4 text-emerald-500" />
                    <span className="hidden sm:inline">Ekspor Excel</span>
                  </button>
                </div>
              )}

              {/* Connected Cloud Pill */}
              <div className="hidden md:flex items-center gap-1.5 bg-pink-50 dark:bg-pink-950/60 backdrop-blur-md border border-pink-200 dark:border-pink-800/60 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                </span>
                <span className="text-[10px] font-extrabold text-pink-700 dark:text-pink-300 uppercase tracking-widest font-mono">Cloud Synced</span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Active Section Header and Session Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/50 dark:bg-slate-900/60 backdrop-blur-xl border border-pink-200/50 dark:border-pink-900/40 rounded-2xl shadow-sm" id="navigation-bar">
          
          {/* Quick Tab Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30' 
                  : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-pink-50'
              }`}
              id="pill-nav-dashboard"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Real-Time
            </button>

            <button
              onClick={() => setActiveTab('quantitative')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'quantitative' 
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30' 
                  : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-pink-50'
              }`}
              id="pill-nav-quantitative"
            >
              <Calculator className="w-3.5 h-3.5 text-pink-300" />
              Analisis Kuantitatif
            </button>

            <button
              onClick={() => setActiveTab('input')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'input' 
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30' 
                  : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-pink-50'
              }`}
              id="pill-nav-input"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Input Form
            </button>

            <button
              onClick={() => setActiveTab('ai-detector')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ai-detector' 
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30' 
                  : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-pink-50'
              }`}
              id="pill-nav-ai-detector"
            >
              <ScanLine className="w-3.5 h-3.5 text-pink-300" />
              Scanner AI Plak (CNN)
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'data' 
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30' 
                  : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-pink-50'
              }`}
              id="pill-nav-data"
            >
              <TableProperties className="w-3.5 h-3.5" />
              Data ({respondents.length})
            </button>

            <button
              onClick={() => setActiveTab('cloud')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'cloud' 
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30' 
                  : 'bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-pink-50'
              }`}
              id="pill-nav-cloud"
            >
              <CloudSun className="w-3.5 h-3.5" />
              Cloud
            </button>
          </div>

          {/* Current Session Indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-pink-50/70 dark:bg-pink-950/40 backdrop-blur-md border border-pink-200/60 dark:border-pink-800/50 rounded-xl shadow-xs">
            <Users className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-[200px]" title={currentSessionName}>
              Sesi: <strong className="font-extrabold text-pink-700 dark:text-pink-300">{currentSessionName}</strong>
            </span>
          </div>

        </div>

        {/* Loading Overlay */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/60 backdrop-blur-xl border border-pink-200 dark:border-pink-900/40 rounded-3xl shadow-lg" id="loader-view">
            <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
            <p className="text-slate-800 dark:text-slate-200 text-sm mt-4 font-bold">Sinkronisasi data dengan Firestore Cloud...</p>
          </div>
        ) : (
          <div className="animate-fadeIn" id="tab-content-area">
            {/* Tab Rendering */}
            {activeTab === 'dashboard' && (
              <Dashboard respondents={respondents} />
            )}

            {activeTab === 'quantitative' && (
              <QuantitativeAnalysis respondents={respondents} sessionName={currentSessionName} />
            )}

            {activeTab === 'input' && (
              <DentalForm 
                onSaveRespondent={handleSaveRespondent} 
                nextRespondentNumber={respondents.length + 1} 
              />
            )}

            {activeTab === 'ai-detector' && (
              <div className="space-y-6 animate-fadeIn">
                <AIPlaqueDetector 
                  onApplyToOHIS={(aiResult) => {
                    // Navigate to input form with a friendly alert
                    setActiveTab('input');
                  }}
                />
              </div>
            )}

            {activeTab === 'data' && (
              <RespondentsList 
                respondents={respondents} 
                onDeleteRespondent={handleDeleteRespondent} 
                onUpdateRespondent={handleUpdateRespondent}
                sessionName={currentSessionName}
              />
            )}

            {activeTab === 'cloud' && (
              <SessionManager
                currentSessionId={currentSessionId}
                currentSessionName={currentSessionName}
                sessionPasscode={sessionPasscode}
                onJoinSession={handleJoinSession}
                onLoadMockData={handleLoadMockData}
                onClearSessionData={handleClearSessionData}
                respondentsCount={respondents.length}
              />
            )}
          </div>
        )}

      </main>

      {/* Mini App Footer */}
      <footer className="text-center py-8 text-xs text-slate-600 dark:text-slate-400 font-bold" id="app-footer">
        <p>Survey Kesehatan Gigi Dan Mulut • By Arini Haerunnisa • Sinkronisasi Cloud Firestore</p>
      </footer>

    </div>
  );
}

