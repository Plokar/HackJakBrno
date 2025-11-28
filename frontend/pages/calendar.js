import { useState, useEffect } from 'react';
import Head from 'next/head';
import OperationCalendar from '../components/calendar/OperationCalendar';

export default function CalendarPage() {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      // Mock data for development
      const mockOperations = generateMockOperations();
      setOperations(mockOperations);
      setLoading(false);
    } catch (err) {
      console.error('Calendar API Error:', err);
      setLoading(false);
    }
  };

  const handleEventClick = (event) => {
    console.log('Event clicked:', event);
    // TODO: Open operation detail modal
  };

  const handleDateSelect = (selectInfo) => {
    console.log('Date selected:', selectInfo);
    // TODO: Open new operation form
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Načítám kalendář...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Kalendář operací - Medic Hub</title>
      </Head>

      <OperationCalendar
        operations={operations}
        onEventClick={handleEventClick}
        onDateSelect={handleDateSelect}
      />
    </>
  );
}

function generateMockOperations() {
  const operationTypes = [
    'Laparoskopická cholecystektomie',
    'Arthroskopie kolena',
    'Katetrizace srdce',
    'Appendektomie',
    'Herniotomie',
    'Endoskopické vyšetření',
    'Bypassová operace',
    'Náhrada kyčelního kloubu'
  ];

  const surgeons = [
    'MUDr. Jan Novák',
    'MUDr. Eva Svobodová',
    'MUDr. Petr Dvořák',
    'MUDr. Marie Černá'
  ];

  const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
  const priorities = ['normal', 'high', 'urgent'];

  const operations = [];
  const today = new Date();

  // Generate operations for the next 30 days
  for (let day = -7; day < 30; day++) {
    const numOperations = Math.floor(Math.random() * 5) + 2;
    
    for (let i = 0; i < numOperations; i++) {
      const start = new Date(today);
      start.setDate(today.getDate() + day);
      start.setHours(7 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
      
      const duration = Math.floor(Math.random() * 3) + 1;
      const end = new Date(start);
      end.setHours(end.getHours() + duration);

      let status;
      if (day < 0) {
        status = 'completed';
      } else if (day === 0) {
        status = Math.random() > 0.5 ? 'in_progress' : 'scheduled';
      } else {
        status = 'scheduled';
      }

      operations.push({
        id: `op-${day}-${i}`,
        type: operationTypes[Math.floor(Math.random() * operationTypes.length)],
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        status: status,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        surgeon: surgeons[Math.floor(Math.random() * surgeons.length)],
        room: {
          id: Math.floor(Math.random() * 20) + 1,
          name: `Operační sál ${Math.floor(Math.random() * 20) + 1}`
        },
        patient: {
          id: Math.floor(Math.random() * 1000),
          name: `Pacient ${Math.floor(Math.random() * 1000)}`
        },
        estimatedCost: Math.floor(Math.random() * 50000) + 20000
      });
    }
  }

  return operations;
}
