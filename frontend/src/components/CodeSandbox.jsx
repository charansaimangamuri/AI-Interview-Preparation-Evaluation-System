import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Terminal, Code2 } from 'lucide-react';

export default function CodeSandbox({ defaultCode = "# Write your Python solution here\ndef solution():\n    return 'Execution Successful'\n\nprint(solution())" }) {
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState('');
  const [pyodide, setPyodide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    async function initPyodide() {
      try {
        if (window.loadPyodide) {
          const py = await window.loadPyodide();
          setPyodide(py);
          setIsLoading(false);
        } else {
          setIsLoading(false);
          setOutput("Pyodide WebAssembly script not loaded. Check internet connection.");
        }
      } catch (err) {
        setOutput(`Failed to initialize in-browser Python runtime: ${err.message}`);
        setIsLoading(false);
      }
    }
    initPyodide();
  }, []);

  const runCode = async () => {
    if (!pyodide) return;
    setIsRunning(true);
    setOutput('Running code...\n');

    try {
      pyodide.runPython(`
        import sys
        import io
        sys.stdout = io.StringIO()
      `);

      await pyodide.runPythonAsync(code);
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      setOutput(stdout || 'Code executed successfully with no stdout output.');
    } catch (err) {
      setOutput(`Traceback / Error:\n${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-950 text-white my-4 shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <span className="text-xs font-mono font-semibold tracking-wider text-slate-300 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-blue-400" /> In-Browser Python 3 (WebAssembly Sandbox)
        </span>
        <button
          onClick={runCode}
          disabled={isLoading || isRunning}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition flex items-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {isLoading ? 'Loading Python...' : isRunning ? 'Executing...' : 'Run Code'}
        </button>
      </div>

      <div className="h-64">
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      <div className="bg-black/90 p-3 font-mono text-xs border-t border-slate-800">
        <span className="text-slate-400 font-bold block mb-1 flex items-center gap-1">
          <Terminal className="w-3.5 h-3.5 text-slate-400" /> Console Output:
        </span>
        <pre className="text-emerald-400 whitespace-pre-wrap">{output || "Click 'Run Code' to execute..."}</pre>
      </div>
    </div>
  );
}