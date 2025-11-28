import { useState, useEffect } from 'react';
import Head from 'next/head';
import PatientList from '../components/patients/PatientList';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      // Mock data for development
      const mockPatients = generateMockPatients();
      setPatients(mockPatients);
      setLoading(false);
    } catch (err) {
      console.error('Patients API Error:', err);
      setLoading(false);
    }
  };

  const handlePatientClick = (patient) => {
    console.log('Patient clicked:', patient);
    // TODO: Open patient detail modal
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Načítám pacienty...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Pacienti - Medic Hub</title>
      </Head>

      <PatientList
        patients={patients}
        onPatientClick={handlePatientClick}
      />
    </>
  );
}

function generateMockPatients() {
  const firstNames = ['Jan', 'Eva', 'Petr', 'Marie', 'Tomáš', 'Anna', 'Pavel', 'Jana', 'Martin', 'Lenka'];
  const lastNames = ['Novák', 'Svobodová', 'Dvořák', 'Černá', 'Procházka', 'Kučerová', 'Veselý', 'Horáková'];
  const diagnoses = [
    'Akutní cholecystitida',
    'Ruptura ACL',
    'Ischemická choroba srdeční',
    'Akutní appendicitida',
    'Inguinální hernie',
    'Nádor tlustého střeva',
    'Koxartróza',
    'Menisková léze'
  ];
  const statuses = ['scheduled', 'in_operation', 'post_op', 'discharged'];
  const priorities = ['normal', 'high', 'urgent'];

  return Array.from({ length: 50 }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const birthDate = new Date(1950 + Math.floor(Math.random() * 50), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const hasScheduledOp = Math.random() > 0.3;

    return {
      id: 1000 + i,
      name: `${firstName} ${lastName}`,
      birthDate: birthDate.toISOString(),
      birthNumber: `${birthDate.getFullYear().toString().slice(-2)}${(birthDate.getMonth() + 1).toString().padStart(2, '0')}${birthDate.getDate().toString().padStart(2, '0')}/${Math.floor(Math.random() * 9000) + 1000}`,
      diagnosis: diagnoses[Math.floor(Math.random() * diagnoses.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      scheduledOperation: hasScheduledOp ? {
        date: new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
        time: `${7 + Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
      } : null
    };
  });
}
