# Referans — Blockbuster / Metamorph (McHorse)

Kullanıcının gönderdiği jar: `blockbuster 2.7.3-1.20.4` (Fabric).
İçinde dört mod birden var: **Blockbuster**, **Metamorph**, **MCLib**,
**Aperture**, **Chameleon**. GPL-3.0, kaynak `github.com/mchorse/blockbuster`
(ama bu jar 1.12.2'nin **1.20.4 portu**, McHorse'un deposunda o hâli yok).

Jar açıldı, **1529 sınıf CFR ile çözüldü**. Aşağıdakiler okunarak
çıkarıldı, hatırlanarak değil.

> Bu dosya bir **arşiv**. Şu an sadece "Duruş" sistemi alındı (v7.4);
> geri kalanı burada duruyor ki bir daha jar'ı açmak gerekmesin.

## Veri modeli

### `Model` — `assets/blockbuster/models/entity/steve.json`

```
scheme  "1.3"        texture [64,32]     scale [0.9375,…]
default "…/actor.png"
limbs   { ad: ModelLimb }
poses   { ad: ModelPose }
```

Yerleşik modeller: `steve`, `alex`, `fred` (+ `_3d` hâlleri), `cape`,
`empty`. Kullanıcı modelleri `config/blockbuster/models/<ad>/` altına,
skinler `skins/*.png` olarak konuyor.

### `ModelLimb` (`mchorse.blockbuster.api.ModelLimb`)

| alan | ne |
|---|---|
| `size` `[4,12,4]` | kutu boyutu |
| `texture` `[40,16]` | uv köşesi |
| `anchor` `[.5,.1666,.5]` | kutunun **içindeki** dönme noktası (0–1) |
| `origin`, `parent`, `mirror` | yerleşim |
| `slot` | zırhın hangi parçası buraya çizilecek — `head`, `chest`, `left_shoulder`, `right_shoulder`, `leggings`, `left_leg`, `right_leg`, `left_foot`, `right_foot` |
| `holding` | `NONE` / `RIGHT` / `LEFT` — eşya bu uzuvda durur |
| davranış bayrakları | `looking` `lookX` `lookY` `swinging` `swiping` `idle` `invert` `wheel` `wing` `roll` `cape` |
| görünüm | `color` `opacity` `lighting` `shading` `smooth` `is3D` `specular` |

### `ModelPose` + `ModelTransform`

```
ModelPose      size [0.6,1.8,0.6]      // çarpışma kutusu
               limbs { ad: ModelTransform }
ModelTransform translate / rotate / scale
```

**Dönüş sırası `MatrixUtils.RotationOrder.XYZ`** — bizim v7.3'te
Bedrock için ölçtüğümüz sırayla aynı.

Yerleşik duruşlar: `standing` `sneaking` `flying` `riding` `sleeping`
`sitting` `lying` `dabbing` `t_pose`.

### Duruş seçimi — `EntityUtils.getPose`

```java
if (!custom.isEmpty() && !sneak) return custom;   // özel duruş her şeyi ezer
if (entity.isFallFlying())      return "flying";
if (entity.isPassenger())       return "riding";
if (entity.isShiftKeyDown())    return sneak && !empty ? custom : "sneaking";
return "standing";
```

`currentPoseOnSneak` bayrağı: özel duruş **sadece sinsiyken** uygulanır.

### `CustomMorph` — bir "görünüş"

```
model  +  skin(ResourceLocation)  +  currentPose  +  currentPoseOnSneak
       +  scale  +  materials{}  +  animation(PoseAnimation)
       +  parts(BodyPartManager)
```

### `BodyPart` — **uzuv ekleme** (`mchorse.metamorph.bodypart.BodyPart`)

Bir uzva **başka bir görünüş** takılıyor:

```
morph      takılacak görünüş
limb       hangi kemiğe
translate / scale / rotate   (rotate varsayılanı [180,0,0])
slots[6]   kendi zırh/el eşyaları
enabled / animate / useTarget
```

Kullanıcının "bir kol mu ekleyeceğim" dediği şey bu.

## Bedrock'ta ne olur, ne olmaz

| Blockbuster | Bizde |
|---|---|
| `Model.limbs` | `.geo.json` kemikleri — `kol_uret.py` üretiyor |
| skin (model başına png) | doku; oyuncunun kendi derisi ise `Texture.default` |
| `ModelPose` | **v7.4 `DURUSLAR`** — dönüş geometriye pişiriliyor |
| `getPose` önceliği | molang: `!query.is_gliding && !query.is_swimming` |
| `BodyPart` | oyuncu kemiğine bağlanan attachable (Kanlı Kol bunun kanıtı) |
| canlı poz düzenleyici (GUI) | **yok** — script molang'a yazamaz, tetik elde eşya |
| oyuncu kaydı / makinima / kamera | **yok** ve alınmayacak |
| `.obj` / `.vox` model yükleme | **yok** — Bedrock çalışma anında model yüklemiyor |

## Alınmayanlar (isteyince buradan devam edilir)

- **BodyPart**: bir satırla uzuv ekleme tablosu. Mekanizma kanıtlı
  (chris kolu `rightArm`/`leftArm`e adıyla bağlanıyor), tablo yok.
- `ModelLimb.slot` — hangi zırh parçasının hangi uzva çizileceği.
- `ModelLimb` davranış bayrakları (`wing`, `wheel`, `roll`, `cape`).
- Duruşlar arası **geçiş** (`PoseAnimation`, `Interpolation`).
- Aperture (kamera), recording (oyuncu kaydı), particles, green screen.
