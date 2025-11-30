import { useState } from 'react';
import { 
  UserCircleIcon, 
  XCircleIcon,
  CalendarIcon,
  DocumentTextIcon,
  IdentificationIcon,
  HeartIcon,
  ClockIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import classNames from 'classnames';

export default function PatientDetailModal({ patient, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!patient) return null;

  const tabs = [
    { id: 'overview', label: 'Přehled', icon: UserCircleIcon },
    { id: 'medical', label: 'Zdravotní informace', icon: HeartIcon },
    { id: 'operations', label: 'Historie operací', icon: ClipboardDocumentListIcon },
    { id: 'fhir', label: 'FHIR Data', icon: DocumentTextIcon },
  ];

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

  const age = calculateAge(patient.birthDate || patient.date_of_birth);

  return (
    <div className="w-full max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6D1F27] to-[#E00034] p-6 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <UserCircleIcon className="h-12 w-12 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{patient.name || `${patient.first_name} ${patient.last_name}`}</h2>
              <p className="text-white opacity-90">ID: {patient.id} {patient.fhir_id && `| FHIR ID: ${patient.fhir_id}`}</p>
              <div className="flex items-center mt-2 space-x-4">
                {age && (
                  <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    {age} let
                  </span>
                )}
                {patient.birthNumber || patient.birth_number ? (
                  <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    RČ: {patient.birthNumber || patient.birth_number}
                  </span>
                ) : null}
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
                    ? 'bg-red-100 text-red-700'
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
        {activeTab === 'overview' && <OverviewTab patient={patient} age={age} />}
        {activeTab === 'medical' && <MedicalTab patient={patient} />}
        {activeTab === 'operations' && <OperationsTab operations={patient.operations} />}
        {activeTab === 'fhir' && <FHIRTab patient={patient} />}
      </div>
    </div>
  );
}

function OverviewTab({ patient, age }) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard title="Základní informace">
          <InfoRow label="Jméno" value={patient.name || `${patient.first_name} ${patient.last_name}`} />
          <InfoRow label="Věk" value={age ? `${age} let` : 'N/A'} />
          <InfoRow label="Datum narození" value={
            patient.birthDate || patient.date_of_birth 
              ? new Date(patient.birthDate || patient.date_of_birth).toLocaleDateString('cs-CZ')
              : 'N/A'
          } />
          <InfoRow label="Rodné číslo" value={patient.birthNumber || patient.birth_number || 'Neuvedeno'} />
        </InfoCard>

        <InfoCard title="Identifikace">
          <InfoRow label="ID pacienta" value={patient.id} />
          <InfoRow label="FHIR ID" value={patient.fhir_id || 'N/A'} />
          <InfoRow label="Poslední sync FHIR" value={
            patient.fhir_last_synced 
              ? new Date(patient.fhir_last_synced).toLocaleString('cs-CZ')
              : 'Nikdy'
          } />
        </InfoCard>
      </div>

      {/* Current Status */}
      <InfoCard title="Aktuální stav">
        <div className="space-y-3">
          <InfoRow 
            label="Status" 
            value={
              <span className={classNames(
                'px-3 py-1 rounded-full text-sm font-medium',
                patient.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                patient.status === 'in_operation' ? 'bg-green-100 text-green-800' :
                patient.status === 'post_op' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              )}>
                {patient.status === 'scheduled' ? 'Naplánováno' :
                 patient.status === 'in_operation' ? 'V operaci' :
                 patient.status === 'post_op' ? 'Po operaci' :
                 patient.status || 'Neznámý'}
              </span>
            } 
          />
          <InfoRow 
            label="Priorita" 
            value={
              <span className={classNames(
                'px-3 py-1 rounded-full text-sm font-medium border',
                patient.priority === 'urgent' ? 'bg-red-100 text-red-800 border-red-300' :
                patient.priority === 'high' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                'bg-blue-100 text-blue-800 border-blue-300'
              )}>
                {patient.priority === 'urgent' ? 'Urgentní' :
                 patient.priority === 'high' ? 'Vysoká' :
                 patient.priority === 'normal' ? 'Normální' : 'N/A'}
              </span>
            } 
          />
        </div>
      </InfoCard>
    </div>
  );
}

function MedicalTab({ patient }) {
  return (
    <div className="space-y-6">
      <InfoCard title="Diagnóza">
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">
            {patient.diagnosis || 'Žádná diagnóza'}
          </p>
        </div>
      </InfoCard>

      <InfoCard title="Zdravotní historie">
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">
            {patient.medical_history || patient.medicalHistory || 'Žádná zdravotní historie'}
          </p>
        </div>
      </InfoCard>
    </div>
  );
}

function OperationsTab({ operations = [] }) {
  if (operations.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
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
              <h4 className="font-medium text-gray-900">{operation.type || operation.operation_type}</h4>
              {operation.doctor && (
                <p className="text-sm text-gray-600 mt-1">
                  Lékař: {operation.doctor}
                </p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>
                  {operation.date 
                    ? new Date(operation.date).toLocaleDateString('cs-CZ')
                    : operation.scheduled_start
                    ? new Date(operation.scheduled_start).toLocaleDateString('cs-CZ')
                    : 'N/A'}
                </span>
                {operation.duration && <span>Trvání: {operation.duration}h</span>}
                {operation.room && <span>Sál: {operation.room}</span>}
              </div>
            </div>
            <span className={classNames(
              'px-2 py-1 rounded-full text-xs font-medium',
              operation.status === 'completed' 
                ? 'bg-green-100 text-green-800'
                : operation.status === 'in_progress'
                ? 'bg-blue-100 text-blue-800'
                : operation.status === 'scheduled'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-800'
            )}>
              {operation.status === 'completed' ? 'Dokončeno' : 
               operation.status === 'in_progress' ? 'Probíhá' : 
               operation.status === 'scheduled' ? 'Naplánováno' :
               operation.status || 'Neznámý'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FHIRTab({ patient }) {
  const fhirData = patient.fhir_resource_json;

  if (!fhirData) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Žádná FHIR data nejsou k dispozici</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">FHIR Resource Data</h3>
        <span className="text-sm text-gray-500">
          Resource Type: {fhirData.resourceType}
        </span>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
        <pre className="text-sm text-gray-700">
          {JSON.stringify(fhirData, null, 2)}
        </pre>
      </div>
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
    <div className="flex justify-between items-start">
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="text-sm font-medium text-gray-900 text-right ml-2">{value}</span>
    </div>
  );
}
