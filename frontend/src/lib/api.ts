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

  async getToken(): Promise<string | null> {
    await this.ensureToken();
    return this.sessionToken;
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
      
      // Handle session expired/invalid - clear token and redirect to login
      if (response.status === 401) {
        this.sessionToken = null;
        try {
          await AsyncStorage.removeItem('session_token');
          await AsyncStorage.removeItem('user');
        } catch (e) {
          console.error('Error clearing storage:', e);
        }
        // The error will propagate and the UI should handle redirect to login
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
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

  async getOfferByCode(offerCode: string) {
    return this.request<any>(`/offers/code/${offerCode}`);
  }

  async searchOffersByCode(code: string) {
    return this.request<any[]>(`/offers/search?code=${encodeURIComponent(code)}`);
  }

  async getOfferFilters(city?: string) {
    const params = city ? `?city=${encodeURIComponent(city)}` : '';
    return this.request<{ cities: string[]; neighborhoods: string[] }>(`/offers/filters${params}`);
  }

  async getCategoriesWithCounts(city?: string, neighborhood?: string) {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (neighborhood) params.append('neighborhood', neighborhood);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/categories/with-counts${query}`);
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

  async getTokenBalance() {
    return this.request<any>('/establishments/me/tokens');
  }

  async toggleOffer(offerId: string) {
    return this.request<any>(`/offers/${offerId}/toggle`, { method: 'PUT' });
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

  async getEstablishmentFinancial() {
    return this.request<{
      withdrawable_balance: number;
      total_sales: number;
      financial_logs: any[];
      withdrawal_requests: any[];
      pix_data: any;
    }>('/establishments/me/financial');
  }

  async updatePixData(data: { key_type: string; key: string; holder_name: string; bank: string }) {
    return this.request<any>('/establishments/me/pix', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async requestWithdrawal(amount: number) {
    return this.request<any>('/establishments/me/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async getReferralShareLink() {
    return this.request<{
      referral_code: string;
      share_link: string;
      message: string;
    }>('/referral/share-link');
  }

  // Validators
  async getMyValidators() {
    return this.request<any[]>('/establishments/me/validators');
  }

  async toggleValidator(validatorId: string) {
    return this.request<any>(`/establishments/me/validators/${validatorId}/toggle`, { method: 'PUT' });
  }

  async deleteValidator(validatorId: string) {
    return this.request<any>(`/establishments/me/validators/${validatorId}`, { method: 'DELETE' });
  }

  async getEstablishmentReports(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const qs = params.toString();
    return this.request<any>(`/establishments/me/reports${qs ? `?${qs}` : ''}`);
  }

  // Client Token Purchase
  async purchaseTokens(packages: number, package_config_id?: string) {
    return this.request<{
      message: string;
      purchase_id: string;
      tokens_added: number;
      total_price: number;
      new_balance: number;
    }>('/tokens/purchase', {
      method: 'POST',
      body: JSON.stringify(package_config_id ? { package_config_id } : { packages }),
    });
  }

  // Stripe Payment
  async createCheckoutSession(package_config_id: string) {
    const origin_url = typeof window !== 'undefined' ? window.location.origin : '';
    return this.request<{ url: string; session_id: string }>('/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({ package_config_id, origin_url }),
    });
  }

  async getPaymentStatus(session_id: string) {
    return this.request<{
      status: string;
      payment_status: string;
      tokens_added: number;
      new_balance?: number;
      message: string;
    }>(`/payments/status/${session_id}`);
  }

  async getPaymentHistory() {
    return this.request<any[]>('/payments/history');
  }

  async getPurchaseHistory() {
    return this.request<any[]>('/payments/purchase-history');
  }

  getReceiptPdfUrl(transactionId: string): string {
    return `${this.baseUrl}/payments/receipt/${transactionId}/pdf`;
  }

  // Active Token Packages (public)
  async getActiveTokenPackages() {
    return this.request<any[]>('/token-packages/active');
  }

  // Admin Token Package Config
  async getAdminTokenPackages() {
    return this.request<any[]>('/admin/token-packages');
  }

  async createTokenPackageConfig(data: { title: string; tokens: number; bonus: number; price: number; active: boolean }) {
    return this.request<any>('/admin/token-packages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTokenPackageConfig(configId: string, data: any) {
    return this.request<any>(`/admin/token-packages/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTokenPackageConfig(configId: string) {
    return this.request<any>(`/admin/token-packages/${configId}`, {
      method: 'DELETE',
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
  async generateQR(offerId: string, useCredits?: number) {
    return this.request<any>('/qr/generate', {
      method: 'POST',
      body: JSON.stringify({ offer_id: offerId, use_credits: useCredits || 0 }),
    });
  }

  async getMyVouchers() {
    return this.request<any[]>('/vouchers/my');
  }

  async getSalesHistory() {
    return this.request<{
      sales: any[];
      summary: {
        total_sales: number;
        total_credits_received: number;
        total_cash_to_receive: number;
        withdrawable_balance: number;
      };
    }>('/establishments/me/sales-history');
  }

  async validateQR(codeHash: string) {
    return this.request<any>('/qr/validate', {
      method: 'POST',
      body: JSON.stringify({ code_hash: codeHash }),
    });
  }

  async confirmQR(voucherId: string) {
    return this.request<any>('/qr/confirm', {
      method: 'POST',
      body: JSON.stringify({ voucher_id: voucherId }),
    });
  }

  async cancelVoucher(voucherId: string) {
    return this.request<any>(`/vouchers/${voucherId}/cancel`, {
      method: 'POST',
    });
  }

  async getMyQRCodes() {
    return this.request<any[]>('/vouchers/my');
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

  async adminSearchVoucher(code: string) {
    return this.request<any>(`/admin/search-voucher?code=${encodeURIComponent(code)}`);
  }

  async getAdminFinancial() {
    return this.request<any>('/admin/financial');
  }

  async getAdminSettings() {
    return this.request<any>('/admin/settings');
  }

  async updateAdminSettings(commissionPercent: number) {
    return this.request<any>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ commission_percent: commissionPercent }),
    });
  }

  async getAdminWithdrawals() {
    return this.request<any[]>('/admin/withdrawals');
  }

  async approveWithdrawal(establishmentId: string, amount: number) {
    return this.request<any>('/admin/withdrawals/approve', {
      method: 'POST',
      body: JSON.stringify({ establishment_id: establishmentId, amount }),
    });
  }

  async getAdminUsers() {
    return this.request<any[]>('/admin/users');
  }

  async toggleBlockUser(userId: string, blocked: boolean) {
    return this.request<any>(`/admin/users/${userId}/block`, {
      method: 'PUT',
      body: JSON.stringify({ blocked }),
    });
  }

  // Media
  async getPublicMedia() {
    return this.request<any[]>('/media');
  }

  // Fraud Alerts
  async getFraudAlerts(status: string = 'all') {
    return this.request<{ alerts: any[]; stats: any }>(`/admin/fraud-alerts?status=${status}`);
  }

  async reviewFraudAlert(alertId: string, notes: string = '') {
    return this.request<any>(`/admin/fraud-alerts/${alertId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  }

  async clearReviewedAlerts() {
    return this.request<any>('/admin/fraud-alerts/clear-reviewed', {
      method: 'DELETE',
    });
  }

  async getAdminMedia() {
    return this.request<any[]>('/admin/media');
  }

  async addMedia(url: string, title: string, type: string, base64Data?: string) {
    return this.request<any>('/admin/media', {
      method: 'POST',
      body: JSON.stringify({ url, title, type, base64_data: base64Data }),
    });
  }

  async deleteMedia(mediaId: string) {
    return this.request<any>(`/admin/media/${mediaId}`, {
      method: 'DELETE',
    });
  }

  async generateMediaImage(prompt: string, title?: string) {
    return this.request<any>('/admin/media/generate-image', {
      method: 'POST',
      body: JSON.stringify({ prompt, title }),
    });
  }

  async generateEngagementText(theme?: string) {
    return this.request<any>('/admin/media/generate-text', {
      method: 'POST',
      body: JSON.stringify({ theme }),
    });
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

  // Help Topics (Public)
  async getHelpTopics() {
    return this.request<any[]>('/help-topics');
  }

  async getHelpSettings() {
    return this.request<any>('/help-settings');
  }

  // Admin Help Topics
  async getAdminHelpTopics() {
    return this.request<any[]>('/admin/help-topics');
  }

  async createHelpTopic(data: { title: string; content: string; icon: string; order: number }) {
    return this.request<any>('/admin/help-topics', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateHelpTopic(topicId: string, data: any) {
    return this.request<any>(`/admin/help-topics/${topicId}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteHelpTopic(topicId: string) {
    return this.request<any>(`/admin/help-topics/${topicId}`, { method: 'DELETE' });
  }

  async getAdminHelpSettings() {
    return this.request<any>('/admin/help-settings');
  }

  async updateHelpSettings(supportEmail: string) {
    return this.request<any>('/admin/help-settings', { method: 'PUT', body: JSON.stringify({ support_email: supportEmail }) });
  }

  // Establishment Help Topics (public for establishments)
  async getEstHelpTopics() {
    return this.request<any[]>('/est-help-topics');
  }

  // Admin Establishment Help Topics
  async getAdminEstHelpTopics() {
    return this.request<any[]>('/admin/est-help-topics');
  }

  async createEstHelpTopic(data: { title: string; content: string; icon: string; order: number }) {
    return this.request<any>('/admin/est-help-topics', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateEstHelpTopic(topicId: string, data: any) {
    return this.request<any>(`/admin/est-help-topics/${topicId}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteEstHelpTopic(topicId: string) {
    return this.request<any>(`/admin/est-help-topics/${topicId}`, { method: 'DELETE' });
  }

  // Onboarding Videos
  async getOnboardingVideos(target: string = 'establishment') {
    return this.request<any[]>(`/onboarding-videos?target=${target}`);
  }

  async getAllOnboardingVideos(target: string = 'establishment') {
    return this.request<any[]>(`/onboarding-videos/all?target=${target}`);
  }

  async createOnboardingVideo(data: { title: string; description: string; video_url: string; target: string; order: number; active: boolean }) {
    return this.request<any>('/admin/onboarding-videos', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateOnboardingVideo(videoId: string, data: any) {
    return this.request<any>(`/admin/onboarding-videos/${videoId}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteOnboardingVideo(videoId: string) {
    return this.request<any>(`/admin/onboarding-videos/${videoId}`, { method: 'DELETE' });
  }

  async markOnboardingSeen() {
    return this.request<any>('/establishments/me/onboarding-seen', { method: 'POST' });
  }

  // CPF
  async updateCpf(cpf: string) {
    return this.request<{ message: string; cpf: string }>('/auth/cpf', {
      method: 'PUT',
      body: JSON.stringify({ cpf }),
    });
  }

  // Fiscal Report
  async getFiscalReport(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const qs = params.toString();
    return this.request<any>(`/establishments/me/fiscal-report${qs ? `?${qs}` : ''}`);
  }

  getFiscalReportPdfUrl(startDate?: string, endDate?: string): string {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const qs = params.toString();
    return `${this.baseUrl}/establishments/me/fiscal-report/pdf${qs ? `?${qs}` : ''}`;
  }

  // Admin Report Layout
  async getReportLayout() {
    return this.request<any>('/admin/report-layout');
  }

  async updateReportLayout(data: { company_name?: string; tagline?: string; disclaimer?: string; show_logo?: boolean; header_color?: string; footer_text?: string }) {
    return this.request<any>('/admin/report-layout', { method: 'PUT', body: JSON.stringify(data) });
  }

  // Legal Documents
  async getLegalDocument(key: string) {
    return this.request<any>(`/legal/${key}`);
  }

  async getAllLegalDocuments() {
    return this.request<any[]>('/legal');
  }

  async getAdminLegalDocuments() {
    return this.request<any[]>('/admin/legal');
  }

  async updateLegalDocument(key: string, data: { title?: string; content?: string; version?: string }) {
    return this.request<any>(`/admin/legal/${key}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // App Store Config
  async getAppStoreConfig() {
    return this.request<any>('/admin/app-store');
  }

  async updateAppStoreConfig(data: Record<string, any>) {
    return this.request<any>('/admin/app-store', { method: 'PUT', body: JSON.stringify(data) });
  }

  async getPublicAppConfig() {
    return this.request<any>('/app-config');
  }
}

export const api = new ApiClient();
