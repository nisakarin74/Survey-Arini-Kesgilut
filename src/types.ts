export interface DeciduousTeethState {
  sehat: number;                     // Sehat
  karies: number;                    // Gigi Berlubang/Karies (d)
  dicabutKaries: number;             // Gigi dicabut karena karies (e)
  tumpatanKaries: number;            // Tumpatan dengan karies
  tumpatanTanpaKaries: number;       // Tumpatan tanpa karies (f)
  dicabutSebabLain: number;          // Gigi dicabut karena sebab lain
  fissureSealant: number;            // Fissure Sealant
  protesaCekat: number;              // Protesa cekat/mahkota cekat/implan/veneer
  tidakTumbuh: number;               // Gigi tidak tumbuh
  lainLain: number;                  // Lain-lain
}

export interface PermanentTeethState {
  sehat: number;                     // Sehat
  karies: number;                    // Gigi Berlubang/Karies (D)
  dicabutKaries: number;             // Gigi dicabut karena karies (M)
  tumpatanKaries: number;            // Tumpatan dengan karies
  tumpatanTanpaKaries: number;       // Tumpatan tanpa karies (F)
  dicabutSebabLain: number;          // Gigi dicabut karena sebab lain
  fissureSealant: number;            // Fissure Sealant
  protesaCekat: number;              // Protesa cekat/mahkota cekat/implan/veneer
  tidakTumbuh: number;               // Gigi tidak tumbuh
  lainLain: number;                  // Lain-lain
}

export interface OHISToothDebrisCalculus {
  isPrimaryUsed?: boolean; // true if using primary tooth replacement (55, 51, 65, 75, 71, 85)
  debrisScore: number;     // 0, 1, 2, 3
  calculusScore: number;   // 0, 1, 2, 3
}

export interface AIPlaqueAnalysisResult {
  timestamp: string;
  imageUrl?: string;
  plaquePercentage: number;          // 0-100%
  debrisIndexScore: number;          // 0, 1, 2, or 3
  kategoriKebersihan: 'Baik' | 'Sedang' | 'Buruk';
  indexTeethScores: {
    gigi16: number;
    gigi11: number;
    gigi26: number;
    gigi36: number;
    gigi31: number;
    gigi46: number;
  };
  areaDistribution: {
    servikalPct: number;
    tengahPct: number;
    insisalPct: number;
  };
  kalibrasiPTUPT: string;            // Standar Kalibrasi Modifikasi Plak Indeks PTUPT Kemenkes RI
  rekomendasiEdukasi: string[];
}

export interface OHISState {
  tooth16_55: OHISToothDebrisCalculus; // 16 (Bukal) / 55 (Bukal)
  tooth11_51: OHISToothDebrisCalculus; // 11 (Labial) / 51 (Labial)
  tooth26_65: OHISToothDebrisCalculus; // 26 (Bukal) / 65 (Bukal)
  tooth36_75: OHISToothDebrisCalculus; // 36 (Lingual) / 75 (Lingual)
  tooth31_71: OHISToothDebrisCalculus; // 31 (Labial) / 71 (Labial)
  tooth46_85: OHISToothDebrisCalculus; // 46 (Lingual) / 85 (Lingual)
  
  disScore: number; // Mean debris index score (0-3.0)
  cisScore: number; // Mean calculus index score (0-3.0)
  ohisScore: number; // disScore + cisScore (0-6.0)
  kategori: 'Baik' | 'Sedang' | 'Buruk'; // Baik: 0.0-1.2, Sedang: 1.3-3.0, Buruk: 3.1-6.0
  aiPlaqueAnalysis?: AIPlaqueAnalysisResult;
}

export interface MukosaState {
  gusiBerdarah: boolean;             // Gusi berdarah
  lesiMukosaOral: boolean;           // Lesi Mukosa Oral
}

export interface TindakLanjutState {
  perluPerawatanSegera: boolean;     // Perlu perawatan segera
  perluPerawatanTidakSegera: boolean; // Perlu perawatan tidak segera
  perluDirujuk: boolean;             // Perlu dirujuk
  dirujukKe: 'puskesmas' | 'rs_umum' | 'rsgm_rskgm' | 'klinik_pratama' | 'klinik_utama' | 'tidak_dirujuk';
}

export interface RespondentData {
  id?: string;
  nik?: string;
  pemeriksa?: string;
  nama: string;
  tanggalInput: string; // ISO String or YYYY-MM-DD
  tanggalLahir?: string; // YYYY-MM-DD
  umurLengkap?: string; // e.g. "17 tahun 3 bulan 15 hari"
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  umur: number;
  kelompokUmur: '5-10' | '10-18' | '18-60' | '60+'; // 'Antara 5-10 tahun', 'Antara 10-18 tahun', 'Antara 18-60 tahun', '60 tahun ke atas'
  pendidikan: 'SD' | 'SMP' | 'SMA' | 'Diploma' | 'S1/D4' | 'S2' | 'S3' | 'Tidak Sekolah';
  pekerjaan: 'ASN/PNS/PPPK' | 'TNI/POLRI' | 'PEGAWAI BUMN' | 'PEGAWAI SWASTA' | 'WIRASWASTA/WIRAUSAHA' | 'PELAJAR/MAHASISWA' | 'PENGURUS/IBU RUMAH TANGGA' | 'ASISTEN RUMAH TANGGA' | 'TIDAK BEKERJA';
  
  // Dental states
  gigiSulung: DeciduousTeethState;
  gigiTetap: PermanentTeethState;
  teethStatus?: Record<string, string>;
  
  // Indices (calculated)
  deft: number; // d + e + f
  dmft: number; // D + M + F
  ohis?: OHISState; // OHI-S Debris & Calculus Indices State
  aiPlaqueAnalysis?: AIPlaqueAnalysisResult; // Hasil Deteksi AI CNN Plak & Debris Kemenkes RI
  
  // Mukosa & RTL
  mukosa: MukosaState;
  tindakLanjut: TindakLanjutState;
  
  // Metadata
  createdBy: string; // User email or "Anonim"
  createdAt: any;    // Firestore Timestamp or Date
}

export interface SurveySession {
  id: string;
  name: string;
  passcode: string;
  createdAt: any;
  createdBy: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'dentist' | 'surveyor';
}
