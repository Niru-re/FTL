import React, { useState } from 'react';
import { Bed, BedStatus } from '../../types';
import { bedsAPI } from '../../services/api';
import { StatusBadge } from './StatusBadge';
import { X, BedDouble, CheckCircle, RefreshCw } from 'lucide-react';

interface BedStatusModalProps {
  bed: Bed | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BedStatusModal: React.FC<BedStatusModalProps> = ({
  bed,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedStatus, setSelectedStatus] = useState<BedStatus>(bed?.status || 'AVAILABLE');
  const [notes, setNotes] = useState(bed?.notes || '');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !bed) return null;

  const validStatuses: { status: BedStatus; label: string; desc: string }[] = [
    { status: 'AVAILABLE', label: 'Available', desc: 'Bed is sanitized and ready for patient admission.' },
    { status: 'OCCUPIED', label: 'Occupied', desc: 'Patient is actively admitted in this bed.' },
    { status: 'RESERVED', label: 'Reserved', desc: 'Pre-allocated for incoming emergency or transfer.' },
    { status: 'CLEANING', label: 'Cleaning & Sanitization', desc: 'Undergoing terminal cleaning protocol.' },
    { status: 'MAINTENANCE', label: 'Maintenance', desc: 'Medical gas, monitor, or hardware servicing.' },
    { status: 'OUT_OF_SERVICE', label: 'Out of Service', desc: 'Temporarily decommissioned.' },
  ];

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await bedsAPI.updateStatus(bed.id, selectedStatus, notes);
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-gray-100 shadow-2xl p-6 glass-panel">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Bed State Management</h3>
              <p className="text-xs text-gray-500">Bed <span className="font-mono text-teal-300 font-bold">{bed.code}</span> &bull; {bed.hospital_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Select Target Status Transition</label>
            <div className="space-y-2">
              {validStatuses.map((item) => (
                <div
                  key={item.status}
                  onClick={() => setSelectedStatus(item.status)}
                  className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition ${
                    selectedStatus === item.status
                      ? 'border-teal-500 bg-teal-500/10 shadow-sm'
                      : 'border-gray-200 bg-gray-50/60 hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <StatusBadge type="bed" status={item.status} />
                      <span className="text-xs font-bold text-gray-900">{item.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">{item.desc}</p>
                  </div>
                  {selectedStatus === item.status && (
                    <CheckCircle className="h-4 w-4 text-teal-400 mt-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">Status Update Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleaned by housekeeping, ready for intake"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleUpdate}
            className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-6 py-2 shadow-lg shadow-teal-600/20 transition"
          >
            {isUpdating ? 'Updating Status...' : 'Apply Status Transition'}
          </button>
        </div>
      </div>
    </div>
  );
};
