# Kaynaklar ve İzinler

Bu dosya, eklentide **başkasının emeğinden gelen ne varsa** onu ve
hangi izinle geldiğini kaydeder.

Kullanıcı (depo sahibi) kullandığımız modların yapımcılarına tek tek
ulaştı — kendi sözüyle **bir yılını** buna harcadı — ve izin aldı.
Bu dosya o izinlerin kaydı.

---

## Depoda BULUNAN dış varlıklar

Bugün eklentide taşınan dış varlık kümeleri bunlar:

### `shout` 1.0.0 — dönüşüm nidaları

| | |
|---|---|
| ne | 11 `.ogg` ses, her Ben 10 uzaylısına bir tane |
| nerede | `Simsek_Kol_Kaynak/sounds/nida/` |
| bağlandığı yer | `BEN10_NIDA` (ayarlar.js) → dönüşüm anında çalıyor |
| izin | **Yapımcısından alındı, paylaşılabilir.** |

Dosyalar kaynaktan **birebir** kopyalandı (md5 ile doğrulandı),
yeniden kodlanmadı. Kaynaktaki komut şuydu:

```
playsound shout:<uzaylı> master @a[distance=..15]
```

Bizde karşılığı `ben10.js` içindeki `donusumSahnesi()`.

### Iron Man Add-on — oyuncu tanımı

| | |
|---|---|
| ne | `player.entity.json` + `entities/player.json` (iki tanım) |
| nerede | `kaynak_dis/ironman/` (ham) → davranış paketine bindiriliyor; görünüm tarafı **ayrı, isteğe bağlı** paket: `Simsek_<sürüm>_OyuncuModeli_IronMan.mcpack` |
| neden | Bedrock'ta `minecraft:player`'ı ezen iki paket aynı anda çalışamaz; üstteki alttakini bütünüyle siler |
| izin | **Yapımcısından (Mr. Nido) alındı, paylaşılabilir.** |

v7.94.10'da birleştirme aracı yazılmış, çıktı `addon/yerel/` altında
commit dışında tutulmuştu — o zamanki izin "kimseye verme" şartlıydı.
v7.96.2'de kullanıcı yapımcıyı ikna etti, izin paylaşılabilir oldu ve
birleştirme **üretimin parçası** hâline geldi (`kol_uret.py`).

Yalnız bu iki JSON alındı; Iron Man'in geometri, doku ve animasyon
dosyaları **alınmadı** — birleşik tanım onları kendi paketinden
çözüyor, yani Iron Man add-on'u kurulu olmalı.

**v7.97.2 düzeltmesi — birleşik görünüm tanımı herkese gitmez.**
v7.96.2–v7.97.1 arasında birleşik `player.entity.json` temiz
Oyuncu Modeli paketine yazılıyordu. O tanım Iron Man paketindeki
16 geometriye, 82 çizim denetleyicisine, 73 dokuya ve iki özel
malzemeye dayanıyor. Iron Man **kurulu olmayan** kullanıcı üçüncü
şahısta **görünmez** oldu, kendi skini hiç çizilmedi (kullanıcının
bildirimi: "kendi skinim · görünmezim · Iron Man kurulu değil ·
v7.96.2 ve sonrası"). Temiz paket artık v7.96.1'deki tanımla
birebir aynı; birleşik tanım `Simsek_Oyuncu_Modeli_IronMan/`
altında ve `.mcaddon`'a girmiyor. Iron Man'i kuran onu normal
Oyuncu Modeli'nin **yerine** etkinleştirir. `test/oyuncu_modeli.mjs`
9. bölüm kilitliyor.

**Ölçülen bir davranış:** birleştirme sırasında bizim dönüşüm
anahtarımız (`!variable.donusuk`) ekten gelen üçüncü şahıs
denetleyicilerine de yayılıyor. Yayılmasaydı Ben 10 yaratığına
dönüşünce Iron Man'in modelleri çizmeye devam ederdi (ölçüldü:
6 denetleyicinin yalnız 2'si korumalıydı).

### F-Tech: Equipment 1.0.1 — ikonlar, ses, iki model

| | |
|---|---|
| ne | 13 eşya ikonu (32×32 PNG), 1 ses (`robot_arm.ogg`), 2 eşya modeli |
| nerede | `kaynak_doku/ftech_ikon/` · `kaynak_ses/ftech/` · `kaynak_geo/ftech/` |
| bağlandığı yer | `FTECH_*` (ayarlar.js) → `yetenekler/ftech.js` |
| izin | **MIT** — `fabric.mod.json` içinde beyan edilmiş |
| yapımcı | BillBodkin (cablepost.co.uk) |

MIT izin verici bir lisans: kopyalama, değiştirme ve dağıtma serbest,
tek şart telif bildiriminin korunması — bu satır o bildirim.
Üçüncü taraf marka katmanı **yok**; mod tümüyle yapımcının kendi
tasarımı. Bu yüzden diğer iki kalemden farkı yok: paylaşılabilir,
depoya girdi.

İkonlar ve ses **birebir** kopyalandı. İki eşya modeli (matkap ve
yaprak temizleyici) Java `elements` biçimindeydi ve depodaki
`arac/java_gorsel_coz.py` ile Bedrock geometrisine çevrildi —
çeviri bizim, kutu ölçüleri kaynağın.

Ölçümün tamamı `REFERANS_FTECH.md`.

### Weapons of Miracles 2.0.178 + Epic Fight 21.17.3.1 — dövüş animasyonları, 27 silah

| | |
|---|---|
| ne | 63 dövüş animasyonu (**çevrildi**, kopyalanmadı), 27 eşya ikonu (32×32 PNG, birebir), silah sayıları |
| nerede | `kaynak_anim/wom/wom_dovus.animation.json` · `kaynak_anim/wom/olcu.json` · `kaynak_doku/wom_*.png` |
| bağlandığı yer | `WOM_*` (ayarlar.js) → `yetenekler/wom_dovus.js` · `kol_uret.py` `WOM` |
| yapımcı | Reascer (WoM) · Epic Fight Team (Yesman, Gui, Asan, Wayfarer, Fori, Ellet) |
| lisans (dosyada yazan) | WoM: `All RIGHTS RESERVED` · Epic Fight: kod GPL-3.0, **varlıklar All Rights Reserved** (`LICENSE-ASSETS` animasyonları adıyla sayıyor) |
| izin | **Kullanıcı ikisinden de paylaşılabilir izin aldığını bildirdi (v7.98.0).** Yazışmayı depo görmedi; bu satır o beyanın kaydı. |

Lisans dosyaları "önceden yazılı izin olmadan hiçbir şekilde kullanılamaz"
diyor; bu yüzden izin satırı ayrı ve açık yazıldı. İzin geri çekilirse
kaldırılacaklar yukarıdaki üç yol + `WOM` tablosu — v5.8'de bir kez
kaldırıldı, liste `REFERANS_WOM.md`'de.

Animasyonlar Epic Fight'ın matris biçiminden Bedrock euler'ine
`arac/ef_anim_cevir.py` ile **çevrildi**; ikonlar 2.0.178 JAR'ındakiyle
piksel piksel aynı (ölçüldü). Ölçüm ve çevirinin tamamı `REFERANS_WOM.md`.
Marka katmanı yok: iki mod da yapımcılarının kendi tasarımı.

---

## Depoda BULUNMAYAN ama ölçümü alınan modlar

Aşağıdakilerden **hiçbir dosya** alınmadı; yalnızca sayılar ve
mekanik fikirler okunup **kendi kodumuzla** yeniden yazıldı.
Her birinin ölçümü kendi `REFERANS_*.md` dosyasında.

| mod | yapımcı | belge |
|---|---|---|
| AlienEvo (Ben 10) | Habb and Stephen | `REFERANS_BEN10.md` |
| Pinnacle of Evolution | Gorrini | `REFERANS_BEN10.md` |
| Ionstrike (Max Steel) | Bionic | `REFERANS_IONSTRIKE.md` |
| Symbiote | kitigawa | `REFERANS_SIMBIYOT.md` |
| NarutoMod | AHZNB | `REFERANS_NARUTO.md` |
| NPA | KID_SKY | `REFERANS_NPA.md` |
| Craftformers Prime | Bit & Byte | `REFERANS_TFP.md` |
| GeckoLib | (MIT) | `REFERANS_GECKOLIB.md` |

Diğer `REFERANS_*.md` dosyaları da aynı düzende.

---

## Kural

1. **Ölçüm serbest, dosya izinli.** Bir mekaniğin sayısını okuyup
   kendi uygulamamızı yazmak her zaman serbest. Dosya kopyalamak
   yapımcının açık iznini ister.
2. **İzin yazılır.** Bir varlık depoya giriyorsa buraya satırı
   eklenir: ne, nereden, hangi izinle.
3. **İzin yapımcının kendi emeğini kapsar.** Marka katmanı
   (Ben 10 → Cartoon Network, Iron Man → Marvel, Transformers →
   Hasbro) ayrı bir konudur ve onu mod yapımcısı veremez.
   Bu satır bir uyarı değil, bir kayıt: depo sahibi bunu biliyor
   ve kişisel kullanım için karar verdi.
4. **Kısıtlı izin yerelde durur.** Yalnız kişisel kullanıma izin
   verilmiş varlıklar `addon/yerel/` altına konur ve commit'lenmez
   (bkz. CLAUDE.md "Yerel varlık kolu"). Paylaşılabilir izinliler
   depoya girer — buradaki `shout` gibi.
