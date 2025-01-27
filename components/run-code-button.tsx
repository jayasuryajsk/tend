import { generateUUID } from '@/lib/utils';
import {
  type Dispatch,
  type SetStateAction,
  startTransition,
  useCallback,
  useState,
  useEffect,
  memo,
} from 'react';
import type { ConsoleOutput, ConsoleOutputContent } from './block';
import { Button } from './ui/button';
import { PlayIcon } from './icons';

const OUTPUT_HANDLERS = {
  basic: `
    # Basic output capture setup
  `,
};

function detectRequiredHandlers(code: string): string[] {
  return ['basic'];
}

interface RunCodeButtonProps {
  code: string;
  consoleOutputs: Array<ConsoleOutput>;
  setConsoleOutputs: Dispatch<SetStateAction<Array<ConsoleOutput>>>;
  disabled?: boolean;
}

export function PureRunCodeButton({
  code,
  consoleOutputs,
  setConsoleOutputs,
  disabled,
}: RunCodeButtonProps) {
  const isPython = true;
  const [pyodide, setPyodide] = useState<any>(null);

  const loadAndRunPython = useCallback(async () => {
    const runId = generateUUID();
    const stdOutputs: Array<ConsoleOutputContent> = [];

    setConsoleOutputs((outputs) => [
      ...outputs,
      {
        id: runId,
        contents: [],
        status: 'in_progress',
      },
    ]);

    let currentPyodideInstance = pyodide;

    if (isPython) {
      try {
        if (!currentPyodideInstance) {
          // @ts-expect-error - loadPyodide is not defined
          const newPyodideInstance = await globalThis.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
          });

          setPyodide(null);
          setPyodide(newPyodideInstance);
          currentPyodideInstance = newPyodideInstance;
        }

        currentPyodideInstance.setStdout({
          batched: (output: string) => {
            stdOutputs.push({
              type: 'text',
              value: output,
            });
          },
        });

        await currentPyodideInstance.loadPackagesFromImports(code, {
          messageCallback: (message: string) => {
            setConsoleOutputs((outputs) => [
              ...outputs.filter((output) => output.id !== runId),
              {
                id: runId,
                contents: [{ type: 'text', value: message }],
                status: 'loading_packages',
              },
            ]);
          },
        });

        const requiredHandlers = detectRequiredHandlers(code);
        for (const handler of requiredHandlers) {
          if (OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]) {
            await currentPyodideInstance.runPythonAsync(
              OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS],
            );
          }
        }

        await currentPyodideInstance.runPythonAsync(code);

        setConsoleOutputs((outputs) => [
          ...outputs.filter((output) => output.id !== runId),
          {
            id: generateUUID(),
            contents: stdOutputs.filter((output) => output.value.trim().length),
            status: 'completed',
          },
        ]);
      } catch (error: any) {
        setConsoleOutputs((outputs) => [
          ...outputs.filter((output) => output.id !== runId),
          {
            id: runId,
            contents: [{ type: 'text', value: error.message }],
            status: 'failed',
          },
        ]);
      }
    }
  }, [pyodide, code, isPython, setConsoleOutputs]);

  useEffect(() => {
    return () => {
      if (pyodide) {
        try {
          pyodide.runPythonAsync(`
            import sys
            import gc
            gc.collect()
          `);
        } catch (error) {
          console.warn('Cleanup failed:', error);
        }
      }
    };
  }, [pyodide]);

  return (
    <Button
      variant="outline"
      className="py-1.5 px-2 h-fit dark:hover:bg-zinc-700"
      onClick={() => {
        startTransition(() => {
          loadAndRunPython();
        });
      }}
      disabled={disabled}
    >
      <PlayIcon size={18} /> Run
    </Button>
  );
}

export const RunCodeButton = memo(PureRunCodeButton, (prevProps, nextProps) => {
  if (prevProps.code !== nextProps.code) return false;
  if (prevProps.disabled !== nextProps.disabled) return false;
  return true;
});
