import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Smile, ShieldAlert, HeartPulse, Activity, UserPlus, Sparkles, Mic, MicOff, Volume2, VolumeX, Check, ChevronDown, ChevronUp, AlertCircle, UserCheck, Calendar, Cake } from 'lucide-react';
import { RespondentData, DeciduousTeethState, PermanentTeethState } from '../types';
import Odontogram from './Odontogram';
import { calculateDetailedAge, extractDobFromNik } from '../lib/surveyEngine';

interface DentalFormProps {
  onSaveRespondent: (data: Omit<RespondentData, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  nextRespondentNumber: number;
}

const initialGSState: DeciduousTeethState = {
  sehat: 0,
  karies: 0,
  dicabutKaries: 0,
  tumpatanKaries: 0,
  tumpatanTanpaKaries: 0,
  dicabutSebabLain: 0,
  fissureSealant: 0,
  protesaCekat: 0,
  tidakTumbuh: 0,
  lainLain: 0
};

const initialGTState: PermanentTeethState = {
  sehat: 28, // Default normal adult teeth
  karies: 0,
  dicabutKaries: 0,
  tumpatanKaries: 0,
  tumpatanTanpaKaries: 0,
  dicabutSebabLain: 0,
  fissureSealant: 0,
  protesaCekat: 0,
  tidakTumbuh: 0,
  lainLain: 0
};

// Helper to generate typical teeth status mapping by age standard
const generateTeethForAge = (age: number) => {
  const status: Record<string, string> = {};
  const upperRightPerm = ['18', '17', '16', '15', '14', '13', '12', '11'];
  const upperLeftPerm = ['21', '22', '23', '24', '25', '26', '27', '28'];
  const lowerRightPerm = ['48', '47', '46', '45', '44', '43', '42', '41'];
  const lowerLeftPerm = ['31', '32', '33', '34', '35', '36', '37', '38'];
  const permanentTeeth = [...upperRightPerm, ...upperLeftPerm, ...lowerRightPerm, ...lowerLeftPerm];

  const upperRightDecid = ['55', '54', '53', '52', '51'];
  const upperLeftDecid = ['61', '62', '63', '64', '65'];
  const lowerRightDecid = ['85', '84', '83', '82', '81'];
  const lowerLeftDecid = ['71', '72', '73', '74', '75'];
  const deciduousTeeth = [...upperRightDecid, ...upperLeftDecid, ...lowerRightDecid, ...lowerLeftDecid];

  if (age <= 5) {
    permanentTeeth.forEach(num => { status[num] = '8'; });
    deciduousTeeth.forEach(num => { status[num] = 'A'; });
  } else if (age > 5 && age <= 10) {
    const eruptedPerm = ['11', '12', '16', '21', '22', '26', '31', '32', '36', '41', '42', '46'];
    permanentTeeth.forEach(num => {
      status[num] = eruptedPerm.includes(num) ? '0' : '8';
    });
    deciduousTeeth.forEach(num => { status[num] = 'A'; });
  } else if (age > 10 && age <= 15) {
    deciduousTeeth.forEach(num => { status[num] = 'I'; });
    permanentTeeth.forEach(num => {
      status[num] = ['18', '28', '38', '48'].includes(num) ? '8' : '0';
    });
  } else {
    deciduousTeeth.forEach(num => { status[num] = 'I'; });
    permanentTeeth.forEach(num => { status[num] = '0'; });
  }
  return status;
};

export default function DentalForm({ onSaveRespondent, nextRespondentNumber }: DentalFormProps) {
  // Identitas & Examination Metadata
  const [pemeriksa, setPemeriksa] = useState('Arini Haerunnisa');
  const [tanggalInput, setTanggalInput] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [umurLengkap, setUmurLengkap] = useState('');
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [umur, setUmur] = useState<number>(8);
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [pendidikan, setPendidikan] = useState<RespondentData['pendidikan']>('SD');
  const [pekerjaan, setPekerjaan] = useState<RespondentData['pekerjaan']>('PELAJAR/MAHASISWA');
  
  // Teeth Status mapping for individual teeth
  const [teethStatus, setTeethStatus] = useState<Record<string, string>>(() => generateTeethForAge(8));

  // States for summary counters (will be updated via useEffect from teethStatus)
  const [gigiSulung, setGigiSulung] = useState<DeciduousTeethState>({ ...initialGSState });
  const [gigiTetap, setGigiTetap] = useState<PermanentTeethState>({ ...initialGTState });
  
  // Mukosa & RTL
  const [gusiBerdarah, setGusiBerdarah] = useState(false);
  const [lesiMukosaOral, setLesiMukosaOral] = useState(false);
  
  const [perluPerawatanSegera, setPerluPerawatanSegera] = useState(false);
  const [perluPerawatanTidakSegera, setPerluPerawatanTidakSegera] = useState(false);
  const [perluDirujuk, setPerluDirujuk] = useState(false);
  const [dirujukKe, setDirujukKe] = useState<RespondentData['tindakLanjut']['dirujukKe']>('tidak_dirujuk');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Voice Command States & Config
  const [voiceActive, setVoiceActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceLog, setVoiceLog] = useState<string[]>([]);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [showVoiceGuide, setShowVoiceGuide] = useState(false);

  // Indonesian spoken numbers to digits dictionary
  const numWordsMap: Record<string, string> = {
    'nol': '0', 'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4',
    'lima': '5', 'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9'
  };

  // Status mapping for Indonesian words to codes
  const STATUS_KEYWORDS = [
    { phrase: 'sehat', codePerm: '0', codeDecid: 'A' },
    { phrase: 'normal', codePerm: '0', codeDecid: 'A' },
    { phrase: 'karies', codePerm: '1', codeDecid: 'B' },
    { phrase: 'berlubang', codePerm: '1', codeDecid: 'B' },
    { phrase: 'lubang', codePerm: '1', codeDecid: 'B' },
    { phrase: 'tumpat karies', codePerm: '2', codeDecid: 'C' },
    { phrase: 'tambal karies', codePerm: '2', codeDecid: 'C' },
    { phrase: 'tumpatan', codePerm: '3', codeDecid: 'D' },
    { phrase: 'tambalan', codePerm: '3', codeDecid: 'D' },
    { phrase: 'tambal', codePerm: '3', codeDecid: 'D' },
    { phrase: 'cabut karies', codePerm: '4', codeDecid: 'E' },
    { phrase: 'dicabut karies', codePerm: '4', codeDecid: 'E' },
    { phrase: 'cabut lain', codePerm: '5', codeDecid: 'F' },
    { phrase: 'dicabut sebab lain', codePerm: '5', codeDecid: 'F' },
    { phrase: 'dicabut lain', codePerm: '5', codeDecid: 'F' },
    { phrase: 'fissure sealant', codePerm: '6', codeDecid: 'G' },
    { phrase: 'sealant', codePerm: '6', codeDecid: 'G' },
    { phrase: 'protesa', codePerm: '7', codeDecid: 'H' },
    { phrase: 'mahkota', codePerm: '7', codeDecid: 'H' },
    { phrase: 'crown', codePerm: '7', codeDecid: 'H' },
    { phrase: 'tidak tumbuh', codePerm: '8', codeDecid: 'I' },
    { phrase: 'tidak ada', codePerm: '8', codeDecid: 'I' },
    { phrase: 'belum tumbuh', codePerm: '8', codeDecid: 'I' },
    { phrase: 'agenesis', codePerm: '8', codeDecid: 'I' },
    { phrase: 'lain-lain', codePerm: '9', codeDecid: 'J' },
    { phrase: 'lain lain', codePerm: '9', codeDecid: 'J' },
    { phrase: 'nol', codePerm: '0', codeDecid: 'A' },
    { phrase: 'satu', codePerm: '1', codeDecid: 'B' },
    { phrase: 'dua', codePerm: '2', codeDecid: 'C' },
    { phrase: 'tiga', codePerm: '3', codeDecid: 'D' },
    { phrase: 'empat', codePerm: '4', codeDecid: 'E' },
    { phrase: 'lima', codePerm: '5', codeDecid: 'F' },
    { phrase: 'enam', codePerm: '6', codeDecid: 'G' },
    { phrase: 'tujuh', codePerm: '7', codeDecid: 'H' },
    { phrase: 'delapan', codePerm: '8', codeDecid: 'I' },
    { phrase: 'sembilan', codePerm: '9', codeDecid: 'J' },
    { phrase: 'kode a', codePerm: '0', codeDecid: 'A' },
    { phrase: 'kode b', codePerm: '1', codeDecid: 'B' },
    { phrase: 'kode c', codePerm: '2', codeDecid: 'C' },
    { phrase: 'kode d', codePerm: '3', codeDecid: 'D' },
    { phrase: 'kode e', codePerm: '4', codeDecid: 'E' },
    { phrase: 'kode f', codePerm: '5', codeDecid: 'F' },
    { phrase: 'kode g', codePerm: '6', codeDecid: 'G' },
    { phrase: 'kode h', codePerm: '7', codeDecid: 'H' },
    { phrase: 'kode i', codePerm: '8', codeDecid: 'I' },
    { phrase: 'kode j', codePerm: '9', codeDecid: 'J' }
  ];

  const speakFeedback = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error(err);
    }
  };

  const cleanSpokenText = (text: string): string => {
    let cleaned = text.toLowerCase().trim();
    cleaned = cleaned.replace(/sebelas/g, '11');
    cleaned = cleaned.replace(/dua belas/g, '12');
    cleaned = cleaned.replace(/tiga belas/g, '13');
    cleaned = cleaned.replace(/empat belas/g, '14');
    cleaned = cleaned.replace(/lima belas/g, '15');
    cleaned = cleaned.replace(/enam belas/g, '16');
    cleaned = cleaned.replace(/tujuh belas/g, '17');
    cleaned = cleaned.replace(/delapan belas/g, '18');

    cleaned = cleaned.replace(/dua puluh (\w+)/g, (m, p1) => '2' + (numWordsMap[p1] || ''));
    cleaned = cleaned.replace(/dua puluh/g, '20');

    cleaned = cleaned.replace(/tiga puluh (\w+)/g, (m, p1) => '3' + (numWordsMap[p1] || ''));
    cleaned = cleaned.replace(/tiga puluh/g, '30');

    cleaned = cleaned.replace(/empat puluh (\w+)/g, (m, p1) => '4' + (numWordsMap[p1] || ''));
    cleaned = cleaned.replace(/empat puluh/g, '40');

    cleaned = cleaned.replace(/lima puluh (\w+)/g, (m, p1) => '5' + (numWordsMap[p1] || ''));
    cleaned = cleaned.replace(/lima puluh/g, '50');

    cleaned = cleaned.replace(/enam puluh (\w+)/g, (m, p1) => '6' + (numWordsMap[p1] || ''));
    cleaned = cleaned.replace(/enam puluh/g, '60');

    cleaned = cleaned.replace(/tujuh puluh (\w+)/g, (m, p1) => '7' + (numWordsMap[p1] || ''));
    cleaned = cleaned.replace(/tujuh puluh/g, '70');

    cleaned = cleaned.replace(/delapan puluh (\w+)/g, (m, p1) => '8' + (numWordsMap[p1] || ''));
    cleaned = cleaned.replace(/delapan puluh/g, '80');

    Object.entries(numWordsMap).forEach(([word, digit]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      cleaned = cleaned.replace(regex, digit);
    });

    cleaned = cleaned.replace(/(\d)\s+(\d)/g, '$1$2');
    return cleaned;
  };

  const handleVoiceCommand = (rawText: string) => {
    const cleaned = cleanSpokenText(rawText);
    console.log("Cleaned voice command:", cleaned);

    // 1. Simpan command
    if (cleaned.includes("simpan")) {
      setVoiceLog(prev => [`Simpan data survei`, ...prev.slice(0, 4)]);
      speakFeedback("Menyimpan data survei");
      const btn = document.getElementById("submit-btn-form");
      if (btn) btn.click();
      return;
    }

    // 2. Mucosa/RTL commands
    if (cleaned.includes("gusi berdarah") || cleaned.includes("gusi berdarah aktif")) {
      setGusiBerdarah(true);
      setVoiceLog(prev => [`Gusi berdarah diaktifkan`, ...prev.slice(0, 4)]);
      speakFeedback("Gusi berdarah diaktifkan");
      return;
    }
    if (cleaned.includes("gusi normal") || cleaned.includes("gusi sehat")) {
      setGusiBerdarah(false);
      setVoiceLog(prev => [`Gusi berdarah dinonaktifkan`, ...prev.slice(0, 4)]);
      speakFeedback("Gusi sehat");
      return;
    }

    if (cleaned.includes("lesi mukosa") || cleaned.includes("lesi oral") || cleaned.includes("ada lesi")) {
      setLesiMukosaOral(true);
      setVoiceLog(prev => [`Lesi mukosa oral diaktifkan`, ...prev.slice(0, 4)]);
      speakFeedback("Lesi mukosa oral diaktifkan");
      return;
    }
    if (cleaned.includes("lesi normal") || cleaned.includes("tidak ada lesi")) {
      setLesiMukosaOral(false);
      setVoiceLog(prev => [`Lesi mukosa oral dinonaktifkan`, ...prev.slice(0, 4)]);
      speakFeedback("Lesi mukosa normal");
      return;
    }

    if (cleaned.includes("perawatan segera") || cleaned.includes("butuh perawatan segera")) {
      setPerluPerawatanSegera(true);
      setVoiceLog(prev => [`Perlu perawatan segera diaktifkan`, ...prev.slice(0, 4)]);
      speakFeedback("Perawatan segera diaktifkan");
      return;
    }
    if (cleaned.includes("perawatan tidak segera")) {
      setPerluPerawatanTidakSegera(true);
      setVoiceLog(prev => [`Perlu perawatan tidak segera diaktifkan`, ...prev.slice(0, 4)]);
      speakFeedback("Perawatan tidak segera diaktifkan");
      return;
    }

    if (cleaned.includes("rujuk puskesmas")) {
      setPerluDirujuk(true);
      setDirujukKe('puskesmas');
      setVoiceLog(prev => [`Rujuk ke Puskesmas`, ...prev.slice(0, 4)]);
      speakFeedback("Rujuk ke Puskesmas");
      return;
    }
    if (cleaned.includes("rujuk rumah sakit")) {
      setPerluDirujuk(true);
      setDirujukKe('rs_umum');
      setVoiceLog(prev => [`Rujuk ke Rumah Sakit Umum`, ...prev.slice(0, 4)]);
      speakFeedback("Rujuk ke Rumah Sakit Umum");
      return;
    }
    if (cleaned.includes("rujuk rsgm") || cleaned.includes("rujuk rumah sakit gigi")) {
      setPerluDirujuk(true);
      setDirujukKe('rsgm_rskgm');
      setVoiceLog(prev => [`Rujuk ke RS Gigi dan Mulut`, ...prev.slice(0, 4)]);
      speakFeedback("Rujuk ke RS Gigi dan Mulut");
      return;
    }

    // 3. Tooth status parser
    const toothMatch = cleaned.match(/\b(18|17|16|15|14|13|12|11|21|22|23|24|25|26|27|28|31|32|33|34|35|36|37|38|41|42|43|44|45|46|47|48|55|54|53|52|51|61|62|63|64|65|71|72|73|74|75|85|84|83|82|81)\b/);
    if (toothMatch) {
      const toothNum = toothMatch[1];
      const isDeciduous = ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65', '71', '72', '73', '74', '75', '85', '84', '83', '82', '81'].includes(toothNum);

      let matchedCode: string | null = null;
      let matchedLabel = '';

      for (const kw of STATUS_KEYWORDS) {
        if (cleaned.includes(kw.phrase)) {
          matchedCode = isDeciduous ? kw.codeDecid : kw.codePerm;
          matchedLabel = kw.phrase;
          break;
        }
      }

      if (!matchedCode) {
        const regexDigitAfter = new RegExp(`${toothNum}\\s*([0-9a-j])`);
        const digitMatch = cleaned.match(regexDigitAfter);
        if (digitMatch) {
          const char = digitMatch[1].toUpperCase();
          if (isDeciduous) {
            if (/[0-9]/.test(char)) {
              const idx = parseInt(char);
              matchedCode = String.fromCharCode(65 + idx);
            } else if (/[A-J]/.test(char)) {
              matchedCode = char;
            }
          } else {
            if (/[0-9]/.test(char)) {
              matchedCode = char;
            }
          }
          if (matchedCode) {
            matchedLabel = `kode ${matchedCode}`;
          }
        }
      }

      if (matchedCode) {
        setTeethStatus(prev => ({
          ...prev,
          [toothNum]: matchedCode!
        }));
        setVoiceLog(prev => [`Gigi ${toothNum} diset ke ${matchedLabel}`, ...prev.slice(0, 4)]);
        speakFeedback(`Gigi ${toothNum} diset ke ${matchedLabel}`);
        return;
      }
    }

    if (rawText.trim()) {
      setVoiceLog(prev => [`Tidak dimengerti: "${rawText}"`, ...prev.slice(0, 4)]);
      speakFeedback("Tidak dimengerti");
    }
  };

  useEffect(() => {
    if (!voiceActive) return;

    let active = true;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Anda tidak mendukung Web Speech API. Gunakan Chrome atau Safari.");
      setVoiceActive(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'id-ID';

    recognition.onresult = (event: any) => {
      if (!active) return;
      const resultText = event.results[0][0].transcript || '';
      setTranscript(resultText);
      handleVoiceCommand(resultText);
    };

    recognition.onerror = (event: any) => {
      if (!active) return;
      console.error("Speech recognition error:", event.error);
      
      // If error is not-allowed (mic permissions), stop to prevent infinite alert/loop
      if (event.error === 'not-allowed') {
        active = false;
        setVoiceActive(false);
        setVoiceLog(prev => [`Error: Izin mikrofon ditolak`, ...prev.slice(0, 4)]);
      } else if (event.error === 'aborted') {
        // Safe to ignore as it usually means we aborted manually or user switched page
        console.log("Speech recognition was aborted intentionally or due to session restart.");
      } else {
        setVoiceLog(prev => [`Error: ${event.error}`, ...prev.slice(0, 4)]);
      }
    };

    recognition.onend = () => {
      if (active && voiceActive) {
        // Add a small delay before restarting to prevent high-frequency browser blocking/aborts
        setTimeout(() => {
          if (active && voiceActive) {
            try {
              recognition.start();
            } catch (e) {
              // ignore
            }
          }
        }, 300);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }

    return () => {
      active = false;
      try {
        recognition.abort();
      } catch (e) {
        // ignore
      }
    };
  }, [voiceActive]);

  // Set default nama based on respondent number
  useEffect(() => {
    if (!nama) {
      setNama(`Responden #${nextRespondentNumber}`);
    }
  }, [nextRespondentNumber]);

  // Sync teethStatus changes to aggregate counts
  useEffect(() => {
    const sulung: DeciduousTeethState = {
      sehat: 0,
      karies: 0,
      dicabutKaries: 0,
      tumpatanKaries: 0,
      tumpatanTanpaKaries: 0,
      dicabutSebabLain: 0,
      fissureSealant: 0,
      protesaCekat: 0,
      tidakTumbuh: 0,
      lainLain: 0
    };

    const tetap: PermanentTeethState = {
      sehat: 0,
      karies: 0,
      dicabutKaries: 0,
      tumpatanKaries: 0,
      tumpatanTanpaKaries: 0,
      dicabutSebabLain: 0,
      fissureSealant: 0,
      protesaCekat: 0,
      tidakTumbuh: 0,
      lainLain: 0
    };

    const upperRightPerm = ['18', '17', '16', '15', '14', '13', '12', '11'];
    const upperLeftPerm = ['21', '22', '23', '24', '25', '26', '27', '28'];
    const lowerRightPerm = ['48', '47', '46', '45', '44', '43', '42', '41'];
    const lowerLeftPerm = ['31', '32', '33', '34', '35', '36', '37', '38'];
    const permanentTeeth = [...upperRightPerm, ...upperLeftPerm, ...lowerRightPerm, ...lowerLeftPerm];

    const upperRightDecid = ['55', '54', '53', '52', '51'];
    const upperLeftDecid = ['61', '62', '63', '64', '65'];
    const lowerRightDecid = ['85', '84', '83', '82', '81'];
    const lowerLeftDecid = ['71', '72', '73', '74', '75'];
    const deciduousTeeth = [...upperRightDecid, ...upperLeftDecid, ...lowerRightDecid, ...lowerLeftDecid];

    const permMap: Record<string, keyof PermanentTeethState> = {
      '0': 'sehat',
      '1': 'karies',
      '2': 'tumpatanKaries',
      '3': 'tumpatanTanpaKaries',
      '4': 'dicabutKaries',
      '5': 'dicabutSebabLain',
      '6': 'fissureSealant',
      '7': 'protesaCekat',
      '8': 'tidakTumbuh',
      '9': 'lainLain'
    };

    const decidMap: Record<string, keyof DeciduousTeethState> = {
      'A': 'sehat',
      'B': 'karies',
      'C': 'tumpatanKaries',
      'D': 'tumpatanTanpaKaries',
      'E': 'dicabutKaries',
      'F': 'dicabutSebabLain',
      'G': 'fissureSealant',
      'H': 'protesaCekat',
      'I': 'tidakTumbuh',
      'J': 'lainLain'
    };

    permanentTeeth.forEach(num => {
      const code = teethStatus[num] || '0';
      const field = permMap[code];
      if (field) tetap[field]++;
    });

    deciduousTeeth.forEach(num => {
      const code = teethStatus[num] || 'A';
      const field = decidMap[code];
      if (field) sulung[field]++;
    });

    setGigiSulung(sulung);
    setGigiTetap(tetap);
  }, [teethStatus]);

  const handleToothChange = (toothNum: string, newStatus: string) => {
    setTeethStatus(prev => ({
      ...prev,
      [toothNum]: newStatus
    }));
  };

  // Handle Date of Birth change & automatic calculation in years, months, days
  const handleDobChange = (dobStr: string, refDateOverride?: string) => {
    setTanggalLahir(dobStr);
    const ref = refDateOverride || tanggalInput || new Date().toISOString().split('T')[0];
    if (!dobStr) {
      setUmurLengkap('');
      return;
    }
    const detailed = calculateDetailedAge(dobStr, ref);
    setUmurLengkap(detailed.formatted);
    if (detailed.years >= 0) {
      handleAgeChange(detailed.years);
    }
  };

  const handleExamDateChange = (newDate: string) => {
    setTanggalInput(newDate);
    if (tanggalLahir) {
      const detailed = calculateDetailedAge(tanggalLahir, newDate);
      setUmurLengkap(detailed.formatted);
      if (detailed.years >= 0) {
        handleAgeChange(detailed.years);
      }
    }
  };

  const handleNikChange = (rawVal: string) => {
    const cleanNik = rawVal.replace(/\D/g, '');
    setNik(cleanNik);
    if (cleanNik.length === 16) {
      const extracted = extractDobFromNik(cleanNik);
      if (extracted) {
        handleDobChange(extracted.dobStr);
        if (extracted.gender) {
          setJenisKelamin(extracted.gender);
        }
      }
    }
  };

  // Handle auto calculations when age changes
  const handleAgeChange = (val: number) => {
    setUmur(val);
    
    // Auto-set Education & Job based on age defaults to make it super fast
    if (val <= 5) {
      setPendidikan('Tidak Sekolah');
      setPekerjaan('TIDAK BEKERJA');
    } else if (val > 5 && val <= 10) {
      setPendidikan('SD');
      setPekerjaan('PELAJAR/MAHASISWA');
    } else if (val > 10 && val <= 15) {
      setPendidikan('SMP');
      setPekerjaan('PELAJAR/MAHASISWA');
    } else if (val > 15 && val <= 18) {
      setPendidikan('SMA');
      setPekerjaan('PELAJAR/MAHASISWA');
    } else {
      setPendidikan('SMA');
      setPekerjaan('PEGAWAI SWASTA');
    }

    setTeethStatus(generateTeethForAge(val));
  };

  // Auto-manage referral checkboxes
  const handleReferralChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dest = e.target.value as RespondentData['tindakLanjut']['dirujukKe'];
    setDirujukKe(dest);
    if (dest !== 'tidak_dirujuk') {
      setPerluDirujuk(true);
    } else {
      setPerluDirujuk(false);
    }
  };

  // Numeric adjustment helper with touch target considerations
  const adjustValue = (
    type: 'sulung' | 'tetap', 
    field: keyof DeciduousTeethState | keyof PermanentTeethState, 
    delta: number
  ) => {
    // If aggregates are adjusted manually, we can search for a tooth with the old status and update it to the new status
    // to preserve visual sync! This is an amazing luxury feature.
    const permMap: Record<keyof PermanentTeethState, string> = {
      sehat: '0',
      karies: '1',
      tumpatanKaries: '2',
      tumpatanTanpaKaries: '3',
      dicabutKaries: '4',
      dicabutSebabLain: '5',
      fissureSealant: '6',
      protesaCekat: '7',
      tidakTumbuh: '8',
      lainLain: '9'
    };

    const decidMap: Record<keyof DeciduousTeethState, string> = {
      sehat: 'A',
      karies: 'B',
      tumpatanKaries: 'C',
      tumpatanTanpaKaries: 'D',
      dicabutKaries: 'E',
      dicabutSebabLain: 'F',
      fissureSealant: 'G',
      protesaCekat: 'H',
      tidakTumbuh: 'I',
      lainLain: 'J'
    };

    const targetCode = type === 'sulung' ? decidMap[field as keyof DeciduousTeethState] : permMap[field as keyof PermanentTeethState];
    const defaultCode = type === 'sulung' ? 'A' : '0';

    if (delta > 0) {
      // Find a tooth that currently is "default" or other and make it the targetCode
      const candidates = type === 'sulung' 
        ? ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65', '85', '84', '83', '82', '81', '71', '72', '73', '74', '75']
        : ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28', '48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

      const toothToChange = candidates.find(num => teethStatus[num] === defaultCode || teethStatus[num] === undefined);
      if (toothToChange) {
        setTeethStatus(prev => ({ ...prev, [toothToChange]: targetCode }));
      }
    } else {
      // Find a tooth that has targetCode and make it defaultCode
      const candidates = type === 'sulung' 
        ? ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65', '85', '84', '83', '82', '81', '71', '72', '73', '74', '75']
        : ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28', '48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

      const toothToChange = candidates.find(num => teethStatus[num] === targetCode);
      if (toothToChange) {
        setTeethStatus(prev => ({ ...prev, [toothToChange]: defaultCode }));
      }
    }
  };

  // Quick Presets
  const applyPreset = (preset: 'sehat_anak' | 'sehat_dewasa' | 'karies_anak' | 'karies_dewasa') => {
    if (preset === 'sehat_anak') {
      setUmur(8);
      setPendidikan('SD');
      setPekerjaan('PELAJAR/MAHASISWA');
      setTeethStatus(generateTeethForAge(8));
      setGusiBerdarah(false);
      setLesiMukosaOral(false);
      setPerluPerawatanSegera(false);
      setPerluPerawatanTidakSegera(false);
      setPerluDirujuk(false);
      setDirujukKe('tidak_dirujuk');
    } else if (preset === 'sehat_dewasa') {
      setUmur(28);
      setPendidikan('S1/D4');
      setPekerjaan('PEGAWAI SWASTA');
      setTeethStatus(generateTeethForAge(28));
      setGusiBerdarah(false);
      setLesiMukosaOral(false);
      setPerluPerawatanSegera(false);
      setPerluPerawatanTidakSegera(false);
      setPerluDirujuk(false);
      setDirujukKe('tidak_dirujuk');
    } else if (preset === 'karies_anak') {
      setUmur(7);
      setPendidikan('SD');
      setPekerjaan('PELAJAR/MAHASISWA');
      
      const childStatus = generateTeethForAge(7);
      childStatus['51'] = 'B'; // karies
      childStatus['52'] = 'B'; // karies
      childStatus['61'] = 'B'; // karies
      childStatus['62'] = 'B'; // karies
      childStatus['55'] = 'E'; // dicabut karies
      childStatus['16'] = '1'; // karies permanent
      setTeethStatus(childStatus);

      setGusiBerdarah(true);
      setLesiMukosaOral(false);
      setPerluPerawatanSegera(true);
      setPerluPerawatanTidakSegera(false);
      setPerluDirujuk(true);
      setDirujukKe('puskesmas');
    } else if (preset === 'karies_dewasa') {
      setUmur(35);
      setPendidikan('SMA');
      setPekerjaan('WIRASWASTA/WIRAUSAHA');
      
      const adultStatus = generateTeethForAge(35);
      adultStatus['16'] = '1'; // karies permanent
      adultStatus['26'] = '1'; // karies permanent
      adultStatus['36'] = '1'; // karies permanent
      adultStatus['46'] = '1'; // karies permanent
      adultStatus['11'] = '1'; // karies permanent
      adultStatus['37'] = '4'; // dicabut karies
      adultStatus['47'] = '4'; // dicabut karies
      adultStatus['14'] = '3'; // tumpatan tanpa karies
      setTeethStatus(adultStatus);

      setGusiBerdarah(true);
      setLesiMukosaOral(true);
      setPerluPerawatanSegera(true);
      setPerluPerawatanTidakSegera(true);
      setPerluDirujuk(true);
      setDirujukKe('rsgm_rskgm');
    }
  };

  // Determine age group string
  const getAgeGroupValue = (val: number): RespondentData['kelompokUmur'] => {
    if (val >= 5 && val <= 10) return '5-10';
    if (val > 10 && val <= 18) return '10-18';
    if (val > 18 && val <= 60) return '18-60';
    return '60+';
  };

  // Live calculated Indices
  const deft = (gigiSulung.karies || 0) + (gigiSulung.dicabutKaries || 0) + (gigiSulung.tumpatanTanpaKaries || 0);
  const dmft = (gigiTetap.karies || 0) + (gigiTetap.dicabutKaries || 0) + (gigiTetap.tumpatanTanpaKaries || 0);

  const resetForm = () => {
    setTanggalInput(new Date().toISOString().split('T')[0]);
    setTanggalLahir('');
    setUmurLengkap('');
    setNik('');
    setNama(`Responden #${nextRespondentNumber}`);
    setUmur(8);
    setJenisKelamin('Laki-laki');
    setPendidikan('SD');
    setPekerjaan('PELAJAR/MAHASISWA');
    setTeethStatus(generateTeethForAge(8));
    setGusiBerdarah(false);
    setLesiMukosaOral(false);
    setPerluPerawatanSegera(false);
    setPerluPerawatanTidakSegera(false);
    setPerluDirujuk(false);
    setDirujukKe('tidak_dirujuk');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    setSaving(true);
    try {
      const respondentPayload: Omit<RespondentData, 'id' | 'createdAt' | 'createdBy'> = {
        pemeriksa: pemeriksa.trim() || '',
        nik: nik.trim() || '',
        nama: nama.trim(),
        tanggalInput: tanggalInput || new Date().toISOString().split('T')[0],
        tanggalLahir: tanggalLahir.trim() || '',
        umurLengkap: umurLengkap.trim() || `${umur} tahun`,
        jenisKelamin,
        umur,
        kelompokUmur: getAgeGroupValue(umur),
        pendidikan,
        pekerjaan,
        gigiSulung,
        gigiTetap,
        teethStatus,
        deft,
        dmft,
        mukosa: {
          gusiBerdarah,
          lesiMukosaOral,
        },
        tindakLanjut: {
          perluPerawatanSegera,
          perluPerawatanTidakSegera,
          perluDirujuk,
          dirujukKe,
        }
      };

      await onSaveRespondent(respondentPayload);
      setSuccess(true);
      setNama(''); // triggers reset in useEffect
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Gagal menyimpan responden:", err);
      alert("Gagal menyimpan ke Cloud database!");
    } finally {
      setSaving(false);
    }
  };

  // Reusable component for tooth numeric adjuster
  const ToothAdjuster = ({ 
    label, 
    value 
  }: { 
    label: string, 
    type?: 'sulung' | 'tetap', 
    field?: keyof DeciduousTeethState | keyof PermanentTeethState, 
    value: number 
  }) => (
    <div className="flex items-center justify-between p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-pink-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-900 transition duration-150 shadow-2xs">
      <span className="text-xs font-black text-slate-950 dark:text-slate-100">{label}</span>
      <div className="flex items-center">
        <span className="px-3 py-1 bg-pink-100 dark:bg-slate-800 border border-pink-300 dark:border-slate-700 rounded-lg font-mono text-sm font-black text-pink-950 dark:text-pink-200 shadow-2xs min-w-8 text-center select-none">
          {value}
        </span>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12 p-2" id="dental-form-root">
      {/* Header Presets */}
      <div className="glass-panel rounded-2xl p-4 border border-pink-300/60 dark:border-pink-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-xs font-black text-pink-950 dark:text-pink-200 flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" /> Presets Pengisian Cepat
          </h3>
          <p className="text-[11px] text-slate-800 dark:text-slate-300 font-bold mt-0.5">Mempercepat input data dengan template klinis standar</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset('sehat_anak')}
            className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 text-[11px] font-black rounded-xl transition cursor-pointer hover:scale-105"
          >
            Anak Sehat (8th)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('karies_anak')}
            className="px-3 py-1.5 bg-rose-100 dark:bg-rose-950/80 hover:bg-rose-200 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200 text-[11px] font-black rounded-xl transition cursor-pointer hover:scale-105"
          >
            Anak Karies (7th)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('sehat_dewasa')}
            className="px-3 py-1.5 bg-pink-100 dark:bg-pink-950/80 hover:bg-pink-200 border border-pink-300 dark:border-pink-800 text-pink-950 dark:text-pink-200 text-[11px] font-black rounded-xl transition cursor-pointer hover:scale-105"
          >
            Dewasa Sehat (28th)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('karies_dewasa')}
            className="px-3 py-1.5 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-[11px] font-black rounded-xl transition cursor-pointer hover:scale-105"
          >
            Dewasa Karies (35th)
          </button>
        </div>
      </div>

      {/* Asisten Suara Asepsis */}
      <div className="glass-panel rounded-3xl border border-pink-300/60 dark:border-pink-800/60 p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border transition-all ${voiceActive ? 'bg-rose-600 text-white border-rose-400 animate-pulse' : 'bg-pink-100 dark:bg-slate-800 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-800'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-950 dark:text-slate-100 uppercase tracking-wider">Asisten Suara Asepsis (Hands-Free)</h3>
                {voiceActive ? (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                )}
              </div>
              <p className="text-[11px] text-slate-800 dark:text-slate-300 font-bold mt-0.5">Isi odontogram & checklist secara hands-free tanpa menyentuh perangkat</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Toggle TTS */}
            <button
              type="button"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2.5 rounded-xl border transition-all shadow-2xs cursor-pointer ${ttsEnabled ? 'bg-pink-100 dark:bg-pink-950/80 border-pink-300 dark:border-pink-800 text-pink-900 dark:text-pink-200 hover:bg-pink-200' : 'bg-white/80 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400'}`}
              title={ttsEnabled ? 'Suara konfirmasi aktif' : 'Suara konfirmasi nonaktif'}
            >
              {ttsEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
            </button>

            {/* Toggle Active */}
            <button
              type="button"
              onClick={() => {
                const nextState = !voiceActive;
                setVoiceActive(nextState);
                if (nextState) {
                  speakFeedback("Asisten suara asepsis diaktifkan. Silakan berikan perintah.");
                } else {
                  speakFeedback("Asisten suara dinonaktifkan.");
                }
              }}
              className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                voiceActive 
                  ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20' 
                  : 'bg-pink-600 dark:bg-pink-700 text-white hover:bg-pink-700 dark:hover:bg-pink-600 shadow-pink-600/20'
              }`}
            >
              {voiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {voiceActive ? 'Matikan Suara' : 'Aktifkan Suara'}
            </button>
          </div>
        </div>

        {/* Live status when active */}
        {voiceActive && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            {/* Live Transcript */}
            <div className="bg-pink-50/80 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-700 p-3.5 rounded-2xl flex items-start gap-3">
              <div className="mt-1 flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <div className="flex-1 space-y-1">
                <span className="block text-[9px] font-extrabold text-slate-700 dark:text-slate-400 uppercase tracking-widest">Mendengarkan...</span>
                <p className="text-xs font-black text-slate-950 dark:text-slate-100 italic">
                  {transcript ? `"${transcript}"` : 'Ucapkan perintah seperti "gigi satu delapan karies", "gusi berdarah", atau "simpan data"...'}
                </p>
              </div>
            </div>

            {/* Last command logs */}
            <div className="bg-white/90 dark:bg-slate-900/90 border border-pink-200 dark:border-slate-700 p-3.5 rounded-2xl space-y-2">
              <span className="block text-[9px] font-extrabold text-slate-700 dark:text-slate-400 uppercase tracking-widest">Riwayat Perintah Berhasil</span>
              <div className="space-y-1.5 max-h-20 overflow-y-auto">
                {voiceLog.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Belum ada perintah yang terekam.</p>
                ) : (
                  voiceLog.map((log, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] font-black text-slate-950 dark:text-slate-100">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cheat sheet button & pane */}
        <div className="border-t border-pink-200 dark:border-slate-800 pt-2.5">
          <button
            type="button"
            onClick={() => setShowVoiceGuide(!showVoiceGuide)}
            className="flex items-center justify-between w-full text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest hover:text-pink-600 transition cursor-pointer select-none"
          >
            <span className="flex items-center gap-1.5">📋 Cara Kerja & Panduan Perintah Suara</span>
            {showVoiceGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showVoiceGuide && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3.5 text-slate-800 dark:text-slate-200 text-xs font-bold animate-fadeIn">
              <div className="bg-white/80 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-800 p-3 rounded-2xl space-y-1.5">
                <span className="block text-[9px] font-black text-pink-900 dark:text-pink-300 uppercase tracking-wider">1. Mengisi Odontogram</span>
                <p className="text-[11px] text-slate-800 dark:text-slate-300 leading-relaxed">
                  Ucapkan <strong className="text-slate-950 dark:text-white">"Gigi [Nomor] [Kondisi]"</strong>.
                  <br />Contoh:
                  <br />• <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"gigi delapan belas sehat"</code>
                  <br />• <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"gigi satu satu karies"</code>
                  <br />• <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"gigi lima lima tambal"</code>
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-800 p-3 rounded-2xl space-y-1.5">
                <span className="block text-[9px] font-black text-pink-900 dark:text-pink-300 uppercase tracking-wider">2. Kondisi Gigi & Kode</span>
                <p className="text-[11px] text-slate-800 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-950 dark:text-white">Gigi Tetap:</strong> sehat (0), karies (1), tumpat karies (2), tumpat (3), cabut karies (4), cabut lain (5), sealant (6), protesa (7), tidak tumbuh (8), lain-lain (9).
                  <br /><strong className="text-slate-950 dark:text-white">Gigi Sulung:</strong> sehat (a), karies (b), tumpat karies (c), d, e, f, g, h, i, j.
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-800 p-3 rounded-2xl space-y-1.5">
                <span className="block text-[9px] font-black text-pink-900 dark:text-pink-300 uppercase tracking-wider">3. Form & Penyimpanan</span>
                <p className="text-[11px] text-slate-800 dark:text-slate-300 leading-relaxed">
                  • <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"gusi berdarah"</code> / <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"gusi sehat"</code>
                  <br />• <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"lesi mukosa"</code> / <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"lesi normal"</code>
                  <br />• <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"perawatan segera"</code>
                  <br />• <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"rujuk puskesmas"</code>
                  <br />• <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"simpan"</code> / <code className="bg-pink-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-950 dark:text-pink-200 font-black">"simpan data"</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 (Sidebar): Identitas & Rencana Tindak Lanjut */}
        <div className="space-y-6 lg:col-span-1">
          {/* Operator / Pemeriksa & Tanggal Card */}
          <div className="glass-panel rounded-3xl border border-pink-200 dark:border-pink-900/40 p-5 shadow-md space-y-3.5 bg-gradient-to-br from-pink-50/80 to-white dark:from-slate-900/80 dark:to-slate-900/60">
            <div>
              <label className="block text-xs font-black text-slate-950 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-1.5">
                <UserCheck className="w-4.5 h-4.5 text-pink-600 dark:text-pink-400" /> Nama Operator / Pemeriksa
              </label>
              <input
                type="text"
                value={pemeriksa}
                onChange={e => setPemeriksa(e.target.value)}
                className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm focus:outline-none transition-all placeholder-slate-400 font-bold"
                placeholder="drg. Nama Pemeriksa / Operator"
                id="input-pemeriksa"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-950 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-pink-600 dark:text-pink-400" /> Tanggal Pemeriksaan
                </label>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Otomatis
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={tanggalInput}
                  onChange={e => handleExamDateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm focus:outline-none transition-all font-bold font-mono"
                  id="input-tanggal-pemeriksaan"
                />
                <button
                  type="button"
                  onClick={() => handleExamDateChange(new Date().toISOString().split('T')[0])}
                  title="Reset ke Hari Ini"
                  className="px-3 py-2.5 bg-pink-100 dark:bg-slate-800 hover:bg-pink-200 dark:hover:bg-slate-700 text-pink-800 dark:text-pink-200 font-black text-xs rounded-xl border border-pink-200 dark:border-slate-700 transition cursor-pointer shrink-0 flex items-center gap-1"
                >
                  Hari Ini
                </button>
              </div>
            </div>
          </div>

          {/* Identitas Card */}
          <div className="glass-panel rounded-3xl border border-pink-200 dark:border-pink-900/40 p-5 shadow-md space-y-4">
            <h3 className="text-sm font-black text-slate-950 dark:text-slate-100 border-b border-pink-200 dark:border-slate-800 pb-3 flex items-center gap-2 uppercase tracking-wider">
              <Smile className="w-5 h-5 text-pink-600 dark:text-pink-400" /> I. Identitas Responden
            </h3>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-1.5">Nama / Kode Responden</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm focus:outline-none transition-all placeholder-slate-400 font-bold"
                  placeholder="Nama Lengkap / Anonim"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-1.5">NIK (16 Digit - Opsional)</label>
                <input
                  type="text"
                  maxLength={16}
                  value={nik}
                  onChange={e => handleNikChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm focus:outline-none transition-all placeholder-slate-400 font-bold font-mono tracking-wider"
                  placeholder="3201xxxxxxxxxxxx"
                  id="input-nik"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" /> Tanggal Lahir Responden
                  </label>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                    <Sparkles className="w-2.5 h-2.5" /> Hitung Umur Otomatis
                  </span>
                </div>
                <input
                  type="date"
                  value={tanggalLahir}
                  onChange={e => handleDobChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm font-bold font-mono focus:outline-none transition-all"
                  id="input-tanggal-lahir"
                />
              </div>

              {/* Automatic Age Calculation Badge */}
              {umurLengkap ? (
                <div className="bg-gradient-to-r from-pink-100/90 to-rose-100/90 dark:from-slate-800/90 dark:to-pink-950/40 border border-pink-300/80 dark:border-pink-800/60 p-3 rounded-2xl flex items-center gap-3 shadow-xs">
                  <div className="p-2 bg-pink-500 text-white rounded-xl shadow-xs shrink-0">
                    <Cake className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-pink-950 dark:text-pink-200 tracking-wider">Umur Lengkap (Otomatis)</div>
                    <div className="text-xs font-black text-pink-900 dark:text-pink-100 font-mono mt-0.5">{umurLengkap}</div>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-1.5">Umur (Tahun)</label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    required
                    value={umur || ''}
                    onChange={e => {
                      const newAge = parseInt(e.target.value) || 0;
                      handleAgeChange(newAge);
                      if (!tanggalLahir) {
                        setUmurLengkap(`${newAge} tahun`);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm font-black font-mono focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-1.5">Jenis Kelamin</label>
                  <select
                    value={jenisKelamin}
                    onChange={e => setJenisKelamin(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm font-black focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-1.5">Pendidikan Terakhir / Orang Tua</label>
                <select
                  value={pendidikan}
                  onChange={e => setPendidikan(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm font-black focus:outline-none transition-all cursor-pointer"
                >
                  <option value="Tidak Sekolah">Tidak Sekolah / Belum Sekolah</option>
                  <option value="SD">SD / Sederajat</option>
                  <option value="SMP">SMP / Sederajat</option>
                  <option value="SMA">SMA / Sederajat</option>
                  <option value="Diploma">Diploma (D1/D2/D3)</option>
                  <option value="S1/D4">Sarjana / Diploma 4 (S1/D4)</option>
                  <option value="S2">Magister (S2)</option>
                  <option value="S3">Doktor (S3)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-1.5">Pekerjaan / Orang Tua</label>
                <select
                  value={pekerjaan}
                  onChange={e => setPekerjaan(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-950 dark:text-slate-100 text-sm font-black focus:outline-none transition-all cursor-pointer"
                >
                  <option value="TIDAK BEKERJA">Tidak Bekerja / Balita</option>
                  <option value="PELAJAR/MAHASISWA">Pelajar / Mahasiswa</option>
                  <option value="PEGAWAI SWASTA">Pegawai Swasta</option>
                  <option value="WIRASWASTA/WIRAUSAHA">Wiraswasta / Wirausaha</option>
                  <option value="PENGURUS/IBU RUMAH TANGGA">Pengurus Rumah Tangga / IRT</option>
                  <option value="ASN/PNS/PPPK">ASN / PNS / PPPK</option>
                  <option value="TNI/POLRI">TNI / POLRI</option>
                  <option value="PEGAWAI BUMN">Pegawai BUMN</option>
                  <option value="ASISTEN RUMAH TANGGA">Asisten Rumah Tangga</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mukosa & RTL Card */}
          <div className="glass-panel rounded-3xl border border-pink-200 dark:border-pink-900/40 p-5 shadow-md space-y-4">
            <h3 className="text-sm font-black text-slate-950 dark:text-slate-100 border-b border-pink-200 dark:border-slate-800 pb-3 flex items-center gap-2 uppercase tracking-wider">
              <HeartPulse className="w-5 h-5 text-rose-600" /> IV. Mukosa & Tindak Lanjut
            </h3>

            <div className="space-y-4">
              {/* Mukosa Checks */}
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-1.5">Keadaan Mukosa Oral</span>
                <label className="flex items-center gap-3 p-3 bg-white/80 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition duration-150 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={gusiBerdarah}
                    onChange={e => setGusiBerdarah(e.target.checked)}
                    className="w-4.5 h-4.5 rounded-md border-pink-300 text-pink-600 focus:ring-pink-500 bg-white"
                  />
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">Gusi Berdarah (BOP)</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/80 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition duration-150 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={lesiMukosaOral}
                    onChange={e => setLesiMukosaOral(e.target.checked)}
                    className="w-4.5 h-4.5 rounded-md border-pink-300 text-pink-600 focus:ring-pink-500 bg-white"
                  />
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">Lesi Mukosa Oral</span>
                </label>
              </div>

              {/* RTL Checks */}
              <div className="space-y-2 border-t border-pink-200 dark:border-slate-800 pt-4">
                <span className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-1.5">Rencana Perawatan Gigi</span>
                
                <label className="flex items-center gap-3 p-3 bg-white/80 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition duration-150 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={perluPerawatanSegera}
                    onChange={e => setPerluPerawatanSegera(e.target.checked)}
                    className="w-4.5 h-4.5 rounded-md border-pink-300 text-pink-600 focus:ring-pink-500 bg-white"
                  />
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">Perlu Perawatan Segera</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/80 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition duration-150 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={perluPerawatanTidakSegera}
                    onChange={e => setPerluPerawatanTidakSegera(e.target.checked)}
                    className="w-4.5 h-4.5 rounded-md border-pink-300 text-pink-600 focus:ring-pink-500 bg-white"
                  />
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">Perlu Perawatan Tidak Segera</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/80 dark:bg-slate-900/80 border border-pink-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition duration-150 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={perluDirujuk}
                    onChange={e => {
                      setPerluDirujuk(e.target.checked);
                      if (!e.target.checked) setDirujukKe('tidak_dirujuk');
                      else if (dirujukKe === 'tidak_dirujuk') setDirujukKe('puskesmas');
                    }}
                    className="w-4.5 h-4.5 rounded-md border-pink-300 text-pink-600 focus:ring-pink-500 bg-white"
                  />
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">Perlu Dirujuk</span>
                </label>

                {perluDirujuk && (
                  <div className="pl-6 pt-1 animate-fadeIn">
                    <label className="block text-[10px] font-black text-slate-800 dark:text-slate-300 mb-1.5 uppercase tracking-widest">Tempat Rujukan Terpilih</label>
                    <select
                      value={dirujukKe}
                      onChange={handleReferralChange}
                      className="w-full px-3 py-2 bg-white/90 dark:bg-slate-900/90 border border-pink-200 dark:border-slate-700 rounded-xl text-slate-950 dark:text-slate-100 text-xs font-black focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="puskesmas">Puskesmas Kecamatan</option>
                      <option value="rs_umum">Rumah Sakit Umum (RSUD)</option>
                      <option value="rsgm_rskgm">RS Gigi & Mulut (RSGM)</option>
                      <option value="klinik_pratama">Klinik Pratama</option>
                      <option value="klinik_utama">Klinik Utama</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Kolom 2 & 3 (Main): Odontogram & Summary Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visual Odontogram */}
          <Odontogram teethStatus={teethStatus} onChange={handleToothChange} />

          {/* Aggregates Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gigi Sulung Summary */}
            <div className="glass-panel rounded-3xl border border-pink-200 dark:border-pink-900/40 p-5 shadow-md space-y-4">
              <div className="border-b border-pink-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-950 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                  <Activity className="w-5 h-5 text-emerald-600" /> II. Gigi Sulung Summary
                </h3>
                <span className="bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 text-xs font-black font-mono px-2.5 py-1 rounded-xl">
                  def-t: {deft}
                </span>
              </div>

              <p className="text-[11px] text-slate-800 dark:text-slate-300 font-bold">Tabel rekapitulasi kondisi gigi sulung responden:</p>

              <div className="space-y-2">
                <ToothAdjuster label="Sehat" type="sulung" field="sehat" value={gigiSulung.sehat} />
                <ToothAdjuster label="Gigi Berlubang / Karies (d)" type="sulung" field="karies" value={gigiSulung.karies} />
                <ToothAdjuster label="Gigi Dicabut karena Karies (e)" type="sulung" field="dicabutKaries" value={gigiSulung.dicabutKaries} />
                <ToothAdjuster label="Tumpatan Tanpa Karies (f)" type="sulung" field="tumpatanTanpaKaries" value={gigiSulung.tumpatanTanpaKaries} />
                <ToothAdjuster label="Tumpatan Dengan Karies" type="sulung" field="tumpatanKaries" value={gigiSulung.tumpatanKaries} />
                
                <div className="border-t border-pink-200 dark:border-slate-800 my-3 pt-3">
                  <span className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-2.5">Parameter Lain</span>
                  <ToothAdjuster label="Dicabut Sebab Lain" type="sulung" field="dicabutSebabLain" value={gigiSulung.dicabutSebabLain} />
                  <ToothAdjuster label="Fissure Sealant" type="sulung" field="fissureSealant" value={gigiSulung.fissureSealant} />
                  <ToothAdjuster label="Protesa Cekat/Crown" type="sulung" field="protesaCekat" value={gigiSulung.protesaCekat} />
                  <ToothAdjuster label="Tidak Tumbuh" type="sulung" field="tidakTumbuh" value={gigiSulung.tidakTumbuh} />
                  <ToothAdjuster label="Lain-lain" type="sulung" field="lainLain" value={gigiSulung.lainLain} />
                </div>
              </div>
            </div>

            {/* Gigi Tetap Summary */}
            <div className="glass-panel rounded-3xl border border-pink-200 dark:border-pink-900/40 p-5 shadow-md space-y-4">
              <div className="border-b border-pink-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-950 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                  <ShieldAlert className="w-5 h-5 text-pink-600 dark:text-pink-400" /> III. Gigi Tetap Summary
                </h3>
                <span className="bg-pink-100 dark:bg-pink-950/80 border border-pink-300 dark:border-pink-800 text-pink-950 dark:text-pink-200 text-xs font-black font-mono px-2.5 py-1 rounded-xl">
                  DMF-T: {dmft}
                </span>
              </div>

              <p className="text-[11px] text-slate-800 dark:text-slate-300 font-bold">Tabel rekapitulasi kondisi gigi tetap responden:</p>

              <div className="space-y-2">
                <ToothAdjuster label="Sehat" type="tetap" field="sehat" value={gigiTetap.sehat} />
                <ToothAdjuster label="Gigi Berlubang / Karies (D)" type="tetap" field="karies" value={gigiTetap.karies} />
                <ToothAdjuster label="Gigi Dicabut karena Karies (M)" type="tetap" field="dicabutKaries" value={gigiTetap.dicabutKaries} />
                <ToothAdjuster label="Tumpatan Tanpa Karies (F)" type="tetap" field="tumpatanTanpaKaries" value={gigiTetap.tumpatanTanpaKaries} />
                <ToothAdjuster label="Tumpatan Dengan Karies" type="tetap" field="tumpatanKaries" value={gigiTetap.tumpatanKaries} />

                <div className="border-t border-pink-200 dark:border-slate-800 my-3 pt-3">
                  <span className="block text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-2.5">Parameter Lain</span>
                  <ToothAdjuster label="Dicabut Sebab Lain" type="tetap" field="dicabutSebabLain" value={gigiTetap.dicabutSebabLain} />
                  <ToothAdjuster label="Fissure Sealant" type="tetap" field="fissureSealant" value={gigiTetap.fissureSealant} />
                  <ToothAdjuster label="Protesa Cekat/Crown" type="tetap" field="protesaCekat" value={gigiTetap.protesaCekat} />
                  <ToothAdjuster label="Tidak Tumbuh" type="tetap" field="tidakTumbuh" value={gigiTetap.tidakTumbuh} />
                  <ToothAdjuster label="Lain-lain" type="tetap" field="lainLain" value={gigiTetap.lainLain} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit / Status Alert */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 glass-panel border border-pink-200 dark:border-pink-900/40 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800 p-2.5 rounded-2xl shadow-xs">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-black text-slate-950 dark:text-slate-100">Siap Menyimpan Responden?</h4>
            <p className="text-xs text-slate-800 dark:text-slate-300 font-bold">Data akan tersinkronisasi ke seluruh surveyor yang aktif secara real-time.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4.5 py-3 bg-white/90 dark:bg-slate-800 hover:bg-white text-slate-900 dark:text-slate-100 text-xs font-black rounded-xl border border-pink-200 dark:border-slate-700 shadow-xs cursor-pointer transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Reset Form
          </button>
          
          <button
            type="submit"
            id="submit-btn-form"
            disabled={saving}
            className="flex-2 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:from-pink-400 disabled:to-rose-400 text-white text-xs font-black rounded-xl shadow-lg shadow-pink-600/25 cursor-pointer transition-all uppercase tracking-wider"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Data'}
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-600 text-white border border-emerald-700 rounded-xl text-xs font-black shadow-md animate-pulse text-center" id="form-success-alert">
          ✓ Data survey responden berhasil diunggah ke Cloud Firestore!
        </div>
      )}
    </form>
  );
}
