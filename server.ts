import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environmental variable is missing");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API: Analyze scattering profile
app.post("/api/analyze", async (req, res) => {
  try {
    const { element, atomicNumber, energy, projectile, potentialModel, dcsSummary, summaryStats } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY via the Secrets panel."
      });
    }

    const ai = getGeminiClient();

    const prompt = `You are an expert Quantum Collision Physicist specializing in ELSEPA (Elastic Scattering of Electrons and Positrons by Atoms) calculations.
Analyze the following atomic scattering setup and cross-section summary to provide scientific insights on the physical features of the scattering curves:

### Physics Setup
- Target Element: ${element} (Z = ${atomicNumber})
- Projectile Type: ${projectile}
- Kinetic Energy: ${energy} eV
- Potential Model: ${potentialModel}

### Calculated Cross-Section Integrals
- Elastic Cross-Section (\u03c3_el): ${summaryStats.sigmaEl.toFixed(4)} \u00c5\u00b2
- Momentum Transfer Cross-Section (\u03c3_tr): ${summaryStats.sigmaTr.toFixed(4)} \u00c5\u00b2
- Ratio (\u03c3_tr / \u03c3_el): ${(summaryStats.sigmaTr / summaryStats.sigmaEl).toFixed(4)}

### Key Differential Cross-Section (DCS) Features
- Forward Scattering (at 0 degrees): ${summaryStats.dcsForward.toExponential(4)} cm\u00b2/sr
- Backward Scattering (at 180 degrees): ${summaryStats.dcsBackward.toExponential(4)} cm\u00b2/sr
- Forward-to-Backward Ratio (Anisotropy): ${summaryStats.forwardBackRatio.toExponential(4)}
- Physical notes of the DSC curve shape: ${dcsSummary}

Provide a concise, professional scientific commentary (3 short paragraphs) explaining:
1. The physical interpretation of the Forward-to-Backward scattering ratio (anisotropy) at this energy level (e.g. forward-peaking due to screening).
2. The existence and physical mechanism behind details like diffraction oscillations (diffraction minima/maxima) or lack thereof for this combination of atomic number and energy (referencing the Coulomb screening or partial-wave phase shift interference).
3. Practical implications in electron microscopy (SEM/TEM), radiation therapy, or material physics for this cross-section.

Write in a clear, authoritative, yet supportive academic style. Avoid talking about code or JSON. Strictly focus on the physical collision physics.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("AI analysis failure:", error);
    res.status(500).json({ error: error.message || "Failed to perform AI analysis" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
