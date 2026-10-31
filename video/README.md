# Country Balls video üretimi

Kanalın Country Balls videoları için üretim zinciri. Site (`../`) ile
bağlantısı yok; yalnızca aynı depoda duruyor. Çıktılar (`video/cikti/`)
git'e girmez, komutlarla yeniden üretilir.

## Hangi program nerede çalışıyor

| Program | Nerede | Ücret | Görevi |
|---|---|---|---|
| Python + pycairo | Claude'un bulut makinesi (Linux) | Ücretsiz | 2D çizim ve animasyon (kodla) |
| FFmpeg 6.1 | Claude'un bulut makinesi | Ücretsiz | Kodlama, ses ölçümü, birleştirme |
| Blender 5.2.3 LTS | Claude'un bulut makinesi (+ istersen senin bilgisayarın) | Ücretsiz (GPL) | Arada sırada 3D; 2D için Grease Pencil |
| Krita 5.3.4.1 | Claude'un bulut makinesi + senin bilgisayarın (Windows/macOS/Linux) | Ücretsiz (GPL) | Elle çizim, kare kare animasyon, katmanlı sahne |
| Inkscape 1.4.4 | Claude'un bulut makinesi + senin bilgisayarın | Ücretsiz (GPL) | Vektör harita ve sınır çizimi, kit SVG'lerini düzenleme |
| Synfig 1.5.1 *(isteğe bağlı)* | Claude'un bulut makinesi | Ücretsiz (GPL) | Anahtar kare arası ara hareket (tween), iskelet |
| GIMP 3.2.6 *(isteğe bağlı)* | Claude'un bulut makinesi | Ücretsiz (GPL) | Küçük resim, fotoğraf düzeltme, toplu iş |
| Kdenlive 26.08.2 + MLT 7.43 *(isteğe bağlı)* | Claude'un bulut makinesi | Ücretsiz (GPL) | Açık biçimli zaman çizelgesi, ekransız render (`melt`) |
| Tahoma2D 1.6.3 | Yalnız senin bilgisayarın (kurulmadı, aşağıya bak) | Ücretsiz, açık kaynak | Kukla/tween animasyon, kamera hareketi |
| CapCut PC | Senin bilgisayarın (Windows/macOS) | Ücretsiz, bazı özellikler Pro | Hızlı kurgu, altyazı, Shorts |
| Premiere Pro | Senin bilgisayarın (Windows/macOS) | Ücretli (7 günlük deneme) | Çok katmanlı, uzun kurgu |

CapCut PC ve Premiere Pro'yu bulut makinesine kurmak mümkün değil. İkisi de
yalnızca Windows ve macOS'ta çalışıyor ve ekran başında kullanılan
programlar. Premiere Pro lisanslı bir ürün; deneme sürümü 7 gün sonra
iptal edilmezse otomatik olarak ücretli üyeliğe dönüşüyor. Bu ikisi senin
bilgisayarında durur. Bulut makinesindeki zincir ise onların doğrudan
açabileceği dosyaları üretir: saydam PNG, SVG, WAV ve MP4.

**Sürümler resmî kaynaklardan doğrulandı (31 Ekim 2026):** Blender 5.2.3 LTS
(download.blender.org), Krita 5.3.4.1 (krita.org'un sunduğu kararlı sürüm;
6.0.4 KDE sunucusunda var ama krita.org ana indirme olarak 5.3.4.1'i veriyor),
Inkscape 1.4.4 (inkscape.org, 6 Mayıs 2026; 1.5 henüz yayımlanmadı, "planlanan"
sürüm), GIMP 3.2.6 (download.gimp.org), Kdenlive 26.08.2 (download.kde.org),
Tahoma2D 1.6.3 (GitHub "Latest", 1 Eylül 2026), Synfig 1.5.5 (GitHub "Latest",
16 Mart 2026). Bulutta Synfig'in Ubuntu paketi (1.5.1) kurulu, çünkü bu ağ
GitHub'daki sürüm dosyalarını indirmeye izin vermiyor. Tahoma2D yalnızca
GitHub'dan ve Flathub'dan dağıtıldığı için bulutta kurulu değil. Ekransız bir
kullanımı da yok, senin bilgisayarında kullanılacak bir program.

**Rol başına bir araç.** Aynı işi yapan programlar çoğaldıkça zaman artıyor,
kalite artmıyor. Önerilen dağılım:

| Rol | Ana araç | Yedek |
|---|---|---|
| Elle çizim, kare kare efekt | Krita | — |
| Vektör varlık, harita, sınır | Inkscape | — |
| Toplu kayan/zıplayan animasyon | Claude'un zinciri (pycairo) | Blender Grease Pencil, Synfig, Tahoma2D |
| 3D | Blender | — |
| Kurgu | CapCut PC | Premiere Pro ya da Kdenlive (ücretsiz) |
| Küçük resim | Krita ya da GIMP | — |

## Hızlı başlangıç

```bash
bash video/kur.sh                 # FFmpeg, pycairo, yazı tipi, Blender, Krita, Inkscape
TAM=1 bash video/kur.sh           # + Synfig, GIMP, Kdenlive/MLT
python3 video/araclari_sina.py    # her araca gerçek bir iş yaptırıp sonucu ölçer
python3 video/bolum01.py          # deneme videosu + ses katmanları + kit
python3 video/bolum01.py --hizli  # yarım çözünürlükte hızlı önizleme
python3 video/bolum01.py --kare 13.6   # tek kare kontrolü
python3 video/uc_boyut.py         # 3D Türkiye topu (Blender, Cycles CPU)
python3 video/krita_sahne.py      # Krita için katmanlı sahne (.kra), doğrulamalı
```

Bulut konteyneri geçici; oturum bitince kurulan programlar silinir.
`kur.sh` her yeni oturumda bir kez çalıştırılır. İstersen içeriğini
ortamın kurulum betiği alanına (oturum başlığındaki bulut ortamı menüsü →
Edit → Setup script) yapıştır, her oturum hazır başlar.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `cizim.py` | Toplar, bayraklar, gözler, aksesuarlar, nesneler, konuşma balonu, arka plan |
| `ses.py` | Müzik (Karplus-Strong telli çalgı) ve efektlerin sentezi |
| `bolum01.py` | Deneme bölümü: senaryo, zaman çizelgesi, kamera, render, kit dışa aktarımı |
| `uc_boyut.py` + `blender_sahne.py` | 3D deneme: doku üretimi + Blender'da ekransız render |
| `krita_sahne.py` | Sahneyi katmanlara ayırıp `.ora` yazar, Krita'ya `.kra`'ya çevirtir ve piksel karşılaştırmasıyla doğrular |
| `kur.sh` | Kurulum; her indirme yayıncının SHA-256 değeriyle ya da apt imzasıyla doğrulanır |
| `araclari_sina.py` | Araç sınaması: Inkscape 4K vektör çıktısı, Synfig ara hareket, GIMP toplu iş, MLT zaman çizelgesi render, Krita gidiş-dönüş, Blender ekransız Python |

## Çıktılar (`video/cikti/`)

- `deneme01_cay_diplomasisi.mp4`: 1920×1080, 30 fps, H.264 + AAC, 20 sn,
  ses -14 LUFS (YouTube referansı), tepe -1,5 dBTP.
- `ses_katmanlari/`: `muzik.wav`, `efektler.wav`, `karisim.wav` ayrı
  katmanlar; kurguda sesi yeniden dengelemek için.
- `kit/karakterler/`: 2 karakter × 9 ifade × 3 yön = 54 saydam PNG (1024 px)
  ve aynıları SVG olarak (Inkscape veya Illustrator'da düzenlenebilir).
  İfadeler: `normal`, `kapali` (göz kırpma karesi), `mutlu`, `sasirmis`,
  `kizgin`, `gururlu`, `kuskulu`, `uzgun`, `endiseli`.
  Yönler: `saga`, `on`, `sola`.
- `kit/nesneler/`: çay bardağı, fincan, süt şişesi, ter damlası, ünlem,
  parıltı, gölge (PNG + SVG).
- `kit/arka_plan*.png`: tek parça arka plan ve paralaks için üç katman
  (gök, bulutlar, ön plan).
- `kit/ses/`: efektler tek tek ve 104 BPM müzik döngüsü.
- `3d_turkiye.png`: Blender 3D denemesi.
- `krita/sahne01.kra`: Krita'da açılan 10 katmanlı sahne (gök, bulutlar, ön plan,
  gölgeler, iki karakter, iki nesne, gizli örnek balon, boş "Çizim" katmanı).
  Aynısı `sahne01.ora` olarak da var (GIMP ve MyPaint de açar).

## CapCut PC'de kullanım

CapCut'ın kendi anahtar kare rehberindeki akış:

1. **Create project** → **Import** ile `kit/` klasöründeki dosyaları içeri al.
2. `arka_plan.png`'yi ana ize, karakter PNG'sini üstündeki ize (overlay) sürükle.
3. Klibi seç; sağ paneldeki özelliğin yanındaki **elmas** simgesine tıkla.
   Oynatma çubuğunu ilerletip değeri değiştir, ikinci anahtar kareyi CapCut
   kendisi ekler. Konum, ölçek, döndürme ve opaklık anahtar karelenebilir.
   `Alt + K` anahtar kare panelini açar.
4. **Zıplama tarifi:** yerde → 7 kare sonra 110 px yukarıda → 7 kare sonra
   yerde. İniş karesinde ölçeği yatayda %112, dikeyde %88 yap, 4 kare sonra
   %100'e döndür. Bu basılıp esneme topa ağırlık hissi veriyor.
5. **Göz kırpma:** aynı konuma 4-5 karelik (yaklaşık 0,15 sn) `kapali`
   PNG'si koy.
6. **İfade değişimi:** aynı yöndeki başka ifade PNG'siyle klibi değiştir.
   Karakterler aynı tuvalde ve aynı noktada çizildiği için konum kaymaz.

**Karakteri aynalama (Mirror).** Aynalarsan bayrak da ters döner; Türk
bayrağının hilali yanlış tarafa bakar. Yön değiştirmek için `saga`, `sola`
ve `on` dosyalarını kullan.

## Premiere Pro'da kullanım

Adobe'nin yardım sayfalarındaki akış:

1. `kit/` klasörünü projeye aktar. PNG'nin saydamlığı korunur.
2. V1 izine arka plan, V2 ve üstüne karakterler ve nesneler.
3. Klip seçiliyken **Effect Controls** → **Motion** altında Position, Scale
   ve Rotation'ın yanındaki **Toggle Animation** (kronometre) simgesiyle
   anahtar kare oluştur. Oynatma çubuğunu ilerletip değeri değiştirdiğinde
   yeni anahtar kare eklenir.
4. Yumuşak hareket için anahtar kareye sağ tıkla → **Ease In / Ease Out**
   (Bezier). Hız grafiğinden ince ayar yapılır.
5. Sesler: A1'e `muzik.wav`, A2'ye `efektler.wav`; seslendirme gelince A3.

## Krita'da kullanım

Krita bir çizim ve kare kare animasyon programı. Countryball'da en çok iki
yerde işe yarıyor: topları ve nesneleri **elle** çizmek (Polandball geleneği
daire aracı kullanmaz) ve ter, toz, hız çizgisi, patlama gibi elle
çizilen efektleri kare kare canlandırmak.

1. `cikti/krita/sahne01.kra`'yı aç. Katmanlar ayrı; **Çizim** katmanına
   doğrudan çizebilirsin, karakterleri taşıyabilir ya da gizleyebilirsin.
2. Kare kare animasyon için **Animation** çalışma alanına geç; bir katmanı
   zaman çizelgesine ekleyip her kareye çiz. Soğan kabuğu (onion skin) önceki
   ve sonraki kareleri soluk gösterir.
3. **File → Render Animation** ile PNG dizisi ya da video çıkar. Krita 5.2'den
   beri kendi içinde FFmpeg'in bir parçasını taşıyor, ayrı kurulum gerekmiyor.
   Çıkan saydam PNG dizisi CapCut'a ya da Premiere'e katman olarak girer.

Bulut tarafında Krita ekransız çalışıyor; elle çizemiyorum ama Krita
dosyalarını üretebiliyor, açabiliyor ve dışa aktarabiliyorum:

```bash
krita sahne.kra --export --export-filename sahne.png          # tek kare
krita --export-sequence --export-filename kare.png anim.kra   # animasyon karelerini PNG dizisi yap
```

Yani senin Krita'da çizdiğin `.kra` dosyasını bana verirsen, onu karelere
çevirip kurguya ya da benim sahnelerime katabilirim.

## Inkscape, Synfig, GIMP ve Kdenlive

- **Inkscape:** Harita videolarında sınırlar ve bölgeler vektör çizilir;
  4K'ya büyütülse de pikselleşmez. Kitteki her SVG doğrudan açılır.
  Bulutta komut satırından dışa aktarılır:
  `inkscape harita.svg --export-type=png --export-width=3840`.
- **Synfig:** Karakteri anahtar kareler arasında otomatik hareket ettirir;
  `.sif` dosyası metin tabanlı olduğu için bulutta da üretilip
  `synfig dosya.sif -t png -o kare.png` ile render edilebilir.
- **GIMP:** Küçük resim ve fotoğraf işi. Bulutta Python-Fu ile toplu iş
  (`gimp-console --batch-interpreter=python-fu-eval`).
- **Kdenlive:** Ücretsiz kurgu programı; Premiere'e para vermek istemezsen
  ikinci kurgu aracı olabilir. Altındaki MLT motoru (`melt`) bulutta ekransız
  render yapıyor.
- **Tahoma2D:** Senin bilgisayarında kukla ve kamera animasyonu için bir
  seçenek. <https://tahoma2d.org> Windows 8.1/10/11 ve macOS 15+ gereksinimlerini
  listeliyor; Linux paketi için GitHub sürüm sayfasına bak (bu ortamdan
  dosya listesini doğrulayamadım).

## İş bölümü önerisi

1. **Senaryo** (birlikte): konu, replikler, kaç saniye, hangi duygu.
2. **Claude (bulut):** kit, animasyonlu taslak MP4, ses efektleri, müzik,
   gerekirse 3D sahne. Hepsi kodla, yani tekrar üretilebilir ve sürümlü.
3. **Sen (CapCut PC):** hızlı işler, Shorts için dikey kurgu, altyazı, trend
   sesleri.
4. **Sen (Premiere Pro):** uzun videolar, çok katmanlı kurgu, renk ve ses
   son dokunuşları.

## Stil kuralları

Countryball geleneğinden (Wikipedia, *Rules of Countryballs*):

- Göz bebeği, ağız, kol veya bacak yok. Duygu göz biçimiyle ve hareketle
  verilir; nesneler topun yanında süzülür.
- Topun dış çizgisi hafif yamuk; gelenek daire aracı kullanmıyor.
- İngiltere'nin aksesuarı silindir şapka ve monokl. Polonya bayrağı ters
  çizilir. İsrail küp, Singapur üçgen, Kazakistan tuğla, Nepal canavar.

Bayrak ölçüleri resmî:

- **Türk bayrağı** Türk Bayrağı Kanunu oranlarıyla çizilir: dış daire G/2,
  iç daire 2G/5, merkezler arası G/16, yıldız dairesi G/4, iç daire ile
  yıldız dairesi arası G/3.
- **Union Jack** resmî şerit oranlarıyla (yükseklik 30 birim) ve resmî
  renklerle (#012169, #C8102E) çizilir.

## Bilinen sınırlar

- Seslendirme yok; konuşma, karaktere göre perdesi değişen "blip" sesleriyle
  veriliyor. Gerçek ses (senin sesin ya da bir TTS) A3 izine eklenebilir.
- Müzik ve efektler kodla sentezlendi. Hazır ses dosyası kullanılmadığı için
  telif riski yok, ama stüdyo kalitesinde değil.
- 3D şimdilik tek kare deneme; animasyon ve şapka gibi aksesuarlar yok.
- Bu ortam sesi dinleyemiyor. Ses yüksekliği ve zamanlama ölçülerek
  (EBU R128, dalga biçimi) kontrol edildi, kulakla değil.

## Kaynaklar

- Premiere Pro deneme sürümü (7 gün, sonra ücretli üyelik, macOS/Windows):
  <https://www.adobe.com/cc-shared/fragments/faqs/premiere-pro-free-trial>
- Premiere Pro anahtar kare:
  <https://helpx.adobe.com/premiere/desktop/add-video-effects/control-effects-and-transitions-using-keyframes/add-keyframes.html>
- Premiere Pro Effect Controls ile katman canlandırma:
  <https://helpx.adobe.com/premiere/desktop/add-text-images/insert-images-and-graphics/animate-layers-using-the-effect-controls-panel.html>
- CapCut PC anahtar kare rehberi:
  <https://www.capcut.com/resource/how-to-add-keyframes-in-capcut>
- CapCut Windows ve Mac indirme sayfaları:
  <https://capcut.com/resource/capcut-for-windows>,
  <https://capcut.com/resource/download-capcut-for-mac>
- Blender sürümleri: <https://download.blender.org/release/Blender5.2/>
- Krita indirme (kararlı sürüm 5.3.4.1): <https://krita.org/en/download/>,
  dosyalar: <https://download.kde.org/stable/krita/5.3.4.1/>
- Krita komut satırı (`--export`, `--export-sequence`):
  <https://docs.krita.org/en/reference_manual/linux_command_line.html>
- Krita ile animasyon: <https://docs.krita.org/en/user_manual/animation.html>
- Krita animasyon dışa aktarma:
  <https://docs.krita.org/en/reference_manual/render_animation.html>
- Inkscape 1.4.4: <https://inkscape.org/release/>; resmî kararlı PPA:
  <https://launchpad.net/~inkscape.dev/+archive/ubuntu/stable>
- GIMP 3.2.6: <https://download.gimp.org/gimp/v3.2/linux/>
- Kdenlive 26.08.2: <https://download.kde.org/stable/kdenlive/26.08/linux/>
- Tahoma2D sürümleri: <https://github.com/tahoma2d/tahoma2d/releases>
- Synfig sürümleri: <https://github.com/synfig/synfig/releases>
- Countryball kuralları: <https://en.wikipedia.org/wiki/Rules_of_Countryballs>
- Türk bayrağı ölçüleri: <https://en.wikipedia.org/wiki/Flag_of_Turkey>
- Union Jack ölçü ve renkleri: <https://en.wikipedia.org/wiki/Union_Jack>
- Kişi başı çay tüketimi (Türkiye 3,16 kg, İngiltere 1,94 kg, 2016):
  <https://www.statista.com/statistics/507950/global-per-capita-tea-consumption-by-country/>,
  <https://en.wikipedia.org/wiki/Tea_in_Turkey>
- Yazı tipi: Baloo 2, SIL Open Font License (Google Fonts deposu).
