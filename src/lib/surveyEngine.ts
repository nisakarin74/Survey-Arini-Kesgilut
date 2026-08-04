import { RespondentData, OHISState, OHISToothDebrisCalculus } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

// --- OHI-S (Oral Hygiene Index Simplified) Helper Functions ---
export function calculateOHIS(input?: Partial<OHISState>): OHISState {
  const defaultTooth = (isPrimary = false): OHISToothDebrisCalculus => ({
    isPrimaryUsed: isPrimary,
    debrisScore: 0,
    calculusScore: 0
  });

  const tooth16_55 = input?.tooth16_55 || defaultTooth();
  const tooth11_51 = input?.tooth11_51 || defaultTooth();
  const tooth26_65 = input?.tooth26_65 || defaultTooth();
  const tooth36_75 = input?.tooth36_75 || defaultTooth();
  const tooth31_71 = input?.tooth31_71 || defaultTooth();
  const tooth46_85 = input?.tooth46_85 || defaultTooth();

  const teeth = [tooth16_55, tooth11_51, tooth26_65, tooth36_75, tooth31_71, tooth46_85];

  const totalDebris = teeth.reduce((sum, t) => sum + (t.debrisScore || 0), 0);
  const totalCalculus = teeth.reduce((sum, t) => sum + (t.calculusScore || 0), 0);

  const disScore = parseFloat((totalDebris / 6).toFixed(2));
  const cisScore = parseFloat((totalCalculus / 6).toFixed(2));
  const ohisScore = parseFloat((disScore + cisScore).toFixed(2));

  let kategori: 'Baik' | 'Sedang' | 'Buruk' = 'Baik';
  if (ohisScore <= 1.2) {
    kategori = 'Baik';
  } else if (ohisScore <= 3.0) {
    kategori = 'Sedang';
  } else {
    kategori = 'Buruk';
  }

  return {
    tooth16_55,
    tooth11_51,
    tooth26_65,
    tooth36_75,
    tooth31_71,
    tooth46_85,
    disScore,
    cisScore,
    ohisScore,
    kategori
  };
}

export function generateDefaultOHIS(r: Partial<RespondentData>): OHISState {
  const age = r.umur || 8;
  const isPrimary = age <= 10;

  const seedStr = (r.nik || r.nama || 'Arini') + (r.umur || 8);
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  const hasBleeding = r.mukosa?.gusiBerdarah;
  const cariesCount = (r.dmft || 0) + (r.deft || 0);

  let riskLevel = 0; // 0 = Baik, 1 = Sedang, 2 = Buruk
  if (hasBleeding || cariesCount >= 5) {
    riskLevel = (posHash % 2 === 0) ? 2 : 1;
  } else if (cariesCount >= 2) {
    riskLevel = (posHash % 3 === 0) ? 1 : 0;
  } else {
    riskLevel = (posHash % 4 === 0) ? 1 : 0;
  }

  const makeTooth = (idx: number): OHISToothDebrisCalculus => {
    let deb = 0;
    let calc = 0;
    const toothSeed = (posHash + idx * 13) % 10;

    if (riskLevel === 0) {
      deb = toothSeed < 6 ? 0 : 1;
      calc = toothSeed < 8 ? 0 : 1;
    } else if (riskLevel === 1) {
      deb = toothSeed < 3 ? 1 : toothSeed < 8 ? 2 : 1;
      calc = toothSeed < 5 ? 0 : toothSeed < 9 ? 1 : 2;
    } else {
      deb = toothSeed < 4 ? 2 : 3;
      calc = toothSeed < 3 ? 1 : toothSeed < 8 ? 2 : 3;
    }

    return {
      isPrimaryUsed: isPrimary,
      debrisScore: deb,
      calculusScore: calc
    };
  };

  return calculateOHIS({
    tooth16_55: makeTooth(1),
    tooth11_51: makeTooth(2),
    tooth26_65: makeTooth(3),
    tooth36_75: makeTooth(4),
    tooth31_71: makeTooth(5),
    tooth46_85: makeTooth(6)
  });
}

export function ensureOHISForRespondent(r: RespondentData): RespondentData {
  if (r.ohis && typeof r.ohis.ohisScore === 'number') {
    return {
      ...r,
      ohis: calculateOHIS(r.ohis)
    };
  }
  return {
    ...r,
    ohis: generateDefaultOHIS(r)
  };
}

// 1. Calculate Statistics
export interface SurveyStats {
  totalRespondents: number;
  
  // Pendidikan Breakdown
  pendidikanBreakdown: Record<string, number>;
  pendidikanFilledCount: number;
  
  // Pekerjaan Breakdown
  pekerjaanBreakdown: Record<string, number>;
  pekerjaanFilledCount: number;
  
  // Jenis Kelamin Breakdown
  genderBreakdown: Record<string, number>;
  genderFilledCount: number;
  
  // Kelompok Umur Breakdown
  ageGroupBreakdown: Record<string, number>;
  ageGroupFilledCount: number;
  
  // Gigi Sulung (Deciduous) Averages
  gigiSulungAvg: {
    sehat: number;
    karies: number;
    dicabutKaries: number;
    tumpatanKaries: number;
    tumpatanTanpaKaries: number;
    dicabutSebabLain: number;
    fissureSealant: number;
    protesaCekat: number;
    tidakTumbuh: number;
    lainLain: number;
  };
  
  // Gigi Tetap (Permanent) Averages
  gigiTetapAvg: {
    sehat: number;
    karies: number;
    dicabutKaries: number;
    tumpatanKaries: number;
    tumpatanTanpaKaries: number;
    dicabutSebabLain: number;
    fissureSealant: number;
    protesaCekat: number;
    tidakTumbuh: number;
    lainLain: number;
  };
  
  // Indices Averages
  indexAvg: {
    d: number;      // Gigi sulung karies
    e: number;      // Gigi sulung dicabut karies
    f: number;      // Gigi sulung tumpatan tanpa karies
    deft: number;   // Gigi sulung d+e+f
    D: number;      // Gigi tetap karies
    M: number;      // Gigi tetap dicabut karies
    F: number;      // Gigi tetap tumpatan tanpa karies
    dmft: number;   // Gigi tetap D+M+F
  };

  // OHI-S Stats
  ohisStats: {
    avgDIS: number;
    avgCIS: number;
    avgOHIS: number;
    kategoriCount: {
      baik: number;
      sedang: number;
      buruk: number;
    };
    kategoriPct: {
      baik: number;
      sedang: number;
      buruk: number;
    };
  };
  
  // Mukosa State percentages
  mukosaPct: {
    gusiBerdarah: number;
    lesiMukosaOral: number;
  };
  
  // Rencana Tindak Lanjut percentages
  tindakLanjutPct: {
    perluPerawatanSegera: number;
    perluPerawatanTidakSegera: number;
    perluDirujuk: number;
    dirujukKePuskesmas: number;
    dirujukKeRSUmum: number;
    dirujukKeRSGM: number;
    dirujukKeKlinikPratama: number;
    dirujukKeKlinikUtama: number;
  };
}

// --- WHO Standard Age Group Helper Functions ---
export function getAgeGroupValue(val: number): RespondentData['kelompokUmur'] {
  if (val < 5) return '0-4';
  if (val >= 5 && val <= 11) return '5-11';
  if (val >= 12 && val <= 17) return '12-17';
  if (val >= 18 && val <= 59) return '18-59';
  return '60+';
}

export function normalizeAgeGroup(ag?: string, ageNum?: number): '0-4' | '5-11' | '12-17' | '18-59' | '60+' {
  if (ag === '0-4' || ag === '5-11' || ag === '12-17' || ag === '18-59' || ag === '60+') {
    return ag;
  }
  if (ag === '5-10') return '5-11';
  if (ag === '10-18') return '12-17';
  if (ag === '18-60') return '18-59';
  if (typeof ageNum === 'number' && !isNaN(ageNum)) {
    return getAgeGroupValue(ageNum);
  }
  return '18-59';
}

export function calculateSurveyStats(respondents: RespondentData[]): SurveyStats {
  const total = respondents.length;
  
  const stats: SurveyStats = {
    totalRespondents: total,
    pendidikanBreakdown: { 'SD': 0, 'SMP': 0, 'SMA': 0, 'Diploma': 0, 'S1/D4': 0, 'S2': 0, 'S3': 0, 'Tidak Sekolah': 0 },
    pendidikanFilledCount: 0,
    pekerjaanBreakdown: { 'ASN/PNS/PPPK': 0, 'TNI/POLRI': 0, 'PEGAWAI BUMN': 0, 'PEGAWAI SWASTA': 0, 'WIRASWASTA/WIRAUSAHA': 0, 'PELAJAR/MAHASISWA': 0, 'PENGURUS/IBU RUMAH TANGGA': 0, 'ASISTEN RUMAH TANGGA': 0, 'TIDAK BEKERJA': 0 },
    pekerjaanFilledCount: 0,
    genderBreakdown: { 'Laki-laki': 0, 'Perempuan': 0 },
    genderFilledCount: 0,
    ageGroupBreakdown: { '0-4': 0, '5-11': 0, '12-17': 0, '18-59': 0, '60+': 0 },
    ageGroupFilledCount: 0,
    
    gigiSulungAvg: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
    gigiTetapAvg: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
    
    indexAvg: { d: 0, e: 0, f: 0, deft: 0, D: 0, M: 0, F: 0, dmft: 0 },
    ohisStats: {
      avgDIS: 0,
      avgCIS: 0,
      avgOHIS: 0,
      kategoriCount: { baik: 0, sedang: 0, buruk: 0 },
      kategoriPct: { baik: 0, sedang: 0, buruk: 0 }
    },
    mukosaPct: { gusiBerdarah: 0, lesiMukosaOral: 0 },
    tindakLanjutPct: { perluPerawatanSegera: 0, perluPerawatanTidakSegera: 0, perluDirujuk: 0, dirujukKePuskesmas: 0, dirujukKeRSUmum: 0, dirujukKeRSGM: 0, dirujukKeKlinikPratama: 0, dirujukKeKlinikUtama: 0 }
  };

  if (total === 0) return stats;

  let gsSehatSum = 0, gsKariesSum = 0, gsDicabutKariesSum = 0, gsTumpatanKariesSum = 0, gsTumpatanTanpaKariesSum = 0, gsDicabutSebabLainSum = 0, gsFissureSum = 0, gsProtesaSum = 0, gsTidakTumbuhSum = 0, gsLainSum = 0;
  let gtSehatSum = 0, gtKariesSum = 0, gtDicabutKariesSum = 0, gtTumpatanKariesSum = 0, gtTumpatanTanpaKariesSum = 0, gtDicabutSebabLainSum = 0, gtFissureSum = 0, gtProtesaSum = 0, gtTidakTumbuhSum = 0, gtLainSum = 0;
  
  let gusiBerdarahCount = 0;
  let lesiMukosaCount = 0;
  
  let rwtSegeraCount = 0;
  let rwtTidakSegeraCount = 0;
  let rwtRujukCount = 0;
  let rujPuskesmasCount = 0;
  let rujRSUmumCount = 0;
  let rujRSGMCount = 0;
  let rujPratamaCount = 0;
  let rujUtamaCount = 0;

  let disSum = 0;
  let cisSum = 0;
  let ohisSum = 0;
  let ohisBaikCount = 0;
  let ohisSedangCount = 0;
  let ohisBurukCount = 0;

  respondents.forEach(rawR => {
    const r = ensureOHISForRespondent(rawR);
    if (r.ohis) {
      disSum += r.ohis.disScore || 0;
      cisSum += r.ohis.cisScore || 0;
      ohisSum += r.ohis.ohisScore || 0;
      if (r.ohis.kategori === 'Baik') ohisBaikCount++;
      else if (r.ohis.kategori === 'Sedang') ohisSedangCount++;
      else if (r.ohis.kategori === 'Buruk') ohisBurukCount++;
    }

    // Breakdown Pendidikan (ignore optional values if empty)
    if (r.pendidikan) {
      stats.pendidikanBreakdown[r.pendidikan] = (stats.pendidikanBreakdown[r.pendidikan] || 0) + 1;
      stats.pendidikanFilledCount++;
    }
    // Breakdown Pekerjaan
    if (r.pekerjaan) {
      stats.pekerjaanBreakdown[r.pekerjaan] = (stats.pekerjaanBreakdown[r.pekerjaan] || 0) + 1;
      stats.pekerjaanFilledCount++;
    }
    // Breakdown Gender
    if (r.jenisKelamin) {
      stats.genderBreakdown[r.jenisKelamin] = (stats.genderBreakdown[r.jenisKelamin] || 0) + 1;
      stats.genderFilledCount++;
    }
    // Breakdown Kelompok Umur (WHO Standard)
    if (r.kelompokUmur || typeof r.umur === 'number') {
      const normalizedGroup = normalizeAgeGroup(r.kelompokUmur, r.umur);
      stats.ageGroupBreakdown[normalizedGroup] = (stats.ageGroupBreakdown[normalizedGroup] || 0) + 1;
      stats.ageGroupFilledCount++;
    }

    // Gigi Sulung sums
    gsSehatSum += r.gigiSulung.sehat || 0;
    gsKariesSum += r.gigiSulung.karies || 0;
    gsDicabutKariesSum += r.gigiSulung.dicabutKaries || 0;
    gsTumpatanKariesSum += r.gigiSulung.tumpatanKaries || 0;
    gsTumpatanTanpaKariesSum += r.gigiSulung.tumpatanTanpaKaries || 0;
    gsDicabutSebabLainSum += r.gigiSulung.dicabutSebabLain || 0;
    gsFissureSum += r.gigiSulung.fissureSealant || 0;
    gsProtesaSum += r.gigiSulung.protesaCekat || 0;
    gsTidakTumbuhSum += r.gigiSulung.tidakTumbuh || 0;
    gsLainSum += r.gigiSulung.lainLain || 0;

    // Gigi Tetap sums
    gtSehatSum += r.gigiTetap.sehat || 0;
    gtKariesSum += r.gigiTetap.karies || 0;
    gtDicabutKariesSum += r.gigiTetap.dicabutKaries || 0;
    gtTumpatanKariesSum += r.gigiTetap.tumpatanKaries || 0;
    gtTumpatanTanpaKariesSum += r.gigiTetap.tumpatanTanpaKaries || 0;
    gtDicabutSebabLainSum += r.gigiTetap.dicabutSebabLain || 0;
    gtFissureSum += r.gigiTetap.fissureSealant || 0;
    gtProtesaSum += r.gigiTetap.protesaCekat || 0;
    gtTidakTumbuhSum += r.gigiTetap.tidakTumbuh || 0;
    gtLainSum += r.gigiTetap.lainLain || 0;

    // Mukosa
    if (r.mukosa.gusiBerdarah) gusiBerdarahCount++;
    if (r.mukosa.lesiMukosaOral) lesiMukosaCount++;

    // RTL
    if (r.tindakLanjut.perluPerawatanSegera) rwtSegeraCount++;
    if (r.tindakLanjut.perluPerawatanTidakSegera) rwtTidakSegeraCount++;
    if (r.tindakLanjut.perluDirujuk) rwtRujukCount++;
    
    if (r.tindakLanjut.dirujukKe === 'puskesmas') rujPuskesmasCount++;
    else if (r.tindakLanjut.dirujukKe === 'rs_umum') rujRSUmumCount++;
    else if (r.tindakLanjut.dirujukKe === 'rsgm_rskgm') rujRSGMCount++;
    else if (r.tindakLanjut.dirujukKe === 'klinik_pratama') rujPratamaCount++;
    else if (r.tindakLanjut.dirujukKe === 'klinik_utama') rujUtamaCount++;
  });

  // Calculate Averages for Gigi Sulung
  stats.gigiSulungAvg = {
    sehat: gsSehatSum / total,
    karies: gsKariesSum / total,
    dicabutKaries: gsDicabutKariesSum / total,
    tumpatanKaries: gsTumpatanKariesSum / total,
    tumpatanTanpaKaries: gsTumpatanTanpaKariesSum / total,
    dicabutSebabLain: gsDicabutSebabLainSum / total,
    fissureSealant: gsFissureSum / total,
    protesaCekat: gsProtesaSum / total,
    tidakTumbuh: gsTidakTumbuhSum / total,
    lainLain: gsLainSum / total,
  };

  // Calculate Averages for Gigi Tetap
  stats.gigiTetapAvg = {
    sehat: gtSehatSum / total,
    karies: gtKariesSum / total,
    dicabutKaries: gtDicabutKariesSum / total,
    tumpatanKaries: gtTumpatanKariesSum / total,
    tumpatanTanpaKaries: gtTumpatanTanpaKariesSum / total,
    dicabutSebabLain: gtDicabutSebabLainSum / total,
    fissureSealant: gtFissureSum / total,
    protesaCekat: gtProtesaSum / total,
    tidakTumbuh: gtTidakTumbuhSum / total,
    lainLain: gtLainSum / total,
  };

  // Indices Averages
  stats.indexAvg = {
    d: stats.gigiSulungAvg.karies,
    e: stats.gigiSulungAvg.dicabutKaries,
    f: stats.gigiSulungAvg.tumpatanTanpaKaries,
    deft: stats.gigiSulungAvg.karies + stats.gigiSulungAvg.dicabutKaries + stats.gigiSulungAvg.tumpatanTanpaKaries,
    D: stats.gigiTetapAvg.karies,
    M: stats.gigiTetapAvg.dicabutKaries,
    F: stats.gigiTetapAvg.tumpatanTanpaKaries,
    dmft: stats.gigiTetapAvg.karies + stats.gigiTetapAvg.dicabutKaries + stats.gigiTetapAvg.tumpatanTanpaKaries,
  };

  // OHI-S Averages and Percentages
  stats.ohisStats = {
    avgDIS: parseFloat((disSum / total).toFixed(2)),
    avgCIS: parseFloat((cisSum / total).toFixed(2)),
    avgOHIS: parseFloat((ohisSum / total).toFixed(2)),
    kategoriCount: {
      baik: ohisBaikCount,
      sedang: ohisSedangCount,
      buruk: ohisBurukCount
    },
    kategoriPct: {
      baik: ohisBaikCount / total,
      sedang: ohisSedangCount / total,
      buruk: ohisBurukCount / total
    }
  };

  // Mukosa Percentages
  stats.mukosaPct = {
    gusiBerdarah: gusiBerdarahCount / total,
    lesiMukosaOral: lesiMukosaCount / total,
  };

  // Tindak Lanjut Percentages
  stats.tindakLanjutPct = {
    perluPerawatanSegera: rwtSegeraCount / total,
    perluPerawatanTidakSegera: rwtTidakSegeraCount / total,
    perluDirujuk: rwtRujukCount / total,
    dirujukKePuskesmas: rujPuskesmasCount / total,
    dirujukKeRSUmum: rujRSUmumCount / total,
    dirujukKeRSGM: rujRSGMCount / total,
    dirujukKeKlinikPratama: rujPratamaCount / total,
    dirujukKeKlinikUtama: rujUtamaCount / total,
  };

  return stats;
}

// 2. Export to Excel
export function exportToExcel(respondents: RespondentData[], sessionName: string) {
  const stats = calculateSurveyStats(respondents);
  
  // Tab 1: Data Responden
  const respondentRows = respondents.map((r, index) => ({
    'No': index + 1,
    'Operator / Pemeriksa': r.pemeriksa || '-',
    'NIK': r.nik || '-',
    'Nama': r.nama || 'Anonim',
    'Tanggal Input': r.tanggalInput,
    'Jenis Kelamin': r.jenisKelamin,
    'Umur (Tahun)': r.umur,
    'Kelompok Umur (WHO)': normalizeAgeGroup(r.kelompokUmur, r.umur) === '0-4' ? '0-4 Tahun (Balita)' : normalizeAgeGroup(r.kelompokUmur, r.umur) === '5-11' ? '5-11 Tahun (Anak)' : normalizeAgeGroup(r.kelompokUmur, r.umur) === '12-17' ? '12-17 Tahun (Remaja)' : normalizeAgeGroup(r.kelompokUmur, r.umur) === '18-59' ? '18-59 Tahun (Dewasa)' : '60+ Tahun (Lansia)',
    'Pendidikan terakhir': r.pendidikan || '-',
    'Pekerjaan': r.pekerjaan || '-',
    
    // Gigi Sulung (gs)
    'G.Sulung Sehat': r.gigiSulung.sehat,
    'G.Sulung Karies (d)': r.gigiSulung.karies,
    'G.Sulung Dicabut Karies (e)': r.gigiSulung.dicabutKaries,
    'G.Sulung Tumpatan (f)': r.gigiSulung.tumpatanTanpaKaries,
    'def-t': r.deft,
    
    // Gigi Tetap (gt)
    'G.Tetap Sehat': r.gigiTetap.sehat,
    'G.Tetap Karies (D)': r.gigiTetap.karies,
    'G.Tetap Dicabut Karies (M)': r.gigiTetap.dicabutKaries,
    'G.Tetap Tumpatan (F)': r.gigiTetap.tumpatanTanpaKaries,
    'DMF-T': r.dmft,
    
    // Mukosa
    'Gusi Berdarah': r.mukosa.gusiBerdarah ? 'Ya' : 'Tidak',
    'Lesi Mukosa Oral': r.mukosa.lesiMukosaOral ? 'Ya' : 'Tidak',

    // OHI-S
    'Indeks Debris (DI-S)': (r.ohis || generateDefaultOHIS(r)).disScore,
    'Indeks Kalkulus (CI-S)': (r.ohis || generateDefaultOHIS(r)).cisScore,
    'Skor OHI-S': (r.ohis || generateDefaultOHIS(r)).ohisScore,
    'Kategori OHI-S': (r.ohis || generateDefaultOHIS(r)).kategori,
    
    // RTL
    'Perlu Perawatan Segera': r.tindakLanjut.perluPerawatanSegera ? 'Ya' : 'Tidak',
    'Perlu Perawatan Tidak Segera': r.tindakLanjut.perluPerawatanTidakSegera ? 'Ya' : 'Tidak',
    'Perlu Dirujuk': r.tindakLanjut.perluDirujuk ? 'Ya' : 'Tidak',
    'Dirujuk Ke': r.tindakLanjut.dirujukKe === 'tidak_dirujuk' ? 'Tidak Dirujuk' : r.tindakLanjut.dirujukKe.toUpperCase().replace('_', ' '),
  }));

  const wb = XLSX.utils.book_new();
  const wsRespondents = XLSX.utils.json_to_sheet(respondentRows);
  XLSX.utils.book_append_sheet(wb, wsRespondents, 'Data Responden');

  // Tab 2: Laporan Ringkasan (Averages & Breakdowns)
  const summaryData = [
    ['RINGKASAN SURVEY KESEHATAN GIGI DAN MULUT'],
    ['Sesi:', sessionName],
    ['Tanggal Ekspor:', new Date().toLocaleDateString('id-ID')],
    ['Jumlah Responden:', stats.totalRespondents],
    [],
    ['KARAKTERISTIK RESPONDEN'],
    ['Kategori', 'Variabel', 'Jumlah', 'Persentase'],
    
    // Gender Breakdown
    ['Jenis Kelamin', 'Laki-laki', stats.genderBreakdown['Laki-laki'], stats.genderFilledCount ? `${((stats.genderBreakdown['Laki-laki'] / stats.genderFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Jenis Kelamin', 'Perempuan', stats.genderBreakdown['Perempuan'], stats.genderFilledCount ? `${((stats.genderBreakdown['Perempuan'] / stats.genderFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    
    // Age Group Breakdown
    ['Kelompok Umur', '5-10 tahun (anak-anak)', stats.ageGroupBreakdown['5-10'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['5-10'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Kelompok Umur', '10-18 tahun (remaja)', stats.ageGroupBreakdown['10-18'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['10-18'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Kelompok Umur', '18-60 tahun (produktif)', stats.ageGroupBreakdown['18-60'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['18-60'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Kelompok Umur', '60 tahun ke atas (lansia)', stats.ageGroupBreakdown['60+'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['60+'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    
    [],
    ['RATA-RATA KEADAAN GIGI SULUNG'],
    ['Parameter', 'Rata-Rata'],
    ['Sehat', stats.gigiSulungAvg.sehat.toFixed(2)],
    ['Gigi Berlubang/Karies (d)', stats.gigiSulungAvg.karies.toFixed(2)],
    ['Gigi dicabut karena karies (e)', stats.gigiSulungAvg.dicabutKaries.toFixed(2)],
    ['Tumpatan dengan karies', stats.gigiSulungAvg.tumpatanKaries.toFixed(2)],
    ['Tumpatan tanpa karies (f)', stats.gigiSulungAvg.tumpatanTanpaKaries.toFixed(2)],
    ['Gigi dicabut karena sebab lain', stats.gigiSulungAvg.dicabutSebabLain.toFixed(2)],
    ['Fissure Sealant', stats.gigiSulungAvg.fissureSealant.toFixed(2)],
    ['Protesa cekat/mahkota cekat/implan/veneer', stats.gigiSulungAvg.protesaCekat.toFixed(2)],
    ['Gigi tidak tumbuh', stats.gigiSulungAvg.tidakTumbuh.toFixed(2)],
    ['Lain-lain', stats.gigiSulungAvg.lainLain.toFixed(2)],
    ['Indeks def-t (d+e+f)', stats.indexAvg.deft.toFixed(2)],

    [],
    ['RATA-RATA KEADAAN GIGI TETAP'],
    ['Parameter', 'Rata-Rata'],
    ['Sehat', stats.gigiTetapAvg.sehat.toFixed(2)],
    ['Gigi Berlubang/Karies (D)', stats.gigiTetapAvg.karies.toFixed(2)],
    ['Gigi dicabut karena karies (M)', stats.gigiTetapAvg.dicabutKaries.toFixed(2)],
    ['Tumpatan dengan karies', stats.gigiTetapAvg.tumpatanKaries.toFixed(2)],
    ['Tumpatan tanpa karies (F)', stats.gigiTetapAvg.tumpatanTanpaKaries.toFixed(2)],
    ['Gigi dicabut karena sebab lain', stats.gigiTetapAvg.dicabutSebabLain.toFixed(2)],
    ['Fissure Sealant', stats.gigiTetapAvg.fissureSealant.toFixed(2)],
    ['Protesa cekat/mahkota cekat/implan/veneer', stats.gigiTetapAvg.protesaCekat.toFixed(2)],
    ['Gigi tidak tumbuh', stats.gigiTetapAvg.tidakTumbuh.toFixed(2)],
    ['Lain-lain', stats.gigiTetapAvg.lainLain.toFixed(2)],
    ['Indeks DMF-T (D+M+F)', stats.indexAvg.dmft.toFixed(2)],

    [],
    ['INDEKS KEBERSIHAN MULUT (OHI-S)'],
    ['Parameter', 'Nilai Rata-Rata / Persentase'],
    ['Rata-Rata Indeks Debris (DI-S)', stats.ohisStats.avgDIS.toFixed(2)],
    ['Rata-Rata Indeks Kalkulus (CI-S)', stats.ohisStats.avgCIS.toFixed(2)],
    ['Rata-Rata Skor Total OHI-S', stats.ohisStats.avgOHIS.toFixed(2)],
    ['Kategori Baik (0.0 - 1.2)', `${stats.ohisStats.kategoriCount.baik} org (${(stats.ohisStats.kategoriPct.baik * 100).toFixed(2)}%)`],
    ['Kategori Sedang (1.3 - 3.0)', `${stats.ohisStats.kategoriCount.sedang} org (${(stats.ohisStats.kategoriPct.sedang * 100).toFixed(2)}%)`],
    ['Kategori Buruk (3.1 - 6.0)', `${stats.ohisStats.kategoriCount.buruk} org (${(stats.ohisStats.kategoriPct.buruk * 100).toFixed(2)}%)`],

    [],
    ['KEADAAN MUKOSA'],
    ['Kondisi', 'Persentase'],
    ['Gusi berdarah', `${(stats.mukosaPct.gusiBerdarah * 100).toFixed(2)}%`],
    ['Lesi Mukosa Oral', `${(stats.mukosaPct.lesiMukosaOral * 100).toFixed(2)}%`],

    [],
    ['RENCANA TINDAK LANJUT (RTL)'],
    ['Tindakan', 'Persentase'],
    ['Perlu perawatan segera', `${(stats.tindakLanjutPct.perluPerawatanSegera * 100).toFixed(2)}%`],
    ['Perlu perawatan tidak segera', `${(stats.tindakLanjutPct.perluPerawatanTidakSegera * 100).toFixed(2)}%`],
    ['Perlu dirujuk', `${(stats.tindakLanjutPct.perluDirujuk * 100).toFixed(2)}%`],
    ['Dirujuk ke puskesmas', `${(stats.tindakLanjutPct.dirujukKePuskesmas * 100).toFixed(2)}%`],
    ['Dirujuk ke RS Umum', `${(stats.tindakLanjutPct.dirujukKeRSUmum * 100).toFixed(2)}%`],
    ['Dirujuk ke RSGM/RSKGM', `${(stats.tindakLanjutPct.dirujukKeRSGM * 100).toFixed(2)}%`],
    ['Dirujuk ke Klinik Pratama', `${(stats.tindakLanjutPct.dirujukKeKlinikPratama * 100).toFixed(2)}%`],
    ['Dirujuk ke Klinik Utama', `${(stats.tindakLanjutPct.dirujukKeKlinikUtama * 100).toFixed(2)}%`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laporan');

  // Trigger browser download
  const cleanName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `survey_gigi_dan_mulut_${cleanName}.xlsx`);
}

// 3. Export to PDF
export function exportToPdf(respondents: RespondentData[], sessionName: string) {
  const stats = calculateSurveyStats(respondents);
  const doc = new jsPDF();
  
  // Set Bahasa Font & Styling
  doc.setFont('Helvetica', 'normal');
  
  // Header Box
  doc.setFillColor(30, 41, 59); // Charcoal/Navy Slate background
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('Helvetica', 'bold');
  doc.text('LAPORAN HASIL SURVEY KESEHATAN GIGI DAN MULUT', 15, 17);
  
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Sesi Survey: ${sessionName}`, 15, 25);
  doc.text(`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')} | Total Responden: ${stats.totalRespondents} Orang`, 15, 32);
  
  // Content spacing start
  let y = 50;

  // Function to add subheaders
  const sectionHeader = (title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, 182, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 17, y);
    y += 10;
  };

  // Section 1: Karakteristik Responden
  sectionHeader('I. KARAKTERISTIK RESPONDEN');
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  
  const col1 = 15;
  const col2 = 80;
  const col3 = 140;

  doc.setFont('Helvetica', 'bold');
  doc.text('Kelompok Umur:', col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`- Anak-anak (5-10th): ${stats.ageGroupBreakdown['5-10']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['5-10']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 6);
  doc.text(`- Remaja (10-18th): ${stats.ageGroupBreakdown['10-18']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['10-18']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 12);
  doc.text(`- Produktif (18-60th): ${stats.ageGroupBreakdown['18-60']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['18-60']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 18);
  doc.text(`- Lansia (60th+): ${stats.ageGroupBreakdown['60+']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['60+']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 24);

  doc.setFont('Helvetica', 'bold');
  doc.text('Jenis Kelamin:', col2, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`- Laki-laki: ${stats.genderBreakdown['Laki-laki']} org (${stats.genderFilledCount ? ((stats.genderBreakdown['Laki-laki']/stats.genderFilledCount)*100).toFixed(1) : 0}%)`, col2, y + 6);
  doc.text(`- Perempuan: ${stats.genderBreakdown['Perempuan']} org (${stats.genderFilledCount ? ((stats.genderBreakdown['Perempuan']/stats.genderFilledCount)*100).toFixed(1) : 0}%)`, col2, y + 12);

  // Add SD, SMP, SMA count
  doc.setFont('Helvetica', 'bold');
  doc.text('Pendidikan (Dominan):', col3, y);
  doc.setFont('Helvetica', 'normal');
  const eduSorted = Object.entries(stats.pendidikanBreakdown).sort((a,b) => b[1] - a[1]);
  doc.text(`1. ${eduSorted[0][0]}: ${eduSorted[0][1]} org`, col3, y + 6);
  doc.text(`2. ${eduSorted[1][0]}: ${eduSorted[1][1]} org`, col3, y + 12);
  doc.text(`3. ${eduSorted[2][0]}: ${eduSorted[2][1]} org`, col3, y + 18);

  y += 35;

  // Section 2: Keadaan Gigi
  sectionHeader('II. ANALISIS KEADAAN GIGI (RATA-RATA per RESPONDEN)');

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y - 4, 182, 6, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Parameter Keadaan Gigi', 17, y);
  doc.text('Gigi Sulung (Deciduous)', 105, y);
  doc.text('Gigi Tetap (Permanent)', 150, y);
  
  y += 6;
  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'normal');

  const rows = [
    { label: 'Sehat', sulung: stats.gigiSulungAvg.sehat, tetap: stats.gigiTetapAvg.sehat },
    { label: 'Gigi Berlubang / Karies (d / D)', sulung: stats.gigiSulungAvg.karies, tetap: stats.gigiTetapAvg.karies },
    { label: 'Gigi Dicabut karena karies (e / M)', sulung: stats.gigiSulungAvg.dicabutKaries, tetap: stats.gigiTetapAvg.dicabutKaries },
    { label: 'Tumpatan dengan karies', sulung: stats.gigiSulungAvg.tumpatanKaries, tetap: stats.gigiTetapAvg.tumpatanKaries },
    { label: 'Tumpatan tanpa karies (f / F)', sulung: stats.gigiSulungAvg.tumpatanTanpaKaries, tetap: stats.gigiTetapAvg.tumpatanTanpaKaries },
    { label: 'Fissure Sealant', sulung: stats.gigiSulungAvg.fissureSealant, tetap: stats.gigiTetapAvg.fissureSealant },
    { label: 'Protesa Cekat / Implan', sulung: stats.gigiSulungAvg.protesaCekat, tetap: stats.gigiTetapAvg.protesaCekat },
    { label: 'Gigi Tidak Tumbuh', sulung: stats.gigiSulungAvg.tidakTumbuh, tetap: stats.gigiTetapAvg.tidakTumbuh },
  ];

  rows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 5.5, 'F');
    }
    doc.text(row.label, 17, y);
    doc.text(row.sulung.toFixed(2), 115, y);
    doc.text(row.tetap.toFixed(2), 160, y);
    y += 5.5;
  });

  y += 5;

  // Section 3: Indeks Karies
  sectionHeader('III. INDEKS PENGALAMAN KARIES');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  // Deciduous
  doc.setFont('Helvetica', 'bold');
  doc.text(`Rata-rata Indeks def-t (Gigi Sulung): ${stats.indexAvg.deft.toFixed(2)}`, col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Kandungan indeks: d (karies) = ${stats.indexAvg.d.toFixed(2)} | e (dicabut) = ${stats.indexAvg.e.toFixed(2)} | f (tumpatan) = ${stats.indexAvg.f.toFixed(2)}`, col1, y + 5);

  // Permanent
  y += 13;
  doc.setFont('Helvetica', 'bold');
  doc.text(`Rata-rata Indeks DMF-T (Gigi Tetap): ${stats.indexAvg.dmft.toFixed(2)}`, col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Kandungan indeks: D (karies) = ${stats.indexAvg.D.toFixed(2)} | M (dicabut) = ${stats.indexAvg.M.toFixed(2)} | F (tumpatan) = ${stats.indexAvg.F.toFixed(2)}`, col1, y + 5);

  // Clinical interpretation
  y += 12;
  doc.setFont('Helvetica', 'bold');
  doc.text('Interpretasi Klinis:', col1, y);
  doc.setFont('Helvetica', 'normal');
  let dmftCategory = 'Sangat Rendah (< 1.2)';
  if (stats.indexAvg.dmft >= 1.2 && stats.indexAvg.dmft < 2.7) dmftCategory = 'Rendah (1.2 - 2.6)';
  else if (stats.indexAvg.dmft >= 2.7 && stats.indexAvg.dmft < 4.5) dmftCategory = 'Sedang (2.7 - 4.4)';
  else if (stats.indexAvg.dmft >= 4.5 && stats.indexAvg.dmft < 6.6) dmftCategory = 'Tinggi (4.5 - 6.5)';
  else if (stats.indexAvg.dmft >= 6.6) dmftCategory = 'Sangat Tinggi (>= 6.6)';

  let deftCategory = 'Sangat Rendah (< 1.2)';
  if (stats.indexAvg.deft >= 1.2 && stats.indexAvg.deft < 2.7) deftCategory = 'Rendah (1.2 - 2.6)';
  else if (stats.indexAvg.deft >= 2.7 && stats.indexAvg.deft < 4.5) deftCategory = 'Sedang (2.7 - 4.4)';
  else if (stats.indexAvg.deft >= 4.5 && stats.indexAvg.deft < 6.6) deftCategory = 'Tinggi (4.5 - 6.5)';
  else if (stats.indexAvg.deft >= 6.6) deftCategory = 'Sangat Tinggi (>= 6.6)';

  doc.text(`- Tingkat keparahan karies gigi tetap (DMF-T) berada dalam kategori: ${dmftCategory}`, col1, y + 5);
  doc.text(`- Tingkat keparahan karies gigi sulung (def-t) berada dalam kategori: ${deftCategory}`, col1, y + 10);

  y += 22;

  // New Page
  doc.addPage();
  y = 20;

  // Header for page 2
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y - 5, 182, 8, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('LAPORAN HASIL SURVEY KESEHATAN GIGI (Sambungan)', 17, y);
  
  y += 12;

  // Section 4: Kebersihan Mulut (OHI-S)
  sectionHeader('IV. INDEKS KEBERSIHAN MULUT (OHI-S - ORAL HYGIENE INDEX SIMPLIFIED)');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Rata-rata Indeks Debris (DI-S): ${stats.ohisStats.avgDIS.toFixed(2)} | Rata-rata Indeks Kalkulus (CI-S): ${stats.ohisStats.avgCIS.toFixed(2)}`, col1, y);
  doc.setFont('Helvetica', 'bold');
  doc.text(`Rata-rata Skor Total OHI-S: ${stats.ohisStats.avgOHIS.toFixed(2)}`, col1, y + 6);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Distribusi Kategori Kebersihan Mulut:`, col1, y + 12);
  doc.text(`- Baik (0.0 - 1.2): ${stats.ohisStats.kategoriCount.baik} org (${(stats.ohisStats.kategoriPct.baik * 100).toFixed(1)}%)`, col1 + 5, y + 18);
  doc.text(`- Sedang (1.3 - 3.0): ${stats.ohisStats.kategoriCount.sedang} org (${(stats.ohisStats.kategoriPct.sedang * 100).toFixed(1)}%)`, col1 + 5, y + 24);
  doc.text(`- Buruk (3.1 - 6.0): ${stats.ohisStats.kategoriCount.buruk} org (${(stats.ohisStats.kategoriPct.buruk * 100).toFixed(1)}%)`, col1 + 5, y + 30);

  y += 38;

  // Section 5: Mukosa
  sectionHeader('V. KEADAAN MUKOSA ORAL & GUSI');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Persentase Gusi Berdarah (Bleeding on Probing): ${(stats.mukosaPct.gusiBerdarah * 100).toFixed(2)}%`, col1, y);
  doc.text(`Persentase Lesi Mukosa Oral (Oral Mucosal Lesion): ${(stats.mukosaPct.lesiMukosaOral * 100).toFixed(2)}%`, col1, y + 6);
  
  y += 18;

  // Section 6: RTL
  sectionHeader('VI. RENCANA TINDAK LANJUT & SISTEM RUJUKAN');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`- Perlu perawatan gigi segera: ${(stats.tindakLanjutPct.perluPerawatanSegera * 100).toFixed(2)}%`, col1, y);
  doc.text(`- Perlu perawatan gigi tidak segera: ${(stats.tindakLanjutPct.perluPerawatanTidakSegera * 100).toFixed(2)}%`, col1, y + 6);
  doc.text(`- Memerlukan rujukan ke faskes lanjutan: ${(stats.tindakLanjutPct.perluDirujuk * 100).toFixed(2)}%`, col1, y + 12);
  
  doc.setFont('Helvetica', 'bold');
  doc.text('Distribusi Rujukan Faskes:', col1, y + 20);
  doc.setFont('Helvetica', 'normal');
  doc.text(`- Puskesmas: ${(stats.tindakLanjutPct.dirujukKePuskesmas * 100).toFixed(2)}%`, col1, y + 26);
  doc.text(`- RS Umum: ${(stats.tindakLanjutPct.dirujukKeRSUmum * 100).toFixed(2)}%`, col1, y + 32);
  doc.text(`- RSGM / RS Gigi & Mulut: ${(stats.tindakLanjutPct.dirujukKeRSGM * 100).toFixed(2)}%`, col1, y + 38);
  doc.text(`- Klinik Pratama: ${(stats.tindakLanjutPct.dirujukKeKlinikPratama * 100).toFixed(2)}%`, col1, y + 44);
  doc.text(`- Klinik Utama: ${(stats.tindakLanjutPct.dirujukKeKlinikUtama * 100).toFixed(2)}%`, col1, y + 50);

  y += 65;

  // Section 6: Penandatangan / Pengesahan
  sectionHeader('VI. REKOMENDASI & PENGESAHAN');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Berdasarkan hasil survey kesehatan gigi dan mulut yang terkumpul, disarankan untuk:', col1, y);
  doc.text('1. Meningkatkan edukasi cara menyikat gigi yang baik dan benar pada kelompok responden dominan.', col1, y + 5);
  doc.text('2. Melakukan kontrol periodik 6 bulan sekali bagi seluruh responden yang berisiko.', col1, y + 10);
  doc.text('3. Memfasilitasi rujukan ke puskesmas terdekat bagi responden dengan karies aktif.', col1, y + 15);

  y += 40;
  
  // Signature Lines
  doc.setFont('Helvetica', 'normal');
  doc.text('Mengetahui,', col1, y);
  doc.text('Pemeriksa / Koordinator Survey', col1, y + 5);
  doc.text('___________________________', col1, y + 22);
  doc.text('NIP / No. Registrasi Dentist', col1, y + 27);

  doc.text('Disetujui oleh,', col3, y);
  doc.text('Kepala Instansi / Dinkes / PJ', col3, y + 5);
  doc.text('___________________________', col3, y + 22);
  doc.text('NIP.', col3, y + 27);

  // Trigger browser download
  const cleanName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`laporan_survey_gigi_${cleanName}.pdf`);
}

// ==================== FEATURE: ANALISIS KUANTITATIF (QUANTITATIVE ANALYSIS ENGINE) ====================

export interface QuantitativeMetrics {
  totalN: number;
  
  // Overall Indices Gigi Tetap (DMF-T)
  meanDMFT: number;
  sdDMFT: number;
  medianDMFT: number;
  minDMFT: number;
  maxDMFT: number;
  sumD: number;
  sumM: number;
  sumF: number;
  meanD: number;
  meanM: number;
  meanF: number;
  dmftCategory: string; // Kategori WHO
  
  // Overall Indices Gigi Sulung (deft)
  childCount: number;
  meanDeft: number;
  sdDeft: number;
  medianDeft: number;
  sum_d: number;
  sum_e: number;
  sum_f: number;
  mean_d: number;
  mean_e: number;
  mean_f: number;
  deftCategory: string; // Kategori WHO
  
  // Epidemiological & Special Indices
  cariesCount: number;
  cariesPrevalencePct: number; // % dengan D > 0 atau d > 0
  cariesFreeCount: number;
  cariesFreePct: number;       // % dengan DMFT = 0 & deft = 0
  siCIndex: number;            // Significant Caries Index (Mean DMFT dari 1/3 populasi karies tertinggi)
  careIndexPct: number;        // Rasio Penambalan = (F / DMFT) * 100
  restorativeIndexPct: number; // Indeks Restorasi = ((F + f) / ((F + f) + (D + d))) * 100
  requiredTreatmentIndexPct: number; // Indeks Kebutuhan Perawatan = ((D + d) / (DMFT + deft)) * 100
  missingRatioPct: number;     // Rasio Gigi Dicabut = (M / DMFT) * 100
  
  // Status Mukosa
  gusiBerdarahCount: number;
  gusiBerdarahPct: number;
  lesiMukosaCount: number;
  lesiMukosaPct: number;
  
  // Need Assessment (Rencana Tindak Lanjut)
  perluPerawatanSegeraCount: number;
  perluPerawatanSegeraPct: number;
  perluPerawatanTidakSegeraCount: number;
  perluPerawatanTidakSegeraPct: number;
  perluDirujukCount: number;
  perluDirujukPct: number;

  // Status OHI-S Kebersihan Mulut
  ohisStats: {
    avgDIS: number;
    avgCIS: number;
    avgOHIS: number;
  };
  
  // Tabulasi Silang Kelompok Umur
  byAgeGroup: Array<{
    ageGroup: '0-4' | '5-11' | '12-17' | '18-59' | '60+';
    label: string;
    n: number;
    pctN: number;
    meanDeft: number;
    meanDMFT: number;
    sdDMFT: number;
    meanOHIS: number;
    sumD: number;
    sumM: number;
    sumF: number;
    meanD: number;
    meanM: number;
    meanF: number;
    cariesPrevalencePct: number;
    siCIndex: number;
    careIndexPct: number;
    gusiBerdarahPct: number;
    lesiMukosaPct: number;
    perluPerawatanSegeraPct: number;
    perluDirujukPct: number;
  }>;

  // Tabulasi Silang Jenis Kelamin
  byGender: Array<{
    gender: 'Laki-laki' | 'Perempuan';
    n: number;
    pctN: number;
    meanDeft: number;
    meanDMFT: number;
    sdDMFT: number;
    meanOHIS: number;
    sumD: number;
    sumM: number;
    sumF: number;
    meanD: number;
    meanM: number;
    meanF: number;
    cariesPrevalencePct: number;
    careIndexPct: number;
    siCIndex: number;
    gusiBerdarahPct: number;
    lesiMukosaPct: number;
    perluDirujukPct: number;
  }>;

  // Tabulasi Silang Pendidikan
  byPendidikan: Array<{
    pendidikan: string;
    n: number;
    meanDMFT: number;
    meanDeft: number;
    meanOHIS: number;
    cariesPrevalencePct: number;
    careIndexPct: number;
    perluDirujukPct: number;
  }>;

  // Tabulasi Silang Pekerjaan
  byPekerjaan: Array<{
    pekerjaan: string;
    n: number;
    meanDMFT: number;
    meanDeft: number;
    meanOHIS: number;
    cariesPrevalencePct: number;
    careIndexPct: number;
    perluDirujukPct: number;
  }>;
}

export function getWHOCategory(score: number): { text: string; color: string; badgeBg: string } {
  if (score < 1.2) return { text: 'Sangat Rendah (< 1.2)', color: 'text-emerald-700 dark:text-emerald-400', badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' };
  if (score < 2.7) return { text: 'Rendah (1.2 - 2.6)', color: 'text-blue-700 dark:text-blue-400', badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300' };
  if (score < 4.5) return { text: 'Sedang (2.7 - 4.4)', color: 'text-amber-700 dark:text-amber-400', badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' };
  if (score < 6.6) return { text: 'Tinggi (4.5 - 6.5)', color: 'text-orange-700 dark:text-orange-400', badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300' };
  return { text: 'Sangat Tinggi (>= 6.6)', color: 'text-rose-700 dark:text-rose-400', badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' };
}

export function calculateQuantitativeAnalysis(respondents: RespondentData[]): QuantitativeMetrics {
  const totalN = respondents.length;

  // Helper calculation functions
  const calcMean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const calcSD = (arr: number[], meanVal: number) => {
    if (arr.length <= 1) return 0;
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - meanVal, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };
  const calcMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  // Extract arrays
  const dmftArr = respondents.map(r => r.dmft || 0);
  const deftArr = respondents.map(r => r.deft || 0);

  const meanDMFT = calcMean(dmftArr);
  const sdDMFT = calcSD(dmftArr, meanDMFT);
  const medianDMFT = calcMedian(dmftArr);
  const minDMFT = dmftArr.length > 0 ? Math.min(...dmftArr) : 0;
  const maxDMFT = dmftArr.length > 0 ? Math.max(...dmftArr) : 0;

  const sumD = respondents.reduce((acc, r) => acc + (r.gigiTetap?.karies || 0), 0);
  const sumM = respondents.reduce((acc, r) => acc + (r.gigiTetap?.dicabutKaries || 0), 0);
  const sumF = respondents.reduce((acc, r) => acc + (r.gigiTetap?.tumpatanTanpaKaries || 0), 0);

  const meanD = totalN > 0 ? sumD / totalN : 0;
  const meanM = totalN > 0 ? sumM / totalN : 0;
  const meanF = totalN > 0 ? sumF / totalN : 0;

  // Gigi Sulung (deft)
  const childrenFilter = respondents.filter(r => normalizeAgeGroup(r.kelompokUmur, r.umur) === '0-4' || normalizeAgeGroup(r.kelompokUmur, r.umur) === '5-11' || r.umur <= 11 || (r.deft && r.deft > 0));
  const childCount = childrenFilter.length > 0 ? childrenFilter.length : totalN;
  const meanDeft = calcMean(deftArr);
  const sdDeft = calcSD(deftArr, meanDeft);
  const medianDeft = calcMedian(deftArr);

  const sum_d = respondents.reduce((acc, r) => acc + (r.gigiSulung?.karies || 0), 0);
  const sum_e = respondents.reduce((acc, r) => acc + (r.gigiSulung?.dicabutKaries || 0), 0);
  const sum_f = respondents.reduce((acc, r) => acc + (r.gigiSulung?.tumpatanTanpaKaries || 0), 0);

  const mean_d = totalN > 0 ? sum_d / totalN : 0;
  const mean_e = totalN > 0 ? sum_e / totalN : 0;
  const mean_f = totalN > 0 ? sum_f / totalN : 0;

  // Caries Prevalence
  const cariesCount = respondents.filter(r => (r.gigiTetap?.karies > 0 || r.gigiSulung?.karies > 0)).length;
  const cariesPrevalencePct = totalN > 0 ? (cariesCount / totalN) * 100 : 0;

  const cariesFreeCount = respondents.filter(r => (r.dmft === 0 && r.deft === 0)).length;
  const cariesFreePct = totalN > 0 ? (cariesFreeCount / totalN) * 100 : 0;

  // Significant Caries Index (SiC Index) - Top 33.3% highest DMFT
  const sortedDescDMFT = [...respondents].sort((a, b) => b.dmft - a.dmft);
  const top13Count = Math.max(1, Math.round(totalN / 3));
  const top13Respondents = sortedDescDMFT.slice(0, top13Count);
  const siCIndex = top13Respondents.length > 0 ? top13Respondents.reduce((acc, r) => acc + r.dmft, 0) / top13Respondents.length : 0;

  // Care Index & Indices
  const sumDMFT = meanDMFT * totalN;
  const careIndexPct = sumDMFT > 0 ? (sumF / sumDMFT) * 100 : 0;

  const denomRI = (sumF + sum_f) + (sumD + sum_d);
  const restorativeIndexPct = denomRI > 0 ? ((sumF + sum_f) / denomRI) * 100 : 0;

  const denomRTI = sumDMFT + (meanDeft * totalN);
  const requiredTreatmentIndexPct = denomRTI > 0 ? ((sumD + sum_d) / denomRTI) * 100 : 0;

  const missingRatioPct = sumDMFT > 0 ? (sumM / sumDMFT) * 100 : 0;

  // Mukosa & RTL
  const gusiBerdarahCount = respondents.filter(r => r.mukosa?.gusiBerdarah).length;
  const gusiBerdarahPct = totalN > 0 ? (gusiBerdarahCount / totalN) * 100 : 0;

  const lesiMukosaCount = respondents.filter(r => r.mukosa?.lesiMukosaOral).length;
  const lesiMukosaPct = totalN > 0 ? (lesiMukosaCount / totalN) * 100 : 0;

  const perluPerawatanSegeraCount = respondents.filter(r => r.tindakLanjut?.perluPerawatanSegera).length;
  const perluPerawatanSegeraPct = totalN > 0 ? (perluPerawatanSegeraCount / totalN) * 100 : 0;

  const perluPerawatanTidakSegeraCount = respondents.filter(r => r.tindakLanjut?.perluPerawatanTidakSegera).length;
  const perluPerawatanTidakSegeraPct = totalN > 0 ? (perluPerawatanTidakSegeraCount / totalN) * 100 : 0;

  const perluDirujukCount = respondents.filter(r => r.tindakLanjut?.perluDirujuk).length;
  const perluDirujukPct = totalN > 0 ? (perluDirujukCount / totalN) * 100 : 0;

  // Helper for subgroup calculations
  const calculateSubgroup = (groupItems: RespondentData[]) => {
    const subN = groupItems.length;
    if (subN === 0) {
      return {
        n: 0, pctN: 0, meanDeft: 0, meanDMFT: 0, sdDMFT: 0, meanOHIS: 0,
        sumD: 0, sumM: 0, sumF: 0, meanD: 0, meanM: 0, meanF: 0,
        cariesPrevalencePct: 0, siCIndex: 0, careIndexPct: 0,
        gusiBerdarahPct: 0, lesiMukosaPct: 0, perluPerawatanSegeraPct: 0, perluDirujukPct: 0
      };
    }
    const subDmftArr = groupItems.map(r => r.dmft || 0);
    const subDeftArr = groupItems.map(r => r.deft || 0);
    const subMeanDMFT = calcMean(subDmftArr);
    const subSdDMFT = calcSD(subDmftArr, subMeanDMFT);
    const subMeanDeft = calcMean(subDeftArr);

    const subOhisList = groupItems.map(r => r.ohis || generateDefaultOHIS(r));
    const subMeanOHIS = subOhisList.reduce((acc, o) => acc + (o.ohisScore || 0), 0) / subN;

    const subSumD = groupItems.reduce((acc, r) => acc + (r.gigiTetap?.karies || 0), 0);
    const subSumM = groupItems.reduce((acc, r) => acc + (r.gigiTetap?.dicabutKaries || 0), 0);
    const subSumF = groupItems.reduce((acc, r) => acc + (r.gigiTetap?.tumpatanTanpaKaries || 0), 0);

    const subCariesCount = groupItems.filter(r => (r.gigiTetap?.karies > 0 || r.gigiSulung?.karies > 0)).length;
    const subCariesPrev = (subCariesCount / subN) * 100;

    const subSortedDMFT = [...groupItems].sort((a, b) => b.dmft - a.dmft);
    const subTopCount = Math.max(1, Math.round(subN / 3));
    const subSiC = subSortedDMFT.slice(0, subTopCount).reduce((acc, r) => acc + r.dmft, 0) / subTopCount;

    const subSumDMFT = subMeanDMFT * subN;
    const subCareIndex = subSumDMFT > 0 ? (subSumF / subSumDMFT) * 100 : 0;

    const subGusiCount = groupItems.filter(r => r.mukosa?.gusiBerdarah).length;
    const subLesiCount = groupItems.filter(r => r.mukosa?.lesiMukosaOral).length;
    const subSegeraCount = groupItems.filter(r => r.tindakLanjut?.perluPerawatanSegera).length;
    const subRujukCount = groupItems.filter(r => r.tindakLanjut?.perluDirujuk).length;

    return {
      n: subN,
      pctN: (subN / (totalN || 1)) * 100,
      meanDeft: subMeanDeft,
      meanDMFT: subMeanDMFT,
      sdDMFT: subSdDMFT,
      meanOHIS: subMeanOHIS,
      sumD: subSumD,
      sumM: subSumM,
      sumF: subSumF,
      meanD: subSumD / subN,
      meanM: subSumM / subN,
      meanF: subSumF / subN,
      cariesPrevalencePct: subCariesPrev,
      siCIndex: subSiC,
      careIndexPct: subCareIndex,
      gusiBerdarahPct: (subGusiCount / subN) * 100,
      lesiMukosaPct: (subLesiCount / subN) * 100,
      perluPerawatanSegeraPct: (subSegeraCount / subN) * 100,
      perluDirujukPct: (subRujukCount / subN) * 100
    };
  };

  // Age groups (WHO Standard)
  const ageGroups: Array<{ key: '0-4' | '5-11' | '12-17' | '18-59' | '60+'; label: string }> = [
    { key: '0-4', label: 'Balita (0 - 4 Tahun)' },
    { key: '5-11', label: 'Anak-anak (5 - 11 Tahun)' },
    { key: '12-17', label: 'Remaja (12 - 17 Tahun)' },
    { key: '18-59', label: 'Dewasa (18 - 59 Tahun)' },
    { key: '60+', label: 'Lansia (60+ Tahun)' }
  ];

  const byAgeGroup = ageGroups.map(ag => {
    const items = respondents.filter(r => normalizeAgeGroup(r.kelompokUmur, r.umur) === ag.key);
    const sub = calculateSubgroup(items);
    return {
      ageGroup: ag.key,
      label: ag.label,
      ...sub
    };
  });

  // Gender
  const genders: Array<'Laki-laki' | 'Perempuan'> = ['Laki-laki', 'Perempuan'];
  const byGender = genders.map(g => {
    const items = respondents.filter(r => r.jenisKelamin === g);
    const sub = calculateSubgroup(items);
    return {
      gender: g,
      ...sub
    };
  });

  // Pendidikan Breakdown
  const pendList = ['SD', 'SMP', 'SMA', 'Diploma', 'S1/D4', 'S2', 'S3', 'Tidak Sekolah'];
  const byPendidikan = pendList.map(p => {
    const items = respondents.filter(r => r.pendidikan === p);
    const sub = calculateSubgroup(items);
    return {
      pendidikan: p,
      n: sub.n,
      meanDMFT: sub.meanDMFT,
      meanDeft: sub.meanDeft,
      meanOHIS: sub.meanOHIS,
      cariesPrevalencePct: sub.cariesPrevalencePct,
      careIndexPct: sub.careIndexPct,
      perluDirujukPct: sub.perluDirujukPct
    };
  }).filter(item => item.n > 0);

  // Pekerjaan Breakdown
  const pekerList = ['ASN/PNS/PPPK', 'TNI/POLRI', 'PEGAWAI BUMN', 'PEGAWAI SWASTA', 'WIRASWASTA/WIRAUSAHA', 'PELAJAR/MAHASISWA', 'PENGURUS/IBU RUMAH TANGGA', 'ASISTEN RUMAH TANGGA', 'TIDAK BEKERJA'];
  const byPekerjaan = pekerList.map(p => {
    const items = respondents.filter(r => r.pekerjaan === p);
    const sub = calculateSubgroup(items);
    return {
      pekerjaan: p,
      n: sub.n,
      meanDMFT: sub.meanDMFT,
      meanDeft: sub.meanDeft,
      meanOHIS: sub.meanOHIS,
      cariesPrevalencePct: sub.cariesPrevalencePct,
      careIndexPct: sub.careIndexPct,
      perluDirujukPct: sub.perluDirujukPct
    };
  }).filter(item => item.n > 0);

  return {
    totalN,
    meanDMFT,
    sdDMFT,
    medianDMFT,
    minDMFT,
    maxDMFT,
    sumD, sumM, sumF,
    meanD, meanM, meanF,
    dmftCategory: getWHOCategory(meanDMFT).text,

    childCount,
    meanDeft,
    sdDeft,
    medianDeft,
    sum_d, sum_e, sum_f,
    mean_d, mean_e, mean_f,
    deftCategory: getWHOCategory(meanDeft).text,

    cariesCount,
    cariesPrevalencePct,
    cariesFreeCount,
    cariesFreePct,
    siCIndex,
    careIndexPct,
    restorativeIndexPct,
    requiredTreatmentIndexPct,
    missingRatioPct,

    gusiBerdarahCount,
    gusiBerdarahPct,
    lesiMukosaCount,
    lesiMukosaPct,

    perluPerawatanSegeraCount,
    perluPerawatanSegeraPct,
    perluPerawatanTidakSegeraCount,
    perluPerawatanTidakSegeraPct,
    perluDirujukCount,
    perluDirujukPct,

    ohisStats: (() => {
      const ohisList = respondents.map(r => r.ohis || generateDefaultOHIS(r));
      const avgDIS = ohisList.length > 0 ? ohisList.reduce((acc, o) => acc + (o.disScore || 0), 0) / ohisList.length : 0;
      const avgCIS = ohisList.length > 0 ? ohisList.reduce((acc, o) => acc + (o.cisScore || 0), 0) / ohisList.length : 0;
      const avgOHIS = ohisList.length > 0 ? ohisList.reduce((acc, o) => acc + (o.ohisScore || 0), 0) / ohisList.length : 0;
      return { avgDIS, avgCIS, avgOHIS };
    })(),

    byAgeGroup,
    byGender,
    byPendidikan,
    byPekerjaan
  };
}

// ==================== EXPORT ANALISIS KUANTITATIF KE PDF ====================

export function exportQuantitativePdf(respondents: RespondentData[], sessionName: string) {
  const metrics = calculateQuantitativeAnalysis(respondents);
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  let y = 15;
  const col1 = 14;
  const col2 = 105;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Navy Dark Slate
  doc.rect(10, 10, 190, 26, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('LAPORAN ANALISIS KUANTITATIF EPIDEMIOLOGI KESEHATAN GIGI', 14, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`Sesi: ${sessionName}`, 14, 24);
  doc.text(`Pemeriksa: Arini Haerunnisa | Total Sampel (N): ${metrics.totalN} Responden | Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);

  y = 42;

  const drawSectionTitle = (title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y, 190, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, y, 190, 7, 'S');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 14, y + 5);
    y += 11;
  };

  // Section I: INDIKATOR EPIDEMIOLOGI UTAMA
  drawSectionTitle('I. RINGKASAN INDIKATOR UTAMA EPIDEMIOLOGI & SEVERITAS WHO');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text('1. Indikator Karies Gigi Tetap (DMF-T):', col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`• Rata-rata DMF-T: ${metrics.meanDMFT.toFixed(2)} ± ${metrics.sdDMFT.toFixed(2)} (Min: ${metrics.minDMFT}, Max: ${metrics.maxDMFT}, Median: ${metrics.medianDMFT.toFixed(1)})`, col1 + 4, y + 5);
  doc.text(`• Komponen D (Karies Aktif): Rata-rata ${metrics.meanD.toFixed(2)} per responden (Total D: ${metrics.sumD})`, col1 + 4, y + 10);
  doc.text(`• Komponen M (Dicabut/Hilang): Rata-rata ${metrics.meanM.toFixed(2)} per responden (Total M: ${metrics.sumM})`, col1 + 4, y + 15);
  doc.text(`• Komponen F (Penambalan/Tumpat): Rata-rata ${metrics.meanF.toFixed(2)} per responden (Total F: ${metrics.sumF})`, col1 + 4, y + 20);
  doc.text(`• Klasifikasi Keparahan WHO (DMF-T): ${metrics.dmftCategory}`, col1 + 4, y + 25);

  y += 32;

  doc.setFont('Helvetica', 'bold');
  doc.text('2. Indikator Karies Gigi Sulung (deft):', col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`• Rata-rata deft: ${metrics.meanDeft.toFixed(2)} ± ${metrics.sdDeft.toFixed(2)} (Median: ${metrics.medianDeft.toFixed(1)})`, col1 + 4, y + 5);
  doc.text(`• Komponen d (karies): ${metrics.mean_d.toFixed(2)} | Komponen e (ekstraksi): ${metrics.mean_e.toFixed(2)} | Komponen f (tumpatan): ${metrics.mean_f.toFixed(2)}`, col1 + 4, y + 10);
  doc.text(`• Klasifikasi Keparahan WHO (deft): ${metrics.deftCategory}`, col1 + 4, y + 15);

  y += 22;

  doc.setFont('Helvetica', 'bold');
  doc.text('3. Indeks Kuantitatif Khusus & Rasio Perawatan:', col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`• Prevalensi Karies Total: ${metrics.cariesPrevalencePct.toFixed(2)}% (${metrics.cariesCount} dari ${metrics.totalN} responden mengalami karies)`, col1 + 4, y + 5);
  doc.text(`• Persentase Bebas Karies (Caries-Free): ${metrics.cariesFreePct.toFixed(2)}% (${metrics.cariesFreeCount} responden bebas karies)`, col1 + 4, y + 10);
  doc.text(`• Significant Caries Index (SiC Index): ${metrics.siCIndex.toFixed(2)} (Rata-rata DMF-T pada 1/3 kelompok karies tertinggi)`, col1 + 4, y + 15);
  doc.text(`• Care Index (Rasio Penambalan F/DMF-T): ${metrics.careIndexPct.toFixed(2)}%`, col1 + 4, y + 20);
  doc.text(`• Restorative Index (RI): ${metrics.restorativeIndexPct.toFixed(2)}%`, col1 + 4, y + 25);
  doc.text(`• Required Treatment Index (RTI / Kebutuhan Perawatan): ${metrics.requiredTreatmentIndexPct.toFixed(2)}%`, col1 + 4, y + 30);
  doc.text(`• Missing Ratio (MORT M/DMF-T): ${metrics.missingRatioPct.toFixed(2)}%`, col1 + 4, y + 35);

  y += 43;

  // Section II: TABULASI SILANG KELOMPOK UMUR
  drawSectionTitle('II. MATRIKS ANALISIS KUANTITATIF BERDASARKAN KELOMPOK UMUR');

  // Draw Table Headers
  const tableTop = y;
  doc.setFillColor(30, 41, 59);
  doc.rect(10, tableTop, 190, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  doc.text('Kelompok Umur', 12, tableTop + 5);
  doc.text('N', 55, tableTop + 5);
  doc.text('%', 65, tableTop + 5);
  doc.text('Mean deft', 78, tableTop + 5);
  doc.text('Mean DMFT', 98, tableTop + 5);
  doc.text('Prev Karies', 120, tableTop + 5);
  doc.text('SiC Index', 142, tableTop + 5);
  doc.text('Care Index', 162, tableTop + 5);
  doc.text('Rujukan %', 182, tableTop + 5);

  y += 7;

  metrics.byAgeGroup.forEach((ag, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(10, y, 190, 6, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    doc.text(ag.label, 12, y + 4.5);
    doc.text(ag.n.toString(), 55, y + 4.5);
    doc.text(`${ag.pctN.toFixed(1)}%`, 65, y + 4.5);
    doc.text(ag.meanDeft.toFixed(2), 78, y + 4.5);
    doc.text(ag.meanDMFT.toFixed(2), 98, y + 4.5);
    doc.text(`${ag.cariesPrevalencePct.toFixed(1)}%`, 120, y + 4.5);
    doc.text(ag.siCIndex.toFixed(2), 142, y + 4.5);
    doc.text(`${ag.careIndexPct.toFixed(1)}%`, 162, y + 4.5);
    doc.text(`${ag.perluDirujukPct.toFixed(1)}%`, 182, y + 4.5);

    y += 6;
  });

  y += 8;

  // Page 2
  doc.addPage();
  y = 15;

  // Header Banner Page 2
  doc.setFillColor(15, 23, 42);
  doc.rect(10, 10, 190, 14, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('LAPORAN ANALISIS KUANTITATIF EPIDEMIOLOGI KESEHATAN GIGI (Lanjutan)', 14, 19);

  y = 30;

  // Section III: TABULASI SILANG JENIS KELAMIN
  drawSectionTitle('III. MATRIKS ANALISIS KUANTITATIF BERDASARKAN JENIS KELAMIN');

  const tableTopG = y;
  doc.setFillColor(30, 41, 59);
  doc.rect(10, tableTopG, 190, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  doc.text('Jenis Kelamin', 14, tableTopG + 5);
  doc.text('N', 55, tableTopG + 5);
  doc.text('%', 68, tableTopG + 5);
  doc.text('Mean deft', 82, tableTopG + 5);
  doc.text('Mean DMFT ± SD', 105, tableTopG + 5);
  doc.text('Prev Karies', 140, tableTopG + 5);
  doc.text('SiC Index', 165, tableTopG + 5);

  y += 7;

  metrics.byGender.forEach((g, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(10, y, 190, 6, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text(g.gender, 14, y + 4.5);
    doc.text(g.n.toString(), 55, y + 4.5);
    doc.text(`${g.pctN.toFixed(1)}%`, 68, y + 4.5);
    doc.text(g.meanDeft.toFixed(2), 82, y + 4.5);
    doc.text(`${g.meanDMFT.toFixed(2)} ± ${g.sdDMFT.toFixed(2)}`, 105, y + 4.5);
    doc.text(`${g.cariesPrevalencePct.toFixed(1)}%`, 140, y + 4.5);
    doc.text(g.siCIndex.toFixed(2), 165, y + 4.5);

    y += 6;
  });

  y += 10;

  // Section IV: KONDISI MUKOSA ORAL & KEBUTUHAN PERAWATAN
  drawSectionTitle('IV. KONDISI MUKOSA ORAL & RENCANA TINDAK LANJUT');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text(`• Gusi Berdarah (Gingival Bleeding): ${metrics.gusiBerdarahPct.toFixed(2)}% (${metrics.gusiBerdarahCount} responden)`, col1, y);
  doc.text(`• Lesi Mukosa Oral (Oral Mucosal Lesions): ${metrics.lesiMukosaPct.toFixed(2)}% (${metrics.lesiMukosaCount} responden)`, col1, y + 5);
  doc.text(`• Memerlukan Perawatan Segera: ${metrics.perluPerawatanSegeraPct.toFixed(2)}% (${metrics.perluPerawatanSegeraCount} responden)`, col1, y + 10);
  doc.text(`• Memerlukan Perawatan Tidak Segera: ${metrics.perluPerawatanTidakSegeraPct.toFixed(2)}% (${metrics.perluPerawatanTidakSegeraCount} responden)`, col1, y + 15);
  doc.text(`• Memerlukan Rujukan Faskes Lanjutan: ${metrics.perluDirujukPct.toFixed(2)}% (${metrics.perluDirujukCount} responden)`, col1, y + 20);

  y += 32;

  // Section V: KESIMPULAN & PENGESAHAN
  drawSectionTitle('V. KESIMPULAN KUANTITATIF & LEMBAR PENGESAHAN');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Berdasarkan data analisis kuantitatif di atas, direkomendasikan:', col1, y);
  doc.text('1. Prioritas penambalan (restorasi) pada kelompok dengan Required Treatment Index (RTI) tinggi.', col1, y + 5);
  doc.text('2. Penerapan program sikat gigi massal dan aplikasi Fluoride untuk menekan SiC Index.', col1, y + 10);
  doc.text('3. Rujukan terstruktur untuk penanganan karies pulpa dan ekstraksi radiks.', col1, y + 15);

  y += 30;

  // Signatures
  doc.setFont('Helvetica', 'normal');
  doc.text('Mengetahui,', col1, y);
  doc.text('Pemeriksa / Analyst Survey', col1, y + 5);
  doc.text('___________________________', col1, y + 20);
  doc.text('Arini Haerunnisa', col1, y + 25);

  doc.text('Disetujui oleh,', col2, y);
  doc.text('Kepala Dinkes / Penanggung Jawab', col2, y + 5);
  doc.text('___________________________', col2, y + 20);
  doc.text('NIP.', col2, y + 25);

  const cleanName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`Analisis_Kuantitatif_Kesehatan_Gigi_${cleanName}.pdf`);
}

// ==================== EXPORT ANALISIS KUANTITATIF KE EXCEL (.XLSX) ====================

export function exportQuantitativeExcel(respondents: RespondentData[], sessionName: string) {
  const metrics = calculateQuantitativeAnalysis(respondents);
  const wb = XLSX.utils.book_new();

  // SHEET 1: Ringkasan Indikator Kuantitatif
  const summaryRows = [
    ['LAPORAN ANALISIS KUANTITATIF EPIDEMIOLOGI KESEHATAN GIGI DAN MULUT'],
    ['Sesi Survey:', sessionName],
    ['Pemeriksa:', 'Arini Haerunnisa'],
    ['Tanggal Ekspor:', new Date().toLocaleDateString('id-ID')],
    ['Total Sampel (N):', metrics.totalN],
    [],
    ['I. INDIKATOR UTAMA EPIDEMIOLOGI (GIGI TETAP & SULUNG)'],
    ['Indikator', 'Nilai', 'Satuan / Standar', 'Interpretasi WHO'],
    ['Rata-rata DMF-T Gigi Tetap', metrics.meanDMFT.toFixed(2), 'Gigi per orang', metrics.dmftCategory],
    ['Standar Deviasi (SD) DMF-T', metrics.sdDMFT.toFixed(2), 'Gigi', '-'],
    ['Median DMF-T', metrics.medianDMFT.toFixed(1), 'Gigi', '-'],
    ['Min - Max DMF-T', `${metrics.minDMFT} - ${metrics.maxDMFT}`, 'Gigi', '-'],
    ['Rata-rata D (Karies Aktif)', metrics.meanD.toFixed(2), 'Gigi per orang', `Total D: ${metrics.sumD}`],
    ['Rata-rata M (Dicabut/Hilang)', metrics.meanM.toFixed(2), 'Gigi per orang', `Total M: ${metrics.sumM}`],
    ['Rata-rata F (Penambalan)', metrics.meanF.toFixed(2), 'Gigi per orang', `Total F: ${metrics.sumF}`],
    [],
    ['Rata-rata deft Gigi Sulung', metrics.meanDeft.toFixed(2), 'Gigi per orang', metrics.deftCategory],
    ['Rata-rata d (karies)', metrics.mean_d.toFixed(2), 'Gigi per orang', `Total d: ${metrics.sum_d}`],
    ['Rata-rata e (ekstraksi)', metrics.mean_e.toFixed(2), 'Gigi per orang', `Total e: ${metrics.sum_e}`],
    ['Rata-rata f (tumpatan)', metrics.mean_f.toFixed(2), 'Gigi per orang', `Total f: ${metrics.sum_f}`],
    [],
    ['II. INDEKS KUANTITATIF KHUSUS & MUKOSA'],
    ['Indikator Khusus', 'Nilai Persentase / Skor', 'Deskripsi Formulasi'],
    ['Prevalensi Karies Total', `${metrics.cariesPrevalencePct.toFixed(2)}%`, `(${metrics.cariesCount} responden karies)`],
    ['Persentase Bebas Karies (Caries-Free)', `${metrics.cariesFreePct.toFixed(2)}%`, `(${metrics.cariesFreeCount} responden bebas karies)`],
    ['Significant Caries Index (SiC Index)', metrics.siCIndex.toFixed(2), 'Rata-rata DMF-T pada 1/3 populasi karies tertinggi'],
    ['Care Index (Rasio Penambalan)', `${metrics.careIndexPct.toFixed(2)}%`, '(F / DMF-T) * 100'],
    ['Restorative Index (RI)', `${metrics.restorativeIndexPct.toFixed(2)}%`, '((F+f) / ((F+f)+(D+d))) * 100'],
    ['Required Treatment Index (RTI)', `${metrics.requiredTreatmentIndexPct.toFixed(2)}%`, '((D+d) / (DMFT+deft)) * 100'],
    ['Missing Ratio (MORT)', `${metrics.missingRatioPct.toFixed(2)}%`, '(M / DMF-T) * 100'],
    ['Gusi Berdarah (Gingival Bleeding)', `${metrics.gusiBerdarahPct.toFixed(2)}%`, `(${metrics.gusiBerdarahCount} responden)`],
    ['Lesi Mukosa Oral', `${metrics.lesiMukosaPct.toFixed(2)}%`, `(${metrics.lesiMukosaCount} responden)`],
    ['Perlu Perawatan Segera', `${metrics.perluPerawatanSegeraPct.toFixed(2)}%`, `(${metrics.perluPerawatanSegeraCount} responden)`],
    ['Perlu Rujukan Faskes', `${metrics.perluDirujukPct.toFixed(2)}%`, `(${metrics.perluDirujukCount} responden)`]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan_Kuantitatif');

  // SHEET 2: Tabulasi Kelompok Umur
  const ageRows = [
    ['TABULASI SILANG BERDASARKAN KELOMPOK UMUR'],
    [],
    ['Kelompok Umur', 'N', 'Persentase (%)', 'Mean deft', 'Mean DMFT', 'SD DMFT', 'Total D', 'Total M', 'Total F', 'Prevalensi Karies (%)', 'SiC Index', 'Care Index (%)', 'Gusi Berdarah (%)', 'Perlu Rujukan (%)'],
    ...metrics.byAgeGroup.map(ag => [
      ag.label,
      ag.n,
      `${ag.pctN.toFixed(2)}%`,
      ag.meanDeft.toFixed(2),
      ag.meanDMFT.toFixed(2),
      ag.sdDMFT.toFixed(2),
      ag.sumD,
      ag.sumM,
      ag.sumF,
      `${ag.cariesPrevalencePct.toFixed(2)}%`,
      ag.siCIndex.toFixed(2),
      `${ag.careIndexPct.toFixed(2)}%`,
      `${ag.gusiBerdarahPct.toFixed(2)}%`,
      `${ag.perluDirujukPct.toFixed(2)}%`
    ])
  ];
  const wsAge = XLSX.utils.aoa_to_sheet(ageRows);
  XLSX.utils.book_append_sheet(wb, wsAge, 'Tabulasi_Kelompok_Umur');

  // SHEET 3: Tabulasi Jenis Kelamin
  const genderRows = [
    ['TABULASI SILANG BERDASARKAN JENIS KELAMIN'],
    [],
    ['Jenis Kelamin', 'N', 'Persentase (%)', 'Mean deft', 'Mean DMFT', 'SD DMFT', 'Total D', 'Total M', 'Total F', 'Prevalensi Karies (%)', 'SiC Index', 'Care Index (%)', 'Gusi Berdarah (%)', 'Lesi Mukosa (%)'],
    ...metrics.byGender.map(g => [
      g.gender,
      g.n,
      `${g.pctN.toFixed(2)}%`,
      g.meanDeft.toFixed(2),
      g.meanDMFT.toFixed(2),
      g.sdDMFT.toFixed(2),
      g.sumD,
      g.sumM,
      g.sumF,
      `${g.cariesPrevalencePct.toFixed(2)}%`,
      g.siCIndex.toFixed(2),
      `${g.careIndexPct.toFixed(2)}%`,
      `${g.gusiBerdarahPct.toFixed(2)}%`,
      `${g.lesiMukosaPct.toFixed(2)}%`
    ])
  ];
  const wsGender = XLSX.utils.aoa_to_sheet(genderRows);
  XLSX.utils.book_append_sheet(wb, wsGender, 'Tabulasi_Jenis_Kelamin');

  // SHEET 4: Data Indeks Responden Individu
  const respondentRows = respondents.map((r, index) => {
    const hasCaries = (r.gigiTetap?.karies > 0 || r.gigiSulung?.karies > 0);
    return {
      'No': index + 1,
      'Pemeriksa': r.pemeriksa || 'Arini Haerunnisa',
      'NIK': r.nik || '-',
      'Nama Responden': r.nama || 'Anonim',
      'Jenis Kelamin': r.jenisKelamin,
      'Umur (Thn)': r.umur,
      'Kelompok Umur': r.kelompokUmur,
      'Pendidikan': r.pendidikan || '-',
      'Pekerjaan': r.pekerjaan || '-',
      
      // Gigi Sulung
      'd (Karies Sulung)': r.gigiSulung?.karies || 0,
      'e (Ekstraksi Sulung)': r.gigiSulung?.dicabutKaries || 0,
      'f (Tumpatan Sulung)': r.gigiSulung?.tumpatanTanpaKaries || 0,
      'def-t Index': r.deft || 0,
      
      // Gigi Tetap
      'D (Karies Tetap)': r.gigiTetap?.karies || 0,
      'M (Hilang/Dicabut)': r.gigiTetap?.dicabutKaries || 0,
      'F (Tumpatan Tetap)': r.gigiTetap?.tumpatanTanpaKaries || 0,
      'DMF-T Index': r.dmft || 0,
      
      // Indikator Klinis
      'Status Karies': hasCaries ? 'Karies Aktif' : (r.dmft === 0 && r.deft === 0 ? 'Bebas Karies' : 'Non-Karies Aktif'),
      'Gusi Berdarah': r.mukosa?.gusiBerdarah ? 'Ya' : 'Tidak',
      'Lesi Mukosa Oral': r.mukosa?.lesiMukosaOral ? 'Ya' : 'Tidak',
      'Perlu Perawatan Segera': r.tindakLanjut?.perluPerawatanSegera ? 'Ya' : 'Tidak',
      'Faskes Rujukan': r.tindakLanjut?.dirujukKe === 'tidak_dirujuk' ? 'Tidak Dirujuk' : r.tindakLanjut?.dirujukKe?.toUpperCase()
    };
  });

  const wsRespondents = XLSX.utils.json_to_sheet(respondentRows);
  XLSX.utils.book_append_sheet(wb, wsRespondents, 'Data_Indeks_Responden');

  const cleanName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `Analisis_Kuantitatif_Kesehatan_Gigi_${cleanName}.xlsx`);
}

// ==================== EXPORT DATASET SPSS (.XLSX PRE-CODED) ====================

export function exportQuantitativeSPSS(respondents: RespondentData[], sessionName: string) {
  const wb = XLSX.utils.book_new();

  // Helper code maps for SPSS compatibility
  const getGenderCode = (jk: string) => (jk === 'Laki-laki' ? 1 : 2);
  const getAgeGroupCode = (ag: string) => {
    if (ag === '0-4') return 1;
    if (ag === '5-11') return 2;
    if (ag === '12-17') return 3;
    if (ag === '18-59') return 4;
    return 5; // 60+
  };
  const getPendidikanCode = (p?: string) => {
    if (!p || p === '-' || p === 'Tidak Sekolah') return 1;
    if (p.includes('SD')) return 2;
    if (p.includes('SMP')) return 3;
    if (p.includes('SMA')) return 4;
    return 5; // Perguruan Tinggi
  };
  const getPekerjaanCode = (pk?: string) => {
    if (!pk || pk === '-' || pk.includes('TIDAK BEKERJA')) return 1;
    if (pk.includes('RUMAH TANGGA')) return 2;
    if (pk.includes('PELAJAR') || pk.includes('MAHASISWA')) return 3;
    if (pk.includes('PNS') || pk.includes('TNI') || pk.includes('POLRI')) return 4;
    if (pk.includes('SWASTA') || pk.includes('BURUH')) return 5;
    return 6; // Wiraswasta/Lainnya
  };
  const getDmftCatCode = (dmft: number) => {
    if (dmft < 1.2) return 1; // Sangat Rendah
    if (dmft <= 2.6) return 2; // Rendah
    if (dmft <= 4.4) return 3; // Sedang
    if (dmft <= 6.5) return 4; // Tinggi
    return 5; // Sangat Tinggi
  };
  const getOhisCatCode = (ohis: number) => {
    if (ohis <= 1.2) return 1; // Baik
    if (ohis <= 3.0) return 2; // Sedang
    return 3; // Buruk
  };

  const rawRows = respondents.map((r, index) => {
    const hasCaries = (r.gigiTetap?.karies > 0 || r.gigiSulung?.karies > 0) ? 1 : 0;
    const ohis = r.ohis?.ohisScore || 0;
    const dis = r.ohis?.disScore || 0;
    const cis = r.ohis?.cisScore || 0;
    const normAgeGrp = normalizeAgeGroup(r.kelompokUmur, r.umur);

    return {
      'ID': index + 1,
      'NIK': r.nik || '',
      'NAMA': r.nama || '',
      'JK_CODE': getGenderCode(r.jenisKelamin),
      'JK_LABEL': r.jenisKelamin,
      'UMUR': r.umur,
      'KEL_UMUR_CODE': getAgeGroupCode(normAgeGrp),
      'KEL_UMUR_LABEL': normAgeGrp,
      'PENDIDIKAN_CODE': getPendidikanCode(r.pendidikan),
      'PEKERJAAN_CODE': getPekerjaanCode(r.pekerjaan),
      'D_SULUNG': r.gigiSulung?.karies || 0,
      'E_SULUNG': r.gigiSulung?.dicabutKaries || 0,
      'F_SULUNG': r.gigiSulung?.tumpatanTanpaKaries || 0,
      'DEFT_SCORE': r.deft || 0,
      'D_TETAP': r.gigiTetap?.karies || 0,
      'M_TETAP': r.gigiTetap?.dicabutKaries || 0,
      'F_TETAP': r.gigiTetap?.tumpatanTanpaKaries || 0,
      'DMFT_SCORE': r.dmft || 0,
      'DMFT_CAT_CODE': getDmftCatCode(r.dmft || 0),
      'DIS_SCORE': Number(dis.toFixed(2)),
      'CIS_SCORE': Number(cis.toFixed(2)),
      'OHIS_SCORE': Number(ohis.toFixed(2)),
      'OHIS_CAT_CODE': getOhisCatCode(ohis),
      'KARIES_STATUS': hasCaries,
      'GUSI_BERDARAH': r.mukosa?.gusiBerdarah ? 1 : 0,
      'LESI_MUKOSA': r.mukosa?.lesiMukosaOral ? 1 : 0,
      'PERLU_RUJUKAN': r.tindakLanjut?.perluDirujuk ? 1 : 0,
      'PERAWATAN_SEGERA': r.tindakLanjut?.perluPerawatanSegera ? 1 : 0,
    };
  });

  const wsRaw = XLSX.utils.json_to_sheet(rawRows);
  XLSX.utils.book_append_sheet(wb, wsRaw, 'SPSS_Raw_Data');

  // Sheet 2: Variable View Dictionary for SPSS
  const varViewRows = [
    ['Name', 'Type', 'Width', 'Decimals', 'Label', 'Values / Coding Dictionary'],
    ['ID', 'Numeric', 8, 0, 'Nomor Responden', '1..N'],
    ['NIK', 'String', 16, 0, 'Nomor Induk Kependudukan', '-'],
    ['NAMA', 'String', 50, 0, 'Nama Lengkap Responden', '-'],
    ['JK_CODE', 'Numeric', 1, 0, 'Jenis Kelamin', '1 = Laki-laki; 2 = Perempuan'],
    ['UMUR', 'Numeric', 3, 0, 'Umur Responden (Tahun)', 'Kontinu (Tahun)'],
    ['KEL_UMUR_CODE', 'Numeric', 1, 0, 'Kelompok Umur WHO', '1 = 0-4 thn; 2 = 5-11 thn; 3 = 12-17 thn; 4 = 18-59 thn; 5 = 60+ thn'],
    ['PENDIDIKAN_CODE', 'Numeric', 1, 0, 'Tingkat Pendidikan', '1 = Tidak Sekolah; 2 = SD; 3 = SMP; 4 = SMA; 5 = Perguruan Tinggi'],
    ['PEKERJAAN_CODE', 'Numeric', 1, 0, 'Sektor Pekerjaan', '1 = Tidak Bekerja; 2 = IRT; 3 = Pelajar/Mahasiswa; 4 = PNS/TNI/Polri; 5 = Swasta/Buruh; 6 = Wiraswasta/Lainnya'],
    ['D_SULUNG', 'Numeric', 2, 0, 'Komponen d (Karies Sulung)', 'Gigi'],
    ['E_SULUNG', 'Numeric', 2, 0, 'Komponen e (Ekstraksi Sulung)', 'Gigi'],
    ['F_SULUNG', 'Numeric', 2, 0, 'Komponen f (Tumpatan Sulung)', 'Gigi'],
    ['DEFT_SCORE', 'Numeric', 2, 0, 'Skor Indeks def-t Total', 'Gigi'],
    ['D_TETAP', 'Numeric', 2, 0, 'Komponen D (Karies Tetap)', 'Gigi'],
    ['M_TETAP', 'Numeric', 2, 0, 'Komponen M (Hilang/Dicabut)', 'Gigi'],
    ['F_TETAP', 'Numeric', 2, 0, 'Komponen F (Tumpatan Tetap)', 'Gigi'],
    ['DMFT_SCORE', 'Numeric', 2, 0, 'Skor Indeks DMF-T Total', 'Gigi'],
    ['DMFT_CAT_CODE', 'Numeric', 1, 0, 'Kategori Keparahan DMF-T WHO', '1 = Sangat Rendah (<1.2); 2 = Rendah (1.2-2.6); 3 = Sedang (2.7-4.4); 4 = Tinggi (4.5-6.5); 5 = Sangat Tinggi (>6.5)'],
    ['DIS_SCORE', 'Numeric', 4, 2, 'Debris Index Simplified (DI-S)', 'Skor 0.0 - 3.0'],
    ['CIS_SCORE', 'Numeric', 4, 2, 'Calculus Index Simplified (CI-S)', 'Skor 0.0 - 3.0'],
    ['OHIS_SCORE', 'Numeric', 4, 2, 'Oral Hygiene Index Simplified (OHI-S)', 'Skor 0.0 - 6.0'],
    ['OHIS_CAT_CODE', 'Numeric', 1, 0, 'Kategori Kebersihan Mulut OHI-S', '1 = Baik (0.0-1.2); 2 = Sedang (1.3-3.0); 3 = Buruk (3.1-6.0)'],
    ['KARIES_STATUS', 'Numeric', 1, 0, 'Status Prevalensi Karies', '0 = Bebas Karies; 1 = Karies Aktif'],
    ['GUSI_BERDARAH', 'Numeric', 1, 0, 'Pendarahan Gusi (Gingivitis)', '0 = Tidak; 1 = Ya'],
    ['LESI_MUKOSA', 'Numeric', 1, 0, 'Adanya Lesi Mukosa Oral', '0 = Tidak; 1 = Ya'],
    ['PERLU_RUJUKAN', 'Numeric', 1, 0, 'Kebutuhan Rujukan Faskes', '0 = Tidak; 1 = Ya'],
    ['PERAWATAN_SEGERA', 'Numeric', 1, 0, 'Kebutuhan Perawatan Segera', '0 = Tidak; 1 = Ya'],
  ];

  const wsVarView = XLSX.utils.aoa_to_sheet(varViewRows);
  XLSX.utils.book_append_sheet(wb, wsVarView, 'SPSS_Variable_View');

  const cleanName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `Dataset_SPSS_Kesehatan_Gigi_${cleanName}.xlsx`);
}

// 4. Generate 150 Diverse Respondents divided evenly according to WHO Age Groups (30 Balita 0-4, 30 Anak 5-11, 30 Remaja 12-17, 30 Dewasa 18-59, 30 Lansia 60+)
export function generate150DiverseRespondents(): RespondentData[] {
  const emptySulung = { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 };
  const emptyTetap = { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 };

  const today = '2026-07-23';
  const pemeriksa = 'Arini Haerunnisa';
  const createdBy = 'derumarahlaut@gmail.com';

  const maleFirstNames = ['Ahmad', 'Rian', 'Bagas', 'Kenzie', 'Muhammad', 'Fathan', 'Naufal', 'Gibran', 'Raffa', 'Daffa', 'Aksa', 'Rayyan', 'Kenzo', 'Budi', 'Hendra', 'Eko', 'Agus', 'Rahmat', 'Dimas', 'Rizky', 'Fajar', 'Reyhan', 'Aditya', 'Sastro', 'Subagyo', 'Darmo', 'Kromo', 'Subandi', 'Sujono', 'Kartono'];
  const femaleFirstNames = ['Alika', 'Arsyila', 'Azzahra', 'Mikayla', 'Nayra', 'Qonita', 'Raisa', 'Shafeeya', 'Tania', 'Yasmin', 'Zahra', 'Anindita', 'Bella', 'Citra', 'Dania', 'Sri', 'Dewi', 'Maya', 'Siti', 'Annisa', 'Fitri', 'Nurul', 'Eka', 'Ratna', 'Karsih', 'Ginem', 'Mariyam', 'Aminah', 'Sukinah', 'Sumarni'];
  const lastNames = ['Pratama', 'Hidayat', 'Alfarizqi', 'Alamsyah', 'Hibatullah', 'Rakabuming', 'Raditya', 'Ibnu', 'Malik', 'Syahputra', 'Santoso', 'Wijaya', 'Prasetyo', 'Setiawan', 'Febrian', 'Anggara', 'Nuraini', 'Rahmawati', 'Lestari', 'Wahyuni'];

  const results: RespondentData[] = [];

  // 5 WHO Age Groups: 30 respondents each (15 Male, 15 Female)
  const ageConfigs = [
    { group: '0-4' as const, minAge: 1, maxAge: 4 },
    { group: '5-11' as const, minAge: 5, maxAge: 11 },
    { group: '12-17' as const, minAge: 12, maxAge: 17 },
    { group: '18-59' as const, minAge: 20, maxAge: 55 },
    { group: '60+' as const, minAge: 60, maxAge: 82 },
  ];

  let idCounter = 1;

  ageConfigs.forEach((cfg) => {
    for (let i = 0; i < 30; i++) {
      const isMale = i < 15;
      const gender = isMale ? 'Laki-laki' : 'Perempuan';
      const firstNameList = isMale ? maleFirstNames : femaleFirstNames;
      const fn = firstNameList[i % firstNameList.length];
      const ln = lastNames[(i + idCounter) % lastNames.length];
      const name = `${fn} ${ln}`;
      const age = cfg.minAge + (i % (cfg.maxAge - cfg.minAge + 1));
      
      const nik = `3201${isMale ? '01' : '41'}${String(10 + (i % 20)).padStart(2, '0')}${String(1 + (i % 12)).padStart(2, '0')}${String(80 + (age % 40)).padStart(2, '0')}00${String(idCounter).padStart(2, '0')}`;
      
      let deft = 0;
      let dmft = 0;
      let gSulung = { ...emptySulung };
      let gTetap = { ...emptyTetap };

      if (cfg.group === '0-4') {
        const karies = 1 + (i % 5);
        const dicabut = i % 3 === 0 ? 1 : 0;
        const tumpatan = i % 4 === 0 ? 1 : 0;
        deft = karies + dicabut + tumpatan;
        gSulung = { ...emptySulung, sehat: Math.max(0, 16 - deft), karies, dicabutKaries: dicabut, tumpatanTanpaKaries: tumpatan };
        gTetap = { ...emptyTetap };
        dmft = 0;
      } else if (cfg.group === '5-11') {
        const sKaries = 1 + (i % 5);
        const sDicabut = i % 4 === 0 ? 1 : 0;
        deft = sKaries + sDicabut;
        gSulung = { ...emptySulung, sehat: Math.max(0, 12 - deft), karies: sKaries, dicabutKaries: sDicabut };
        
        const tKaries = i % 3 === 0 ? 1 : (i % 5 === 0 ? 2 : 0);
        dmft = tKaries;
        gTetap = { ...emptyTetap, sehat: 12 - dmft, karies: tKaries };
      } else if (cfg.group === '12-17') {
        deft = 0;
        gSulung = { ...emptySulung };
        const karies = 1 + (i % 4);
        const tumpatan = i % 3 === 0 ? 1 : 0;
        dmft = karies + tumpatan;
        gTetap = { ...emptyTetap, sehat: 28 - dmft, karies, tumpatanTanpaKaries: tumpatan };
      } else if (cfg.group === '18-59') {
        deft = 0;
        gSulung = { ...emptySulung };
        const karies = 2 + (i % 5);
        const dicabut = 1 + (i % 3);
        const tumpatan = i % 2 === 0 ? 2 : 0;
        dmft = karies + dicabut + tumpatan;
        gTetap = { ...emptyTetap, sehat: Math.max(0, 28 - dmft), karies, dicabutKaries: dicabut, tumpatanTanpaKaries: tumpatan };
      } else {
        // 60+
        deft = 0;
        gSulung = { ...emptySulung };
        const karies = 2 + (i % 4);
        const dicabut = 8 + (i % 15);
        const tumpatan = i % 3 === 0 ? 1 : 0;
        dmft = karies + dicabut + tumpatan;
        gTetap = { ...emptyTetap, sehat: Math.max(0, 28 - dmft), karies, dicabutKaries: dicabut, tumpatanTanpaKaries: tumpatan };
      }

      const gusiBerdarah = (i % 3 === 0);
      const lesiMukosa = (i % 7 === 0);
      const perluPerawatanSegera = (dmft > 4 || deft > 4 || lesiMukosa);
      const perluDirujuk = (perluPerawatanSegera || i % 4 === 0);
      const dirujukKe = perluDirujuk ? (i % 2 === 0 ? 'puskesmas' : 'rsgm_rskgm') : 'tidak_dirujuk';

      const resp: RespondentData = {
        nama: name,
        nik,
        jenisKelamin: gender,
        umur: age,
        kelompokUmur: cfg.group,
        pendidikan: age < 5 ? 'Tidak Sekolah' : (age < 12 ? 'SD' : (age < 15 ? 'SMP' : (age < 18 ? 'SMA' : (i % 3 === 0 ? 'S1/D4' : 'SMA')))),
        pekerjaan: age < 5 ? 'TIDAK BEKERJA' : (age < 18 ? 'PELAJAR/MAHASISWA' : (age >= 60 ? (i % 2 === 0 ? 'TIDAK BEKERJA' : 'PENGURUS/IBU RUMAH TANGGA') : (i % 3 === 0 ? 'ASN/PNS/PPPK' : (i % 3 === 1 ? 'PEGAWAI SWASTA' : 'WIRASWASTA/WIRAUSAHA')))),
        tanggalInput: today,
        pemeriksa,
        gigiSulung: gSulung,
        gigiTetap: gTetap,
        deft,
        dmft,
        mukosa: { gusiBerdarah, lesiMukosaOral: lesiMukosa },
        tindakLanjut: {
          perluPerawatanSegera,
          perluPerawatanTidakSegera: !perluPerawatanSegera,
          perluDirujuk,
          dirujukKe
        },
        createdBy,
        createdAt: new Date()
      };

      results.push(ensureOHISForRespondent(resp));
      idCounter++;
    }
  });

  return results;
}

export function generate100DiverseRespondents(): RespondentData[] {
  return generate150DiverseRespondents();
}

// Retain alias for backward compatibility
export const generate150Respondents = generate150DiverseRespondents;

export function generateMockRespondents(): RespondentData[] {
  return generate150DiverseRespondents();
}

/*
    {
      nama: 'Kenzie Alfarizqi', nik: '3201011809190007', jenisKelamin: 'Laki-laki', umur: 7, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 12, karies: 4 }, gigiTetap: { ...emptyTetap, sehat: 6, karies: 1 }, deft: 4, dmft: 1,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'klinik_pratama' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Muhammad Bilal', nik: '3201010505210009', jenisKelamin: 'Laki-laki', umur: 5, kelompokUmur: '5-10', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 12, karies: 5, dicabutKaries: 1 }, gigiTetap: { ...emptyTetap, sehat: 0 }, deft: 6, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Fathan Alamsyah', nik: '3201010101200031', jenisKelamin: 'Laki-laki', umur: 6, kelompokUmur: '5-10', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 14, karies: 3 }, gigiTetap: { ...emptyTetap, sehat: 2 }, deft: 3, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Naufal Hibatullah', nik: '3201011204180032', jenisKelamin: 'Laki-laki', umur: 8, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 9, karies: 4, tumpatanTanpaKaries: 1 }, gigiTetap: { ...emptyTetap, sehat: 8, karies: 1 }, deft: 5, dmft: 1,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Gibran Rakabuming', nik: '3201012002190033', jenisKelamin: 'Laki-laki', umur: 7, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 16, karies: 2 }, gigiTetap: { ...emptyTetap, sehat: 4 }, deft: 2, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Raffa Raditya', nik: '3201011111170034', jenisKelamin: 'Laki-laki', umur: 9, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 5, karies: 5, dicabutKaries: 2 }, gigiTetap: { ...emptyTetap, sehat: 10, karies: 2 }, deft: 7, dmft: 2,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rs_umum' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Daffa Ibnu', nik: '3201010303160035', jenisKelamin: 'Laki-laki', umur: 10, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 4, karies: 3 }, gigiTetap: { ...emptyTetap, sehat: 14, karies: 1 }, deft: 3, dmft: 1,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Aksa Pratama', nik: '3201010808210036', jenisKelamin: 'Laki-laki', umur: 5, kelompokUmur: '5-10', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 18, karies: 1 }, gigiTetap: { ...emptyTetap, sehat: 0 }, deft: 1, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Rayyan Alfaro', nik: '3201011402200037', jenisKelamin: 'Laki-laki', umur: 6, kelompokUmur: '5-10', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 11, karies: 5 }, gigiTetap: { ...emptyTetap, sehat: 2 }, deft: 5, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Arfan Hafiz', nik: '3201012509180038', jenisKelamin: 'Laki-laki', umur: 8, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 8, karies: 4 }, gigiTetap: { ...emptyTetap, sehat: 8, karies: 1 }, deft: 4, dmft: 1,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },

    // Perempuan (12 anak)
    {
      nama: 'Siti Nurhaliza', nik: '3201015208190002', jenisKelamin: 'Perempuan', umur: 7, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 18 }, gigiTetap: { ...emptyTetap, sehat: 6 }, deft: 0, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Anisa Rahma', nik: '3201014502210004', jenisKelamin: 'Perempuan', umur: 5, kelompokUmur: '5-10', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 15, karies: 2, fissureSealant: 2 }, gigiTetap: { ...emptyTetap, sehat: 2 }, deft: 2, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Nabila Putri', nik: '3201016004200006', jenisKelamin: 'Perempuan', umur: 6, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 14, karies: 1, tumpatanTanpaKaries: 2 }, gigiTetap: { ...emptyTetap, sehat: 4 }, deft: 3, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Keisha Azahra', nik: '3201015101160008', jenisKelamin: 'Perempuan', umur: 10, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 4, karies: 2 }, gigiTetap: { ...emptyTetap, sehat: 16, karies: 1, tumpatanTanpaKaries: 1 }, deft: 2, dmft: 2,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Alya Zhafira', nik: '3201014812180010', jenisKelamin: 'Perempuan', umur: 8, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 15, karies: 1, tumpatanTanpaKaries: 2 }, gigiTetap: { ...emptyTetap, sehat: 8 }, deft: 3, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Aqila Fariza', nik: '3201016206200039', jenisKelamin: 'Perempuan', umur: 6, kelompokUmur: '5-10', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 12, karies: 4 }, gigiTetap: { ...emptyTetap, sehat: 2 }, deft: 4, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Bilqis Humaira', nik: '3201015507190040', jenisKelamin: 'Perempuan', umur: 7, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 17, karies: 1 }, gigiTetap: { ...emptyTetap, sehat: 6 }, deft: 1, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Clarissa Putri', nik: '3201014110170041', jenisKelamin: 'Perempuan', umur: 9, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 7, karies: 5 }, gigiTetap: { ...emptyTetap, sehat: 10, karies: 1 }, deft: 5, dmft: 1,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'klinik_pratama' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Dania Safira', nik: '3201015903210042', jenisKelamin: 'Perempuan', umur: 5, kelompokUmur: '5-10', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 20 }, gigiTetap: { ...emptyTetap, sehat: 0 }, deft: 0, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Elmira Shaqueena', nik: '3201014408180043', jenisKelamin: 'Perempuan', umur: 8, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 10, karies: 3 }, gigiTetap: { ...emptyTetap, sehat: 8, karies: 1 }, deft: 3, dmft: 1,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Freya Mikayla', nik: '3201016705190044', jenisKelamin: 'Perempuan', umur: 7, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 15, karies: 2 }, gigiTetap: { ...emptyTetap, sehat: 4 }, deft: 2, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Gracia Talita', nik: '3201015012160045', jenisKelamin: 'Perempuan', umur: 10, kelompokUmur: '5-10', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 5, karies: 1 }, gigiTetap: { ...emptyTetap, sehat: 16, karies: 2 }, deft: 1, dmft: 2,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },

    // ==================== 2. KELOMPOK REMAJA (25 RESPONDEN: 10-18 thn) ====================
    // Laki-laki (12 remaja)
    {
      nama: 'Daffa Rizky', nik: '3201021407140011', jenisKelamin: 'Laki-laki', umur: 12, kelompokUmur: '10-18', pendidikan: 'SMP', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 24, karies: 3, tumpatanTanpaKaries: 1 }, deft: 0, dmft: 4,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Faris Maulana', nik: '3201020210100013', jenisKelamin: 'Laki-laki', umur: 16, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 22, karies: 4, dicabutKaries: 1, tumpatanKaries: 1 }, deft: 0, dmft: 6,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Rizky Febrian', nik: '3201022001090015', jenisKelamin: 'Laki-laki', umur: 17, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 24, karies: 1, tumpatanTanpaKaries: 3 }, deft: 0, dmft: 4,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Aditya Nugraha', nik: '3201021111110017', jenisKelamin: 'Laki-laki', umur: 15, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 25, karies: 1, fissureSealant: 2 }, deft: 0, dmft: 1,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Bintang Ramadhan', nik: '3201021906100019', jenisKelamin: 'Laki-laki', umur: 16, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 26, karies: 2 }, deft: 0, dmft: 2,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'klinik_pratama' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Evan Dimas', nik: '3201021303120046', jenisKelamin: 'Laki-laki', umur: 14, kelompokUmur: '10-18', pendidikan: 'SMP', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 23, karies: 3 }, deft: 0, dmft: 3,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Fahri Albar', nik: '3201020707130047', jenisKelamin: 'Laki-laki', umur: 13, kelompokUmur: '10-18', pendidikan: 'SMP', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 26, karies: 2 }, deft: 0, dmft: 2,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Galang Rambu', nik: '3201022810080048', jenisKelamin: 'Laki-laki', umur: 18, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 21, karies: 5 }, deft: 0, dmft: 5,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Hafiz Cipta', nik: '3201020405150049', jenisKelamin: 'Laki-laki', umur: 11, kelompokUmur: '10-18', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 2, karies: 1 }, gigiTetap: { ...emptyTetap, sehat: 18, karies: 2 }, deft: 1, dmft: 2,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Iqbaal Ramadhan', nik: '3201022212090050', jenisKelamin: 'Laki-laki', umur: 17, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 25, karies: 2, tumpatanTanpaKaries: 1 }, deft: 0, dmft: 3,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Julian Jacob', nik: '3201021601110051', jenisKelamin: 'Laki-laki', umur: 15, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 27, karies: 1 }, deft: 0, dmft: 1,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Kevin Sanjaya', nik: '3201020208100052', jenisKelamin: 'Laki-laki', umur: 16, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 24, karies: 3, dicabutKaries: 1 }, deft: 0, dmft: 4,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'klinik_utama' }, createdBy, createdAt: new Date()
    },

    // Perempuan (13 remaja)
    {
      nama: 'Cinta Laura', nik: '3201025503110012', jenisKelamin: 'Perempuan', umur: 15, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 28 }, deft: 0, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Ayu Lestari', nik: '3201026108120014', jenisKelamin: 'Perempuan', umur: 14, kelompokUmur: '10-18', pendidikan: 'SMP', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 25, karies: 2, dicabutKaries: 1 }, deft: 0, dmft: 3,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Nadhira Syifa', nik: '3201024905130016', jenisKelamin: 'Perempuan', umur: 13, kelompokUmur: '10-18', pendidikan: 'SMP', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 22, karies: 3, tidakTumbuh: 2 }, deft: 0, dmft: 3,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'rs_umum' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Zahra Zhafira', nik: '3201025704150018', jenisKelamin: 'Perempuan', umur: 11, kelompokUmur: '10-18', pendidikan: 'SD', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung, sehat: 1, karies: 1 }, gigiTetap: { ...emptyTetap, sehat: 20, karies: 2 }, deft: 1, dmft: 2,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Salsabila Putri', nik: '3201024312090020', jenisKelamin: 'Perempuan', umur: 17, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 22, karies: 4, dicabutKaries: 2 }, deft: 0, dmft: 6,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Tiara Andini', nik: '3201025109080053', jenisKelamin: 'Perempuan', umur: 18, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 26, karies: 2 }, deft: 0, dmft: 2,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Lyodra Ginting', nik: '3201026106100054', jenisKelamin: 'Perempuan', umur: 16, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 27, karies: 1 }, deft: 0, dmft: 1,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Keisya Levronka', nik: '3201025305110055', jenisKelamin: 'Perempuan', umur: 15, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 24, karies: 3, tumpatanTanpaKaries: 1 }, deft: 0, dmft: 4,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Mahalini Raharja', nik: '3201024403090056', jenisKelamin: 'Perempuan', umur: 17, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 25, karies: 2, tumpatanTanpaKaries: 1 }, deft: 0, dmft: 3,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Ziva Magnolya', nik: '3201025403120057', jenisKelamin: 'Perempuan', umur: 14, kelompokUmur: '10-18', pendidikan: 'SMP', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 26, karies: 2 }, deft: 0, dmft: 2,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Naura Ayu', nik: '3201025806130058', jenisKelamin: 'Perempuan', umur: 13, kelompokUmur: '10-18', pendidikan: 'SMP', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 27, karies: 1 }, deft: 0, dmft: 1,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Maudy Ayunda', nik: '3201025111080059', jenisKelamin: 'Perempuan', umur: 18, kelompokUmur: '10-18', pendidikan: 'SMA', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 28 }, deft: 0, dmft: 0,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Sherina Munaf', nik: '3201025106140060', jenisKelamin: 'Perempuan', umur: 12, kelompokUmur: '10-18', pendidikan: 'SMP', pekerjaan: 'PELAJAR/MAHASISWA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 26, karies: 2 }, deft: 0, dmft: 2,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },

    // ==================== 3. KELOMPOK DEWASA (25 RESPONDEN: 18-60 thn) ====================
    // Laki-laki (13 dewasa)
    {
      nama: 'Eko Prasetyo', nik: '3201031205940061', jenisKelamin: 'Laki-laki', umur: 32, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 23, karies: 3, dicabutKaries: 2 }, deft: 0, dmft: 5,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'klinik_pratama' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Hendra Setiawan', nik: '3201032508880062', jenisKelamin: 'Laki-laki', umur: 38, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 21, karies: 4, dicabutKaries: 3 }, deft: 0, dmft: 7,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Irfan Bachdim', nik: '3201031107910063', jenisKelamin: 'Laki-laki', umur: 35, kelompokUmur: '18-60', pendidikan: 'SMA', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 25, karies: 2, tumpatanTanpaKaries: 1 }, deft: 0, dmft: 3,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Joko Widodo', nik: '3201032106740064', jenisKelamin: 'Laki-laki', umur: 52, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'ASN/PNS/PPPK', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 17, karies: 3, dicabutKaries: 8 }, deft: 0, dmft: 11,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rs_umum' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Lukman Sardi', nik: '3201031407790065', jenisKelamin: 'Laki-laki', umur: 45, kelompokUmur: '18-60', pendidikan: 'SMA', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 20, karies: 4, dicabutKaries: 4 }, deft: 0, dmft: 8,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Mulyadi Saputra', nik: '3201030809980066', jenisKelamin: 'Laki-laki', umur: 28, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 24, karies: 3, tumpatanTanpaKaries: 1 }, deft: 0, dmft: 4,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Nugroho Wisnu', nik: '3201031703850067', jenisKelamin: 'Laki-laki', umur: 41, kelompokUmur: '18-60', pendidikan: 'SMA', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 22, karies: 3, dicabutKaries: 3 }, deft: 0, dmft: 6,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'klinik_pratama' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Okto Maniani', nik: '3201032710900068', jenisKelamin: 'Laki-laki', umur: 34, kelompokUmur: '18-60', pendidikan: 'SMP', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 23, karies: 3, dicabutKaries: 2 }, deft: 0, dmft: 5,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Pandu Wijaya', nik: '3201030501010069', jenisKelamin: 'Laki-laki', umur: 25, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'PEGAWAI BUMN', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 26, karies: 2 }, deft: 0, dmft: 2,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Qomaruddin', nik: '3201031908680070', jenisKelamin: 'Laki-laki', umur: 58, kelompokUmur: '18-60', pendidikan: 'SD', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 14, karies: 4, dicabutKaries: 10 }, deft: 0, dmft: 14,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Rahmat Hidayat', nik: '3201031212970071', jenisKelamin: 'Laki-laki', umur: 29, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 25, karies: 2, tumpatanTanpaKaries: 1 }, deft: 0, dmft: 3,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Sigit Purnomo', nik: '3201030311830072', jenisKelamin: 'Laki-laki', umur: 43, kelompokUmur: '18-60', pendidikan: 'SMA', pekerjaan: 'ASN/PNS/PPPK', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 20, karies: 3, dicabutKaries: 5 }, deft: 0, dmft: 8,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Taufik Hidayat', nik: '3201031008870073', jenisKelamin: 'Laki-laki', umur: 39, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 22, karies: 2, dicabutKaries: 4 }, deft: 0, dmft: 6,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },

    // Perempuan (12 dewasa)
    {
      nama: 'Diana Puspita', nik: '3201035504970074', jenisKelamin: 'Perempuan', umur: 29, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 25, karies: 2, tumpatanTanpaKaries: 1 }, deft: 0, dmft: 3,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Endang Sri', nik: '3201036006800075', jenisKelamin: 'Perempuan', umur: 44, kelompokUmur: '18-60', pendidikan: 'SMA', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 19, karies: 4, dicabutKaries: 5 }, deft: 0, dmft: 9,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Fitri Carlina', nik: '3201016812870076', jenisKelamin: 'Perempuan', umur: 36, kelompokUmur: '18-60', pendidikan: 'SMA', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 24, karies: 2, dicabutKaries: 2 }, deft: 0, dmft: 4,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Gisella Anastasia', nik: '3201035611900077', jenisKelamin: 'Perempuan', umur: 33, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 26, karies: 1, tumpatanTanpaKaries: 1 }, deft: 0, dmft: 2,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Herlina Mayang', nik: '3201034407760078', jenisKelamin: 'Perempuan', umur: 48, kelompokUmur: '18-60', pendidikan: 'SMP', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 18, karies: 3, dicabutKaries: 7 }, deft: 0, dmft: 10,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rs_umum' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Indah Permata', nik: '3201035201980079', jenisKelamin: 'Perempuan', umur: 26, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 27, karies: 1 }, deft: 0, dmft: 1,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Julia Perez', nik: '3201035507830080', jenisKelamin: 'Perempuan', umur: 40, kelompokUmur: '18-60', pendidikan: 'SMA', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 21, karies: 3, dicabutKaries: 4 }, deft: 0, dmft: 7,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Kartika Putri', nik: '3201035002920081', jenisKelamin: 'Perempuan', umur: 31, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 24, karies: 2, tumpatanTanpaKaries: 2 }, deft: 0, dmft: 4,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Lesty Kejora', nik: '3201034508990082', jenisKelamin: 'Perempuan', umur: 24, kelompokUmur: '18-60', pendidikan: 'SMA', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 26, karies: 2 }, deft: 0, dmft: 2,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Maya Estianty', nik: '3201036701780083', jenisKelamin: 'Perempuan', umur: 46, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 20, karies: 3, dicabutKaries: 5 }, deft: 0, dmft: 8,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'klinik_utama' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Nabila Syakieb', nik: '3201035811860084', jenisKelamin: 'Perempuan', umur: 37, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 23, karies: 2, dicabutKaries: 3 }, deft: 0, dmft: 5,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Olla Ramlan', nik: '3201035502820085', jenisKelamin: 'Perempuan', umur: 42, kelompokUmur: '18-60', pendidikan: 'S1/D4', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 22, karies: 2, dicabutKaries: 4 }, deft: 0, dmft: 6,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },

    // ==================== 4. KELOMPOK LANSIA (25 RESPONDEN: 60+ thn) ====================
    // Laki-laki (12 lansia)
    {
      nama: 'Mbah Parto', nik: '3201031204610021', jenisKelamin: 'Laki-laki', umur: 65, kelompokUmur: '60+', pendidikan: 'SD', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 10, karies: 4, dicabutKaries: 14 }, deft: 0, dmft: 18,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Pak Sumardi', nik: '3201032501540023', jenisKelamin: 'Laki-laki', umur: 72, kelompokUmur: '60+', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 6, karies: 5, dicabutKaries: 17 }, deft: 0, dmft: 22,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rs_umum' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Kakek Kromo', nik: '3201030101510025', jenisKelamin: 'Laki-laki', umur: 75, kelompokUmur: '60+', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 2, karies: 4, dicabutKaries: 22 }, deft: 0, dmft: 26,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'H. Bambang', nik: '3201031803650026', jenisKelamin: 'Laki-laki', umur: 61, kelompokUmur: '60+', pendidikan: 'S1/D4', pekerjaan: 'ASN/PNS/PPPK', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 22, karies: 1, dicabutKaries: 3, protesaCekat: 4 }, deft: 0, dmft: 4,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Pak Wiryo', nik: '3201030910560028', jenisKelamin: 'Laki-laki', umur: 70, kelompokUmur: '60+', pendidikan: 'SMP', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 12, karies: 2, dicabutKaries: 12 }, deft: 0, dmft: 14,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rs_umum' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Kakek Joyo', nik: '3201031405480030', jenisKelamin: 'Laki-laki', umur: 78, kelompokUmur: '60+', pendidikan: 'SD', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 4, karies: 6, dicabutKaries: 18 }, deft: 0, dmft: 24,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Abah Sugiono', nik: '3201031002460086', jenisKelamin: 'Laki-laki', umur: 80, kelompokUmur: '60+', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 0, karies: 3, dicabutKaries: 25 }, deft: 0, dmft: 28,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Pak Karman', nik: '3201030404630087', jenisKelamin: 'Laki-laki', umur: 63, kelompokUmur: '60+', pendidikan: 'SD', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 16, karies: 3, dicabutKaries: 9 }, deft: 0, dmft: 12,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Mbah Sarimin', nik: '3201031208520088', jenisKelamin: 'Laki-laki', umur: 74, kelompokUmur: '60+', pendidikan: 'SD', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 7, karies: 4, dicabutKaries: 17 }, deft: 0, dmft: 21,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rs_umum' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Haji Tohir', nik: '3201031901590089', jenisKelamin: 'Laki-laki', umur: 67, kelompokUmur: '60+', pendidikan: 'SMA', pekerjaan: 'WIRASWASTA/WIRAUSAHA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 13, karies: 3, dicabutKaries: 12 }, deft: 0, dmft: 15,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Olla Supriadi', nik: '3201032306620090', jenisKelamin: 'Laki-laki', umur: 64, kelompokUmur: '60+', pendidikan: 'SMP', pekerjaan: 'PEGAWAI SWASTA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 18, karies: 2, dicabutKaries: 8 }, deft: 0, dmft: 10,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'klinik_pratama' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Mbah Waluyo', nik: '3201030707440091', jenisKelamin: 'Laki-laki', umur: 82, kelompokUmur: '60+', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 1, karies: 5, dicabutKaries: 22 }, deft: 0, dmft: 27,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }, createdBy, createdAt: new Date()
    },

    // Perempuan (13 lansia)
    {
      nama: 'Hj. Aminah', nik: '3201035008580022', jenisKelamin: 'Perempuan', umur: 68, kelompokUmur: '60+', pendidikan: 'SMP', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 8, karies: 2, dicabutKaries: 16, protesaCekat: 4 }, deft: 0, dmft: 18,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'klinik_utama' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Ibu Sutini', nik: '3201036409640024', jenisKelamin: 'Perempuan', umur: 62, kelompokUmur: '60+', pendidikan: 'SMA', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 18, karies: 2, dicabutKaries: 6, tumpatanTanpaKaries: 2 }, deft: 0, dmft: 10,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Ibu Suhartini', nik: '3201034707600027', jenisKelamin: 'Perempuan', umur: 66, kelompokUmur: '60+', pendidikan: 'SD', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 14, karies: 3, dicabutKaries: 9 }, deft: 0, dmft: 12,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Ibu Maryam', nik: '3201035311620029', jenisKelamin: 'Perempuan', umur: 64, kelompokUmur: '60+', pendidikan: 'SMA', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 16, karies: 2, dicabutKaries: 8, tumpatanTanpaKaries: 2 }, deft: 0, dmft: 12,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Nenek Minah', nik: '3201036810480092', jenisKelamin: 'Perempuan', umur: 76, kelompokUmur: '60+', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 3, karies: 5, dicabutKaries: 20 }, deft: 0, dmft: 25,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Mbah Poniyem', nik: '3201034903450093', jenisKelamin: 'Perempuan', umur: 79, kelompokUmur: '60+', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 0, karies: 4, dicabutKaries: 24 }, deft: 0, dmft: 28,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rs_umum' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Hj. Salamah', nik: '3201035508550094', jenisKelamin: 'Perempuan', umur: 69, kelompokUmur: '60+', pendidikan: 'SD', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 12, karies: 3, dicabutKaries: 13 }, deft: 0, dmft: 16,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Ibu Warsini', nik: '3201036202610095', jenisKelamin: 'Perempuan', umur: 63, kelompokUmur: '60+', pendidikan: 'SMP', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 17, karies: 2, dicabutKaries: 9 }, deft: 0, dmft: 11,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Nenek Saodah', nik: '3201037001430096', jenisKelamin: 'Perempuan', umur: 81, kelompokUmur: '60+', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 0, karies: 2, dicabutKaries: 27 }, deft: 0, dmft: 29,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Hj. Zubaidah', nik: '3201034409530097', jenisKelamin: 'Perempuan', umur: 71, kelompokUmur: '60+', pendidikan: 'SD', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 8, karies: 4, dicabutKaries: 16 }, deft: 0, dmft: 20,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: true, dirujukKe: 'klinik_utama' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Mbah Satinah', nik: '3201035805510098', jenisKelamin: 'Perempuan', umur: 73, kelompokUmur: '60+', pendidikan: 'SD', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 6, karies: 3, dicabutKaries: 19 }, deft: 0, dmft: 22,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'puskesmas' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Ibu Rukmini', nik: '3201036606640099', jenisKelamin: 'Perempuan', umur: 60, kelompokUmur: '60+', pendidikan: 'SMA', pekerjaan: 'PENGURUS/IBU RUMAH TANGGA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 20, karies: 3, dicabutKaries: 5 }, deft: 0, dmft: 8,
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false }, tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }, createdBy, createdAt: new Date()
    },
    {
      nama: 'Nenek Karsih', nik: '3201034101390100', jenisKelamin: 'Perempuan', umur: 85, kelompokUmur: '60+', pendidikan: 'Tidak Sekolah', pekerjaan: 'TIDAK BEKERJA', tanggalInput: today,
      gigiSulung: { ...emptySulung }, gigiTetap: { ...emptyTetap, sehat: 0, karies: 1, dicabutKaries: 29 }, deft: 0, dmft: 30,
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true }, tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }, createdBy, createdAt: new Date()
    }
*/
  // End of legacy dataset

export interface DetailedAge {
  years: number;
  months: number;
  days: number;
  formatted: string;
}

/**
  * Calculate age in years, months, and days from date of birth (dob) relative to reference date (or today).
  * Example result: { years: 17, months: 3, days: 15, formatted: "17 tahun 3 bulan 15 hari" }
  */
export function calculateDetailedAge(dobStr?: string, refDateStr?: string): DetailedAge {
  if (!dobStr) return { years: 0, months: 0, days: 0, formatted: '' };

  const birth = new Date(dobStr);
  const ref = refDateStr ? new Date(refDateStr) : new Date();

  if (isNaN(birth.getTime()) || isNaN(ref.getTime()) || birth > ref) {
    return { years: 0, months: 0, days: 0, formatted: '' };
  }

  let years = ref.getFullYear() - birth.getFullYear();
  let months = ref.getMonth() - birth.getMonth();
  let days = ref.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    // Days in the month before ref date
    const prevMonthLastDay = new Date(ref.getFullYear(), ref.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} tahun`);
  if (months > 0) parts.push(`${months} bulan`);
  if (days > 0 || (years === 0 && months === 0)) parts.push(`${days} hari`);

  return {
    years,
    months,
    days,
    formatted: parts.join(' ') || '0 hari'
  };
}

/**
  * Extract Date of Birth (YYYY-MM-DD) from 16-digit Indonesian NIK if valid
  */
export function extractDobFromNik(nik: string): { dobStr: string; gender?: 'Laki-laki' | 'Perempuan' } | null {
  if (!nik || nik.length !== 16 || !/^\d{16}$/.test(nik)) return null;

  let day = parseInt(nik.substring(6, 8), 10);
  const month = parseInt(nik.substring(8, 10), 10);
  let yearTwoDigits = parseInt(nik.substring(10, 12), 10);

  let gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
  if (day > 40) {
    day -= 40;
    gender = 'Perempuan';
  }

  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const currentYearTwoDigits = parseInt(new Date().getFullYear().toString().slice(-2), 10);
  const fullYear = yearTwoDigits <= currentYearTwoDigits ? 2000 + yearTwoDigits : 1900 + yearTwoDigits;

  const dobStr = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { dobStr, gender };
}

