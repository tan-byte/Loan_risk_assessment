import { useState } from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import SimulatorPage from "./pages/SimulatorPage";
import AIAssistantPage from "./pages/AIAssistantPage"; // ✅ ADD THIS

function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <div className="bg-gray-100 min-h-screen">
      
      <Navbar setPage={setPage} />

      <div className="p-4 text-red-500">
        Current Page: {page}
      </div>

      {page === "dashboard" && <Dashboard />}
      {page === "simulator" && <SimulatorPage />}

      {/* ✅ ADD THIS BLOCK */}
      {page === "ai" && <AIAssistantPage />}

    </div>
  );
}

export default App;