import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { EmergencyIntakeModal } from '../components/common/EmergencyIntakeModal';
import { Menu, X } from 'lucide-react';

export const NurseLayout: React.FC = () => {
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 640);

  useEffect(() => {
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 640);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const sidebarShouldBeOpen = isDesktop || isSidebarOpen;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <Navbar onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        {sidebarShouldBeOpen && (
          <Sidebar
            className={`${isDesktop ? 'relative' : 'fixed left-0 top-0 bottom-0'} w-64 bg-white border-r border-gray-200 flex flex-col justify-between min-h-[calc(100vh-5rem)] z-20 transition-transform duration-300 ease-in-out ${!isDesktop && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
          />
        )}
        <main className={`flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50 ${isDesktop ? 'ml-64' : 'ml-0'} transition-margin duration-300 ease-in-out`}>
          <Outlet context={{ openEmergencyModal: () => setIsEmergencyModalOpen(true) }} />
        </main>
        {/* Hamburger button for mobile */}
        {!isDesktop && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="fixed left-4 top-4 z-30 p-2 bg-white rounded-md shadow-lg text-gray-500 hover:text-gray-900 sm:hidden"
          >
            {!isSidebarOpen ? <Menu className="h-6 w-6" /> : <X className="h-6 w-6" />}
          </button>
        )}
      </div>

      <EmergencyIntakeModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
    </div>
  );
};
