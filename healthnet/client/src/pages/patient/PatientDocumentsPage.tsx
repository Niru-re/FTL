import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Download, Eye, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { PatientDocumentItem } from '../../types';

export const PatientDocumentsPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<PatientDocumentItem | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setIsLoading(true);
        const res = await patientAPI.getDocuments(selectedPatientId || undefined);
        setDocuments(res);
      } catch (err) {
        console.warn('Failed to load documents', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocs();
  }, [selectedPatientId]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Medical Records</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Patient Documents & Records
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Authorized discharge summaries, lab reports, prescriptions, and clinical visit records.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-xs font-semibold">
          <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
          Loading patient documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-gray-400">
          <FileText className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">No documents currently released</p>
          <p className="text-xs text-gray-500 mt-1">Authorized medical summaries will appear here once finalized by your physician.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-200 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                    {doc.document_type.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {new Date(doc.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2.5">{doc.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                  {doc.summary || 'Official clinical document prepared and signed by attending healthcare providers.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">PDF • Verified Record</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <a
                    href={doc.file_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-gray-100/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                  {selectedDoc.document_type.replace('_', ' ')}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedDoc.title}</h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-full text-gray-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed max-h-60 overflow-y-auto">
              <p className="font-semibold text-slate-900 mb-2">Executive Summary & Instructions:</p>
              <p>{selectedDoc.summary}</p>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-gray-400">
                <p>Status: Signed & Verified by Medical Staff</p>
                <p>Archive ID: DOC-{selectedDoc.id}-HNC-2026</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
              <a
                href={selectedDoc.file_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Open Full File
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
