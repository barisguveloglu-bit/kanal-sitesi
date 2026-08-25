# Kaynak dokular

Bu klasördeki PNG'ler **üretilmiyor**, elle konuldu. `kol_uret.py`
üretilmiş yer tutucu yerine bunları kopyalıyor (`IKSIR_DOKU` tablosu).
Dosya yoksa üretilen doku kullanılır — paket yine de çalışır.

| dosya | nereden |
|---|---|
| `iksir_staroxine.png` | `best StarOxine mod` kaynak paketi → `textures/items/pamobile/dy_staroxine.png` (32×32, olduğu gibi) |
| `iksir_element.png` | `Element İksiri modu V2` kaynak paketi → `textures/items/pamobile/pa_element.png` (498×501 çizim, 32×32'ye küçültüldü) |

Element dosyası küçültülürken saydam olmayan kutuya kırpıldı, kareye
yaslandı, LANCZOS ile 32×32'ye indirildi ve yarı saydam kenar pikselleri
temizlendi (alfa < 110 → tamamen saydam, değilse tamamen opak). Minecraft
eşya ikonlarında yarı saydam kenar kirli görünüyor.

## Ölçülen renkler

Aşağıdakiler bu dosyalardan piksel sayarak çıkarıldı, tahmin değil.
`kol_uret.py` içindeki `IKSIRLER` ve `ayarlar.js` içindeki `KADEMELER.renk`
bu sayılara dayanıyor.

| ne | renk |
|---|---|
| StarOxine sıvı | `(255, 223, 76)` altın, koyu tonu `(206, 155, 0)` |
| StarOxine göz | `(255, 245, 0)` — referansın göz dokusundan |
| Element buz gözü | `(56, 225, 255)` |
| Element ateş gözü | `(255, 178, 0)` |
| Element buz lazeri | `(0, 255, 243)` |
| Element ateş lazeri | `(255, 98, 0)` |

Referansın göz dokusu 16×16 ikonda x=4..11, y=9..10 karesinde duruyor;
bizim göz kaplamamız 64×64 skin üzerinde `GOZ_SATIR`/`GOZ_SUTUNLAR`
ile çiziliyor. İki düzen farklı, o yüzden göz dokusu kopyalanmadı —
sadece **renkleri** alındı.

---

# Referans modların göz **kodu** (v4.64)

Kullanıcı: *"bu modda yapılan gözler gibi yani kullanılan kodlar gibi
gözler yapmanı istiyorum aynı şekilde ki eksik kalmasın."*

İki referans modun göz dosyaları da açıldı. İkisi de **aynı fikri**
kuruyor, farklı yollardan:

| | best StarOxine mod | Element İksiri modu V2 |
|---|---|---|
| geometri | tam oyuncu iskeleti, `head` kübü `origin [-4,24,-4.2]`, **inflate yok** | tek düz levha `size [6,4,0]`, `inflate 1` |
| `texture_width/height` | 64 / 64 | 6 / 5 |
| doku dosyası | 1920×1920 (düzenin **30 katı**) | 422×203 |
| malzeme | `entity_alphablend` | `armor` |
| `enchanted` dokusu | `enchanted_actor_glint` | `enchanted_actor_glint` |
| `parent_setup` | `variable.helmet_layer_visible = 0.0;` | aynı |
| render controller | `controller.render.armor` | aynı |
| ikinci attachable | `*.player.json` + `animation.armor.helmet.offset` | aynı |

## Ortak fikir — asıl alınan şey

Çizimleri piksel piksel çözülünce ikisinin de aynı şeyi yaptığı görüldü:

```
.##..##.    <- kopuk kıvılcımlar
###.###.    <- yükselen saçaklar
###.####    <- DOLU ÇEKİRDEK
.#...#..    <- alta sızan ışık
```

**Göz = dolu çekirdek + üstünden yükselen saçak + yumuşak hale.**
Bizde v4.63'e kadar sadece "dolu çekirdek" vardı (göz başına iki
piksel). Eksik olan buydu.

## Alınanlar

- **`inflate` yerine 0.2 öne kaydırma** (`origin z = -4.2`). Inflate
  kutuyu merkezden dışarı geriyor, dokuyu da geriyor. Düz iki piksellik
  gözde görünmüyordu; haleli gözde doğrudan bozulma olarak çıkıyor.
- **`entity_alphablend` malzemesi.** `armor` alpha *test* yapıyor: ara
  tonlar kesilip atılıyor, yani hale hiç çizilmiyor — hata da vermeden.
  Element modu `armor` kullanıyor ama dokusunda ara ton yok, farkı
  görmemiş.
- **`enchanted_actor_glint`.** Bu bir eşya değil, giyilen bir şey.
- **Yüksek çözünürlüklü doku.** Saçak ve hale 64×64'te çizilemez.
- **İki gözlü envanter ikonu** (`dy_staroxine_goz.png` düzeni: iki 3×2
  blok, x=4..6 ve x=9..11, y=9..10).

## Bilerek ALINMAYANLAR

- **Gözün yeri.** Referansın gözü kendi skinine göre 3 satır aşağıda.
  Bizim `GOZ_SATIR`/`GOZ_SUTUNLAR` bizim skinimize göre ölçüldü —
  kopyalasak göz yanağa kayardı (v4.18'de tam bu hata yaşandı).
- **30 kat çözünürlük.** Tek doku 1920×1920 = 15 MB ekran kartı belleği.
  Bizde 16 göz dokusu var; 30 kat 240 MB eder. 8 kat seçildi (16 MB).
  `GOZ_OLCEK` tek sayı: 4 yapılırsa 4 MB'a iner.
- **`*.player.json` ikinci attachable.** İkisi de gönderiyor, ama
  bizimki zaten çalışıyor ve ikinci bir attachable'ın aynı gözü iki kez
  çizme riski var. Çalışan bir şeyi tahminle değiştirmedik.
- **Düz levha geometrisi** (Element modu). Yandan bakınca kayboluyor.

---

# `ascii_sga.png` — Standard Galactic Alphabet (v4.71)

Minecraft'ın **büyü masasında** kullandığı alfabe. Tom Hall'ın 1990'daki
Commander Keen oyunları için yarattığı harfler; Mojang Beta 1.9'da oyuna
koymuş. Bu dosya oyunun **kendi font atlası** — 128×128, 16×16 hücre,
her harf 8×8 piksel, ASCII yerleşimi (`A` = 65 → satır 4, sütun 1).

Kaynak: `InventivetalentDev/minecraft-assets`, 1.16.5,
`assets/minecraft/textures/font/ascii_sga.png`

**Neden indirildi:** harfleri hatırdan çizmek şifreyi çözülemez hâle
getirirdi. İnternetteki SGA tablosuyla oynayan biri bizim uydurma
harflerimizi tanıyamazdı. Bu dosya oyunun kendisinden geldiği için
yazıt gerçekten çözülebilir.

`kol_uret.py` bu atlastan `scripts/yetenekler/_sga.js` dosyasını
üretiyor — 26 harfin 8×8 bit haritası. Elle yazılmıyor.


---

## v4.86 — Zabri Studios BoraLo Mod'dan alınanlar

Kaynak: `ZabriStudiosv2.21.12.2_2_1.jar` (modid `boralo_mod`, v2.1.0,
Minecraft **Java** 1.12.2 Forge, MemirZabri Studios). Kullanıcı yükledi.

Java modu — **kodu Bedrock'ta çalışmaz.** Alınan şeyler yalnızca dokular ve
mekanik fikirler; her biri Bedrock'a yeniden yazıldı.

| dosya | modun içindeki yolu | nerede kullanılıyor |
|---|---|---|
| `freedom_stone.png` | `textures/items/freedomstone.png` | Freedom Stone ikonu |
| `resetting_sword.png` | `textures/blocks/red_key.png` | Resetting Sword ikonu |
| `tas_donusturucu.png` | `textures/items/memirzabristoneconverter.png` | Taş Dönüştürücü ikonu |
| `tas_kaplama.png` | `textures/stonelayerplayer.png` | taş heykel dokusunun kaynağı |
| `tas_heykel.png` | yukarıdakinin yüz karesi (8,8)-(16,16), 16×16'ya ölçeklendi | heykel bloğu |

Modun kendi eşya adı Resetting Sword için `proximity_projection`; dokusunu
`red_key.png` üzerinden bulduk (`models/item/proximity_projection.json`).

## v4.87 — silah sistemi

Aynı jar (`ZabriStudiosv2.21.12.2_2_1.jar`).

| dosya | modun içindeki yolu |
|---|---|
| `silah_pdw.png` | `textures/blocks/pdw_memirzabri.png` |
| `silah_revolver.png` | `textures/blocks/revolver_mz.png` |
| `silah_altin_revolver.png` | `textures/blocks/goldenrevolver_mz.png` |
| `silah_sersem.png` | `textures/items/stungun.png` |
| `mermi_sarjor.png` | `textures/items/advancedmagazine.png` (32×32 → 16×16) |
| `mermi_roket.png` | `textures/bm_missile_texture.png` (32×32 → 16×16) |
| `mermi_kursun.png` | `textures/bullet1.png` (64×16 şerit → ilk 16×16 karesi) |
| `mermi_altin.png` | `textures/rosite_bullet.png` |
| `silah_bazuka.png` | **çizildi** — bazukanın modda tek parça dokusu yok, çok parçalı bir model (beton + kırmızı nokta). Modun kendi gri tonlarıyla 16×16 bir namlu çizildi. |

## Ionstrike / Max Steel modu (v4.91)

Kaynak: `mod.jar` — modid `ionstrike` v1.0.0, yapan **Bionic**.
Palladium eklentisi (Java, `lowcodefml` = tamamen JSON, derlenmis
sinif YOK). md5 `a0fee04d4ab2e14c89f381dcc298dbcd`.

| bizdeki dosya | modun icindeki yol |
|---|---|
| `zirh_suit.png` | `assets/ionstrike/textures/entity/max_steel/ionstrike_new.png` |
| `zirh_suit_parlama.png` | `assets/ionstrike/textures/entity/max_steel/base_glow.png` |

Ikisi de 64x64 **oyuncu skini duzeninde** — bizim modellerimizin
kullandigi duzenin aynisi, donusturmeye gerek kalmadi.

Sayilar (zirh degerleri ve mod etkileri) `data/ionstrike/palladium/
powers/*.json` dosyalarindan OKUNDU, uydurulmadi. Esleme tablosu
`ayarlar.js: ZIRH_MODLAR` icinde satir satir yazili.

## AlienEvo (Ben 10) modu (v4.92)

Kaynak: `AlienEvo1.1.3fabric_1.jar` — modid `alienevo` v1.1.3,
yapan **Habb & Stephen**. Fabric + Palladium, modelleri **GeckoLib**
ile, yani ZATEN Bedrock `.geo.json` bicimi.
md5 `18b2b7b17aa9b5d4efa794d3fbbfd7e4`.

| bizdeki dosya | modun icindeki yol |
|---|---|
| `ben_elmas.png` | `.../models/aliens/alien_3/petrosapien_skin_default.png` |
| `ben_dortkol.png` | `.../models/aliens/alien_6/tetramand_skin_default.png` |
| `ben_cene.png` | `.../models/aliens/alien_8/piscciss_volann_skin_default.png` |
| `ben_ates.png` | `alien_1/heatblast_default.png` + `heatblast_0_glow_default.png` **birlestirildi** |

Ates Topu'nun ALEVI ayri bir katmanda ve modun kendisi sekiz kareyi
sirayla oynatiyor. Bedrock'ta tek doku kullanilabildigi icin ilk kare
tabana bindirildi -- alevsiz birakmak karakteri "sonmus" gosterirdi.

`kaynak_geo/` altindaki modeller:

| bizdeki dosya | modun icindeki yol |
|---|---|
| `ben_elmas.geo.json` | `geo/aliens/alien_3/petrosapien_default.geo.json` |
| `ben_dortkol.geo.json` | `geo/aliens/alien_6/tetramand_default.geo.json` |
| `ben_dortkol_kollar.geo.json` | `geo/aliens/alien_6/tetramand_arms_default.geo.json` |
| `ben_cene.geo.json` | `geo/aliens/alien_8/piscciss_volann_default.geo.json` |
| `ben_ates.geo.json` | `geo/aliens/alien_1/pyronite_default.geo.json` |

Kupler, uv'ler, donusler HIC ELLENMEDI. Tek degisiklik kemik adlari
(`armorHead` -> `head` vb.) ve kimlik -- modun kendi kimlikleri bozuk
(`tetramand` dosyasinin kimligi `geometry.Diamondhead`, `piscciss`inki
`geometry.unknown`).

Guc sayilari `data/alienevo_aliens/palladium/powers/*.json` dosyalarindan
OKUNDU. Esleme `ayarlar.js: BEN10` icinde satir satir yazili ve
`ben10.mjs` testi sayilari jar ile karsilastiriyor.

### v4.93 — uc bicim, saatler, animasyonlar

**Dokular artik KATMAN BIRLESTIRILEREK aliniyor.** v4.92'de yalniz `skin`
katmani alinmisti ve `default` bicimde bu dogruydu -- ama `prototype` ve
`10k` bicimlerinde KIYAFET `uniform` katmaninda duruyor (olculdu:
petrosapien uniform_default 0 dolu piksel, uniform_prototype **1540**).
Tek katman alininca o iki bicim DUZ RENK cikiyordu.

Sira: `skin` -> `uniform` -> `glow` (govde, kiyafet, parlama).
Ates Topu icin: `heatblast_<bicim>.png` -> `heatblast_0_glow_<bicim>.png`.

Modeller: `geo/aliens/<klasor>/<tur>_<bicim>.geo.json`
(+ Dort Kol icin `tetramand_arms_<bicim>.geo.json`).

**Saatler** (`kaynak_geo/omnitrix_*.geo.json`):

| bizdeki dosya | modun icindeki yol |
|---|---|
| `omnitrix_proto.geo.json` | `geo/prototype_omnitrix.geo.json` |
| `omnitrix_proto.png` | `textures/models/prototype_omnitrix/prototype.png` |
| `omnitrix_recal.geo.json` | `geo/recal_omnitrix.geo.json` |
| `omnitrix_recal.png` | `textures/models/recal_omnitrix/recal.png` |

10K saati ALINMADI: modun kendisi onun dokusunu Palladium'un dinamik doku
sistemiyle uretiyor, hazir bir PNG yok. Uydurma bir ucuncu cizilmedi.

**Animasyonlar** (`kaynak_anim/`): `petrosapien`, `ripjaws`, `prototype`,
`recal_omnitrix`. Dosyalar OLDUGU GIBI kopyalandi -- bicimleri zaten Bedrock
(`format_version 1.8.0`, GeckoLib oyle kullaniyor) ve hicbiri `armorX`
kemiklerini surmuyor, yani kemik yeniden adlandirmamizdan etkilenmiyorlar.
