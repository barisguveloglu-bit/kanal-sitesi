# Infintrix — Sonsuzluk Taşları köprüsü

**Bu dosya bir kez yazıldı.** Kullanıcı jar'ı tekrar yüklemesin, ben de tekrar
taramayayım diye burada duruyor. Ben 10 ana modu `REFERANS_BEN10.md`'de,
AlienEvo eklentileri `REFERANS_BEN10_EK.md`'de.

---

## Kaynak

| | |
|---|---|
| dosya | `infintrix-2.2.jar` (124 KB) |
| modid | `infintrix` v1.0.0 (paket adı 2.2) |
| yapan | Pugmeowla |
| platform | Minecraft **Java** 1.20.1, Forge `lowcodefml` + **Palladium** |
| md5 | `e3902aa319671e043577d2740d41b197` |

Modun kendi tanımı:

> *"Adds compatibility from Pugmeowla's Infinity Stone Core to Alien Evo,
> Reds Omnitrix Evolution and ITO"*

**Bu bir köprü modu, içerik modu değil.** Java sınıfı **sıfır** — tamamı JSON.

```
176 dosya · 80 JSON · 62 PNG · 6 .geo.json · 2 .mcfunction · 0 .class
```

---

## Dosyaların dağılımı — %85'i kozmetik

| ne | adet | alındı mı |
|---|---|---|
| render katmanı (`palladium/render_layers`) | 28 | hayır |
| doku (taşların Omnitrix üzerindeki hâli) | 62 | hayır |
| GeckoLib modeli (`omniverse/prototype/ult` × normal/slim) | 6 | hayır |
| güç dosyası (`palladium/powers`) | 5 | **evet** |
| `.mcfunction` + fonksiyon etiketi | 3 | **evet** |

28 render katmanı = 6 taş × (sönük/yanık) × 3 Omnitrix modeli. Hepsi
`geckolib:default` tipinde, `render_type: "glow"`. **Bedrock'a taşınamaz:**
AlienEvo'nun Omnitrix modeline giydirilmiş katmanlar ve o model bizde yok;
ayrıca başka bir modun telifli dokuları.

---

## Gerçek mekanik: beş tane

Beş güç dosyasındaki 45 yetenek kaydının 28'i render katmanı. Geriye kalan
16 `palladium:command` yeteneğinin yaptığı iş tek tek okundu:

| kaynak yetenek | ne yapıyor |
|---|---|
| `gauntlet_on` / `gauntlet_off` | `Infinitrix` etiketi + beacon sesi + toz |
| `unlock_omnitrix` | `ability unlock @s <omnitrix> all` |
| `infinite_power` | `AlienEvo.Timer` ≥10 ise **2'ye çek** → şarj yok |
| `all_6` | altı taş tamsa `AlienEvo.MasterControl` etiketi |
| `snap_burn` | yanma: MasterControl kalkar, timer **2999/3000/3000/6000**, `no_instant_timein` |
| `remove_tag` | timer ≤5 olunca sert kilidi kaldır |

`gauntlet_items.mcfunction` sadece tesisat: hangi Omnitrix takılıysa ona
uygun güç dosyasını ekliyor/çıkarıyor.

### Kritik ölçüm: taşların kendi güçleri bu jar'da YOK

`power_stone`, `mind_stone`, `space_stone`, `reality_stone`, `time_stone`,
`soul_stone` — altısı da yalnız **`palladium:objective_score` olarak
okunuyor**. Bu skorları **yazan** taraf `Pugmeowla's Infinity Stone Core`
modu ve o mod yüklenmedi.

Yani bu jar'da Gerçeklik, Ruh, Zaman ve Zihin taşlarının tek işlevi
"altı taş tamam mı" sayımına katılmak. **Onlara güç uydurulmadı.**
Infinity Stone Core yüklenirse altısının da kendi güçleri gelir; o jar
gelirse eklenebilir.

---

## Bizde ne oldu — `yetenekler/infintrix.js`

Ayarlar `ayarlar.js` → `SNS_*` ve `SONSUZLUK_TASLARI`.
Sekiz yetenek, sıra **800–807**.

| yetenek | sıra | kaynak |
|---|---|---|
| `eldiven` | 800 | `gauntlet_on` / `gauntlet_off` |
| `tas_guc` … `tas_zihin` | 801–806 | altı taş yuvası |
| `sonsuzluk_durum` | 807 | kaynaktaki ability bar göstergesi |

### Mevcut Ben 10'a dokunulmadı

**En önemli karar bu.** Eldiven **kapalıyken** Ben 10 bugüne kadar nasıl
çalışıyorsa öyle çalışıyor: yaratığı tut, efektler gelsin, süre yok.
Omnitrix sayacı **yalnız eldiven takılıyken** işliyor.

`omniIlerlet()` ilk satırında eldiven kapalıysa hemen dönüyor, yani
eldivensiz oyuncu için hiçbir şey değişmiyor. `test/infintrix.mjs`
1. bölümü bunu iki ayrı durum için ölçüyor: hiç kaydı olmayan oyuncu **ve**
eldiveni takıp çıkarmış oyuncu (ikinci dal mutasyonla bulundu).

### Sistem nasıl işliyor

1. **Eldiven açık, taş yok** → 60 sn kesintisiz dönüşüm, sonra 10 sn şarj.
2. **Güç Taşı takılı** → şarj anında bitiyor (`infinite_power` birebir:
   sayaç ≥10 ise 2'ye çekiliyor). Kesinti 10 taramadan **1 taramaya**
   iniyor.
3. **Altı taş tam** → **Usta Denetimi**: yaratığı elinde tutmadan son türün
   güçleri devam ediyor (kaynaktaki `MasterControl`).
4. **30 sn sonra yanıyor** → ceza biçime göre: Prototip **2999**, Recal
   **3000**, 10K **3000** tick. Kaynaktaki sayılar aynen.
5. **Yanık cezasını Güç Taşı atlayamıyor** (`no_instant_timein`), ceza
   eşiğin altına inince sert kilit kalkıyor (`remove_tag`, eşik 5).

### Beyan edilmiş iki ikame

1. **Taşı yuvaya oturtma komutla.** Kaynakta bu işi Infinity Stone Core
   yapıyor; o mod olmadan skorları yazan kimse yok. Uydurma bir toplama
   mekaniği kurmak yerine her taş bir aç/kapa yeteneği oldu.
2. **`playsound infinity:reality_stone` yerine `random.levelup`.** O ses
   diğer modun ses bankasında. Var olmayan bir dosya adını pakete yazmak
   sessizce çalışmayan bir ses demek olurdu.

Kaynaktaki `particle dust <r> <g> <b> 1` de birebir alınamadı: Bedrock
script API'sinde renk parametreli toz parçacığı yok. En yakın hazır
parçacıklar seçildi ve `ayarlar.js`'te yazılı.

### Alınmayan tek mekanik ve nedeni

`unlock_omnitrix` (`ability unlock @s <omnitrix> all`) — bizde kilitli
yaratık diye bir şey **yok**, 24 türün 56 kaydının hepsi zaten açık.
Karşılığı olmayan bir komut. Kilit sistemi kurup sonra onu açan bir
yetenek yazmak, olmayan bir soruna çözüm üretmek olurdu.

### Omniverse biçimi bizde yok

Kaynak dört Omnitrix sürümü tanıyor: prototype, recal, ult, omniverse
(sonuncusu `aeo:` — *Reds Omnitrix Evolution* modundan). Bizde üç biçim
var: `_proto`, sade (Recal), `_10k`. Omniverse'ün 6000 tick'lik cezası bu
yüzden **kullanılmıyor**. 10K'ya vermek cazipti — "en üst biçim en ağır
cezayı alsın" — ama 10K Omniverse değil; ölçmeden eşitlemek bu depoda
yasak.
