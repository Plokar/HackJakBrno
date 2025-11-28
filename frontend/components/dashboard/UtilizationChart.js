import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function UtilizationChart({ data = [] }) {
  // Transform room data for chart
  const chartData = data.map(room => ({
    name: room.name.replace('Operační sál ', 'Sál '),
    využití: room.utilization || 0,
    cíl: 85, // Target utilization
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getBarColor = (value) => {
    if (value >= 85) return '#16a34a'; // green
    if (value >= 60) return '#eab308'; // yellow
    return '#dc2626'; // red
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Vytížení operačních sálů</h2>
        <p className="text-sm text-gray-600 mt-1">Porovnání aktuálního vytížení s cílovým (85%)</p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{ value: 'Využití (%)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar 
            dataKey="využití" 
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
            name="Aktuální využití"
          />
          <Bar 
            dataKey="cíl" 
            fill="#9ca3af" 
            radius={[8, 8, 0, 0]}
            name="Cílové využití"
            fillOpacity={0.3}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {data.filter(r => r.utilization >= 85).length}
          </p>
          <p className="text-xs text-gray-600 mt-1">Nad cílem (≥85%)</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {data.filter(r => r.utilization >= 60 && r.utilization < 85).length}
          </p>
          <p className="text-xs text-gray-600 mt-1">Středně (60-85%)</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">
            {data.filter(r => r.utilization < 60).length}
          </p>
          <p className="text-xs text-gray-600 mt-1">Pod cílem (&lt;60%)</p>
        </div>
      </div>
    </div>
  );
}
