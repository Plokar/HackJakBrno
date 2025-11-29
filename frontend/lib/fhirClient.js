/**
 * FHIR Client - Knihovna pro komunikaci s FHIR serverem
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const USE_PROXY = API_BASE_URL.startsWith('/api/proxy');

// Helper pro vytvoření URL s případným přesměrováním přes proxy
function makeApiUrl(path) {
  if (USE_PROXY) {
    // Změnit /api/medic/... na /api/proxy/medic/...
    return path.replace('/api/', '/api/proxy/');
  }
  return `${API_BASE_URL}${path}`;
}

/**
 * Fetch pacienty z backendu (Django cache)
 */
export async function fetchPatientsFromBackend() {
  try {
    const response = await fetch(makeApiUrl('/api/medic/fhir/patients/'));
    if (!response.ok) {
      throw new Error('Failed to fetch patients from backend');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching patients from backend:', error);
    throw error;
  }
}

/**
 * Vyhledat pacienty v FHIR serveru
 */
export async function searchPatients(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      makeApiUrl(`/api/medic/fhir/patients/search/?${queryString}`)
    );
    if (!response.ok) {
      throw new Error('Failed to search patients');
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching patients:', error);
    throw error;
  }
}

/**
 * Vygenerovat nove pacienty
 */
export async function generatePatients(count = 50) {
  try {
    const response = await fetch(
      makeApiUrl('/api/medic/fhir/patients/generate/'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count })
      }
    );
    if (!response.ok) {
      throw new Error('Failed to generate patients');
    }
    return await response.json();
  } catch (error) {
    console.error('Error generating patients:', error);
    throw error;
  }
}

/**
 * Synchronizovat pacienty z FHIR do Django
 */
export async function syncPatientsFromFHIR() {
  try {
    const response = await fetch(
      makeApiUrl('/api/medic/fhir/patients/sync_from_fhir/'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    if (!response.ok) {
      throw new Error('Failed to sync patients from FHIR');
    }
    return await response.json();
  } catch (error) {
    console.error('Error syncing patients:', error);
    throw error;
  }
}

/**
 * Fetch doktory (praktikujici) z backendu
 */
export async function fetchPractitionersFromBackend() {
  try {
    const response = await fetch(makeApiUrl('/api/medic/fhir/practitioners/'));
    if (!response.ok) {
      throw new Error('Failed to fetch practitioners from backend');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching practitioners from backend:', error);
    throw error;
  }
}

/**
 * Vyhledat praktikujici v FHIR serveru
 */
export async function searchPractitioners(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      makeApiUrl(`/api/medic/fhir/practitioners/search/?${queryString}`)
    );
    if (!response.ok) {
      throw new Error('Failed to search practitioners');
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching practitioners:', error);
    throw error;
  }
}

/**
 * Fetch operacni saly (lokace) z backendu
 */
export async function fetchLocationsFromBackend() {
  try {
    const response = await fetch(makeApiUrl('/api/medic/fhir/locations/'));
    if (!response.ok) {
      throw new Error('Failed to fetch locations from backend');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching locations from backend:', error);
    throw error;
  }
}

/**
 * Synchronizovat vsechny saly do FHIR
 */
export async function syncAllRoomsToFHIR() {
  try {
    const response = await fetch(
      makeApiUrl('/api/medic/fhir/locations/sync_all_to_fhir/'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    if (!response.ok) {
      throw new Error('Failed to sync rooms to FHIR');
    }
    return await response.json();
  } catch (error) {
    console.error('Error syncing rooms:', error);
    throw error;
  }
}

/**
 * Vyhledat procedury (operace) v FHIR serveru
 */
export async function searchProcedures(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      makeApiUrl(`/api/medic/fhir/procedures/search/?${queryString}`)
    );
    if (!response.ok) {
      throw new Error('Failed to search procedures');
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching procedures:', error);
    throw error;
  }
}

/**
 * Synchronizovat konkretni operaci do FHIR
 */
export async function syncOperationToFHIR(operationId) {
  try {
    const response = await fetch(
      makeApiUrl(`/api/medic/fhir/procedures/${operationId}/sync_to_fhir/`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    if (!response.ok) {
      throw new Error('Failed to sync operation to FHIR');
    }
    return await response.json();
  } catch (error) {
    console.error('Error syncing operation:', error);
    throw error;
  }
}

/**
 * Vyhledat zarizeni (Device) v FHIR serveru
 */
export async function searchDevices(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      makeApiUrl(`/api/medic/fhir/devices/search/?${queryString}`)
    );
    if (!response.ok) {
      throw new Error('Failed to search devices');
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching devices:', error);
    throw error;
  }
}

/**
 * Ziskat metadata FHIR serveru
 */
export async function getFHIRServerMetadata() {
  try {
    const response = await fetch(
      makeApiUrl('/api/medic/fhir/server/metadata/')
    );
    if (!response.ok) {
      throw new Error('Failed to get FHIR server metadata');
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting FHIR metadata:', error);
    throw error;
  }
}

/**
 * Zkontrolovat stav FHIR serveru
 */
export async function checkFHIRServerStatus() {
  try {
    const response = await fetch(
      makeApiUrl('/api/medic/fhir/server/status/')
    );
    if (!response.ok) {
      throw new Error('Failed to check FHIR server status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking FHIR server status:', error);
    return { connected: false, status: 'offline', error: error.message };
  }
}


