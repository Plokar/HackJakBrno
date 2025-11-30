import { useState, useEffect, Fragment } from 'react';
import Head from 'next/head';
import { Dialog, Transition } from '@headlessui/react';
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
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    fetchAllReports();
  }, [selectedPeriod]);

  // Update modalData when chart types change
  useEffect(() => {
    if (modalOpen) {
      setModalData(prev => {
        if (!prev) return null;
        if (prev.title === 'Vytížení sálů') {
          return { ...prev, chartType: roomUtilizationChartType, data: roomUtilization };
        } else if (prev.title === 'Typy operací') {
          return { ...prev, chartType: operationTypesChartType, data: operationTypes };
        } else if (prev.title === 'Operace podle statusu') {
          return { ...prev, chartType: operationsByStatusChartType, data: operationsByStatus };
        } else if (prev.title === 'Časová osa operací') {
          return { ...prev, chartType: operationsTimelineChartType, data: operationsTimeline };
        }
        return prev;
      });
    }
  }, [roomUtilizationChartType, operationTypesChartType, operationsByStatusChartType, operationsTimelineChartType, roomUtilization, operationTypes, operationsByStatus, operationsTimeline, modalOpen]);

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
      
      // Transform room names from "Operační sál (number)" to "Sál (number)"
      const transformedUtilization = utilization.map(room => ({
        ...room,
        room_name: room.room_name ? room.room_name.replace(/Operační sál\s*/i, 'Sál ') : room.room_name
      }));
      
      setRoomUtilization(transformedUtilization);
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
            onClick={() => {
              const handleChartTypeChange = (newType) => {
                setRoomUtilizationChartType(newType);
                setModalData(prev => {
                  if (prev && prev.title === 'Vytížení sálů') {
                    return { ...prev, chartType: newType };
                  }
                  return prev;
                });
              };
              setModalData({
                title: 'Vytížení sálů',
                subtitle: `Za posledních ${selectedPeriod} dní`,
                data: roomUtilization,
                chartType: roomUtilizationChartType,
                onChartTypeChange: handleChartTypeChange,
                xKey: 'room_name',
                yKey: 'utilization_percent',
                label: 'Využití (%)',
                color: '#E00034'
              });
              setModalOpen(true);
            }}
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
            onClick={() => {
              const handleChartTypeChange = (newType) => {
                setOperationTypesChartType(newType);
                setModalData(prev => {
                  if (prev && prev.title === 'Typy operací') {
                    return { ...prev, chartType: newType };
                  }
                  return prev;
                });
              };
              setModalData({
                title: 'Typy operací',
                subtitle: `Za posledních ${selectedPeriod} dní`,
                data: operationTypes,
                chartType: operationTypesChartType,
                onChartTypeChange: handleChartTypeChange,
                xKey: 'type',
                yKey: 'count',
                label: 'Počet operací',
                color: '#6D1F27'
              });
              setModalOpen(true);
            }}
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
            onClick={() => {
              const handleChartTypeChange = (newType) => {
                setOperationsByStatusChartType(newType);
                setModalData(prev => {
                  if (prev && prev.title === 'Operace podle statusu') {
                    return { ...prev, chartType: newType };
                  }
                  return prev;
                });
              };
              setModalData({
                title: 'Operace podle statusu',
                subtitle: `Za posledních ${selectedPeriod} dní`,
                data: operationsByStatus,
                chartType: operationsByStatusChartType,
                onChartTypeChange: handleChartTypeChange,
                xKey: 'label',
                yKey: 'count',
                label: 'Počet operací',
                color: '#E00034'
              });
              setModalOpen(true);
            }}
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
            onClick={() => {
              const handleChartTypeChange = (newType) => {
                setOperationsTimelineChartType(newType);
                setModalData(prev => {
                  if (prev && prev.title === 'Časová osa operací') {
                    return { ...prev, chartType: newType };
                  }
                  return prev;
                });
              };
              setModalData({
                title: 'Časová osa operací',
                subtitle: `Za posledních ${selectedPeriod} dní`,
                data: operationsTimeline,
                chartType: operationsTimelineChartType,
                onChartTypeChange: handleChartTypeChange,
                xKey: 'date',
                yKey: 'total',
                label: 'Počet operací',
                color: '#E00034'
              });
              setModalOpen(true);
            }}
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
      
      {/* Graph Detail Modal */}
      <GraphDetailModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        modalData={modalData}
      />
    </>
  );
}

// Komponenta pro report karty
function ReportCard({ title, subtitle, children, fullWidth = false, chartType, onChartTypeChange, showChartTypeSelector = false, onClick }) {
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
    <div 
      className={`bg-white border border-gray-200 rounded-lg p-6 ${fullWidth ? 'lg:col-span-2' : ''} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {showChartTypeSelector && availableTypes.length > 0 && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
            {availableTypes.map((type) => (
              <button
                key={type.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChartTypeChange(type.value);
                }}
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
function BarChart({ data, xKey, yKey, label, color = '#E00034', isLarge = false }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">Žádná data k zobrazení</p>;
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0), 1);
  const chartHeight = isLarge ? 500 : 300;
  const leftPadding = 60;
  const rightPadding = 50;
  const minBarWidth = 20;
  const maxBarWidth = 80;
  const minBarSpacing = 10;
  const maxBarSpacing = 20;
  
  // Calculate optimal bar width and spacing based on data length
  const baseWidth = isLarge ? 900 : 500;
  const totalBars = data.length;
  const availableWidth = baseWidth - leftPadding - rightPadding;
  
  // Calculate spacing - more data = less spacing
  const spacing = totalBars > 20 
    ? minBarSpacing 
    : Math.max(minBarSpacing, maxBarSpacing - (totalBars * 0.5));
  
  // Calculate bar width - adapts to data size
  const calculatedBarWidth = Math.max(
    minBarWidth, 
    Math.min(maxBarWidth, (availableWidth / totalBars) - spacing)
  );
  
  // Calculate total width needed - adapts to actual data
  const totalWidth = Math.max(
    600, 
    leftPadding + (calculatedBarWidth + spacing) * totalBars + rightPadding
  );
  
  const startX = leftPadding;
  const bottomY = chartHeight + 20;
  const labelY = bottomY + 40; // 40 pixels below the axis
  
  // Dynamic label truncation based on bar width
  const maxLabelLength = calculatedBarWidth < 40 ? 8 : calculatedBarWidth < 60 ? 12 : 15;
  
  // Calculate SVG height to accommodate rotated labels (rotated -45deg, need extra space)
  const svgHeight = chartHeight + 20 + 40 + 50; // chart + padding + label offset + space for rotated text

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${totalWidth} ${svgHeight}`} preserveAspectRatio="xMinYMin meet">
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = maxValue * ratio;
          const y = chartHeight - (chartHeight * ratio) + 20;
          return (
            <g key={ratio}>
              <line x1={leftPadding - 10} y1={y} x2={totalWidth - rightPadding} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={leftPadding - 15} y={y + 5} textAnchor="end" fontSize="12" fill="#6b7280">
                {value.toFixed(maxValue < 10 ? 1 : 0)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const value = item[yKey] || 0;
          const height = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
          const x = startX + index * (calculatedBarWidth + spacing);
          const y = bottomY - height;
          const labelText = String(item[xKey] || '');
          const truncatedLabel = labelText.length > maxLabelLength 
            ? labelText.substring(0, maxLabelLength) + '...' 
            : labelText;
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={calculatedBarWidth}
                height={height}
                fill={color}
                opacity="0.8"
              />
              {/* Value label on top - only show if there's enough space */}
              {height > 20 && (
                <text
                  x={x + calculatedBarWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={calculatedBarWidth < 30 ? "8" : "10"}
                  fill="#374151"
                  fontWeight="bold"
                >
                  {value.toFixed(value < 1 ? 1 : 0)}
                </text>
              )}
              {/* X-axis label - rotated and positioned to avoid overlap */}
              <text
                x={x + calculatedBarWidth / 2}
                y={labelY}
                textAnchor="middle"
                fontSize={calculatedBarWidth < 30 ? "8" : "9"}
                fill="#6b7280"
                transform={`rotate(-45 ${x + calculatedBarWidth / 2} ${labelY})`}
              >
                {truncatedLabel}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line x1={leftPadding - 10} y1={bottomY} x2={totalWidth - rightPadding} y2={bottomY} stroke="#374151" strokeWidth="2" />
        {/* Y-axis */}
        <line x1={leftPadding - 10} y1="20" x2={leftPadding - 10} y2={bottomY} stroke="#374151" strokeWidth="2" />
      </svg>
    </div>
  );
}

// Koláčový graf
function PieChart({ data, labelKey, valueKey, color = '#6D1F27', isLarge = false }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">Žádná data k zobrazení</p>;
  }

  const total = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
  if (total === 0) {
    return <p className="text-gray-500 text-center py-8">Žádná data k zobrazení</p>;
  }
  
  // Extended color palette for many slices
  const baseColors = ['#E00034', '#6D1F27', '#C21533', '#8f0f26', '#A11D30', '#dc2626', '#991b1b'];
  const generateColors = (count) => {
    const colors = [...baseColors];
    while (colors.length < count) {
      // Generate additional colors by varying hue
      const hue = (colors.length * 137.508) % 360; // Golden angle approximation
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
  };
  const colors = generateColors(data.length);
  
  let currentAngle = -90;
  const radius = isLarge ? 180 : 100;
  const centerX = isLarge ? 270 : 150;
  const centerY = isLarge ? 270 : 150;
  const svgSize = isLarge ? 540 : 300;

  // Calculate legend layout - adapts to number of items
  const maxLegendItems = Math.min(data.length, 15); // Limit visible items for readability
  const showAll = data.length <= maxLegendItems;
  const displayData = showAll ? data : [...data.slice(0, maxLegendItems - 1), { 
    [labelKey]: `+${data.length - maxLegendItems + 1} dalších`, 
    [valueKey]: data.slice(maxLegendItems - 1).reduce((sum, item) => sum + (item[valueKey] || 0), 0),
    _isOther: true 
  }];

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-center gap-4">
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="flex-shrink-0">
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
                strokeWidth={data.length > 10 ? "1" : "2"}
              />
            </g>
          );
        })}
      </svg>
      
      <div className={`${isLarge ? 'ml-12' : 'ml-8'} space-y-1.5 ${isLarge ? 'min-w-[300px] max-w-[400px]' : 'min-w-[200px] max-w-[350px]'} ${isLarge ? 'max-h-[500px]' : 'max-h-[300px]'} overflow-y-auto`}>
        {displayData.map((item, index) => {
          const value = item[valueKey] || 0;
          const percentage = ((value / total) * 100).toFixed(1);
          const labelText = String(item[labelKey] || '');
          
          // Adaptive label truncation based on data size
          const maxLabelLength = data.length > 10 ? 20 : 30;
          const truncatedLabel = labelText.length > maxLabelLength 
            ? labelText.substring(0, maxLabelLength) + '...' 
            : labelText;
          
          const colorIndex = item._isOther ? data.length : index;
          
          return (
            <div key={index} className="flex items-start gap-2">
              <div
                className="w-4 h-4 rounded flex-shrink-0 mt-0.5"
                style={{ backgroundColor: colors[colorIndex % colors.length] }}
              />
              <span className="text-sm text-gray-700 break-words leading-tight">
                <span className="font-medium">{truncatedLabel}</span>: {value} ({percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Liniový graf
function LineChart({ data, xKey, yKey, label, color = '#E00034', isLarge = false }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">Žádná data k zobrazení</p>;
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0), 1);
  const chartHeight = isLarge ? 450 : 250;
  const leftPadding = 60;
  const rightPadding = 50;
  const topPadding = 20;
  const bottomPadding = 20;
  
  // Calculate chart width - adapts to data size
  const minWidth = isLarge ? 900 : 500;
  const baseWidthPerPoint = 8;
  const calculatedWidth = Math.max(minWidth, data.length * baseWidthPerPoint + leftPadding + rightPadding);
  const chartWidth = calculatedWidth;
  const axisY = chartHeight - bottomPadding;
  const labelY = axisY + 40; // 40 pixels below the axis
  
  // Calculate SVG height to accommodate rotated labels
  const svgHeight = chartHeight + 40 + 50; // chart + label offset + space for rotated text

  const points = data.map((item, index) => {
    const x = leftPadding + (index / (data.length - 1 || 1)) * (chartWidth - leftPadding - rightPadding);
    const y = chartHeight - bottomPadding - ((item[yKey] || 0) / maxValue) * (chartHeight - topPadding - bottomPadding);
    return { x, y, value: item[yKey] || 0, date: item[xKey] };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Calculate how many labels to show to avoid overlap - adapts to chart width
  const minLabelSpacing = 70; // Minimum pixels between labels
  const maxLabels = Math.floor((chartWidth - leftPadding - rightPadding) / minLabelSpacing);
  const labelStep = Math.max(1, Math.ceil(data.length / Math.max(1, maxLabels)));

  // Format label text based on data type
  const formatLabel = (value) => {
    if (typeof value === 'string' && value.includes('-')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
        }
      } catch (e) {
        // Fall through to string handling
      }
    }
    const str = String(value);
    return str.length > 12 ? str.substring(0, 12) + '...' : str;
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${chartWidth} ${svgHeight}`} preserveAspectRatio="xMinYMin meet">
        {/* Grid lines with Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = maxValue * ratio;
          const y = chartHeight - bottomPadding - (chartHeight - topPadding - bottomPadding) * ratio;
          return (
            <g key={ratio}>
              <line x1={leftPadding} y1={y} x2={chartWidth - rightPadding} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={leftPadding - 10} y={y + 5} textAnchor="end" fontSize="12" fill="#6b7280">
                {value.toFixed(maxValue < 10 ? 1 : 0)}
              </text>
            </g>
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
            {/* Show labels with calculated step to avoid overlap */}
            {index % labelStep === 0 && (
              <text
                x={point.x}
                y={labelY}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
                transform={`rotate(-45 ${point.x} ${labelY})`}
              >
                {formatLabel(point.date)}
              </text>
            )}
          </g>
        ))}

        {/* Axes */}
        <line x1={leftPadding} y1={topPadding} x2={leftPadding} y2={axisY} stroke="#374151" strokeWidth="2" />
        <line x1={leftPadding} y1={axisY} x2={chartWidth - rightPadding} y2={axisY} stroke="#374151" strokeWidth="2" />
      </svg>
    </div>
  );
}

// Bodový graf (Scatter Chart)
function ScatterChart({ data, xKey, yKey, label, color = '#E00034', isLarge = false }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center py-8">Žádná data k zobrazení</p>;
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0), 1);
  const chartHeight = isLarge ? 500 : 300;
  const leftPadding = 60;
  const rightPadding = 50;
  const topPadding = 20;
  const bottomPadding = 20;
  
  // Calculate chart width - adapts to data size
  const minWidth = isLarge ? 900 : 500;
  const baseWidthPerPoint = 8;
  const calculatedWidth = Math.max(minWidth, data.length * baseWidthPerPoint + leftPadding + rightPadding);
  const chartWidth = calculatedWidth;
  const axisY = chartHeight - bottomPadding;
  const labelY = axisY + 40; // 40 pixels below the axis
  
  // Calculate SVG height to accommodate rotated labels
  const svgHeight = chartHeight + 40 + 50; // chart + label offset + space for rotated text

  const points = data.map((item, index) => {
    const x = leftPadding + (index / (data.length - 1 || 1)) * (chartWidth - leftPadding - rightPadding);
    const y = chartHeight - bottomPadding - ((item[yKey] || 0) / maxValue) * (chartHeight - topPadding - bottomPadding);
    const labelText = String(item[xKey] || '');
    return { x, y, value: item[yKey] || 0, label: labelText };
  });

  // Calculate how many labels to show to avoid overlap
  const minLabelSpacing = 70;
  const maxLabels = Math.floor((chartWidth - leftPadding - rightPadding) / minLabelSpacing);
  const labelStep = Math.max(1, Math.ceil(data.length / Math.max(1, maxLabels)));

  // Adaptive label truncation
  const maxLabelLength = data.length > 20 ? 10 : 15;

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${chartWidth} ${svgHeight}`} preserveAspectRatio="xMinYMin meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = maxValue * ratio;
          const y = chartHeight - bottomPadding - (chartHeight - topPadding - bottomPadding) * ratio;
          return (
            <g key={ratio}>
              <line x1={leftPadding} y1={y} x2={chartWidth - rightPadding} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={leftPadding - 10} y={y + 5} textAnchor="end" fontSize="12" fill="#6b7280">
                {value.toFixed(maxValue < 10 ? 1 : 0)}
              </text>
            </g>
          );
        })}

        {/* Points */}
        {points.map((point, index) => {
          const truncatedLabel = point.label.length > maxLabelLength 
            ? point.label.substring(0, maxLabelLength) + '...' 
            : point.label;
          
          return (
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
              {/* Only show value label if there's enough space above point */}
              {point.y > 30 && (
                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#374151"
                  fontWeight="bold"
                >
                  {point.value.toFixed(point.value < 1 ? 1 : 0)}
                </text>
              )}
              {/* Show labels with calculated step to avoid overlap */}
              {index % labelStep === 0 && (
                <text
                  x={point.x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6b7280"
                  transform={`rotate(-45 ${point.x} ${labelY})`}
                >
                  {truncatedLabel}
                </text>
              )}
            </g>
          );
        })}

        {/* Axes */}
        <line x1={leftPadding} y1={topPadding} x2={leftPadding} y2={axisY} stroke="#374151" strokeWidth="2" />
        <line x1={leftPadding} y1={axisY} x2={chartWidth - rightPadding} y2={axisY} stroke="#374151" strokeWidth="2" />
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

// Graph Detail Modal Component
function GraphDetailModal({ isOpen, onClose, modalData }) {
  if (!modalData || !isOpen) return null;

  const chartTypes = [
    { value: 'bar', label: 'Sloupcový', icon: '📊' },
    { value: 'pie', label: 'Koláčový', icon: '🥧' },
    { value: 'line', label: 'Liniový', icon: '📈' }
  ];

  const availableTypes = modalData.title === 'Časová osa operací' 
    ? chartTypes.filter(t => ['line', 'bar'].includes(t.value))
    : chartTypes.filter(t => ['bar', 'pie', 'line'].includes(t.value));

  const handleChartTypeChange = (newType) => {
    if (modalData.onChartTypeChange) {
      modalData.onChartTypeChange(newType);
    }
  };

  const renderChart = () => {
    if (!modalData.chartType) return null;
    
    if (modalData.chartType === 'bar') {
      return (
        <BarChart
          data={modalData.data}
          xKey={modalData.xKey}
          yKey={modalData.yKey}
          label={modalData.label}
          color={modalData.color}
          isLarge={true}
        />
      );
    } else if (modalData.chartType === 'pie') {
      return (
        <PieChart
          data={modalData.data}
          labelKey={modalData.xKey}
          valueKey={modalData.yKey}
          color={modalData.color}
          isLarge={true}
        />
      );
    } else if (modalData.chartType === 'line') {
      return (
        <LineChart
          data={modalData.data}
          xKey={modalData.xKey}
          yKey={modalData.yKey}
          label={modalData.label}
          color={modalData.color}
          isLarge={true}
        />
      );
    }
    return null;
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-4 sm:w-[95vw] sm:h-[95vh] sm:max-w-[95vw] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-[#6D1F27] to-[#E00034]">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Dialog.Title className="text-2xl font-bold text-white">
                        {modalData.title}
                      </Dialog.Title>
                      {modalData.subtitle && (
                        <p className="mt-1 text-blue-100 text-sm">
                          {modalData.subtitle}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={onClose}
                      className="ml-4 rounded-md bg-white bg-opacity-20 p-2 text-white hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5 bg-white flex-1 overflow-y-auto">
                  {/* Chart Type Selector */}
                  {availableTypes.length > 0 && (
                    <div className="mb-6 flex justify-end z-10 relative">
                      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                        {availableTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleChartTypeChange(type.value);
                            }}
                            disabled={modalData.chartType === type.value}
                            className={`px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer ${
                              modalData.chartType === type.value
                                ? 'bg-[#E00034] text-white cursor-default'
                                : 'text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                            }`}
                          >
                            <span className="mr-2">{type.icon}</span>
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chart */}
                  <div className="w-full h-full flex items-center justify-center">
                    {renderChart()}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-[#E00034] text-white rounded-lg hover:bg-[#C21533] transition-colors font-medium"
                  >
                    Zavřít
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

