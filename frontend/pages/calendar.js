import { useState, useEffect } from 'react';
import Head from 'next/head';
import OperationCalendar from '../components/calendar/OperationCalendar';
import AddOperationModal from '../components/calendar/AddOperationModal';
import { api } from '../lib/api';

export default function CalendarPage() {
  const [operations, setOperations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Načíst operace, sály a doktory
      const [operationsData, roomsData, doctorsData] = await Promise.all([
        api.operations.list().catch(() => []),
        api.operatingRooms.list().catch(() => []),
        api.doctors.list().catch(() => [])
      ]);

      // Transformovat operace do formátu pro kalendář
      const transformedOperations = operationsData.map(op => ({
        id: op.id,
        type: op.operation_type,
        scheduledStart: op.scheduled_start,
        scheduledEnd: op.scheduled_end,
        status: op.status,
        priority: op.is_emergency ? 'urgent' : 'normal',
        surgeon: op.doctor_name || 'Neznámý',
        room: {
          id: op.operating_room,
          name: op.room_name || `Sál ${op.operating_room}`
        },
        patient: {
          id: op.patient,
          name: op.patient_name || 'Pacient'
        },
        estimatedCost: 0
      }));

      setOperations(transformedOperations);
      setRooms(roomsData);
      setDoctors(doctorsData);
      setLoading(false);
    } catch (err) {
      console.error('Calendar API Error:', err);
      // Fallback k mock datům
      const mockOperations = generateMockOperations();
      const mockRooms = generateMockRooms();
      const mockDoctors = generateMockDoctors();
      setOperations(mockOperations);
      setRooms(mockRooms);
      setDoctors(mockDoctors);
      setLoading(false);
    }
  };

  const handleEventClick = (event) => {
    console.log('Event clicked:', event);
    // TODO: Open operation detail modal
  };

  const handleDateSelect = (selectInfo) => {
    console.log('Date selected:', selectInfo);
    // Uložit vybraný časový úsek
    setSelectedTimeSlot({
      start: selectInfo.start,
      end: selectInfo.end
    });
    setIsModalOpen(true);
  };

  const handleAddOperation = () => {
    // Reset vybraného času při ručním otevření modalu
    setSelectedTimeSlot(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTimeSlot(null);
  };

  const handleSubmitOperation = async (formData) => {
    try {
      // Vytvoření operace přes API
      const operationData = {
        operation_type: formData.operationType,
        operating_room_id: parseInt(formData.operatingRoomId),
        primary_doctor_id: parseInt(formData.primaryDoctorId),
        scheduled_start: formData.scheduledStart,
        scheduled_end: formData.scheduledEnd,
        is_emergency: formData.isEmergency,
        notes: formData.notes,
        patient_first_name: formData.patientFirstName,
        patient_last_name: formData.patientLastName,
        patient_birth_number: formData.patientBirthNumber,
        patient_date_of_birth: formData.patientDateOfBirth,
        patient_diagnosis: formData.patientDiagnosis,
        patient_medical_history: formData.patientMedicalHistory
      };

      await api.operations.create(operationData);
      
      // Znovu načíst operace
      await fetchData();
      
      // Zavřít modal
      setIsModalOpen(false);
      
      // Zobrazit úspěšnou zprávu
      alert('Operace byla úspěšně přidána!');
    } catch (error) {
      console.error('Error creating operation:', error);
      throw error;
    }
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
        rooms={rooms}
        onEventClick={handleEventClick}
        onDateSelect={handleDateSelect}
        onAddOperation={handleAddOperation}
      />

      <AddOperationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitOperation}
        rooms={rooms}
        doctors={doctors}
        initialTimeSlot={selectedTimeSlot}
      />
    </>
  );
}

function generateMockRooms() {
  return Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Operační sál ${i + 1}`,
    room_number: `S${String(i + 1).padStart(3, '0')}`,
    floor: Math.floor(i / 5) + 1,
    is_active: true
  }));
}

function generateMockDoctors() {
  const doctors = [
    { first_name: 'Jan', last_name: 'Novák', specialization: 'Chirurgie' },
    { first_name: 'Eva', last_name: 'Svobodová', specialization: 'Kardiologie' },
    { first_name: 'Petr', last_name: 'Dvořák', specialization: 'Ortopedie' },
    { first_name: 'Marie', last_name: 'Černá', specialization: 'Neurochirurgie' },
    { first_name: 'Tomáš', last_name: 'Procházka', specialization: 'Chirurgie' }
  ];

  return doctors.map((doc, i) => ({
    id: i + 1,
    ...doc,
    license_number: `L${String(i + 1).padStart(6, '0')}`,
    hourly_rate: 1500 + i * 200,
    is_active: true
  }));
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
