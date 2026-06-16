import React from 'react';
import { Maximize } from 'lucide-react';
import { buildImageUrl } from '@/utils/imageUtils';

interface StudentAvatarProps {
  photo?: string | null;
  firstName?: string;
  lastName?: string;
  /** 'sm'=w-10, 'md'=w-20, 'lg'=w-32 (default) */
  size?: 'sm' | 'md' | 'lg';
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({ photo, firstName, lastName, size = 'lg' }) => {
  const photoUrl = buildImageUrl(photo);
  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((n) => (n as string)[0].toUpperCase())
      .join('') || '?';
  const sizeClass =
    size === 'sm' ? 'w-10 h-10 text-sm' : size === 'md' ? 'w-20 h-20 text-xl' : 'w-32 h-32 text-3xl';

  return (
    <div className={`relative flex-shrink-0 ${sizeClass}`}>
      {photoUrl ? (
        <img
          src={photoUrl}
          className="w-full h-full rounded-[16px] object-cover"
          alt="Student"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            const sibling = e.currentTarget.nextElementSibling as HTMLElement;
            if (sibling) sibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className="w-full h-full rounded-[16px] bg-[#E6F0FA] items-center justify-center text-[#1A2332] font-bold select-none"
        style={{ display: photoUrl ? 'none' : 'flex' }}
      >
        {initials}
      </div>
      {photoUrl && (
        <div
          onClick={() => window.open(photoUrl, '_blank', 'noopener,noreferrer')}
          className="absolute bottom-2 right-2 bg-black/50 p-1.5 rounded-[4px] cursor-pointer hover:bg-black/70 transition-colors"
        >
          <Maximize size={12} className="text-white" />
        </div>
      )}
    </div>
  );
};

export default StudentAvatar;
