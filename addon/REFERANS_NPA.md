# Referans · NPA v0.6.61 (oyuncu animasyon paketi)

**Kaynak:** `NPA_V0.6.61.mcpack` · Minecraft **Bedrock** kaynak paketi ·
yazar **KID_SKY** (`manifest.json`: "§cBy §bKID_SKY").

**Yöntem:** paket açıldı, JSON dosyaları okundu ve sayıldı. Oyun
**çalıştırılmadı**; buradaki her sayı dosyadan ölçüldü.

> **LİSANS.** Pakette **lisans dosyası yok** → tüm hakları saklı.
> Animasyon, model, doku ve denetleyicilerin hiçbiri depoya **alınmadı**.
> Bu belge yalnızca ölçümdür; mekaniği okuyup **kendi animasyonumuzu
> kendimiz yazmak** serbest.

## Paketin ölçüsü

Paket `subpacks/Steve` ve `subpacks/Alex` diye ikiye ayrılıyor.
Aşağıdaki sayılar **Steve** alt paketinden; Alex neredeyse birebir aynı
(farklar aşağıda).

| | |
|---|---|
| Toplam dosya | 259 |
| Animasyon dosyası | 37 |
| **Animasyon kimliği** | **146** |
| `animation.player.*` önekli | 64 |
| Animasyon denetleyicisi | **82** |
| Denetleyici durumu | 251 |
| Durumlar arası geçiş | **409** |
| Render controller kimliği | 15 |
| Geometri | 19 (163 kemik, 505 kutu) |
| Attachable | 35 |

## Denetleyicilerin dayandığı sorgular

Geçiş koşullarında en çok kullanılan MoLang sorguları (sayı = kaç geçişte
geçtiği):

| sorgu | kullanım |
|---|---:|
| `query.is_in_water` | 265 |
| `query.is_sneaking` | 222 |
| `query.is_sprinting` | 217 |
| `query.is_on_ground` | 138 |
| `query.ground_speed` | 120 |
| `query.all_animations_finished` | 108 |
| `query.any_animation_finished` | 82 |
| `query.is_using_item` | 68 |

**Bizim için çıkarım:** 82 denetleyici / 409 geçiş, bu işin gerçek
maliyetini gösteriyor. Deponun `Simsek_Oyuncu_Modeli`'nde hiç
`animation_controllers` dosyası **yok** — animasyonlar doğrudan
`animate` listesinden koşuluyor. Yani bizde durum makinesi katmanı
hiç kurulmamış. Bu paket, o katmanın nasıl kurulduğunun ölçülmüş bir
örneği.

Ayrıca `animation_length` dağılımında tavan değer **1000000** —
"sonsuz tut" deyimi. Bizde de süresiz duruş gerekirse kullanılabilecek
bilinen bir kalıp.

## Steve / Alex farkı — sadece kol kalınlığı değil

`diff -rq` ile ölçüldü: **5 fark**.

| dosya | fark |
|---|---|
| `models/entity/Player/player.json` | kol kutuları (beklenen) |
| `entity/player.entity.json` | geometri eşlemesi |
| `render_controllers/Player/player.json` | geometri seçimi |
| `animations/Animation/8.fall.json` | içerik farkı |
| `models/entity/Player/emoting.json` | **yalnız Alex'te var** |

Son ikisi beklenmedik: kol kalınlığı farkının `8.fall.json`'u veya
fazladan bir `emoting` geometrisini gerektirmesi için bir sebep yok.
Bu, iki alt paketin **ayrı zamanlarda güncellenmiş** olduğuna işaret
ediyor — yani sürüm kayması, kasıtlı tasarım değil.

**Bizim için ders:** varyant paketleri elle çoğaltılırsa böyle ayrışıyor.
Bizim `kol_uret.py`'nin tek kaynaktan üretme yaklaşımı tam da bunu
önlüyor.

## Paket hijyeni kusurları

- `pack_icon.png` aslında **JPEG** (2560×2560, Exif'li) — oyun
  çizemeyebilir.
- `manifest.json`'da **`min_engine_version` yok**.
- `custom.elytra.json`: 412 kutuluk modelde 4 kemiğin ebeveyni tanımsız
  (`root3`, `KRoot`, `kbody`) → kemikler köke yapışır, model sessizce
  yanlış durur.
- `entity/.A1` ve `.A2` — JSON olmayan, hiçbir yerden çağrılmayan
  çalışma notları.
- Bir `.cape` geometrisinde doku ölçüsü ile PNG ölçüsü uyuşmuyor
  (22×17 beyan, 26×17 dosya).

## Üç taraflı `minecraft:player` çakışması

**Bu, üç paketi de ilgilendiren en önemli bulgu.**

Dördü de aynı anahtarı, aynı `format_version` (1.10.0) ile tanımlıyor.
Bedrock bu dosyaları **birleştirmez** — paket sırasında üstte olan,
alttakini bütünüyle değiştirir.

| | animasyon | doku | geometri | bizimle kesişen animasyon |
|---|---:|---:|---:|---:|
| **Depo** (`Simsek_Oyuncu_Modeli`) | 77 | 70 | 76 | — |
| Iron Man (kaynak) | 171 | 75 | 18 | **68** |
| NPA (kaynak) | 309 | 4 | 6 | **50** |

Iron Man ayrıca `minecraft:player`'ı **davranış** tarafında da eziyor
(`format_version` 1.13.0, 27 property / 33 component_group / 58 olay).

### Değeri farklı olan anahtarlar

Paylaşılan 50 animasyondan **değeri farklı olan tek anahtar**:

| anahtar | depo | NPA |
|---|---|---|
| `swimming` | `animation.player.swim` | `animation.player.swim.arms` |

Ayrıca gerçek bir animasyon çarpışması var: **`animation.player.holding`**.
NPA'da `leftarmup` kemiğini döndürüyor; bizim `oyuncu_tutus.animation.json`
`leftarm`+`rightarm` kullanıyor ve **`variable.simsek_cift_kol`** değişkenini
taşıyor. NPA üstte kalırsa çift kol tutuşu sessizce ölür.

### Kaybedilen taraf her zaman biz oluruz

Depo alta düşerse şunlar kaybolur: **70 doku, 76 geometri, 27 animasyon
kısa adı**, Ben 10 dönüşüm anahtarı `variable.donusuk`, zırh modları
(`zirh_mod_*`), duruşlar (`durus_*`), `o_sey`, `ripjaws_*`, `yatma`.

### Tek çözüm

Üçünü aynı anda çalıştırmanın yolu **tek bir birleşik
`player.entity.json`** yazmaktır: üç animasyon haritasını elle
birleştirmek, çakışan anahtarları çözmek, render controller
koşullarındaki `!variable.donusuk` ve `!query.is_spectator` kollarını
korumak.

Bu, A seçeneğinde de B seçeneğinde de yapılması gereken iştir —
varlıkları almak bu çakışmayı çözmez.
