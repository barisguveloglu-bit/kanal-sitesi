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
    scripts/main.js
  paketle.sh                    -> kurulabilir .mcpack üretir
  Simsek_TNT_ToprakTopu_v2.mcpack
```

Paketlemek için: `sh addon/paketle.sh`

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

- `TICK_BLOK_BUTCESI = 24` — tick başına toplam blok işlemi (1 `getBlock` + 1 `setType`)
- `TICK_VARLIK_BUTCESI = 4` — tick başına toplam varlık doğumu

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
**hepsinde blok durumu ve patlama noktası birebir aynı** çıktı.

| | eski | yeni |
|---|---|---|
| Atış başına blok işlemi | 1.980 | 1.316 – 1.410 |
| Kazanç | — | %26 – %34 |
| Sürekli yük | 33 blok/tick | tavan 24 blok/tick |
| Sınıra teğet uçuşta istisna | 60 – 91 | 0 |
| Atış başına nesne tahsisi | ~2.070 | ~5 |

Bütçe tavanı 1, 2, 4 ve 8 oyuncu ile sınandı; hepsinde tick başına en fazla
24 blok işlemi yapıldı.

### Ölçüm harness'ı

`OLCUM_ACIK = true` iken her atışın sonunda Content Log'a şu satır düşüyor:

```
[SimsekTNT] OLCUM | tick: 62 | ort: 0.41ms | maks: 2.00ms | toplam: 25.4ms
            | blok: 1342 (21.6/tick) | varlik: 0 | butce dolan tick: 3
```

Tablette gerçek `setType` maliyetini bu satırdan öğrenip `TICK_BLOK_BUTCESI`
değerini ona göre ayarlamak lazım. `maks` sürekli 5ms üstündeyse bütçe
düşürülmeli. Ayarı kapatmak için `OLCUM_ACIK = false`.

Hata kayıtları da aynı yere düşüyor:

```
[SimsekTNT] HATA @ toprakTopu.bosalt: <mesaj>
  <yigin izi>
```

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
