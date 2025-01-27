'use client';

import { BlockKind } from './block';

export const DocumentSkeleton = ({ blockKind }: { blockKind: BlockKind }) => {
  return blockKind === 'code' ? (
    <div className="flex flex-col gap-4 w-full justify-center items-center h-[calc(100dvh-60px)]">
      <div className="animate-pulse rounded-lg bg-muted-foreground/20 size-96" />
    </div>
  ) : (
    <div className="flex flex-col gap-4 w-full">
      <div className="animate-pulse rounded-lg h-12 bg-muted-foreground/20 w-1/2" />
      <div className="animate-pulse rounded-lg h-5 bg-muted-foreground/20 w-full" />
      <div className="animate-pulse rounded-lg h-5 bg-muted-foreground/20 w-full" />
      <div className="animate-pulse rounded-lg h-5 bg-muted-foreground/20 w-1/3" />
      <div className="animate-pulse rounded-lg h-5 bg-transparent w-52" />
      <div className="animate-pulse rounded-lg h-8 bg-muted-foreground/20 w-52" />
      <div className="animate-pulse rounded-lg h-5 bg-muted-foreground/20 w-2/3" />
    </div>
  );
};

export const InlineDocumentSkeleton = ({ blockKind }: { blockKind?: BlockKind }) => {
  if (!blockKind) return null;
  return blockKind === 'text' ? (
    <div className="flex flex-col gap-4">
      <div className="h-2 w-3/4 bg-gray-200 rounded animate-pulse" />
      <div className="h-2 w-1/2 bg-gray-200 rounded animate-pulse" />
    </div>
  ) : blockKind === 'code' ? (
    <div className="flex flex-col gap-4">
      <div className="h-2 w-3/4 bg-gray-200 rounded animate-pulse" />
      <div className="h-2 w-1/2 bg-gray-200 rounded animate-pulse" />
    </div>
  ) : null;
};
