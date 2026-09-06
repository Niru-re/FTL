import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../../services/api';
import { AnalyticsSummary } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  BarChart3, Building2, BedDouble, Activity, Clock, Flame,
  Users, RefreshCw, TrendingUp
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [hospitalComparison, setHospitalComparison] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [timeseries, setTimeseries] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [sum, comp, dept, trends] = await Promise.all([
        analyticsAPI.getSummary(),
        analyticsAPI.getHospitalComparison(),
        analyticsAPI.getDepartmentBreakdown(),
        analyticsAPI.getTimeseriesTrends()
      ]);
      setSummary(sum);
      setHospitalComparison(comp);
      setDepartmentData(dept);
      setTimeseries(trends);
    } catch (e) {
      console.error('Error loading analytics', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const COLORS = ['#14b8a6', '#06b6d4', '#8b5cf6', '#f59e0b', '#f43f5e', '#3b82f6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-teal-400" />
            <span>Network Analytics & Resource Intelligence</span>
          </h1>
          <p className="text-xs text-gray-500">
            Real-time multi-hospital occupancy trends, bed turnover rates, and emergency response performance.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Charts</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Network ICU Occupancy"
          value={`${summary?.network_icu_occupancy_rate || 0}%`}
          subtitle={`${summary?.available_icu_beds || 0} ICU beds available`}
          icon={Activity}
          colorScheme="teal"
        />
        <StatCard
          title="Overall Bed Occupancy"
          value={`${summary?.network_overall_occupancy_rate || 0}%`}
          subtitle={`${summary?.total_occupied_beds || 0} / ${summary?.total_beds || 0} Occupied`}
          icon={BedDouble}
          colorScheme="blue"
        />
        <StatCard
          title="Avg Ambulance Response"
          value={`${summary?.avg_ambulance_response_mins || 8.4}m`}
          subtitle="Target threshold: < 8.0 mins"
          icon={Clock}
          colorScheme="emerald"
        />
        <StatCard
          title="Admissions Today"
          value={summary?.total_admissions_today || 28}
          subtitle={`${summary?.total_discharges_today || 14} Discharged today`}
          icon={Users}
          colorScheme="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hospital ICU vs Ward Occupancy Bar Chart */}
        <div className="rounded-2xl border border-gray-200 bg-gray-100/80 p-5 glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-400" />
              <span>Hospital Occupancy Comparison (%)</span>
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">ICU vs Ward Rate</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hospitalComparison.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="icu_occupancy_rate" name="ICU Occupancy %" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ward_occupancy_rate" name="Total Ward %" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Admissions vs Discharges Area Chart */}
        <div className="rounded-2xl border border-gray-200 bg-gray-100/80 p-5 glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span>Hourly Patient Admissions & Emergency Intake</span>
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">24h Rolling Window</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries?.hourly_admissions || []}>
                <defs>
                  <linearGradient id="colorAdm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEmg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="admissions" name="Admissions" stroke="#14b8a6" fillOpacity={1} fill="url(#colorAdm)" />
                <Area type="monotone" dataKey="emergencies" name="Emergency Dispatches" stroke="#f43f5e" fillOpacity={1} fill="url(#colorEmg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Bed Utilization */}
        <div className="rounded-2xl border border-gray-200 bg-gray-100/80 p-5 glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-purple-400" />
              <span>Departmental Bed Distribution</span>
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">By Ward Category</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis dataKey="department" type="category" tick={{ fill: '#94a3b8', fontSize: 9 }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="occupied" name="Occupied" stackId="a" fill="#f43f5e" />
                <Bar dataKey="available" name="Available" stackId="a" fill="#14b8a6" />
                <Bar dataKey="reserved" name="Reserved" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ambulance Response Time Trends */}
        <div className="rounded-2xl border border-gray-200 bg-gray-100/80 p-5 glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>Ambulance Response Time Weekly (mins)</span>
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">Daily Averages</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries?.ambulance_response_trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[5, 12]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="avg_response_mins" name="Avg Response (mins)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="target_mins" name="Target Target (<8m)" stroke="#f43f5e" strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
