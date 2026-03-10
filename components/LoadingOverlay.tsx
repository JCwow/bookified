'use client';

import { Loader2 } from 'lucide-react';

type LoadingOverlayProps = {
  isVisible: boolean;
  title?: string;
};

const LoadingOverlay = ({
  isVisible,
  title = 'Preparing your book...',
}: LoadingOverlayProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="loading-wrapper" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-shadow-wrapper bg-[#f8f4e9] border border-[#e4d7bd] shadow-soft-md">
        <div className="loading-shadow">
          <Loader2 className="loading-animation h-10 w-10 text-[#663820]" />
          <div className="space-y-2 text-center">
            <h2 className="loading-title font-serif">{title}</h2>
            <p className="text-sm text-(--text-secondary)">
              Uploading files and getting the synthesis setup ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
