import React from "react";

const Navbar = ({ setPage }) => {
  return (
    <div className="w-full bg-white border-b shadow-sm px-6 py-3 flex items-center justify-between">

      {/* LOGO */}
      <div className="text-xl font-bold text-blue-600">
        LoanRisk AI
      </div>

      {/* NAV */}
      <div className="flex items-center gap-6 text-sm font-medium text-gray-600">

        <button onClick={() => setPage("dashboard")} className="hover:text-blue-600">
          Dashboard
        </button>

        <button onClick={() => setPage("simulator")} className="hover:text-blue-600">
          Simulator
        </button> 


        {/* ✅ NEW BUTTON */}
        <button onClick={() => setPage("ai")} className="hover:text-blue-600">
          AI Assistant
        </button>

        <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center rounded-full">
          R
        </div>

      </div>
    </div>
  );
};

export default Navbar;