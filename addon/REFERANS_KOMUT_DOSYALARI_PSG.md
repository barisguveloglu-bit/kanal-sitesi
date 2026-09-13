# Referans · Komut dosyaları (PSG · LWESxSAPLAR · GÜLÜT + arşivin tamamı)

**Hiçbiri çalıştırılmadı.** Beş dosya da düz metin; okundu,
sayıldı, karşılaştırıldı. Oyunda hiçbir satırı denenmedi.

Bu dosyalar bir *program* değil: kurulum istemeyen, sohbete
yapıştırılan `.txt` listeleri. Savunma ölçümünde bu yüzden
kendi kaynak harfleri var (**K**) — apk/enjektör/vekil
ailelerinden dağıtım yolu bambaşka, ama tam da bu yüzden en
yaygın olanı: indirilecek bir şey yok.

| md5 | bayt | ad |
|---|---|---|
| `37847b3428275b41c812905fbfc502f3` | 5807 | `psgkodgm3_1.txt` |
| `e397a2be0bd28089b2fbdc409e3fc94a` | 6325 | `G__L__T_TLE.txt` |
| `07953809baa56cfb087e0ced17314d72` | 6792 | `…sxs…MAGMA_KODLARI.txt` |
| `7c3679d9cc7889b2efc829b8c6bd4b84` | 6615 | `…sxs…KALKMA_KODLARI….txt` |
| `2142785a297c4fddca22bc726dca3ab2` | 6565 | `…KALKMA_KODLARI….txt` |

Son ikisi birbirinin neredeyse aynısı: biri ötekinin başına
bir başlık satırı eklenmiş hâli.

---

## Sonuç: beşte bir yeni şey

Dördü zaten kapalı olan saldırıları tekrarlıyor. **Biri yeni
bir delik gösterdi** ve o delik v7.49'da kapatıldı.

| aile | dosya | bizde ne var | durum |
|---|---|---|---|
| efekt bombardımanı | PSG | `ARIN_EFEKTLER` (13 olumsuz efekt) | zaten kapalı |
| `camerashake` | PSG | Arınma 3. kol | zaten kapalı |
| title duvarı | PSG · GÜLÜT | Arınma 5. kol (`ARIN_EKRAN`) | zaten kapalı |
| blokla hapsetme | PSG · MAGMA | Kafes Kır (v7.36) | zaten kapalı |
| `playanimation` kalkma | 3 dosya | Poz Sandığı (70 poz) | zaten kapalı |
| mob/varlık spam | PSG · GÜLÜT | — | **operatör kapısı** |
| **`item_lock` ile zorla eşya takma** | **PSG** | **yoktu** | **v7.49'da kapatıldı** |

---

## Yeni olan: "KAFAYA BALKABAGİ SOKMA"

`psgkodgm3_1.txt` içindeki tek satır:

```
/replaceitem entity @a[name=!PSG1834] slot.armor.head 1
  carved_pumpkin 1 0 {"item_lock":{"mode":"lock_in_slot"}}
```

Kurbanın kafasına balkabağı takıyor ve **kilitliyor**. Balkabağı
ekranı kapatıyor, `lock_in_slot` da çıkarmayı imkânsız kılıyor.
Kalıcı: kendiliğinden geçmiyor, kurbanın elinde bir çıkış yok.

### Neden Arınma bunu tutmuyordu

Arınmanın sekiz kolu da **komutla geri alınabilen** şeylere
bakıyordu: girdi, kamera, sarsıntı, poz, ekran, ses, sis,
efekt. Kilitli eşya bunların hiçbiri değil — bir **envanter
durumu**. Sekiz kol da çalışıyordu ve kafasında balkabağıyla
dövüşen adam için bu, hiçbirinin çalışmamasıyla aynı şeydi.

### Bu kalıbı üçüncü kez görüyoruz

| kaynak | eşya | yuva |
|---|---|---|
| Falen Mod V2 (v7.1) | `sp:voidol` | `slot.armor.head` |
| Klezy konsey silahları (v6.3) | `klezy:toxic_skin` | `slot.armor.head` |
| PSG GM3 (v7.49) | `carved_pumpkin` | `slot.armor.head` |

Üçünde de aynı iki parça: görüşü kapatan bir eşya + `item_lock`.
İlk ikisinde kendi sürümümüzü yazarken bu kalıbı **reddetmiştik**
(bizimki yalnız vurduğuna bulaşır, eski miğferi deftere yazar,
süresi vardır). Ama *bize* yapıldığında karşılığı yoktu.

### Ne yazıldı

Arınmanın **9. kolu**: kilit sökme (`ZORLA_*`, `arinma.js`).

Ölçülen API — tahmin değil, `@minecraft/server` 2.9.0
`index.d.ts`:

```
ContainerSlot.lockMode : ItemLockMode        (okunur-YAZILIR)
ItemLockMode           = none | inventory | slot
EntityEquippableComponent.getEquipmentSlot(slot) -> ContainerSlot
```

Yani kilidi açmak için saldırandan izin gerekmiyor: kilit,
eşyanın üzerinde duran bir alan ve script onu yazabiliyor.

**İki kural, ikisi de eski kuralların devamı:**

1. **Eşya silinmiyor.** Kilit sökülüyor, eşya duruyor. Yalnız
   *görüşü kapatan* bir parça (balkabağı ailesi) kafadan
   indirilip envantere konuyor; envanterde yer yoksa kafada
   kalıyor — ama artık kilitsiz, elle çıkarılabiliyor.
   Aynı kural `kafes.js` (`KAFES_KORUNAN`), `konsey_silah.js`
   ("yuva boşsa") ve `envanter_yedek.js`'te de var.
2. **Kendi eşyamıza dokunulmuyor.** `pa:` önekli her şey
   atlanıyor. Void kolu, konsey derileri ve Düşmüş virüsünün
   parçaları kendi kurallarıyla çıkıyor.

### Testin yakaladığı hata

`test/kilit_sok.mjs` 4. bölüm ilk yazımda **kırmızı yandı**:
kilitsiz balkabağını da kafadan indiriyordu. Enderman'dan
korunmak için kendi isteğiyle balkabağı takan adamın kafasını
Arınma açıyordu.

Düzeltme tek satır: indirme hakkı ancak **kafadaki parça
kilitliydiyse** doğuyor. Kilitli olması "bunu sen takmadın"ın
tek ölçülebilir kanıtı — oyuncunun kendi eli bir eşyayı
kilitleyemez.

Mutasyon: 7 bozma denendi, 7'si de yakalandı.

---

## Yeni olmayanlar

### Efektler — hepsi zaten listede

PSG dosyası 23 `/effect` satırı sayıyor. Olumsuz olanların
tamamı `ARIN_EFEKTLER`'de:

`slowness · darkness · blindness · nausea · hunger · bad_omen ·
fatal_poison · mining_fatigue · levitation · wither · poison ·
weakness · slow_falling`

Listede **olmayanlar** kasten yok: `speed`, `strength`, `haste`,
`absorption`, `health_boost`, `saturation`, `fire_resistance`,
`conduit_power`, `water_breathing`, `village_hero`,
`instant_health` — bunlar kurbanı *güçlendiriyor*. `/effect @s
clear` yazan bir savunma kendi içtiği iksiri de silerdi;
`komut_isin.mjs`'te kayıtlı ders bu.

`instant_damage` anlık, silinecek bir şey bırakmıyor.

### `camerashake` ve title duvarı

`/camerashake add @a 4 999999999 rotational` — Arınma 3. kol
(`camerashake stop @s`) zaten kesiyor.

`G__L__T_TLE.txt` neredeyse tamamen bir title duvarı (394
satır, aynı sözün tekrarı + `⬛` blokları). v7.35'te ölçülen
287 özgün `/title` ile aynı aile; `ARIN_EKRAN` kesiyor.

### Kalkma kodları — 175 doğrulanmış kimliğin içinde

Üç dosyadaki `playanimation` satırlarından çıkan gerçek
kimlikler:

```
animation.armor_stand.entertain_pose   VAR
animation.bat.resting                  VAR
animation.hoglin.baby_scaling          VAR
animation.player.move.legs.inverted    VAR
animation.player.sleeping              VAR (Will Kılıcı)
animation.player.swim                  → v7.49'da EKLENDİ
```

Satırların geri kalanı kimlik değil: `controller.animation.
helicopter.commands`, `transition_fox_steep_…` gibi yüzlerce
karakterlik yapıştırma dizeler. Mojang'ın kendi dosyalarında
hiçbiri yok — çalışan kısım baştaki kimlik, gerisi süs.

**`animation.player.swim` bizde yoktu ve olmalıydı**: beş
dosyanın dördünde, 20'den fazla satırda geçiyor, yani bu
listelerin en çok kullandığı kimlik. Mojang'ın `player.json`
dosyasında duruyor. `animation.player.swim.legs.stationary`
ile birlikte Poz Sandığı'na girdi (70 → 72).

`animation.player.first_person.map_hold` **eklenmedi**:
Mojang'ın `player.json`'unda yok, doğrulanamadı. "Kod
dosyasında geçiyor" bir kimliğin var olduğunun kanıtı değil.

### Magma hapsi — Kafes Kır'ın sınırı

```
/execute at @a run fill ~-6 ~-6 ~-6 ~6 ~3 ~6 magma[] hollow
```

`hollow` yalnız kabuğu dolduruyor: kurban 13×13'lük bir odanın
**ortasında** kalıyor, duvarlar 6 blok uzakta. Kafes Kır bunu
kırmıyor ve **kırmaması doğru**: `KAFES_YARICAP = 1` ve kuralı
"hapsedilmediysen hiçbir şeye dokunma". Altı blok uzaktaki bir
duvarı kırmak bir savunma değil, kendi evini delen bir kazma
olurdu.

PSG'nin kendi "BLOKA SOKMA" satırları (`fill ~1 ~1 ~2 ~-1 ~ ~-1`)
ise tam Kafes Kır'ın menzilinde — o aile kapalı.

### Mob ve varlık spam'i

`/summon wither`, `/summon ender_dragon`, `ender_crystal`,
`evocation_fang`, tepeden `anvil`/`sand` sütunu. Hepsi
**operatör yetkisi** istiyor; kapı "op verme". Kaynağın kendi
savunması `/kill @e[type=!player]` — bu satır kurbanın evcil
hayvanını da öldürür, o yüzden alınmadı.

---

## Ölçüm

```
kapalı 32 → 33 · toplam 99 → 100
ham %32 → %33   engellenebilir %68 → %70
```

Tam tablo: `python3 addon/savunma_olc.py`


---

# v7.50 — arşivin TAMAMI yeniden tarandı

Kullanıcı 11 MB'lık arşivi tekrar gönderip *"eklenebileceklerinin
hepsini tek tek doğrula"* dedi. Doğru istekti: v7.48'de arşivin
**yalnız ilk dosyası** taranmıştı. Bu kez iç içe zip'lerle
birlikte **376 metin dosyasının tamamı** açıldı.

Dosya bayt bayt aynı (`sha256 3eebd233fa5368697c70a2e1…`,
12.169.981 bayt) — yeni bir içerik yok, **daha derin bir
tarama** var.

## Sayılar

```
51.285 komut satırı · 3.000+ özgün
   580 özgün animasyon dizesi
   147'si Mojang'ın kendi dosyalarında GERÇEK
```

| fiil | satır | özgün |
|---|---|---|
| playanimation | 43.090 | 2.369 |
| execute | 3.393 | 349 |
| effect | 1.241 | 144 |
| title | 786 | 60 |
| summon | 652 | 71 |
| fog | 272 | 12 |
| tp | 248 | 26 |
| particle | 211 | 17 |
| camerashake | 187 | 23 |
| fill | 183 | 11 |
| replaceitem | 159 | 14 |
| setblock | 155 | 16 |

## Bulunan üç eksik — üçü de kapatıldı

### 1. `fog … basic` (Arınma'da yoktu)

`ARIN_SIS_BILINEN` listesi v7.35'te arşivin **ilk** dosyasından
yazılmıştı: `["1","11","13","l1","t"]`. İç içe zip'ler açılınca
12 özgün `/fog` satırı göründü ve birinde kimlik `basic`ti:

```
/fog @a push minecraft:fog_hell basic
```

Kimliği bilmeyen bir `remove` hiçbir şey yapmıyor — o sis
bizde **sökülmüyordu**. Tek kelimelik bir delik.

### 2. Girdi kilidinin 11 türünden 9'u açılmıyordu

Arınma yalnız `movement` ve `camera` açıyordu. Bedrock 11 tür
tanıyor (`InputPermissionCategory`, `@minecraft/server` 2.9.0):

```
Camera · Movement · LateralMovement · Sneak · Jump · Mount ·
Dismount · MoveForward · MoveBackward · MoveLeft · MoveRight
```

Arşivde yalnız `movement disabled` görüldü — ama ötekiler aynı
komutun **bir kelimesi** uzağında. `jump disabled` yiyen biri
için Arınma sessizce hiçbir şey yapmıyordu. `ZORLA_YUVALAR`da
(v7.49) verilen aynı karar: görülen tek yuva kafaydı, altısı da
kapatıldı.

### 3. Poz sandığı 72 → 132

147 gerçek kimliğin 72'si zaten bizdeydi, 6'sı modun başka
yerinde kullanılıyor, **60'ı eksikti**. Altmışının altmışı da
Mojang'ın kendi dosyalarında doğrulandı.

En çok kullanılan ikisi bizde yoktu:

| kimlik | arşivde | ne yapıyor |
|---|---|---|
| `animation.player.sneaking` | 4.166 kez | eğilme |
| `animation.player.riding.legs` | 3.535 kez | havada oturma |

**Alınmayanlar ve neden:**

- **28 kimlik** — oyuncunun/insansının kendi normal çizimi
  (`player.bob`, `player.move.arms`, `humanoid.base_pose`,
  `player.cape`, `attack.rotations`…). Bunlar zaten her karede
  oynuyor; poz olarak vermek görünür bir şey yapmaz.
  **İstisna: `riding.*` ailesi ALINDI** — bir şeye *binmeyen*
  oyuncuda oturur biçim veriyor, yani görünür bir değişiklik.
  Arşivin en çok kullandığı ikinci kimlik tam da bu yüzden.
- **Mermi modelleri** — `shulker_bullet.move` (531 kez),
  `llama_spit.setup` (508), `arrow.move` (70). Gerçek
  kimlikler ama insansı kemikleri yok. Tahminle liste
  şişmesin diye eklenmedi; `POZ_DENEME` açıkken kullanıcı
  oynamayanı görüp söyleyebiliyor.

## Değişmeyen — tek tek bakıldı

| aile | bulgu |
|---|---|
| **efekt** (30 ad) | olumsuzların tamamı `ARIN_EFEKTLER`'de. `jump_boost` **@s'ye** veriliyor (saldıranın kendi hareketi), kurbana değil — listeye girmedi. |
| **camerashake** (23) | hepsi `camerashake stop @s` ile kesiliyor |
| **camera** (1) | `camera @p set third_person_front` → `camera @s clear` geri alıyor |
| **clear** (3) | `/clear @a` → Envanter Yedeği (v7.30) |
| **gamemode** (13) | Gözcü oyun kipi denetimi (v7.38) |
| **fill / setblock** | ofsetlerin çoğu 1–6; `iron_bars`, `barrier` dahil hepsi Kafes Kır'ın duvar sayımına giriyor |
| **summon** (21 tür) | `lightning_bolt`, `ender_dragon`, `wither`, `warden`… hepsi operatör kapısı |
| **particle** (17) | tamamen geçici, silinecek bir durum bırakmıyor |
| **tp** (26) | operatör kapısı |
| **damage** (1) | `/damage @a 1500` — operatör kapısı |

## `item_lock` — v7.49 doğru şeyi hedeflemiş

Arşivde **256** `item_lock` geçiyor; en yaygın eşya mekaniği bu.
İki farklı yazımla:

```
"item_lock"             11 kez
"minecraft:item_lock"  245 kez
```

İkisi de çalışma anında aynı `lockMode` değerini üretiyor.
Savunmamız metne değil `ContainerSlot.lockMode` alanına baktığı
için **iki yazımı da** tutuyor — metin eşleştiren bir savunma
birini kaçırırdı.

## Kapatılmayan bir şey, açıkça

`/replaceitem entity <isim> slot.armor.head 1 carved_pumpkin`
— **kilitsiz** balkabağı. Eşyayı yok ediyor ve görüşü
kapatıyor ama `lockMode` `none`, yani saldırganın taktığı
balkabağı ile enderman'dan korunmak için kendi taktığın
balkabağı **ölçülebilir biçimde ayırt edilemiyor**.

v7.49'un kuralı bu yüzden "kilitliyse indir". Kilitsizi de
indirseydik oyuncunun kendi kararını bozardık. Bu bir eksik
değil, ölçüm sınırı — ve burada yazılı duruyor.

---

## v7.65 · ikinci parti — "ZYPHER 2 MİLYON KOD" ve beş dosya daha

**Hiçbiri çalıştırılmadı.** Zip açıldı, iç içe zipler dahil
metinler okundu; oyunda tek satır denenmedi. Kullanıcının
talimatı aynen duruyor: *"hiçbir şeyi çalıştırma, sadece
engellenebilir olanları engelle."*

| md5 | bayt | ad |
|---|---|---|
| `8e29d64a705bbfd5ae84bf01c67f626b` | 2.722.790 | `༒ZYPHER༒ 2 MİLYON KOD DOSYA.zip` |
| `bbd8c8ae0101640d2f7648b99f47986f` | 520.838 | `827272828 ... P.YASA KOD DOSYASU.txt` |
| `bd4de722afb70a699fb6f5c3518a0599` | 1.012 | `ASAFDAN P.YASAYA EN GÜÇLÜ GM1 KODLAR.txt` |
| `17ef2d90b1f1d592cc9fd96ad049316f` | 27.522 | `DarkChris koddosyası ANİMASYON.txt` |
| `d0782ba25397a6963265fb72adaa4287` | 39.338 | `ghost_kodlarrr_v5.txt` |
| `17ef2d90b1f1d592cc9fd96ad049316f` | 27.522 | `siyah1.MC.KOD.DOSYASI.V1.0.txt` |

Son iki satırın md5'i **aynı**: `DarkChris` ile `siyah1` bire bir
aynı dosya, yalnız adları farklı. Arşivlerin nasıl büyüdüğünün
küçük bir örneği.

### Sayım

| ölçüm | değer |
|---|---|
| okunan metin dosyası (iç zipler dahil) | 1.350 |
| toplam metin | 58,1 MB |
| komut satırı | 77.784 |
| **özgün komut** | **3.014** |
| tekrar oranı | **%96** |

Dosyanın adı "2 milyon kod". Gerçek sayı 3.014. `ghost_kodlarrr_v5`
bunu tek başına gösteriyor: tek komut `umutkrln1 … umutkrln100`
diye yüz kez yazılmış.

Komut dağılımı: %85 `/playanimation` (66.212 satır), kalanı
`/execute`, `/title`, `/effect`, `/summon`, `/fog`, `/camerashake`.
(Sayımdaki `/item` ve `/damage` satırlarının çoğu komut değil,
`item.book.page_turn` gibi **ses adı** listesi.)

### Asıl bulgu: yük son argümanda

`/playanimation`'ın sözdizimi:

    <hedef> <animasyon> <next_state> <blend_out_time> <stop_expression> <controller>

Özgün komutların son argümanı ayrıştırıldı — **173 farklı
denetleyici adı**, 569 komut. Neredeyse hepsi uydurma
(`controller.animation.humanoid.umutkrln7`, `rootjsjsj`); var
olmayan yuvaya yazmak hiçbir şey yapmıyor. Gerçek olan iki tane:

| denetleyici | komut |
|---|---|
| `controller.animation.player.root` | **207** |
| `controller.animation.humanoid.sneaking` | 8 |

İlki oyuncunun bütün normal animasyonlarını yöneten kök
denetleyici; üzerine yazılınca oyuncu o pozda kilitli kalıyor.
**Arınmanın v7.65'te kapattığı delik bu** — ayrıntısı
`ayarlar.js`'teki `ARIN_POZ_KONTROLCU` notunda.

### Ne kadarı zaten bozuk

- `stop_expression`'ın **586'sı geçersiz**. En sık hata
  `query_is_on_moving` — Molang'da nokta kullanılır
  (`query.is_moving`), alt çizgi değil.
- 241 farklı animasyon adının **20'si `animation.` önekiyle bile
  başlamıyor** (`sleeping`, `animasyon.axolotl.swim`, `blacknull`).
- `animation.mooshroom.setu`, `baby_transfrom` gibi yazım hataları.
- 24 komutta `blend_out_time` yuvasında sayı yerine harf var.

Bunlar **oyunda denenmedi**; yargı belgelenmiş komut sözdizimine
göre.

### Hedef dağılımı

Özgün `/playanimation`'ların **1.297'si `@a`/`@e`/`@p`** ile
başkalarını, 1.015'i `@s` ile kendini hedefliyor. `@s` olanların
büyük kısmı saldırı değil **kalkma** (kilitten çıkma) denemesi;
arşivde dosyanın adı zaten `kalkma.txt`.

`/playanimation` dışındaki kalıplar — hepsinin Arınma'da
karşılığı zaten var:

| dosya | komut | karşılığı |
|---|---|---|
| `EKRAN kapatma titlesi.txt` | `title @a actionbar §e§4 ██████…` | `ARIN_EKRAN` (v7.35) |
| `troll komutlaı .txt` | `effect @a[...] blindness/levitation 255` | `ARIN_EFEKTLER` |
| `boyun eğdirme.txt` | `tp @r ^^^5 facing ~~-100~` | kalıcı değil, kilit sayılmıyor |

### İmza notu

`zyphor` kelimesi 58 MB'ın tamamında **0 kez** geçiyor; `psg`
6.163 kez, 14 dosyada. Kullanıcının "Zyphor" adıyla getirdiği üç
satır arşivdeki `kalkma.txt` ve `💥PSG PİYASANIN EN SAĞLAM
ANİMASYON K…` dosyalarında **harfi harfine** duruyor. Kodlar
kopyalanıp üstüne yeni rumuz yazılarak dolaşıyor — savunma
kurarken "kim yazdı" değil **hangi komut** sorusunun sorulması
gerektiğinin kanıtı.

---

## v7.65 · üçüncü parti — "Shalex öldürücü kodlar" (Xorcer arşivi)

**Hiçbiri çalıştırılmadı.** Arşiv açıldı, metinler okundu; oyunda tek
satır denenmedi.

| md5 | bayt | ad |
|---|---|---|
| `57467269be2fa9d84095cfabfc2e01f5` | 11.431.442 | `Shalexoldurucukodlar.txt` |

**Dosya `.txt` değil.** İlk baytları `37 7a bc af 27 1c` — bir **7z
arşivi**, uzantısı değiştirilmiş. Bu sahnede yaygın bir alışkanlık;
daha önce gelen `r_dosya_7z.txt` de aynıydı (o bir zip'ti). Uzantıya
göre karar veren bir denetim bunları metin sanır.

İçinde 11 `.txt` + `Xorcer dosya 7z.bin` adında iç içe bir zip.
Onun içinde de zipler var. Toplam **584 dosya, 33 MB metin.**

### Sayım

| ölçüm | değer |
|---|---|
| komut satırı | 64.621 |
| özgün komut | **3.897** |
| tekrar oranı | %94 |
| önceki 3.014'lük kümeyle ortak | 2.570 |
| **gerçekten yeni** | **1.327** |

### Sonuç: yeni saldırı türü YOK

1.327 yeni komutun hepsi ayrıştırıldı. Karşılığı olmayan tek bir
kalıp çıkmadı:

| yeni kalıp | karşılığı | sürüm |
|---|---|---|
| `playanimation` + kök denetleyici | `ARIN_POZ_KONTROLCU` | v7.65 |
| `camerashake add @a[...] 4 999999999` | `camerashake stop @s` | v7.28 |
| `camera @p set third_person_front` | `camera @s clear` | v7.28 |
| `music music.game.*` | `music stop` | v7.35 |
| `replaceitem slot.armor.head carved_pumpkin` + `item_lock` | `ZORLA_KOR_ESYALAR` | v7.49 |
| `gamemode c @a[name=!X]` | Gözcü `gamemode_switcher` | v7.38 |
| `tellraw` / `title` yığını | `ARIN_EKRAN` | v7.35 |

**`/effect` tarafında da açık yok.** Yeni 24 efekt adının 11'i zaten
`ARIN_EFEKTLER`'de. Kalanlar ya **olumlu** (`resistance`, `speed`,
`strength`, `absorption`, `haste`, `saturation`, `conduit_power`,
`water_breathing`, `fire_resistance`, `village_hero`, `health_boost`)
— bunlar saldıranın kendi koruması, kurbanda kilit yapmıyor — ya da
**anlıktır** (`instant_damage`, `instant_health`), yani sökülecek
kalıcı bir şey bırakmıyor. v7.35'te konan "yalnız adı yazılı olumsuz
efektler silinir" kararı ayakta.

Yeni kümede hiç `inputpermission`, `hud`, `ride`, `structure`,
`fog`, `dialogue`, `function` **yok**.

### Tek sınır durumu

Yeni komutlarda `controller.animation.player.steve` **bir kez**
geçiyor. Gerçek bir vanilla yuva mı, doğrulanamadı — bu depoda oyun
çalıştırılmıyor. `ARIN_POZ_KONTROLCU` listesinin ilkesi "yalnız
gerçek yuvalar"; doğrulanmamış bir adı oraya yazmak o notu yalan
yapardı. **Dışarıda bırakıldı.** Gerçek çıkarsa tek satırlık ekleme.

### Arşivde iki Minecraft dışı dosya

| md5 | bayt | ad | not |
|---|---|---|---|
| `7e28802506ace8239514c96ec069e4b7` | 9.224.664 | `FFPsetup.exe` | Windows çalıştırılabiliri (`MZ`). Minecraft komut arşivinde işi yok. **Çalıştırılmadı.** |
| `a0c3835e82d04b5b7b89576f1034dfa9` | 14.336 | `…𝕄𝕣1.doc` | Eski OLE Word belgesi. `VBA`, `Macros`, `AutoOpen`, `Shell` imzaları **arandı, bulunamadı** — makro izi yok. Açılmadı. |

### Küçük dosyalar zaten bunun içinde

Daha önce tek tek gelen 26 küçük dosyanın **19'u** bu arşivin içinde
md5'i aynı olarak duruyor. Dışarıda kalan 7'nin ikisi kullanıcının
kendi `.mcaddon` paketleri, biri socket.io sohbet kodu — komut
dosyası değil. Yani bu arşiv ötekilerin üst kümesi.


---

## "baruto kalkma linkleri" (v7.74 sonrası ölçüm)

Kullanıcı yeni bir metin dosyası getirdi ve *"işimize
yarayabilecek kodları bak ve ekle"* dedi. **Eklenecek bir şey
çıkmadı — ve bu bir eksiklik değil, sonucun kendisi.** Dosyanın
tamamı saldırı yükü; savunmamızın onları kapatıp kapatmadığı
ölçüldü.

| ne | sayı |
|---|---|
| `playanimation` satırı | 150 |
| özgün satır | 124 |
| özgün son argüman (denetleyici yuvası) | 109 |
| özgün animasyon kimliği | 25 |

### Gerçek yuva bir tane ve zaten kapsanıyor

109 özgün yuva adının **yalnız biri** gerçek vanilla
denetleyici:

| yuva | komut | durum |
|---|---|---|
| `controller.animation.player.root` | 5 | **`ARIN_POZ_KONTROLCU`'da var** |
| `controller.animation.humanoid.umutkrln1…22` | 30 | uydurma |
| `controller.animation.player.root.text_type.…` | 2 | uydurma (gerçek adın uzatılmışı) |
| `transition_fox_steep_…`, `ghostcagan_…`, `jajajaj_…` | 72 | uydurma |

Uydurma ad var olmayan bir yuvaya yazar, yani hiçbir şey yapmaz.
v7.65'te konan ilke — *"listeye yalnız gerçek yuvalar girer"* —
bu dosyada da doğrulandı: 109 addan 108'ini listeye eklemek boş
iş olurdu.

En uzun uydurma yuva adı **1.891 karakter**. Uzunluk bir şey
değiştirmiyor; yine var olmayan bir yuva.

### Hedef seçiciler

| seçici | satır | ne demek |
|---|---|---|
| `@s` | 83 | saldıranın kendi üstünde deneme |
| `@e[name=!X]` / `@a[name=!X]` | 60 | **kendisi hariç herkes** |
| `"<oyuncu adı>"` | 4 | seçici yerine tırnaklı ad |
| `@a` | 2 | ayrım yok, herkes |

Tırnaklı ad **yeni bir şekil** ama savunma açısından fark
etmiyor: Arınma kilidin nasıl uygulandığına değil, kendi
oyuncusunun üstündeki sonuca bakıyor.

`name=!X` şekli 60 satırla en yaygın olanı; tekrarlanan
saldırıya karşı **Savunma Kipi** (`savunmaAc`) zaten
`SAVUNMA_ARALIK` başına bir kez poz sıfırlıyor.

### Animasyon kimlikleri: yeni gerçek kimlik yok

25 özgün kimliğin hepsi daha önce görülmüş ailelerden.
`animation.player.swim` (36 satırla en çok kullanılan) v7.49'da
zaten Poz Sandığı'na girmişti.
`animation.player.first_person.map_hold` (8 satır) yine
doğrulanamadığı için **yine dışarıda** — v7.49'daki karar
değişmedi.

### Sonuç

**Savunmada delik bulunamadı, kod değişmedi.** Bu dosya
v7.65'te ölçülen 58 MB'lık arşivin daha küçük ve daha gürültülü
bir kopyası: aynı iki gerçek tehdit şekli, aynı yüzlerce
uydurma süs. `test/arinma.mjs`'teki "gerçek kök denetleyici
listede" ve "listede yalnız gerçek controller adı var"
maddeleri bu iddiayı zaten kilitliyor.

### Dosyadaki bağlantılar açılmadı

Başta beş `dosya.co` bağlantısı var. **İndirilmedi.** Sebep iki
tane: bu depoda dış kaynak çalıştırılmıyor, ve adlarından
(`SANALIN_EN_İYİ_KALKMA_KOMUTLARI`, `ghost_kalkma_v2`) aynı
ailenin devamı oldukları belli — v7.65'te 1.350 dosyanın %96'sı
aynı satırın kopyası çıkmıştı.

### Dosyanın geri kalanı

Satırların çoğu adı geçen kişilere yönelik ağır küfür içeriyor.
Teknik olarak hiçbir şey taşımıyor: yuva adının içine yazılmış
metin, var olmayan bir yuvaya yazıldığı için oyunda hiçbir yere
çıkmıyor.


### Aynı dosya ikinci kez geldi (v7.81)

md5 `13f23b49976c43ba2250ada09edabd5b` — yukarıdaki bölümle
**birebir aynı dosya**. Bu kez farklı bir yöntemle bakıldı:
denetleyici yuvalarına değil **animasyon ailelerine**.

| aile | satır |
|---|---|
| başka varlık pozu | 75 |
| oyuncu pozu | 41 |
| yatırma | 15 |
| ters çevirme | 10 |
| ilk şahıs | 8 |

**İlk şahıs ailesi umut vericiydi, çıkmadı.** 8 satırın hepsi
`animation.player.first_person.map_hold` kullanıyor ve o kimlik
v7.49'da zaten araştırılmıştı: Mojang'ın `player.json`'unda
**yok**. Var olmayan bir animasyon uygulanamaz, yani o 8 satır
hiçbir şey yapmıyor. Arınma listesine ilk-şahıs denetleyicisi
eklemek, **var olduğuna dair kanıtı olmayan** bir tehdide karşı
savunma yazmak olurdu — bu dosyanın kendi kuralına aykırı.

Sonuç yine aynı: **bu dosyada kapatılacak açık yok.**

Ama savunmanın kendisine bakarken ayrı bir eksik çıktı ve o
kapatıldı — bkz. NOTLAR.md v7.81, "Savunma sessizce kapanıyordu".
