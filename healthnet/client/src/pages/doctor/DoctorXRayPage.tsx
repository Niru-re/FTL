import React, { useState, useRef, useCallback, useEffect } from 'react';
import { xrayAPI, doctorAPI } from '../../services/api';
import { XRayPredictionResult, XRayAnalysisRecord, DoctorPatient } from '../../types';
import {
  Upload, ScanLine, Activity, AlertTriangle, CheckCircle2,
  Clock, User, FileImage, X, Info, History,
  Loader2, Brain, Microscope, ShieldAlert, Zap, Search, RefreshCw
} from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// ── Confidence ring (SVG) ─────────────────────────────────────────────────────
const ConfidenceRing: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
  const pct    = Math.round(value * 100);
  const r      = 36;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} stroke="#e5e7eb" strokeWidth="8" fill="none" />
        <circle
          cx="44" cy="44" r={r}
          stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x="44" y="48" textAnchor="middle" fill="#1f2937" fontSize="15" fontWeight="700">{pct}%</text>
      </svg>
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );
};

// ── Result card ───────────────────────────────────────────────────────────────
const ResultCard: React.FC<{ result: XRayPredictionResult; imageUrl: string | null }> = ({ result, imageUrl }) => {
  const isPneumonia = result.prediction === 'PNEUMONIA';
  return (
    <div className={`rounded-2xl border p-6 space-y-5 shadow-card ${
      isPneumonia
        ? 'border-rose-200 bg-rose-50'
        : 'border-emerald-200 bg-emerald-50'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        {isPneumonia ? (
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-rose-100 border border-rose-200">
            <AlertTriangle className="h-6 w-6 text-rose-500" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-100 border border-emerald-200">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
        )}
        <div>
          <div className={`text-2xl font-black tracking-tight ${isPneumonia ? 'text-rose-700' : 'text-emerald-700'}`}>
            {result.prediction}
          </div>
          <div className="text-xs text-gray-500 font-medium">AI Classification Result — {result.architecture}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-gray-400">Model v{result.model_version}</div>
          {result.patient_name && (
            <div className="text-xs font-semibold text-orange-500 mt-1 flex items-center gap-1 justify-end">
              <User className="h-3 w-3" />{result.patient_name}
            </div>
          )}
        </div>
      </div>

      {/* Confidence rings */}
      <div className="flex items-center justify-around py-2 bg-white rounded-xl border border-gray-100">
        <ConfidenceRing value={result.normal_probability}    label="Normal"    color="#16a34a" />
        <div className="h-20 w-px bg-gray-200" />
        <ConfidenceRing value={result.pneumonia_probability} label="Pneumonia" color="#dc2626" />
      </div>

      {/* Probability bars */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Normal</span><span>{(result.normal_probability * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${result.normal_probability * 100}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2 mb-1">
          <span>Pneumonia</span><span>{(result.pneumonia_probability * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full rounded-full bg-rose-500 transition-all duration-700" style={{ width: `${result.pneumonia_probability * 100}%` }} />
        </div>
      </div>

      {/* X-ray preview */}
      {imageUrl && (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <img src={imageUrl} alt="Uploaded chest X-ray" className="w-full max-h-64 object-contain bg-gray-50" />
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
        <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-relaxed">{result.disclaimer}</p>
      </div>
    </div>
  );
};

// ── History row ───────────────────────────────────────────────────────────────
const HistoryRow: React.FC<{ scan: XRayAnalysisRecord }> = ({ scan }) => {
  const isPneumonia = scan.prediction === 'PNEUMONIA';
  return (
    <tr className="border-b border-gray-100 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-50/40 transition">
      <td className="py-3 px-4">
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
          isPneumonia ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {isPneumonia ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          {scan.prediction}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center">
            <User className="h-3 w-3 text-orange-500" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-800">{scan.patient_name || <span className="text-gray-400 italic">Unlinked</span>}</div>
            {scan.patient_mrn && <div className="text-[10px] text-gray-400">{scan.patient_mrn}</div>}
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-xs font-bold text-gray-800">{(scan.confidence * 100).toFixed(1)}%</span>
      </td>
      <td className="py-3 px-4">
        {scan.image_url ? (
          <a href={`${API_BASE}${scan.image_url}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-orange-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-orange-600 font-medium">
            <FileImage className="h-3 w-3" />{scan.original_filename || 'View'}
          </a>
        ) : <span className="text-[11px] text-gray-400 italic">No image</span>}
      </td>
      <td className="py-3 px-4 text-[11px] text-gray-500">
        <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(scan.created_at).toLocaleString()}</div>
      </td>
      <td className="py-3 px-4 text-[11px] text-gray-500">{scan.created_by}</td>
    </tr>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export const DoctorXRayPage: React.FC = () => {
  const [file,              setFile]              = useState<File | null>(null);
  const [previewUrl,        setPreviewUrl]        = useState<string | null>(null);
  const [isDragging,        setIsDragging]        = useState(false);
  const [isAnalyzing,       setIsAnalyzing]       = useState(false);
  const [result,            setResult]            = useState<XRayPredictionResult | null>(null);
  const [error,             setError]             = useState<string | null>(null);
  const [patients,          setPatients]          = useState<DoctorPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [notes,             setNotes]             = useState('');
  const [patientSearch,     setPatientSearch]     = useState('');
  const [history,           setHistory]           = useState<XRayAnalysisRecord[]>([]);
  const [historyLoading,    setHistoryLoading]    = useState(false);
  const [activeTab,         setActiveTab]         = useState<'scan' | 'history'>('scan');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { doctorAPI.getPatients().then(setPatients).catch(() => {}); }, []);
  useEffect(() => {
    if (activeTab === 'history') {
      setHistoryLoading(true);
      xrayAPI.getXRayHistory(null, 50).then(setHistory).catch(() => setHistory([])).finally(() => setHistoryLoading(false));
    }
  }, [activeTab]);

  const handleFile = useCallback((f: File) => {
    setFile(f); setResult(null); setError(null);
    setPreviewUrl(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && ['image/jpeg', 'image/png', 'image/jpg'].includes(dropped.type)) handleFile(dropped);
    else setError('Please upload a JPEG or PNG image.');
  }, [handleFile]);

  const clearFile = () => {
    setFile(null); setPreviewUrl(null); setResult(null); setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runAnalysis = async () => {
    if (!file) return;
    setIsAnalyzing(true); setError(null); setResult(null);
    try {
      const res = await xrayAPI.predictXRay(file, selectedPatientId, notes || undefined, true);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Analysis failed.');
    } finally { setIsAnalyzing(false); }
  };

  const filteredPatients = patients.filter(p =>
    p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.mrn?.toLowerCase().includes(patientSearch.toLowerCase()) ?? false)
  );
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="space-y-6 pb-8">

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-orange-50 border border-orange-200">
              <Brain className="h-5 w-5 text-orange-500" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">AI X-Ray Screening</h1>
          </div>
          <p className="text-sm text-gray-500 ml-14">
            EfficientNet-B0 Pneumonia Classifier &nbsp;&middot;&nbsp;
            <span className="text-emerald-600 font-semibold">86.2% Accuracy</span>&nbsp;&middot;&nbsp;
            <span className="text-orange-500 font-semibold">99.2% Pneumonia Recall</span>
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-card">
          {(['scan', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeTab === tab
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-gray-800'
              }`}>
              {tab === 'scan'
                ? <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" />New Scan</span>
                : <span className="flex items-center gap-1.5"><History className="h-3 w-3" />Scan History</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scan tab ── */}
      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Left: Upload + controls */}
          <div className="space-y-4">

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                isDragging ? 'border-orange-400 bg-orange-50 scale-[1.01]' : 'border-gray-300 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-orange-300 bg-white'
              }`}
              style={{ minHeight: 220 }}
            >
              <input
                ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              {file && previewUrl ? (
                <div className="relative p-4">
                  <button
                    onClick={e => { e.stopPropagation(); clearFile(); }}
                    className="absolute top-3 right-3 z-10 flex items-center justify-center h-7 w-7 rounded-full bg-white border border-gray-200 text-gray-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-rose-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-rose-200 transition shadow-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <img src={previewUrl} alt="X-ray preview" className="rounded-xl object-contain max-h-56 w-full bg-gray-50 border border-gray-100" />
                  <div className="mt-2 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
                    <FileImage className="h-3.5 w-3.5 text-orange-500" />
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                  <div className="mb-4 flex items-center justify-center h-14 w-14 rounded-2xl bg-orange-50 border border-orange-200">
                    <Upload className="h-7 w-7 text-orange-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-700 mb-1">Drop Chest X-Ray Here</p>
                  <p className="text-xs text-gray-400">or click to browse &middot; JPEG / PNG &middot; Max 10 MB</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
                    <Microscope className="h-3.5 w-3.5" />Supports PA, AP, and lateral chest radiographs
                  </div>
                </div>
              )}
            </div>

            {/* Link to patient */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 shadow-card">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <User className="h-4 w-4 text-orange-500" />
                Link to Patient
                <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </div>
              {selectedPatient ? (
                <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3 py-2">
                  <div>
                    <div className="text-xs font-bold text-orange-600">{selectedPatient.full_name}</div>
                    <div className="text-[10px] text-gray-400">{selectedPatient.mrn}</div>
                  </div>
                  <button onClick={() => { setSelectedPatientId(null); setPatientSearch(''); }}
                    className="text-gray-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-rose-500 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search patient name or MRN..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
                  />
                  {patientSearch && filteredPatients.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                      {filteredPatients.slice(0, 10).map(p => (
                        <button key={p.id} onClick={() => { setSelectedPatientId(p.id); setPatientSearch(''); }}
                          className="w-full text-left px-4 py-2.5 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-50 transition border-b border-gray-100 last:border-0">
                          <div className="text-xs font-semibold text-gray-800">{p.full_name}</div>
                          <div className="text-[10px] text-gray-400">{p.mrn} &middot; {p.status}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {patientSearch && filteredPatients.length === 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3">
                      <p className="text-xs text-gray-400 text-center">No patients found</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Clinical notes */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 shadow-card">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Clinical Notes</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add clinical context, symptoms, relevant history..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none transition"
              />
            </div>

            {/* Run button */}
            <button
              onClick={runAnalysis}
              disabled={!file || isAnalyzing}
              className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-sm ${
                !file || isAnalyzing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-orange-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-600 text-white cursor-pointer'
              }`}
            >
              {isAnalyzing
                ? <><Loader2 className="h-5 w-5 animate-spin" />Analyzing Radiograph...</>
                : <><Brain className="h-5 w-5" />Run AI Pneumonia Screen</>}
            </button>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-600">{error}</p>
              </div>
            )}
          </div>

          {/* Right: Result */}
          <div>
            {result ? (
              <ResultCard result={result} imageUrl={previewUrl} />
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white h-full flex flex-col items-center justify-center py-20 text-center px-8 shadow-card">
                <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gray-100 mb-4">
                  <ScanLine className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-400">Analysis results appear here</p>
                <p className="text-xs text-gray-400 mt-1.5 max-w-xs">
                  Upload a chest X-ray and click Run AI Pneumonia Screen to get an instant AI-powered diagnostic assessment.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-xs">
                  {[
                    { icon: Activity,    label: '86.2% Accuracy'  },
                    { icon: ShieldAlert, label: '99.2% Recall'    },
                    { icon: Zap,         label: 'Sub-second'      },
                    { icon: Brain,       label: 'EfficientNet-B0' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <Icon className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-[11px] font-semibold text-gray-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── History tab ── */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-gray-800">Scan History</span>
              <span className="text-xs text-gray-400 bg-white rounded-full px-2 py-0.5 border border-gray-200">{history.length} records</span>
            </div>
            <button
              onClick={() => { setHistoryLoading(true); xrayAPI.getXRayHistory(null, 50).then(setHistory).finally(() => setHistoryLoading(false)); }}
              className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-orange-500 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </button>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <History className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-400">No scans recorded yet</p>
              <p className="text-xs text-gray-400 mt-1">Run your first AI X-ray screen to see results here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Result', 'Patient', 'Confidence', 'Image', 'Timestamp', 'Performed By'].map(h => (
                      <th key={h} className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(scan => <HistoryRow key={scan.id} scan={scan} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorXRayPage;
