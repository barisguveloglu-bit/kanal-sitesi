# Referans · Craftformers Prime 0.5.8.1

**Kaynak:** `tfp-forge-1.20.1-0.5.8.1.jar` · Minecraft **1.20.1** · Forge ·
modId `tfp` · yazar **Bit & Byte Development Team**.

**Yöntem:** jar **hiç çalıştırılmadı**. Zip olarak açıldı, `.class`
dosyaları `javap -p -c` ile okundu, model JSON'ları deponun kendi
`arac/java_gorsel_coz.py --rapor` aracıyla ölçüldü.

> **LİSANS — BELİRSİZ, tahmin üretilmedi.**
> Jar kökünde `LICENSE_Craftformers Prime` var ve içi **ham CC0 1.0
> metni** — başlıksız, kapsamsız, telif satırsız. Ama `META-INF/mods.toml`
> `license = "All Rights Reserved"` diyor ve yanında MDK şablonunun
> varsayılan yorumu duruyor (`# Review your options at
> https://choosealicense.com/.`); diğer şablon alanları da
> (`updateJSONURL`, `displayURL`, `issueTrackerURL`) hâlâ yer tutucu.
> Hangi beyanın kasıtlı olduğu jar'dan **cevaplanamıyor**.
>
> Ayrıca CC0 geçerli olsa bile yalnız Bit & Byte'ın **kendi** haklarından
> feragat eder — **Transformers markası Hasbro'nundur** ve karakter
> adları, siluetler, sesler o kapsamda değildir.
>
> **Jar depoya alınmadı.** Bu belge yalnızca ölçümdür.

## Modun ölçüsü

| | |
|---|---|
| Toplam dosya | 768 |
| `.class` | 308 |
| `.json` | 213 (98'i model) |
| `.png` | 209 |
| `.ogg` | 26 |
| Oynanabilir transformer | **18** |
| Mixin | 5 |

## 18 transformer — künyeler

`bnb/tfp/reg/PlayableTransformers` sınıfının `<clinit>` bytecode'undan
çıkarıldı. Her satır `TransformerType$Builder` zincirinden okundu.

| transformer | fraksiyon | araç | can | silah | tüfek | slh CD | tfk CD | yolcu |
|---|---|---|---:|---:|---:|---:|---:|---:|
| bulkhead | Autobots | Car | **90** | 12 | 8 | 1.2 | 0.9 | 5 |
| breakdown | Decepticons | Car | **90** | 12 | 8 | 1.2 | 0.9 | 0 |
| megatron | Decepticons | Aircraft | 85 | **14** | 10 | 0.8 | 1 | 0 |
| optimus_prime | Autobots | Car | 80 | 13 | 8 | 1 | 0.8 | 2 |
| nemesis_prime | Decepticons | Car | 80 | 13 | 8 | 1 | 0.8 | 0 |
| ultra_magnus | Autobots | Car | 75 | 9 | 9 | 0.6 | 0.5 | 2 |
| shockwave | Decepticons | **Tank** | 75 | 6 | **12** | 0.6 | 1 | 0 |
| soundwave | Decepticons | Aircraft | 65 | 10 | 8 | — | 0.6 | — |
| bumblebee | Autobots | Car | 65 | 9 | 9 | 0.6 | 0.5 | 5 |
| starscream | Decepticons | Aircraft | 65 | 9 | 9 | 0.6 | 0.8 | 0 |
| wheeljack | Autobots | Car | 65 | 9 | 8 | 0.6 | 0.6 | 4 |
| ratchet | Autobots | Car | 65 | 8 | — | 0.6 | — | **6** |
| knockout | Decepticons | Car | 65 | 8 | — | 0.6 | — | 0 |
| airachnid | Decepticons | **Helicopter** | 60 | 5 | 6 | 1 | 0.5 | — |
| vehicon_ground | Decepticons | Car | 55 | 7 | 4 | 0.5 | 0.25 | 0 |
| vehicon_flyer | Decepticons | Aircraft | 55 | 7 | 4 | 0.5 | 0.25 | 0 |
| arcee | Autobots | Car | 50 | 6 | 6 | 0.4 | 0.6 | 1 |
| vehicon_miner | Decepticons | Car | **40** | — | 4 | — | 0.5 | 0 |

CD = cooldown (saniye). `—` = o silah/alan tanımlı değil.

**Tasarım dengesi okunuyor:** can 40–90, silah hasarı 5–14 ve ikisi
**ters orantılı değil** — Bulkhead hem en dayanıklı (90) hem üst sınıf
hasar (12) veriyor, dengeyi cooldown ile kuruyorlar (1.2 sn, tablodaki
en yavaş). Arcee tersi: en düşük can (50), en düşük hasar (6), ama en
hızlı silah (0.4 sn). **Yani denge kaldıraçları can ve hasar değil,
cooldown.** Bizim silah kademelerimizde kullanılabilir bir fikir —
şu an bizde cooldown bir denge aracı olarak neredeyse hiç kullanılmıyor.

## Transformer olmanın oyuncuya verdikleri

`bnb/tfp/mixin/MixinPlayer` ve `PlayableTransformer` bytecode'undan
ölçüldü:

| özellik | değer | nereden |
|---|---|---|
| **Düşme hasarı** | **tamamen bağışık** | `m_142535_`: `isTransformerStatic` ise `return false` |
| Zıplama gücü | **×1.5** | `getJumpPowerCoef` → `fconst 1.5f` |
| Basamak yüksekliği | **1.0 blok** | `getMaxUpStep` → `fconst_1` |
| Blok erişimi | **7.0 blok** | `getBlockReach` → `double 7.0d` |
| Varlık erişimi | **5.0 blok** | `getEntityReach` → `double 5.0d` |
| Maksimum can | tabloya göre | nitelik olarak yazılıyor |

Araç hızları (`VehicleType` `<clinit>`, ikinci argüman = tavan hız,
blok/tick):

| araç | tavan hız |
|---|---:|
| AIRCRAFT | 2.5 |
| CAR | 2.0 |
| TANK | 1.5 |
| HELICOPTER | 1.2 |

Uçuş yalnız `AIRCRAFT` / `HELICOPTER` tipinde ve **yalnız dönüşmüşken**.

## Tetikleyici: tuş, eşya değil

| tuş | işlev |
|---|---|
| R (82) | dönüşüm |
| Z (90) | tüfek |
| G (71) | silah |
| V (86) | özel |

Tuş başına **10 tick** istemci beklemesi. Komut da var:
`/transformer setself|clearself|set|clear` (son ikisi OP).
**Eşya ile dönüşüm yok.**

Veri saklama: `TFPData extends SavedData`, dünya verisinde `tfp_data`
adıyla, `HashMap<UUID, PlayableTransformer>`. NBT anahtarları:
`Type / Faction / Variant / PassengersLimit / DarkEnergon / F5Swap /
Flags`. `Flags` bir bit maskesi (1…128; 128 = hologram).

**Bizim için çıkarım:** Bedrock'ta `SavedData` karşılığı yok, ama
`world.setDynamicProperty` aynı işi görüyor. Bit maskesi ile çok durumu
tek sayıda tutma fikri bizde de kullanılabilir — şu an her durum ayrı
skorbord/etiket tutuyor.

## Enerjon — iki ayrı sistem

1. **Blok enerji ağı:** `EnergonTank` + `EnergonCable` + `EnergonPowered`
   arayüzü, `float energonLevel`. Kapasite ve birim **ölçülemedi**.
2. **Yiyecek:** 5 parça, hepsi besin **9** / doygunluk **12.8** /
   `alwaysEat`. Transformer olmayan yiyemiyor.

**Kara Enerjon** ayrı bir işaretli sayaç: `+1` dark, `−1` synth_en,
normal shard `±2` ile sıfıra çeker. İşaret ters yönde zorlanınca oyuncu
**Terrorcon** (vampir) oluyor: vurduğu oyuncudan `+20` açlık çalıyor,
`%6.25` bulaştırma.

Bu, bizde olmayan bir kalıp: **tek eksenli, iki yönlü, eşik aşınca
kalıcı dönüşüm yapan bir sayaç.** Ben 10 ve zırh sistemlerimizde
karşılığı yok, ilginç.

## Mixin'ler — neyi değiştiriyorlar

| mixin | işlevi |
|---|---|
| `MixinPlayer` | **11 kanca** — tick, binme, düşme hasarı, saldırı, boyut, travel/uçuş, zıplama, basamak. Modun kalbi. |
| `MixinGameRenderer` | görüş sallanmasını iptal eder |
| `MixinInventoryScreen` | envantere Transformer Editor düğmesi ekler |
| `MixinCreativeModeInventoryScreen` | aynısı, creative envanterde |
| `MixinWebBlock` | **yalnız Airachnid'i** örümcek ağı yavaşlatmasından muaf tutar |

Sonuncusu güzel bir ayrıntı: tek karaktere özel bir fizik muafiyeti,
tek bir mixin'le. Bizde karaktere özel muafiyetler `_simsek_hasar.js`
içindeki `SIMSEK_EK_MUAF` gibi listelerle yapılıyor — aynı fikir.

## Model durumu — çevrilebilirlik

98 model JSON'un **yalnız 23'ü** `elements` içeriyor; kalanı ya
`parent` kullanıyor ya da kod tarafında çiziliyor.

`arac/java_gorsel_coz.py --rapor` ile ölçüm:

- **24/24 çevrildi ve `bicim_dogrula.py`'den geçti.** (Ölçüm önce 23
  demişti; `black_hat.json` `elements` anahtarını taşıyor ama içi boş,
  o yüzden sayım 24.)
- **8'i tamamen düzlemsiz** → çevrilmeye en uygun adaylar.
- `block/energon_tank` **ters yazılmış**: 2. elemanında `from[0]=15.998
  > to[0]=0.002`. Java bunu tolere edip aynı kutuyu çiziyor. Çevirici
  v7.94.8'e kadar bunu **negatif `size`'a** çeviriyordu; artık
  normalleştiriyor ve `--rapor` "ters kutu" diye sayıyor.
  (İlk taramada "Bedrock kabul etmez" yazılmıştı — bu **ölçülmemiş bir
  iddiaydı**. Bedrock negatif boyutlu kutuyu reddetmiyor, ters/aynalanmış
  çiziyor; depomuzun kendi Ben 10 modellerinde 103 tane var ve
  sürümlerdir çiziliyorlar. Asıl sorun belirsizlikti, ret değil.)
- `signal_navigator` %55 düzlem, `synth_en` %50 düzlem.
- `main_control_panel`'de **46 birim** genişlikte bir kutu var.
  Bu, **varlık geometrisi olarak sorun değil** (Bedrock varlık
  kutularında 16 sınırı yok); ama 16'lık blok aralığını aştığı için
  **blok modeli olarak kullanılamaz**.
- 4 model ne `parent` ne `elements` içeriyor (blok-varlık renderer'ı).

### Çevrilebilir olanlar ne, gerçekten

Çevrilen 24 modelin dökümü: **9 peluş** (`*_plushy` — birkaçı zaten
kodda kayıtsız, ölü), 2 şapka, 2 kablo parçası, 2 dizüstü, enerjon
kristali/tankı, kontrol paneli, sinyal navigatörü, 2 eldiven varyantı.

**Transformer modellerinin hiçbiri burada değil.** Optimus, Megatron
ve diğer 16'sı `client/model/**` altındaki 41 kodlanmış sınıfta —
`elements` JSON'u olarak hiç yoklar. Yani bu modun görsel değerinin
büyük kısmı `java_gorsel_coz.py` ile **alınamıyor**; alınabilen kısım
dekoratif eşya.

Kalan **41 model kod içinde sınıf olarak** çizilmiş (`client/model/**`).
Onlar `java_gorsel_coz.py`'nin değil, `jar_model_coz.py`'nin işi — ama
bu mod 1.20.1, o araç 1.12 `ModelBase` üzerine kurulmuştu; **denenmedi**.

> **Hatırlatma (CLAUDE.md):** Java tarafında model iki biçimde durur ve
> çevrimleri **ayrıdır** — `ModelBase` için `24 - y`, kaynak paketi
> `elements` için **Y kaymaz, yalnız X/Z −8**. Birini ötekine uygulamak
> sessiz hatadır.

## Sesler ve dokular

26 `.ogg`, hepsi mono 44100 Hz, toplam **51.52 s** (Ogg granule'den
ölçüldü, ffprobe yok). `sounds.json` 30 olay tanımlıyor.

İki hata: `transformer.megatron.revert` yanlışlıkla `megatron/transform`
dosyasını gösteriyor (revert dosyası diskte yok); bütün `hide_gun`
olayları `equip_gun` altyazısını kullanıyor.

208 PNG. Transformer dokuları 256–512 px ve **katmanlı**:
`main / secondary / glowing / eyes / insignia` — lang'deki
`colorlayer.tfp.*` anahtarlarıyla birebir örtüşüyor, yani renk
katmanları oyuncuya açık bir özelleştirme sistemi.

**Bu bizde yok ve yapılabilir:** tek doku yerine katmanlı doku +
oyuncunun seçtiği renk. Bizim zırh varyantlarımız şu an ayrı ayrı
PNG olarak duruyor.

## Ölü / kayıt dışı parçalar (almayacağımız şeyler)

- `nez`, `kking`, `infinicon`, `sunburst_plushy`, `remington_figurine`,
  `plant_plushy`, `red_plushy`, `whitino_plushy` — model/doku/blockstate
  var, **kodda tek referans yok**.
- `assets/tfp/textures/block/plant_plushy.png` **0 bayt (bozuk)**.
- `Shockwave.class` hiç kullanılmıyor.
- `runSpeed` / `altSpeed` alanları hiç yazılmıyor ve hiç okunmuyor.
- `Cliffjumper*Animation`, `RemingtonAnimation` kayıtsız.

## Ölçülemeyenler

- Lisans çelişkisinin hangi tarafı geçerli.
- Enerjon tankı kapasitesi ve birimi.
- `EnergonConverter`'ın kabul ettiği vanilya eşyaları (SRG adları
  çözülemedi).
- `client/model/**` altındaki 41 kodlanmış modelin geometrisi.
- GroundBridge çarpışma boyutu.
- Oyun içi davranışın hiçbiri — mod çalıştırılmadı.
