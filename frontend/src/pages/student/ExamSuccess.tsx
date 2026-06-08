import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ExamSuccess: React.FC = () => {
  const navigate = useNavigate();
  const headerTarget = typeof document !== 'undefined' ? document.getElementById('student-header-right') : null;

  return (
    <>
      {headerTarget && createPortal(
        <button
          onClick={() => navigate('/student/select-exam')}
          className="flex items-center gap-2 px-5 py-2 border border-[#CBD5E1] rounded-[8px] text-[14px] font-medium text-[#1A2332] bg-white hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>,
        headerTarget
      )}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md md:max-w-lg p-8 md:p-[50px] animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col text-left">
          <h1 className="text-[32px] md:text-[36px] font-bold text-[#1A2332] leading-[1.2] mb-6">
            Congratulations, Your<br />Exam is Successfully<br />Submitted
          </h1>
          <p className="text-[#64748B] text-[15px] leading-relaxed max-w-full">
            Your responses have been recorded successfully. You can review your results once they are published. Thank you for completing the exam and best of luck!
          </p>
        </div>
      </div>
    </>
  );
};

export default ExamSuccess;
