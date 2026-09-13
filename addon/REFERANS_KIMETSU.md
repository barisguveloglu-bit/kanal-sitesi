# Kimetsu no Yaiba ver3 (Forge 1.20.1) — inceleme

Kullanıcı: *"böyle bir mod daha buldum, bunu da en güçlüsünü seç yani
aralarından iki tanesini seçebilirsin, ayrıca seçtiğin o iki tane şey ile
alakalı tüm şeyleri alacaksın."*

Paket: **5781 dosya, 28 MB.** MCreator üretimi, 3713 `.class`, 720 procedure.
Jar **çalıştırılmadı** — zip açıldı, dil dosyası ve sınıf adları okundu.

## Seçim ölçüldü, beğeniyle yapılmadı

Modda **18 `PlayerBreath*Procedure`** var, yani 18 nefes. Hangisinin "en
güçlü" olduğu tartışmaya açık olabilirdi; modun kendi içeriği tartışmayı
kapatıyor:

| | Güneş | Ay | öteki 16 |
|---|---|---|---|
| procedure sayısı | **2** (`Sun` + `HinokamiKagura`) | 1 | 1 |
| kendi mermi varlığı | — | **`BulletSlashingMoonProjectile`** | — |
| kendi nichirin kılıcı | **`NichirinswordYoriichi`** | **`Nichirinswordmoon`** | çoğunda yok |
| karakter varlığı | **3** (`yoriichi`, `yoriichi_old`, `yorichi_0`) | 1 (`kokushibo`) | 0–1 |
| ek zırh parçası | — | 3 (kafa ×2, dokunaçlar) | yok |
| replik satırı | **11** | — | 0–5 |

Kanonla da örtüşüyor: **Güneş (Hinokami Kagura)** öteki bütün nefeslerin
türediği kök, **Ay** ondan doğrudan türeyen tek nefes. Üçüncü bir aday yoktu.

### Bir ölçüm hatası ve düzeltilmesi

İlk sayımda "Sun 39 sınıf" çıkmıştı ve yanlıştı: `sun` alt dizesi
**Kimet`sun`oyaiba** kelimesinin içinde geçiyor, yani mod iskeletinin her
sınıfı eşleşiyordu. Sayım kelime sınırıyla tekrarlandı ve yukarıdaki tablo
ondan çıktı.

## ALINDI: iki üslup, 23 form

Kod `yetenekler/nefes.js`, ayarlar `NEFES_USLUPLAR`, test `test/nefes.mjs`
(34 madde), mutasyon bataryası **7/7**.

### Form adları moddan, uydurma yok

`assets/kimetsunoyaiba/lang/en_us.json` içindeki `kimetsu.breath.sun1..12` ve
`moon1..16` birebir alındı.

**Modda boş bırakılmış anahtarlar alınmadı:** `sun13`, `moon4`, `moon11`,
`moon12`, `moon13`, `moon15`. Bu yüzden Güneş **12**, Ay **11** form.
Olmayan şeyi uydurmak bu depoda yasak; test o altı numaranın **eklenmediğini**
ayrıca ölçüyor.

| | Güneş Nefesi (Hinokami Kagura) | Ay Nefesi |
|---|---|---|
| 1 | Dance | Dark Moon - Evening Palace |
| 2 | Clear Blue Sky | Pearl Flowers Moongazing |
| 3 | Raging Sun | Loathsome Moon - Chains |
| 4 | Burning Bones, Summer Sun | *(modda boş)* |
| 5 | Sunflower Thrust | Moon Spirit Calamitous Eddy |
| 6 | Dragon Sun Halo Head Dance | Perpetual Night, Lonely Moon - Incessant |
| 7 | Setting Sun Transformation | Mirror of Misfortune - Moonlit |
| 8 | Solar Heat Haze | Moon-Dragon Ringtail |
| 9 | Beneficent Radiance | Waning Moonswaths |
| 10 | Fire Wheel | Drilling Slashes, Moon Through Bamboo Leaves |
| 11 | Fake Rainbow | *(modda boş)* |
| 12 | Flame Dance | *(modda boş)* |
| 14 | — | Catastrophe, Tenman Crescent Moon |
| 16 | — | Moonbow, Half Moon |

### 720 procedure, altı mekanik

Kaynak MCreator üretimi: her form ayrı bir procedure. Hepsini bire bir
taşımak ne mümkün ne anlamlı — yaptıkları iş altı kalıba düşüyor:

`kesik` (bakış konisinde hasar) · `halka` (360°) · `atilim` (ileri fırla,
varışta vur) · `mermi` (fırlatılan kesik) · `koruma` (kendine süreli efekt) ·
`cekis` (hedefleri kendine çek)

Her formun türü **adından değil kaynaktaki işinden** seçildi.

### İki üslubun imzası ayrı

**Güneş ateşle çalışıyor** — formlarının çoğu hedefi yakıyor (`atesle` alanı).
**Ay ateş vermiyor**, bunun yerine düzensiz ek kesikler atıyor (`tekrar`).
Test ikisini ayrı ayrı ölçüyor: bir mutasyon Ay'a ateş eklediğinde düştü.

### Üslup kapısı

23 form birden jest listesine girseydi liste kullanılamaz hale gelirdi.
Oyuncu önce üslubunu seçiyor (`meyve_sec` / `karakter_sec` ile aynı kalıp),
sonra yalnız o üslubun formları çalışıyor. **Öteki üslubun formu hiçbir şey
yapmıyor** — sessizce o üslubu açmak, oyuncunun istemediği bir şey yapmak
olurdu.

Seçilen üslup dünyaya yazılıyor ve **çıkışta silinmiyor**; `nefesCikti`
yalnızca bekleme sayacını temizliyor. (İlk yazılışta `nefesUnut`
çağrılıyordu ve üslubu da siliyordu — yani kalıcılık kodu yazılıp hemen
iptal edilmiş oluyordu. Test bunu davranışla ölçüyor.)

## ÜÇÜNCÜ ÜSLUP: BAMBU (v7.88)

Kullanıcı: *"bu kadar dolu olmasa da 3 sırada olan en dolu yeteneğe sahip
olan nefes hangisi onu da alabilir misin."*

Güneş ve Ay dışarıda bırakılıp kalan 14 nefes aynı ölçütlerle sayıldı:

| nefes | dolu form | kendi kılıcı | dil kaydı |
|---|---|---|---|
| **bambu** | **12** | **2** (`nichirinsword_bamboo`, `_bamboo_2`) | **22** |
| su | 11 | — | 20 |
| canavar | 10 | — | 21 |
| yıldırım | 10 | — | 14 |
| sakura | 10 | — | 13 |
| rüzgâr | 9 | — | 19 |

Bambu her ölçütte önde. (İlk sayımda iç sınıflar `$1` kılıçları ikiye
katlıyordu; tekilleştirilip tekrarlandı, sonuç değişmedi.)

**Kanonda yok, bilerek.** Bambu Nefesi Kimetsu no Yaiba kanonunda geçmez,
moda özgü. İstek "dosyadaki en dolu üçüncü" idi, "kanondaki üçüncü" değil.
Kanon bir üçüncü istenirse **Su** (11 form) hazır bekliyor.

**İmzası: sersemletme.** Güneş yakıyor, Ay tekrarlı kesiyor. Bambu bir
**tahta** kılıç — kesmez, ezer: bulantı + yavaşlık. Üçüncü üslubun üçüncü bir
imzası olmasaydı Güneş'in renksiz bir kopyası olurdu. Test hem Bambu'nun
sersemlettiğini hem **Güneş'in sersemletmediğini** ayrı ayrı ölçüyor.

12 formun hepsi dolu (modda boş anahtar yok): Bamboo Blade · Bamboo Way ·
Bamboo Basket · Bamboo-Copter · Stilt · Bamboo Impact · Bamboo Fang Demon ·
Bamboo Grass Enumeration · Firecracker · Takemikazuchi no Kami ·
Shishi-Odoshi · BAMBOO.

## ALINMADI

- **Öteki 13 nefes** — Su, Alev, Yıldırım, Rüzgâr, Taş, Sis, Ses, Aşk, Yılan,
  Böcek, Çiçek, Canavar, Sakura. İstenirse aynı tablodan eklenir — sistem
  veriye bağlı, kod değişmez. Sıra payı da açıldı: PowerBorne 640'tan
  **700**'e taşındı, yaklaşık iki üslup daha sığıyor.
- **67 Kekkijutsu (kan iblis sanatı)** — iblis tarafı. Ayrı bir kadro,
  ayrı bir istek.
- **Karakter varlıkları ve dokuları** — Yoriichi'nin üç sürümü, Kokushibo,
  kılıçlar, zırh parçaları. Başka bir kanalın kadrosu; bu depoda kadro
  `LORE.md`'den geliyor.
- **Nichirin kılıçları eşya olarak** — formlar şu an üslup seçimiyle açılıyor,
  kılıç şartı yok. Kılıçları eşya olarak eklemek `kol_uret.py` işi; not
  düşüldü.
