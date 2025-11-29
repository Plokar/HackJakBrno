import { useState } from 'react';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  WrenchScrewdriverIcon,
  XCircleIcon,
  CalendarIcon 
} from '@heroicons/react/24/outline';
import classNames from 'classnames';

export default function RoomStatusGrid({ rooms = [], onRoomClick }) {
  const [filter, setFilter] = useState('all');
  
  // Debug: Log received rooms
  console.log('RoomStatusGrid received rooms:', rooms.length, rooms);

  const statusConfig = {
    available: {
      label: 'Volný',
      icon: CheckCircleIcon,
      bgColor: 'bg-[#EAEAEA]',
      borderColor: 'border-[#E00034]',
      textColor: 'text-gray-800',
      iconColor: 'text-gray-600',
      pulseColor: 'bg-[#666666]',
      badgeBgColor: 'bg-[#666666]',
      badgeBorderColor: 'border-[#666666]'
    },
    active: {
      label: 'V provozu',
      icon: ClockIcon,
      bgColor: 'bg-[#fce7ed]',
      borderColor: 'border-[#E00034]',
      textColor: 'text-gray-800',
      iconColor: 'text-gray-600',
      pulseColor: 'bg-[#E00034]',
      badgeBgColor: 'bg-[#E00034]',
      badgeBorderColor: 'border-[#E00034]'
    },
    maintenance: {
      label: 'Údržba',
      icon: WrenchScrewdriverIcon,
      bgColor: 'bg-[#fce7ed]',
      borderColor: 'border-[#E00034]',
      textColor: 'text-gray-800',
      iconColor: 'text-gray-600',
      pulseColor: 'bg-yellow-400',
      badgeBgColor: 'bg-yellow-600',
      badgeBorderColor: 'border-yellow-600'
    },
    cleaning: {
      label: 'Úklid',
      icon: WrenchScrewdriverIcon,
      bgColor: 'bg-[#fce7ed]',
      borderColor: 'border-[#E00034]',
      textColor: 'text-gray-800',
      iconColor: 'text-gray-600',
      pulseColor: 'bg-purple-400',
      badgeBgColor: 'bg-purple-600',
      badgeBorderColor: 'border-purple-600'
    },
    unavailable: {
      label: 'Nedostupný',
      icon: XCircleIcon,
      bgColor: 'bg-[#fce7ed]',
      borderColor: 'border-[#E00034]',
      textColor: 'text-gray-800',
      iconColor: 'text-gray-600',
      pulseColor: 'bg-gray-400',
      badgeBgColor: 'bg-gray-600',
      badgeBorderColor: 'border-gray-600'
    }
  };

  const filteredRooms = filter === 'all' 
    ? rooms 
    : rooms.filter(room => room.status === filter);

  const getTimeRemaining = (endTime) => {
    if (!endTime) return null;
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff < 0) return 'Překročeno';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getOperationDuration = (startTime) => {
    if (!startTime) return null;
    const now = new Date();
    const start = new Date(startTime);
    const diff = now - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Přehled operačních sálů</h2>
        
        {/* Filter Buttons */}
        <div className="flex space-x-2">
          <FilterButton 
            label="Vše" 
            count={rooms.length}
            active={filter === 'all'} 
            onClick={() => setFilter('all')} 
          />
          <FilterButton 
            label="V provozu" 
            count={rooms.filter(r => r.status === 'active').length}
            active={filter === 'active'} 
            onClick={() => setFilter('active')}
            color="blue"
          />
          <FilterButton 
            label="Volné" 
            count={rooms.filter(r => r.status === 'available').length}
            active={filter === 'available'} 
            onClick={() => setFilter('available')}
            color="green"
          />
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredRooms.map((room) => {
          const config = statusConfig[room.status] || statusConfig.unavailable;
          const Icon = config.icon;

          return (
            <div
              key={room.id}
              onClick={() => onRoomClick && onRoomClick(room)}
              className={classNames(
                'relative rounded-lg p-4 cursor-pointer transition-all duration-200',
                'hover:shadow-xl hover:scale-105',
                config.bgColor
              )}
            >
              {/* Pulse indicator for active rooms */}
              {room.status === 'active' && (
                <div className="absolute top-2 right-2">
                  <span className="relative flex h-3 w-3">
                    <span className={classNames(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      config.pulseColor
                    )}></span>
                    <span className={classNames(
                      "relative inline-flex rounded-full h-3 w-3",
                      config.pulseColor
                    )}></span>
                  </span>
                </div>
              )}

              {/* Room Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{room.name}</h3>
                  <p className="text-xs text-gray-600">{room.building || 'Hlavní budova'}</p>
                </div>
                <Icon className={classNames('h-6 w-6', config.iconColor)} />
              </div>

              {/* Status Badge */}
              <div className={classNames(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-3 border-2',
                'text-white',
                config.badgeBgColor,
                config.badgeBorderColor
              )}>
                {config.label}
              </div>

              {/* Room Details */}
              {room.status === 'active' && room.currentOperation && (
                <div className="mt-3 pt-3 border-t border-gray-300 space-y-2">
                  <div>
                    <p className="text-xs text-gray-600">Typ operace:</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {room.currentOperation.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Trvání:</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {getOperationDuration(room.currentOperation.startTime)}
                    </p>
                  </div>
                  {room.currentOperation.estimatedEnd && (
                    <div>
                      <p className="text-xs text-gray-600">Zbývá:</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {getTimeRemaining(room.currentOperation.estimatedEnd)}
                      </p>
                    </div>
                  )}
                  {room.currentOperation.surgeon && (
                    <div>
                      <p className="text-xs text-gray-600">Chirurg:</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {room.currentOperation.surgeon}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {room.status === 'available' && room.nextOperation && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="flex items-center text-xs text-gray-600 mb-1">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Další operace:
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(room.nextOperation.scheduledTime).toLocaleTimeString('cs-CZ', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {/* Utilization Bar */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Využití dnes:</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {room.utilization || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${room.utilization || 0}%`, backgroundColor: '#6D1F27' }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Žádné sály nenalezeny</p>
        </div>
      )}
    </div>
  );
}

function FilterButton({ label, count, active, onClick, color = 'gray' }) {
  const buttonClass = active 
    ? 'bg-[#E00034] text-white' 
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300';

  return (
    <button
      onClick={onClick}
      className={classNames(
        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        buttonClass
      )}
    >
      {label} {count !== undefined && `(${count})`}
    </button>
  );
}
