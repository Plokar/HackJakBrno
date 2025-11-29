import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  ClockIcon, 
  UserIcon,
  CalendarIcon,
  BeakerIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

export default function RoomDetailModal({ isOpen, onClose, roomId }) {
  const router = useRouter();
  const [roomDetail, setRoomDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && roomId) {
      fetchRoomDetail();
      // Auto-refresh every 10 seconds
      const interval = setInterval(fetchRoomDetail, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, roomId]);

  const fetchRoomDetail = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const url = apiUrl.startsWith('/api/proxy') 
        ? `/api/proxy/medic/rooms/${roomId}/detail/`
        : `${apiUrl}/medic/rooms/${roomId}/detail/`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Nepodařilo se načíst detail sálu');
      }

      const data = await response.json();
      console.log('Room detail loaded:', data);
      setRoomDetail(data);
      setError(null);
    } catch (err) {
      console.error('Room detail API Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      available: {
        label: 'Volný',
        bgColor: 'bg-[#EAEAEA]',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-400',
        badgeBgColor: 'bg-[#666666]',
        badgeBorderColor: 'border-[#666666]'
      },
      active: {
        label: 'V provozu',
        bgColor: 'bg-[#fce7ed]',
        textColor: 'text-[#E00034]',
        borderColor: 'border-[#E00034]',
        badgeBgColor: 'bg-[#E00034]',
        badgeBorderColor: 'border-[#E00034]'
      },
      cleaning: {
        label: 'Úklid',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-400',
        badgeBgColor: 'bg-purple-600',
        badgeBorderColor: 'border-purple-600'
      },
      maintenance: {
        label: 'Údržba',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-400',
        badgeBgColor: 'bg-yellow-600',
        badgeBorderColor: 'border-yellow-600'
      }
    };
    return configs[status] || configs.available;
  };

  const formatDuration = (startTime) => {
    if (!startTime) return 'N/A';
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const formatTimeRemaining = (endTime) => {
    if (!endTime) return 'N/A';
    const end = new Date(endTime);
    const now = new Date();
    const diff = end - now;
    
    if (diff < 0) return 'Překročeno';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('cs-CZ', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const goToCalendar = () => {
    onClose();
    
    // Pokud existuje aktuální operace, naviguj s parametrem operace a sálu
    if (roomDetail?.currentOperation?.id) {
      router.push({
        pathname: '/calendar',
        query: { 
          operationId: roomDetail.currentOperation.id,
          roomId: roomId,
          highlight: 'true'
        }
      });
    } else {
      // Jinak jen naviguj na kalendář s filtrem sálu
      router.push({
        pathname: '/calendar',
        query: { roomId: roomId }
      });
    }
  };

  const statusConfig = roomDetail ? getStatusConfig(roomDetail.status) : {};

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                {/* Header */}
                <div className="px-6 py-4" style={{ background: 'linear-gradient(to right, #6D1F27, #E00034)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Dialog.Title className="text-2xl font-bold text-white">
                        {loading ? 'Načítám...' : roomDetail?.name || 'Detail operačního sálu'}
                      </Dialog.Title>
                      {roomDetail && (
                        <p className="mt-1 text-blue-100">
                          {roomDetail.building} • Číslo sálu: {roomDetail.room_number}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="ml-4 rounded-md bg-white bg-opacity-20 p-2 text-white hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white"
                      onClick={onClose}
                    >
                      <span className="sr-only">Zavřít</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  
                  {roomDetail && (
                    <div className="mt-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 text-white ${statusConfig.badgeBgColor} ${statusConfig.badgeBorderColor}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <div className="bg-red-100 text-red-800 rounded-lg p-4">
                        <p className="font-medium">{error}</p>
                        <button
                          onClick={fetchRoomDetail}
                          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Zkusit znovu
                        </button>
                      </div>
                    </div>
                  ) : roomDetail ? (
                    <div className="space-y-6">
                      {/* Current Operation Section */}
                      {roomDetail.currentOperation ? (
                        <div className="border-2 rounded-lg p-5 bg-[#fce7ed]" style={{ borderColor: '#E00034' }}>
                          <h3 className="text-lg font-bold mb-4 flex items-center" style={{ color: '#E00034' }}>
                            <ClockIcon className="h-5 w-5 mr-2" />
                            Probíhající operace
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoCard
                              icon={BeakerIcon}
                              label="Typ operace"
                              value={roomDetail.currentOperation.type}
                            />
                            <InfoCard
                              icon={UserIcon}
                              label="Pacient"
                              value={roomDetail.currentOperation.patient}
                              subtitle={`Rodné číslo: ${roomDetail.currentOperation.patient_birth_number || 'N/A'}`}
                            />
                            <InfoCard
                              icon={UserIcon}
                              label="Hlavní chirurg"
                              value={roomDetail.currentOperation.surgeon}
                              subtitle={roomDetail.currentOperation.surgeon_specialization}
                            />
                            <InfoCard
                              icon={ClockIcon}
                              label="Doba trvání"
                              value={formatDuration(roomDetail.currentOperation.startTime)}
                              subtitle={`Začátek: ${formatTime(roomDetail.currentOperation.startTime)}`}
                            />
                            <InfoCard
                              icon={ClockIcon}
                              label="Očekávaný konec"
                              value={formatTime(roomDetail.currentOperation.estimatedEnd)}
                              subtitle={`Zbývá: ${formatTimeRemaining(roomDetail.currentOperation.estimatedEnd)}`}
                            />
                            <InfoCard
                              icon={ChartBarIcon}
                              label="Priorita"
                              value={roomDetail.currentOperation.is_emergency ? 'URGENTNÍ' : 'Plánovaná'}
                              valueClass={roomDetail.currentOperation.is_emergency ? 'text-red-600 font-bold' : 'text-green-600'}
                            />
                          </div>

                          {/* Assisting Doctors */}
                          {roomDetail.currentOperation.assisting_doctors && roomDetail.currentOperation.assisting_doctors.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-opacity-30" style={{ borderColor: '#E00034' }}>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Asistující lékaři:</h4>
                              <div className="flex flex-wrap gap-2">
                                {roomDetail.currentOperation.assisting_doctors.map((doctor, idx) => (
                                  <span 
                                    key={idx}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white text-gray-700 border border-gray-300"
                                  >
                                    {doctor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {roomDetail.currentOperation.notes && (
                            <div className="mt-4 pt-4 border-t border-opacity-30" style={{ borderColor: '#E00034' }}>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                <DocumentTextIcon className="h-4 w-4 mr-1" />
                                Poznámky:
                              </h4>
                              <p className="text-sm text-gray-600 bg-white rounded p-3">
                                {roomDetail.currentOperation.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 rounded-lg border-2" style={{ backgroundColor: '#EAEAEA', borderColor: '#666666' }}>
                          <CheckCircleIcon className="h-16 w-16 mx-auto mb-3" style={{ color: '#666666' }} />
                          <h3 className="text-lg font-semibold text-gray-800">Sál je momentálně volný</h3>
                          <p className="text-sm text-gray-700 mt-2">Žádná operace právě neprobíhá</p>
                        </div>
                      )}

                      {/* Next Operations */}
                      {roomDetail.upcoming_operations && roomDetail.upcoming_operations.length > 0 && (
                        <div className="border-2 rounded-lg p-5" style={{ borderColor: '#E00034', backgroundColor: '#fce7ed' }}>
                          <h3 className="text-lg font-bold mb-4 flex items-center" style={{ color: '#E00034' }}>
                            <CalendarIcon className="h-5 w-5 mr-2" />
                            Nadcházející operace
                          </h3>
                          
                          <div className="space-y-3">
                            {roomDetail.upcoming_operations.map((op, idx) => (
                              <div 
                                key={idx}
                                className="bg-white rounded-lg p-4 border hover:shadow-md transition-shadow"
                                style={{ borderColor: '#E00034' }}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{op.type}</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Pacient: {op.patient}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Chirurg: {op.surgeon}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium" style={{ color: '#E00034' }}>
                                      {formatTime(op.scheduledTime)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Trvání: {op.estimated_duration}h
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Room Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <StatCard
                          label="Operací dnes"
                          value={roomDetail.operations_today || 0}
                          color="blue"
                        />
                        <StatCard
                          label="Využití dnes"
                          value={`${roomDetail.utilization_today || 0}%`}
                          color="green"
                        />
                        <StatCard
                          label="Operací tento týden"
                          value={roomDetail.operations_week || 0}
                          color="purple"
                        />
                        <StatCard
                          label="Kapacita"
                          value={roomDetail.capacity || 'N/A'}
                          color="gray"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={goToCalendar}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ backgroundColor: '#E00034' }}
                  >
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    Zobrazit v kalendáři
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    Zavřít
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

function InfoCard({ icon: Icon, label, value, subtitle, valueClass = '' }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm">
      <div className="flex items-start">
        {Icon && <Icon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className={`mt-1 text-sm font-semibold text-gray-900 truncate ${valueClass}`}>
            {value || 'N/A'}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800',
    gray: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
