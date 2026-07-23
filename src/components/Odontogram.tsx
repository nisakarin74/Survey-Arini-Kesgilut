import React from 'react';

interface OdontogramProps {
  teethStatus: Record<string, string>;
  onChange?: (toothNum: string, newStatus: string) => void;
  readOnly?: boolean;
}

// WHO/FDI teeth classifications and codes
export const PERMANENT_CODES = [
  { code: '0', label: '0 - Sehat (Sound)' },
  { code: '1', label: '1 - Karies / Gigi Berlubang (D)' },
  { code: '2', label: '2 - Tumpatan dengan Karies' },
  { code: '3', label: '3 - Tumpatan tanpa Karies (F)' },
  { code: '4', label: '4 - Gigi Dicabut karena Karies (M)' },
  { code: '5', label: '5 - Gigi Dicabut sebab lain' },
  { code: '6', label: '6 - Fissure Sealant' },
  { code: '7', label: '7 - Protesa Cekat / Crown / Implan' },
  { code: '8', label: '8 - Gigi Tidak Tumbuh (Unerupted)' },
  { code: '9', label: '9 - Lain-lain / Tidak Tercatat' }
];

export const DECIDUOUS_CODES = [
  { code: 'A', label: 'A - Sehat (Sound)' },
  { code: 'B', label: 'B - Karies / Gigi Berlubang (d)' },
  { code: 'C', label: 'C - Tumpatan dengan Karies' },
  { code: 'D', label: 'D - Tumpatan tanpa Karies (f)' },
  { code: 'E', label: 'E - Gigi Dicabut karena Karies (e)' },
  { code: 'F', label: 'F - Gigi Dicabut sebab lain' },
  { code: 'G', label: 'G - Fissure Sealant' },
  { code: 'H', label: 'H - Protesa Cekat / Crown / Implan' },
  { code: 'I', label: 'I - Gigi Tidak Tumbuh' },
  { code: 'J', label: 'J - Lain-lain / Tidak Tercatat' }
];

interface ToothCardProps {
  key?: React.Key;
  num: string;
  isDeciduous: boolean;
  teethStatus: Record<string, string>;
  onChange?: (toothNum: string, newStatus: string) => void;
  readOnly?: boolean;
}

const ToothCard = ({ num, isDeciduous, teethStatus, onChange, readOnly = false }: ToothCardProps) => {
  const val = teethStatus[num] || (isDeciduous ? 'A' : '0');
  const options = isDeciduous ? DECIDUOUS_CODES : PERMANENT_CODES;
  
  // Highlight colors based on status (red for caries, green for filled, yellow/grey for others)
  let cardBg = 'bg-[#FDF2B3]/90'; // Default signature light yellow from the image
  let textAndBorder = 'text-amber-950 border-amber-300/60';
  
  if (val === '1' || val === 'B') {
    cardBg = 'bg-rose-100 border-rose-300';
    textAndBorder = 'text-rose-950 border-rose-300/60';
  } else if (val === '3' || val === 'D') {
    cardBg = 'bg-emerald-100 border-emerald-300';
    textAndBorder = 'text-emerald-950 border-emerald-300/60';
  } else if (val === '4' || val === 'E') {
    cardBg = 'bg-slate-200 border-slate-350';
    textAndBorder = 'text-slate-800 border-slate-400/50';
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-1">
      <span className="text-[11px] font-extrabold text-slate-700 font-mono">{num}</span>
      
      {readOnly ? (
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl border font-black text-sm shadow-2xs ${cardBg} ${textAndBorder}`}>
          {val}
        </div>
      ) : (
        <div className={`relative w-11 h-10 rounded-xl border shadow-2xs ${cardBg} ${textAndBorder} transition-all hover:scale-105 hover:shadow-xs flex items-center justify-center`}>
          <select
            value={val}
            onChange={(e) => onChange && onChange(num, e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title={`Gigi ${num}`}
          >
            {options.map(opt => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="font-black text-sm mr-1 font-mono">{val}</span>
          <span className="text-[9px] text-slate-500 font-bold">▾</span>
        </div>
      )}
    </div>
  );
};

export default function Odontogram({ teethStatus, onChange, readOnly = false }: OdontogramProps) {
  // Tooth definitions
  const upperRightPerm = ['18', '17', '16', '15', '14', '13', '12', '11'];
  const upperLeftPerm = ['21', '22', '23', '24', '25', '26', '27', '28'];
  
  const upperRightDecid = ['55', '54', '53', '52', '51'];
  const upperLeftDecid = ['61', '62', '63', '64', '65'];
  
  const lowerRightDecid = ['85', '84', '83', '82', '81'];
  const lowerLeftDecid = ['71', '72', '73', '74', '75'];
  
  const lowerRightPerm = ['48', '47', '46', '45', '44', '43', '42', '41'];
  const lowerLeftPerm = ['31', '32', '33', '34', '35', '36', '37', '38'];

  return (
    <div className="w-full bg-white/45 backdrop-blur-md rounded-3xl p-5 border border-white/50 shadow-md space-y-6" id="odontogram-visual-card">
      <div className="flex items-center justify-between border-b border-white/30 pb-3">
        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2">
          🦷 Visualisasi Odontogram (FDI Two-Digit)
        </h4>
        <span className="text-[10px] bg-indigo-100/50 text-indigo-800 px-2.5 py-1 rounded-full font-black border border-indigo-200/20 uppercase tracking-wide">
          Standard WHO Oral Survey
        </span>
      </div>

      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-[760px] space-y-3 p-1">
          
          {/* UPPER DENTITION (Maxilla / RA) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-black text-indigo-950/70 uppercase tracking-wider px-2">
              <span>RA Kanan (Upper Right)</span>
              <span>RA Kiri (Upper Left)</span>
            </div>

            {/* Row 1 & Row 2 Grid */}
            <div className="flex items-center">
              {/* Left Side (RA Kanan) */}
              <div className="flex-1 pr-4">
                {/* Row 1: Permanent */}
                <div className="grid grid-cols-8 gap-1.5 justify-items-center">
                  {upperRightPerm.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={false} teethStatus={teethStatus} onChange={onChange} readOnly={readOnly} />
                  ))}
                </div>
                {/* Row 2: Deciduous (aligned to midline columns 4-8) */}
                <div className="grid grid-cols-8 gap-1.5 justify-items-center mt-3">
                  <div className="col-span-3"></div> {/* Empty space */}
                  {upperRightDecid.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={true} teethStatus={teethStatus} onChange={onChange} readOnly={readOnly} />
                  ))}
                </div>
              </div>

              {/* Vertical Midline Divider */}
              <div className="w-[3px] bg-slate-400 self-stretch rounded-full mx-1"></div>

              {/* Right Side (RA Kiri) */}
              <div className="flex-1 pl-4">
                {/* Row 1: Permanent */}
                <div className="grid grid-cols-8 gap-1.5 justify-items-center">
                  {upperLeftPerm.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={false} teethStatus={teethStatus} onChange={onChange} readOnly={readOnly} />
                  ))}
                </div>
                {/* Row 2: Deciduous (aligned to midline columns 1-5) */}
                <div className="grid grid-cols-8 gap-1.5 justify-items-center mt-3">
                  {upperLeftDecid.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={true} teethStatus={teethStatus} onChange={onChange} readOnly={readOnly} />
                  ))}
                  <div className="col-span-3"></div> {/* Empty space */}
                </div>
              </div>
            </div>
          </div>

          {/* Horizontal Midline Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t-2 border-slate-400/80"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-400 text-white font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                Garis Oklusal / Midline
              </span>
            </div>
          </div>

          {/* LOWER DENTITION (Mandible / RB) */}
          <div className="space-y-4">
            {/* Row 3 & Row 4 Grid */}
            <div className="flex items-center">
              {/* Left Side (RB Kanan) */}
              <div className="flex-1 pr-4">
                {/* Row 3: Deciduous (aligned to midline columns 4-8) */}
                <div className="grid grid-cols-8 gap-1.5 justify-items-center mb-3">
                  <div className="col-span-3"></div> {/* Empty space */}
                  {lowerRightDecid.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={true} teethStatus={teethStatus} onChange={onChange} readOnly={readOnly} />
                  ))}
                </div>
                {/* Row 4: Permanent */}
                <div className="grid grid-cols-8 gap-1.5 justify-items-center">
                  {lowerRightPerm.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={false} teethStatus={teethStatus} onChange={onChange} readOnly={readOnly} />
                  ))}
                </div>
              </div>

              {/* Vertical Midline Divider */}
              <div className="w-[3px] bg-slate-400 self-stretch rounded-full mx-1"></div>

              {/* Right Side (RB Kiri) */}
              <div className="flex-1 pl-4">
                {/* Row 3: Deciduous (aligned to midline columns 1-5) */}
                <div className="grid grid-cols-8 gap-1.5 justify-items-center mb-3">
                  {lowerLeftDecid.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={true} teethStatus={teethStatus} onChange={onChange} readOnly={readOnly} />
                  ))}
                  <div className="col-span-3"></div> {/* Empty space */}
                </div>
                {/* Row 4: Permanent */}
                <div className="grid grid-cols-8 gap-1.5 justify-items-center">
                  {lowerLeftPerm.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={false} teethStatus={teethStatus} onChange={onChange} readOnly={readOnly} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-black text-indigo-950/70 uppercase tracking-wider px-2 pt-1">
              <span>RB Kanan (Lower Right)</span>
              <span>RB Kiri (Lower Left)</span>
            </div>
          </div>

        </div>
      </div>

      {/* Legend / Petunjuk Kode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/40 p-4 rounded-2xl border border-white/50 text-xs shadow-inner">
        <div className="space-y-1.5">
          <span className="font-extrabold text-indigo-950 block border-b border-indigo-950/10 pb-1 uppercase text-[10px] tracking-widest">
            KODE GIGI TETAP (PERMANENT)
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 font-medium">
            {PERMANENT_CODES.map(c => (
              <div key={c.code} className="flex gap-1 items-center">
                <span className="w-4 font-black font-mono text-indigo-900">{c.code}</span>
                <span className="truncate">{c.label.substring(4)}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-1.5">
          <span className="font-extrabold text-indigo-950 block border-b border-indigo-950/10 pb-1 uppercase text-[10px] tracking-widest">
            KODE GIGI SULUNG (DECIDUOUS)
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 font-medium">
            {DECIDUOUS_CODES.map(c => (
              <div key={c.code} className="flex gap-1 items-center">
                <span className="w-4 font-black font-mono text-emerald-800">{c.code}</span>
                <span className="truncate">{c.label.substring(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
