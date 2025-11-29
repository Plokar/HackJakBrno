import { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import csLocale from '@fullcalendar/core/locales/cs';

const DEFAULT_COLUMN_WIDTH = 150;
const MAX_COLUMN_WIDTH = 260;
// výchozí šířka pro měsíční zobrazení (nastaveno na 165px)
const DEFAULT_MONTH_COLUMN_WIDTH = 165;

export default function OperationCalendar({ operations = [], rooms = [], onEventClick, onDateSelect, onAddOperation }) {
  const calendarRef = useRef(null);
  const calendarContainerRef = useRef(null);
  const columnStyleRef = useRef(null);
  const [view, setView] = useState('timeGridWeek');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});
  const [columnCount, setColumnCount] = useState(0);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startWidth: DEFAULT_COLUMN_WIDTH,
    columnIndex: null
  });

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

  const getColumnWidth = (index) => {
    // v měsíčním zobrazení použijeme větší výchozí šířku
    const defaultWidth = view === 'dayGridMonth' ? DEFAULT_MONTH_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH;
    return columnWidths[index] || defaultWidth;
  };
  // resetColumnWidths removed — uživatel nemá možnost resetovat šířky jednotlivých sloupců

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragStateRef.current.isDragging) return;
      const delta = event.clientX - dragStateRef.current.startX;
      const newWidth = Math.min(
        MAX_COLUMN_WIDTH,
        Math.max(DEFAULT_COLUMN_WIDTH, dragStateRef.current.startWidth + delta)
      );
      const columnIndex = dragStateRef.current.columnIndex;
      if (columnIndex === null) return;
      setColumnWidths((prev) => {
        if (prev[columnIndex] === newWidth) return prev;
        return { ...prev, [columnIndex]: newWidth };
      });
    };

    const handlePointerUp = () => {
      if (dragStateRef.current.isDragging) {
        dragStateRef.current.isDragging = false;
        dragStateRef.current.columnIndex = null;
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    const container = calendarContainerRef.current;
    if (!container) return;

    let cleanups = [];

    const cleanupHandles = () => {
      if (cleanups.length) {
        cleanups.forEach((fn) => fn());
        cleanups = [];
      }
    };

    const applyHeaderLogic = () => {
      const headerCells = container.querySelectorAll('.fc-col-header-cell');
      if (!headerCells.length) return; // čekáme až se DOM vykreslí

      setColumnCount(headerCells.length);
      // nejprve smaž staré úchyty
      headerCells.forEach((cell) => {
        cell.classList.remove('calendar-header-resizable');
        const handles = cell.querySelectorAll('.calendar-resize-handle');
        handles.forEach(h => h.remove());
      });
      cleanupHandles();

      // v month view nechceme přidávat resize handles
      if (view === 'dayGridMonth') return;

      headerCells.forEach((cell, index) => {
        cell.classList.add('calendar-header-resizable');

        const ensureHandle = (position) => {
          const className = `calendar-resize-handle-${position}`;
          let handle = cell.querySelector(`.${className}`);
          if (!handle) {
            handle = document.createElement('div');
            handle.classList.add('calendar-resize-handle', className);
            cell.appendChild(handle);
          }

          const pointerDown = (event) => {
            event.preventDefault();
            dragStateRef.current.isDragging = true;
            dragStateRef.current.startX = event.clientX;
            dragStateRef.current.startWidth = getColumnWidth(index);
            dragStateRef.current.columnIndex = index;
          };

          handle.addEventListener('pointerdown', pointerDown);
          cleanups.push(() => handle.removeEventListener('pointerdown', pointerDown));
        };

        ensureHandle('left');
        ensureHandle('right');
      });
    };

    // pokusíme se aplikovat hned (první render)
    applyHeaderLogic();

    // sledování změn v DOM (když FullCalendar přepne view)
    const observer = new MutationObserver(() => {
      applyHeaderLogic();
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanupHandles();
    };
  }, [view, columnWidths]);

  useEffect(() => {
    if (!columnStyleRef.current) {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-calendar-column-widths', 'true');
      document.head.appendChild(styleEl);
      columnStyleRef.current = styleEl;
    }

    if (!columnCount) {
      columnStyleRef.current.textContent = '';
      return;
    }

    let css = '';
    for (let i = 0; i < columnCount; i++) {
      const width = getColumnWidth(i);
      const nth = i + 1;
      css += `
        .calendar-container .fc .fc-col-header-cell:nth-child(${nth}),
        .calendar-container .fc .fc-daygrid-body table tbody tr td:nth-child(${nth}),
        .calendar-container .fc .fc-timegrid-cols .fc-timegrid-col:nth-child(${nth}) {
          min-width: ${width}px;
          width: ${width}px;
          max-width: ${width}px;
        }
      `;
    }

    columnStyleRef.current.textContent = css;
  }, [columnWidths, columnCount]);

  useEffect(() => {
    return () => {
      if (columnStyleRef.current) {
        columnStyleRef.current.remove();
        columnStyleRef.current = null;
      }
    };
  }, []);

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

  const clampStyle = (lines) => ({
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  });

  const renderEventContent = (eventInfo) => {
    const roomName = eventInfo.event.extendedProps.room?.name || '';
    return (
      <div className="p-1 leading-snug space-y-0.5 text-gray-900 text-[15px]">
        <div className="font-semibold text-[15px] truncate">{eventInfo.timeText}</div>
        <div className="font-semibold whitespace-normal break-words" style={clampStyle(2)}>
          {eventInfo.event.title}
        </div>
        {roomName && (
          <div className="text-[14px] opacity-80 whitespace-normal break-words" style={clampStyle(2)}>
            {roomName}
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
              className="w-48 px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C21533] focus:border-transparent"
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
            className="flex items-center gap-2 px-4 py-2 bg-[#C21533] text-white rounded-lg hover:bg-[#8f0f26] transition-colors text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Přidat operaci
          </button>
        </div>
        
        {/* View Selector */}
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <div className="flex space-x-2">
            <button
              onClick={() => handleViewChange('timeGridDay')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'timeGridDay'
                  ? 'bg-[#C21533] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Den
            </button>
            <button
              onClick={() => handleViewChange('timeGridWeek')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'timeGridWeek'
                  ? 'bg-[#C21533] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Týden
            </button>
            <button
              onClick={() => handleViewChange('dayGridMonth')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'dayGridMonth'
                  ? 'bg-[#C21533] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Měsíc
            </button>
            <button
              onClick={() => handleViewChange('listWeek')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'listWeek'
                  ? 'bg-[#C21533] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Seznam
            </button>
          </div>
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
      <div
        ref={calendarContainerRef}
        className="calendar-container overflow-x-auto"
      >
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
        /* month full-bleed removed — month view will use the same container width as week view */
        .calendar-container.full-bleed {
          position: relative;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
          width: 100vw;
          max-width: 100vw;
          padding-left: 1.5rem; /* keep same appearance as parent p-6 */
          padding-right: 1.5rem;
          box-sizing: border-box;
        }
        .calendar-container.full-bleed .fc,
        .calendar-container.full-bleed .fc .fc-daygrid,
        .calendar-container.full-bleed .fc .fc-daygrid table {
          width: 100% !important;
          max-width: none !important;
        }
        .calendar-container .fc {
          font-family: inherit;
        }
        .calendar-container .fc-button {
          background-color: #C21533;
          border-color: #C21533;
          text-transform: capitalize;
        }
        .calendar-container .fc-button:hover {
          background-color: #8f0f26;
          border-color: #8f0f26;
        }
        .calendar-container .fc-button-active {
          background-color: #8f0f26 !important;
          border-color: #8f0f26 !important;
        }
        .calendar-container .calendar-header-resizable {
          position: relative;
        }
        .calendar-container .calendar-resize-handle {
          position: absolute;
          top: 0;
          width: 8px;
          height: 100%;
          cursor: col-resize;
          z-index: 5;
        }
        .calendar-container .calendar-resize-handle-left {
          left: -3px;
        }
        .calendar-container .calendar-resize-handle-right {
          right: -3px;
        }
        .calendar-container .calendar-resize-handle:hover,
        .calendar-container .calendar-resize-handle:active {
          background-color: rgba(194, 21, 51, 0.2);
        }
        .calendar-container .fc-col-header-cell-cushion {
          font-size: 0.95rem;
          font-weight: 500;
        }
        .calendar-container .fc-daygrid-day-number,
        .calendar-container .fc-timegrid-slot-label-cushion {
          font-size: 0.9rem;
          font-weight: 500;
        }
        .calendar-container .fc-event {
          cursor: pointer;
          border-radius: 4px;
          overflow: hidden;
        }
        .calendar-container .fc-event:hover {
          opacity: 0.8;
        }
        .calendar-container .fc-daygrid-event {
          margin: 1px 2px;
        }
        .calendar-container .fc .fc-daygrid,
        .calendar-container .fc .fc-daygrid table {
          table-layout: auto !important;
          width: auto !important;
        }
        /* month view centering removed (undo) */
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
