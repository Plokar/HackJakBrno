import { useState, useEffect } from 'react';

export default function AddOperationModal({ isOpen, onClose, onSubmit, rooms = [], doctors = [], initialTimeSlot = null }) {
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
    patientFirstName: '',
    patientLastName: '',
    patientBirthNumber: '',
    patientDateOfBirth: '',
    patientDiagnosis: '',
    patientMedicalHistory: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Předvyplnit časy z vybraného časového úseku
  useEffect(() => {
    if (initialTimeSlot && isOpen) {
      setFormData(prev => ({
        ...prev,
        scheduledStart: formatDateTimeLocal(initialTimeSlot.start),
        scheduledEnd: formatDateTimeLocal(initialTimeSlot.end)
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
      patientFirstName: '',
      patientLastName: '',
      patientBirthNumber: '',
      patientDateOfBirth: '',
      patientDiagnosis: '',
      patientMedicalHistory: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const newErrors = {};

    // Operation validation
    if (!formData.operationType) newErrors.operationType = 'Vyberte typ operace';
    if (!formData.operatingRoomId) newErrors.operatingRoomId = 'Vyberte operační sál';
    if (!formData.primaryDoctorId) newErrors.primaryDoctorId = 'Vyberte primárního lékaře';
    if (!formData.scheduledStart) newErrors.scheduledStart = 'Zadejte začátek operace';
    if (!formData.scheduledEnd) newErrors.scheduledEnd = 'Zadejte konec operace';
    
    // Patient validation
    if (!formData.patientFirstName) newErrors.patientFirstName = 'Zadejte jméno pacienta';
    if (!formData.patientLastName) newErrors.patientLastName = 'Zadejte příjmení pacienta';
    if (!formData.patientBirthNumber) newErrors.patientBirthNumber = 'Zadejte rodné číslo';
    if (!formData.patientDateOfBirth) newErrors.patientDateOfBirth = 'Zadejte datum narození';
    if (!formData.patientDiagnosis) newErrors.patientDiagnosis = 'Zadejte diagnózu';

    // Check if end time is after start time
    if (formData.scheduledStart && formData.scheduledEnd) {
      const start = new Date(formData.scheduledStart);
      const end = new Date(formData.scheduledEnd);
      if (end <= start) {
        newErrors.scheduledEnd = 'Konec operace musí být po začátku';
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
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Přidat novou operaci
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

            {/* Operation Information Section */}
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                    Primární lékař <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="primaryDoctorId"
                    value={formData.primaryDoctorId}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isEmergency"
                    checked={formData.isEmergency}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dodatečné informace o operaci..."
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Patient Information Section */}
            <div className="mb-6 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">👤</span>
                Informace o pacientovi
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jméno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="patientFirstName"
                    value={formData.patientFirstName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.patientFirstName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Jan"
                  />
                  {errors.patientFirstName && (
                    <p className="mt-1 text-xs text-red-500">{errors.patientFirstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Příjmení <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="patientLastName"
                    value={formData.patientLastName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.patientLastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Novák"
                  />
                  {errors.patientLastName && (
                    <p className="mt-1 text-xs text-red-500">{errors.patientLastName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rodné číslo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="patientBirthNumber"
                    value={formData.patientBirthNumber}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.patientBirthNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="123456/7890"
                  />
                  {errors.patientBirthNumber && (
                    <p className="mt-1 text-xs text-red-500">{errors.patientBirthNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Datum narození <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="patientDateOfBirth"
                    value={formData.patientDateOfBirth}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.patientDateOfBirth ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.patientDateOfBirth && (
                    <p className="mt-1 text-xs text-red-500">{errors.patientDateOfBirth}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnóza <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="patientDiagnosis"
                    value={formData.patientDiagnosis}
                    onChange={handleChange}
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.patientDiagnosis ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Popis diagnózy..."
                  ></textarea>
                  {errors.patientDiagnosis && (
                    <p className="mt-1 text-xs text-red-500">{errors.patientDiagnosis}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zdravotní historie
                  </label>
                  <textarea
                    name="patientMedicalHistory"
                    value={formData.patientMedicalHistory}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Předchozí zdravotní problémy, alergie, léky..."
                  ></textarea>
                </div>
              </div>
            </div>

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
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Ukládám...' : 'Uložit operaci'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
