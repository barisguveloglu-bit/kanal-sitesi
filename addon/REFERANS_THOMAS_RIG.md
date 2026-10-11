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

## İlk önizleme

Çarpık skin, karanlık oda, sağ göz kapalı (`iUI_Blink.r = −0,052`), sol göz
açık, `2_Color1/2` kırmızı, `2_Emission = 6`: kırmızı ışıyan göz bebeği, kapalı
gözde skinin pikselleri. 48 örnek, 640×640 — kullanıcıya gösterildi, onay
bekliyor. Betik: çalışma kopyası scratchpad'de; filme bağlanırken
`addon/arac/` altına düzgün araç olarak yazılır.
