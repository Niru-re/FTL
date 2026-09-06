import React, { useState, useEffect } from 'react';
import {
  ClipboardList, CheckCircle2, Clock, Plus, Filter,
  RefreshCw, X, User, Activity, Pill, BedDouble, Stethoscope
} from 'lucide-react';
import { nurseAPI } from '../../services/api';
import { NurseTask, NursePatient } from '../../types';

export const NurseTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Add Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskPatientId, setTaskPatientId] = useState<number | null>(null);
  const [taskType, setTaskType] = useState('VITALS');
  const [taskDesc, setTaskDesc] = useState('');
  const [dueTime, setDueTime] = useState('16:00');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [taskData, ptsData] = await Promise.all([
        nurseAPI.getTasks(selectedStatus !== 'ALL' ? selectedStatus : undefined),
        nurseAPI.getPatients()
      ]);
      setTasks(taskData);
      setPatients(ptsData);
      if (ptsData.length > 0 && !taskPatientId) {
        setTaskPatientId(ptsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load nurse tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedStatus]);

  const handleToggleTask = async (task: NurseTask) => {
    try {
      const nextState = !task.is_completed;
      await nurseAPI.updateTask(task.id, { is_completed: nextState });
      await fetchTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPatientId || !taskDesc.trim()) return;

    try {
      setSubmitting(true);
      await nurseAPI.createTask(taskPatientId, {
        task_type: taskType,
        description: taskDesc.trim(),
        due_time: dueTime
      });
      setShowAddModal(false);
      setTaskDesc('');
      await fetchTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Ward Clinical Care Checklist
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 mt-1">
            Nursing Worklist & Tasks
          </h1>
          <p className="text-xs text-gray-500">
            Daily clinical schedule, vital intervals, medication rounds, and handovers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-300/80 bg-gray-200/80 hover:bg-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-900/40 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Nursing Task</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-4 backdrop-blur-md shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Status:
          </span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-gray-50/70 border border-gray-200 text-xs text-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Tasks</option>
            <option value="PENDING">Pending Only</option>
            <option value="COMPLETED">Completed Only</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 overflow-hidden shadow-xl">
        <div className="divide-y divide-gray-200/60">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              Loading nursing tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              No tasks found for the selected status.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 flex items-center justify-between gap-4 transition hover:bg-gray-200/30 ${
                  task.is_completed ? 'opacity-60 bg-gray-50/20' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className={`mt-0.5 h-5 w-5 rounded-lg border flex items-center justify-center transition flex-shrink-0 ${
                      task.is_completed
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'border-gray-300 bg-gray-50 hover:border-purple-500'
                    }`}
                  >
                    {task.is_completed && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                        {task.task_type}
                      </span>
                      <span className="text-sm font-bold text-white">{task.patient_name}</span>
                      {task.bed_code && (
                        <span className="text-xs font-mono font-bold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/20">
                          {task.bed_code}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs text-gray-700 ${
                        task.is_completed ? 'line-through text-gray-400' : ''
                      }`}
                    >
                      {task.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 text-right">
                  <div className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>Due: {task.due_time}</span>
                  </div>

                  <button
                    onClick={() => handleToggleTask(task)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      task.is_completed
                        ? 'bg-gray-200 text-gray-500 hover:text-white'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                    }`}
                  >
                    {task.is_completed ? 'Reopen' : 'Complete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-purple-400" />
                <span>Add Nursing Care Task</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Select Inpatient
                </label>
                <select
                  value={taskPatientId || ''}
                  onChange={(e) => setTaskPatientId(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 text-xs text-gray-900 rounded-xl p-2.5 focus:outline-none focus:border-purple-500"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn}) • Bed: {p.bed_code || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Task Category
                </label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs text-gray-900 rounded-xl p-2.5 focus:outline-none focus:border-purple-500"
                >
                  <option value="VITALS">Record Vitals</option>
                  <option value="MEDICATION">Medication Administration</option>
                  <option value="IV_CHECK">IV Port & Infusion Check</option>
                  <option value="BED_PREP">Bed Preparation / Sanitization</option>
                  <option value="TRANSFER">Patient Transfer / Transport</option>
                  <option value="HANDOVER">Shift Handover Note</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Task Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Check arterial line dressing and titrate Levophed..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs text-gray-900 rounded-xl p-2.5 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Scheduled Due Time
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 16:30"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs text-gray-900 rounded-xl p-2.5 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-gray-300 bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !taskDesc.trim()}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
