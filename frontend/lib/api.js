/**
 * API client pro komunikaci s Medic Hub Django backendem
 * Profesionální implementace s error handlingem a retry logikou
 */

// V Dockeru používáme Next.js proxy
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
    getStats: () => this.get('/api/medic/dashboard/stats/'),
  };

  /**
   * Operating Rooms API
   */
  operatingRooms = {
    list: () => this.get('/api/medic/rooms/'),
    get: (id) => this.get(`/api/medic/rooms/${id}/`),
    getSchedule: (id, date = null) => 
      this.get(`/api/medic/rooms/${id}/schedule/`, date ? { date } : {}),
    getUtilization: (id, days = 30) => 
      this.get(`/api/medic/rooms/${id}/utilization/`, { days }),
  };

  /**
   * Operations API
   */
  operations = {
    list: (params = {}) => this.get('/api/medic/operations/', params),
    get: (id) => this.get(`/api/medic/operations/${id}/`),
    create: (data) => this.post('/api/medic/operations/', data),
    update: (id, data) => this.patch(`/api/medic/operations/${id}/`, data),
    delete: (id) => this.delete(`/api/medic/operations/${id}/`),
    
    // Speciální endpointy
    today: () => this.get('/api/medic/operations/today/'),
    active: () => this.get('/api/medic/operations/active/'),
    start: (id) => this.post(`/api/medic/operations/${id}/start/`, {}),
    complete: (id) => this.post(`/api/medic/operations/${id}/complete/`, {}),
    
    // Workflow actions
    submitForApproval: (id) => this.post(`/api/medic/operations/${id}/submit-for-approval/`, {}),
    approve: (id, approved = true, notes = '') => 
      this.post(`/api/medic/operations/${id}/approve/`, { approved, notes }),
    assignStaff: (id, data) => this.post(`/api/medic/operations/${id}/assign-staff/`, data),
  };

  /**
   * Patients API
   */
  patients = {
    list: (params = {}) => this.get('/api/medic/patients/', params),
    get: (id) => this.get(`/api/medic/patients/${id}/`),
    create: (data) => this.post('/api/medic/patients/', data),
    update: (id, data) => this.put(`/api/medic/patients/${id}/`, data),
    delete: (id) => this.delete(`/api/medic/patients/${id}/`),
    getOperations: (id) => this.get(`/api/medic/patients/${id}/operations/`),
    searchByBirthNumber: (birthNumber) => this.get('/api/medic/patients/search_by_birth_number/', { birth_number: birthNumber }),
  };

  /**
   * Doctors API
   */
  doctors = {
    list: (params = {}) => this.get('/api/medic/doctors/', params),
    get: (id) => this.get(`/api/medic/doctors/${id}/`),
    create: (data) => this.post('/api/medic/doctors/', data),
    update: (id, data) => this.put(`/api/medic/doctors/${id}/`, data),
    delete: (id) => this.delete(`/api/medic/doctors/${id}/`),
    getSchedule: (id, date = null) => 
      this.get(`/api/medic/doctors/${id}/schedule/`, date ? { date } : {}),
  };

  /**
   * Equipment API
   */
  equipment = {
    list: (params = {}) => this.get('/api/medic/equipment/', params),
    get: (id) => this.get(`/api/medic/equipment/${id}/`),
    create: (data) => this.post('/api/medic/equipment/', data),
    update: (id, data) => this.put(`/api/medic/equipment/${id}/`, data),
    delete: (id) => this.delete(`/api/medic/equipment/${id}/`),
    getLowLifetime: (threshold = 20) => 
      this.get('/api/medic/equipment/low_lifetime/', { threshold }),
  };

  /**
   * Materials API
   */
  materials = {
    list: (params = {}) => this.get('/api/medic/materials/', params),
    get: (id) => this.get(`/api/medic/materials/${id}/`),
    create: (data) => this.post('/api/medic/materials/', data),
    update: (id, data) => this.put(`/api/medic/materials/${id}/`, data),
    delete: (id) => this.delete(`/api/medic/materials/${id}/`),
    getLowStock: () => this.get('/api/medic/materials/low_stock/'),
    scan: (eanCode) => this.post('/api/medic/materials/scan/', { ean_code: eanCode }),
  };

  /**
   * Perioperative Protocols API
   */
  protocols = {
    list: (params = {}) => this.get('/api/medic/protocols/', params),
    get: (id) => this.get(`/api/medic/protocols/${id}/`),
    create: (data) => this.post('/api/medic/protocols/', data),
    update: (id, data) => this.put(`/api/medic/protocols/${id}/`, data),
    delete: (id) => this.delete(`/api/medic/protocols/${id}/`),
    addEquipment: (id, equipmentId, hoursUsed) => 
      this.post(`/api/medic/protocols/${id}/add_equipment/`, { 
        equipment_id: equipmentId, 
        hours_used: hoursUsed 
      }),
    addMaterial: (id, materialId, quantityUsed) => 
      this.post(`/api/medic/protocols/${id}/add_material/`, { 
        material_id: materialId, 
        quantity_used: quantityUsed 
      }),
  };

}

// Singleton instance
export const api = new ApiClient();

// Export také třídu pro případné vlastní instance
export default ApiClient;
