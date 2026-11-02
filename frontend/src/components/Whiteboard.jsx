import React, { useRef, useState, useEffect } from 'react';
import { 
  Pen, Square, ArrowRight, Type, Eraser, Trash2, Download, 
  RotateCcw, Palette, Layers 
} from 'lucide-react';

const COLORS = ['#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#0F172A'];

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen'); // pen, rect, arrow, text, eraser
  const [color, setColor] = useState('#2563EB');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    setHistory((prev) => [...prev.slice(-15), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const newHistory = [...history];
    newHistory.pop(); // remove current
    const previous = newHistory[newHistory.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHistory(newHistory);
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setStartPos(pos);

    if (tool === 'text') {
      setTextPos(pos);
      setShowTextInput(true);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing || tool === 'text') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const currentPos = getPos(e);

    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    }
  };

  const endDraw = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const endPos = getPos(e);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.fillStyle = color;

    if (tool === 'rect') {
      const width = endPos.x - startPos.x;
      const height = endPos.y - startPos.y;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
    } else if (tool === 'arrow') {
      // Draw Line
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(endPos.x, endPos.y);
      ctx.stroke();

      // Draw Arrowhead
      const headlen = 12;
      const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
      ctx.beginPath();
      ctx.moveTo(endPos.x, endPos.y);
      ctx.lineTo(endPos.x - headlen * Math.cos(angle - Math.PI / 6), endPos.y - headlen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(endPos.x - headlen * Math.cos(angle + Math.PI / 6), endPos.y - headlen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }

    saveState();
  };

  const handleAddText = () => {
    if (!textInput.trim()) {
      setShowTextInput(false);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextInput('');
    setShowTextInput(false);
    saveState();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = 'system_design_architecture.png';
    link.click();
  };

  return (
    <div className="border border-slate-700 bg-slate-900 rounded-xl overflow-hidden shadow-lg my-4">
      {/* Whiteboard Toolbar */}
      <div className="bg-slate-950 p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Tool selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`p-1.5 rounded flex items-center gap-1 cursor-pointer ${tool === 'pen' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            title="Pen (Freehand)"
          >
            <Pen className="w-3.5 h-3.5" /> Pen
          </button>
          <button
            type="button"
            onClick={() => setTool('rect')}
            className={`p-1.5 rounded flex items-center gap-1 cursor-pointer ${tool === 'rect' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            title="Box / Service Node"
          >
            <Square className="w-3.5 h-3.5" /> Node Box
          </button>
          <button
            type="button"
            onClick={() => setTool('arrow')}
            className={`p-1.5 rounded flex items-center gap-1 cursor-pointer ${tool === 'arrow' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            title="Arrow / Data Flow"
          >
            <ArrowRight className="w-3.5 h-3.5" /> Arrow
          </button>
          <button
            type="button"
            onClick={() => setTool('text')}
            className={`p-1.5 rounded flex items-center gap-1 cursor-pointer ${tool === 'text' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            title="Label / Text"
          >
            <Type className="w-3.5 h-3.5" /> Label
          </button>
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded flex items-center gap-1 cursor-pointer ${tool === 'eraser' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" /> Eraser
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${color === c ? 'scale-125 border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded cursor-pointer"
            title="Undo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="p-1.5 text-red-400 hover:text-red-300 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer"
            title="Clear Board"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={downloadImage}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export PNG
          </button>
        </div>
      </div>

      {/* Drawing Canvas Area */}
      <div className="relative bg-white cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={800}
          height={380}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          className="w-full h-[380px] block"
        />

        {showTextInput && (
          <div
            className="absolute bg-white border border-blue-500 p-2 rounded shadow-xl flex gap-1 z-20"
            style={{ left: Math.min(600, textPos.x), top: Math.min(320, textPos.y) }}
          >
            <input
              type="text"
              autoFocus
              placeholder="e.g. Redis Cache"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
              className="text-xs border p-1 rounded text-black outline-none w-36"
            />
            <button
              onClick={handleAddText}
              className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-bold cursor-pointer"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
