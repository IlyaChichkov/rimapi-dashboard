
![RimWorld Dashboard](https://img.shields.io/badge/RimWorld-1.4%20Compatible-blue)
![React](https://img.shields.io/badge/React-18.0+-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-4.0+-3178c6)

# RimWorld Colony Dashboard

A real-time web dashboard for monitoring your RimWorld colony, built with React, TypeScript, and Chart.js. This dashboard connects directly to your RimWorld game via the RIMAPI mod to display live colony statistics and analytics.

## Features

- 📊 **Real-time Colony Monitoring**: Live data from your RimWorld game
- ⚡ **Auto-refresh**: Updates every 5 seconds (configurable)
- 🎨 **Beautiful Visualizations**: Interactive charts for colony metrics
- 🏥 **Colonist Health & Mood**: Track individual colonist well-being
- 💰 **Resource Management**: Monitor inventory and wealth
- ⚡ **Power Grid Status**: Real-time power generation and consumption
- 👥 **Population Overview**: Colonists, prisoners, animals, and threats
- 🎯 **Skills Analysis**: View colonist skill distributions
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile

## Prerequisites

- [RimWorld](https://store.steampowered.com/app/294100/RimWorld/) (v1.4+)
- [RIMAPI Mod](https://github.com/your-username/rimapi-mod) installed and enabled
- Node.js 16+ and npm

## Installation

### 1. Install RIMAPI Mod

First, ensure you have the RIMAPI mod installed in your RimWorld game:

1. Download the latest RIMAPI mod from the [Releases page](https://github.com/your-username/rimapi-mod/releases)
2. Extract to your RimWorld Mods folder
3. Enable the mod in RimWorld's Mod configuration
4. Start your RimWorld game

### 2. Setup the Dashboard

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

## Configuration

### API Connection

The dashboard automatically connects to the RIMAPI server running on:
```
http://localhost:8765/api/v1/
```

If you need to change the API endpoint, modify `API_BASE_URL` in:
```typescript
// src/services/rimworldApi.ts
const API_BASE_URL = 'http://localhost:8765/api/v1';
```

### Auto-refresh Settings

To modify the auto-refresh interval, update the interval in:
```typescript
// src/components/RimWorldDashboard.tsx
useEffect(() => {
  if (!autoRefresh) return;
  
  const intervalId = setInterval(() => {
    loadData();
  }, 5000); // Change this value (milliseconds)
  
  return () => clearInterval(intervalId);
}, [autoRefresh, loadData]);
```

## Dashboard Sections

### 1. Colony Header
- Current game date and time
- Weather conditions and temperature
- Storyteller and difficulty
- Last data update timestamp

### 2. Colonist Health & Mood
- Bar chart showing health and mood percentages for each colonist
- Color-coded indicators for critical levels

### 3. Resource Distribution
- Doughnut chart showing item distribution by category
- Total item count and market value

### 4. Power Management
- Power generation vs consumption
- Battery storage levels
- Net power calculation

### 5. Population Overview
- Counts of colonists, prisoners, enemies, and animals
- Threat level indicators

### 6. Skills Overview
- Average skill levels across colonists
- Top skills visualization

## RIMAPI Integration

This dashboard uses the [RIMAPI mod](https://github.com/your-username/rimapi-mod) which provides:

### Required Endpoints:
- `/api/v1/game/state` - Game time, weather, storyteller
- `/api/v1/colonists` - Colonist information and stats
- `/api/v1/resources/summary` - Inventory and wealth
- `/api/v1/map/creatures/summary` - Population counts
- `/api/v1/map/power/info` - Power grid status

### API Features:
- **Real-time updates** via Server-Sent Events
- **ETag caching** for efficient data transfer
- **Field filtering** to request only needed data
- **Extension support** for other mods

## Troubleshooting

### Common Issues

1. **"Connection Issue" Error**
   - Ensure RimWorld is running with RIMAPI mod enabled
   - Check that the API server is accessible at `http://localhost:8765`
   - Verify mod is properly installed and activated

2. **No Data Displayed**
   - The dashboard falls back to mock data if API is unavailable
   - Check browser console for connection errors
   - Ensure no firewall is blocking the connection

3. **Charts Not Updating**
   - Verify auto-refresh is enabled (green indicator)
   - Check that game time is advancing in RimWorld
   - Monitor network tab for API requests

### Development

```bash
# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Charts**: Chart.js + react-chartjs-2
- **Styling**: CSS3 with glass morphism effects
- **API**: RIMAPI REST endpoints
- **Build Tool**: Create React App

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [RimWorld](https://rimworldgame.com/) by Ludeon Studios for the amazing game
- [RIMAPI Mod](https://github.com/your-username/rimapi-mod) developers for the API integration
- Chart.js for beautiful data visualizations

## Support

If you encounter any issues:

1. Check the [RIMAPI documentation](https://github.com/your-username/rimapi-mod/wiki)
2. Open an issue on GitHub
3. Join our [Discord community](https://discord.gg/your-discord-link)

---

**Note**: This is a fan-made project and is not officially affiliated with Ludeon Studios. RimWorld is a trademark of Ludeon Studios.