import React from 'react';
import { Outlet } from 'react-router-dom';

const StudentLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col relative bg-[#EAF5FB]">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_bottom_left,rgba(255,194,194,0.2),transparent_42%),radial-gradient(circle_at_top_right,rgba(170,226,239,0.24),transparent_45%)]" />
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.23]"
        style={{ 
          backgroundImage: `url('/student-bg-pattern.png')`,
          backgroundSize: '560px',
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat',
          mixBlendMode: 'multiply',
        }}
      />

      <header className="relative z-10 w-full px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <img src="/logo.svg" alt="Dnyansetu" className="h-14 w-auto object-contain" />
        </div>
        <div id="student-header-right"></div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-6 sm:p-10 -mt-8">
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
