import { memo } from 'react';
import { TerminalWindowIcon, LoaderIcon, CrossSmallIcon } from './icons';
import { Button } from './ui/button';
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ConsoleOutput } from './block';
import { cn } from '@/lib/utils';
import { useBlockSelector } from '@/hooks/use-block';

interface ConsoleProps {
  consoleOutputs: Array<ConsoleOutput>;
  setConsoleOutputs: Dispatch<SetStateAction<Array<ConsoleOutput>>>;
}

export const Console = memo(({ consoleOutputs, setConsoleOutputs }: ConsoleProps) => {
  const [height, setHeight] = useState<number>(300);
  const [isResizing, setIsResizing] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const isBlockVisible = useBlockSelector((state) => state.isVisible);

  const minHeight = 100;
  const maxHeight = 800;

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          setHeight(newHeight);
        }
      }
    },
    [isResizing],
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleOutputs]);

  useEffect(() => {
    if (!isBlockVisible) {
      setConsoleOutputs([]);
    }
  }, [isBlockVisible, setConsoleOutputs]);

  return consoleOutputs.length > 0 ? (
    <>
      <div
        className="h-2 w-full fixed cursor-ns-resize z-50"
        onMouseDown={startResizing}
        style={{ bottom: height - 4 }}
        role="slider"
        aria-valuenow={minHeight}
      />

      <div
        className={cn(
          'fixed flex flex-col bottom-0 dark:bg-zinc-900 bg-zinc-50 w-full border-t z-40 overflow-y-scroll overflow-x-hidden dark:border-zinc-700 border-zinc-200',
          {
            'select-none': isResizing,
          },
        )}
        style={{ height }}
      >
        <div className="flex flex-row justify-between items-center w-full h-fit border-b dark:border-zinc-700 border-zinc-200 px-2 py-1 sticky top-0 z-50 bg-muted">
          <div className="text-sm pl-2 dark:text-zinc-50 text-zinc-800 flex flex-row gap-3 items-center">
            <div className="text-muted-foreground">
              <TerminalWindowIcon />
            </div>
            <div>Console</div>
          </div>
          <Button
            variant="ghost"
            className="size-fit p-1 hover:dark:bg-zinc-700 hover:bg-zinc-200"
            size="icon"
            onClick={() => setConsoleOutputs([])}
          >
            <CrossSmallIcon />
          </Button>
        </div>

        <div>
          {consoleOutputs.map((output) => (
            <div key={output.id} className="flex flex-col gap-2">
              {output.status === 'in_progress' ? (
                <div className="flex flex-row gap-2 items-center">
                  <div className="animate-spin">
                    <LoaderIcon />
                  </div>
                  <div>Running...</div>
                </div>
              ) : output.status === 'loading_packages' ? (
                <div className="flex flex-row gap-2 items-center">
                  <div className="animate-spin">
                    <LoaderIcon />
                  </div>
                  <div>Loading packages...</div>
                </div>
              ) : output.status === 'failed' ? (
                <div className="text-red-500">
                  {output.contents.map((content, index) => (
                    <div key={index}>{content.value}</div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {output.contents.map((content, index) => (
                    <div key={index} className="whitespace-pre-wrap font-mono">
                      {content.value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </>
  ) : null;
});
