import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Search, Eye, Edit2, ChevronLeft, ChevronDown, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { computeComparisonDates } from '@/contexts/PageHeaderContext';
import { dashboardService } from '@/services/dashboard.service';
import { branchService } from '@/services/branch.service';
import { studentService } from '@/services/student.service';
import { useNavigate } from 'react-router-dom';
import toast from '@/utils/toastWrapper';
import { PaymentStatusBadge } from '@/components/ui/PaymentStatusBadge';
import { StudentDetailDrawer } from '@/components/StudentDetailDrawer';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const year = payload[0]?.payload?.year;
    return (
      <div className="bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,0,0,0.08)] px-3 py-2 text-xs rounded">
        <p className="text-[#64748B] mb-1">
          Month: <span className="font-bold text-[#1A2332]">{label}{year ? ` ${year}` : ''}</span>
        </p>
        <p className="text-[#64748B]">
          No. of Students: <span className="font-bold text-[#1A2332]">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const SuperAdminDashboard: React.FC = () => {
  const { setPageHeader, sortBy, dateFrom, dateTo } = usePageHeader();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [prevStats, setPrevStats] = useState<any>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [studentMeta, setStudentMeta] = useState<any>(null);
  const PAGE_SIZE = 10;
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [, setStudentLoading] = useState(false);

  useEffect(() => {
    setPageHeader(
      'Branch Dashboard',
      'Monitor branch performance, payments, and course activity',
      undefined,
      true
    );
  }, [setPageHeader]);

  // Load branches once and auto-select the latest
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res: any = await branchService.list();
        const list: any[] = res?.data || [];
        setBranches(list);
        if (list.length > 0) {
          const sorted = [...list].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setSelectedBranch(sorted[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load branches', err);
        setLoading(false);
      }
    };
    void loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch !== undefined) {
      setCurrentPage(1);
      void fetchDashboardData(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, sortBy, selectedBranch]);

  useEffect(() => {
    if (selectedBranch !== undefined) {
      void fetchStudents(currentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchDashboardData = async (page = 1) => {
    setLoading(true);
    try {
      const params = { from: dateFrom, to: dateTo, branchId: selectedBranch };
      const { prevFrom, prevTo } = computeComparisonDates(sortBy, dateFrom, dateTo);
      const prevParams = { from: prevFrom, to: prevTo, branchId: selectedBranch };

      const [statsRes, prevStatsRes, perfRes, studentRes, enrollRes]: any = await Promise.all([
        dashboardService.getStats(params),
        dashboardService.getStats(prevParams),
        dashboardService.getPerformance(params),
        dashboardService.getRecentStudents({ ...params, page, limit: PAGE_SIZE }),
        dashboardService.getEnrollment(params),
      ]);
      setStats(statsRes.data);
      setPrevStats(prevStatsRes.data);
      setPerformance(perfRes.data || []);
      setRecentStudents(studentRes.data || []);
      setStudentMeta(studentRes.meta || null);
      setEnrollmentData(enrollRes?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (page: number) => {
    try {
      const params = { from: dateFrom, to: dateTo, branchId: selectedBranch, page, limit: PAGE_SIZE };
      const studentRes: any = await dashboardService.getRecentStudents(params);
      setRecentStudents(studentRes.data || []);
      setStudentMeta(studentRes.meta || null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudentDetail = async (id: string) => {
    setStudentLoading(true);
    try {
      const res: any = await studentService.getById(id);
      setSelectedStudent(res.data || res);
      setShowStudentDetail(true);
    } catch (err) {
      console.error('Failed to fetch student detail', err);
      toast.error('Failed to load student details');
    } finally {
      setStudentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[48vh]">
        <Loader2 className="animate-spin text-[#4DB8CA] mb-4" size={48} />
        <p className="text-gray-500 font-medium">Preparing your dashboard...</p>
      </div>
    );
  }

  const totalStudents = stats?.totalStudents ?? 0;

  const calcChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  const comparisonLabel = sortBy === 'Last Year' ? 'vs Last year' : 'vs Previous period';
  const revenueChange  = calcChange(stats?.totalRevenue ?? 0, prevStats?.totalRevenue ?? 0);

  return (
    <div className="space-y-6">

      {/* Branch Selector */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[14px] font-medium text-[#1A2332] mb-2">All branches</p>
          <div className="relative w-[280px]">
            <select
              value={selectedBranch || ''}
              onChange={(e) => setSelectedBranch(e.target.value || undefined)}
              className="w-full h-10 px-4 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] font-medium text-[#1A2332] appearance-none outline-none focus:border-[#4DB8CA] cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.location || b.branchCode}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
          </div>
        </div>
        <button
          onClick={() => selectedBranch && window.location.assign(`/super-admin/branches`)}
          className="flex items-center gap-2 h-10 px-5 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] font-medium text-[#1A2332] hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Eye size={16} className="text-[#4DB8CA]" />
          View Details
        </button>
      </div>

      {/* Stats + Enrollment grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* Total Revenue */}
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-6 flex flex-col gap-3">
          <p className="text-[14px] text-[#64748B]">Total Revenue</p>
          <p className="text-[28px] font-bold text-[#1A2332] leading-none">
            ₹{(stats?.totalRevenue ?? 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5">
            <span className={`flex items-center text-[12px] font-semibold ${revenueChange >= 0 ? 'text-[#00A925]' : 'text-[#D03025]'}`}>
              {revenueChange >= 0 ? '▲' : '▼'} {Math.abs(revenueChange)}%
            </span>
            <span className="text-[12px] text-[#64748B]">{comparisonLabel}</span>
          </div>
        </div>

        {/* Active Students */}
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-6 flex flex-col gap-3">
          <p className="text-[14px] text-[#64748B]">Active Students</p>
          <p className="text-[28px] font-bold text-[#1A2332] leading-none">{totalStudents}</p>
          <p className="text-[12px] text-[#64748B]">Total active students</p>
        </div>

        {/* Pending Fees */}
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-6 flex flex-col gap-3">
          <p className="text-[14px] text-[#64748B]">Pending Fees</p>
          <p className="text-[28px] font-bold text-[#1A2332] leading-none">
            {stats?.pendingFees ?? 0} Pending
          </p>
          <p className="text-[12px] text-[#64748B]">Unpaid enrollments</p>
        </div>

        {/* Course Enrollment — row-span-2 */}
        <div
          className="bg-white rounded-[12px] border border-[#E2E8F0] p-6 flex flex-col md:row-span-2"
          style={{ gridColumn: '4', gridRow: '1 / span 2' }}
        >
          <h4 className="text-[16px] font-semibold text-[#1A2332] mb-4">Course Enrollment</h4>

          <div className="relative w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={enrollmentData}
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {enrollmentData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} className="outline-none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '6px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px', padding: '6px 12px' }}
                  formatter={(val: any, name: any) => [`${val} Students`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-4 mt-6 flex-1">
            {enrollmentData.map((item) => {
              const total = enrollmentData.reduce((s: number, e: any) => s + e.value, 0);
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-[2px] flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[13px] font-semibold text-[#1A2332]">{item.name}</span>
                  </div>
                  <span className="text-[12px] text-[#64748B] pl-5">{item.value} Students ({pct}%)</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-[#E2E8F0]">
            <button
              className="text-[14px] font-semibold text-[#1A2332] underline underline-offset-2 hover:opacity-70 transition-opacity"
              onClick={() => setShowEnrollmentModal(true)}
            >
              View All Course
            </button>
          </div>
        </div>

        {/* Branch Performance Chart */}
        <div
          className="bg-white rounded-[12px] border border-[#E2E8F0] p-6 md:col-span-3"
          style={{ gridColumn: '1 / span 3', gridRow: 2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[16px] font-semibold text-[#1A2332]">Branch Performance</h4>
            <div className="flex items-center gap-2 text-[13px] text-[#64748B]">
              <span className="w-4 h-4 rounded-sm bg-[#4DB8CA]" />
              No. of Students
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={30}>
                <defs>
                  <linearGradient id="saBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4DB8CA" stopOpacity={1} />
                    <stop offset="100%" stopColor="#4DB8CA" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#1A2332', fontWeight: 500 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} domain={[0, (dataMax: number) => Math.max(dataMax + Math.ceil(dataMax * 0.2), 5)]} allowDecimals={false} tickCount={6} />
                <CartesianGrid vertical={false} stroke="#F1F5F9" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="value" fill="url(#saBarGradient)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h4 className="text-[16px] font-semibold text-[#1A2332]">
            Students list ({studentMeta?.total ?? recentStudents.length} Students)
          </h4>
          <div className="flex items-center gap-2 w-[280px] px-3 py-2 bg-white border border-[#E2E8F0] rounded-[8px]">
            <Search size={15} className="text-[#64748B] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by name, ID, course"
              className="bg-transparent border-none focus:outline-none text-[13px] w-full text-[#1A2332] placeholder:text-[#94A3B8]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#4DB8CA] text-white text-[13px]">
              <tr>
                <th className="py-4 px-5 font-medium whitespace-nowrap">Sr. No</th>
                <th className="py-4 px-5 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">Student ID<div className="flex flex-col -space-y-1"><ChevronLeft size={10} className="rotate-90 opacity-60" /><ChevronLeft size={10} className="-rotate-90 opacity-60" /></div></div>
                </th>
                <th className="py-4 px-5 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">Student Name<div className="flex flex-col -space-y-1"><ChevronLeft size={10} className="rotate-90 opacity-60" /><ChevronLeft size={10} className="-rotate-90 opacity-60" /></div></div>
                </th>
                <th className="py-4 px-5 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">Phone No<div className="flex flex-col -space-y-1"><ChevronLeft size={10} className="rotate-90 opacity-60" /><ChevronLeft size={10} className="-rotate-90 opacity-60" /></div></div>
                </th>
                <th className="py-4 px-5 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">Course Name<div className="flex flex-col -space-y-1"><ChevronLeft size={10} className="rotate-90 opacity-60" /><ChevronLeft size={10} className="-rotate-90 opacity-60" /></div></div>
                </th>
                <th className="py-4 px-5 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">Payment Status<div className="flex flex-col -space-y-1"><ChevronLeft size={10} className="rotate-90 opacity-60" /><ChevronLeft size={10} className="-rotate-90 opacity-60" /></div></div>
                </th>
                <th className="py-4 px-5 font-medium text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {recentStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500 text-[14px]">No students found.</td>
                </tr>
              ) : (
                recentStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-5 text-[14px] text-[#1A2332]">{idx + 1}</td>
                    <td className="py-4 px-5 text-[14px] text-[#1A2332]">{s.prn}</td>
                    <td className="py-4 px-5 text-[14px] text-[#1A2332]">{`${s.firstName} ${s.lastName}`}</td>
                    <td className="py-4 px-5 text-[14px] text-[#1A2332]">{s.phone}</td>
                    <td className="py-4 px-5 text-[14px] text-[#1A2332]">{s.enrollments?.[0]?.course?.name || 'N/A'}</td>
                    <td className="py-4 px-5 text-[14px]">
                      <PaymentStatusBadge status={s.enrollments?.[0]?.paymentStatus || 'PENDING'} />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => fetchStudentDetail(s.id)}
                          className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/super-admin/edit-student/${s.id}`)}
                          className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0]">
          {(() => {
            const total      = studentMeta?.total      ?? recentStudents.length;
            const totalPages = studentMeta?.totalPages ?? 1;
            const from       = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
            const to         = Math.min(currentPage * PAGE_SIZE, total);
            const pages      = Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1);
            return (
              <>
                <p className="text-[13px] text-[#64748B]">
                  Showing data {from} to {to} of {total} Students
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors text-sm">&lt;</button>
                  {pages.map(p => (
                    <button key={p} onClick={() => setCurrentPage(p)} className={cn('w-8 h-8 flex items-center justify-center rounded text-[13px] transition-colors', p === currentPage ? 'bg-[#0A3D4D] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-gray-50')}>{p}</button>
                  ))}
                  {totalPages > 4 && <span className="px-1 text-[#94A3B8]">...</span>}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors text-sm">&gt;</button>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Course Enrollment Modal */}
      {showEnrollmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowEnrollmentModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-8 py-5 border-b border-[#E2E8F0]">
              <h3 className="text-[16px] font-semibold text-[#1A2332]">View All Course Enrollment</h3>
              <button onClick={() => setShowEnrollmentModal(false)} className="text-[#64748B] hover:text-[#1A2332] transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8">
              <div className="flex items-center gap-8">
                <div className="flex-shrink-0" style={{ width: 220, height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={enrollmentData} outerRadius={105} dataKey="value" paddingAngle={2} stroke="none">
                        {enrollmentData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(val: any, name: any) => [`${val} Students`, name]} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 flex-1">
                  {enrollmentData.map((item, i) => {
                    const total = enrollmentData.reduce((s: number, e: any) => s + e.value, 0);
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-3 h-3 rounded-[3px] mt-0.5 flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <div>
                          <p className="text-[13px] font-semibold text-[#1A2332] leading-tight">{item.name}</p>
                          <p className="text-[12px] text-[#64748B] mt-0.5">{item.value} Students ({pct}%)</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Drawer */}
      {showStudentDetail && selectedStudent && (
        <StudentDetailDrawer
          student={selectedStudent}
          onClose={() => { setShowStudentDetail(false); setSelectedStudent(null); }}
          onEdit={() => { setShowStudentDetail(false); navigate(`/super-admin/edit-student/${selectedStudent.id}`); }}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;
