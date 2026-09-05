import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../../services/api';
import { AuditLogItem } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';
import { History, Search, RefreshCw, ShieldCheck, FileText } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await analyticsAPI.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return l.action.toLowerCase().includes(term) ||
      l.user_email.toLowerCase().includes(term) ||
      (l.details && l.details.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <History className="h-6 w-6 text-purple-400" />
            <span>Governance & Clinical Audit Trail</span>
          </h1>
          <p className="text-xs text-gray-500">
            Immutable traceability ledger recording bed state changes, emergency routing actions, and doctor documentation.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-200 self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-gray-200 bg-gray-100/60 p-4 glass-panel">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, email, details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-gray-200 bg-gray-100/80 overflow-hidden glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">User</th>
                <th className="p-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-200/30 transition">
                  <td className="p-4 text-gray-500 whitespace-nowrap">
                    {formatDate(log.timestamp)} {formatTime(log.timestamp)}
                  </td>
                  <td className="p-4">
                    <span className="rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 px-2 py-0.5 font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}</td>
                  <td className="p-4 text-teal-400">{log.user_email}</td>
                  <td className="p-4 text-gray-600 font-sans max-w-md truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
