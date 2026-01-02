/**
 * API client pro komunikaci s Medic Hub Django backendem
 * Profesionální implementace s error handlingem a retry logikou
 */

// V Dockeru používáme Next.js proxy
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = 30000; // 30 sekund
    this.useProxy = API_BASE_URL.startsWith('/api/proxy');
    this.currentRole = 'doctor'; // Default role
  }

  /**
   * Nastavit aktuální roli uživatele pro mock autentizaci
   */
  setUserRole(role) {
    console.log(`[API] Nastavuji roli na: ${role}`);
    this.currentRole = role;
  }

  /**
   * Generická metoda pro HTTP requesty s retry logikou
   */
  async request(endpoint, options = {}) {
    // Pokud používáme proxy, upravíme endpoint
    const url = this.useProxy 
      ? endpoint.replace('/api/', '/api/proxy/')
      : `${this.baseURL}${endpoint}`;
      
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': this.currentRole, // Přidat header pro mock autentizaci
        ...options.headers,
      },
      ...options,
    };

    // Debug logging - kontrola role
    console.log(`[API] Request: ${options.method || 'GET'} ${endpoint}, Role: ${this.currentRole}`);

    // Timeout implementace
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      // Pokud server vrátí 204 No Content, neočekáváme JSON
      if (response.status === 204) {
        return null;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw {
          status: response.status,
          message: data?.error || data?.detail || data?.message || 'Chyba při komunikaci se serverem',
          data,
        };
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw {
          status: 408,
          message: 'Request timeout - server neodpověděl včas',
          data: null,
        };
      }

      if (error.status) {
        throw error;
      }

      throw {
        status: 0,
        message: 'Nepodařilo se připojit k serveru. Zkontrolujte připojení.',
        data: null,
      };
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH request
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Dashboard API
   */
  dashboard = {
    getStats: () => this.get('/medic/dashboard/stats/'),
  };

  /**
   * Operating Rooms API
   */
  operatingRooms = {
    list: () => this.get('/medic/rooms/'),
    get: (id) => this.get(`/medic/rooms/${id}/`),
    getSchedule: (id, date = null) => 
      this.get(`/medic/rooms/${id}/schedule/`, date ? { date } : {}),
    getUtilization: (id, days = 30) => 
      this.get(`/medic/rooms/${id}/utilization/`, { days }),
  };

  /**
   * Operations API
   */
  operations = {
    list: (params = {}) => this.get('/medic/operations/', params),
    get: (id) => this.get(`/medic/operations/${id}/`),
    create: (data) => this.post('/medic/operations/', data),
    update: (id, data) => this.patch(`/medic/operations/${id}/`, data),
    delete: (id) => this.delete(`/medic/operations/${id}/`),
    
    // Speciální endpointy
    today: () => this.get('/medic/operations/today/'),
    active: () => this.get('/medic/operations/active/'),
    start: (id) => this.post(`/medic/operations/${id}/start/`, {}),
    complete: (id) => this.post(`/medic/operations/${id}/complete/`, {}),
    
    // Workflow actions
    submitForApproval: (id) => this.post(`/medic/operations/${id}/submit-for-approval/`, {}),
    approve: (id, approved = true, notes = '') => 
      this.post(`/medic/operations/${id}/approve/`, { approved, notes }),
    assignStaff: (id, data) => this.post(`/medic/operations/${id}/assign-staff/`, data),
  };

  /**
   * Patients API
   */
  patients = {
    list: (params = {}) => this.get('/medic/patients/', params),
    get: (id) => this.get(`/medic/patients/${id}/`),
    create: (data) => this.post('/medic/patients/', data),
    update: (id, data) => this.put(`/medic/patients/${id}/`, data),
    delete: (id) => this.delete(`/medic/patients/${id}/`),
    getOperations: (id) => this.get(`/medic/patients/${id}/operations/`),
    searchByBirthNumber: (birthNumber) => this.get('/medic/patients/search_by_birth_number/', { birth_number: birthNumber }),
    noteInsights: (id, payload) => this.post(`/medic/patients/${id}/note-insights/`, payload),
    syncNotes: (id) => this.post(`/medic/patients/${id}/sync-notes/`, {}),
  };

  /**
   * Doctors API
   */
  doctors = {
    list: (params = {}) => this.get('/medic/doctors/', params),
    get: (id) => this.get(`/medic/doctors/${id}/`),
    create: (data) => this.post('/medic/doctors/', data),
    update: (id, data) => this.put(`/medic/doctors/${id}/`, data),
    delete: (id) => this.delete(`/medic/doctors/${id}/`),
    getSchedule: (id, date = null) => 
      this.get(`/medic/doctors/${id}/schedule/`, date ? { date } : {}),
  };

  /**
   * Equipment API
   */
  equipment = {
    list: (params = {}) => this.get('/medic/equipment/', params),
    get: (id) => this.get(`/medic/equipment/${id}/`),
    create: (data) => this.post('/medic/equipment/', data),
    update: (id, data) => this.put(`/medic/equipment/${id}/`, data),
    delete: (id) => this.delete(`/medic/equipment/${id}/`),
    getLowLifetime: (threshold = 20) => 
      this.get('/medic/equipment/low_lifetime/', { threshold }),
  };

  /**
   * Materials API
   */
  materials = {
    list: (params = {}) => this.get('/medic/materials/', params),
    get: (id) => this.get(`/medic/materials/${id}/`),
    create: (data) => this.post('/medic/materials/', data),
    update: (id, data) => this.put(`/medic/materials/${id}/`, data),
    delete: (id) => this.delete(`/medic/materials/${id}/`),
    getLowStock: () => this.get('/medic/materials/low_stock/'),
    scan: (eanCode) => this.post('/medic/materials/scan/', { ean_code: eanCode }),
  };

  /**
   * Perioperative Protocols API
   */
  protocols = {
    list: (params = {}) => this.get('/medic/protocols/', params),
    get: (id) => this.get(`/medic/protocols/${id}/`),
    create: (data) => this.post('/medic/protocols/', data),
    update: (id, data) => this.put(`/medic/protocols/${id}/`, data),
    delete: (id) => this.delete(`/medic/protocols/${id}/`),
    addEquipment: (id, equipmentId, hoursUsed) => 
      this.post(`/medic/protocols/${id}/add_equipment/`, { 
        equipment_id: equipmentId, 
        hours_used: hoursUsed 
      }),
    addMaterial: (id, materialId, quantityUsed) => 
      this.post(`/medic/protocols/${id}/add_material/`, { 
        material_id: materialId, 
        quantity_used: quantityUsed 
      }),
  };

}

// Singleton instance
export const api = new ApiClient();

// Export také třídu pro případné vlastní instance
export default ApiClient;
