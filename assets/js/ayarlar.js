/*
 * KANLI GÖZ — Supabase ayarları
 * ---------------------------------------------------------------
 * Soru-cevap bölümünün çalışması için buraya kendi Supabase
 * projenin bilgilerini yazman gerekiyor.
 *
 * Nereden bulacaksın:
 *   supabase.com -> projen -> Project Settings -> API
 *   - "Project URL"        -> SUPABASE_URL
 *   - "anon public" anahtar -> SUPABASE_ANON_KEY
 *
 * GÜVENLİK NOTU
 * -------------
 * Buradaki "anon" anahtarın herkese açık olması NORMALDİR; zaten
 * tarayıcıya gitmek zorunda. Verini koruyan şey bu anahtar değil,
 * supabase-kurulum.sql içindeki RLS kuralları.
 *
 * ASLA "service_role" anahtarını buraya yazma. O anahtar bütün
 * kuralları atlar ve siteye koyarsan herkes her şeyi silebilir.
 */

const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

/* Ayarlar girilmiş mi? Girilmemişse sayfa hata vermek yerine
   "henüz kurulmadı" mesajı gösteriyor. */
const SUPABASE_HAZIR =
  SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 20;

window.KANLI_GOZ_AYAR = { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_HAZIR };
