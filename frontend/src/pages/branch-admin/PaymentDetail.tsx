import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Edit2, Trash2, Printer, Phone, Mail } from 'lucide-react';
import { getInvoiceNumber, formatInvoiceDate, formatInvoiceCurrency, buildInstallments, type InvoiceInstallment } from '@/utils/invoiceUtils';
import toast from 'react-hot-toast';
import { paymentService } from '@/services/payment.service';
import { CardSkeleton } from '@/components/SkeletonLoader';
import ConfirmDialog from '@/components/ConfirmDialog';

interface StudentInfo {
  id: string;
  prn: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone: string;
}

interface BranchInfo {
  id: string;
  name: string;
  address: string;
  location: string;
  phone1: string;
  phone2?: string;
  admin?: { email: string };
}

interface Payment {
  id: string;
  enrollmentId: string;
  feeTaken: number | string;
  courseFee: number | string;
  paymentStatus: 'FULL_PAID' | 'PARTIAL_PAID' | 'PENDING';
  paidAt: string | null;
  nextInstallmentDate: string | null;
  createdAt: string;
  updatedAt: string;
  enrollment?: {
    id: string;
    enrolledAt: string;
    student?: StudentInfo;
    course?: { id: string; name: string };
    branch?: BranchInfo;
  };
}



const DnyanSetuLogo: React.FC = () => (
  <img src={`${import.meta.env.BASE_URL}logo-invoice.png`} style={{ height: '54px', width: 'auto', display: 'block' }} alt="DnyanSetu" />
);

const MetaLabel: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <span style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
    {label}: <strong style={{ color: '#111827' }}>{value}</strong>
  </span>
);

export const PaymentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [installments, setInstallments] = useState<InvoiceInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) throw new Error('Payment ID not found');

        const resp = await paymentService.getById(id);
        const p: Payment = resp.data;
        setPayment(p);

        const allResp = await paymentService.list({
          enrollmentId: p.enrollmentId,
          limit: 100,
        });
        setInstallments(buildInstallments(allResp.data as any[] || [], Number(p.courseFee)));
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load payment');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await paymentService.remove(id);
      toast.success('Payment deleted successfully');
      navigate(-1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete payment');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) return <CardSkeleton />;
  if (!payment) return null;

  const student = payment.enrollment?.student;
  const course = payment.enrollment?.course;
  const branch = payment.enrollment?.branch;
  const courseFee = Number(payment.courseFee);

  const studentName = student
    ? `${student.firstName}${student.middleName ? ' ' + student.middleName : ''} ${student.lastName}`
    : 'N/A';
  const instituteAddress = branch
    ? `${branch.address}`
    : 'Hadapsar, Pune';
  const institutePhone = branch?.phone1 || '+91 987 654 3210';
  const instituteEmail = branch?.admin?.email || 'dnyansetu@gmail.com';

  const TEAL = '#1A7A8E';
  const TABLE_HEADER_BG = '#d4e8f2';
  const TABLE_BORDER = '#b8d4df';
  const TABLE_ROW_BORDER = '#dce8ee';

  return (
    <>
      <style>{`
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .invoice-wrap { padding: 0 !important; }
          .invoice-page { box-shadow: none !important; border-radius: 0 !important; max-width: none !important; width: 210mm !important; min-height: 297mm !important; }
        }
      `}</style>

      {/* ── Action bar (hidden on print) ── */}
      <div className="no-print max-w-4xl mx-auto mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition font-medium"
        >
          <ChevronLeft size={20} />
          Back
        </button>
        <div className="ml-auto flex gap-3">
          <button
            onClick={() => window.print()}
            style={{ background: TEAL }}
            className="flex items-center gap-2 hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
          >
            <Printer size={16} />
            Print Invoice
          </button>
          <button
            onClick={() => navigate(`../edit/${payment.id}`)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
          >
            <Edit2 size={16} />
            Edit
          </button>
          <button
            onClick={() => setDeleteId(payment.id)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      {/* ── Invoice page ── */}
      <div
        className="invoice-wrap max-w-4xl mx-auto"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <div
          className="invoice-page bg-white shadow-xl"
          style={{ borderRadius: '8px', overflow: 'hidden', minHeight: '297mm', display: 'flex', flexDirection: 'column' }}
        >

          {/* ── Header ── */}
          <div style={{ display: 'flex', height: '120px' }}>
            {/* Logo side */}
            <div style={{
              width: '42%',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '30px',
              paddingRight: '20px',
            }}>
              <DnyanSetuLogo />
            </div>

            {/* INVOICE title */}
            <div style={{
              flex: 1,
              background: TEAL,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '30px',
            }}>
              <span style={{
                color: 'white',
                fontSize: '78px',
                fontWeight: 900,
                fontFamily: 'Arial Black, Arial, sans-serif',
                letterSpacing: '2px',
                lineHeight: 1,
              }}>
                INVOICE
              </span>
            </div>
          </div>

          {/* ── Invoice meta ── */}
          <div style={{ padding: '30px 30px 18px 30px' }}>
            {/* Row 1: Invoice No | Date (3-col grid, date in col 2) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '22px' }}>
              <MetaLabel label="Invoice No" value={getInvoiceNumber(payment.id)} />
              <MetaLabel label="Date" value={formatInvoiceDate(payment.createdAt)} />
              <span />
            </div>

            {/* Row 2: Name | Phone No | Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '22px' }}>
              <MetaLabel label="Name" value={studentName} />
              <MetaLabel label="Phone No" value={student?.phone || 'N/A'} />
              <MetaLabel label="Email" value={student?.email || 'N/A'} />
            </div>

            {/* Row 3: PRN No | Admission Date | Course Fees */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '22px' }}>
              <MetaLabel label="PRN No" value={student?.prn || 'N/A'} />
              <MetaLabel label="Admission Date" value={formatInvoiceDate(payment.enrollment?.enrolledAt)} />
              <MetaLabel label="Course Fees" value={formatInvoiceCurrency(courseFee)} />
            </div>

            {/* Row 4: Course Name */}
            <div>
              <MetaLabel label="Course Name" value={course?.name || 'N/A'} />
            </div>
          </div>

          {/* ── Installment table ── */}
          <div style={{ padding: '8px 30px 16px 30px', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: TABLE_HEADER_BG, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  {['Sr. No', 'Date', 'Fees Paid', 'Fees Remaining', 'Next Installment Date'].map(col => (
                    <th
                      key={col}
                      style={{
                        padding: '13px 16px',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: 400,
                        color: '#374151',
                        border: `1px solid ${TABLE_BORDER}`,
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {installments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '40px 16px',
                        textAlign: 'center',
                        fontSize: '14px',
                        color: '#9CA3AF',
                        border: `1px solid ${TABLE_ROW_BORDER}`,
                      }}
                    >
                      No payment records found
                    </td>
                  </tr>
                ) : (
                  installments.map((row, idx) => (
                    <tr key={idx} style={{ background: 'white' }}>
                      <td style={{ padding: '24px 16px', fontSize: '13px', color: '#1F2937', border: `1px solid ${TABLE_ROW_BORDER}` }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '24px 16px', fontSize: '13px', color: '#1F2937', border: `1px solid ${TABLE_ROW_BORDER}` }}>
                        {formatInvoiceDate(row.date)}
                      </td>
                      <td style={{ padding: '24px 16px', fontSize: '13px', color: '#1F2937', border: `1px solid ${TABLE_ROW_BORDER}` }}>
                        {formatInvoiceCurrency(row.feesPaid)}
                      </td>
                      <td style={{ padding: '24px 16px', fontSize: '13px', color: '#1F2937', border: `1px solid ${TABLE_ROW_BORDER}` }}>
                        {formatInvoiceCurrency(row.feesRemaining)}
                      </td>
                      <td style={{ padding: '24px 16px', fontSize: '13px', color: '#1F2937', border: `1px solid ${TABLE_ROW_BORDER}` }}>
                        {row.nextInstallmentDate ? formatInvoiceDate(row.nextInstallmentDate) : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Note + Signature area (flex:1 pushes footer to bottom of A4) ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px 30px 40px 30px', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#1F2937', letterSpacing: '0.2px' }}>
                DNYANSETU EDUCATION &amp; IT INSTITUTE INDIA
              </span>
            </div>
            <div style={{
              padding: '10px 14px',
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#92400E',
              fontStyle: 'italic',
            }}>
              <strong>Note:</strong> Fees once paid is not refundable at any reason.
            </div>
          </div>

          {/* ── Footer (always at A4 bottom) ── */}
          <div style={{
            flexShrink: 0,
            background: TEAL,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            padding: '22px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            {/* Address */}
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', color: 'white', marginBottom: '7px' }}>
                Institute Address:
              </p>
              <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65 }}>
                {instituteAddress}
              </p>
            </div>

            {/* Contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={14} color="rgba(255,255,255,0.8)" />
                <span style={{ fontSize: '13px', color: 'white' }}>{institutePhone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} color="rgba(255,255,255,0.8)" />
                <span style={{ fontSize: '13px', color: 'white' }}>{instituteEmail}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Payment"
        message="This action cannot be undone. Are you sure you want to delete this payment record? The enrollment payment status will be recalculated."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </>
  );
};

export default PaymentDetail;
