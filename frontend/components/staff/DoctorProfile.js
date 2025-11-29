import { useState } from 'react';
import { 
  UserIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon 
} from '@heroicons/react/24/outline';
import classNames from 'classnames';

export default function DoctorProfile({ doctor, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!doctor) return null;

  const tabs = [
    { id: 'overview', label: 'Přehled', icon: UserIcon },
    { id: 'schedule', label: 'Rozvrh', icon: CalendarDaysIcon },
    { id: 'operations', label: 'Historie operací', icon: ClockIcon },
  ];

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="p-6 text-white" style={{ background: 'linear-gradient(to right, #E00034, #6D1F27)' }}>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <UserIcon className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{doctor.name}</h2>
              <p className="text-white opacity-90">{doctor.specialization}</p>
              <div className="flex items-center mt-2 space-x-4">
                <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  {doctor.certifications?.length || 0} certifikace
                </span>
                <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  {doctor.yearsOfExperience || 0} let praxe
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-[#fce7ed] text-[#E00034]'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
        {activeTab === 'overview' && <OverviewTab doctor={doctor} />}
        {activeTab === 'schedule' && <ScheduleTab schedule={doctor.schedule} />}
        {activeTab === 'operations' && <OperationsHistoryTab operations={doctor.operations} />}
      </div>
    </div>
  );
}

function OverviewTab({ doctor }) {
  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard title="Kontaktní informace">
          <InfoRow label="Email" value={doctor.email || 'N/A'} />
          <InfoRow label="Telefon" value={doctor.phone || 'N/A'} />
          <InfoRow label="Oddělení" value={doctor.department || 'N/A'} />
        </InfoCard>

        <InfoCard title="Pracovní informace">
          <InfoRow label="Hodinová sazba" value={`${doctor.hourlyRate || 0} Kč`} />
          <InfoRow label="Pracovní úvazek" value={doctor.employmentType || 'Plný úvazek'} />
          <InfoRow label="Dostupnost" value={
            <span className={classNames(
              'px-2 py-1 rounded-full text-xs font-medium',
              doctor.isAvailable 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            )}>
              {doctor.isAvailable ? 'Dostupný' : 'Nedostupný'}
            </span>
          } />
        </InfoCard>
      </div>

      {/* Certifications */}
      {doctor.certifications && doctor.certifications.length > 0 && (
        <InfoCard title="Certifikace a kvalifikace">
          <div className="space-y-2">
            {doctor.certifications.map((cert, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{cert.name}</p>
                  {cert.issuedBy && (
                    <p className="text-sm text-gray-600">{cert.issuedBy}</p>
                  )}
                  {cert.validUntil && (
                    <p className="text-xs text-gray-500 mt-1">
                      Platné do: {new Date(cert.validUntil).toLocaleDateString('cs-CZ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox
          label="Celkem operací"
          value={doctor.statistics?.totalOperations || 0}
          color="blue"
        />
        <StatBox
          label="Tento měsíc"
          value={doctor.statistics?.operationsThisMonth || 0}
          color="green"
        />
        <StatBox
          label="Úspěšnost"
          value={`${doctor.statistics?.successRate || 0}%`}
          color="purple"
        />
        <StatBox
          label="Průměrná doba"
          value={`${doctor.statistics?.avgDuration || 0}h`}
          color="yellow"
        />
      </div>
    </div>
  );
}

function ScheduleTab({ schedule = [] }) {
  const daysOfWeek = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Týdenní rozvrh</h3>
      {daysOfWeek.map((day, index) => {
        const daySchedule = schedule.find(s => s.dayOfWeek === index + 1);
        
        return (
          <div key={day} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">{day}</h4>
              {daySchedule ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {daySchedule.startTime} - {daySchedule.endTime}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Aktivní
                  </span>
                </div>
              ) : (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                  Volno
                </span>
              )}
            </div>
            {daySchedule?.note && (
              <p className="text-sm text-gray-600 mt-2">{daySchedule.note}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OperationsHistoryTab({ operations = [] }) {
  if (operations.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Žádné operace v historii</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Historie operací ({operations.length})
      </h3>
      {operations.map((operation) => (
        <div key={operation.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{operation.type}</h4>
              <p className="text-sm text-gray-600 mt-1">
                Pacient: {operation.patientName}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>{new Date(operation.date).toLocaleDateString('cs-CZ')}</span>
                <span>Trvání: {operation.duration}h</span>
                <span>Sál: {operation.room}</span>
              </div>
            </div>
            <span className={classNames(
              'px-2 py-1 rounded-full text-xs font-medium',
              operation.status === 'completed' 
                ? 'bg-green-100 text-green-800'
                : operation.status === 'in_progress'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            )}>
              {operation.status === 'completed' ? 'Dokončeno' : 
               operation.status === 'in_progress' ? 'Probíhá' : 'Zrušeno'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
        {title}
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function StatBox({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    yellow: 'bg-yellow-50 text-yellow-700',
  };

  return (
    <div className={`${colors[color]} rounded-lg p-4 text-center`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1">{label}</p>
    </div>
  );
}
