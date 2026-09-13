# SURI STATIONARY

Mfumo wa Usimamizi wa Stationery na Huduma — Powered by Hagai Chrisanty Laitony / HITECH TECHNOLOGY.

## HALI YA MRADI (AWAMU YA 1 — MSINGI)

Sehemu zilizokamilika na **zinazofanya kazi kweli** dhidi ya Supabase:
- Database kamili (profiles, categories, products, services, sales, sale_items,
  stock_movements, daily_targets, settings, audit_logs, price_history)
- Row Level Security kamili (Admin vs Staff)
- Login yenye persistent session (haulazimishi login kila refresh)
- Dashibodi yenye data halisi (mauzo ya leo, profit, target progress, stock alerts)
- Tafuta bidhaa/huduma (server-side, debounced)
- POS/Mauzo — atomic transaction (RPC `process_sale`): huangalia stock, huhesabu
  profit, hupunguza stock, hutengeneza stock movement, na huzuia double-click/duplicate
  sales kwa idempotency key
- Bidhaa — CRUD kamili (Admin)
- Huduma — CRUD kamili (Admin)
- Stock — restock/adjustment kupitia RPC `adjust_stock` (huzuia stock hasi)
- Bei — muhtasari wa bei na profit margin
- Kughairi mauzo — RPC `cancel_sale` (hurudisha stock)
- Price history — trigger ya moja kwa moja kwenye database
- PWA config (installable, offline caching ya msingi)

**Awamu ya 2 (ijayo):** Ripoti za kina + export CSV/PDF, Staff management UI,
Audit Logs UI, Settings za kina, Backup/export, IndexedDB offline sync yenye
conflict resolution kamili, barcode scanning, import CSV ya bidhaa.

---

## 1. SUPABASE SETUP

1. Fungua https://supabase.com na tengeneza project mpya.
2. Nenda **SQL Editor** → run migrations zote kwa mpangilio (folder `supabase/migrations/`),
   kuanzia `001_profiles.sql` hadi `013_functions.sql`.
3. Nenda **Authentication → Providers** → hakikisha Email/Password imewashwa.
   Zima "Confirm email" ukitaka staff waweze login mara moja bila kusubiri email
   (au acha ikiwa imewashwa kama unataka verification).
4. Nenda **Project Settings → API** → nakili:
   - Project URL
   - anon/public key

## 2. TENGENEZA ADMIN WA KWANZA

1. Nenda **Authentication → Users** → "Add user" → weka email + password ya Admin.
   (Hii itaunda profile ya STAFF moja kwa moja kupitia trigger.)
2. Nenda **Table Editor → profiles** → tafuta profile ya mtumiaji huyo → badilisha
   `role` kutoka `STAFF` kuwa `ADMIN`.
3. Sasa unaweza login kama Admin na kuongeza staff wengine kupitia mfumo baadaye
   (Awamu ya 2), au kwa sasa unaweza kuwaongeza Authentication → Users moja moja
   na kubadilisha role zao vivyo hivyo.

## 3. LOCAL DEVELOPMENT

```bash
cp .env.example .env
# jaza VITE_SUPABASE_URL na VITE_SUPABASE_PUBLISHABLE_KEY

npm install
npm run dev
```

Fungua http://localhost:5173

## 4. DEPLOYMENT (NETLIFY)

```bash
npm run build
```

- Push code GitHub, unganisha na Netlify, au tumia Netlify CLI.
- Weka environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
  kwenye Netlify Site Settings → Environment variables.
- `netlify.toml` tayari ina build command na SPA redirect.

## 5. PWA

Weka icons zako (`icon-192.png`, `icon-512.png`) kwenye `public/icons/`.
Baada ya deploy, mtumiaji anaweza "Add to Home Screen" kwenye Chrome.

## 6. FOLDER STRUCTURE

```
src/
  components/    - vipengele vinavyotumika mara nyingi (ProtectedRoute, n.k.)
  layouts/        - AppLayout (sidebar + navigation)
  pages/          - kila ukurasa (Dashboard, Sales, Products, ...)
  services/       - service layer inayozungumza na Supabase
  store/          - AuthContext, CartContext
  types/          - TypeScript types
  utils/          - format helpers
supabase/migrations/ - SQL files, run kwa mpangilio wa namba
```

## 7. TROUBLESHOOTING

- **"Supabase env vars hazijawekwa"** kwenye console → hakikisha `.env` ipo na
  ina thamani sahihi, kisha restart `npm run dev`.
- **Login inashindwa** → hakikisha umetengeneza user kwenye Supabase Authentication,
  na kwamba email/password provider imewashwa.
- **"HUJA RUHUSIWA" kwa Staff** → hii ni RLS inayofanya kazi sawasawa (Staff
  hawezi kubadilisha bei/stock/settings — ni kwa makusudi).
- **Stock haitoshi wakati wa mauzo** → RPC `process_sale` inazuia hii moja kwa
  moja kwa `for update` lock — hii ni tabia sahihi, sio bug.

---

Powered by **Hagai Chrisanty Laitony** — HITECH TECHNOLOGY
