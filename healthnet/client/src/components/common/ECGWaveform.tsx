import React, { useRef, useEffect, useState } from 'react';
import { Activity, Play, Pause } from 'lucide-react';

interface ECGWaveformProps {
  heartRate?: number;
  height?: number;
  color?: string;
  lead?: string;
  showControls?: boolean;
}

export const ECGWaveform: React.FC<ECGWaveformProps> = ({
  heartRate = 75,
  height = 130,
  color = '#10b981', // Emerald green
  lead = 'Lead II',
  showControls = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentLead, setCurrentLead] = useState(lead);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let x = 0;
    const width = canvas.width;
    const h = canvas.height;
    const midY = h / 2;

    const points: number[] = new Array(width).fill(midY);
    let phase = 0;

    const cycleLength = (60 / Math.max(heartRate, 40)) * 60; // frames per beat at 60fps

    const draw = () => {
      if (isPlaying) {
        // Advance beat phase
        phase = (phase + 1) % cycleLength;
        const progress = phase / cycleLength;

        let yOffset = 0;

        // P-wave (0.15 - 0.25)
        if (progress >= 0.15 && progress <= 0.25) {
          const pProg = (progress - 0.15) / 0.10;
          yOffset = -Math.sin(pProg * Math.PI) * 12;
        }
        // Q-wave (0.35 - 0.38)
        else if (progress >= 0.35 && progress <= 0.38) {
          yOffset = 8;
        }
        // R-wave peak (0.38 - 0.44)
        else if (progress >= 0.38 && progress <= 0.44) {
          const rProg = (progress - 0.38) / 0.06;
          yOffset = -Math.sin(rProg * Math.PI) * 52;
        }
        // S-wave (0.44 - 0.48)
        else if (progress >= 0.44 && progress <= 0.48) {
          const sProg = (progress - 0.44) / 0.04;
          yOffset = Math.sin(sProg * Math.PI) * 15;
        }
        // T-wave (0.60 - 0.75)
        else if (progress >= 0.60 && progress <= 0.75) {
          const tProg = (progress - 0.60) / 0.15;
          yOffset = -Math.sin(tProg * Math.PI) * 18;
        }

        // Add baseline jitter
        yOffset += (Math.random() - 0.5) * 1.5;

        points[x] = midY + yOffset;
        x = (x + 2) % width;
      }

      // Clear & redraw grid and trace
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, h);

      // Draw faint medical ECG grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.09)';
      ctx.lineWidth = 1;

      for (let gridX = 0; gridX < width; gridX += 20) {
        ctx.beginPath();
        ctx.moveTo(gridX, 0);
        ctx.lineTo(gridX, h);
        ctx.stroke();
      }
      for (let gridY = 0; gridY < h; gridY += 20) {
        ctx.beginPath();
        ctx.moveTo(0, gridY);
        ctx.lineTo(width, gridY);
        ctx.stroke();
      }

      // Draw ECG wave
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

      let started = false;
      for (let i = 0; i < width; i++) {
        if (isPlaying && i > x && i < x + 15) {
          continue;
        }
        if (!started) {
          ctx.moveTo(i, points[i]);
          started = true;
        } else {
          ctx.lineTo(i, points[i]);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw sweep cursor if playing
      if (isPlaying) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, points[x], 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [heartRate, color, isPlaying]);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Live Telemetry &bull; {currentLead}
          </span>
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/20">
            SIMULATED
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-emerald-400 flex items-center gap-1">
            <span>{heartRate}</span> <span className="text-[10px] text-gray-400">BPM</span>
          </span>
          {showControls && (
            <div className="flex items-center gap-1.5">
              <select
                value={currentLead}
                onChange={(e) => setCurrentLead(e.target.value)}
                className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 border border-gray-300 outline-none"
              >
                <option value="Lead II">Lead II</option>
                <option value="Lead V1">Lead V1</option>
                <option value="Lead V5">Lead V5</option>
                <option value="aVR">aVR</option>
              </select>
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1 rounded bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 transition border border-gray-300"
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span>{isPlaying ? 'Freeze' : 'Resume'}</span>
              </button>
            </div>
          )}
          <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-300">
            25mm/s &bull; 10mm/mV
          </span>
        </div>
      </div>

      <div className="relative w-full rounded-lg overflow-hidden border border-emerald-500/20">
        <canvas
          ref={canvasRef}
          width={700}
          height={height}
          className="w-full h-full block"
        />
      </div>

      <p className="mt-2 text-[10px] text-gray-400 text-center italic">
        * Simulated ECG waveform visualization for prototype demonstration — not connected to physical patient telemetry hardware.
      </p>
    </div>
  );
};
