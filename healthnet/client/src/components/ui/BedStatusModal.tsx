import React, { useState } from 'react';
import { Bed, BedStatus } from '../../types';
import { bedsAPI } from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import { X, BedDouble, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface BedStatusModalProps {
  bed: Bed | null;
  onClose: () => void;
  onStatusUpdated: (updatedBed: Bed) => void;
}

const ALLOWED_TRANSITIONS: Record<BedStatus, BedStatus[]> = {
  AVAILABLE: ['RESERVED', 'MAINTENANCE', 'OUT_OF_SERVICE', 'OCCUPIED'],
  RESERVED: ['OCCUPIED', 'AVAILABLE', 'OUT_OF_SERVICE'],
  OCCUPIED: ['CLEANING', 'OUT_OF_SERVICE'], // OCCUPIED cannot go directly to AVAILABLE without CLEANING
  CLEANING: ['AVAILABLE', 'OUT_OF_SERVICE', 'MAINTENANCE'],
  MAINTENANCE: ['AVAILABLE', 'CLEANING', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['MAINTENANCE', 'CLEANING', 'AVAILABLE']
};

export const BedStatusModal: React.FC<BedStatusModalProps> = ({
  bed,
  onClose,
  onStatusUpdated
}) => {
  if (!bed) return null;

  const currentStatus = bed.status as BedStatus;
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'];

  const [selectedStatus, setSelectedStatus] = useState<BedStatus>(allowedNextStatuses[0] || 'AVAILABLE');
  const [reason, setReason] = useState<string>('Routine Bed Management');
  const [notes, setNotes] = useState<string>(bed.notes || '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusDefinitions: { status: BedStatus; label: string; desc: string }[] = [
    { status: 'AVAILABLE', label: 'AVAILABLE (Green)', desc: 'Bed is sanitized, inspected, and ready for inpatient admission.' },
    { status: 'OCCUPIED', label: 'OCCUPIED (Red)', desc: 'Patient is actively admitted and receiving inpatient care.' },
    { status: 'RESERVED', label: 'RESERVED (Blue)', desc: 'Pre-allocated for incoming emergency intake or urgent inter-hospital transfer.' },
    { status: 'CLEANING', label: 'CLEANING (Yellow)', desc: 'Undergoing terminal decontamination and linen change protocol.' },
    { status: 'MAINTENANCE', label: 'MAINTENANCE (Orange)', desc: 'Medical gas ports, monitor calibration, or mechanical bed servicing.' },
    { status: 'OUT_OF_SERVICE', label: 'OUT_OF_SERVICE (Gray)', desc: 'Decommissioned or unavailable due to facility maintenance.' },
  ];

  const handleUpdate = async () => {
    setIsUpdating(true);
    setErrorMessage(null);
    try {
      const updated = await bedsAPI.updateStatus(bed.id, selectedStatus, reason, notes);
      onStatusUpdated(updated);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.response?.data?.detail || 'Failed to update bed status. Please verify transition.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-gray-100 shadow-2xl p-6 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bed State Transition</h3>
              <p className="text-xs text-gray-500">
                Bed <span className="font-mono text-teal-300 font-bold">{bed.code}</span> • {bed.department_name || 'Unit'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current State Info */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Current Status</span>
            <div className="mt-1">
              <StatusBadge type="bed" status={currentStatus} />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Location</span>
            <span className="font-semibold text-gray-700 block">{bed.hospital_name}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Target Status Selector */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-2">
            Select Allowed Target Status Transition:
          </label>
          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {statusDefinitions
              .filter(item => allowedNextStatuses.includes(item.status))
              .map((item) => (
                <div
                  key={item.status}
                  onClick={() => setSelectedStatus(item.status)}
                  className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition ${
                    selectedStatus === item.status
                      ? 'border-teal-500 bg-teal-500/10 shadow-sm'
                      : 'border-gray-200 bg-gray-50/60 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <StatusBadge type="bed" status={item.status} />
                      <span className="text-xs font-bold text-white">{item.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">{item.desc}</p>
                  </div>
                  {selectedStatus === item.status && (
                    <CheckCircle className="h-4 w-4 text-teal-400 mt-1 flex-shrink-0" />
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Reason for status change */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Reason for Transition</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-teal-500 focus:outline-none"
          >
            <option value="Routine Bed Management">Routine Bed Management</option>
            <option value="Patient Discharged">Patient Discharged (Initiate Cleaning)</option>
            <option value="Sanitization Protocol Completed">Sanitization Protocol Completed (Mark Available)</option>
            <option value="Emergency Pre-Allocation">Emergency Pre-Allocation (Reserve Bed)</option>
            <option value="Direct Inpatient Admission">Direct Inpatient Admission (Mark Occupied)</option>
            <option value="Biomedical Maintenance Required">Biomedical Maintenance Required</option>
            <option value="Facility Decommissioning">Facility Decommissioning</option>
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Additional Clinical / Operator Notes</label>
          <input
            type="text"
            placeholder="e.g. Negative pressure certified, filter replaced..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-teal-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 bg-gray-200 py-2.5 text-xs font-bold text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1 rounded-xl bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 py-2.5 text-xs font-bold text-white transition flex items-center justify-center gap-1.5"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Save Transition</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
