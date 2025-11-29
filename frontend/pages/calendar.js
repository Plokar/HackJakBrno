import { useState, useEffect } from 'react';
import Head from 'next/head';
import OperationCalendar from '../components/calendar/OperationCalendar';
import AddOperationModal from '../components/calendar/AddOperationModal';
import OperationDetailModal from '../components/calendar/OperationDetailModal';
import { api } from '../lib/api';

export default function CalendarPage() {
  const [operations, setOperations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedOperationId, setSelectedOperationId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Načíst operace, sály a doktory
      const [operationsResponse, roomsResponse, doctorsResponse] = await Promise.all([
        api.operations.list(),
        api.operatingRooms.list(),
        api.doctors.list()
      ]);

      // Backend může vracet buď pole, nebo objekt s results (paginace)
      const operationsData = Array.isArray(operationsResponse) ? operationsResponse : (operationsResponse.results || []);
      const roomsData = Array.isArray(roomsResponse) ? roomsResponse : (roomsResponse.results || []);
      const doctorsData = Array.isArray(doctorsResponse) ? doctorsResponse : (doctorsResponse.results || []);

      console.log('Načtená data:', {
        operationsCount: operationsData.length,
        roomsCount: roomsData.length,
        doctorsCount: doctorsData.length,
        sampleRoom: roomsData[0]
      });

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
      // V případě chyby zobrazit prázdný stav místo mock dat
      setOperations([]);
      setRooms([]);
      setDoctors([]);
      setLoading(false);
    }
  };

  const handleEventClick = (event) => {
    console.log('Event clicked:', event);
    setSelectedOperationId(event.id);
    setIsDetailModalOpen(true);
  };

  const handleDateSelect = (selectInfo) => {
    console.log('Date selected:', selectInfo);
    // Uložit vybraný časový úsek
    setSelectedTimeSlot({
      start: selectInfo.start,
      end: selectInfo.end
    });
    setIsAddModalOpen(true);
  };

  const handleAddOperation = () => {
    // Reset vybraného času při ručním otevření modalu
    setSelectedTimeSlot(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setSelectedTimeSlot(null);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedOperationId(null);
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
      setIsAddModalOpen(false);
      
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
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSubmit={handleSubmitOperation}
        rooms={rooms}
        doctors={doctors}
        initialTimeSlot={selectedTimeSlot}
      />

      <OperationDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        operationId={selectedOperationId}
      />
    </>
  );
}
