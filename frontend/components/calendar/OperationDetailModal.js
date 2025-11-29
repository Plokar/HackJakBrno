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
      scheduled: { label: 'Naplánováno', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'Probíhá', color: 'bg-purple-100 text-purple-800' },
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
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(161,29,48,0.08)' }}>
                    <h5 className="text-sm font-semibold mb-3 flex items-center" style={{ color: '#6D1F27' }}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Naplánovaný čas
                    </h5>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs" style={{ color: '#6D1F27' }}>Začátek</p>
                        <p className="text-sm font-medium" style={{ color: '#6D1F27' }}>{formatDateTime(operation.scheduled_start)}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: '#6D1F27' }}>Konec</p>
                        <p className="text-sm font-medium" style={{ color: '#6D1F27' }}>{formatDateTime(operation.scheduled_end)}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: '#6D1F27' }}>Plánovaná délka</p>
                        <p className="text-sm font-medium" style={{ color: '#6D1F27' }}>{calculateDuration()}</p>
                      </div>
                    </div>
                  </div>

                  {(operation.actual_start || operation.actual_end) && (
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(161,29,48,0.08)' }}>
                      <h5 className="text-sm font-semibold mb-3 flex items-center" style={{ color: '#6D1F27' }}>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Skutečný čas
                      </h5>
                      <div className="space-y-2">
                        {operation.actual_start && (
                          <div>
                            <p className="text-xs" style={{ color: '#6D1F27' }}>Zahájení</p>
                            <p className="text-sm font-medium" style={{ color: '#6D1F27' }}>{formatDateTime(operation.actual_start)}</p>
                          </div>
                        )}
                        {operation.actual_end && (
                          <div>
                            <p className="text-xs" style={{ color: '#6D1F27' }}>Ukončení</p>
                            <p className="text-sm font-medium" style={{ color: '#6D1F27' }}>{formatDateTime(operation.actual_end)}</p>
                          </div>
                        )}
                        {operation.duration_hours > 0 && (
                          <div>
                            <p className="text-xs" style={{ color: '#6D1F27' }}>Skutečná délka</p>
                            <p className="text-sm font-medium" style={{ color: '#6D1F27' }}>{operation.duration_hours.toFixed(2)} hodin</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pacient */}
                {operation.patient && (
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(161,29,48,0.04)' }}>
                    <h5 className="text-sm font-semibold mb-3 flex items-center" style={{ color: '#6D1F27' }}>
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
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(161,29,48,0.08)' }}>
                    <h5 className="text-sm font-semibold mb-3 flex items-center" style={{ color: '#6D1F27' }}>
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
                <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(161,29,48,0.08)' }}>
                  <h5 className="text-sm font-semibold mb-3 flex items-center" style={{ color: '#6D1F27' }}>
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
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(161,29,48,0.08)' }}>
                    <h5 className="text-sm font-semibold mb-2 flex items-center" style={{ color: '#6D1F27' }}>
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
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(161,29,48,0.08)', borderLeft: '4px solid #A11D30' }}>
                    <div className="flex items-center">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#A11D30' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-black">Urgentní operace</p>
                        <p className="text-xs text-black">Tato operace vyžaduje prioritní ošetření</p>
                      </div>
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
