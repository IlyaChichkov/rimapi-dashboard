// src/components/RimWorldCharts.tsx
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Colonist, ResourceSummary, CreaturesSummary, PowerInfo } from '../types';


ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const chartColors = {
  // Primary theme colors
  primary: {
    blue: 'rgba(86, 156, 214, 0.8)',     // Soft blue - main theme
    teal: 'rgba(75, 192, 192, 0.8)',      // Teal for positive metrics
    green: 'rgba(102, 187, 106, 0.8)',    // Soft green for good status
    yellow: 'rgba(255, 193, 7, 0.8)',     // Amber yellow for warnings
    orange: 'rgba(255, 149, 0, 0.8)',     // Orange for medium alerts
    red: 'rgba(239, 83, 80, 0.8)',        // Soft red for critical alerts
    purple: 'rgba(171, 71, 188, 0.8)',    // Purple for neutral/misc
  },

  // Alternative shades for variety
  alternative: {
    blue: 'rgba(66, 165, 245, 0.8)',
    green: 'rgba(56, 142, 60, 0.8)',
    orange: 'rgba(245, 124, 0, 0.8)',
    red: 'rgba(229, 57, 53, 0.8)',
    purple: 'rgba(142, 36, 170, 0.8)',
  },

  // Border colors (slightly darker)
  border: {
    blue: 'rgba(86, 156, 214, 1)',
    teal: 'rgba(75, 192, 192, 1)',
    green: 'rgba(102, 187, 106, 1)',
    yellow: 'rgba(255, 193, 7, 1)',
    orange: 'rgba(255, 149, 0, 1)',
    red: 'rgba(239, 83, 80, 1)',
    purple: 'rgba(171, 71, 188, 1)',
  }
};


const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#eff8fdff',
        font: {
          weight: 'bold' as const,
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#eff8fdff',
        font: {
          weight: 'bold' as const,
        },
      },
    },
  },
  // Add these properties
  onResize: (chart: any, size: any) => {
    // Force chart to redraw on resize
    chart.resize();
  },
  animation: {
    duration: 0, // Disable animations for smoother resizing
  },
  // Add transition for smoother resizing
  transitions: {
    active: {
      animation: {
        duration: 0
      }
    }
  }
};



// Chart 1: Colonist Mood and Health
interface ColonistStatsProps {
  colonists: Colonist[];
}

export const ColonistStatsChart: React.FC<ColonistStatsProps> = ({ colonists }) => {
  const validColonists = colonists.filter(col => col && col.name);

  if (validColonists.length === 0) {
    return <div className="no-data">No colonist data available</div>;
  }

  // Helper to determine color based on mood percentage
  const getMoodColor = (moodPercent: number, isBorder: boolean = false) => {
    // Colors (R, G, B)
    const red = '255, 99, 132';     // Critical Break (< 20%)
    const orange = '255, 159, 64';  // Major Break (< 35%)
    const yellow = '255, 205, 86';  // Minor Break (< 50%)
    const green = '75, 192, 192';   // Stable (> 50%)
    const blue = '54, 162, 235';    // Happy (> 80%)

    const opacity = isBorder ? '1' : '0.8';

    if (moodPercent <= 20) return `rgba(${red}, ${opacity})`;
    if (moodPercent <= 35) return `rgba(${orange}, ${opacity})`;
    if (moodPercent <= 50) return `rgba(${yellow}, ${opacity})`;
    if (moodPercent >= 80) return `rgba(${blue}, ${opacity})`;
    return `rgba(${green}, ${opacity})`;
  };

  const moodValues = validColonists.map(c => (c.mood || 0) * 100);

  const data = {
    labels: validColonists.map(c => c.name),
    datasets: [
      {
        label: 'Mood',
        data: moodValues,
        // Map over values to generate an array of colors
        backgroundColor: moodValues.map(mood => getMoodColor(mood, false)),
        borderColor: moodValues.map(mood => getMoodColor(mood, true)),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    ...chartOptions, // Assuming this is imported from somewhere in your project
    scales: {
      x: {
        ticks: {
          color: '#eff8fdff',
          font: {
            weight: 'bold' as const,
          },
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Percentage (%)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
    },
    plugins: {
      legend: {
        display: false // Hide legend since colors vary
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `Mood: ${context.raw.toFixed(1)}%`;
          }
        }
      }
    }
  };

  return <Bar data={data} options={options} />;
};

// Chart 2: Resource Distribution
interface ResourcesChartProps {
  resources: ResourceSummary;
}

export const ResourcesChart: React.FC<ResourcesChartProps> = ({ resources }) => {
  const categories = resources?.categories || [];

  if (categories.length === 0) {
    return <div className="no-data">No resource data available</div>;
  }

  const resourcesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#eff8fdff',
          font: {
            weight: 'bold' as const,
          },
        },
      },
    },
    // Add this to explicitly disable scales
    scales: {
      x: {
        display: false, // Hide x-axis
      },
      y: {
        display: false, // Hide y-axis
      },
    },
  };

  const data = {
    labels: categories.map(c => c.category),
    datasets: [
      {
        label: 'Item Count',
        data: categories.map(c => c.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return <Doughnut data={data} options={resourcesChartOptions} />;
};

// Chart 3: Power Management
interface PowerChartProps {
  power: PowerInfo;
}

export const PowerChart: React.FC<PowerChartProps> = ({ power }) => {
  const data = {
    labels: ['Generated', 'Consumed', 'Stored'],
    datasets: [
      {
        label: 'Power (W)',
        data: [
          power?.current_power || 0,
          power?.total_consumption || 0,
          power?.currently_stored_power || 0
        ],
        backgroundColor: [
          chartColors.primary.green,
          chartColors.primary.red,
          chartColors.primary.blue,
        ],
        borderColor: [
          chartColors.border.green,
          chartColors.border.red,
          chartColors.border.blue,
        ]
      },
    ],
  };

  return <Bar data={data} options={chartOptions} />;
};

// Chart 4: Population Overview
interface PopulationChartProps {
  creatures: CreaturesSummary;
}

export const PopulationChart: React.FC<PopulationChartProps> = ({ creatures }) => {
  const data = {
    labels: ['Colonists', 'Prisoners', 'Enemies'],
    datasets: [
      {
        label: 'Population',
        data: [
          creatures?.colonists_count || 0,
          creatures?.prisoners_count || 0,
          creatures?.enemies_count || 0,
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',    // Colonists - Green
          'rgba(255, 206, 86, 0.8)',    // Prisoners - Yellow
          'rgba(255, 99, 132, 0.8)',    // Enemies - Red
        ],
        borderWidth: 1,
      },
    ],
  };

  return <Bar data={data} options={chartOptions} />;
};

// Simple Skills Chart
interface SkillsChartProps {
  colonists: Colonist[];
}

