import { toast } from 'sonner';
import { ConsoleOutput, UIBlock } from './block';
import { Dispatch, memo, SetStateAction, useCallback } from 'react';
import { RunCodeButton } from './run-code-button';
import { useCopyToClipboard } from 'usehooks-ts';
import { Button } from './ui/button';
import { CopyIcon, PlayIcon } from './icons';

interface BlockActionsProps {
  block: UIBlock;
  currentVersionIndex: number;
  handleVersionChange: (type: 'toggle' | 'next' | 'prev' | 'latest') => void;
  isCurrentVersion: boolean;
  mode: 'edit' | 'diff';
  setConsoleOutputs: Dispatch<SetStateAction<Array<ConsoleOutput>>>;
}

export const BlockActions = memo(function BlockActions({ block, currentVersionIndex, handleVersionChange, isCurrentVersion, mode, setConsoleOutputs }: BlockActionsProps) {
  const [_, copyToClipboard] = useCopyToClipboard();

  const handleCopy = useCallback(() => {
    if (!block) return;

    if (block.kind === 'text' || block.kind === 'code') {
      copyToClipboard(block.content);
      toast.success('Copied to clipboard!');
    }
  }, [block, copyToClipboard]);

  return (
    <div className="flex flex-row gap-1">
      {block.kind === 'code' && (
        <RunCodeButton
          code={block.content}
          consoleOutputs={[]}
          setConsoleOutputs={setConsoleOutputs}
        />
      )}
      <Button
        variant="outline"
        className="p-2 h-fit dark:hover:bg-zinc-700"
        onClick={handleCopy}
        disabled={block.status === 'streaming'}
      >
        <CopyIcon />
      </Button>
    </div>
  );
});
