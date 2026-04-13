import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function LoanChart({ labels = [], values = [] }) {
  const data = {
    labels,
    datasets: [
      {
        label: "Default %",
        data: values,
        backgroundColor: values.map((value) => {
          if (value >= 0.33) return "#ef4444";
          if (value >= 0.28) return "#f59e0b";
          return "#22c55e";
        }),
        borderRadius: 8,
      },
    ],
  };

  const options = {
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => `${value * 100}%`,
        },
      },
    },
  };

  return <Bar data={data} options={options} />;
}