import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function EmploymentChart({ labels = [], values = [] }) {
  const data = {
    labels,
    datasets: [
      {
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

  return <Bar data={data} />;
}