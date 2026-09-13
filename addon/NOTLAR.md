# v7.90.0 — Yenilmez Zırh

Kullanıcı: *"bu modda o zırhı taktığın zaman /kill yazınca bile öldürmüyormuş,
öyle bir mekanik var mı? … /kill yazınca hata mesajı versin, İngilizce."*

## Önce ölçüm: kaynakta öyle bir mekanik YOK

Tam inceleme [`REFERANS_AVARITIA.md`](REFERANS_AVARITIA.md).

Avaritia'daki `immortal` bir **etiket** ve tek işi **modun kendi silahlarının**
seni atlaması — sonsuzluk kılıcı sana 100000 yerine 1 hasar veriyor. `/kill`
ile hiçbir ilgisi yok.

Bundle'daki bütün `beforeEvents` abonelikleri sayıldı:
`entityHurt` **sıfır**. `entityDie` ile dirilten bir şey de yok. İddia
karşılıksız.

## Ama kullanılabilir bir teknik vardı

Mod düşme hasarını `afterEvents.entityHurt` içinde **geri iyileştirerek**
iptal ediyor:

```js
health.setCurrentValue(min(effectiveMax, currentValue + ev.damage))
```

Alınan şey bu, her hasar sebebine genişletilmiş hâli.

## Ne kesin, ne değil

- **Geri iyileştirme kesin çalışır** — kaynakta çalışan tekniğin aynısı.
- **`/kill` garanti edilemez.** Hasarı iptal eden bir kanca Bedrock'ta yok;
  `entityHurt` olaydan sonra çalışıyor. Script'in ölümü sonlandırmadan önce
  yetişip yetişmediği oyunda denenmeden bilinemez ve burada oyun
  çalıştırılamıyor.

İki iş **ayrı** yazıldı: iyileştirme ayrı, öldürme girişimi bildirimi ayrı.

## Mekanik

Kapı: **Güç Zırhı tam set** (4 parça birden). Tek parça eksikse zırh yok.

- Hasar geri iyileştiriliyor, **şarj** harcanıyor (8 şarj).
- Şarj bitince zırh **soğuyor**, 30 saniyede bir dolum.
- Öldürme girişiminde (`selfDestruct` · `suicide` · `void` ya da ≥100 hasar)
  herkese İngilizce mesaj:

```
✖ COMMAND FAILED
Target is protected by the ARMOR OF THE LEGEND.
» /kill cannot be executed on this entity.
Entity: Earsh · Status: UNDYING · Charges: 7/8
```

Mesaj susturmalı — `/kill` spam'i sohbeti boğmasın.

**Neden şarjlı:** sınırsız olsaydı hem bu deponun en temel kuralını çiğnerdi
(kalıcı etkinin sınırı olmalı) hem düelloyu bitirirdi. Yenilmez bir rakiple
oynamak oynamak değildir.

## Mutasyon bataryası bir ölü ayar buldu

`YENILMEZ_TAVAN_HASAR = 200` yazmıştım, gerekçesi "tavan yoksa sınırsız
iyileştirme olur" idi. Batarya ayarı kaldırdı ve **hiçbir madde düşmedi** —
çünkü iyileştirme zaten `Math.min(maks, …)` ile can tavanına vuruyor. İkinci
tavanın gözlenebilir hiçbir etkisi yoktu. Silindi; gerçek sınır olan can
tavanı ayrıca test edildi.

## Test

`test/yenilmez.mjs` 36 madde. Mutasyon bataryası **11/11**.

---

# v7.89.0 — Savunma Merdiveni

Kullanıcı kararı: *"biz bunu tamamen savunmaya yönelik yapalım … canım
azaldığında ekstra güç açacağım, veya rakibimin gücü benden daha güçlüyse en
azından defansımı geliştireyim … o kurtarıcı dediğimiz ile bir sistem kuralım
… kurtarıcı bitti ondan sonra da sıralı olsun … hepsine de can okuyucu ekle ki
sıralı bir şekilde devreye girsinler."*

## Beş basamak, canın oranına bağlı

| can | basamak | ne veriyor |
|---|---|---|
| %70 | Tetikte | Direnç I |
| %50 | Zırh | Direnç II · ateş direnci · emilim |
| %35 | Kalkan Sistemi | Direnç II + **mermi düşürücü açılır** |
| %20 | Nöbetçi | Direnç III · yenilenme + **taret kurulur** |
| %10 | Son Direniş | **Direnç IV** · yenilenme II · yavaş düşme · emilim II + üstündekileri ayırır |

Oyuncu hiçbir şey yapmıyor; merdiven canı okuyor ve açıyor.

## Sıralı olması

Her taramada **en fazla bir basamak** açılıyor. Can bir anda dibe vursa bile
merdiven 1'den başlayıp tırmanıyor. Bu senin açık isteğindi ve ayrıca doğru:
beş basamak birden açılsaydı hangisinin işe yaradığı hiç anlaşılmazdı.

## "Rakibim benden güçlü" nasıl ölçülüyor

Rakibin gücünü okuyan bir API yok. Ölçülebilen şey **canın ne hızla gittiği**:
2 saniyelik pencerede oranın dörtte birinden fazlası giderse merdiven bir
yerine **iki basamak** birden çıkıyor. Tahmin değil ölçüm.

## Test bir tasarım hatası buldu

İlk yazılışta toparlama dalı can geçmişini siliyordu. Sonuç: **tam candan
başlayan düşüş hiç ölçülemiyordu** — %100'deki örnek silindiği için bir
sonraki taramada pencerede tek değer kalıyor ve "hızlı düşüş" hiçbir zaman
doğru çıkmıyordu. Kaçırılan şey tam da senin anlattığın durumdu: tam candan
bir anda dibe vurmak. Testin 4. maddesi yakaladı, düzeltildi.

## Direnç V yok

Tavan **Direnç IV** (amp 3). Direnç V tam dokunulmazlık ve bu depoda yasak —
`tarama.mjs` onu ayrıca deniyor, merdiven testi de kendi tablosunda deniyor.
"Asla yenilmemek" anlaşılır bir istek ama dokunulmazlık savunmayı değil oyunu
bitirir.

## Hiçbir basamak hasar vermiyor

Tamamen savunma. Son basamağın itmesi bile hasarsız: üstündekileri **ayırır,
öldürmez**. Botlarımızı itmiyor, kendimize dokunmuyor.

## Kurtarıcı duruyor

`ruh.js`'teki Kurtarıcı **değiştirilmedi** — ruh yakan, karaktere bağlı, tek
kademe. Merdiven ondan bağımsız ve genel. "Yerine" değil "ardına" bir sistem
istendi, öyle yapıldı.

## Test

`test/merdiven.mjs` 40 madde. Mutasyon bataryası **10/10** — sıralılığın
kaldırılması, hızlı düşüş kuralının silinmesi, geçmişin yine silinmesi,
Direnç V konması, son basamağın hasar vermesi, oranın yerine mutlak canın
okunması… hepsi yakalandı.

Bir mutasyon (can okuma **istisna** atarsa 0 dönmesi) ilk turda **kaçtı** ve
gerçek bir test boşluğuydu: `getComponent` undefined dönen yol deneniyordu ama
istisna atan yol denenmiyordu. 0 dönmek "canın %0" demek, yani okunamayan
oyuncunun bütün merdivenini yakar. Madde eklendi.

---

# v7.88.0 — Üçüncü nefes: Bambu

Kullanıcı: *"bu kadar dolu olmasa da 3 sırada olan en dolu yeteneğe sahip
olan nefes hangisi onu da alabilir misin."*

## Ölçüm

Güneş ve Ay dışarıda bırakıldı, kalan 14 nefes aynı ölçütlerle sayıldı:

| nefes | dolu form | kendi kılıcı | dil kaydı |
|---|---|---|---|
| **bambu** | **12** | **2** | **22** |
| su | 11 | — | 20 |
| canavar | 10 | — | 21 |
| yıldırım | 10 | — | 14 |

**Bambu her ölçütte önde.** İlk sayımda iç sınıflar (`$1`) kılıçları ikiye
katlıyordu; tekilleştirip tekrarladım, sonuç değişmedi.

**Kanonda yok, bilerek aldım.** Bambu Nefesi Kimetsu no Yaiba kanonunda
geçmez, moda özgü. İstek "dosyadaki en dolu üçüncü" idi. Kanon bir üçüncü
istenirse **Su** (11 form) hazır.

## İmzası ayrı: sersemletme

Güneş yakıyor, Ay tekrarlı kesiyor. Bambu bir **tahta** kılıç — kesmez, ezer:
bulantı + yavaşlık. Üçüncü üslubun üçüncü bir imzası olmasaydı Güneş'in
renksiz bir kopyası olurdu. Test hem Bambu'nun sersemlettiğini hem **Güneş'in
sersemletmediğini** ayrı ayrı ölçüyor.

12 formun hepsi dolu — Bambu'da modda boş anahtar yok.

## Sıra payı açıldı

Üçüncü üslupla nefes 637'ye çıktı, PowerBorne 640'tan başlıyordu: **üç slot**
pay kalmıştı, dördüncü üslup çarpardı. PowerBorne **700**'e taşındı, araya 62
slot (yaklaşık iki üslup daha) girdi. Test bu payı ayrıca ölçüyor — daralırsa
haber verir.

## Test

`test/nefes.mjs` 48 madde (8. bölüm yeni). Mutasyon bataryası **5/5**:
sersemletmenin kaldırılması, süresiz yapılması, Güneş'e de verilmesi,
uydurma form eklenmesi ve sıra payının daraltılması — beşi de yakalandı.

---

# v7.87.0 — Nefes (Kimetsu) + PowerBorne'un on bir mekaniği

Kullanıcı dört şey istedi.

## 1. "Frisk's heroes'un tüm karakterlerini sil" — zaten silinmişti

FiskHeroes **v5.2'de tamamen kaldırılmıştı**: dokuz kahraman, yedi ışını,
kostüm geometrisi, `kahraman.js`, `REFERANS_FISK.md`. `test/marvel.mjs` 1.
bölüm on bir maddeyle kalıntı arıyor, hepsi temiz. Yapacak bir şey yoktu.

## 2. "Marvel Project'i çıkarma, powerborne yanında dursun"

Duruyor — 54 kahraman, 300 parça, hiç dokunulmadı. `test/powerborne.mjs`
**0. bölüm** bunu ayrıca bekçiliyor: biri gün gelip "yerine koyduk" diye
silmeye kalkarsa test düşer.

## 3. PowerBorne'un on bir mekaniği alındı

Geçen sürümde ölçülüp "bizde yok" diye işaretlenmişlerdi. Hepsi yazıldı:

duvarda yürüme · örümcek hissi · ağ atma · kalkan fırlatma · çekiç çağırma ·
yukarı yumruk · dalış vuruşu · donduran nefes · gök gürlemesi · madde
dönüştürme · elde pişirme

Kaynaktan ayrıldığımız yerler ve sebepleri
[`REFERANS_POWERBORNE.md`](REFERANS_POWERBORNE.md)'de. Özetle: ağ **hasar
vermiyor** (tutuyor), donduran nefes **blok koymuyor** (oyuncuyu bloğun içine
hapsetmek yasak), çekiç çağırma eşyayı **silmiyor**, elde pişirme **adedi
koruyor**, dalış vuruşu **yerdeyken çalışmıyor**, madde tablosu **bilerek
zayıf** (taşı elmasa çevirmek hile olurdu).

Bir hatayı test buldu: kalkan en **uzaktakine** önce vuruyordu. Sebebi
ölçülür — göz yüksekliği 1,6 blok olduğu için tam önündeki üç hedeften en
uzaktaki en küçük açıyı veriyor. Açı sıralaması nişan almak için doğru,
sekme için doğru olan mesafe.

## 4. Kimetsu no Yaiba: en güçlü iki üslup

Tam inceleme [`REFERANS_KIMETSU.md`](REFERANS_KIMETSU.md).

**Seçim beğeniyle değil ölçümle yapıldı.** Modda 18 nefes var; Güneş ve Ay
modun kendi içeriğinde ayrılıyor — Güneş'in **iki** procedure'ü
(`Sun` + `HinokamiKagura`) ve üç karakter varlığı, Ay'ın **kendi mermi
varlığı** ve üç zırh parçası var. Öteki 16'sında hiçbiri yok. Kanonla da
örtüşüyor: Güneş kök, Ay ondan türeyen tek nefes.

**Bir ölçüm hatasını düzelttim:** ilk sayım "Sun 39 sınıf" dedi ve yanlıştı —
`sun` alt dizesi **Kimet`sun`oyaiba**'nın içinde geçiyor, mod iskeletinin her
sınıfı eşleşiyordu. Kelime sınırıyla tekrarladım.

**23 form, adları moddan birebir.** Modda boş bırakılmış altı anahtar
(`sun13`, `moon4/11/12/13/15`) **alınmadı** — olmayan şeyi uydurmak yasak;
test o altısının eklenmediğini ayrıca ölçüyor.

720 procedure altı mekaniğe indirildi (kesik · halka · atılım · mermi ·
koruma · çekiş) ve her formun türü **adından değil kaynaktaki işinden**
seçildi. İki üslubun imzası ayrı: **Güneş yakıyor, Ay tekrarlı kesiyor.**

## Test

`test/nefes.mjs` 34 madde, `test/powerborne.mjs` 40 madde.
Mutasyon bataryası **18/18** (7 nefes + 11 powerborne).

`tarama.mjs` bir ölü ithal yakaladı (`nefes.js`'te `KILIT_ATLA_TIPLER`),
silindi. `yetenek_ara.mjs` düştü çünkü yeni aileler jest kuyruğunun sonunu
değiştirdi — maddenin ölçtüğü şey "şu aileler kuyrukta" değil "kuyrukta
erişilemeyen bir aile var", o yüzden liste genişletildi ve gerekçesi yazıldı.

---

# v7.86.0 — SecurityCraft'tan beş savunma düzeneği + PowerBorne denetimi

Kullanıcı iki jar gönderdi. İkisi de **çalıştırılmadı** — zip açıldı, veri
dosyaları okundu.

## PowerBorne Heroes 0.5.1 — "aldık mı diye bak"

Tam cevap [`REFERANS_POWERBORNE.md`](REFERANS_POWERBORNE.md).

**Bu mod hiç işlenmemiş.** Marvel içeriğimiz `REFERANS_MARVEL.md`'de yazılı ve
başka bir moddan: *Marvel Project Addon v3.0.1* (Bedrock). PowerBorne ise
Forge + Palladium + KubeJS. Adları benzediği için karışmış olabilir.

Altı karakter (Superman · Spider-Man · Thor · Captain America · Sentry ·
Firestorm), sıfır `.class`, ~420 yetenek girdisi ama çoğu tesisat; gerçek
mekanik ~45.

Karşılaştırma yapıldı: **11 gerçek mekanik bizde yok** — duvarda yürüme,
örümcek hissi, ağ atma, kalkan fırlatma, çekiç çağırma, yukarı yumruk, dalış
vuruşu, dondurucu nefes, thunderclap, madde dönüştürme, elde pişirme.
Çoğu Bedrock'ta yapılabilir. Bu sürümde alınmadı çünkü bu dosya için istek
"aldık mı diye bak" idi.

## SecurityCraft v1.10.2.1 — "hiçbir şeyi atlamadan al"

Tam cevap [`REFERANS_SECURITYCRAFT.md`](REFERANS_SECURITYCRAFT.md).

**Önce sayıyı düzelttim:** 710 blok görünüyor ama 592'si "güçlendirilmiş
\<vanilla blok\>", 37'si "\<cevher\> mayını", 24'ü gizli tabela, 18'i
dekoratif kuvars. Gerçek fikir sayısı **48**, 710 değil.

**Alınan beş düzenek:**

| | kaynak | ne değişti |
|---|---|---|
| Kalkan Sistemi | Trophy System | kendi okunu düşürmüyor — hız vektörü ölçümüyle |
| Yarık Dengeleyici | Rift Stabilizer | Gözcü görür, bu engeller |
| Nöbetçi | Sentry | modeli yok (ölçülü karar), sahibini/botları vurmaz |
| Radar | Portable Radar | kendini listelemez |
| Mayın | Mine / Claymore | sahibi tetikleyemez, kurma gecikmesi var, blok kırmaz |

**Kendi okunu düşürmeme sorunu** en ilginci: kaynak merminin sahibini
okuyabiliyor (Java'da `shooter` alanı var), Bedrock script'inde o alan yok.
Ölçümle çözüldü — merminin hız vektörü ile "mermiden bize" vektörünün iç
çarpımı. Pozitifse bize geliyor, negatifse uzaklaşıyor. Sahip bilgisine hiç
gerek kalmadı.

**Hepsi süreli.** Kaynakta hepsi blok: koyduğun yerde sonsuza kadar durur.
Yerde unutulmuş bir mayın, sahibini bir ay sonra öldüren bir şeydir.

**Alınmayan 43 fikrin her biri gerekçesiyle yazılı** — 6'sı bizde zaten var,
5'i Bedrock'ta yapılamaz (kamera, blok cebi, projektör, kılık modülü, sonik
sistem), 13'ü yapılabilir ama bu sürüme sığmadı, gerisi dekoratif.

## Test

`test/securitycraft.mjs`, 43 madde. Mutasyon bataryası **11/11** — kendi okunu
düşürme, sahibini vurma, mayını sahibinin tetiklemesi, kurma gecikmesinin
kalkması gibi mutasyonların hepsi yakalandı.

Tarama aracı bir ölü ithal yakaladı (`varlikIste` kullanılmıyordu), silindi.

---

# v7.85.0 — Efsanenin Dünyası

Kullanıcı: *"bana ait bir özel tohum olacak … her yeri bedrock ama her yeri
hava … ben hani havayı yapmak istedim ama etraf oluyor yani gökyüzü olmuyor,
gökyüzünü de ayarla … bana özel bir dünya olacak. Bir efsanenin ona özel bir
dünyası olması gayet güzel bence."*

## Şikâyet doğruydu: gökyüzü ayrı bir mekanizma

`/fog` **yalnızca mesafe sisini** boyuyor. Gökyüzü kubbesi vanilla mavi
kalıyor — kullanıcının "bildiğin sis oluyor" dediği şey tam olarak bu.
Gökyüzü için kaynak paketinde `biomes/` altında **istemci biyomu** tanımı
gerekiyor (`minecraft:sky_color`). İkisi ayrı dosya, ayrı bileşen.

## Renk ölçüldü, seçilmedi

Sis rengi zaten skinden ölçülmüştü: **#20C5B5** (turkuaz, `kol_uret.py`).
Kullanıcı "gökyüzü biraz koyu olsun" dedi. "Biraz" ölçülebilir bir şey değil;
ölçülebilen şey **ufuk çizgisinin görünmesi**.

Aynı ton (174°), aynı doygunluk (%72), parlaklık %45 → **%22**:
**#106159**, sis ile kontrast **3.38:1**.

3:1 eşiği WCAG'in grafik nesneler için ayırt edilebilirlik sınırı. Altına
düşerse gökyüzü ile sis tek bir düz duvar gibi duruyor — yani şikâyetin
kendisi geri geliyor. Test hem alt (≥3:1) hem üst (≤6:1) sınırı tutuyor;
üst sınır siyaha kaçmasın diye.

## İki şey üretiliyor

**`Simsek_Efsane_Gokyuzu`** — gökyüzü + sis paketi, 87 biyom dosyası.
**AYRI paket, bilerek.** Ana pakete konsaydı modu kuran herkesin bütün
dünyası değişirdi; bu depoda oyuncunun dünyasını geri alınamaz biçimde
değiştiren şey alınmıyor (`REFERANS_BORALO_V5.md`, biyom ezmesi maddesi).
`.mcaddon`'a **girmiyor** — testin en önemli maddesi bunu dosyada denetliyor,
niyet beyanında değil.

**`Simsek_v7.85.0_Efsane_Dunyasi.mctemplate`** — açınca kurulu gelen dünya:
tek kat bedrock, üstü boş, üç paket de bağlı. Doğum noktası y=1 (zeminin
üstü); y=4 yazılsaydı her girişte üç blok düşerdi.

Tohum addan türetiliyor (`sha256("Efsanenin Dünyası · Şimşek TNT · #20C5B5")`),
yani yeniden üretilebilir. Düz dünyada tohum arazi üretmiyor — arazi
`FlatWorldLayers`'tan geliyor — ama kullanıcı "bana ait bir tohum" istedi ve
dünyanın kimliği orada duruyor.

## level.dat elle yazıldı

Bu depoda paket yöneticisi yok, o yüzden küçük bir NBT yazıcı/okuyucu yazıldı
(`arac/nbt.py`). Bedrock biçimi Java'dan üç yerde ayrılıyor: sayılar **küçük
sonlu**, dosyanın başında **8 baytlık başlık**, kök etiket **boş adlı**.

**Bu dosyayı oyunda deneyemedim.** Gösterebildiğim tek şey, yazdığımı geri
okuyup birebir aynı sözlüğü elde etmek — `dogrula()` bunu yapıyor ve üretim
ona bağlı: geçmezse dosya hiç yazılmıyor.

Tür denetimi ayrıca test ediliyor, çünkü bu biçimde en sinsi hata **yanlış
tür**: oyun alanı sessizce atlıyor, hiçbir şey söylemiyor. İlk yazılışta
`rainLevel` CIFT yazılmıştı (Bedrock KESIR bekliyor); zaten varsayılanı 0
olduğu için alan tamamen silindi.

## Test

`test/efsane_dunyasi.mjs`, 33 madde. Mutasyon bataryası 11 mutasyon —
**biri kaçtı ve gerçek bir hata buldu**: üretici klasörü temizlemiyordu,
`BIYOMLAR` listesinden çıkarılan biyomun eski dosyası diskte kalıyordu. Yani
liste ile klasör ayrışabiliyordu. Bu deponun daha önce defalarca düştüğü
tuzak (`kol_uret.py`'deki `beklenen` kümesi tam bunun için var). Düzeltildi,
11/11 yakalandı.

---

# v7.84.0 — Boralo V6: 201 eşya okundu, 2 yetenek alındı

İncelemenin tamamı [`REFERANS_BORALO_V6.md`](REFERANS_BORALO_V6.md).

201 eşyanın 121'inde komut var, o eşyaların çağırdığı **176 function'ın
tamamı** okundu. Çıkan mekanik listesinin **ikisi hariç hepsi bu modda zaten
vardı**. Alınan ikisi: **Kan Yağmuru** (bu depoda havaya dokunan tek satır
yoktu) ve **Göz Sensörü** (körlük başka yeteneklerin içindeydi ama tek işi
körlük olan bir şey yoktu; `SERSEM_KOR` bilerek `false`).

Kaynağın amacı korundu, altyapısı değil: süresiz `weather rain` → süreli;
`damage @e` → menzil + kendimiz hariç; `blindness 9999 255` → 60 tick;
`effect @s clear` → oyuncunun etkilerine dokunulmuyor.

Alınmayanlar: `op @a`, `clear @s`, `fatal_poison 9999 255`, `tp @a @s`,
`replaceitem slot.armor.head`, `entities/player.json`. Ayrıca 11 function
komut olarak geçersiz.

---

# v7.83.5 — Gözcü yanlış pozitif taraması + sürüm numaralandırması

v7.82'deki Warden yanlış alarmı bir sınıftı; altı tanesi bulundu: uzun mob
(gövde ekseni), ölçeksiz sıçrama eşiği, 1.21 öncesi katı blok listesi, zamanda
gezen geri itme ölçümü, rüzgâr yükü, vuruş hızı eşiği 8→14.

Sürüm numaralandırması değişti:

| hane | ne zaman artar |
|---|---|
| üçüncü | hata düzeltmesi, yanlış alarm, ayar |
| ortanca | yeni yetenek, yeni sistem, yeniden yapılandırma |
