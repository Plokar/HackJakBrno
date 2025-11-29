import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function OperationDetailModal({ isOpen, onClose, operationId }) {
  const [operation, setOperation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && operationId) {
      fetchOperationDetails();
    }
  }, [isOpen, operationId]);

  const fetchOperationDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.operations.get(operationId);
      setOperation(data);
    } catch (err) {
      console.error('Error fetching operation details:', err);
      setError('Nepodařilo se načíst data operace');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      scheduled: { label: 'Naplánováno', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'Probíhá', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Dokončeno', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Zrušeno', color: 'bg-red-100 text-red-800' }
    };
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const calculateDuration = () => {
    if (!operation) return '-';
    const start = new Date(operation.scheduled_start);
    const end = new Date(operation.scheduled_end);
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center">
                <span className="text-2xl mr-3">⚕️</span>
                Detail operace
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="ml-4 text-gray-600">Načítám data...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && operation && (
              <div className="space-y-6">
                {/* Status a základní info */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">{operation.operation_type}</h4>
                    <p className="text-sm text-gray-500 mt-1">ID operace: #{operation.id}</p>
                  </div>
                  {getStatusBadge(operation.status)}
                </div>

                {/* Časy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Naplánovaný čas
                    </h5>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-blue-700">Začátek</p>
                        <p className="text-sm font-medium text-blue-900">{formatDateTime(operation.scheduled_start)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700">Konec</p>
                        <p className="text-sm font-medium text-blue-900">{formatDateTime(operation.scheduled_end)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700">Plánovaná délka</p>
                        <p className="text-sm font-medium text-blue-900">{calculateDuration()}</p>
                      </div>
                    </div>
                  </div>

                  {(operation.actual_start || operation.actual_end) && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Skutečný čas
                      </h5>
                      <div className="space-y-2">
                        {operation.actual_start && (
                          <div>
                            <p className="text-xs text-green-700">Zahájení</p>
                            <p className="text-sm font-medium text-green-900">{formatDateTime(operation.actual_start)}</p>
                          </div>
                        )}
                        {operation.actual_end && (
                          <div>
                            <p className="text-xs text-green-700">Ukončení</p>
                            <p className="text-sm font-medium text-green-900">{formatDateTime(operation.actual_end)}</p>
                          </div>
                        )}
                        {operation.duration_hours > 0 && (
                          <div>
                            <p className="text-xs text-green-700">Skutečná délka</p>
                            <p className="text-sm font-medium text-green-900">{operation.duration_hours.toFixed(2)} hodin</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pacient */}
                {operation.patient && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="text-xl mr-2">👤</span>
                      Informace o pacientovi
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Jméno a příjmení</p>
                        <p className="text-sm font-medium text-gray-900">
                          {operation.patient.first_name} {operation.patient.last_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Rodné číslo</p>
                        <p className="text-sm font-medium text-gray-900">{operation.patient.birth_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Datum narození</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(operation.patient.date_of_birth)}</p>
                      </div>
                    </div>
                    {operation.patient.diagnosis && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-600">Diagnóza</p>
                        <p className="text-sm text-gray-900">{operation.patient.diagnosis}</p>
                      </div>
                    )}
                    {operation.patient.medical_history && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-600">Zdravotní historie</p>
                        <p className="text-sm text-gray-900">{operation.patient.medical_history}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Operační sál */}
                {operation.operating_room && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-purple-900 mb-3 flex items-center">
                      <span className="text-xl mr-2">🏥</span>
                      Operační sál
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-purple-700">Název</p>
                        <p className="text-sm font-medium text-purple-900">{operation.operating_room.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-purple-700">Číslo sálu</p>
                        <p className="text-sm font-medium text-purple-900">{operation.operating_room.room_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-purple-700">Patro</p>
                        <p className="text-sm font-medium text-purple-900">{operation.operating_room.floor}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lékaři */}
                <div className="bg-teal-50 rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-teal-900 mb-3 flex items-center">
                    <span className="text-xl mr-2">👨‍⚕️</span>
                    Lékařský tým
                  </h5>
                  {operation.primary_doctor && (
                    <div className="mb-4">
                      <p className="text-xs text-teal-700 mb-2">Primární lékař</p>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-sm font-medium text-teal-900">
                          Dr. {operation.primary_doctor.first_name} {operation.primary_doctor.last_name}
                        </p>
                        <p className="text-xs text-teal-700">{operation.primary_doctor.specialization}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Licence: {operation.primary_doctor.license_number}
                        </p>
                      </div>
                    </div>
                  )}
                  {operation.assisting_doctors && operation.assisting_doctors.length > 0 && (
                    <div>
                      <p className="text-xs text-teal-700 mb-2">Asistující lékaři</p>
                      <div className="space-y-2">
                        {operation.assisting_doctors.map((doctor, index) => (
                          <div key={index} className="bg-white rounded-lg p-3">
                            <p className="text-sm font-medium text-teal-900">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </p>
                            <p className="text-xs text-teal-700">{doctor.specialization}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Poznámky */}
                {operation.notes && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Poznámky
                    </h5>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{operation.notes}</p>
                  </div>
                )}

                {/* Urgentnost */}
                {operation.is_emergency && (
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-red-900">Urgentní operace</p>
                        <p className="text-xs text-red-700">Tato operace vyžaduje prioritní ošetření</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Zavřít
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
