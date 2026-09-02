# BoraLo Mod V4 Final — inceleme

Kullanıcı `.mcaddon`'u gönderdi: *"çerezlik bir tane mod buldum, eklenebilecek
iyi fikirleri al."*

Paket: **2,6 MB zip → 9,7 MB, 1091 dosya.** Yazar `medanasim98`. Ad alanı `sp:`
(daha önce Falen/Trb1545'ten tanıdığımız önek), `min_engine_version 1.17.0`,
`@minecraft/server **1.19.0**`, `@minecraft/server-ui 1.3.0`.

| bölüm | adet |
|---|---|
| eşya | 121 |
| blok | 37 |
| varlık | 17 |
| function | 207 |
| **script** | **20 dosya / 1779 satır** |
| model · doku · attachable | 93 · 305 · 109 |
| animasyon | 45 |

Elimize geçen BoraLo paketlerinin çoğu komut listesiydi. **Bu gerçek script
taşıyor** — o yüzden değerli olan kısım `scripts/`, `functions/` değil:
207 function'ın neredeyse tamamı tek satırlık `give @s <eşya>`.

---

## 1. Asıl kazanç: oyuncuya ANİMASYON oynatma

Bu depoda v5.3'ten beri bilinen bir sınır var: **attachable animasyonları
çalışmıyor**, varlık üstünde `scripts.animate` çalışıyor. Yani "oyuncunun
kendisine bir poz verdirmek" için elimizde bir yol yoktu.

Bu paket üçüncü bir yol gösteriyor ve **çalışıyor**:

```
playanimation @p[tag=Yamul,r=8] animation.sp_m_animasyon_yamulma.
```

Nasıl kurmuşlar (dosyalardan ölçüldü):

1. Vanilla oyuncu animasyon setinin **tamamını** yeni bir önekle kopyalamışlar
   (`animation.sp_m_animasyon_yamulma.look_at_target.default`, `.move`,
   `.holding`, `.attack`, … 17 animasyon).
2. Setin içine **adı boş biten** bir kayıt koymuşlar:
   `animation.sp_m_animasyon_yamulma.` ← sondaki nokta yazım hatası değil,
   çağrılan animasyonun gerçek adı bu.
3. Komutla doğrudan oyuncuya oynatıyorlar.

Geri alma da komutla:

```
playanimation @p animation.zombie.attack_bare_hand a 0
```

**Bizim için anlamı:** Kanlı Kol / Toprak Kol yeteneklerinde oyuncunun kolunu
gerçekten kaldırmak artık mümkün. `OZEL_ANIMASYON` notu (ayarlar.js:120) bu
yüzden yeniden açılabilir.

**Bedeli:** beş "animasyon" varlığı için beş ayrı tam set kopyalanmış — 45
animasyon dosyasının çoğu bu. Biz tek set + gereken pozlarla yaparız.

---

## 2. Alınmaya değer fikirler

Sıralama benim önerim; hiçbiri henüz uygulanmadı.

| # | fikir | kaynaktaki hâli | bizde karşılığı |
|---|---|---|---|
| 1 | **Oyuncuya poz verdirme** | yukarıdaki teknik | **yok** — gerçek boşluk |
| 2 | **Gücü Reddet** | menüde bir düğme; giyilen güç eşyasını çıkarıp bütün etiketleri siliyor | **yok** — her gücün çıkışı olmalı |
| 3 | **Toprak Yol** | `fill ^ ^-1 ^1 ^ ^-1 ^1 dirt replace air` her tick — yürüdükçe altına toprak yol | **yok** |
| 4 | **Gömme** | hedefi bulunduğu yerde 3 blok aşağı ışınlar | **yok** (kontrol yeteneği) |
| 5 | **Toprak Kutu** | etrafına dolu kutu, 1 tick sonra içini boşaltır | `kubbe` var, kutu yok |
| 6 | **Dost etiketi** | `ustkonsey` etiketi taşıyan oyuncuyu yetenekler atlıyor | `KANLI_MUAF` var ama etiketli değil |
| 7 | **Çift eğilme** | 500 ms içinde iki kez shift → menü | bizde eğil+zıpla |
| 8 | **Süreli "ban"** | 60 sn spectator + hareket/kamera kilidi + periyodik ekran kararması | **yok** |
| 9 | **Altın Yumruk** | vuruşta bakış yönüne `applyKnockback(x, z, 5, 0.6)` | `savur` var, kalkan yok |
| 10 | **Kanlı Orman blok seti** | çimen/kütük/tahta/yaprak/toprak + "portal" | **yok** — wiki'deki kanlı orman |

**Kanlı Orman "portal"ı hakkında dürüst not:** çalışan bir portal DEĞİL.
`sp_m_kanliorman_portal` yalnızca animasyonlu dokusu olan bir blok;
`"events": {}` boş, ışınlama yok, ilgili function tek satır `give @s`. Yani
görünüş var, mekanik yok. Bizde yapılacaksa sıfırdan yazılır.

---

## 3. Kaynakta ölçülen hatalar

Bu depodaki kural: kaynağın hatası **kopyalanmaz**, yazılır.

**a) `isValid()` metot olarak çağrılıyor.** `bugged_diamond_sword.js` ve
`ustkonsey_illegal_staff.js` içinde `player.isValid()`, `victim.isValid()`,
`target.isValid()`. Paketin bildirdiği API 1.19.0'da bu doğru; **bizim
kullandığımız 2.0.0'da `isValid` bir ÖZELLİK.** Kod olduğu gibi taşınırsa
`isValid is not a function` atar — ve tam olarak **serbest bırakma
zamanlayıcısının** içinde atar, yani kurban sonsuza kadar banlı kalır.
(Aynı hatayı v7.1'de başka bir pakette de görmüştük.)

**b) Donmanın tek çıkışı ATEŞ.** `spm_bobby_gun.mcfunction` kurbanı
görünmez yapıp `inputpermission` ile hareketi ve kamerayı kapatıyor, kafasına
kilitli bir eşya takıyor. Tek kurtuluş `fallen_kurtar.js`: **ayağının altında
ateş varsa** çözülüyor. Ateş bulamayan oyuncu kalıcı olarak kilitli.

**c) Yamultma en yakın oyuncuyu vuruyor.** `spm_advanced_dirtarms_power_3`:
`tag @p[r=8,rm=1] add Yamul` — bakış yönü kontrolü yok, arkanda duran arkadaşın
da yakalanır. Serbest bırakan `power_4` hiç çalıştırılmazsa kilit kalıcı.

**d) Otopark koordinatı.** `tp @e[...,c=1,rm=2] 25000 100 -25000` — işini
yapmayan varlık sabit bir uzak koordinata sürülüyor. Sondaki `kill` ıskalarsa
orada sonsuza kadar birikirler.

**e) Alan gömmesi hiçbir şeyi filtrelemiyor.** 12 blok içindeki **her varlık**
(eşyalar, evcil hayvanlar dahil) kullanıcının 3 blok altına ışınlanıyor.

**f) Üç ayrı script `system.runInterval(..., 0)` ile HER TICK** bütün
oyuncuları ve ekipmanlarını tarıyor. Tablette bunun bedeli var.

**g) Şişkinlik.** Beş "animasyon" varlığı aslında **vanilla köylüsünün
kopyası** — `become_zombie`, `baby`/`adult`, `take_flower`, `make_love`
bileşenleriyle birlikte. Tek bir poz için beş köylü + beş tam animasyon seti.

---

## 4. Alınmayacaklar

- **`durability_manager.js` (256 satır).** `registerCustomComponent` ile
  gerçek bir dayanıklılık sistemi: unbreaking, zırh aşınması, kürekle
  coarse_dirt, baltayla soyma, çapayla sürme. İyi yazılmış ama bizim
  ihtiyacımız yok; eşyalarımız vanilla dayanıklılığını kullanıyor.
- **Zaten bizde olanlar:** mobpicker → `yakala`, astrape → `coklu_simsek`,
  iceman → `buz_adam`, stone converter → `tas`, fallen → `dusmus`,
  great staff → `coklu_simsek`, meteor sword → `isin_topu`/`meteor`,
  kafes → `hapis`, örs → `ors`, yamult → `yamult`.
- **121 eşyanın çoğu** kılıç/zırh çeşitlemesi (frozen, void, corrupted, hev,
  hazmat, vemos, dragon_brothers…). Görünüş işi; yetenek taşımıyorlar.
