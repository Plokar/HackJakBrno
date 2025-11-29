import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRole } from '../lib/RoleContext';
import RealTimeDashboard from '../components/dashboard/RealTimeDashboard';
import RoomDetailModal from '../components/dashboard/RoomDetailModal';

export default function Home() {
  const { currentRole, isDoctor, isAdmin, isNurse } = useRole();
  const [roomsData, setRoomsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Použít proxy endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const url = apiUrl.startsWith('/api/proxy') 
        ? '/api/proxy/medic/dashboard/stats/'
        : `${apiUrl}/medic/dashboard/stats/`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Nepodařilo se načíst data');
      }

      const data = await response.json();
      const rooms = data.room_utilization || [];
      console.log('API Response - rooms count:', rooms.length, 'data:', data);
      
      // If API returns empty array, use mock data
      if (rooms.length === 0) {
        console.log('API returned empty array, using mock data');
        const mockData = generateMockRoomsData();
        setRoomsData(mockData);
      } else {
        setRoomsData(rooms);
      }
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Dashboard API Error:', err);
      // Show error but try to load anyway
      setError('Používám mock data - backend není dostupný');
      const mockData = generateMockRoomsData();
      console.log('Generated mock data:', mockData.length, 'rooms');
      setRoomsData(mockData);
      setLoading(false);
    }
  };

  const handleRoomClick = (room) => {
    console.log('Room clicked:', room);
    setSelectedRoomId(room.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRoomId(null);
  };

  // Debug: Log rooms data when it changes
  useEffect(() => {
    console.log('Rooms data updated:', roomsData.length, 'rooms', roomsData);
  }, [roomsData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Načítám data operačních sálů...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - Medic Hub</title>
      </Head>
      
      {error && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}
      
      <RealTimeDashboard 
        data={roomsData} 
        onRoomClick={handleRoomClick}
        currentRole={currentRole}
      />

      <RoomDetailModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        roomId={selectedRoomId}
        currentRole={currentRole}
      />
    </>
  );
}

// Mock data generator for development fallback
function generateMockRoomsData() {
  const statuses = ['available', 'active', 'cleaning', 'maintenance'];
  const operationTypes = [
    'Laparoskopická cholecystektomie',
    'Arthroskopie kolena',
    'Katetrizace srdce',
    'Appendektomie',
    'Herniotomie',
    'Endoskopické vyšetření'
  ];
  const surgeons = [
    'MUDr. Jan Novák',
    'MUDr. Eva Svobodová',
    'MUDr. Petr Dvořák',
    'MUDr. Marie Černá',
    'MUDr. Tomáš Procházka'
  ];

  return Array.from({ length: 20 }, (_, i) => {
    const status = i < 5 ? 'active' : i < 12 ? 'available' : statuses[Math.floor(Math.random() * statuses.length)];
    const utilization = Math.floor(Math.random() * 40) + 50;
    
    const room = {
      id: i + 1,
      name: `Operační sál ${i + 1}`,
      building: i < 10 ? 'Hlavní budova' : 'Pavilon B',
      status: status,
      utilization: utilization,
      scheduledToday: Math.floor(Math.random() * 5) + 2,
    };

    if (status === 'active') {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - Math.floor(Math.random() * 4) - 1);
      
      const estimatedEnd = new Date(startTime);
      estimatedEnd.setHours(estimatedEnd.getHours() + Math.floor(Math.random() * 3) + 2);

      room.currentOperation = {
        type: operationTypes[Math.floor(Math.random() * operationTypes.length)],
        startTime: startTime.toISOString(),
        estimatedEnd: estimatedEnd.toISOString(),
        surgeon: surgeons[Math.floor(Math.random() * surgeons.length)],
        costs: {
          labor: Math.floor(Math.random() * 20000) + 10000,
          materials: Math.floor(Math.random() * 15000) + 5000,
          devices: Math.floor(Math.random() * 10000) + 3000,
          overhead: Math.floor(Math.random() * 5000) + 2000
        }
      };
    } else if (status === 'available' && Math.random() > 0.5) {
      const nextOp = new Date();
      nextOp.setHours(nextOp.getHours() + Math.floor(Math.random() * 3) + 1);
      
      room.nextOperation = {
        scheduledTime: nextOp.toISOString(),
        type: operationTypes[Math.floor(Math.random() * operationTypes.length)]
      };
    }

    return room;
  });
}
