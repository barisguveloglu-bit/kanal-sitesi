# Savunma planı — ölçülmüş tehdit modeli

Kullanıcı: *"Kendi dünyamızı sağlamlaştırmak istiyorum, oradaki her
senaryoyu düşün."*

Bu dosya tahmine değil, gönderilen üç APK'nin **kendi ayar
listesine** dayanıyor (`resources.arsc` içindeki `s_*` anahtarları).
65 özellik, dört aile.

## ÖNCE BİR DÜZELTME

Önceki turda "asıl mesele operatör yetkisi, verme yeter" denmişti.
**Bu eksikti.** Özellik listesi çıkarılınca görüldü: bu araçların
büyük kısmı **operatör yetkisi istemiyor.** Killaura, reach, uçma,
xray, ESP — hiçbiri komut değil, istemci tarafında oyunun kendi
paketlerini değiştiriyor.

Arınma ve Savunma Kipi (v7.28–7.29) **komut ailesine** karşı yazıldı
ve orada iş görüyor. Ama komut ailesi bu 65 özelliğin küçük bir
dilimi. Operatör kapısını kapatmak gerekli, **yeterli değil.**

## Dört aile

### 1. GÖRÜNTÜ — 18 özellik · savunması YOK

    xray · xray_block_tracker · xray_chest_esp · xray_player_esp
    tracers (oyuncu/mob renkli) · minimap (+ oyuncu gösterme)
    freecam · fullbright · zoom · hp_bars · armor_hud
    outline_renderer

Bunlar tamamen **onun ekranında** olan şeyler. Sunucuya hiçbir şey
göndermiyorlar. Bir davranış paketi bunları ne görebilir ne
engelleyebilir — dünyada nerede olduğunu, sandıkta ne olduğunu,
canını duvarın arkasından görüyor.

**Bu ailenin kod tarafında karşılığı yok. Kabul etmek gerekiyor.**
Tek gerçek karşılık: bilgi saklamayan bir dövüş düzeni (açık arazi,
gizli kutu/tuzak kurmamak).

### 2. HAREKET — 16 özellik · çoğu ÖLÇÜLEBİLİR

    flying · vanilla_fly_bypass · no_clip · phase · speed (+çarpan)
    high_jump (+yükseklik) · air_jump · blink · tap_teleport
    jesus · no_fall · no_slowdown · auto_sprint · slow_falling

Hepsi **konumu** değiştiriyor. Konum sunucuya geliyor. Yani:
tick başına yer değiştirme, düşüş hasarı alıp almadığı, katı bloğun
içinden geçip geçmediği, ışınlanma sıçraması — **hepsi ölçülebilir.**

### 3. DÖVÜŞ — 13 özellik · yarısı ÖLÇÜLEBİLİR

    killaura (+mob/oyuncu, aralık) · reach · reach_fix (online)
    hitbox_expand (mob/oyuncu) · anti_knockback
    auto_armor · auto_bow · switcher · tp_to_player

Ölçülebilenler:
- **reach** — vuruş anında saldıran ile hedef arası mesafe
- **killaura** — saniyedeki vuruş sayısı, ve **bakış açısı**:
  killaura hedefe bakmadan vuruyor, insan vuramaz
- **anti_knockback** — biz geri ittikten sonra gerçekten geri gitti mi
- **tp_to_player** — ani konum sıçraması

Ölçülemeyenler: auto_armor, auto_bow, switcher (envanter otomasyonu,
insanın hızlı yapmasından ayırt edilemez).

### 4. DÜNYA — 18 özellik · karışık

    give_item · enchant · nbt_editor · chest_stealer · spawn_exp
    fast_destroy (+menzil) · rapid_build (+boşluk/tekrar/yapışkan)
    bridge_builder · haste_effect · far_bypass · pick_distance
    name_override · force_achievements

- `give_item` / `enchant` / `nbt_editor`: sunucunun izin vermesi
  gerekiyor → **operatör kapısı burada geçerli**
- `fast_destroy` / `rapid_build` / `bridge_builder`: kırma ve koyma
  **hızı ölçülebilir**
- `chest_stealer`: normal sandık etkileşimi, ayırt edilemez

## Senaryo tablosu — kendi dünyamız

| senaryo | bugün | yapılabilir |
|---|---|---|
| komutla kilit (poz/girdi/kamera/efekt) | **Arınma + Savunma Kipi** ✓ | — |
| `/kill` | yok | yok |
| envanteri `/clear` ile silme | yok | **envanter yedeği** |
| bloklarla hapsetme | yok | **kafes kırma** |
| ışınlayıp atma | yok | **konum sıçraması denetimi** |
| gamemode creative'e geçme | yok | **denetle ve geri al** |
| reach ile uzaktan vurma | yok | **mesafe denetimi** |
| killaura | yok | **vuruş hızı + bakış açısı** |
| anti-knockback | yok | **geri itme doğrulaması** |
| uçma / hız / yüksek zıplama | yok | **konum/fizik denetimi** |
| noclip / phase | yok | **katı blok içinde mi** |
| hızlı kazma / rapid build | yok | **kırma-koyma hızı** |
| xray · ESP · tracer · minimap · freecam | **yok** | **YOK — mümkün değil** |

## Önerilen sıra

Etki × yapılabilirlik sırasıyla:

1. **Menzil denetimi (reach)** — en yüksek etki, en net ölçüm.
   Vuruş anında mesafe zaten elimizde.
2. **Killaura denetimi** — vuruş hızı + bakış açısı. Açı ölçümü
   sağlam: insan bakmadan vuramaz.
3. **Envanter yedeği** — deponun "eşya kaybı yasak" kuralının
   savunma karşılığı. `/clear` ve ölümün karşılığı.
4. **Hareket denetimi** — hız/uçuş/ışınlanma. En çok yanlış alarm
   üretme riski taşıyan aile; en sona bırakılmalı çünkü lag ve
   kendi yeteneklerimiz (uçurma, ışınlanma, atılım) de konum
   sıçratıyor.
5. **Kafes kırma** ve **gamemode denetimi** — küçük ve ucuz.

## Yanlış alarm uyarısı

Bu modda konum sıçratan, hızlandıran, uçuran **kendi
yeteneklerimiz** var (Uçurma, Işınlanma, Atılım, Kasırga, Meteor).
Hareket denetimi yazılırsa bunları tanımak zorunda — yoksa savunma
kendi oyuncusunu suçlar. Bu, sıra 4'ün en sonda olmasının sebebi.
