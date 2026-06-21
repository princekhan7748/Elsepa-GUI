# Desktop Packaging Guide: Creating a Standalone Windows `.exe` Installer

This guide explains how to convert the **ELSEPA Quantum Collision Portal** codebase into a standalone Windows desktop executable (`.exe`) or macOS application (`.app`) using either **Tauri** (recommended for ultra-lightweight builds) or **Electron**.

Since you are running this app in a managed cloud container environment, `.exe` binary compiler actions must be performed on your local computer. 

Below are the 2 fastest ways to package this web app after downloading the project ZIP (via the **Settings** menu in the top right of the editor) or exporting to **GitHub**.

---

## Method 1: Using Tauri (Recommended - Lightweight & Fast)
Tauri uses the system's native webview engine, resulting in an installer that is only **~3-5 MB** in size, with extremely low RAM usage.

### Prerequisites (On your Windows PC)
1. Install **Node.js** (LTS version) from [nodejs.org](https://nodejs.org/).
2. Install **Rust** and Microsoft Visual Studio C++ Build Tools (Tauri's compiler backend) by running this command in PowerShell:
   ```powershell
   winget install Microsoft.RustLang.Rustup
   ```

### Step-by-Step Build Instructions
1. **Unzip the downloaded project folder** and open Windows Terminal or PowerShell inside that folder.
2. Initialize Tauri in the project:
   ```bash
   npm install -D @tauri-apps/cli
   npx tauri init
   ```
   * Tauri will ask you a few questions:
     * **What is your app name?** `ELSEPA Analyzer`
     * **What is your window title?** `ELSEPA Quantum Cross Section Analyzer`
     * **What is the path of your web assets?** `../dist` (relative to the `src-tauri` folder)
     * **What is the dev server URL?** `http://localhost:3000`
     * **What is your frontend build command?** `npm run build`

3. Open the newly created `src-tauri/tauri.conf.json` file on your PC and ensure the following keys are verified:
   ```json
   "build": {
     "distDir": "../dist",
     "devPath": "http://localhost:3000",
     "beforeBuildCommand": "npm run build"
   }
   ```

4. Build your production Windows `.exe` executable:
   ```bash
   npx tauri build
   ```
   * The compiler will compile the Rust backend and wrap your React assets.
   * Once finished, you will find your standalone installer **`.msi`** and standalone **`.exe`** in:
     `src-tauri/target/release/bundle/msi/ELSEPA Analyzer_1.0.0_x64_en-US.msi`

---

## Method 2: Using Electron (Easiest to Setup)
Electron bundles its own Google Chromium browser and Node.js runtime. Setup is nearly zero-configuration, but the final package size is larger (~80-120 MB).

### Step-by-Step Build Instructions
1. Download the ZIP of this project, open your terminal inside it, and install electron packages:
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. Create a new entry point file named `main.js` in the root of the project folder:
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const path = require('path');

   function createWindow() {
     const win = new BrowserWindow({
       width: 1280,
       height: 800,
       title: "ELSEPA Quantum Analyzer",
       webPreferences: {
         nodeIntegration: true,
         contextIsolation: false
       },
       autoHideMenuBar: true
     });

     // Load your built React code index.html
     win.loadFile(path.join(__dirname, 'dist/index.html'));
   }

   app.whenReady().then(() => {
     createWindow();

     app.on('activate', () => {
       if (BrowserWindow.getAllWindows().length === 0) createWindow();
     });
   });

   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') app.quit();
   });
   ```

3. Update your `package.json` to include the electron start script and packaging configuration:
   ```json
   {
     "main": "main.js",
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "electron:start": "npm run build && electron .",
       "electron:pack": "npm run build && electron-builder"
     },
     "build": {
       "appId": "com.elsepa.quantum-analyzer",
       "productName": "ELSEPA Quantum Analyzer",
       "files": [
         "dist/**/*",
         "main.js",
         "package.json"
       ],
       "win": {
         "target": "nsis",
         "requestedExecutionLevel": "asInvoker"
       }
     }
   }
   ```

4. Run this command to build the desktop installer `.exe`:
   ```bash
   npm run electron:pack
   ```
   * Check your local project files—a new `dist/` or `dist-electron/` subfolder will contain your standalone installer: **`ELSEPA Quantum Analyzer Setup.exe`**.

---

### 💡 Why local building is perfect for ELSEPA:
* **True Standalone Capability**: Inside Tauri/Electron, the core web app runs entirely **offline** on the customer's PC with zero external dependencies.
* **Persistent States**: Your customized targets, molecular formulae, and overlaid comparison plots will remain fully preserved because the desktop web wrapper uses the local database engines of the user's OS native client.

---

## 🛠️ Troubleshooting Common Build Errors

### 1. `failed to run 'cargo metadata' command... program not found`
* **What this means**: Tauri is built on Rust (`cargo`), but your Windows operating system cannot find the Rust compiler.
* **How to fix**:
  1. Download and run the official Windows Rust Installer from **[rustup.rs](https://rustup.rs/)**.
  2. Select option **`1`** (Proceed with default installation) of the console launcher.
  3. **CRITICAL STEP**: Close all command prompts, PowerShell windows, or VS Code terminal windows and open a **brand new terminal window**. Windows needs this to register the new `cargo` command in your system parameters path.
  4. Verify it works by running:
     ```powershell
     cargo --version
     ```
  5. Run your build command again:
     ```bash
     npx tauri build
     ```

### 2. `You must change the bundle identifier... default value com.tauri.dev is not allowed`
* **What this means**: Tauri prevents you from compiling a production release if your bundle identifier is the placeholder `com.tauri.dev`. This identifier must be unique to avoid operating system software collisions.
* **How to fix**:
  1. Open the file **`src-tauri/tauri.conf.json`** on your computer.
  2. Search for the word **`"identifier"`** (usually located in the `"tauri" > "bundle"` section of the JSON file).
  3. Replace the default placeholder `"com.tauri.dev"` with your own identifier, such as:
     ```json
     "identifier": "com.elsepa.quantum-analyzer"
     ```
  4. Save the file and run your build command again:
     ```bash
     npx tauri build
     ```

