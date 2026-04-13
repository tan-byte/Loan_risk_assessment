import Simulator from "../components/Simulator";

export default function SimulatorPage() {
  return (
    <div className="bg-gray-100">

      <h1 className="text-xl font-semibold mb-4">
        Loan Simulator
      </h1>

      <Simulator />

    </div>
  );
}