export interface AtomicElement {
  name: string;
  symbol: string;
  z: number;
  weight: number;
  group: string;
  period: number;
  category: string;
}

export interface AtomComposition {
  element: AtomicElement;
  stoichiometry: number;
}

export interface CompoundSetup {
  name: string;
  formula: string;
  atoms: AtomComposition[];
}

export interface ScatteringConfig {
  mode?: "single" | "compound";
  compound?: CompoundSetup;
  atomicNumber: number;
  energy: number; // in eV (10 eV - 1,000,000 eV)
  projectile: "electron" | "positron";
  potentialModel: "Slater" | "Thomas-Fermi" | "Hartree-Fock";
  angleStep: number; // 0.2, 0.5, 1.0, etc.
}

export interface ScatteringResultPoint {
  angle: number; // in degrees, 0 to 180
  dcs: number;   // Screened quantum dcs (cm^2/sr)
  dcsMott: number; // Unscreened relativistic Mott (cm^2/sr)
  dcsRutherford: number; // Screened Rutherford dcs (cm^2/sr)
}

export interface SimulationSummary {
  sigmaEl: number; // Elastic cross-section (A^2 or cm^2)
  sigmaTr: number; // Momentum transfer cross-section (A^2)
  dcsForward: number; // DCS at 0 degrees
  dcsBackward: number; // DCS at 180 degrees
  forwardBackRatio: number; // Forward / Backward anisotropy
}

export interface BatchCalculation {
  id: string;
  name: string;
  elementSymbol: string;
  atomicNumber: number;
  energy: number;
  projectile: "electron" | "positron";
  potentialModel: "Slater" | "Thomas-Fermi" | "Hartree-Fock";
  color: string;
  data: ScatteringResultPoint[];
  summary: SimulationSummary;
}

export interface ImportedReferenceDataset {
  id: string;
  name: string;
  fileName: string;
  color: string;
  points: { angle: number; val: number }[];
  description?: string;
}

