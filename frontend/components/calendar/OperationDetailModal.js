import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function OperationDetailModal({ isOpen, onClose, operationId, onOperationUpdate, currentRole = 'doctor' }) {
  const isDoctor = currentRole === 'doctor';
  const isAdmin = currentRole === 'admin';
  const isNurse = currentRole === 'nurse';
  
  const [operation, setOperation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleApproveOperation = async () => {
    if (!window.confirm('Opravdu chcete schválit tuto operaci?')) {
      return;
    }
    
    setActionLoading(true);
    try {
      await api.operations.approve(operationId, true, '');
      await fetchOperationDetails();
      if (onOperationUpdate) {
        await onOperationUpdate();
      }
      alert('Operace byla úspěšně schválena!');
    } catch (err) {
      console.error('Error approving operation:', err);
      alert('Chyba při schvalování operace: ' + (err.message || 'Neznámá chyba'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOperation = async () => {
    const reason = prompt('Zadejte důvod zamítnutí operace:');
    if (reason === null) {
      return; // Uživatel zrušil
    }
    
    if (!reason.trim()) {
      alert('Musíte zadat důvod zamítnutí');
      return;
    }
    
    if (!window.confirm('Opravdu chcete zamítnout tuto operaci? Operace bude trvale smazána.')) {
      return;
    }
    
    setActionLoading(true);
    try {
      await api.operations.approve(operationId, false, reason);
      if (onOperationUpdate) {
        await onOperationUpdate();
      }
      alert('Operace byla zamítnuta a smazána');
      onClose(); // Zavřít modal po úspěšném zamítnutí
    } catch (err) {
      console.error('Error rejecting operation:', err);
      alert('Chyba při zamítání operace: ' + (err.message || 'Neznámá chyba'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignStaff = async () => {
    // Pro jednoduchost zatím jen potvrzení - v budoucnu může být modal s výběrem personálu
    if (!window.confirm('Chcete přiřadit personál k této operaci?')) {
      return;
    }
    
    setActionLoading(true);
    try {
      // Zatím prázdné přiřazení - v budoucnu modal s výběrem
      await api.operations.assignStaff(operationId, {
        assisting_doctors: [],
        nurses: []
      });
      await fetchOperationDetails();
      if (onOperationUpdate) {
        await onOperationUpdate();
      }
      alert('Personál byl úspěšně přiřazen!');
    } catch (err) {
      console.error('Error assigning staff:', err);
      alert('Chyba při přiřazování personálu: ' + (err.message || 'Neznámá chyba'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditOperation = () => {
    // Zobrazit formulář pro úpravu operace
    alert('Funkce úpravy operace bude implementována v další verzi. Zde sestřička může doplnit:\n- Asistující lékaře\n- Sestry\n- Poznámky\n- Další parametry');
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
      draft: { label: 'Koncept', color: 'bg-gray-100 text-gray-800' },
      pending_approval: { label: 'Čeká na schválení', color: 'bg-orange-100 text-orange-800 border-2 border-orange-400' },
      approved: { label: 'Čeká na přiřazení personálu', color: 'bg-amber-100 text-amber-800 border-2 border-amber-400' },
      scheduled: { label: 'Naplánováno', color: 'bg-purple-100 text-purple-800' },
      in_progress: { label: 'Probíhá', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Dokončeno', color: 'bg-green-100 text-green-800' },
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
          <div className="px-6 py-4 bg-gradient-to-r from-[#A11D30] to-[#A11D30]">
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#A11D30' }}></div>
                <p className="ml-4 text-black">Načítám data...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-black-700">
                {error}
              </div>
            )}

            {!loading && !error && operation && (
              <div className="space-y-8">
                {/* Header Section - Operation Title and Status */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-black mb-2">{operation.operation_type}</h2>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-black">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          ID: #{operation.id}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDateTime(operation.scheduled_start)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(operation.status)}
                    </div>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Left Column - Patient & Room Info */}
                  <div className="space-y-6">
                    {/* Patient Information */}
                    {operation.patient && (
                      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center mb-4">
                          <div className="bg-blue-100 rounded-full p-2 mr-3">
                            <span className="text-2xl">👤</span>
                          </div>
                          <h3 className="text-lg font-semibold text-black">Informace o pacientovi</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Jméno a příjmení</p>
                            <p className="text-sm font-medium text-black mt-1">
                              {operation.patient.first_name} {operation.patient.last_name}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Rodné číslo</p>
                            <p className="text-sm font-medium text-black mt-1">{operation.patient.birth_number}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Datum narození</p>
                            <p className="text-sm font-medium text-black mt-1">{formatDate(operation.patient.date_of_birth)}</p>
                          </div>
                          {operation.patient.diagnosis && (
                            <div className="bg-gray-50 rounded-lg p-3 sm:col-span-2">
                              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Diagnóza</p>
                              <p className="text-sm text-black mt-1">{operation.patient.diagnosis}</p>
                            </div>
                          )}
                        </div>
                        {operation.patient.medical_history && (
                          <div className="mt-4 bg-amber-50 rounded-lg p-4 border-l-4 border-amber-400">
                            <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-1">Zdravotní historie</p>
                            <p className="text-sm text-amber-900">{operation.patient.medical_history}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Operating Room */}
                    {operation.operating_room && (
                      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center mb-4">
                          <div className="bg-green-100 rounded-full p-2 mr-3">
                            <span className="text-2xl">🏥</span>
                          </div>
                          <h3 className="text-lg font-semibold text-black">Operační sál</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Název</p>
                              <p className="text-sm font-medium text-black mt-1">{operation.operating_room.name}</p>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Číslo</p>
                              <p className="text-sm font-medium text-black mt-1">{operation.operating_room.room_number}</p>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Patro</p>
                              <p className="text-sm font-medium text-black mt-1">{operation.operating_room.floor}. patro</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Medical Team & Notes */}
                  <div className="space-y-6">
                    {/* Medical Team */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center mb-4">
                        <div className="bg-purple-100 rounded-full p-2 mr-3">
                          <span className="text-2xl">👨‍⚕️</span>
                        </div>
                        <h3 className="text-lg font-semibold text-black">Lékařský tým</h3>
                      </div>

                      {/* Primary Doctor */}
                      {operation.primary_doctor && (
                        <div className="mb-6">
                          <h4 className="text-sm font-medium text-purple-800 mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Primární lékař
                          </h4>
                          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                            <p className="text-base font-semibold text-black">
                              Dr. {operation.primary_doctor.first_name} {operation.primary_doctor.last_name}
                            </p>
                            <p className="text-sm text-purple-700 mt-1">{operation.primary_doctor.specialization}</p>
                            <p className="text-xs text-gray-600 mt-2">
                              Licence: {operation.primary_doctor.license_number}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Assisting Doctors */}
                      {operation.assisting_doctors && operation.assisting_doctors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-purple-800 mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Asistující lékaři
                          </h4>
                          <div className="space-y-3">
                            {operation.assisting_doctors.map((doctor, index) => (
                              <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <p className="text-sm font-medium text-black">
                                  Dr. {doctor.first_name} {doctor.last_name}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">{doctor.specialization}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {operation.notes && (
                      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center mb-4">
                          <div className="bg-yellow-100 rounded-full p-2 mr-3">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-black">Poznámky</h3>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400">
                          <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">{operation.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Emergency Indicator */}
                    {operation.is_emergency && (
                      <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 border border-red-200 border-l-8 border-l-red-500">
                        <div className="flex items-center">
                          <div className="bg-red-100 rounded-full p-3 mr-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-red-900">Urgentní operace</h3>
                            <p className="text-sm text-red-700 mt-1">Tato operace vyžaduje prioritní ošetření</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Information - Bottom Section */}
                {(operation.scheduled_start || operation.actual_start) && (
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center mb-6">
                      <div className="bg-indigo-100 rounded-full p-2 mr-3">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-black">Časové informace</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Scheduled Time */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Plánovaný čas
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                            <span className="text-xs font-medium text-blue-700">Začátek</span>
                            <span className="text-sm font-medium text-black">{formatDateTime(operation.scheduled_start)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                            <span className="text-xs font-medium text-blue-700">Konec</span>
                            <span className="text-sm font-medium text-black">{formatDateTime(operation.scheduled_end)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 bg-blue-100 rounded border-2 border-blue-300">
                            <span className="text-xs font-medium text-blue-800">Plánovaná délka</span>
                            <span className="text-sm font-bold text-blue-900">{calculateDuration()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actual Time */}
                      {(operation.actual_start || operation.actual_end) && (
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                          <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Skutečný čas
                          </h4>
                          <div className="space-y-3">
                            {operation.actual_start && (
                              <div className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                                <span className="text-xs font-medium text-green-700">Zahájení</span>
                                <span className="text-sm font-medium text-black">{formatDateTime(operation.actual_start)}</span>
                              </div>
                            )}
                            {operation.actual_end && (
                              <div className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                                <span className="text-xs font-medium text-green-700">Ukončení</span>
                                <span className="text-sm font-medium text-black">{formatDateTime(operation.actual_end)}</span>
                              </div>
                            )}
                            {operation.duration_hours > 0 && (
                              <div className="flex justify-between items-center py-2 px-3 bg-green-100 rounded border-2 border-green-300">
                                <span className="text-xs font-medium text-green-800">Skutečná délka</span>
                                <span className="text-sm font-bold text-green-900">{operation.duration_hours.toFixed(2)} hodin</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex justify-between items-center" style={{ backgroundColor: 'rgba(161,29,48,0.04)' }}>
            <div className="flex gap-3">
              {/* Admin může schválit nebo zamítnout operace čekající na schválení */}
              {isAdmin && operation && operation.status === 'pending_approval' && (
                <>
                  <button
                    onClick={handleApproveOperation}
                    disabled={actionLoading}
                    className="px-6 py-2 text-white rounded-lg transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ backgroundColor: '#A11D30' }}
                   >
                    {actionLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Schvaluji...
                      </>
                    ) : (
                      <>
                        ✅ Schválit operaci
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleRejectOperation}
                    disabled={actionLoading}
                    className="px-6 py-2 text-white rounded-lg transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ backgroundColor: '#A11D30' }}
                   >
                    {actionLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Zamítám...
                      </>
                    ) : (
                      <>
                        ❌ Zamítnout operaci
                      </>
                    )}
                  </button>
                </>
              )}
              
              {/* Sestra může upravit operaci (doplnit parametry) */}
              {isNurse && operation && (operation.status === 'approved' || operation.status === 'scheduled') && (
                <button
                  onClick={handleEditOperation}
                  disabled={actionLoading}
                  className="px-6 py-2 text-white rounded-lg hover:opacity-95 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ backgroundColor: '#A11D30' }}
                 >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  ✏️ Upravit operaci
                </button>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="px-6 py-2 text-white rounded-lg hover:opacity-95 transition-colors font-medium"
              style={{ backgroundColor: '#A11D30' }}
             >
               Zavřít
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 }
