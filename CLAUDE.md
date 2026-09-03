# Proje Notları

Bu depo bir **hikaye lore sitesi**. Türkçe bir kurgu evreninin arşivi.

## Önce bunu oku

Hikayenin canon kaynağı [`LORE.md`](LORE.md). Herhangi bir içerik değişikliği
yapmadan önce o dosyayı oku — karakterler, güçler ve efsane orada tanımlı.

## Yapı

- Statik site: HTML + CSS + vanilla JS. **Derleme adımı, paket yöneticisi yok.**
  Backend yok, veritabanı yok, hiçbir dış servise bağlı değil.
- Bütün içerik `assets/js/data.js` içinde veri olarak duruyor.
- `assets/js/app.js` bu veriyi HTML'e çeviriyor; menü ve alt bilgi de oradan geliyor.
- HTML sayfaları sadece iskelet + `data-*` bağlama noktaları içeriyor.

## Kurallar

- Yeni karakter/güç/kademe eklerken **HTML'e dokunma** — `data.js` yeterli.
- İçerik değişince `LORE.md` ile `data.js` senkron kalmalı.
  **Tek istisna: `LORE.md`'nin sonundaki `EK-A · UCUBE DÜNYA DOSYASI`.**
  Orası sitenin kurgusu değil — eklentideki *Uzak Akraba* karakterinin
  Minecraft Creepypasta wiki'sinden gelen hikayesi, kaynak bağlantılarıyla.
  `data.js`'e **bilerek** yansıtılmıyor ve sitede görünmüyor; iki evrenin
  karışmaması için ayrı tutuluyor. Senkron kuralı 1–9 arası bölümler için.
- Arayüz metinleri **Türkçe**.
- Kod içindeki değişken ve fonksiyon isimleri de Türkçe (mevcut düzene uy).
- **Sitede hiç kullanıcı verisi toplanmıyor.** Form yok, giriş yok, çerez yok,
  sunucu yok, analitik yok, dış servise giden hiçbir istek yok.
  Soru-cevap YouTube yorumlarında yapılıyor; site sadece oraya yönlendiriyor.
  Buraya backend eklemeden önce iki kez düşün — sadeliği bilinçli bir tercih.

  **Tek istisna ve neden istisna:** `app.js` spoiler kapaklarının açık/kapalı
  hâlini `localStorage`'da tutuyor (`tercihOku` / `tercihYaz`). Bu *veri
  toplama değil*: hiçbir şey ziyaretçinin tarayıcısından çıkmıyor, kimse
  okuyamıyor, çerez başlığı gönderilmiyor. Olmasaydı okuduğun her spoiler
  sayfayı yenileyince yeniden kapanırdı. İkisi de `try/catch` içinde, çünkü
  gizli sekmede `localStorage` erişimi istisna atıyor.
  Sınır şu: **ziyaretçinin kendi tarayıcısında kalan bir tercih serbest,
  ziyaretçi hakkında toplanan bir bilgi değil.**

## Bekleyen işler

Burada eskiden `LORE.md`'nin sonundaki "Açık Uçlar" bölümü gösteriliyordu.
**O bölüm artık yok** (adı "9. Kapatılan Diğer Uçlar" olmuş) ve orada bekleyen
üç konunun ikisi kapanmış. v7.9.3 taramasında tek tek bakıldı:

- **İrade kademeleri — kapandı.** Beş kademe hem `LORE.md` "3. İrade Sistemi"
  bölümünde hem `data.js` içindeki `IRADE_KADEMELERI` listesinde ve ikisi
  birbiriyle uyumlu: Kırılgan · Zayıf · Dirençli · Güçlü · Kanlı Göz İradesi.
- **Derebeyi isimleri — kapandı.** Üç komutan (Nemesis · Teşup · Ahriman) ve
  `IL_DEREBEYLERI` listesindeki 81 ilin 81'i de adlandırılmış, boş kayıt yok.
- **Zaman çizelgesi — HÂLÂ AÇIK.** Ne `LORE.md`'de ne `data.js`'te bir
  kronoloji var. Olayların sırası hiçbir yerde yazılı değil.

## Denetim sonrası eklenen kurallar

Bu kısım dış bir kullanıcı deneyimi denetiminden sonra eklendi.
Aşağıdakiler bilinçli kararlar — "düzeltilecek eksik" değil.

- **Menü artık `app.js` üretmiyor**, her HTML'de yazılı. JavaScript
  yüklenmezse navigasyon kaybolmasın diye. Yeni sayfa eklersen menüyü
  bütün HTML dosyalarında ve `sitemap.xml` içinde güncelle.
- **Sahte içerik yasak.** `VIDEOLAR` boşken ana sayfadaki video bölümleri
  `hidden` kalır. Örnek başlık, "yakında", uydurma bağlantı **üretme** —
  boş bırak, eksik olduğunu rapor et.
- **Gizleme her zaman `hidden` özniteliğiyle** yapılır, `opacity: 0` ile
  değil. Hareket azaltma açıkken `style.css` bütün geçişleri kapatıyor;
  opacity ile gizlenen bir şey bir daha asla görünmez.
  Bu yüzden `[hidden] { display: none !important; }` kuralı var — silme.
- **Renk paleti ölçülerek belirlendi.** `--text-3`, `--kotu-metin` ve
  `--bolge-renk` değerleri WCAG AA (4.5:1) sınırına göre hesaplandı.
  Değiştireceksen önce kontrastı ölç.
- **Odak halkası silinmez.** `outline: none` yazma; `:focus-visible`
  tasarımı bilerek var.
- Betikler `defer` ile yükleniyor (ilk boyama ~%28 hızlandı). Sıra korunur,
  bozma.

## Dosya teslimi — skin ve paketler LİNKLE verilir

Bu kural depodaki kodla ilgili değil, **kullanıcıya nasıl teslim
edileceğiyle** ilgili. `addon/` klasöründeki her şey için geçerli.

**Kural: skin PNG'sini ve paketleri sohbete dosya olarak ekleme.
Depodaki dosyanın doğrudan indirme linkini ver.** Kullanıcı
tarayıcıdan indiriyor, orada sorun çıkmıyor.

### Neden — v7.19'da yaşandı

`uzak_akraba.png` (64×64 skin) sohbete eklenerek gönderildi.
Kullanıcı iki şey söyledi: *"yükleyemiyorum"* ve *"aşırı
kalitesiz"*. İkisinin de sebebi aynı: **dosya yolda yeniden
kodlanıyor.** Bir Minecraft skini bundan sağ çıkmaz —
saydamlık kanalı gider, ölçü bozulur, oyun dosyayı kabul etmez.
64×64 küçük olduğu için telefonda açılınca da pul gibi görünür,
oysa kalite düşük değildir: skin formatı zaten budur.

Kullanıcının kendi sözü: *"bundan sonra linkini ver bana,
dosyasını gönderme."*

### Link biçimi

```
https://raw.githubusercontent.com/<sahip>/<depo>/refs/heads/<dal>/<yol>
```

`refs/heads/` **şart**: dal adında `/` var
(`claude/bedrock-addon-stabilization-ppak4r`) ve o olmadan GitHub
dal adıyla klasör adını ayırt edemiyor.

Link vermeden önce **çalıştığını doğrula**, tahmin etme:

```sh
curl -s -o /dev/null -w "%{http_code}\n" "<link>"
```

200 dönmüyorsa dosya henüz itilmemiştir — önce `git push`.

### Dosya göndermek zorunda kalırsan

Zip'le. Zip bir resim değil, hiçbir uygulama içindekini yeniden
sıkıştırmaz. Gönderdikten sonra `cmp` ile içindekinin orijinalle
bire bir aynı olduğunu doğrula.

### Bakmak için görsel ayrı şeydir

Skinin nasıl göründüğünü göstermek için büyütülmüş bir önizleme
göndermek serbest — ama **"bu skin dosyası değil, sadece
bakmak için" diye açıkça yaz.** Büyütülmüş PNG'yi Minecraft
kabul etmez (Bedrock yalnız 64×64 ve 128×128 alıyor, 256×256
bile almıyor).
