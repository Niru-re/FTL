import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { EmergencyIntakeModal } from '../components/common/EmergencyIntakeModal';

export const DoctorLayout: React.FC = () => {
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const location = useLocation();

  useEffect(() => {
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Close sidebar on mobile when navigation occurs
  useEffect(() => {
    if (!isDesktop) {
      setIsSidebarOpen(false);
    }
  }, [location, isDesktop]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <Navbar
        onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop Overlay */}
        {!isDesktop && isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        {(isDesktop || isSidebarOpen) && (
          <Sidebar
            className={`${
              isDesktop
                ? 'relative z-20'
                : 'fixed left-0 top-0 bottom-0 z-50 shadow-2xl'
            } w-64 bg-white border-r border-gray-200 flex flex-col justify-between min-h-[calc(100vh-5rem)] transition-transform duration-300 ease-in-out`}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-gray-50">
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
