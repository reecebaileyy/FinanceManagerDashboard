import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Sample monthly spending data; replace with backend data when available
const sampleData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [
    {
      label: 'Spending ($)',
      data: [500, 700, 400, 650, 800],
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
    },
  ],
};

function SpendingTrendsChart({ data = sampleData }) {
  // TODO: Fetch real spending data from backend once available
  return <Bar data={data} />;
}

export default SpendingTrendsChart;
