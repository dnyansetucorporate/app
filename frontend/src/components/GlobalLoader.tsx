import React, { useEffect, useState } from 'react';
import { subscribe } from '@/services/loading';

const GlobalLoader: React.FC = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let showTimer: any = null;
    let hideTimer: any = null;
    const unsub = subscribe((c) => {
      // when count goes from 0 -> >0, delay showing to avoid flicker
      if (c > 0) {
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
        if (!visible && !showTimer) {
          showTimer = setTimeout(() => {
            setVisible(true);
            showTimer = null;
          }, 160);
        }
      } else {
        // when count goes to 0, schedule hide shortly
        if (showTimer) {
          clearTimeout(showTimer);
          showTimer = null;
        }
        if (visible && !hideTimer) {
          hideTimer = setTimeout(() => {
            setVisible(false);
            hideTimer = null;
          }, 200);
        }
      }
    });
    return () => {
      unsub();
      // cleanup timers
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/20">
      <div className="bg-white p-4 rounded-md shadow-lg flex items-center gap-3">
        <svg className="animate-spin h-6 w-6 text-[#C8102E]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <div className="text-sm font-medium">Loading...</div>
      </div>
    </div>
  );
};

export default GlobalLoader;
