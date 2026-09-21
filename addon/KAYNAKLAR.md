# Kaynaklar ve İzinler

Bu dosya, eklentide **başkasının emeğinden gelen ne varsa** onu ve
hangi izinle geldiğini kaydeder.

Kullanıcı (depo sahibi) kullandığımız modların yapımcılarına tek tek
ulaştı — kendi sözüyle **bir yılını** buna harcadı — ve izin aldı.
Bu dosya o izinlerin kaydı.

---

## Depoda BULUNAN dış varlıklar

Bugün eklentide taşınan tek dış varlık kümesi bu:

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
| nerede | `kaynak_dis/ironman/` (ham) → üretim paketlere bindiriyor |
| neden | Bedrock'ta `minecraft:player`'ı ezen iki paket aynı anda çalışamaz; üstteki alttakini bütünüyle siler |
| izin | **Yapımcısından (Mr. Nido) alındı, paylaşılabilir.** |

v7.94.10'da birleştirme aracı yazılmış, çıktı `addon/yerel/` altında
commit dışında tutulmuştu — o zamanki izin "kimseye verme" şartlıydı.
v7.96.2'de kullanıcı yapımcıyı ikna etti, izin paylaşılabilir oldu ve
birleştirme **üretimin parçası** hâline geldi (`kol_uret.py`).

Yalnız bu iki JSON alındı; Iron Man'in geometri, doku ve animasyon
dosyaları **alınmadı** — birleşik tanım onları kendi paketinden
çözüyor, yani Iron Man add-on'u kurulu olmalı.

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
