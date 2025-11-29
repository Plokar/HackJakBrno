import { useState } from 'react';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import StaffList from '../components/staff/StaffList';
import DoctorProfile from '../components/staff/DoctorProfile';
import { usePractitioners, useFHIRServerStatus } from '../lib/hooks/useFHIR';

const queryClient = new QueryClient();

function StaffPageContent() {
  const { data: practitionersData, isLoading, error } = usePractitioners();
  const { data: fhirStatus } = useFHIRServerStatus();
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const handleStaffClick = (doctor) => {
    console.log('Doctor clicked:', doctor);
    setSelectedDoctor(doctor);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Načítám personál z FHIR serveru...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center bg-red-50 p-8 rounded-lg">
          <p className="text-red-600 text-lg font-semibold">Chyba při načítání personálu</p>
          <p className="mt-2 text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  const staff = (practitionersData || []).map(doctor => ({
    id: doctor.id,
    name: `${doctor.first_name} ${doctor.last_name}`,
    first_name: doctor.first_name,
    last_name: doctor.last_name,
    specialization: doctor.specialization,
    license_number: doctor.license_number,
    hourly_rate: doctor.hourly_rate,
    is_active: doctor.is_active,
    fhir_id: doctor.fhir_id
  }));

  return (
    <>
      <Head>
        <title>Personál - Medic Hub (FHIR)</title>
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
              <div className="text-sm text-gray-600">
                Celkem lékařů: {staff.length}
              </div>
            </div>
          </div>
        )}

        {/* Staff List */}
        <StaffList
          staff={staff}
          onStaffClick={handleStaffClick}
        />

        {/* Doctor Profile Modal */}
        {selectedDoctor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <DoctorProfile
              doctor={selectedDoctor}
              onClose={() => setSelectedDoctor(null)}
            />
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default function StaffPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <StaffPageContent />
    </QueryClientProvider>
  );
}
