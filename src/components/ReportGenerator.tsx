import React, { useState } from "react";
import { ScatteringResultPoint, SimulationSummary, ScatteringConfig, AtomicElement } from "../types";
import { Download, FileText, Share2, Table, ChevronLeft, ChevronRight, CheckCircle2, Award } from "lucide-react";
import { getElementByZ } from "../utils/scattering";

interface ReportGeneratorProps {
  config: ScatteringConfig;
  summary: SimulationSummary;
  data: ScatteringResultPoint[];
}

export default function ReportGenerator({ config, summary, data }: ReportGeneratorProps) {
  const element = getElementByZ(config.atomicNumber);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Search/Filter matching angles to look authentic
  const [angleFilter, setAngleFilter] = useState("");

  const filteredData = data.filter((row) => {
    if (!angleFilter) return true;
    return row.angle.toString().includes(angleFilter) || Math.round(row.angle).toString() === angleFilter;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEntries = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Download CSV
  const handleDownloadCSV = () => {
    const isCompound = config.mode === "compound";
    const name = isCompound && config.compound ? config.compound.name : element.name;
    const formula = isCompound && config.compound ? config.compound.formula : element.symbol;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `ELSEPA Quantum Cross Section Analyzer - Collision Physics Report\n`;
    csvContent += `Target,${name} (${formula})\n`;
    if (!isCompound) {
      csvContent += `Atomic Number (Z),${element.z}\n`;
    } else {
      csvContent += `Composition,${config.compound?.atoms.map(a => `${a.element.symbol}:${a.stoichiometry}`).join(" | ")}\n`;
    }
    csvContent += `Projectile,${config.projectile}\n`;
    csvContent += `Kinetic Energy (eV),${config.energy}\n`;
    csvContent += `Potential Model,${config.potentialModel}\n`;
    csvContent += `Elastic Cross Section (A^2),${summary.sigmaEl.toFixed(5)}\n`;
    csvContent += `Momentum Transfer Cross Section (A^2),${summary.sigmaTr.toFixed(5)}\n\n`;
    csvContent += "Scattering Angle (deg),Screened Quantum DCS (cm^2/sr),Unscreened Point Mott DCS (cm^2/sr),Screened Rutherford DCS (cm^2/sr)\n";

    data.forEach((row) => {
      csvContent += `${row.angle},${row.dcs.toExponential(6)},${row.dcsMott.toExponential(6)},${row.dcsRutherford.toExponential(6)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `elsepa_report_${formula}_${config.energy}eV.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download JSON
  const handleDownloadJSON = () => {
    const isCompound = config.mode === "compound";
    const name = isCompound && config.compound ? config.compound.name : element.name;
    const formula = isCompound && config.compound ? config.compound.formula : element.symbol;
    const reportObj = {
      timestamp: new Date().toISOString(),
      metadata: {
        isCompound,
        target: isCompound ? {
          name,
          formula,
          atoms: config.compound?.atoms.map(a => ({ symbol: a.element.symbol, Z: a.element.z, stoichiometry: a.stoichiometry }))
        } : { name: element.name, symbol: element.symbol, Z: element.z, atomicWeight: element.weight },
        config: { energy_eV: config.energy, projectile: config.projectile, potentialModel: config.potentialModel, angleStep: config.angleStep }
      },
      integrated_cross_sections: {
        elastic_cross_section_A2: summary.sigmaEl,
        momentum_transfer_cross_section_A2: summary.sigmaTr,
        dcs_forward_theta0_cm2_sr: summary.dcsForward,
        dcs_backward_theta180_cm2_sr: summary.dcsBackward,
        forward_to_backward_anisotropy: summary.forwardBackRatio
      },
      scattering_differential_data: data
    };

    const blob = new Blob([JSON.stringify(reportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `elsepa_schema_${formula}_${config.energy}eV.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Launch browser native print layout customized for reports
  const handlePrint = () => {
    window.print();
  };

  // Download fully-rendered, beautiful standalone HTML report file
  const handleDownloadHTML = () => {
    const isCompound = config.mode === "compound";
    const name = isCompound && config.compound ? config.compound.name : element.name;
    const formula = isCompound && config.compound ? config.compound.formula : element.symbol;

    const title = isCompound && config.compound 
      ? `Elastic Scattering Report - ${config.compound.name} (${config.compound.formula})`
      : `Elastic Scattering Report - ${element.name} (Z=${element.z})`;

    const description = isCompound && config.compound
      ? `Independent Atom Approximation (IAA) composite cross-sections for ${config.compound.formula} molecular target.`
      : `Single-atom quantum collision cross-sections for active Z=${element.z} target.`;

    const summaryRows = `
      <tr><td>Target System Type</td><td><strong>${isCompound ? "Dynamic Multi-Atom Compound (IAA Model)" : "Single Atomic System"}</strong></td></tr>
      <tr><td>Target Name</td><td><strong>${name}</strong></td></tr>
      <tr><td>Chemical Formula / Symbol</td><td><code>${formula}</code></td></tr>
      ${!isCompound ? `<tr><td>Atomic Number (Z)</td><td>${element.z}</td></tr>` : `<tr><td>Atomic Constituents</td><td>${config.compound?.atoms.map(a => `${a.element.name} (${a.element.symbol}, Z=${a.element.z}) x ${a.stoichiometry}`).join(", ")}</td></tr>`}
      <tr><td>Incident Projectile</td><td>${config.projectile === "electron" ? "Electron (e⁻)" : "Positron (e⁺)"}</td></tr>
      <tr><td>Kinetic Energy</td><td><strong>${config.energy.toLocaleString()} eV</strong></td></tr>
      <tr><td>Nuclear Potential Model</td><td>${config.potentialModel}</td></tr>
      <tr><td>Elastic Cross-Section (&sigma;_el)</td><td><strong>${summary.sigmaEl.toFixed(5)} &Aring;&sup2;</strong> (${(summary.sigmaEl * 1e-16).toExponential(3)} cm&sup2;)</td></tr>
      <tr><td>Momentum Transfer (&sigma;_tr)</td><td><strong>${summary.sigmaTr.toFixed(5)} &Aring;&sup2;</strong> (${(summary.sigmaTr * 1e-16).toExponential(3)} cm&sup2;)</td></tr>
      <tr><td>Anisotropy Ratio (0&deg;/180&deg;)</td><td>${summary.forwardBackRatio.toExponential(4)}</td></tr>
    `;

    const dcsRows = data.slice(0, 181).map(r => `
      <tr>
        <td>${r.angle.toFixed(1)}&deg;</td>
        <td class="num">${r.dcs.toExponential(4)}</td>
        <td class="num">${r.dcsMott.toExponential(4)}</td>
        <td class="num">${r.dcsRutherford.toExponential(4)}</td>
      </tr>
    `).join("");

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
      padding: 32px;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      color: #0f172a;
    }
    h2 {
      font-size: 18px;
      color: #1e293b;
      margin-top: 32px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 14px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #f1f5f9;
    }
    th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 600;
    }
    tr:hover {
      background-color: #f8fafc;
    }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      background-color: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    .num {
      font-family: Menlo, Monaco, Consolas, monospace;
    }
    .badge {
      background-color: #dbeafe;
      color: #1e40af;
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      display: inline-block;
    }
    .footer {
      margin-top: 48px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">ELSEPA Quantum Analyzer Report</div>
      <h1 style="margin-top: 8px;">${title}</h1>
      <div class="subtitle">${description}</div>
    </div>

    <h2>1. Physics Input Parameters & Summary Data</h2>
    <table>
      <thead>
        <tr>
          <th>Scattering Parameter</th>
          <th>Calculated / Configured Value</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRows}
      </tbody>
    </table>

    <h2>2. Angular Cross-Section Table (Full Vector Range - 180&deg;)</h2>
    <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Showing angular distribution of elastic collision cross-sections computed under relativistic Dirac partial-wave emulations.</div>
    <table>
      <thead>
        <tr>
          <th>Scattering Angle (&theta;)</th>
          <th style="text-align: right;">Quantum DCS (cm&sup2;/sr)</th>
          <th style="text-align: right;">Point Mott (cm&sup2;/sr)</th>
          <th style="text-align: right;">Rutherford (cm&sup2;/sr)</th>
        </tr>
      </thead>
      <tbody>
        ${dcsRows}
      </tbody>
    </table>

    <div class="footer">
      Generated automatically by the ELSEPA Quantum Collision Portal.<br>
      Local timestamp: ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `elsepa_report_${formula}_${config.energy}eV.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="report-view-card" className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col gap-6">
      {/* Report Header Wrapper */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-250/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-2 select-none">
            <CheckCircle2 className="w-3 h-3" /> Ready for Export
          </span>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Theoretical Calculations Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quantum mechanical integrated results and angular distribution data tables
          </p>
        </div>

        {/* Dynamic Export Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleDownloadCSV}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> CSV Table
          </button>
          <button
            onClick={handleDownloadJSON}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> JSON Schema
          </button>
          <button
            onClick={handleDownloadHTML}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export Clean HTML
          </button>
          <button
            onClick={handlePrint}
            className="flex-grow md:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 border border-blue-650 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" /> Save PDF / Print
          </button>
        </div>
      </div>

      {/* Structured Collision Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Elastic Cross-Section (σ_el)
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-800">
              {summary.sigmaEl.toFixed(5)}
            </span>
            <span className="text-xs text-slate-500 font-medium">Å²</span>
          </div>
          <span className="text-[9.5px] text-slate-400 mt-1 block">
            {(summary.sigmaEl * 1e-16).toExponential(3)} cm²
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Momentum Transfer (σ_tr)
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-800">
              {summary.sigmaTr.toFixed(5)}
            </span>
            <span className="text-xs text-slate-500 font-medium">Å²</span>
          </div>
          <span className="text-[9.5px] text-slate-400 mt-1 block">
            {(summary.sigmaTr * 1e-16).toExponential(3)} cm²
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Anisotropy Ratio (σ_tr/σ_el)
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-800">
              {(summary.sigmaTr / (summary.sigmaEl || 1e-12)).toFixed(4)}
            </span>
          </div>
          <span className="text-[9.5px] text-slate-400 mt-1 block select-none">
            {summary.sigmaTr > summary.sigmaEl ? "Highly back-peaked" : "Standard forward momentum"}
          </span>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Forward/Backward Ratio
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-800">
              {summary.forwardBackRatio.toExponential(3)}
            </span>
          </div>
          <span className="text-[9.5px] text-slate-400 mt-1 block">
            Ratio (0° / 180° distribution limits)
          </span>
        </div>
      </div>

      {/* Table & Setup Detail Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Physical Interpretation Box */}
        <div className="lg:col-span-5 border border-slate-200/80 rounded-xl p-5 bg-blue-50/15 text-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Award className="w-4 h-4 text-blue-600 animate-bounce" />
            Physical Characterisation
          </h3>

          <div className="flex flex-col gap-3 text-slate-600 leading-relaxed">
            <div className="border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-700 block">Collision Mechanics:</span>
              <span>
                At an incident energy of <strong className="text-blue-600 font-mono">{config.energy} eV</strong>, the electron de Broglie wavelength is {" "}
                <span className="font-mono font-medium text-slate-800">
                  {(12.26 / Math.sqrt(config.energy)).toFixed(3)} Å
                </span>. 
                {config.energy < 200 ? (
                  " Low energy limits: Scattering is heavily governed by exchange and electrostatic correlation polarization potentials, creating large isotropic cross-sections."
                ) : config.energy > 5000 ? (
                  " Medium-high energy limits: Extremely forward-peaked because electrostatic screening of the atomic nucleus allows deep penetration without massive deflection angles."
                ) : (
                  " Core quantum diffraction region: Wave scattering results in distinct diffraction maxima and minima due to strong phase shift oscillations inside the outer shell."
                )}
              </span>
            </div>

            <div className="pb-1">
              <span className="font-semibold text-slate-700 block">Practical Microscopy Implication:</span>
              <span>
                {config.energy < 1000 ? (
                  "Greatly suited for Low-Voltage SEM (Scanning Electron Microscopy) or atomic outer shell spectroscopy where backscattered electrons display elevated surface-topographical sensitivity."
                ) : (
                  "Perfect for standard Transmission Electron Microscopy (TEM) and materials characterisation models, displaying tight small-angle forward cones matching standard Rutherford approximations."
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Angular Distribution DCS Table Board */}
        <div className="lg:col-span-7 flex flex-col border border-slate-200/80 rounded-xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-250/15 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">DCS Table ({filteredData.length} records)</span>
            </div>

            {/* Quick search */}
            <input
              type="number"
              placeholder="Filter angle..."
              value={angleFilter}
              onChange={(e) => {
                setAngleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-[11px] border border-slate-200 outline-hidden hover:border-slate-350 focus:border-blue-500 rounded px-2.5 py-1.5 max-w-[110px] bg-white transition-colors"
            />
          </div>

          <div className="overflow-x-auto min-h-[310px]">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-55 border-b border-slate-100 text-slate-400 font-semibold font-mono tracking-widest text-[9px] uppercase">
                  <th className="px-4 py-2">Angle θ (deg)</th>
                  <th className="px-4 py-2">Quantum DCS (cm²/sr)</th>
                  <th className="px-4 py-2">Point Mott (cm²/sr)</th>
                  <th className="px-4 py-2">Rutherford (cm²/sr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {currentEntries.map((row) => (
                  <tr key={row.angle} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{row.angle.toFixed(1)}°</td>
                    <td className="px-4 py-2.5 text-blue-600 font-semibold">{row.dcs.toExponential(4)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{row.dcsMott.toExponential(4)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{row.dcsRutherford.toExponential(4)}</td>
                  </tr>
                ))}
                {currentEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400">
                      No angles match your filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination */}
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong>
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
