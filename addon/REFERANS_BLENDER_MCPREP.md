# Blender 5.2.2 ve MCprep 3.6.3 — sanal makinede incelendi

Kullanıcı iki bağlantı verdi (blender.org, theduckcow.com/MCprep) ve
dosyaların Drive'ında olduğunu, 30 MB sınırını aştığını söyledi.
Drive'da ikisi de **bulunamadı** (arama boş döndü; son dosyalar arasında
yoklar — yükleme bitmemiş olabilir). Aynı sürümler **resmi
kaynaklardan** indirildi; depoya hiçbiri girmedi.

| | Blender | MCprep |
|---|---|---|
| sürüm | 5.2.2 LTS (2026-09-15) | 3.6.3 (2026-07-11) |
| kaynak | download.blender.org, Linux x64 | GitHub `Moo-Ack-Productions/MCprep` sürüm paketi |
| boyut | 383 MB indirme, 1,2 GB açık | 36 MB zip, 205 MB açık |
| doğrulama | SHA-256 resmî listeyle **aynı** (`84098912…a168`) | md5 `22e6ac75cb2d48fed2cfa4be752af1a7` |
| lisans | GPL | GPL-3.0-or-later |

Hile dosyası olmadıkları için "çalıştırma" kuralı onlara uymuyor:
Blender sanal makinede **ekransız** (`blender -b`) çalıştırıldı.

## MCprep ne getiriyor

Blender eklentisi; Minecraft animasyonu ve render için:

- **Oyuncu iskeletleri:** FancyFeet v2.6.0 (normal, ince kol, zırhlı),
  Simple Rig, Story Mode Jesse, VMcomix v2.
- **58 mob iskeleti** (Warden, Enderman, Creeper, köylüler, Iron Golem…).
- Skin değiştirme, malzeme hazırlama (Minecraft dokularını keskin
  pikselle), animasyonlu dokular.
- **Efektler:** TNT patlaması, parçacık, hava durumu (geometry nodes),
  gökyüzü (bulut, güneş, ay).
- Dünya içe aktarma: jmc2obj/Mineways OBJ'si — ikisi de **Java**
  dünyası okuyor. Bedrock dünyası için önce Java'ya çevirmek gerekir.

## Bize ne yaradı

**Seçilen yol A** (oyun içi çekim). Blender + MCprep **B yolu**
(ayrı programda render): bilgisayar ister, Java dokularıyla çalışır.
O yüzden çekimi değiştirmiyor. Ama sanal makinede çalışması başka bir
kapı açtı:

**`arac/bedrock_onizleme.py` — oyuna girmeden bakmak.** Bizim Bedrock
modelimizi (geo + doku), animasyonun istenen anındaki pozunu ve
attachable'ları (elde tutulan silah) Blender'da kuruyor, Cycles ile
çiziyor. Poz kuralı `wom_dogrula.py`'deki Epic Fight'a karşı ölçülmüş
kural. İlk kullanımı: **Karanlık Tırpan'ın elde duruşu** — o güne
kadar tahmindi.

- Çıkan şey: tutuş Antitheus'unkinden farklıydı. WoM'un
  `models/item/antitheus.json` ayarları (dönüş [90,0,0], öteleme
  [7.5,−9.5,8.3] px) eli bıçağa yakın, sapın uzun kısmını elin
  **arkasına** koyuyor. Tırpan buna göre düzeltildi (önde 20 px,
  arkada 26 px) ve dört poz (bekleme, kombo 1, kombo 4, giyotin)
  çizilip bakıldı.
- `test/onizleme.mjs` aracın Blender gerektirmeyen hesap kısmını
  sınıyor (x-ters çevrim, attachable bağlantısı, kutu UV).

```sh
blender -b -P addon/arac/bedrock_onizleme.py -- sahne.json cikti.png
```

Blender depoda değil (1,2 GB). Gerekince resmi siteden indirilir,
SHA-256'sı resmi listeyle karşılaştırılır.

## Kullanıcı bilgisayarda Blender kullanmak isterse

MCprep'in iskeletleri ve efektleri B yolunun en güçlü aracı:
YouTube kapak görseli, oyun içinde yapılamayan ağır çekim ve ışık
için. Kurulum: Blender → Düzen → Tercihler → Eklentiler →
"Diskten yükle" → `MCprep_addon_3.6.3.zip`. Bunun için bilgisayar
gerekiyor; telefonda çalışmaz.
