import { useState } from 'react';
import { 
  UserCircleIcon, 
  XCircleIcon,
  CalendarIcon,
  DocumentTextIcon,
  IdentificationIcon,
  HeartIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  MagnifyingGlassCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { api } from '../../lib/api';

export default function PatientDetailModal({ patient, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!patient) return null;
  const activeOperation = patient.activeOperation || patient.active_operation || null;
  const operations = patient.operations || [];

  const tabs = [
    { id: 'overview', label: 'Přehled', icon: UserCircleIcon },
    { id: 'medical', label: 'Zdravotní informace', icon: HeartIcon },
    { id: 'operations', label: 'Historie operací', icon: ClipboardDocumentListIcon },
    { id: 'fhir', label: 'FHIR Data', icon: DocumentTextIcon },
    { id: 'ai', label: 'AI přehled', icon: SparklesIcon },
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

      {/* Active operation banner */}
      {activeOperation && (
        <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <ActiveOperationCard operation={activeOperation} />
        </div>
      )}

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
        {activeTab === 'overview' && <OverviewTab patient={patient} age={age} activeOperation={activeOperation} />}
        {activeTab === 'medical' && <MedicalTab patient={patient} />}
        {activeTab === 'operations' && <OperationsTab operations={operations} activeOperation={activeOperation} />}
        {activeTab === 'fhir' && <FHIRTab patient={patient} />}
        {activeTab === 'ai' && <AIInsightsTab patient={patient} />}
      </div>
    </div>
  );
}

function OverviewTab({ patient, age, activeOperation }) {
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

      {activeOperation && (
        <InfoCard title="Probíhající operace">
          <ActiveOperationCard operation={activeOperation} />
        </InfoCard>
      )}
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

function OperationsTab({ operations = [], activeOperation }) {
  if (operations.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Žádné operace v historii</p>
      </div>
    );
  }

  const renderStatusBadge = (status) => {
    const map = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      scheduled: 'bg-purple-100 text-purple-800',
      pending_approval: 'bg-orange-100 text-orange-800'
    };

    return classNames(
      'px-2 py-1 rounded-full text-xs font-medium',
      map[status] || 'bg-gray-100 text-gray-800'
    );
  };

  return (
    <div className="space-y-4">
      {activeOperation && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Aktuální operace</h3>
          <ActiveOperationCard operation={activeOperation} compact />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">
        Historie operací ({operations.length})
      </h3>
      {operations.map((operation) => {
        const dateRef = operation.actual_start || operation.scheduled_start || operation.date;
        const duration = operation.duration_hours ?? operation.duration;
        return (
          <div key={operation.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{operation.operation_type || operation.type || 'Operace'}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Chirurg: {operation.primary_doctor_name || operation.doctor || 'Neuvedeno'}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 flex-wrap gap-y-1">
                  <span>
                    {dateRef
                      ? new Date(dateRef).toLocaleDateString('cs-CZ')
                      : 'Datum N/A'}
                  </span>
                  {duration !== undefined && <span>Trvání: {Number(duration).toFixed(1)}h</span>}
                  {operation.room?.name && <span>Sál: {operation.room.name}</span>}
                </div>
              </div>
              <span className={renderStatusBadge(operation.status)}>
                {operation.status === 'completed' ? 'Dokončeno' :
                 operation.status === 'in_progress' ? 'Probíhá' :
                 operation.status === 'scheduled' ? 'Naplánováno' :
                 operation.status === 'pending_approval' ? 'Čeká na schválení' : 'Neznámý'}
              </span>
            </div>
          </div>
        );
      })}
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

function AIInsightsTab({ patient }) {
  const [question, setQuestion] = useState('Jaká byla poslední komplikace u tohoto pacienta?');
  const [results, setResults] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async (refresh = false) => {
    if (!patient?.id) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.patients.noteInsights(patient.id, {
        question,
        refresh,
        top_k: 4,
      });
      setResults(response.results || []);
      setMetadata({
        available: response.available,
        generatedAt: response.generated_at,
        refreshed: response.refreshed,
      });
    } catch (err) {
      setError(err.message || 'Nepodařilo se načíst AI přehled');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-red-500" />
          Zadání dotazu
        </label>
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-300 focus:outline-none"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Např. Jaké jsou klíčové perioperační události?"
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => runSearch(false)}
            disabled={loading || !question.trim()}
            className={classNames(
              'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              loading
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            )}
          >
            <MagnifyingGlassCircleIcon className="h-5 w-5 mr-2" />
            {loading ? 'Probíhá vyhledávání…' : 'Vyhledat'}
          </button>
          <button
            onClick={() => runSearch(true)}
            disabled={loading}
            className={classNames(
              'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              loading
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Synchronizovat z FHIR
          </button>
        </div>
        {metadata && (
          <div className="text-xs text-gray-500">
            Dostupné poznámky: {metadata.available} • Aktualizováno: {metadata.generatedAt
              ? new Date(metadata.generatedAt).toLocaleString('cs-CZ')
              : '—'}
            {metadata.refreshed && ' • Obnoveno z FHIR'}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <ExclamationTriangleIcon className="h-5 w-5" />
          {error}
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-lg">
          <SparklesIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Zatím nejsou dostupné žádné klinické poznámky. Zkuste synchronizaci nebo změňte dotaz.
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-10 text-sm text-gray-500">Načítám klinické poznámky…</div>
      )}

      {results.length > 0 && !loading && (
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.note_id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {result.category || 'Klinická poznámka'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {result.author || 'Neznámý autor'} •{' '}
                    {result.indexed_at ? new Date(result.indexed_at).toLocaleString('cs-CZ') : 'Datum neznámé'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  Relevance {(result.score * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">
                {result.excerpt} {result.excerpt?.length >= 600 && '…'}
              </p>
              {result.source_reference && (
                <p className="text-xs text-gray-500 mt-2">Zdroj: {result.source_reference}</p>
              )}
            </div>
          ))}
        </div>
      )}
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

function ActiveOperationCard({ operation, compact = false }) {
  const start = operation.actual_start || operation.scheduled_start;
  const end = operation.estimatedEnd || operation.scheduled_end || operation.actual_end;

  return (
    <div className={compact ? '' : 'bg-white rounded-lg p-4 border border-blue-100'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {operation.operation_type || operation.type || 'Operace'}
          </p>
          <p className="text-xs text-gray-500">
            Chirurg: {operation.surgeon || operation.primary_doctor_name || 'Neuvedeno'}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          {operation.is_emergency ? 'Urgentní' : 'Probíhá'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
        <div>
          <p className="uppercase tracking-wide text-[10px] text-gray-500">Začátek</p>
          <p className="font-semibold text-gray-900">
            {start ? new Date(start).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-[10px] text-gray-500">Odhadovaný konec</p>
          <p className="font-semibold text-gray-900">
            {end ? new Date(end).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-[10px] text-gray-500">Operační sál</p>
          <p className="font-semibold text-gray-900">
            {operation.room?.name || 'Neuvedeno'}
          </p>
        </div>
      </div>
    </div>
  );
}
