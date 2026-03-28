import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

// Safe AsyncStorage wrapper for token persistence
const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('session_token');
  } catch {
    return null;
  }
};

class ApiClient {
  private baseUrl: string;
  private sessionToken: string | null = null;

  constructor() {
    this.baseUrl = `${API_URL}/api`;
  }

  setSessionToken(token: string | null) {
    this.sessionToken = token;
  }

  private async ensureToken(): Promise<void> {
    // If we don't have a token in memory, try to load from storage
    if (!this.sessionToken) {
      const stored = await getStoredToken();
      if (stored) {
        this.sessionToken = stored;
      }
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Always ensure we have the token before making a request
    await this.ensureToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async exchangeSession(sessionId: string) {
    return this.request<{ user: any; session_token: string }>('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  }

  async emailLogin(email: string, name: string, role: string, referralCodeUsed?: string) {
    const body: any = { email, name, role };
    if (referralCodeUsed) {
      body.referral_code_used = referralCodeUsed;
    }
    return this.request<{ user: any; session_token: string }>('/auth/email-login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', { method: 'POST' });
  }

  async applyReferral(referralCode: string) {
    return this.request<{ message: string }>('/auth/apply-referral', {
      method: 'POST',
      body: JSON.stringify({ referral_code: referralCode }),
    });
  }

  async updateRole(role: string) {
    return this.request<{ message: string; role: string }>('/auth/role', {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  // Offers
  async getOffers(lat?: number, lon?: number, category?: string, city?: string, neighborhood?: string, sortBy?: string) {
    const params = new URLSearchParams();
    if (lat) params.append('lat', lat.toString());
    if (lon) params.append('lon', lon.toString());
    if (category) params.append('category', category);
    if (city) params.append('city', city);
    if (neighborhood) params.append('neighborhood', neighborhood);
    if (sortBy) params.append('sort_by', sortBy);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/offers${query}`);
  }

  async getOffer(offerId: string) {
    return this.request<any>(`/offers/${offerId}`);
  }

  async getOfferFilters() {
    return this.request<{ cities: string[]; neighborhoods: string[] }>('/offers/filters');
  }

  async createOffer(data: any) {
    return this.request<any>('/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOffer(offerId: string, data: any) {
    return this.request<{ message: string }>(`/offers/${offerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getMyOffers() {
    return this.request<any[]>('/establishments/me/offers');
  }

  // Establishments
  async createEstablishment(data: any) {
    return this.request<any>('/establishments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyEstablishment() {
    return this.request<any>('/establishments/me');
  }

  async updateEstablishment(data: any) {
    return this.request<any>('/establishments/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getEstablishment(id: string) {
    return this.request<any>(`/establishments/${id}`);
  }

  async getEstablishmentStats(establishmentId: string) {
    return this.request<any>(`/establishments/${establishmentId}/stats`);
  }

  // Client Token Purchase
  async purchaseTokens(packages: number) {
    return this.request<{
      message: string;
      purchase_id: string;
      tokens_added: number;
      total_price: number;
      new_balance: number;
    }>('/tokens/purchase', {
      method: 'POST',
      body: JSON.stringify({ packages }),
    });
  }

  // Packages (Establishment)
  async purchasePackage(size: number) {
    return this.request<any>('/packages', {
      method: 'POST',
      body: JSON.stringify({ size }),
    });
  }

  async getMyPackages() {
    return this.request<any[]>('/packages');
  }

  // QR Codes
  async generateQR(offerId: string) {
    return this.request<any>('/qr/generate', {
      method: 'POST',
      body: JSON.stringify({ offer_id: offerId }),
    });
  }

  async validateQR(codeHash: string) {
    return this.request<any>('/qr/validate', {
      method: 'POST',
      body: JSON.stringify({ code_hash: codeHash }),
    });
  }

  async getMyQRCodes() {
    return this.request<any[]>('/qr/my-codes');
  }

  // Network & Credits
  async getMyNetwork() {
    return this.request<any>('/network');
  }

  async getMyCredits() {
    return this.request<any>('/credits');
  }

  async getMyTokens() {
    return this.request<{ balance: number }>('/tokens');
  }

  // Categories
  async getCategories() {
    return this.request<any[]>('/categories');
  }

  // Admin
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getAdminTransactions(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<any[]>(`/admin/transactions${query}`);
  }

  // Seed
  async seedData(force?: boolean) {
    const query = force ? '?force=true' : '';
    return this.request<any>(`/seed${query}`, { method: 'POST' });
  }

  // Health
  async healthCheck() {
    return this.request<{ status: string }>('/health');
  }

  // AI Image Generation
  async generateImage(prompt: string) {
    return this.request<{ image_base64: string; text_response?: string }>('/generate-image', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }
}

export const api = new ApiClient();
