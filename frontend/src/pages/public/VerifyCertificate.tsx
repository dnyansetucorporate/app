import React, { useState } from 'react';
import { ShieldCheck, Search, Loader2, CheckCircle2, XCircle, BadgeAlert } from 'lucide-react';
import { certificateService } from '@/services/certificate.service';
import { formatCalendarDate } from '@/utils/date';

type CertResult = {
  certNo: string | null;
  status: 'ISSUED' | 'PENDING' | 'REVOKED';
  studentName: string;
  prn: string;
  courseName: string | null;
  branchName: string | null;
  branchLocation: string | null;
  examDate: string | null;
  issuedAt: string | null;
  marks: number | null;
  grade: string | null;
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

// examDate is a picked calendar date (no meaningful time-of-day), unlike issuedAt —
// route it through formatCalendarDate so it can't drift a day by viewer timezone.
const fmtExamDate = (d?: string | null) => (d ? formatCalendarDate(d) : 'N/A');

const statusBadge = (status: string) => {
  if (status === 'ISSUED') return 'bg-[#E6F9EE] text-[#008A27]';
  if (status === 'REVOKED') return 'bg-[#FEF2F2] text-[#C8102E]';
  return 'bg-[#FFF8E6] text-[#B45309]';
};

const VerifyCertificate: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<CertResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      // Certificate numbers contain slashes (e.g. DYAN/10254/2026/0001); PRNs don't.
      const params = value.includes('/') ? { certNo: value } : { prn: value };
      const res: any = await certificateService.verify(params);
      const data = res?.data || res;
      setResults(data?.found ? data.certificates || [] : []);
    } catch (err) {
      setError('Something went wrong while verifying. Please try again.');
      setResults([]);
    } finally {
      setSearched(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col items-center py-16 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="DnyanSetu" className="h-14 w-auto object-contain mb-4" />
          <h1 className="text-[26px] font-bold text-[#1A2332] flex items-center gap-2">
            <ShieldCheck size={26} className="text-[#4DB8CA]" />
            Certificate Verification
          </h1>
          <p className="text-[14px] text-[#64748B] mt-2 max-w-md">
            Enter the certificate number or student PRN printed on the certificate to confirm it was genuinely issued by DnyanSetu Institute.
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm p-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-white border border-[#E2E8F0] rounded-[10px] focus-within:border-[#4DB8CA] transition-colors">
            <Search size={18} className="text-[#94A3B8] flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Certificate No. (DYAN/10254/2026/0001) or PRN"
              className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#94A3B8]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#C8102E] text-white rounded-[10px] text-[14px] font-medium hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Verify
          </button>
        </form>

        {error && (
          <div className="mt-6 flex items-center gap-2 px-4 py-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-[10px] text-[13px] text-[#C8102E]">
            <BadgeAlert size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && searched && !error && results.length === 0 && (
          <div className="mt-6 flex flex-col items-center text-center gap-2 px-6 py-10 bg-white border border-[#E2E8F0] rounded-[16px]">
            <XCircle size={32} className="text-[#C8102E]" />
            <p className="text-[15px] font-semibold text-[#1A2332]">No matching certificate found</p>
            <p className="text-[13px] text-[#64748B] max-w-sm">
              Double-check the certificate number or PRN and try again. If you believe this is an error, please contact the issuing branch.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            {results.map((c, idx) => (
              <div key={c.certNo || idx} className="bg-white border border-[#E2E8F0] rounded-[16px] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-[#008A27]" />
                    <span className="text-[14px] font-semibold text-[#1A2332]">{c.certNo || 'N/A'}</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusBadge(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 px-6 py-5">
                  {[
                    { label: 'Student Name', value: c.studentName },
                    { label: 'PRN', value: c.prn },
                    { label: 'Course', value: c.courseName },
                    { label: 'Branch', value: [c.branchName, c.branchLocation].filter(Boolean).join(', ') },
                    { label: 'Exam Date', value: fmtExamDate(c.examDate) },
                    { label: 'Issued On', value: fmtDate(c.issuedAt) },
                    { label: 'Grade', value: c.grade || 'N/A' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-[12px] text-[#94A3B8]">{label}</span>
                      <span className="text-[14px] font-medium text-[#1A2332]">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
