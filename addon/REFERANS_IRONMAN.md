# Referans · Iron Man Add-on

**Kaynak:** `Iron_Man_Add-on.mcaddon` · Minecraft **Bedrock** · yazar **Mr. Nido**
("Created by Mr. Nido", `manifest.json`).

**Yöntem:** paket açıldı, JSON ve `.js` dosyaları okundu. Oyun **çalıştırılmadı**;
buradaki her sayı dosyadan ölçüldü, oyun içi davranış doğrulanmadı.

> **LİSANS — önce bu.** Pakette **lisans dosyası yok** → tüm hakları saklı.
> Üstelik iki katman var: paketi yapan (Mr. Nido) ve marka sahibi
> (Marvel/Disney — Iron Man, Ultron, Mandarin, Hulkbuster, Whiplash;
> ayrıca pakette `the_boys:` ad alanı da var). **Doku, model, ses, animasyon
> ve kodun hiçbiri depoya alınmadı ve alınmayacak.**
>
> Bu belge **yalnızca ölçümdür**. Bir mekaniğin hangi sayılarla kurulduğunu
> okuyup **kendi uygulamamızı kendi varlıklarımızla yazmak** serbest —
> bu deponun bütün `REFERANS_*` dosyaları zaten böyle çalışıyor.

## Paketin ölçüsü

| | |
|---|---|
| Toplam dosya | 1520 |
| Kimlik | 447 — `ironmanaddon:` 416, `gunsaddon:` 14, `caaddon:` 7, `hulkaddon:` 3, `the_boys:` 3 |
| Eşya dosyası | 155 |
| Mermi varlığı | 29 |
| Geometri | 159 |
| Manifest UUID | 4 |

`pa:` ile **hiçbir kimlik çakışması yok** (581 ↔ 447, kesişim boş). UUID
çakışması da yok.

## Zırh nasıl kurulmuş — beklenenden farklı

Zırh **varlık değil, eşya**. 67 giyilebilir parçanın hepsi
`slot.armor.feet` yuvasında; aktivasyon için `slot.armor.legs`'de bir
reaktör şart.

**Ölçülen önemli ayrıntı: zırhların `minecraft:armor` bileşeni YOK.**
155 eşyanın yalnız 8'inde var, onların da `protection` değeri 0 veya 3.
Yani zırhın kendi koruması **sıfır** — savunmanın tamamı efektlerden
geliyor. (Bu, ilk taramada yanlış ölçülmüştü; "protection 7–20" diye
bir değer paketin içinde yok.)

## Efektler — `infinite` uygulama, `0` silme

Komutlar `animation_controllers/ironman/` altında. Ayrımı yapmak şart:
`/effect ... 0 <amp>` bir **silme** komutudur, verme değil.

**Normal zırh — gerçekten uygulanan yalnız üç efekt:**

| komut | anlamı |
|---|---|
| `health_boost 999999 4` | amplifier 4 = kademe 5 → **+20 CAN** (toplam 40) |
| `levitation infinite 7` | uçuş |
| `slow_falling infinite 0` | yavaş düşüş |

Normal zırhta `resistance`, `speed`, `strength`, `haste` **yalnız süre 0
ile**, yani sadece temizleniyor. Zırhlı oyuncu hızlı veya güçlü değil —
**sadece uçuyor ve iki kat canı var.**

**Hulkbuster — asıl güçlü olan bu:**

| efekt | kademe | etkisi |
|---|---|---|
| `health_boost` | amp 9 → kademe 10 | **+40 CAN** (toplam 60) |
| `resistance` | amp 3 → kademe 4 | **%80 hasar azaltma** |
| `speed` | amp 3 | hız 4 |
| `haste` | amp 2 | kazma hızı 3 |
| `strength` | amp 1 | güç 2 |
| `jump_boost` | amp 1 | |
| `fire_resistance` · `night_vision` · `water_breathing` | | |

**Bizim için çıkarım:** "%80 azaltma + 60 can" birleşimi bir kademe
değil, bir **tavan**. `resistance 4` vanilla üst sınırıdır; üstüne
zırh koruması binerse oyuncu pratikte ölmez. Kendi zırh kademelerimizi
tasarlarken bu birleşimi **hedef değil sınır** olarak okumak gerekiyor.

## Hasar tablosu — ölçülen

Eşyaların `minecraft:damage` değeri yanıltıcı: 64 eşyanın 54'ü sabit **5**.
Gerçek hasar mermi varlıklarında.

| mermi | hasar | patlama yarıçapı |
|---|---:|---:|
| `mega_explotion_shoot` | **99** | 1.5 |
| `mega_unibeam_shoot` | **80** | 3.5 |
| `unibeam_shoot` | 24 | **7.0** |
| `ultron_special_attack_shoot` | 20 | — |
| `displacer_sentries_shoot` | 19 | 4.0 |
| `repulsor_gamma_shoot` · `shotgun_shoot` · `unibeam_gamma_shoot` | 16 | 2.0 |
| `repulsor_cannon_shoot` | 15 | — |
| `bomb` · `guided_rockets_shoot` · `misil_shoot` · `ultron_laser_shoot` | 14 | 3.0 |
| `minigun_shoot` | 11 | — |

Alan hasarı komutları (`/damage @e[...]`) en fazla **16**, yarıçap 3–5.

Karşılaştırma için: TNT'nin patlama gücü 4. `unibeam_shoot`'un **7.0**'ı
TNT'nin ~1.75 katı ve blok kırıyor.

## Silahlar `shooter` kullanmıyor — öğrenilecek numara

Paket `minecraft:shooter`/`projectile` yerine şunu yapıyor:

1. Eşyaya `minecraft:food{can_always_eat:true}` + `use_duration 999999`
   veriliyor → eşya **basılı tutulabilir** hale geliyor.
2. Animasyon zaman çizgisi `/event entity @s ...` basıyor.
3. `player.json`'daki component_group `spawn_entity` ile mermiyi doğuruyor.

`player.json` ezmesi: **27 entity property, 33 component_group, 58 olay**.

Bu numara bizde de işe yarayabilir — ama bizim `butce.js`'imiz varlık
doğurmayı tick başına 4 ile sınırlıyor, bu paket sınırsız doğuruyor.

## Boss'lar

| varlık | can | saldırı | hız |
|---|---:|---|---:|
| `mandarin` | 1250 | 14 | 0.35 |
| `ultron` | 1200 | 8 / 16 | 0.45 |
| `whiplash` | 350 | 12 / 14 | 0 (sabit) |
| `hulkbuster_veronica` | 200 | — | 0 |
| `iron_legion` | 100 | — | 0 |

`hulkbuster` bir boss **değil** — oyuncunun giydiği gövde eşyası.

## Performans — alınmaması gereken kısım

`scripts/` altında **8 `system.runInterval`, hiçbirinde periyot yok**:

| dosya | runInterval | komut çağrısı |
|---|---:|---:|
| `ironman_weapons.js` | 0 | **159** |
| `ironmanManufacturer.js` | 1 | **135** |
| `ironman_mode.js` | 0 | 34 |
| `fly_system/ironman.js` | 2 | 18 |
| `fly_system/mandarin.js` | 2 | 16 |
| `fly_system/ultron.js` | 2 | 16 |
| `fly_system/ironman_flight_fall_reset.js` | 1 | 6 |
| `ironman_hammer.js` | 0 | 4 |

Periyotsuz `runInterval` **her tick** koşar. Bu yapı bizim tick bütçemizin
(`butce.js`: 56 blok / 4 varlık / 1 patlama) tam tersi. **Bu desen
kopyalanmayacak** — aynı oynanış bizde olay tabanlı (`afterEvents`) ve
bütçeye bağlı yazılır.

## Paketin kendi kusurları (bizim almayacağımız şeyler)

- `geometry.hulkbuster` (337 kutu, paketin en büyük modeli) hiçbir yerden
  çağrılmıyor; toplam 17 geometri ölü.
- `ironman_mode.js` (248 satır) ve `fly_system/flight_state.js` `index.js`
  tarafından import edilmiyor; ikincisi Bedrock'ta **olmayan** `setTimeout`
  kullanıyor.
- `spawn_rules/ultron.json` içindeki identifier yanlışlıkla `ultron_sentries`
  → Ultron'un doğma kuralı yok.
- 3 geometri `bicim_dogrula.py`'den düşüyor (hepsi eski `format_version`).
- `ironman_gun_ui_v2.png` **3096×3096** (bellekte ~38 MB).
- `ironman_tokens.psd` — yazarın Photoshop kaynak dosyası, kazara pakete
  karışmış.

## `minecraft:player` çakışması

Bu paket `minecraft:player`'ı **hem davranış hem kaynak** tarafında eziyor.
Bizim `Simsek_Oyuncu_Modeli/entity/player.entity.json` ile aynı anahtar,
aynı `format_version` (1.10.0) → Bedrock bunları **birleştirmez**.

| | animasyon | doku | geometri |
|---|---:|---:|---:|
| Depo | 77 | 70 | 76 |
| Iron Man | 171 | 75 | 18 |
| **kesişim** | **68** | 2 | 2 |

Bu paket üstte kurulursa deponun oyuncu katmanı tamamen düşer.
Ayrıntı ve çözüm: `REFERANS_NPA.md` → "Üç taraflı çakışma".
