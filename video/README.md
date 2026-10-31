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
| CapCut PC | Senin bilgisayarın (Windows/macOS) | Ücretsiz, bazı özellikler Pro | Hızlı kurgu, altyazı, Shorts |
| Premiere Pro | Senin bilgisayarın (Windows/macOS) | Ücretli (7 günlük deneme) | Çok katmanlı, uzun kurgu |

CapCut PC ve Premiere Pro'yu bulut makinesine kurmak mümkün değil. İkisi de
yalnızca Windows ve macOS'ta çalışıyor ve ekran başında kullanılan
programlar. Premiere Pro lisanslı bir ürün; deneme sürümü 7 gün sonra
iptal edilmezse otomatik olarak ücretli üyeliğe dönüşüyor. Bu ikisi senin
bilgisayarında durur. Bulut makinesindeki zincir ise onların doğrudan
açabileceği dosyaları üretir: saydam PNG, SVG, WAV ve MP4.

## Hızlı başlangıç

```bash
bash video/kur.sh                 # ffmpeg, pycairo, Baloo 2 yazı tipi, Blender
python3 video/bolum01.py          # deneme videosu + ses katmanları + kit
python3 video/bolum01.py --hizli  # yarım çözünürlükte hızlı önizleme
python3 video/bolum01.py --kare 13.6   # tek kare kontrolü
python3 video/uc_boyut.py         # 3D Türkiye topu (Blender, Cycles CPU)
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
| `kur.sh` | Kurulum (Blender'ı resmî SHA-256 değeriyle doğrular) |

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
- Countryball kuralları: <https://en.wikipedia.org/wiki/Rules_of_Countryballs>
- Türk bayrağı ölçüleri: <https://en.wikipedia.org/wiki/Flag_of_Turkey>
- Union Jack ölçü ve renkleri: <https://en.wikipedia.org/wiki/Union_Jack>
- Kişi başı çay tüketimi (Türkiye 3,16 kg, İngiltere 1,94 kg, 2016):
  <https://www.statista.com/statistics/507950/global-per-capita-tea-consumption-by-country/>,
  <https://en.wikipedia.org/wiki/Tea_in_Turkey>
- Yazı tipi: Baloo 2, SIL Open Font License (Google Fonts deposu).
