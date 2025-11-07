<img src="../media/preview/dashboard.png" width="800">

![RimWorld Dashboard](https://img.shields.io/badge/RimWorld-1.5%20Compatible-blue)
![React](https://img.shields.io/badge/React-18.0+-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-4.0+-3178c6)

# RimWorld Colony Dashboard

A real-time web dashboard for monitoring your RimWorld colony, built with React, TypeScript, and Chart.js. This dashboard connects directly to your RimWorld game via the RIMAPI mod to display live colony statistics and analytics.

## Features

- 📊 **Real-time Colony Monitoring**: Live data from your RimWorld game
- ⚡ **Auto-refresh**: Updates every 5 seconds (configurable)
- 🎨 **Beautiful Visualizations**: Interactive charts for colony metrics
- 💰 **Resource Management**: Monitor inventory and wealth
- ⚡ **Power Grid Status**: Real-time power generation and consumption
- 👥 **Population Overview**: Colonists, prisoners, animals
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile

## Prerequisites

- RimWorld v1.5+
- [RIMAPI Mod](https://github.com/IlyaChichkov/RIMAPI) installed and enabled
- Node.js 16+ and npm

## Getting started

### 1. Install RIMAPI Mod

First, ensure you have the RIMAPI mod installed in your RimWorld game:

1. Download the latest RIMAPI mod from the [**Releases**](https://github.com/IlyaChichkov/RIMAPI/releases) page or [**Steam workshop page**](https://steamcommunity.com/sharedfiles/filedetails/?id=3593423732)
2. Extract to your RimWorld Mods folder (if loaded from Github)
3. Enable the mod in RimWorld's Mod configuration
4. Start your RimWorld game

### 2. Run the Dashboard

#### 2.1. Using the Web Version

Visit: [RimWorld-Dashboard](https://ilyachichkov.github.io/rimapi-dashboard/)

Enter your RIMAPI server URL (default http://localhost:8765/api/v1)

Click "Connect"

#### 2.2. Locally

```bash
# Clone the repository
git clone https://github.com/your-username/rimworld-dashboard.git
cd rimworld-dashboard

# Install dependencies
npm install

# Start the development server
npm start
```

The dashboard will open at `http://localhost:3000`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues:

1. Check the [RIMAPI documentation](https://github.com/IlyaChichkov/RIMAPI/blob/main/Docs/API.md)
2. Open an issue on GitHub

---

**Note**: This is a fan-made project and is not officially affiliated with Ludeon Studios. RimWorld is a trademark of Ludeon Studios.