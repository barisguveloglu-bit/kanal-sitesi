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

/*
 * EMNİYET KİLİDİ
 * --------------
 * Supabase panelinde gizli anahtar ile açık anahtar yan yana duruyor ve
 * yanlışlıkla gizli olanı kopyalamak çok kolay. Aşağıdaki kontrol,
 * yukarıya gizli bir anahtar yapıştırılırsa siteyi hiç çalıştırmıyor ve
 * konsola büyük harflerle uyarı basıyor.
 *
 * İki anahtar biçimini de tanıyor:
 *   - Eski (JWT):  gövdesinde  "role":"service_role"  yazar
 *   - Yeni:        "sb_secret_..." ile başlar
 * Güvenli olanlar sırasıyla  "role":"anon"  ve  "sb_publishable_...".
 *
 * Bu kontrol bir güvenlik duvarı DEĞİL — anahtar depoya girdiyse iş
 * işten geçmiştir, o anahtarı Supabase panelinden iptal etmek gerekir.
 * Buradaki tek amaç, hatayı yayına çıkmadan önce fark ettirmek.
 */
function anahtarGizliMi(anahtar) {
  if (!anahtar) return false;
  if (anahtar.startsWith("sb_secret_")) return true;

  /* JWT ise ortadaki bölümü çöz ve rolüne bak */
  const parcalar = anahtar.split(".");
  if (parcalar.length !== 3) return false;
  try {
    const govde = atob(parcalar[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(govde).role === "service_role";
  } catch (e) {
    return false; // çözemedik; karar vermiyoruz
  }
}

const ANAHTAR_TEHLIKELI = anahtarGizliMi(SUPABASE_ANON_KEY);

if (ANAHTAR_TEHLIKELI) {
  console.error(
    "DUR! ayarlar.js dosyasına GİZLİ (service_role / sb_secret) anahtar " +
    "yazılmış. Bu anahtar bütün güvenlik kurallarını atlar. Soru-cevap " +
    "bölümü kapatıldı.\n\n" +
    "Yapılacaklar:\n" +
    "1) Supabase -> Project Settings -> API -> o anahtarı IPTAL ET (revoke/rotate).\n" +
    "2) ayarlar.js dosyasına 'anon public' (veya sb_publishable_) anahtarını yaz.\n" +
    "3) Anahtar depoya gönderildiyse geçmişten de temizlenmeli."
  );
}

/* Ayarlar girilmiş mi? Girilmemişse sayfa hata vermek yerine
   "henüz kurulmadı" mesajı gösteriyor. */
const SUPABASE_HAZIR =
  !ANAHTAR_TEHLIKELI &&
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.length > 20;

window.KANLI_GOZ_AYAR = { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_HAZIR };
