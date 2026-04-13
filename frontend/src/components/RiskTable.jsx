export default function RiskTable() {
  const data = [
    {
      segment: "MSME · Urban · Self-Employed",
      exposure: "₹1,840 Cr",
      defaultRate: "9.2%",
      risk: "Critical",
    },
    {
      segment: "Personal · Youth · Low income",
      exposure: "₹920 Cr",
      defaultRate: "7.8%",
      risk: "High",
    },
    {
      segment: "Education · Semi-Urban",
      exposure: "₹680 Cr",
      defaultRate: "6.4%",
      risk: "Elevated",
    },
  ];

  const getColor = (risk) => {
    if (risk === "Critical") return "bg-red-200 text-red-700";
    if (risk === "High") return "bg-orange-200 text-orange-700";
    return "bg-yellow-200 text-yellow-700";
  };

  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Highest-risk segments</h3>

      <table className="w-full text-sm">
        <thead className="text-gray-500 text-xs">
          <tr>
            <th className="text-left">Segment</th>
            <th>Exposure</th>
            <th>Default %</th>
            <th>Risk</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t">
              <td className="py-2">{row.segment}</td>
              <td className="text-center">{row.exposure}</td>
              <td className="text-center">{row.defaultRate}</td>
              <td className="text-center">
                <span className={`px-2 py-1 rounded text-xs ${getColor(row.risk)}`}>
                  {row.risk}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}