# Kanlı Göz — Hikaye Evreni Sitesi

Hikayenin lore arşivi. Derleme adımı yok, kurulum yok — HTML/CSS/JS.

## Sayfalar

| Dosya | İçerik |
|---|---|
| `index.html` | Ana sayfa — evrenin özeti ve güç sıralaması |
| `karakterler.html` | Tüm karakterler, taraflarına göre ayrılmış |
| `irade.html` | İrade sistemi ve Kanlı Göz paradoksu |
| `efsane.html` | 300 yıllık efsane ve kuruyan ağaç |
| `mafya.html` | Mafya hiyerarşisi ve derebeyi ağı (kurgu uyarılı) |
| `icraatler.html` | Karakterlerin yaptıkları — sıralama değil, kayıt |
| `soru-cevap.html` | İzleyici soruları ve cevapları |
| `yonetim.html` | Soru onaylama ve ban paneli (sadece yönetici) |

## Siteyi açmak

`index.html` dosyasına çift tıklamak yeterli. Yerel sunucu istersen:

```bash
python3 -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000` adresini aç.

## İçerik nasıl eklenir

**Hiçbir HTML dosyasına dokunman gerekmiyor.** Bütün içerik `assets/js/data.js` içinde.

### Yeni karakter eklemek

`assets/js/data.js` dosyasındaki `KARAKTERLER` dizisine yeni bir blok ekle:

```js
{
  id: "yeni-karakter",
  ad: "Yeni Karakter",
  unvan: "Ünvanı",
  taraf: "iyi",          // "iyi" | "kotu" | "belirsiz"
  oynanan: false,         // senin oynadığın karakter mi?
  tir: 3,                 // kaç tır kaldırıyor (gücü yoksa null)
  gucEtiketi: "3 tır",
  ozet: "Kısa tanıtım.",
  ozellikler: ["Özellik 1", "Özellik 2"],
  detay: "Ek bilgi.",
}
```

Kaydet, sayfayı yenile. Karakter otomatik olarak doğru bölümde görünür.

### İcraat eklemek

`ICRAATLER` içinde ilgili karakterin `liste` dizisine bir satır ekle:

```js
{ ne: "Ne yaptığı", video: "Video adı", baglanti: "https://..." }
```

`video` ve `baglanti` isteğe bağlı. **Sıralama ve puan yok** — bu liste
"kim daha güçlü" sorusuna cevap vermez, sadece olanı kaydeder.

### Derebeyi eklemek

`DEREBEYLERI` dizisine ekle:

```js
{ il: "Ankara", ad: "Derebeyi adı", not: "Kısa bilgi" }
```

Adı henüz belli değilse `ad: null` bırak — site "İsimsiz Derebeyi" gösterir ve
sayaç kendini günceller.

### İrade kademelerini değiştirmek

`IRADE_KADEMELERI` dizisini düzenle.

## Tasarım yardımı almak

Başka bir yerden animasyon veya tasarım yardımı isterken
[`TASARIM.md`](TASARIM.md) dosyasının tamamını kopyalayıp yapıştır.
İçinde teknik kısıtlar, renk sistemi, mevcut animasyonlar ve hikayenin
tonu yazılı — her şeyi baştan anlatmana gerek kalmaz.

## Canon

Hikayenin tek doğru kaynağı [`LORE.md`](LORE.md). Önce orayı güncelle,
sonra `data.js` dosyasına yansıt.

## Yayınlamak — GitHub Pages

Site GitHub Pages'e hazır: derleme adımı yok, bütün bağlantılar göreli, alt
klasörden yayınlandığında da çalışıyor.

1. GitHub'da depoya gir: `github.com/barisguveloglu-bit/kanal-sitesi`
2. Üstten **Settings** sekmesine tıkla
3. Sol menüden **Pages**
4. **Source** kısmında **Deploy from a branch** seçili olsun
5. **Branch** kısmında yayınlamak istediğin dalı seç, klasör **/ (root)** kalsın
6. **Save**

1-2 dakika sonra adres hazır olur:

```
https://barisguveloglu-bit.github.io/kanal-sitesi/
```

Sayfayı yenileyip Pages bölümünün üstünde çıkan yeşil kutudaki adrese tıklayarak
girebilirsin.

**Not:** Depo **Public** olmalı. Private depoda Pages ücretli plan istiyor.
Settings → General → en altta **Danger Zone → Change repository visibility**.

### Sonradan değişiklik yapmak
Dosyayı değiştir, commit'le, push'la. Pages 1-2 dakika içinde kendini günceller.

### Yerelde denemek
Yayınlamadan önce kendi bilgisayarında görmek istersen `index.html`
dosyasına çift tıklaman yeterli.


---

# Soru & Cevap kurulumu

Sitenin geri kalanı statik ama soru-cevap bölümü **Supabase** kullanıyor
(ücretsiz). Kurmadan da site sorunsuz çalışır — o bölüm sadece
"henüz kurulmadı" yazar.

## 1. Supabase projesi aç

1. [supabase.com](https://supabase.com) → **Start your project** → GitHub ile giriş
2. **New project**
   - İsim: `kanli-goz`
   - **Database Password**: güçlü bir şifre belirle ve bir yere kaydet
   - **Region**: `Central EU (Frankfurt)` — Türkiye'ye en yakını
3. Proje kurulana kadar 1-2 dakika bekle

## 2. Veritabanını kur

1. Sol menüden **SQL Editor** → **New query**
2. Depodaki `supabase-kurulum.sql` dosyasının **tamamını** kopyala, yapıştır
3. **Run**

Bu adım tabloları ve güvenlik kurallarını oluşturur. Ban sisteminin gerçekten
çalışmasını sağlayan şey bu kurallardır.

## 3. Google girişini aç

Bu en uzun adım, çünkü Google tarafında da bir kayıt gerekiyor.

**Google Cloud Console tarafı:**
1. [console.cloud.google.com](https://console.cloud.google.com) → yeni proje aç
2. **APIs & Services → OAuth consent screen** → External → uygulama adını yaz
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
4. Type: **Web application**
5. **Authorized redirect URIs** kısmına şunu ekle:
   ```
   https://SENIN-PROJEN.supabase.co/auth/v1/callback
   ```
   (Bu adresi Supabase → Project Settings → API → Project URL'den alıyorsun)
6. Oluşan **Client ID** ve **Client Secret**'ı kopyala

**Supabase tarafı:**
1. **Authentication → Sign In / Providers → Google** → aç
2. Client ID ve Secret'ı yapıştır → **Save**
3. **Authentication → URL Configuration**
   - **Site URL**: `https://barisguveloglu-bit.github.io/kanal-sitesi/`
   - **Redirect URLs** listesine de aynısını ekle

## 4. Anahtarları siteye yaz

1. Supabase → **Project Settings → API**
2. `Project URL` ve `anon public` anahtarını kopyala
3. `assets/js/ayarlar.js` dosyasını aç, ikisini de yaz:

```js
const SUPABASE_URL = "https://senin-projen.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGci...";
```

4. Commit'le ve push'la

> **`anon` anahtarının herkese görünmesi normaldir** — zaten tarayıcıya gitmek
> zorunda. Veriyi koruyan şey o anahtar değil, 2. adımdaki kurallar.
> **`service_role` anahtarını ASLA buraya yazma** — o bütün kuralları atlar.

## 5. Kendini yönetici yap

1. Siteye git, **Google ile giriş yap** (bir kez giriş yapman şart)
2. Supabase → **SQL Editor** → şunu çalıştır (mailini kendi mailinle değiştir):

```sql
insert into public.yoneticiler (kullanici_id)
select id from auth.users where email = 'KENDI-MAIL-ADRESIN@ornek.com'
on conflict do nothing;
```

3. `yonetim.html` sayfasına git — panel açılmış olmalı

## Nasıl kullanılır

- İzleyici Google ile girer, soru sorar → soru **beklemede** olur, sitede görünmez
- Sen `yonetim.html`'e girersin, cevabı yazıp **Cevapla ve yayınla** dersin
- Soru cevabıyla birlikte `soru-cevap.html` sayfasında yayınlanır
- Konu dışıysa **Reddet**, rahatsız ediyorsa **Kullanıcıyı banla**

## Bilmen gerekenler

- **Ban gerçektir.** Sunucuda uygulanıyor; gizli sekme, çerez silme, sayfayı
  kurcalama işe yaramaz. Ama kişi **yeni bir Google hesabıyla** dönebilir —
  bunun önüne geçen bir sistem yok, hiçbir sitede yok.
- **Spam koruması:** bir hesap saatte en fazla 3 soru sorabilir.
- **Ücretsiz Supabase projeleri** bir hafta hiç kullanılmazsa uykuya geçer.
  Panelden tek tuşla uyandırılıyor, veri kaybolmuyor.
- **Toplanan veri:** sadece Google adın ve e-postan. Başka hiçbir şey tutulmuyor.
