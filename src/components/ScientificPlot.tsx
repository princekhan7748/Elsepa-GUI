import React, { useState, useRef, useEffect } from "react";
import { ScatteringResultPoint, BatchCalculation, ImportedReferenceDataset } from "../types";

interface ScientificPlotProps {
  activeData: ScatteringResultPoint[];
  activeName: string;
  activeColor: string;
  batchRuns: BatchCalculation[];
  displayMode: "compare-theories" | "batch-compare";
  importedDatasets?: ImportedReferenceDataset[];
}

export default function ScientificPlot({
  activeData,
  activeName,
  activeColor,
  batchRuns,
  displayMode,
  importedDatasets = [],
}: ScientificPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [showLogY, setShowLogY] = useState(true);


  // Resize observer to ensure fluid responsive canvas sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 300),
          height: Math.max(height, 350),
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const { width, height } = dimensions;

  // Margin spacing
  const margin = { top: 40, right: 140, bottom: 50, left: 75 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // X range is strictly 0 to 180 degrees
  const xMin = 0;
  const xMax = 180;

  // Helper to map X coordinate
  const getXCoord = (angle: number) => {
    return margin.left + ((angle - xMin) / (xMax - xMin)) * plotWidth;
  };

  // Compute Y range based on standard values: log minimum and log maximum
  // DCS spans raw values ranging from 1e-21 to 1e-12 cm^2/sr
  let yMin = 1e-21;
  let yMax = 1e-12;

  // Gather active curves based on displayMode
  const curvesToPlot: {
    name: string;
    color: string;
    points: { angle: number; val: number }[];
    lineWidth: number;
    dashed?: boolean;
  }[] = [];

  if (displayMode === "compare-theories") {
    curvesToPlot.push({
      name: `${activeName} (Screened Quantum)`,
      color: activeColor,
      points: activeData.map((d) => ({ angle: d.angle, val: d.dcs })),
      lineWidth: 2.5,
    });
    curvesToPlot.push({
      name: "Point Mott Relativistic",
      color: "#f59e0b", // Amber
      points: activeData.map((d) => ({ angle: d.angle, val: d.dcsMott })),
      lineWidth: 1.5,
      dashed: true,
    });
    curvesToPlot.push({
      name: "Screened Rutherford",
      color: "#06b6d4", // Cyan
      points: activeData.map((d) => ({ angle: d.angle, val: d.dcsRutherford })),
      lineWidth: 1.5,
      dashed: true,
    });
  } else {
    // Plot all active batch runs
    batchRuns.forEach((run) => {
      curvesToPlot.push({
        name: run.name,
        color: run.color,
        points: run.data.map((d) => ({ angle: d.angle, val: d.dcs })),
        lineWidth: 2,
      });
    });

    // Make sure we always plot the active current simulation if it isn't in batches
    const isCurrentInBatch = batchRuns.some(
      (r) =>
        r.name === activeName &&
        r.data.length === activeData.length &&
        r.data[0]?.dcs === activeData[0]?.dcs
    );
    if (!isCurrentInBatch) {
      curvesToPlot.push({
        name: `${activeName} [Current]`,
        color: activeColor,
        points: activeData.map((d) => ({ angle: d.angle, val: d.dcs })),
        lineWidth: 2.5,
      });
    }
  }

  // Overlay imported reference data (e.g. ELSEPA dat files, Excel CSVs)
  if (importedDatasets && importedDatasets.length > 0) {
    importedDatasets.forEach((dataset) => {
      // Filter out points without valid values
      const validPoints = dataset.points.filter((pt) => pt.val > 0 && isFinite(pt.val));
      if (validPoints.length > 0) {
        curvesToPlot.push({
          name: dataset.name,
          color: dataset.color,
          points: validPoints,
          lineWidth: 2.2,
        });
      }
    });
  }

  // Adjust Y scale limits to tightly wrap the curves
  const allVals = curvesToPlot.flatMap((c) => c.points.map((p) => p.val)).filter((v) => v > 0 && isFinite(v));
  if (allVals.length > 0) {
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    
    // Set nice log borders (decade limits)
    yMin = Math.pow(10, Math.floor(Math.log10(rawMin || 1e-21)));
    yMax = Math.pow(10, Math.ceil(Math.log10(rawMax || 1e-12)));
    
    // clamp bounds to look coherent
    if (yMin < 1e-25) yMin = 1e-25;
    if (yMax > 1e-9) yMax = 1e-9;
    if (yMin === yMax) {
      yMin = yMin / 10;
      yMax = yMax * 10;
    }
  }

  // Y coordinate mapper
  const getYCoord = (val: number) => {
    if (val <= 0 || !isFinite(val)) return margin.top + plotHeight;
    
    if (showLogY) {
      const logMin = Math.log10(yMin);
      const logMax = Math.log10(yMax);
      const logVal = Math.log10(val);
      // log ratio
      const ratio = (logVal - logMin) / (logMax - logMin);
      return margin.top + plotHeight - ratio * plotHeight;
    } else {
      // Linear fallback
      const ratio = (val - yMin) / (yMax - yMin);
      return margin.top + plotHeight - ratio * plotHeight;
    }
  };

  // Generate ticks for X-axis (nice 30-degree partitions)
  const xTicks = [0, 30, 60, 90, 120, 150, 180];

  // Generate exponential ticks for Y-axis (decades)
  const yTicks: number[] = [];
  if (showLogY) {
    const startDecade = Math.floor(Math.log10(yMin));
    const endDecade = Math.ceil(Math.log10(yMax));
    for (let d = startDecade; d <= endDecade; d++) {
      yTicks.push(Math.pow(10, d));
    }
  } else {
    // standard linear ticks
    const step = (yMax - yMin) / 5;
    for (let i = 0; i <= 5; i++) {
      yTicks.push(yMin + i * step);
    }
  }

  // Handle Mouse Hover tracking across X-axis points
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (activeData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cursorX = e.clientX - rect.left - margin.left;
    
    // Convert cursorX to scattering angle
    const angleRatio = cursorX / plotWidth;
    const angleEst = xMin + angleRatio * (xMax - xMin);

    // Find closest index in activeData
    let closestIndex = 0;
    let minDiff = Infinity;
    activeData.forEach((pt, idx) => {
      const diff = Math.abs(pt.angle - angleEst);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    setHoveredPointIndex(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoveredPointIndex(null);
  };

  const selectedPt = hoveredPointIndex !== null ? activeData[hoveredPointIndex] : null;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
      {/* Title & Scaler Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Differential Cross Section (DCS) Plot
          </h2>
          <p className="text-xs text-slate-500">
            {displayMode === "compare-theories"
              ? "Comparing classical Screened Rutherford, point Mott, and quantum partial-wave models"
              : "Comparison across multiple elements or energy values from batch queue"}
          </p>
        </div>

        {/* Logarithmic vs Linear toggle */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 p-0.5 rounded-lg text-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)]">
          <button
            onClick={() => setShowLogY(true)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              showLogY
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/40 font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Log Axis
          </button>
          <button
            onClick={() => setShowLogY(false)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              !showLogY
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/40 font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Linear Axis
          </button>
        </div>
      </div>

      {/* Main SVG Plot Canvas Container */}
      <div id="plot-viewport" ref={containerRef} className="relative flex-1 select-none border border-slate-200/40 bg-slate-50/20 rounded-lg min-h-[350px]">
        <svg
          width={width}
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="overflow-visible"
        >
          {/* 1. X & Y Plotting Canvas Background */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotWidth}
            height={plotHeight}
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth={1}
          />

          {/* 2. Grid lines - Horizontal (Y-axis ticks) */}
          {yTicks.map((val, idx) => {
            const y = getYCoord(val);
            if (y < margin.top || y > margin.top + plotHeight) return null;
            return (
              <g key={`grid-y-${idx}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
                {/* Secondary intermediate subdivisions for rich log grid */}
                {showLogY && idx < yTicks.length - 1 && (
                  [2, 3, 4, 5, 6, 7, 8, 9].map((sub) => {
                    const subVal = val * sub;
                    const subY = getYCoord(subVal);
                    if (subY < margin.top || subY > margin.top + plotHeight) return null;
                    return (
                      <line
                        key={`grid-y-sub-${idx}-${sub}`}
                        x1={margin.left}
                        y1={subY}
                        x2={margin.left + plotWidth}
                        y2={subY}
                        stroke="#f8fafc"
                        strokeWidth={0.5}
                      />
                    );
                  })
                )}
              </g>
            );
          })}

          {/* 3. Grid lines - Vertical (X-axis ticks) */}
          {xTicks.map((angle) => {
            const x = getXCoord(angle);
            return (
              <line
                key={`grid-x-${angle}`}
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + plotHeight}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
            );
          })}

          {/* 4. Draw scientific curves */}
          {curvesToPlot.map((curve, cIdx) => {
            // Generate path string
            let dPath = "";
            let pointsToDraw = curve.points;

            pointsToDraw.forEach((pt, pIdx) => {
              const cx = getXCoord(pt.angle);
              const cy = getYCoord(pt.val);

              // Safeguard coordinate limits
              if (cx >= margin.left && cx <= margin.left + plotWidth && cy >= margin.top && cy <= margin.top + plotHeight) {
                if (pIdx === 0) {
                  dPath += `M ${cx} ${cy}`;
                } else {
                  dPath += ` L ${cx} ${cy}`;
                }
              }
            });

            return (
              <g key={`curve-${cIdx}`}>
                <path
                  d={dPath}
                  fill="none"
                  stroke={curve.color}
                  strokeWidth={curve.lineWidth}
                  strokeDasharray={curve.dashed ? "4 4" : undefined}
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* 5. Left Vertical Axis Ticks & Numbers (Y-axis) */}
          {yTicks.map((val, idx) => {
            const y = getYCoord(val);
            if (y < margin.top - 2 || y > margin.top + plotHeight + 2) return null;
            return (
              <g key={`tick-y-${idx}`} className="text-[10px] font-mono text-slate-400">
                <line
                  x1={margin.left - 5}
                  y1={y}
                  x2={margin.left}
                  y2={y}
                  stroke="#94a3b8"
                  strokeWidth={1.2}
                />
                <text
                  x={margin.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 font-medium"
                >
                  {showLogY ? `10⁻${Math.abs(Math.round(Math.log10(val)))}` : val.toExponential(1)}
                </text>
              </g>
            );
          })}

          {/* 6. Bottom Horizontal Axis Ticks & Degrees (X-axis) */}
          {xTicks.map((angle) => {
            const x = getXCoord(angle);
            return (
              <g key={`tick-x-${angle}`} className="text-[10px] font-mono text-slate-400">
                <line
                  x1={x}
                  y1={margin.top + plotHeight}
                  x2={x}
                  y2={margin.top + plotHeight + 5}
                  stroke="#94a3b8"
                  strokeWidth={1.2}
                />
                <text
                  x={x}
                  y={margin.top + plotHeight + 18}
                  textAnchor="middle"
                  className="fill-slate-500 font-medium"
                >
                  {angle}°
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          {/* Y Axis Label */}
          <text
            x={16}
            y={(margin.top + plotHeight / 2)}
            transform={`rotate(-90 16 ${margin.top + plotHeight / 2})`}
            textAnchor="middle"
            className="text-[11px] font-semibold fill-slate-500 font-sans tracking-wide"
          >
            DCS dσ/dΩ (cm²/sr)
          </text>

          {/* X Axis Label */}
          <text
            x={margin.left + plotWidth / 2}
            y={margin.top + plotHeight + 35}
            textAnchor="middle"
            className="text-[11px] font-semibold fill-slate-500 font-sans tracking-wide"
          >
            Scattering Angle θ (degrees)
          </text>

          {/* 7. Interactive Hover Cursor & Points Tracker */}
          {selectedPt && hoveredPointIndex !== null && (
            <g>
              {/* Vertical guideline */}
              <line
                x1={getXCoord(selectedPt.angle)}
                y1={margin.top}
                x2={getXCoord(selectedPt.angle)}
                y2={margin.top + plotHeight}
                stroke="#2563eb"
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              {/* Bullet indicators for each plotting curve at matching angle */}
              {curvesToPlot.map((curve, cIdx) => {
                const pt = curve.points[hoveredPointIndex];
                if (!pt) return null;
                const cx = getXCoord(pt.angle);
                const cy = getYCoord(pt.val);

                return (
                  <circle
                    key={`hover-dot-${cIdx}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={curve.color}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    className="shadow-sm"
                  />
                );
              })}
            </g>
          )}

          {/* 8. On-Plot Chart Legend Box */}
          <g transform={`translate(${margin.left + plotWidth + 10}, ${margin.top + 5})`}>
            <rect
              width={margin.right - 15}
              height={curvesToPlot.length * 20 + 20}
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth={1}
              rx={6}
              className="shadow-xs"
            />
            <text x={10} y={15} className="text-[9px] font-bold fill-slate-400 font-sans tracking-widest uppercase">
              PLOTTED LINES
            </text>
            {curvesToPlot.map((curve, idx) => {
              const yPos = 35 + idx * 20;
              return (
                <g key={`legend-${idx}`} className="text-xs">
                  {/* Legend key line */}
                  <line
                    x1={10}
                    y1={yPos - 4}
                    x2={25}
                    y2={yPos - 4}
                    stroke={curve.color}
                    strokeWidth={2}
                    strokeDasharray={curve.dashed ? "2 2" : undefined}
                  />
                  {/* Legend key bullet */}
                  <circle cx={17.5} cy={yPos - 4} r={2} fill={curve.color} />
                  {/* Legend Text truncating safely */}
                  <text
                    x={32}
                    y={yPos}
                    className="fill-slate-600 font-medium font-sans text-[11px]"
                    clipPath={`url(#legend-clip-${idx})`}
                  >
                    {curve.name.length > 15 ? `${curve.name.slice(0, 14)}...` : curve.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* 9. Floating Details Tooltip details (HTML absolute positioned) */}
        {selectedPt && hoveredPointIndex !== null && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-905/95 backdrop-blur-xs text-white rounded-lg p-3 text-xs shadow-md border border-slate-700/50 flex flex-col gap-1.5 bg-slate-900"
            style={{
              left: `${Math.min(
                getXCoord(selectedPt.angle) + 12,
                width - 190
              )}px`,
              top: `${Math.min(
                getYCoord(selectedPt.dcs) - 15,
                height - 180
              )}px`,
            }}
          >
            <div className="font-bold text-[10px] text-slate-300 border-b border-slate-700/50 pb-1 flex items-center justify-between gap-4">
              <span>ANGLE θ: {selectedPt.angle.toFixed(1)}°</span>
              <span className="text-blue-400 font-mono">[{hoveredPointIndex}]</span>
            </div>
            
            {curvesToPlot.map((curve, cIdx) => {
              const pt = curve.points[hoveredPointIndex!];
              if (!pt) return null;
              return (
                <div key={`tip-curve-${cIdx}`} className="flex items-center justify-between gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5 truncate max-w-[100px]">
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: curve.color }}
                    ></span>
                    <span className="text-slate-400 truncate">{curve.name}</span>
                  </div>
                  <span className="font-mono font-medium">
                    {pt.val.toExponential(3)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Matplotlib Alignment Banner */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Matplotlib Grid Alignment: Perfect Logarithmic Sync
        </span>
        <span className="text-slate-400">ELSEPA DCS Units: cm²/sr</span>
      </div>
    </div>
  );
}
