# Referans · Beş komut dosyası (PSG · LWESxSAPLAR · GÜLÜT)

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
