import { TopNavbar } from './TopNavbar';
import { SideNavbar } from './SideNavbar';
import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';

export const DashboardLayout = () => {
  // Initialize state based on screen size (open on desktop, closed on mobile)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  // Auto-collapse sidebar on smaller screens during window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    // 1. Changed to flex-col so TopNavbar spans full width at the top
    <div className="flex flex-col min-h-screen h-[100dvh] overflow-hidden bg-[#f8f6f2]">
      
      {/* TOP NAVBAR (Now 100% width) */}
      <TopNavbar onMenuClick={() => setSidebarOpen((prev) => !prev)} />

      {/* 2. Inner Flex row for Sidebar and Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDE NAVBAR (Sits under TopNavbar on desktop) */}
        <SideNavbar 
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)} 
        />

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto bg-[#faf9f7] relative">
          <Outlet />
        </main>

      </div>
    </div>
  );
};
