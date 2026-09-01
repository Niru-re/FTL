import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { EmergencyIntakeModal } from '../components/common/EmergencyIntakeModal';

export const AdminLayout: React.FC = () => {
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <Navbar onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50">
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
