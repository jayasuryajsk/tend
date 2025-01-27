import type { Attachment } from 'ai';
import { FileIcon, LoaderIcon } from './icons';
import { useState } from 'react';

export const PreviewAttachment = ({
  attachment,
  onDelete,
  isUploading = false,
}: {
  attachment: Attachment;
  onDelete?: () => void;
  isUploading?: boolean;
}) => {
  const { name, url, contentType } = attachment;
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="h-28 flex flex-col gap-2">
      <div className="size-20 relative">
        {contentType === 'application/pdf' ? (
          <>
            <object
              data={url}
              type="application/pdf"
              className="size-20"
              onLoad={() => setIsLoading(false)}
            >
              <FileIcon size={24} />
            </object>
            {(isUploading || isLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                <div className="animate-spin text-zinc-500">
                  <LoaderIcon size={20} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center size-20 text-zinc-500">
            <FileIcon size={24} />
          </div>
        )}

        {!isUploading && onDelete && (
          <button
            onClick={onDelete}
            className="absolute -top-2 -right-2 bg-background rounded-full p-1 shadow-sm border hover:bg-zinc-100 z-20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-500"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>
    </div>
  );
};
