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
  **İstisna: `LORE.md`'nin sonundaki EK bölümlerinin hepsi.** Şu an ikisi var:
  `EK-A · UCUBE DÜNYA DOSYASI` (eklentideki *Uzak Akraba*) ve
  `EK-B · ÇARPIK ALEX DOSYASI` (eklentideki *Çarpık Hal*). İkisi de sitenin
  kurgusu değil — Minecraft Creepypasta wiki'sinden gelen hikayeler, kaynak
  bağlantılarıyla. `data.js`'e **bilerek** yansıtılmıyorlar ve sitede
  görünmüyorlar; iki evrenin karışmaması için ayrı tutuluyorlar.
  Senkron kuralı 1–9 arası bölümler için; EK ile başlayan her bölüm dışarıda.
  Yeni bir EK eklenirse aynı kural onun için de geçerli — bu satırı
  bölüm adlarıyla değil, "EK-" önekiyle oku.
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
- **Zaman çizelgesi — HÂLÂ AÇIK, ama tam olarak eksik olan şey şu:**
  `LORE.md` "2. Unutulan Efsane" içinde 1728–1735 arasını kapsayan bir
  **vakayiname tablosu var** (ağacın sökülmesi, Yılmaz'ın ölümü, ağacın
  kuruması) ve `efsane.html` onu eskimiş kâğıt olarak gösteriyor. Eksik olan
  **bugünkü olayların sırası**: Samara'nın ihaneti, Barış'ın kaçırılması,
  iyilerin bunu ne zaman öğrendiği — hiçbiri sıralı değil, ne `LORE.md`'de
  ne `data.js`'te.
  **Bunu doldurmak uydurma işi değil, Barış'ın kararı:** olayların sırasını
  yazmak kurguyu kalıcı olarak sabitler. "Sahte içerik yasak" kuralı burada
  da geçerli — sıra videolardan belli olmadan bu bölüm yazılmaz.

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

## Ölü kod taraması (v7.91 sonrası)

Sitede üç ölü parça bulunup temizlendi. Üçü de `addon/test/site.mjs` ile
kilitlendi (bölüm 9–11), yani geri sızarlarsa test düşer:

- **Kaldırılan soru-cevap özelliğinin CSS'i** (126 satır): giriş kutusu
  (`.oturum*`), soru formu (`.soru-form`, `.cevap-alani`), cevap listesi
  (`.sc-*`), yönetim paneli (`.yonetim-*`) ve yasaklı listesi (`.yasakli-*`).
  Özellik Supabase ile birlikte kaldırılmıştı (bkz. README), iskeleti kalmıştı.
  **Yeniden eklemeyin** — "form yok, giriş yok, sunucu yok" kuralı bunu
  kapsıyor. `.dugme:disabled` kuralı o blokta duruyordu ama YAŞIYOR
  (`gizli.js`'in kapı düğmesi kullanıyor); `.dugme` bloğuna taşındı.
- **`SITE_ADRESI`** hiçbir yerde okunmuyordu. Silinmedi: canonical/og/sitemap
  JavaScript'ten üretilemediği için adres 36 yere elle yazılı ve bu sabit
  onların **beyan edildiği tek yer**. Artık test o 36 etiketin hepsinin
  bununla başladığını ve her sayfanın canonical'inin kendini gösterdiğini
  ölçüyor. Alan adı değişirse önce `data.js`'i değiştir, sonra testi çalıştır.
- **`MAFYA_TEPE[].id`** hiç okunmuyordu. Silinmedi, bağlandı: mafya
  sayfasındaki iki kutu artık `karakterler.html#<id>` bağlantısı basıyor —
  `efsane.html` ve `mafya.html` zaten aynı biçimi kullanıyordu.

Eklentide (`addon/`) **kod** tarafında ölü parça yok: 120 betiğin hepsi
`main.js`'ten ulaşılabiliyor, kullanılmayan tek bir import veya yerel
fonksiyon yok, `pa:` kimliklerinin hepsi bir JSON'a denk geliyor.
`ayarlar.js`'teki altı `LAZER_*` ayarı öksüz ama bu **bilinçli ve orada
yazılı** — dokunma.

**v7.94.0 taramasında VARLIK tarafında bir artık bulundu ve silindi.**
Kod aranmıştı, dosyalar aranmamıştı. Kalkan giyilebilir zırh takımının
dört modeli (`Simsek_Kol_Kaynak/models/entity/zirh_{bas,govde,bacak,ayak}.geo.json`)
diskte kalmıştı: eşyaları, attachable'ları ve atlas ikonları
kaldırılmıştı, modelleri kaldırılmamıştı. `kol_uret.py` zırh **dokusunu**
temizliyordu, **modelini** temizlemiyordu; `zirh.mjs` de eşyayı,
attachable'ı ve ikonu "gitti mi" diye soruyor, modeli sormuyordu.
Üçü de v7.94.1'de kapatıldı: dosyalar silindi, üretim kendi artığını
topluyor, test modeli de soruyor.

Buradan çıkan kural: bir özellik kaldırılırken **eşya + attachable +
ikon + model + doku**, beşi birden aranır. Dördünü aramak yeterli değil.

## Biçim doğrulama — `arac/` (v7.94.2)

`.animation.json` ve `.geo.json` dosyalarının **biçim olarak geçerli
olup olmadığı** artık her koşuda ölçülüyor. 379 geometri dosyası bugüne
kadar hiçbir şekilde doğrulanmıyordu.

Kurallar bir yerden **çıkarıldı**, yazılmadı: kullanıcının gönderdiği
GeckoLib 5.5.5 JAR'ı (`arac/geckolib/`, MIT). GeckoLib bu dosyaları
gerçekten okuyan bağımsız bir uygulama; hangi `easing` adlarının
gerçek olduğunu, MoLang'de hangi fonksiyonların bulunduğunu ve kaç
argüman aldıklarını oradan biliyoruz. Ayrıntı: `REFERANS_GECKOLIB.md`.

- `arac/gecko_coz.py` — JAR'dan kural tablosunu **üretir**
- `arac/gecko_kurallari.json` — üretilen tablo, **elle düzenleme**
- `arac/bicim_dogrula.py` — depodaki dosyaları o tabloya göre doğrular
- `arac/bicim_mutasyon.py` — doğrulayıcının ısırdığını gösterir
- `test/bicim.mjs` — ikisini `kos.sh`'e bağlar

`test/anim_tara.py` ile **karıştırma**: o, animasyonların birbiriyle
tutarlılığına bakıyor (çift kimlik, modelde olmayan kemik, uzunluk
aşımı). Bu, biçim soruyor (easing adı gerçek mi, MoLang fonksiyonu
var mı). İkisi ayrı sorular, ikisi de gerekli.

GeckoLib sürüm atlarsa: `python3 addon/arac/gecko_coz.py`, sonra testi
çalıştır.

## Java modelden Bedrock geometriye — `jar_model_coz.py` (v7.94.3)

Bir Java 1.12 mod'unun `ModelBase` sınıflarından Bedrock `.geo.json`
üretiliyor. Araç NarutoMod 1.12.2 üzerinde büyütüldü (bkz.
`REFERANS_NARUTO.md`): sabit sınıf adı kaldırıldı, eksik yığın artık
modeli yakmıyor, `--geo` ile doğrudan geometri çıkıyor.

```sh
python3 addon/jar_model_coz.py mod.jar --liste
python3 addon/jar_model_coz.py mod.jar '<Sınıf>' --geo geometry.x > x.geo.json
```

Çevrim formülü **ölçülmüş veriye karşı doğrulandı** (`kol_uret.py`'deki
zırh geometrileri) ve `test/model_cevrim.mjs` ile kilitlendi. Üretilen
geometri `arac/bicim_dogrula.py`'den de geçmeli.

**Bilinen sınır:** alt kemik pivotlarının ebeveyne göreli sayılması
ölçülmüş veriyle doğrulanamadı — yeni model taşırken oyunda gözle bak.

### Java `elements` modeli → Bedrock (v7.94.5)

Java tarafında model **iki** biçimde duruyor ve ikisinin çevrimi
**ayrı**:

| kaynak | araç | Y kuralı |
|---|---|---|
| `ModelBase` alt sınıfı (bytecode) | `jar_model_coz.py` | `24 - y` (Java'da +Y aşağı) |
| Kaynak paketi JSON'u (`elements`) | `arac/java_gorsel_coz.py` | **Y kaymaz**, yalnız X/Z −8 |

**Birini ötekine uygulamak sessiz hatadır** — model geçerli JSON
çıkar, oyun kabul eder, sadece ters/kayık durur.
`test/java_gorsel.mjs` 3. bölümü iki çevrimin ayrı kaldığını tutuyor.

X/Z −8 kaydırması ölçüldü: `Simsek_Kol_Kaynak/models/blocks/`
altındaki blok geometrilerinin kemiklerinin hepsi `pivot [-8, 0, -8]`.

```sh
python3 addon/arac/java_gorsel_coz.py model.json --rapor
python3 addon/arac/java_gorsel_coz.py model.json --kimlik geometry.x > x.geo.json
```

`--rapor` **çevirmeden ölçer**: kaç eleman, kaçı sıfır kalınlıklı
düzlem, Bedrock'ta makul mü. Bir modelin alınmaya değip
değmediğini önce buna sor — NarutoMod'un Shukaku modeli 82.558
elemandı ve %100'ü düzlemdi: çevrilebilirdi ama çizilemezdi.

**Dış mod dosyaları depoya alınmaz.** Referans JAR'ları büyük ve çoğu
lisanssız; `REFERANS_*.md` belgeleri ölçümü taşır, dosyayı değil.
(İstisna: `arac/geckolib/` — MIT ve kural tablosu ondan üretiliyor.)

## Dosya teslimi — SKIN linkle, paket dosya olarak

Bu kural depodaki kodla ilgili değil, **kullanıcıya nasıl teslim
edileceğiyle** ilgili.

**Kural yalnız SKIN PNG'si içindir: onu sohbete dosya olarak
ekleme, depodaki dosyanın indirme linkini ver.**

**Paketler (`.mcaddon` / `.mcpack`) dosya olarak gönderilir —
her zamanki gibi.** Onlarda bugüne kadar hiç indirme sorunu
yaşanmadı; zip oldukları için yolda yeniden kodlanmıyorlar.
Kullanıcı bunu açıkça söyledi: *"skin için bunu yapmanı
istedim, mod için link göndermene gerek yok."* Bu satır bir
düzeltmenin kaydı: kural ilk yazıldığında paketleri de
kapsıyordu, kapsamamalıydı.

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
