# CustomPlayerModels ve ReplayMod — ne işe yarar, ne alındı

İkisi de kullanıcının v7.99.7'de gönderdiği **Java** modu. Sorusu:
*"bunlar işinize yarayabilir mi attığım dosyalar"*. Kısa cevap:
**ikisi de Bedrock'ta çalışmaz**, ama ikisinden de birer fikir alındı
ve kendi kodumuzla yazıldı. Hiçbir dosyaları depoya girmedi.

Dosyalar yalnız açıldı (`unzip`) ve okundu (`strings`, `javap`);
hiçbiri **çalıştırılmadı**.

| | CustomPlayerModels | ReplayMod |
|---|---|---|
| dosya | `CustomPlayerModels-26.3-0.6.27b.jar` | `replaymod-1.21.2-2.6.20.jar` |
| md5 | `6354eddda2befc8fae4a4d068dd8dbc2` | `a42992122eb50f87c477e191277ac480` |
| yapımcı | tom5454 | CrushedPixel, johni0702 |
| lisans | **MIT** (`fabric.mod.json`) | **GPL-3.0-or-later** (`LICENSE`) |
| platform | Java, NeoForge (MC 26.3) | Java, Fabric (MC 1.21.2) |
| boyut | 1.350 dosya | 7.103 dosya |

## CustomPlayerModels (CPM)

Oyuncunun kendi modelini oyun içinde düzenleyip animasyon vermesini
sağlayan bir Java modu. Editörü, çok oyunculu senkronu ve Blockbench
eklentisi var (eklenti ayrı dağıtılıyor, JAR'da yok).

**Neden doğrudan işe yaramıyor:** Bedrock'ta Java modu çalışmaz; CPM'in
model biçimi (`.cpmmodel`) Bedrock'un okuduğu bir şey değil.

**Alınan fikir — poz listesi.** `VanillaPose` sınıfında CPM'in
animasyon bağlayabildiği 73 durum var (`javap -constants`):
`STANDING · WALKING · RUNNING · JUMPING · HURT · DYING · BLOCKING_* ·
SPEAKING · FALLING · RIDING · SLEEPING · CRAWLING …`. Aktörümüzün
tepki animasyonları için kontrol listesi olarak kullanıldı: `HURT`
→ `animation.aktor.darbe`, `BLOCKING` → `animation.aktor.savun`,
`SPEAKING` → `animation.aktor.konus` (altyazıyla birlikte oynuyor).
Animasyonlar bizim; CPM'den kod ya da veri alınmadı.

Ara değer tipleri de listelendi (`interpolator/`): doğrusal, polinom
eğri (spline), trigonometrik — döngülü ve döngüsüz. Kamera yolunda
spline seçildi (aşağıda).

## ReplayMod

Oyunu kaydedip sonra serbest kamerayla, anahtar karelerle yeniden
oynatan Java modu. Makinima (Minecraft filmi) yapanların en çok
kullandığı araç.

**Neden doğrudan işe yaramıyor:** Java istemcisinde çalışıyor. Bedrock'ta
bir karşılığı yok: Bedrock oyunu kaydedip geri oynatamıyor.

**Alınan fikir — anahtar kareli kamera yolu.** ReplayMod'un yol
düzenleyicisinde (`replaystudio/pathing/interpolation`) üç ara değer
var: `LinearInterpolator`, `CubicSplineInterpolator`,
`CatmullRomSplineInterpolator(double alpha)`. Catmull-Rom'un `alpha`
parametresi merkezcil (0,5) ya da düzgün (0) eğriyi seçiyor.

Bizde karşılığı `cekim nokta ekle` + `cekim kamera yol <süre>`:
oyuncu gezip noktaları işaretliyor, kamera bu noktalardan baktığı
yönleriyle geçen merkezcil Catmull-Rom yolunda akıyor
(`cekim.js` → `yolNoktasi`). Formül ders kitabı formülü
(Barry–Goldman piramidi); **ReplayMod'un GPL kodu kopyalanmadı**,
yalnız hangi eğrinin kullanıldığı ve alfa değeri okundu.

İkinci fikir, ReplayMod'un **zaman yolu** (oynatma hızının anahtar
kareyle değişmesi, "hız rampası"), Bedrock'ta yapılamıyor: oyunun
zamanı yavaşlatılamıyor. Onun yerine CapCut'taki hız eğrisi
kullanılıyor (`CEKIM_REHBERI.md`).

## Karanlık Tırpan — Antitheus'un modeli neden alınmadı

Aynı turda istenen "Antitheus'a benzer silah" için WoM JAR'ındaki
model de açıldı: `assets/wom/models/item/obj/antitheus.obj` bir
**Blender örgüsü** (516 köşe, 508 yüz, eğri yüzeyler). Bedrock'un
model biçimi yalnız kutu (küp) taşıyor; örgü çevrilemiyor.
Karanlık Tırpan bu yüzden **kendi tasarımımız**: Antitheus'un yan
görünüşünden (uzun sap, uçta iki yöne kıvrılan hilal) esinlenen,
1 piksellik ızgarada 114 küplük bir model (`kol_uret.py`
`tirpan_geometrisi`). Dövüş seti Antitheus'unki (WoM'dan çevrildi,
izin kaydı `KAYNAKLAR.md`).
