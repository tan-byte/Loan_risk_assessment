export default function MetricCard({ label, value, extra }) {
  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </div>

      <div className="text-2xl font-semibold text-gray-800">
        {value}
      </div>

      <div className="text-xs text-gray-500 mt-1">
        {extra}
      </div>

    </div>
  );
}