import React from 'react';
import { cn } from '@/utils/helpers';

interface PaymentStatusBadgeProps {
  status: string;
  className?: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, className }) => {
  const label = status === 'FULL_PAID' ? 'Full Paid' : status === 'PARTIAL_PAID' ? 'Partial Paid' : 'Pending';
  const colorCls =
    status === 'FULL_PAID'
      ? 'border-[#00A925] text-[#00A925]'
      : status === 'PARTIAL_PAID'
      ? 'border-[#EAB308] text-[#EAB308]'
      : 'border-[#64748B] text-[#64748B]';

  return (
    <span className={cn('px-3 py-1 rounded-[4px] border text-[12px] font-medium bg-white', colorCls, className)}>
      {label}
    </span>
  );
};

export default PaymentStatusBadge;
