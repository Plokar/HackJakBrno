import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import csLocale from '@fullcalendar/core/locales/cs';

export default function OperationCalendar({ operations = [], rooms = [], onEventClick, onDateSelect }) {
  const [view, setView] = useState('timeGridWeek');

  // Transform operations data for FullCalendar
  const events = operations.map(op => ({
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Harmonogram operací</h2>
        
        {/* View Selector */}
        <div className="flex space-x-2">
          <button
            onClick={() => setView('timeGridDay')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'timeGridDay'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Den
          </button>
          <button
            onClick={() => setView('timeGridWeek')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'timeGridWeek'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Týden
          </button>
          <button
            onClick={() => setView('dayGridMonth')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'dayGridMonth'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Měsíc
          </button>
          <button
            onClick={() => setView('listWeek')}
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
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
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
          value={operations.length}
          color="blue"
        />
        <StatCard
          label="Probíhající"
          value={operations.filter(op => op.status === 'in_progress').length}
          color="blue"
        />
        <StatCard
          label="Naplánováno"
          value={operations.filter(op => op.status === 'scheduled').length}
          color="purple"
        />
        <StatCard
          label="Dokončeno"
          value={operations.filter(op => op.status === 'completed').length}
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
