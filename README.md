<div align="center">
<img src="../media/preview/dashboard.png" alt="RimWorld Dashboard Preview" width="800">

![RimWorld Dashboard](https://img.shields.io/badge/RimWorld-1.5%20Compatible-blue)
![React](https://img.shields.io/badge/React-18.0+-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-4.0+-3178c6)

<br />

</div>

# RimWorld Colony Dashboard

A highly customizable, real-time web dashboard for monitoring your RimWorld colony. Built with React and TypeScript, this application connects directly to your running game via the RIMAPI mod, transforming raw game data into a modern, interactive command center.

## Key Features

### Customizable Interface

* **Drag & Drop Grid:** Fully flexible layout engine. Resize, move, and arrange widgets exactly how you want them.
* **Widget Library:** Add charts for Mood, Health, Wealth, Power, Weather, Faction Relations, and Message Logs.
* **Save & Load Presets:** Save your favorite layouts, switch between them instantly, or export/import them to share with others.
* **Theming:** Glassmorphism UI with customizable background images and blur intensity.

### Deep Analytics

* **Colonist Insights:** Detailed breakdown of colonist needs, mood trends, and health conditions.
* **Medical Center:** Triage view showing bleeding rates, immunity progress, and urgent health alerts.
* **Economy & Resources:** Real-time inventory tracking and wealth distribution charts.
* **Research Tree:** Monitor current research progress and queue status.
* **Power Grid:** Visualize power generation vs. consumption and battery storage levels.

### Technical

* **Auto-Refresh:** Configurable polling interval (default 5s) for near real-time updates.
* **Responsive:** optimized for desktop multi-monitor setups but functional on tablets.
* **Zero-Config option:** Works out of the box with the default RIMAPI settings.

## Prerequisites

1. **RimWorld** (v1.5+ recommended)
2. **[RIMAPI Mod](https://github.com/IlyaChichkov/RIMAPI)** installed and active.

## Getting Started

### 1. Install the Mod

To expose your game data, you must install the API mod:

1. Download the latest release from the **[RIMAPI GitHub Releases](https://github.com/IlyaChichkov/RIMAPI/releases)** or subscribe via **[Steam Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=3593423732)**.
2. Enable the mod in your RimWorld mod list.
3. Load your save file. The API server starts automatically on port `8765`.

### 2. Connect the Dashboard

#### Option A: Web Version (Recommended)

No installation required.

1. Open the **[RimWorld Dashboard](https://ilyachichkov.github.io/rimapi-dashboard/)**.
2. Click **Connect** (Default URL: `http://localhost:8765/api/v1`).

#### Option B: Run Locally

If you prefer hosting it yourself or want to contribute:

```bash
# Clone the repository
git clone https://github.com/your-username/rimworld-dashboard.git
cd rimworld-dashboard

# Install dependencies
npm install

# Start the application
npm start

```

The dashboard will open at `http://localhost:3000`.

## Community & Support

* **Issues:** If you find a bug, please [open an issue](https://www.google.com/search?q=https://github.com/your-username/rimworld-dashboard/issues).
* **Discord:** Join our community for help and discussion: **[Join Discord](https://discord.gg/Css9b9BgnM)**
* **API Docs:** Read the [RIMAPI Documentation](https://github.com/IlyaChichkov/RIMAPI/blob/main/Docs/API.md) for technical details.

## License

This project is open-source and licensed under the [MIT License](https://www.google.com/search?q=LICENSE).

---

*Disclaimer: This is a fan-made project and is not affiliated with Ludeon Studios. RimWorld is a trademark of Ludeon Studios.*

---
