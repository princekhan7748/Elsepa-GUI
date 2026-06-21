import React, { useState } from "react";
import { ScatteringConfig, SimulationSummary, ScatteringResultPoint } from "../types";
import { Sparkles, Brain, Cpu, MessageSquareCode, ShieldAlert, Loader2, ArrowRight } from "lucide-react";
import { getElementByZ } from "../utils/scattering";

interface AICoachProps {
  config: ScatteringConfig;
  summary: SimulationSummary;
  data: ScatteringResultPoint[];
}

export default function AICoach({ config, summary, data }: AICoachProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [customResponse, setCustomResponse] = useState<string | null>(null);
  const [customLoading, setCustomLoading] = useState(false);

  const element = getElementByZ(config.atomicNumber);

  // Briefly summarize the curve behavior for the prompt context
  const getCurveFeatures = () => {
    const isForwardDominant = summary.forwardBackRatio > 1e4;
    const isWavy = config.atomicNumber > 30 && config.energy < 15000;
    
    let text = "";
    if (isForwardDominant) {
      text += "Ultra-heavy forward peaked behavior typical of high energies. ";
    } else {
      text += "Relatively wide angular distribution with high backscattering ratios. ";
    }
    if (isWavy) {
      text += "Highly oscillatory with noticeable diffraction minima (Ramsauer-Townsend glory scattering resonances).";
    } else {
      text += "Smooth monotonic decline with no significant quantum diffraction ripples.";
    }
    return text;
  };

  const handleFetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          element: config.mode === "compound" && config.compound ? `${config.compound.name} (${config.compound.formula})` : element.name,
          atomicNumber: config.mode === "compound" && config.compound ? "Compound Target (IAA Model)" : element.z.toString(),
          energy: config.energy,
          projectile: config.projectile,
          potentialModel: config.potentialModel,
          dcsSummary: getCurveFeatures(),
          summaryStats: summary,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Server failed to deliver analysis");
      }
      setAnalysis(result.analysis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze cross-sections");
    } finally {
      setLoading(false);
    }
  };

  // Convert basic text headers and lines to beautifully spaced HTML
  const formatAnalysisText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={idx} className="text-sm font-bold text-slate-800 mt-4 mb-2 first:mt-0">
            {trimmed.replace(/###\s*/, "")}
          </h4>
        );
      }
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        return (
          <strong key={idx} className="block text-slate-700 mt-2">
            {trimmed.replace(/\*\*/g, "")}
          </strong>
        );
      }
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-600 mt-1 pl-1">
            {trimmed.replace(/^[-*]\s*/, "")}
          </li>
        );
      }
      if (trimmed) {
        return (
          <p key={idx} className="text-slate-600 leading-relaxed mt-2 text-[12px]">
            {trimmed}
          </p>
        );
      }
      return <div key={idx} className="h-1" />;
    });
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.015)] border border-slate-800 flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-400" />
            AI Scattering Physicist
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gemini-powered quantum collision commentary on active cross-section distributions
          </p>
        </div>
        <Sparkles className="w-5 h-5 text-blue-400 animate-pulse hidden sm:block" />
      </div>

      {/* Main Panel content split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch flex-1">
        {/* Left: General Analyzer Trigger */}
        <div className="flex flex-col justify-between p-5 rounded-xl border border-slate-800 bg-slate-950/50">
          <div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-3">
              INTELLIGENT PROFILE ANALYSIS
            </span>
            <h3 className="text-xs font-bold text-slate-200">
              Automatic Curve Explanation
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
              Triggers the AI core to run quantum-mechanical analysis of your current parameter profile. This explains:
            </p>
            <ul className="text-[11px] text-slate-300 space-y-1.5 mt-3 pl-4 list-disc">
              <li>Angular anisotropy (forward-to-backward peaking physics).</li>
              <li>Wave diffraction resonance structures / critical minima.</li>
              <li>Implications in SEM/TEM and particle diagnostics.</li>
            </ul>
          </div>

          <div className="mt-6">
            <button
              onClick={handleFetchAnalysis}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg font-semibold text-xs text-white transition-all cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-350" />
                  Running Calculations Analysis...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4 text-blue-300" />
                  Analyze Active Profile
                </>
              )}
            </button>
            {error && (
              <div className="mt-3 p-3 bg-red-950/40 border border-red-900/50 rounded-lg flex items-start gap-2 text-red-400 text-xs">
                <ShieldAlert className="w-4 h-4 flex-none mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Results View & Explanations */}
        <div className="flex flex-col bg-slate-950 p-5 rounded-xl border border-slate-800 max-h-[350px] overflow-y-auto">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">
            PHYSICS INTERPRETATION OUTPUT
          </span>

          {analysis ? (
            <div className="flex-1 overflow-auto rounded text-xs pr-1 divide-y divide-slate-900">
              <div className="pb-3 text-emerald-450 text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Quantum Analysis complete for {element.name} ({config.energy} eV)
              </div>
              <div className="pt-2 text-slate-300 leading-loose">
                {formatAnalysisText(analysis)}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <MessageSquareCode className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-xs text-slate-500 font-medium leading-normal">
                No active commentary generated.
              </p>
              <p className="text-[11px] text-slate-600 mt-1 leading-normal max-w-[200px]">
                Click "Analyze Active Profile" to trigger the quantum calculation observer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
