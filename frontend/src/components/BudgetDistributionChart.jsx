import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// Sample budget distribution; replace with backend data when available
const sampleData = {
  labels: ['Rent', 'Groceries', 'Utilities', 'Entertainment'],
  datasets: [
    {
      label: 'Budget Allocation',
      data: [1000, 300, 150, 200],
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
      ],
      borderWidth: 1,
    },
  ],
};

function BudgetDistributionChart({ data = sampleData }) {
  // TODO: Fetch real budget distribution from backend once available
  return <Pie data={data} />;
}

export default BudgetDistributionChart;
