import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function CostOverview({ data = [] }) {
  // Calculate total costs
  const calculateTotalCosts = () => {
    let laborCost = 0;
    let materialCost = 0;
    let deviceCost = 0;
    let overheadCost = 0;

    data.forEach(room => {
      if (room.status === 'active' && room.currentOperation) {
        const op = room.currentOperation;
        laborCost += op.costs?.labor || 0;
        materialCost += op.costs?.materials || 0;
        deviceCost += op.costs?.devices || 0;
        overheadCost += op.costs?.overhead || 0;
      }
    });

    return {
      total: laborCost + materialCost + deviceCost + overheadCost,
      breakdown: [
        { name: 'Personál', value: laborCost, color: '#3b82f6' },
        { name: 'Materiál', value: materialCost, color: '#10b981' },
        { name: 'Přístroje', value: deviceCost, color: '#f59e0b' },
        { name: 'Režie', value: overheadCost, color: '#8b5cf6' }
      ].filter(item => item.value > 0)
    };
  };

  const costs = calculateTotalCosts();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
          <p className="text-lg font-bold" style={{ color: data.payload.color }}>
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {((data.value / costs.total) * 100).toFixed(1)}% z celkových nákladů
          </p>
        </div>
      );
    }
    return null;
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Přehled nákladů</h2>
        <p className="text-sm text-gray-600 mt-1">Aktuální náklady probíhajících operací</p>
      </div>

      {costs.breakdown.length > 0 ? (
        <>
          {/* Total Cost Display */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Celkové náklady dnes</p>
                <p className="text-3xl font-bold text-blue-900">
                  {formatCurrency(costs.total)}
                </p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-blue-600 opacity-50" />
            </div>
          </div>

          {/* Pie Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={costs.breakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {costs.breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Cost Breakdown Legend */}
          <div className="mt-6 space-y-3">
            {costs.breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(item.value)}</p>
                  <p className="text-xs text-gray-500">
                    {((item.value / costs.total) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Average Cost per Hour */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Průměrné náklady na hodinu:</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(costs.total / Math.max(data.filter(r => r.status === 'active').length, 1))}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <CurrencyDollarIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Žádné aktivní operace</p>
          <p className="text-sm text-gray-400 mt-1">Náklady se zobrazí po zahájení operací</p>
        </div>
      )}
    </div>
  );
}
