# Thomas Rig Legacy — göz sistemi (ölçüldü, 2026-10-11)

Kullanıcının kararı: *"göz sahneleri için yapalım … yanak kızarıklığı falan
olmasın … artık gözlerimiz o şekilde olacak"*. İskeletten **yalnız göz
sistemi** kullanılır (yuva, kapak, göz bebeği, ışıma). Yanak kızarıklığı,
kirpik, kan lekesi gibi yüz süsleri kullanılmaz.

## Künye

| | |
|---|---|
| ad | Thomas Rig Legacy 1.2.8 (Blender eklentisi) |
| yapan | BlueEvilGFX — Thomas Animation'ın *Thomas Rig*'inin izinli düzenlemesi |
| kaynak | <https://extensions.blender.org/add-ons/thomas-rig-legacy/> |
| dosya | `add-on-thomas-rig-legacy-v1.2.8.zip`, 10.605.168 bayt |
| SHA-256 | `9a3e7a31cb7fedeb7ed71bc6295e682dcc0c129f1b65c7de04c0dd34295469fe` (sitenin verdiğiyle eşleşti) |
| lisans | GPL-3.0-or-later (`blender_manifest.toml`) |
| uyum | Blender 4.2+; bizim 5.2.2'de açıldı ve çizildi |

**Depoya girmez.** Pakette Mojang dosyaları var (`textures/Steve-base.png`,
`armor/textures/vanilla/*`, oyunun .jar'ından doku okuma). Bunlar kullanılmaz;
iskelet bizim skinlerimizle çalışır. Gerekince çizim makinesine resmî siteden
indirilir, SHA-256 ile doğrulanır (Blender/MCprep gibi).

**Güvenlik:** `.blend` betikleri çalıştırılmadan açıldı
(`--disable-autoexec`, `use_scripts=False`). Göz sürücülerinin hepsi basit
ifade (`PYTHON_SURUCU 0`) — betik izni olmadan da çalışıyor.

## Ölçülenler

- İskelet nesnesi `Thomas_rig`; kafa `Head_NoDeform` 0,48 birim (8 px → 0,06/px),
  merkez (0, 0, 1,68); yüz **−Y**'ye bakıyor. Gözler (0, −0,232, 1,672).
- **Gerçek göz yuvası:** `Main_Properties["Full rigged face"] = 1` → `Head_Deform`
  (Boolean ile oyulmuş yuvalar) çizilir; `Eyes` nesnesi yuvalara oturur.
- **Göz kapağı:** `iUI_Blink.L` / `iUI_Blink.r` yerel **Y** ekseninde
  **±0,052** (LIMIT_LOCATION). **−0,052 = tam kapalı**, 0 = normal,
  +0,052 = iyice açık. TRANSFORM kısıtı bunu `L/R.Eye_blink`'e (±0,1) aktarıyor.
- **Göz malzemesi** (`Eyes` düğüm grubu): her göz için `*_Color1`, `*_Color2`,
  `*_Pupil`, `*_Reflection`, `*_EyeSC`, `*_RimSize`, **`*_Emission`** (ışıma).
  `2_` = **karakterin SOL gözü** (`iUI_Blink.L`).
- Üç giriş **sürücülü** — elle yazılan değer ezilir, `Main_Properties`'ten
  verilir: `"Different eyes colour"` (iki göz ayrı renk), `"Eye type"`,
  `"Eye texture type"`.
- Skin: `bpy.data.images["Steve"]` yolunu bizim PNG'mize çevirip yeniden yüklemek
  yetiyor.
- Kontrol paneli ve kemik şekilleri çizilmesin: yalnız `Mesh` ve
  `Rig [only append this]` koleksiyonları çizilir, `FacePanel` gizlenir.

## Hangi kontrol ne yapar — denenerek ölçüldü (34 kılavuz çizimi)

Kılavuz sayfaları: `scratchpad/thomas/kilavuz*/goz_kilavuz*.png` (kullanıcıya
gösterildi). "Çalışmadı" yazan satırlar da ölçüm — bir daha denenmesin.

| kontrol | nerede | ne yapar | ölçülen |
|---|---|---|---|
| göz türü | `Main_Properties["Eye type"]` | **1** = gerçekçi göz (beyaz, iki renkli iris kenarı, koyu bebek, yansıma noktası); **0** = tek renkli düz göz (`*_EyeSC`); **2** = doku deseni | 3 → 2'nin 0. deseniyle aynı (geçersiz, kullanma) |
| desen | `Main_Properties["Eye texture type"]` (yalnız tip 2) | `eyes.jpg` atlası: 4 desen (üst sıra) + yansıma maskeleri (alt sıra); `*_EyeSC` ile boyanır | 0 = yumuşak çerçeveli bebek, 1 = vurgulu kare bebek, 2 = bulanık bulut, 3 = yuvarlatılmış bebek |
| iki ayrı göz | `Main_Properties["Different eyes colour"]` | `2_*` girişleri **karakterin sol gözüne** uygulanır | sürücülü — malzemeye elle yazılırsa ezilir |
| iris rengi | `*_Color1` (üst), `*_Color2` (alt) | iris kenarının iki tonu | yeşil denendi, çalışıyor |
| bebek / yansıma | `*_Pupil`, `*_Reflection` | bebek rengi, yansıma noktası rengi | |
| bebek boyutu | **`*_RimSize`** | büyüdükçe renkli kenar daralır, bebek büyür | 2,5'te kenar kayboluyor. `Pupils_controller` ölçeği **çalışmadı** |
| ışıma | `*_Emission` | gözün kendi rengiyle ışık | 3 hafif, 6 belirgin, **15 güçlü (kırmızı kalıyor)**, 30 iris pembe-beyaza döner |
| ışık yayılması | `Blow_Out` (tamsayı) | hâlenin genişliği | 1 dar, 12 geniş |
| yüzey | `Roughness` | parlaklık | |
| bakış (bebek) | `Eye.L` / `Eye.R` konumu | **Y = yukarı/aşağı**; **Z = sağ/sol, iki gözde ters işaret** (L z −, R z + → ekranın sağına bakar) | sınır: L y ±0,1 z −0,15…0,05; R y ±0,1 z −0,05…0,15. `Pupils_controller.001` **çalışmadı** |
| göz kapağı | `iUI_Blink.L` / `iUI_Blink.r` Y | −0,052 kapalı, −0,026 yarı, 0 normal, +0,052 iyice açık | tek göz ayrı |
| göz yüksekliği | `Eyes_UP_DOWN` Y | iki göz birlikte yüzde kayar | −0,184…+0,11; skinin boyalı gözü yerinde kalır — skin gözsüzse temiz. **Oran (2026-11-07, Blender'da `Eyes` z'si):** kemik −0,06 → göz 0,036 iner; 1 piksel (0,06) = kemikte 0,1. Gözü 4. satırda olmayan skinde (Ömer: 5. satır) Thomas gözü oraya indirilir (`goz.satir`), yoksa dört göz. Göz ~0,9 px boyunda, boyalı gözü tam örtmez: film Thomas kafasının skin kopyasında boyalı gözleri tenle siler (`boyali_gozler`) |
| göz şekli | her gözde 8 kol: `Bone.011…026, .035` (`CS_Eye_1…8.L/R`) | göz kapağı hattını büker (kızgın, kısık, şaşkın) | kol 1 = üst köşe, kol 2 = üst kapağın kavisi |
| bakış takibi | `Main_Properties["Eyes tracker"]`, `EyesTracker` (IK) | gözler bir hedefi izler | varsayılan açık; ayrıca denenmedi |
| kaşlar | `Eyebrow_control*`, `L/R.Eyebrow_*` | kaş yüksekliği, bükme, germe | kullanıcı yalnız göz istedi — kullanılmıyor |

Kullanılmayanlar (kullanıcının kararı): yanak kızarıklığı (`blush`), kirpik
(`eye_lashes`), kan lekesi. **Ağız artık kullanılıyor** (aşağıda, 2026-11-02).

## Ağız (ölçüldü, 2026-11-02)

Kullanıcı: *"Thomas Rig Legacy kullan, onda ağız da var."* İskeletin ağzı
3B: kafa örgüsünde şekil anahtarları (`Jaw`, `SmoothMouth`, `SquareMouth`,
`RoundMouth`, `square_round`…), ayrı `Top_teeth` / `Bottom_teeth` (`TeethGap`
şekil anahtarıyla) ve `Tongue`. Göz gibi `Full rigged face = 1` ister.
Ölçüm sahnesi: `scratchpad/thomas_agiz/kilavuz.py` (16 + 3×12 çizim, Ömer,
Barış, Zisa skinleri; kullanıcıya gösterildi).

| kontrol | sınır | ne yapar (ölçülen) |
|---|---|---|
| `iUI_MouthController` konum **y** | −0,2448 … +0,0848 | eksi = ağız açılır (−0,12 orta, alt dişler; −0,24 ardına kadar, dişler ve dil); artı = kapalı |
| `iUI_MouthController` konum **x** | ±0,1648 | eksi = küçük yuvarlak "o" (büzük), artı = ince geniş ağız |
| `iUI_MouthController` dönüş **Z** | — | eksi = gülümseme (köşeler yukarı), artı = somurtma. **X ve Y dönüşü etkisiz** (denendi) |
| `iUI_RoundMouth` y | 0 … 0,105 | açık ağız yuvarlak dikdörtgen (O); kapalıyken görünmez |
| `iUI_SmoothMouth` y | 0 … 0,105 | açık ağız yumuşak mercek biçimi |
| `iUI_SquarreMouth` y | 0 … 0,105 | açık ağız köşeli; kapalıyken görünmez |
| `iUI_TeethGap` y | 0 … 0,105 | iki ön diş arası açılır |

Sürücüler basit ifade (`abs(var)*10`) — betik izni olmadan çalışıyor.
Dişler ve dil `noface` sürücüsüyle gizlenip gösteriliyor; film yalnız ağız
açıkken (aktörde `"agiz"`) onları çizer, 1. bölümün göz planları değişmez.

**Ağız şekilleri → kontroller** (`arac/agiz.py` `THOMAS_AGIZ`, üç skinde
çizildi): X kapalı · A (M/B/P) y +0,06 · B x 0,07 y −0,05 · C y −0,12 ·
D y −0,2448 · E (O) x −0,07 y −0,14 + yuvarlak 0,105 · F (U) x −0,1648 y −0,08 ·
G (F/V) x 0,05 y −0,04 + kare 0,06 · H (L) y −0,15 + yumuşak 0,105 ·
gülümse x 0,04 y −0,035 Z −0,6 (kapalı ağızla gülümseme **görünmüyordu**,
azıcık aralık) · sırıt x 0,12 y −0,08 Z −0,6 · kahkaha x 0,08 y −0,22 Z −0,5.
Şekil kareye göre **anında** değişir (anahtarlar CONSTANT; göz anahtarları
yumuşak kalır). Thomas planlarında bizim kafa gizli olduğundan doku ağzı da
gizlenir.

## İlk önizleme

Çarpık skin, karanlık oda, sağ göz kapalı (`iUI_Blink.r = −0,052`), sol göz
açık, `2_Color1/2` kırmızı, `2_Emission = 6`: kırmızı ışıyan göz bebeği, kapalı
gözde skinin pikselleri. 48 örnek, 640×640. Kullanıcı: *"bayağı havalı
görünüyor"*, **ışıma daha güçlü olsun** → 15 / 15 + Blow Out 12 / 30 + Blow Out 12
karşılaştırması gösterildi. **Seçim (kullanıcı, 2026-10-11): `*_Emission = 30`
+ `Blow_Out = 12`** — en güçlü ışıma, en geniş hâle. 30'da irisin pembe-beyaza
kaydığı karşılaştırmada gösterilmişti; bilinerek seçildi, "düzeltilecek renk"
değil.

## Filme bağlantı — `arac/thomas_goz.py` (v7.99.13)

Senaryo:

```json
"aktorler": {"b": {"skin": "...", "goz": {"kalip": "kirmizi", "sag": {"isima": 0}}}},
"kamera":   [{"t": 6.0, "aci": "elle", "goz": "thomas"}],
"olaylar":  [{"t": 6.2, "aktor": "b", "goz_kapak": {"sag": -1, "sol": 0.4}, "sure": 0.2},
             {"t": 7.0, "aktor": "b", "goz_bakis": [0.5, 0], "sure": 0.3}]
```

- `goz` ayarı olan aktöre Thomas kafası kurulur; yalnız `goz: "thomas"`
  olan planlarda görünür, öteki planlarda bizim kafamız (*"bir o bir o"*).
  Plan seçimi `kamera_izi` ile aynı kural.
- `kalip: "kirmizi"` = kullanıcının seçtiği ayar (iris kırmızı, Emission
  30, Blow Out 12). Anahtarlar: `iris`, `iris2`, `bebek`, `sc`, `yansima`,
  `isima`, `bebek_boyu`, `yayilma`; `sol`/`sag` yalnız o göze.
- Kapak −1…1 → `iUI_Blink` ±0,052; bakış −1…1 → `Eye.L/R` ±0,1, ölçülen
  sınırlarda kırpılır.
- `kalip: "mavi"` = Barış'ın kendi gözü (kullanıcının fotoğrafındaki göz,
  sRGB 140, 209, 255 → doğrusal 0,262 / 0,638 / 1,0), ışımasız. Tek göze
  ayrı kalıp verilebilir: `"sag": {"kalip": "mavi"}` (v7.99.14) — formda
  bir göz kırmızı, öteki Barış'ın kendi gözü.
- Yalnız `Head_Deform`/`Head_NoDeform` (seçimi iskeletin sürücüsü yapar) ve
  `Eyes` çizilir; gövde, kol, kaş, diş, dil, katman çıkıntıları gizli.
- Plan dışında iskelet **uzağa taşınır**, gizlenmez: kafa nesnelerinin
  görünürlüğü sürücülü, anahtar sürücüyle çakışırdı.
- **Hizalama:** iskeletin dinlenme kafası (0,48 birim) bizim kafaya (0,5)
  ölçeklenip yüz yönüne döndürülür. Yüz yönü **kafa merkezinden yüz
  dokusunun ortasına** alınır, yüzey normalinden değil: bizim küpler ters
  sarılı, normal içe bakıyor — ilk denemede kafa 180° ters oturdu.
- `arac_kur.sh` iskeleti resmî siteden indirir, SHA-256 ile doğrular,
  yalnız `assets/rigs/Thomas Rig Legacy.blend`'i açar (`THOMAS_RIG`).
- `test/goz_thomas.mjs` Blender'sız kısmı kilitliyor.

## Açık bulgu — bizim film aracı skinleri aynalıyor

Aynı skin (çarpık) üç iskelette önden çizildi: Thomas Rig ve MCprep'in
*Simple Rig*'i (iki bağımsız Minecraft iskeleti) yüz dokusunu **dosyadaki
gibi** gösteriyor; bizim film aracı **yatay ayna**. Kaynak
`bedrock_onizleme.kupler`: iç uzayda x ters, UV köşe ataması düz
(docstring bunu zaten "bir ayna kadar sapabilir" diye yazıyordu).
1. bölüm (Part 1 + 2) bu hâliyle çizildi. Düzeltme 2. bölümden itibaren
önerildi; **karar kullanıcının** (1. bölümle süreklilik). Düzeltilmeden
önce aynı filmde Thomas planı ile bizim plan arasında yüz aynalanır.
