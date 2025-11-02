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

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#eff8fdff',
        font: {
          weight: 'bold' as const, // Use 'as const' for string literals
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#eff8fdff',
        font: {
          weight: 'bold' as const, // Use 'as const' for string literals
        },
      },
    },
  },
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

  const data = {
    labels: validColonists.map(c => c.name),
    datasets: [
      {
        label: 'Mood',
        data: validColonists.map(c => ((c.mood || 0) * 100)),
        backgroundColor: 'rgba(255, 206, 86, 0.8)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    ...chartOptions,
    scales: {
      x: {
        ticks: {
          color: '#eff8fdff',
          font: {
            weight: 'bold' as const, // Use 'as const' for string literals
          },
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Percentage (%)'
        }
      },
    },
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

  return <Doughnut data={data} options={chartOptions} />;
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
          'rgba(17, 212, 43, 0.8)',  // Generated - Green
          'rgba(255, 99, 132, 0.8)',  // Consumed - Red
          'rgba(52, 40, 221, 0.8)',  // Stored - Yellow
        ],
        borderWidth: 1,
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

