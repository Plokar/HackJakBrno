import { useState, useEffect } from 'react';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import RoomStatusGrid from './RoomStatusGrid';
import UtilizationChart from './UtilizationChart';
import AlertsPanel from './AlertsPanel';
import CostOverview from './CostOverview';

export default function RealTimeDashboard({ data, onRoomClick }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    activeOperations: 0,
    availableRooms: 0,
    scheduledToday: 0,
    averageUtilization: 0
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data) {
      calculateStats(data);
    }
  }, [data]);

  const calculateStats = (roomsData) => {
    const active = roomsData.filter(r => r.status === 'active').length;
    const available = roomsData.filter(r => r.status === 'available').length;
    const scheduled = roomsData.reduce((sum, r) => sum + (r.scheduledToday || 0), 0);
    const avgUtil = roomsData.reduce((sum, r) => sum + (r.utilization || 0), 0) / roomsData.length;

    setStats({
      activeOperations: active,
      availableRooms: available,
      scheduledToday: scheduled,
      averageUtilization: Math.round(avgUtil)
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('cs-CZ', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('cs-CZ', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Real-time Clock */}
      <div className="bg-gradient-to-r from-[#E00034] to-[#b3002a] rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Operační sály - Real-time Dashboard</h1>
            <p className="text-red-100 mt-1">{formatDate(currentTime)}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end space-x-2">
              <ClockIcon className="h-8 w-8" />
              <span className="text-4xl font-mono font-bold">{formatTime(currentTime)}</span>
            </div>
            <p className="text-red-100 text-sm mt-1">Aktualizováno právě teď</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Probíhající operace"
          value={stats.activeOperations}
          icon={<ClockIcon className="h-8 w-8" />}
          color="blue"
          subtitle="aktivních sálů"
        />
        <MetricCard
          title="Volné sály"
          value={stats.availableRooms}
          icon={<CheckCircleIcon className="h-8 w-8" />}
          color="green"
          subtitle="připraveno k použití"
        />
        <MetricCard
          title="Naplánováno dnes"
          value={stats.scheduledToday}
          icon={<ClockIcon className="h-8 w-8" />}
          color="yellow"
          subtitle="operací v harmonogramu"
        />
        <MetricCard
          title="Průměrné vytížení"
          value={`${stats.averageUtilization}%`}
          icon={<ExclamationTriangleIcon className="h-8 w-8" />}
          color={stats.averageUtilization > 85 ? 'green' : stats.averageUtilization > 60 ? 'yellow' : 'red'}
          subtitle="využití kapacity"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operating Rooms Grid - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RoomStatusGrid rooms={data} onRoomClick={onRoomClick} />
        </div>

        {/* Alerts Panel */}
        <div>
          <AlertsPanel rooms={data} />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UtilizationChart data={data} />
        <CostOverview data={data} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, subtitle }) {
  const colorClasses = {
    blue: 'bg-[#fce7ed] border-[#C21533]',
    green: 'bg-[#fce7ed] border-[#C21533]',
    yellow: 'bg-[#fce7ed] border-[#C21533]',
    red: 'bg-[#fce7ed] border-[#C21533]',
  };

  return (
    <div className={`${colorClasses[color]} border-2 rounded-lg p-6 transition-all hover:shadow-lg`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 opacity-80">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-xs text-gray-900 opacity-70 mt-1">{subtitle}</p>
        </div>
        <div className="opacity-50 text-gray-900">
          {icon}
        </div>
      </div>
    </div>
  );
}
