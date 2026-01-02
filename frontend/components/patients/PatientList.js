import { useState } from 'react';
import { 
  MagnifyingGlassIcon, 
  UserCircleIcon,
  PhoneIcon,
  CalendarIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';

export default function PatientList({ patients = [], onPatientClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.birthNumber?.includes(searchTerm) ||
      patient.id?.toString().includes(searchTerm);

    const matchesFilter = 
      filterStatus === 'all' || patient.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusBadge = (status) => {
    const config = {
      scheduled: { label: 'Naplánováno', color: 'bg-purple-100 text-purple-800' },
      pending_approval: { label: 'Čeká na schválení', color: 'bg-orange-100 text-orange-800' },
      in_progress: { label: 'Probíhá', color: 'bg-blue-100 text-blue-800' },
      in_operation: { label: 'V operaci', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Dokončeno', color: 'bg-green-100 text-green-800' },
      urgent: { label: 'Urgentní', color: 'bg-red-100 text-red-800' },
      post_op: { label: 'Po operaci', color: 'bg-yellow-100 text-yellow-800' },
      discharged: { label: 'Propuštěn', color: 'bg-gray-100 text-gray-800' },
    };
    return config[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  const getPriorityBadge = (priority) => {
    const config = {
      urgent: { label: 'Urgentní', color: 'bg-red-100 text-red-800 border-red-300' },
      high: { label: 'Vysoká', color: 'bg-orange-100 text-orange-800 border-orange-300' },
      normal: { label: 'Normální', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    };
    return config[priority] || config.normal;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Evidence pacientů</h2>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Hledat pacienta (jméno, rodné číslo, ID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-4 pr-10 py-2 border-2 rounded-lg appearance-none bg-white focus:ring-2 focus:border-transparent"
            style={{ 
              borderColor: '#E00034',
              '--tw-ring-color': '#E00034',
              backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", 
              backgroundPosition: 'right 0.5rem center', 
              backgroundRepeat: 'no-repeat', 
              backgroundSize: '1.5em 1.5em'
            }}
          >
            <option value="all">Všechny stavy</option>
            <option value="scheduled">Naplánováno</option>
            <option value="pending_approval">Čeká na schválení</option>
            <option value="in_progress">Probíhá</option>
            <option value="completed">Dokončeno</option>
            <option value="urgent">Urgentní</option>
            <option value="in_operation">V operaci</option>
            <option value="post_op">Po operaci</option>
            <option value="discharged">Propuštěni</option>
          </select>
        </div>

        {/* Results Count */}
        <p className="mt-4 text-sm text-gray-600">
          Zobrazeno {filteredPatients.length} z {patients.length} pacientů
        </p>
      </div>

      {/* Patients Table */}
      <div className="overflow-x-auto">
        {filteredPatients.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pacient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Věk / Rodné číslo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diagnóza
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stav
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priorita
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operace
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map((patient) => {
                const statusBadge = getStatusBadge(patient.status);
                const priorityBadge = getPriorityBadge(patient.priority);
                const age = calculateAge(patient.birthDate);

                return (
                  <tr
                    key={patient.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onPatientClick && onPatientClick(patient)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserCircleIcon className="h-10 w-10 text-blue-500 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {patient.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {patient.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {age ? `${age} let` : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {patient.birthNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {patient.diagnosis || 'Nenastaveno'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${priorityBadge.color}`}>
                        {priorityBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.scheduledOperation ? (
                        <div className="text-sm">
                          <div className="text-gray-900 font-medium">
                            {new Date(patient.scheduledOperation.date).toLocaleDateString('cs-CZ')}
                          </div>
                          <div className="text-gray-500">
                            {patient.scheduledOperation.time}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Neplánováno</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPatientClick && onPatientClick(patient);
                        }}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <UserCircleIcon className="h-16 w-16 text-blue-300 mx-auto mb-3" />
            <p className="text-gray-500">Žádní pacienti nenalezeni</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ? 'Zkuste změnit vyhledávací kritéria' : 'Začněte přidáním prvního pacienta'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredPatients.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Zobrazeno <span className="font-medium">{filteredPatients.length}</span> pacientů
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
              Předchozí
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
              Další
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
