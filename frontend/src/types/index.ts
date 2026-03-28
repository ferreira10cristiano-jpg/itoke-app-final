export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'client' | 'establishment' | 'representative' | 'admin';
  referral_code: string;
  referred_by_id?: string;
  tokens?: number;
  credits?: number;
  establishment?: Establishment;
  created_at: string;
}

export interface Establishment {
  establishment_id: string;
  user_id: string;
  business_name: string;
  address: string;
  city?: string;
  neighborhood?: string;
  category: string;
  about?: string;
  social_links?: { instagram?: string; whatsapp?: string; website?: string };
  latitude?: number;
  longitude?: number;
  token_balance: number;
  total_sales: number;
  total_views: number;
  first_offer_free?: boolean;
  created_at: string;
}

export interface Offer {
  offer_id: string;
  offer_code?: string;  // Short readable code like OFF-A1B2C3
  establishment_id: string;
  title: string;
  description?: string;
  detailed_description?: string;
  rules?: string;
  image_url?: string;
  discount_value: number;
  original_price: number;
  discounted_price: number;
  valid_days?: string;
  valid_hours?: string;
  delivery_allowed?: boolean;
  dine_in_only?: boolean;
  validity_date?: string;
  active: boolean;
  is_simulation?: boolean;  // Indicates if created in simulation mode
  views: number;
  qr_generated: number;
  sales: number;
  created_at: string;
  establishment?: Establishment;
  distance_km?: number;
}

export interface TokenPackage {
  package_id: string;
  establishment_id: string;
  size: number;
  price_per_unit: number;
  total_price: number;
  tokens_remaining: number;
  status: string;
  created_at: string;
}

export interface QRCode {
  qr_id: string;
  code_hash: string;
  offer_code?: string;  // Short offer code for manual lookup
  generated_by_user_id: string;
  for_offer_id: string;
  establishment_id: string;
  used: boolean;
  used_at?: string;
  validated_by_establishment_id?: string;
  created_at: string;
  expires_at: string;
  offer?: Offer;
}

export interface Transaction {
  transaction_id: string;
  from_user_id?: string;
  to_user_id: string;
  amount: number;
  type: 'purchase_commission' | 'establishment_referral' | 'token_package_commission';
  related_offer_id?: string;
  related_package_id?: string;
  description: string;
  created_at: string;
}

export interface NetworkData {
  referral_code: string;
  network: {
    level1: User[];
    level2: User[];
    level3: User[];
  };
  total_referrals: number;
  transactions: Transaction[];
  total_earned: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface OfferFilters {
  cities: string[];
  neighborhoods: string[];
}
