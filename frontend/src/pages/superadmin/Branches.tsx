import React, { useState, useEffect, useCallback } from 'react';
import { Search, Eye, Plus, X, Maximize, Pencil } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { branchService } from '@/services/branch.service';
import toast from '@/utils/toastWrapper';

// Strip '/api' suffix to get the backend root for serving uploaded files
const BACKEND_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

const getImageUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${BACKEND_ROOT}/${path.replace(/^\//, '')}`;
};

// ── ImageSlot ─────────────────────────────────────────────────
interface ImageSlotProps {
  src?: string;
  alt: string;
  className?: string;
  objectFit?: 'cover' | 'contain';
  placeholder: string;
}

const ImageSlot: React.FC<ImageSlotProps> = ({ src, alt, className, objectFit = 'cover', placeholder }) => {
  const [failed, setFailed] = React.useState(false);
  const hasImage = src && !failed;

  return (
    <div className={`relative rounded-[12px] border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC] flex items-center justify-center ${className ?? ''}`}>
      {hasImage ? (
        <>
          <img
            src={src}
            alt={alt}
            onError={() => setFailed(true)}
            className={`w-full h-full rounded-[12px] ${objectFit === 'cover' ? 'object-cover' : 'object-contain p-2'}`}
          />
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2 right-2 bg-black/50 p-1.5 rounded-[4px] hover:bg-black/70 transition-colors"
          >
            <Maximize size={12} className="text-white" />
          </a>
        </>
      ) : (
        <span className="text-[#94A3B8] text-[12px] text-center px-2">{placeholder}</span>
      )}
    </div>
  );
};

interface Branch {
  id: string;
  branchCode: string;
  name: string;
  location: string;
  address?: string;
  phone1?: string;
  phone2?: string;
  logo?: string;
  aadharNo?: string;
  aadharImage?: string;
  panNo?: string;
  panImage?: string;
  createdAt: string;
  admin?: { id: string; name: string; email: string };
  _count?: { students: number };
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const LIMIT = 10;

const AllBranches: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
  const [stats, setStats] = useState({ totalBranches: 0, totalStudents: 0 });
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    setPageHeader('All Branches', 'View and manage all branches across the organization.', undefined, true);
    branchService.getStats().then((res: any) => {
      const d = res.data || res;
      setStats({ totalBranches: d.totalBranches ?? 0, totalStudents: d.totalStudents ?? 0 });
    }).catch(() => {});
  }, [setPageHeader]);

  const fetchBranches = useCallback(async (page = 1, q = '') => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: LIMIT, page };
      if (q.trim()) params.search = q.trim();
      const res: any = await branchService.list(params);
      const data = res.data ?? res;
      setBranches(Array.isArray(data) ? data : (data.items ?? []));
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      console.error('Failed to fetch branches', err);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches(currentPage, search);
  }, [fetchBranches, currentPage, search]);

  const openDetail = async (id: string) => {
    setShowDetail(true);
    setSelectedBranch(null);
    setDetailLoading(true);
    try {
      const res: any = await branchService.getById(id);
      setSelectedBranch(res.data ?? res);
    } catch (err) {
      console.error('Failed to fetch branch detail', err);
      toast.error('Failed to load branch details');
    } finally {
      setDetailLoading(false);
    }
  };

  const buildPages = (): (number | '...')[] => {
    const total = meta.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (currentPage >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', total];
  };

  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="space-y-6">

      {/* Stats + Add button row */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] w-full max-w-xs">
          <p className="text-[14px] text-[#64748B]">Total Branches</p>
          <p className="text-[24px] font-bold text-[#1A2332] mt-1">{stats.totalBranches}</p>
          <p className="text-[12px] mt-2 flex items-center gap-1.5">
            <span className="text-[#0BB783] font-semibold flex items-center">▲ 25%</span>
            <span className="text-[#64748B]">vs Previous period</span>
          </p>
        </div>
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] w-full max-w-xs">
          <p className="text-[14px] text-[#64748B]">Total Students</p>
          <p className="text-[24px] font-bold text-[#1A2332] mt-1">{stats.totalStudents.toLocaleString()}</p>
          <p className="text-[12px] mt-2 flex items-center gap-1.5">
            <span className="text-[#0BB783] font-semibold flex items-center">▲ 25%</span>
            <span className="text-[#64748B]">vs Previous period</span>
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-start">
          <Link
            to="/super-admin/add-branch"
            className="flex items-center gap-2 px-6 py-2.5 bg-[#C8102E] text-white rounded-[6px] text-[14px] font-medium hover:bg-red-800 transition-colors shadow-sm whitespace-nowrap mt-2"
          >
            <Plus size={18} />
            Add New Branch
          </Link>
        </div>
      </div>

      {/* Branch list table */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-[18px] font-bold text-[#1A2332]">Branch list</h3>
          <div className="flex items-center gap-2 w-full max-w-xs px-3 py-2 bg-white border border-[#E2E8F0] rounded-[8px]">
            <Search size={16} className="text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by name, ID, location"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#64748B]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#4DB8CA] text-white text-[14px]">
              <tr>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Sr. No</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Branch ID</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Admin Name</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Branch Created Date</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Location</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">Loading branches...</td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">No branches found.</td>
                </tr>
              ) : (
                branches.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{(currentPage - 1) * LIMIT + idx + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332] font-mono">{b.branchCode}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{b.admin?.name ?? '—'}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{b.location}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openDetail(b.id)}
                          title="View"
                          className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/super-admin/edit-branch/${b.id}`)}
                          title="Edit"
                          className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-white">
          <p className="text-[14px] text-[#64748B]">
            {meta.total > 0
              ? `Showing data ${start} to ${end} of ${meta.total} Branches`
              : 'No branches found'}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-bold">{'<'}</span>
            </button>
            {buildPages().map((page, i) => (
              <button
                key={i}
                disabled={page === '...'}
                onClick={() => typeof page === 'number' && setCurrentPage(page)}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded text-[14px] transition-colors',
                  page === currentPage
                    ? 'bg-[#0A3D4D] text-white'
                    : page === '...'
                    ? 'bg-white text-[#64748B] cursor-default'
                    : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-gray-50 cursor-pointer'
                )}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage >= meta.totalPages}
              onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))}
              className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-bold">{'>'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Branch Details Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl rounded-[16px]">
            <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-[#E2E8F0] sticky top-0 z-10 rounded-t-[16px]">
              <h3 className="font-semibold text-[18px] text-[#1A2332]">View Branch Details</h3>
              <button
                onClick={() => { setShowDetail(false); setSelectedBranch(null); }}
                className="text-[#64748B] hover:text-[#1A2332] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 py-16">Loading...</div>
            ) : selectedBranch ? (
              <>
                <div className="p-8 flex flex-col gap-5">
                  {/* Images row */}
                  <div className="flex flex-row gap-4">
                    <ImageSlot
                      src={getImageUrl(selectedBranch.logo)}
                      alt="Branch Logo"
                      className="w-28 h-28 flex-shrink-0"
                      objectFit="cover"
                      placeholder="No Logo"
                    />
                    <ImageSlot
                      src={getImageUrl(selectedBranch.aadharImage)}
                      alt="Aadhar Card"
                      className="h-28 flex-1"
                      objectFit="contain"
                      placeholder="Aadhar"
                    />
                    <ImageSlot
                      src={getImageUrl(selectedBranch.panImage)}
                      alt="PAN Card"
                      className="h-28 flex-1"
                      objectFit="contain"
                      placeholder="PAN"
                    />
                  </div>

                  {/* Detail fields */}
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Branch ID', value: selectedBranch.branchCode },
                      { label: 'Branch Name', value: selectedBranch.name },
                      { label: 'Branch Creation Date', value: selectedBranch.createdAt ? new Date(selectedBranch.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined },
                      { label: 'Admin Name', value: selectedBranch.admin?.name },
                      { label: 'Date of Birth', value: undefined },
                      { label: 'Admin Phone Number 1', value: selectedBranch.phone1 },
                      { label: 'Admin Phone Number 2', value: selectedBranch.phone2 },
                      { label: 'Email Address', value: selectedBranch.admin?.email },
                      { label: 'Password', value: '••••••••' },
                      { label: 'Branch Address', value: selectedBranch.address },
                      { label: 'Enter Location', value: selectedBranch.location },
                      { label: 'Aadhar Card Number', value: selectedBranch.aadharNo },
                      { label: 'PAN Card Number', value: selectedBranch.panNo },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1.5">
                        <label className="text-[14px] font-semibold text-[#1A2332]">{label}</label>
                        <div className="px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] text-[#1A2332] min-h-[42px] flex items-center">
                          {value ?? '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-[#E2E8F0] flex items-center gap-4 sticky bottom-0 bg-white rounded-b-[16px]">
                  <button
                    onClick={() => {
                      setShowDetail(false);
                      navigate(`/super-admin/dashboard`);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#C8102E] text-white rounded-[6px] text-[14px] font-medium hover:bg-red-800 transition-colors shadow-sm"
                  >
                    <Eye size={16} />
                    View Branch Performance
                  </button>
                  <button
                    onClick={() => { setShowDetail(false); setSelectedBranch(null); }}
                    className="px-4 py-2.5 text-[14px] font-medium text-[#64748B] hover:text-[#1A2332] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
};

export default AllBranches;
