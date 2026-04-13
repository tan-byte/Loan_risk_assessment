import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

export default function CreditChart() {
  const data = {
    labels: ["300", "500", "650", "750", "850"],
    datasets: [
      {
        label: "Default %",
        data: [18, 12, 7, 3, 1],
        borderColor: "#2563eb",
        backgroundColor: "#93c5fd",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return <Line data={data} />;
}