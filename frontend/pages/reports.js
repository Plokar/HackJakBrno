import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRole } from '../lib/RoleContext';
import { api } from '../lib/api';

export default function ReportsPage() {
  const { currentRole } = useRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  
  // Chart type states for each graph
  const [roomUtilizationChartType, setRoomUtilizationChartType] = useState('bar');
  const [operationTypesChartType, setOperationTypesChartType] = useState('pie');
  const [operationsByStatusChartType, setOperationsByStatusChartType] = useState('bar');
  const [operationsTimelineChartType, setOperationsTimelineChartType] = useState('line');
  
  // Data states
  const [roomUtilization, setRoomUtilization] = useState([]);
  const [operationTypes, setOperationTypes] = useState([]);
  const [operationsByStatus, setOperationsByStatus] = useState([]);
  const [operationsTimeline, setOperationsTimeline] = useState([]);
  const [doctorsPerformance, setDoctorsPerformance] = useState([]);

  useEffect(() => {
    fetchAllReports();
  }, [selectedPeriod]);

  const fetchAllReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const [utilization, types, status, timeline, doctors] = await Promise.all([
        fetch(`/api/proxy/medic/dashboard/analytics/room-utilization/?days=${selectedPeriod}`).then(r => r.json()),
        fetch(`/api/proxy/medic/dashboard/analytics/operation-types/?days=${selectedPeriod}`).then(r => r.json()),
        fetch(`/api/proxy/medic/dashboard/analytics/operations-by-status/?days=${selectedPeriod}`).then(r => r.json()),
        fetch(`/api/proxy/medic/dashboard/analytics/operations-timeline/?days=${selectedPeriod}`).then(r => r.json()),
        fetch(`/api/proxy/medic/dashboard/analytics/doctors-performance/?days=${selectedPeriod}`).then(r => r.json())
      ]);
      
      setRoomUtilization(utilization);
      setOperationTypes(types);
      setOperationsByStatus(status);
      setOperationsTimeline(timeline);
      setDoctorsPerformance(doctors);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Nepodařilo se načíst data pro reporty');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#E00034] mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Načítám reporty...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Reporty - Medic Hub</title>
      </Head>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Reporty a analytika</h1>
          
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Období:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
              className="px-4 py-2 border-2 border-[#E00034] rounded-lg focus:ring-2 focus:ring-[#E00034] focus:outline-none"
            >
              <option value={7}>7 dní</option>
              <option value={30}>30 dní</option>
              <option value={90}>90 dní</option>
              <option value={180}>180 dní</option>
              <option value={365}>1 rok</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vytížení sálů */}
          <ReportCard 
            title="Vytížení sálů" 
            subtitle={`Za posledních ${selectedPeriod} dní`}
            chartType={roomUtilizationChartType}
            onChartTypeChange={setRoomUtilizationChartType}
            showChartTypeSelector={true}
          >
            {roomUtilizationChartType === 'bar' && (
              <BarChart
                data={roomUtilization}
                xKey="room_name"
                yKey="utilization_percent"
                label="Využití (%)"
                color="#E00034"
              />
            )}
            {roomUtilizationChartType === 'pie' && (
              <PieChart
                data={roomUtilization}
                labelKey="room_name"
                valueKey="utilization_percent"
                color="#E00034"
              />
            )}
            {roomUtilizationChartType === 'line' && (
              <LineChart
                data={roomUtilization}
                xKey="room_name"
                yKey="utilization_percent"
                label="Využití (%)"
                color="#E00034"
              />
            )}
          </ReportCard>

          {/* Typy operací */}
          <ReportCard 
            title="Typy operací" 
            subtitle={`Za posledních ${selectedPeriod} dní`}
            chartType={operationTypesChartType}
            onChartTypeChange={setOperationTypesChartType}
            showChartTypeSelector={true}
          >
            {operationTypesChartType === 'bar' && (
              <BarChart
                data={operationTypes}
                xKey="type"
                yKey="count"
                label="Počet operací"
                color="#6D1F27"
              />
            )}
            {operationTypesChartType === 'pie' && (
              <PieChart
                data={operationTypes}
                labelKey="type"
                valueKey="count"
                color="#6D1F27"
              />
            )}
            {operationTypesChartType === 'line' && (
              <LineChart
                data={operationTypes}
                xKey="type"
                yKey="count"
                label="Počet operací"
                color="#6D1F27"
              />
            )}
          </ReportCard>

          {/* Operace podle statusu */}
          <ReportCard 
            title="Operace podle statusu" 
            subtitle={`Za posledních ${selectedPeriod} dní`}
            chartType={operationsByStatusChartType}
            onChartTypeChange={setOperationsByStatusChartType}
            showChartTypeSelector={true}
          >
            {operationsByStatusChartType === 'bar' && (
              <BarChart
                data={operationsByStatus}
                xKey="label"
                yKey="count"
                label="Počet operací"
                color="#E00034"
              />
            )}
            {operationsByStatusChartType === 'pie' && (
              <PieChart
                data={operationsByStatus}
                labelKey="label"
                valueKey="count"
                color="#E00034"
              />
            )}
            {operationsByStatusChartType === 'line' && (
              <LineChart
                data={operationsByStatus}
                xKey="label"
                yKey="count"
                label="Počet operací"
                color="#E00034"
              />
            )}
          </ReportCard>

          {/* Časová osa operací */}
          <ReportCard 
            title="Časová osa operací" 
            subtitle={`Za posledních ${selectedPeriod} dní`}
            chartType={operationsTimelineChartType}
            onChartTypeChange={setOperationsTimelineChartType}
            showChartTypeSelector={true}
          >
            {operationsTimelineChartType === 'line' && (
              <LineChart
                data={operationsTimeline}
                xKey="date"
                yKey="total"
                label="Počet operací"
                color="#E00034"
              />
            )}
            {operationsTimelineChartType === 'bar' && (
              <BarChart
                data={operationsTimeline}
                xKey="date"
                yKey="total"
                label="Počet operací"
                color="#E00034"
              />
            )}
          </ReportCard>

          {/* Výkonnost doktorů */}
          <ReportCard title="Výkonnost doktorů" subtitle={`Top 10 za posledních ${selectedPeriod} dní`} fullWidth>
            <DoctorsTable data={doctorsPerformance?.slice(0, 10) || []} />
          </ReportCard>
        </div>
      </div>
    </>
  );
}

// Komponenta pro report karty
function ReportCard({ title, subtitle, children, fullWidth = false, chartType, onChartTypeChange, showChartTypeSelector = false }) {
  const chartTypes = [
    { value: 'bar', label: 'Sloupcový', icon: '📊' },
    { value: 'pie', label: 'Koláčový', icon: '🥧' },
    { value: 'line', label: 'Liniový', icon: '📈' }
  ];

  // Filter chart types based on what makes sense for the data
  const availableTypes = showChartTypeSelector 
    ? (title === 'Časová osa operací' 
        ? chartTypes.filter(t => ['line', 'bar'].includes(t.value))
        : chartTypes.filter(t => ['bar', 'pie', 'line'].includes(t.value)))
    : [];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {showChartTypeSelector && availableTypes.length > 0 && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {availableTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => onChartTypeChange(type.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  chartType === type.value
                    ? 'bg-[#E00034] text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                title={type.label}
              >
                <span className="mr-1">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// Sloupcový graf
function BarChart({ data, xKey, yKey, label, color = '#E00034' }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">Žádná data k zobrazení</p>;
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0));
  const chartHeight = 300;
  const barWidth = Math.max(30, (600 / data.length) - 10);

  return (
    <div className="w-full">
      <svg width="100%" height={chartHeight + 50} viewBox={`0 0 600 ${chartHeight + 50}`}>
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = maxValue * ratio;
          const y = chartHeight - (chartHeight * ratio) + 20;
          return (
            <g key={ratio}>
              <line x1="50" y1={y} x2="550" y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x="45" y={y + 5} textAnchor="end" fontSize="12" fill="#6b7280">
                {value.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const value = item[yKey] || 0;
          const height = (value / maxValue) * chartHeight;
          const x = 60 + index * (barWidth + 10);
          const y = chartHeight - height + 20;
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                fill={color}
                opacity="0.8"
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize="11"
                fill="#374151"
                fontWeight="bold"
              >
                {value.toFixed(1)}
              </text>
              <text
                x={x + barWidth / 2}
                y={chartHeight + 35}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
                transform={`rotate(-45 ${x + barWidth / 2} ${chartHeight + 35})`}
              >
                {String(item[xKey]).substring(0, 15)}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line x1="50" y1={chartHeight + 20} x2="550" y2={chartHeight + 20} stroke="#374151" strokeWidth="2" />
      </svg>
    </div>
  );
}

// Koláčový graf
function PieChart({ data, labelKey, valueKey, color = '#6D1F27' }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">Žádná data k zobrazení</p>;
  }

  const total = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
  const colors = ['#E00034', '#6D1F27', '#C21533', '#8f0f26', '#A11D30', '#dc2626', '#991b1b'];
  
  let currentAngle = -90;
  const radius = 100;
  const centerX = 150;
  const centerY = 150;

  return (
    <div className="w-full flex items-center justify-center">
      <svg width="300" height="300" viewBox="0 0 300 300">
        {data.map((item, index) => {
          const value = item[valueKey] || 0;
          const percentage = (value / total) * 100;
          const angle = (value / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          
          const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
          const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
          const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
          const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');

          currentAngle += angle;

          return (
            <g key={index}>
              <path
                d={pathData}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
      
      <div className="ml-8 space-y-2">
        {data.map((item, index) => {
          const value = item[valueKey] || 0;
          const percentage = ((value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm text-gray-700">
                {String(item[labelKey]).substring(0, 30)}: {value} ({percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Liniový graf
function LineChart({ data, xKey, yKey, label, color = '#E00034' }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">Žádná data k zobrazení</p>;
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0));
  const chartHeight = 250;
  const chartWidth = 550;
  const padding = 50;

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - ((item[yKey] || 0) / maxValue) * (chartHeight - 2 * padding);
    return { x, y, value: item[yKey] || 0, date: item[xKey] };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full">
      <svg width="100%" height={chartHeight + 50} viewBox={`0 0 600 ${chartHeight + 50}`}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartHeight - padding - (chartHeight - 2 * padding) * ratio;
          return (
            <line key={ratio} x1={padding} y1={y} x2={chartWidth} y2={y} stroke="#e5e7eb" strokeWidth="1" />
          );
        })}

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="3"
        />

        {/* Points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r="4" fill={color} />
            {index % Math.ceil(data.length / 10) === 0 && (
              <text
                x={point.x}
                y={chartHeight + 15}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
                transform={`rotate(-45 ${point.x} ${chartHeight + 15})`}
              >
                {new Date(point.date).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })}
              </text>
            )}
          </g>
        ))}

        {/* Y-axis */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
      </svg>
    </div>
  );
}

// Bodový graf (Scatter Chart)
function ScatterChart({ data, xKey, yKey, label, color = '#E00034' }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">Žádná data k zobrazení</p>;
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0));
  const chartHeight = 300;
  const chartWidth = 550;
  const padding = 60;

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - ((item[yKey] || 0) / maxValue) * (chartHeight - 2 * padding);
    return { x, y, value: item[yKey] || 0, label: String(item[xKey]).substring(0, 15) };
  });

  return (
    <div className="w-full">
      <svg width="100%" height={chartHeight + 50} viewBox={`0 0 600 ${chartHeight + 50}`}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = maxValue * ratio;
          const y = chartHeight - padding - (chartHeight - 2 * padding) * ratio;
          return (
            <g key={ratio}>
              <line x1={padding} y1={y} x2={chartWidth} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={padding - 10} y={y + 5} textAnchor="end" fontSize="12" fill="#6b7280">
                {value.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill={color}
              opacity="0.7"
              stroke="white"
              strokeWidth="2"
            />
            <text
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#374151"
              fontWeight="bold"
            >
              {point.value.toFixed(1)}
            </text>
            {index % Math.ceil(data.length / 8) === 0 && (
              <text
                x={point.x}
                y={chartHeight + 15}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
                transform={`rotate(-45 ${point.x} ${chartHeight + 15})`}
              >
                {point.label}
              </text>
            )}
          </g>
        ))}

        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
      </svg>
    </div>
  );
}

// Tabulka doktorů
function DoctorsTable({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">Žádná data k zobrazení</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Doktor
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Celkem operací
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dokončeno
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Celkem hodin
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Prům. délka
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((doctor, index) => (
            <tr key={doctor.doctor_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {doctor.doctor_name}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {doctor.total_operations}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {doctor.completed_operations}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {doctor.total_hours.toFixed(1)} h
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {doctor.avg_duration.toFixed(1)} h
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

