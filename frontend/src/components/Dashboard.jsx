import { useEffect, useState } from "react";
import MetricCard from "./MetricCard";
import LoanChart from "./LoanChart";
import EmploymentChart from "./EmploymentChart";
import CreditChart from "./CreditChart";
import RiskTable from "./RiskTable";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const formatPercent = (value) => {
  if (value === undefined || value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/portfolio_stats`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Unable to fetch portfolio stats.");
        }

        setStats(data);
      } catch (err) {
        setError(err.message || "Unable to load dashboard data.");
      }

      setLoading(false);
    }

    loadStats();
  }, []);

  const defaultByFinancialStress = stats?.default_by_financial_stress || {};
  const defaultByBehaviourRisk = stats?.default_by_behaviour_risk || {};
  const creditScoreBands = stats?.credit_score_bands || {};

  return (
    <div className="p-6">
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Portfolio NPA"
          value={stats ? formatPercent(stats.overall_default_rate) : "..."}
          extra={stats ? `Based on ${stats.total_records.toLocaleString()} loans` : "Loading..."}
        />
        <MetricCard
          label="Portfolio size"
          value={stats ? `${stats.total_records.toLocaleString()} loans` : "..."}
          extra="Training portfolio size"
        />
        <MetricCard
          label="High-risk accounts"
          value={stats ? stats.high_risk_account_count.toLocaleString() : "..."}
          extra={stats ? `Threshold ${stats.high_risk_threshold}` : "Loading..."}
        />
        <MetricCard
          label="Predicted high-risk share"
          value={stats ? formatPercent(stats.predicted_npa) : "..."}
          extra="Model estimate from portfolio"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm mb-3">Default rate by financial stress</h3>
          <LoanChart labels={Object.keys(defaultByFinancialStress)} values={Object.values(defaultByFinancialStress)} />
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm mb-3">Default rate by behaviour risk</h3>
          <EmploymentChart labels={Object.keys(defaultByBehaviourRisk)} values={Object.values(defaultByBehaviourRisk)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm mb-3">Credit score vs default rate</h3>
          <CreditChart labels={Object.keys(creditScoreBands)} values={Object.values(creditScoreBands)} />
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <RiskTable data={stats?.high_risk_segments || []} />
        </div>
      </div>

      {loading && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Loading dashboard values from the backend model.
        </div>
      )}
    </div>
  );
}