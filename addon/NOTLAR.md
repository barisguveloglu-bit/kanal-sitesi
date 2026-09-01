# v7.6 — Telekinezi ve Nitroksin güçlendirildi

Kullanıcı: *"zaman saati telekinezisi var ya, onu daha da güçlendirebilir
misin acaba. Nitroksin, ikisini de aynı şekilde güçlendir, onun da güçsüz
olduğunu düşünüyorum artık."*

## Önce depodaki dersi okudum

`ayarlar.js`'te v4.78 yazılı duruyor:

> Bütün efektlere +1 verilmişti. Kullanıcı denedi ve beğenmedi.
> **Ders: toplu +1 aslında hiçbir şey değiştirmiyor.** Herkes aynı oranda
> büyüyünce iksirler arasındaki fark aynen kalıyor, sadece roma rakamları
> şişiyor. Oynanışta hissedilen şey **yeni bir yetenek**, bir basamak daha
> yüksek aynı yetenek değil.

O yüzden ikisinde de aynı yöntem: **kendi alanında bir basamak + gerçekten
yeni bir iş.**

## Telekinezi

Kaynakta menzil 15, fırlat 15, **hasar yok** — hedefi kaldırıp fırlatıyordun
ve hedef hiçbir şey hissetmiyordu, yalnızca yer değiştiriyordu.

| | önce | sonra |
|---|---|---|
| menzil | 15 | **25** |
| fırlatma | 15 | **30** |
| önde tutma | 4 | **5** |
| tutarken | — | **ezme 4 hasar** (her 2 tick) |
| fırlatınca | — | **çarpma 60 hasar** |

**Ezme** yeni bir iş: havada tutmak artık zararsız değil. Yeni bir tarama
döngüsü açmıyor — zaten orada dönülüyor, bedava.

Hasar **saatçiye** yazılıyor (`damagingEntity`) ki beceri XP'si ve ölüm
mesajı doğru kişiye gitsin — göz lazerinde v4.95'te öğrenilen aynı ders.

**Fırlatma hâlâ infaz değil:** `slow_falling` duruyor. Hedef vurulur ama
üstüne bir de düşüş hasarıyla öldürülmez. Öldürmek isteyen zaten vurabilir.

## Nitroksin

Sayılar **yalnızca kendi uzmanlığında** büyüdü:

```
speed       3 → 4
jump_boost  3 → 4
strength 2, resistance 1, haste 1, absorption 2   ← DOKUNULMADI
```

Yani uzmanlık düzeni bozulmadı; Nitroksin zaten hızın uzmanıydı, sadece
daha uzman oldu.

**Yeni yetenek: düşme hasarı yok.** Neden tam bu — Nitroksin zıplama uzmanı
ve Zıplama V ile attığın zıplamanın bedelini **kendi yeteneğinden**
ödüyordun. `slow_falling` bunu hafifletiyor ama Grinoksin ve Kan İksiri'nde
de var; Nitroksin'e ait bir şey değildi.

Hasar Bedrock'ta **iptal edilemiyor** (`entityHurt` cancelable değil), o
yüzden geri veriliyor — teknoloji zırhlarında ve Viltrumite'ta kullanılan
aynı kalıp. Verilen şifa yeni bir `entityHurt` üretmiyor, döngü yok.

**Yalnız düşme.** Void, açlık, lav, vuruş hâlâ öldürür — tam dokunulmazlık
sadece StarOxine'de, o kural bozulmadı.

## Denetim

Takım "hepsi geçti" dedi ve bu **tek başına hiçbir şey söylemiyordu** — yeni
kod hiç çalıştırılmamıştı. İki bölüm yazıldı ve ikisi de kodu **gerçekten
koşturuyor**:

`mutant_saat.mjs` — hedef yakalanıyor, tarama döndürülüyor, alınan hasarlar
deftere yazılıyor: 5 vuruş × 4 ezme, 1 vuruş × 60 çarpma, hasarın saatçiye
yazıldığı, ve slow_falling'in hâlâ verildiği.

`iksir.mjs` — iksirsizken düşme hasarı duruyor; Nitroksin içilince geri
veriliyor; can tavanı aşılmıyor; **lav/açlık/void/vuruş geri verilmiyor**;
Grinoksin'de bağışıklık yok; ve uzmanlık düzeni ile StarOxine'in tekelinin
bozulmadığı.

**Kasten bozuldu, ikisi de yakalandı:**

| bozma | düşen |
|---|---|
| `cause !== "fall"` şartı kaldırıldı | lav, açlık, void, vuruş — dördü birden |
| ezme hasarı kapatıldı | ezme uygulandı + hasar saatçiye yazıldı |

İlkinde dikkat çeken şey: bağışıklık **daha güçlü** hâle geldiği hâlde test
düştü. Sınırlar da en az yetenek kadar korunuyor.

# v7.5 — Kanlı Kol'un omurgası uzadı + kolsuz skin

Kullanıcı iki şey istedi: *"chris kolunu birazcık daha uzat, omurgasını
birazcık daha uzat, bir tık kısa oldu gibi"* ve *"ben kolluyum ya skinde,
onu kolsuz hale getirebilir misin — çünkü bu kanlı kollar bir garip
oluyor."*

## Omurga uzatıldı, pençe uzatılmadı

Önce **ölçüldü** — kolun neresi ne (kemik `bone`/`bone3`, yerel y ekseni):

```
19,57 .. 31,90   OMURGA  3,25×1,30×2,60 zincir baklaları
                         + aralarında 0,65'lik bağlantılar
31,90 .. 38,43   PENÇE   5,85×1,30×7,80 avuç,
                         5,85×5,20×5,85 yumruk, 0,65'lik dişler
```

Omuz ucu yerel `y = 19,575`; dönüşten sonra dünyada `(-3,0, 25,4)` yani omuz
eklemi. **Uzatma o uçtan** yapılıyor — pivotun öteki yanından yapılsaydı kol
gövdenin *içine* doğru büyürdü.

**Pençe ölçeklenmiyor, sadece öteleniyor.** Ölçekleseydik dişler ve yumruk
da uzardı; kullanıcının dediği "omurga kısa", pençe değil. Pençenin oranları
kaynaktaki gibi kaldı.

`KANLI_UZATMA = 1.20` — tek sabit. Kol 18,85 → **21,32** birim.

Dört seçenek (1.00 / 1.15 / 1.30 / 1.45) oyuncu gövdesiyle birlikte
çizdirildi; 1,45'te pençe ayak hizasının altına iniyordu, 1,20 seçildi.

## Kolsuz skin

Bu bizim buluşumuz değil, **kaynağın şartı**. Code-Man paketinin dil
dosyasından, olduğu gibi:

> `bobby1545's Red Bloody Arms`
> `(Kolun Düzgün Çalışması İçin Skininizin Kolsuz Olması Lazımdır!)`

`skin_uret.py` artık iki dosya üretiyor: normal skin ve kol pikselleri
**saydam** olan sürüm. Kol kutuları (`SAG_KOL_KUTU`, `SOL_KOL_KUTU`) tek
yerde yazılı ve ikisine de oradan gidiyor — iki ayrı listede tutulsaydı biri
değişip öteki kalırdı. İkinci katman (kol kaplamaları) bu betik tarafından
zaten çizilmiyor ama kolsuz sürümde yine de siliniyor: ileride biri kaplama
eklerse kolsuz skin sessizce kollu olurdu.

Kolu **modelden çıkarmak mümkün değil** — `skins.json` yalnızca
`humanoid.custom` / `customSlim` kabul ediyor. Kol kutusu modelde duruyor,
sadece görünmüyor.

Giyinme Odası'nda artık üç skin var: **Uzak Akraba · O Şey Formu ·
Kolsuz**.

## Denetim

`kanli.mjs` "kemikler kaynaktan hiç değişmeden geldi" diyordu ve bu
değişiklikte **haklı olarak düştü**. Yerine "nasıl değişmesi gerektiğini"
iddia eden ölçümler yazıldı:

| kontrol | sonuç |
|---|---|
| omurga tam k katı gerildi | 32 küp |
| pençe UZAMADI, yalnızca ötelendi | 34 küp |
| x/z ve uv'ye hiç dokunulmadı | ✓ |
| küp sayısı aynı kaldı | 66 |
| kol gerçekten uzadı | 18,85 → 21,32 |
| iki kol çakışmıyor | boşluk 3,3 |

Sabitler (`KANLI_UZATMA`, `KANLI_OMUZ_UC`, `KANLI_PENCE_SINIR`) testte elle
yazılmadı, **üreteçten okunuyor** — yoksa sabit değişince test eski değeri
doğrular ve hiçbir şey söylemez.

**Kasten bozuldu:** pençe de ölçeklenecek şekilde değiştirildi →
`✗ pençe UZAMADI` düştü, `✓ omurga tam k katı gerildi` ayakta kaldı. Yani
iki iddia gerçekten birbirinden bağımsız.

`skin_paketi.mjs`'e 7. bölüm eklendi: kolsuz sürümde kol bölgesinde **0 opak
piksel**, kol **dışında** değişen piksel de **0** — yani "kolsuz" sürüm
sessizce başka bir skin olmuş değil. Kol kutuları oraya da elle yazılmadı,
`skin_uret.py`'den okunuyor.

Ayrıca "iki skin tanımlı" kontrolü sabit **2** yazıyordu ve üçüncü skinle
düştü. Sayı artık `SKIN_LISTE`'den okunuyor; ilk ikisinin **yeri** hâlâ
kilitli, o kullanıcının açık isteğiydi.

# v7.4.2 — Çizici artık Blockbench `.bbmodel` de okuyor

Kullanıcı Blockbench öğreniyor: *"dosyasını bulmak için araştırma yapman
gerekiyor, sende yap lütfen… mantığını anladıktan sonra da çizici ile
birleştir."*

Paket **değişmedi** — yine alet tarafı. Yeni: `bbmodel.py`,
[`REFERANS_BLOCKBENCH.md`](REFERANS_BLOCKBENCH.md), ve `ciz_kemik.yukle()`
artık `.bbmodel` de yiyor.

## Dosya nasıl bulundu

Resmî wiki açıkça şunu diyor:

> *"There is no complete specification of the JSON format at this point in
> time… it is recommended to look at example .bbmodel files and to examine
> the Blockbench source code."*

O yüzden spec değil **kaynak** okundu (`JannisX11/blockbench`, master):
`js/formats/bbmodel.js`, `js/formats/bedrock/bedrock.js`,
`js/outliner/outliner.js`. Dosya yolunu bulmak iki adım sürdü —
`js/io/formats/…` 404 verdi, formatlar `js/formats/` altında ve Bedrock
kodeki kendi alt klasöründe (`js/formats/bedrock/bedrock.js`).

## Çevrim: tek bir ayna

`compileGroup` + `compileCube`'dan olduğu gibi:

```
bone.pivot[0]    *= -1
bone.rotation[0] *= -1 ;  rotation[1] *= -1          (Z aynen)
cube.origin[0]    = -(origin[0] + size[0])
```

Blockbuster'daki `24 − Y` çevrimi burada **yok** — o Java entity uzayına
özeldi. Blockbench'in Bedrock kipi zaten Y-yukarı çalışıyor. Fark sadece X.

Sonuç: **çevrim kendi tersi.** Kaynakta `parseCube` da `compileCube` ile
aynı formülleri kullanıyor, ters çevrilmişini değil. O yüzden `cevir_pivot`
ve `cevir_donus` birer kez yazıldı, iki yönde de çağrılıyor.

## Denetim: 344 geometri, sıfır fark

Depodaki **her** `.geo.json` `.bbmodel`'e çevrilip geri okundu:

```
TAM gidiş-dönüş: 344 | FARKLI: 0
```

Yolda iki gerçek şey yakalandı:

**1. `uv_rotation` düşüyordu.** İlk yazımda yüz başına `uv`/`uv_size`
taşınıyordu ama `uv_rotation` ve `material_instance` taşınmıyordu. Tarama
13 modelde farkı gösterdi — kaynağın `uv_rotation: 180` dediği yüzler
sessizce düz dönüyordu. Test olmasa hiçbir şey bağırmazdı, dokular sadece
yanlış dururdu.

**2. Kusur testin kendisindeydi.** Kalan 9 fark kayan nokta gürültüsüydü
(`3.0000000000000018` vs `3.0`). Karşılaştırma 4 haneye yuvarlıyordu ve
`0.00625` tam yuvarlama sınırına düştüğü için iki farklı sonuç veriyordu.
Yuvarlama atıldı, tolerans kondu.

## Gidiş-dönüş tek başına YETMEZ

Çevrim kendi tersi olduğu için X aynalamasını **iki yerden birden** silsem
gidiş-dönüş yine tutardı — test yeşil yanar, bütün modeller aynalanmış
olurdu. O yüzden kaynağın formülüne karşı tek bir sabit ölçüt eklendi:

```
bedrock.js / parseCube:  from[0] = -(from[0] + size[0])
Bedrock küpü origin[-8,12,-2] size[4,12,4]  →  from[0] = -(-8+4) = 4
```

**Kasten bozuldu:** X aynalaması iki yönden de silindi.

| denetim | sonuç |
|---|---|
| gidiş-dönüş | ✓ **hâlâ geçiyor** (simetrik hatayı göremez) |
| mutlak ölçüt | ✗ `from [-8,12,-2]`, beklenen `[4,12,-2]` |

Bir testin ne yakaladığından çok **ne yakalayamadığını** bilmek gerekiyor.

## Sürüm tuzağı

`format_version` 5.0 (Ekim 2025) grupları `outliner`'dan ayırdı. Ama
`outliner.js:loadJSON` içinde hâlâ *"Legacy group support"* dalı duruyor:
iç içe grup biçimi güncel Blockbench tarafından **hâlâ** okunuyor. Biz
`"4.5"` + iç içe yazıyoruz — yeni Blockbench de açar, eski de. 5.0'ın yeni
şeklini yazsaydık eski sürümlerde dosya hiç açılmazdı.

## Doku dosyanın içinde

`.bbmodel`'e doku `data:image/png;base64,…` olarak gömülüyor. Yani
Blockbench'te dosyayı açınca model **dokulu** geliyor, ayrıca png aramak
gerekmiyor. `ciz_kemik.yukle("x.bbmodel")` de tek argümanla çalışıyor.

# v7.4.1 — Çizici artık Blockbuster'ı da okuyor

Kullanıcı: *"hani bu modelleri çizen var ya, onunla bununla değiştir, bunun
içinde çalışsınlar… ikisini de birlikte kullan, birleşmiş teknoloji gibi bir
şey yap. Bana şaşırdıklarını söyle."*

Paket **değişmedi** — bu sürüm sadece alet tarafı. Üç dosya depoya girdi:

| dosya | ne |
|---|---|
| `ciz_kemik.py` | Bedrock geometrisini kemik dönüşleriyle çizen çizici (v7.3'te kolları birbirine geçmiş gösteren hata buradaydı) |
| `ciz_bb.py` | Blockbuster `model.json` → Bedrock kemikleri |
| `birlestir.py` | ikisini **tek sahnede** birleştiren gösteri |

## Dönüşüm tahmin edilmedi, kaynaktan okundu

`ModelCustomRenderer.applyTransform` ve `ModelParser.createRenderer`:

```java
rotationPointX = translate[0]
rotationPointY = parent.isEmpty() ? -translate[1] + 24 : -translate[1]
rotationPointZ = -translate[2]
rotateAngleX   = +rotate[0]
rotateAngleY   = -rotate[1]
rotateAngleZ   = -rotate[2]
// matris yığını: önce Rz, sonra Ry, sonra Rx  →  noktaya XYZ

ax = 1 - anchor[0];  ay = anchor[1];  az = anchor[2]
addBox(-ax*w, -ay*h, -az*d, w, h, d)
```

## Şaşırtan sonuç: iki işaret değişimi birbirini götürüyor

Java model uzayı Y-aşağı ve Z-ters, Bedrock Y-yukarı. Aradaki çevrim X
ekseni etrafında 180°:

```
Xb = Xj        Yb = 24 − Yj        Zb = −Zj
```

Bu çevrim altında `Rx` aynen kalır, `Ry` ve `Rz` **işaret değiştirir**. Ama
renderer zaten Y ve Z açılarını **negatifleyerek** yazıyordu. İkisi
birbirini götürüyor:

> **Blockbuster `rotate` üçlüsü = Bedrock `rotation` üçlüsü.**
> Hiçbir dönüşüm yapmadan, olduğu gibi.

Sıra da aynı: kaynağın matris yığını `Rz·Ry·Rx` yani noktaya **XYZ**, bizim
v7.3'te Bedrock için **ölçtüğümüz** sırayla aynı. İki bağımsız yerden aynı
sözleşme çıktı.

## Kanıt: Blockbuster'ın Steve'i vanilla oyuncunun ta kendisi

`ciz_bb.kontrol()` her koşuda çevrilen kutuları Bedrock vanilla değerleriyle
karşılaştırıyor. Altı uzuv, altısı da tutuyor:

```
body       [-4, 12, -2] [8, 12, 4]
head       [-4, 24, -4] [8,  8, 8]
right_arm  [-8, 12, -2] [4, 12, 4]
left_arm   [ 4, 12, -2] [4, 12, 4]
right_leg  [-4,  0, -2] [4, 12, 4]
left_leg   [ 0,  0, -2] [4, 12, 4]
```

Kollarda 0,001 sapma var: kaynağın verisinde `anchor` **0.1666** yazılı,
1/6 = 0.16666… değil. Yani sapma **kaynağın yuvarlaması**, çevrimin değil.
Tolerans 0,01 ve gerekçesi dosyada yazılı.

## Birleşme

`ciz(…, dokular={kemik: (görüntü, TW, TH)})` eklendi: bir kemik ve altındaki
her şey kendi dokusundan örnekleniyor. Gerekçe — Bedrock'ta bir geometrinin
tek dokusu olur, ama tek sahnede iki ayrı şey birleştiriyoruz. İkisini ayrı
çizip üst üste bindirmek **yanlış** olurdu: derinlik sıralaması bozulur,
arkadaki öne çıkardı.

`birlestir.py` şunu çiziyor: **iskelet ve poz Blockbuster'dan, kollar bizim
`geometry.simsek_kol_kanli`'mızdan, deri oyuncunun kendi skininden, kanlı kol
dokusu kaynağın kendi 256×256'sından** — hepsi tek sahnede. Kanlı kol
Blockbuster'ın `t_pose`'unda yatay açılıyor, `dabbing`'inde tek kol havaya
kalkıyor. Yani kaynağın poz verisi bizim uzvumuzu **gerçekten sürüyor**.

Kanlı kolun kök kemikleri atılmadı, sadece ebeveyn verildi. Blockbuster'ın
steve'inde kol pivotu x=∓6, bizde ∓5 — bir birim fark, kaynağın kendi
tercihi. Küpleri kaydırmak modeli **değiştirmek** olurdu.

## Jar depoya girmedi

20 MB ve GPL-3.0 başka bir eserin ikilisi. `ciz_bb.py` ve `birlestir.py`
model yolunu **argüman** alıyor; kullanıcı jar'ı açtığı yeri veriyor.

# v7.4 — Duruş sistemi (Blockbuster'ın bizdeki hâli)

Kullanıcı: *"bak kanka bu en önemlisi skin yapmakta, bunu genelde çok
kullanıyorlar… ilk önce mantığını anla, sonra kodlarına bak, ardından bizim
versiyonumuzu ekle."*

## Önce mantık okundu, tahmin edilmedi

Jar açıldı (Blockbuster 2.7.3-1.20.4; içinde Metamorph, MCLib, Aperture,
Chameleon da var) ve **1529 sınıf CFR ile çözüldü**. Çıkan model tamamı
[`REFERANS_BLOCKBUSTER.md`](REFERANS_BLOCKBUSTER.md) dosyasında. Özet:

- `Model` = adlı kutular (`limbs`) + duruşlar (`poses`)
- `ModelPose` = `{kemik: ModelTransform}`; `ModelTransform` = translate /
  rotate / scale, **dönüş sırası `MatrixUtils.RotationOrder.XYZ`** — bizim
  v7.3'te Bedrock için ölçtüğümüz sırayla aynı çıktı
- `CustomMorph` = model + skin + `currentPose` + `currentPoseOnSneak`
- `BodyPart` = bir uzva **başka bir görünüş** takmak
- `EntityUtils.getPose` = uçuyorsa `flying`, binekteyse `riding`, sinsiyse
  `sneaking`, değilse `standing`; özel duruş hepsini ezer

McHorse'un GitHub'ından çekilemedi: bu oturumda GitHub erişimi yalnızca
bizim depoya açık. Zaten gerekmedi — elimizdeki jar 1.12.2'nin 1.20.4
portu, McHorse'un deposunda o hâli yok. **Kullanıcının çalıştırdığı kod
buydu ve okunan da o oldu.**

## Bizim versiyon: `DURUSLAR`

`kol_uret.py` içinde tek tablo. Bir satır = bir duruş:

```python
("bagli_eller", "Bağlı Eller", (150, 122, 74), {
    "durus_sag_kol": {"don": [25, 0, 35]},
    "durus_sol_kol": {"don": [25, 0, -35]},
}),
```

Alan adları kaynağın `ModelTransform`'uyla birebir: `don` (rotate),
`kaydir` (translate), `olcek` (scale). Yeni duruş **bir satır**.

Gelen beş duruş: **Bağlı Eller · Eller Yukarı · Kavuşuk Kollar ·
T Duruşu · Selam**.

## Üç karar, üçü de gerekçeli

### 1. Dönüş animasyona değil GEOMETRİYE pişiriliyor

İlk aklıma gelen her duruş için bir `.animation.json` yazmaktı.
**Yapılmadı.** Bedrock animasyonlarındaki dönüş işareti/sırası ayrı bir
sözleşme ve burada **ölçemiyorum** — yanlış işaret kolları ters çevirir ve
bunu ancak tablette görürdük. Geometrideki sözleşme ise v7.3'te ölçüldü
(pozitif açı, XYZ). Yeni mekanizma icat etmek yerine ölçülmüş olan
kullanıldı.

### 2. Kol kemikleri yeniden adlandırılıyor, gövde adlandırılmıyor

Vanilla animasyonlar kemikleri **adına göre** sürüyor. Kollar `rightArm`/
`leftArm` kalsaydı vanilla salınım duruşun üstüne biner, poz durmazdı.
`durus_sag_kol`/`durus_sol_kol` adlarını hiçbir vanilla animasyon tanımaz.

Buna karşılık `head`, `body`, `rightLeg`, `leftLeg` **vanilla adlarını
koruyor** — yürüyüş ve kafa çevirme bedava gelmeye devam ediyor. Kaynakta
bunun karşılığı morph'un vanilla modeli tamamen değiştirmesi; bizde yarısı
vanilla kalıyor ve bu bir kayıp değil, kazanç.

### 3. Doku yok — oyuncunun kendi derisi

Render denetleyicisi `Texture.default` diyor. Kendi dokumuzu yazsaydık
herkes aynı görünürdü; duruşun bütün anlamı **kendi skininle** poz vermek.
Skin değişince duruş da değişir.

## Tetik: elde eşya (başka yolu yok)

Bedrock'ta script istemci tarafına (molang'a) bir şey yazamaz — yani
"menüden poz seç" **doğrudan mümkün değil**. İstemcinin görebildiği tek
oyuncuya özel işaret elde tutulan eşya, ve depodaki bütün görünüşler
(O Şey, Ben 10, Max Steel çekirdekleri) zaten bu tetikle çalışıyor.

Her duruşun kendi taşı var, **yan ele de giriyor** — bağlı eller
duruşundayken ana elde kılıç durmasın diye.

`variable.donusuk`'e dahil edildiler: duruş açıkken vanilla beden
kapanıyor, yoksa iki gövde üst üste çizilirdi.

### `riding` neden yok

Kaynağın önceliğinde var ama bu depoda binmeyi soran **kanıtlanmış** bir
molang sorgusu yok. Taban dosyada geçen sorgular ölçüldü: `is_gliding` ve
`is_swimming` **var**, `is_riding` **yok**. Var olduğunu varsayıp yazsaydım
ve yanlış olsaydı ifade derlenmez, oyuncunun çizimi komple bozulurdu.
Kanıtsız bir sorgu için alınacak risk değil — testte her sorgunun kanıtı
yazılı, kanıtsız sorgu eklenirse test düşer.

## Denetim — duruşlar ELLERİN YERİYLE ölçülüyor

"Dosya var" demek duruşun doğru olduğunu söylemez. `durus.mjs` her duruşun
el uçlarını kemik zinciriyle hesaplıyor ve **duruşun ne olduğunu** iddia
ediyor:

```
bagli_eller    sag(-0.6,14.0,-4.2) sol(0.6,14.0,-4.2)   bilekler bitişik, gövdenin önünde
eller_yukari   sag(-7.5,31.7, 0.0) sol(7.5,31.7, 0.0)   iki el de kafanın üstünde
kavusuk        sag( 4.4,19.0,-5.7) sol(-2.3,19.4,-6.2)  kollar çapraz
t_durusu       sag(-15.0,23.0,0.0) sol(15.0,23.0,0.0)   omuz hizasında yatay
selam          sag(-9.1,31.2, 0.0) sol(6.0,12.0, 0.0)   sağ yukarı, sol yanda
```

Duruş tablosu **testte elle yazılmadı**, `kol_uret.py`'den okunuyor: yeni
duruş eklenip ölçütü yazılmazsa test bunu söylüyor.

**Kasten bozuldu, üçü de yakalandı:**

| bozma | sonuç |
|---|---|
| kol kemiğini `rightArm`'a geri döndür | ✗ vanilla kol adları YOK |
| `bagli_eller`'in Z dönüşünü tersle | ✗ bilekler bitişik (aralık 22) |
| denetleyiciye kendi dokumuzu koy | ✗ dokusu Texture.default |

İlk denemede test **çöktü** (kemik yok → `undefined.cubes`) ve 4–6.
bölümler hiç çalışmadı — yani o güvenceler bir daha sınanmadı. Sessiz yeşil
kadar tehlikeli. `el()` artık `null` dönüyor, hata temiz düşüyor.

## Bilinen sınırlar (gizlenmiyor)

- Kopya `geometry.humanoid.custom` (geniş/Steve kolları). İnce (Alex) skin
  kullanan biri duruş açıkken kollarını 1 piksel kalın görür.
  `Simsek_Skin/skins.json` zaten `humanoid.custom` diyor.
- Dış katmanlar (`hat`, `jacket`, pantolon) her zaman çiziliyor; vanilla'nın
  `variable.helmet_layer_visible` gibi ayarları uygulanmıyor.
- Duruş taşı elde göründüğü için eşyanın kendisi de çiziliyor.
- Duruşlar arası **geçiş yok** — kaynaktaki `PoseAnimation` alınmadı.

## Alınmayan (istenince devam)

`BodyPart` — bir uzva başka bir görünüş takmak, yani kullanıcının
"bir kol mu ekleyeceğim" dediği şey. Mekanizma **kanıtlı**: Kanlı Kol
tam olarak bunu yapıyor (kendi geometrisi oyuncunun `rightArm`/`leftArm`
kemiklerine adıyla bağlanıyor). Eksik olan tek şey tablo.

# v7.3 — Kanlı Kol'un gerçek modeli (chris1545)

## Sorun

Kullanıcı gerçek Kanlı Kol'un ekran görüntüsünü gönderdi: **parlak kırmızı,
boğumlu zincir kollar, uçlarında dişli pençe.** v6.7'de taktığımız model o
değildi — Bobby1545 Mod V3'ün `blood_arm`ı, düz kırmızı kolların ucunda
turuncu yumruk.

Aranan model **depoda zaten vardı**: `kns_kolluk_chris_kanli` (Code-Man
paketi, `chris1545s_red_bloody_arms`), v6.2'den beri. Ama yalnızca göğüs
yuvasına takılan bir **süs eşyası** olarak duruyordu — yetenekler Kanlı
Kol'daydı, görünüm orada.

## "2 kol birbirine geçmiş gibi" — model değil, çizicim yanlıştı

Kullanıcı modellemenin bozuk göründüğünü söyledi. **Ölçtüm.** Kemik
dönüşleri uygulandıktan sonra kolların x aralığı, dört Euler düzeninde:

```
XYZ işaret −1  sağ −3,6..7,5   sol −7,5..3,6   ORTAK 7,2 birim
XYZ işaret +1  sağ −13,1..−1,9 sol  1,9..13,1  ORTAK 0
ZYX işaret −1  sağ −12,9..−2,9 sol  2,9..12,9  ORTAK 0
ZYX işaret +1  sağ −2,9..7,4   sol −7,4..2,9   ORTAK 5,7
```

Bedrock açıları **pozitif** işaretle, **XYZ** sırasında uyguluyor. Benim
çizicim (`ciz_kemik.py`) negatif uyguluyordu — kolları birbirinin içine
sokan şey oydu. **Model bozuk değildi, düzeltilmedi.** Çizici düzeltildi ve
ölçüm docstring'ine yazıldı. Mutant Halim de düzeltilmiş çiziciyle yeniden
çizdirildi (yanlış bir model göndermediğimden emin olmak için) — sorun yok.

## Tek gerçek değişiklik: `waist`/`body` atıldı

Kaynağın hiyerarşisi:

```
waist → body → rightArm → bone  (33 küp)
              → leftArm  → bone3 (33 küp)
```

Kaynak bunu **zırh** olarak takıyor, biz **elde tutulan** eşya olarak
takıyoruz. Bedrock attachable kemiklerini **adına göre** oyuncu iskeletine
eşliyor ve `body` de bir oyuncu kemiği: kol kemikleri onun altında kalırsa
gövde dönüşü bir kez `body`den bir kez kolun kendisinden gelir — **iki kat.**

Bu yüzden `waist`/`body` atılıp `rightArm`/`leftArm` **kök kemik** yapıldı;
v6.7'de bağlandığı kanıtlanmış düzen bu. Pivotlar Bedrock'ta **mutlak**
olduğu ve atılan kemiklerde dönüş **olmadığı** için duruş hiç değişmiyor.

Üretici, atılacak kemikte küp ya da dönüş bulursa **işi iptal ediyor**:
sessizce geometri kaybetmektense Kanlı Kol hiç üretilmesin, temizlik adımı
eksiği zaten bağırır.

## Doku ve ikon da kaynağın

66 küpün uv'si kaynağın dokusunu bekliyor. Bobby'nin 64×64 `blood_arm.png`i
bırakılsaydı pençelerin dişleri dokunun boş köşesinden örneklenir, kollar
düz renk çıkardı.

- doku: `kns_kolluk_chris_kanli.png` — **256×256, uv uzayı 32×32.** Kaynak
  sekiz kat çözünürlükte çizmiş; ikisi de kaynaktan olduğu gibi geliyor,
  `texture_width` 64 yazılsaydı bütün uv'ler yarıya kayardı.
- ikon: `konsey_ikon/kns_kolluk_chris_kanli.png` — iki dişli kırmızı kol.
  Bobby'nin ikonu iki düz kırmızı çubuktu, artık modeli anlatmıyordu.

Yetenekler, menü, ayarlar **hiç değişmedi**: altı yetenek (`kanli_ors`,
`kanli_simsek`, `meteor`, `guclu_tnt`, `yon_simsegi`, `toprak_ucus`) aynı
duruyor. Değişen yalnızca kolun neye benzediği.

## Denetim

`kanli.mjs` kaynağa göre yeniden yazıldı ve **ölçüye** bağlandı:

- sağ kolun tamamı x<0'da, sol kolun tamamı x>0'da, aralarında 3,8 birim
  boşluk — kullanıcının şikâyet ettiği şey artık bir iddia
- `waist`/`body` gerçekten boştu (küp yok, dönüş yok) — atmak güvenliydi
- kalan kemikler kaynaktan bit bit aynı, 66 küp
- uv uzayı kaynağın uzayı
- doku ve ikon kaynak dosyalarıyla **bayt bayt** aynı

**Kasten bozuldu:** paketteki dönüşler terslendiğinde üç ölçüm de düştü
(`boşluk −15,3`). Test çalışıyor.

Bobby'nin `kaynak_doku/kanli/` ve `kaynak_geo/kanli/` arşivi **silinmedi** —
o modda hâlâ alınmamış kollar var (`long_dirt_arm`, `ice_arm`, `fallen_arm`,
`glowing_arm`), kaynak duruyor.

# v7.2 — Mutant Halim ve Zaman Saati

## Mutant Halim

Kullanıcı: *"that thing Halim vardı ya, bir de mutant Halim olsun ekstra
olarak"* ve nasıl yapıldığına dair üç örnek gönderdi — Chameleon modunun
Metamorph kalıpları: **Mutant Boralo, Mutant Catalina, Mutant Great Master**.

Chameleon ve "en__nemlisi" (aslında **Blockbuster**) Java modları, doğrudan
kullanılamaz. Ama arşivdeki modeller **Bedrock biçiminde** (`.geo.json` +
`.animation.json`) — okunabildiler.

### Örnekler ölçüldü

Üçünün iskeleti aynı, gövdeleri farklı:
`Anchor → Body2 → Torso → BodyUpper → kollar`. Poz verisinde ortak olan:
`Anchor` %70 ölçek, `RightArm/LeftArm Y:46`, yumruk kemikleri 7 küp.

### Önce yanlış yaptım

Yaratığı **kambur** kurdum — kafayı omuzların arasına gömüp gövdeyi öne
eğdim. Kullanıcı Mutant Boralo'nun ekran görüntüsünü gönderdi: yaratık **dik
duruyor**, kafa gövdenin tepesinde normal yerinde, ve asıl özellik
**kolların uzunluğu** — omuzdan başlayıp dizin altına iniyor, ucunda koca
koyu yumruklar.

Kaynağın poz verisi bunu zaten söylüyordu ama yanlış okumuşum: `Torso`
dönüşü gövdeyi eğmiyor, **kolları öne açıyor**.

Yeniden kuruldu (birim, 16 = 1 blok):

```
bacak  0..22   iki parçalı, kalın
kalça 22..30   14 geniş
göğüs 30..44   18 geniş
kafa  44..54   TEPEDE
kollar 42..10  otuz iki birim — dizin altına iner
yumruk  2..10  koca
```

3,38 blok. O Şey 2,75. Altı kol duruyor — Halim'in kimliği o.

### Neden kaynak modeller doğrudan alınmadı

Üçü de **başka karakterler** (Boralo, Catalina, Great Master) ve kendi
dokularını taşıyor. Halim bizim. **Oranlar ve duruş** örneklerden,
**kimlik** (altı kol, palet) O Şey'den geliyor.

### Neden kemik adları kaynaktaki gibi değil

Kaynak `Anchor/Torso/BodyUpper` kullanıyor; bizim yürüyüş animasyonumuz
(`animation.o_sey.yuru`) vanilla adları oynatıyor. Kaynağın adlarını
alsaydık model yürüyüşün hiçbir kemiğini tanımaz ve **hareketsiz** dururdu —
hiçbir hata da görünmezdi.

### Doku türetildi, uydurulmadı

Mutantı önce doğrudan `o_sey.png` ile çizdirdim: **siyah bir kütle** çıktı.
O doku %95,6 siyaha yakın (v6.6'da ölçülmüştü) — ince bir gövdede sorun
değil ama mutantın gövdesi üç kat geniş. Doku O Şey'inkinden türetiliyor:
zemin hafifçe açılıyor, turkuaz vurgu parlatılıyor, deterministik bir
desende damarlar işleniyor. **Palet değişmiyor** — yeni renk uydurulmadı.

Bir de temizlik adımı dokuyu her üretimde siliyordu (`beklenen` listesinde
yoktu) — v6.2'deki ders, ters yönden.

---

## Zaman Saati

Kaynak: **"Zaman Saati İfşa" (f.a. eymoxa)**. Elimize geçen komut
listelerinin aksine bu **gerçek script** taşıyor. Beş mod, eğilerek açılan
menüden seçiliyor:

| mod | ne yapıyor |
|---|---|
| ⏳ Zamanı Durdur | herkesin hareketi kilitlenir, moblar donar |
| 🔓 Zamanı Aç | çözer |
| ⏮ Zamanı Geri Al | `time add -500` — sadece dünya vakti |
| 🔮 Telekinez | hedefi yakala, 4 blok önde tut, tekrar bas 15 blok fırlat |
| ⌚ Oyuncuyu Saate Al | hedefi y=-500'e hapset, tekrar bas geri getir |

### Kaynaktaki kalıcı kilitlenme

Saate alınan oyuncunun eski konumu **yalnız bellekteki bir Map'te**
tutuluyor. Dünya kapanıp açılınca o Map boşalıyor: kurban yerin 500 blok
altında, körlükle, hareketi kapalı ve **geri dönüş bilgisi yok.** Kurtuluş
yok.

Bizde kayıt **dünya özelliğinde** ve üstüne **60 saniye sınırı** var: saati
tutan çıkıp gitse bile kurban geri geliyor.

İkinci sorun: kaynağın defteri oyuncu başına değil **genel** —
`saatteOlanlar.size > 0` deyip sıralı ilkini bırakıyor, yani iki kişi
saatteyse hangisini bırakacağını seçemiyorsun. Bizde defter saati **tutana**
bağlı.

### Testin bulduğu kendi hatam

İlk yazdığımda `cikar()` kaydı **önce siliyor, sonra kurbanı arıyordu**.
Test gösterdi: dünya yeniden yüklendikten sonra kurban bulunamayınca kayıt
gidiyor ve kurban y=-500'de kalıyor — **kaynağın kilitlenmesini başka bir
yoldan geri getirmişim.** Artık bulunamazsa kayıt duruyor ve sonraki
taramada tekrar deneniyor.

### Alınmayan satır

```
hedefEntity.runCommand("effect @s clear")
```

Kurbanı bırakırken **bütün** efektlerini siliyor — içtiği iksir dahil. Bu
kalıbı dördüncü kez reddediyoruz (ucurma.js, Kanlı Kol, Code-Man listesi,
şimdi burası). Yalnız bizim verdiklerimiz kaldırılıyor.

Bir de kaynak telekinez hedefini her iki tick'te `dimension.getEntities()`
ile arıyor — **süzgeçsiz**, yani boyuttaki her varlık saniyede on kez
taranıyor. Bizde hedef doğrudan kimlikle tutuluyor.

## Kasten kırıp doğrulandı

| kırılan | düşen test |
|---|---|
| süre sınırı kaldırıldı (kaynaktaki gibi) | "süre dolunca kurban kendiliğinden geri geldi" + 2 |
| kayıt dünyaya yazılmıyor | "eski konum DÜNYA ÖZELLİĞİNDE" + 2 |
| kafa gövdeye gömüldü (kambur) | "kafa gövdenin TEPESİNDE" + 1 |
| mutant O Şey'den zayıf | "canı O Şey'den fazla" |

## Bu yüklemelerde olmayan şey

Kullanıcı chris1545'in özelleştirilmiş Kanlı Kol'undan söz etti — **bu üç
dosyada yok.** Bizde v6.2'den beri `kns_kolluk_chris_kanli` var ama o bir
kolluk görünümü, çalışan bir kol değil.

---

# v7.1 — Void takımı

Kullanıcı dosyayı **tekrar gönderdi**: *"canlı olarak bakmanı istedim ki
referanstan bakarak birazcık riskli oluyor."* Doğru karardı — aşağıdaki üç şey
ancak dosyaların kendisinde görülüyor. (Yükleme md5'i öncekiyle birebir aynı
çıktı, yani not defterim doğruymuş; ama mekanikleri hiç açmamıştım.)

## On eşya

| eşya | hasar | dayanıklılık | mekanik (kaynaktan) |
|---|---|---|---|
| Void Kılıcı | **255** | 600 | — |
| Void Baltası | 5 | 600 | 35 blok kazar |
| Void Kazması | 5 | 600 | 8 blok kazar |
| Void Küreği | 4 | 600 | 11 blok kazar |
| Void Çoklu Alet | 5 | 600 | **vurduğunu Void'e çevirir** |
| Ender Kılıcı | 1 | 600 | **vurduğunu fırlatır** |
| Evren Kılıcı | 15 | 600 | sağ tık: kendini uçur |
| Trb1545 Kılıcı | 12 | 600 | sağ tık: 5 yıldırım |
| Void Miğferi | — | 200 | kafa, koruma 7 |
| Enigma | — | 200 | kafa, koruma 7 |

Sekizinin **3B modeli yok**, sadece 16×16 ikonu — kaynakta da öyle, bir kılıç
zaten düz bir eşya olarak görünür. `KONSEY_DUZ` kümesi bunu yazıyor; olmasa
üreteç her üretimde "geometri yok" diye uyarır ve `konsey.mjs` "model eksik"
derdi — oysa eksik bir şey yok.

## Canlı okumanın ortaya çıkardığı üç şey

### 1. Void Çoklu Alet kaynakta eşya siliyor

`Void.mcfunction` **tek satır**:

```
replaceitem entity @a slot.armor.head 1 sp:voidol 1 0
  {"item_lock":{"mode":"lock_in_slot"}}
```

Üç ayrı sorun:
- **`@a`** — vurduğun kişi değil, **dünyadaki herkes**.
- **`replaceitem`** kafadaki miğferi **yok ediyor**. Netherite miğferin varsa gidiyor.
- **`lock_in_slot`** — çıkaramıyorsun. Tek çıkış `clear @a sp:voidol`, o da yine herkesi kurtarıyor.

Bizimki: yalnız **vurduğuna** bulaşıyor, eski miğferi deftere yazılıyor,
30 saniye sonra **aynen geri takılıyor**. Düşmüş virüsünde kurulan kalıbın
aynısı. Çıkarmaya çalışırsan geri giydiriliyor — `lock_in_slot`'un karşılığı,
ama **süreli**.

### 2. Ender Kılıcı 400 blok yukarı ışınlıyor

```
execute positioned ^^^2 run tp @e[r=10,c=1] ~~400~
```

400 blok düşüş kesin ölüm, üstelik `@e` **atıcıyı ve evcil hayvanını da**
kapsıyor. Bizde 24 blok, yumuşak düşüş, ve yalnız vurulan fırlıyor —
fırlatma bir **saldırı**, infaz değil.

### 3. Void Kılıcı 255 hasar — bu kaldı

Kaynakta gerçekten 255 (Bedrock'un tavanı). Netherite kılıç 8, bu depodaki en
güçlü eşya 62. **Değiştirmedim.** Düşmüş'ün 1000 korumasını düşürmüştük çünkü
o *kalıcı bir durumdu* (giyen dokunulmaz oluyordu); bu ise elde tutulan bir
kılıç — kullanan onu bilerek seçiyor. Beğenmezsen tablodan tek satır.

## Testte bulunan kendi boşluğum

Vuruş kancasını kasten kırdığımda (bulaştırma satırını kapattım) **test yine
geçti** — yalnızca `olayaAbone("entityHurt"` var mı diye bakıyordu. Abone hâlâ
oradaydı, yaptığı iş yoktu. Artık sahte dünyada **gerçek bir vuruş**
tetikleniyor ve üç şey ölçülüyor: Void bulaşıyor mu, Ender fırlatıyor mu,
başka bir silahla hiçbir şey olmuyor mu.

Aynı sınıftan bir boşluk v6.9'da da çıkmıştı. Statik `includes()` kontrolü
"kod yazılmış mı"yı ölçüyor, "kod çalışıyor mu"yu değil.

## Kasten kırıp doğrulandı

| kırılan | düşen test |
|---|---|
| eski miğfer deftere yazılmıyor | "NETHERITE MİĞFER geri geldi" |
| Void miğferi eskisi diye yazılıyor | "Void takana bulaşınca geri TAKILMIYOR" |
| atıcı da fırlatılıyor | "KENDİNİ fırlatmıyor" |
| fırlatma 24 → 400 blok | "kaynağın 400 bloğundan çok daha alçak" |
| vuruş kancası bulaştırmıyor | "Void Çoklu Alet ile VURUNCA bulaşıyor" + 1 |

---

# v7.0 — Kurban Zırhı

Kullanıcı: *"hepsinden, ilk öncelikle kurban zırhından başla."*
Kaynak: **Falen Mod V2 (Trb1545)**.

## Dört parça, bütün sayılar ölçüldü

| parça | yuva | koruma | dayanıklılık | itme direnci |
|---|---|---|---|---|
| Kurban Kask | head | 7 | 200 | 0.75 |
| Kurban Zırh | chest | 7 | 200 | 0.75 |
| Kurban Pantolon | legs | 7 | 200 | 0.75 |
| Kurbanlar Botu | feet | 7 | 200 | 0.75 |

Toplam **28 koruma** — netherite takımının (3+6+8+3 = 20) üstünde. Ama
dayanıklılığı 200, yani netherite'in (407-555) yarısından az. Kaynağın
dengesi bu: **sert ama çabuk kırılıyor.** Değiştirmedim.

## Üçüncü kaynak paket

`konsey_al.py` iki eklentiye (CodeMan, BoraLo) sabitlenmişti: `kok()` içinde
elle yazılmış iki yol, `onek()` içinde iki önek. Üçüncüsü için **`PAKETLER`
sözlüğüne** çevrildi — joker + önek, paket başına bir satır. Dördüncüsü artık
tek satır.

Bir de eski geometri biçimi desteği eklendi: Falen'in modelleri
`{"geometry.X": {...}}` (1.10.0) ve ölçüler `texturewidth` diye yazılı.
Kabuk çevriliyor, **kemiklere dokunulmuyor** — zırh kemikleri
(`head`/`body`/`rightArm`…) oyuncu iskeletiyle **adıyla** eşleşiyor,
değiştirilirse parça vücuda hiç oturmaz ve hiçbir hata görünmez (v3.3'te
kollarda tam bu olmuştu).

## "kns_" öneki neden Falen parçalarında da var

Önek başta "Konsey" demekti ama artık üç ayrı modun giyilebilir parçalarının
ortak ad alanı: kostümler, deriler, kolluklar, maskeler ve zırhlar hepsi
orada. Ayrı bir önek açmak temizlik adımında ikinci bir izin listesi,
`temizlik.mjs`'te ikinci bir sayaç ve `kol_uret.py`'de ikinci bir tablo
demekti — üçü de aynı şeyi yapan iki kopya.

## İtme direnci ayrı bir sözlükte

`KONSEY` tablosuna sekizinci alan eklemek **58 satırın hepsini** değiştirmek
demekti; itme direnci yalnız Kurban zırhında var, `KONSEY_ITME` sözlüğünde
duruyor. Test hem dördünde **olduğunu** hem de diğer 54'te **olmadığını**
ölçüyor.

## Kaynakta ölçülen tuhaflık

Üç parça (zırh/pantolon/bot) **aynı dokuyu paylaşıyor** — md5'leri aynı.
Yalnız kaskın kendi dokusu var. Bu bir hata değil, kaynağın kendi düzeni;
test kayıt altına aldı ki ileride "doku yanlış kopyalanmış" diye yanlış teşhis
konmasın.

## Testte bulunan gerçek boşluk

Korumayı 7'den 9'a çıkararak kasten kırdığımda **hiçbir test düşmedi.**
`konsey.mjs` korumayı yalnızca *Düşmüş muafiyeti* için okuyordu; normal
parçalarda hiç karşılaştırmıyordu — **54 parça boyunca açık duran bir
boşluk.** Artık her parçanın koruması kaynakla birebir karşılaştırılıyor
(kaynak onu `minecraft:wearable.protection` ya da `minecraft:armor.protection`
altında tutabiliyor, ikisine de bakılıyor).

## Kasten kırıp doğrulandı

| kırılan | düşen test |
|---|---|
| pantolonun itme direnci silindi | "kurban_pantolon: itme direnci 0.75" |
| bot `feet` yerine `legs` yuvasına | "yuva birebir" + 3 tane |
| koruma 7 → 9 | "koruma birebir" + 1 (bu satır bu sürümde eklendi) |

---

# v6.9 — Code-Man listesi

İkinci komut listesi (Code-Man). Yine çoğu vardı; **üçü** yeniydi.

## Zaten vardı

| komut | bizdeki |
|---|---|
| `effect @p levitation 1 2 true` | `ucus` |
| `playanimation ... holding_spyglass` | `ANIM_KALDIR` |
| `damage @e[r=10,c=1] 2` (^^^10) | v6.8'de gelen ışın motoru |
| `effect @e slowness 255 255` (doldurma) | `dondur`, `buz_isini` |
| `camera @p fade ... color` | `parlat()` (iksir parlaması) |

## Yeni olan üçü

### Siyah Güç — Code-Man kostümüne bağlı

Listede **iki ayrı isim altında ama aynı şey**:

```
"Siyah Güç Saldırısı"    particle evoker_spell ^^^20
"Ahtapot Kol Saldırısı"  particle evoker_spell ^^^5 / ^^^10 / ^^^15 / ^^^20
```

İkisinin de hasarı `damage @e[r=10,c=1] 2`, menzili 20. Tek yetenek yazıldı —
ikisini ayrı ayrı yazmak aynı şeyin iki kopyası olurdu.

Kaynak parçacığı **dört noktaya** koyuyor; bizim motor menzil boyunca sürekli
çiziyor, ışın kesik kesik değil.

**Kapı: Code-Man kostümü** (kafada). Kaynak kapıyı kaldıraca bağlıyordu; o
kostüm bizde v6.2'den beri var (`pa:kns_codeman`).

Listedeki *"tahta düğme alınca ekran siyah olsun"* satırı
(`camera @p fade time 0.1 0.1 0.1 color 0 0 0`) ayrı bir düğmeye değil
**Siyah Güç'e** bağlandı — karanlık saldırının kendi flaşı olsun.

### Şimşek Kılıcı — vanilla demir kılıç

Kullanıcı: *"sadece bu Demir kılıçla çalışır diğerleri şalterle!"*

```
execute at @a[hasitem={item=iron_sword,...}] run
  execute at @p run summon lightning_bolt ^^^10        (8 kere tekrarla)
```

Tablodaki **tek hasarsız satır** — işi yıldırımlar yapıyor, kaynakta da öyle.
Kapı alanının adı bu yüzden `kol` değil **`elde`** oldu: burada vanilla bir
eşya duruyor, "kol" adı tabloya bakan birini yanıltırdı.

Kaynak sekizini de **aynı noktaya** döküyor; tek noktaya düşen sekiz yıldırım
bir yıldırımdan farksız görünür, küçük bir yayılma verildi.

### Uçuş aurası

```
particle minecraft:raid_omen_ambient ~~1~
particle minecraft:raid_omen_ambient ~~2~
```

Kaynak bunu her tick çalıştırıyordu. `raid_omen_ambient` zaten **sürekli bir
yayıcı** (ambient) — tek doğurmak yetiyor, her tick parçacık doğurmanın
tablette bedeli var.

## Alınmayanlar

**`gamemode creative @p`** ("Hile Moduna Geçme") — geçen sürümde
`/gamemode spectator` için verilen kararın aynısı. Sessizce oyun modunu
değiştiriyor.

**`effect @p clear`** — üçüncü kez geldi, üçüncü kez alınmadı. Kaynak kendi
ışını kendine değdiği için koymuş; bizde atıcı zaten hariç ve o satır
oyuncunun içtiği iksiri de silerdi.

## Testin yakaladığı gerçek hata

`simsekDusur()` sekiz yıldırımı **tek çağrıda** doğuruyordu ve varlık bütçesi
dördüncüde doluyordu — kaynağın vaat ettiği sekizden **dördü** düşüyordu.
Test yakaladı (`sekiz yildirim dustu :: 4 yildirim`). Işın anlık bir yetenek;
yalnızca yıldırımlı olanı artık iş döndürüp kalanı tick tick tamamlıyor.

## Kasten kırıp doğrulandı

| kırılan | düşen test |
|---|---|
| yıldırım artığı bırakılıyor | "sekiz yıldırım düştü" → 4 |
| kostüm kapısı hep açık | "kostüm YOKKEN atmıyor" |
| karartma rengi 0-255 aralığında | "renk 0.0-1.0 aralığında" + 1 |
| `simsek: 8` → `1` | "sekiz yıldırım" + 2 |
| uçuş aurası çizilmiyor | "uçuş GERÇEKTEN aura çıkarıyor" + 1 |
| kol kapısı hep açık | "BAŞKA kol elindeyken atmıyor" |
| `dusmanMi` süzgeci | "hedef süzgecinden dusmanMi geçiyor" |

**İki kırma önce yakalanmıyordu** ve ikisi de testin kendi boşluğuydu:
Siyah Güç'ü hiç *çalıştıran* bölüm yoktu (tablodaki alana bakmak, kodun ona
baktığını ölçmüyor), ve uçuş aurası `includes("UCUS_PARCACIK")` ile statik
kontrol ediliyordu — sabit hâlâ import edildiği için aurayı kapattığımda test
yine geçiyordu. İkisi de artık **çalıştırılarak** ölçülüyor.

Bir de kendi ölçüm hatam: aurayı kafa hizasıyla karşılaştırmıştım; `~` varlığın
konumu, yani **ayak** hizası (sahte dünyada `location = kafa - 1.62`).

---

# v6.8 — Komut listesinden üç ışın

Kullanıcı bir komut listesi gönderdi (Ice-Man / Üst Konsey / Kırmızı Güç /
efektler) ve *"bunlardan hangilerini ekleyelim ya da hepsini ekleyelim mi"*
diye sordu. Hepsi tek tek depoda arandı.

## Listenin çoğu zaten vardı

| komut | bizdeki |
|---|---|
| `effect @p levitation 1 2` (uçma) | `ucus`, `toprak_ucus` |
| `effect @e[r=10,c=1] levitation 1 2` (uçurma) | `ucurma` |
| `playanimation ... animation.fox.sleep m 250` | `yamult` |
| `effect @e slowness 255 255` (doldurma) | `dondur`, `buz_adam` |
| `playanimation ... holding_spyglass` | `ANIM_KALDIR` |
| `effect @p strength/speed/night_vision/...` | 8 iksir kademesi |

`ucurma.js` ve `yamult.js` zaten **aynı referanstan** gelmiş — o komutlar
dosyaların başlığında yazılı.

## Üç ışın gerçekten yeniydi

| ışın | kaynak | nereye |
|---|---|---|
| **Buz Işını** | `cauldron_explosion_emitter` ×9 + `damage 3` + `slowness 255` | **Buz Kol** |
| **Ateş Gücü** | `mobflame_single` ×10 + `damage 2` | **Kajaros** |
| **Kırmızı Güç** | `redstone_ore_dust_particle` ×10 + `damage 2` | **Okazor** |

Kaynakta Ice-Man'in buz saldırısı **dokuz ayrı satırdı** (`^^^2` … `^^^10`,
her mesafe için bir komut) artı bir hasar artı bir yavaşlık satırı. Bizde
`isinlar.js` motoru zaten var — dokuz satır **tek tablo satırına** indi.

Motora iki ekleme yapıldı, çatal açılmadı:
- **Dördüncü kapı türü: `kol`.** ZIRH_ISIN çekirdeğe, MARVEL_ISIN bacaktaki
  güce, BEN10_ISIN eldeki yaratığa bakıyordu; bu **eldeki kola** bakıyor.
  Kaynak kapıyı `hasitem={item=lever}` ile kaldıraca bağlamıştı.
- **`yavaslik` alanı** — kaynağın "doldurma" satırı.

İlkel Beşli ışınları `bakim()` içinde, `t.aura` ile aynı kalıpta. `^^^10`
atıcının *baktığı* yön demek; bot bakmıyor (`getViewDirection` moblarda
güvenilir değil), o yüzden çizgi **hedefe** çekiliyor — görüntü aynı, nişan
daha doğru.

## Kaynaktan almadıklarım

**`effect @p clear`** — kaynak bunu koymuş çünkü kendi ışını kendine de
değiyor (`@e` ayırt etmiyor). Bizim motorda atıcı zaten hariç, ve o satır
oyuncunun içtiği iksiri de silerdi. Aynı tuzağı `ucurma.js`'te bir kez
reddetmişiz (orada `effect @s clear` yazıyordu).

**`slowness 255 255`** — 255 motor sınırında (yasal) ama geri alan hiçbir şey
yok, yani kalıcı felç. Yamultmada aynı sayıyla aynı kararı vermiştik: seviye
korundu, **süre sınırlı**.

**`/gamemode spectator` + `/gamemode survival`** (duvardan geçme) — kullanıcı
"ekleme" dedi. Geri dönüş sabit survival: creative'deysen modunu
kaybediyorsun.

**`strength/jump_boost 255 255`** — kullanıcı "ekleme" dedi. Amplifier 255
her şeyi tek vuruşta öldürür, `jump_boost 255` inişte öldürür. İksirler
bunları ölçülü kademelerle zaten veriyor.

## Kendi hatam: ayarlar.js'i sildim

Sürüm çıkarırken şunu yazdım:

```python
io.open(a, "w").write(io.open(a).read())
```

Python önce `open(a, "w")`'yi değerlendiriyor — dosya **okunmadan önce
sıfırlanıyor**. `ayarlar.js` 6558 satırdan 0'a düştü, 69 test çöktü ve paket
596K'dan 504K'ya indi. Git'ten geri alınıp v6.8 ayarları yeniden uygulandı;
okuma ve yazma artık ayrı iki satır. **Paket boyutu bunu ele veren şeydi** —
testler zaten kırmızıydı ama küçülen paket "dosya kayboldu" diyordu.

## Kasten kırıp doğrulandı

| kırılan | düşen test |
|---|---|
| `yavaslik` etkisi kaldırıldı | "yavaşlık da bindi" + 1 tane |
| kol kapısı hep açık | "BAŞKA kol elindeyken atmıyor" |
| `slowness 255` + sonsuz süre | "yavaşlık SÜRESİ sınırlı" |
| İlkel ışını yazıldı ama atılmıyor | "bot_ilkel.js ışını ATIYOR" |
| `dusmanMi` süzgeci kaldırıldı | "hedef süzgecinden dusmanMi geçiyor" |

Bir kırma **yakalanmadı** ve testin kendisi yanlış çıktı: "başka kol
elindeyken atmıyor" satırı geçiyordu ama sebebi kapı değil, ilk atışın
**bekleme süresi**ydi. Beklemeyi geçirip, ayrıca "doğru kol elindeyken yine
atıyor" satırı eklendi — yoksa o satır "hiç atmıyor" ile de geçerdi.

---

# v6.7 — Kanlı Kol

Kullanıcı iki mod gönderdi (**Falen Mod V2** ve **Bobby1545 Mod V3**) ve
*"özellikle kanlı kolu istiyorum"* dedi. Kanlı Kol Bobby1545'te: `pa_blood_arm_*`,
sekiz eşya.

## Önce yanlış yaptım

Kanlı Kol'u depodaki diğer altı kol gibi bir **kol kaplaması** yaptım —
kırmızı bir kol, üzerinde dikenler. Kaynağın modelini *"tutulan bir prop,
oyuncunun koluyla hareket etmez"* diye eledim.

Kullanıcı **ekran görüntüsü gönderdi**: Kanlı Kol bir kol kaplaması değil,
**iki dev turuncu-kanlı yumruk**, ince kırmızı kolların ucunda.

Modelin kök kemikleri ölçüldü:

```
rightArm  pivot [-5, 22, 0]
leftArm   pivot [ 5, 22, 0]
```

Bunlar oyuncu iskeletindeki kol kemiklerinin **tam pivotları**. Bedrock aynı
adlı kemikleri eşliyor, yani model oyuncunun **iki koluna birden** bağlanıyor
ve kollar normal hareket ediyor. Çocuk kemiklerin adları (`leftArm3`, `head2`,
`bone`…) karmakarışık ama önemsiz — bağlanmayı yalnız kök kemikler yapıyor.

Elle çizdiğim kol atıldı. **Model, doku ve ikon kaynaktan olduğu gibi geliyor**
(sadece 1.10.0 kabuğu 1.12.0'a çevrildi; kemiklere dokunulmadı — test bunu
bayt bayt karşılaştırıyor).

## Kaynakta sekiz eşya, bizde bir kol

Kaynak her yetenek için ayrı bir eşya veriyor ve "Aktif Et"e basınca yedisini
birden envantere dolduruyor. Bizde tek eşya, yetenekler menüden seçiliyor.

| kaynak | bizde |
|---|---|
| Herkese Örs Yağdır | **`kanli_ors`** — yeni |
| Ulti Şimşek | **`kanli_simsek`** — yeni |
| Meteor | `meteor` (zaten vardı) |
| Süper Meteor | `guclu_tnt` (zaten vardı) |
| Baya Yıldırım | `yon_simsegi` (zaten vardı) |
| Kendini Uçur | `toprak_ucus` (zaten vardı) |
| Aktif Et / Kapat | gerek yok — kol tek eşya |

Aynı iki şeyi ikinci kez yazmak, iki ayrı yerde bozulacak tek bir mantık
demekti.

### İki yeni yetenek neden yeni

**Kanlı Örs** — bizdeki `ors` *nişan aldığın tek noktaya* yağıyor; bu
**menzildeki her varlığın** tepesine. Kaynak beş katlı bir örs sütunu
(`fill ~~15~ ~~11~`) döküyor, biz tek örs bırakıyoruz ve sadece **hava olan
yere** koyuyoruz — kimsenin evi delinmiyor.

**Ulti Şimşek** — bizdeki `coklu_simsek` en yakın N taneyi vuruyor ve çok
yakındakini atlıyor; bu **hepsini** vuruyor, dibindekini de. Kaynak
(`execute at @e run summon lightning_bolt`) bütün dünyayı vuruyor ve hepsini
**tek tick'te** doğuruyor; bizde 40 blok menzil var ve yıldırımlar tick'e
yayılıyor.

## Kaynaktan almadığım tek şey

Kaynağın **"Kapat"** eşyası şunu çağırıyor:

```
"run_command": {"command": ["function Envanteri_Sil", "function Blood_Arm_Sil"]}
```

`Envanteri_Sil.mcfunction` tek satır:

```
clear @s
```

**Kolu kapatmak oyuncunun bütün envanterini siliyor.** Bu depoda eşya
kaybettiren hiçbir şey yok — alınmadı, ve `kanli.mjs` 4. bölüm bunun bir daha
yanlışlıkla girmemesi için `clear @` arayan bir denetim tutuyor (yorumları
temizleyerek — ilk halinde kendi gerekçe yazımı "envanter silen kod" diye
raporlamıştı).

## Kol sayısı bekçisi 6'dan 7'ye

Altı ayrı test *"yeni kol açılmadı (6 kol)"* diye tutuyordu — v4.33 ve
v4.46'da dörder kol kaldırıldığı için konmuş bir "kol israfı" bekçisi. Kanlı
Kol kullanıcının açık isteği olduğu için sayı **bilerek** yediye çıktı;
bekçi çalışmaya devam ediyor. `kol2.mjs`'in "her kol aynı geometriyi
kullanır" denetimi de gevşetilmedi — Kanlı Kol'un kendi modeli **adıyla**
istisna yazıldı.

## Kasten kırıp doğrulandı

| kırılan | düşen test |
|---|---|
| kök kemik `rightArm` → `kol_kok` (v3.3 hatası) | "kök kemikler OYUNCU KOLLARI" + 2 tane |
| oyuncu muafiyeti kaldırıldı | "oyuncular vurulmuyor" |
| menzil 40 → 9999 (kaynak gibi) | "MENZİL DIŞINDAKİ vurulmadı" + 3 tane |
| kayıtsız bir yeteneğe bağlandı | "kayıt defterinde" + 1 tane |
| `blokIste` sonucu yok sayıldı | "örs blok bütçesini soruyor" |

## İki modda başka neler var

**Bobby1545 Mod V3** — 88 eşya, 77 attachable, 272 fonksiyon. Kollar:
`dirt_arm` (8), `improved_dirt_arm` (3), **`long_dirt_arm` (9)**,
`ice_arm` (7), `blood_arm` (8), `fallen_arm` (7), `glowing_arm` (2).
Ayrıca `mob_picker`, `dirt_conventer`, `stone_conventer`, `knightrider`,
`stune_gun`, `lightning_stick`, Bobby'nin üç skini (normal/angry/hasta).

**Falen Mod V2** — 29 eşya. `void_sword/axe/pickaxe/shovel/multitool`,
`ender_sword`, `univers_sword`, `enigma`, `bloodskyavi`, **kurban zırhı**
(kask/zırh/pantolon/bot), `falen_isiligi`, `dirt_fallen`.

Not: `pa_blood_arm_*`'ın **sekiz modeli de birbirinin aynı** (normalize edilip
karşılaştırıldı), sekiz animasyonu da aynı, iki dokusu arasında **tek piksel**
fark var. Yani kaynak sekiz kez kopyalamış; bizde bir model, bir doku.

---

# v6.6 — Tabela, sis ve müzik

Üç iş: efsane yazısı yerden **dikili tabelaya**, `/fog` komutu **skinin
rengine**, ve üç durağı da görene **bir dakikalık müzik**.

---

## 1. "O kadar yazıyı neden yere yazdın?"

Kullanıcı haklıydı. Yazıt alanı **ölçüldü: 116 blok geniş, 41 blok yüksek.**
Yere serilince 4756 bloklu bir *halı* oluyordu ve yerden bakan hiçbir şey
göremiyordu — ancak uçarak okunuyordu.

Aynı harfler artık **dikey**: XZ düzleminden XY düzlemine geçti. Aynı şifre,
aynı blok sayısı, sadece düzlem değişti.

| | v6.5 | v6.6 |
|---|---|---|
| yazıt | yerde, 116×41 halı | **dikili panel**, 120×43 |
| Bacon bandı | yerde ayrı şerit | panelin **en alt iç sırası** |
| çerçeve | yok | 1 blok cilalı karataş tuğla |
| ayak | yok | **4 direk** |
| okunma | ancak uçarak | yürürken |

### Çizdirmeden görülmeyen iki hata

**Piramidi tamamen kapatıyordu.** İlk hâlinde tabela piramidin *önündeydi*
(+z) ve 120×50'lik levha 11 bloklu piramidi bütünüyle gizliyordu. Çizdirince
görüldü. Tabela **kuzeye** (-z) alındı: piramit önde, tabela arkasında bir fon.

**Yazı aynalanacaktı.** Bedrock'ta kuzey -z'dir ve **kuzeye bakanın sağı
doğudur** (+x). Yani harfler soldan sağa ancak kuzeye bakan bir okuyucuda
doğru dizilir. Tabela güneye konsaydı bütün yazı ters okunurdu ve şifre
çözülemezdi.

**Bacon bandını piramit kapatıyordu.** Panel alçak kalınca piramidin tepesi
(y+5) bandın (y+4) tam önüne geliyor ve **bandın orta 11 bloğunu**
gizliyordu — yani şifre çözülemez hale geliyordu. Ayak yüksekliği artık
ayardan değil **piramitten** hesaplanıyor (`max(ayar, yarı + 2)`); böylece
`EFSANE_TABAN` büyütülürse hata sessizce geri gelmiyor.

### Test tabelayı geri okuyor

"Blok sayısı doğru" testi bu üç hatanın **üçünü de** geçerdi. Onun yerine
altın bloklar SGA tablosuyla harfe geri çevriliyor:

```
TABELADAN GERİ OKUNAN: ["MOJANG BU","TOHUMU SILDI","KAYIT YOK","ANAHTAR BACON"]
```

Baş aşağı çevirince `["???V??R ?????", ...]`, aynalayınca `["    ?? ??????", ...]`
çıkıyor — ikisi de testte düşüyor.

---

## 2. Sis: mavi değil **turkuaz**

Kullanıcı: *"benim skinimin rengine çevirelim — mavi mi bilmiyorum ama."*

**Ölçüldü, tahmin edilmedi.** `Simsek_Skin/uzak_akraba.png`, 64×64,
1632 dolu piksel:

| renk | piksel | oran | ton |
|---|---|---|---|
| #0A0A0D / #060608 / #16181B | 1558 | **%95,6** | siyaha yakın |
| #145E53 | 30 | %1,8 | 171° koyu turkuaz |
| **#20C5B5** | 26 | %1,6 | **174° ana vurgu** |
| #4AEDD9 | 14 | %0,9 | 173° açık turkuaz |
| #8CD2FF | 4 | %0,2 | 203° açık mavi |

Yani **mavi değil turkuaz.** Skinin %95'i siyah ama siyah bir sisi kimse
göremez, o yüzden sis vurgu tonu oldu.

İki yoğunluk: `pa:sis_simsek` (fog_hell gibi boğucu, 2→30 blok) ve
`pa:sis_simsek_hafif` (8→90 blok).

### Testim önce yanlış ölçtü

İlk hâli "en çok kullanılan doygun renk" diyordu ve **#145E53'ü** (30 piksel)
seçip #20C5B5'i (26 piksel) eliyordu. İkisi de skinde var; ilki **gölge**
tonu, ikincisi **taban** ton. Piksel sanatında gölge her zaman tabandan biraz
daha çok kullanılır — yani o ölçü sistematik olarak gölgeyi seçer ve sis
çamurlu çıkar. Test artık doğru soruyu soruyor: rengin skinde **gerçekten var
olduğunu** ve vurgu **ailesinden** olduğunu ölçüyor.

### Ayarlar yalan söylüyordu

İlk hâlinde yalnızca `fogs/*.json` yazılıyordu ve komutu elle yazmak
gerekiyordu. **Öksüz ayar denetimi yakaladı:** `SIS_KIMLIK`,
`SIS_KIMLIK_HAFIF`, `SIS_ETIKET` tanımlıydı ama hiçbir yerde okunmuyordu.
Üstelik tablette komut yazmak zaten eziyet. Sis artık kol menüsünde üç satır:
**aç / hafif / kapat**.

Komutları yine de yazmak istersen:

```
/fog @a push pa:sis_simsek "12"
/fog @a push pa:sis_simsek_hafif "12"
/fog @a remove "12"
```

---

## 3. Üç durağı da görene müzik

Kaynak 7:34'lük parça. **Kesit elle seçilmedi:** parça saniye saniye ölçüldü.

```
4:10  ▁▁▁      sessizleşme (breakdown)
4:14  ████████ parçanın EN YÜKSEK enerjili dakikası başlıyor
5:10  ────     kesim
```

Alınan kısım **4:10 – 5:10**: sessizlikten başlayıp patlıyor — "üçünü de
buldun" anına uyan tek yer orası. Başta 0.4 sn açılma, sonda 2.5 sn kapanma
var ki kesim duyulmasın. 60.000 sn, stereo 44.1 kHz, 1,1 MB Vorbis,
`category: "music"` (oyunun kendi müziğini susturuyor).

Üç durak bir **bit maskesinde** tutuluyor; hepsi dolunca ekrana
`§b§lEFSANE TAMAMLANDI` düşüyor ve müzik çalıyor. Sonra maske yerine **-1**
yazılıyor: maskeyi `TAMAM` olarak bırakmak, dünyaya **her girişte** müziğin
baştan çalması demekti.

Tarama tek blok bile okumuyor — durak koordinatları zincirden zaten
hesaplanabiliyor. Düşmüş'te `getBlock` üç testi birden düşürmüştü.

---

## Kasten kırıp doğrulandı

| kırılan | düşen test |
|---|---|
| harf y'sini terslemeyi kaldır | "TABELA GERİ OKUNUYOR" → `???V??R ?????` |
| harf x'ini aynala | "TABELA GERİ OKUNUYOR" → `    ?? ??????` |
| ayağı piramide göre hesaplama | "Bacon bandını piramit KAPATMIYOR" → 3 blok |
| tabelayı güneye koy | "tabela piramidin KUZEYİNDE" → z = 9 |
| "çaldı" işaretini (-1) kaldır | "durum artık 'çaldı'" + 1 tane |
| `maske === TAMAM` → `maske !== 0` | "iki yetmiyor" + 5 tane |

## Bekleyen

**Kanlı Kol.** Depoda `kns_kolluk_bobby_kanli`, `kns_kolluk_boralo_kanli` ve
`kns_kolluk_chris_kanli` **görünüm** olarak duruyor (v6.2'de BoraLo'dan
geldi) — ama çalışan bir kol değil, sadece kolluk. Toprak Kol gibi yetenekli
bir Kanlı Kol için bulduğun modu bekliyorum.

---

# v6.5 — Seçilme ve yemin

Kullanıcı: *"4 aşamadayken uzun süre kalırsak o şekilde körlük gitsin, ekrana
'Yücelerin Yücesi tarafından seçildin, artık seçilmiş oyunculardan bir
tanesisin' yazsın. Sohbet ekranına da bir tane yemin yazdıralım, onu yazarsa
'artık tam anlamıyla bir asker oldun' desin."*

Düşmüş durum makinesine **iki durum daha** eklendi. Dördüncü aşama artık bir
son değil bir **eşik**.

## Akış

```
yozlaşıyor (1-3) ──► düşmüş (4) ──60 sn dayan──► seçilmiş ──yemini yaz──► asker
     │                   │                          │                       │
   bloktan in        ATEŞ ◄──────────────────────────┴───────────────────────┘
     ▼                   ▼
   kurtuldun         arınıyor (4 aşama tersine)
```

| durum | ne oluyor |
|---|---|
| `düşmüş` | 4. aşama, **kör**. `DUSMUS_SECILME_SURE` (1200 tick = 60 sn) sayacı başlıyor. |
| `seçilmiş` | **Körlük kalkıyor.** Ekrana `§5§lSEÇİLDİN` + *"Yücelerin Yücesi tarafından seçildin — artık seçilmiş oyunculardan birisin"*. Sohbete yemin düşüyor, yazmayana 20 sn'de bir tekrarlanıyor. |
| `asker` | Yemini yazdı. Ekrana `§4§lASKER` + *"Artık tam anlamıyla bir asker oldun."* |

Yemin: **"Yücelerin Yücesine and olsun karanlıkta yürürüm"**

Karşılaştırma `sadelestir()` ile: büyük/küçük harf ve Türkçe harfler önemsiz —
tabletten yazan biri için harfi harfine eşleşme eziyet olurdu. Yemin satırı
sohbete **düşmüyor** (`e.cancel`), böylece yanındaki oyuncu kopyalayamıyor.

## Seçilmek bir ödül değil

Hastalığın ilerlemesi. Dört parça bedende kalmaya devam ediyor, elle
çıkarılan geri giyiliyor, ve **tek çıkış hâlâ ateş**. Asker de çakmakla
arınabiliyor ve gerçek zırhını aynen geri alıyor.

## İki teknik ekleme

**`sohbet.js` dinleyici defteri.** Yemini duymak için `chatSend`'e ikinci bir
abone açmak gerekiyordu — ama iki abonenin `e.cancel` üstünde yarışması
sessiz bir hata kaynağı. Onun yerine **var olan tek abone** dinleyici listesi
taşıyor: `komutCozumle` "bu komut değil" derse sıra dinleyicilere geliyor,
biri sahiplenirse mesaj iptal ediliyor.

**`yardimcilar.js: baslikYaz()`.** Üç kademeli düşüş:
`setTitle(baslik, {subtitle})` → `setTitle` + `updateSubtitle` → aksiyon
çubuğu + sohbet. Sürüm ne olursa olsun yazı ekrana düşüyor.

## Testte yakalanan hata

`secilmeTick` **dünya kaydında tutulmuyor** (defter yalnız durum, aşama ve
zırhı taşıyor — dinamik özelliğin boyut sınırı var). Yani dünyadan çıkıp
giren bir kurban **sonsuza kadar** 4. aşamada kalırdı: sessiz bir ölü uç.
Artık sayaç eksikse baştan başlıyor. Test `7d` bunu ölçüyor — kaydı elle
düşürüp geri okutuyor.

## Kasten kırıp doğrulandı

| kırılan | düşen test |
|---|---|
| `sohbetDinleyiciEkle(dusmusYemin)` yorum satırı | "YEMİN sohbetten geçti (dinleyici BAĞLI)" + 5 tane daha |
| `sec()` içinden `korlukVer(…, false)` | "KÖRLÜK KALKTI" |
| `secilmeTick === undefined` koruması | "sayaç baştan başladı ve SEÇİLDİ" |
| süre kontrolü (`simdi` yazıldı) | "süre dolmadan SEÇİLMİYOR" + 11 tane |
| yemin metni karşılaştırması | "yanlış satır yemin sayılmıyor" + 3 tane |

Yazılıp bağlanmamış kod bu depoda iki kez çıktı (`efsane.js` import
edilmemişti, `konseySilahKir` hiç çağrılmıyordu). Bu yüzden yemin testi
`dusmusYemin`'i doğrudan çağırmıyor — **gerçek sohbet borusundan** geçiriyor.

---

# v6.4 — Düşmüş artık zırh değil, **virüs**

Kullanıcı düzeltti: *"sen fallen'ı bir zırh olarak eklemişsin, zırh olmayacak
bir BLOK olacak. Üstüne çıktığımız zaman dört aşamadan oluşuyor; dörde
geldikten sonra otomatik olarak bedenden ÇIKMAYAN bir zırha dönüşüyor. Temel
olarak VİRÜS gibi bir şey, tek zaafı ATEŞ."*

Haklıydı. v6.2'de dört aşamayı **giyilebilir zırh** olarak eklemiştim —
menüden alınıp takılan bir takım. Yanlıştı: onlar bir takım değil, bir
**durum**.

## Ne değişti

| | v6.2 | v6.4 |
|---|---|---|
| dört aşama | yaratıcı menüsünde, giyilebilir | **menüde yok** — durum makinesi takıyor |
| kaynak | yok | **Düşmüş Bloğu** (menüde) |
| 4. aşama | takıp çıkarabilirsin | **kalıcı**, elle çıkarsan geri giyiliyor |
| çıkış | çıkar, bitti | **sadece ateş** |

## Kaynakta ne var, ne yok

BoraLo'nun `fallen.js`'i bloğu ve dört aşamayı yapıyor. **Ama:**

- kaynakta **4. aşama kalıcı değil** — bloğun üstünden inince her şey siliniyor
- kaynakta **ateş çaresi yok** — iki paketin bütün script'leri, `.mcfunction`'ları
  ve varlık JSON'ları tarandı, tek bir iz yok

İkisi de kullanıcının tarifi. Uydurma değil, **istenen davranış** — ve nereden
geldiği hem `ayarlar.js`'te hem burada yazılı.

## Zırhın kaybolmuyor

Kaynak kurbanın dört zırh yuvasını da **siliyor** (`replaceitem ... air`). Bu
depoda eşya kaybettiren hiçbir şey yok. Bulaşmadan **önce** dört yuvadaki
gerçek zırh deftere yazılıyor, iyileşince **aynen** geri takılıyor. Defter
dünya özelliğinde: dünyadan çıkıp girsen de zırhın kayıp değil.

Testin en önemli bölümü bu: elmas miğfer + netherite göğüslük + demir pantolon
+ altın bot ile bulaşıp iyileşince **dördü de geri geliyor**. `zirhiGeriVer`
çağrısını yorum satırı yaptım — yakalandı.

## Yol boyunca çıkan **dört** şey

**1. Her tick blok okuyordum.** Üç test birden düştü: `ciftel` ve `duvardel`
*"57 / 56"* (tick başına blok tavanı aşıldı), `iksir` *"hiçbir blok
okunmadı/yazılmadı :: 40 okuma"*. Hiç Düşmüş bloğu olmayan bir dünyada bile
sürekli blok okuyordum. Deponun kuralı açık: **defter boşken hiç dönme.**
Çözüm: blok konulduğunda deftere yazılıyor, kırıldığında siliniyor — tarama
artık **tek bir `getBlock` bile yapmıyor**, oyuncunun tam sayı konumunu
defterle karşılaştırıyor.
*Sınır:* `/setblock` veya yapı ile konan blok deftere girmez; elle konan çalışır.

**2. `blocks.json`'ı eziyordum.** Kendi yazıcımı ayrı koymuştum; alttaki yazım
benimkini eziyordu. **Ters sırada olsaydı ben onları ezerdim** ve Freedom Stone
cevheri, mezar taşı ve taş heykel mor-siyah kalırdı. Artık dört blok tek yerde.

**3. Ateş işe yaramıyordu.** Kurban iyileşiyor ama **hâlâ bloğun üstünde**
olduğu için aynı tarama turunda yeniden bulaşıyordu. 5 saniyelik bağışıklık
penceresi eklendi — kaçacak kadar, kalıcı kalkan değil.

**4. `dusmusUnut()` dünya kaydını temizlemiyordu.** Sadece belleği siliyor ve
`okundu`yu sıfırlıyordu; bir sonraki tarama **eski kaydı geri okuyup kurbanları
diriltiyordu**. Testte görüldü: iyileşen oyuncunun zırhı bir önceki turun boş
zırhıyla değişiyordu.

Bu arada testin kendisi de bir kez yanlıştı: arınma ~120 tick, bağışıklık 100
tick, testim 225 tick koşuyordu — yani arınmadan sonra bağışıklığın da
bitmesini bekleyip kurbanı bloğa yeniden bastırıyordum. Kod doğruydu, ölçüm
yanlıştı.

## Doğrulama

- `sim/kos.sh` — **67 dosya, hepsi geçti** (`dusmus.mjs` yeni)
- `sim/anim_tara.py` — **HATA 0**
- İki bilerek bozma: zırh geri verme şoklandı · 4. aşama kalıcı olmaktan
  çıkarıldı — **ikisi de yakalandı**

---

# v6.3 — Düşmüş koruması 750, Biyo/Bobby silahı, Ay Işığı şarkısı

Kullanıcı: *"koruma 1000 pratikte dokunulmaz olduğu için bunu birazcık aşağı
doğru çekelim, en iyisi 750 olsun"* + *"bunu da hallet kankam, iznini
veriyorum."*

## 1. Düşmüş koruması 1000 → 750

Tek bilerek değiştirilen sayı. Diğer 50 parçanın hepsi kaynakla birebir ve
`konsey.mjs` onları jar'la karşılaştırıyor — bu satır testte **ayrıca muaf
tutuluyor** ve gerekçesi orada yazıyor, ki "sapma yok" iddiası yalan olmasın.
Muafiyet 750'yi bekliyor: 900 yazıp denedim, yakalandı.

## 2. Silahlar gerçekten çalışıyor

Kaynağı yeniden okuyunca **önceki söylediğim yanlıştı**: `bobbygunshot1` boş
değil, **hiç yok**. Silahların işini yapan şey mermilerinin çarpma
fonksiyonu:

| kaynak fonksiyon | ne yapıyor |
|---|---|
| `biogunyap1` | kurbanı etiketle · hareket/kamera/eğilme kapat · kafaya `toxic_skin` · görünmezlik |
| `bobbygundirt1` | aynısı, deri `dirt` |

Yani ikisi de *"vurduğunu dondurup başka bir şeye çevir"* — `tas.js`'in işinin
aynısı. Kurallar oradan devralındı:

**Süre var ve iki çıkış yolu var.** Kaynağın `invisibility 99999 255` +
`item_lock` kombinasyonu kurbanı **kalıcı** hapsediyor. Bizde 30 saniye, ya da
Freedom Stone — taş ve mezarla aynı anahtar, *"kilit hep çift"*.

**Eşya kaybı yok.** Kaynak kurbanın kafasındakini siliyor
(`replaceitem ... slot.armor.head 1 air`). Bizde deri **yalnız kafa yuvası
boşsa** takılıyor; doluysa görünüm atlanıyor, etki yine uygulanıyor ve vurana
sebebi yazılıyor. Serbest kalınca **yalnız bizim taktığımız** parça çıkarılıyor.

## 3. Ay Işığı Asası'nın şarkısı

Burada da düzeltmem var: `moonlightstaffsong1` **boş dosya değil, hiç yok.**
Eşya `function moonlightstaffsong1` çağırıyor ve o çağrı boşluğa gidiyor —
modun kendisinde şarkı hiç çalmıyor. Ses dosyası ise pakette duruyor.

Üç `.ogg` de alındı ve `sound_definitions.json` **biz yazdık** (kaynağınki
boştu, yani sesler hiç tanımlı değildi). Uydurma değil — kaynağın
bağlayamadığı kendi dosyası.

## Yol boyunca çıkan iki şey

**1. Freedom Stone kaçışını yazıp bağlamamışım.** `konseySilahKir()` duruyordu
ama `main.js`'ten hiç çağrılmıyordu — **efsane.js tuzağının aynısı, aynı
oturumda ikinci kez.** `tarama.mjs` "kullanılmayan ithal" diye yakaladı.
`itemUse`'a bağlandı; şoklayıp denedim, test yakaladı.

**2. `canli.mjs` "eksik: sounds" dedi** ve bir an paketleme hatası sandım.
Değilmiş — `paketle.sh` zaten klasörün tamamını alıyor, paketler bayattı.
Yeniden paketleyince geçti. *Testin ne dediğini okumak, ne demek istediğini
varsaymaktan iyi.*

## Doğrulama

- `sim/kos.sh` — **66 dosya, hepsi geçti**
- `sim/anim_tara.py` — **HATA 0**
- İki bilerek bozma: Freedom Stone kaçışı şoklandı · Düşmüş koruması 900
  yapıldı — **ikisi de yakalandı**

---

# v6.2b — Efsane yapısı oyunda hiç çalışmıyormuş

Kullanıcı: *"efsane yapısı çalışıyor mu diye bir kontrol eder misin acaba"*

**İyi ki sordun.** Yapının kendisi kusursuz çalışıyor — 45 sınama, hepsi geçiyor:
şifre gidiş-dönüş, SGA harfleri, koordinat zinciri, piramidin örülmesi, Bacon
bandının çözülünce doğru koordinatı vermesi. Ama **oyunda hiç kurulamıyordu.**

## Sebep: tek bir eksik import

`scripts/yetenekler/efsane.js` **hiçbir yerden import edilmiyordu.** Ne
`main.js`'te vardı ne başka bir dosyada. Yani içindeki `yetenekKaydet`
**hiç çalışmıyordu.**

Menüdeki *"◆ Efsane yapısı kur"* satırı duruyordu; bastığında
`yetenekTetikle(oyuncu, "efsane_yapisi")` çağrılıyor ve **kayıtlı olmayan bir
yeteneği** arıyordu. Hiçbir şey olmuyordu, hata da vermiyordu.

Kanıt — `main.js` tek başına yüklendiğinde:

```
kayitli yetenek sayisi: 158
efsane_yapisi kayitli mi: false
```

## Testten nasıl kaçtı

`efsane.mjs` dosyayı **kendisi** import ediyordu:

```js
const efs = await import("./pack/yetenekler/efsane.js");
```

O import yeteneği kaydediyordu. Yani test *"çalışıyor mu"*yu ölçüyordu,
*"ulaşılabiliyor mu"*yu değil — **v4.83'te öğrenilen dersin aynısı**, bu kez
kendi testimizde.

## Düzeltme

`main.js`'e import satırı eklendi (sıra önemli: `kollar.js`'ten önce).
`efsane.mjs`'e **7. bölüm** eklendi:

- yetenek kayıt defterinde mi
- `main.js` dosyayı import ediyor mu ← **asıl yakalayan bu**
- menüde satır var mı ve doğru yeteneği mi çağırıyor
- satır `menuEkleri()`'nin **gövdesinde** mi
- `menuEkleri()` gerçekten menüye veriliyor mu
- `EFSANE_ACIK` ayarı var mı ve dosya ona bakıyor mu

İki kez bilerek bozdum: import satırını sildim → **yakalandı**.

Bu arada testin ilk hâli kendi yorumuma takıldı: `indexOf("Efsane yapisi kur")`
yeni yazdığım yorum metnini buluyordu. Konum karşılaştırması yerine
`menuEkleri()`'nin gövdesi ayrılıp içinde aranıyor artık.

---

# v6.2 — CodeMan + yeni BoraLo: 54 parça

Kullanıcı: *"yeni boralo notları buldum, bunlardan alabildiğimizi alalım, eşya
dahil her şey."*

## Bu ikisi Java değil — **Bedrock eklentisi**

Önceki BoraLo bir Java moduydu (`REFERANS_BORALO.md`) ve modellerini bytecode'dan
çözmek gerekmişti. Bunlar `.mcaddon`: `.geo.json` 1.12.0, dokular PNG,
animasyonlar 1.8.0. **Dönüştürme yok** — `konsey_al.py` taşıyor, `kol_uret.py`
paketliyor.

| paket | ad alanı | içerik |
|---|---|---|
| Astra Studios CodeMan V1 | `klezy:` | 65 eşya · 67 model · 90 attachable · 24 animasyon · 4 ses |
| BoraLo Mod V1 Beta | `dragon:` | 16 eşya · 13 model · 1 blok · 14 script |

## Alınan 54 parça

| ne | kaç | not |
|---|---|---|
| **Konsey kostümü** | 6 | Okazor · Miskel · Kajaros · Harkos · Raxxan · CodeMan — bunlar `LORE.md`'deki **kendi karakterlerimiz** |
| Deri | 4 | Toprak · Düşmüş · Taş · Zehir |
| Maske | 4 | Deadmau5 · Redmau5 · Kanlı Deadmau5 · Kemik |
| Kolluk | 14 | toprak/güçlendirilmiş/düşmüş + Bobby1545, BoraLo, Chris1545 çeşitleri |
| Asa | 7 | hasar 24–62 |
| Earl aleti | 5 | kılıç 21 · balta 19 · kazma 14 · kürek 12 · çapa 11 |
| Zırh | 8 | Ölü Büyücü ×4 · Güç Zırhı ×4 |
| Silah | 2 | Biyo Silah · Bobby Silahı |
| Düşmüş aşaması | 4 | BoraLo'nun 4 kademeli yozlaşması |

Sayıların hepsi kaynak eklentinin **kendi eşya JSON'undan**; `sim/konsey.mjs`
hepsini oradan doğruluyor.

## Kostüm üç parçadan oluşuyor

Kaynağın tekniği bizimkiyle aynı: **giyilebilir eşya + attachable + oyuncuya
görünmezlik**. Üçü de olmadan çalışmıyor — üçüncüsü olmazsa oyuncu kendi
derisiyle kostümün içinden görünür.

Hangi parçanın gizlediği **uydurulmadı**: kaynakta her biri için bir
`<ad>_effect.mcfunction` var, tam 14 tane. Kemik Maskesi ve kolluklar listede
**yok** — onlar oyuncunun üstüne biniyor, yerine geçmiyor; görünmezlik
verseydik kolsuz bir hayalet olurdun. Test bu listeyi kaynak klasörle
karşılaştırıyor.

## Yol boyunca çıkan üç şey

**1. Tarayıcı 18 hata yakaladı — ve haklıydı.** Kaynak paketler zırh kalıbını
kullanıyor (`waist` ebeveynsiz, bacaklar `body`nin çocuğu). Bizim 48 Marvel
kostümümüz `root → waist → body` kalıbını kullanıyor ve `anim_tara.py` onu
bekliyor — v5.4'teki *"uzuvlar gövdeden kopmuş"* hatasının yarısı tam buydu.
Düz kopyalasaydık 11 modelde geri gelirdi. Çözüm: `shutil.copyfile` yerine
`yaz_json`, çünkü o yol zaten `insan_hiyerarsisi()`'nden geçiyor.

**2. `kol_*` adları bir testi tetikledi.** `o_sey.mjs` ve üç test daha
`kol_uret.py`'de kaç tane `("kol_...` satırı olduğunu sayıyor — kural
*"her şeyi kol yapma"*. Kol kostümlerine `kol_` demek testi yanlış yere
düşürüyordu. Testi zayıflatmak yerine **adları `kolluk_` yaptım**; kural
yerinde kaldı.

**3. Dil dosyalarında başka bir eklentinin artıkları var.** İki paketin de
`en_US.lang`'inde yüzlerce `pa:` satırı duruyor (PA-Fridge, PA-Shark,
PA-Pizza…) — başka bir eklentiden kopyalanmış. **`pa:` bizim ad alanımız**;
o satırları almak kendi eşya adlarımızı ezerdi. Adlar `konsey_al.py`'deki
tablodan geliyor, dil dosyası hiç okunmadı. Test bunu ayrıca kontrol ediyor.

## DİKKAT — Düşmüş parçalarının koruması 1000

Kaynakta bu bir **ceza** durumu: `void_multitool` kurbana giydiriyor ve kurban
zaten kımıldayamıyor, yani 1000 koruma "kurban donuk kalsın" demek. Bizde eşya
menüden alınabildiği için **onu giyen dokunulmaz olur.** Sayı kaynaktakiyle
birebir bırakıldı ve durum hem burada hem `kol_uret.py`'de yazılı — kısılması
kullanıcı kararı.

## Alınmayanlar ve sebepleri

| ne | neden |
|---|---|
| `modders` | YouTube tanıtım sahnesi (armor stand + başlıklar), oyun mekaniği değil |
| El hareketi eşyaları (4) | şimşek, toprak, yamult **bizde zaten var** — aynı yeteneğin ikinci kopyası olurdu |
| `mob_picker` · `stone_converter` · `void_multitool` · `dirt_arm` · `bot_caller` · `kevin1545_sword` mekanikleri | hepsinin karşılığı bizde **var** (`hapis.js`, `tas.js`, Toprak Kol, bot sistemi, `isinlanma.js`, kafes) |
| `zaman` (gece/gündüz) | küçük bir yardımcı, bizde `_yagmur.js` benzeri yapı zaten var |
| `entity_0_zombies` · `konsey_animation` varlıkları | kaynağın kendi sahne kurulumu |

## Doğrulama

- `sim/kos.sh` — **66 dosya, hepsi geçti** (`konsey.mjs` yeni)
- `sim/anim_tara.py` — **HATA 0** (18 hatadan sonra)
- Bilerek bozma: görünmezlik listesine uydurma bir parça ekledim — **yakalandı**
- Render: 16 parça önden çizildi, hepsi doğru

---

# v6.1 — Ben 10: ek formlar + aktif saldırılar

Kullanıcı: *"ikisini de yapalım. Referanstan bakmaman için dosyayı tekrardan
atacağım, referans da bazen yanlış bilgi verebiliyor o yüzden."*

Haklı bir tedbir. Jar'ı tekrar açtım (md5 `18b2b7b1…`, öncekiyle **aynı**) ve
bütün sayıları oradan yeniden okudum. `sim/ben10_saldiri.mjs` de referansa
değil **jar'a** bakıyor: 54 satırın her biri modun kendi yetenek adıyla
gösteriliyor ve sayısı orada doğrulanıyor.

## 1. Beş ek form

| form | kaynak | ölçek | ne değişiyor |
|---|---|---|---|
| **Gri Madde · Zırh** | `galvan_armor` | 0.25 | armor +20 · uçuş (jetpack + kanat + kask) |
| **Gri Madde · Uzuv** | `galvan_limbs` | 1.25 | armor +10 · saldırı +2 |
| **Gri Madde · Takım** | `galvan_suit` | 1.65 | armor +24 · saldırı +5 · ateş bağışıklığı |
| **Gülle · Top** | `ball_roll` | 1.37 | tokluk +10 (Direnç seviyesi kaymıyor) |
| **Yükseltme · Çubuk** | ayrı güç dosyası | 0.8 | armor +16 · saldırı +4 · yıldırım |

Üç biçimle 15 yeni kayıt. **41 → 56.**

### İki ölçek ÇARPILIYOR

İlk denemede uzuvlu Gri Madde **149**, takımlı **186** birim çıktı (9 ve 11.6
blok). Koşullu ölçeği tek başına almıştım.

Kaynakta iki `palladium:size` aynı anda açık ve pehkui bunları **çarpıyor.**
Kanıt modun kendi içinde: Devasaur'un `size_change` 2.8 ve `size_change_grow`
2.3. "Grow" büyüme demek; ezseydi 2.3 < 2.8 olduğu için oyuncuyu **küçültürdü.**

Doğrusu `0.25 × 6.6 = 1.65` → 2.90 blok. Render bunu yakaladı.

### Grey Matter'ın tabanı v6.0'da YANLIŞTI

v6.0'da Gri Madde satırında Direnç IV ve Güç II vardı. O sayılar `armor +56` ve
`attack +7`den geliyordu ve onlar **çıplak Galvan'ın değil**, zırhının /
uzuvlarının / takımının sayılarıymış. Formlar ayrı eşya olunca yerine gitti:
çıplak Gri Madde modun kendisinde de zayıf.

(`max_health −10` cezası taşınamadı — Bedrock'ta negatif can artışı yok.)

## 2. Elli dört aktif saldırı + iki ışın

Modda ~15 ayrı yetenek türü var; Bedrock'ta üçe iniyorlar:

| tür | kaç | kaynaktaki karşılıkları |
|---|---|---|
| **mermi** | 24 | `projectile`, `custom_projectile` |
| **alan** | 24 | `aoe_damage`, `sonic_clap`, `explosion`, `astro_punch_damage`, `astro_laser_damage`, `roll_damage` |
| **atılma** | 6 | `motion`, `motion_dash`, `charge_leap`, `vax_leap`, `astrojump` |

Örnekler (hepsi jar'dan): Kaya Fırlatma 25 hasar + patlama · Süpernova 100 hasar
15 blok · Nükleer Top 250 hasar patlama 6 · Isırık 21 · Yuvarlanma Çarpması 22 ·
Tekme Atılışı 18 + itme 5 · Astro Lazer 10 (dikey silindir, 10 blok).

**Hasar çevrilmedi.** Java'da `Damage: 25` de Bedrock'ta `applyDamage(25)` de
aynı ölçek. Işınlardaki ×20 kuralı buraya girmiyor — o kural *sürekli* ışınlar
içindi, bunlar tek vuruş.

### Ateş Topu'nun ışını nihayet var

v4.92'den beri özet "ışın 9" **vaat ediyordu** ama ortada ışın yoktu. Şimdi
gerçekten geldi (9 × 20 = 180, 15 blok), Büyük Üşütük'ün buz nefesiyle birlikte
(3 × 20 = 60, 10 blok). İkisi de mevcut ışın motoruna bağlandı — yeni dosya
açılmadı, üçüncü bir kapı türü eklendi.

### Menzil tavanı

Kaynakta mermi menzili `hız × Lifetime` ve Java'da bu bir **tavan** — mermi
zaten bir yere çarpıp duruyor. Düz alınsaydı Kaya Fırlatma 630, Nükleer Top 300
blok tarardı; bizim mermimiz script'le ilerliyor ve her tick önünü tarıyor.
64 blokta kesiliyor, kaynağın kendi sayısı `kaynakMenzil` olarak duruyor.

### Marvel mekanikleri Ben 10'a açıldı

`wall_climb` / `intangibility` / `elytra_flight` / `astrojump` modda zaten
vardı; `mekanikVar()` artık önce Marvel kahramanına, sonra elindeki uzaylıya
bakıyor.

## Alınmayan iki ışın

Yükseltme'nin `upgrade_beam`i ile Çubuk'un `lightning_beam`i **hasar
taşımıyor** — `energy_beams/*.json` dosyaları yalnızca renk/boy, hasar
yetenekte yazıyor ve o ikisinde `damage` alanı yok. Uydurma hasar verilmedi.

## Yol boyunca çıkan iki hata

**1. Mermi işi sonsuza kadar asılı kalabiliyordu.** Patlama bütçesi doluysa
"bir tick daha bekle" diyordu ve bütçe hiç açılmazsa iş kuyrukta kalırdı.
Artık `BEN10_SALDIRI_BEKLEME` kadar deneyip vazgeçiyor.

**2. Testin kendisi yanlıştı.** Mermi döngüsünde tick ilerletmiyordum, yani
bütçe hiç yenilenmiyordu. Test "mermi durmuyor" diyordu; durmayan test'ti.

**3. Tarayıcı boş ayar yakaladı.** `BEN10_MERMI_TAVAN` yalnızca tabloyu
üretirken kullanılıyordu, çalışma anında değil. Artık motorda da uygulanıyor —
tablo elle düzenlenirse 630 bloka kadar tarayan bir mermi çıkardı.

## Doğrulama

- `sim/kos.sh` — **65 dosya, hepsi geçti** (`ben10_saldiri.mjs` yeni)
- `sim/anim_tara.py` — **HATA 0**
- İki bilerek bozma: bir hasar sayısını değiştirdim, kapıyı kaldırdım —
  **ikisi de yakalandı**
- Render: beş ek form önden ve yandan çizildi; ölçek hatası orada görüldü

---

# v6.0 — Ben 10: on beş uzaylı daha

Kullanıcı: *"ben 10'den almadığımız uzaylıları ve formları eklemeyi
düşünüyorum... unutma ki uzaylıların güçlerini birebir yapmaya çalışacağız."*

## Ne geldi

**4 uzaylı → 19 uzaylı, 12 kayıt → 41 kayıt.**

Yedi tanesi üç biçimli (Vahşi Sırtlan, Şimşek Hız, Gri Madde, Sinek Suratlı,
Yükseltme, Hayalet, Gülle), sekiz tanesi tek modelli (Jet Işını, Atomik,
Ejderha, Astro Bot, Bataklık Ateşi, Büyük Üşütük, Yankı Yankı, Devasaur).

Sayılar `powers/<tür>.json` dosyalarından **hesaplandı**, yazılmadı — kural
tablosu `REFERANS_BEN10.md`'de.

## İki tür ALINAMADI, ikisinin de sebebi var

| tür | neden |
|---|---|
| **Kryptonian** | Güç dosyası dolu ama jar'da **modeli yok** — tek bir `.geo.json`, doku ya da `render_layer` bile yok. Uydurma model çizilmedi. |
| **Crystalsapien** (Chromastone) | Modeli var, ama **modun kendisi bitmemiş**: güç dosyasında iş yapan tek satır `say Under Construction`. Güçsüz bir yaratık kostümden ibaret olurdu. |

İkisi de `sim/ben10.mjs` 1. bölümde **sınanıyor**. Testin tuttuğu şey
"almadık" değil, *"gerçekten alınamaz mıydı"*.

## Yol boyunca çıkan üç şey

### 1. Eski dördünün dokusu EKSİKMİŞ

v4.92'de "uniform ve glow katmanları neredeyse boş — ölçüldü: 0/16384"
yazmıştım ve sadece `skin` katmanını almıştım. **O ölçüm sadece `default`
biçimi için doğruymuş.**

```
tetramand_uniform_10k        2267/4096   (%55)   <- alınmıyordu
tetramand_skin_10k            960/4096   (%23)   <- alınan buydu
piscciss_volann_uniform_10k  1275/4096   (%31)
petrosapien_uniform_10k      1625/16384  (%10)
```

Dört Kol'un 10K biçimi dokusunun **yarısından çoğunu kaybediyordu.** Elmas
Kafa, Dört Kol ve Yüzen Çene'nin dokuları üç biçimde de yeniden üretildi.

Ateş Topu'na dokunulmadı: onun katmanları sekiz kareli bir alev animasyonu
ve v4.92'de elle birleştirilmişti; yeniden üretmek görünümünü değiştirirdi.

### 2. Sinek Suratlı'nın kanatları ayrı dokudaydı

Kanatlar (`wings_#UNIFORM.png`) gövdeden **ayrı bir dosya**. Bedrock'ta bir
geometri tek doku kullanıyor. Çözüm: doku **atlasa** alındı — kanat dokusu
gövdenin sağına yapıştırıldı, kanat UV'leri 64 piksel kaydırıldı, tuval
128×64 oldu. Yandan render'la doğrulandı.

### 3. Marvel mekanikleri Ben 10'a da açıldı

Modda **`wall_climb`, `intangibility`, `elytra_flight`** zaten vardı —
bizim `tirmanma` / `faz` / `suzulme` mekaniklerimizin tam karşılığı.
`mekanikVar()` genişletildi: önce Marvel kahramanına, sonra elindeki
uzaylıya bakıyor.

Bu arada ortaya çıktı ki **Dört Kol ile Yüzen Çene'nin de** kaynakta
`wall_climb`'i varmış — v4.92'de atlanmış. İkisine de eklendi.

## Ne gelmedi

**Aktif saldırı yetenekleri.** Ejderha'nın ateş topu (10 hasar), Astro
Bot'un yumruğu (7/10) ve lazeri (10), Büyük Üşütük'ün buz nefesi (3),
Yükseltme'nin enerji ışını — sayıları okundu, `REFERANS_BEN10.md`'de
yazıyor, ama aktarılmadı. Ejderha ile Astro Bot'un tablodaki güçlerinin
zayıf görünmesinin sebebi bu: kaynakta da güçleri saldırılarında.

**Modun kendi animasyonları.** Yeni uzaylıların `.animation.json`'ları
alınmadı. WoM dersinden sonra kural şu: bir tetiğe **güvenle**
bağlanamayan animasyon pakete girmiyor. Gövdeleri vanilla oyuncu
animasyonlarıyla sürülüyor — dört uzaylıyı çalıştıran şey de buydu.

## Dikkat: üç uzaylı çok büyük

Ejderha **8.7×** (~20 blok), Atomik **3.3×**, Devasaur **2.8×**. Model o
kadar büyüyor ama **çarpışma kutusu 1.8 blokta kalıyor** — kaynak mod bunu
`pehkui` ile çözüyor, Bedrock'ta karşılığı yok. Sayılar modun kendi
JSON'undan; küçültmek uydurmak olurdu.

## Doğrulama

- `sim/kos.sh` — hepsi geçti (71 dosya)
- `sim/anim_tara.py` — **HATA 0**
- İki bilerek bozma denemesi: yanlış ölçek ve uydurma biçim — **ikisi de
  yakalandı**
- Ön render: `ben10_yeni.png` (önden 29 model), yandan Sinek Suratlı ve
  Büyük Üşütük

---

# v5.9 — Yetenek ağacı kaynaktakiyle aynı

Kullanıcı iki şey sordu:
1. *"bunların hangisinde özellik var? Çünkü mod hepsinde birer birer özellik
   olmaz değil mi? Olanları al lütfen."*
2. *"Yetenek ağaçlarını dikkatlice, hepsinin — aldıklarımız dahil — teker teker
   bak; bizim yetenek ağacımız ile aynı olmasını istiyorum, bu modun yetenek
   ağacı ile."*

## 1. Haklıydı: hepsinde özellik yok

37 gücün hepsi tarandı ve yetenekleri **görsel** (render_layer, hide_body_part,
name_change, animation_timer, trail) ile **gerçek** (attribute_modifier,
energy_beam, damage_immunity, invisibility, ölçek/efekt komutları) diye ayrıldı.

| mod | gerçek özellik | karar |
|---|---|---|
| Super Mode | **11** — zırh 40, tokluk 20, saldırı +10, geri tepme direnci 10, lazer 15/30, patlama+düşme bağışıklığı | al |
| Hydro Heat | **11** — zırh 25, **iki ışın** (ateş 15/30 yakma 5, buz 20/30), ateş+donma bağışıklığı | al |
| Strength Stealth | **11** — zırh 30+20, saldırı +15, görünmezlik, düşme direnci 100 | al |
| Flight Stealth | **12** — görünmezlik, uzay nefesi, donma/patlama/düşme bağışıklığı | al |
| Takonian (`ion_power`) | 9 — ion_blast 5/30, patlama, enerji çubuğu | al |
| Scuba Flight / Stealth | 8'er — yüzme +5, düşme direnci 200 | al |
| Size Mode | 7 — zırh 20, düşme direnci 100, büyü/küçül | al |
| Nova Ring | 7 — yıldırım/donma/oksijen bağışıklığı, uzay nefesi | al |
| Clone mode | 6 — zırh 20, minyon doğurma | al |
| Cannon mode | 4 — zırh 40, dört bağışıklık, boyut 1.5 | al |
| Turbo Lash | 1 — ışın 5/30 | al (silah) |
| **Camo Mode** | **0** — 9 render_layer, 1 komut | **alma** |
| **turbo_sword / steeless_sword** | 1'er — yalnız eşya tak/çıkar komutu | **alma** |
| **speed_stealth** | dosya **0 bayt** — modda boş | **alma** |

Yani üç tanesi gerçekten boş çıktı. Kalanların bütün sayıları çıkarıldı ve
`REFERANS_MAXSTEEL_AGAC.md`'ye yazıldı.

## 2. Ağaç: kaynakta ne var

Bütün güçler `gui_display_type: "tree"`. Kök **`base_mode`**; diğer modlar
oradan, **kendi çekirdeği ödenerek** açılıyor:

```
base_mode/heat_mode -> palladium:item_buyable
                       { item: ionstrike:heat_core, amount: 1 }
```

`base_mode` ağacının 24 düğümü tarandı — 12 modun bedeli bir çekirdek, iki
düğüm XP ile alınıyor:

| düğüm | bedel |
|---|---|
| ısı · titan · güç · hız · keşif · gizlilik · dalış · uçuş | kendi çekirdeği ×1 |
| boyut · klon · top · kamuflaj | shrink/clone/cannon/memory çekirdeği ×1 |
| `mode_select` (mod çarkı) | **30 XP kademesi** |
| `turbo_bike` | 40 XP kademesi |

## 3. Bizde neyin değiştiği

Bizde çekirdek **elde tutulan bir anahtardı**: bırakınca güç gidiyordu, yani
ağaç *yoktu*. Kaynakta çekirdek bir kez **harcanıyor** ve mod **kalıcı**
açılıyor; sonra mod çarkından seçiliyor.

Artık aynı:

- Çekirdeği eline al → menüden seç → **çekirdek harcanır**, mod kalıcı açılır.
- Açık bir modu seçmek onu **etkinleştirir** (kaynaktaki `mode_select`).
- Açılmamış bir modun çekirdeğini taşımak **güç vermez** — menüden açman gerek.
- **Temel** ağacın kökü, baştan açık (kaynakta `base_mode` satın alınacak bir
  düğüm değil).
- Mod Çarkı ayrı bir düğüm, **30 XP** — kaynaktaki bedelin aynısı.

Defter dünya dinamik özelliğinde; script yeniden yüklenince açık modlar duruyor.

## 4. İki kez kendi kısıtımı uydurup test yakaladı

**Birincisi:** "moda geçmek için önce Mod Çarkı gerek" diye yazmıştım.
Kaynakta öyle değil — `base_mode` ağacında her modun kendi düğümü bir `command`
ve düğümü açmak zaten o moda geçiriyor; `mode_select` ayrı bir düğüm ve işi
**hızlı geçiş**. Benim kısıtımla ilk çekirdeğini harcayan oyuncu 30 XP bulana
kadar hiçbir moda giremiyordu. Kaldırıldı.

**İkincisi:** çekirdek harcanınca `zirhTara` hâlâ "çekirdek elde" istiyordu,
yani harcayan oyuncunun elinde hiçbir şey kalmıyordu. Mod artık **seçili
moddan** geliyor; elde tutmak yalnızca bir kısayol.

## 5. Testlerin savunduğu eski sözleşme

`zirh.mjs`'in *"çekirdeği bırakınca güç gidiyor"* satırı artık **yanlış** —
kaynakta öyle bir kural yok, bizim uydurduğumuz bir kısıttı. Silinmedi, yeni
gerçeği sınayacak şekilde yazıldı: *seçili mod varken el boş olsa da güç durur;
seçim de yoksa hiçbir şey gelmez.* Aynısı `zirh_menu.mjs`'in *"hiçbir satırda ✔
yok, çünkü seçim yok"* satırı için de yapıldı — artık ✔ = açık, ⚿ = kilitli.

`test/zirh_agac.mjs` (7 bölüm) bizim ağacı **kaynağın JSON'uyla** karşılaştırıyor:
her modun bedeli aynı çekirdek mi, `mode_select` gerçekten 30 XP mi, `base_mode`
satın alınamıyor mu. İki kasıtlı bozmayla doğrulandı (bedeli yanlış yaz →
`✗ dalis: scuba_core vs hydro_core`; çekirdeği harcama → `✗ çekirdek HARCANDI`).

## 6. Sırada

Yukarıdaki 11 modun sayıları çıkarıldı ama **henüz aktarılmadı** — her biri
kendi takım geometrisi ve dokusu isteyecek (v4.94'teki işin aynısı). Ağaç
tarafı hazır: yeni bir mod `ZIRH_MODLAR` ve `ZIRH_AGAC_BEDEL`'e eklendiği anda
menüde kilitli olarak beliriyor ve çekirdeğiyle açılıyor.

---

# v5.8 — WoM kaldırıldı, matkap artık menüden açılıyor

## 1. Weapons of Miracles tamamen kaldırıldı

Kullanıcı: *"animasyon tarafında gene bozulmalar var. En iyisi onun eklediği
silahlar ve animasyonları tüm dosyalardan hangi dosyalarda varsa silelim
tamamıyla… belli ki başaramıyoruz."*

v5.5'te **ölçülebilen her şey** düzelmişti — 180'i aşan kare sıçraması 147→0,
ara değer hatası 350°→7°, önizleme temiz. Ama **oyunda hâlâ bozuktu.** Yani
elimdeki ölçütler yetmiyordu: düzelttiğim şeyler gerçekten bozuktu, ama görünen
bozukluk başka bir yerden geliyordu ve onu bulamadım.

Silinenler: `WOM_*` ayarları (27 silah, 63 animasyon), `wom_dovus.js`,
`kaynak_anim/ef_cevir.py`, `kaynak_anim/wom_dovus.animation.json`, 27 eşya,
27 ikon, 27 kaynak doku, `REFERANS_WOM.md`, `test/wom.mjs`,
`test/wom_dovus.mjs`, menü satırı, `anim_tara.py`'deki WOM özel çözümlemesi.

**Ne öğrenildi, nerede duruyor:** çevirinin bütün dersleri `NOTLAR.md` v5.5
bölümünde (euler dal atlaması, Root'un düşürülmesi, iskelet hiyerarşisi, katman
çakışması). Kod gitti, bilgi kaldı.

Envanterdeki `pa:wom_*` yığınları kaybolur — yalnızca yaratıcı modundan
alınabiliyorlardı, v4.95'te zırh parçalarında da aynı durum vardı.

## 2. Kendi temizlik kuralım, koruması gereken şeyi sildi

`animations/` klasörü üretecin temizlik listesinde **yoktu**, yani
`wom_dovus.animation.json` silinse bile pakette kalırdı — v5.2'deki
`kahraman_kostum.geo.json` tuzağının aynısı.

"Beklenen liste dışındakini sil" kuralını yazdım ve **yazar yazmaz**
`simsek_kol.animation.json`'ı sildi. O dosya üretilmiyor — elle yazılmış ve
depoda commit'li. Kural, korumak için yazıldığı şeyi yok etti.

Geri aldım ve otomatik silmeyi kaldırdım. Üretecin bilmediği bir dosyayı
silmesi yanlış. Karar insanın; ama dosya sessizce yaşamasın diye denetim
**tarayıcıya** taşındı: bir animasyon dosyasındaki animasyonların *hiçbiri*
kullanılmıyorsa HATA.

Bu denetim hemen üç gerçek artık dosya buldu — Ben 10'dan kalma
`petrosapien` (10), `prototype` (13), `recal_omnitrix` (8): 31 animasyon,
hiçbiri oyuncu varlığına kayıtlı değil, hiçbiri script'ten oynatılmıyor,
v4.x'ten beri öyle. **Silmedim** — istenen WoM'du, bunlar Ben 10 içeriği ve
ileride bağlanabilir. Listede duruyorlar; yeni bir artık dosya eklenirse
denetim yine kırmızı yanar.

## 3. Matkap artık direkt elde değil

Kullanıcı: *"Max steel modunda güç modunu açtığın zaman direkt elimde matkap
oluyor; normalde matkap için yetenekler kısmı var ya, ağaç şeklinde, tek tek
açabiliyorsun. Ben öyle biliyorum."*

**Doğru biliyormuş, ölçüldü.** `strength_mode.json`:

```
"gui_display_type": "tree"
drill_hands: palladium:tool_hands, list_index 1, hidden_in_bar FALSE
```

Yani matkap modun **yetenek barında 1 numaralı slot** — oyuncu açıp kapatıyor.
(`drilling` 0, `exo_render` 2, `armour` 8 — hepsi aynı bar.) Ağaçta **8 kilitli
yetenek** var. Biz "çekirdek eldeyse hep çizili" yapmışız.

Artık bir **varlık özelliği**: `pa:matkap`, varsayılan **kapalı**. Script açıyor
(`setProperty`), görünüş `q.property('pa:matkap')` ile okuyup çiziyor.

Neden dinamik özellik değil: kaynak paketin (görünüşün) script'ten haber
alabildiği tek kanal bu — `setDynamicProperty` molang'dan okunamıyor. Marvel
Project de aynı yolu kullanıyor (27 özellik, aynı biçim).

Çekirdek elden çıkınca katman kapanıyor; yoksa Güç'ü bırakıp başka moda geçince
matkap açık kalırdı.

**Özellik yoksa** (`setProperty` her sürümde yok) matkap kapalı kalıyor ve bir
kez bilgi yazılıyor. Bilerek: eski "hep açık" davranışına dönmek kullanıcının
şikayet ettiği şeye geri dönmek olurdu.

Test 5. bölümü gerçek bir kusur buldu: tek seferlik özellik tespiti önbelleğe
alınınca yazma yolu korumasız kalıyordu ve `TypeError` düşüyordu. Önbellek
artık yalnız **kullanıcıya mesaj** için; güvenlik her çağrıda.

## 4. Modda aldığımızdan çok daha fazlası var

Bu işi yaparken ionstrike'ın tamamı tarandı: **modda 25'ten fazla güç var, biz
9'unu almışız.** Alınmayan gerçek modlar:

| mod | adı | yetenek |
|---|---|---|
| `super_mode` | Super Mode | 16 (6 attribute, 1 energy_beam) |
| `size_mode` | Size Mode | 14 (boy değiştirme) |
| `clone_mode` | Clone mode | 13 (klonlar) |
| `hydroheat` | Hydro Heat Mode | 16 (**2 energy_beam**) |
| `ion_power` | Takonian | 14 (energy_beam, trail, aim) |
| `nova` | Nova Ring | 20 (3 damage_immunity) |
| `cannon_mode` | Cannon mode | 10 (damage_immunity) |
| `camo_mode` | Camo Mode | 10 (9 render_layer) |
| `turbo_lash` | Turbo Lash | 1 (energy_beam) |
| `turbo_sword` / `steeless_sword` | kılıçlar | 1'er |

Ayrıca beş **birleşim** modu (`flight_stealth`, `scuba_flight`,
`scuba_stealth`, `strength_stealth`, `speed_stealth`) — bunlar zaten aldığımız
iki modun birlikte açık hâli.

Bu port bir sonraki sürümün işi; envanter burada duruyor ki unutulmasın.

---

# v5.7 — "2 tane niye şey var ya": atlanan altı pasif

Kullanıcı ekran görüntüsü attı: Temel moddayken yalnız **iki** efekt görünüyor —
Dayanıklılık IV ve Yavaş Düşme. *"Çeşitlilik dediğin… temel moddayken bile 4
tane olur mesela, diğerleri nerede? Bunun açıklamasını bekliyorum senden."*

## Açıklama: haklıydı, ben eksik aktarmışım

Ekrandaki iki ikon tabloyla birebir uyuşuyor — yani kod bozuk değildi. Ama
v5.6'da modun yalnız **yeteneklerini** aktarmışım; **pasiflerini** atlamışım.
Jar'da altı tane daha vardı, her biri ayrı bir mixin:

| kaynak | ne yapıyor |
|---|---|
| `EntityFireMixin.makeViltrumiteFireImmune` → `true` | ateş bağışıklığı |
| `EntityFreezeMixin.viltrumiteInfiniteAir` → `getMaxAirSupply()` | hava bitmiyor |
| `PlayerStatsMixin.reduceExhaustion` → `× 0.005f` | açlık 200 kat yavaş |
| `PlayerStatsMixin.onTick` → `heal(getHealFactor())` | tick başına 1 can |
| `LivingEntityStatsMixin.rejectDebuffs` → `HARMFUL` reddi | zararlı etki bağışıklığı |
| `PlayerFreezeMixin.viltrumiteCannotFreeze` → `false` | donma bağışıklığı |

v5.6'da aktarılan %97 indirim ve %0.5 eşiği zaten **ikon üretmiyor** (script
kancası), o yüzden ekranda görünmüyorlardı. Ama bu altısı asıl eksikti.

**Temel'in efekt sayısı 2 → 6.**

## İkisi neden efekt değil script

- **Zararlı etki bağışıklığı** — Bedrock script API'sinde *"bu efekt zararlı mı"*
  diye bir soru yok (Java'daki `MobEffectCategory` karşılığı yok). Liste
  `VILT_ZARARLI_EFEKTLER` içinde **açıkça** yazılı ve tek tek siliniyor. Test iki
  yönden bakıyor: listede yanlışlıkla faydalı bir efekt var mı, ve Temel kendi
  verdiği bir efekti bir saniye sonra siliyor mu.
- **Yenilenme** — kaynak her tick `healFactor` (1.0) kadar iyileştiriyor.
  `regeneration` efektinin Bedrock'taki aralığını (`50 >> amp` mi, `50/(amp+1)`
  mi) bu ortamda **ölçemiyorum**; tick başına 1 can gibi kesin bir sayıyı tahmine
  dayalı bir `amp`'e bırakmak istemedim. İş script'te, kaynakla birebir; efekt
  yalnızca **gösterge**. Çakışmıyorlar, can tavanda kesiliyor.

Tarama her tick dönmüyor (bütçe), geçen tick sayısıyla **çarpılıyor** — ortalama
hız kaynakla aynı kalıyor. Işın lazerlerindeki *"saniyelik hasar aynı kalsın"*
kuralının aynısı.

## Aktarılamayan: donma bağışıklığı

`viltrumiteCannotFreeze`'in Bedrock'ta ne efekti var ne de script'ten
okunabiliyor — powder snow donması bir efekt değil. Özet bunu **vaat etmiyor**;
test de vaat etmediğini sınıyor, yani biri sonradan sessizce yazamaz.

## Testler

`viltrumite.mjs` 9. bölüm kazandı. Üç kasıtlı bozmayla doğrulandı:

| bozma | testin dediği |
|---|---|
| zararlı efekt silmeyi kapat | `✗ zehir silindi` · `✗ solma silindi` |
| iyileşmeyi tick ile çarpma | `✗ ilk taramada tarama aralığı kadar iyileşme :: 1 can / 10 tick` |
| `regeneration`'ı zararlı listesine koy | `✗ Temel kendi verdiği efekti silmiyor` |

---

# v5.6 — ViltrumiteCore, sadece Temel zırha

Kullanıcı: *"bu mod **sadece** temel zırhla birleştirilecek, diğer hiçbir
şekilde başka bir şeyle değil… çünkü ben temel zırhın zayıf olduğunu
düşünüyorum."*

Ayrıntılı döküm: [`REFERANS_VILTRUMITE.md`](REFERANS_VILTRUMITE.md).

## 1. Temel gerçekten zayıftı

v4.95'te ölçülen tabloda Temel'in tek sahip olduğu şey `Direnç III +
slow_falling`'di. Diğer sekiz modun **hepsi** aynı ikilinin üstüne bir şey
koyuyordu — ışın, uçuş, görünmezlik, su gücü. Temel, adı üstünde, tabandı.
Kullanıcının tespiti doğruydu.

## 2. Sayılar yine hafızadan değil

Modda yapılandırma dosyası yok. İki kaynak okundu:

- **bytecode** — `ViltrumiteCoreConfig` kurucusu: `damageReductionPercent
  97.0f`, `damageIgnoreThreshold 0.5f`, `punch/dashBlockDropChance 40.0f`,
  `spaceLimitY 1500.0d`; `PlayerStatsMixin.onInitStatTracker`:
  `STAT_BASE_DAMAGE 19.0f`.
- **modun kendi tooltip'leri** — yüzdeler orada yazıyor: *"200% of your base
  attack damage… up to 500%"*, *"175%… 43.75% every second"*, *"Absorbs 70%"*.

Yani on yeteneğin her sayısı, kaynağın hangi cümlesinden geldiğiyle birlikte
`ayarlar.js`'te duruyor.

## 3. %97 indirim Bedrock'a nasıl sığdı

Sığmıyor: Direnç tavanı `amp 3` (%80), `amp 4` tam bağışıklık ve StarOxine'e
ayrılmış. Kalan kısım hasar olayından geri kazandırılıyor — teknoloji
zırhlarındaki kalıbın aynısı.

Oran **türetildi**, elle yazılmadı:

```
geri = gelen × (1 − (1 − 0.97) / (1 − 0.80)) = gelen × 0.85
```

Test tersinden ölçüyor: `1 − (1−0.80)×(1−0.85) = 0.97`. Davranış da ölçülüyor:
100 ham hasarda oyuncuya net **3 hasar** kalıyor; Savunma Duruşu açıkken
**0.90**.

## 4. Test kendi kendini yalanladı, kod değil

İlk yazdığımda sınama "0.00 hasar" gösteriyordu. Sebep koddaki bir hata
değildi: `entityHurt` bir **sonra** olayı — oyun canı zaten düşürmüş oluyor,
kanca yalnızca geri ekliyor. Mock canı 20'de bırakıp kancayı çağırıyordu,
`canEkle` tavana takılıyordu. **Sınama yanlıştı.** Hasar önce uygulanacak
şekilde düzeltildi ve gerekçesi testin içine yazıldı.

## 5. "Sadece Temel" bir yorum satırı değil

Kullanıcının şartı liste olarak değil **davranış** olarak sınanıyor: Titan
çekirdeği elindeyken on yeteneğin onu da reddediyor mu. Kapı tek yerde
(`viltrumiteVar`), çünkü yetenekler menüden de seçilebiliyor — Marvel
mekaniklerindeki kalıbın aynısı.

Üç kasıtlı bozmayla doğrulandı: kapıyı kaldırınca, geri kazanım oranını elle
yazınca, bir yeteneği Titan'a da bağlayınca — üçünde de test kırmızı yandı.

## 6. Diğer sekiz zırh iki katına çıktı

Kullanıcı bu kararı bana bırakmıştı: *"fazla güçlü olursa diğer zırhların
gücünü iki kat daha arttır, bu tamamen senin kararın."* Fazla güçlü oldu.

Bedrock'ta seviye = `amplifier + 1` ve etki doğrusal, yani
`yeni_amp = 2 × eski_amp + 1`. Güç V → **Güç X**, Hız V → **Hız X**, Titan'ın
Güç XXVII'si → **LIV (+162)**, ışınlar **×2** (800 ve 2000).

**İki şey ikiye katlanamadı ve bu gizlenmiyor:**

1. **Direnç** — III'ün iki katı %120 ederdi. Tavana (IV, %80) çıktı. Yani
   "iki kat" değil "tavan".
2. **Seviyesiz efektler** — görünmezlik, su altında nefes, gece görüşü, ateş
   bağışıklığı, su gücü, düşme hasarı. Açık ya da kapalı, ara değeri yok.

Bunun bir sonucu var: **artık Titan, Temel'den daha dirençli değil.** İkisi de
Direnç IV. `zirh.mjs`'te bunu sınayan satır (eskiden `titan > temel`)
silinmedi, yeni gerçeği sınayacak şekilde güncellendi — ve yanına Temel'in
net indiriminin gerçekten %97 olduğunu ölçen bir satır eklendi.

Aynı şey 6. bölümdeki "sayılar kaynakla birebir" sınamaları için de yapıldı:
"tam iki kat" sınamasına çevrildiler, yani kazara değişirse yine yakalanır.

## 7. Aktarılamayanlar

- **`speed_lock`** ve **Cruise Flight'ın bloktan geçme / aşırı ısınma
  parçaları** — uçuşumuz efekt tabanlı, anlık hız okunamıyor.
- **`spaceLimitY = 1500`** — Bedrock tavanı zaten 320. Çalışmayan ayar
  bırakmıyoruz, alınmadı.
- **Savunma'nın yön şartı** — `entityHurt` hasarın geldiği yönü vermiyor.
  Bizde savunma her yönden koruyor; özet de öyle yazıyor.
- **Blok kırma konisinin boyutu** — `blokIste()` bütçesi var, koni kasten
  küçük.

**Hedef Kilidi** aktarıldı ama bir kaydı var: Bedrock'ta kamerayı döndürmenin
tek yolu `teleport(konum, { facingLocation })`. Marvel modu da aynı çağrıyı
kullanıyor. Tablette takılma yapıp yapmadığı denenmeli.

## 8. Bilinen sınır

`entityHurt` bir *sonra* olayı. Tek seferde canını sıfıra indiren çok büyük bir
vuruşta geri kazanım yetişmeyebilir. Teknoloji zırhlarının `olmezlik`'i tam da
bunun için var ve aynı yolu kullanıyor, yani yol denenmiş — ama Viltrumite'ta
ölçülmedi. Tablette bakılacak tek nokta bu.

---

# v5.5 — "Karakter bildiğin dans ediyor": dövüş animasyonları onarıldı

Kullanıcı iki ekran görüntüsü attı: uzuvlar gövdeden kopmuş, havada
dağılmış. *"Bu nedir ya, düzelt bunu lütfen, sadece bunu düzelt."*
Epic Fight ve WeaponsOfMiracles jar'larının orijinallerini de yolladı
*"ki farklar netleşsin"*.

Üç ayrı hata vardı, üçü de aynı görüntüyü üretiyordu. Hiçbiri tahminle
bulunmadı — hepsi ölçüldü.

## 1. Asıl sebep: Euler dal atlaması

Bedrock kareler arasını **her eksen için ayrı ve düz** geçiyor. Euler
ayrıştırması ise süreksiz: aynı dönüş hem `[179.71, 72.66, 179.87]` hem
`[-179.85, 65.95, 177.82]` diye yazılabilir. Gerçek fark **0.4 derece**,
ama Bedrock birinciden ikinciye düz gidiyor: **359.6 derecelik savrulma**.

v5.4 dosyasında ölçüldü: 7470 kare geçişinin

| | sayı |
|---|---|
| 90 dereceden büyük sıçrama | 363 |
| 180 dereceden büyük | 147 |
| 270 dereceden büyük | 90 |
| en kötüsü | saniyede **7049 derece** |

Dans buydu. `euler_surekli()` her karede iki eşdeğer çözümden
(`(x, y, z)` ve `(x+180, 180−y, z+180)` — ikisinin aynı matrisi verdiği
3000 rastgele dönüşle doğrulandı, hata 0.0) öncekine yakın olanı seçip
360'ın katlarıyla kaydırıyor. Sonuç: **180'i aşan sıçrama 0**.

## 2. Root atılıyordu

Çevirici Epic Fight'ın `Root` eklemini hiç okumuyordu. 63 animasyonun
**60'ında** Root ekseninde 20 dereceden fazla, en çok **88.8 derecelik**
bir gövde dönüşü var — savurarak dönen vuruşlar.

Kafa ve bacaklar Root'un çocuğu oldukları için onu **dengeleyen** ters
dönüşler taşıyor. Ölçüldü: `axe_auto1`'de Root Y = −60.3 iken Head
Y = +58.6. Root atılınca dengeleme ortada kalıyor ve kafa 113 derece
savruluyordu.

## 3. `GOVDE_CIKAR` ters yönde çalışıyordu

v5.0'ın yorumu *"Bedrock'ta rightLeg, body'nin çocuğu"* diyordu. Değil.
Marvel Project'in 46 oyuncu modeli ölçüldü, hepsinde aynı:

```
root  (0,0,0)
 ├ waist (0,12,0)
 │   └ body (0,24,0)
 │       ├ head     (0,24,0)
 │       ├ rightArm (-5,22,0)
 │       └ leftArm  (5,22,0)
 ├ rightLeg (-2,12,0)
 └ leftLeg  (2,12,0)
```

Bacaklar `body`'nin **kardeşi**. Epic Fight'ta da öyle (`Thigh_R`,
`Root`'un çocuğu). Yani çıkarılacak bir şey yoktu; çıkarma bacaklara
gövdenin tersini **ekliyordu**.

İki iskelet aynı yapıda çıkınca eşleme bire bir oldu:
`Root→root`, `Torso→waist`, `Chest→body`, `Head→head`,
`Shoulder·Arm→kol`, `Thigh·Leg→bacak`. Katlama yok, çıkarma yok.

## 4. Önizleme yalan söylüyordu

`onizle_poz.py` bacakları `body`'nin çocuğu çiziyordu — yani çevirinin
**aynı yanlışını** doğruluyordu. Bu yüzden hatayı hiç yakalayamadı.
Ayrıca kareler arasını çizmiyordu, sadece anahtar kareleri; dans tam da
aralarda oluyordu. İkisi de düzeltildi: gerçek 8 kemikli iskelet ve
Bedrock'un yaptığı düz ara değer.

Önce Root'u `body`'ye katlamayı denedim. Sayılar temizdi, önizleme
yalanladı: `body`'nin dönme merkezi **boyun**, `root`'unki **ayak**.
Gövdeyi boyundan döndürünce torso kafanın altından kayıyor — düzeltmeye
çalıştığımız görüntünün aynısı. Görmeden anlaşılmazdı.

## 5. Kaynakta iki tuhaflık, ikisi de ölçüyle bulundu

**Kombo devamı.** Kaynak animasyonlar bir seri: `auto_2`, `auto_1`'in
bitirdiği açıdan başlıyor. 63 animasyonun yalnız 12'si root'u sıfıra
yakın başlatıyor, **15'i 90 dereceden fazla dönmüş** başlatıyor
(`orbit_attack_1`: 173 derece). Epic Fight'ta sorun değil — varlık zaten
oraya dönmüş. Bedrock'ta oyuncunun yönü kameranın, yani 173 derece bir
anda dönmek demek.

**Eksen düzeni.** `longsword_auto1/2/3` Root'u Y-yukarı düzeninde
taşıyor, bağlama pozu Z-yukarı. Ölçüldü: o üç dosyada `D(Root)·e_y` =
`(0, −0.1, −1.0)` — **sabit** ve 95 derece yatmış; diğer 60 dosyada
`e_y`'ye yakın. Sabit olması bunun animasyon içeriği değil eksen düzeni
olduğunu söylüyor. Root katlanınca karakter yatıyordu.

İkisi de root'un **soldan çarpılan sabit bir çarpanı**. `D(Root,t₀)⁻¹`
ile çarpmak ikisini birden götürüyor: sabit sadeleşiyor, animasyonun
kendi dönüşü duruyor. Eşik yok, tahmin yok. Önce eşikli bir "eksen
düzeltmesi" yazmıştım; sıfırlama onu tamamen kapsayınca sildim —
çalışmayan ayar bırakmıyoruz.

## 6. Katman çakışması

Bedrock `playAnimation` çıktısını vanilla animasyonların **üstüne
ekliyor**: `move.arms`, `attack.rotations`, `bob`, `holding`, `sneaking`.
Vuruş animasyonu tam da vanilla vuruşla aynı anda oynadığı için iki
hareket toplanıyordu.

`override_previous_animation: true` bu animasyonun **yazdığı** kemikleri
toplamak yerine değiştiriyor, yazmadıklarına dokunmuyor. Referans
paketlerde 87 animasyon böyle yapıyor — aralarında bu depoya zaten
aktardığımız Ben 10 modunun tam gövde pozları.

## 7. Modellerin yarısında iskelet yoktu

Kendi ürettiğimiz 23 modelde (Ben 10 uzaylıları, omnitrix) **hiç ebeveyn
yoktu**; 11'inde (zırh modları, O Şey) bacaklar `body`'nin çocuğuydu.
Gövde dönünce kafa ve kollar yerinde kalıyordu — kopmanın öteki yarısı.

`kol_uret.py:insan_hiyerarsisi()` tek yerde onarıyor, çünkü geometri
dosyaları altı ayrı yerden yazılıyor. Yalnız **sapmayı** düzeltiyor:
kaynak modların bilerek kurduğu özel bağlar (Marvel'in `rotation`
kemiği, 10 modelde) olduğu gibi kalıyor.

Bu da bir tuzak çıkardı: **Elmas Kafa'da zaten `root` adında bir kemik
var** — kafadaki kristal, `head`'in çocuğu, 3 küp. Onu iskelet kökü
sanıp gövdeyi ona bağladım ve bütün vücut kafadan sarktı. Aynı tuzak
`head`/`body` için `BEN10_KEMIK` tarafında zaten çözülmüştü. Ölçüt:
gerçek iskelet kökü ebeveynsiz ve küpsüzdür; öyle değilse `_ic` ekiyle
yeniden adlandırılıp çocukları yeni ada bağlanıyor.

Sonuç: 74 insansı modelin **74'ü** doğru hiyerarşide, döngü yok, eksik
ata yok.

## 8. Yay sıklaştırma

Kaynak kareler arasında 100 dereceyi geçen dönüşler var (`agony_auto_4`:
Root 0.083 saniyede 118 derece). Epic Fight arasını **kuaterniyonla**
geçiyor, Bedrock euler eksenlerini tek tek düz birleştiriyor. 170
derecelik bir yayda iki yol çok ayrılıyor: uzuv doğru yere varıyor ama
**yanlış yoldan**.

Artık ara değeri biz hesaplıyoruz (kaynağın kendi yöntemiyle, slerp) ve
çıktı karelerini yay 45 dereceyi geçmeyecek kadar sıklaştırıyoruz.
7848 kare → 9927 kare. Depolama sorun değil — kullanıcının açık kuralı.

## 9. Ölçülen sonuç

| | v5.4 | v5.5 |
|---|---|---|
| 180 dereceyi aşan kare sıçraması | 147 | **0** |
| ara değer hatası > 30 derece | 177 | **0** |
| ara değer hatası > 10 derece | 225 | **0** |
| en kötü ara değer hatası | 350° | **7°** |
| root taşıyan animasyon | 0 | 63 |
| doğru hiyerarşideki insansı model | 40/74 | **74/74** |

## 10. Testler

`wom_dovus.mjs`'e dört denetim eklendi: ardışık kareler arasında 180
dereceyi aşan sıçrama yok · hepsi `override_previous_animation` ile ·
root ilk karede sıfır · kemik adları vanilla iskeletin tamamından.

`anim_tara.py` (bütün paketi tarayan kalıcı tarayıcı) iki denetim
kazandı: kare sıçraması ve insansı iskelet düzeni.

**Tam tur istisnası**: `drill_spin` bilerek 0 → −360 dönüyor (loop,
0.25 saniyede bir tur). Yani büyük sıçrama tek başına hata değil. Ayrımı
ölçen kural: gerçek tam tur **tek eksende**, **tam 360'ın katı**, öteki
iki eksen **sabit**. Dal atlamasında hepsi oynuyor ve tur tam çıkmıyor.
Kural v5.4 dosyasında sınandı: 147 bozuk geçişin **147'sini** yakalıyor,
`drill_spin`'in 2 gerçek turuna dokunmuyor.

Testler bozuk v5.4 verisiyle **geri koşuldu**: 147 hata veriyor,
düzeltilmiş veriyle 0. Yani gerçekten bu hatayı bekliyorlar.

## 11. Ne yapılmadı

- Epic Fight'ın `hold_*` / `walk_*` / `run_*` / `*_aim_*` setleri hâlâ
  alınmadı (jar'da 62 `living` + 121 `combat` dosya var; v5.0 yalnız
  saldırı kombolarını almıştı). Kullanıcı *"sadece bunu düzelt"* dediği
  için bu sürümde açılmadı.
- Dirsek bükülmesi hâlâ kayıp: Bedrock'ta kolu taşıyan tek kemik var,
  Epic Fight'ta zincir (`Shoulder → Arm → Elbow → Hand`). Aktarılan şey
  kolun genel yönü.
- Root'un **ötelemesi** alınmıyor (en çok 15 blok —
  `blackstar_basic_attack_4` bir atılış). Bedrock'ta oyuncunun yerini
  oyun belirliyor; modeli kaydırmak karakteri gövdesinden ayırırdı.

---

# v5.4 — Mahou Tsukai: mana, 16 eşya, 20 büyü

Kullanıcı: *"bir tane daha mod buldum, bunu da ekle aynı şekilde...
kalıcı olarak aktar."*

Ayrıntılı döküm: [`REFERANS_MAHOU.md`](REFERANS_MAHOU.md).

## 1. 448 ayar, tek bir tahmin

`mahoutsukai 1.21.1 v1.36.27`'nin bütün sayıları tek bir sınıfta duruyor:
`MTConfig$Server`. 448 ayarı `intconfig`/`doubleconfig`/`booleanconfig`
çağrılarıyla tanımlıyor. `mahou_coz.py` bytecode'u okuyup her ayarın
varsayılanını çıkardı, `mahou_config.json` olarak depoya girdi ve test
otuzdan fazlasını oradan geri okuyup karşılaştırıyor.

**Tek tahmini sayı**: Varlık Gizleme büyüsünün 100 manası — kaynakta o
büyünün ayrı bir mana ayarı yok. Özette *"bedeli tahmini"* yazıyor ve test
bu ibarenin orada kaldığını sınıyor, yani biri sessizce silemiyor.

## 2. Mana modun kalbi, bizde de öyle

Modda her büyünün bedeli var ve manan yoksa büyü çalışmıyor. Bunu
almasaydık yirmi büyü yirmi bedava düğmeye dönerdi.

Bedeller kaynağın kendi ayarları: Gandr 5, Yükseliş 30, Fay Görüşü 100,
Kehanet 220, Kara Alev 300, İçgörü 320, Ölüm Toplama 400, **Düşüş 2000**.
Yani ucuz büyü çok, pahalı büyü az kullanılır — modun dengesi bu.

Yarım ödeme yok: ya bedelin tamamı iner ya hiçbir şey olmaz.

## 3. Test yine gerçek bir hata buldu

`manaYaz` ilk yazımda `setDynamicProperty` yoksa `hataYaz` çağırıyordu.
Tarama testi yakaladı:

```
✗ hicbir yetenek HATA GUNLUGE dusurmedi
  :: HATA @ mahou.manaYaz: oyuncu.setDynamicProperty is not a function
```

Bu sessiz bir felaket olurdu: Content Log saniyede üç kez, **her oyuncu
için** dolardı ve gerçek hatalar içinde kaybolurdu. Artık eksiklik bir kez
ölçülüyor, bir kez bildiriliyor, mana bellekteki deftere düşüyor.

Bir de ikinci kez aynı tuzağa düştüm ve test yakaladı: The Ripper'ın
hasarı tam **2.5** ve testi JS'in `Math.round`'uyla yazmıştım (2.5 → 3),
üreteç ise Python'unkiyle (2.5 → 2). Hata kodda değil **testteydi** —
v4.96'da konan kural açık: **eşitlik aşağı yuvarlanır**, kaynaktan
fazlasını asla verme. Iron Man Mk85'te de tam bu olmuştu.

## 4. Ne alınmadı

- **Büyü çemberleri** — modun asıl arayüzü yere çizilen çember. Bedrock'ta
  blok deseni okuyup ritüel çalıştırmak ayrı bir sistem; büyüler bizde
  parşömeni tutup tetikleniyor.
- **Büyüyen kılıçlar** — Caliburn/Clarent/Morgan bir ritüelle güçleniyor
  (tavan 5.000.000 hasar). Ritüel yok, kılıçlar taban güçleriyle geliyor.
- **Familya, Gerçeklik Mermeri, Kadeh** — kendi boyutları var.
- **William** — modda 2B ikonu yok (`builtin/entity` ile çiziliyor), yani
  alınacak piksel yok. Uydurma ikon çizmek yerine aktarılmadı; test bunun
  böyle kaldığını sabitliyor.

Parşömenlerin hepsi tek ikonu paylaşıyor — **kaynakta da öyle**, 45 büyü
için 45 ikon yok. Farklı görünsünler diye ikon uydurmadık.

---

# v5.3 — Kahraman mekanikleri ve animasyon taraması

Kullanıcı beni düzeltti ve haklıydı:

> *"Duvar tırmanma, ağ sallanma, boy değiştirme, faz geçişi, kuvvet alanı,
> portallar... bunları almayacaksan zaten kahraman diye bir şey kalmıyor,
> kostüm oluyor. Kahramanda özellik denilen bir şey kalmıyorsa o kahraman
> değil, normal insandır, normal bir oyuncudur."*

v5.2'de bunlara *"Bedrock'ta oyuncuya efektle verilemiyor"* demiştim.
Cümle doğruydu ama **yanıltıcıydı**: mod bunları efektle değil **script'le**
yapıyor, ve mod zaten Bedrock. Yani aktarılabilirler. Aktarıldılar.

## 1. Sekiz mekanik, hepsi kaynağın kendi sayılarıyla

| mekanik | kaynak satırı | değer |
|---|---|---|
| tırmanma | `black_panther.js:72` | ×0.5 |
| ağ sallanma | `spiderman/swing.js:42` | ×3.5, çengel menzili 72 |
| süzülme | `swing.js:159,165` | ×1, dikey −0.1 |
| atılma | `swing.js:218` | ×4 |
| sıçrayış | `swing.js:189` | ×8 |
| faz geçişi | `ghost/ghost.js:24` | (bkz. aşağıda) |
| kuvvet alanı | `sue_force_physics.js:3-13` | 12/16/4/3/2/10, yavaşlık amp 1 |
| boy değiştirme | `entities/player.json` | 0.05 / 1.0 / 5.0 |

22 kahramana dağıldı: tırmanma 10, atılma 13, ağ 5, sıçrayış 3, faz 2,
kuvvet alanı 1, geçit 1, boy 1.

İtme biçimi de kaynağınkiyle aynı:
`applyKnockback(dx, dz, hypot(dx,dz), dy)`. `applyImpulse` oyuncularda
işlemiyor — bunu bu depo v4.x'te ölçmüştü, mod da her yerde
`applyKnockback` kullanıyor.

## 2. Depoda ilk kez bir BP oyuncu varlığı var

Bedrock'ta oyuncunun **ölçeğini script değiştiremiyor**; yalnız bileşen
grubu değiştirebiliyor. Ant-Man'in boy değiştirmesi için
`Simsek_TNT_ToprakTopu/entities/player.json` üretiliyor: 22 vanilla
bileşen + 3 ölçek grubu + 3 olay.

`components` bloğu **modun kendi dosyasından birebir** alındı (1979 bayt).
Elle yazmadım: eksik bir bileşen oyuncuyu bozar ve hatası çok geç anlaşılır.
Modun `player.json`'u 272 KB ve 612 olay taşıyor; bize yalnız üç ölçek
grubu lazımdı, gerisi başka kahramanların makinesi.

Bu, `canli.mjs`'in "her sunucu varlığının istemci tanımı olmalı" kuralını
düşürdü. Kural doğru ama bu varlık onun dışında: oyuncunun istemci tanımı
ayrı bir pakette (`Simsek_Oyuncu_Modeli`, v4.90 kararı) ve BP tanımımız
oyuncuyu yeniden **çizmiyor**. İstisna teste yazıldı, ayrıca korunuyor:
o paketin gerçekten var olduğu ve BP tanımının çizim bileşeni taşımadığı
sınanıyor.

## 3. İki yerde kaynaktan saptım — ikisi de yazılı

- **Faz geçişi**: kaynak önce geri (×−1) sonra ileri (×2.5) itiyor, yani
  duvarın içinden geçirmiyor, hızla geçip gidiyor. Bedrock'ta salt itme
  duvarda takılıyor; bizimki duvarın **ötesindeki ilk boş yere ışınlıyor**.
  Kaynağın itme çarpanını sabit olarak bile yazmadım — ölü bir sabit
  "aktarıldı" izlenimi verirdi.
- **Portal**: kaynakta iki ucu olan gerçek bir varlık (384 satır, kendi
  varlığı ve iki uç arası taşıma). Bizdeki tek atışlık. Adı bu yüzden
  "portal" değil **"geçit"**.

## 4. Animasyon taraması: bir gerçek bulgu

Kullanıcı *"animasyonlara çok önem veriyorum"* dedi, ben de taramayı
kalıcı teste çevirdim (`test/animasyon.mjs`). Dokuz şeye bakıyor: JSON
geçerliliği, `animation.` öneki, aynı pakette çift kimlik, iki paket
arasında **ayrışmış** kimlik, tanımsız animasyon, `scripts.animate`'te
tanımsız kısa ad, kare biçimleri, `animation_length` aşımı ve **animasyonun
yazdığı kemiğin modelde olup olmadığı**.

Son madde gerçek bir bulgu verdi:

```
animation.simsek_kol.birinci_sahis: modelde OLMAYAN kemige yaziyor: rightitem
```

**Altı kolun tutuş animasyonu dört sürümdür hiçbir şey yapmıyormuş.**
`geometry.simsek_kol`de `rightitem` diye bir kemik yok (kemikler:
`RightArm`, `kol`). Eski yorum *"referans mod da aynen böyle gönderiyor ve
çalışıyor"* diyordu; referans modda da çalışmıyormuş, sadece kimse bakmamış.

Ölü kodu sildim. **Kemiği eklemedim**: eklemek animasyonu canlandırır ve
kolun duruşu değişir — bu görsel bir değişiklik ve bu depoda görsel
değişiklikler görülmeden yapılmıyor. Ölçülmüş değerler `kol_uret.py`'de
yorumda duruyor.

Tarayıcının kendisi de üç kez yanlış alarm verdi ve düzeltildi: Bedrock'un
`{"vector":[...], "easing":...}` kare biçimini bilmiyordu (805 sahte hata),
oyuncu varlığının **bütün** geometrilerine değil yalnız `default`ına
bakıyordu (4 sahte hata), ve WOM serisini kaba bir regex'le okuyordu
(69 sahte uyarı). Tarayıcı da test edilmesi gereken bir koddur.

Kalan 35 "şüphe" bozukluk değil: kaynak modlardan gelen ve henüz
bağlanmamış animasyonlar (Diamondhead kalkanı/kılıcı, Omnitrix çevirmeleri,
Ripjaws ısırığı). Kullanıcı *"kütüphanelerden ödün verme"* dediği için
silinmediler; yalnız sayıları teste sabitlendi ki sessizce artmasınlar.

---

# v5.2 — Marvel Project: Fisk gitti, 268 parça geldi

Kullanıcı bir `.mcaddon` attı ve kapsamı net söyledi: *"bu sefer
uğraşmana gerek kalmayacak çünkü bedrock üzerine kurulu. Eski
kahramanları tamamen atıyoruz, Fisk modunu boş veriyoruz artık. Onun
yerine bunu ekle, bunun tüm kahramanlarını."*

Ayrıntılı döküm: [`REFERANS_MARVEL.md`](REFERANS_MARVEL.md).

## 1. Bu sefer gerçekten kolaydı — ve bunun bir anlamı var

Önceki beş sürümde kaynak ya Java bytecode'uydu (WoM, ProjectE,
Mekanism, Draconic) ya Palladium JSON'u (Ionstrike, AlienEvo) ya da
Blender mesh'i. Her seferinde çevirdik, ölçtük, çizip baktık.

Marvel Project **zaten Bedrock**. Geometri, doku ve ikon doğrudan
kullanılabiliyor; güçlerin kodu da okunabilir JavaScript (92 dosya,
13.756 satır). Sonuç: bu sürümde **tek bir sayı bile tahmin edilmedi**.

Çıkarma `marvel_coz.py` ile bir kez yapıldı, sonucu depoda
(`marvel_tablo.py`, `kaynak_geo/marvel/`, `kaynak_doku/marvel/`).
`kol_uret.py` moda hiç bakmıyor.

## 2. Fisk gerçekten gitti

"Yerine yenisini koydum" demek yetmiyordu. Silinenler: dokuz kahraman,
yedi ışın, kostüm geometrisi, dokular, ikonlar, `kahraman.js`,
`kaynak_doku/kahraman_coz.py`, `REFERANS_FISK.md`, `ayarlar.js`'teki 226
satırlık blok, `main.js` menüsü ve `kollar.js` bağlamaları.

`test/marvel.mjs`'in **1. bölümü kalıntı arıyor**: üretilen klasörlerde
`kahraman` geçen dosya, `ayarlar.js`'te eski sabitler, dil dosyasında
kalmış satır. Denedim — `textures/item/` altına sahte bir
`kahraman_test.png` koyunca test düşüyor. Zaten bir gerçek kalıntı
buldu: `models/entity/kahraman_kostum.geo.json`. Üretecin temizlik adımı
`models/entity`'ye bakmıyordu.

## 3. Üçlü kalıp korundu

Kaynakta bir kahraman üç parçadan oluşuyor:

| tür | yuva | ne taşıyor |
|---|---|---|
| kostüm | ayak | görünüş + zırh |
| maske | kafa | görünüş + zırh |
| güç | bacak | **yetenek** |

Üçünü tek eşyada birleştirmek daha kolay olurdu ama modun dengesini
bozardı: kostümü giyip gücü takmamak kaynakta geçerli bir seçim. 268
parça: 142 kostüm, 85 maske, 41 güç, 54 kahraman.

## 4. Çift alt çizgi

Kimlik biçimi `pa:mrv_<kahraman>__<anahtar>`. Ayıraç çift, çünkü hem
kahraman adında hem anahtarda tek alt çizgi var (`black_panther`,
`ironman_mark50`).

Bunu da denedim: ayıracı tek yapınca 54 kahraman **51'e** düşüyor,
`black_panther_suit` "black" kahramanının eşyası sanılıyor ve 19
kahramanın güç kümesi kayboluyor. Test dördünü de yakalıyor.

Kazancı: **268 satırlık bir eşleme tablosunu iki yerde tutmak
gerekmiyor** — kimlik kendi kahramanını söylüyor.

## 5. On bir kahramanın güç eşyası yok, ve bu bir hata değil

Iron Man, Doctor Strange, Falcon, Star-Lord, White Tiger, Taskmaster,
Punisher, Winter Soldier, Ms. Marvel, Muse, Guardians — modda güç
eşyaları **yok**, güçleri kostümün kendisinde.

İlk yazdığımda `kollar.js` hepsine `mrv_<kahraman>__<kahraman>_powers`
diye bir eşya bağlamıştı. O eşyalar üretilmiyordu; yani menüde görünen,
envanterde olmayan satırlar. Test yakaladı:

```
✗ baglanan guc esyalarinin hepsi uretildi
  :: pa:mrv_ironman__ironman_powers | pa:mrv_dr_strange__dr_strange_powers
```

Çözüm iki parçalı: `ayarlar.js`'te `gucKostumden` işareti, ve
`guctekiKahraman` o kahramanlarda **ayaktaki kostüme** bakıyor.
Uydurma bir güç eşyası üretmedik.

## 6. Takma adın yönü

Kaptan Amerika'nın güç eşyası kaynakta `super_soldier_powers`. İlk
denemede hem `captain_america` hem `super_soldier` girdisini
`MARVEL_GUCLER`'e koymuştum ve `MARVEL_TAKMA_AD` **ölü kaldı** — iki ad
da kendi kümesini bulduğu için takma ad hiç çalışmadı. Test bunu da
yakaladı (`gucKumesi("captain_america") === gucKumesi("super_soldier")`
tutmuyordu).

Artık yön tek: soldaki karşılığı olmayan ad, sağdaki gerçek güç kümesi.

## 7. Aktarılamayanlar

Duvar tırmanma (10 kahramanda `*_climb`), ağ sallanma/kanca, boy
değiştirme (Ant-Man), faz geçişi, kuvvet alanı, portallar — hepsinin
kaynakta kendi varlık sistemi var, Bedrock'ta oyuncuya efektle
verilemiyor. Özetler bunları vaat etmiyor.

Bir de görünüş varyantları: modun attachable'ları kendi varlık
özelliklerine (`arathnido:SuitTexture0`) bakıp bir kostümün altı dokusu
arasında geçiyor. O özellikler bizim pakette yok; render controller'lar
`controller.render.armor`'a çevrildi (v4.28'de öğrenilen, çalıştığı
bilinen yol) ve varsayılan doku alındı.

---

# v5.1 — Teknoloji zırhları: ProjectE, Mekanism, Draconic Evolution

Kullanıcı üç jar attı ve kapsamı kendisi daralttı: *"bunlar direkt zırh
modları değil ama bizim odaklanacağımız şey bunların verdiği zırhlar,
sadece onları alacağız, hiçbir şeyi almayacağız onlardan başka. Ayrıca
zırh verdiği özellikler falan varsa alabildiklerini al, Java ile Bedrock
farklı olduğu için alabildiğini al."*

Alınan: **19 zırh parçası**, 7 takım.
Alınmayan: makineler, kablolar, enerji ağı, EMC/dönüştürme, modül
eşyaları, aletler, silahlar. Hiçbiri.

Sayıların nereden okunduğu: [`REFERANS_TEKNOLOJI.md`](REFERANS_TEKNOLOJI.md).

## 1. Bunlar çekirdek değil, gerçekten giyilen zırh

Max Steel çekirdeği **elde** tutuluyordu. Sebebi teknik: o bir *dönüşüm*
ve görünüşü süren Molang sorgusu (`query.get_equipped_item_name`) yalnız
el yuvalarını okuyabiliyor.

Bunlarda dönüşüm yok. Görünüşü attachable çiziyor (Molang'a gerek yok) ve
script zırh yuvalarını `equippable` ile rahatça okuyor — kısıt yalnız
Molang'daydı. Kaynakta zırh, bizde de zırh.

| takım | mod | parça | zırh |
|---|---|---|---|
| Kara Madde | ProjectE | 4 | 20 |
| Kızıl Madde | ProjectE | 4 | 20 |
| Mücevher | ProjectE | 4 | 20 |
| MekaSuit | Mekanism | 4 | 20 |
| Wyvern / Draconic / Chaotic Göğüslüğü | Draconic | 1'er | 8 |

## 2. %90 azaltma: Direnç IV yetmiyordu, açık bırakılmadı

ProjectE'nin Kızıl Madde ve Mücevher takımları kaynakta **%90** azaltıyor.
Bedrock'ta "yüzde şu kadar az hasar al" diye bir bileşen yok; olan şey
Direnç efekti ve o **seviye başına %20**. Tavan Direnç IV = %80; Direnç V
bağışıklık demek ve StarOxine'e ayrılmış.

Aradaki %10'u boş bırakmak, v4.95'teki *"çekirdekler vaat ettiklerini
vermiyor"* şikâyetinin aynısı olurdu. Onun yerine hasar **alındıktan
sonra geri kazandırılıyor**:

```
geriKazanım = 1 − (1 − azaltma) / (1 − 0.80)
```

Kızıl/Mücevher için 0.5 — alınan hasarın yarısı geri veriliyor, sonuç ham
hasarın %10'u. Kara Madde'de azaltma zaten 0.80, formül tam 0 veriyor ve
hiçbir şey olmuyor. Testte ölçülüyor.

Eksik parçayla azaltma da eksik: ProjectE'nin `getPieceEffectiveness`
kuralı (bot/başlık 0.2, göğüslük/pantolon 0.3) aynen taşındı. Yalnız
göğüslük takılıysa Kara Madde 0.8 × 0.3 = %24 veriyor, biz %20 —
**aşağı yuvarlandı**, kaynaktan fazlası asla verilmiyor.

## 3. MekaSuit'in %100'ü bilerek alınmadı

`mekasuit_absorption.json` 21 hasar türü için soğurma oranını **1.0**
veriyor. Ama kaynakta bu **enerjiye bağlı**: şarj bitince sıradan bir
netherite takımı. Bizde enerji sistemi yok (modu almadık, zırhı aldık),
yani %100 verirsek *hiç bitmeyen bir ölümsüzlük* olurdu — kaynakta olmayan
bir şey. Tavan %80'de bırakıldı ve özet de %80 diyor.

Ateş/lav/sıcak zemin ve düşme için karşılık **tam**: `fire_resistance` ve
`slow_falling` zaten %100 kesiyor, yani o hasar türlerinde kaynağın
verdiğinin aynısı.

## 4. MekaSuit'in modeli: 124 kutu, OBJ'den çevrildi

`assets/mekanism/models/entity/mekasuit.obj` — "Made in Blockbench 4.3.1",
yani **kutulardan** oluşuyor. Kutu olduğu için Bedrock'a birebir
çevrilebildi: `obj_coz.py`. Dört ayrı 32×32 doku tek 64×64 atlasta
birleştirildi, UV'ler ona göre kaydırıldı.

İki şey ölçülerek bulundu, tahmin edilmedi:

**Kutu çözümü.** İlk yazdığım "p0'a en yakın üç köşe kenardır" sezgisi
124 kutunun 98'ini eledi. Uzun ince bir kutuda köşegen, uzun kenardan
kısa olabiliyor. Doğru sınama: üç vektör birbirine **dik** olacak VE
toplamları en uzak köşeye eşit olacak. Sonra 124/124.

**X ekseni ters.** Blockbench'in OBJ çıkışı X'i çeviriyor. İlk çeviride
`chest_left_arm` x = −9…−3.5'e düştü; vanilla sol kol +4…+8 olmalıydı.
Ayna sarım yönünü de bozduğu için her yüzün köşe sırası da ters
çevriliyor. Testte sabitlendi: aynayı geri açınca test düşüyor
(denendi).

Doğrulama yine **çizerek** yapıldı (`onizle_doku.py`, yüz yüz gerçek
dokuyla): vizör, göğüs modülü, sırt egzo-iskeleti yerli yerinde.

## 5. Draconic'te dört parçalı takım YOK — uydurulmadı

1.20.4'te dört parça tek bir **Modüler Göğüslük**'e indirilmiş. Oyuna
kayıtlı zırh eşyası tam olarak üç tane: `wyvern_chestpiece`,
`draconic_chestpiece`, `chaotic_chestpiece`. Başlık/pantolon/bot yok, biz
de uydurmadık. (Eski takımın ikonları jar'da hâlâ duruyor ama eşyaları
yok — tuzak burada.)

**Giyilen model de aktarılamadı.** Draconic'in göğüslük modeli Blender'dan
çıkma *serbest üçgen ağı*; Bedrock varlık geometrisi yalnız kutu kabul
ediyor. Göğüslükler modun kendi eşya ikonuyla geliyor, üzerine çizilen
model yok. Bu bir eksik ve gizlenmedi — testte "Draconic'te giyilen model
YOK" diye sabitli, biri uydurma bir model eklerse test düşer.

Göğüslüklerin verdikleri modüllerden geliyor ve kaç modül taktığın sana
kalmış. Her kademenin **kendi kademesinden birer** modül takılmış kabul
edildi (büyük kalkan modülü değil, sıradan olan). Bu bir varsayım ve
`ayarlar.js`'te öyle yazıyor.

Kalkan Absorption'a çevrildi ama **her taramada tazelenmiyor** — aralık
kaynağın kendi dolum süresinden hesaplandı (kapasite ÷ tazeleme hızı).
Her saniye tazelenseydi zırh pratikte ölümsüzlük olurdu.

## 6. Aktarılamayanlar (özetlerde vaat edilmiyor)

- **Tokluk** (ProjectE 2.0 · MekaSuit 3.0 · Draconic 2.0) ve **geri tepme
  direnci** (0.1 / 0.2 / 0.25 / 0.1): Bedrock'ta özel eşyaya verilemiyor.
- Mücevher takımının **saldırı yetenekleri** (yıldırım, patlama, yerçekimi
  çakması): kaynakta ayrı bir tuşla açılıyor, Bedrock'ta o tuş yok.
- MekaSuit'in **donma/wither** soğurması: karşılık efekt yok.
- Draconic'in **kısmi düşme azaltması**: Bedrock'ta ya tam bağışıklık var
  ya hiç.
- **Adım yardımı** (Mücevher botu 0.4, MekaSuit 2.0): oyuncuya
  verilebilen bir adım yüksekliği yok.

Tek **tahmini** dönüşüm: MekaSuit'in koşu hızlandırması. Kaynak
`moveRelative` ile tik başına +0.1 **ivme** ekliyor; Bedrock'ta ivme diye
bir efekt yok, Hız doğrudan hızı çarpıyor. "Gözle görülür ama uçurmayan"
diye Hız III'te bırakıldı ve `ayarlar.js`'te öyle işaretlendi. Geri kalan
her sayı ölçülü bir kaynaktan geliyor.

## 7. Test: sayılar jar'ın bytecode'undan yeniden okunuyor

`test/teknoloji.mjs` 9 bölüm. En önemlisi 7.: `javap` varsa ProjectE'nin
azaltmaları (0.8/0.9/0.9), parça etkinlikleri (0.2/0.3), Mekanism'in
`ArmorMaterials.NETHERITE` bağı ve ULTRA zıplaması (5.0f), Draconic'in
kalkan kapasiteleri (25/50/100) ve zıplaması (4.0d) **yeniden okunup**
`ayarlar.js` ile karşılaştırılıyor. Yani "hafızadan yazdım" ihtimali
test edilebilir bir şeye dönüşüyor.

Bir de v4.83 dersinin devamı: `can_sayaci.mjs`'in "tick kapısında
sayılıyor mu" sınaması kapının **sonunda** olmayı arıyordu; teknoloji
zırhı eklenince kalıp kaydı ve test yanlış alarm verdi. Artık konuma
değil **üyeliğe** bakıyor.

---

# v5.0 — Weapons of Miracles: 27 silah + 63 dövüş animasyonu

Kullanıcı iki jar attı: **Weapons of Miracles 2.0.176** ve **Epic Fight**
(üzerine kurulu olduğu dövüş sistemi). İkisi de aktarıldı.

Ayrıntılı döküm: [`REFERANS_WOM.md`](REFERANS_WOM.md).

## 1. Sayılar bu sefer JSON'da değil — bytecode'da

Önceki modlarda (Ionstrike, AlienEvo, FiskHeroes) sayılar düz JSON ya da
okunabilir JavaScript'ti. WoM'unkiler **derlenmiş Java'nın içinde**.

Ama okunabilir. `javap` ile bytecode ayrıştırıldı:

```
WOMItems.class  static{} : "agony" → InvokeDynamic → lambda$static$N
                BootstrapMethods   : lambda'yı çözüyor
                lambda gövdesi     : Rarity.RARE, durability(2135)
AgonySpearItem.class
                createWeaponAttributes(): ldc 5.0f · ldc -2.0f
```

Kademe silahları formülle: `Greataxe = 7 + kademe`, `Staff = 1 + kademe`.

**Test 27/27 silahı jar'dan yeniden çıkarıp karşılaştırıyor** — yani
"hafızadan yazdım" ihtimali burada da sınanabilir.

`bedrock = java + 1`: Java'da eşyanın sayısı bir değiştirici, Bedrock'ta
toplam. Elmas kılıçta ölçüldü.

## 2. Animasyonlar kopyalanmadı, çevrildi

| | Epic Fight | Bedrock |
|---|---|---|
| veri | eklem başına **4×4 dönüşüm matrisi** | kemik başına **euler derece** |
| iskelet | Root/Torso/Chest/Shoulder_R/Arm_R/Elbow_R… | head/body/rightArm/… |

Çevirici `kaynak_anim/ef_cevir.py`: bağlama pozundan delta, kol zincirini
çarpma, matris → euler, Bedrock'un ters işaret kuralı (v4.88'de ölçülen).

**63 animasyon**, 7848 kare, 242 KB.

### Yakalanan hata

İlk çevrimde kılıç sallamada **bacaklar ~50° dönüyordu**. Sebep: Epic
Fight'ta `Thigh_R`, `Root`'un çocuğu — `Torso`'nun **kardeşi**;
Bedrock'ta `rightLeg`, `body`'nin **çocuğu**. Gövde dönüşü bacaklara
mirasla geçip **iki kez** uygulanıyordu.

### Doğrulama: çizmeden emin olunmadı

Sayıların makul görünmesi yetmedi. Pozlar `onizle_poz.py` ile çizildi.
**İlk çizici işe yaramadı** — kutuların sınır dikdörtgenini çiziyordu,
dönmüş bir kolu dönmemişten ayırt edemiyordu. Gerçek yüz çizimine
geçirildi; ancak o zaman pozların gerçek kılıç savuruşu olduğu görüldü.

## 3. Silah → vuruş serisi eşlemesi uydurma değil

WoM'un kendi animasyonları **zaten silah adıyla**: `solar_auto_1..4`,
`katana_auto_1..3`, `torment_auto_1..4`. Arka arkaya vurunca sırayla
oynuyorlar, 3 saniye vurmazsan başa dönüyor (Epic Fight'ın kombo
penceresinin karşılığı).

Kendi serisi olmayan üç aile Epic Fight'ın **tür** serisine bağlandı:
balyoz baltalar → `axe_auto`, pençeli eldiven → `fist_auto`, kof uzun
kılıç → `longsword_auto`.

## 4. Test üç dosyada gizli bir hata buldu

`wom_dovus.js` yazarken:

```js
const e = eldekiEsya(oyuncu);
kimlik = e && e.typeId;        // ← e ZATEN kimlik, .typeId undefined
```

`eldekiEsya` eşyayı değil **kimliğini** döndürüyor. Test yakaladı.

Aynı hata **`zirh.js` ve `kahraman.js`'te de vardı** — ama orada
zararsızdı: o dosyalarda ikinci bir yol (`equippable` bileşeni) var ve
bozuk ilk yolu maskeliyordu. Yani o iki dosyada ilk yol **hiçbir şey
katmıyordu**. Üçü de düzeltildi.

## Aktarılamayanlar (uydurulmadı)

Saldırı hızı (Bedrock'ta eşya başına bileşen yok), dirsek bükülmesi
(Bedrock'un kolu tek kemik), oyuncu kilidi (script'ten girdi
kilitlenemiyor), 3B silah modelleri (`.obj` üçgen ağı), **Epic Fight'ın
kendisi** (stamina, skill ağacı, parry — 1530 derlenmiş sınıflık bir
dövüş sistemi; aktarılan şey animasyonları).

WoM'daki **takı ve zırh parçaları** aktarılmadı: kullanıcı "zırh modları
da buldum, bunları ekledikten sonra atacam" dedi.

---

# v4.99 — Can sayacı ve genel tarama

## 1. Health Overlay: asıl özellik aktarılamıyor, sayaç aktarıldı

**Aktarılamayan:** modun asıl işi 10 kalpten fazlasını üst üste satırlar
yerine **tek satırda, her 10 kalpte renk değiştirerek** çizmek. Bu
tamamen Java çizim kodu — 36 derlenmiş sınıf. Dokuları (`health.png`,
`absorption.png`) **beyaz maske**: rengi kod veriyor, dosyada renk yok.
Ölçüldü. Bedrock'ta oyuncu HUD'unun kalp çizimi ne script'ten ne kaynak
paketten değiştirilebiliyor.

**Aktarılan:** modun ikinci özelliği,
`healthoverlay.options.heart_display_mode` (off / always / on_change).
Üç mod da aynen geldi.

**Neden gerçekten gerekli:** `KALP_TAVAN = 200`, yani 210 kalbe kadar
çıkılabiliyor ve Bedrock bunu **21 satır kalp** olarak çiziyor.

**Renkler bizim.** Modun renk dizileri (`normalColors`,
`poisonedColors`…) derlenmiş sınıfın içinde, metin olarak okunamıyor.
Tahmin etmek yerine kendi eşiklerimizi koyduk.

**Sessiz olmak zorunda.** Actionbar'ı lazer sayacı, dönüşüm mesajları ve
kademe bildirimleri de kullanıyor. Sayaç başka bir şey yazdıktan sonra 40
tick susuyor — yoksa lazerin "359 vuruş" yazısını ezerdi, yani
kullanıcının bildirdiği hatayı görünmez yapardı. İlk taramada da yazmıyor
(zırh sistemindeki kuralın aynısı).

## 2. Genel tarama — ve taramanın kendisinin sınanması

Kullanıcı: *"genel olarak tüm bu şeyleri hallettikten sonra bir tarama
yaptım, dosyalar içerisinde sorun varsa düzelt."*

### Statik tarama işe yaramadı

Önce `const`'un geçici ölü bölgesini (v4.94 hatası) statik olarak
aramayı denedim: **44 şüpheli yer** çıktı, neredeyse hepsi yanlış alarm —
iç kapsamlar, callback'ler ve `catch` parametreleri yüzünden.

### Çalıştırarak tarama — ilk hâli de işe yaramadı

`sim/tarama.mjs` yazdım: her yeteneği çalıştırıyor, her menüyü açıp her
düğmesine basıyor. **v4.94 hatasını pack'e geri koyup denedim: yeşil
yandı.**

Sebep: `menu.js` seçim callback'ini `try/catch` içinde çağırıyor — doğru
bir karar, bir düğmenin patlaması menüyü öldürmemeli. Yani istisna dışarı
çıkmıyor, `hataYaz`'a düşüyor.

### Üçüncü hâli çalışıyor

Tarama artık **hata günlüğünü dinliyor**. Yeniden denendi:

```
✗ hicbir dugme HATA GUNLUGE dusurmedi
  :: HATA @ menu.secildi: Cannot access 'cekirdek' before initialization
```

Yakalıyor.

### Taramanın kapsamı

| bölüm | ne |
|---|---|
| 1 | 55 yeteneğin hepsi çalıştırılıyor |
| 2 | ana menünün 40 düğmesi + 5 alt menü, hepsinin her düğmesi |
| 3 | 6 kolun menüsü |
| 4 | 18 sohbet komutu (boş, bozuk ve olmayan dâhil) |
| 5 | 600 tick, ortasında iki kez dönüşüm değiştirerek |
| 6 | 492 ayar: `undefined` var mı, efekt seviyeleri motor sınırında mı, Direnç V sızmış mı |
| 7 | ölü kod büyümüyor mu |

### Bulunanlar ve yapılanlar

- **18 kullanılmayan import** temizlendi.
- **12 öksüz ayar** bulundu. Üçü bu sürümde benim bıraktığım artıktı
  (`ZIRH_ETIKET`, `ZIRH_KAYIT_ANAHTAR`, `ZIRH_VARSAYILAN_MOD` — takım ve
  mod seçimi kalkınca) — **silindi**. Kalan dokuzu önceden beri öksüz
  (lazerin "sana kısa destek ver" ayarları hiç bağlanmamış); silinmediler
  ama `ayarlar.js`'te **işaretlendiler** — "ayar var, karşılığı yok"
  durumu kullanıcının şikâyetinin küçük hâli, kimse bunları açık sanmasın.
- Tarama artık bu sayıları **sabitliyor**: yeni ölü kod eklenirse test
  kırılır.

---

# v4.98 — Ben 10 beceri ağacı

Kullanıcı: *"oyunda bu mod kurulduğunda yanda bir sekme açıyor ve orada
bir skill seçilebiliyor, ekstra yeteneklerini arttırabiliyoruz; onun için
de bir menü olduğunu gördüm, onları da ekle."*

O sekme **Palladium'un yetenek ekranı**. Modun kendi dosyalarından
çıkarıldı — hiçbiri uydurma.

## Ağaç nereden geldi

| ne | nerede |
|---|---|
| düğümler | `data/alienevo_aliens/palladium/powers/<tür>.json` → gizli olmayan, `gui_position` taşıyan her yetenek |
| ön koşul | `conditions.unlocking` → `palladium:ability_unlocked` |
| ücret | `conditions.unlocking` → `palladium:scoreboard_score_buyable.score` |
| istatistik etkisi | `palladium:attribute_modifier` → `attack_damage` / `armor` / `armor_toughness` / `swim_speed` |
| **düğüm adları** | `assets/alienevo/lang/tr_tr.json` — **zaten Türkçe**, çevrilmedi |
| XP kuralı | `data/alienevo/kubejs_scripts/xp.js` |

**44 düğüm** (tür başına 11), üç dal hâlinde. Adlar modun kendi metni:
"Kristalokinezi: Mermiler", "Sonik Patlama", "Su Girdabı", "Pyrokinezi:
Ateş Nefesi"…

## Seviye ve puan — sayılar modun betiğinden

`xp.js` birebir:

```js
xpToAdd = Math.round(entityMaxHealth * 0.425)
maxXp   = currentLevel === 0 ? 100 : 100 * currentLevel
if (currentLevel >= 10) { ... }        // tavan kademe
```

Uzaylı hâlindeyken bir canlıyı öldürünce **o uzaylının** XP'si artıyor.
Her kademe **+1 yetenek puanı**. Tavan 10.

**Tür başına ayrı**, biçim başına değil: Prototip Elmas Kafa'yla
kazandığın puanı 10K'da harcıyorsun — modda da öyle (`Petrosapien.Level`,
`Tetramand.Level`…).

## İstatistik yükseltmeleri: neden toplanıp bir kez çevriliyor

Ağaçtaki artışlar küçük (`+1 saldırı`, `+2 savunma`). Bedrock'ta Güç
seviye başına **+3**, Direnç seviye başına **%20**. Tek tek çevirseydik
üç kez "+1 saldırı" almak **hiçbir şey** vermezdi (her biri
`round(1/3) = 0`).

O yüzden açılan düğümlerin katkıları **toplanıp bir kez** çevriliyor.
Test bunu ölçüyor: Dört Kol'un iki `+4` saldırı düğümü açılınca
`+8 → Güç II` çıkmalı.

## Menü

Ben 10 menüsünün altına **★ Beceriler** satırı geldi:

- Elinde yaratık varsa **doğrudan o türün ağacını** açıyor — tablette
  "hangi tür?" diye ikinci bir soru fazladan bir dokunuş demekti.
- Elinde yoksa önce tür seçtiriyor.
- Her düğüm: `✔` açık · `◆` alınabilir (ücreti yazıyor) · `✖` kilitli
  (**sebebi yazıyor** — hangi ön koşul eksik ya da kaç puan gerek).

Başlıkta kademe, puan ve XP/eşik duruyor.

## XP kancası

`entityDie` olayına abone olunuyor; öldüren oyuncu uzaylı hâlindeyse XP
gidiyor. Olay her sürümde yok — `olayaAbone` eksik olayda paketi
öldürmüyor, sadece bu özelliği kapatıp uyarı düşüyor (bot_ilkel dersi).

Öldüren oyuncuyu `damageSource.damagingEntity`'den okuyor. **v4.95'te göz
lazerine `damagingEntity` eklenmişti** — öncesinde "sebepsiz" ölümler XP
de vermezdi.

**Test:** `sim/beceri.mjs` — 279 sınama, 7 bölüm. Ağacın her düğümü modun
JSON'uyla karşılaştırılıyor (ön koşul, ücret, miktar, ağaçtaki yer) ve XP
formülü modun betiğinden regex'le doğrulanıyor.

---

# v4.97 — Uzaylı boyutları, Max Steel'in eksik katmanları ve tek animasyonu

## 1. Uzaylı boyutları: çarpanı kaçırmışız

Kullanıcı: *"uzaylı boyutları daha büyük olması gerekiyordu, normal
Steve boyutunda."*

Haklıydı ve sebebi bulundu. Modun **her uzaylı gücünde** bir
`palladium:size` yeteneği var ve oyuncuyu o çarpanla büyütüyor:

```json
// data/alienevo_aliens/palladium/powers/petrosapien.json
"size_change": { "type": "palladium:size", "scale": 1.35 }
```

Biz modun `.geo.json`'unu **ham** haliyle alıyorduk; o dosyalar 1× oyuncu
için çizilmiş ve çarpan **çizim sırasında** uygulanıyor. Yani dosyayı
doğru aktarmışız ama çarpanı kaçırmışız — **Dört Kol tam 2 kat küçük
çıkıyordu.**

| uzaylı | çarpan (modun JSON'undan) | önce | sonra |
|---|---|---|---|
| Elmas Kafa (Petrosapien) | 1.35 | 34.5 | 46.5 |
| Dört Kol (Tetramand) | **2** | 32.1 | 64.2 |
| Yüzen Çene (Piscciss Volann) | 1.17 | 67.6 | 79.1 |
| Ateş Topu (Pyronite) | 1.1 | 41.5 | 45.6 |

*(Steve = 32 birim.)*

Bedrock'ta oyuncu modelini çalışma anında ölçeklemek yok, o yüzden çarpan
**geometriye işleniyor**: her küp origin/size, her pivot ve her şişirme
çarpanla çarpılıyor. **Dönüşler ve UV'ler çarpılmıyor** — açı ölçekten
bağımsız, doku da aynı. Test her ikisinin de değişmediğini ölçüyor
(çarpanı yanlış yere uygulamak modeli burardı ve hiçbir yükseklik ölçümü
bunu yakalamazdı).

**Çarpışma kutusu büyümüyor.** Bedrock'ta oyuncunun kutusu sabit
(0.6 × 1.8). Dört Kol iki kat görünüyor ama hâlâ normal bir kapıdan
geçiyor. Motor sınırı, eksik iş değil.

Max Steel modları **ölçeklenmedi** — kaynakta onların `palladium:size`
yeteneği yok. Test bunu da sınıyor.

## 2. Max Steel: animasyon ararken daha büyüğü çıktı

Kullanıcı: *"animasyonlar eklenmeli çünkü modun kendisinde var,
referanstan bakarsın."*

**Bakıldı.** Modun tamamında **tek bir animasyon dosyası** var:
`animation.drill_spin.json` — Güç modunun kol matkaplarının dönüşü.

Ama onu ararken daha büyük bir eksik çıktı. Her modun **birden çok
render katmanı** var ve biz her modun yalnızca **ana** katmanını almışız:

| mod | katmanlar | bizde eksik olan |
|---|---|---|
| Güç | exo_mode + **drills** + transform_flash + strength_mode | **matkaplar** |
| Titan | **halo** + transform_flash + titan | **hale** |
| Uçuş | steel_glow + thrusters + transform_flash + flight2 | (parlama/parçacık) |
| Dalış | steel_glow + transform_flash + scuba2 | (parlama) |
| Gizlilik | steel_glow + glow_model + stealth_model | (parlama) |

Yani **Güç modunun matkapları** ve **Titan'ın halesi** hiç
aktarılmamıştı. İkisi de artık var.

**Neden ayrı katman:** Bedrock'ta bir geometrinin **tek** dokusu olur.
Matkabın dokusu 256×256, takımın dokusu ayrı bir 256×256, halenin dokusu
64×64. Üçü tek geometriye sığmıyor. Onun yerine ek katman kendi
geometrisi, kendi dokusu ve kendi render denetleyicisiyle geliyor — ama
**tetiği ana modun değişkeni**, yani çekirdek elde olduğunda ikisi
birden çiziliyor. Ayrı bir tetik "matkaplar görünür, takım görünmez"
demek olurdu.

## 3. Animasyon olduğu gibi kopyalanamadı — ve testi bu yakaladı

Ben 10 animasyonları olduğu gibi kopyalanabilmişti çünkü anahtarları
zaten `animation.` ile başlıyordu. Ionstrike'ınki öyle değil:

```json
{"format_version":"1.8.0","animations":{"drill":{...}}}
```

Bu GeckoLib'in kuralı. **Bedrock'ta bir animasyonun kimliği `animation.`
ile başlamak zorunda**, yoksa oyun onu hiç tanımıyor ve animasyon
**sessizce hiç oynamıyor**. İlk yazdığımda `animation.drill_spin` diye
bağlamıştım ama dosyanın içindeki anahtar `drill`'di — test
karşılaştırıp yakaladı.

(Modun kendi `render_layer`'ı da `animation.drill_spin` diye çağırıyor,
yani doğru ad bu; dosyadaki anahtar eksik yazılmış.)

Değiştirilen tek şey **anahtar**. Kemikler, kare zamanları, dönüşler ve
döngü bayrağı birebir aynı — test ikisini karşılaştırıyor.

## Alınmayanlar (uydurulmadı)

`exo_mode` (Güç'ün ikinci takımı; ana takımla aynı bölgeleri kaplıyor,
üst üste binince z-çakışması yapıyor), `steel_glow` ve `*_glow`
katmanları (Bedrock'un oyuncu modelinde parlama yok — rengi zaten ana
dokuya bindirilmişti, parlaması eksik), `thrusters`/`lightning`
(parçacık yayıcı, model değil), `transform_flash` (bizde `ZIRH_CAKMA`
parçacığı olarak zaten var).

---

# v4.96 — Fisk'in dokuz kahramanı

Kullanıcı dokuz isim verdi ve *"varsa dokuzunu da aktar"* dedi. Dokuzu
da modda vardı; dokuzu da aktarıldı: **The Spectre, Anti-Monitor, The
Monitor, Martian Manhunter, Vision, Iron Man Mark 85, Shazam, The Tick,
Harbinger.**

Ayrıntılı döküm: [`REFERANS_FISK.md`](REFERANS_FISK.md).

## Tabanı Palladium değil — ondan da kolay

Kullanıcı sormuştu: *"tabanı ne bilmiyorum Palladium tabanlı mı
bilmiyorum."* Değil. Fisk'in kendi sistemi, Minecraft 1.7.10. Ama:

- kahraman tanımları `data/heroes/<ad>.js` — **düz okunabilir
  JavaScript**, bütün sayılar açıkta
- güçler `data/powers/<ad>.json` — düz JSON
- modeller **vanilla insansı iskelet**, kemik adları
  (`head`/`headwear`/`body`/`rightArm`/`leftArm`/`rightLeg`/`leftLeg`)
  Bedrock'unkiyle birebir aynı
- dokular **64×64**, yani oyuncu derisi düzeni

Yani sayıların hiçbiri hafızadan yazılmadı; testler jar'la
karşılaştırıyor.

## Neden attachable, oyuncu modeli değil

Ben 10 ve Max Steel'de oyuncunun **modelini** değiştiriyoruz. Burada bu
**yanlış** olurdu — üç kahramanda kaskın dokusu yok, modda oyuncunun
kendi yüzü görünüyor. Ölçüldü: Spectre'in kafa bölgesi **%0** dolu,
Shazam **%6**, The Monitor **%19**. Modeli değiştirseydik o üçü
**kafasız** çizilirdi.

Attachable oyuncunun **üstüne** çiziyor, boş pikseller oyuncunun kendi
derisini gösteriyor — modun yaptığı şey tam olarak bu. Yol zaten
denenmişti: Omnitrix saatleri (v4.93) de elde tutulan eşyanın
attachable'ı.

## Dokular: yakalanan tuzak

Birleştirme tarifi uydurulmadı — modun kendi `models/heroes/<ad>.json`'ı
"hangi katman hangi doku" ve "hangi kemiği hangi katmanlar çizer"
diyor; kemik başına doku o iki tablodan türetildi.

**Tuzak:** kahramanların çoğunda o iki tablo **boş** ve
`"parent": "fiskheroes:hero_basic"` üzerinden geliyor. Ebeveyni
çözmeden birleştirince **dört kahraman 0 piksel** çıktı. Kalıtım
çözüldü, dokuzu da doğru.

## Işınlar: aynı saniyelik hasar (ve v4.95'in düzeltmesi)

Fisk'in `energy_projection` ve `charged_beam`'i **sürekli** ışın —
hasar **her tick** uygulanıyor. Bizimki tek atış + 1 saniye bekleme.
Tek kural:

```
tek atış = kaynağın tick başına hasarı × 20 (bekleme)
```

Saniyelik hasar kaynakla aynı kalıyor. Tek istisna `lightning_cast`
(Shazam): o zaten tek seferlik bir çarpma, hasarı olduğu gibi.

**Bu kural Ionstrike ışınlarına da geriye dönük uygulandı.** v4.95'te
Isı ışını 20, Titan lazeri 50 olarak alınmıştı — kaynağın sürekli
ışınını **20 kat zayıflatıyordu**. Artık 400 ve 1000.

Işın motoru tek: `yetenekler/isinlar.js` (eski `zirh_isini.js`). İki
kaynak — Max Steel modları ve Fisk kahramanları — tek motoru
paylaşıyor; fark yalnızca **kapıda**: biri elindeki çekirdeğe, öteki
elindeki kostüme bakıyor.

## Var olan yeteneklere bağlananlar

Yeni kod yazmak yerine tested yetenekler kullanıldı:

| kaynak | bizde |
|---|---|
| `controlled_flight` / `flight` | `ucus` |
| `teleportation` | `isinlanma` |
| `gravity_manipulation` | `ucurma` |
| `telekinesis` | `cekme` (en yakını) |

**The Tick'in hiçbir aktif yeteneği yok** — çünkü kaynakta da yok
(`near_invulnerability` + `leaping`, ikisi de pasif). Ona uydurma bir
şey bağlanmadı.

## Aktarılamayanlar (uydurulmadı, raporlandı)

`projectile_immunity`, `intangibility`, `shape_shifting`,
`size_manipulation` (Anti-Monitor dev modu), `shield`/`forcefield`,
`setDefaultScale(1.1)`, `potion_immunity`, Mk85'in bıçağı ve nanit
dönüşümü, `_lights` katmanlarının **parlaması** (rengi doğru, emissive
yok). Özet metinleri bunları vaat etmiyor.

**Test:** `sim/kahraman.mjs` — 303 sınama, 8 bölüm. Sayılar jar'la
karşılaştırılıyor; "kaynakta uçuş varsa uçuş yeteneği bağlı mı" gibi
sorular da var (Max Steel'deki "uçuş modu uçmuyordu" hatasının tekrarı
olmasın diye).

---

# v4.95 — Göz lazeri bekçiyi öldürüyor, çekirdekler vaat ettiğini veriyor

Kullanıcı dört ayrı şey bildirdi; dördü de ölçüldü, tahmin edilmedi.

## 1. Göz lazeri: 359 vuruş, warden ölmedi

**Kök sebep:** hasar türü `"fire"` idi. Bedrock'ta bekçi
`minecraft:fire_immune` taşıyor ve ateş bağışıklığı bir *indirim*
değil **tam sıfır**. 500 hasarlık ışın 359 kez vurdu, hedefin canı
hiç düşmedi. Sayaç doğru sayıyordu; hasar hiç inmiyordu.

Aynı tuzak bekçiye özel değildi: blaze, wither, wither iskeleti,
magma küpü, strider, zombileşmiş piglin, ender ejderi — lazer bu
listenin tamamına karşı etkisizdi.

`ayarlar.js`'teki eski hesap ("500 → 420 → 84 → 16,8") doğruydu ama
**yanlış soruya cevap veriyordu**: sorun zırh indirimi değil,
bağışıklıktı.

**Düzeltme:**
- `LAZER_HASAR_SEBEP = "entityAttack"` — hiçbir vanilla varlık buna
  bağışık değil.
- `damagingEntity` = atan oyuncu. Bu ikinci, sessiz bir hatayı da
  kapattı: `fire` sebebinde damagingEntity yoktu, yani öldürülen şey
  "sebepsiz" ölüyordu ve **tecrübe/ganimet düşmüyordu**.
- **Emilen vuruş sayacı**: her vuruştan sonra hedefin canı okunuyor.
  Üst üste `LAZER_BAGISIKLIK_SINIR` (3) kez düşmezse ışın hedefi
  doğrudan bitiriyor. Neden 3: vanilla dokunulmazlık penceresi 10
  tick ve ışın da tam 10 tickte bir vuruyor, yani *tek* emilen vuruş
  normal olabilir; üst üste üçü olamaz.

Aynı hata `buz_mizragi.js`'te de vardı (`cause: "freezing"`,
damagingEntity yok) — o da düzeltildi.

**Test:** `sim/lazer_bagisik.mjs`. Eski kodla çalıştırıldığında
"500 can kaldı / 60 vuruş" diyor — kullanıcının tarifinin birebir
küçük ölçeği.

## 2. Zırh menüsü hiç açılmıyordu (v4.94 regresyonu)

`zirhMenusu()` içinde `const cekirdek` düğme listesinden **sonra**
tanımlıydı, ama liste onu okuyordu. `const`'un geçici ölü bölgesi
(TDZ) yüzünden menü her açılışta `ReferenceError` atıyordu.

Hiçbir test yakalamamıştı çünkü sahte dünyada
`@minecraft/server-ui` **yoktu**: `menuAc` modülü bulamayınca sessizce
`false` dönüyor ve fonksiyonun gövdesine hiç girilmiyordu. Yani
**menüyü açan tek bir test bile yoktu.**

Artık `node_modules/@minecraft/server-ui` altında gerçek bir taklit
var (`SIMSEK_MENU=1` ile açılıyor — kapalıyken `menu.mjs` ve
`gunes.mjs`'in "modül yokken menü kendini kapatıyor mu" güvencesi
aynen sınanıyor) ve `sim/zirh_menu.mjs` menüyü uçtan uca açıyor.

## 3. Çekirdekler vaat ettiklerini vermiyordu

İki ayrı hata vardı, ikisi de kaynakla karşılaştırılarak bulundu.

**a) Direnç çok düşüktü.** Özetler "armor +20", "armor +80" diyordu;
tablo Direnç I (%20) veriyordu. Bedrock zırh formülü (tokluk 15,
10 hasarlık vuruş): zırh 20 → %73, zırh ≥25 → %80 (tavan). Yani
kaynak en az %60-80 vaat ediyordu, biz %20 veriyorduk.
Yeni eşleme: zırh 20-50 → Direnç III, zırh 80 (titan) → Direnç IV.

**b) Yanlış/eksik efekt ve eksik yetenek.**
- Uçuş modunda `fire_resistance` vardı; kaynakta ateş bağışıklığı
  **Isı** modunda. Üstelik **Uçuş modu uçmuyordu.**
- Dalış ve Keşif'te zırh vaadi vardı, direnç hiç yoktu.
- Isı'nın özeti "ışın 20 hasar" diyordu; ortada ışın yoktu.
- Titan'ın 50 hasarlık lazeri de yoktu.

Üçü de artık gerçek yetenek:

| mod | yetenek | kaynak |
|---|---|---|
| Uçuş | var olan `ucus` yeteneği | `flight_mode` (`flight_speed`/`launch`) |
| Isı | `zirh_isi_isini` — 20 hasar, 30 blok, 5 sn yakma | `heat_mode/fire_beam_both` |
| Titan | `zirh_titan_lazeri` — 50 hasar, 100 blok | `titan_mode/titan_laser` |

Çekirdek eşyaları bu yeteneklere `kollar.js` üzerinden bağlı: eline
al, eğil+zıpla, ışın çıkıyor.

**Özet metinleri de değişti.** Eskiden Palladium özellik adlarının
kopyasıydı ("armor +20 · toughness +15") — oyuncunun Bedrock'ta
göremeyeceği şeyler. Artık gerçekten alınan şeyi yazıyor.

**Aktarılamayanlar (uydurulmadı, raporlandı):** `entity_reach +33`,
`knockback_resistance`, `entity_glow`, donma bağışıklığı,
`attack_speed +5` — Bedrock'ta efekt karşılıkları yok. Özetler artık
bunları vaat etmiyor.

**Test:** `sim/zirh.mjs` 6b bölümü — özette yazan her şeyin efekt
tablosunda karşılığı var mı, ve ışın sayıları kaynakla birebir mi.

## 4. Giyilebilir zırh takımı kaldırıldı, menü bilgi verir oldu

Kullanıcı: *"temel zırha ihtiyaç kalmadı... onu kaldır, ama çekirdek
kısmını, temel zırhı, ekle"* ve *"menüden o modlara gerek kalmadı,
yani seçebiliyorduk ya."*

Haklıydı: v4.91'de takım tek yoldu (dört parçayı giy, menüden mod
seç). v4.94'te çekirdek geldi ve iki yol yan yana yaşadı — çekirdek
varken takım şartı es geçiliyor, menü seçimi de çekirdek tarafından
eziliyordu. Yani menüden bir şey seçmek çoğu zaman **hiçbir şey
yapmıyordu**.

- **Kaldırıldı:** `ZIRH_PARCALAR` (4 giyilebilir parça), `ZIRH_KORUMA`,
  `ZIRH_TAM_TAKIM_SART`, `takimVarMi()`, `takimParcalari()`,
  `modAl()`, `modYaz()` ve dünyaya yazılan mod seçimi.
- **Kaldı:** dokuz çekirdeğin hepsi — **Temel dâhil.**
- Menü artık Ben 10 menüsüyle aynı işi yapıyor: hangi çekirdeğin ne
  verdiğini yazıyor.

`pa:zirh_bas/govde/bacak/ayak` artık kayıtlı değil; var olan
dünyalarda o yığınlar kaybolur. O parçalar zaten yalnızca yaratıcı
modundan alınabiliyordu.

---

# Simsek TNT ve Toprak Topu — geliştirme notları

Minecraft **Bedrock** behavior pack. Sadece resmî `@minecraft/server` Script API
kullanılıyor; resource pack, custom texture, üçüncü parti kütüphane yok.
Hedef platform Android tablet/telefon, o yüzden performans kararları
masaüstüne göre değil mobile göre alındı.

## Yapı

```
addon/
  Simsek_TNT_ToprakTopu/
    manifest.json
    scripts/
      main.js               -> giriş, tick yöneticisi, tetikleme yolları
      ayarlar.js            -> BÜTÜN sabit sayılar
      yardimcilar.js        -> günlük, API uyumluluğu, ortak yardımcılar
      butce.js              -> tick bütçesi + ölçüm harness'ı
      yetenekler/
        kayit.js            -> yetenek kayıt defteri
        _yagmur.js          -> şimşek/TNT için ortak yağmur işi
        yildirim.js
        yildirim_halkasi.js
        alan_simsegi.js
        tnt_yagmuru.js
        toprak_topu.js
  Simsek_Kol_Kaynak/          -> İSTEĞE BAĞLI resource pack
    manifest.json
    animations/simsek_kol.animation.json
  paketle.sh                  -> paketleri üretir
  Simsek_TNT_ToprakTopu_v3.mcpack   (behavior, tek başına çalışır)
  Simsek_Kol_Kaynak_v3.mcpack       (resource, isteğe bağlı)
  Simsek_TNT_v3.mcaddon             (ikisi birden)
```

## Kol animasyonları — isteğe bağlı resource pack

Özel animasyon tanımlamak resource pack gerektiriyor; behavior pack'ten
yaratılamıyor. Bu yüzden animasyonlar **ayrı ve isteğe bağlı** bir pakete
konuldu. Behavior pack o paket olmadan da tam çalışır.

| `OZEL_ANIMASYON` | ne olur |
|---|---|
| `false` (varsayılan) | `animation.zombie.attack_bare_hand` — oyunda hazır gelir, ek paket gerekmez. Kollar öne uzanır. |
| `true` | Kollar gerçekten havaya kalkar. Resource pack'in dünyada **etkin olması şart**. |

Resource pack etkin değilken `OZEL_ANIMASYON = true` bırakırsan
`playanimation` sessizce başarısız olur ve kol hiç kalkmaz.

Pakette dört animasyon var:

| animasyon | ne yapar |
|---|---|
| `animation.simsek.kol_kaldir` | iki kol yukarı, son karede kalır |
| `animation.simsek.kol_indir` | iki kol aşağı iner |
| `animation.simsek.tek_kol` | sadece sağ kol yukarı |
| `animation.simsek.ileri_it` | iki kol öne doğru iter |

Son ikisi henüz kullanılmıyor, ileriki yetenekler için hazır.

**Dönüş değerleri oyunda denenmedi.** Kol açıları (`-175`, `-85` gibi) hesapla
yazıldı; oyunda tuhaf duruyorsa `animations/simsek_kol.animation.json`
içindeki `rotation` değerleri ayarlanmalı.

Paketlemek için: `sh addon/paketle.sh`

## Yeni yetenek nasıl eklenir

1. `yetenekler/` altına bir dosya aç
2. İçinde `yetenekKaydet({...})` çağır
3. `main.js`'in üstündeki import listesine bir satır ekle

Üçüncü adım kaçınılmaz: Bedrock'ta klasör tarama yok, her dosyanın bir kez
import edilmesi gerekiyor.

```js
import { yetenekKaydet } from "./kayit.js";

yetenekKaydet({
  kimlik: "ornek",          // benzersiz kısa ad
  ad: "Örnek Yetenek",      // oyuncuya gösterilen ad
  esya: "minecraft:stick",  // bu eşya kullanılınca tetiklenir (isteğe bağlı)
  esyasiz: true,            // jest sırasına girsin mi
  sira: 60,                 // jest sırasındaki yeri
  olustur(oyuncu) {
    return {
      ad: "ornek",
      oyuncuId: oyuncu.id,
      calis() { /* her tick; true dönerse iş biter */ return true; },
      bitir() { /* temizlik */ }
    };
  }
});
```

Bütçe isteyen işler `butce.js`'ten `blokIste(n)` / `varlikIste(n)` çağırır ve
sadece dönen kadarını yapar. Kalanını sonraki tick'e devreder.

## Aşama 1 — performans (tamamlandı)

Bu aşamada **oynanış bilerek hiç değiştirilmedi**. Top aynı hızda, aynı
menzilde, aynı yerleri kırıyor. Sadece aynı sonuca daha ucuza varılıyor.

### Yapılanlar

**Delta yazımı.** Eski kod her adımda kürenin tamamını havaya çevirip
tamamını yeniden çiziyordu: adım başına 66 blok işlemi. Arka arkaya iki küre
büyük ölçüde üst üste bindiği için ortak kalan bloklara dokunmaya gerek yok.
Artık sadece fark yazılıyor.

Bakış yönü uçuş boyunca sabit olduğundan tüm uçuşta yalnızca **2 farklı tam
sayı ötelemesi** oluşuyor; delta kümesi bu ötelemeye göre önbelleğe alınıyor,
yani atış başına 2 kez hesaplanıp 30 kez kullanılıyor.

**Merkezî tick yöneticisi ve global bütçe.** Eski kodda her yetenek kendi
`system.runInterval`'ını açıyordu; toplam yüke bakan kimse yoktu. Artık tek
bir yönetici döngü var ve tick başına bütçeyi tüm oyuncular arasında
dağıtıyor:

- `TICK_BLOK_BUTCESI = 28` — tick başına toplam blok işlemi (1 `getBlock` + 1 `setType`)
- `TICK_VARLIK_BUTCESI = 4` — tick başına toplam varlık doğumu

Bütçe değeri **ölçülerek** seçildi. 120 rastgele yönde atış yapılıp uçuş
süresi ve tepe yük karşılaştırıldı (orijinal: 62 tick, 33 blok/tick):

| bütçe | uçuş süresi | tepe yük |
|---|---|---|
| 24 | 80 tick (**%29 yavaş**) | %27 az |
| **28** | **62 tick (aynı)** | **%15 az** |
| 32 | 62 tick (aynı) | %3 az |

28'in altına inince top gözle görülür şekilde yavaşlıyor. Tablette ölçüm
satırındaki `maks` sürekli 5 ms üzerindeyse düşürmek gerekebilir; o zaman
yavaşlama bilinçli bir takas olur.

Bütçe dolarsa iş sonraki tick'e devrediliyor. Kaç oyuncu aynı anda ateş
ederse etsin tavan sabit kalıyor; efektler yavaşlar, sunucu tick'i şişmez.

**Dünya sınırı istisnasız ele alınıyor.** Eski kodda küre y ekseninin dışına
taştığında `getBlock` her blokta istisna fırlatıyor ve boş `catch` bunu
yutuyordu. Artık sınır önceden kontrol ediliyor, istisna hiç oluşmuyor.
Küre sınırı aşarsa top **durmuyor** — eski davranışta olduğu gibi uçmaya
devam ediyor, sadece sınır dışı bloklar atlanıyor.

**Tahsis azaltma.** `getBlock`'a verilen koordinat nesnesi ve `getEntities`
seçenek nesnesi artık her çağrıda yeniden üretilmiyor, tek nesne yeniden
kullanılıyor. Atış başına ~2.070 nesne tahsisi ~5'e indi. `KORUNAN` listesi
dizi taraması yerine `Set`.

**Oyuncu başına tek aktif efekt** ve **ayrılma/ölüm temizliği** eklendi.
Oyuncu dünyadan çıkarsa işi anında iptal ediliyor.

### Ölçüm sonuçları

Eski ve yeni algoritma sahte bir dünya üzerinde 13 senaryoda karşılaştırıldı;
**hepsinde blok durumu ve patlama noktası birebir aynı** çıktı. Aşağıdaki
rakamlar 120 rastgele yön üzerinden ortalamadır (eksen hizalı yönler
gerçekte olduğundan daha iyi sonuç verdiği için kullanılmadı).

| | eski | yeni |
|---|---|---|
| Atış başına blok işlemi | 1.980 | 1.414 (%29 az) |
| Tepe yük | 33 blok/tick | tavan 28 blok/tick (%15 az) |
| Uçuş süresi | 62 tick | 62 tick (değişmedi) |
| Sınıra teğet uçuşta istisna | 60 – 91 | 0 |
| Atış başına nesne tahsisi | ~2.070 | ~5 |

Bütçe tavanı 1, 2, 4 ve 8 oyuncu ile sınandı; hepsinde tick başına en fazla
28 blok işlemi yapıldı.

### Ölçüm harness'ı

Content Log'u tablette okumak zahmetli olduğu için ölçüm ve hata satırları
**sohbete de** düşüyor. İlgili ayarlar:

| ayar | ne yapar |
|---|---|
| `OLCUM_ACIK` | ölçümü açar/kapatır |
| `OLCUM_SOHBETE` | ölçüm satırı sohbete de düşsün mü |
| `HATA_SOHBETE` | hatalar sohbete de düşsün mü |

Dünyaya girince paketin çalıştığını doğrulayan satır:

```
[SimsekTNT v2.5] yuklendi · blok butcesi 28/tick · olcum acik
```

Her atıştan sonra sohbete iki satır düşüyor:

```
[OLCUM] maks 1.0ms ort 0.07ms toplam 5ms
        blok 1316 (17.5/tick) · varlik 0 · tick 75 · butce dolan 43
```

En önemli sütun **`maks`** — tek bir tick'in en kötü süresi. Renk kodu:
yeşil (< 2 ms) sorunsuz, sarı (2–5 ms) sınırda, kırmızı (> 5 ms) bütçe
düşürülmeli.

Hatalar hem Content Log'a hem sohbete düşüyor (aynı hata mesajı sohbete
en fazla 5 saniyede bir yazılır, sohbeti boğmasın diye):

```
[SimsekTNT] HATA @ toprakTopu.bosalt: <mesaj>
  <yigin izi>
```

Yayın veya normal oynanış öncesi `OLCUM_SOHBETE` ve `HATA_SOHBETE`
kapatılmalı.

### API dayanıklılığı

Orijinal kod yalnızca `world.afterEvents.itemUse` kullanıyordu. Performans
aşamasında `playerLeave` ve `playerSpawn` eklendi — bu olaylar oyuncunun API
sürümünde yoksa `.subscribe` çağrısı **script yüklenirken** hata fırlatır ve
paketin tamamı ölür. Bu yüzden:

- Bütün olay abonelikleri `olayaAbone()` üzerinden geçiyor. Eksik olay artık
  sadece ilgili özelliği kapatıyor, paketi öldürmüyor; Content Log'a uyarı
  düşüyor.
- `itemUse` kurulamazsa `KRITIK` satırı yazılıyor (o olmadan hiçbir yetenek
  çalışmaz).
- `isValid` bazı sürümlerde property, bazılarında metot. Metot olan sürümde
  `if (e.isValid)` **her zaman doğru** döner (fonksiyon truthy'dir), yani
  sessizce yanlış çalışır. `gecerliMi()` ikisini de doğru ele alıyor.
- `Date.now` yoksa ölçüm sıfır süreyle çalışmaya devam ediyor.

Bu yol ayrıca test ediliyor: `playerSpawn`/`playerLeave` silinmiş, `isValid`
metot yapılmış ve `Date` kaldırılmış sahte bir API'de script yükleniyor ve
toprak topu normal sonucu üretiyor.

## Aşama 2 — yıldırım ayarları ve eşyasız tetikleme

### Yıldırım süresi

Yağmurun süresi `ceil(sayı / grup) * aralık` tick (20 tick = 1 sn).

| | grup | aralık | süre |
|---|---|---|---|
| İlk hâli | 2 | 3 | 30 tick — 1.5 sn |
| Kısaltılan | 4 | 2 | 10 tick — 0.5 sn |
| **Şimdiki** | **1** | **3** | **60 tick — 3.0 sn** |
| TNT | 2 | 2 | değişmedi |

Şimşekler artık teker teker düşüyor, hepsi birden değil. Ölçüldü: 20 yıldırım
58 tick (2.9 sn).

Daha uzun istenirse `SIMSEK_ARALIK` büyütülür (4 → 4.0 sn, 5 → 5.0 sn).
`SIMSEK_SAYISI` artırmak da süreyi uzatır ve daha çok yıldırım düşürür.

**Dikkat:** yağmur `BEKLEME` süresinden uzun olursa yeni tetikleme beklemeye
takılır. Şu an ikisi de 60 tick. `SIMSEK_ARALIK`'ı 4'e çıkarırsan `BEKLEME`'yi
de 80 yap.

### Eşyasız tetikleme — dört yeteneğin hepsi

Eşya tutmadan hepsi kullanılabiliyor. Eşyalar da çalışmaya devam ediyor.

| jest | ne yapar |
|---|---|
| **eğil + tam yukarı bak** (≈0.4 sn tut) | yeteneği değiştirir, actionbar'da yazar |
| **eğil + zıpla** | seçili yeteneği çalıştırır |

Sıra: Yıldırım Halkası → Yön Şimşeği → Alan Şimşeği → TNT Yağmuru →
Toprak Topu → (başa döner). `ESYASIZ_SIRA` listesinden düzenlenir.

**Neden jest, "kol kaldırma" değil?** Minecraft'ta "kolunu kaldır" diye bir
oyuncu girdisi yok. `playanimation` kolu kaldıran bir **komut** — biz
oynatıyoruz, oyuncu yapmıyor ve okunamıyor. Script'in görebildiği gerçek
girdiler: eğilme, zıplama, koşma, bakış yönü, hareket.

**Neden çalıştırma zıplamaya bağlı?** Yön şimşeği, TNT ve toprak topu
baktığın yere gidiyor. Çalıştırma jesti bakışı kısıtlasaydı nişan
alamazdın. Zıplama bakıştan bağımsız.

Zıplama basılı tutulunca tekrarlamıyor — yalnızca "zıplamıyordu → zıplıyor"
geçişinde tetikleniyor.

| ayar | varsayılan | ne yapar |
|---|---|---|
| `ESYASIZ_ACIK` | `true` | özelliği açar/kapatır |
| `ESYASIZ_EGILME_SART` | `true` | jestler eğilme gerektirsin mi |
| `ESYASIZ_BAKIS_ESIGI` | `0.9` | yukarı bakış eşiği (1.0 = tam dik) |
| `ESYASIZ_TUTMA` | `8` | değiştirme jesti kaç tick tutulmalı |
| `ESYASIZ_TARAMA` | `4` | kaç tick'te bir kontrol |
| `ESYASIZ_IC_YARICAP` | `6` | oyuncuya en yakın kaç blok |
| `ESYASIZ_DIS_YARICAP` | `14` | en uzak kaç blok |

`player.isJumping` API'de yoksa çalıştırma jesti devre dışı kalıyor ve
Content Log'a uyarı düşüyor; değiştirme jesti çalışmaya devam ediyor.

Yıldırım Halkası için iki tasarım kararı:

**Yıldırım oyuncunun üzerine değil, etrafındaki halkaya düşüyor.**
Tetiklemek için yukarı bakmak gerektiğinden "baktığı yer" gökyüzü olurdu ve
yıldırım 150 blok yukarıda görünmez şekilde doğardı. Ayrıca üstüne düşseydi
tetikleyen kişi kendi yıldırımından ölürdü. İç yarıçap güvenlik payı.

**Duruşu bozmadan tekrar tetiklenmiyor.** İlk halde el yukarıda beklerken
bekleme süresi her dolduğunda kendiliğinden yeniden yağıyordu (testte 20
yerine 40 yıldırım çıktı). Artık tekrar tetiklemek için duruşu bozup yeniden
yapmak gerekiyor.

**Maliyet:** tarama 4 tick'te bir yapılıyor (saniyede 5 kez), sadece
`getAllPlayers` + `isSneaking` + `getViewDirection`. Blok bütçesine
dokunmuyor.

## Yetenekler (v3.1 — 9 adet)

| # | yetenek | eşya | jest sırası | maliyet |
|---|---|---|---|---|
| 1 | Yıldırım Halkası | — | 10 | düşük |
| 2 | Yön Şimşeği | blaze_rod | 20 | düşük |
| 3 | Alan Şimşeği | ghast_tear | 30 | düşük |
| 4 | TNT Yağmuru | nether_star | 40 | **yüksek** (30 patlama) |
| 5 | Toprak Topu | clay_ball | 50 | orta (1414 blok) |
| 6 | Baktığını Uçur | — | 60 | çok düşük (anlık) |
| 7 | Uçuş | — | 70 | çok düşük (anlık) |
| 8 | Güçlü TNT | — | 80 | orta (1 patlama, güç 8) |
| 9 | Yıldırım Meteoru | — | 90 | orta (6 patlama, güç 5) |

### Yeni yetenekler hakkında

**Baktığını Uçur.** Bakış konisindeki varlıkları savurur, blok kırmaz. Koni
genişliği `SAVUR_ACI` ile ayarlanır (0.6 ≈ 53°). Arkadakiler etkilenmez —
test edildi. Oyunculara `applyImpulse` çalışmadığı için `applyKnockback`
kullanılıyor; imzası sürümler arası değiştiğinden iki biçim de deneniyor.

**Uçuş.** `applyImpulse` oyuncularda çalışmaz, o yüzden `levitation` efekti
kullanılıyor. Bitince serbest düşüşe geçip ölmeyesin diye `slow_falling` da
veriliyor (7 sn uçuş + 17 sn yavaş düşme).

**Güçlü TNT.** Vanilla TNT'nin patlama gücü motor tarafında **sabit 4** ve
script ile değiştirilemez. Bu yüzden TNT varlığı fırlatılıyor, fitil dolunca
varlık **elle kaldırılıp** yerine kendi patlamamız çağrılıyor. Görünüm vanilla
TNT, güç bizim (`GTNT_GUC = 8`). Varlık kaldırılmazsa çift patlama olur.

**Yıldırım Meteoru.** Her meteor = 1 yıldırım + 1 patlama, 6 tane.

### Patlama bütçesi

Patlama en pahalı iş: güç 4'lük bir patlama ~50 blok kırar ve o kadar item
düşürür; güç 8 bunun kabaca 4 katı. Tablette gerçek maliyet **henüz
ölçülmediği için** tavan bilerek düşük tutuldu:

```js
export const TICK_PATLAMA_BUTCESI = 1;   // tick başına 1 patlama, TÜM oyuncular
```

4 oyuncu aynı anda meteor atınca bile tick başına 1 patlama işleniyor —
test edildi. Ölçüm satırındaki `maks` rahatsa bu değer yükseltilebilir.

## Aşama 3 — kol sistemi (v3.2)

Sekiz **özel kol eşyası**. Elde tutunca 3B kol olarak görünüyor ve o kolun
yeteneğini veriyor.

| eşya | görünen ad | tetiklediği yetenek |
|---|---|---|
| `pa:kol_halka` | Yıldırım Halkası Kolu | yildirim_halkasi |
| `pa:kol_simsek` | Şimşek Kolu | yon_simsegi |
| `pa:kol_alan` | Alan Şimşeği Kolu | alan_simsegi |
| `pa:kol_tnt` | Güçlü TNT Kolu | guclu_tnt |
| `pa:kol_top` | Toprak Topu Kolu | toprak_topu |
| `pa:kol_savur` | Savurma Kolu | savur |
| `pa:kol_ucus` | Uçuş Kolu | ucus |
| `pa:kol_meteor` | Meteor Kolu | meteor |

### Nasıl çalışıyor

**Görünüm** — resource pack'te `attachable`. Eşya elde tutulunca yerine 3B kol
modeli çiziliyor. Model tek: `geometry.simsek_kol`, 4×12×4 kutu (Minecraft'ın
standart kol ölçüsü), sekiz kol da onu paylaşıyor, sadece doku farklı.

**Doku düzeni** — `uv [40, 16]`, yani **64×64 oyuncu skin'indeki sağ kol
bölgesi**. Buraya normal bir skin PNG'si koyarsan kol doğru görünür.

**Tetikleme** — iki yol, ikisi de çalışıyor:
1. Eşyayı kullanmak
2. **Elde kol varken eğil+zıpla** → seçili yetenek yerine **kolun** yeteneği
   çalışır. "Kolu takınca o güce sahip olursun" mantığı bu.

Kol yokken jest sistemi normal seçili yeteneği çalıştırmaya devam ediyor.

### Kayıt

`yetenekler/kollar.js` sadece eşya→yetenek eşlemesi yapıyor; yetenek
dosyalarına hiç dokunulmadı. Kayıt defterine `esyaBagla()` eklendi — var olan
bir yeteneğe ikinci bir tetikleyici eşya bağlıyor.

### Dokular yer tutucu

`textures/entity/*.png` (64×64) ve `textures/item/*.png` (16×16) şu an
üretilmiş basit yer tutucular. Kendi çizimlerini aynı adlarla değiştirmen
yeterli, başka hiçbir şeye dokunmaya gerek yok.

### Yeni kol eklemek

Sekiz dosyayı elle senkron tutmak hataya davetiye olduğu için hepsini **tek bir
üretici** yazıyor: `kol_uret.py` (scratchpad'de). Yeni kol eklemek için oradaki
`KOLLAR` listesine bir satır ekleyip çalıştırmak yeterli — eşya JSON'u,
attachable, iki doku, `item_texture.json` satırı ve iki dil satırı birden
üretiliyor. Sonra `yetenekler/kollar.js`'e bir satır ekle.

## Aşama 4 — kol sistemi yeniden yazıldı (v3.4)

v3.2/v3.3'teki kol sistemi üç ayrı sebepten çalışmıyordu. Referans olarak
`add-ons.zip` içindeki "En İyi BoraLo Kol Modu V2" satır satır karşılaştırıldı.

### Hata 1 — kök kemik adı (görünüm hiç çalışmıyordu)

Geometrinin kök kemiği `kol_kok` adındaydı. Bedrock attachable modelini oyuncu
iskeletine bağlarken **kemik adlarını eşliyor**; oyuncuda `kol_kok` diye bir
kemik olmadığı için model kola hiç oturmuyordu.

Referanstaki 34 kol modelinin **33'ünde kök kemik `RightArm`**. Bizimki de artık
öyle:

```
RightArm  (pivot -5,22,0, kübü yok)
└── kol   (4×12×4, uv [40,16], inflate 0.15)
```

`inflate 0.15` skin'in kendi kolunun üstünü kapatıyor, z-fighting olmuyor.

### Hata 2 — `itemUse` özel eşyalarda tetiklenmeyebiliyor

Bazı sürümlerde `world.afterEvents.itemUse` vanilla eşyalarda çalışıyor ama
özel eşyalarda çalışmıyor. İkinci bir giriş yolu eklendi:

```
items/kol_top.json:  on_use -> "scriptevent simsek:kol kol_top"
main.js:             system.afterEvents.scriptEventReceive
```

İki yol da tetiklenirse ikincisi `yetenekTetikle` içindeki bekleme kontrolüne
takılıp yutuluyor, yani çift çalışma yok. Test: `kol2.mjs`.

### Hata 3 — teşhis edilemeyen `/give` hatası

`/give @s pa:kol_top` "söz dizimi hatası" veriyorsa sebep tek: eşya oyunun
kayıt defterinde yok, yani dünyada **eski sürüm behavior pack** etkin. Komut
satırı bunu söylemiyor. Artık script kendisi bakıyor:

- Açılışta `ItemTypes.get()` ile sekiz eşya tek tek sınanıyor, eksik olanlar
  **adıyla** Content Log'a ve sohbete yazılıyor.
- `/give` yazmaya hiç gerek kalmasın diye üçüncü bir jest eklendi:
  **eğil + tam aşağı bak, tut** → sekiz kol da envantere giriyor. Komut değil
  doğrudan `ItemStack` + `container.addItem()` kullanıyor.

Jest şeması artık tam:

| jest | sonuç |
|---|---|
| eğil + yukarı bak, tut | yetenek değiştir |
| eğil + zıpla | seçili yeteneği çalıştır |
| eğil + aşağı bak, tut | sekiz kolu envantere koy |

### Ek düzeltmeler

- `texts/en_US.lang` + `tr_TR.lang` eklendi — eşya adları artık Türkçe
  karakterli görünüyor (`minecraft:display_name` ASCII kalıyor, dil dosyası
  onun üstüne yazıyor).
- `minecraft:cooldown` 3 sn eklendi (`BEKLEME` = 60 tick ile aynı) — ekranda
  dönen bekleme göstergesi çıkıyor.
- `off_hand` render offset'leri eklendi.
- `import * as api from "@minecraft/server"` kullanıldı: adla import
  ("`import { ItemTypes }`") API'de o ad yoksa modül **bağlanırken** patlar ve
  tüm paket ölür; isim alanı importu sadece `undefined` bırakır.
- Üst düzey `await` kullanılmadı — Bedrock motorunda garantisi yok.

### Ölçüm sonucu — bütçe doğrulandı (v3.1, ~17 atış)

| ölçü | değer | yorum |
|---|---|---|
| blok/atış | 1202–1438 | orijinal ~2046 olurdu → delta önbelleği **%29–30** kazandırıyor |
| blok/tick | 21.1–22.8 | bütçe 28, tavana değmiyor |
| uçuş süresi | 55–66 tick | orijinal 62 → **yavaşlama yok** |
| bütçe dolan tick | 27–35 / ~60 | tick'lerin yarısında tavan zorlanıyor |
| ort | 1.71–2.73 ms | 50 ms'lik tick'in %4'ü |
| maks | 5–22 ms | tek tick'lik sıçrama, patlama tick'i |

`TICK_BLOK_BUTCESI = 28` **değiştirilmedi**. 24'e düşürmek uçuşu 80 tick'e
çıkarıyordu (ölçülmüştü), 32'ye çıkarmanın faydası yok çünkü zaten 22.8
blok/tick'i geçmiyor. 22 ms'lik maks patlamadan geliyor,
`TICK_PATLAMA_BUTCESI` zaten en düşük değerde (1).

## Aşama 5 — referanstan alınan dört yetenek (v3.5)

`add-ons.zip` içindeki iki mod (BoraLo Kol Modu V2 + Nitroksin) tamamen
söküldü. İkisi de aynı araçla üretilmiş (pamobile "Addons Maker"), tamamı
`.mcfunction`, hiç JavaScript yok. Kol Modu 3 MB ama **gerçek mantık 113
satır**; Nitroksin'de de durum aynı.

### Referansın komut dağarcığı

Altı kol ailesinin (Dirt, Bedrock, Anna1545, Bobby, Buz, Falen) bütün
yetenekleri şu sekiz komuttan ibaret:

| yetenek | referanstaki komut |
|---|---|
| şimşek | `summon lightning_bolt^^^12` |
| uçma | `effect @s levitation 1 2` |
| uçurma | `execute @s^^^N /effect @e[r=N,c=1] levitation 1 255` |
| meteor | `execute @s^^^12 /summon tnt ~~30~` |
| örs yağdır | `execute @s^^^6 /setblock ~~10~ anvil` |
| yamultma | `slowness 100000 255` + `animation.fox.sleep` |
| buz adam | hedefin kafasına `pa:buz_man` kaskını kilitle |
| can verme | `effect @s health_boost 100000 255` |

### Referansın menü sistemi

"Sağ Tıkla" eşyası bir menü açıcı: kullanınca envantere 5 yetenek eşyası
`give` ediyor. "Kapat" eşyası hepsini `clear` edip açıcıyı geri veriyor.
Gerçek bir menü yok. Bizde bu işi jest sistemi yapıyor; ileride
`@minecraft/server-ui` ile gerçek menü gelecek.

### Referansta bulunan hatalar

1. **`simsekbedrockarm.mcfunction` → `summin lightning_bolt^^^12`.** `summon`
   yazım hatası; Bedrock Arm'ın şimşeği hiç çalışmıyor. Diğer beş kolda doğru.
2. **`falenkol3` → `execute @s^^^7 /effect [r=7,c=1] levitation 1 30`.** Hedef
   seçici (`@e`) eksik; Falen Kol'un "Uçur"u çalışmıyor.
3. **`buzkoz` → `clear @a pa:buz_man`.** Bir kişiyi çözerken haritadaki
   herkesi çözüyor.
4. **Üç ayrı uçurma fonksiyonu sonunda `effect @s clear`.** Kendi
   levitation'ından kurtulmak için ama bütün faydalı efektleri de siliyor.
5. **`dirtarmyamultma` → `slowness 100000 255`,** yani ~83 dakika felç ve
   geri alan hiçbir fonksiyon yok.
6. **35 boş fonksiyon her tick çağrılıyor** (`tick.json`, hepsi 0 bayt).
   Nitroksin'de 22 girişin 12'si boş; dolu 10'u her tick **50 tane
   `@e[hasitem=...]`** taraması yapıyor. `@e` dünyadaki bütün varlıkları
   geziyor — gözü sadece oyuncu takabildiği için `@a` yeterdi.
7. **Nitroksin `ucmahiperiksin.mcfunction` → `animation...nitroksin_laze`.**
   Sondaki `r` eksik, uçuş pozu hiç oynamıyor.
8. **Nitroksin lazeri kendine vuruyor** (`@e[r=2,c=1]` oyuncuyu da sayıyor);
   çözüm yerine hemen öncesine `instant_health` konmuş.

### Nitroksin nasıl çalışıyor (aldığımız fikir)

İksir `minecraft:food` bileşenli bir eşya: içince efekt veriyor,
`using_converts_to` ile boş şişeye dönüşüyor ve bir fonksiyon çalıştırıyor.
O fonksiyon kafa zırhı slotuna **kilitli bir "göz" eşyası** takıyor
(`item_lock: lock_in_slot`). Göz hem görünüm hem durum bayrağı: `tick.json`
her tick `@e[hasitem={item=pa:beyaz_goz,location=slot.armor.head}]` seçip buff
veriyor. Görünüm `.player.json` attachable'ından geliyor ve
`variable.helmet_layer_visible = 0.0` ile kaskın kendisini gizliyor.

Bu numara Bedrock'ta beyaz göz yapmanın **doğru** yolu; ileride Nitroksin
yapılırsa aynen alınacak. Ama güç mantığı script'e taşınmalı: bizde durum
`Map<oyuncuId, kademe>` olur, her tick dünya taraması gerekmez.

### v3.5'te eklenenler

**Can Verme** (`can_verme.js`) — referans sadece `@s`'ye 100000 tick,
seviye 255 `health_boost` veriyordu. Bizimki:
- çevredeki **dostları** da iyileştiriyor (asıl "can verme" bu)
- süresi belli (`CAN_SURE`), seviyeler makul
- düşmanları atlıyor (`CAN_DUSMAN`) — yoksa sana saldıran zombiyi de iyileştirirsin
- `health_boost` yerine `absorption`: health_boost can barının **tavanını**
  yükseltiyor ama boşunu doldurmuyor, yani yaralı birine hiçbir şey yapmıyor

**Örs Yağdır** (`ors.js`) — referans tek örs koyup orada ne varsa yok
ediyordu. Bizimki birden fazla örs yağdırıyor, **sadece hava olan yere**
koyuyor, blok bütçesine uyuyor, dünya sınırının dışına çıkmıyor. Örsün
düşmesi ve hasar vermesi vanilla fiziği, ayrıca hesaplamıyoruz.

**Buz Adam** (`buz_adam.js`) — referans sadece görünüm değiştiriyordu
(hedef serbest kalıyordu) ve kalıcıydı. Bizimki gerçekten hapsediyor:
hedefin etrafına buz kabuğu örülüyor, yavaşlık veriliyor, süre dolunca
buz eriyor. Üç aşamalı iş: **ÖRME → BEKLEME → ERİME**. Örme ve erime blok
bütçesine uyuyor, bekleme bedava. Sadece havanın yerine buz konuyor ve
erirken yalnızca **bizim koyduğumuz** buz kaldırılıyor — hiçbir şey yok
olmuyor.

> `i` ve `eritilen` ayrı sayaçlar. Tek sayaç olsaydı iş ÖRME sırasında
> durdurulunca (oyuncu çıktı, hata oldu) `bitir()` yanlış yerden başlar ve
> koyduğumuz buzu temizlemeden bırakırdı.

**Düşen Meteor** (`meteor.js` yeniden yazıldı) — eski hâlimiz anlık
yıldırım + patlamaydı, **gelen bir şey görünmüyordu**. Referansın tek iyi
tarafı meteorun görünmesiydi (`summon tnt ~~30~`), zayıf tarafı vanilla
TNT'nin gücünün motorda sabit 4 olması. İkisi birleştirildi: gövde yukarıda
doğup gerçekten düşüyor, yere yaklaşınca kaldırılıp yerine **bizim**
patlamamız çağrılıyor. `METEOR_YUKSEK = 0` eski anlık davranışa döndürür.

Havada birden fazla gövde olabilir; hepsi tek listede izleniyor ve patlama
bütçesini paylaşıyorlar. `METEOR_TAVAN` takılan bir gövdenin işi sonsuza
kadar açık tutmasını engelliyor. `bitir()` havada TNT bırakmıyor — bıraksa
fitili dolunca vanilla güç-4 patlaması yapardı.

Üç yeni kol eklendi: `pa:kol_can`, `pa:kol_ors`, `pa:kol_buz`. Toplam **11
kol, 12 yetenek**.

### Testler

`dort.mjs` her yetenek için "referansın yaptığı hatayı biz yapmıyoruz"
iddiasını ayrı ayrı sınıyor: düşman iyileştirilmiyor mu, dolu yere örs
konmuyor mu, buzun hepsi eriyor mu, patlama gücü vanilla 4 değil mi, hiçbir
tick blok bütçesini aşmıyor mu.

İki test kendi hatalarını yakalattı:
- Sahte dünyanın `getViewDirection`'ı birim vektör döndürmüyordu; gerçek API
  döndürüyor. Düzeltilince `kol2.mjs`'teki "düz bakış" vektörünün
  `(0,-0.3,0)` olduğu ortaya çıktı — normalleştirilince **tam aşağı**, yani
  test yanlış şeyi sınıyormuş.
- `dort.mjs`'te nişan açısı fazla dikti, hedef taş katmanına düşüyordu ve
  "sadece havaya koyar" kuralı yüzünden hiçbir örs konmuyordu.

## Aşama 6 — eşya formatı: deneysel bağımlılıklar kaldırıldı (v3.6)

v3.5 oyunda **11/11 kol eşyası kaydolmadı**. Açılış teşhisi bunu doğru
yakaladı ama sebep tahmini yanlıştı ("eski sürüm pack etkin" diyordu; oysa
dünyada tek sürüm vardı, 3.5.0).

Tek bir JSON bozuk olsa **1/11** düşerdi. **11/11** düşmesi yapının
tamamının reddedildiğini gösteriyor. İki deneysel bağımlılık vardı:

1. **`format_version: "1.16.100"`** — eski veri-tabanlı eşya formatı.
   Modern sürümlerde **"Holiday Creator Features"** deneysel ayarı açık
   değilse sessizce yok sayılıyor.
2. **`minecraft:on_use` → `events` → `run_command`** — bu olay yanıtı hiçbir
   zaman kararlı hâle gelmedi.

İkisi de referans moddan (Addons Maker çıktısı) miras alınmıştı; o mod
deneysel ayarlarla çalışıyor olmalı.

### v3.6'daki eşya formatı

```json
{
  "format_version": "1.21.0",
  "minecraft:item": {
    "description": {
      "identifier": "pa:kol_top",
      "menu_category": { "category": "equipment" }
    },
    "components": {
      "minecraft:icon": "kol_top",
      "minecraft:display_name": { "value": "Toprak Topu Kolu" },
      "minecraft:max_stack_size": 1,
      "minecraft:hand_equipped": true,
      "minecraft:allow_off_hand": false,
      "minecraft:cooldown": { "category": "kol_top_bekleme", "duration": 3.0 }
    }
  }
}
```

Bileşenler bilerek az tutuldu: **her fazladan bileşen, eşyanın tamamen
reddedilme riski.** `render_offsets` da çıkarıldı — eski bir bileşen ve bize
gerekmiyor, çünkü modelin kök kemiği `RightArm` olduğu için zaten oyuncunun
koluyla aynı ölçekte çiziliyor.

`kol2.mjs` artık bu deneysel alanların **geri gelmediğini** sınıyor.

### Eşyasız yol her zaman çalışıyor

Eşyalar kaydolmasa bile 12 yeteneğin hepsi jestle çalışıyor. Açılış mesajı
artık bunu söylüyor; "eski paketi kaldır" tavsiyesi kaldırıldı çünkü yanlıştı.

Elle deneme yolu da duruyor: `/scriptevent simsek:kol kol_top` — eşya JSON'unda
`on_use` olmasa da `scriptEventReceive` dinleyicisi yerinde.

## Aşama 7 — Toprak Kol: tek kolda beş yetenek (v3.7)

Şu ana kadar her kol **tek** yetenek taşıyordu. Referans moddaki Dirt Arm ise
bir kol + o kola ait bir yetenek seti şeklinde. Toprak Kol bunu getiriyor:

| sıra | yetenek |
|---|---|
| 1 | Can Verme |
| 2 | Toprak Topu (kil topu) |
| 3 | Yön Şimşeği |
| 4 | Örs Yağdır |
| 5 | **Toprak Yükselişi** (bu kola özel uçuş) |

### Kayıt defteri: eşya → yetenek LİSTESİ

`esyaHaritasi` artık `esya -> [tanim, ...]` tutuyor. Tek yetenekli kollar da
aynı yolu kullanıyor, listede tek eleman var — iki ayrı kod yolu yok.

`esyaninYetenekleri(esya)` diziyi, `esyaninYetenegi(esya)` ilk elemanı
döndürüyor. `esyaBagla()` aynı eşyaya birden çok kez çağrılabilir; yetenekler
sırayla listeye eklenir.

### Seçim kol başına tutuluyor

```
kolSecim: oyuncuId -> { esya, i }
```

Kaydın içinde eşya kimliği de var: elindeki kolu değiştirip geri aldığında o
kolun seçimi yerinde kalıyor. Kol içi geçiş **genel eşyasız sırayı**
karıştırmıyor — ikisi ayrı.

Üç tetikleme yolu da (eşya kullanma, jest, `scriptevent`) aynı seçimi okuyor.

### Toprak Yükselişi

Düz `Uçuş` levitation verip bırakıyor, geride bir şey kalmıyor. Toprak
Yükselişi yükselirken **altında toprak sütunu** örüyor — uçuş bitince kule
duruyor, üstünde durabilirsin.

Levitation'a hâlâ ihtiyaç var çünkü `applyImpulse` oyunculara işlemiyor;
sütun itmiyor, sadece arkandan geliyor. Sadece havanın yerine blok konuyor.
Bütçe doluysa o tick sütun büyümez ama uçuş devam eder — sütunda boşluk olur,
iş durmaz. `TUCUS_TAVAN` sütunu sınırlıyor.

### Doku

Toprak Kol'un dokusu diğerlerinden ayrı üretiliyor (`toprak_dokusu()`):
koyu zemin üzerinde düzensiz toprak lekeleri ve birkaç koyu kırmızı vurgu.
Desen sabit tohumlu — her çalıştırmada aynı çıkıyor, git'te gereksiz
değişiklik görünmüyor. Beş yeteneği olduğu için envanterde ilk bakışta
ayırt edilmesi gerekiyordu.

Toplam: **12 kol, 13 yetenek.**

## Aşama 8 — iksirler, uçurma, yamultma (v3.8)

Kullanıcı iki yeni arşiv gönderdi: `toprakkol modu v3` ve `BoraLo Mod (V14)`.
İkisi de aynı araçla (pamobile Addons Maker) üretilmiş, tamamı `.mcfunction`.

### Ölçek: 21 MB, 1132 satır mantık

| | BoraLo V14 | toprakkol v3 |
|---|---|---|
| fonksiyon | 643 (**139'u boş**) | 165 (**47'si boş**) |
| komut satırı | 1132 | 352 |
| `tick.json` | 161 giriş, **139'u boş** | 48 giriş, **47'si boş** |
| eşya / blok | 245 / 49 | 58 / 10 |

BoraLo V14'te 1132 satırın **721'i** (%64) sadece `give` + `replaceitem` —
yani eşya taşıma, "menü" sistemi. Gerçek oynanış: `effect` 112, `summon` 32,
`playanimation` 31, `particle` 11, `tp` 8, `setblock` 2.

### Referansta bulunan yeni hatalar

1. **`op @s`** — bir fonksiyon oyuncuya operatör yetkisi veriyor, yanında
   `tellraw @a "ADMİN MOD:Eneblad"`. O eşyayı alan herkes op oluyor.
2. **`tp @a @s`** — üç ayrı yerde: bütün oyuncuları kendine ışınlıyor.
3. **`msg @a herkese merhaba`** — pakette kalmış hata ayıklama satırı.
4. **`tp @s^^^12 @s^^^12`** — hiçbir şeyi hiçbir yere ışınlamıyor, ölü satır.
5. **`summon lightning_bolt ^^^+10`** — caret koordinatı `+` kabul etmiyor.
   Aynı modda doğrusu (`^^^10`) da var, yani 6 çağrı sessizce çalışmıyor.
6. **`Gamerule`** — büyük harfle, komut çalışmıyor.
7. **`player.json` vanilla oyuncuyu eziyor** ama 23 bileşeni de vanilla
   kopyası, `animations`/`scripts` boş. Sıfır fayda, tam çakışma riski.
8. **`custom.animation_controllers.json`** içinde `controller.animation.nethercat`
   ve `augustolophus` var — alakasız bir mod'dan kalma ölü ağırlık.
9. **Davranış paketi animasyon denetleyicileri sonsuz döngü:** geçiş şartı
   `(1.0)` (her zaman doğru), iki durum da `on_entry`'de aynı fonksiyonu
   çağırıyor. Bağlanmadıkları için patlamıyorlar.
10. **64 + 68 + 294 tarif dosyasının hepsi boş `{}`.**

### Alınanlar

**İksir / kademe sistemi** (`iksir.js`) — Nitroksin'in bizdeki karşılığı.

Referans: iksir `minecraft:food`, içince kafa zırhına **kilitli** bir "göz"
takıyor, güç o gözden geliyor çünkü `tick.json` her tick
`@e[hasitem={item=pa:beyaz_goz,location=slot.armor.head}]` ile **dünyadaki
bütün varlıkları** tarıyor. Beş göz × beş efekt = tick başına 25 tam tarama.
Gözü çıkarmanın yolu yok, yani güç kalıcı.

Bizde durum script'te bir `Map`. Tarama yok — sadece iksir içmiş oyuncular
geziliyor, kimse içmemişse döngü hiç dönmüyor. **Göz sadece görünüm**, güç
bayrağı değil: oyuncu çıkarsa bile kademe devam eder, o yüzden kilitlemeye
gerek yok. Süre dolunca göz kendiliğinden çıkıyor.

Beş kademe: Nitroksin → Grinoksin → Ateş İksiri → Kan İksiri → Hiperoksin.
Kademeler **birikmiyor** — yeni iksir öncekini iptal eder.

> Kademe iş listesine **girmiyor**. Girseydi "oyuncu başına tek efekt" kuralı
> yüzünden 60 saniye boyunca bütün yetenekler kilitlenirdi.

İçme `itemCompleteUse` ile yakalanıyor (`itemUse` içmeye *başlayınca*
tetikleniyor — yarım bırakıp güç kazanmayasın).

**Uçurma** (`ucurma.js`) — `savur` ile karıştırılmasın: savur `applyImpulse`
ile yatay **iter**, uçurma `levitation` ile **kaldırır**, hedef çaresizce
havada asılı kalır. Referans üç ayrı mesafede (`^^^2`, `^^^5`, `^^^7`) tek tek
hedefliyordu, yani tam o noktalardakiler vuruluyordu; bizimki koninin tamamını
tarıyor. Referansın sonundaki `effect @s clear` bize gerekmiyor — kendimizi
zaten hedef listesine almıyoruz.

**Yamultma** (`yamult.js`) — referans `slowness 100000 255` veriyordu ve geri
alan **hiçbir fonksiyon yoktu**. Bizimki süreli ve **çaresi var**: felçli
birine aynı yeteneği tekrar kullanırsan çözülür. Sadece bizim felç
ettiklerimiz çözülüyor, başkasının verdiği yavaşlığa dokunulmuyor.

Üç yetenek de `koniHedefleri()` yardımcısını paylaşıyor; tavan aşılırsa
**en yakınlar** seçiliyor, rastgele değil.

Toplam: **15 yetenek, 12 kol, 5 iksir, 5 göz.**

### Alınmayanlar ve sebepleri

`op`/`tp @a`/`gamemode` komutları (tehlikeli), `player.json` override
(çakışma riski, sıfır fayda), boş tick fonksiyonları, `item_lock` kilidi,
`@e[hasitem]` tarama deseni, boş tarif dosyaları.

## Aşama 9 — yapı düzeltmesi ve görsel efektler (v3.9)

### İksirler artık yeteneklerle aynı yapıda

v3.8'de iksir sistemi `scripts/iksir.js` diye **özel durum** bir dosyaydı ve
`main.js` içinde kendine ait bir `itemCompleteUse` aboneliği vardı. Davranış
doğruydu ama yapı diğerlerinden ayrıydı.

Artık aynı kalıp:

| | yetenekler | kollar | iksirler |
|---|---|---|---|
| kayıt | `yetenekKaydet` | `esyaBagla` | `iksirKaydet` |
| yer | `yetenekler/*.js` | `yetenekler/kollar.js` | `yetenekler/iksirler.js` |
| main.js'te | bir import satırı | bir import satırı | bir import satırı |
| sabitler | `ayarlar.js` | `ayarlar.js` | `ayarlar.js` (`KADEMELER`) |

Dosya kendini kayıt defterine yazıyor ve **kendi aboneliğini kendi kuruyor**;
`main.js` sadece `iksirTara()` çağırıyor. Yeni iksir eklemek =
`ayarlar.js`'teki `KADEMELER`'e bir satır. **Davranış hiç değişmedi** —
`iksir.mjs` testinin tamamı dokunulmadan geçiyor.

### Toprak Duvar

Referans: `fill ^1^5^6 ^-2^^6 dirt` — tek tick'te kutuyu dolduruyor ve orada
ne varsa **yok ediyor**. Bizimki bütçeye uyuyor ve sadece havanın yerine
koyuyor.

Geometri: duvar bakış yönüne **dik** durmalı. Yatay bakış `(bx, bz)` ise dik
eksen `(bz, -bx)` — duvarın genişliği bu yönde uzuyor. Hücreler aşağıdan
yukarı ve ortadan dışa doğru sıralı: bütçe yetmezse duvar "yarım ama işe
yarar" kalıyor, delik deşik değil. Tam yukarı/aşağı bakarken yön belirsiz
olduğu için uyarı verip çıkıyor.

Toprak Kol'un altıncı yeteneği oldu.

### Parçacık ve ekran sarsıntısı

İkisi de `yardimcilar.js`'te, ayrı ayrı kapatılabiliyor (`PARCACIK_ACIK`,
`SARSINTI_ACIK`) çünkü tablette parçacık pahalıya gelebilir.

- Parçacık: referans `execute @s^^^4 /particle ...` diye **komutla** yapıyordu;
  script API'sinde `dimension.spawnParticle()` var, komut ayrıştırma maliyeti
  yok. Tip tanınmazsa bir kez uyarıp sessizce geçiyor.
- Sarsıntı: script API'sinde karşılığı yok, komut şart. Referans
  `camerashake add @s 4` diyordu — **4 çok fazla**, mide bulandırıyor.
  Bizimki 0.35 şiddet / 0.45 sn.

Patlamada (meteor, güçlü TNT) sarsıntı + patlama parçacığı; can vermede kalp;
buz adamda kar tanesi; duvarda toprak parçacığı.

### Doku paketi incelemesi — asıl sürpriz

`BoraLo Mod V14` kaynak paketinde 491 doku, 265 attachable, 182 model var.
Dosyaları gerçek türlerine göre taradım:

**8 dosyanın adı `.png` ama içeriği JPEG.** Bedrock JPEG yükleyemez — o
dokular oyunda hiç görünmüyor:

```
entity/pamobile/pa_boralo_kiyafet4.png    JPEG 4096x2048
entity/pamobile/pa_boralo_kiyafet_5.png   JPEG 4096x2048
entity/pamobile/pa_boralo_kiyafet_3.png   JPEG 3072x1536
entity/pamobile/pa_boralo_kiyafet_2.png   JPEG 3072x1536
entity/pamobile/pa_boralo_kiyafet_1.png   JPEG 1920x960
blocks/pa_negromeysr_evren_block_up.png   JPEG 420x420
blocks/pa_negromeysr_evren_block_side.png JPEG 225x225
blocks/pa_hhhh_block.png                  JPEG (bozuk başlık)
```

Yüklenebilenler arasında da ölçüsüz olanlar var:

| dosya | boyut | olması gereken |
|---|---|---|
| `pa_entity303_goz.png` | **3072×3072** (9.4 MP) | 64×64 |
| `pa_mezar.png` | 1024×1024 | 64×64 |
| `pa_altn_kulcesi.png` | 512×512 (blok) | 16×16 |
| `pa_gravity_gun.png` | 828×595 (eşya ikonu) | 16×16 |

Tek bir 4096×2048 doku bellekte sıkıştırılmamış **32 MB** yer kaplar. Beş
tanesi 160 MB eder — ve hiçbiri yüklenmiyor bile. Tablette oynanacak bir mod
için bu, script tarafındaki bütün optimizasyonlardan daha büyük bir kalem.

Bizim bütün dokularımız 16×16 ve 64×64; toplam paket 24 KB.

## Aşama 10 — göz lazeri ve gücü kapatma (v4.0)

v3.8/v3.9'da iksir sisteminin **buff kısmı** yapılmıştı ama Nitroksin'in
asıl ikonik yeteneği atlanmıştı: **gözden çıkan lazer**.

### Referanstaki lazer

Beş kademenin lazer fonksiyonu da **birebir aynı**:

```
replaceitem entity @s slot.armor.head 1 pa:X_goz_lazer 1 0 {"item_lock":...}
effect @s instant_health 1 4
execute @s^^^2 /damage @e[r=2,c=1] 6 fire
execute @s^^^4 /damage @e[r=4,c=1] 6 fire
execute @s^^^6 /damage @e[r=6,c=1] 6 fire
execute @s^^^8 /damage @e[r=8,c=1] 6 fire
give @s pa:X_lazer_bitid
playanimation @s animation.pa_yeni_haraket.nitroksin_lazer
```

Sabit 6 hasar, sabit 8 blok, kademe farkı yok. Üç sorunu var:

1. **Nokta tarıyor, çizgi değil.** 2/4/6/8. bloktakiler vuruluyor, 3., 5. ve
   7. bloktakiler kurtuluyor.
2. **`@e[r=2,c=1]` oyuncunun kendisini de sayıyor.** Bu yüzden her lazerden
   önce `effect @s instant_health 1 4` var — kendi lazerinle vurulup anında
   iyileşiyorsun. Yama, çözüm değil.
3. **"Lazeri kapat" düğmesi de aynı dört hasar satırını çalıştırıyor**, yani
   kapatmak da hasar veriyor.

Ayrıca **Kan (Bloody) kademesi tamamen bozuk**: dört eşya
`pa:Bloody_goz`, `pa:Bloody_goz_lazer`, `pa:Bloody_lazer_basla`,
`pa:Bloody_lazer_bitid` diye **büyük B** ile çağrılıyor ama
`pa:bloody_...` diye küçük harfle tanımlı. Bedrock kimlikleri büyük/küçük
harfe duyarlı, yani o kademenin gözü de lazeri de hiç çalışmıyor.

### Bizdeki lazer

Işın bir **çizgi**. Tek `getEntities` çağrısı yapılıyor, sonra her varlığın
ışın üzerine izdüşümü hesaplanıyor:

```
ileri     = (hedef - baş) · bakış          → ne kadar ilerde
sapmaKare = |hedef - baş|² - ileri²        → ne kadar yanda
vurulur   ⟺ 0 ≤ ileri ≤ menzil ve sapmaKare ≤ kalınlık²
```

Dört ayrı dünya taraması yerine **bir** tarama — hem daha doğru hem daha ucuz.
Kendimizi hedef listesine hiç almıyoruz, o yüzden kendini iyileştirme
yamasına gerek yok. Tavan aşılırsa en yakındakiler vuruluyor.

Hasar ve menzil **kademeye göre** artıyor:

| kademe | hasar | menzil |
|---|---|---|
| Nitroksin | 6 | 10 |
| Grinoksin | 8 | 14 |
| Ateş İksiri | 10 | 18 (+ ateşe verir) |
| Kan İksiri | 13 | 22 |
| Hiperoksin | 16 | 28 |

İksir içmemişsen lazer çalışmıyor ve sebebini söylüyor — lazer gözden çıkar,
göz de iksirden gelir.

Göz lazer atarken **parlak varyantına** geçip bitince normale dönüyor
(referansta da böyleydi, tek farkı bizde kilit yok). On göz eşyası: beş normal,
beş lazer.

### Gücü Kapat

Referanstaki `kapama` fonksiyonunun karşılığı. Orada sadece **eşyalar**
temizleniyordu (`clear @s pa:mavi_goz` vb.), efektler üzerinde kalıyordu —
üstelik göz `item_lock` ile kilitli olduğu için `clear`'ın işe yarayıp
yaramadığı da belirsiz. Bizimki efektleri siliyor, gözü çıkarıyor ve kayıttan
düşürüyor.

Toplam: **18 yetenek, 12 kol, 5 iksir, 10 göz.**

## Aşama 11 — ikon formatı (v4.1)

Eşyalar envanterde **var** ama ikonları görünmüyordu. Önce bizim tarafı
doğruladım, tahmin etmeden:

- 27 eşyanın 27'sinin `minecraft:icon` adı `item_texture.json`'da kayıtlı
- bütün PNG'ler geçerli (`file` ile doğrulandı), 16×16/64×64, içleri dolu
  (ikon başına ~78 saydam olmayan piksel)
- `.mcpack` içinde `textures/item_texture.json`, `texts/*.lang`, 28 ikon,
  23 attachable — hepsi yerinde

Yani atlas, doku ve paketleme sağlam. Geriye iki ihtimal kalıyor.

### İhtimal 1 — ikon bileşeninin biçimi

`minecraft:icon` iki biçimde yazılabiliyor:

```json
"minecraft:icon": { "texture": "kol_top" }   // 1.16.100'den beri
"minecraft:icon": "kol_top"                  // daha yeni kısayol
```

v3.6'da eşyaları kararlı formata taşırken düz metin kısayolunu kullanmıştım.
Eşyalar **kaydoldu** (envanterde çıkıyorlar) ama ikon araması başarısız.
Uzun süredir desteklenen `{"texture": ...}` biçimine dönüldü;
`format_version` `1.21.0` olarak kalıyor çünkü kaydolmanın o sürümle
çalıştığı zaten kanıtlandı.

### İhtimal 2 — kaynak paketi dünyada etkin değil

İkonların ve 3B kol görünümünün **tamamı** resource pack'te. Behavior pack
resource pack'i göremiyor (Bedrock'ta böyle bir API yok), o yüzden script
bunu tespit edip raporlayamıyor. Açılış mesajına kullanıcının nereye
bakacağı eklendi.

Ayırt etme yolu: kolu eline al.
- **Düz bir kare** görüyorsan → resource pack etkin değil (attachable hiç
  yüklenmemiş)
- **Kol şeklinde** bir şey görüyorsan (mor/siyah bile olsa) → resource pack
  etkin, sorun doku yolunda

## Aşama 12 — içme hatası ve kademe güçlendirmesi (v4.2)

### İçince hiçbir şey olmuyordu — gerçek hata

İksir eşyasında `minecraft:use_animation` yoktu. **Bu bileşen olmadan oyun
eşyayı içilebilir saymıyor:** dokununca içme animasyonu başlamıyor,
dolayısıyla `itemCompleteUse` olayı hiç tetiklenmiyor ve iksir tamamen ölü
kalıyor. `minecraft:food` tek başına yetmiyor.

Eklenen: `"minecraft:use_animation": "drink"`.

### Yedek tetikleme yolu

Aynı hatanın tekrar sessizce olmaması için ikinci bir yol açıldı:

| olay | ne zaman | rol |
|---|---|---|
| `itemCompleteUse` | içme **bitince** | asıl yol — yarım bırakıp güç kazanamazsın |
| `itemUse` | içmeye **başlayınca** | yedek — içme hiç tamamlanmazsa devreye girer |

Çift tetiklenme sorun değil: aynı iksir 30 tick içinde ikinci kez gelirse yok
sayılıyor, süre baştan başlamıyor. Hangi yoldan geldiği Content Log'a
yazılıyor, yani bir daha teşhis etmek kolay.

### Efektler artık görünür

`showParticles: false` idi — oyuncu efekt aldığını anlayamıyordu. `true`
yapıldı; artık iksir içince etrafında parçacık dönüyor ve efekt ikonları
ekranda çıkıyor.

### Kademeler güçlendirildi

Kullanıcının istediği gece görüşü ve kalkan (absorption) **beş kademeye de**
eklendi. Hiperoksin açık ara en güçlüsü olacak şekilde ayrıldı:

| kademe | efekt | öne çıkan |
|---|---|---|
| Nitroksin | 6 | hız 2, güç 2, kalkan 2, gece görüşü |
| Grinoksin | 7 | + direnç |
| Ateş İksiri | 7 | + ateş bağışıklığı |
| Kan İksiri | 7 | + kazma hızı, kalkan 5 |
| **Hiperoksin** | **11** | hız 6, güç 6, **kalkan 7**, su altında nefes, yüksekten düşme koruması |

Hiperoksin'de levitation bilerek yok: sürekli levitation kontrolü elinden
alıyor, yerde duramıyorsun. Yerine `slow_falling` — yüksekten atlayabilirsin,
ölmezsin, ama kontrol sende. Uçmak istersen zaten Uçuş yeteneği var.

### Eşyalar görünmüyor — teşhis

İşlevleri çalışıyor ama ikonları görünmüyor. Bizim taraf tekrar doğrulandı
(27/27 ikon atlasta, PNG'ler geçerli ve dolu, paket içeriği tam), yani
kaynak paketi dünyada etkin değil.

Behavior pack ve resource pack Minecraft'ta **ayrı iki liste**. İki `.mcpack`
ayrı ayrı kurulunca davranış paketi açılıp kaynak paketi kapalı kalabiliyor.
Çözüm: tek dosyalık `.mcaddon` — Minecraft ikisini birlikte içe aktarıyor.

## Aşama 13 — atlas biçimi (v4.3)

v4.2'de "kaynak paketi etkin değil" tahmini **yanlış çıktı** — kullanıcı ikisini
birlikte kuruyor ve kaynak paketi açık olmasına rağmen ikonlar görünmüyordu.

Bu sefer tahmin yerine, referansın **çalışan** kaynak paketiyle bizimkini
karşılaştırdım. Üç fark çıktı:

| | referans (çalışıyor) | bizde (v4.2) |
|---|---|---|
| `resource_pack_name` | `"vanilla"` | `"simsek_kol"` |
| `textures` değeri | dizi: `["textures/items/x"]` | düz metin: `"textures/item/x"` |
| klasör | `textures/items/` (çoğul) | `textures/item/` (tekil) |

`resource_pack_name` bilinen bir tuzak: atlasın vanilla atlasıyla birleşmesi
buna bağlı, kendi paket adını yazınca girdi bulunamıyor. `textures` alanının
dizi biçimi de belgelerde ikisi de geçiyor ama çalıştığı **kanıtlı** olan dizi.

Üçü de referansa uyduruldu. `kol2.mjs` artık bu biçimi de doğruluyor:
atlas başlığı `"vanilla"` mı, her girdi dizi mi, yol `textures/items/` ile mi
başlıyor.

### Ek düzeltmeler

- **`pack_icon.png`** eklendi (iki pakete de). Yoksa paket listesinde boş gri
  kare çıkıyor ve hangi paket olduğunu ayırt etmek zor.
- Kaynak paketinin adı hâlâ "v3" diyordu → **"Simsek Kol Gorunumleri v4"**,
  açıklaması da ne işe yaradığını söylüyor artık.
- `min_engine_version` iki pakette de `[1,20,0]`'a çekildi — bir değişken daha
  elendi (referans `[1,17,0]` kullanıyor).

## Aşama 14 — v4.3 geri alındı, kol düzeni ve buz mızrağı (v4.4)

### v4.3 geri alındı

Kullanıcı **v4.2'nin oyunda çalıştığını** bildirdi: ikonlar görünüyor, kollar
çiziliyor. v4.3 atlas biçimini "referansa uydurmak" için değiştirmişti
(`resource_pack_name` → `"vanilla"`, `textures` → dizi, klasör → `items/`).
Yani **çalışan bir şeyi düzeltmeye çalışıyordu.** Üçü de geri alındı ve
`kol2.mjs` artık v4.2 biçimini kilitliyor — bir daha kaymasın.

Ders: bir sonraki sürümde çalıştığı doğrulanmadan "daha doğru" görünen
biçime geçmek, düzeltme değil risk.

### Üretecin sildiği dosyalar

`kol_uret.py` yalnızca **yazıyordu**. Listeden bir kol çıkarılınca eski
`items/`, `attachables/` ve doku dosyaları diskte kalıyor, pakete giriyor ve
oyunda hâlâ görünüyordu — `kol_meteor` ve `kol_tnt` kaldırıldığında tam bunu
yaptı. Üreteç artık ürettiği kümede olmayan dosyaları siliyor: **disk = üretecin
çıktısı.**

### Kol düzeni değişti

| kol | yetenekler |
|---|---|
| **Toprak Kol** | Can Verme, Toprak Topu, Yön Şimşeği, Örs, Toprak Yükselişi, Toprak Duvar, **Meteor**, **Güçlü TNT** |
| **Buz Kol** | Buz Adam, **Buz Mızrağı** |
| diğer 8 kol | tek yetenek (değişmedi) |

`pa:kol_meteor` ve `pa:kol_tnt` **tamamen kaldırıldı** — yetenekleri Toprak
Kol'a taşındı, yetenek dosyalarına dokunulmadı.

### Dokular

- **Toprak Kol**: kırmızı vurgular kaldırıldı. Artık sadece toprak tonları —
  koyu kahve zemin üzerinde açık/orta kahve lekeler, arada tek tük gri taş.
- **Buz Kol**: kendi paleti (buzul mavisi), aynı lekeli desen mantığı.

### Buz Mızrağı

Baktığın yöne buz parçası fırlatıyor. Çarptığına **2 dakika** yavaşlık +
zehir + zayıflık veriyor. Zehir canı yavaş yavaş götürüyor ama **öldürmüyor**
(vanilla zehir 1 canda bırakır) — hedefi hapsedip eritiyorsun, anında infaz
değil.

Mızrak **varlık değil**, iş olarak uçuyor: her tick `MIZRAK_HIZ` blok
ilerleyip yolda çarpma arıyor. Böylece varlık bütçesi harcanmıyor, chunk
sınırında kaybolmuyor ve biri onu vurup yok edemiyor.

Çarptığı yere kısa bir buz dikiti bırakıyor; o da süresi dolunca eriyor ve
yalnızca **bizim koyduğumuz** blok kaldırılıyor.

Toplam: **19 yetenek, 10 kol, 5 iksir.**

## Aşama 15 — Dave1545 modu, hedef kilidi ve çift el (v4.5)

Kaynak: `Dave1545.zip` (BoraLo'nun "toprak atan" karakteri).
15 eşya, 44 `.mcfunction`, tamamı tek satırlık komut.

### Referanstaki hatalar

Beş yetenek fonksiyonundan **dördü hiç çalışmıyordu** — sözdizimi bozuk:

| Dosya | Komut | Sorun |
|---|---|---|
| `dave1545_koll_barrier` | `fill ~~50~~50~~0barrier` | boşluk yok, ayrıştırılamıyor |
| `dave1545kasirga` | `tp ^5^1^1 facing @p` | boşluk yok |
| `dave1545kollsumsek` | `summon lightning_bolt^^^15` | boşluk yok |
| `davekollbaktiniucur` | `execute positioned^^^10 ...` | boşluk yok |
| `dave1545koll_ors` | `fill ~~15~ ~~11~ anvil keep` | koordinat eksik |

Çalışsalardı da sorunluydular:

- `fill ~ ~50 ~ ~50 ~ ~0 barrier` **dolu** 50³ küp = 125.000 blok. Tablet
  donar; üstelik geri alınmıyor, dünyada kalıcı görünmez bir küp bırakır.
- Kasırga `@e[type=!player]` kullanıyor — **yarıçap yok**, yüklü bütün
  varlıkları çekiyor. `tp` ile taşıdığı için de duvarın içine sokuyor.
- `@e[r=10,c=1]` seçicisi iki yerde geçiyor ve ikisinde de aynı iki kusur
  var: `@e` **oyuncunun kendisini** de kapsıyor, ve **bakış yönüne
  bakmıyor** — arkandaki koyun da "hedef" olabiliyor.
- `levitation 15 255` (baktığını uçur) anında ölümcül.
- Eşyaların hepsi `format_version 1.16.100` + `run_command` — v3.6'da
  teşhis ettiğimiz, eşyaların hiç kaydolmamasına yol açan kombinasyon.

### Alınanlar

**Hedef kilidi** (`KILIT_*`, `yildirim.js`). Kullanıcının istediği:
"tekli şimşek attığında direk karşıdaki hedefe odaklansın, hedef yoksa
normal şimşek atsın." Referansın `@e[r=10,c=1]` fikri alındı, iki kusuru
düzeltildi: `kilitliHedef()` kendini dışlıyor ve bakış konisine bakıyor
(`koniHedefleri` üzerinden, zaten yakından uzağa sıralı).

Referansta olmayan bir ek: kilit **takip ediyor**. `_yagmur.js` artık
`kilit` seçeneği alıyor ve merkezi her partide yeniden okuyor, yani hedef
kaçarsa yıldırım peşinden gidiyor. Hedef ölürse son bilinen yere devam
ediyor (çökmüyor). Kilitliyken saçılma 7 → 1 blok ve şimşek sayısı
20 → 6; nişan alınmış tek hedefe 20 yıldırım hem gereksiz hem tick israfı.

**Kasırga** (`kasirga.js`). Işınlama yerine `applyImpulse`: teğet kuvvet
(döndürme) + merkeze çekim + yukarı kaldırma. Üçü birlikte yörünge
oluşturuyor; teğet tek başına savurur, çekim tek başına toplar. Yarıçap
ve aynı anda işlenen varlık tavanı var. Tavan yüksekliğine varınca
kaldırma kesiliyor, sadece dönmeye devam ediyorlar.

**Koruma kubbesi** (`kubbe.js`). Dolu küp değil **içi boş küre kabuğu**
(~134 blok). Sadece havaya koyuyor, koyduğu yerleri kaydediyor ve süre
dolunca tek tek geri alıyor — dünyada iz bırakmıyor. `bitir()` iş yarıda
kesilse de (oyuncu çıktı, hata oldu) kalanları topluyor; yoksa görünmez
barrier blokları kalırdı.

Üçü de Toprak Kol'a değil **yeni Dave Kolu'na** kondu (`pa:kol_dave`),
yanına daha önce eşyasız kalan `cekme` ve `isinlanma` eklendi. Toprak Kol
zaten sekiz yetenekli; onuncuya geçmek için sekiz kez jest gerekirdi.

### Alınmayanlar (bizde zaten var)

`daveTp` → `isinlanma` · `davekollbaktiniucur` → `savur` ·
`dave1545kendiniucur` → `ucus` · `dave1545koll_ors` → `ors` ·
`pa_kapat` → `guc_kapat` · `dave1545koll_elharaketu` → `kollariKaldir`

Karakter derisi değiştirme (`invisibility 1 0 true` + göğüslük
attachable) alınmadı: görsel bir numara, oynanışa bir şey katmıyor.

### Bütçe sayımı düzeltildi

`ciftel.mjs` yazılırken çıktı: `toprak_topu` blok başına **1** bütçe
birimi istiyordu ama `blokYaz` iki blok API çağrısı yapıyor (getBlock +
setType). Diğer bütün yetenekler doğru sayıyordu (`blokIste(2)`).

Yani top gerçekte tick başına 56 işlem yapıyordu ve tablette ölçüm de o
hâliyle alınmıştı. `toprak_topu` diğerleriyle aynı sayıma geçirildi ve
`TICK_BLOK_BUTCESI` 28 → 56 yapıldı. **Gerçek yük değişmedi** — uçuş
68 tick, tepe 56 işlem/tick, 1360 blok; değişiklikten önce ve sonra
birebir aynı ölçüldü. Sadece rakam artık doğruyu söylüyor.

### Çift el (aynı sürümde)

`AYNI_ANDA = 2`: sağ ve sol eldeki kollar aynı anda çalışıyor. Tek
tetikleme sayılıyor, yani sol el sağ elin beklemesine takılmıyor. Bütçe
ortak olduğu için tick yükü artmıyor, paylaşılıyor.

---

## Aşama 16 — Kevin1545 modu, hapis ve dondur (v4.6)

Kaynak: `Kevin1545_modu.mcaddon`. 37 `.mcfunction`, 10 eşya.
Dave1545 ile **aynı üretici aracından** çıkmış (aynı `.data` dosyası,
aynı `_effect`/tick düzeni, aynı `player.json` şablonu).

### Referanstaki hatalar

| Dosya | Sorun |
|---|---|
| `kol_kopar` | `@e [r=10,c=1]` — `@e` ile parantez **arasında boşluk**, komut çalışmıyor |
| `kevinn_duzelr` | aynı boşluk hatası (geri alma da bozuk) |
| `hapis` | sözdizimi doğru ama **dolu** 3×3×3 dolduruyor — kafes değil demir bloğu |
| `hapis` | `keep` yok: orada ne varsa yok ediyor |
| `hapis` | geri almıyor, dünyada kalıcı demir kule bırakıyor |
| `hapis` | `@e[r=10,c=1]` — oyuncunun kendisini kapsıyor, yön bakmıyor |

Dave1545'ten devralınan aynı kusurlar:

- **Script yok ama script bağımlılığı var.** `modules` sadece `data`,
  hiç `.js` dosyası yok; buna rağmen `@minecraft/server` 1.14.0,
  `@minecraft/server-ui` 1.3.0 ve `@minecraft/common` 1.2.0 isteniyor.
- `min_engine_version` `[1,19,51]` ama RP bağımlılığı `[1,21,80]` istiyor.
- `player.json` yine 22/22 can veren component group'larla dolu.
- `tick.json`'daki 10 fonksiyonun **7'si tamamen boş** — her tick çalışıp
  hiçbir şey yapmıyor.
- 9 `replaceitem ... air` fonksiyonu birebir aynı.

Kevin1545'e özgü yeni hata sınıfları:

- **10 recipe dosyasının 10'u da boş `{}`.** Hiçbiri geçerli tarif değil.
- `entities/pa_heykel_kevin1545.json` "Kevin heykeli" adında ama içeriği
  **köylü**: `make_love`, `open_door`, `panic`, `play`, `random_stroll`
  davranışlarıyla. Çiftleşen ve kapı açan bir heykel.
- `kevin_sifirla` fonksiyonları 1,2,3,**5**,6,7,8 diye numaralı — 4 yok,
  onun yerine `kevin_sword4` diye ayrı isimde bir dosya var.

### Alınanlar

**Hapis** (`hapis.js`). Referansın dördü de düzeltildi: içi boş kabuk
(taban ve tavan kapalı, hedefin durduğu iki kat boş), sadece havaya
koyuyor, süre dolunca geri alıyor, `kilitliHedef` ile nişan alıyor.

**Dondur** (`dondur.js`). Referansın "kol koparma"sı çalışsaydı bile
**sadece görsel** olurdu — `playanimation` bir poz oynatıyor, zombi o
poz içinde sana doğru yürümeye devam ediyor. Videoda "dondu" gibi duran
şey aslında durmuyor. Burada poz korundu ama hedef gerçekten yerinde
tutuluyor (slowness VI). Referansın kalıcı `a 999`'u yerine **süreli**;
etki kısa aralıklarla tazeleniyor, yani iş yarıda kesilirse hedef
saatlerce değil en fazla bir aralık kadar kilitli kalıyor. Hasar yok —
bu bir tutma yeteneği, infaz değil.

İkisi de yeni **Kevin Kolu**'na kondu (`pa:kol_kevin`).

### Alınmayanlar

`kevin1545_tp` → `isinlanma` · `yildirim` → `yon_simsegi` ·
`kevin1545_kol_hareketi` → `kollariKaldir` · heykel entity (köylü
kopyası) · boş recipe'ler.

### Ortak altyapı çıkarıldı

`kubbe` ve `hapis` aynı işi yapıyordu: blok koy, bir süre dursun,
sonra kaldır. `_gecici_yapi.js` içinde toplandı — "sadece havaya koy,
koyduğunu kaydet, süre dolunca geri al, bütçeye uy" mantığı artık tek
yerde. `kubbe.js` 150 satırdan 55 satıra indi, davranışı değişmedi
(testler doğruluyor).

Test: 18/18 geçti (`kevin.mjs` yeni).

---

## Aşama 17 — hapis süresiz oldu, aç/kapa (v4.7)

Kevin1545 dosyası ikinci kez gönderildi; **birebir aynı dosya**
(md5 eşleşiyor). Kafesi açan bir şey var mı diye tüm paket tarandı:

`iron_bars` **tüm pakette tek bir yerde** geçiyor — `hapis.mcfunction`,
yani kuran komutta. Blok silen hiçbir komut yok (`setblock ... air`,
`fill ... air`, `structure`, `clone` — hiçbiri). `kevin_sifirla*`
dosyaları sadece eşya `clear`/`give` ediyor, kafesle ilgisi yok.

**Sonuç: referansta aç/kapa yok.** Kurduğun kafes sonsuza kadar
duruyor, elle kırmaktan başka çaresi yok. Sıfırdan yazıldı.

### Nasıl çalışıyor

Kafes artık **süresiz**. Aynı yetenek neye baktığına göre iki iş yapıyor:

| Durum | Sonuç |
|---|---|
| Önünde hedef **var** | yeni kafes kurar |
| Önünde hedef **yok** | en yakın kafesini **açar** |

Yani nişan alıp kapatıyorsun, boşluğa bakıp açıyorsun. Yeni bir girdi
ya da menü gerekmedi; jest düzeni aynen kaldı.

### Bunun getirdiği üç mimari sorun

**1. Süresiz iş, iş yuvasını tutar.** `AYNI_ANDA` 2; süresiz bir kafes
iş listesinde dursaydı oyuncunun iki yuvasından birini sonsuza kadar
tutardı. Çözüm: kafes iş değil, **kayıt**. `_kafes_defteri.js` tutuyor;
kurma ve açma ayrı ayrı kısa işler.

**2. Script yeniden yüklenince kafesler sahipsiz kalır.** Dünyadan çıkıp
girince modül değişkenleri sıfırlanır — dünyada duran ama açılamayan
demir kutular kalırdı, yani tam da referansın hatası. Çözüm: defter
`world.setDynamicProperty` ile kaydediliyor. Özellik tespiti var; API
yoksa bellekte kalıyor ve kullanıcı uyarılıyor.

**3. Sınırsız kafes = şişen kayıt.** Dünya özelliğinin boyut sınırı var.
`HAPIS_TAVAN = 8`; dolunca yeni kafes kurulmuyor, sebebi söyleniyor.

Kayıt bilerek kısa tutuldu: bloklar merkeze **göre** saklanıyor
(değerler -1..3 arası), yani JSON kısa çıkıyor.

### Altyapı üçe bölündü

`_gecici_yapi.js` içinde artık üç iş var, ortak adımlayıcıları
paylaşıyorlar:

- `geciciYapiIsi` — koy, bekle, kaldır (kubbe; süreli kaldı)
- `yapiOrIsi` — sadece koy, bitince listeyi geri ver (hapis kurma)
- `yapiSokIsi` — sadece kaldır (hapis açma)

`yapiOrIsi` iş yarıda kesilirse (oyuncu çıktı) koyduğu blokları hemen
topluyor — henüz deftere yazılmadıkları için kimsenin kaydında
olmazlardı, dünyada sahipsiz kafes kalırdı.

### Uzaklık sınırı

`HAPIS_AC_MENZIL = 48`. Daha uzaktaki kafes açılmıyor: uzak blok yazımı
yüklenmemiş chunk'a denk gelir ve **sessizce başarısız olur** — kafes
açıldı sanıp açılmamış olurdun. Bu durumda kaç blok uzakta olduğu
söyleniyor.

Boyut kontrolü de var: Nether'dayken Overworld'deki kafes açılmıyor.

Test: 18/18 geçti (`kevin.mjs` genişletildi: süresizlik, dünya yeniden
yüklenmesi, tavan).

---

## Aşama 18 — Güneş modu: menü, ışın topu, yumruk (v4.8)

Kaynak: `güneş modu muhammetlo mz.mcaddon`. Öncekilerden **çok farklı** —
bu mod gerçek script içeriyor: 835 satır JS, `@minecraft/server-ui`
menüleri, script tabanlı mermiler. Fikirleri iyi, uygulaması sorunlu.

### Referanstaki hatalar

**Var olmayan fonksiyon çağrılıyor.** `sp_hiperoksin_ultimega_system`
iki ayrı dosyadan `runCommand("function ...")` ile çağrılıyor ama
`functions/` altında **yok**. Lazer modunun ana eylemi bu — yani her
sağ tıkta komut hatası.

**Her atış kendi `system.runInterval`'ını açıyor.** Bütçe yok, üst üste
biniyor. `kullanDalga` 3 tickte bir 8 hasar × 10 tekrar = 6 blok
yarıçapındaki her şeye 80 hasar, oyunculara 100.

**Oyuncu çıkınca interval durmuyor.** İçerideki `if (!p) return` sadece
o tick'i atlıyor, `system.clearRun` çağrılmıyor — döngü dünya kapanana
kadar dönüyor.

**Durumlar oyuncu ADIYLA anahtarlanıyor** (`player.name`). Ad
değişebilir; `sun_catalina_menu.js` adla, `gunesinoglu_hf.js` kimlikle
tutuyor — aynı pakette iki farklı yöntem.

**Her hedef iki kez vuruluyor.** `getEntities` + `getPlayers` ayrı ayrı
taranıyor ama Bedrock'ta `getEntities` zaten oyuncuları kapsıyor.

**`fireball.isValid()`** — yeni API'de `isValid` bir **özellik**, metot
değil. Çağırınca hata fırlatıyor, `catch` yakalayıp interval'i hemen
kapatıyor; yani yeşil topun çarpma tespiti hiç çalışmıyor.

**Kırmızı Yumruk kalıcı.** Menüden "Aç" deyince kapatana kadar açık;
`entityHurt` içinde `applyDamage` çağrılıyor ve bu yeni bir `entityHurt`
üretiyor — sonsuz döngü koruması yok.

**11 adet 0 baytlık JSON dosyası.** `items/pa_gunes_adam.json`,
`entities/pa_lazer.json` ve benzerleri tamamen boş. Yanlarında iki nokta
üst üsteli gerçek dosyalar var (`items/pa:gunes_adam.json`). **22 dosya
adında `:` var** — Windows'ta bu dosyalar zaten çıkartılamaz.

Devralınan tanıdıklar: `.data` (Addons Maker proje dosyası, içinde
`/storage/emulated/0/Android/data/co.pamobile...` yolları), `player.json`
şablonu, `@minecraft/server` **1.9.0** bildirimi.

Hakkını yiyelim: `durability_manager.js` gerçekten iyi yazılmış (modern
`ItemComponentTypes`, `startup` kaydı, private class alanları) ve
`custom:fire_ball` parçacığı düzgün tanımlanmış.

### Alınanlar

**Menü** (`menu.js`). Fikir doğrudan referanstan: kolu **eğilerek**
kullanınca yetenek menüsü açılıyor, normal kullanınca seçili yetenek
çalışıyor. Toprak Kol'da sekiz yetenek var; sekizinciye jestle geçmek
yedi kez "eğil + yukarı bak + bekle" demekti. Menü bunu tek dokunuşa
indiriyor. Uzun süredir bekleyen iş listesindeydi.

Kritik ayrıntı: `@minecraft/server-ui` **ayrı bir modül**. Statik import
edilseydi ve modül yoksa `import` satırı modül bağlanırken patlar ve
**paketin tamamı** ölürdü — kollar da, iksirler de. Dinamik `import()`
kullanıldı; yüklenemezse menü sessizce kapanıyor ve jestle seçim eskisi
gibi çalışıyor. Test bunu doğruluyor.

**Işın Topu** (`isin_topu.js`). Script ile ilerleyen, her tick önünü
tarayan mermi — bizde bu tür bir yetenek yoktu. Referansın beş kusuru
da kapatıldı: merkezi iş listesinde (bütçeli), oyuncu çıkınca duruyor,
tek tarama (iki kat hasar yok), duvara ve dünya sınırına çarpınca
duruyor, kimlikle anahtarlanıyor. Hazırlık aşaması "Yeşil Top"tan
alındı — elinde toplanırken nişanı değiştirebiliyorsun.

**Güneş Yumruğu** (`yumruk.js`). Açıkken yumruğun ek hasar veriyor.
Bizde "pasif mod" türünde hiç yetenek yoktu. Referansın kalıcılığı
yerine **süreli**; ayrıca sonsuz döngü koruması var (`kendiHasarimiz`
bayrağı) — referansta bu yoktu.

İkisi de yeni **Güneş Kolu**'nda (`pa:kol_gunes`).

### Alınmayanlar

`Yıldırım` → `yon_simsegi` · `Dalga` → `alan_simsegi` + `cekme` ·
`Lazer` → `goz_lazeri` · `Yeşil Top` (hazırlık fikri ışın topuna
alındı, ateş topu fırlatma kısmı `guclu_tnt` ile örtüşüyor) ·
`durability_manager.js` (bizim eşyalarımızda dayanıklılık yok).

Test: 19/19 geçti (`gunes.mjs` yeni).

---

## Aşama 19 — Boralo Mod V2: yakala/bırak, çoklu şimşek (v4.9)

Kaynak: `Boralo Mod V2`. **1148 dosya**, 265 mcfunction, 114 eşya,
112 blok, 2054 satır JS. Şimdiye kadarki en büyüğü.

### Referanstaki hatalar

**"Mob Picker" mobu hiç yakalamıyor.** Adı Mob Picker ama kodu yalnızca
`getNearestPlayer` çağırıyor — sadece **oyuncu** yakalıyor. Adıyla
yaptığı iş tutmuyor.

**Yakalama yöntemi hatalı.** Kurbanı 200 blok yukarı ışınlayıp **5
tickte bir oraya geri ışınlıyor**. Tutsak, dünya boyunca sürekli
ışınlanan bir varlık. Üstelik yakalayan oyuncu çıkarsa `clearCapture`
hiç çağrılmıyor: interval dönmeye devam ediyor ve kurban **sonsuza
kadar** yukarıda kalıyor.

**`victim.isValid()`** — yeni API'de `isValid` bir özellik, metot değil.
İlginç olan: aynı pakette `iceman_staff.js` doğru kullanıyor
(`player.isValid`), `mobpicker.js` yanlış. Tek pakette iki farklı
anlayış.

**`stone_converterr.js` 5,5 saatlik tam kilit.** Vurduğun oyuncuya
`slowness 255` + `invisibility` + `resistance 4` (20000 saniye) veriyor,
üstüne `inputpermission set @s camera disabled` ve `movement disabled`.
Çözen eşya kaybolursa kurban kalıcı olarak donuyor. Çözme komutu da
`effect @s clear` — kurbanın bütün faydalı efektlerini de siliyor.

**`astrape_weapon.js` bekleme süresini `Date.now()` ile tutuyor** —
duvar saati. Oyun duraklayınca veya tick hızı düşünce oyunla alakası
kalmıyor. Ayrıca `cooldowns` Map'i hiç temizlenmiyor.

**`iceman_staff.js`'in bekleme süresi hiç yok** (yorumda "Bekleme
Süresi: YOK" yazıyor) — sağ tık spam'i serbest.

Devralınanlar: `.data`, `player.json` şablonu, `@minecraft/server`
**1.8.0** bildirimi (bu seriye kadarki en eskisi).

### Alınanlar

**Yakala / Bırak** (`yakala.js`). Referansın adının hakkını veriyor:
**mob** yakalanıyor, oyuncu yakalanmıyor. Yöntem de tersine çevrildi —
ışınlayıp tutmak yerine varlık dünyadan alınıp **türü kaydediliyor**.
Sonuç: tutarken **hiç tick maliyeti yok** (test 2000 tick bekleyip
doğruluyor), yakalayan çıksa da kayıt duruyor, dünya yeniden yüklense
de bırakılabiliyor.

Sınırı açıkça yazıldı: bırakınca yeni bir varlık doğuyor, yani
evcilleştirme/envanter korunmuyor. Script API'de NBT kopyalama yok.
Boss'lar ve oyuncu yasak listesinde.

**Çoklu Şimşek** (`coklu_simsek.js`). Astrape'nin en iyi fikri **min
mesafe**: 4 bloktan yakındakini vurmuyor, böylece yıldırımın alan
hasarından kendin yanmıyorsun. `alan_simsegi`'mizde bu yok — o
yarıçaptaki herkesi vuruyor. Bekleme `system.currentTick` ile (referans
duvar saati kullanıyordu) ve yıldırımlar tek tick yerine partiye
bölünerek düşüyor.

İkisi de yeni **Boralo Kolu**'nda (`pa:kol_boralo`).

### Alınmayanlar

`golden_fist` → `savur` · `stone_converter` (5,5 saatlik kilit, oyuncu
hedefli) · `fly_potion` → `ucus` + iksir sistemi · `toprakkol_ui` /
`gelismistoprakkol_ui` → v4.8'de menü zaten geldi · `iceman_staff` →
`buz_mizragi` · `durability_manager` (eşyalarımızda dayanıklılık yok).

Test: 20/20 geçti (`boralo.mjs` yeni).

---

## Aşama 20 — yamultma karşılaştırması, silah denetimi (v4.10)

Soru: Boralo Mod V2'de yamultma var mı, iyiyse alalım? Ve silahları
alalım.

### Yamultma: onlarınki vs bizimki

Onlarınki `spm_advanced_dirtarms_power_3`:

```
tag @p[r=8,rm=1] add Yamul
inputpermission set @p[tag=Yamul,r=8,rm=1] movement disabled
inputpermission set @p[tag=Yamul,r=8,rm=1] camera disabled
playanimation @p[...] animation.sp_m_animasyon_yamulma.
```

**Bizden iyi olan tek yanı: görsel.** Hedef gerçekten yamulmuş gibi
duruyor. Bizde hiç poz yoktu, sadece efekt vardı. **Poz alındı.**

Gerisi bizde zaten daha iyiydi:

| | Boralo Mod V2 | Bizim |
|---|---|---|
| Hedef | `@p` — **sadece oyuncu** | mob + oyuncu |
| Süre | **süresiz** | 8 saniye |
| Çare | ayrı menü kipi ("Düzel/Düzelt") | aynı yeteneği tekrar kullan |
| Kamera | **kapatılıyor** | dokunulmuyor |

`@p` olması tek kişilik dünyada yeteneği **tamamen işlevsiz** bırakıyor.
Süresizlik + ayrı çare kipi de tanıdık tuzak: kolu kaybedersen kurban
kalıcı kilitli.

`inputpermission camera disabled` alınmadı — kurban etrafına bile
bakamıyor ve mobda zaten hiçbir etkisi yok.

**Kelepçe silahından alınan:** `mining_fatigue`. Yamulan biri kazma da
sallayamamalı. Onlarınki 99999 saniye veriyordu; bizimki yeteneğin kendi
süresi kadar.

### Silahlar: neden alınmadı

Moddaki yedi silah scriptinin **altısı sadece oyuncu hedefliyor** —
tek kişilik dünyada hiçbir şey yapmıyorlar:

| Silah | Ne yapıyor | Sorun |
|---|---|---|
| `bugged_diamond_sword` | vurduğun oyuncuyu 60 sn spectator + tam kilit | oyuncu hedefli |
| `voidmultitool` | 5,5 saat slowness 255 + görünmezlik + input kilidi | oyuncu hedefli |
| `stone_converterr` | aynısı, taş derisiyle | oyuncu hedefli |
| `mobpicker` | oyuncuyu 200 blok yukarı hapsediyor | oyuncu hedefli |
| `golden_fist` | 15-22 blok knockback | oyuncu hedefli, `savur` var |
| `fallen_donus1` | dönüştürme | oyuncu hedefli |
| `kelepcejsoenaam` | kelepçe, "30 tıkla kır" | `@e` kullanıyor, mobda çalışır |

Kelepçe tek işe yarar olanı ve fikri güzel — ama kırma eşyası
**yakalayanın** elinde, yani kurban kendini kurtaramıyor; kilidi açması
gereken kişi zaten onu kilitleyen. Actionbar'da kurbana "Kırmak için 30
sağ tık" yazıyor ama kurbanın tıklayacağı bir şey yok. Mekaniği ters.
`mining_fatigue` fikri alındı, gerisi alınmadı.

Kalan hatalar: `effect @e clear` faydalı efektleri de siliyor,
`@e[name="..."]` ile hedefleme (aynı adlı iki zombi varsa ikisi de),
`Date.now()` ile sayaç, `mining_fatigue 99999 255`.

Test: 21/21 geçti (`yamultma.mjs` yeni).

---

## Aşama 21 — iksir modu: içme parlaması (v4.11)

Kaynak: `iksir modu muhammetlo mz`. Güneş modu ile **aynı yapımcı**.
353 dosya. Altı iksir: nitroxin, hiperoksin, grinoxin, redoxin,
firenoxin, forest_fire.

### Kademeler karşılaştırması

Bizimki zaten daha zengin:

| | Referans | Bizim |
|---|---|---|
| Efekt sayısı | 3–5 | 6–7 |
| Seviye | hep 0 ya da 1 | kademeye göre 0–5 |
| Lazer | tek ayar, hepsi aynı | kademeye göre hasar/menzil |
| Gece görüşü | yok | her kademede |
| Emiş (absorption) | yok | kademeye göre 1–5 |

Referansın efektleri düz: `nitroxin` ve `hiperoksin` neredeyse aynı
(ikisi de instant_health + resistance + speed + strength), aralarındaki
tek fark biri jump_boost biri regeneration veriyor. Yani "en güçlüsü
hangisi" sorusunun kodda karşılığı yok.

### Alınan: içme parlaması

Bizde **hiç görsel yoktu** — içiyordun, sadece sohbete satır düşüyordu.
Referansta her iksir kendi renginde ekranı parlatıyor (`camera fade`).
Alındı, beş kademenin beşi de kendi renginde parlıyor.

**Referanstaki hata:** `camera fade` rengi **0.0–1.0** aralığında olmalı.
Aynı pakette:

- `firenoxin` → `color 1 0.5 0` ✓
- `grinoxin` → `color 0.0 1.0 0.0` ✓
- `redoxin` → `color 255 0 0` ✗
- `nitroxin` → `color 255 255 255` ✗

Yani **kırmızı iksir kırmızı değil beyaz parlıyor.** Tek pakette iki
farklı anlayış. Bizim renkler tabloda ve hepsi aralıkta; test bunu
ayrıca doğruluyor (komutta iki basamaklı sayı olmamalı).

### Alınmayanlar

**`gamerule sendcommandfeedback false`** — referans her içme
fonksiyonunun başında bunu ve `commandblockoutput false`'u çalıştırıyor.
Bunlar **dünya ayarı**; iksir içmek dünyanın ayarını kalıcı
değiştirmemeli ve geri de almıyorlar.

**`item_lock: lock_in_slot`** — göz eşyasını kaskı çıkaramayacak şekilde
kilitliyorlar. Sistem bozulursa çıkaramadığın bir kaskla kalırsın;
bizimki süre dolunca gözü kendisi çıkarıyor.

Test: 22/22 geçti (`parlama.mjs` yeni).

---

## Aşama 22 — hiyerarşi kalktı, 3 yeni iksir, duvar delme (v4.12)

### Hiyerarşi kaldırıldı

v4.11'e kadar beş iksir bir **güç merdiveniydi**: nitroksin en zayıf,
hiperoksin en güçlü. Her basamak bir öncekinin her şeyini daha yüksek
seviyede veriyordu — yani dördü aslında gereksizdi, hep sonuncuyu
içerdin.

Artık **yedi iksirin her biri kendi alanında en iyi**, diğer alanlarda
ortalama:

| İksir | Uzmanlık |
|---|---|
| Nitroksin | hız ve zıplama |
| Grinoksin | dayanıklılık |
| Redoksin | saldırı ve kazma |
| Firenoksin | ateş |
| Orman Ateşi | denge |
| Kan İksiri | vampir (lazer can çalar) |
| Hiperoksin | her şeyden biraz — **hiçbirinde en iyi değil** |

Hiperoksin artık "en güçlü" değil: hız 2 (Nitroksin 3), vuruş 3
(Redoksin 4), dayanıklılık 2 (Grinoksin 3). "Ne yapacağımı bilmiyorum"
iksiri.

### Üç yeni iksir + referansa göre güçlendirme

Referanstan alınanlar: **redoksin**, **firenoksin**, **orman ateşi**.

Hepsi onun karşılıklarından güçlü — mantık aynı, seviye yüksek:

| | Referans | Bizim |
|---|---|---|
| Nitroksin | speed 0, jump 0, strength 0 | speed 3, jump 3, strength 2 |
| Grinoksin | **hiç efekt yok** | resistance 3, regen 3, absorption 4 |
| Redoksin | regen 0, speed 0, strength 0 | strength 4, haste 4, speed 2 |
| Firenoksin | fire_res 0, speed 0, strength 0 | fire_res, strength 3, speed 3 |
| Orman Ateşi | instant_health 0, resist 0, speed 0 | 8 efekt, hepsi seviye 2 |

**Referansın grinoxin'inin hiç efekt fonksiyonu yok** — içince yeşil bir
parlama ve göz geliyor, başka hiçbir şey olmuyor. Bizimki dayanıklılık
uzmanı.

### Lazer menzili tekleşti

Kullanıcı isteği. v4.11'e kadar 10/14/18/22/28 blok idi ve "hangisi daha
uzağı vuruyor" diye düşünmek gerekiyordu. Artık hepsi **22 blok**;
iksirler yalnızca **hasar** ve **yan etki** ile ayrılıyor:

- Firenoksin → ateşe veriyor
- Grinoksin → zehirliyor
- Kan İksiri → verdiği hasarın üçte birini cana çeviriyor

### Duvar delme

**Referansta yok.** Tüm pakette "wall" geçen tek yer
`damage @e[r=3] 4 fly_into_wall` ve orası bir **hasar türü** adı (elytra
ile duvara çarpma), blok kırmayla ilgisi yok. Sıfırdan yazıldı.

Lazer önüne çıkan blokları deliyor. Korumalar: `KORUNAN_KUME`deki
bloklar (bedrock, sandık, komut bloğu) delinmiyor, blok bütçesine
uyuyor, tek atışta en fazla 60 blok, `DUVAR_DELME_ACIK = false` ile
kapatılabiliyor.

Test: 23/23 geçti (`duvardel.mjs` yeni, `lazer.mjs` hiyerarşi kalktığı
için yeniden yazıldı).

---

## Aşama 23 — BoraLo V15: ok yağmuru, sarsıntı (v4.13)

Kaynak: `En İyi BoraLo Modu V15`. **3018 dosya**, 809 mcfunction, 309
eşya, 330 tarif, 142 animasyon denetleyici. Şimdiye kadarki en büyüğü —
ama **hiç script yok**, hepsi komut.

### İçeriğin çoğu tekrar

Komut dağılımı: 464 `give`, 154 `replaceitem`, 109 `execute`, 72
`effect`. Yetenek mantığının tamamı `execute @s^^^N /… @e[r=N,c=1]`
kalıbında — bu seride dördüncü kez gördüğüm nokta-örnekleme lazeri.
`slowness 100000 255`, `levitation 1 255`, `setblock ~~10~ anvil`,
`fill … iron_bars` — hepsinin karşılığı bizde zaten var.

Gerçekten yeni olan iki şey alındı.

### Ok Yağmuru

Referans `okyamuru.mcfunction`, 25 satır:

```
summon arrow ^0^7^10
summon arrow ^1^7^10
...
```

Dört hatası:

1. **`^0^7^10` boşluksuz** — komut hiç çalışmıyor (bu seride en yaygın hata).
2. Izgara `^0`..`^4` arası, yani **hepsi tek yana**. Baktığın yere değil,
   sağına bir ok duvarı oluyor. Bizimki hedefin etrafına ortalıyor.
3. **`summon arrow` ile doğan okun hızı yok** — olduğu yerde belirip
   düşüyor. Ok değil, düşen bir cisim. Bizimki `applyImpulse` ile aşağı
   hız veriyor (`setLinearVelocity` yedeğiyle).
4. 25 ok tek tick'te doğuyor, bütçe yok. Bizimki varlık bütçesini
   kullanıp partiye bölüyor.

Ayrıca referansta tam ızgara; bizde hafif rastgelelik var, yoksa yağmur
değil cetvel gibi duruyor.

### Sarsıntı

Referans `shadowstaffozlelik.mcfunction`:

```
execute @s^^^6 /camerashake add @e[r=6,c=1] 4
```

Hasar yok, ölüm yok — sadece karşıdakinin ekranını sallayıp nişan
almasını zorlaştırıyor. Bizde kendi ekranımızı sarsan yardımcı vardı
(`ekraniSars`), başkasınınkini sarsan yoktu.

Dört hatası:

1. **`@s^^^6` boşluksuz** — çalışmıyor.
2. `c=1` en yakını seçiyor ama `@e` **oyuncunun kendisini de sayıyor** —
   çoğu zaman kendi ekranını sarsıyorsun. Bu seride **üçüncü kez**
   gördüğüm aynı hata.
3. `camerashake` yalnızca **oyuncuda** çalışıyor; `@e` mobları da tarayıp
   boşa dönüyor. Bizimki mobları süzüyor ve sebebini söylüyor.
4. **Süre verilmemiş** (varsayılan 1 sn) ve şiddet `4`, yani tavan. Bizde
   ikisi de ayardan: 1.6 şiddet, 2.5 saniye.

İkisi de yeni **Gölge Kolu**'nda (`pa:kol_golge`).

Test: 24/24 geçti (`v15.mjs` yeni).

---

## Aşama 24 — menü her kolda, tek dokunuşla (v4.14)

Kullanıcı isteği: "her kolda bir tane menü olsun, menüler kolay
açılabilir olsun."

### Neydi

Menü v4.8'de gelmişti ama iki kapının arkasındaydı:

1. **Eğilerek** kullanmak gerekiyordu — tablette eğilme düğmesini basılı
   tutup eşyaya dokunmak zahmetli.
2. Sadece **çok yetenekli** kollarda açılıyordu (`liste.length > 1`).
   Örs Kolu gibi tek yetenekli kollarda menü hiç yoktu.

### Ne oldu

**Kola dokunmak menüyü açıyor.** Tabletteki en kolay hareket bu.
`MENU_DOKUNUSLA = true`.

**Seçince hemen çalışıyor.** Eskiden menüden seçmek yalnızca *seçili*
yapıyordu, çalıştırmak için ayrıca eğil+zıpla gerekiyordu. Artık seçim
tetiklemenin kendisi — tek akış, hiç jest gerekmiyor. Bekleme
süresindeyse kaç saniye kaldığını söylüyor.

**Tek yetenekli kollarda da açılıyor**, çünkü menüde artık yeteneklerin
altında yardımcı düğmeler var:

- `Bütün kolları al` — on beş kolu envantere koyar
- `Gücü kapat` — açık iksiri kapatır

Yani Örs Kolu'nda bile menü işe yarıyor.

**Başlık artık okunur.** `pa:kol_toprak` yerine "toprak kolu".

### Bozulmayanlar

Jestler aynen duruyor: eğil+zıpla çalıştırır, eğil+yukarı bak değiştirir,
eğil+aşağı bak kolları verir. Menü onların yerine değil yanına geldi.

`MENU_DOKUNUSLA = false` yapılırsa v4.13 davranışına döner: dokunmak
çalıştırır, eğilerek dokunmak menüyü açar.

Modül yoksa (server-ui sürümü tutmazsa) dokunmak eskisi gibi seçili
yeteneği çalıştırıyor — test bunu ayrıca doğruluyor, çünkü bu yol
bozulursa kollar tamamen ölürdü.

Test: 25/25 geçti (`menu.mjs` yeni).

---

## Aşama 25 — ışın topu patlıyor, optimizasyon ölçümü (v4.15)

### Işın topu artık patlıyor

Durduğu yerde **TNT gücünde** (`4`) patlıyor — toprak topunun sonundaki
patlamayla aynı güç. Üç durumda da patlar: hedefe çarpınca, duvara
çarpınca, menzil dolunca.

Patlama ayrı bir aşama olarak tutuluyor çünkü patlama bütçesi tick başına
`1`; sırasını beklemesi gerekebilir. Referansta ("Güneş modu — Sarı
Particle At") patlama hiç yoktu, sadece hasar veriyordu.

`ISINTOP_BLOK_KIRAR = false` yaparsan kendi üssünü havaya uçurmaz.

### Sahte dünya düzeltildi — bir testin yalancı yeşili

Ölçüm yazarken çıktı: `dunya.mjs`'teki `getEntities()` **seçenekleri yok
sayıp** bütün listeyi döndürüyordu. Yani "menzil dışındaki vurulmadı"
diyen testler aslında hiçbir şey sınamıyordu — sahte dünya her varlığı
menzilde sayıyordu.

Artık gerçek API gibi `location` + `maxDistance`/`minDistance` ve
`excludeTypes` süzülüyor. Bunu açınca `kevin.mjs`'in tavan testi kırıldı
ve sebebi öğreticiydi: test tavana vurduktan sonra iki kez daha deniyor,
o denemeler menzil dışına düştüğü için "hedef yok" sayılıp **var olan
kafesleri açıyordu**. Ürün doğruydu, test fazla döngü çeviriyordu.

### Optimizasyon ölçümü

32 yeteneğin tamamı tek tek çalıştırılıp ölçüldü (`olcum.mjs`):

| | |
|---|---|
| Bütçeyi aşan yetenek | **yok** |
| En yüksek tepe yük | `hapis` — 56/56 |
| En uzun süren | `kubbe` — 208 tick (10,4 sn) |
| En çok işlemci yiyen | `toprak_topu` — 7,74 ms |
| 32 yeteneğin toplamı | 28,5 ms |
| Anlık yetenek (tick tutmaz) | 11 |
| Süreli yetenek | 21 |

**Çift el ölçümü:** iki ağır yetenek (Toprak Kol + Toprak Topu Kolu) aynı
anda çalışırken tepe yük yine **56/56** — bütçe paylaşılıyor, toplanmıyor.
Çift el tick yükünü artırmıyor.

Dikkat çeken üç şey:

- **`toprak_topu` tek başına 1360 blok yazıyor** ve toplam sürenin
  dörtte birini yiyor. Beklenen — bütün paketteki en ağır iş o.
- **Yeni yeteneklerin hiçbiri ağır değil.** `isin_topu` 0,75 ms,
  `ok_yagmuru` 0,68 ms, `sarsinti` 0,15 ms. Hepsi eski yeteneklerin
  disiplinine uymuş.
- **`hapis` tek tick'te tavanı tam dolduruyor** (56/56) ama bir tick
  sürüp bitiyor, yani sorun değil.

Test: 25/25 geçti + ölçüm aracı (`olcum.mjs`) eklendi.

---

## Aşama 26 — her iksire bir buff (v4.16)

Kullanıcı isteği: "genel olarak iksirleri güçlendir, her iksire bu
güncellemede 1 buff ekle."

Yedi iksirin her birine **tam bir** yeni efekt eklendi. Her biri o
iksirin kimliğine uyuyor:

| İksir | Yeni buff | Neden |
|---|---|---|
| Nitroksin | `slow_falling` | zıplama kimliğini tamamlıyor — yüksekten atlayıp yavaş iniyorsun |
| Grinoksin | `water_breathing` | dayanıklılık: suda da boğulmuyorsun |
| Redoksin | `saturation` | kazarken acıkmıyorsun |
| Firenoksin | `haste 2` | ateş bloğu yumuşatır gibi, daha hızlı kazma |
| Orman Ateşi | `health_boost 2` | denge: biraz da fazladan can |
| Kan İksiri | `invisibility` | vampir kimliği: göze görünmüyorsun |
| Hiperoksin | `conduit_power` | her şeyden biraz — su altı paketi de var |

### Hiyerarşi korundu

Buff'lar seçilirken v4.12'nin kuralı gözetildi: **hiçbir iksir her
alanda en iyi olmamalı.** Eklenen seviyeler uzmanların altında kaldı:

- Firenoksin `haste 2` < Redoksin `haste 4` — kazma hâlâ Redoksin'in
- Orman Ateşi `health_boost 2` < Grinoksin `health_boost 4` — dayanıklılık hâlâ Grinoksin'in

Ölçüm: en yüksek seviyeye sahip olma sayısı — Grinoksin 5, Nitroksin 4,
Redoksin 3, Firenoksin 1, Kan İksiri 1, **Hiperoksin 1**. Hiperoksin
hâlâ "her şeyden biraz, hiçbirinde en iyi değil".

`saturation` artık iki iksirde (Redoksin ve Orman Ateşi) — sorun değil,
`resistance` ve `speed` de birkaç iksirde ortak. Her iksir yine tam bir
yeni efekt kazandı.

Test: 25/25 geçti.

---

## Aşama 27 — göz kaplaması gözlük gibi görünüyordu (v4.17)

Kullanıcı oyundan ekran görüntüsü gönderdi: iksir içince gözler değil
**gözlük** görünüyordu — yüzü boydan boya kaplayan bir bant. Sonra
BoraLo'nun **gerçek skin dosyasını** buldu; iki sürüm, biri normal göz
biri nitroksin gözü.

### Ölçüm

İki skin dosyası piksel piksel karşılaştırıldı. Yüz `(8,8)-(15,15)`
karesinde **tek bir satır** farklı:

```
        x=8   9    10   11   12   13   14   15
  y=12       KOYU KOYU  ten  ten  KOYU KOYU     göz bebeği
  y=13       KOYU KOYU  ten  ten  KOYU KOYU     göz bebeği
  y=14       GÖZ  GÖZ   ten  ten  GÖZ  GÖZ      ← DEĞİŞEN
```

- normal sürüm → `y=14` rengi `(12, 255, 255)` turkuaz
- nitroksin sürümü → `y=14` rengi `(255, 255, 255)` bembeyaz

Başka hiçbir piksel değişmiyor.

**Yani iksir yalnızca `y=14` satırını boyuyor: her gözde 2 piksel,
toplam 4.** Göz bebeği skinin kendi pikseli — kaplama onu çizmiyor,
altında bırakıyor.

### Bizde ne yanlıştı

v4.16'ya kadar `goz_dokusu()` şunu yapıyordu:

1. Her gözü **3×2** çiziyordu (`y=12-13`)
2. Sonra her birinin **etrafına 1 piksel dış hat** ekliyordu

İki dış hat ortada birleşince yüzün sekiz pikselinin tamamı boyunca
uzanan bir bant oluşuyordu: **28/64 piksel**. Oyunda göz değil gözlük.

Lazer varyantı daha da genişti — `y=11..14` arası, artı çepeçevre hale.

### Düzeltme

Artık referansla aynı: `y=14` satırı, `x=9-10` ve `x=13-14`, dış hat
yok, hale yok. **4/64 piksel.** Lazer varyantı bir satır yukarı da
taşıyor (göz bebeğinin üstünü kaplayıp "parlıyor" etkisi veriyor) —
**8/64 piksel**, yine bant değil.

Satır konumu tek sabitte: `GOZ_SATIR = 14`. Skinin gözü başka
satırdaysa tek sayı değişikliği.

Test: 25/25 geçti.

---

## Aşama 28 — Orman Ateşi kaldırıldı (v4.18)

İstek: *"sen başka bir iksir daha kendin yapmışsın sanırım orman ateşi
diye geçiyor onu kaldır."*

### Bir düzeltme: uydurma değildi

Orman Ateşi **referanstan geliyordu**. `iksir modu muhammetlo mz`
paketinde `forest_fire` adıyla 18 dosya var:

- `items/sp_m_forest_fire_bottle.json` — içilebilir iksir
- `items/sp_forest_fire_bottle_goz.json` — içince gelen göz
- `items/sp_m_forest_fire_lazer.json` — lazer varyantı
- `functions/sp_forest_fire_bottle_goz_effect.mcfunction`:
  ```
  effect @e[hasitem={item=sp:forest_fire_bottle_goz,...}] instant_health 1 0 true
  effect @e[hasitem={item=sp:forest_fire_bottle_goz,...}] resistance 1 0 true
  effect @e[hasitem={item=sp:forest_fire_bottle_goz,...}] speed 1 0 true
  effect @e[hasitem={item=sp:forest_fire_bottle_goz,...}] strength 1 0 true
  ```
- `functions/forest_fire_ver_komut.mcfunction`

v4.12'de eklenmesini isteyen de sendin: *"mesela forest_fire ve
firenoksin ve redoksin bizde var mı yoksa onları da ekleyelim."*
"Orman Ateşi" o `forest_fire`'ın Türkçesi.

### Yine de kaldırıldı — çünkü kaldırılması doğru

Sebep "referansta yok" değil, **tasarım**: v4.12'de her iksire bir
uzmanlık verdik, Orman Ateşi'ne düşen "denge" oldu — her şeyden 2.
Ama zaten Hiperoksin de "her şeyden biraz" veriyor. İki iksir aynı
boşluğu dolduruyordu ve Orman Ateşi'ni içmek için hiçbir sebep
kalmıyordu: hız istiyorsan Nitroksin, dayanıklılık istiyorsan
Grinoksin, karar veremiyorsan Hiperoksin.

Yani **7 → 6**. Kalan altısının hepsinin net bir cevabı var:

| İksir | Ne için |
|---|---|
| Nitroksin | hız ve zıplama |
| Grinoksin | dayanıklılık |
| Redoksin | saldırı ve kazma |
| Firenoksin | ateş |
| Kan İksiri | vampir (vur, canını geri al) |
| Hiperoksin | her şeyden biraz |

### Neler silindi

`ayarlar.js` içindeki `KADEMELER` girdisi, `kol_uret.py` içindeki
`IKSIRLER`/`IKSIR_TR`/`GOZ_TR` satırları ve üretilmiş 10 dosya:

```
items/iksir_orman_atesi.json      items/goz_orman.json
items/goz_orman_lazer.json        attachables/goz_orman.json
attachables/goz_orman_lazer.json  textures/item/iksir_orman_atesi.png
textures/item/goz_orman.png       textures/item/goz_orman_lazer.png
textures/entity/goz_orman.png     textures/entity/goz_orman_lazer.png
```

Eşya sayısı **36 → 33**. `.lang` ve `item_texture.json` üretici
tarafından yeniden yazıldı, artık ismi hiçbir yerde geçmiyor.

### Testte çıkan bir hata

`lazer.mjs` menzil testi iksir listesine `KADEMELER[6]` diye sabit
indisle bakıyordu — liste altıya inince `undefined.kimlik` patladı.
Son elemana `KADEMELER.length - 1` ile bakacak şekilde düzeltildi;
bundan sonra iksir eklense de çıkarılsa da kırılmaz.

Test: 27/27 geçti.

---

## Aşama 29 — göz kaplaması ağzın yanına düşüyordu (v4.19)

Oyun içi ekran görüntüsü: hiperoksin içildi, mavi kaplama **gözlerde
değil ağzın iki yanında** belirdi.

### Kök sebep: yanlış skini ölçmüşüm

v4.17'de satır numarasını **BoraLo'nun** skininden almıştım. Ama
kaplama **kullanıcının** skininin gözüne oturmak zorunda, ve iki skin
farklı yerde:

| satır | BoraLo'nun skini | bu skin |
|---|---|---|
| y=11 | ten | saç |
| y=12 | koyu (saç/kaş) | **GÖZ** — akı + bebek |
| y=13 | koyu (saç/kaş) | ten |
| y=14 | **GÖZ** | **AĞIZ** |

Yani `GOZ_SATIR = 14` BoraLo'da doğru, burada tam ağzın satırı.

### Ölçüm

Ekran görüntüsü PNG olarak çözüldü (zlib + filtre geri alma), kafanın
ön yüzü 8×8 ızgaraya bölündü — kafa 138 ekran pikseli, satır başına
17.25:

| doku satırı | ekran y | orada ne var |
|---|---|---|
| y=12 | 121–137 | göz bebeği `(11,13,21)`, akı `(146,138,138)` |
| y=13 | 139–154 | düz ten `(142,87,64)` |
| y=14 | 157–174 | ağız `(70,39,19)` **+ kaplama** `(83,124,151)` |

Sütunlar zaten doğruydu: `x=9,10` ve `x=13,14` — kaplama tam göz
akı ve bebeğinin üstüne geliyor. **Sadece satır iki aşağıdaydı.**

`GOZ_SATIR = 14` → `12`. Tek sayı.

### Yan bulgu: inflate esnemesi

Attachable kutusu `inflate: 0.52` ile büyütülmüş, bu da dokuyu kutu
**merkezinden** dışarı doğru geriyor. Kayma merkeze uzaklıkla artıyor:

```
kayma = (28 − satır_merkezi) × (9.04/8 − 1)

  y=14 (merkez 25.5)  ->  2.5 × 0.13 = 0.33 satır   (gözle görülür)
  y=12 (merkez 27.5)  ->  0.5 × 0.13 = 0.07 satır   (görünmez)
```

Ölçümle doğrulandı: y=14'teki kaplama ekranda 160–179 arasındaydı,
oysa o satırın kendisi 157–174. Tam 0.33 satır aşağı. Doğru satıra
geçince esneme de kendiliğinden kayboluyor — geometriye dokunmaya
gerek kalmadı.

### Lazer varyantı yön değiştirdi

Parlak varyant fazladan bir satır boyuyor; **yukarı** boyuyordu
(`GOZ_SATIR - 1`). Yeni satırda yukarısı `y=11` yani **saç** — parlama
orada kaybolurdu. **Aşağı** çevrildi (`GOZ_SATIR + 1` = `y=13`, düz
ten): ışık yanağa vurmuş gibi görünüyor.

Üretilen doku doğrulandı — koda güvenilmeyip PNG geri çözüldü:

```
goz_mavi         4 opak piksel   x=9,10,13,14  y=12
goz_mavi_lazer   8 opak piksel   x=9,10,13,14  y=12 ve y=13
```

Geri kalan 4092 piksel saydam. Test: 27/27 geçti.

---

## Aşama 30 — kalp ekleme (v4.20)

İstek: kalp ekleme özelliği, "bayağı bayağı" ekleyen türden.

### `can_verme` ile karıştırılmaması gereken bir şey

Zaten `can_verme` vardı ama o **boş kalpleri doldurur** (iyileştirme,
geçici). İstenen ise **kalp sayısını büyütmek** — kalıcı ve birikmeli.
İki ayrı yetenek olarak duruyorlar.

### Sayılar

Bedrock'ta maksimum can `health_boost` ile büyüyor:

```
health_boost seviye N  ->  +4 can x (N + 1)
1 kalp = 2 can
eklenen kalp = 2 x (seviye + 1)
```

Yani kalpler **çift sayılarla** artabiliyor; tek sayı verilirse aşağı
yuvarlanıyor (`kalbiDuzelt`).

| ayar | değer | neden |
|---|---|---|
| `KALP_ADIM` | 10 | bir basışta bir tam can barı, fark hemen görünsün |
| `KALP_TAVAN` | 100 | toplam 110 kalp; yukarısı ekranda okunamıyor |
| `KALP_TAZELEME` | 40 | efekt yenileme aralığı |
| `KALP_SURE` | 200 | efekt süresi (tazelemenin 5 katı, arada sönmesin) |

Motorun kendi sınırı seviye 255, yani 512 kalp — `kalbiDuzelt` orada
kırpıyor ki ayar elle yükseltilirse sessizce bozulmasın.

### Referansın üç hatası

İncelenen iksir modlarının hepsinde aynı tek satır vardı:

```
effect @s health_boost 100000 255
```

1. **255 seviye = 256 kalp.** Can barı ekrana sığmıyor.
2. **Geri alınamıyor.** Süt içmek dışında çıkış yok, o da bütün
   efektleri siliyor.
3. **Kalıcı değil.** Ölünce efekt gidiyor, kalpler kayboluyor ve geri
   gelmiyor — "kalıcı güç" diye verilen şey ölümde sıfırlanıyor.

### Bizde: defter kaynak, efekt görüntü

`_kalp_defteri.js` kim kaç ek kalp aldığını tutuyor ve dünya
özelliğine yazıyor. Efekt `KALP_TAZELEME`'de bir yeniden veriliyor.
Minecraft'ta efektlerin silindiği **üç yer** — ölüm, sürenin dolması,
süt — artık kalpleri götürmüyor; defter yerinde, efekt geri geliyor.

İş listesine **girmiyor**: kalıcı olduğu için oyuncunun iki iş
yuvasından birini sonsuza kadar tutardı ve kalp aldıktan sonra tek
elle oynamak zorunda kalırdın. Hapis kafesleri de aynı sebeple ayrı
defterde.

### health_boost'un sessiz tuzağı

Eklenen kalpler **boş** gelir. "10 kalp geldi" dersin, bar boş görünür.
Ekledikten sonra can dolduruluyor — `resetToMaxValue`, yoksa
`setCurrentValue(effectiveMax)`, o da yoksa `instant_health`. Üçü de
yoksa kalpler yine ekleniyor, sadece boş geliyor.

### Geri alma

`kalp_sifirla` yeteneği ve **her kolun menüsünde** "Kalpleri sıfırla".
Kalıcı bir güç geri alınamıyorsa oyunu bozar — referansın hatası tam
buydu. Sıfırlarken can da dolduruluyor, yoksa tavan düşünce 2 canla
kalırdın.

### Yeni kol

`pa:kol_kalp` — Kalp Kolu, iki yetenek (ekle + sıfırla). Kol sayısı
15 → 16, yetenek 32 → 34, eşya 33 → 34.

### Testte çıkan bakım tuzağı

`kol2.mjs` kol listesini **elle yazılmış bir dizide** tutuyordu ve her
yeni kolda kırılıyordu — üçüncü kez. Daha kötüsü, testin işi "items/
altındaki eşya `kollar.js`'te bağlı mı" diye bakmaktı ama
karşılaştırdığı şey elle tutulan bir kopyaydı; kopya güncellenmeyi
unutulunca test gerçeği değil kendini doğruluyordu. Liste artık
`kollar.js` kaynağından okunuyor.

Yeni test dosyası `kalp.mjs` — 9 bölüm, özellikle "efekt silinse de
geri geliyor" ve "dünya özelliğine yazılıyor" kısımları.

Test: 27/27 geçti.

---

## Aşama 31 — lazer ulaşılamıyordu, sohbet komutları (v4.21)

### "Göz lazeri attım, etrafa yıldırım çarptı"

**Lazer bozuk değildi — ulaşılamıyordu.**

Eşyasız jest sırasında 34 yetenek var. Sıralamayı bastırdım:

```
  0  sira= 10  Yildirim Halkasi     <-- varsayılan seçim
  1  sira= 20  Yon Simsegi
  ...
 21  sira=170  Goz Lazeri           <-- 21 kez "eğil + yukarı bak"
```

Seçim hiç değiştirilmediyse `secimAl()` **0** döner. "Eğil + zıpla"
yapınca sıfırıncı çalışıyor — **Yıldırım Halkası**, yani etrafına
yıldırım yağdıran yetenek. Tam olarak görülen şey.

**Referans bu sorunu yaşamıyor** çünkü orada lazer bir jest değil,
bir **eşya**:

```json
"walking": { "transitions": [{ "default":
  "query.get_equipped_item_name=='nitroxin_goz_lazer' && query.is_using_item" }] }
```

İksiri içiyorsun, göz takılıyor, lazer elinin altında.

**Bizdeki karşılığı:** iksir içilince eşyasız jest seçimi otomatik
olarak Göz Lazeri'ne geçer (`IKSIR_LAZERI_SEC`). İç, eğil + zıpla,
lazer. İksir bitince eski seçimine dönersin — ama iksirliyken seçimi
**elle** değiştirdiysen ona dokunulmuyor.

### Yan bulgu: on bir çift aynı `sira` değerini paylaşıyordu

110, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220 — her birinde
en az iki yetenek. Eşitlikte sıralamanın sonucu **import sırasına**
kalıyor; yani yeni bir yetenek eklemek, ilgisiz bir yeteneğin jest
sırasını kaydırabiliyordu. Hepsi benzersiz yapıldı ve
`kayit.js:siraDenetimi()` açılışta çakışma varsa uyarıyor.

### Sohbet komutları — "aramızda bir dil"

İstek: *"her şeyi kol yapma, kol israfını önle... ya chat'e bir şey
yazacağım ya da Toprak kola ekleyeceğiz."*

```
can 10        10 kalp ekle (tavan 100)
can           varsayılan 10 kalp
can sifirla   eklenen kalpleri geri al
lazer         göz lazeri at
kol           bütün kolları al
guc kapat     açık iksiri kapat
yardim        listeyi yaz
```

**İki giriş kapısı, tek çözümleyici.** `world.beforeEvents.chatSend`
sürümler arası oynadığı için varsa kullanılıyor; yoksa özellik sessizce
kapanıyor ve aynı komutlar `/scriptevent simsek:komut can 10` ile
çalışıyor. İkisi de aynı koddan geçiyor.

**Türkçe yazım:** `sıfırla` da `sifirla` da, `güç` de `guc` de kabul.
Girdi sadeleştiriliyor — Türkçe'de `I`'nın küçüğü `ı` olduğu için
`toLowerCase()`'e güvenilmiyor, dönüşüm elle yapılıyor.

**"Sınır vardı" sorunu:** `can 500` yazınca sessizce kırpmak yerine
sebebi yazılıyor: *"+100 kalp · 500 istedin ama tavan 100 ek kalp"*.

**Komut olmayan mesaj sohbette kalıyor** — `canim sikildi` yazınca
`can` komutu sanılmıyor.

### Kol israfı

`pa:kol_kalp` **kaldırıldı** (v4.20'de eklemiştim, kullanıcının kuralına
aykırıydı). `kalp_ekle` ve `kalp_sifirla` **Toprak Kol**'a taşındı — o
kol artık 10 yetenekli, menü tek dokunuşla açıldığı için sorun değil.
Kol 16 → **15**.

### Bot ertelendi

`BOT_ACIK = false`, hiç bot kodu yazılmadı. Plan duruyor:
`.claude/plans/concurrent-roaming-cosmos.md`

### Testler

Yeni `sohbet.mjs` — 11 bölüm. `kalp.mjs` ve `menu.mjs`'teki **elle
yazılmış sayılar** (8 yetenek, `pa:kol_kalp`) yine kırıldı; ikisi de
kaynaktan türetilecek şekilde düzeltildi. `kol2.mjs`'te aynı dersi
v4.20'de almıştık.

Test: 28/28 geçti.

---

## Aşama 32 — bot (aşama 1) ve iksir süreleri (v4.22)

### İksir süreleri

60 saniye azdı — içiyordun, bir şey yapmaya fırsat bulamadan bitiyordu.

| iksir | süre |
|---|---|
| Nitroksin, Grinoksin, Redoksin, Firenoksin, Kan İksiri | **5 dakika** (6000 tick) |
| Hiperoksin | **480 saniye** (9600 tick) |

Hiperoksin'in daha uzun olması hiyerarşiyi geri getirmiyor: hiçbir alanda
hâlâ uzman değil (hız Nitroksin'de, vuruş Redoksin'de, dayanıklılık
Grinoksin'de). Farkı artık **güçte değil sürede** — "her şeyden biraz,
ama uzun süre". Bu ona uzmanların yerini almadan kendi sebebini veriyor.
Test bunu ayrıca doğruluyor.

Süreyi uzatmak tick maliyetini **artırmıyor**: efektler `IKSIR_TAZELEME`
(40 tick) aralığıyla yenileniyor, sadece daha uzun süre yenileniyor.

---

### Bot — depodaki ilk özel varlık

Şimdiye kadar sadece **eşya** vardı. Bot bir **varlık** (entity), ve bu
yeni bir alan.

**Aşama 1 kapsamı** (kullanıcının seçimi): var olsun, takip etsin,
beklesin, kalıcı olsun. Odun toplama / maden kazma sonraki aşama.

#### Mimariyi belirleyen kısıt

`@minecraft/server`'da **yol bulma API'si yok**. Script'ten bir varlığa
"şu koordinata yürü" denemiyor. İş bölündü:

- **Yürümeyi vanilla AI yapıyor** — `minecraft:behavior.follow_owner`
  (kurdun/kedinin kullandığı hedef) + `minecraft:navigation.walk`.
  Gerçek yol bulma, bedava, akıcı.
- **Kurtarmayı script yapıyor** — bot çok geride kaldıysa, sıkıştıysa ya
  da başka boyuttaysa yanına ışınlanıyor. Vanilla takip bunların hiçbirini
  çözmüyor.

`@minecraft/server-gametest` / `SimulatedPlayer` **kullanılmadı**: deneysel
ayar istiyor, test amaçlı bir modül, tablette riskli ve dünya yeniden
yüklenince yaşamıyor.

#### Bilerek iki yollu bırakılan nokta

`follow_owner` bir **sahip** ister; sahip `tameable.tame(oyuncu)` ile
atanıyor. O çağrının bu API sürümündeki tam şekli **kesin değil**:

```
tame() tuttuysa  -> vanilla yürüyor, script sadece 24 blokta kurtarıyor
tutmadıysa       -> script takibi: 8 blokta ışınlanıyor
```

Hangisinin çalıştığı Content Log'a yazılıyor. Tahmin edilmedi — tablet
denemesi söyleyecek.

#### Plandan sapma: ayrı kol yapılmadı

Planda `pa:kol_bot` vardı. Yapılmadı — kullanıcının kuralı *"her şeyi kol
yapma, kol israfını önle"*. Bot **sohbetten** yönetiliyor:

```
bot          çağır / yanına getir
bot bekle    olduğu yerde dursun
bot takip    peşinden gelsin
bot geri     gönder (sil)
```

Ayrıca **bota dokununca** aynı seçenekler menü olarak açılıyor
(`playerInteractWithEntity`). Menü yoksa dokunmak takip ↔ bekle arasında
geçiş yapıyor — hiçbir şey olmamasından iyi.

`bot geri` **bekleme süresine takılmıyor**: bu bir güç değil, güvenlik
çıkışı. Bot ayak altında dolaşıyorsa 3 saniye beklemek sinir bozucu.
Aynı gerekçe kalp sıfırlamada da vardı.

#### Testin yakaladığı gerçek hata

İlk yazılışta `botCagir` bütçeden `varlikIste(1)` istiyordu ve **bot hiç
doğmuyordu**. Sebep `main.js`'teki tick döngüsü:

```js
if (isler.length === 0) return;
butceSifirla();
```

Bütçe ancak **aktif iş varken** doluyor. Bot çağırmak anlık bir istek; o
anda çalışan bir iş yoksa bütçe 0'da kalıyor ve spawn sonsuza kadar
reddediliyordu. Bütçe zaten tick başına onlarca şey doğuran yetenekler
için var (ok yağmuru, TNT yağmuru); tek bir bot bir kez doğuyor ve zaten
`BEKLEME` (3 sn) ve `BOT_TAVAN` (oyuncu başına 1) kapılarına takılı.
Bütçe çağrısı kaldırıldı.

#### İkinci yakalanan hata: `paketle.sh`

Yeni klasörler (`entities/`, `entity/`) zip satırlarında yoktu — bot
pakete **hiç girmeyecekti** ve oyunda "bot kayıtlı değil" diyecekti.
Betiğe DİKKAT notu eklendi.

#### Üretilen dosyalar

Hepsi `kol_uret.py`'den — elle JSON yazılmadı:

```
BP/entities/bot.json                    sunucu varlığı (AI, sağlık, olaylar)
RP/entity/bot.entity.json               görünüm + yumurta rengi
RP/models/entity/simsek_bot.geo.json    insansı model (vanilla skin UV'si)
RP/animations/simsek_bot.animation.json yürüyüş
RP/textures/entity/bot.png              64×64 yer tutucu
```

Model **vanilla 64×64 skin düzeniyle aynı UV** kullanıyor: dokuyu bir
Minecraft skiniyle değiştirmek istersen üzerine yazman yeterli. Göz satırı
v4.19'da ölçülen yer (`y=12`, `x=9,10,13,14`).

Yürüyüş animasyonu **kendimizin**; vanilla `animation.humanoid.*`
kimliklerine bilerek güvenilmedi.

Yumurta **var** (`is_spawnable: true`) — tablette elle test etmenin en
kolay yolu.

Test: **29/29** geçti (yeni `bot.mjs`, 11 bölüm).

---

## Aşama 33 — sohbet komutları çalışmıyormuş (v4.23)

### Kanıt

Kullanıcı dört kez `bot` yazdı, bot gelmedi. Ekran görüntüsünde sebep
açıkça duruyor:

```
<SmokeyInk8762> bot
<SmokeyInk8762> bot
<SmokeyInk8762> bot
<SmokeyInk8762> Bot
```

Mesajlar **sohbete düz metin olarak düşmüş**. Yani `e.cancel = true`
hiç çalışmamış, yani abonelik hiç kurulmamış.

`world.beforeEvents.chatSend` **kararlı API'de yok** — dünya ayarlarında
**Beta APIs** deneysel ayarını istiyor. v4.21'de bu ihtimal için
`/scriptevent` yedeği yazılmıştı ama **kullanıcıya söylenmiyordu**:
durum yalnızca Content Log'a yazılıyordu, tablette kimse oraya bakmıyor.

Büyük/küçük harfin hiçbir etkisi yok — girdi zaten sadeleştiriliyor.

### Çözüm: menü

Tablette tek-dokunuşluk tek yol menü. Bot kontrolleri **her kolun
menüsüne** kondu:

```
Bot çağır / Bot: yanıma gel
Bot: bekle  /  Bot: takip et      (duruma göre değişiyor)
Bot: geri gönder
Can +10 kalp
```

Jest sırası çözüm değildi: `bot_cagir` 36 yeteneğin sonuna yakın, oraya
ulaşmak için onlarca kez "eğil + yukarı bak" gerekiyor — göz lazerindeki
hatanın aynısı.

### İkinci düzeltme: durum artık oyunda söyleniyor

Dünyaya girince oyuncuya yazılıyor:

> Sohbet komutları bu sürümde ÇALIŞMIYOR (dünya ayarlarında Beta APIs
> kapalı). Bunun yerine: kola dokun → menü, ya da
> `/scriptevent simsek:komut bot`

Beta APIs açıksa onun yerine "sohbete `yardim` yaz" diyor.

### Üçüncü düzeltme: sohbet seli

`OLCUM_SOHBETE` **kapatıldı**. Görüntüde sohbetin tamamı `[OLCUM]`
satırlarıyla dolmuştu ve gerçek mesajlar arada kayboluyordu. Ölçüm
Content Log'a yazılmaya devam ediyor. `HATA_SOHBETE` açık kalıyor —
hatalar seyrek ve görülmesi gerekiyor.

### Görüntüden doğrulananlar

- `Hiperoksin ictin - 480 saniye` → süre değişikliği çalışıyor
- `blok 68 (34.0/tick)`, `maks 23.0ms` → toprak topu bütçesi normal
- `Kafes kuruldu`, `1 can yenilendi` → jestler yanlışlıkla tetikleniyor
  (yürürken eğil+zıpla). Rahatsız ediciyse `ESYASIZ_ACIK = false`.

Test: **29/29** (bot.mjs'e 12. bölüm eklendi — sohbet kapalıyken de
ulaşılabiliyor mu).

---

## Aşama 34 — Beta API'ler açıldı (v4.24)

Kullanıcı dünya ayarlarından **Beta API'ler**'i açtı ve botun oradan
yapılmasını istedi.

### Anahtarı açmak tek başına yetmiyor

Ayarın kendi açıklaması belirleyici:

> *Eklenti paketlerinde API modüllerinin **"-beta" sürümlerini** kullanın*

Yani anahtar, paketlerin beta modül sürümü **istemesine izin veriyor** —
istemeyen paket kararlı modülü almaya devam ediyor. Bizim manifest
`"@minecraft/server": "2.0.0"` diyordu, yani anahtar açık olsa da
`chatSend` yine gelmezdi.

`manifest.json` → `"2.0.0-beta"`.

### Bunun bedeli

Artık **Beta API'ler kapatılırsa script modülü hiç yüklenmez ve paketin
tamamı ölür** — kollar, iksirler, bot, hepsi. Bu bilinçli bir takas ve
tek satırla geri alınabilir: manifest'te `2.0.0-beta` → `2.0.0`. O zaman
sohbet komutları kapanır, **geri kalan her şey çalışmaya devam eder** —
menü yolu bilerek korundu, tek yol sohbet değil.

`@minecraft/server-ui` **kararlı** (`2.0.0`) bırakıldı: menü artık ana
arayüz, onu da beta yüzeyine taşımanın faydası yok, riski var.

### Test yeni bir kayma yakaladı

`bot.mjs`'e eklenen 13. bölüm manifest ile kodu bağlıyor. İlk çalıştırmada
hemen yakaladı:

```
✗ manifest surumu ayarlardaki SURUM ile ayni :: manifest 4.23.0 / ayar v4.24
```

`SURUM` sabitini yükseltmiş, manifest'i unutmuştum. Artık her sürümde
otomatik kontrol ediliyor — `BETA_GEREKLI` ile manifest'in `-beta`
istemesi de aynı testte bağlı, ikisi sessizce ayrışamıyor.

Test: **29/29**.

---

## Aşama 35 — "Content Log ne olduğunu bilmiyorum" (v4.25)

Kullanıcı sürüm bilgisini yollayıp ekledi: *"Content Log ne olduğunu
bilmediğim için her şeyi"*.

### Bu bir kullanıcı hatası değil, tasarım hatası

Şu ana kadar **bütün teşhis** Content Log'a yazılıyordu:

```
kol denetimi: 15 esyanin hepsi kayitli.
bot denetimi: pa:bot kayitli.
sohbet komutlari: sohbet ACIK, scriptevent ACIK
API: @minecraft/server 2.0.0-BETA isteniyor...
```

Yani "bot neden gelmiyor" sorusunun cevabı hep oradaydı — ama
okunamıyordu. v4.23'te `OLCUM_SOHBETE` kapatılınca son bağ da koptu.

### `durum` komutu

```
durum      (ya da 'bilgi' / 'test')
```

Sohbete basıyor:

```
--- Simsek durum ---
Surum v4.25 · API 2.0.0-beta · yetenek 36
Sohbet komutlari: ACIK
Menu: ACIK
Kollar: 15/15 kayitli
Bot: varlik kayitli · seninki var (takip)
Iksir: Hiperoksin · lazer icin egil + zipla
Kalp: +20 ek (toplam 30, tavan 100)
```

Her kolun menüsünde de **"Durum (her şey çalışıyor mu)"** düğmesi var —
sohbet çalışmasa bile ulaşılabilir olsun diye.

`_bot_defteri.js`'e `botKayitliMi()` eklendi; üç durum ayırıyor:
kayıtlı / kayıtlı değil / denetim yapılamadı.

### Kullanıcının sürümü

```
Sürüm: v26.44        Branch: r/26_u4
Protokol: 12168      SHA: 93e8d22a...
```

Bekleyen işler listesindeki **`min_engine_version` uyumsuzluğu** artık
karara bağlanabilir: manifest `[1, 20, 0]` diyor, oyun `26.44`.
`min_engine_version` bir **taban**, tavan değil — oyunun sürümü bunun
üstünde olduğu sürece sorun yok ve şu an her şey çalışıyor (kollar
görünüyor, eşyalar kayıtlı). **Yükseltilmedi**: yükseltmek eski
sürümleri dışarıda bırakır ve hiçbir şey kazandırmaz. Madde kapandı.

Test: **29/29** (`sohbet.mjs`'e 12. bölüm).

---

## Aşama 36 — "hiçbir şey çalışmıyor" (v4.26)

> *"kanka modu bir kontrol et hiç bir şey çalışmıyor eğilip aşağıya
> baktım kol bile gelmedi"*

### Sebep: v4.24'teki beta denemesi

v4.24'te manifest `"@minecraft/server": "2.0.0-beta"` istemişti. Sonuç:
**script modülü hiç yüklenmedi ve paketin tamamı öldü** — kol yok, jest
yok, menü yok, bot yok.

Kullanıcının dünyasında **Beta API'ler açıktı**. Yani anahtar yetmiyor:
istenen beta *sürümü* o yapıda bulunmuyor. Oyun `v26.44` / protokol
`12168`; hangi beta sürümünü sunduğu dışarıdan bilinmiyor ve script hiç
çalışmadığı için **içeriden de sorulamıyor** — modül yüklenmezse kod da
yüklenmez, `durum` komutu bile yok.

Git farkı, v4.23 (çalışan) ile v4.25 (ölü) arasında işlevsel tek bir
değişiklik gösterdi:

```
-      "version": "2.0.0"
+      "version": "2.0.0-beta"
```

**Kararlı sürüme dönüldü.** Yanlış sürüm yazmanın cezası "özellik
çalışmaz" değil "paket ölür" olduğu için bir daha körlemesine
denenmeyecek.

### İkinci hata: bir tırnak

Düzeltmeyi yaparken `sohbet.js`'e fazladan bir `"` kaçtı. Tek karakter —
ama JS ayrıştırılamayınca yine **paketin tamamı ölür**. Testler yakaladı
(hepsi `main.js`'i import ediyor), ama bu tesadüf: hiçbir test bu satırı
kullanmıyordu.

### Kalıcı önlem: `canli.mjs`

Yeni test dosyası, tam olarak "her şey ölü" hata sınıfını hedefliyor:

1. **Her `.js` dosyası tek tek yükleniyor** — sözdizimi hatası varsa
   hangi dosya olduğunu adıyla söylüyor.
2. **Manifest oyunun reddetmeyeceği hâlde mi**: geçerli JSON, UUID
   biçimleri, benzersizlik, `entry` dosyası gerçekten var mı, ve
   bağımlılıklarda `-beta` **yok** mu.
3. **`paketle.sh` bütün klasörleri zipliyor mu** (v4.22'de `entities/`
   unutulmuştu, bot pakete hiç girmemişti).

`bot.mjs`'teki beta testi de yön bağımsız hâle getirildi: artık "beta
olsun" demiyor, **manifest ile `BETA_GEREKLI` aynı şeyi söylesin** diyor.

### Sohbet komutları ne olacak

Kararlı API'de `chatSend` yok, yani sohbete `bot` yazmak çalışmıyor.
İki yol da kararlı:

1. **Menü** — kola dokun, listeden seç (tablette en hızlısı)
2. **`/scriptevent s:k bot`** — kısa takma ad eklendi (eskiden
   `simsek:komut` yazmak gerekiyordu)

Test: **30/30**.

---

## Aşama 37 — bot aşama 2: odun ve maden, 20 bot (v4.27)

Bot takip etmeye başladı, sıra işe geldi. Ayrıca bot tavanı **1 → 20**.

### Botlar neden kendi etrafını işliyor

Bedrock'ta yol bulma API'si yok — bota *"şu ağaca git"* denemiyor. Bot
**kendi etrafını** işliyor: sen ormana yürüyorsun, bot peşinden geliyor
(vanilla takip), "odun" diyorsun, etrafındakini kesiyor. Referans
modların "çalışan bot"u da tam olarak bu; yürüyor görünen şey aslında
seni takip etmesi.

### Arama ucuz olmak zorunda

Yarıçap 6'lık kutuda 2000+ blok var; her tick hepsini okumak tableti
öldürürdü. İki önlem:

1. **Offset listeleri modül yüklenirken bir kez** hesaplanıyor ve
   mesafeye göre sıralanıyor — bot önce dibindekini alıyor.
2. **Tarama imleçli**: her tick bütçenin verdiği kadar blok okunuyor,
   kaldığı yerden devam ediyor.

**Odun için gövde takibi:** ağaç ararken küre taramak israf, gövde
dikey. Bot hizasında yatay disk taranıyor; kütük bulununca "tırmanma"
moduna geçilip o sütun yukarı kırılıyor. Yapraklara dokunulmuyor.

**Maden için** aşağı ağırlıklı küre (`y −6 … +1`).

### 20 bot tick yükünü artırmıyor

Blok bütçesi **ortak**: yirmi bot da aynı 56 işlem/tick'i paylaşıyor.
Bot sayısı işi *yavaşlatıyor*, yükü artırmıyor. Asıl maliyet vanilla
tarafında (her bot yol bulan bir mob) ve onu biz ölçemiyoruz — tablette
takılma olursa önce bot sayısını düşür.

Botlar yay üzerinde doğuyor; yirmi bot aynı noktaya doğsa üst üste binip
birbirini iterdi.

### İş oyuncunun yuvasını yemiyor

İş nesnesinin `oyuncuId`'si `"bot:"` önekli — merkezi yönetici onu ayrı
kovada sayıyor, oyuncunun `AYNI_ANDA` (2) yuvası boş kalıyor. Kalp ve
kafeslerde öğrenilen ders.

### Testin yakaladığı gerçek kusur

İlk yazılışta blok **önce kırılıyor**, sonra eşya verilmeye
çalışılıyordu. `ItemStack` oluşturulamazsa (kimlik tablosunda yanlış
varsa) blok gitmiş, eline hiçbir şey geçmemiş oluyordu — **bot cevheri
yok ediyordu.** Sıra tersine çevrildi: eşya üretilemiyorsa blok
kırılmıyor.

Eşya envantere konuyor; envanter doluysa botun yanına bırakılıyor.
Kütükler kendi eşyalarını veriyor, cevherler **düşen** eşyayı
(`iron_ore → raw_iron`, `deepslate_diamond_ore → diamond`).

### İkinci "paket ölür" hatası — ve `canli.mjs` yine yakaladı

`ayarlar.js`'te yorum bloğunu erken kapattım; 51 dosyanın **hepsi**
sözdizimi hatası verdi (hepsi `ayarlar.js`'i import ediyor). v4.26'da
eklediğim `canli.mjs` bunu ilk çalıştırmada yakaladı. İki sürümde iki
kez işe yaradı.

### Komutlar

```
bot           bir bot daha çağır (tavan 20; tavandaysa hepsini yanına getirir)
bot odun      botlar etrafındaki ağaçları keser
bot maden     botlar etrafındaki cevheri kazar
bot gel       hepsini yanına getir
bot bekle / bot takip / bot geri
```
Hepsi menüde de var.

Test: **30/30** (`bot.mjs` 17 bölüm).

---

## Aşama 38 — teslim, model, savaş (v4.28)

Üç istek: *"odunu bana versinler"*, *"modelleri geliştir"*, *"köpek gibi
savaşsınlar"*.

### 1. Teslim — ekip çantası

v4.27'de eşya zaten doğrudan envantere giriyordu, ama **görünmüyordu**:
ne geldiğini iş bitince öğreniyordun, envanter doluysa sessizce yere
düşüyordu.

Artık toplanan şey önce **ekip çantasına** giriyor, sonra topluca teslim
ediliyor:

- iş bitince **otomatik**
- `bot teslim` deyince elle
- çanta dolunca blok **kırılmıyor** — yerinde duruyor (kırıp döksek fark
  etmeden bırakıp giderdin)

Çanta bot başına değil **ekip başına**: yirmi ayrı çanta ne kayıtta ne
oynanışta bir şey kazandırır, sen tek bir yığın alıyorsun.

**Teslim menzili 32 blok** — botu ormanda bırakıp evde eşya toplamak
çalışma hissini bozardı. Ekipten en az bir bot yakında olmalı.

Kayıt sıkıştırılıyor: `"minecraft:"` öneki atılıyor, `"oak_log:12,raw_iron:3"`
gibi duruyor. Eski (v4.27) düz-dizi kaydı da okunuyor — dünyanı açınca
botların kaybolmasın.

### 2. Model

Yer tutucu düz renklerden **gerçek bir yüze** geçildi. Kafanın ön yüzü
(`x=8..15, y=8..15`) elle çizildi: saç + perçem, kaşlar, göz akı + bebek
(v4.19'da ölçülen `y=12` satırı), burun gölgesi, ağız. Gövdede yaka,
kemer, kol ağzı, eller, botlar.

**6 görsel çeşit** eklendi — yirmi bot birbirinin aynısı olunca hangisine
ne dediğin karışıyordu. `minecraft:variant` + component group, doğumda
rastgele; istemci tarafı `query.variant` ile diziden doku seçiyor. Bu
vanilla'nın kendi yöntemi (koyun rengi, papağan türü hep böyle).

Yeni klasör `render_controllers/` — `paketle.sh`'a da eklendi (v4.22'de
`entities/` unutulmuştu, aynı hatayı tekrarlamamak için).

### 3. Savaş — köpek modeli

Tarif aynen uygulandı: *"köpek evcilleştirirsin ya, birine vurduğun zaman
ona saldırıyor"*. Vanilla kurdun **üç davranışı**:

| davranış | ne yapar |
|---|---|
| `owner_hurt_target` | sen bir şeye vurunca bot ona saldırır |
| `owner_hurt_by_target` | sana vurulunca bot vurana saldırır |
| `hurt_by_target` | bota vurulunca karşılık verir |

Üçü de `pa:savas` grubunda, `minecraft:attack` (5 hasar) ve
`melee_attack` ile birlikte. Bot canı 24.

**Botlar birbirini dövmüyor**: hedef süzgecinde `pa_bot` ailesi dışarıda.
Oyuncular dışarıda **değil** — "benim için savaşsınlar" denince arkadaşın
da dahil.

**Kapatılabilir** (`bot savas`): ormanda odun toplarken botun her koyuna
saldırması istenmez. Varsayılan açık, kurtta da öyle. Savaş kapalıyken
**sonradan doğan bot da barışçı** geliyor — yoksa "kapattım ama yeni bot
saldırıyor" olurdu.

### Komutlar

```
bot teslim    topladıklarını sana verir
bot savas     köpek modu aç/kapat (bot savas ac / bot savas kapat)
```
Menüde de var; menüde çanta doluluğu ve savaş durumu yazıyor. `durum`
raporuna da eklendi.

Test: **30/30** (`bot.mjs` 22 bölüm — çanta, teslim menzili, kayıt
göçü, savaş grupları, çeşit dokuları).

---

## Aşama 39 — bot özel güçleri (v4.29)

İstek: *"aynen benim gibi şimşek yağdırabilsin ve kil topu atabilsin"*
+ bot 7 hasar / 25 can.

### Hedefi sen veriyorsun

Bota "şunu vur" demenin bir yolu yok. Botun **kendi bakışı kullanılamaz**:
`look_at_player` yüzünden bot sürekli sana bakıyor — top doğrudan sana
gelirdi.

Çözüm: **nişan senin.** Baktığın nokta (ya da kilitlendiğin varlık)
hesaplanıyor, botlar oraya atıyor. *"Aynen benim gibi"* tam olarak bu —
senin yaptığın işi senin nişanınla yapıyorlar.

### Kod kopyalanmadı

Şimşek için `_yagmur.js`'teki `yagmurIsi`, top için `toprak_topu.js`'teki
iş fabrikası kullanılıyor. İkincisi bunun için **dışarı açıldı**
(`topIsi(atan, seçenek)`): "atan"ın sağlaması gereken tek şey
`dimension · id · getViewDirection() · getHeadLocation()` — oyuncu da bot
da bunlara sahip. 250 satırlık optimize edilmiş kodu (delta önbelleği,
bütçe sayımı, çarpma kontrolü) kopyalamak yerine parametrelendirildi.

Yeni seçenekler: `yon` (botun kendi bakışı yerine), `oyuncuId`
(`"bot:"` kovası), `kolIndir` (botun kolu yok).

### Testin yakaladığı iki gerçek kusur

**1. Nişan kendi botlarına kilitleniyordu.** Bot önünde dururken "şimşek"
deyince kilit **kendi botuna** takılıyordu — hem botların güçlerinde hem
**oyuncunun kendi `yon_simsegi`'nde**. Bot da bir varlık ve koninin tam
ortasında duruyor. Tek yerde çözüldü: `koniHedefleri` artık
`KILIT_ATLA_TIPLER` kümesindekileri atlıyor. Yani ne sen kendi botuna
yıldırım indiriyorsun ne botlar birbirine.

**2. `getHeadLocation` yoksa iş sessizce hiç açılmıyordu.** "Hiçbir şey
olmadı" sınıfından bir hata. `yardimcilar.js`'e `basKonumu()` eklendi:
`getHeadLocation` varsa onu, yoksa ayak konumu + göz yüksekliği.

### Tavanlar

| güç | tavan | neden |
|---|---|---|
| şimşek | 5 bot | varlık doğurma, ucuz |
| kil topu | 3 bot | blok yazan iş; 20 tanesi ortalığı kullanılmaz yapardı |

Bütçe ortak olduğu için tablet ölmez — ama her top saniyelerce
sürünürdü. Şimşek **oyunculara vurmuyor** (`BOT_SIMSEK_OYUNCU = false`):
yıldırım yangın çıkarıyor ve alan etkisi var, botun kendi kararıyla
arkadaşına yıldırım indirmesi istenmez.

### Çoklu iş

`olustur()` artık **iş dizisi** de dönebiliyor — beş bot = beş iş, ama
tek tetikleme sayılıyor (bekleme süresi bir kez işliyor).

### Güçlendirme

`BOT_HASAR` 5 → **7**, `BOT_CAN` 24 → **25**. Karşılaştırma: vanilla
kurt 4 hasar / 8 can, demir golem 21 / 100. Bot ikisinin arasında ve
yirmi tane olabildiği için bilerek golemin çok altında.

### Komutlar

```
bot simsek    baktığın yere şimşek yağdırırlar
bot top       baktığın yere kil topu atarlar
```
Menüde de var.

Test: **30/30** (`bot.mjs` 24 bölüm).

---

## Aşama 40 — bot görünmez oldu (v4.30)

> *"bot gözükmüyor hallet onu ama diğer işleri de yapıyor onda sıkıntı yok"*

### Teşhis: sunucu sağlam, çizim kırık

Bot takip ediyor, odun topluyor, savaşıyor, doğuyor — yani **davranış
tarafı çalışıyor**. Görünmeyen tek şey çizim. Bu, hatayı ikiye böldü ve
yarısını eledi: sorun `entities/bot.json`'da değil, **resource pack'in
çizim yolunda**.

Zaman çizelgesi kesin: **v4.27'de bot görünüyordu** (kullanıcının
ekran görüntüsü var). **v4.28'de görünmez oldu** — o sürümde çizim
yolunu değiştirdim:

```
v4.27:  render_controllers: ["controller.render.default"]
        textures: { default: "textures/entity/bot" }

v4.28:  render_controllers: ["controller.render.simsek_bot"]
        arrays: { textures: { "Array.cesitler": [...6 doku...] } }
        textures: ["Array.cesitler[query.variant]"]
```

Yapı belgelere uygundu (vanilla köylü/koyun aynı kalıbı kullanıyor) ama
oyunda çizim hiç olmadı. Hangi parçanın reddedildiğini **oyun içi
denemeden bilemem** ve tahminle bir tur daha kaybetmek istemiyorum.

### Karar: kanıtlanmış yola dön

v4.27'nin çalışan kurulumuna dönüldü. **Kaybedilen tek şey botların
birbirinden renkle ayrılması.** Asıl görsel iyileştirme — gerçek yüz,
saç, kıyafet, kemer, eller, botlar — **duruyor**; o dokunun kendisiydi,
çeşit mekanizması değil.

Sunucu tarafındaki `pa:tipN` grupları ve `minecraft:variant` **bilerek
bırakıldı**: çeşitleri tekrar denemek istersek iş yalnızca client
entity'yi ve bir render controller'ı yazmak. Ama o denemeyi **tek
çeşitle** yapmak lazım — görünmezlik sessiz bir hata.

### Testin dürüst sınırı

`bot.mjs` 22. bölüm artık çizim yolunu **kilitliyor**: vanilla
controller mi, `arrays` yok mu, doku PNG'si diskte mi, geometri hâlâ
bizim modelimiz mi.

Ama açıkça yazdım: **bu test görünürlüğü sınayamaz.** Çizim oyunun işi;
buradan yapılabilecek tek şey "çalıştığı bilinen yapıyı koru" demek.
`canli.mjs`'ten de `render_controllers` klasör kontrolü kaldırıldı.

Test: **30/30**.

---

## Aşama 41 — bot topluyor gibi yapıyordu (v4.31)

> *"bot yanımda takılıyor ama bir yandan da odun kendi boşuna kırılıyor,
> botun onu yapmasını görmem gerek"* + *"çantasına baktım sıfır, odun
> olması gerekirken yok"*

İki şikâyet, **tek sebep**.

### Kök sebep: imleç her adımda sıfırlanıyordu

```js
// v4.30'a kadar:
const m = merkezAl(b.varlik);
if (!b.merkez || b.merkez.x !== m.x || ...) { b.merkez = m; b.imlec = 0; }
```

Tarama imleci, bot **bir blok bile kımıldayınca** sıfırlanıyordu. Bot
seni takip ettiği için sürekli hareket halinde — yani imleç hep 0'a
dönüyor ve bot **yalnızca en yakın ~8 offseti** tekrar tekrar tarıyordu
(`BOT_IS_BOT_BASI = 8`).

Sonuç tam olarak görülen şey:
- Uzaktaki ağaçlara **hiç sıra gelmiyor** → çanta boş
- Ara sıra dibindeki bir kütük kırılıyor → *"odun kendi kendine kırılıyor"*

### Neden testler kaçırdı

Testteki bot **hiç kımıldamıyordu**. `bot.mjs` 14. bölüm sabit bir botla
ağacı kesiyor ve geçiyordu. Gerçek oyunda bot hiç durmuyor.

Yeni 25. bölüm botu her tick oynatıyor ve ağacı taramanın **uzak ucuna**
dikiyor. Eski kodla çalıştırıldığında birebir kullanıcının gördüğü sonucu
veriyor:

```
✗ bot HAREKET EDERKEN de uzaktaki agaci kesti  ::  4 kutuk kaldi
✗ odun gercekten teslim edildi                 ::  0 esya
```

### Çözüm: bot çalışırken duruyor

`BOT_IS_DURARAK` — iş başlayınca botlar **duruyor**, iş bitince takibe
dönüyor. Tek çözümle iki şikâyet birden kapanıyor:

- **Toplama düzeldi**: duran botun imleci sıfırlanmıyor, tarama gerçekten
  ilerliyor.
- **Görünürlük düzeldi**: bot orada durup çalışıyor, nerede ne yaptığı
  belli.

Ayrıca imleç eşiği gevşetildi (`BOT_IS_MERKEZ_KAYMA = 3`): fizik itmesi
veya mob çarpması taramayı baştan başlatmasın.

### Görsel ve işitsel geri bildirim

Kırılan blokta **parçacık** çıkıyor ve **ses** çalıyor. Ayrıca ilerleme
actionbar'a yazılıyor (`BOT_IS_RAPOR_ARALIK`): *"⛏ 3 bot odun topluyor ·
47 parça"*. Kullanıcı çalıştığını göremediği için boşuna kırıldığını
sanmıştı.

### Yan düzeltme: çanta artık her blokta diske yazılmıyor

`cantayaKoy` her blokta `JSON.stringify` + `setDynamicProperty`
çağırıyordu. Bot saniyede onlarca blok kırdığı için işin **en pahalı
kısmı** olmuştu. Kayıt artık toplu: `cantaKaydet()` iş bitince ve
teslimde.

Test: **30/30** (`bot.mjs` 27 bölüm).

---

## v4.32 — Derin tarama

> "Madenlerde 10 dakika boyunca kazım yapsın... Elmas getir dediğimde
> veya başka bir zorlu maden getir dediğimde... 10 dakika boyunca madende
> tarama yapsın ardından çeşitli yerlere baksın... verdiğim zorluğa göre
> işin dakikası artsın; yanımda odun var 'odun topla' dediğimde hemen
> yapar ama 'elmas bul 64 tane' veya '4 tane 64'lük demir topla'
> dediğimde iş dakikası artsın... ben bu adam gerçekten yapıyor hissini
> versin."

Yeni dosya: `yetenekler/bot_derin.js`. Normal `bot maden` duruyor;
derin tarama **onun yerine değil yanına** geldi.

### 1. Süre elle girilmiyor, zorluktan hesaplanıyor

```
süre = DERIN_TABAN_SURE + adet × zorluk × DERIN_PARCA_TICK   (tavan: 10 dk)
```

Zorluk katsayıları `ayarlar.js:DERIN_HEDEFLER` içinde, oyunun kendi
cevher dağılımından çıktı:

| istek | süre |
|---|---|
| 64 odun | 1.4 dk |
| 64 demir | 2.3 dk |
| 256 demir ("4 tane 64'lük") | 6.1 dk |
| 64 elmas | 8.5 dk |
| 64 netherit | 10.0 dk (tavan) |

**Süre bir tavan, zorunlu bekleme değil.** 64 elmas 3. dakikada
bulunursa iş 3. dakikada biter. Test bunu kilitliyor (bölüm 5).

### 2. Durak durak arıyor ("çeşitli yerlere baksın")

Bir tarama küresi bitince bot **bir sonraki durağa** gidiyor:

- **yatay:** altın açılı sarmal (`durakNo × 2.39996` radyan, yarıçap
  `DURAK_ADIM × √durakNo`). Düzgün daire aynı yerleri üst üste tarar;
  altın açı noktaları birbirine en uzak dağıtır.
- **dikey:** cevherin gerçek Y seviyesine doğru `DERIN_Y_ADIM`'lık
  basamaklarla. Tek hamlede inmiyor — iniş yolundaki kömürü, demiri de
  topluyor.
- **botlar ayrı yöne gidiyor:** her botun sarmalı `sıra × 2π/n` kadar
  dönük başlıyor. Beş bot beş ayrı koridor tarıyor.

Işınlanma kullanılıyor çünkü **Bedrock'ta yol bulma API'si yok** —
bota "şu mağaraya yürü" denemiyor. Varış noktası taş doluysa iki blok
açılıyor (madenci zaten tünel kazar), lav varsa o durak atlanıyor.

### Yakalanan hata: bot dibindeki elmasa bakmadan gidiyordu

İlk sürümde sarmal 1'den başlıyordu, yani bot işe başlar başlamaz 14
blok öteye ışınlanıyordu. Test bunu yakaladı: etraf baştan başa elmas,
bot **sıfır** getirdi. Artık **durak 0 = botun durduğu yer** — önce
dibindeki alınıyor, sonra sarmal açılıyor (`bot_is.js`'teki offset
sıralamasının aynı mantığı).

### 3. İş boyunca "bekle", sonunda geri dönüyor

Durum "takip" kalsaydı `botTara()` botu `BOT_KURTARMA_MENZIL`'de
yakalayıp yanına ışınlardı ve bot madene bir türlü inemezdi. İş boyunca
"bekle", bitince `botYanaCagir()` — "gitti, çalıştı, geri döndü" hissi
de buradan geliyor. Dönüş teslim menzili için de şart.

### Komut: kullanıcının ağzından

```
bot elmas               → 64 elmas
bot elmas 64            → 64 elmas
bot 64 tane elmas       → 64 elmas
bot 4 tane 64luk demir  → 256 demir   (sayılar ÇARPILIR)
bot demir 4x64          → 256 demir
bot derin               → ne cevher çıkarsa
bot odun 64             → hedefli odun
bot odun / bot maden    → ESKİ hızlı iş (derin tarama değil)
```

Ayrım şu: **sayı ya da "derin" kelimesi varsa hedeflidir.** Kullanıcının
kendi cümlesi de böyleydi. Türkçe ek yutuluyor ("elması" → elmas).

Yazmak istemeyene **menü**: kola dokun → "Bot: DERIN TARAMA". Liste
`ayarlar.js`'ten üretiliyor, elle yazılmıyor — yeni cevher eklenince
menüde kendiliğinden çıkıyor ve süresi de doğru görünüyor.

### Sahte iş yok

- Netherit/kuvars Overworld'de istenirse iş **başlamıyor**, sebebi
  yazılıyor. On dakika boş kazmaktansa doğruyu söylemek.
- Hiçbir şey bulunamazsa "y=... seviyesine yakın bir yerden başlat"
  deniyor; uydurma sonuç üretilmiyor.
- Yol üstündeki başka cevherler de çantaya giriyor ama **hedefe
  sayılmıyor**.

### Yan düzeltme

`main.js` açılışta "2.0.0-BETA isteniyor" yazıyordu; `BETA_GEREKLI`
v4.25'te `false` olmuştu, yani satır **yanlış bilgi veriyordu**. Artık
ayardan okunuyor.

Test: **31/31** (`derin.mjs` 15 bölüm).

---

## v4.33 — Kol temizliği + üç moddan iki fikir

### Kaldırılanlar (kullanıcı isteği)

| kol | ne oldu |
|---|---|
| `pa:kol_can` | **can_verme yeteneği tamamen silindi** |
| `pa:kol_alan` | `alan_simsegi` → Yıldırım Halkası Kolu'na |
| `pa:kol_top` | `toprak_topu` zaten Toprak Kol'daydı |
| `pa:kol_golge` | iki yeteneği de Boralo Kolu'na |

**15 kol → 11 kol.** Gölge Kolu'nun gerekçesi kullanıcının kendi sözüydü:
"gölge kolunun yeteneklerini boralo koluna ekle" — ikisi de aynı kaynaktan
(BoraLo modları) geliyordu ve ikisi de iki yetenekliydi.

**can_verme neden tamamen gitti:** "zaten hem kalp ekleme var, hem iksir
içince onun 4-5 katı süreyle yenilenme geliyor". Rakamlar doğruluyor:

```
can_verme  ->  200 tick (10 sn) yenilenme
iksirler   -> 6000 tick (300 sn) yenilenme
kalp ekle  -> KALICI ek kalp
```

Aynı ihtiyacın üç karşılığı vardı; en zayıfı gitti. `CAN_*` ayarları ve
`CAN_DUSMAN` listesi de silindi.

**Yetenek kaybı yok** (can_verme hariç, o bilerek). `temizlik.mjs` bunu
kilitliyor: kollara bağlı her kimlik gerçek bir yetenek olmalı ve
kaldırılan kolların yetenekleri başka bir kola geçmiş olmalı.

### Silerken yapılan hata

`find -name "*kol_top*" -delete` — **`kol_toprak` dosyalarını da sildi.**
Üretici hepsini geri yazdığı için kalıcı zarar olmadı ama test artık bu
tuzağı bekliyor: "kol_toprak SİLİNMEDİ (kol_top temizliğine kurban
gitmedi)".

### Üç moddan alınan iki fikir

Üç mod da **CraftyCraft** ile üretilmiş (`Bilemiyorum` ve `YeniBoraLoV3`
neredeyse birebir aynı, ~10.5k satır ortak kod; `naber`'in BH/RP klasörleri
ters isimlendirilmiş ve manifest'inde `1.0.0-beta` gametest bağımlılığı var
— paketi bir kez öldüren tuzağın aynısı). Mantık `.mcfunction` dosyalarında,
scriptler sadece `runCommand("function ...")` sarmalayıcısı. İki fikir
alındı:

**1. `zaman_durdur.mcfunction` → `dondur` gerçek kilit kazandı**

```
inputpermission set @a movement disabled
inputpermission set @a camera disabled
```

Tespit doğru: slowness bir oyuncuyu **yavaşlatır ama durdurmaz**,
`inputpermission` gerçekten kilitler. Uygulaması tehlikeliydi:

- **süresiz** — açan komut ayrı, kapatan ayrı dosyada; unutursan oyuncu
  sonsuza kadar kilitli
- `@a` — dünyadaki herkes, mesafe süzgeci yok
- kamerayı da kapatıyor: kilitli oyuncu etrafına bile bakamıyor

Bizde: sadece nişan aldığın hedefe, `DONDUR_SURE` kadar, `bitir()`'de kesin
serbest (iş yarıda kesilse de — test bunu ayrıca sınıyor). Kamera açık
kalıyor. **Son emniyet:** dünyaya her girişte `inputpermission ... enabled`
— script tam kilitliyken çökse bile oyuncu serbest başlar.

**Test yazarken çıkan gerçek hata:** `koniHedefleri()` oyuncuları
varsayılan olarak atlıyor ve `dondur` `oyuncuDahil` geçmiyordu — yani girdi
kilidi **ölü koddu**, hedef hiçbir zaman oyuncu olamazdı. `DONDUR_OYUNCU`
eklendi.

**2. Köylü klonlarından → bot yerdeki eşyayı topluyor**

Üç modun ortak yanı bütün karakterlerin köylü klonu olmasıydı; köylüler
`minecraft:behavior.pickup_items` taşır. Onlarda bu bir **yan etkiydi**
(köylüyü kopyalayınca geldi). Burada bilinçli: bot yere düşen eşyayı alıyor,
`botTara()` da botun kutusunu ekip çantasına boşaltıyor.

Neden aktarılıyor: yoksa iki ayrı depo olurdu ve "bot teslim" dediğinde
botun kutusundaki gelmezdi. Sıra `çantaya koy → kutudan sil`; silme
başarısız olursa çanta geri alınıyor, yoksa **eşya kopyalanırdı** (test
bunu da sınıyor).

Test: **32/32** (yeni `temizlik.mjs`).

---

## v4.34 — İlkel Beşli

Kullanıcı bir boss listesi getirdi (İlkel Beşli) ve "bunlar benim kişisel
botlarım olacak" dedi. Yani beş **düşman**, beş **müttefik** oldu.

### Çeviri kuralı

| | |
|---|---|
| **sayılar** | AYNEN korundu — can, hasar, iyileşme miktarı, efekt seviyesi, süre |
| **hedefler** | TERS çevrildi — "oyuncuya Yavaşlık III" → botun **vurduğu şeye** |

Kendi botun seni körleştirseydi bu bir özellik değil ceza olurdu. Raxxan'ın
"30 blok civarındaki oyunculara Bulantı V"i de civardaki **düşmanlara**
gidiyor; sahip ve ekip arkadaşları dışarıda (`ILKEL_AURA_OYUNCU`).

### Üyeler

| üye | can/hasar | script tarafı |
|---|---|---|
| Kajaros | 1750 / 23 | vurulunca +20 can · vurduğuna Yavaşlık III + Bulantı III + Körlük III (7,5 sn) |
| Miskel | 1300 / 14 | vurulunca +40 can · vurduğuna Körlük XVI (6 sn) **veya** Solgunluk VII (4 sn) |
| Harkos | 1300 / 13 | tik başına 0,5 HP pasif iyileşme |
| Raxxan | 1000 / 15 | 30 blokta düşmana Bulantı V · ara ara görünmezlik · %10 ihtimalle +100 can |
| Okazor | 1200 / 50 | 4 sn'lik pencerede 3 üst üste vuruş → can tamamen dolar |

### Neden ayrı varlık değil

Beşi de `pa:bot`'un **bileşen grupları**. Böyle olunca defter, çanta,
teslim, odun/maden, derin tarama, savaş anahtarı — hepsi olduğu gibi
çalışıyor. Kajaros da odun toplar, Harkos da derin tarama yapar. Ayrı varlık
yapsaydık `_bot_defteri.js` baştan yazılırdı ve "bot varlığı kayıtlı değil"
hatası beş katına çıkardı.

**Varlık JSON'unda** (kol_uret.py): can, hasar, ölçek, geri itilme
bağışıklığı (Kajaros/Raxxan/Okazor), Miskel'in ok atması
(`shooter` + `ranged_attack`), Harkos'un sıçraması (`leap_at_target`).
**Script'te** (bot_ilkel.js): vuruşa/hasara bağlı her şey, pasif iyileşme,
aura, Okazor'un serisi.

### Görünüş

Beş üye de normal bot gibi çizilir; farkı **boyu ve ismi** (`nameTag`).
Ayrı doku denemedim — v4.28'de bot dokusuna dokununca bot tamamen görünmez
olmuştu ve sebebini bulmak üç sürüm aldı.

### Yakalanan hata: `botCagir`'ın `tavan` alanı iki anlamda

```js
başarıda       { dogdu: true, ..., tavan: BOT_TAVAN }   // sayı, bilgi
tavan dolunca  { tavan: true, ... }                     // bayrak
```

`if (sonuc.tavan)` başarılı çağrıyı da yakalıyordu: bot doğuyor ama
"tavandasın" hatası dönüyordu. Doğru sınama `dogdu`.

### Denge notu

Bunlar patron sayıları: Okazor 50 hasar vuruyor (demir golem 21), Kajaros
1750 can taşıyor (ender ejderi 200). Yanında bir tanesi bile oyunu
kolaylaştırır — bilinçli bir tercih, sayılar kullanıcının verdiği listeden.
`ILKEL_TAVAN` (isim başına kaç tane) ve `ILKEL_ACIK` ile ayarlanabilir.

Komut: `bot ilkel` (sıradaki eksik üye) · `bot kajaros` · `bot suikastci`.
Menü: kola dokun → "Bot: İLKEL BEŞLİ" → listede kimin ne yaptığı yazıyor,
"Hepsini çağır" düğmesi de var.

Test: **33/33** (yeni `ilkel.mjs`, 12 bölüm).

---

## v4.35 — Beş skin, beş varlık, bir rütbe zinciri

Kullanıcı beş adet 64×64 skin gönderdi ve "bunlar beni özel koruyanlar,
bunlar ekip" dedi. Ayrıca rütbe istedi: **Okazor lider, Harkos en alt** —
bu ikisi kullanıcının kararı, değiştirilemez. Aradaki üç sıra bana bırakıldı.

### Rütbe sıralaması

| # | üye | ünvan | gerekçe |
|---|---|---|---|
| 1 | **Okazor** | Ekip Lideri | kullanıcı kararı |
| 2 | **Kajaros** | Muhafız Komutanı | 1750 can (en yüksek), geri itilmez — lideri koruyan duvar |
| 3 | **Raxxan** | Gölge Ustası | görünmezlik + 30 bloklu zihin aurası; psikolojik harp |
| 4 | **Miskel** | Savaş Büyücüsü | menzilli destek, uzmanlık sınıfı |
| 5 | **Harkos** | Gölge Çırağı | kullanıcı kararı — en düşük hasar (13), en hızlı |

Rütbe isim etiketinde görünüyor (`[2] İlkel Muhafız Kajaros · Muhafız
Komutanı`), menü rütbe sırasında diziliyor ve "çağır"a bastıkça ekip
**yukarıdan aşağı** kuruluyor.

### Neden beş ayrı varlık oldular

v4.34'te beşi de `pa:bot`'un bileşen gruplarıydı. Beş ayrı **skin** gelince
bu yetmedi: **bir varlığın tek istemci tanımı, tek dokusu vardır.** Çeşide
göre doku seçmek `arrays` + `query.variant` + özel render controller
gerektiriyor — v4.28'de tam o denendi ve **bot görünmez oldu**, sebebini
bulmak üç sürüm aldı.

Bu yüzden yol değiştirildi: **her üye kendi varlığı, kendi istemci tanımı,
kendi tek dokusu.** Çizim yolu botunkiyle birebir aynı
(`controller.render.default` + tek texture) — yani çalıştığı bilinen kurulum
beş kez tekrarlanıyor, çalışmadığı bilinen kurulum hiç kullanılmıyor.

Riski de dar: beşinin çizimi bozulsa bile **normal bot etkilenmez**, onun
dosyalarına dokunulmadı.

Skinler doğrudan kullanılabildi çünkü bot geometrisi zaten oyuncu skin
düzeninde: kafa 0,0 · gövde 16,16 · sağ kol 40,16 · sol kol 32,48 · sağ
bacak 0,16 · sol bacak 16,48.

### Eşleştirme (değiştirmek kolay)

`kol_uret.py:ILKEL_SKIN` tablosunda dosya adını değiştirip üreteci tekrar
çalıştırmak yeterli.

### Kimlik artık çoğul

`BOT_KIMLIK` tek başına yetmiyor; `BOT_KIMLIKLER` **`ILKEL_BESLI`'den
türetiliyor**, elle yazılmıyor. Bunu unutmak sinsi olurdu: bot menüsü
açılmaz, **nişan kendi Okazor'una kilitlenir**, botlar birbirini döverdi.
`KILIT_ATLA_TIPLER` de artık bu kümeden geliyor.

Defter tarafı: `botCagir(oyuncu, kimlik)`, boyut taraması altı türü de
geziyor, `eksikBotTurleri()` kayıtsız varlıkları durum raporuna basıyor.

### Koruma görevi

"Bunlar beni özel koruyanlar" — ekip savaşı kapalı olsa bile bu beş üye
**savaşa hazır doğuyor** (`ILKEL_KORUMA`). Elle "bot savaş kapat" dersen
yine susarlar; bu bir başlangıç durumu, kilit değil.

### `canli.mjs` bölüm 4: her varlığın çizimi tam mı

Yeni varlık = yeni sessiz hata riski. Artık `entities/` altındaki her
varlık için sınanıyor: istemci tanımı var mı, kimlikler aynı mı, dokusu
gerçekten diskte mi, geometrisi tanımlı mı, **özel render controller
kullanmıyor mu**. v4.28'in hatası bir daha sessizce geçemez.

Test: **33/33** (`ilkel.mjs` 13 bölüm, `canli.mjs` 4 bölüm).

---

## v4.36 — Hiyerarşi kesinleşti

Dört seçenek sunuldu, kullanıcı beşincisini seçti:

| # | üye | ünvan | can |
|---|---|---|---|
| 1 | **Okazor** | Ekip Lideri | 1200 |
| 2 | **Miskel** | Baş Büyücü | 1300 |
| 3 | **Kajaros** | Muhafız Komutanı | 1750 |
| 4 | **Raxxan** | Gölge Ajanı | 1000 |
| 5 | **Harkos** | Gölge Çırağı | 1300 |

Bu ekipte **büyü askerî rütbenin üstünde**: Miskel, ekibin en canlı üyesi
olan Kajaros'un amiri. Rütbe can/hasar sırasıyla **kasten örtüşmüyor** —
rütbe bir görev sırası, güç sıralaması değil. Test bunu ayrıca kilitliyor
("rütbe, can sıralamasından bağımsız"), yani ileride biri "canına göre
dizelim" diye düzeltmeye kalkarsa patlar.

### "Hepsini çağır" kaldırıldı

> "bir anda 5 tanesi de gelmesin tek tek aralarından seçerim"

Haklı: beş patronu aynı anda yan yana dizmek hem ekibi sıradanlaştırıyor
hem kimin ne yaptığını görmeni engelliyor. Üye seçmek artık bilinçli bir
karar — menüden birini seç, o gelir. `bot ilkel` komutu da sıradaki eksik
üyeyi getiriyor, hepsini değil.

Test: **33/33** (`ilkel.mjs` 13 bölüm + hiyerarşi bekçisi).

---

## v4.37 — El-Harkos

Kullanıcı bildirdi: **tam adı El-Harkos**, "Harkos" kısaltması. Görünen ad
güncellendi (isim etiketi, menü, dil dosyası, yumurta adı); sohbette
`el-harkos`, `elharkos`, `el` ve kısaltma `harkos` — hepsi aynı üyeye
gidiyor.

**Varlık kimliği `pa:harkos` olarak KALDI.** Kimliği değiştirmek mevcut
dünyalarda doğmuş El-Harkos'u "bilinmeyen varlık" yapardı; doku dosyası ve
bot kayıtları da ona bağlı. **Ad bir görünüm, kimlik bir sözleşme** — test
bu ayrımı da kilitliyor.

---

## v4.38 — Skin eşleştirmesi tahmindi, tutmadı

Kullanıcı beş skini tek mesajda gönderdi, kimin kim olduğunu söylemedi.
v4.35'te eşleştirmeyi **ben tahmin ettim** (renk ve havaya bakarak). Oyunda
çağırınca çıktı: gri miğferli asker **Kajaros değil, El-Harkos**'muş.

Ders şu: **skin bir görünüş değil kimlik.** Tahmin edilmez, sorulur. Kalan
dördü artık tabloda açıkça `? tahmin` diye işaretli; sadece El-Harkos
`ONAYLI`.

### `onizle_ilkel.py` — eşleştirme tablosu

Kullanıcının doğrulamak için oyuna girip tek tek çağırması gerekiyordu.
Artık gerekmiyor: bu betik her üyenin **atanmış** skinini oyuncu skin
düzeninden ön görünüme çevirip rütbe + ünvan + onay durumuyla tek bir PNG'ye
diziyor.

Rütbe ve adlar `ayarlar.js`'ten **okunuyor**, betiğe elle yazılmıyor —
yoksa tablo kodla birlikte bayatlardı.

Eşleştirmeyi düzeltmek: `kol_uret.py:ILKEL_SKIN` içinde dosya adını
değiştir, üreteci çalıştır.

---

## v4.39 — Miskel ve Raxxan da onaylandı

Kullanıcı iki düzeltme birden verdi:

- "Raxxan olarak adlandırılan kişi aslında **Miskel**"
- "Kajaros'tan Raxxan'a, **bu**" (o an Kajaros'ta duran skin)

Kalan iki skin (Okazor ↔ Kajaros) hâlâ tahmin — ikisi de iki yuvaya
sığdığı için artık düz bir ya/ya da.

### Onay durumu tek kaynağa taşındı

`kol_uret.py:ILKEL_SKIN_ONAY`. Önizleme betiği de artık orayı **okuyor**;
önce iki ayrı yerde tutuluyordu ve "tablo onaylı derken üretici tahmin
der, kimse fark etmez" durumu vardı.

**Yamanın kendisi ilk denemede sessizce tutmadı** — `str.replace` eşleşmedi
ve dosya değişmeden geri yazıldı, tablo eski etiketleri göstermeye devam
etti. Artık `assert` var: eşleşmezse patlıyor. (Aynı ders, üçüncü kez:
sessizce hiçbir şey yapmayan kod, hata veren koddan beterdir.)

### Eşleştirme tamamlandı

| # | üye | skin | durum |
|---|---|---|---|
| 1 | Okazor | siyah kapüşon + altın kuşak | ONAYLI |
| 2 | Miskel | siyah/beyaz maske | ONAYLI |
| 3 | Kajaros | beyaz başlık + kahve göğüs | ONAYLI |
| 4 | Raxxan | miğfersiz, kahve saç | ONAYLI |
| 5 | El-Harkos | gri miğferli asker | ONAYLI |

Beş tahminden **üçü yanlıştı**. `kol_uret.py`'deki tabloya "bu tabloyu
değiştirme, renklere bakıp düzeltmeye kalkma" notu düşüldü — tam o hata
yapılmıştı.

Dokular değişmediği için paket yeniden kurulmasına gerek yok: v4.39 son hâli.

---

## v4.40 — Sürüm artık paketin adında

Kullanıcı v4.39'dan sonra "sorun hâlâ düzelmedi, isimler yanlış" dedi.
Paketin içi **kontrol edildi ve doğruydu** — beş dokunun md5'i onaylanan
eşleştirmeyle birebir aynı. Yani hata dosyada değil, **oyunun hangi paketi
yüklediğindeydi.**

### Kök sebep: iki ayrı paket, ayrı ayrı güncelleniyor

Bedrock'ta davranış paketi (script, isimler) ile kaynak paketi (skinler)
**ayrı iki pakettir** ve dünyaya ayrı ayrı uygulanır. Biri güncellenip
diğeri eski kalırsa ortaya anlaşılmaz bir tablo çıkıyor:

| belirti | sebep |
|---|---|
| isimler doğru, **skinler yanlış** | kaynak paketi eski |
| isimler de yanlış | davranış paketi de eski |

Bunu dışarıdan görmenin bir yolu yoktu — paket listesinde ikisi de aynı
adla duruyordu.

### Çözüm

`paketle.sh` artık paketlemeden önce `header.name`'i **manifest'teki
sürümden** üretiyor:

```
Simsek TNT ve Toprak Topu v4.40
Simsek Kol Gorunumleri v4.40
```

Dünya ayarlarındaki paket listesine bakınca hangi sürümün etkin olduğu
okunuyor. Ad elle yazılmıyor, sürümden geliyor — yani bir daha ayrışamaz.

Ayrıca dünyaya girerken zaten basılan `[SimsekTNT v4.40] yuklendi` satırı
davranış paketinin sürümünü söylüyor. İkisi birlikte bakılınca hangi
paketin geride kaldığı tek bakışta belli oluyor.

---

## v4.41 — Canlar kalp cinsindenmiş, hepsi ikiye katlandı

Kaynak listedeki "1750 HP" aslında **1750 KALP** demekmiş. Minecraft'ta
1 kalp = 2 HP olduğu için dosyaya iki katı yazılması gerekiyordu; ilk
sürümde sayılar olduğu gibi girilmişti, yani **herkes yarım canla
dolaşıyordu.**

| üye | önce | şimdi | oyunda görünen |
|---|---|---|---|
| Kajaros | 1750 HP | **3500 HP** | 1750 kalp |
| Miskel | 1300 | **2600** | 1300 kalp |
| El-Harkos | 1300 | **2600** | 1300 kalp |
| Okazor | 1200 | **2400** | 1200 kalp |
| Raxxan | 1000 | **2000** | 1000 kalp |

Aynı kural **iyileşme miktarları** için de geçerli — onlar da kaynakta
"HP" diye yazılıydı: Kajaros +20→**40**, Miskel +40→**80**, Raxxan'ın ani
iyileşmesi +100→**200**, Harkos'un tik başına 0,5→**1**.

**Hasara dokunulmadı:** kaynakta "23 Hasar" yazıyor, "23 HP" değil.

### İki hata, ikisi de yakalandı

1. **Sıralı `replace` birbirini yedi.** `20→40` sonra `40→80` yapınca
   Kajaros'un yeni 40'ı da 80 oldu: Kajaros 80, Miskel 40 — ters. Çıktıyı
   tabloya basınca görüldü. Ders: aynı dosyada zincirleme değiştirme
   yaparken önceki adımın çıktısı sonrakinin girdisi olabiliyor.
2. **Üreteci çalıştırmayı unuttum.** `kol_uret.py` güncellendi ama varlık
   JSON'ları eski kaldı. `ilkel.mjs` bölüm 1 tam bunun için yazılmıştı ve
   yakaladı: *"JSON 1750 / ayar 3500"*.

Testlerdeki rakamlar da artık `ayarlar.js`'ten **türetiliyor** — elle
yazılsaydı bu tur sessizce eski rakamı sınamaya devam ederdi.

### `paketle.sh`: dosya adı da sürümden

Paketin içi v4.41'di ama dosya adı `SimsekTNT_v440.mcaddon` diyordu — `S=`
elle yazılıyordu. Artık manifest'ten okunuyor. Sürüm bilgisi üç yerde
(dosya adı, paket adı, açılış satırı) ve üçü de **tek kaynaktan**.

---

## v4.42 — Hasarlar da kalp cinsinden

Kaynaktaki "23 Hasar" da kalp demekmiş. Aynı kural, ikiye katlandı:

| üye | hasar (HP) | **kalp/vuruş** |
|---|---|---|
| Okazor | 100 | **50** |
| Kajaros | 46 | 23 |
| Raxxan | 30 | 15 |
| Miskel | 28 | 14 |
| El-Harkos | 26 | 13 |

**Okazor'un tek vuruşu 50 kalp.** Normal bir oyuncuyu (10 kalp) beş kez
öldürür; kalp tavanındaki bir oyuncuyu (110 kalp) üç vuruşta bitirir.
Bilinçli — sayılar kullanıcının listesinden ve o liste patron listesiydi.

Bununla İlkel Beşli'nin bütün sayıları kaynakla birebir aynı hâle geldi:
can, hasar, iyileşme, efekt seviyesi, süre.

---

## Tablet ölçümü: 20 bot sorunsuz

Uzun süredir açık olan soru kapandı. Kullanıcı tablette denedi:
**20 botun hepsi aynı anda yanındayken hiç takılma yaşanmadı.**

Bu, `BOT_TAVAN = 20`'nin bir tavan değil bir **tercih** olduğunu gösteriyor
— sayı v4.27'de "önce güvenli bir yerden başlayalım" diye seçilmişti,
ölçüme dayanmıyordu.

Neden şaşırtıcı değil: bot sayısı **tick yükünü artırmıyor**. Blok bütçesi
(`TICK_BLOK_BUTCESI = 56`) tüm oyuncular ve botlar arasında paylaşılıyor,
yani yirmi bot çalışınca iş daha yavaş bitiyor ama tick maliyeti sabit
kalıyor. Ölçülebilir tek artan yük vanilla AI tarafında (yol bulma), o da
motorun içinde ve bizim elimizde değil.

Not: ölçüm botlar **takip ederken** yapıldı. Yirmi bot aynı anda derin
tarama yaparken ya da dövüşürken ayrıca denenmeli — özellikle İlkel Beşli,
`melee_attack` + hedef takibi yüzünden normal bottan pahalı.

---

## v4.43 — Normal botlar da güçlendi

Tablet ölçümü 20 botun sorunsuz olduğunu gösterince kullanıcı üç şey
istedi:

| | önce | şimdi |
|---|---|---|
| **tavan** | 20 bot | **30 bot** |
| **can** | 25 HP (12,5 kalp) | **50 HP (25 kalp)** |
| **hasar** | 7 HP (3,5 kalp) | **14 HP (7 kalp)** |

Karşılaştırma: vanilla kurt 4 hasar / 8 can, demir golem 21 hasar /
100 can. Bot artık golemin yarı canında ama **ondan sert vuruyor** —
otuz tane olabildiği için bilinçli bir güç tercihi.

### Normal botun da kendi skini var

Kullanıcı ayrı bir 64×64 skin gönderdi: koyu kafa, koyu kırmızı gövde.
**İlkel Beşli'ye dokunulmadı** — onların kendi skinleri duruyor.

Üretilen prosedürel doku (`bot_dokusu`) **yedek olarak bırakıldı**: skin
dosyası bulunamazsa eski görünüm çiziliyor, bot mor-siyah kalmıyor.

Test buna iki kontrol ekledi: normal botun skini İlkel Beşli'nin
hiçbiriyle **aynı olmamalı** (yanlış dosya kopyalansa kimse fark etmezdi)
ve gerçek bir dosya olmalı, yer tutucu değil.

### `bot.mjs` bölüm 24 kaynaktan türetiliyor

`hasar 7` ve `can 25` elle yazılıydı; v4.43'te ikisi de değişince test
bozuldu. Artık `kol_uret.py`'den okunuyor — aynı ders, bu turda dördüncü
kez.

---

## v4.44 — Toprak Kol'un gerçek dokusu

Kullanıcı elle çizilmiş bir doku gönderdi. İncelendiğinde **birebir
oturduğu** görüldü:

- 64×64, oyuncu skin düzeninde
- boyalı bölge: `40..55 × 16..31` (vanilla skinin **sağ kol** kutusu)
- kol modelimizin tek küpü de tam orada: `uv (40,16)`, `size 4×12×4`

Modelin örneklediği **altı yüzün altısı da dolu** — üst, alt ve dört yan.
Dönüştürmeye gerek kalmadı, dosya olduğu gibi kullanıldı. (Dosyada bir de
sol kol bölgesi var; modelimiz onu kullanmıyor, zararsız duruyor.)

### Envanter ikonu da aynı dokudan

Üretilen ikon düz renkti ve elde tutulan kolla alakası yoktu. Artık aynı
dosyanın **ön yüzü** (`44,20` 4×12) 16×16 ikona ortalanıyor — envanterdeki
resim ile eldeki kol aynı şeye benziyor.

### Üretilen dokular yedek olarak duruyor

`KOL_SKIN` tablosunda karşılığı olmayan kollar eski (yer tutucu) dokuyla
kalıyor. Yani yeni doku eklemek tek satır, eklememek de bir şeyi bozmuyor —
hiçbir kol mor-siyah kalmıyor.

`kol2.mjs`'e beş kontrol eklendi; en önemlisi **hiçbir kol dokusuz
kalmamalı** — bir kolun dokusu eksik olsa oyunda saydam çizilirdi ve
hiçbir test yakalamazdı.

---

## v4.45 — Bir dosyada iki kol

Kullanıcı ikinci bir doku gönderdi ve içinde **iki ayrı kol** vardı:

| skin yuvası | içerik |
|---|---|
| sağ kol `(40,16)` | toprak |
| sol kol `(32,48)` | **buz** |

(Önceki dosyada iki yuva da toprakmış — buz ilk kez geldi.)

### Yuva taşıma

Kol modelimizin tek küpü var ve hep `(40,16)` örneklıyor. Sol yuvadaki kol
oraya **taşınmalı**, yoksa oyunda saydam çizilir. `KOL_SKIN` artık
`(dosya, yuva)` alıyor:

```python
"kol_toprak": ("fa85d183-image.png", "sag"),
"kol_buz":    ("fa85d183-image.png", "sol"),
```

İki yuvanın **iç düzeni aynı** (üst, alt, doğu, ön, batı, arka) — sadece
başlangıç noktaları farklı. O yüzden 16×16'lık bloğu olduğu gibi taşımak
yetiyor, yüz yüze eşleme gerekmiyor.

### Test artık pikselleri okuyor

Önceki tur "dosya yer tutucudan büyük mü" diye bakıyordu — zayıf bir
kontrol. Şimdi `(40,16) 16×16` bölgesinin gerçekten **dolu** olduğu
sınanıyor (`python3` ile, Node'da PNG çözücü yok). Taşıma atlansaydı bölge
boş kalır, kol oyunda saydam çizilir ve dosya boyutuna bakan test bunu
asla yakalayamazdı.

Bir kontrol daha: iki kolun dokusu **birbirinden farklı olmalı**. İkisi tek
dosyadan geldiği için yuva seçimi yanlış olsa ikisi de aynı kolu gösterirdi.

---

## v4.46 — Dört kol daha gitti: 11 → 7

Gerekçe kullanıcıdan ve **referans moddan** geldi:

> "Şimşek kolu diye bir şey yok zaten, o tamamen Toprak Kol'un güçlerine
> ait; aynı şekilde Yıldırım Halkası, savurma, bir de örs — bunlar ayrı
> kollar değil, Toprak Kol'un gücünde görebiliyoruz."

| kaldırılan | ne oldu |
|---|---|
| `pa:kol_simsek` | `yon_simsegi` **zaten** Toprak Kol'daydı — tam kopya |
| `pa:kol_ors` | `ors` **zaten** Toprak Kol'daydı — tam kopya |
| `pa:kol_halka` | `yildirim_halkasi` + `alan_simsegi` Toprak'a geçti |
| `pa:kol_savur` | `savur` Toprak'a geçti |

**İkisi tamamen gereksizmiş** — aynı yetenek iki ayrı eşyada duruyordu.
Kaybolan yetenek yok; Toprak Kol artık 12 yetenek taşıyor:

```
toprak topu · yön şimşeği · yıldırım halkası · alan şimşeği · savurma ·
örs · toprak uçuş · toprak duvar · meteor · güçlü TNT · kalp ekle/sıfırla
```

Silme sırasında bu sefer **glob kullanılmadı** — v4.33'te
`find -name "*kol_top*"` `kol_toprak` dosyalarını da silmişti. Dosya adları
tek tek yazıldı.

### Beş test dosyası kol dizilimine bağlıydı

Bu tur asıl iş buydu. `dave.mjs`, `dort.mjs`, `menu.mjs`, `ciftel.mjs` ve
`kol2.mjs` "şu kolu eline al, zıpla" diyordu — yani **yeteneği kol
üzerinden** tetikliyorlardı. Kol kalkınca testler yanlış yeteneği ölçmeye
başladı (yetenek çalışıyor, test başka yere bakıyor).

Üçü artık yeteneği **doğrudan kimliğiyle** çalıştırıyor:

```js
const isler = [].concat(yetenekAl("ors").olustur(o) || []);
// merkezi döngüyü taklit et: bütçeSıfırla + çalış + bitir
```

`dave.mjs`'te iki bölüm iş **ortasında** dünyayı değiştiriyordu (hedef
kaçıyor, hedef ölüyor); onlar için `isBaslat` / `isSur` ayrıldı.

Diğer ikisinde gözlenen şey değişti: kaldırılan Örs Kolu yerine Uçuş Kolu
kullanılıyor, o blok yazmadığı için "kaç örs düştü" yerine "levitation
efekti verildi mi" bakılıyor.

Ders: **testi yeteneğe bağla, eşyaya değil.** Eşya düzeni bu depoda üç kez
değişti, yetenekler yerinde durdu.

---

## v4.75 — Işının rengi ölçüldü, obsidyen niye kırılmadığı bulundu

Kullanıcı oyun içi ekran görüntüsüyle referansı yan yana koydu: *"bizimki
birazcık daha soluk gibi geldi."*

### Ölçüm: renk değil, iki ayrı sorun

Ekran görüntüsünde ışın dört ayrı yatay taramada **aynı** değeri verdi:
`(79, 101, 115)`. Bizim doku ise `(176, 224, 255)`.

```
 79/176 = 0,449     101/224 = 0,451     115/255 = 0,451
```

Üçü de **%45**. Yani ışın dünya ışığıyla gölgeleniyor — ve bu ekran
görüntüsü *güpegündüz* çekildi, karanlıktan değil. Hiçbir doku değeri bunu
kapatamaz: 255'in üstüne çıkılamıyor.

### Referansın dokusu canlı okundu

`Element İksiri modu V2` → `textures/entity/pamobile/pa_element_lazer.png`:

| renk | piksel |
|---|---|
| `(0, 0, 0, 0)` | 3692 |
| `(0, 255, 243)` | 280 |
| `(255, 98, 0)` | 124 |

İkisi de **tam doygun**. Bizimki ise gözün *beyaza çekilmiş* halinden
alınıyordu (0,32 oranında). Beyazlatma gözde doğru — "göz açıldı" hissini o
veriyor — ama ışında doygunluğu öldürüp griye yaklaştırıyor; gölgelenince
de gri-mavi çıkıyor. Ölçülen `(79, 101, 115)` tam olarak bu.

### İki düzeltme

1. **Doygunluk** (`isin_rengi`): ton korunuyor, doygunluk `2,6` katına
   çıkıp tavana dayanıyor, en parlak kanal 255'e çekiliyor. Beyaz göz beyaz
   kalıyor — doygunluğu zaten ~0 ve sıfırın katı sıfır.
2. **Parlama**: ışın kutuları kendi kemiğine (`isin`) alındı ve o kemiğe
   `entity_emissive` verildi. Malzeme render denetleyicisinde kemik başına
   veriliyor, aynı kemikteki iki kutuya iki malzeme verilemiyor.

Göze uygulanamaz: gözün halesi ve saçakları ara alfa değerleriyle yumuşuyor,
`entity_emissive` altında o ara değerler saydamlık değil **parlaklık**
sayılır — hale opak parlayan bir leke olur, yani v4.18'de temizlenen
"gözlük" hatası geri gelir.

Depo tarihi özel render denetleyicisine karşı uyarıyor (v4.28'de bot üç
sürüm boyunca görünmez kaldı). O yüzden denetleyici vanilla
`controller.render.armor` ile birebir aynı; tek fark `materials` dizisine
eklenen ikinci satır. Geri dönüş yolu tek satır: `LAZER_ISIN_PARLAK = False`.

### Obsidyen: sorun sabırsızlık değil, sayılardaydı

*"Obsidyen kırılmıyor."* Eski `delmeListesi` her `d` adımında, bloğun dolu
olup olmadığına **bakmadan** 3×3×3 = 27 nokta ekliyordu ve tavan 60'tı:

```
d=1 -> 27     d=2 -> 54     d=3 -> tavan
```

Liste ışının ancak **ilk üç bloğunu** kapsıyordu. Üstelik oyuncunun
önündeki o üç blok genelde hava; hava bloğu döngüde atlanıyor ama listede
**yerini tutuyordu**. Açık alanda 60 slotun 60'ı havaya gidiyor, dört blok
ötedeki obsidyene hiç sıra gelmiyordu. Duvara burnunu dayarsan çalışıyordu
— kullanıcı birkaç blok uzaktan baktığı için doğru rapor.

Testlerin kör noktası: bütün delme senaryolarında dünya baştan aşağı
doluydu, yani burnunun dibindeki blok zaten obsidyendi. `lazer_delme.mjs`
bölüm 7 artık **havanın arkasındaki** obsidyeni sınıyor.

Düzeltme: merkez blok dolu değilse o adım listeye hiç girmiyor, aynı blok
iki kez girmiyor (yoksa sayaç tek vuruşta iki kere azalırdı), yoklama
okuması da bütçeden ödeniyor — `duvardel.mjs` bunu 70/56 diye yakaladı.

### `paketle.sh` liste tutmayı bıraktı

Dosyanın kendi DİKKAT notu *"yeni klasör eklersen buraya da ekle"* diyordu
ve tam olarak o unutulmuştu:

* BP `.mcpack`'te yok: `blocks`, `features`, `feature_rules`, `loot_tables`
* RP `.mcpack`'te yok: `blocks.json`, `render_controllers`

`.mcaddon` klasörün tamamını zipliyor, o yüzden oradaki paketler sağlamdı;
sorun yalnızca **tek başına** kurulan `.mcpack`'lerdeydi. Artık liste yok,
klasörün içindeki her şey alınıyor.

---

## v4.76 — İki kırmızı ayrıldı

v4.75'in doygunlaştırması Redoksin ile Kan İksiri'nin ışınlarını **aynı**
renge düşürdü. Sebep matematiksel:

```
Redoksin  göz (255, 96, 96)
Kan       göz (220, 50, 50)
```

İkisinde de yeşil ve mavi kanallar **eşit**, yani ikisi de saf kırmızı
tonunda — aralarındaki fark sadece açıklık/doygunluk. Doygunluk tavana
çekilince o fark siliniyor ve ikisi de `(255, 0, 0)` oluyor. Hiçbir
doygunlaştırma bunları ayıramaz; ayırmak için **ton** vermek gerekiyor.

`LAZER_ISIN_RENK` tablosu bu iki gözün ışın rengini elle veriyor:

| iksir | ışın | ne |
|---|---|---|
| Redoksin | `(255, 24, 0)` | parlak al, ateşe bir tık |
| Kan İksiri | `(205, 0, 48)` | koyu bordo, morumsu tarafa |

Firenoksin'in turuncusuna `(255, 155, 0)` kaçmayacak kadar uzak seçildi;
`doku.mjs` üçünün de birbirinden ayrı kaldığını sınıyor. Renkler **elle**
verildiği için biri silinirse sessizce eski hâline dönerdi — test onu
yakalar.

Gözlere dokunulmadı: onlar zaten birbirinden farklı iki kırmızı.

Ayrıca kullanıcı obsidyen sayısını netleştirdi: *"orda örnek verdim, illa
öyle demedim ki."* 10, ölçü birimi değil — sert blokları da deliyor hissini
anlatan bir örnekmiş. Sayı denge için serbest.

---

## v4.77 — Menzil 14 → 17

v4.73'te yazılan şart doldu: *"14 bloktan başlıyoruz çünkü çok uzun bir model
kutusu görünürlük sınırı sorunu çıkarabilir; tablette sorun çıkmazsa tek
satırla büyütüyoruz."* İki sürüm boyunca 14 blokluk kutu (224 birim) oyunda
sorunsuz çizildi.

Sayı **iki yerde**: `ayarlar.js:LAZER_MENZIL` (hasar + delme yürüyüşü) ve
`kol_uret.py:LAZER_ISIN_MENZIL` (ışın modelinin boyu). `doku.mjs` eşitliği
kilitliyor — ayrışırlarsa ışın gördüğünden başka yerde vurur.

Görünürlük kutusu zaten bu sayıdan türüyor: `38 × 21` blok.

### Testler iki gerçek şeyi yakaladı

**1. `duvardel.mjs` yanlış sınırı ölçüyormuş.** `DUVAR_DELME_TAVAN` bir
*taramanın* tavanı, atışın toplamı değil — ışın her yarım saniyede listeyi
sıfırdan kuruyor. Menzil 14 iken toplam tesadüfen tam 140 çıkıyordu ve
kontrol geçiyordu; 17'de 171 oldu ve kırıldı. Kod doğruydu.

Doğru sınır **geometrik**: düz duvarda delik 3×3'lük bir tünel, boyu menzil
+ iki uç → `9 × 19 = 171`. Ölçülen tam 171, yani ışın tünelin tamamını açıyor
ve bir blok fazlasını açmıyor. Tek tick'te patlamayı engelleyen şey tavan
değil **blok bütçesi**, o da ayrıca sınanıyor. Bir de alt sınır eklendi:
deliğin menzilin **sonuna kadar** ulaştığı — yoksa yürüyüş sessizce kısalsa
üst sınır yine geçerdi.

**2. Küre ışının ucunu kırpıyormuş.** Hedef taraması bir küre
(`getEntities({maxDistance})`), asıl süzgeç ise izdüşüm. Yarıçap tam
`LAZER_MENZIL` olunca ışının **ucundaki** hedefler küreye sığmıyor:

```
menzilin ucunda, ışından LAZER_KALINLIK kadar yanda duran hedefin
merkeze uzaklığı  sqrt(MENZİL² + KALINLIK²) > MENZİL
```

Yani geçerli hedef daha izdüşüme gelmeden eleniyordu. Tam 17 bloktaki hedef,
göz onun 0,6 blok üstünde olduğu için bile küre dışına düşüyordu. Oyunda
"ışın üzerinde ama vurmuyor" diye görünürdü. Yarıçapa `LAZER_KALINLIK` kadar
pay verildi; küre artık kesinlikle yetiyor, eleme işini izdüşüm yapıyor.

Bu hata 14 blokta da vardı, sadece kimse tam sınırda denemedi.

### Ne pahalılaştı (bilerek kabul edildi)

* Hedef taraması bir küre: `(17/14)³ = 1,79` kat hacim, yarım saniyede bir.
* Delme yoklaması 14 yerine 17 okuma, her biri 1 blok bütçesi. Vuruş
  tick'inde 56'nın 17'si yoklamaya gidiyor; aradaki dokuz tick'te bütçe tam,
  o yüzden delme hızında hissedilir fark yok.

---

## v4.78 — Bütün iksir efektlerine +1 seviye

Kullanıcı: *"iksirlerin büyüleri var ya, onlara 1+ buff ekle... sana göre
güçlü sayılabileceklere ekleme, diğerlerine ekle."*

**44 satır arttı, 22 satır atlandı.** Atlananların ikisinin de somut sebebi
var — "güçlü" derken kastedilen tam olarak bunlar:

### 1. Seviyesiz efektler

`night_vision`, `fire_resistance`, `water_breathing`, `conduit_power`,
`invisibility`, `slow_falling`, `saturation` — bunların oyunda **seviyesi
yok.** Sayıyı büyütmek sadece roma rakamını değiştirir: ekranda "Ateşe
Dayanıklılık II" yazar ve oyunda hiçbir şey yapmaz. Tek etkisi kullanıcıyı
yanıltmak olurdu; deponun "sahte içerik yasak" kuralı burada da geçiyor.

### 2. Dayanıklılık 3 ve üzeri

Bedrock'ta Dayanıklılık seviye başına **%20** hasar düşürüyor ve seviye V
(amplifier 4) **tam dokunulmazlık** demek — void, açlık ve `/kill` dışında
hiçbir şey değdirmiyor.

StarOxine'in kimliği tam olarak bu; kullanıcı onu *"hasarı hiç almama"* diye
istemişti ve amplifier zaten 4'te. Grinoksin 3'ten 4'e çıksa **ikinci bir
dokunulmaz iksir** olurdu ve StarOxine'in varlık sebebi kalmazdı. Dayanıklılık
bu yüzden 3'te duruyor (%80 indirim).

### Uzmanlar da arttı — bilerek

Toplu bir +1'de en kolay kaybedilen şey uzmanlık düzeni: sadece zayıfları
büyütürsen herkes uzmanla aynı seviyeye çıkar ve iksirler birbirinin aynısı
olur. O yüzden Redoksin'in vuruşu 4 → 5, Grinoksin'in canları 4 → 5 da arttı;
**aradaki fark korundu.**

`iksir.mjs` bölüm 8 üç kuralı kilitliyor: seviyesiz efektler 0'da mı,
dokunulmazlık tek iksirde mi, uzmanlık düzeni ayakta mı. Denge sayılarının
büyüklüğünü sınamıyor — o kullanıcının kararı.

### Bir not: amplifier ≠ görünen seviye

Tablodaki sayı **amplifier**; oyunda görünen seviye bunun **bir fazlası.**
`["strength", 3]` ekranda "Kuvvet IV" yazar. Kullanıcının ekran görüntüsü
bunu birebir doğruladı.

---

## v4.80 — v4.78 geri alındı, yerine iksir başına **ikişer** yeni büyü

Kullanıcı v4.78'i denedi ve beğenmedi: *"şu andaki sürümün iksirlerini
sevmedim, yani verdiği güçleri sevmedim... eski iksirlerin büyülerini bul,
onları + kendi seçeceğin **farklı farklı** büyüler ekle."*

### İki ders, ikisi de aynı gün öğrenildi

**1. Toplu +1 aslında hiçbir şey değiştirmiyor.** Herkes aynı oranda
büyüyünce iksirler arasındaki fark aynen kalıyor, sadece roma rakamları
şişiyor. Oynanışta hissedilen şey **yeni bir yetenek**, bir basamak daha
yüksek aynı yetenek değil.

**2. Hepsine aynı yeni efekti vermek de aynı hata.** İlk düzeltmede hepsine
`jump_boost` eklenmişti; kullanıcı "farklı farklı" diyerek tam olarak bunu
işaret etti. Kaldırıldı — Firenoksin dışında (orada lav gölü aşmak için
kendi gerekçesi var).

Seviyeler v4.77'deki hâline **birebir** döndü (`git show 1ed9d9f` üzerinden,
yorumlarıyla birlikte). Üstüne her iksire **iki** yeni efekt; her iksirin
ikilisi kendine özel.

### Seçilenler

Ölçü "sayıyı büyüt" değil, **"bu iksirde eksik olan ve kimliğine uyan şey"**:

| iksir | yeni büyüler | neden |
|---|---|---|
| Nitroksin | `saturation` + `conduit_power` | koşmak açlıktan yer; hız her yerde olsun, su altında da |
| Grinoksin | `fire_resistance` + `slow_falling` | tankın iki açığı: ateş ve düşme |
| Redoksin | `resistance 1` + `fire_resistance` | dövüşüyor ama hasar indirimi **hiç** yoktu; madenciyi lav öldürür |
| Firenoksin | `health_boost 2` + `jump_boost 1` | ateş var can yok; nether'de lav gölünü aşmak |
| Kan İksiri | `resistance 1` + `slow_falling` | sert vuruyor ama hiç indirimi yok; suikastçı yüksekten sessizce iner |
| Hiperoksin | `health_boost 1` + `saturation` | "her şeyden biraz" ama ek candan hiç yoktu; 8 dakikalık iksirde açlık kesiyordu |
| StarOxine | `water_breathing` + `haste 1` | korumanın son açığı boğulmaktı; tek yapamadığı iş kazmaktı |
| Element | `slow_falling` + `strength 1` | **dördüncü element: hava** (su/ateş/toprak zaten vardı); elementin hiç vuruş gücü yoktu |

Tek tek efektler kesişebiliyor — `fire_resistance` hem tankın hem madencinin
açığı — ama **hiçbir iki iksir aynı ikiliyi almıyor**, test bunu kilitliyor.

Seviyeler uzmanlık düzenine göre seçildi; yeni gelen hiçbir şey kendi alanının
uzmanını geçmiyor:

```
can      Grinoksin 4 > StarOxine 3 > Firenoksin 2 > Hiperoksin 1
indirim  StarOxine 4 > Grinoksin 3 > ... > Redoksin/Kan 1
kazma    Redoksin 4 > Element 3 > ... > StarOxine 1
vuruş    Redoksin/Kan 4 > ... > Element 1
```

### Değişmeyen kurallar

Seviyesiz efektler (`night_vision`, `fire_resistance`, `water_breathing`,
`conduit_power`, `invisibility`, `slow_falling`, `saturation`) 0'da kalır —
sayıyı büyütmek sadece roma rakamını değiştirir, oyunda hiçbir şey yapmaz.
Dokunulmazlık (Dayanıklılık V) tek iksirde: StarOxine.

`iksir.mjs` bölüm 8 hepsini kilitliyor: seviyesiz efektler temiz mi,
dokunulmazlık tek iksirde mi, uzmanlık düzeni ayakta mı, seçilen 16 büyü
duruyor mu, iki iksir aynı ikiliyi almış mı, aynı efekt bir iksirde iki kez
yazılmış mı (ikinci kayıt birincisini sessizce ezer).

---

## v4.81 — Süreler uzadı, "yarım kalp" kuralı kalktı

Üç değişiklik, hepsi kullanıcının isteği.

### 1. Bütün iksirler 8 dakika

Yedi iksir 6000 → 9600 tick. Hiperoksin zaten oradaydı.

**Bunun bir bedeli var ve bilinçli:** Hiperoksin'in *tek* ayırt edici
özelliği süresiydi. Tasarım notu aynen şöyleydi — *"hiçbir alanda uzman
değil; farkı artık güçte değil süREDE."* O fark artık yok. Hiperoksin şu an
"her şeyden biraz, ama artık daha uzun da değil" durumunda. Kullanıcıya
bildirildi; ona yeni bir varlık sebebi vermek bekleyen iş.

### 2. Lazer 25,5 → 30 saniye

`LAZER_SURE` 510 → 600, `kol_uret.py:LAZER_ANIM_TICK` de 600. İki yerde
yazılı bir sayı; test eşitliği kilitliyor.

Bu değişiklik **sessiz bir kırılganlık** açığa çıkardı: üreteç
`animation_length`'i `round(600/20, 3)` ile hesaplıyordu → Python `30.0`
yazıyor, JavaScript `String(30)` = `"30"` arıyor. Son kare anahtarı `"30.0"`,
aranan `"30"` — tutmuyor. **25,5 saniyeyken hiç görülmemişti**, çünkü `"25.5"`
iki tarafta da aynı yazılıyor. Oyun ikisini de sayı olarak okuduğu için
oyunda sorun çıkmazdı; ama son kareyi anahtardan arayan her şey bulamazdı.
Üreteç artık tam sayıyı `int` yazıyor, test de anahtarları **sayı olarak**
karşılaştırıyor.

### 3. "Yarım kalp" tamamen kaldırıldı

v4.68'den beri lazer zırhlı bir hedefi öldürmüyor, canını 1 puana
**çekiyordu**. Kullanıcı kaldırdı: *"süreyi arttırdığımıza göre bunu tutmak
gerçekten çok zor... o yüzden tamamen öldürsün."*

Doğru karar, çünkü o kural **kendi kendini yiyordu**: ışın yarım saniyede bir
vuruyor ve artık 30 saniye sürüyor — yani hedef 60 kez "yarım kalpte
sabitleniyor" ve hiçbir zaman ölmüyordu. Kural kısa bir atışta anlamlıydı
("soydum, işini kendin bitir"); süreli ışında tersine çalışıyordu.

`cananCek()` 70 satırdan 8 satıra indi. `LAZER_BIRAKILAN_CAN` ve
`LAZER_TEPKI_HASARI` silindi; testler ikisinin de `undefined` olduğunu
kontrol ediyor ki eski dal sessizce geri sızmasın.

**Emilim silme kaldı.** O kalpler `minecraft:health`'in dışında ve zırh
indiriminden sonra 32 ek can bir vuruşu emebiliyor — iksirlerimizin hepsinde
emilim var, yani onsuz iki oyuncu birbirini lazerle vuramazdı.

### Kim kurtulur? (ölçüldü)

Bedrock zırh formülü:

```
hasar × (1 − min(20, max(zirh/5, zirh − 4×hasar/(toughness+8))) / 25)
```

500 hasar o kadar büyük ki **toughness terimi eksiye düşüyor** — full
netherite bile sadece `zirh/5 = 4` puan, yani %16 indirim veriyor:

| adım | kalan hasar |
|---|---|
| ham | 500 |
| zırh (%16) | 420 |
| Koruma, EPF tavanı 20 (%80) | 84 |
| Dayanıklılık IV (%80) | **16,8** |

Yani en iyi vanilla kurulum bile vuruş başına ~17 yiyor ve ışın yarım
saniyede bir vuruyor: 20 canlı bir oyuncu **bir saniyede** gidiyor.

**Tek kurtuluş: Dayanıklılık V = tam dokunulmazlık** — yani kendi
StarOxine'imiz. Vanilla'da hiçbir set/büyü birleşimi lazerden kurtarmıyor.

Not: hasar türü `"fire"` seçili, bu **Ateş Koruması**'nı devreye sokuyor
(EPF'de seviye başına +2, dört parça Ateş Koruması IV tek başına tavana
ulaşır). Yukarıdaki 16,8 zaten o tavana göre hesaplandı — daha kötüsü yok.

---

## v4.82 — Menzil 21 blok

`LAZER_MENZIL` ve `kol_uret.py:LAZER_ISIN_MENZIL` 17 → 21. Işın kutusu 336
birim, görünürlük kutusu 46 × 25 blok (ikisi de sayıdan türüyor).

Ölçülen sonuçlar: hedef taraması tam 21 blokta hâlâ vuruyor, 23'te vurmuyor;
delme tüneli `9 × 23 = 207` bloğa çıktı ve ışının sonuna kadar ulaşıyor.

Maliyet: hedef taraması bir küre, yarıçap büyüdükçe hacim **küpüyle** artıyor.
14 → 17 → 21 zincirinde toplam `(21/14)³ = 3,4 kat`. Yarım saniyede bir
dönüyor; kalabalık bir yerde takılma olursa ilk bakılacak yer burası.

---

## v4.83 — Asa dört sürümdür neden çalışmıyordu

Kullanıcı: *"El-Harkos'un asası var ya, o çalışmadığını öğrendim, valla 4
sürümdür görüyorum bunun çalışmadığını."*

### Zincir sağlamdı — oyuncuya hiç bağlanmamıştı

`asa.mjs`'in altı bölümü de geçiyordu ve haklıydılar: 3 vuruş → yere serme →
mezar → 10 dismont zinciri gerçekten çalışıyor. Ama tetik yolu tekti:

```
asaVurusu()  ←  botVurdu()  ←  ilkelKimligi(bot)
```

Yani tetiği **ancak beş üyeden biri** çekebiliyordu. Oysa asa yaratıldığı
günden beri (v4.49) yaratıcı menüsünde `equipment` kategorisinde duruyor:
oyuncu alabiliyor, eline takabiliyor, vurabiliyor — ve hiçbir şey olmuyordu.

Üstelik eşyanın **`minecraft:damage` bileşeni de yoktu**, yani oyuncunun
elinde vuruşu **yumruk kadardı (1 hasar)**.

Ders: *"yetenek çalışıyor mu"* ile *"yeteneğe **ulaşılabiliyor** mu"* ayrı iki
soru. Aynı ders v4.65'te de çıkmıştı — göz lazerine üç sürüm boyunca
ulaşılamıyordu.

### Düzeltme

* `asa.js:asaOyuncuKancasi()` — ikinci bir `entityHitEntity` tetiği: vuran
  oyuncuysa ve **elinde** asa varsa aynı zincir işliyor. Çantada taşımak
  yetmiyor, kullanman gerekiyor.
* `sahibeYaz()` artık vuran oyuncuysa doğrudan ona yazıyor — `botunSahibi()`
  bir oyuncu için boş döner ve bildirim sessizce düşerdi.
* Bildirim metinleri bağlama göre: gömen sensen "El-Harkos gömdü" yazmıyor.
* Asaya `minecraft:damage: 14` verildi (kullanıcı: *"normal vuruşu da 14+
  olsun"*) — **7 kalp**, elmas kılıcın iki katı. Dayanıklılık bileşeni yok:
  patron asası kullanıldıkça kırılmamalı.

### Testin bekçisi haklı çıktı — ama ters yönden

`ilkel.mjs`'te şöyle bir kural vardı: *"silahta HİÇ hasar olmasın, çünkü elde
tutulan eşyanın hasarı mobun vuruşuna eklenir ve üyenin sayısı sessizce
şişer."*

Doğrulandı — **Bedrock'ta gerçekten ekleniyor.** Yani asaya 14 vermek
El-Harkos'u dokunulmadan 26'dan 40'a fırlatırdı; tam da bu depoda v4.66'da
yaşanan "söylediğim sayı ile oyundaki sayı tutmuyor" hatasının aynısı.

Çözüm sayıyı gizlemek değil, **açıkça bölmek**:

| yer | değer |
|---|---|
| `ILKEL_BESLI` (kullanıcının gördüğü) | **28** = oyunda görülen toplam |
| varlık JSON'u `minecraft:attack` | 14 = taban |
| asa `minecraft:damage` | 14 |

`ilkel_taban_hasar()` bu çıkarmayı yapıyor; test artık `taban + silah ===
ayardaki sayı` diye kontrol ediyor, sadece JSON'a bakmıyor. Balta değişmedi
(onu taşıyan dört üyenin sayısı varlık JSON'unda ve orada kalmalı).

El-Harkos'un vuruşu böylece 13 → **14 kalp** oldu — kullanıcının istediği
"14+". Asası alınırsa tabana düşüyor; test tabanın hâlâ ciddi bir sayı
olduğunu (≥10) kontrol ediyor.

---

## v4.84 — Balta da ölü bir eşyaydı

Kullanıcı: *"ilkel baltada da aynı sorunlar… onda da aynı şey var, yani
tamamen ölü bir eşya. 16+ hasar vursun."*

Haklıydı ve baltanın asadan **bir eksiği daha** vardı:

| eksik | sonuç |
|---|---|
| `minecraft:damage` yok | oyuncunun elinde vuruşu **yumruk kadardı (1)** |
| `minecraft:digger` yok | **odun bile kesmiyordu** — balta gibi duran, ağaca vurunca yumruk kadar iş gören bir şey |

İkisi de düzeltildi: **16 hasar (8 kalp)** — netherite baltanın 1,6 katı — ve
`query.any_tag('wood')` üzerinden gerçek balta kazma hızı. Yazım Microsoft
belgelerindeki örnekle birebir; komponent 1.20.30+ gerektiriyor, bizim
`format_version` 1.21.0 karşılıyor.

Asaya kazma yeteneği **verilmedi**: o bir silah, alet değil. Baltanın
asadan (14) sert olması da bilinçli — asanın gücü sayıda değil **zincirinde**
(yere ser + mezar).

### Dört taşıyıcının sayısı kaymadı

Balta Kajaros, Miskel, Raxxan ve Okazor'un elinde. Elde tutulan silahın
hasarı mobun vuruşuna eklendiği için tabanları 16 düşürüldü:

| üye | taban | + balta | = oyunda |
|---|---|---|---|
| Okazor | 84 | 16 | **100** |
| Kajaros | 30 | 16 | **46** |
| Raxxan | 26 | 16 | **42** |
| Miskel | 12 | 16 | **28** |
| El-Harkos | 14 | 14 (asa) | **28** |

Hesap `kol_uret.py:ilkel_taban_hasar()`'da, tek yerde ve artık `SILAH_HASARI`
tablosundan geneller. `ayarlar.js:silahHasari()` aynı tablonun ikizi.

Testin bekçisi de değişti: eski kural *"silahta hiç hasar olmasın"*dı, yeni
kural daha sıkı — **silahın hasarı ayardaki tabloda yazıyor olmalı.** Tabloya
yazılmayan bir silaha hasar verilirse üyenin vuruşu sessizce şişer; korunan
şey bu. Ayrıca her üye için "silahsız da ciddi mi" (taban ≥ 10) kontrolü var.

---

## v4.85 — Okazor'un dişleri, ve tick bütçesinin yeri

Kullanıcı: *"evoker Minecraft'ta yerden tuzak çıkartıyor ve ona denk gelirsen
hasar veriyor ya, işte o yeteneği Okazor'a verelim."*

### Vanilla dizilim, vanilla varlık

Varlık kimliği Bedrock'ta `minecraft:evocation_fang` (Java'daki `evoker_fangs`
**değil**). Hasarı 6 ve **zırhtan etkilenmiyor** — sadece Koruma büyüsü
düşürüyor. Evoker'in kendi dizilimi de iki türlü ve ikisi de burada:

* hedef **yakınsa** → etrafında **halka**
* uzaksa → Okazor'dan hedefe **düz çizgi**

Kendi diş varlığımızı yazmak yerine vanilla varlığı kullanıldı: yerden çıkma
animasyonunu, sesini ve hasarını zaten taşıyor. Kendi çizim yolumuzu yazmanın
bedeli v4.28'de görülmüştü (bot üç sürüm görünmez kaldı).

### Dost ateşi gerçek bir riskti

Doğal olarak çıkan dişler illager'lara zarar vermiyor ama **script'in
çıkardığı dişler herkesi vuruyor** — seni de, botlarını da. Okazor senin
tarafında savaştığı için bu kabul edilemezdi.

Diş konulmadan önce o noktanın yakınında bir dost (sen ya da başka bir bot)
var mı diye bakılıyor; varsa o diş hiç çıkmıyor. **Okazor'un kendisi listede
değil** — ilk yazımda vardı ve halka dizilimini tamamen öldürüyordu: hedef
yakınken halka Okazor'un da çemberine giriyor, bütün noktalar eleniyordu.
Vanilla evoker de kendi halkasının içinde duruyor, dişin 6 hasarı onun 2400
canında fark etmiyor.

### Test bir mimari hata buldu: bütçe yanlış yerde sıfırlanıyormuş

Sekiz diş tek tick'te doğuruluyordu ve hiçbiri çıkmıyordu. Sebep
`main.js`'teki sıraydı:

```
if (isler.length === 0) return;
butceSifirla();          ← taramaların ALTINDA
```

Bütçe yalnızca **aktif iş varken** doluyordu; tick başındaki taramalar
(bot işleri, dişler) boş bütçeyle çalışıyordu.

Bu tuzak zaten bir kez yaşanmıştı: `_bot_defteri.js`'teki *"burada
`varlikIste()` YOK, bilerek"* notu v4.22'de tam bu yüzden yazıldı — bot hiç
doğmuyordu. O gün etrafından dolanılmıştı.

Bu sefer kök düzeltildi: **`butceSifirla()` tick'in başına alındı.** Bütçe
tick başına bir kotadır; doğru yeri tick'in başı. Artık taramalar da işler de
aynı havuzdan yiyor — zaten amacı buydu.

### Yan fayda: dişler dalga halinde çıkıyor

`TICK_VARLIK_BUTCESI = 4`, yani sekiz diş iki tick sürüyor. Sayıyı kısmak
yerine kuyruğa alındı — ve bu **vanilla'ya daha yakın**: evoker'in dişleri de
birbiri ardına, dalga halinde çıkıyor. Bütçe kısıtı burada görseli
iyileştirdi.

---

## v4.86 — Freedom Stone, Resetting Sword, taşa çevirme

Üçü de Zabri Studios BoraLo Mod'dan (Java 1.12.2) geldi. **Kodu değil,
fikri ve dokuları** aldık; her biri Bedrock'a yeniden yazıldı.

### Dismont → Freedom Stone

Kullanıcı: *"Freedom Stone bir yerden tanıdık geldi değil mi? İşte o bizim
dismont taşı."* Haklıydı — referans modun kendi taşı da tam olarak aynı işi
yapıyor: tutsağı serbest bırakıyor. Dokusu da oradan alındı.

Cevher **duruyor**, çünkü taşın oyundaki tek kaynağı o; silinirse mezardan
kimse kurtulamaz. Ama artık ayrı bir isim değil, aynı ailenin parçası:
"Freedom Stone Cevheri".

**Kimlik değişiyor:** eski dünyalarda yerleştirilmiş `pa:dismont_cevheri`
blokları ve envanterdeki `pa:dismont` eşyaları *bilinmeyen* olur.

### Resetting Sword — "admin yetkisi"

Referansın derlenmiş sınıflarından çıkan komutlar:

```
gamemode spectator / gamemode survival
fill ~5 ~5 ~5 ~-5 ~-5 ~-5 air
```

Yani kullanıcının hatırladığı "admin yetkisi" **izleyici modu**. Bedrock'a
geçerken üç şey değişti:

1. **`/fill` yok.** 1331 bloğu tek tick'te yazmak tableti dondururdu; silme
   bir *iş* oldu, tick bütçesi kadar ilerliyor.
2. **`KORUNAN_KUME` geçerli** — referansta koruma yok, kılıcı yanlış yerde
   kullanan sandıklarını kaybediyor.
3. **İzleyici modu süreli** ve **önceki modu hatırlıyor.** Referansta açan
   komut ayrı, kapatan ayrı dosyadaydı; unutursan sonsuza kadar izleyici
   kalırdın. Yaratıcı moddaki biri de survival'a düşmüyor.

### Taşa çevirme

Taş Dönüştürücü ile vurunca kurban heykel bloğuna dönüşüyor, kilitleniyor.
Referanstan üç farkla:

1. **Süre var** (30 sn) ve ikinci bir çıkış yolu var: **3 Freedom Stone.**
   Referansın en can sıkıcı huyu süresiz etkiydi.
2. **Zırha dokunmuyoruz.** Referans kurbanın zırhını çıkarıp yerine taş
   kaplaması koyuyor; oyuncunun zırhını çalmak geri alınamaz bir hata olurdu.
3. **Kilit `asa.js`'in makinesi** — ikinci bir kopya yazılmadı.

### Testler iki gerçek hata buldu

**1. Sandıklar aslında korunmuyormuş.** `KORUNAN_KUME`'nin üstündeki not
yıllardır *"bedrock, sandık, komut bloğu delinmiyor"* diyordu ama **sandık o
listede hiç yoktu.** Yani lazer duvar delerken sandıklar eşyalarıyla birlikte
gidiyordu — tam da önlemek için yazılmış olan şey. Not doğruydu, liste
eksikti. Eşya taşıyan 19 blok eklendi (sandık, fırın, huni, shulker…).

**2. Taramalar oyuncu listesine bağlıydı.** `asaTara()` v4.50'den beri
"iksir/kalp/bot var mı" bloğunun **içindeydi**: hiçbir iksir içilmemişse
sersemlik sayacı hiç işlemiyor, kilit açılmıyordu. Kılıcın izleyici modu da
aynı duvara çarptı. Dördü de kendi defterleri boşken hemen dönüyor, yani
dışarı almanın maliyeti yok.

---

## v4.87 — Silah sistemi

Kullanıcı: *"silahla alakalı olan tüm şeyleri al, bedrock'a uyumlu yap."*

Referansta **11 ateşli silah** var ve hepsinin iskeleti aynı:
`eşya + mermi + bekleme + ses + çarpma etkisi`. Farkları sadece sayılar. O
yüzden burada da **tek motor**, silahlar `ayarlar.js:SILAHLAR` tablosunda
birer satır. Yeni silah eklemek = iki tabloya birer satır, başka hiçbir yere
dokunmadan.

| silah | hasar | menzil | bekleme | mermi | özel |
|---|---|---|---|---|---|
| Bazuka | 15 kalp | 40 | 3 sn | Roket | patlama (güç 4) |
| PDW | 5 kalp | 32 | 0,2 sn | Şarjör | delici |
| Revolver | 10 kalp | 36 | 1 sn | Kurşun | — |
| Altın Revolver | 20 kalp | 48 | 1,5 sn | Altın Kurşun | delici |
| Sersemletici | 1 kalp | 16 | 5 sn | — | 6 sn kilit |
| Yerçekimi Silahı | 0 | 24 | 1,5 sn | — | hedefi çeker |

### Mermi varlığı yok, ışın taraması var

Java'da her silah uçan bir **mermi varlığı** doğuruyor. Bedrock'ta bu varlık
bütçesini yer (tick başına dört) ve her atış bir varlık demek. Bunun yerine
göz lazerinin ray yürüyüşünün aynısı: anlık, bedava, zaten çalıştığı bilinen
kod. Uçuş hissi **parçacık iziyle** veriliyor.

Tek kayıp: bazukanın roketi havada süzülmüyor, patlama doğrudan çarpma
noktasında oluyor. Sonuç aynı.

### Lazerin yerini almasın diye

Test bir denge kuralı kilitliyor: **en sert silah, lazer hasarının beşte
birinden az** olmalı; her silahın beklemesi olmalı; mermisiz silahların
beklemesi uzun olmalı. Yoksa iksir sistemi anlamsızlaşırdı.

Ayrıca ışın kendi botlarını vurmuyor, duvarın arkasındakini vurmuyor, delici
olmayan silah ilk hedefte duruyor.

### Göz lazerindeki hata burada tekrarlanmadı

v4.77'de öğrenilmişti: küre yarıçapı tam menzil olursa ışının **ucundaki**
hedefler küreye sığmıyor. Silah motoru baştan `menzil + kalınlık` yazıyor.

---

## Referans notu: `REFERANS_BORALO.md`

Kullanıcı: *"bedrock yapılabilecekler diye bir liste aç… sen yapılabilecekleri
tekrar tekrar bakma, tek bir not açacaksın o kadar."*

`addon/REFERANS_BORALO.md` açıldı. İçinde:

* modun künyesi ve md5'i (aynı jar iki kez yüklendi, ikisi de birebir aynı)
* boyut rakamları — 6174 sınıf, 2598 doku, 178 varlık, 833 eşya, 103 efekt
* **dört kova**: yapıldı / kolay / orta / zor–imkânsız
* derlenmiş sınıflardan çıkarılmış **gerçek davranışlar** (Resetting Sword'ün
  komutları, Stone Converterer'in zinciri, Fallen'ın skin komutu, Bobby Bot'un
  summon satırı, silahların iskeleti)

Artık jar'ı tekrar yüklemeye ve modu tekrar taramaya gerek yok; sıradaki iş
seçilirken o dosyaya bakılır.

---

## Aşama — O Şey ("That Thing"): altı kol, iki beden (v4.88)

Kullanıcı: *"bunu yapabilir miyiz yani 6 tane kolu var bir tane daha bedeni var,
detaylıca incele **kendi skinimize göre** detaylıca bir araştırma yap en iyisini
yapmanı istiyorum."*

Yapılabildi. Depoda **altıncı** özel varlık: `pa:o_sey`.

### Geometri hafızadan değil, bytecode'dan çıkarıldı

Kullanıcının kuralı: *"göl hafızandan yaparsan belki yanlış çıkabilir, bunu daha
önceden yaşadık."* O yüzden referans modun jar'ı açıldı,

```
net.memir.boralo.mod.entity.EntityTRMCThatThing$Modelthatthingturkishmcl
```

sınıfı `javap -c -p` ile söküldü ve **bytecode'dan** çözüldü
(`addon/jar_model_coz.py`). Java 1.12 `ModelRenderer` çağrıları:

| çağrı | anlamı |
|---|---|
| `func_78793_a(FFF)` | `setRotationPoint` |
| `ModelBox.<init>(…IIFFFIIIFZ)` | `addBox(u, v, x, y, z, w, h, d, ölçek, ayna)` |
| `func_78792_a` | `addChild` |
| `setRotationAngle(…FFF)` | kemik açısı (radyan) |

Çıkan tablo — **14 kemik, 15 kutu**, doku 64×64 yani **düz oyuncu skini**:

| kemik | pivot (Java) | kutu + boyut | uv |
|---|---|---|---|
| Head | 0, −12, 0 | −4,−8,−4 + 8×8×8 | 0,0 |
| Body | 0, 0, 0 | −4,0,−2 + 8×**6**×4 | 16,16 |
| Body | | −4,−12,−2 + 8×**12**×4 | 16,32 ← **ikinci beden** |
| RightArm | −5, 2, 0 | −3,−2,−2 + 4×12×4 | 40,16 |
| LeftArm | 5, 2, 0 | −1,−2,−2 + 4×12×4 | 32,48 |
| RightLeg | −1.9, 12, 0 | −2,−6,−2 + 4×**18**×4 | 0,16 |
| LeftLeg | 1.9, 12, 0 | −2,−6,−2 + 4×**18**×4 | 0,42 |
| Left/RightMiddleArm | ±5, −3, 0 | çocuk kemik, **Z = ∓90°** | |
| Left/RightUpperArm | ±5, −9, 0 | çocuk kemik, **Z = ∓90°** | |

Tasarımın özeti: gövde 12 değil **18** uzun (6 alt + 12 üst), bacaklar 12 değil
**18** uzun, kafa 12 birim yukarıda, dört fazladan kol ±90° döndürüldüğü için
**yanlara yatay** çıkıyor. Toplam boy 44 birim = **2,75 blok**.

### Java → Bedrock çevirisi de ölçüldü

İki motorun veri uzayı arasındaki bağ tahmin edilmedi, **vanilla insansı
modelin iki sürümü karşılaştırıldı**:

```
Java  ModelBiped.bipedRightArm : pivot(−5, 2, 0)  kutu(−3,−2,−2) → mutlak x[−8,−4] y[0,12]
Bedrock rightArm               : pivot[−5, 22, 0] origin[−8, 12, −2]
```

Yani **x aynı · z aynı · uv aynı**, tek fark `y = 24 − y`.

### Dönme işareti: iki bağımsız ölçüm

Tek belirsiz nokta Bedrock'un `rotation` işaretiydi. İkisi de ölçüldü:

1. **Tek tanık.** Elimizdeki Bedrock BoraLo paketindeki `dirt_staff.geo.json`
   (elde tutulan asa). Düz okumada asa **ayakların altına** (y ≈ −8) düşüyor,
   ters okumada **el hizasına** (y ≈ +8) oturuyor.
2. **Toplu ölçüm.** Elimizdeki bütün Bedrock paketlerindeki **1184 dönmüş küp**
   iki işaretle de döndürülüp ele olan uzaklığı ölçüldü:
   **948 küp ters okumayı, 236 küp düz okumayı** destekledi.

Sonuç kuralı: **dosyadaki `rotation` değeri, matematiksel sağ-el dönüşünün
tersi.** Kural:

```
bedrock_dosya = [ −rx_java, +ry_java, +rz_java ]
```

Z'de çift olumsuzlama olduğu için Java'daki sayı **aynen** geçiyor (−90 sol,
+90 sağ). Doğrulama: dönmüş kutunun varacağı yer ayrıca **elle de** hesaplandı,
ikisi tutuyor — kollar `x[3,15]` ve `x[−15,−3]`, yani gövdenin **dışına**.

### Doku: kendi skinimizden türetildi (ve türetilmek zorundaydı)

Model, oyuncu skininin **ikinci katman** (ceket/pantolon kaplaması) alanlarını
örnekliyor:

| ne | uv | skinimizde |
|---|---|---|
| üst beden | 16,32 | **0/384 dolu piksel** |
| sağ bacağın alt 6 satırı | y 32–37 | **0/256** |
| sol bacağın tamamı | 0,42 | **0/256** |

`skin_uret.py` ikinci katmanı **bilerek** boş bırakıyor (*"aynı renkle
doldurunca karakter şişmiş görünüyor"*). Yani doku olduğu gibi kullanılsaydı O
Şey'in **üst bedeni ve sol bacağı oyunda görünmez** olurdu — ve sebebi hiç
anlaşılmazdı.

`kol_uret.py:o_sey_dokusu()` birinci katmanı bu alanlara kopyalıyor. Hiçbir renk
elle yazılmıyor: skin değişirse doku kendiliğinden doğru kalır. Üst beden alt
bedenin aynısı oluyor — *"bir tane daha bedeni var"* tam olarak bu.

### Yürüyüş

Yatay kollar **Y ekseninde** sallanıyor, X'te değil: ±90° dönmüş bir kol X'te
sallansaydı kendi uzun ekseni etrafında döner, yani hiçbir şey olmazdı.
Referans mod da Y kullanıyor (`field_78796_g = rotateAngleY`). Test bunu
kilitliyor.

### Gövde yine `pa:bot` gövdesi

İlkel Beşli'de kurulan yolun aynısı: `botCagir` ile doğuyor, dolayısıyla defter,
çanta, teslim, takip, bekle, savaş — hepsi çalışıyor. Yeni bir defter yazılmadı.
v4.66 dersi de uygulandı: bileşen gruplarından `attack/health/movement`
siliniyor, yoksa savaşa girer girmez normal bot sayılarına düşerdi.

**Yeni kol açılmadı.** Kullanıcının kuralı: *"her şeyi kol yapma, kol israfını
önle."* Menüde tek satır.

### İlkel Beşli'ye karışmadı

O liste kullanıcının **tek tek doğruladığı** beş kişi. O Şey ayrı bir efsane:
kendi kimliği, kendi sayıları. Test `ILKEL_BESLI.size === 5` diye tutuyor.

### Test — `o_sey.mjs` (8 bölüm)

Kilitlenenler: altı kolun varlığı · dönüşün **uygulandığı** (4×12 kutu 12×4
oluyor) · kolların gövdenin **dışına** baktığı · iki bedenin üst üste olduğu ·
bacakların 18 uzun olduğu · çarpışma kutusunun model boyuyla aynı olduğu ·
**hiçbir yüzün tamamen saydam olmadığı** (PNG elle çözülüyor, dışarı bağımlılık
yok) · ayarlar.js ile varlık JSON'unun aynı şeyi söylediği · bileşen
gruplarının istatistiği ezmediği · yatay kolların Y'de sallandığı · ve
**ulaşılabilirlik** (v4.83 dersi: "çalışıyor mu" ile "ulaşılabiliyor mu" ayrı
iki soru — kayıt → import → menü satırı zincirinin tamamı sınanıyor).

### Oyunda bakılacak tek şey

`SEY_KOL_ACI` (kol_uret.py). Dört fazladan kol gövdenin **içine** bakıyorsa
işareti ters çevir, başka hiçbir yere dokunma. Ölçüm ters işareti 948'e 236
destekliyor ama bu bir olasılık, kanıt değil.

---

## Aşama — skin paketi ve 400 kalp (v4.88)

Kullanıcının iki sorusu ve bir isteği.

### "Bu yeni sürümü açtığım zaman skin otomatik olarak bana geliyor mu?"

**Hayır — ve gelemez.** Bedrock'ta davranış/kaynak paketi oyuncunun skinini
değiştiremez; script'ten skin okumanın da atamanın da yolu yok. Referans mod
bunu Java'da MorePlayerModels'in `mpm url @p <skin>` komutuyla yapıyordu;
Bedrock'ta karşılığı yok (`REFERANS_BORALO.md`, "zor ya da imkânsız" kovası).

O Şey'in skini pakette çünkü o bir **varlık dokusu** — varlık dokusu paketten
gelir. Oyuncu skini gelmez; o oyuncunun profiline ait.

Elde olan en yakın şey Bedrock'un kendi **skin paketi** türü: içeri aktarılınca
skin Giyinme Odası'na düşer, oradan tek dokunuşla seçilir. Otomatik değil ama
tek dokunuş.

`Simsek_Skin/` açıldı, `kol_uret.py` üretiyor. Biçim tahmin edilmedi,
Microsoft'un *"Skin Pack JSON Formatting and Localization Reference"*
belgesinden alındı:

```
manifest.json  modules[0].type = "skin_pack"      (ayrı UUID)
skins.json     geometry = "geometry.humanoid.custom"   (Steve, 4px kol)
               type     = "free"     ("paid" yazılırsa skin KİLİTLİ görünür)
texts/*.lang   skinpack.<serialize_name>=...
               skin.<serialize_name>.<localization_name>=...
```

Anahtar biçimi kayarsa oyunda skinin **adı yerine anahtarı** görünür —
tabletten sebebi anlaşılmayan bir hata. Test biçimin tamamını kilitliyor.

Skin **kopyalanıyor, yeniden çizilmiyor**: tek kaynak `skin_uret.py`'nin
ürettiği `UzakAkraba_skin.png`. Test iki dosyanın bayt bayt aynı olduğunu
sınıyor — iki yerde çizilse sessizce ayrışırlardı.

### "Yüklenebilir şekilde olsun, kolayca yükleyeyim"

`.mcaddon` artık **üç paketi birden** taşıyor (`$BP $RP $SK`). Tek dosyaya
dokun → mod + görünümler + skin, hepsi kurulur. Skin ayrıca tek başına da
üretiliyor (`UzakAkraba_v488.mcpack`) — sadece skini isteyen onu kurar.

### "Bu skin ekstra olarak 400 kalp eklesin"

Skin okunamadığı için **"bu skini giyince" kancası kurulamıyor**. 400 kalp bir
**düğmeye** bağlandı: menüde "Uzak Akraba: 400 kalp".

`KALP_TAVAN` 100 → **400**, ve `KALP_TOPTAN = 400` eklendi — `KALP_ADIM` (10)
ile aynı bırakılsaydı 400 kalp için menüye **40 kez** basmak gerekirdi.

Yeni bir can mekaniği yazılmadı: `kalp_ekle` ile **aynı deftere** yazıyor, yani
kalpler kalıcı (ölsen de, çıkıp girsen de, süt içsen de) ve "Kalpleri sıfırla"
ikisini birden geri alıyor. Referans modların hatası tam buradaydı:
`effect @s health_boost 100000 255` — çıkışı yoktu.

Motor sınırı: `health_boost` seviye tavanı 255 → 2 × 256 = **512 kalp**. 400
sığıyor (seviye 199). Test bunu ve "kalp sayısı çift olmalı" kuralını tutuyor.

**Bilinen bedel:** can barı ekranda satır satır sarılıyor; 410 kalpte okunamaz
hale geliyor. Bu bir hata değil, oyunun can barının sınırı — kullanıcıya
söylendi, isteği açıktı, geri dönüş tek dokunuş.

### Test — `skin_paketi.mjs` (6 bölüm)

Skin paketi biçimi · dil anahtarları · skinin kaynakla birebir aynı olması ·
400 kalbin motor sınırına uyması · ulaşılabilirlik · `.mcaddon`'ın üç paketi de
taşıması.

---

## Aşama — dönüşüm: oyuncu O Şey oluyor (v4.89)

Kullanıcı v4.88'i oyunda denedi, ekran görüntüsü gönderdi (**geometri doğru
çıktı** — altı kol dışarı bakıyor, çift beden yerinde, ölçülen dönme işareti
tuttu) ve üç şey istedi:

> *"keşke bir bot yapmasaydın… buna dönüşebiliyor olmam lazım. 2 tane skin
> yapman lazım, birincisini elleme, ikincisini elle yani that thing halim.
> Aynı geometriyi kullan fakat skin olmalıdır. 400 kalp biraz fazla olduğu
> için 200 kalbe düşürüyorum."*

### Altı kollu bir SKİN yapılamıyor — araştırıldı, uydurulmadı

**Mojang skin paketlerinde özel geometriyi kaldırdı** (kötüye kullanıldığı
için). Resmi istemcide `skins.json` yalnızca iki değeri kabul ediyor:

```
geometry.humanoid.custom      (Steve, 4 piksel kol)
geometry.humanoid.customSlim  (Alex,  3 piksel kol)
```

Dolaşan "4D skin" paketleri ya **Marketplace imzalı** ya da **yamalı istemci**
(LeviLauncher + Lib4dskin) istiyor. Script'ten de oyuncu modeli
değiştirilemiyor — öyle bir API yok.

Özel geometriyi yine de yazmak **paketin tamamını** içeri aktarılamaz hale
getirebilirdi, yani **birinci skini de** götürürdü. Kullanıcı "birincisini
elleme" dedi; yazılmadı. Test `geometry.json`'ın **olmadığını** kilitliyor.

### Bedrock'ta gerçekten çalışan yol: KILIK

```
1. oyuncu görünmez olur          (invisibility, parçacıklar kapalı)
2. yerine pa:o_sey_kilik çizilir  (aynı geometri, aynı doku)
3. her tick oyuncunun konumuna ve yaw'ına ışınlanır
```

Birinci şahısta kendini zaten görmüyorsun; **F5'e basınca** ve **diğer
oyuncular için** O Şey görünüyorsun. Yürümek, zıplamak, vurmak — hepsi hâlâ
senin bedenin; kılık sadece üstüne çiziliyor.

Kılık `pa:o_sey`'den **ayrı bir varlık** olmak zorundaydı: o birisi savaşan,
canlı, hedef alınabilen bir bot. Aynı varlığı iki işe koşmak, botun savaş
davranışlarını oyuncunun üstüne yapıştırmak olurdu. Kılık bir görüntü:
yerçekimi kapalı, çarpışma kapalı, itilemez, hiç hasar almaz, **hiçbir yapay
zekâ hedefi yok**, yumurtası yok.

### Üç sinsi hata, üçü de testte

| hata | oyunda nasıl görünürdü |
|---|---|
| görünmezlik tazelenmezse | oyuncu bir anda **iki bedenli** görünür (efekt ölünce, süre dolunca ve **süt içince** siliniyor — kalp sistemindeki dersin aynısı) |
| kılık silinmezse | ortada duran bir O Şey kalır (oyuncu çıkınca, ölünce, dünya yeniden yüklenince) |
| kılık itilebilirse | oyuncuyla birbirlerini iteler, ikisi de titrer |

Ayrıca kılık kaybolursa (chunk boşaldı, biri `/kill` attı) dönüşüm **kendini
bitiriyor** — görünmez ve bedensiz kalmak en kötü sonuç olurdu.

**Bilinen sınır:** Bedrock'ta görünmez bir oyuncunun **elindeki eşya ve zırhı**
yine çizilir. Elin doluyken havada süzülen bir kılıç görünür. Oyunun davranışı;
menü mesajında yazıyor.

### İki skin

Skin paketinde artık iki skin var. **Birincisi ellenmedi** (test bunu ayrıca
tutuyor). İkincisi "Uzak Akraba · O Şey Formu" ve dokusu **varlığınkiyle birebir
aynı dosya** — dönüşüp çıkınca "aynı karakter" hissi bozulmasın diye. Test iki
dosyayı bayt bayt karşılaştırıyor.

Yani: kılık altı kollu gerçek dönüşüm; ikinci skin de sunucularda / kılık
kapalıyken aynı karakterin düz hâli.

### 400 → 200 kalp

Kullanıcı denedi ve indirdi. `KALP_TAVAN` ve `KALP_TOPTAN` ikisi de **200**;
test ikisinin **aynı** kalmasını tutuyor (ayrışırlarsa düğme tavana ulaştıramaz
ve sebebi görünmez olur). `health_boost` seviyesi 99, motor sınırının (255)
çok altında.

### Test — `donusum.mjs` (8 bölüm)

Görünmezlik + kılık doğuyor mu · her tick hizalanıyor mu · yaw veriliyor ama
pitch verilmiyor mu (verilseydi gövde öne eğilirdi) · görünmezlik tazeleniyor mu ·
aynı satır geri döndürüyor mu · kılık ortada kalıyor mu (çıkış, silinme, yeniden
yükleme) · kılık gerçekten zararsız mı · O Şey ile **aynı geometri ve aynı doku**
mu · ve ulaşılabilirlik.

Harness'a iki şey eklendi: sahte oyuncuya `getRotation()`/`removeEffect()`,
sahte varlığın `teleport()`'una **rotation** kaydı.

---

## Aşama — gerçek oyuncu modeli: yöntem bulundu (v4.90)

Kullanıcı v4.89'un kılık çözümüne razı olmadı ve haklıydı:

> *"ama kanka bunu yapıyorlar mobilde nasıl yapıyorlar… bir tane mod
> yüklemiştim sen orada var demiştin, onu yapacağız, kararlıyım. Elimizden
> gelen tüm yolları deneyeceğiz."*

**Yöntem var, ve kanıtı kullanıcının kendi yüklediği modların içindeydi.**

### Yöntem: `player.entity.json`'u ezmek

Skin paketi değil — **oyuncunun istemci tanımı**. Dört ayrı referans pakette
aynı üçlü kalıp bulundu:

| paket | ne ekliyor |
|---|---|
| `ses/Boralo Mod V2` | `geometry.sp_m_bobby_gun` |
| `boralo_canli/YeniBoraLoV3_RP` | `geometry.elharkos`, `geometry.dirt_staff` |
| `yeni_modlar/GuneyLo_Nitroxin` | üç ayrı lazer geometrisi |
| `yeni_modlar/DistortedB` | aynısı |

Kalıp:

```jsonc
// 1. ek geometri
"geometry": { "default": "geometry.humanoid.custom", "elharkos": "geometry.elharkos" }

// 2. tetik — pre_animation
"variable.elharkos = query.get_equipped_item_name('main_hand') == 'elharkos';"

// 3. çizim
"render_controllers": [ … , { "controller.render.elharkos": "variable.elharkos" } ]
```

Bunlar **resmî istemcide, tablette çalışıyor** — kullanıcı bu paketleri kendi
cihazında çalıştırdı. Yani "mobilde nasıl yapıyorlar" sorusunun cevabı bu.

### Bizim farkımız: bir adım daha gerekiyordu

Referans paketler oyuncuya **bir şey ekliyor** (asa, silah). Biz **gövdeyi
değiştiriyoruz**, dolayısıyla vanilla üçüncü şahıs denetleyicisini
**kapatmak** zorundayız:

```
"controller.render.player.third_person": "… && !variable.o_sey"
```

Bu satır olmadan oyuncunun kendi bedeni O Şey'in içinde kalırdı — "iki
bedenli" görünürdün ve sebebi tabletten anlaşılmazdı. Test bunu ayrıca
tutuyor: **üçüncü şahıs denetleyicilerinin hepsi** kapatılmış olmalı (izleyici
varyantı dâhil).

Birinci şahıs **ellenmedi**: kendi kolunu görmeye devam etmelisin.

### Ad alanı tuzağı

`query.get_equipped_item_name` **ad alanını atıyor** — belgede yazıyor ve
referans paketler de öyle kullanıyor (`'elharkos'`, `'m_bobby_gun'`,
`'dirt_staff'`). Eşya `pa:o_sey_maskesi` ama molang `o_sey_maskesi` görüyor.
`'pa:'` yazılsaydı koşul **hiç tutmazdı** ve oyunda "maskeyi aldım ama bir şey
olmuyor" derdin. Test bunu kilitliyor.

### Taban dosya elle yazılmadı

`player.entity.json` içinde ~70 satır vanilla molang ve ~70 animasyon adı var;
biri kaysa oyuncu çizimi bozulur. Taban referans paketten alındı, **onların
kendi ekleri temizlendi** (`oyuncu_modeli_taban/`), üreteç sadece dört şey
ekliyor. Test referans eklerinin sızmadığını da sınıyor — sızsaydı bizde
olmayan dokuları arardı.

### Ayrı paket — bilinçli

`Simsek_Oyuncu_Modeli` **ayrı bir kaynak paketi**. İki sebep:

1. `player.entity.json`'u ezen **iki paket aynı anda çalışamaz**; üstteki
   kazanır. Kullanıcı referans modlardan birini de açarsa biri diğerini
   bastırır — ayrı paket olunca hangisinin kapanacağı tek dokunuşla seçilir.
2. Dosya oyunun sürümüne bağlı. Bozarsa yalnız bu paket kapatılır, modun geri
   kalanı çalışmaya devam eder.

Paket **kendi kendine yetiyor**: geometri, doku ve animasyon içinde de var
(ikisi de üretiliyor, ayrışamazlar — test bayt bayt karşılaştırıyor).

### Yürüyüş bedava geldi

Vanilla oyuncu animasyonları `head/body/rightArm/leftArm/rightLeg/leftLeg`
kemiklerini **adıyla** sürüyor. Modelimiz o adları kullandığı için yürüyüş,
saldırı, eğilme hepsi kendiliğinden çalışıyor. Yatay dört kol vanilla'da
olmadığı için onlara kendi animasyonumuz bağlandı, `variable.o_sey` ile
kapılı.

### Tetik: maske

`pa:o_sey_maskesi` — bir silah değil, bir **anahtar**: hasarı yok,
dayanıklılığı yok. `allow_off_hand` açık, yani **yan ele** koyabilirsin ve ana
elin boş kalır. Molang iki yuvayı da sınıyor. İkonu uydurma değil: O Şey
dokusunun **kendi yüzü** (uv 8,8–15,15) büyütülüyor, skin değişirse ikon da
değişir.

### Eski yol silinmedi

v4.89'un **kılığı duruyor**. Bu paket çakışırsa ya da oyunun sürümü tutmazsa
geri dönülecek yol o. Kullanıcı "elimizden gelen tüm yolları deneyeceğiz"
dedi; iki yol da elde.

### Denenen ve elenen yollar

| yol | neden olmadı |
|---|---|
| **Skin paketine özel geometri** | Mojang kaldırdı; `skins.json` sadece `humanoid.custom`/`customSlim` kabul ediyor. Yazmak paketin tamamını içeri aktarılamaz hale getirip **birinci skini de** götürebilirdi |
| **Script'ten oyuncu modeli** | `@minecraft/server`'da öyle bir API yok |
| **Attachable ile gövde** | Oyuncunun kendi bedeni içeride kalıyor; z-fighting (kollar tam aynı yerde) |
| **Kılık varlığı** (v4.89) | Çalışıyor ama görünmezlik gerektiriyor, elindeki eşya havada süzülüyor — **yedek olarak duruyor** |
| **`player.entity.json` ezmek** | ✅ **bu** |

### Test — `oyuncu_modeli.mjs` (8 bölüm)

Taban vanilla mı · ek geometri/doku bağlı mı ve pakette mi · tetik ad alansız
mı ve iki yuvayı da sınıyor mu · **üçüncü şahıs denetleyicilerinin hepsi**
kapatılmış mı, birinci şahıs ellenmemiş mi · dört kol animasyonda mı ve vanilla
kemik adları korunmuş mu · maske eşyası doğru mu (atlas kaydı + temizlik
listesi dâhil) · paket ayrı ve UUID'ler benzersiz mi · eski yol duruyor mu.

---

## Aşama — Zırh Yükseltmesi: Ionstrike / Max Steel (v4.91)

Kullanıcı yeni bir jar yükledi:

> *"bu modda bazı şeylerini alacağız alınabilir olan şeylerini ve ekstra kostüm
> olarak takılabilir şekilde yani **zırh olarak takılabilir** bu şekilde
> ayarlayacağız… adı şu olsun **zırh yükseltmesi** olsun."*

### Kaynak: bu sefer bytecode çözmek gerekmedi

`mod.jar` = **`ionstrike` v1.0.0** (Bionic), bir **Palladium** eklentisi ve
yükleyicisi **`lowcodefml`** — yani **derlenmiş sınıf yok, her şey JSON**.
BoraLo'da `javap` ile bytecode çözmek gerekmişti; burada sayılar doğrudan
`data/ionstrike/palladium/powers/*.json` içinde yazılı.

Konusu **Max Steel**: tek takım, birçok mod. Bizde de öyle kuruldu.

Tam taşınabilirlik listesi ayrı dosyada: **`REFERANS_IONSTRIKE.md`** (BoraLo
notuyla aynı düzen — jar bir daha yüklenmesin diye).

### Dört giyilebilir parça

`pa:zirh_bas` · `pa:zirh_govde` · `pa:zirh_bacak` · `pa:zirh_ayak`

Zırh puanı **uydurulmadı**: `base_mode` `generic.armor +20` veriyor ve vanilla
netherite takımı da tam 20 puan — yani referansın tabanı netherite seviyesi.
Dağılım netherite ile aynı: **3 / 8 / 6 / 3**. Dayanıklılık yok (patron
silahlarındaki karar: bir yükseltme kullandıkça kırılmamalı).

Görünüm modun kendi `ionstrike_new.png` dosyası — **64×64 oyuncu skini
düzeninde**, yani bizim modellerimizin kullandığı düzenin aynısı,
dönüştürmeye gerek kalmadı.

Çizim yolu **göz sistemimizle birebir aynı**: `controller.render.armor` + tek
doku. Özel render controller'a girilmedi — v4.28'de tam o denendi ve bot
görünmez oldu.

Kemik adları **vanilla oyuncununkiyle aynı** (`head`, `body`, `rightArm`…);
attachable oyuncunun kemiklerine adıyla yapışıyor, ad kayarsa parça havada
durur. Test bunu tutuyor.

**Bot UV'si ölçüldü, tahmin edilmedi:** 4×12×4 bir bacağın yan yüzleri `v+4`
satırından başlar ve 12 satır sürer (sağ bacak 20–31). Alt 6 satır 26–31. 4×6×4
bir kutunun bandı 4+6=10 satır, yani `uv (0,22)` yazınca yan yüzleri tam
26–31'e oturuyor.

### Dokuz mod — sayılar modun kendi JSON'undan

| bizim mod | kaynak | referansın sayısı |
|---|---|---|
| Temel | `base_mode` | armor +20 · toughness +15 · fall +10 |
| Güç | `strength_mode` | **attack_damage +15** · armor +30 |
| Hız | `speed_mode` | movement +1 · attack_speed +5 · destroy +5 |
| Uçuş | `flight_mode` | space_breath · 3× bağışıklık |
| Gizlilik | `stealth_mode` | invisibility · armor +20 |
| Isı | `heat_mode` | armor +25 · ışın 20 · ateş bağışıklığı |
| Dalış | `scuba_mode` | swim_speed +5 |
| Keşif | `recon_mode` | entity_glow · vibrate |
| Titan | `titan_mode` | armor +80 · toughness +75 · **attack +80** |

### İki motor aynı şeyi söylemiyor — çeviri açıkça yazılı

Referans Java'da **attribute** veriyor; Bedrock'ta oyuncuya script'ten
attribute verilemiyor, elde **efekt** var. Her satırın karşılığı
`ayarlar.js: ZIRH_MODLAR` içinde yazılı:

```
Güç I = +3 hasar          ->  +15 = Güç V        (BİREBİR)
                          ->  +80 = Güç XXVII    (+81, en yakın)
Direnç %20/seviye         ->  zırh+tokluk Bedrock formülünde zaten
                              %80'de tavan yapıyor -> Direnç IV
movement +1               ->  oyuncunun taban hızının 11 KATI. Bedrock'ta
                              oynanamaz hale gelir; niyet ("çok hızlı")
                              Hız V ile karşılandı — TEK yaklaşık satır
armor_toughness           ->  Bedrock'ta özel eşyaya verilemiyor,
                              Direnç ile karşılandı
```

Bu bir *dengeleme* değil, bir **çeviri** — ve nerede birebir tutmadığı da
yazılı.

### Test sayıları jar'ın kendisiyle karşılaştırıyor

`zirh.mjs`'in 6. bölümü **jar diskteyse** `powers/*.json`'u açıp okuyor:
`base_mode` gerçekten +20 mi, `strength_mode` gerçekten +15 mi, `titan_mode`
gerçekten +80 mi, ve **her modun kaynak dosyası modun içinde var mı**. Yani
"hafızadan yazdım" ihtimali sınanabilir bir şeye dönüştü.

Ayrıca: yarım takım mod vermiyor ama zırh puanı yine geliyor · yanlış yuvadaki
parça sayılmıyor · efekt parçacıkları kapalı (dokuz efekt açıkken oyuncu
yürüyen bir parçacık bulutuna dönüyordu) · efekt süresi taramadan uzun · mod
seçimi dünya özelliğine yazılıyor ve yeniden yüklenince okunuyor · hiçbir mod
Direnç V (=%100 bağışıklık) vermiyor.

**131 kontrol, hepsi geçiyor.**

### Beşinci kez aynı tuzak

`zirh_suit.png` `textures/entity/` altında ve üretecin temizlik adımı listede
olmayan her şeyi siliyor. İlk üretimde **doku kopyalandı ve aynı koşuda
silindi** — oyunda zırh mor-siyah çıkardı. `beklenen.add(ZIRH_DOKU)` eklendi;
test artık bu satırın varlığını da tutuyor.

### Yeni kol açılmadı

Kullanıcının kuralı: *"her şeyi kol yapma, kol israfını önle."* Menüde tek
satır: **"⛨ Zırh Yükseltmesi (mod)"**.

---

## Aşama — Ben 10: dört yaratık (v4.92)

Kullanıcı AlienEvo'yu yükledi:

> *"ben 10 modu bu işte. **Elmas kafayı, dört kolu, yüzen çeneyi ve Ateş
> topunu** ekle sadece."*

Dördü de modda **türlerinin** adıyla duruyor — Ben 10'un kanon adlandırması:

| istenen | Ben 10'daki adı | türü |
|---|---|---|
| Elmas Kafa | Diamondhead | **Petrosapien** |
| Dört Kol | Four Arms | **Tetramand** |
| Yüzen Çene | Ripjaws | **Piscciss Volann** |
| Ateş Topu | Heatblast | **Pyronite** |

Tam liste: **`REFERANS_BEN10.md`**.

### Bu modun sürprizi: modeller zaten Bedrock biçiminde

Mod **GeckoLib** kullanıyor, GeckoLib de Bedrock'un `.geo.json` biçimini
kullanıyor. Yani:

* BoraLo'da → bytecode çözmek gerekti
* Ionstrike'ta → sayılar JSON'daydı ama model yoktu
* **AlienEvo'da → hem sayılar hem modeller hazır**

Küpler, uv'ler, dönüşler, şişirmeler **hiç ellenmedi**.

### Tek değişiklik: kemik adları

Modun bütün modelleri altı kök kemikten sarkıyor (Palladium'un oyuncu
parçalarına bağlama kuralı):

```
armorHead · armorBody · armorLeftArm · armorRightArm · armorLeftLeg · armorRightLeg
                              ↓
head · body · leftArm · rightArm · leftLeg · rightLeg
```

Bunlar Bedrock'ta oyuncunun **kendi** kemik adları — Zırh Yükseltmesi'ndeki
numaranın aynısı. Altısını yeniden adlandırınca bütün ağaç (66 kemiğe kadar)
vanilla oyuncu animasyonlarıyla sürülüyor: yürüyüş, kol sallama, eğilme
**bedava** geliyor.

### İki sinsi hata — ikisi de üretim sırasında yakalandı

**1. Kemik adı çakışması.** Ateş Topu ve Yüzen Çene'de zaten `head` adında bir
kemik **var**. `armorHead`'i doğrudan `head` yapmak ikisini çarpıştırıyordu ve
dedupe **dolu olanı** düşürüyordu — yani yaratığın kafası kayboluyordu.
Üreteç uyarı bastı (`ben_ates içinde yinelenen DOLU kemik: head`), çözüm:
çakışan kemik önce `head_ic`'e alınıyor, çocukları da ona bağlanıyor.

**2. Kök kemik yinelenmesi.** Dört Kol'un **fazladan iki kolu ayrı bir
dosyada** (`tetramand_arms_default`) ve o dosyada kök kemikler **boş**. Naif
birleştirme "yinelenen kemik" üretirdi. Çözüm: boş yinelenen kök atlanıyor,
dolu olanı atlarsa uyarı basılıyor.

Sonuç ölçüldü: **küp sayısı kaynakla birebir** (62 / 53 / 44 / 51), altı kök
kemik yerinde, yetim kemik yok, başıboş kök yok.

### Bir yanlış alarm

Test önce "hiçbir kemik `armor` ile başlamasın" diyordu ve Ateş Topu'ndaki
`armorBodyHat`'e takıldı. Baktım: o kemik `armorBody`'nin **çocuğu** ve çıktıda
doğru şekilde `body`'ye bağlanmış — yani oyuncunun gövde kemiği onu da sürüyor.
Sorun testin kuralındaydı. Kural daraltıldı: yalnız **altı Palladium kök adı**
kalmamalı; ayrıca "küpü olan başıboş kök kemik" denetimi eklendi (asıl tehlike
oydu).

### Dokular

Mod dokuyu katmanlara bölmüş (`skin` / `uniform` / `glow`). Ölçüldü: `uniform`
ve `glow` neredeyse boş (0/16384 ve 2/16384), `skin` ana doku. Tek istisna
**Ateş Topu**: alevi `glow` katmanında ve mod sekiz kareyi sırayla oynatıyor.
Bedrock'ta tek doku kullanılabildiği için ilk kare tabana bindirildi — alevsiz
bırakmak karakteri "sönmüş" gösterirdi.

### Nasıl dönüşülüyor

Eşyayı **eline ya da yan eline al** — o yaratık oluyorsun. Görünüş v4.90'ın
makinesinden (`player.entity.json` + `get_equipped_item_name`), güçler
`ben10.js`'ten.

Güç ve görünüş **aynı koşula** bağlı (elindeki eşya), bilerek: molang yalnız
`main_hand`/`off_hand` okuyabildiği için görünüş zaten oraya bağlı. Güç başka
bir şeye bağlansaydı "yaratık gibi görünüyorum ama gücüm yok" olurdu.

### `variable.donusuk`

Artık **beş biçim** var (O Şey + dört yaratık). Vanilla gövdeyi kapatan koşul
tek değişkene toplandı:

```
variable.donusuk = variable.o_sey || variable.ben_elmas || ... ;
"controller.render.player.third_person": "… && !variable.donusuk"
```

Test bu değişkenin **her biçimi saydığını** ayrıca tutuyor — biri unutulursa o
yaratığa dönüşünce kendi bedenin içinde kalır ve sebebi görünmez.

### Güç sayıları jar'la karşılaştırılıyor

`ben10.mjs` (163 kontrol) modun kendi JSON'unu açıp okuyor. İki tanesi
**birebir** tuttu:

```
Petrosapien max_health +20  ->  Can Artışı V   (+20)  ✓
Tetramand   max_health +40  ->  Can Artışı X   (+40)  ✓
```

Taşınamayanlar açıkça yazılı: `knockback_resistance +255`, `freeze_immunity`,
`step_height`, `entity_reach` — Bedrock'ta karşılığı yok, uydurulmadı.

---

## Aşama — Max Steel dönüşümü: modun kendi takımları (v4.94)

Kullanıcı v4.91'i oynadı ve eksiği buldu:

> *"Max steel modlarda ayrı bir **dönüşüm** şeyi olması lazım, onun bir
> derinine insene. Zırhı alıyorum tamam mı, dönüşüm aynı kalıyor, zırhla
> beraber **tamamen aynı kalıyorum**. Ama ben modun incelemesini izlediğim
> için biliyorum."*

**Haklıydı.** v4.91'de zırh puan ve güç veriyordu ama görünüş tek bir takımdı;
referansta ise **her modun kendi takımı** var.

### Zincir çözüldü

```
powers/<mod>.json               -> abilities[].render_layer
palladium/render_layers/*.json  -> geo + doku
```

Dokuz modun dokuzunun da modeli ve dokusu çıkarıldı — tam tablo
`kaynak_doku/NEREDEN.md`'de. Modellerin hepsi aynı altı `armorX` kemiğinden
sarkıyor, yani **Ben 10 dönüştürücüsünün aynısı çalıştı**. Isı ve HidroIsı
modelleri fazladan bir `group` sarmalayıcı kökten sarkıyordu; o da atılanlar
listesine eklendi.

### Zırh Yükseltmesi'ne dokunulmadı

Kullanıcının sözü: *"tamamen hiçbir şeyin değiştirmeden."* Zırh parçaları,
20 puanı, etiketleri, menüsü **aynen duruyor** — test bunu ayrıca tutuyor
(`zirh puanı değişmedi (20)`, `mod sayısı değişmedi (9)`).

Dönüşüm **ayrı bir eşya**: her mod için bir **Çekirdek**. Eline (ya da yan
eline) al → o modun takımına dönüşürsün **ve** o modun güçleri gelir. Zırhı
da giyersen zırh puanı üstüne biner; ikisi çakışmıyor.

Çekirdek varken **tam takım şartı aranmıyor** — dönüşümün kendisi zaten
takımı giymiş olmak demek. Ve elindeki çekirdek **menüdeki seçimi eziyor**:
görünüşün ne ise gücün de o olmalı.

### Neden "elinde"

Görünüşü süren molang sorgusu (`get_equipped_item_name`) yalnız
`main_hand`/`off_hand` okuyabiliyor, zırh yuvalarını okuyamıyor. Güç de aynı
koşula bağlandı — yoksa *"takım gibi görünüyorum ama gücüm yok"* olurdu. Ben
10'da verilen kararın aynısı.

### Dönüşüm çakması

Referansta `transform_flash` bir `palladium:lightning_sparks` katmanı: **20
kıvılcım, kalınlık 4, çekirdek rengi `#1AE2F0`** (camgöbeği). Bedrock
karşılığı `minecraft:electric_spark_particle` — bakır kıvılcımı, aynı
camgöbeği aile. Ayak/gövde/kafa hizasında **üç noktada** patlıyor; tek nokta
gövdenin içinde kaybolup görünmüyordu.

### Yanlış alarm — hata testteydi

Test "çekirdeği elime aldım ama görmüyor" dedi. Baktım: sahte dünyanın zırh
iskeleti **yalnız zırh yuvalarını** taklit ediyordu, `Mainhand`/`Offhand`
her zaman boş dönüyordu. Kod doğruydu, **harness eksikti**. El yuvaları da
eklendi.

### Test

`zirh.mjs` 263 kontrole çıktı. 8. bölüm dokuz modun her biri için: kendi
modeli ve dokusu var mı · oyuncu modeline bağlı mı · tetiği ve denetleyicisi
var mı · altı vanilla kemik yerinde mi · `group` sarmalayıcısı atılmış mı ·
başıboş kök kemik var mı. Ayrıca **en az yedi ayrı görünüş** olduğunu sınıyor
— hepsi aynı dokuyu kullansaydı şikâyet sürerdi. (Titan referansta taban
takımı yeniden kullanıyor; o bilinçli.)

---

## Bekleyen işler

Sıradaki aşamalarda yapılacaklar, henüz **yapılmadı**:

1. **Uyumluluk.** `manifest.json` içinde `@minecraft/server` `"2.0.0"`
   isteniyor ama `min_engine_version` `[1, 21, 0]`. 2.0.0 stable API'si
   bundan çok daha yeni bir sürümle geldi. Doğru değeri yazmak için oyunun
   tablet üzerindeki sürümünün bilinmesi gerekiyor.
2. **Yeni özellikler.** Toprak topu için "blokları düşürerek kır" modu,
   yetenek başına ayrı bekleme süresi, `@minecraft/server-ui` seçim menüsü.
5. **TNT yükü.** 30 TNT tabletteki en ağır kalem ve bu script
   optimizasyonuyla çözülmüyor — sayı/oynanış kararı gerekiyor.
6. **Kalan yetenekler.** Mermi varlığı (`pa:ucur123_bullet` benzeri),
   `@minecraft/server-ui` seçim menüsü, yetenek başına ayrı bekleme süresi.
7. **Kol dokuları.** 7 kolun **2'si** gerçek çizim (Toprak ve Buz Kol);
   kalan 5'i hâlâ üretilmiş yer tutucu — rengi farklı ama çizim değil.
   Yenisini eklemek: dosyayı gönder, `kol_uret.py:KOL_SKIN` tablosuna bir
   satır ekle, üreteci çalıştır.
8. **Oyunda denenmedi.** Attachable'ın gerçekten doğru çizildiği ve
   `scriptevent` köprüsünün tablette çalıştığı henüz görülmedi.
