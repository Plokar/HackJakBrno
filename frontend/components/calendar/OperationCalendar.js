import { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import csLocale from '@fullcalendar/core/locales/cs';

export default function OperationCalendar({ operations = [], rooms = [], onEventClick, onDateSelect, onAddOperation }) {
  const calendarRef = useRef(null);
  const [view, setView] = useState('timeGridWeek');
  const [selectedRoom, setSelectedRoom] = useState(null);

  console.log('OperationCalendar render:', { operationsCount: operations.length, roomsCount: rooms.length });

  const handleViewChange = (newView) => {
    setView(newView);
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(newView);
    }
  };

  // Filter operations by selected room
  const filteredOperations = selectedRoom 
    ? operations.filter(op => op.room?.id === selectedRoom)
    : operations;

  // Transform operations data for FullCalendar
  const events = filteredOperations.map(op => ({
    id: op.id,
    title: `${op.type} - ${op.patient?.name || 'Pacient'}`,
    start: op.scheduledStart,
    end: op.scheduledEnd,
    backgroundColor: getEventColor(op.status, op.priority),
    borderColor: getEventBorderColor(op.status),
    extendedProps: {
      room: op.room,
      surgeon: op.surgeon,
      patient: op.patient,
      status: op.status,
      priority: op.priority,
      estimatedCost: op.estimatedCost
    }
  }));

  function getEventColor(status, priority) {
    if (status === 'completed') return '#10b981';
    if (status === 'in_progress') return '#3b82f6';
    if (status === 'cancelled') return '#6b7280';
    if (priority === 'urgent') return '#dc2626';
    if (priority === 'high') return '#f59e0b';
    return '#8b5cf6';
  }

  function getEventBorderColor(status) {
    if (status === 'completed') return '#059669';
    if (status === 'in_progress') return '#2563eb';
    if (status === 'cancelled') return '#4b5563';
    return '#7c3aed';
  }

  const handleEventClick = (info) => {
    if (onEventClick) {
      onEventClick({
        id: info.event.id,
        title: info.event.title,
        start: info.event.start,
        end: info.event.end,
        ...info.event.extendedProps
      });
    }
  };

  const handleDateSelect = (selectInfo) => {
    if (onDateSelect) {
      onDateSelect({
        start: selectInfo.start,
        end: selectInfo.end,
        allDay: selectInfo.allDay
      });
    }
  };

  const renderEventContent = (eventInfo) => {
    return (
      <div className="p-1">
        <div className="font-semibold text-xs truncate">{eventInfo.timeText}</div>
        <div className="text-xs truncate">{eventInfo.event.title}</div>
        {eventInfo.event.extendedProps.room && (
          <div className="text-xs opacity-75 truncate">
            {eventInfo.event.extendedProps.room.name}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Harmonogram operací</h2>
          
          {/* Room Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="room-select" className="text-sm font-medium text-gray-700">
              Sál:
            </label>
            <select
              id="room-select"
              value={selectedRoom || ''}
              onChange={(e) => setSelectedRoom(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Všechny sály</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Operation Button */}
          <button
            onClick={() => onAddOperation && onAddOperation()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Přidat operaci
          </button>
        </div>
        
        {/* View Selector */}
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewChange('timeGridDay')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'timeGridDay'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Den
          </button>
          <button
            onClick={() => handleViewChange('timeGridWeek')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'timeGridWeek'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Týden
          </button>
          <button
            onClick={() => handleViewChange('dayGridMonth')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'dayGridMonth'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Měsíc
          </button>
          <button
            onClick={() => handleViewChange('listWeek')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'listWeek'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Seznam
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <LegendItem color="#dc2626" label="Urgentní" />
        <LegendItem color="#f59e0b" label="Vysoká priorita" />
        <LegendItem color="#8b5cf6" label="Standardní" />
        <LegendItem color="#3b82f6" label="Probíhá" />
        <LegendItem color="#10b981" label="Dokončeno" />
        <LegendItem color="#6b7280" label="Zrušeno" />
      </div>

      {/* Calendar */}
      <div className="calendar-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={view}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          locale={csLocale}
          events={events}
          eventClick={handleEventClick}
          select={handleDateSelect}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          slotDuration="00:30:00"
          height="auto"
          eventContent={renderEventContent}
          allDaySlot={false}
          nowIndicator={true}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '07:00',
            endTime: '19:00',
          }}
        />
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
        <StatCard
          label="Celkem operací"
          value={filteredOperations.length}
          color="blue"
        />
        <StatCard
          label="Probíhající"
          value={filteredOperations.filter(op => op.status === 'in_progress').length}
          color="blue"
        />
        <StatCard
          label="Naplánováno"
          value={filteredOperations.filter(op => op.status === 'scheduled').length}
          color="purple"
        />
        <StatCard
          label="Dokončeno"
          value={filteredOperations.filter(op => op.status === 'completed').length}
          color="green"
        />
      </div>

      <style jsx global>{`
        .calendar-container .fc {
          font-family: inherit;
        }
        .calendar-container .fc-button {
          background-color: #3b82f6;
          border-color: #3b82f6;
          text-transform: capitalize;
        }
        .calendar-container .fc-button:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }
        .calendar-container .fc-button-active {
          background-color: #1d4ed8 !important;
          border-color: #1d4ed8 !important;
        }
        .calendar-container .fc-event {
          cursor: pointer;
          border-radius: 4px;
        }
        .calendar-container .fc-event:hover {
          opacity: 0.8;
        }
        .calendar-container .fc-daygrid-event {
          margin: 1px 2px;
        }
      `}</style>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center">
      <div
        className="w-4 h-4 rounded mr-2"
        style={{ backgroundColor: color }}
      ></div>
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className={`${colors[color]} rounded-lg p-4 text-center`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-75">{label}</p>
    </div>
  );
}
