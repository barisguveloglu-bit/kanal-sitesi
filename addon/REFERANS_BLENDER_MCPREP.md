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

## v7.99.9 — film aracı: `arac/blender_film.py`

Kullanıcı: *"Blender ve MCprep ile animasyonlarımızı destekle… dövüş
fikrini anlatacağım, animasyonu sen yapacaksın."* Yani **B yolu da
açıldı**: oyun içi çekimin (A) yanında, sanal makinede Blender ile
çizilen film.

Senaryo bir JSON: aktörler (skin, isim, silah, dövüş seti, yer),
zamanlı olaylar (`git`, `vur` oto/kosu/hava, `savun`, `kacin`,
`bak`, `soyle`, `anlat`, `baslik`) ve kamera atışları (oyundaki
sekiz açının aynısı, yumuşak geçişli). Çıktı altyazılı `film.mp4`.

**Oyunla aynı kurallar:** vuruş seçimi, hamle izi, temas anları,
savunma (önden) ve darbe tepkisi `cekim.js` ile aynı mantıkta; poz
`bedrock_onizleme.py`'nin ölçülmüş kuralı; veri `wom_kilic.hareket.json`.
Aynı senaryo her seferinde aynı filmi verir. `test/blender_film.mjs`
zaman çizelgesini Blender'sız sınıyor (üç mutasyonla ısırdığı görüldü).

**Oyunda olmayan ama burada olan:** vuruşa `"hiz": 0.5` → ağır çekim;
bitirici vuruşta kamera sarsıntısı; kıvılcım parçacıkları; gökyüzü
(Nishita) ve güneş gölgesi; MCprep'in blok dokularıyla çimen ve ağaç.

**Ölçülen süre (4 çekirdek, 15 GB):** Cycles CPU, 1280×720, 16 örnek
+ gürültü giderme ≈ 6–10 sn/kare. 10 sn'lik sahne (240 kare) ≈ 30–40
dk. `--onizleme` yarım çözünürlük ve 6 örnekle ≈ 2,4 sn/kare.
EEVEE yazılım sürücüsüyle (Mesa llvmpipe) çalışıyor ama Cycles'tan
yavaş (9 sn/kare) — kullanılmıyor.

**Renk:** Blender'ın varsayılan AgX görünümü Minecraft renklerini
soldurdu (çimen beyaz çıktı); `Standard` + pozlama −0,45. Çimen ve
yaprak dokuları gri tonlu (oyun biyom rengiyle boyar): Blender 5.2'de
karışım düğümü rengi tutmadı, doku önceden boyanıyor (`boyali_doku`).

```sh
MCPREP_DOKU=.../mcprep_default/assets/minecraft/textures/block \
blender -b -P addon/arac/blender_film.py -- senaryo.json cikti/ [--onizleme] [--kare N]
python3 addon/arac/blender_film.py -- x cikti/ --yazi     # altyazı + mp4
```

Ses yok: Minecraft sesleri MCprep'te yok, depoya da alınamaz. Müzik ve
efekt sesi CapCut'ta ekleniyor.
