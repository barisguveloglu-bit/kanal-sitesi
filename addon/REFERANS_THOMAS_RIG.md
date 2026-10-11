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
| göz yüksekliği | `Eyes_UP_DOWN` Y | iki göz birlikte yüzde kayar | −0,184…+0,11; skinin boyalı gözü yerinde kalır — skin gözsüzse temiz |
| göz şekli | her gözde 8 kol: `Bone.011…026, .035` (`CS_Eye_1…8.L/R`) | göz kapağı hattını büker (kızgın, kısık, şaşkın) | kol 1 = üst köşe, kol 2 = üst kapağın kavisi |
| bakış takibi | `Main_Properties["Eyes tracker"]`, `EyesTracker` (IK) | gözler bir hedefi izler | varsayılan açık; ayrıca denenmedi |
| kaşlar | `Eyebrow_control*`, `L/R.Eyebrow_*` | kaş yüksekliği, bükme, germe | kullanıcı yalnız göz istedi — kullanılmıyor |

Kullanılmayanlar (kullanıcının kararı): yanak kızarıklığı (`blush`), kirpik
(`eye_lashes`), kan lekesi, ağız şekilleri.

## İlk önizleme

Çarpık skin, karanlık oda, sağ göz kapalı (`iUI_Blink.r = −0,052`), sol göz
açık, `2_Color1/2` kırmızı, `2_Emission = 6`: kırmızı ışıyan göz bebeği, kapalı
gözde skinin pikselleri. 48 örnek, 640×640. Kullanıcı: *"bayağı havalı
görünüyor"*, **ışıma daha güçlü olsun** → 15 / 15 + Blow Out 12 / 30 + Blow Out 12
karşılaştırması gösterildi, seçim bekleniyor. Betik: çalışma kopyası scratchpad'de; filme bağlanırken
`addon/arac/` altına düzgün araç olarak yazılır.
