import { useState, useEffect } from "react";
import { ScatteringConfig, ScatteringResultPoint, SimulationSummary, BatchCalculation, AtomComposition, CompoundSetup } from "./types";
import {
  calculateScatteringDCS,
  calculateCompoundScatteringDCS,
  calculateIntegratedCrossSections,
  ATOMIC_ELEMENTS,
  getElementByZ,
} from "./utils/scattering";
import {
  Sliders,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  LineChart,
  FileCode,
  FileText,
  Atom,
  HelpCircle,
  TrendingUp,
  FlaskConical,
  Layers,
  Cpu,
  Tv,
  CheckCircle,
  HelpCircle as HelpIcon,
  Sparkles,
  Info
} from "lucide-react";
import ScientificPlot from "./components/ScientificPlot";
import PythonWrapperView from "./components/PythonWrapperView";
import ReportGenerator from "./components/ReportGenerator";
import AICoach from "./components/AICoach";

export default function App() {
  // 1. Core Config & Calculation State
  const [config, setConfig] = useState<ScatteringConfig>({
    mode: "single",
    atomicNumber: 79, // Default gold for gorgeous atomic wave peaks!
    energy: 1000,
    projectile: "electron",
    potentialModel: "Hartree-Fock",
    angleStep: 1,
  });

  const [activeData, setActiveData] = useState<ScatteringResultPoint[]>([]);
  const [activeSummary, setActiveSummary] = useState<SimulationSummary>({
    sigmaEl: 0,
    sigmaTr: 0,
    dcsForward: 0,
    dcsBackward: 0,
    forwardBackRatio: 1,
  });

  const [activeTab, setActiveTab] = useState<"plot" | "python" | "report">("plot");
  const [batchRuns, setBatchRuns] = useState<BatchCalculation[]>([]);

  // Selected preset element symbol helper
  const activeElement = getElementByZ(config.atomicNumber);

  // Colors for batch plotting comparison
  const batchColors = ["#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];

  // 2. Direct Energy Input Box State (Supports commas, eg. 51,600 or 51600 eV)
  const [energyInputStr, setEnergyInputStr] = useState<string>("1,000");

  // Keep energy input string in sync with slider updates
  useEffect(() => {
    setEnergyInputStr(config.energy.toLocaleString());
  }, [config.energy]);

  const handleEnergyInputChange = (valStr: string) => {
    setEnergyInputStr(valStr);
    const sanitizedVal = valStr.replace(/,/g, "");
    const parsed = parseInt(sanitizedVal);
    if (!isNaN(parsed) && parsed >= 10 && parsed <= 1000000) {
      setConfig((prev) => ({ ...prev, energy: parsed }));
    }
  };

  // 3. Compound Builder State (Multi-Atom Compound Model)
  const [selectedBuilderZ, setSelectedBuilderZ] = useState<number>(1);
  const [selectedBuilderStoich, setSelectedBuilderStoich] = useState<number>(2);
  const [customCompoundAtoms, setCustomCompoundAtoms] = useState<AtomComposition[]>([
    { element: getElementByZ(1), stoichiometry: 2 },
    { element: getElementByZ(8), stoichiometry: 1 }
  ]);
  const [customCompoundName, setCustomCompoundName] = useState<string>("Water");

  // Compound Presets
  const COMPOUND_PRESETS = [
    {
      name: "Water",
      formula: "H₂O",
      atoms: [
        { element: getElementByZ(1), stoichiometry: 2 },
        { element: getElementByZ(8), stoichiometry: 1 }
      ]
    },
    {
      name: "Quartz / Silica",
      formula: "SiO₂",
      atoms: [
        { element: getElementByZ(14), stoichiometry: 1 },
        { element: getElementByZ(8), stoichiometry: 2 }
      ]
    },
    {
      name: "Carbon Dioxide",
      formula: "CO₂",
      atoms: [
        { element: getElementByZ(6), stoichiometry: 1 },
        { element: getElementByZ(8), stoichiometry: 2 }
      ]
    },
    {
      name: "Gallium Arsenide",
      formula: "GaAs",
      atoms: [
        { element: getElementByZ(31), stoichiometry: 1 },
        { element: getElementByZ(33), stoichiometry: 1 }
      ]
    },
    {
      name: "Methane",
      formula: "CH₄",
      atoms: [
        { element: getElementByZ(6), stoichiometry: 1 },
        { element: getElementByZ(1), stoichiometry: 4 }
      ]
    }
  ];

  const handleLoadCompoundPreset = (preset: typeof COMPOUND_PRESETS[0]) => {
    setCustomCompoundAtoms(preset.atoms);
    setCustomCompoundName(preset.name);
    
    setConfig((prev) => ({
      ...prev,
      mode: "compound",
      compound: {
        name: preset.name,
        formula: preset.formula,
        atoms: preset.atoms,
      }
    }));
  };

  const handleAddAtomToCompound = () => {
    const el = getElementByZ(selectedBuilderZ);
    // If element already exists, update stoichiometry
    setCustomCompoundAtoms((prev) => {
      let updated;
      if (prev.some((a) => a.element.z === el.z)) {
        updated = prev.map((a) =>
          a.element.z === el.z
            ? { ...a, stoichiometry: a.stoichiometry + selectedBuilderStoich }
            : a
        );
      } else {
        updated = [...prev, { element: el, stoichiometry: selectedBuilderStoich }];
      }
      
      // Update global configuration
      const formulaStr = updated.map(a => `${a.element.symbol}${a.stoichiometry > 1 ? a.stoichiometry : ""}`).join("");
      setConfig((p) => ({
        ...p,
        mode: "compound",
        compound: {
          name: customCompoundName,
          formula: formulaStr,
          atoms: updated,
        }
      }));
      return updated;
    });
  };

  const handleRemoveAtomFromCompound = (z: number) => {
    setCustomCompoundAtoms((prev) => {
      const updated = prev.filter((a) => a.element.z !== z);
      const formulaStr = updated.map(a => `${a.element.symbol}${a.stoichiometry > 1 ? a.stoichiometry : ""}`).join("");
      setConfig((p) => ({
        ...p,
        mode: "compound",
        compound: {
          name: customCompoundName,
          formula: formulaStr,
          atoms: updated,
        }
      }));
      return updated;
    });
  };

  // Toggle modes
  const handleToggleMode = (mode: "single" | "compound") => {
    if (mode === "compound") {
      const formulaStr = customCompoundAtoms.map(a => `${a.element.symbol}${a.stoichiometry > 1 ? a.stoichiometry : ""}`).join("");
      setConfig((prev) => ({
        ...prev,
        mode: "compound",
        compound: {
          name: customCompoundName,
          formula: formulaStr,
          atoms: customCompoundAtoms,
        }
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        mode: "single",
      }));
    }
  };

  // 4. Trigger active calculation loop upon parameter updates
  useEffect(() => {
    let rawData;
    if (config.mode === "compound" && config.compound) {
      rawData = calculateCompoundScatteringDCS(config);
    } else {
      rawData = calculateScatteringDCS(config);
    }
    const summaryStats = calculateIntegratedCrossSections(rawData);
    setActiveData(rawData);
    setActiveSummary(summaryStats);
  }, [config]);

  // Handle preset single atomic elements click
  const selectElement = (z: number) => {
    setConfig((prev) => ({ ...prev, mode: "single", atomicNumber: z }));
  };

  // Add current run parameters to the Batch comparison queue
  const handleAddToBatch = () => {
    const isCompound = config.mode === "compound";
    const displayName = isCompound && config.compound
      ? `${config.compound.formula} (${config.energy} eV)`
      : `${activeElement.symbol} (${config.energy} eV)`;

    const runName = `${displayName} ${config.projectile === "electron" ? "e⁻" : "e⁺"}`;
    
    if (batchRuns.some((r) => r.name === runName && r.potentialModel === config.potentialModel)) {
      alert("This simulation configuration is already added to comparison series!");
      return;
    }

    const nextColor = batchColors[batchRuns.length % batchColors.length];

    const newBatchRun: BatchCalculation = {
      id: Math.random().toString(36).substr(2, 9),
      name: runName,
      elementSymbol: isCompound && config.compound ? config.compound.formula : activeElement.symbol,
      atomicNumber: config.atomicNumber,
      energy: config.energy,
      projectile: config.projectile,
      potentialModel: config.potentialModel,
      color: nextColor,
      data: activeData,
      summary: activeSummary,
    };

    setBatchRuns((prev) => [...prev, newBatchRun]);
  };

  const handleRemoveBatch = (id: string) => {
    setBatchRuns((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAllBatches = () => {
    setBatchRuns([]);
  };

  const handleResetParameters = () => {
    setConfig({
      mode: "single",
      atomicNumber: 79,
      energy: 1000,
      projectile: "electron",
      potentialModel: "Hartree-Fock",
      angleStep: 1,
    });
    setCustomCompoundAtoms([
      { element: getElementByZ(1), stoichiometry: 2 },
      { element: getElementByZ(8), stoichiometry: 1 }
    ]);
    setCustomCompoundName("Water");
  };

  // 5. Automated Sequential Batch Processing State
  const [batchStartE, setBatchStartE] = useState<number>(1000);
  const [batchEndE, setBatchEndE] = useState<number>(5000);
  const [batchStepE, setBatchStepE] = useState<number>(1000);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [batchIsRunning, setBatchIsRunning] = useState<boolean>(false);
  const [batchLogs, setBatchLogs] = useState<string[]>([]);

  const runEnergySweepBatch = () => {
    if (batchIsRunning) return;
    setBatchIsRunning(true);
    setBatchProgress(0);
    setBatchLogs(["Initializing ELSEPA Automated Energy Sweep Pipeline...", `Target Model: ${config.mode === "compound" && config.compound ? config.compound.formula : activeElement.name}`]);
    
    const energySteps: number[] = [];
    for (let e = batchStartE; e <= batchEndE; e += batchStepE) {
      energySteps.push(e);
    }

    if (energySteps.length === 0) {
      setBatchLogs(prev => [...prev, "[CRITICAL ERROR] Invalid energy intervals. Zero steps configured."]);
      setBatchIsRunning(false);
      return;
    }

    let idx = 0;
    const executeNextSweepStep = () => {
      if (idx >= energySteps.length) {
        setBatchLogs(prev => [...prev, "[SUCCESS] Interactive Batch Completed. Sequential datasets integrated to Differential scatter graph.", "System state idle."]);
        setBatchProgress(100);
        setBatchIsRunning(false);
        return;
      }

      const currentE = energySteps[idx];
      const prog = Math.round((idx / energySteps.length) * 100);
      setBatchProgress(prog);

      setBatchLogs(prev => [
        ...prev,
        `[JOB ${idx + 1}/${energySteps.length}] Calculating scatter profiles at energy = ${currentE.toLocaleString()} eV...`
      ]);

      setTimeout(() => {
        const sweepConfig: ScatteringConfig = {
          ...config,
          energy: currentE,
          angleStep: 1
        };

        const points = config.mode === "compound" && config.compound 
          ? calculateCompoundScatteringDCS(sweepConfig)
          : calculateScatteringDCS(sweepConfig);

        const sumData = calculateIntegratedCrossSections(points);

        const formulaName = config.mode === "compound" && config.compound ? config.compound.formula : activeElement.symbol;
        const col = batchColors[(batchRuns.length + idx) % batchColors.length];
        
        const runObj: BatchCalculation = {
          id: `sweep-${Math.random().toString(36).substr(2, 9)}`,
          name: `${formulaName} [Sweep E=${currentE} eV]`,
          elementSymbol: formulaName,
          atomicNumber: config.atomicNumber,
          energy: currentE,
          projectile: config.projectile,
          potentialModel: config.potentialModel,
          color: col,
          data: points,
          summary: sumData
        };

        setBatchRuns(prev => {
          if (prev.some(r => r.name === runObj.name)) return prev;
          return [...prev, runObj];
        });

        setBatchLogs(prev => [
          ...prev,
          `  └─► Success! σ_el = ${sumData.sigmaEl.toFixed(5)} Å², σ_tr = ${sumData.sigmaTr.toFixed(5)} Å² saved.`
        ]);

        idx++;
        executeNextSweepStep();
      }, 450);
    };

    executeNextSweepStep();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-2 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center font-sans antialiased">
      {/* 💻 Virtual Desktop Container Framework Layer */}
      <div className="w-full max-w-7xl bg-slate-50 border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-[90vh]">
        
        {/* virtual OS desktop frame header bar decoration */}
        <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 select-none">
          <div className="flex items-center gap-2">
            {/* Retro MAC/Linux Title Action Buttons */}
            <div className="flex gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block border border-red-650 cursor-pointer" title="Close Window" onClick={handleResetParameters}></span>
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block border border-yellow-505 cursor-pointer" title="Minimize GUI"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-emerald-650 cursor-pointer" title="Toggle Fullscreen"></span>
            </div>
            
            <div className="flex items-center gap-2">
              <Atom className="w-4 h-4 text-blue-500 animate-spin" style={{ animationDuration: "14s" }} />
              <span className="text-[11px] font-mono font-semibold text-slate-300">ELSEPA desktop_v4.2.0_run</span>
              <span className="bg-blue-500/20 text-blue-400 text-[8.5px] font-mono px-2 py-0.5 rounded-full border border-blue-500/30 font-bold select-none">
                LOCAL ENGINE
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-[10px] text-slate-500 font-mono">
            <span>● CONNECTED</span>
            <span>ACCELERETOR: COMP_EMU_MATRIX</span>
            <span>SYSTEM_CPU: 1.4%</span>
          </div>
        </div>

        {/* Desktop Application Action Menu bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs text-slate-600 select-none hidden sm:flex">
          <div className="flex items-center gap-5">
            <span className="hover:text-slate-950 cursor-pointer font-medium transition-colors" onClick={handleResetParameters}>File</span>
            <span className="hover:text-slate-950 cursor-pointer font-medium transition-colors" onClick={() => handleToggleMode("compound")}>Multi-Atom Setup</span>
            <span className="hover:text-slate-950 cursor-pointer font-medium transition-colors" onClick={() => handleToggleMode("single")}>Single Element Preset</span>
            <span className="hover:text-slate-950 cursor-pointer font-medium transition-colors" onClick={() => setActiveTab("python")}>Automation Py</span>
            <span className="hover:text-slate-950 cursor-pointer font-medium transition-colors" onClick={() => setActiveTab("report")}>Report Center</span>
            <span className="hover:text-slate-950 cursor-pointer font-medium text-blue-600 transition-colors" onClick={handleResetParameters}>Reset Parameters</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            UTC System Time: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* 🔬 Unified Workspace Body */}
        <div className="bg-slate-50/50 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
          
          {/* LEFT PANEL: INPUT CONTROLS CONSOLE (Z Presets & Molecular constructor & Energy inputs) */}
          <div className="lg:col-span-4 flex flex-col gap-6">

            {/* Target Catalog Selecting & Formula Designer block */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-4">
                <h2 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-blue-500" />
                  1. Target Chemical Medium
                </h2>
                {/* Single / Compound toggles */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-205">
                  <button
                    onClick={() => handleToggleMode("single")}
                    className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                      config.mode !== "compound"
                        ? "bg-white text-blue-650 shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Single
                  </button>
                  <button
                    onClick={() => handleToggleMode("compound")}
                    className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                      config.mode === "compound"
                        ? "bg-white text-blue-650 shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Compound
                  </button>
                </div>
              </div>

              {config.mode !== "compound" ? (
                // SINGLE ELEMENT preset block
                <div>
                  <div className="flex flex-wrap gap-1 mb-4 max-h-[140px] overflow-y-auto pr-1">
                    {ATOMIC_ELEMENTS.slice(0, 16).map((el) => (
                      <button
                        key={el.z}
                        onClick={() => selectElement(el.z)}
                        className={`px-2.5 py-2 rounded-lg border text-xs font-semibold flex flex-col items-center min-w-[42px] transition-all cursor-pointer ${
                          config.atomicNumber === el.z
                            ? "bg-blue-600 border-blue-650 text-white shadow-sm shadow-blue-100 scale-102"
                            : "bg-slate-50/50 border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-[9px] font-bold block opacity-75">{el.z}</span>
                        <span className="text-sm font-bold mt-0.5">{el.symbol}</span>
                      </button>
                    ))}
                  </div>

                  {/* Manual Atomic number selector input */}
                  <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                    <label className="text-xs text-slate-500 font-medium whitespace-nowrap">
                      Atomic Number (Z):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="92"
                      value={config.atomicNumber}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= 92) {
                          setConfig((prev) => ({ ...prev, atomicNumber: val }));
                        }
                      }}
                      className="w-full text-xs font-mono border border-slate-200 outline-hidden hover:border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2.5 py-1.5 bg-white transition-colors animate-pulse"
                    />
                  </div>

                  {/* Selected Preset Info */}
                  <div className="mt-3.5 p-3.5 bg-blue-50/10 rounded-xl flex items-center justify-between text-xs border border-slate-250/15">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Classification</span>
                      <span className="font-semibold text-slate-700">{activeElement.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-405 block text-[9px] uppercase tracking-wider">Atomic Mass</span>
                      <span className="font-mono font-semibold text-slate-700">{activeElement.weight.toFixed(3)} u</span>
                    </div>
                  </div>
                </div>
              ) : (
                // MULTI-ATOM COMPOUND constructor block
                <div className="flex flex-col gap-3">
                  
                  {/* Preset Compound loading bar */}
                  <div className="mb-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 font-semibold">Loaded Formula Presets:</span>
                    <div className="flex flex-wrap gap-1">
                      {COMPOUND_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => handleLoadCompoundPreset(p)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                            config.compound?.name === p.name 
                              ? "bg-emerald-600 border-emerald-650 text-white shadow-xs font-bold" 
                              : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100"
                          }`}
                        >
                          {p.formula}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Molecule Composer */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-205 border-dashed flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1">
                      <Layers className="w-3 h-3 text-blue-500" /> Molecular Compound Editor
                    </span>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10.5px] font-semibold text-slate-500">Compound Name</label>
                      <input
                        type="text"
                        value={customCompoundName}
                        onChange={(e) => {
                          setCustomCompoundName(e.target.value);
                          if (config.compound) {
                            setConfig(p => ({ ...p, compound: { ...p.compound!, name: e.target.value } }));
                          }
                        }}
                        placeholder="e.g. Sodium Chloride"
                        className="text-xs bg-white border border-slate-205 rounded px-2.5 py-1.5 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-12 gap-1.5 items-end mt-1.5">
                      <div className="col-span-6 flex flex-col gap-1">
                        <label className="text-[9.5px] font-bold text-slate-400 uppercase">Chemical Element</label>
                        <select
                          value={selectedBuilderZ}
                          onChange={(e) => setSelectedBuilderZ(parseInt(e.target.value))}
                          className="text-xs bg-white border border-slate-205 rounded px-2 py-1.5"
                        >
                          {ATOMIC_ELEMENTS.slice(0, 40).map((el) => (
                            <option key={el.z} value={el.z}>
                              {el.symbol} - {el.name} (Z={el.z})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3 flex flex-col gap-1">
                        <label className="text-[9.5px] font-bold text-slate-400 uppercase">Multiplier</label>
                        <input
                          type="number"
                          min="1"
                          max="25"
                          value={selectedBuilderStoich}
                          onChange={(e) => setSelectedBuilderStoich(Math.max(1, parseInt(e.target.value) || 1))}
                          className="text-xs bg-white border border-slate-205 rounded px-2 py-1 focus:border-blue-500 text-center font-mono font-bold"
                        />
                      </div>

                      <button
                        onClick={handleAddAtomToCompound}
                        className="col-span-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg cursor-pointer transition-colors text-center"
                      >
                        ✚ Add
                      </button>
                    </div>

                    {/* Active Molecule Atoms review list */}
                    <div className="mt-3 bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[9px] text-slate-400 block pb-1 border-b mb-1 uppercase font-bold">Active Atoms List:</span>
                      
                      {customCompoundAtoms.length === 0 ? (
                        <div className="text-center py-2 text-[10.5px] text-slate-400 italic">No Atoms configured in formula setup.</div>
                      ) : (
                        <div className="flex flex-col gap-1 bg-slate-50 rounded-md p-1.5">
                          {customCompoundAtoms.map((item) => (
                            <div key={item.element.z} className="flex justify-between items-center text-xs p-1 hover:bg-white rounded transition-colors group">
                              <span className="font-semibold text-slate-700">
                                {item.element.name} <code className="bg-slate-200 px-1 py-0.5 rounded leading-none text-blue-700 text-[10px] ml-1">{item.element.symbol}</code>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded font-bold border border-blue-10/20 text-[10.5px]">
                                  Stoich: ×{item.stoichiometry}
                                </span>
                                <button
                                  onClick={() => handleRemoveAtomFromCompound(item.element.z)}
                                  className="text-red-500 hover:text-red-700 flex items-center justify-center text-[10px] cursor-pointer"
                                  title="Delete component"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Energy Input & Physics Options block */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
              <h2 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-500" />
                2. Physics Setup Coordinates
              </h2>

              <div className="flex flex-col gap-5">
                {/* Dynamic eV Kinetic energy coordinates */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500 flex items-center gap-1">
                      Incident Energy (eV):
                      <HelpCircle className="w-3.5 h-3.5 text-slate-404 cursor-help" title="Input the electron collision potential in electronvolts (eV). Adjust manually using the text block or drag the wide-range slider." />
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* slider track */}
                    <input
                      type="range"
                      min="10"
                      max="150000"
                      step="100"
                      value={config.energy}
                      onChange={(e) => setConfig((prev) => ({ ...prev, energy: parseInt(e.target.value) }))}
                      className="flex-1 accent-blue-600 h-1.5 cursor-pointer bg-slate-200 rounded-lg appearance-none"
                    />

                    {/* DIRECT TEXT INPUT AREA requested by the user */}
                    <div className="flex-none">
                      <div className="relative rounded-md shadow-xs">
                        <input
                          type="text"
                          value={energyInputStr}
                          onChange={(e) => handleEnergyInputChange(e.target.value)}
                          className="w-[95px] text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:border-blue-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 text-center transition-colors outline-hidden"
                          title="Type exact eV value here (e.g. 51,600)"
                          placeholder="e.g. 51,600"
                        />
                        <span className="absolute right-1 text-[8.5px] font-bold text-blue-400 bottom-0 pointer-events-none">eV</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>10 eV</span>
                    <span>50 keV</span>
                    <span>150 keV</span>
                  </div>
                </div>

                {/* Projectile & Potential selections */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600">Projectile</label>
                    <select
                      value={config.projectile}
                      onChange={(e) => setConfig((p) => ({ ...p, projectile: e.target.value as "electron" | "positron" }))}
                      className="w-full text-xs font-medium border border-slate-200 outline-hidden hover:border-slate-350 bg-white transition-colors p-2 rounded-lg"
                    >
                      <option value="electron">Electron (e⁻)</option>
                      <option value="positron">Positron (e⁺)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600">Exchange Potential</label>
                    <select
                      value={config.potentialModel}
                      onChange={(e) => setConfig((p) => ({ ...p, potentialModel: e.target.value as any }))}
                      className="w-full text-xs font-medium border border-slate-200 outline-hidden hover:border-slate-350 bg-white transition-colors p-2 rounded-lg"
                    >
                      <option value="Hartree-Fock">Dirac-Hartree-Fock</option>
                      <option value="Thomas-Fermi">Thomas-Fermi</option>
                      <option value="Slater">Slater Model</option>
                    </select>
                  </div>
                </div>

                {/* Reset and Quick Add actions */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={handleAddToBatch}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Overlay Line Graph
                  </button>
                  <button
                    onClick={handleResetParameters}
                    className="p-2 text-slate-401 hover:text-slate-800 hover:bg-slate-150 rounded-lg transition-colors cursor-pointer border border-slate-200 bg-slate-50"
                    title="Reset Physics Configuration"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Overlaid Data Lines Comparison Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  3. Overlaid Profiles ({batchRuns.length})
                </h2>
                {batchRuns.length > 0 && (
                  <button
                    onClick={clearAllBatches}
                    className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {batchRuns.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl leading-normal">
                  Overlay profile comparison queue is empty.
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                    Click "Overlay Line Graph" above or run the parameter batch range sweep.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {batchRuns.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between gap-3 p-2 border border-slate-100 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-none"
                          style={{ backgroundColor: run.color }}
                        ></span>
                        <span className="font-semibold text-slate-700 font-mono text-[11px] truncate">{run.name}</span>
                      </div>

                      <button
                        onClick={() => handleRemoveBatch(run.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                        title="Remove profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: MAIN WORKVIEW BOARDS (Plots, Scripter Wrapper, Reports, Sweep loggers) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Elegant Workspace Filter Tab Menu */}
            <div className="flex items-center bg-slate-150 p-1.5 bg-slate-200/60 border border-slate-300/40 rounded-xl self-start gap-1.5 select-none">
              <button
                onClick={() => setActiveTab("plot")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "plot"
                    ? "bg-white text-blue-650 shadow-sm font-bold border border-slate-200/20"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                Differential Plots
              </button>

              <button
                onClick={() => setActiveTab("python")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "python"
                    ? "bg-white text-blue-650 shadow-sm font-bold border border-slate-200/20"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Python Console Run
              </button>

              <button
                onClick={() => setActiveTab("report")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "report"
                    ? "bg-white text-blue-650 shadow-sm font-bold border border-slate-200/20"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Exportable Report
              </button>
            </div>

            {/* Active Content rendering */}
            <div className="flex-1">
              {activeTab === "plot" && (
                <div className="flex flex-col gap-6">
                  <ScientificPlot
                    activeData={activeData}
                    activeName={config.mode === "compound" && config.compound 
                      ? `${config.compound.name} (${config.compound.formula}) at ${config.energy.toLocaleString()} eV`
                      : `${activeElement.name} (Z=${config.atomicNumber}) at ${config.energy.toLocaleString()} eV`
                    }
                    activeColor="#2563eb"
                    batchRuns={batchRuns}
                    displayMode={batchRuns.length > 0 ? "batch-compare" : "compare-theories"}
                  />
                </div>
              )}

              {activeTab === "python" && <PythonWrapperView config={config} />}

              {activeTab === "report" && (
                <ReportGenerator config={config} summary={activeSummary} data={activeData} />
              )}
            </div>

            {/* ⚙️ AUTOMATED SEQUENTIAL BATCH SWEEPER CONTROL CONSOLE requested by the user */}
            <div className="bg-white rounded-xl border border-slate-205 border-slate-200/90 p-5 shadow-xs">
              <h2 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-500" />
                Pipeline Sequential Parameter Sweep Batcher
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                {/* Range Setup Sidebar instructions */}
                <div className="md:col-span-5 flex flex-col gap-3.5 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Configure Range Sweep</span>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-650">Kinetic Energy Start (eV)</label>
                    <input
                      type="number"
                      min="10"
                      max="100000"
                      value={batchStartE}
                      onChange={(e) => setBatchStartE(Math.max(10, parseInt(e.target.value) || 100))}
                      className="text-xs font-mono bg-white border border-slate-205 rounded px-2.5 py-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-600">End (eV)</label>
                      <input
                        type="number"
                        min="100"
                        max="200000"
                        value={batchEndE}
                        onChange={(e) => setBatchEndE(Math.max(100, parseInt(e.target.value) || 1000))}
                        className="text-xs font-mono bg-white border border-slate-205 rounded px-2 py-1.5"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-600">Increment Step</label>
                      <input
                        type="number"
                        min="50"
                        max="50000"
                        value={batchStepE}
                        onChange={(e) => setBatchStepE(Math.max(50, parseInt(e.target.value) || 500))}
                        className="text-xs font-mono bg-white border border-slate-205 rounded px-2 py-1.5 text-center font-bold text-blue-700"
                      />
                    </div>
                  </div>

                  <button
                    onClick={runEnergySweepBatch}
                    disabled={batchIsRunning}
                    className="w-full mt-2 cursor-pointer text-xs font-bold text-white bg-emerald-650 hover:bg-emerald-700 rounded-lg py-2.5 transition-all text-center flex items-center justify-center gap-1.5 shadow-xs disabled:bg-slate-350 disabled:text-slate-500"
                  >
                    <Play className="w-3.5 h-3.5 text-white" />
                    {batchIsRunning ? "Executing sweep loop..." : "▶ Run Sequential Batch Sweep"}
                  </button>
                </div>

                {/* Progress feedback terminal panel logged dynamically */}
                <div className="md:col-span-7 flex flex-col border border-slate-800 bg-slate-950 rounded-xl overflow-hidden min-h-[180px]">
                  <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-[9.5px] font-mono text-slate-300">Sweep CLI Thread • Output diagnostics</span>
                    <span className="text-[9px] text-slate-400 font-bold">{batchProgress}% COMPLETE</span>
                  </div>

                  {/* Real-time calculated progress bar indicator */}
                  <div className="w-full bg-slate-800 h-1">
                    <div className="bg-emerald-500 h-1 transition-all duration-300" style={{ width: `${batchProgress}%` }}></div>
                  </div>

                  <div className="p-3 font-mono text-[10px] text-emerald-400 leading-relaxed overflow-y-auto flex-1 max-h-[155px]">
                    {batchLogs.length === 0 ? (
                      <span className="text-slate-550 block italic">Batch Compiler Idle. Specify the start, end, and steps limit to begin sequential simulation processing. Saved steps will automatically render overlay lines on the differential cross-section charts.</span>
                    ) : (
                      batchLogs.map((log, idx) => (
                        <div key={idx} className={log.startsWith("[SUCCESS]") ? "text-emerald-300 font-bold" : log.includes("[JOB") ? "text-slate-200" : log.startsWith("[CRITICAL") ? "text-red-400" : "text-emerald-450 opacity-90"}>
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Physicist Advisor Box */}
            <AICoach config={config} summary={activeSummary} data={activeData} />

          </div>

        </div>

        {/* 💻 Virtual OS Desktop bottom tray toolbar design */}
        <footer className="bg-slate-950 border-t border-slate-800 px-6 py-4 mt-auto text-[10.5px] text-slate-405 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-slate-400/90">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>OS ENGINE STATUS: ACCELERATED</span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-500">MAPPED COMPONENT MODEL: INDEPENDENT ATOM SYSTEM (IAA)</span>
          </div>
          <div className="text-slate-500">
            Quantum Elastic Scattering Analyzer • ELSEPA Pro Desktop Tool v4.2
          </div>
        </footer>

      </div>
    </div>
  );
}
