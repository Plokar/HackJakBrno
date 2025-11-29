import { useState } from 'react';
import { 
  MagnifyingGlassIcon, 
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  AcademicCapIcon 
} from '@heroicons/react/24/outline';

export default function StaffList({ staff = [], onStaffClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('all');

  const filteredStaff = staff.filter(person => {
    const matchesSearch = 
      person.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.id?.toString().includes(searchTerm) ||
      person.license_number?.includes(searchTerm);

    const matchesFilter = 
      filterSpecialization === 'all' || person.specialization === filterSpecialization;

    return matchesSearch && matchesFilter;
  });

  const specializations = [...new Set(staff.map(p => p.specialization).filter(Boolean))];

  const getAvailabilityBadge = (isActive) => {
    return isActive
      ? { label: 'Aktivní', color: 'bg-green-100 text-green-800' }
      : { label: 'Neaktivní', color: 'bg-red-100 text-red-800' };
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Evidence personálu</h2>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Hledat lékaře (jméno, číslo licence, ID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E00034] focus:border-transparent"
            />
          </div>

          {/* Specialization Filter */}
          <select
            value={filterSpecialization}
            onChange={(e) => setFilterSpecialization(e.target.value)}
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
            <option value="all">Všechny specializace</option>
            {specializations.map(spec => (
              <option key={spec} value={spec}>{spec || 'Bez specializace'}</option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        <p className="mt-4 text-sm text-gray-600">
          Zobrazeno {filteredStaff.length} z {staff.length} lékařů
        </p>
      </div>

      {/* Staff Table */}
      <div className="overflow-x-auto">
        {filteredStaff.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lékař
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specializace
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Číslo licence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hodinová sazba
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stav
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.map((person) => {
                const availabilityBadge = getAvailabilityBadge(person.is_active);

                return (
                  <tr
                    key={person.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onStaffClick && onStaffClick(person)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="rounded-full p-2 mr-3" style={{ backgroundColor: '#fce7ed' }}>
                          <UserIcon className="h-6 w-6" style={{ color: '#E00034' }} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {person.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {person.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <AcademicCapIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {person.specialization || 'Bez specializace'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {person.license_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {person.hourly_rate ? `${person.hourly_rate} Kč/h` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${availabilityBadge.color}`}>
                        {availabilityBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStaffClick && onStaffClick(person);
                        }}
                        className="transition-colors hover:opacity-80" style={{ color: '#E00034' }}
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
            <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Žádní lékaři nenalezeni</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ? 'Zkuste změnit vyhledávací kritéria' : 'Začněte přidáním prvního lékaře'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredStaff.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Zobrazeno <span className="font-medium">{filteredStaff.length}</span> lékařů
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
