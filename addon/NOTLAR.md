# Simsek TNT ve Toprak Topu — geliştirme notları

Minecraft **Bedrock** behavior pack. Sadece resmî `@minecraft/server` Script API
kullanılıyor; resource pack, custom texture, üçüncü parti kütüphane yok.
Hedef platform Android tablet/telefon, o yüzden performans kararları
masaüstüne göre değil mobile göre alındı.

## Yapı

```
addon/
  Simsek_TNT_ToprakTopu/
    manifest.json
    scripts/
      main.js               -> giriş, tick yöneticisi, tetikleme yolları
      ayarlar.js            -> BÜTÜN sabit sayılar
      yardimcilar.js        -> günlük, API uyumluluğu, ortak yardımcılar
      butce.js              -> tick bütçesi + ölçüm harness'ı
      yetenekler/
        kayit.js            -> yetenek kayıt defteri
        _yagmur.js          -> şimşek/TNT için ortak yağmur işi
        yildirim.js
        yildirim_halkasi.js
        alan_simsegi.js
        tnt_yagmuru.js
        toprak_topu.js
  Simsek_Kol_Kaynak/          -> İSTEĞE BAĞLI resource pack
    manifest.json
    animations/simsek_kol.animation.json
  paketle.sh                  -> paketleri üretir
  Simsek_TNT_ToprakTopu_v3.mcpack   (behavior, tek başına çalışır)
  Simsek_Kol_Kaynak_v3.mcpack       (resource, isteğe bağlı)
  Simsek_TNT_v3.mcaddon             (ikisi birden)
```

## Kol animasyonları — isteğe bağlı resource pack

Özel animasyon tanımlamak resource pack gerektiriyor; behavior pack'ten
yaratılamıyor. Bu yüzden animasyonlar **ayrı ve isteğe bağlı** bir pakete
konuldu. Behavior pack o paket olmadan da tam çalışır.

| `OZEL_ANIMASYON` | ne olur |
|---|---|
| `false` (varsayılan) | `animation.zombie.attack_bare_hand` — oyunda hazır gelir, ek paket gerekmez. Kollar öne uzanır. |
| `true` | Kollar gerçekten havaya kalkar. Resource pack'in dünyada **etkin olması şart**. |

Resource pack etkin değilken `OZEL_ANIMASYON = true` bırakırsan
`playanimation` sessizce başarısız olur ve kol hiç kalkmaz.

Pakette dört animasyon var:

| animasyon | ne yapar |
|---|---|
| `animation.simsek.kol_kaldir` | iki kol yukarı, son karede kalır |
| `animation.simsek.kol_indir` | iki kol aşağı iner |
| `animation.simsek.tek_kol` | sadece sağ kol yukarı |
| `animation.simsek.ileri_it` | iki kol öne doğru iter |

Son ikisi henüz kullanılmıyor, ileriki yetenekler için hazır.

**Dönüş değerleri oyunda denenmedi.** Kol açıları (`-175`, `-85` gibi) hesapla
yazıldı; oyunda tuhaf duruyorsa `animations/simsek_kol.animation.json`
içindeki `rotation` değerleri ayarlanmalı.

Paketlemek için: `sh addon/paketle.sh`

## Yeni yetenek nasıl eklenir

1. `yetenekler/` altına bir dosya aç
2. İçinde `yetenekKaydet({...})` çağır
3. `main.js`'in üstündeki import listesine bir satır ekle

Üçüncü adım kaçınılmaz: Bedrock'ta klasör tarama yok, her dosyanın bir kez
import edilmesi gerekiyor.

```js
import { yetenekKaydet } from "./kayit.js";

yetenekKaydet({
  kimlik: "ornek",          // benzersiz kısa ad
  ad: "Örnek Yetenek",      // oyuncuya gösterilen ad
  esya: "minecraft:stick",  // bu eşya kullanılınca tetiklenir (isteğe bağlı)
  esyasiz: true,            // jest sırasına girsin mi
  sira: 60,                 // jest sırasındaki yeri
  olustur(oyuncu) {
    return {
      ad: "ornek",
      oyuncuId: oyuncu.id,
      calis() { /* her tick; true dönerse iş biter */ return true; },
      bitir() { /* temizlik */ }
    };
  }
});
```

Bütçe isteyen işler `butce.js`'ten `blokIste(n)` / `varlikIste(n)` çağırır ve
sadece dönen kadarını yapar. Kalanını sonraki tick'e devreder.

## Aşama 1 — performans (tamamlandı)

Bu aşamada **oynanış bilerek hiç değiştirilmedi**. Top aynı hızda, aynı
menzilde, aynı yerleri kırıyor. Sadece aynı sonuca daha ucuza varılıyor.

### Yapılanlar

**Delta yazımı.** Eski kod her adımda kürenin tamamını havaya çevirip
tamamını yeniden çiziyordu: adım başına 66 blok işlemi. Arka arkaya iki küre
büyük ölçüde üst üste bindiği için ortak kalan bloklara dokunmaya gerek yok.
Artık sadece fark yazılıyor.

Bakış yönü uçuş boyunca sabit olduğundan tüm uçuşta yalnızca **2 farklı tam
sayı ötelemesi** oluşuyor; delta kümesi bu ötelemeye göre önbelleğe alınıyor,
yani atış başına 2 kez hesaplanıp 30 kez kullanılıyor.

**Merkezî tick yöneticisi ve global bütçe.** Eski kodda her yetenek kendi
`system.runInterval`'ını açıyordu; toplam yüke bakan kimse yoktu. Artık tek
bir yönetici döngü var ve tick başına bütçeyi tüm oyuncular arasında
dağıtıyor:

- `TICK_BLOK_BUTCESI = 28` — tick başına toplam blok işlemi (1 `getBlock` + 1 `setType`)
- `TICK_VARLIK_BUTCESI = 4` — tick başına toplam varlık doğumu

Bütçe değeri **ölçülerek** seçildi. 120 rastgele yönde atış yapılıp uçuş
süresi ve tepe yük karşılaştırıldı (orijinal: 62 tick, 33 blok/tick):

| bütçe | uçuş süresi | tepe yük |
|---|---|---|
| 24 | 80 tick (**%29 yavaş**) | %27 az |
| **28** | **62 tick (aynı)** | **%15 az** |
| 32 | 62 tick (aynı) | %3 az |

28'in altına inince top gözle görülür şekilde yavaşlıyor. Tablette ölçüm
satırındaki `maks` sürekli 5 ms üzerindeyse düşürmek gerekebilir; o zaman
yavaşlama bilinçli bir takas olur.

Bütçe dolarsa iş sonraki tick'e devrediliyor. Kaç oyuncu aynı anda ateş
ederse etsin tavan sabit kalıyor; efektler yavaşlar, sunucu tick'i şişmez.

**Dünya sınırı istisnasız ele alınıyor.** Eski kodda küre y ekseninin dışına
taştığında `getBlock` her blokta istisna fırlatıyor ve boş `catch` bunu
yutuyordu. Artık sınır önceden kontrol ediliyor, istisna hiç oluşmuyor.
Küre sınırı aşarsa top **durmuyor** — eski davranışta olduğu gibi uçmaya
devam ediyor, sadece sınır dışı bloklar atlanıyor.

**Tahsis azaltma.** `getBlock`'a verilen koordinat nesnesi ve `getEntities`
seçenek nesnesi artık her çağrıda yeniden üretilmiyor, tek nesne yeniden
kullanılıyor. Atış başına ~2.070 nesne tahsisi ~5'e indi. `KORUNAN` listesi
dizi taraması yerine `Set`.

**Oyuncu başına tek aktif efekt** ve **ayrılma/ölüm temizliği** eklendi.
Oyuncu dünyadan çıkarsa işi anında iptal ediliyor.

### Ölçüm sonuçları

Eski ve yeni algoritma sahte bir dünya üzerinde 13 senaryoda karşılaştırıldı;
**hepsinde blok durumu ve patlama noktası birebir aynı** çıktı. Aşağıdaki
rakamlar 120 rastgele yön üzerinden ortalamadır (eksen hizalı yönler
gerçekte olduğundan daha iyi sonuç verdiği için kullanılmadı).

| | eski | yeni |
|---|---|---|
| Atış başına blok işlemi | 1.980 | 1.414 (%29 az) |
| Tepe yük | 33 blok/tick | tavan 28 blok/tick (%15 az) |
| Uçuş süresi | 62 tick | 62 tick (değişmedi) |
| Sınıra teğet uçuşta istisna | 60 – 91 | 0 |
| Atış başına nesne tahsisi | ~2.070 | ~5 |

Bütçe tavanı 1, 2, 4 ve 8 oyuncu ile sınandı; hepsinde tick başına en fazla
28 blok işlemi yapıldı.

### Ölçüm harness'ı

Content Log'u tablette okumak zahmetli olduğu için ölçüm ve hata satırları
**sohbete de** düşüyor. İlgili ayarlar:

| ayar | ne yapar |
|---|---|
| `OLCUM_ACIK` | ölçümü açar/kapatır |
| `OLCUM_SOHBETE` | ölçüm satırı sohbete de düşsün mü |
| `HATA_SOHBETE` | hatalar sohbete de düşsün mü |

Dünyaya girince paketin çalıştığını doğrulayan satır:

```
[SimsekTNT v2.5] yuklendi · blok butcesi 28/tick · olcum acik
```

Her atıştan sonra sohbete iki satır düşüyor:

```
[OLCUM] maks 1.0ms ort 0.07ms toplam 5ms
        blok 1316 (17.5/tick) · varlik 0 · tick 75 · butce dolan 43
```

En önemli sütun **`maks`** — tek bir tick'in en kötü süresi. Renk kodu:
yeşil (< 2 ms) sorunsuz, sarı (2–5 ms) sınırda, kırmızı (> 5 ms) bütçe
düşürülmeli.

Hatalar hem Content Log'a hem sohbete düşüyor (aynı hata mesajı sohbete
en fazla 5 saniyede bir yazılır, sohbeti boğmasın diye):

```
[SimsekTNT] HATA @ toprakTopu.bosalt: <mesaj>
  <yigin izi>
```

Yayın veya normal oynanış öncesi `OLCUM_SOHBETE` ve `HATA_SOHBETE`
kapatılmalı.

### API dayanıklılığı

Orijinal kod yalnızca `world.afterEvents.itemUse` kullanıyordu. Performans
aşamasında `playerLeave` ve `playerSpawn` eklendi — bu olaylar oyuncunun API
sürümünde yoksa `.subscribe` çağrısı **script yüklenirken** hata fırlatır ve
paketin tamamı ölür. Bu yüzden:

- Bütün olay abonelikleri `olayaAbone()` üzerinden geçiyor. Eksik olay artık
  sadece ilgili özelliği kapatıyor, paketi öldürmüyor; Content Log'a uyarı
  düşüyor.
- `itemUse` kurulamazsa `KRITIK` satırı yazılıyor (o olmadan hiçbir yetenek
  çalışmaz).
- `isValid` bazı sürümlerde property, bazılarında metot. Metot olan sürümde
  `if (e.isValid)` **her zaman doğru** döner (fonksiyon truthy'dir), yani
  sessizce yanlış çalışır. `gecerliMi()` ikisini de doğru ele alıyor.
- `Date.now` yoksa ölçüm sıfır süreyle çalışmaya devam ediyor.

Bu yol ayrıca test ediliyor: `playerSpawn`/`playerLeave` silinmiş, `isValid`
metot yapılmış ve `Date` kaldırılmış sahte bir API'de script yükleniyor ve
toprak topu normal sonucu üretiyor.

## Aşama 2 — yıldırım ayarları ve eşyasız tetikleme

### Yıldırım süresi

Yağmurun süresi `ceil(sayı / grup) * aralık` tick (20 tick = 1 sn).

| | grup | aralık | süre |
|---|---|---|---|
| İlk hâli | 2 | 3 | 30 tick — 1.5 sn |
| Kısaltılan | 4 | 2 | 10 tick — 0.5 sn |
| **Şimdiki** | **1** | **3** | **60 tick — 3.0 sn** |
| TNT | 2 | 2 | değişmedi |

Şimşekler artık teker teker düşüyor, hepsi birden değil. Ölçüldü: 20 yıldırım
58 tick (2.9 sn).

Daha uzun istenirse `SIMSEK_ARALIK` büyütülür (4 → 4.0 sn, 5 → 5.0 sn).
`SIMSEK_SAYISI` artırmak da süreyi uzatır ve daha çok yıldırım düşürür.

**Dikkat:** yağmur `BEKLEME` süresinden uzun olursa yeni tetikleme beklemeye
takılır. Şu an ikisi de 60 tick. `SIMSEK_ARALIK`'ı 4'e çıkarırsan `BEKLEME`'yi
de 80 yap.

### Eşyasız tetikleme — dört yeteneğin hepsi

Eşya tutmadan hepsi kullanılabiliyor. Eşyalar da çalışmaya devam ediyor.

| jest | ne yapar |
|---|---|
| **eğil + tam yukarı bak** (≈0.4 sn tut) | yeteneği değiştirir, actionbar'da yazar |
| **eğil + zıpla** | seçili yeteneği çalıştırır |

Sıra: Yıldırım Halkası → Yön Şimşeği → Alan Şimşeği → TNT Yağmuru →
Toprak Topu → (başa döner). `ESYASIZ_SIRA` listesinden düzenlenir.

**Neden jest, "kol kaldırma" değil?** Minecraft'ta "kolunu kaldır" diye bir
oyuncu girdisi yok. `playanimation` kolu kaldıran bir **komut** — biz
oynatıyoruz, oyuncu yapmıyor ve okunamıyor. Script'in görebildiği gerçek
girdiler: eğilme, zıplama, koşma, bakış yönü, hareket.

**Neden çalıştırma zıplamaya bağlı?** Yön şimşeği, TNT ve toprak topu
baktığın yere gidiyor. Çalıştırma jesti bakışı kısıtlasaydı nişan
alamazdın. Zıplama bakıştan bağımsız.

Zıplama basılı tutulunca tekrarlamıyor — yalnızca "zıplamıyordu → zıplıyor"
geçişinde tetikleniyor.

| ayar | varsayılan | ne yapar |
|---|---|---|
| `ESYASIZ_ACIK` | `true` | özelliği açar/kapatır |
| `ESYASIZ_EGILME_SART` | `true` | jestler eğilme gerektirsin mi |
| `ESYASIZ_BAKIS_ESIGI` | `0.9` | yukarı bakış eşiği (1.0 = tam dik) |
| `ESYASIZ_TUTMA` | `8` | değiştirme jesti kaç tick tutulmalı |
| `ESYASIZ_TARAMA` | `4` | kaç tick'te bir kontrol |
| `ESYASIZ_IC_YARICAP` | `6` | oyuncuya en yakın kaç blok |
| `ESYASIZ_DIS_YARICAP` | `14` | en uzak kaç blok |

`player.isJumping` API'de yoksa çalıştırma jesti devre dışı kalıyor ve
Content Log'a uyarı düşüyor; değiştirme jesti çalışmaya devam ediyor.

Yıldırım Halkası için iki tasarım kararı:

**Yıldırım oyuncunun üzerine değil, etrafındaki halkaya düşüyor.**
Tetiklemek için yukarı bakmak gerektiğinden "baktığı yer" gökyüzü olurdu ve
yıldırım 150 blok yukarıda görünmez şekilde doğardı. Ayrıca üstüne düşseydi
tetikleyen kişi kendi yıldırımından ölürdü. İç yarıçap güvenlik payı.

**Duruşu bozmadan tekrar tetiklenmiyor.** İlk halde el yukarıda beklerken
bekleme süresi her dolduğunda kendiliğinden yeniden yağıyordu (testte 20
yerine 40 yıldırım çıktı). Artık tekrar tetiklemek için duruşu bozup yeniden
yapmak gerekiyor.

**Maliyet:** tarama 4 tick'te bir yapılıyor (saniyede 5 kez), sadece
`getAllPlayers` + `isSneaking` + `getViewDirection`. Blok bütçesine
dokunmuyor.

## Bekleyen işler

Sıradaki aşamalarda yapılacaklar, henüz **yapılmadı**:

1. **Uyumluluk.** `manifest.json` içinde `@minecraft/server` `"2.0.0"`
   isteniyor ama `min_engine_version` `[1, 21, 0]`. 2.0.0 stable API'si
   bundan çok daha yeni bir sürümle geldi. Doğru değeri yazmak için oyunun
   tablet üzerindeki sürümünün bilinmesi gerekiyor.
2. **Kod yapısı.** Tek dosyayı `main.js` / `ayarlar.js` / `yardimcilar.js` ve
   yetenek başına ayrı dosyaya bölmek; yetenekleri ortak bir kayıt arayüzüne
   taşımak.
3. **Hata yönetiminin tamamı.** Bu aşamada sadece dokunulan yollar düzeltildi.
4. **Yeni özellikler.** Toprak topu için "blokları düşürerek kır" modu,
   yetenek başına ayrı bekleme süresi, actionbar geri bildirimi,
   `@minecraft/server-ui` ayar menüsü.
5. **TNT yükü.** 30 TNT tabletteki en ağır kalem ve bu script
   optimizasyonuyla çözülmüyor — sayı/oynanış kararı gerekiyor.
