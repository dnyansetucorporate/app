import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout: React.FC = () => {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #e8c8d0 0%, #c8dde8 50%, #b0cfe0 100%)',
      }}
    >
      {/* Education doodle SVG background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1280 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Pencil */}
        <g transform="translate(80,80) rotate(-20)" stroke="#8aa8b8" strokeWidth="1.5" fill="none">
          <rect x="0" y="0" width="10" height="50" rx="1"/>
          <polygon points="0,50 10,50 5,62"/>
        </g>
        {/* Book */}
        <g transform="translate(200,50)" stroke="#8aa8b8" strokeWidth="1.5" fill="none">
          <rect x="0" y="0" width="30" height="40" rx="2"/>
          <line x1="15" y1="0" x2="15" y2="40"/>
        </g>
        {/* Atom */}
        <g transform="translate(1100,80)" stroke="#8aa8b8" strokeWidth="1.5" fill="none">
          <circle cx="20" cy="20" r="5"/>
          <ellipse cx="20" cy="20" rx="18" ry="8" transform="rotate(0 20 20)"/>
          <ellipse cx="20" cy="20" rx="18" ry="8" transform="rotate(60 20 20)"/>
          <ellipse cx="20" cy="20" rx="18" ry="8" transform="rotate(120 20 20)"/>
        </g>
        {/* Paper plane */}
        <g transform="translate(400,40) rotate(-15)" stroke="#8aa8b8" strokeWidth="1.5" fill="none">
          <polygon points="0,10 35,0 20,25"/>
          <line x1="20" y1="25" x2="10" y2="15"/>
        </g>
        {/* Trophy */}
        <g transform="translate(1000,600)" stroke="#8aa8b8" strokeWidth="1.5" fill="none">
          <path d="M10,0 Q0,0 0,10 Q0,25 10,30 Q20,25 20,10 Q20,0 10,0z"/>
          <line x1="10" y1="30" x2="10" y2="42"/>
          <line x1="4" y1="42" x2="16" y2="42"/>
        </g>
        {/* Graduation cap */}
        <g transform="translate(100,650)" stroke="#8aa8b8" strokeWidth="1.5" fill="none">
          <polygon points="20,5 40,15 20,25 0,15"/>
          <path d="M33,20 Q33,35 20,38 Q7,35 7,20"/>
          <line x1="40" y1="15" x2="40" y2="28"/>
        </g>
        {/* Calculator */}
        <g transform="translate(1160,350)" stroke="#8aa8b8" strokeWidth="1.5" fill="none">
          <rect x="0" y="0" width="30" height="40" rx="3"/>
          <rect x="4" y="4" width="22" height="10" rx="1"/>
          <circle cx="8" cy="22" r="2"/><circle cx="15" cy="22" r="2"/><circle cx="22" cy="22" r="2"/>
          <circle cx="8" cy="30" r="2"/><circle cx="15" cy="30" r="2"/><circle cx="22" cy="30" r="2"/>
        </g>
        {/* Ruler */}
        <g transform="translate(600,700) rotate(-10)" stroke="#8aa8b8" strokeWidth="1.5" fill="none">
          <rect x="0" y="0" width="80" height="14" rx="2"/>
          <line x1="10" y1="0" x2="10" y2="7"/>
          <line x1="20" y1="0" x2="20" y2="5"/>
          <line x1="30" y1="0" x2="30" y2="7"/>
          <line x1="40" y1="0" x2="40" y2="5"/>
          <line x1="50" y1="0" x2="50" y2="7"/>
          <line x1="60" y1="0" x2="60" y2="5"/>
          <line x1="70" y1="0" x2="70" y2="7"/>
        </g>
        {/* Stars scattered */}
        <text x="350" y="680" fontSize="18" fill="#8aa8b8" opacity="0.8">✦</text>
        <text x="900" y="120" fontSize="14" fill="#8aa8b8" opacity="0.8">×</text>
        <text x="1050" y="450" fontSize="16" fill="#8aa8b8" opacity="0.8">+</text>
        <text x="150" y="400" fontSize="14" fill="#8aa8b8" opacity="0.8">×</text>
        <text x="750" y="60" fontSize="18" fill="#8aa8b8" opacity="0.6">✦</text>
        <text x="50" y="520" fontSize="12" fill="#8aa8b8" opacity="0.8">6</text>
        <text x="1200" y="220" fontSize="12" fill="#8aa8b8" opacity="0.8">4</text>
        <text x="700" y="730" fontSize="12" fill="#8aa8b8" opacity="0.8">3</text>
        <text x="480" y="600" fontSize="12" fill="#8aa8b8" opacity="0.8">2</text>
      </svg>

      {/* Auth Card Container */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
