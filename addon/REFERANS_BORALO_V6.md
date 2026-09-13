# BoraLo MOD V6 (Trb1545) — inceleme

Kullanıcı `.mcaddon.zip`'i gönderdi: *"Bir tane gene mod buldum bundan her şeyi
ekle her şeyi kötü bir altyapısı varsa iyi bir altyapıyı değiştirerek amacını
değiştirmeden ekle."*

Paket: **2,3 MB zip → 4,7 MB, 1721 dosya.** Yazar `Trb1545`, açıklamada
*"Modun Sahibi Turkish_Bobby1545 Aitir"*.
Ad alanı `pa:` — **serinin dördüncü paketinde de aynı çakışma.** Aynı anda
kurulurlarsa eşya kimlikleri çarpışır.

| bölüm | adet |
|---|---|
| eşya | 201 |
| function | 636 |
| recipe | 211 |
| davranış animasyon denetleyicisi | 49 |
| loot table | 12 |
| blok | 10 |
| varlık | 7 |
| dialogue | 2 |
| **script** | **0** |

Kaynak paket **çalıştırılmadı.** İnceleme tamamen statik: zip açıldı, JSON ve
`.mcfunction` dosyaları okundu.

---

## 0. Önce sayı: alınacak yeni mekanik neredeyse yok

201 eşyanın 121'inde komut var; o 121 eşya toplam **176 function** çağırıyor.
176'sı da tek tek okundu. Ortaya çıkan **mekanik** listesi şu:

levitation (uçur) · lightning_bolt (yıldırım) · tnt_minecart (meteor) ·
anvil fill (örs) · iron_bars fill (kafes) · `tp ^^^15` (ışınlanma) ·
blindness (kör) · slowness (dondur) · fatal_poison (zehir) · speed ·
regeneration · ice fill (buz) · setblock fire (alev) · summon Arrow (ok
yağmuru) · `tp @a @s` (çekme) · camerashake (sarsıntı) · kafa yuvasına eşya
(dönüşüm) · göz/lazer eşyaları · poz animasyonları (kelepçe, yatma, yamult) ·
`weather rain` · summon bot · playsound · title.

Bunların **ikisi hariç hepsi bu modda zaten var**, ve çoğu daha iyi kurulu.
Birkaç örnek:

| Boralo V6 | bizdeki karşılığı |
|---|---|
| Taser (titret + yavaşlat) | `sersem_silahi` + üç aşamalı **SERSEM → MEZAR → kurtarma** zinciri |
| Time Clock | `zaman_saati` |
| Stone Conventer | `tas_donusturucu` |
| Traction (Entity/All mobs) | `cekim_silahi`, `cekme`, `yakala` |
| Code Man | `kns_codeman` |
| Resseting Sword | `resetting_sword` |
| Univers Sword | `kns_evren_kilic` |
| VoidMultiTool | `kns_void_alet` |
| El! Harkos Staff | `kns_asa_harkos` |
| Shadow Staff | `kns_asa_golge` |
| Hyproksin / Grinoxin / Nitroxin | `iksir_hiperoksin` / `iksir_grinoksin` / `iksir_nitroksin` + `goz_lazeri` |
| Falen / Bobby / Buz / Toprak kolları | `kollar.js` (V2 ve V4'ten alınmıştı) |
| Kevin1545 Sword'ün beş özelliği | `kafes`, `isinlanma`, `yildirim`, `ucurma`, `ucus` |
| Mezar (El! Harkos) | `_mezar_defteri.js` + `MEZAR_*` ayarları |
| Kelepçe pozu | `durus_bagli_eller` |
| Shock (uyuma pozu) | `yatma`, `will_yatir` |

Yani kullanıcının isteği ("her şeyi ekle") karşısında dürüst cevap şu:
**alınacak şey azdı, çünkü çoğu zaten alınmıştı.**

---

## 1. ALINDI: iki gerçek boşluk

### 1.1 Kan Yağmuru — `pa:blood_rain`

Kaynak üç function çağırıyor:

```
Blood_Rain         -> weather rain
HasarVer           -> execute positioned ^^^15 run damage @e[r=10,c=1] 3
Herkese_Hasar_Ver  -> damage @e 1
```

**Neden alındı:** bu depoda havaya dokunan **tek bir satır yoktu.**
`setWeather` de, `weather` komutu da hiçbir yerde geçmiyordu. Gerçek boşluk.

Değiştirilen altyapı:

- `weather rain` **süresiz.** Dünya bir daha kendiliğinden açmıyor; oyuncu
  `/weather clear` yazmayı bilmiyorsa yağmur kalıyor. Bizde süre veriliyor
  (`weather rain 60`) — vanilla o sürenin sonunda havayı kendisi seçiyor,
  yani **çıkış yolu bizim kodumuzda değil oyunun kendi işleyişinde.** Script
  çökse bile hava takılı kalmıyor.
- `damage @e 1` **dünyadaki her şeye** vuruyor: oyuncunun kendisine, evcil
  kurduna, çerçevedeki eşyaya. Bizde menzil var, kendimiz dışarıda, botlar
  dışarıda.
- İki ayrı hasar komutu aynı eşyada birlikte çağrılıyor (en yakına 3, herkese
  1 daha). Tek ölçüme indirildi.

### 1.2 Göz Sensörü — `pa:eye_sensor`

```
KorEt              -> effect @e[r=10,c=1] blindness 9999 255
Flash_Sound        -> playsound random.screenshot @a
Efekti_Sil_Kendini -> effect @s clear
```

**Neden alındı:** körlük bu modda birkaç yeteneğin *içinde* var (Jujutsu, asa,
zaman saati, düşmüş) ama **tek işi körlük olan bir şey yoktu.** Üstelik
`SERSEM_KOR` ayarı bilerek `false` — sersemletilen oyuncu görsün diye. Yani
"körlük zaten var" demek doğru olmazdı: kasıtla dışarıda bırakılmış bir yer
vardı ve dolduran yoktu.

Değiştirilen altyapı:

- `blindness 9999 255` → **sonsuz körlük.** Kör edilen oyuncu için oyun orada
  bitiyor; bu bir yetenek değil cezalandırma. Bizde 60 tick (3 saniye) —
  bir flaşın hissi kadar: nişanı bozuyor, oyunu bitirmiyor.
  Ayrıca **255 seviyesi körlükte hiçbir şey yapmıyor** (körlük aç/kapa bir
  etki, seviyesi yok); sayı sadece kullanıcıyı "daha güçlü" diye yanıltıyor.
- `effect @s clear` → **kullanıcının kendi etkilerini siliyor.** Hız, can
  yenileme, yangın direnci hepsi gidiyor. Bu depoda hiçbir yetenek
  kullanıcının kazandığını götürmez. Bizde oyuncunun etkilerine dokunulmuyor.
- `playsound ... @a` sesi **dünyadaki herkese** çalıyor. Artık olayın olduğu
  yerde çalıyor.
- `r=10` yarıçap, yön bakmıyor — arkandaki de kör oluyordu. Bizde koni.

Kod: `yetenekler/boralo_v6.js`. Test: `test/boralo_v6.mjs` (22 madde).
Mutasyon bataryası 8/8 — sekiz düzeltmenin her biri tek tek geri alındı,
sekizinde de test düştü.

---

## 2. ALINMADI: paketin altyapısı

Kaynak 636 function'ın tamamı üç kalıptan çıkıyor ve üçü de bu depoda yasak.

**`clear @s` — envanter siliyor.** `Sil`, `Sil_envanteri`, `Sil_Herseyi`,
`ClearYapma` dört ayrı function, dördü de aynı satır. "Kol'u kapat" demek
için oyuncunun **bütün envanterini** siliyorlar. Bu depoda hiçbir yetenek
oyuncunun eşyasını kaybettirmez.

**`effect ... 9999 255` — süresiz, çıkışsız.** `Doldur_Vur` (slowness 999 3),
`Dol_Dolartik` (slowness 9999 255), `KorEt` (blindness 9999 255), `Zahirle`
(**fatal_poison 9999 255**), `Herkesi_Doldur` (slowness 999 255 true).
Sonuncusu ölümcül zehri sonsuza kadar veriyor. Bu depoda her kalıcı etkinin
süre sınırı ve çıkış yolu olmak zorunda.

**`op @a` — herkesi operatör yapıyor.** `pa:mm` eşyasının `Creative`
function'ı. Tek satır, geri alınamaz, sunucudaki herkesi kapsıyor.
**Alınmadı ve alınmayacak.**

**`tp @a @s` / `tp @e @s` — sınırsız çekme.** `Oyuncu_Cekme`, `Kendine_Cek`,
`Herkesi_Cekme`. Dünyadaki **her** oyuncuyu/varlığı yanına ışınlıyor, mesafe
sınırı yok. Bizdeki `cekme` ve `yakala` menzilli.

**`replaceitem entity @s slot.armor.head` — miğferi yok ediyor.** Dönüşüm
sisteminin tamamı bunun üstüne kurulu (28 ayrı function). Taktığın miğfer
yerine dönüşüm eşyası geçiyor, eskisi **silinerek**. Bizim `donusum.js`
eski parçayı saklayıp geri veriyor.

**`entities/player.json` — vanilla oyuncuyu eziyor.** 23 bileşen, **183
bileşen grubu** ve bir `minecraft:environment_sensor`. Dönüşüm motorunun
tamamı burada: `is_camera` etiketi + kafadaki eşya → bileşen grubu →
attachable. İki paket aynı anda `minecraft:player`'ı ezerse biri kazanır,
öteki sessizce ölür. Bizim dönüşümümüz script tarafında; vanilla varlık
tanımına dokunmuyor.

**`entities/arrow.json` — vanilla oku eziyor.** Üç bileşen için bütün ok
tanımının üstüne yazılmış.

---

## 3. ALINMADI: çalışmayan şeyler

Statik okumada **komut olarak geçersiz** oldukları görülen satırlar. Bunlar
oyunda sessizce hiçbir şey yapmıyor:

| function | satır | sorun |
|---|---|---|
| `Alev_Cikarmaa` | `setblock ~~~fire` | `~~~` ile `fire` arasında boşluk yok |
| `KorEt`, `Dol_Dolartik`, `Yavaslik_Ver`, `Zahirle`, `YAMUT`, `YAMUTMA` | `execute positioned^^^10` | `positioned` ile `^^^` bitişik |
| `ParticleMutant` | `particle` + satır sonu + `..._emitte` | komut iki satıra bölünmüş, üstelik ad eksik yazılmış (`emitter` değil `emitte`) |
| `Shock`, `Tek_El` | `playanimation @a` + satır sonu | aynı bölünme |
| `Ver_kanli_kol` | `give @s bobby_kol_sagtik` | `pa:` öneki unutulmuş |
| `Herkesi_Stone_Yapma`, `Stone_Yap` | `pa:Stone_Man_Stone` | büyük harf — eşya kimliği `pa:stone_man_stone` |

**`Yok Etme Sword` — fikren bozuk.** `tp @e[type=cow] 100 100 100` (aynısı
domuz ve koyun için). Dünyadaki bütün inekleri sabit bir koordinata yığıyor.
Bir yetenek değil, kaza.

**10 blok — boş.** `pa:custom_blockhhhhhh`, `pa:kslapqpqq`, `pa:kkoou`…
Adları klavyeye yaslanmış, hepsi ışıksız, geometrisiz, düz küp.

**`materials/entity.material` — başka bir moddan kopya.** İçinde
`audi_r8`, `cars`, `sesto_elemento`, `televisor` tanımları var. Bir araba
modundan alınmış, bu pakette hiçbir şey kullanmıyor.

---

## 4. ALINMADI: gerekçesi V5'te yazılan şeyler

**NPC dialogue — alınmadı.** `pa_bobby1544_scene.json` ve
`pa_ellick_scene.json` ile iki konuşma ağacı var. V5'te aynı şey aynı
gerekçeyle alınmamıştı: *"bizim botumuzun zaten menüsü var; ikincisini
eklemek 'kol israfını önle' kuralının blok hâli olurdu."* Gerekçe hâlâ
geçerli.

**Karakter kadrosu (El-Lick, Tyrese1545, Bash2313, Gegony, Giant Alex,
Marcus, Insane, Kepçuk Mahmud, Lost Guys, Kabile Leader, Robot Brine…) —
alınmadı.** Bunlar mekanik değil, **başka insanların karakterleri**:
dokular, modeller, attachable'lar. Bu depoda karakter kadrosu `LORE.md`'den
geliyor; başka bir kanalın kadrosunu içeri taşımak hikâyeyi bozar.
Mekanikleri zaten yukarıda: hepsi kafa yuvası dönüşümü.

---

## 5. Özet

| | |
|---|---|
| incelenen eşya | 201 |
| komutu olan | 121 |
| okunan function | 176 (referans verilenlerin tamamı) |
| **alınan** | **2 yetenek** (Kan Yağmuru, Göz Sensörü) |
| zaten vardı | listedeki mekaniklerin geri kalanı |
| altyapı gereği alınmadı | 6 kalıp (envanter silme, süresiz etki, `op @a`, sınırsız çekme, miğfer yok etme, vanilla varlık ezme) |
| çalışmadığı için alınmadı | 11 function + 10 blok + 1 material |
