import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function AddOperationModal({ isOpen, onClose, onSubmit, rooms = [], doctors = [], initialTimeSlot = null, currentRole = 'doctor' }) {
  const isDoctor = currentRole === 'doctor';
  const isAdmin = currentRole === 'admin';
  const isNurse = currentRole === 'nurse';
  
  const [formData, setFormData] = useState({
    // Operation info
    operationType: '',
    operatingRoomId: '',
    primaryDoctorId: '',
    scheduledStart: '',
    scheduledEnd: '',
    isEmergency: false,
    notes: '',
    
    // Patient info
    patientId: '',  // ID pacienta pro načtení z databáze
    patientFirstName: '',
    patientLastName: '',
    patientBirthNumber: '',
    patientDateOfBirth: '',
    patientDiagnosis: '',
    patientMedicalHistory: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [patientLoadMessage, setPatientLoadMessage] = useState('');
  const [isPatientLoaded, setIsPatientLoaded] = useState(false);

  // Funkce pro formátování data pro datetime-local input
  const formatDateTimeLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Předvyplnit časy a sál z vybraného časového úseku
  useEffect(() => {
    if (initialTimeSlot && isOpen) {
      setFormData(prev => ({
        ...prev,
        scheduledStart: formatDateTimeLocal(initialTimeSlot.start),
        scheduledEnd: formatDateTimeLocal(initialTimeSlot.end),
        operatingRoomId: initialTimeSlot.roomId || prev.operatingRoomId  // Předvyplnit sál, pokud je vybrán
      }));
    }
  }, [initialTimeSlot, isOpen]);

  const operationTypes = [
    'Laparoskopická cholecystektomie',
    'Arthroskopie kolena',
    'Katetrizace srdce',
    'Appendektomie',
    'Herniotomie',
    'Endoskopické vyšetření',
    'Bypassová operace',
    'Náhrada kyčelního kloubu',
    'Artroskopie ramene',
    'Jiná operace'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Pokud se mění ID pacienta, resetovat stav načteného pacienta
    if (name === 'patientId') {
      setIsPatientLoaded(false);
      setPatientLoadMessage('');
    }
  };

  const handleLoadPatient = async () => {
    const patientId = formData.patientId.trim();
    if (!patientId) {
      setPatientLoadMessage('Zadejte ID pacienta');
      return;
    }

    setIsLoadingPatient(true);
    setPatientLoadMessage('');

    try {
      const patient = await api.patients.get(parseInt(patientId));
      
      // Doplnit údaje o pacientovi
      setFormData(prev => ({
        ...prev,
        patientFirstName: patient.first_name,
        patientLastName: patient.last_name,
        patientBirthNumber: patient.birth_number,
        patientDateOfBirth: patient.date_of_birth,
        patientDiagnosis: patient.diagnosis,
        patientMedicalHistory: patient.medical_history || ''
      }));
      
      setIsPatientLoaded(true);
      setPatientLoadMessage('Pacient nalezen a nacten');
      
      // Vymazat případné chyby
      setErrors(prev => ({
        ...prev,
        patientId: '',
        patientFirstName: '',
        patientLastName: '',
        patientBirthNumber: '',
        patientDateOfBirth: '',
        patientDiagnosis: ''
      }));
    } catch (error) {
      if (error.status === 404) {
        setPatientLoadMessage('Pacient nenalezen');
        setIsPatientLoaded(false);
      } else {
        setPatientLoadMessage(`Chyba: ${error.message}`);
        setIsPatientLoaded(false);
      }
    } finally {
      setIsLoadingPatient(false);
    }
  };

  const resetForm = () => {
    setFormData({
      operationType: '',
      operatingRoomId: '',
      primaryDoctorId: '',
      scheduledStart: '',
      scheduledEnd: '',
      isEmergency: false,
      notes: '',
      patientId: '',
      patientFirstName: '',
      patientLastName: '',
      patientBirthNumber: '',
      patientDateOfBirth: '',
      patientDiagnosis: '',
      patientMedicalHistory: ''
    });
    setErrors({});
    setIsPatientLoaded(false);
    setPatientLoadMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const newErrors = {};

    // Doktor vyplňuje jen pacienta a diagnostiku
    if (isDoctor) {
      // Pokud není načten existující pacient, vyžadovat údaje pro vytvoření nového
      if (!isPatientLoaded) {
        if (!formData.patientFirstName) newErrors.patientFirstName = 'Zadejte jméno pacienta';
        if (!formData.patientLastName) newErrors.patientLastName = 'Zadejte příjmení pacienta';
        if (!formData.patientBirthNumber) newErrors.patientBirthNumber = 'Zadejte rodné číslo';
        if (!formData.patientDateOfBirth) newErrors.patientDateOfBirth = 'Zadejte datum narození';
        if (!formData.patientDiagnosis) newErrors.patientDiagnosis = 'Zadejte diagnózu';
      } else {
        // Pokud je načten existující pacient, stačí ID
        if (!formData.patientId) newErrors.patientId = 'Načtěte pacienta podle ID';
      }
    }
    
    // Sestra vyplňuje typ operace a personál
    if (isNurse) {
      if (!formData.operationType) newErrors.operationType = 'Vyberte typ operace';
      if (!formData.primaryDoctorId) newErrors.primaryDoctorId = 'Vyberte primárního lékaře';
    }
    
    // Admin potvrzuje datum a sál
    if (isAdmin) {
      if (!formData.operatingRoomId) newErrors.operatingRoomId = 'Vyberte operační sál';
      if (!formData.scheduledStart) newErrors.scheduledStart = 'Zadejte začátek operace';
      if (!formData.scheduledEnd) newErrors.scheduledEnd = 'Zadejte konec operace';
      
      // Check if end time is after start time
      if (formData.scheduledStart && formData.scheduledEnd) {
        const start = new Date(formData.scheduledStart);
        const end = new Date(formData.scheduledEnd);
        if (end <= start) {
          newErrors.scheduledEnd = 'Konec operace musí být po začátku';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error submitting operation:', error);
      setErrors({ submit: 'Chyba při ukládání operace. Zkuste to prosím znovu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#C21533] to-[#8f0f26] px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {isDoctor && 'Vytvořit žádost o operaci'}
                {isAdmin && 'Schválit operaci'}
                {isNurse && 'Přidat detaily operace'}
              </h3>
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {errors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errors.submit}
              </div>
            )}

            {/* Operation Information Section - pouze pro sestru */}
            {isNurse && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">⚕️</span>
                Informace o operaci
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Typ operace <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="operationType"
                    value={formData.operationType}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      errors.operationType ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Vyberte typ operace</option>
                    {operationTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.operationType && (
                    <p className="mt-1 text-xs text-red-500">{errors.operationType}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operační sál <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="operatingRoomId"
                    value={formData.operatingRoomId}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      errors.operatingRoomId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Vyberte operační sál</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                  {errors.operatingRoomId && (
                    <p className="mt-1 text-xs text-red-500">{errors.operatingRoomId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primární lékař <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="primaryDoctorId"
                    value={formData.primaryDoctorId}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      errors.primaryDoctorId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Vyberte lékaře</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                  {errors.primaryDoctorId && (
                    <p className="mt-1 text-xs text-red-500">{errors.primaryDoctorId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Začátek operace <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledStart"
                    value={formData.scheduledStart}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      errors.scheduledStart ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.scheduledStart && (
                    <p className="mt-1 text-xs text-red-500">{errors.scheduledStart}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Konec operace <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledEnd"
                    value={formData.scheduledEnd}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      errors.scheduledEnd ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.scheduledEnd && (
                    <p className="mt-1 text-xs text-red-500">{errors.scheduledEnd}</p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isEmergency"
                    checked={formData.isEmergency}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#C21533] border-gray-300 rounded focus:ring-[#C21533]"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    Urgentní operace
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poznámky
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent"
                    placeholder="Dodatečné informace o operaci..."
                  ></textarea>
                </div>
              </div>
            </div>
            )}

            {/* Scheduling Section - pouze pro admina */}
            {isAdmin && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">📅</span>
                Schválení a plánování
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operační sál <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="operatingRoomId"
                    value={formData.operatingRoomId}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.operatingRoomId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Vyberte operační sál</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                  {errors.operatingRoomId && (
                    <p className="mt-1 text-xs text-red-500">{errors.operatingRoomId}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Začátek operace <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledStart"
                    value={formData.scheduledStart}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.scheduledStart ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.scheduledStart && (
                    <p className="mt-1 text-xs text-red-500">{errors.scheduledStart}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Konec operace <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledEnd"
                    value={formData.scheduledEnd}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.scheduledEnd ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.scheduledEnd && (
                    <p className="mt-1 text-xs text-red-500">{errors.scheduledEnd}</p>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Patient Information Section - pouze pro doktora */}
            {isDoctor && (
            <div className="mb-6 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">👤</span>
                Informace o pacientovi
              </h4>
              
              {/* ID pacienta a tlačítko pro načtení */}
              <div className="mb-4 p-4 bg-[#fce7ed] border border-[#C21533] rounded-lg">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID pacienta
                    </label>
                    <input
                      type="text"
                      name="patientId"
                      value={formData.patientId}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                        errors.patientId ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Zadejte ID pacienta pro načtení"
                      disabled={isPatientLoaded}
                    />
                    {errors.patientId && (
                      <p className="mt-1 text-xs text-red-500">{errors.patientId}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadPatient}
                    disabled={isLoadingPatient || !formData.patientId || isPatientLoaded}
                    className="px-4 py-2 bg-[#C21533] text-white rounded-lg hover:bg-[#8f0f26] transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoadingPatient ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Nacitam...
                      </>
                    ) : (
                      <>
                        Nacist pacienta
                      </>
                    )}
                  </button>
                </div>
                {patientLoadMessage && (
                  <div className={`mt-2 text-sm font-medium ${
                    isPatientLoaded ? 'text-green-700' : 
                    patientLoadMessage.includes('nenalezen') ? 'text-orange-700' : 
                    'text-red-700'
                  }`}>
                    {patientLoadMessage}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-600">
                  Nechte prazdne pokud chcete vytvorit noveho pacienta
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jméno {!isPatientLoaded && <span className="text-red-500">*</span>}
                    {isPatientLoaded && <span className="ml-2 text-xs text-green-600">(načteno z databáze)</span>}
                  </label>
                  <input
                    type="text"
                    name="patientFirstName"
                    value={formData.patientFirstName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      errors.patientFirstName ? 'border-red-300' : 'border-gray-300'
                    } ${isPatientLoaded ? 'bg-green-50' : ''}`}
                    placeholder="Jan"
                    disabled={isPatientLoaded}
                  />
                  {errors.patientFirstName && (
                    <p className="mt-1 text-xs text-red-500">{errors.patientFirstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Příjmení {!isPatientLoaded && <span className="text-red-500">*</span>}
                    {isPatientLoaded && <span className="ml-2 text-xs text-green-600">(načteno z databáze)</span>}
                  </label>
                  <input
                    type="text"
                    name="patientLastName"
                    value={formData.patientLastName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      errors.patientLastName ? 'border-red-300' : 'border-gray-300'
                    } ${isPatientLoaded ? 'bg-green-50' : ''}`}
                    placeholder="Novák"
                    disabled={isPatientLoaded}
                  />
                  {errors.patientLastName && (
                    <p className="mt-1 text-xs text-red-500">{errors.patientLastName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rodné číslo {!isPatientLoaded && <span className="text-red-500">*</span>}
                    {isPatientLoaded && <span className="ml-2 text-xs text-green-600">(načteno z databáze)</span>}
                  </label>
                  <input
                    type="text"
                    name="patientBirthNumber"
                    value={formData.patientBirthNumber}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      errors.patientBirthNumber ? 'border-red-300' : 'border-gray-300'
                    } ${isPatientLoaded ? 'bg-green-50' : ''}`}
                    placeholder="123456/7890"
                    disabled={isPatientLoaded}
                  />
                  {errors.patientBirthNumber && (
                    <p className="mt-1 text-xs text-red-500">{errors.patientBirthNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Datum narození {!isPatientLoaded && <span className="text-red-500">*</span>}
                    {isPatientLoaded && <span className="ml-2 text-xs text-green-600">(načteno z databáze)</span>}
                  </label>
                  <input
                    type="date"
                    name="patientDateOfBirth"
                    value={formData.patientDateOfBirth}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      errors.patientDateOfBirth ? 'border-red-300' : 'border-gray-300'
                    } ${isPatientLoaded ? 'bg-green-50' : ''}`}
                    disabled={isPatientLoaded}
                  />
                  {errors.patientDateOfBirth && (
                    <p className="mt-1 text-xs text-red-500">{errors.patientDateOfBirth}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnóza {!isPatientLoaded && <span className="text-red-500">*</span>}
                    {isPatientLoaded && <span className="ml-2 text-xs text-green-600">(načteno z databáze)</span>}
                  </label>
                  <textarea
                    name="patientDiagnosis"
                    value={formData.patientDiagnosis}
                    onChange={handleChange}
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      errors.patientDiagnosis ? 'border-red-300' : 'border-gray-300'
                    } ${isPatientLoaded ? 'bg-green-50' : ''}`}
                    placeholder="Popis diagnózy..."
                    disabled={isPatientLoaded}
                  ></textarea>
                  {errors.patientDiagnosis && (
                    <p className="mt-1 text-xs text-red-500">{errors.patientDiagnosis}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zdravotní historie
                    {isPatientLoaded && <span className="ml-2 text-xs text-green-600">(načteno z databáze)</span>}
                  </label>
                  <textarea
                    name="patientMedicalHistory"
                    value={formData.patientMedicalHistory}
                    onChange={handleChange}
                    rows={3}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C21533] focus:border-transparent ${
                      isPatientLoaded ? 'bg-green-50' : ''
                    }`}
                    placeholder="Předchozí zdravotní problémy, alergie, léky..."
                    disabled={isPatientLoaded}
                  ></textarea>
                </div>
              </div>
            </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={isSubmitting}
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#C21533] text-white rounded-lg hover:bg-[#8f0f26] transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Ukládám...' : (
                  isDoctor ? 'Vytvořit žádost' :
                  isAdmin ? 'Schválit operaci' :
                  isNurse ? 'Uložit detaily' :
                  'Uložit operaci'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
