import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { EmergencyIntakeModal } from '../components/common/EmergencyIntakeModal';

export const DoctorLayout: React.FC = () => {
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gradient-to-br from-slate-950 via-slate-900/40 to-slate-950">
          <Outlet context={{ openEmergencyModal: () => setIsEmergencyModalOpen(true) }} />
        </main>
      </div>

      <EmergencyIntakeModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
    </div>
  );
};
