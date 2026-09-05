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
| envanteri `/clear` ile silme | **Envanter Yedeği** ✓ (v7.30) | — |
| bloklarla hapsetme | **Kafes Kır** ✓ (v7.36) | — |
| ışınlayıp atma | **Hareket denetimi** ✓ (v7.30) | — |
| gamemode creative'e geçme | yok | **denetle ve geri al** |
| reach ile uzaktan vurma | **Gözcü** ✓ (v7.30) | — |
| killaura | **Gözcü** ✓ (v7.30) | — |
| anti-knockback | **Gözcü** ✓ (v7.31) | — |
| uçma / hız / yüksek zıplama | **Hareket denetimi** ✓ (v7.30) | — |
| noclip / phase | yok | **katı blok içinde mi** |
| hızlı kazma / rapid build | **Blok hızı denetimi** ✓ (v7.36) | — |
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


## v7.36 sonrası durum

Yukarıdaki tablo WDBAX_Client.apk incelemesinden sonra
güncellendi (bkz. `REFERANS_WDBAX_APK.md`). Ayrıca eklendi:

| senaryo | bugün |
|---|---|
| ekranı title duvarıyla kapatma | **Arınma** ✓ (v7.35) |
| ses bombası (`/playsound`, `/music`) | **Arınma** ✓ (v7.35) |
| sis (`/fog push`) | **Arınma** ✓ (v7.35) |
| bloklarla hapsetme | **Kafes Kır** ✓ (v7.36) |
| rapid build · nuke · fast destroy | **Blok hızı** ✓ (v7.36) |

Geriye kalan gerçek açıklar: `/kill`, `/damage`, `/gamemode`,
`/summon` ve ekran-tarafı görüş hileleri (ESP ailesi).


## v7.38 sonrası durum — iki APK daha

`REFERANS_BLOODY_APK.md` · `REFERANS_WCLIENT_APK.md`

**BloodyClient**, Toolbox'ın üçüncü kopyası çıktı: 65 ayar
anahtarı yukarıdaki listeyle birebir aynı. Yeni saldırı yok,
yeni savunma da gerekmedi.

**WClient v36** bu dosyanın varsayımını değiştiriyor. Yukarıdaki
tehdit modeli "oyunun içine giren araç" üzerine kuruluydu.
WClient bir **vekil**: oyun `127.0.0.1:19132`'ye bağlanıyor,
vekil gerçek sunucuya bağlanıyor, aradaki paketleri yeniden
yazıyor. Sonuçları:

- **Oyun sürümüne bağlı değil.** Toolbox beş ayrı `.so` taşıyor;
  vekil protokol konuşuyor (53–898 arası sürümler).
- **Operatör yetkisi hiç istemiyor.** Yukarıdaki "operatör
  kapısı gerekli ama yeterli değil" düzeltmesi burada iyice
  keskinleşiyor: `give_item`/`enchant`/`nbt_editor` gibi komut
  ailesi zaten küçük bir dilimdi, vekilde daha da küçük.
- **Ama gönderdiği her şey hâlâ paket.** Ölçülebilir olan
  ölçülebilir kalıyor. Vekil olması savunmayı zorlaştırmıyor;
  kapsamı genişletiyor.

### Tabloya eklenenler

| senaryo | bugün |
|---|---|
| `packetsPerAttack` (tek sallışta çoklu saldırı) | **Gözcü · aynı tick** ✓ (v7.38) |
| gamemode creative'e geçme | **Oyun kipi denetimi** ✓ (v7.38) |
| noclip · phase | **Katı blok içinde** ✓ (v7.38, Savunma Kipi) |
| tpmine (cevhere ışınlanma) | **Katı blok içinde** ✓ (v7.38, Savunma Kipi) |
| auto_disconnect (savaştan kaçış) | **Kaçış denetimi** ✓ (v7.38, bildirim) |

"Önerilen sıra" listesindeki 5. madde (**gamemode denetimi**)
ve "yapılabilir" sütunundaki **noclip/phase** böylece kapandı.

### Hâlâ açık kalanlar

- `/kill` · `/damage` · `/summon` — komut ailesi, karşılığı yok.
- **Bütün görüntü ailesi** — BlockESP · ChestESP · Nametags ·
  Minimap · FreeCamera · Fullbright · Zoom · StashFinder ·
  ChunkFinder. Sunucuya hiçbir şey göndermiyorlar. **Bu satır
  değişmeyecek**; mümkün değil, mümkünmüş gibi de yazılmayacak.
- `AntiDebuff` — vekil etkiyi istemciye ulaşmadan düşürüyor,
  sunucuda etki duruyor: ölçülecek iz yok. Zaten işine de
  yaramıyor, hasar sunucu tarafında uygulanıyor.
- Envanter otomasyonu (`AutoTotem`, `InventoryHelper`,
  `Switcher`, `FastDrop`) — insanın hızlı yapmasından ayırt
  edilemez.
- `Disabler` · `Desync` · `PingSpoof` · `Blink` — paketi
  geciktirip toplu gönderiyorlar. İzleri ışınlanma ölçümüne
  düşüyor ama bu tesadüfi; ölçüm bunun için yazılmadı.

### Kapalı düğme uyarısı

Katı blok denetimi **Savunma Kipi açıkken** çalışıyor (blok
okuma bütçesi, `REFERANS_WCLIENT_APK.md`). Oyun kipini **geri
alma** da öyle. İkisi de vs başlarken düğmeye basılmasına bağlı;
basılmazsa ölçüm yapılmıyor. Gizli kalmasın diye buraya yazıldı.


## Kapsam ölçümü — "yüzde kaç?"

Kullanıcı sordu: *"savunmamız yüzde kaç ve ne kadar arttı?"*

Sayı **tahmin edilmedi**. `savunma_olc.py` dört APK'nin kendi
ayar/modül listesinden çıkarılmış **85 özelliği** tek tek
sınıflandırıyor ve saydırıyor. Aşağıdaki tablo o betiğin
çıktısı; değiştiren biri betiği çalıştırmak zorunda, çünkü
`test/savunma_kapsam.mjs` ikisinin uyuştuğunu tutuyor.

### Bu yüzde ne DEĞİLDİR

**"%67 güvendesin" demek değil.** Bu bir *özellik sayan* ölçü:
kaçan tek bir killaura, göremediğimiz on tane HUD parçasından
daha önemli. Ağırlık verilmedi çünkü ağırlığı kimin vereceği
belli değil — uydurulmuş bir ağırlık, uydurulmuş bir yüzde
üretir.

### Sayım

| durum | sayı | ne demek |
|---|---|---|
| **kapalı** | **28** | bizim kodumuz görüyor |
| açık | 14 | ölçülebilir ama yazılmadı |
| ayırt edilemez | 12 | sunucuya geliyor, dürüst oyundan ayrılamıyor |
| operatör kapısı | 5 | op vermemek yeterli |
| **imkânsız** | **26** | tamamen ekran tarafı, asla görülemez |
| toplam | 85 | |

### İki yüzde

- **Ham kapsam: %33** (28/85)
- **Engellenebilirin kapsamı: %67** (28/42) ← anlamlı olan

Ham kapsamın tavanı 100 değil, **%49**. Görüntü ailesi (26),
ayırt edilemeyenler (12) ve op ailesi (5) bir davranış
paketinin ulaşabileceği yerde değil. Yani ham sayı hiçbir
zaman %49'u geçemez ve bugün onun **üçte ikisindeyiz**.

### Sürüme göre artış

| sürüm | kapalı | ham | engellenebilir | o sürümde eklenen |
|---|---|---|---|---|
| v7.27 | 0 | %0 | %0 | *(savunma yoktu)* |
| v7.28 | 1 | %1 | %2 | Arınma |
| v7.29 | 2 | %2 | %5 | Savunma Kipi |
| v7.30 | 12 | %14 | %29 | Gözcü + hareket + envanter yedeği |
| v7.31 | 13 | %15 | %31 | geri itme |
| v7.35 | 16 | %19 | %38 | ekran · ses · sis |
| v7.36 | 22 | %26 | %52 | blok hızı + Kafes Kır |
| **v7.38** | **28** | **%33** | **%67** | aynı tick · oyun kipi · katı blok · kaçış |

**v7.36 → v7.38 artışı: engellenebilirin %52'sinden %67'sine**
(altı özellik). En büyük tek sıçrama hâlâ v7.30 (Gözcü'nün
kurulduğu sürüm): %5'ten %29'a.

### Açık kalan 14 — sıradaki iş listesi

Hepsi **ölçülebilir**, sadece yazılmadı:

`no_fall` · `jesus` · `spider` · `anti_void` · `slow_falling`
(hareket ailesi, hepsi konum/hasar tutarsızlığı) ·
`far_bypass` · `pick_distance` (blok koyma mesafesi) ·
`auto_crystal` (koyma+vurma hızı) · `fake_death` ·
`spammer` (sohbet hızı) · `blink` · `disabler` · `desync` ·
`ping_spoof` (dördü de paket geciktirme ailesi).

Bunların hepsi yazılsa engellenebilir kapsam **%100** olurdu,
ham kapsam **%49**. Ondan sonrası mümkün değil.
