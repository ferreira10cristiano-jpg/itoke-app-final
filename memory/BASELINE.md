# BASELINE - iToke Project
## Established: 2026-03-26

### Source of Truth
This is the OFFICIAL BASELINE from GitHub repository:
https://github.com/ferreira10cristiano-jpg/Principal

### Project Structure

#### Frontend (Expo Router)
```
/app/frontend/
├── app/                          # Expo Router pages
│   ├── index.tsx                 # Landing Page (Cliente/Estabelecimento)
│   ├── login.tsx                 # Login page
│   ├── _layout.tsx               # Root layout
│   ├── (tabs)/                   # Client tabs
│   │   ├── index.tsx             # Ofertas disponíveis
│   │   ├── wallet.tsx            # Carteira
│   │   ├── qr.tsx                # QR Codes
│   │   ├── credits.tsx           # Créditos
│   │   ├── profile.tsx           # Perfil
│   │   └── ...
│   ├── establishment/            # Establishment area
│   │   ├── dashboard.tsx         # Dashboard
│   │   ├── offers.tsx            # Manage offers (TARGET FOR WIZARD)
│   │   ├── validate.tsx          # QR validation
│   │   └── ...
│   ├── admin/                    # Admin area
│   └── representative/           # Representative area
├── src/
│   ├── components/               # Reusable components
│   ├── lib/api.ts                # API client
│   ├── store/                    # Zustand stores
│   └── types/                    # TypeScript types
└── .env                          # EXPO_PUBLIC_BACKEND_URL
```

#### Backend (FastAPI)
```
/app/backend/
├── server.py                     # Main API (1777 lines)
├── requirements.txt              # Dependencies
└── .env                          # MONGO_URL, DB_NAME, EMERGENT_LLM_KEY
```

### Pending Refactorings
✅ **COMPLETED - 26/03/2026**:
1. **Registration enhancements** - CNPJ with validation algorithm + "Minha História" field
2. **4-Step Wizard for Nova Oferta** in `/app/frontend/app/establishment/offers.tsx`
   - Step 1: Basic Info (title, prices, description, photo with Media Hub)
   - Step 2: Rules (days, hours, consumption mode, terms)
   - Step 3: Location confirmation (pulled from profile - READ ONLY)
   - Step 4: Live Preview + Publish
3. **Media Hub** with 4 professional sources:
   - Captura Direta (Camera)
   - Galeria Local (Files)
   - Gerador Criativo IA (Gemini)
   - Busca Digital (Internet URL)

### DO NOT TOUCH
- Landing Page (`/app/frontend/app/index.tsx`)
- Auth Store (`/app/frontend/src/store/authStore.ts`)
- API Client (`/app/frontend/src/lib/api.ts`)
- Backend server structure (`/app/backend/server.py`)
