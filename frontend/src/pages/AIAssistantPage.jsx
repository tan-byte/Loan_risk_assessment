import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function AIAssistantPage() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loanId, setLoanId] = useState("LN0009468"); // editable by banker
  const [chat, setChat] = useState([
    {
      role: "assistant",
      text: "Hello. I'm the IndusCredit AI assistant. I can help you analyse borrower risk, explain model decisions, identify high-risk portfolio segments, and suggest lending policy changes. What would you like to explore?",
    },
  ]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const userMsg = { role: "user", text: message };
    setChat((prev) => [...prev, userMsg]);
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text, loan_id: loanId }),
      });
      const data = await res.json();
      setChat((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (error) {
      setChat((prev) => [
        ...prev,
        { role: "assistant", text: "Error connecting to the backend. Is the Python server running?" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold">IndusCredit AI</h1>
          <p className="text-sm text-gray-500">
            Credit Risk Decision Platform
          </p>

          {/* ✅ ADD THIS HERE */}
          <div className="flex items-center gap-2 mt-3">
            <label className="text-sm text-gray-500">Loan ID</label>
            <input
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-40"
              placeholder="e.g. LN0009468"
            />
          </div>
        </div>

        <div className="text-sm text-green-600">
          ● Model live · AUC 0.847
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: CHAT */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow border p-4 flex flex-col min-h-[500px]">

          {/* CHAT BOX */}
          <div className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-[400px]">
            {chat.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm ${msg.role === "assistant"
                    ? "bg-gray-100"
                    : "bg-blue-600 text-white ml-auto w-fit"
                  }`}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="p-3 rounded-lg text-sm bg-gray-100 text-gray-500 animate-pulse w-fit">
                AI is thinking...
              </div>
            )}
          </div>

          {/* INPUT */}
          <div className="flex gap-2 mt-auto">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about credit risk, SHAP..."
              className="flex-1 border rounded px-3 py-2 text-sm"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 rounded disabled:bg-blue-400"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
        </div>

        {/* RIGHT: SUGGESTIONS & METRICS */}
        <div className="space-y-6">

          {/* SUGGESTED QUERIES */}
          <div className="bg-white p-4 rounded-xl shadow border">
            <h3 className="font-semibold mb-3">Suggested queries</h3>
            <div className="space-y-2 text-sm text-gray-600">
              {[
                "Which segments have highest risk?",
                "How to reduce NPA below 3.5%?",
                "Explain SHAP in simple terms",
                "RBI compliance requirements",
                "Check for fairness & bias",
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => setMessage(q)}
                  className="block w-full text-left hover:text-blue-600"
                >
                  {q} ↗
                </button>
              ))}
            </div>
          </div>

          {/* MODEL METRICS */}
          <div className="bg-white p-4 rounded-xl shadow border">
            <h3 className="font-semibold mb-3">
              Model performance snapshot
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">AUC-ROC</p>
                <p className="font-semibold">0.847</p>
              </div>

              <div>
                <p className="text-gray-500">F1-score</p>
                <p className="font-semibold">0.731</p>
              </div>

              <div>
                <p className="text-gray-500">KS statistic</p>
                <p className="font-semibold">0.512</p>
              </div>

              <div>
                <p className="text-gray-500">AUC-PR</p>
                <p className="font-semibold">0.689</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}