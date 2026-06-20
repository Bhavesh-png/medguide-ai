const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token') || '';
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = '';
    localStorage.removeItem('token');
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = this.getHeaders();
    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        this.clearToken();
        window.dispatchEvent(new Event('auth-expired'));
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  }

  async login(username, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  async register(username, password) {
    return await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getProfile() {
    return await this.request('/api/user/me');
  }

  async getConsent() {
    return await this.request('/api/user/consent');
  }

  async updateConsent(updates) {
    return await this.request('/api/user/consent', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  }

  async getAuditLogs() {
    return await this.request('/api/user/audit-logs');
  }

  async getCalendar() {
    return await this.request('/api/calendar');
  }

  async createAppointment(appointment) {
    return await this.request('/api/calendar', {
      method: 'POST',
      body: JSON.stringify(appointment),
    });
  }

  async deleteAppointment(source, id) {
    return await this.request(`/api/calendar/${source}/${id}`, {
      method: 'DELETE',
    });
  }

  async getMedications() {
    return await this.request('/api/medications');
  }

  async sendMessage(sessionId, prompt) {
    return await this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, prompt }),
    });
  }

  async clearChat(sessionId) {
    return await this.request('/api/chat/clear', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  }
}

export const api = new ApiService();
