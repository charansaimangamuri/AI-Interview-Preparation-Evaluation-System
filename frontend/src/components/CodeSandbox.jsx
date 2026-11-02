import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Terminal, Code2, CheckCircle2, XCircle, FlaskConical, Plus } from 'lucide-react';

const DEFAULT_PYTHON_CODE = `# Write your Python solution here
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test call
print("Sample output:", two_sum([2, 7, 11, 15], 9))
`;

const INITIAL_TEST_CASES = [
  { id: 1, call: 'two_sum([2, 7, 11, 15], 9)', expected: '[0, 1]' },
  { id: 2, call: 'two_sum([3, 2, 4], 6)', expected: '[1, 2]' },
  { id: 3, call: 'two_sum([3, 3], 6)', expected: '[0, 1]' }
];

export default function CodeSandbox({ defaultCode = DEFAULT_PYTHON_CODE }) {
  const [code, setCode] = useState(defaultCode);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'tests'
  const [output, setOutput] = useState('');
  const [pyodide, setPyodide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // Test Case Runner State
  const [testCases, setTestCases] = useState(INITIAL_TEST_CASES);
  const [testResults, setTestResults] = useState(null);
  const [newCall, setNewCall] = useState('');
  const [newExpected, setNewExpected] = useState('');

  useEffect(() => {
    async function initPyodide() {
      try {
        if (window.loadPyodide) {
          const py = await window.loadPyodide();
          setPyodide(py);
          setIsLoading(false);
        } else {
          setIsLoading(false);
          setOutput('Pyodide WebAssembly script not loaded. Check internet connection.');
        }
      } catch (err) {
        setOutput(`Failed to initialize in-browser Python runtime: ${err.message}`);
        setIsLoading(false);
      }
    }
    initPyodide();
  }, []);

  // Standard Script Execution
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
      const stdout = pyodide.runPython('sys.stdout.getvalue()');
      setOutput(stdout || 'Code executed successfully with no stdout output.');
    } catch (err) {
      setOutput(`Traceback / Error:\n${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // LeetCode-Style Unit Test Runner (Runs in WebAssembly)
  const runUnitTests = async () => {
    if (!pyodide) return;
    setIsRunning(true);
    const results = [];

    try {
      // First load candidate's solution into Python memory
      await pyodide.runPythonAsync(code);

      for (const tc of testCases) {
        const startTime = performance.now();
        try {
          const evalResult = await pyodide.runPythonAsync(`
            import json
            res = ${tc.call}
            json.dumps(res)
          `);
          const endTime = performance.now();
          const cleanResult = String(evalResult).trim();
          const cleanExpected = tc.expected.trim();

          const passed = JSON.stringify(JSON.parse(cleanResult)) === JSON.stringify(JSON.parse(cleanExpected));

          results.push({
            id: tc.id,
            call: tc.call,
            expected: cleanExpected,
            actual: cleanResult,
            passed: passed,
            duration: Math.round(endTime - startTime)
          });
        } catch (err) {
          results.push({
            id: tc.id,
            call: tc.call,
            expected: tc.expected,
            actual: `Error: ${err.message}`,
            passed: false,
            duration: 0
          });
        }
      }

      setTestResults(results);
    } catch (err) {
      setOutput(`Syntax Error in Solution:\n${err.message}`);
      setActiveTab('editor');
    } finally {
      setIsRunning(false);
    }
  };

  const handleAddTestCase = (e) => {
    e.preventDefault();
    if (!newCall.trim() || !newExpected.trim()) return;
    setTestCases(prev => [
      ...prev,
      { id: Date.now(), call: newCall.trim(), expected: newExpected.trim() }
    ]);
    setNewCall('');
    setNewExpected('');
  };

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-950 text-white my-4 shadow-xl">
      {/* Sandbox Header with Tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'editor' ? 'bg-slate-800 text-blue-400 border border-slate-700 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" /> Python 3 Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'tests' ? 'bg-slate-800 text-emerald-400 border border-slate-700 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" /> LeetCode Test Suite ({testCases.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'editor' ? (
            <button
              onClick={runCode}
              disabled={isLoading || isRunning}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isLoading ? 'Loading Python...' : isRunning ? 'Executing...' : 'Run Code'}
            </button>
          ) : (
            <button
              onClick={runUnitTests}
              disabled={isLoading || isRunning}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition flex items-center gap-1.5 cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {isRunning ? 'Testing...' : 'Run All Test Cases'}
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Monaco Code Editor */}
      {activeTab === 'editor' && (
        <>
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
        </>
      )}

      {/* Tab 2: LeetCode-Style Unit Test Suite */}
      {activeTab === 'tests' && (
        <div className="p-4 bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Run automated assertions against your function definition in WebAssembly:
            </span>
            {testResults && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                testResults.every(r => r.passed) 
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                  : 'bg-red-950 text-red-400 border border-red-800'
              }`}>
                {testResults.filter(r => r.passed).length} / {testResults.length} Passed
              </span>
            )}
          </div>

          {/* Test Case Cards */}
          <div className="space-y-2">
            {testCases.map((tc, idx) => {
              const res = testResults?.find(r => r.id === tc.id);
              return (
                <div
                  key={tc.id}
                  className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                    res ? (res.passed ? 'bg-emerald-950/40 border-emerald-800' : 'bg-red-950/40 border-red-800') : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-300">Test Case #{idx + 1}</span>
                    {res && (
                      <span className={`flex items-center gap-1 font-bold ${res.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {res.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {res.passed ? `PASSED (${res.duration}ms)` : 'FAILED'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Call Expression:</span>
                      <code className="text-blue-300">{tc.call}</code>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Expected Return:</span>
                      <code className="text-emerald-300">{tc.expected}</code>
                    </div>
                  </div>
                  {res && !res.passed && (
                    <div className="mt-2 pt-2 border-t border-red-900/50 text-red-300">
                      <span>Actual Output: </span>
                      <code>{res.actual}</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Custom Test Case */}
          <form onSubmit={handleAddTestCase} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-2 items-center text-xs">
            <input
              type="text"
              placeholder="e.g. two_sum([1, 5, 9], 10)"
              value={newCall}
              onChange={(e) => setNewCall(e.target.value)}
              className="flex-1 min-w-[180px] bg-slate-900 border border-slate-700 p-2 rounded text-slate-200 font-mono text-[11px] outline-none"
            />
            <input
              type="text"
              placeholder="Expected [0, 2]"
              value={newExpected}
              onChange={(e) => setNewExpected(e.target.value)}
              className="w-36 bg-slate-900 border border-slate-700 p-2 rounded text-slate-200 font-mono text-[11px] outline-none"
            />
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Case
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
