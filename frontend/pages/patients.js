import { useState } from 'react';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import PatientList from '../components/patients/PatientList';
import PatientGenerator from '../components/patients/PatientGenerator';
import PatientDetailModal from '../components/patients/PatientDetailModal';
import { usePatients, useFHIRServerStatus } from '../lib/hooks/useFHIR';

const queryClient = new QueryClient();

function PatientsPageContent() {
  const { data: patientsData, isLoading, error } = usePatients();
  const { data: fhirStatus } = useFHIRServerStatus();
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const handlePatientClick = (patient) => {
    console.log('Patient clicked:', patient);
    setSelectedPatient(patient);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Načítám pacienty z FHIR serveru...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center bg-red-50 p-8 rounded-lg">
          <p className="text-red-600 text-lg font-semibold">Chyba při načítání pacientů</p>
          <p className="mt-2 text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  // Převést FHIR data na formát pro PatientList a přidat všechna data pro modal
  const patients = (patientsData || []).map(patient => ({
    id: patient.id,
    name: `${patient.first_name} ${patient.last_name}`,
    first_name: patient.first_name,
    last_name: patient.last_name,
    birthDate: patient.date_of_birth,
    date_of_birth: patient.date_of_birth,
    birthNumber: patient.birth_number,
    birth_number: patient.birth_number,
    diagnosis: patient.diagnosis,
    medical_history: patient.medical_history,
    status: 'scheduled',
    priority: 'normal',
    scheduledOperation: null,
    fhir_id: patient.fhir_id,
    fhir_resource_json: patient.fhir_resource_json,
    fhir_last_synced: patient.fhir_last_synced,
    operations: []
  }));

  return (
    <>
      <Head>
        <title>Pacienti - Medic Hub (FHIR)</title>
      </Head>

      <div className="space-y-4">
        {/* FHIR Server Status */}
        {fhirStatus && (
          <div className={`p-4 rounded-lg ${fhirStatus.connected ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${fhirStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm font-medium ${fhirStatus.connected ? 'text-green-800' : 'text-red-800'}`}>
                  FHIR Server: {fhirStatus.status}
                </span>
              </div>
              <button
                onClick={() => setShowGenerator(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Generovat pacienty
              </button>
            </div>
          </div>
        )}

        {/* Patient List */}
        <PatientList
          patients={patients}
          onPatientClick={handlePatientClick}
        />

        {/* Patient Generator Modal */}
        {showGenerator && (
          <PatientGenerator
            onClose={() => setShowGenerator(false)}
          />
        )}

        {/* Patient Detail Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 py-4">
              {/* Background overlay */}
              <div 
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={() => setSelectedPatient(null)}
              ></div>

              {/* Modal panel */}
              <div className="relative w-full max-w-4xl my-8 overflow-hidden text-left transition-all transform bg-white rounded-lg shadow-xl">
                <PatientDetailModal
                  patient={selectedPatient}
                  onClose={() => setSelectedPatient(null)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default function PatientsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <PatientsPageContent />
    </QueryClientProvider>
  );
}
