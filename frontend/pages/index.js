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
      
      setRoomsData(rooms);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Dashboard API Error:', err);
      setError('Nepodařilo se načíst data operačních sálů');
      setRoomsData([]);
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
