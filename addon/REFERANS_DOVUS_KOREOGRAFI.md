# Dövüş koreografisi — araştırma notları (2026-11-04; iki tur)

Kullanıcı: *"dövüş koreografilerini araştır, yaklaşık 10 dakika boyunca uzun
uzun araştır, her birini kaydet."* Bağlam: dövüşler yalnız Epic Fight / WoM'dan
olmayacak, karakterlerin **kendi hamle setleri** yazılacak (SERI_SEZON1.md
"Dövüş tarzı", 2026-11-04).

**Bu belge yalnız ölçü ve fikir taşır.** Hiçbir filmin, oyunun ya da
animasyonun sahnesi, karakteri veya hareket dizisi kopyalanmaz (seri kuralı:
belli bir eserin yeniden yapımı yok). Kaynaklar çoğunlukla ikinci el
(yazarlar, okullar, oyun topluluğu); güvenilirliği her maddede yazılı.
Kullanıcı onaylamadıkça buradaki hiçbir şey seriye karar olarak geçmez.

Her bölümün sonunda **"Bizde"**: film aracına (`arac/blender_film.py`,
`arac/hareket.py`, `arac/film_poz.py`) ya da sezona nasıl uyar.

---

## 1. Dövüş bir hikâyedir: tırmanma, vuruş sırası, karakter

- **Dövüş değişmeli, tekrar etmemeli:** dövüşçü uyum sağlar, üstünlük el
  değiştirir, yeni bir taktik ortaya çıkar, bir zayıflık açığa çıkar. Dövüş
  küçük bir üç perdedir: neden başladı (kurulum), karşılıklı tırmanma
  (riskler artar), sonuç (kim, hangi bedelle kazandı). (Final Draft yazısı.)
- **Koreografi karakteri anlatır:** dövüş, karakterle tekniğin belli bir
  hikâyeyi anlatmak için harmanlanmasıdır. Eğitimli bir dövüşçüyle eğitimsiz
  birinin hareketi aynı olmaz.
- **Kurulum → darbe → toparlanma** her değişimin ritmi. Silah alma/düşürme
  ayrıca bir hikâye anıdır.
- **Mekân netliği (geography):** öldürme bölgesine ilerlemek tırmanma,
  güvenli bölgeye çekilmek çaresizliktir. Video yapım rehberi dört temel
  sayıyor: blok yerleşimi (blocking), akış, çeşitlilik, süreklilik.
- **Tempo karışık olmalı:** en çılgın kılıç dövüşünde bile karakterin nefes
  aldığı, durumu yeniden tarttığı anlar olur. Karakter dövüşten sonra bir şey
  hissetmiyorsa seyirci de hissetmez.

**Bizde:** onaylanmış yapı zaten bu mantıkta: beş mekân, yedi "düşünme anı"
(SERI_SEZON1.md "Baskın"). Düşünme anları tam olarak "durup yeniden tartma"
vuruşları. Her mekân değişimi bir üstünlük değişimi olmalı (ilk dördü öyle:
gedik → sokak → meydan → merdiven → lav). Yeni kural önerisi: her hamle setine
bir "karakter cümlesi" yazılsın (Pipos: sabırlı savunma, tek bitiriş; Barış:
yeni güç, ham ve öfkeli; Ice-man: soğuk, mesafeli, kontrolcü).

Kaynaklar: [Final Draft — fight scene](https://www.finaldraft.com/blog/how-to-write-a-fight-scene-in-a-screenplay) ·
[Videomaker — fight choreography](https://www.videomaker.com/how-to/planning/writing/fight-choreography-planning-and-shooting-your-fight-scenes/) ·
[Swan Tower — fight beats](https://www.swantower.com/2012/03/22/writing-fight-scenes-beats/) ·
[Académie Duello — storytelling](https://academieduello.com/?p=2656) ·
[PremiumBeat — intro](https://www.premiumbeat.com/blog/introduction-fight-scene-choreography/)

## 2. Jackie Chan — ortam, sahneleme, kamera sabrı

Kaynak Tony Zhou'nun *Every Frame a Painting* videosu ("How to Do Action
Comedy", 2014) ve onun hakkındaki yazılar (birinci el döküm bulunamadı).

- Her plan **bir sonraki hareketi kurar**; bir sahnede karenin üçte ikisi
  merdiven, oysa odak dublörlerde (mekân hareketin parçası).
- **Kamera hareketi az**: fiziksel inandırıcılık için kamera dövüşü
  "göstermeye" çalışır, sarsıntıyla örtmez.
- Blok yerleşimi ve kurgu, anlatıyı ve kişiliği **hemen** iletir.
- Eşya ve ortam kullanımı videonun konusu; ikinci el kaynaklar ayrıntısını
  vermiyor (doğrulanmadı).

**Bizde:** kullanıcının kendi kuralı aynı yönde: *"ortam direkt
kullanılacak"*, blok fırlatma, kırılan cam, merdiven, lav. Kamera denetimi
(`kamera_denetim.py`) zaten "kamera duvarda mı / biri öbürünü örtüyor mu"
diye bakıyor; buna "dövüş planında kamera sakin mi" sorusu eklenebilir
(öneri, yazılmadı).

Kaynaklar: [No Film School — 9 principles](https://nofilmschool.com/2014/12/jackie-chans-9-principles-action-comedy) ·
[MovieMaker](https://www.moviemaker.com/jackie-chan-action-comedy-video/amp/) ·
[Open Culture](https://openculture.com/2019/08/why-is-jackie-chan-the-king-of-action-comedy.html)

## 3. Animasyon ilkeleri: hazırlık, darbe karesi, sürükleme (smear), devam

- **Hazırlık (anticipation):** uzun ve abartılı bir hazırlık, gelen vuruşu
  daha güçlü hissettirir. **Devam (follow-through):** temastan sonraki
  hareket ağırlığı satar.
- **Darbe karesi (impact frame):** yumruğun hedefe ilk değdiği TEK an;
  hazırlıkta ya da devamda değil. Kamera vuruşu vurgulamak için kullanılır,
  kamera hareketi çoğu zaman animasyondan sonra eklenir.
- **Sürükleme karesi (smear):** gözün hızlı hareket diye okuduğu uzatılmış /
  bulanık kare; 1–2 kare, yalnız karakter iki kare arasında kendi boyundan
  fazla yol alıyorsa.
- Sakuga iş akışı: anahtar animatör anahtar kareleri çizer, ara kareleri
  başkaları doldurur. (Howard Wimshurst'un animatör gözüyle döküm videoları
  öneriliyor.)

**Bizde:** film pozları zaten anahtar kare (`film_poz.py`); akıcı katman
hazırlık/devam için yay ve taşma ekliyor (`takip_tasmasi`). Eksik olan iki
şey: (a) **darbe karesi vurgusu** (temas anında kısa ışık patlaması ya da
kameranın 1–2 kare sarsılması; `titreme` var, vuruşa bağlı değil), (b) blok
karakterde smear yerine **hareket izi** (Minecraft görünüşünü bozmadan
yarı saydam 1–2 kopya). İkisi de öneri.

Kaynaklar: [ART379 — anticipation/impacts](https://sites.google.com/view/art379/lessons/anticipation-impacts) ·
[Weight and impact in combat animation](https://mygamedesign-frontend.pages.dev/how-do-you-create-weight-and-impact-in-combat-animations) ·
[Sakuga yazısı](https://nihonnarratives.substack.com/p/sakuga-animation)

## 4. Oyun dövüşü: başlangıç–etkin–toparlanma kareleri, vuruş donması (hitstop)

- Hamle üç evre: **başlangıç (startup), etkin (active), toparlanma
  (recovery)**. Modern Street Fighter'da başlangıç ilk etkin kareyi de sayar
  (toplam = başlangıç + etkin + toparlanma − 1); eski oyunlarda ayrık.
- **Hitstop:** vuruş değince iki karakter de birkaç kare donar; ağır vuruşta
  daha uzun. Topluluk önerisi: 60 fps'te 1–4 kare ile başla, silaha göre
  büyüt; fazlası tepkiyi öldürür, azı darbeyi küçültür. Donma bitince saldıran
  kalan etkin karelerini bitirip toparlanmaya geçer (Capcom semineri).
- Sakurai'nin kendi tasarladığı Shoryuken tahmini: başlangıç 55, etkin 21,
  toparlanma 50 kare (Ryu'nunki ~6 kare başlangıç) — yani "hızlı" algısı
  başlangıç karesinden gelir.

**Bizde:** WoM verisi zaten temas anını taşıyor ("temas anı ve hamle izi
oyundaki WoM verisinden"). Kendi hamle setlerimizde **her hamleye üç sayı**
yazılmalı: başlangıç / temas / toparlanma (sn). Hitstop filmde 30 fps'te
1–2 kare olur (ağır vuruşta 3); `zaman_haritasi` zaten ağır çekim
yapabiliyor, vuruşa bağlı kısa donma eklemek küçük bir iş (öneri).

Kaynaklar: [Capcom SF Seminar](https://game.capcom.com/cfn/sfv/column/131545?lang=en) ·
[Automaton — Sakurai'nin Shoryuken'i](https://automaton-media.com/en/news/20231030-22645/) ·
[Fantasy Strike sözlüğü](https://wiki.gbl.gg/w/Fantasy_Strike/Glossary) ·
[combat-design notları (topluluk)](https://playbooks.com/skills/omer-metin/skills-for-antigravity/combat-design)

## 5. Element bükme ↔ gerçek dövüş sanatı (Avatar örneği, yalnız yöntem)

Avatar'ın danışmanı Sifu Kisu (Kuzey Shaolin ustası) her elementi gerçek bir
Çin dövüş sanatına bağladı; kaynaklar tutarlı:

- **Su → Tai Chi** (Yang ve Chen üslubu): akıcı, denetimli, yönlendiren.
- **Ateş → Kuzey Shaolin:** en saldırgan stil; uzun duruşlar, hızlı tekmeler.
- **Toprak → Hung Gar:** kök salmış derin duruşlar, sağlam ayak.
- **Hava → Bagua:** dönen, dairesel hareket.

**Yöntem (kopyalanacak şey bu, gösterinin kendisi değil):** büyü hareketini
gerçek bir dövüş sanatının mekaniğine dayandırmak, büyüye "ağırlık" verir.

**Bizde:** Barış'ın ateş büyüleri (Kıvılcım, Kor Yürüyüşü) için doğal taban
Kuzey Shaolin mekaniği (uzun, açık, saldırgan; kitaptaki "avucunu aç, nefesini
tut" cümlesiyle uyumlu). Ice-man'in buzu için kontrolcü, az hareketli bir
taban (Tai Chi benzeri yönlendirme) Barış'la iyi zıtlık kurar. Zisa'nın
koruma büyüsü dairesel ve kapsayıcı. Hepsi öneri; kullanıcı seçer.

Kaynaklar: [Wikipedia — World of Avatar](https://en.wikipedia.org/wiki/World_of_Avatar:_The_Last_Airbender) ·
[Looper — doğruluk](https://www.looper.com/961152/how-accurate-are-the-martial-arts-in-avatar-the-last-airbender) ·
[Martial Journal](https://www.martialjournal.com/the-martial-arts-in-avatar-the-last-airbender/) ·
[Sifu Kisu söyleşisi](https://sensobjj.com/blogs/graciemag-1/beyond-the-bending-with-sifu-kisu-martial-arts-consultant-for-avatar-the-last-airbender)

## 6. Kaplan stili — Hung Gar kaplan pençesi (Pipos'un Kaplan sanatı için)

- **Pençe:** vuran yüzey avuç, parmaklar tutmak ve çekmek için; hedef şakak,
  göz, boğaz (filmde yüze değmeden okunacak).
- **Aşağı inen hareket:** pençe yukarıdan aşağı iner, gücü belin dönüşünden
  alır.
- **Savunma ve karşı saldırı aynı anda:** önce bedeni geri çökerterek kaç,
  sonra öne dön: öndeki pençe saldırırken arkadaki pençe korur. "Bloğu
  bırak, hedefe git."
- **Derin, alçak duruşlar** (sei ping ma — at duruşu), köprü kol ve pençe
  stilin imzası.

**Bizde:** kullanıcının Kaplan sanatı kuralıyla bire bir örtüşüyor: *"savunma
önde ama ölçülü, her dövüş bir bitiriş saldırısıyla biter"* → "savunma ve
karşı saldırı aynı anda" ilkesi. Taslak `DOVUS_KAPLAN_SANATI.md` onay
bekliyor; bu bulgular ona girdi olabilir: (1) alçak at duruşu bekleme
pozu, (2) geri çökme + öne dönen pençe = temel karşı hamle, (3) bitiriş:
iki pençe birden aşağı. Tek parça Minecraft kolunda "pençe" yumruk yerine
**açık el** olarak okunmaz; kolun açısı ve bel dönüşü taşır.

Kaynaklar: [shaolin.org — kaplan kalıpları](https://shaolin.org/combat/tiger.html) ·
[shaolin.org — Kaplan-Turna seti](https://shaolin.org/general-2/wong-fei-hoong/wong-fei-hoong01.html) ·
[Practical Hung Kyun](https://practicalhungkyun.com/2013/03/principles-and-usage-of-hungry-tiger-catches-the-lamb/) ·
[Hung Gar (wiki)](https://wiki.riteme.site/wiki/Hung_Gar)

## 7. Silahlı yakın dövüş ("gun-fu") — çocukluk arkadaşının Ebony & Ivory'si için

- John Wick serisi yakın mesafe "gun-fu"yu öne çıkardı; Keanu Reeves ve
  dublör koordinatörleri bunu kendileri kurdu (2. film yapım videosu).
- **Center Axis Relock (CAR):** Jeff Castle'ın tabanca duruşu: derin, çapraz
  (geleneksel dövüş sanatlarına benzeyen) duruş, silah gövdeye yakın;
  dar alanda geri tepmeyi denetlemek ve silah çekişmesinde kaldıraç için.
  **Ama** CAR uzmanı Jeff Johnsgaard'a göre filmdeki aslında CAR değil:
  silah yüze yakın ve yana yatık tutuluyor.
- Filmin judo / jiu-jitsu ile kurulduğu iddiası güvenilir kaynakta
  bulunamadı (doğrulanmadı).

**Bizde:** iki tabancalı bir karakter için temel fikir: **silah gövdeye
yakın, yakın mesafede dövüşle iç içe** (vur, it, ateş et) — uzaktan nişan
alıp durmak değil. Kayıttaki karakter bilgisi (kraliyet büyüsü, asa yerine
iki tabanca) ile uyumlu. Mermi efekti ve tabanca hareketleri hâlâ plan
aşamasında (görev #34).

Kaynaklar: [GunMag — CAR ve John Wick](https://gunmagwarehouse.com/blog/center-axis-relock-john-wick/) ·
[CCW Safe — CAR](https://ccwsafe.com/news/the-center-axis-relock-shooting-technique) ·
[Den of Geek — John Wick'in etkisi](https://www.denofgeek.com/movies/movies-of-the-decade-how-john-wick-shook-up-hollywood-action-filmmaking/) ·
[ScreenCrush — gun-fu yapım videosu](https://screencrush.com/john-wick-2-gun-fu-featurette/)

## 8. Kamera: okunaklılık, plan süresi, "vuruştan önce kesme"

- **Hong Kong yaklaşımı (David Bordwell):** kadraj koreografiye göre
  ayarlanır, fırsatçı yakalanmaz. Hareketler okunaklı, keskin ve kesik
  (staccato); kompozisyon eylemi temiz verir. **Uzak plan yakından daha
  uzun tutulur.**
- **Sarsak kamera ve hızlı kurgu eleştirisi:** fazla yakın plan, az ana plan
  (master shot) → mekânın düzeni kaybolur; elde kamera dönüşü birçok sahneyi
  okunmaz yaptı.
- Jackie Chan'ın kuralı (forumda aktarılan): **vuruştan önce kesme.**
- Shaw Brothers dövüşleri plan plan kurulur; her açının kendi amacı vardır.
- Karşı örnek: Kore'nin *City of Violence*'ı uzun planları birbirine
  keserek bilinçli olarak "boğulmuş" bir his yaratıyor (okunaklılık yerine
  bunalma).
- 180° kuralı ve ekran coğrafyası için bu aramada kaynak çıkmadı (boşluk).

**Bizde:** film aracı zaten 180° kilidini tutuyor (`kamera_noktasi` "taraf",
`kamera_izi`) ve elle çekimler sabit. Kural önerisi dövüş çekimleri için:
(1) her mekânın başında bir **ana plan** (iki tarafı ve ortamı gösteren),
(2) uzak plan ≥ yakın planın iki katı süre, (3) **temas karesinden önce
kesme yok** — kesme temastan sonra ya da hareketin ortasında. Bunlar
`kamera_denetim.py`'ye ölçü olarak eklenebilir (öneri, yazılmadı).

Kaynaklar: [Bordwell — Bond vs Chan](https://www.davidbordwell.net/blog/2010/09/15/bond-vs-chan-jackie-shows-how-its-done/trackback/) ·
[Eric Jacobus — Hong Kong yolu / Kore yolu](https://ericjacobus.com/2011/11/30/ed-kahana-on-the-hong-kong-way-of-action-versus-the-korean-way/) ·
[NPR — iyi dövüş sahnesi](https://www.nprillinois.org/2025-09-14/what-makes-a-great-movie-fight-scene)

## 9. Sahne dövüşü (stage combat): vurulan yönetir, mesafe, ses (knap)

- **Vurulan (kurban) anı yönetir:** hamleyi o "satar"; tepki yanlışsa yanılsama
  bozulur. İtmede ve boğmada enerjiyi kurban denetler.
- **Mesafe:** temas edilecekmiş yanılsamasını veren ideal uzaklık; yüze
  yumruk başın birkaç parmak yanından geçer (SAFD sözlüğü).
- **Knap:** darbe sesi; neredeyse hiç gerçek temasla yapılmaz (kurban kendi
  bedenine vurur, seyircinin görmediği yandan).
- **Görüş açısı:** saldıran sahnenin gerisinde ve hafif açıyla; yanılsama
  seyircinin bakış açısından, saldıranın devamından ve **en çok kurbanın
  tepkisinden** gelir.

**Bizde:** animasyonda güvenlik derdi yok ama ders aynı: **vuruşu tepki
satar.** Film aracında darbe tepkisi var (yöne ve güce göre ırkilme, 0,4 sn)
— kendi setlerimizde her vuruşun yanında **vurulanın tepkisi de** yazılmalı
(geri sendeleme, dönme, düşme). Ses: temas sesi zaten temas karesine bağlı.

Kaynaklar: [SAFD sözlüğü](https://www.safd.org/media/5974/abridged-revised-safd-glossary_3.pdf) ·
[Robert Loerzel — fight choreography](https://www.robertloerzel.com/?p=1023) ·
[Upstage Review — pull your punches](https://www.upstagereview.org/post/pull-your-punches) ·
[Académie Duello — güvenlik](https://academieduello.com/?p=4118)

## 10. Yuen Woo-ping — ritim, duraklama, havada asılı kalma

- Hong Kong aksiyonu hızlar arasında gider ve **durgunluğu bir vuruş gibi**
  kullanır: hızlanır, yavaşlar, bazen durur. John Woo bunu dondurma ve ağır
  çekimle, Yuen Woo-ping halat işiyle (birini havada asılı tutarak) yaptı.
- MoMA: koreografisi **hareketin okunaklılığını, mekân netliğini ve
  anlatımcı geometriyi** kaba güce tercih eder.
- (İkincil) dövüşü olay örgüsünden, karakterden ve oyuncunun yeteneğinden
  kurar; ayrıntı için az kişili sahneleri sever.
- Donnie Yen: halat düşerken tutar ama **sağlam durduğunu gösteremez**
  (havada ağırlık yanılsamasının sınırı).

**Bizde:** iki aracımız tam bu iş için var: `zaman_haritasi` (ağır çekim,
duraklama) ve Minecraft fiziğiyle zıplama. Öneri: her dövüşte en az bir
**durgunluk vuruşu** (iki taraf da durur, nefes, göz göze; bizim "düşünme
anları" bunun yeri) ve en az bir **havada asılı an** (zıplamanın tepesinde
kısa ağır çekim — lav çukurundaki ağır çekim zaten onaylı).

Kaynaklar: [Yahoo — Man on wire](https://malaysia.news.yahoo.com/man-wire-yuen-woo-ping-110426102.html) ·
[MoMA retrospektifi](https://www.moma.org/calendar/film/5930) ·
[Martial Journal](https://www.martialjournal.com/yuen-woo-ping-shaping-narratives-one-sword-stroke-at-a-time/) ·
[Donnie Yen söyleşisi (2001)](https://www.bostonstreetlab.org/2008/08/21/interview-with-donnie-yen-2001/)

## 11. Büyük ordu sahnesi: okunaklılık hiyerarşisi

Film kaynağı az çıktı; oyun efektleri ve resim sanatından komşu kanıt:

- **Renk/ışık hiyerarşisi:** tek bir birincil niyet baskın olmalı (saldırı,
  işaret, kahraman hamlesi); geri kalan ikincil destek ve üçüncül ortam
  (moloz, atmosfer). (FF VII Eikon savaşları dökümü.)
- **Kahraman silueti göğe karşı net.**
- **Gri tonlama testi:** kareyi siyah-beyaza çevir; şekiller ayrılmıyorsa
  okunmaz.
- **Ölçek:** aşağıdaki uzak ordu küçük okunur; derinlik ipuçları ordu
  boyutuna göre planlanmalı.
- **Hava derinliği (Leonardo):** uzaktaki figürler açık zeminde koyu görünür,
  bacaklarının alt kısmı tozdan en az görünen yerdir.
- Uzaktaki odak, ön planı çerçeveye çevirmemeli.

**Bizde:** kullanıcı "bayağı büyük bir ordu" istedi; sur gediği sahnesinde
fırtına + kar + ordu var. Öneri: (1) kahraman (Barış / Ice-man) her zaman
**en yüksek kontrastta** (fırtına göğüne karşı siluet), (2) ordu ikincil:
uzakta sisle soluk, (3) her ordu çekiminden önce bir gri tonlama karesi
(`denetim_pafta.py`'ye kolay eklenir — öneri).

Kaynaklar: [FF VII dökümü (Groundzero)](https://studios-groundzero.pages.dev/journal/breakdowns/final-fantasy-vii) ·
[Leonardo'nun defterleri](https://interconnected.org/more/davinci/601.html) ·
[Penny Arcade eleştirisi](https://forums.penny-arcade.com/discussion/43092/beginning-of-battle-scene-needs-critiques)

## 12. Minecraft tarzı (blok karakter) dövüş — boşluk

Arama, blok karakterle dövüş koreografisi üzerine güvenilir bir kaynak
vermedi (sonuçlar çoğunlukla reklam ve düşük kaliteli sayfa). Yalnız şu çıktı:
Mine-imator saf animasyon için kolay, Blockbench model için iyi, Blender en
güçlüsü; blok karakter basit olduğu için "rig ve animasyon öğrenmek için iyi".

**Bizde:** bu boşluğu kendi ölçülerimiz dolduruyor: tek parça kolun erişimi
(`kol_ara` ile ölçülüyor; "eli çenede" pozu bu yüzden geri alındı), dizli
bacak, zemin teması (`zemin_denetim.py`). Blok karakterde silüet kolun
**açısından** okunur (el şekli yok) — pozlar silüetle denenmeli (öneri: her
yeni hamle pozunun siyah silüet karesi).

Kaynaklar: [Blender Artists — Minecraft dövüşü sorusu](https://blenderartists.org/t/animating-a-minecraft-fight-scene-help/588352) ·
[KatsBits — Minecraft tarzı karakter](https://www.katsbits.com/community/index.php?msg=4918)

## 13. Dövüşçü tipleri (dövüş oyunlarından): yakın baskı, alan tutucu, tutucu, karşı vurucu

- Klasik üçlü: **yakın baskı (rushdown)**, **alan tutucu (zoner)**, **tutucu
  (grappler)**; taş-kağıt-makas gibi birbirini dengeliyor.
- Alan tutucu rakibi uzaktan saldırılarla uzakta tutar; yakın baskı sürekli
  üstüne gelir ve savunması yorucudur; tutucu atış ve kavrama ile, ama
  mermiye karşı zorlanır.
- Ayrıca **savunmacı / karşı vurucu** tip anılıyor (ayrıntılı kaynak yok).
- Etiketler kesin değil; bir karakter birden çok biçimde oynanabilir.

**Bizde (öneri, kullanıcı seçer):** Ice-man doğal bir **alan tutucu**
(buz duvarı, kar girdabı, uzaktan dondurma — rakibi yaklaştırmıyor);
Barış ateşi bulunca **yakın baskı**ya dönüşür (Kor Yürüyüşü buzu aşıp
mesafeyi kapatmanın yolu — dövüşün dönüm noktası tipler üzerinden de
okunur); Pipos **karşı vurucu** (Kaplan sanatı: savunma önde, tek
bitiriş); Ömer topuzla ağır, yavaş, **tutucuya yakın** (yakında tehlikeli,
buz duvarını kıramıyor). Zisa savaşmıyor, **koruyucu** (koruma büyüsü).

Kaynaklar: [FrayTools — arketipler](https://fraytools.fandom.com/wiki/Character_Archetypes) ·
[PlayStation Compete — az bilinen arketipler](https://compete.playstation.com/en-us/article/six-less-common-fighting-game-character-archetypes-guide) ·
[thegame.ph — üç temel arketip](https://thegame.ph/sports/e-sports/the-3-basic-archetypes-of-fighting-game-characters/) ·
[Lucio — arketipleri yeniden tanımlamak](https://lucio.bearblog.dev/fgc-archetype-three-structure/)

## 14. Büyü düellosu için hareket dili (Harry Potter'ın asa dövüşü, yalnız yöntem)

- Koreograf Paul Harris, *Zümrüdüanka Yoldaşlığı*'nda yönetmenin isteğiyle
  asalar için **fiziksel bir hareket dili** kurdu; sonraki dört film aynı
  dili kullandı. Öncesinde asa dövüşü "sanattan çok eskrimdi".
- Kısıt aralığı: büyünün adını söylemeyi gerektirenden asaya bile gerek
  duymayana kadar.
- Unsurlar: bale, salsa ve "biraz kung fu"; duruşlar ve büyü savuşturma
  hareketleri (hayranlara atölyelerde öğretiliyor).

**Yöntem:** büyülü karakterlere kişiye özel bir **hareket dili** (duruş +
büyüyü atma + savuşturma) kurmak, büyüyü "el sallamak"tan çıkarır.

**Bizde:** Zisa (koruma büyüsü, alın sembolü) ve Ice-man (Ay Işığı Asası)
için ayrı birer küçük dil önerilebilir: her biri için 1 bekleme duruşu,
2–3 atma hareketi, 1 savuşturma. Kural olarak her büyü bir **beden
hareketiyle** başlar (efekt tek başına çıkmaz). Öneri.

Kaynaklar: [Paul Harris — Harry Potter](https://paulharrisdance.com/harry-potter/) ·
[NZ Herald — aksiyon](https://nzherald.co.nz/entertainment/what-you-never-knew-about-putting-the-action-into-the-harry-potter-films/YS7AXSQMRBLDFIMPYZLLASTNSY) ·
[The Digital Fix — asa düelloları dans](https://www.thedigitalfix.com/harry-potter/wand-duels-dance) ·
[GamesRadar — asa savaşı](https://www.gamesradar.com/how-to-fight-a-harry-potter-wand-battle)

## 15. Müziğe göre kurgu: ritmik kesme

- **Ritmik kurgu:** planlar müziğin ritmini yansıtan bir desene göre kesilir;
  hızlı parçada güçlü vuruşlarda kesme aciliyet kurar.
- Kesme vuruşta olur ama **planın içindeki hareket de ritme** uydurulur
  (davul + boks örneği); kurgucu plan başına 2–3 kare ekleyip çıkararak
  ritmi oturtur.
- Tırmanma: bir film dövüş boyunca kesme hızını yavaş yavaş artırıyor,
  öbürü birden hızlıya atlıyor.
- (İkincil) *Atomic Blonde*'da aksiyon, çekimden önce şarkılara göre bir
  animatikle kurgulanmış.
- **Darbe müziğin vurgusuna denk gelirse** daha doğal hissedilir.

**Bizde:** müziği sonradan ekliyoruz (CC0, `film_birlestir.py`). Öneri:
dövüş partında **önce müziğin vuruş zamanlarını** (bpm) seç, temas
karelerini o zamanlara yerleştir — kendi hamle setlerimizde temas anı zaten
yazılı olacağı için senaryo `"t"` değerleri vuruşa göre seçilebilir. Bu
bir senaryo kuralı, araç değişikliği gerektirmez.

Kaynaklar: [PremiumBeat — dövüş kurgusu](https://www.premiumbeat.com/blog/how-to-edit-fight-scene) ·
[Filmdaft — ritmik kurgu](https://filmdaft.com/rhythmic-editing-how-cut-timing-controls-the-audience/) ·
[Vaia — rhythmic editing](https://www.vaia.com/en-us/explanations/media-studies/filmmaking/rhythmic-editing/) ·
[Lightworks — ritim ve tempo](https://lwks.com/blog/rhythm-and-pace-crafting-the-tempo-of-film)

## 16. Kuzey Shaolin / Uzun Yumruk (Changquan) — Barış'ın ateşi için taban adayı

- **Derin, uzatılmış duruşlar:** at, yay, düşük (drop), ejder; aralarında
  hızlı akıcı geçişler, gücün yönü çabuk değişir. Kuzey stilleri güneyden
  daha **geniş ve uzun erişimli**.
- **"Güneyin yumruğu, kuzeyin tekmesi"** (nan quan bei tui): uzun mesafe,
  hızlı ileri-geri, tekme ve sıçrama, dönen dairesel bloklar, çeviklik,
  saldırganlık. Tipik hareketler: kasırga tekmesi, kelebek sıçrayış, yan
  takla, uçan tekme.
- Güç: bazı formlarda hareketin sonunda dinamik gerilim; köklenme ve denge
  vurgusu; büyük, uzatılmış, dairesel hareketler.

**Bizde:** §5 ile birleşince Barış'ın ateş seti için somut bir başlangıç:
uzun yay duruşundan **ileri atılan** avuç (Kıvılcım), dönen bir tekmeyle
ateş yayı, sıçrayıp inerken yere vuruş (zıplama ve iniş çökmesi araçta
var). Pipos'un alçak, kök salmış Hung Gar duruşuyla görsel zıtlık:
**Pipos güney (yumruk, kök), Barış kuzey (tekme, sıçrayış)**. Tek parça
kolda tekme okunur (bacak dizli), açık el okunmaz — ateş avuçtan çıkıyorsa
kol açısı ve efekt taşır. Öneri.

Kaynaklar: [Wikipedia — Changquan](https://en.wikipedia.org/wiki/Changquan) ·
[Northern Shaolin (Wikipedia, IPFS)](https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Northern_Shaolin_(martial_art)) ·
[shaolin.org — 18 Lohan yumruğu](https://shaolin.org/general-2/lohan-fist/lohan01.html)

## 17. Poz: hareket çizgisi, siluet, anahtar pozlar

- **Hareket çizgisi (line of action):** pozun yönünü ve enerjisini taşıyan
  hayali "C" ya da "S" eğrisi; önce o çizilir. Zayıf çizgi yumuşak okunur;
  dövüş pozunda çizgi ne kadar belirginse o kadar kinetik.
- **Siluet testi:** pozu simsiyah doldur; okunmuyorsa harekette de
  okunmaz. Uzaktan görülen karakterde ve **geniş + hızlı planda** daha
  güçlü siluet gerekir (yakın ve uzun planda daha az).
- **Anahtar pozlar:** an'ı yakalayan ana pozlar; alıştırma: uzan →
  temas → tepki, her biri siluet olarak değerlendirilir.

**Bizde:** blok karakterde hareket çizgisi **gövde eğimi + baş + uzanan
kol** üçlüsünden kurulur (omurga bükülmez: bel kemiği var, eğim ancak
`waist` ile). Öneri: her yeni hamlenin üç anahtar pozu (hazırlık, temas,
tepki) siyah siluet olarak tek karede çizilip onaylanır — tam sahne
çizmeden, ucuz bir deneme (yeni "cila turu yok" kuralıyla uyumlu: bu
sahne değil, poz onayı).

Kaynaklar: [Washington Üniv. — posing](https://courses.cs.washington.edu/courses/cse458/20au/content/projects/project6_animation_a/index.html) ·
[AnimSchool — line of action](https://blog.animschool.edu/tag/line-of-action/) ·
[Animator Island — okunaklı poz](https://www.animatorisland.com/perfect-posing-2-appealing-and-readable/) ·
[BINUS — siluet](https://binus.ac.id/bandung/dkv/2025/11/04/the-power-of-silhouette-designing-readable-characters-in-motion/)

## 18. 180° kuralı ve ekran yönü (dövüşte)

- Kamera hayali eksenin bir yanında kalır; ekran yönü ve mekân ilişkisi
  okunur kalır. Soldan sağa giden araba planlar boyunca öyle gitmeli;
  gerekçesiz geçiş yön değiştirmiş gibi gösterir. Süreklilik kurgusunun
  temeli.
- **Bilerek bozmak:** bir rehber, yasa değil; gerilim, karışıklık, tedirginlik
  için bozulur; ani bir ters dönüş karakterin dünyasının ters döndüğü ana
  denk getirilebilir.
- **Yumuşak geçiş:** eksenin TAM üstünden bir ara plan (iki yanı ayırır) ya da
  hareketin kendisi yön değiştirirken geçmek.

**Bizde:** araç 180° kilidini zaten tutuyor. Öneri: **bilinçli bozma tek
yerde**: Barış'ın donup ateşle uyandığı an (Düşünme 4 — "buzun çatlaması")
kamera ekseni ilk kez geçer; seyirci üstünlüğün el değiştirdiğini kameradan
da hisseder. Geçiş eksen üstündeki bir ara planla (buzun içinden, yüzün
tam önünden) yumuşatılabilir. Öneri, kullanıcı seçer.

Kaynaklar: [Wikipedia — 180-degree rule](https://en.wikipedia.org/wiki/180-degree_rule) ·
[LMU — screen direction](https://lmu.pressbooks.pub/filmmaking/chapter/screen-direction/) ·
[Videomaker — 180°](https://www.videomaker.com/how-to/shooting/composition/the-180-degree-rule-a-filmmakers-most-powerful-blueprint/) ·
[No Film School — coverage](https://nofilmschool.com/2016/11/how-follow-180-degree-rule-while-shooting-coverage)

## 19. Önce görüntüyle prova (previs / "stuntvis")

- 87eleven (John Wick'in aksiyon ekibi) sahneleri yapım öncesinde kendi
  atölyesinde kurup filme **sunar**.
- *Birds of Prey*: önce her karakterin **dövüş stili** tasarlandı, sonra
  ana sahneler, sonra previs ("görsel storyboard").
- **Stuntvis:** sette hiçbir şey çekilmeden önce dublör koordinatörünün
  hazırladığı görüntülü referans; provalar kaydedilip kaba bir kurguya
  kesilir, dövüşü satmak için gereken planlar oradan çıkar. Kapsam:
  blok yerleşimi, koreografi, kamera yeri, ışık, efekt dökümü, eşya.
- Örnek: bir previs ekibi bir haftada son bıçak dövüşünün çekilmiş kaba
  hâlini çıkardı.

**Bizde:** bizim önizleme tam olarak bu (stuntvis'in animasyon karşılığı).
Sıra dersi: **önce her karakterin stili, sonra sahneler, sonra previs.**
Yani kendi hamle setlerini sahnelerden ÖNCE yazmak doğru sıra (kullanıcının
2026-11-04 kararıyla aynı yön). Yeni kuralla birlikte: previs'te bulunan
hata yazılır, sahne cilalanmaz.

Kaynaklar: [Business Insider — Birds of Prey](https://www.businessinsider.in/tech/news/inside-the-wild-stunts-and-fight-sequences-of-birds-of-prey-which-were-inspired-by-john-wick-atomic-blonde-and-jackie-chans-drunken-master/articleshow/74013848.cms) ·
[Eric Jacobus — Die Hard previs](https://ericjacobus.com/2013/03/27/the-deleted-fight-from-a-good-day-to-die-hard-previz-by-eric-jacobus-alvin-hsing-and-j-j-perry/) ·
[PremiumBeat — 87eleven](https://www.premiumbeat.com/blog/87eleven-stunts) ·
[Yahoo — Stahelski](https://ca.news.yahoo.com/chad-stahelski-reinventing-action-sequences-190000061.html)

## 20. Tırpan — Barış'ın Karanlık Tırpan'ı için

- Savaş tırpanı: kavisli, tek ağızlı bıçak, keskin kenar **iç (çukur)
  tarafta**; uzun menzil ve kaldıraçtan gelen güç.
- Öldüren kısım uzun bir ağız olduğu için **saplamaz, süpürür**: bıçak
  hedefin üstünden çekilir (satıcı kaynağı, eğitim kılavuzu değil).
- Tarihî kaynak: 1500'lerin Alman elkitabı (Paulus Hector Mair); dövüşe
  uygunluğu HEMA topluluğunda tartışmalı. Polonya'nın tırpanlı köylü
  birlikleri üzerine akademik bir çalışma var (*Archives of Budo*, 2017).

**Bizde:** tırpanın hareket dili **kanca ve süpürme**: içe çekiş (rakibi
kendine çekmek, ayağından almak), geniş yatay süpürme (birden çok zombiye),
sapla itme/savuşturma. Antitheus setinin (WoM) bugünkü vuruşları korunur;
kendi setimiz eklenirse "içe çekiş" en ayırt edici hamle olur. Bıçak iç
tarafta keser — vuruşun temas noktası bıçağın ucu değil iç kavisi.

Kaynaklar: [Wikipedia — War scythe](https://en.wikipedia.org/wiki/War_scythe) ·
[ARMA forumu — Mair'in tırpanı](https://thearma.org/forum/viewtopic.php?p=39213) ·
[Polonya tırpan eskrimi (Archives of Budo)](https://repozytorium.ur.edu.pl/handle/item/3372) ·
[Wikipedia — Polearm](https://en.wikipedia.org/wiki/Polearm)

## 21. Asa / değnek — Ice-man'in Ay Işığı Asası için

- Asa **üçe bölünür**, eller iki iç noktada: biri dayanak, öteki kuvvet
  (dengeli kaldıraç). Merkeze yakın tutmak menzili kaybettirir.
- Çoğu teknik iki elle; Çin asasında (gun) tek el Japon bo'sundan sık.
- **Dönüş hareketi kesintiye uğramamalı** ve dönen silah kişinin
  hareketini kısıtlamamalı (çok rakipte en önemlisi). Dairesel
  savuşturmalar kesikleri emer; menzil rakibi mesafeyi kapatmadan durdurur.
- Başlangıç dönüşü sekiz çizme (∞), bilekten.

**Bizde:** Ice-man'in "alan tutucu" kimliğiyle (§13) birebir: asa
**menzil** demek; Barış'ı uzakta tutan dairesel savuşturmalar ve asanın
ucundan (kayıtta zayıf nokta: asadaki küre) çıkan buz. Zayıf noktanın
asada olması dövüşü güzel bağlıyor: Barış'ın kazanmak için menzile girmesi
gerek, Kor Yürüyüşü bunu sağlıyor.

Kaynaklar: [Martialytics — staff training](https://www.martialytics.com/blog/your-guide-to-martial-arts-staff-training) ·
[Karate Forums — bo ve uzun asalar](https://karateforums.com/topic/25463-the-bo-and-other-long-wooden-staff-martial-arts-weapons) ·
[Fight Encyclopedia — iki kişilik asa formu](https://fightencyclopedia.com/videos/330975/weapon/staff-weapon)

## 22. Zamanlama ve aralık (timing / spacing): ağırlık

- **Zamanlama** hareketin süresi, **aralık** o sürede yolun karelere nasıl
  dağıldığı; aynı süreli iki savuruş bambaşka hissettirebilir.
- Ağır nesne yavaş yavaş hızlanmaz: **direnir, sonra kendini bırakır.** Ağır
  silah: hazırlığa yavaş, vuruşta hızlanarak, yerleşmede yeniden yavaşlayarak.
- Tokmak benzeri savuruş: başta yavaş, ortada en geniş aralık (en hız),
  bitiş noktasını **aşar** (taşma); hafif savuruş hızlı, açık aralıklı,
  devamsız.
- Süzülen (floaty) hareketi düzeltmek: başta ve sonda aralığı sıkılaştır.
- Oyun forumu: geri dönüşte geri tepme ve daha uzun yumuşatma.

**Bizde:** akıcı katmanın eğrileri ("auto clamped", taşmasız) film pozları
için; **ağır silah hamlelerinde taşma istenir** (topuz, tırpan). Kendi
setlerimizde silaha göre iki profil önerilir: ağır (topuz, tırpan: uzun
hazırlık, hızlı vuruş, taşma, uzun yerleşme) ve hafif (Pipos'un yumruğu,
tabanca: kısa hazırlık, devam yok). Ölçülebilir: temas öncesi son 2 karede
hız tepe olmalı.

Kaynaklar: [UDIT — timing y spacing](https://www.udit.es/en/timing-y-spacing-en-animacion-que-es-y-como-mejora-la-sensacion-de-peso/) ·
[Pluralsight — timing & spacing](https://pluralsight.com/blog/film-games/character-animation-fundamentals-timing-spacing) ·
[anim.works — timing & spacing](https://anim.works/?p=25232) ·
[Roblox forumu — kılıç savuruşu](https://devforum.roblox.com/t/sword-swing-animations/1989275)

## 23. Anime (Jujutsu Kaisen) — kamera mantığı, ses

- Bir inceleme bölümün kurşun kalem karelerini ve yapım sayfasını
  göstererek sahnenin nasıl kurulduğunu döküyor (Inbetween Drafts).
- Choso–Yuji dövüşü gevşekçe *The Raid 2*'nin mutfak dövüşünden esinlenmiş;
  koreografi, kamera açıları, parçacık efektleri övülmüş.
- (Görüş yazısı) kaotik dövüşte bile **mekân mantığı net**; insan ve insan
  olmayan bakış açıları arasında geçiş; baskın karakter **yukarıdan**
  çekiliyor (üstünlük).
- Bir inceleme **ayak sesine** verilen önemi öne çıkarıyor.
- Naruto için kaynak çıkmadı (boşluk).

**Bizde:** iki ucuz ve güçlü fikir: (1) **üstün olanı yukarıdan, düşeni
aşağıdan çek** — Ice-man Barış'ı dondurduğunda kamera yukarıda (Ice-man'in
gözü), ateşle uyanışta aşağıdan; (2) **ayak sesi** — ses katmanında adım
sesi zaten var mı bakılmalı (bilinmiyor, ölçülmedi).

Kaynaklar: [Inbetween Drafts — JJK incelemesi](https://inbetweendrafts.com/jujutsu-kaisen-review/) ·
[Sportskeeda — "The Raid Kaisen"](https://www.sportskeeda.com/anime/the-raid-kaisen-jujutsu-kaisen-blows-fandom-away-choso-vs-yuji) ·
[Anime Lore Hub — kamera](https://animelorehub.blogspot.com/2025/10/when-frame-speaks-louder-than-words.html) ·
[Anime Corner — S2B13](https://animecorner.me/jujutsu-kaisen-season-2-episode-13-combat-perfected/)

## 24. The Raid — dar mekân, ortamla dövüş (sokak sahnesi için)

- Koreografiyi başrol Iko Uwais ve hocası Yayan Ruhian kurdu; temel
  **pencak silat**. Silat kung fu kadar hızlı ama daha kör (blunt), silaha
  hazır ve **ortamını kullanmaktan çekinmiyor**; "set bile dövüşe katılıyor".
- Dar mekâna rağmen dövüş **okunaklı**: odadan odaya, kattan kata; merdiven,
  pencere ve kapıdan geçerek. Sürekli kapalılık hissi seyirciyi ekibin
  yerine koyuyor.
- Modern silah ve aletler **bedenin uzantısı** gibi kullanılıyor.
- (Doğrulanmadı) dövüşlerin neredeyse kesintisiz planlar olarak kurulduğu.

**Bizde:** onaylı 2. mekân "Sokaklar" (Barış dar sokakta ilk zombilerle
zorlanıyor) tam bu durum. Öneri: sokakta ortam nesneleri (fıçı, çit, fener
direği, ev kapısı) dövüşe sokulsun; dar sokak **bir seferde bir zombi**
mantığını da doğal kılar (bkz. §25).

Kaynaklar: [Slashfilm — The Raid tehlikesi](https://www.slashfilm.com/830941/the-raids-brutal-action-scenes-were-as-dangerous-as-they-look) ·
[Film Comment — inceleme](https://www.filmcomment.com/article/the-raid-review) ·
[ScreenAnarchy — TIFF 2011](https://screenanarchy.com/2011/09/tiff-2011-the-raid-review.html) ·
[Empire — inceleme](https://www.empireonline.com/movies/raid/review/)

## 25. Bire karşı çok: sıra bekleyen kötüler

- Pratik kural: **her vuruşta tek etkin saldıran**; ötekiler mesafeyi tutar,
  temkinle döner, tereddüt eder ya da tepki verir; yerleri sahne boyunca
  tutarlı.
- "Sırasını bekleyen kötü" sık eleştirilir ama koreografi için gerekli: hep
  birden saldırı dövüşü hem kısıtlar hem karmaşıklaştırır.
- **Dar mekân gerekçe verir:** koridor ya da tuvalet kabini saldıranları
  tek tek gelmeye zorlar (Oldboy koridoru, The Raid 2).
- Gerçekçilik savunusu: kurt sürüsünde de çoğu zaman bir-iki kurt saldırır;
  kalabalık saldıranlar birbirinden kaçınırken yavaşlar.

**Bizde:** zombi ve iskelet sürüleri için kural: **çekimde en çok bir etkin
saldıran + bir hazırlanan**, geri kalanı halka halinde tereddütlü. Film
aracında itme ve "iki aktör arasında en az 1,05 blok" kuralı var; sürü
düzeni senaryoda elle yazılır (bir sürü düzeni yardımcısı yazılabilir —
öneri).

Kaynaklar: [Seedance aksiyon rehberi](https://flick.art/fr/docs/seedance-action-guide) ·
[MartialTalk — sıra bekleyen kötüler](https://www.martialtalk.com/threads/unpopular-opinion-bad-guys-waiting-their-turn-in-movie-fight-scenes-is-totally-realistic.134673/) ·
[Black Belt — bire karşı çok sahneler](https://www.blackbeltmag.com/10-greatest-fight-scenes-one-vs-many) ·
[r/kungfucinema — tek tek saldırı](https://lr.eu.psf.lt/r/kungfucinema/comments/1gzuzbu/what_movie_do_you_think_addresses_the_one_at_a)

## 26. Buz büyüsü tasarımı: yavaşlatma → dondurma, işaretli alan

- Bir kart oyununda buz **kontrol** rolü için seçilmiş; "katılaşmış su"
  olarak yeniden tanımlanmış; oyuncunun ilerlemesini tamamen kilitleyen
  donmalardan kaçınılmış.
- Yaygın döngü: **yavaşlatma birikir, sonra paraya çevrilir** (yığınlar
  dondurmaya ya da hasara dönüşür). Alan dondurma **işaretlenir**: önce
  kanal/hazırlık (ör. 2,5 sn), sonra donma — karşı koymak adil olsun.
- Buz tek başına ödüllendirici değil; hasar ya da takım avantajıyla eşlenir.
- Buz duvarı için kaynak çıkmadı (boşluk).

**Bizde:** Ice-man'in dövüşü için hikâye karşılığı: Barış önce **yavaşlar**
(soğuk, kayan ayak — merdivende buz), sonra **donar** ("Bu kadar kolaysın").
Donma anı ve buz duvarı **işaretli** olmalı: asanın küresi parlar, yerde buz
çizgisi yayılır, sonra donar — seyirci gelişini görür. Barış'ın çözümü
(Kor Yürüyüşü) bu döngüyü kırar. Onaylı olaylarla uyumlu, öneri.

Kaynaklar: [Mage Noir — buz tasarımı](https://magenoir.com/blogpart/en/design/2023/12/15/glace-talk.html) ·
[LoL wiki — Ice Mage taslağı](https://wiki.leagueoflegends.com/en-us/User:Care_Level/Ice_Mage) ·
[Enshrouded — buz büyücüsü](https://pindrop.gg/fr/enshrouded/builds/ice-mage-control) ·
[V Rising — Frost](https://www.gamerguides.com/v-rising/database/spellbook/frost-magic)

## 27. Ateş efekti: yükselir, incelir, kor ve ısı titremesi

- **Isı yükselir:** alevler yukarı akar; güçlü taban, tırmandıkça incelir
  ve sivrilir (patlama ise dışa mantar gibi açılır). Hareket yönü önce
  seçilmeli.
- **Isı titremesi:** normal haritası + yumuşak maske + kırılma ile alevin
  üstündeki havayı bulanıklaştıran basit malzeme. Örnek kamp ateşi: 6 alev,
  3 kor, 1 ısı, 2 duman, 2 ışık yayıcısı.
- **Renk:** sıcak beyaz-sarı çekirdek → turuncu → koyu kırmızı uçlar (yaygın
  üslup tercihi); tabanda serin mavi fiziksel olarak savunulabilir.
- **Katmanlar:** kor ayrı yayıcı (4 resimlik rastgele doku), alevden dumana
  geçen kare dizisi; kor için ekleme (Add) karışımı.
- (Zayıf kaynak) 24 fps karakterle 60 fps akışkan ateşi karıştırma.

**Bizde:** Barış'ın ateşi için Minecraft'a uygun yol: **blok parçacıklar**
(kor kareleri) + alevin yukarı akışı + yalnız güçlü anlarda ısı titremesi.
Pooka paketinde ateş/kor efektleri var (REFERANS_HAZIR_PAKETLER.md) —
bağlanmadan önce bir önizleme karesi kuralı geçerli. 30 fps'lik filmde ateş
dizisi de 30 fps'te tutulmalı. Öneri.

Kaynaklar: [VFX Apprentice — stilize ateş](https://www.vfxapprentice.com/blog/how-to-draw-stylized-fire-flames) ·
[80.lv — UE4 kamp ateşi](https://80.lv/articles/creating-a-campfire-vfx-in-ue4) ·
[Realtime VFX — stilize ateş](https://realtimevfx.com/t/stylized-fire/5226) ·
[ArtGrid — VFX öğeleri](https://artgrid.io/insights/vfx-elements/)

## 28. Alan Becker (çöp adam dövüşleri) — boşluk

Becker'ın kendi koreografi yöntemine dair güvenilir bir kaynak çıkmadı
(sonuçlar çoğunlukla dolgu sayfa). Yalnız: 40'tan fazla derslik ücretli bir
ustalık sınıfı var; "yumruklarını destansı hissettir", koşu döngüsü, ara
kare ve kamera hareketi üzerine video başlıkları görünüyor; içerikleri
okunamadı. Genel kural (ikincil): **yakın kareler yavaş, uzak kareler
hızlı okunur** (§22 ile aynı).

**Bizde:** öğrenilecek ders başlıklardan bile belli: blok karakter gibi
çöp adamda da "pozun açıkça okunması" her şey. Ayrıntı için kaynak yok,
bilerek uydurulmadı.

Kaynaklar: [Animator vs. Animation wiki — Alan Becker](https://animatorvsanimation.fandom.com/wiki/Alan_Becker) ·
[Bloop Animation — çöp adam animatörleri](https://www.bloopanimation.com/zh/6-stick-figure-animators-you-should-know)

## 29. Kalkan duvarı ve gedik savunması (sur gediği sahnesi için)

- **Kalkan duvarı:** askerler omuz omuza, kalkanlar birbirine değiyor ya da
  biniyor; antik ve orta çağda yaygın. **Zayıf noktası gedik:** delinince
  düzen hızla dağılır ve savaş tek tek dövüşlere döner; duvarı çöken taraf
  dezavantajlı.
- Ekranda çoğu zaman yanlış: "Hollywood taktiği" iki kütlenin düz ovada
  birbirine koşması. Kuşatılan düzende arka sıranın dışa dönmesi gerçekçi bir
  ayrıntı (forum).
- Gedik savunmasını ekranda kurmaya dair kaynak çıkmadı (boşluk).

**Bizde:** onaylı Düşünme 1 tam bu yapı: "gedikte ağır zırhlı sur askerleri
**duvar gibi** duruyor, zombiler geçemiyor; Ice-man iskeletleri molozun
üstüne çıkarıp askerlerin üstünden ok yağdırıyor" — yani kalkan duvarını
yukarıdan aşan cevap. Öneri: askerler gedikte **omuz omuza tek sıra**,
zombiler önlerinde birikir (bire karşı çok kuralı burada tersine: çok,
duvara karşı); iskeletler molozun tepesinde siluet (göğe karşı, §11).
Duvar kırıldığı an (bir asker düşer) tek tek dövüşe geçiş — mekân
değişiminin işareti.

Kaynaklar: [Wikipedia — Shield wall](https://en.wikipedia.org/wiki/Shield_wall) ·
[ACOUP — kalkan duvarları ve aralık](https://acoup.blog/2023/12/15/collections-shield-walls-and-spacing-hollywood-mobs-and-ancient-tactics/) ·
[TV Tropes — Call That a Formation](https://tvtropes.org/pmwiki/pmwiki.php/Main/CallThataFormation)

## 30. Dövüş sesi: katmanlar, savrulma, ağırlık

- Bir vuruş **2–4 katman**: savrulma (whoosh) + darbe + beden sesi (+ kumaş).
  Savrulma olmadan yumruk durağan kalır; savrulma hız ve hava hareketi
  kurar.
- **Ağırlık:** daha güçlü alçak frekans, daha uzun kuyruk, perdesi
  düşürülmüş kopya.
- **Çeşitlilik:** aynı vuruşu aynı seviyede tekrarlamak sık hata; uzun
  değişimlerde daha hafif "şap" sesleri yorgunluğu azaltır.
- **Senkron:** darbe sesini görsel tepeden **1–2 kare önce** koy (algı
  gecikmesi); her katmanı tek başına dinleyip sonra karıştır.
- Abartmama: her vuruşu yüksek ve çizgi filmsi yapmak geri teper.

**Bizde:** temas sesleri zaten var ve temas karesine bağlı. Kendi hamle
setlerimiz için öneri: her hamlenin künyesine **savrulma anı** (temastan
2–6 kare önce) ve **ağırlık sınıfı** (hafif/orta/ağır → ses seçimi) yazılsın;
darbe sesi temas karesinden 1 kare önce. Ses seviyesi zaten
`film_birlestir.py` ile −14 LUFS'a ölçülüyor.

Kaynaklar: [IRPR — dövüş sesi](https://sounddesign.irpr.agency/guides/how-to-design-sound-for-a-fight-scene/) ·
[IRPR — darbeye ağırlık](https://sounddesign.irpr.agency/guides/how-to-add-weight-to-impacts/) ·
[Designing Sound — Bruce Tanis](https://designingsound.org/2010/07/23/bruce-tanis-special-editing-hand-to-hand-fight-sound-effects/) ·
[Daredevil ses tasarımcısı](https://www.motionpictures.org/2016/08/how-daredevils-emmy-nominated-sound-designer-makes-punches-pop/)

## 31. Ok yağmuru: film geleneği, kalkanlar, tepki planı

- Okçuların hep birlikte "yaylım" atışı büyük ölçüde **film geleneği**;
  tarihte gerçek etkisi ekrandaki kadar değil (ACOUP). Kitlesel atış tek tek
  öldürmekten çok hücumu bozmaya yarıyordu.
- **Oklar çoğunlukla kalkanlara saplanır** (Gladiator dökümü, bir
  storyboard'da kalkan duvarına inen oklar). Görsel karşılık kalkanlardan ve
  **tepki planlarından** gelir, toplu ölümden değil.

**Bizde:** iki onaylı an bunu kullanıyor: (1) Düşünme 1'de iskeletlerin
askerlerin üstünden ok yağdırması — kalkanlara saplanan oklar + tek tük
düşen asker yeter; (2) Zisa'nın koruma büyüsü — **oklar Barış'a çarpıp geri
seker** (kayıtta). Seken okun okunması için: okun gelişi (gökyüzü planı),
çarpma anında küçük parıltı (Zisa'nın büyü rengi), Barış'ın şaşkın tepkisi
(§9: tepki satar).

Kaynaklar: [ACOUP — okçular neden yaylım atmadı](https://acoup.blog/2025/05/02/collections-why-archers-didnt-volley-fire/) ·
[Straight Dope — film yaylımları](https://boards.straightdope.com/t/arrow-volleys-in-movie-warfare/299516) ·
[Art of VFX — Robin Hood](https://www.artofvfx.com/robin-hood-rob-stammers-vfx-supervisor-the-moving-picture-company/)

## 32. Saldırının işareti (telegraph): kaçış penceresi hazırlıktan doğar

- İşaret **tanınır** olmalı: seyirci/oyuncu işareti görünce hangi
  saldırının geldiğini bilir. En yaygın araç **hazırlık hareketi** (uzun
  kılıç savuruşu); ikincil araç ses (saldırı öncesi hırıltı).
- Yapı: hazırlık → saldırı → kaçış, üç ayrı vuruş. Bol işaret, herkese
  kaçma/karşılama şansı verir.
- **İşaretin görünürlüğü saldırının ölümcüllüğüyle büyür.**
- Sık sorun: hazırlık mı hasar mı ayırt edilemiyor; yakın çekimde net
  görünen işaret gerçek kamera uzaklığında kayboluyor; fazla hızlı gelen
  düşman "adaletsiz" görünüyor.

**Bizde:** filmde "adalet" seyircinin anlamasıdır: Barış bir saldırıdan
kaçıyorsa seyirci saldırının **geldiğini görmeli**. Kural önerisi: her
büyük saldırının (buz duvarı, dondurma, creeper patlaması) **kendi
kamerasının uzaklığında okunan** bir işareti olsun (parlama, ses, hazırlık
pozu) ve işaretin süresi saldırının ağırlığıyla büyüsün. §26 ile aynı yön.

Kaynaklar: [Game Developer — telegraphing](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing) ·
[Combat as Dance](https://www.knowll.com/e/142/game-design-combat-as-dance) ·
[J. A. Johnson — telegraphing](https://jamesaaronjohnson.github.io/blogs/telegraphing) ·
[Top-down boss işaret denetimi](https://gamineai.com/blog/enemy-telegraph-shape-language-top-down-boss-fights-fast-visual-consistency-audit-2026)

## 33. Ağır çekim ve hız rampası: tek, adı konmuş vuruşta

- Hız rampası yüksek yoğunluklu anlara uyar: belli bir hareketi ağır çekimle
  ayırır, sonra ivme için hızlıya döner. Yavaşlamak anın önemini işaretler
  ya da ayrıntıyı gösterir; hızlanmak adrenalin katar.
- Darbe için: gelen yumruk/tekme temasa çok yakın **hızlandırılır**, vuruş
  daha güçlü görünür.
- **Aşırı kullanım sahneyi süründürür.** Etki belli bir olaya bağlı olmalı:
  olayda gir, olaydan çık; yaklaşma ve sonrası normal hızda. Ağır çekimde
  görecek ayrıntı yoksa boşa gider. Ağır ve normal hızın yan yana gelmesi
  ivmeyi korur.

**Bizde:** onaylı tek ağır çekim lav çukurundaki son darbe (Part 4). Kural
önerisi: **dövüş başına en çok bir-iki** adı konmuş ağır çekim (lav çukuru;
belki buzun çatlaması), temasa yaklaşırken hızlanma ise vuruş başına
serbest (2–3 kare). `zaman_haritasi` ikisini de yapıyor.

Kaynaklar: [PremiumBeat — hız rampası](https://www.premiumbeat.com/blog/alter-the-flow-of-time-with-speed-ramping/) ·
[Filmlifestyle — ağır çekim](https://filmlifestyle.com/how-to-use-slow-motion-in-film/) ·
[Mélies — speed ramp](https://melies.co/cinematic-techniques/time-and-motion/speed-ramp) ·
[Beverly Boy — rampa plan değildir](https://beverlyboy.com/film-technology/speed-ramping-isnt-a-plan-better-motion-choices)

## 34. Dövüşün sonu: kaçınılmaz ama şüpheli, iç değişimle

- En büyük dövüş doruk noktasına saklanır. Sonuç **kaçınılmaz** hissettirmeli
  ama seyirci son ana kadar şüphe etmeli; kahramanın kaybetme olasılığı
  sona kadar canlı kalmalı.
- Doruk, hikâyenin ana sorusunu cevaplar; **dış çatışma (dövüş) iç
  değişimle** (büyüme, başarısızlık) katmanlanır.
- **Yeteneği önceden ek:** kahraman usta bir dövüşçüyse bu erkenden
  gösterilmeli; eğitimsiz harikalık inandırıcı değil.
- Antiklimaks tehlikesi; sahne sonu seçenekleri: asılı son (en az
  kullanılması gereken), duygu patlaması ya da noktası konunca durmak.

**Bizde:** iki ders doğrudan sezona oturuyor: (1) **önceden ekme** —
Barış'ın ateş büyüsünü Part 1'deki kitapta öğrenmesi ve Part 3'teki
"temel mantığını kavradığı için" uyanışı tam bu; (2) **iç değişim** —
Barış'ın gücünün uyanması dövüşün dış sonucu (Ice-man'in ölümü) ile aynı
anda. Pipos'un "her dövüş bir bitiriş saldırısıyla biter" kuralı da bu
dersin karakter düzeyindeki hâli.

Kaynaklar: [Go Teen Writers — aksiyon sahnesi](https://goteenwriters.com/2012/04/03/writing-the-action-fight-scene/) ·
[Bryan Thomas Schmidt — doruk](https://bryanthomasschmidt.net/tag/the-climax/) ·
[Author Learning Center — inandırıcı aksiyon](https://www.authorlearningcenter.com/writing/fiction/w/common-mistakes/7204/tips-for-writing-believable-action-scenes) ·
[Kindlepreneur — doruk](https://kindlepreneur.com/climax-of-a-story/)

## 35. Karşı vurucu (counterpuncher) — Pipos'un stratejisi

- Savunma **birincil strateji**; rakibin önce saldırmasını bekler.
  Savunmada **sabırlı** olur, rakibin vuruş alışkanlıklarını izler; her şey
  **zamanlama**.
- **Savunma ve saldırı bir ve aynı** — büyük karşı vurucunun tanımı;
  "fırsat yaratmak için tehlikede olmak".
- Gereken: refleks, zekâ, isabet, ortalamanın üstünde el hızı. Karşı
  vurmaya başlamak için **tek kısa geri adım**.
- Risk: açık bulamazsa sayıca geride kalır; ona karşı strateji onu harekete
  zorlamaktır.

**Bizde:** Hung Gar'ın "savunma ve karşı saldırı aynı anda" ilkesiyle (§6)
ve kullanıcının Kaplan sanatı kuralıyla üçü de aynı yeri gösteriyor.
Pipos'un dövüş ritmi önerisi: bekle (alçak duruş, gözler rakipte) → rakip
saldırır → **tek kısa geri adım + savuşturma** → aynı hareketin içinden
karşı vuruş → en sonda tek bitiriş. "Açık bulamazsa geride kalır" riski
dramatik bir an olabilir (ör. Ice-man gibi uzaktan saldıran bir rakip
karşı vurucuyu çaresiz bırakır — tipler §13). Öneri.

Kaynaklar: [Evolve — üç karşı vuruş türü](https://evolve-mma.com/blog/the-3-different-types-of-counter-punches-in-boxing/) ·
[Evolve — karşı vuruş uzmanlığı](https://evolve-mma.com/blog/how-to-become-a-counterpunching-expert-in-boxing/) ·
[POWA — counterpunching](https://powaboxing.com/blogs/boxing-training/the-essence-of-counterpunching-in-boxing) ·
[Boxing wiki — counterpunch](https://boxing.fandom.com/wiki/Counterpunch)

## 36. Topuz — Ömer'in Osmanlı Topuzu için

- **Dilimli (flanşlı) topuz** plaka zırhın yayılmasına cevap: dilimler zırhta
  bir noktaya takılıp bütün gücü oraya verir, zırhı deler ya da içe göçertir.
  Avrupa'da 12. yüzyılda yaygınlaşıyor; Bizans'ta daha önce, İslam
  dünyasında daha da önce dilimli başlar var.
- Kullanım tekniği kaynaklarda **zayıf**: çoğu dövüş elkitabı topuzu
  anlatmıyor; kavrama ve savuruş yayına dair güvenilir ayrıntı bulunamadı.

**Bizde:** topuz seti zaten Epic Fight baltasından türetilmiş ve onaylı.
Bu bulgu karakteri güçlendiriyor: topuz **zırh kırıcı** bir silah — Ömer'in
buz duvarını "kıramaması" bu yüzden güçlü bir an (zırhı kıran silah bile
buzu kıramıyor → Ice-man'in gücü seyirciye ölçülerek gösterilir). Ağır
silah profili (§22): uzun hazırlık, tek noktaya iniş, taşma.

Kaynaklar: [Wikipedia — Mace (bludgeon)](https://en.wikipedia.org/wiki/Mace_(bludgeon)) ·
[ARMA forumu — topuz](https://thearma.org/forum/viewtopic.php?p=27512) ·
[MCRWA — ezici silahlar](https://www.ucc.gu.uwa.edu.au/~warlock/MCRWA/Combat/Shields_Weapons/mcrcrushing.htm)

## 37. İki tabanca (akimbo) — çocukluk arkadaşı için

- İki elde silah gerçekte pek kullanılmıyor; kurgu pratikliğini görmezden
  gelme özgürlüğüyle popülerleştirdi (bir silah blogu "çoğunlukla saçma"
  diyor).
- "Gerçek film akimbo"su: iki silah aynı anda, **kollar önde çapraz**.
- John Woo'nun çatışmaları "dans numarası olarak çatışma": iki aktörün
  karedeki hareketine büyük dikkat; şarjör boşaltıp dönerek tekmeyle atmak
  gibi süslemeler.
- İki hedefe aynı anda angajmanın nasıl sahnelendiğine dair kaynak çıkmadı
  (boşluk).

**Bizde:** karakter zaten fantastik (kraliyet büyüsü, asa yerine iki
tabanca), gerçekçilik şartı yok. Öneri: arkadaşın imza pozu **çapraz kol +
iki yöne ateş**; §7'deki "silah gövdeye yakın, yakın mesafede dövüşle iç
içe" ile birleşince: yakın dövüşte dirsek/tekme, arada iki yöne ateş. Tek
parça Minecraft kolunda çapraz kol §12'deki uyarıya dikkat: kol uçları
kameraya bakınca "elde ne var" okunmaz — hanedan girişinde yaşandı.

Kaynaklar: [Wikipedia — Dual wield](https://en.wikipedia.org/wiki/Dual_wield) ·
[GunMag — akimbo yararlı mı](https://gunmagwarehouse.com/blog/going-akimbo-is-it-useful/) ·
[Tropedia — Guns Akimbo](https://tropedia.fandom.com/wiki/Guns_Akimbo) ·
[Engadget — City of Heroes çift tabanca animasyonu](https://www.engadget.com/2010-06-01-exclusive-city-of-heroes-developer-diary-on-the-design-of-dual-p.html)

## 38. Camı kırıp atlamak — Barış'ın çıkışı (Part 2)

- Filmde çoğunlukla sahte cam (eskiden şeker, bugün plastik reçine); yine de
  keser. Bazen gerçek cam (8 mm temperli) ve camı atlayıştan bir an önce
  kıran küçük patlayıcı kullanılıyor.
- **Zamanlama kusursuz olmalı**, yoksa sahte görünür (dublör); MythBusters
  *Die Hard* denemesi de saniyenin altındaki zamanlamayı vurguluyor.
- Güvenlik tavsiyesi: önden ağır bir şey fırlat; iniş için karton kutu
  yığını. Ağır çekimde gerçek camla sahte camın kırılışı farklı.

**Bizde:** kayıtta Barış "camı kırıp aşağı atlıyor". Okunması için:
(1) cam Barış değmeden **bir kare önce** çatlar (zamanlama dersinin tersi
değil: kırılmanın nedeni görünür olsun — önce silah/omuz, sonra cam),
(2) cam parçaları Minecraft blok parçacığı gibi küçük kareler,
(3) iniş zıplama aracındaki diz çökmesiyle. Pencere kırılması film aracında
henüz yok (4 part tablosu "cam kırılması"). Öneri.

Kaynaklar: [No Film School — breakaway glass](https://nofilmschool.com/2017/08/stunts-101-3-things-you-should-know-about-using-breakaway-glass) ·
[The Slanted Lens](https://theslantedlens.com/using-breakaway-glass/) ·
[Shortlist — camdan geçme sanatı](https://www.shortlist.com/news/ford-go-faster-event) ·
[Yahoo — MythBusters Die Hard](https://www.yahoo.com/entertainment/memorable-die-hard-stunt-tested-073639121.html)

## 39. Zombi sürüsü: eşzamanlılığı kır

- Kimse elli zombinin **tam eşzamanlı** yürümesini istemez: oynatma hızını
  biraz rastgele değiştir.
- Bir beden parçasını (kafa) **1–2 kare kaydır**; fazlası parçayı gövdeden
  kopmuş gibi süzdürür.
- Çeşitlilik: birkaç farklı tasarım (skin), yol ve ölçek rastgeleliği;
  sürünme, ayakta durma, sendeleme, uzanma, yürüme gibi farklı klipler.

**Bizde:** Minecraft zombisinin imzası **öne uzanmış kollar**; sürüde her
zombiye farklı faz ve %5–10 hız farkı, kafaya 1–2 karelik gecikme
(akıcı katmanın "örtüşme"si zaten kol ve başı 0,05 sn geride tutuyor).
Ordu "büyük" olacağı için uzaktakiler §11'deki gibi sisle soluk. Öneri.

Kaynaklar: [No Film School — zombi sürüsü](https://nofilmschool.com/make-zombie-hordes) ·
[Game Developer — UE4 kalabalık](https://gamedeveloper.com/programming/how-to-simulate-ten-zombies-with-ue4-tools-for-rapid-prototyping-and-diverse-crowd-animation) ·
[Lynda — zombi animasyonu](https://origin-www.lynda.com/Animation-tutorials/Zombie/501128/575304-4.html) ·
[Roblox zombi betiği](https://roblox-zombie-animation-script.pages.dev)

## 40. Okçu: çek, dayan, nişan, bırak, devam

- Atış sırası: **çekme → dayama (anchor) → nişan → bırakma → devam**. Devam:
  ok hedefe varana kadar duruş ve baş sabit; yay elden kendiliğinden düşer.
- Dayamada çeken el çene hattı boyunca kayarak yerine oturur.
- (Doğrulanmamış, yapay zekâ sohbet kayıtları) gerçek bırakma ~15–20 ms;
  animasyonda görünür olsun diye ~250–300 ms'ye uzatılıyor.

**Bizde:** Minecraft iskeleti oyunda yayı hep gergin tutar; filmde okun
geldiğini satmak için (§32 işaret) okçu iskeletlerde **çek–dayan** iki
karelik net bir poz, bırakmada yay kolunun hafif geri tepmesi. Bırakma
anı 30 fps'te 1–2 kare (≈ 33–66 ms) yeter; doğrulanmamış rakam
kullanılmadı.

Kaynaklar: [Lincoln Archers — nasıl atılır](https://sites.google.com/view/lincolnarchers2/beginners/how-to-shoot) ·
[Nock On Archery](https://nockonarchery.com/?p=18735) ·
[WBEZ — yay çekmek](https://tools.wbez.org/drawing-a-bow)

## 41. Dönüş (reversal): üstünlüğün el değiştirmesi

- Senaryo dilinde dönüş, sahnenin yönünü ters çeviren an; çoğu zaman
  doruktan hemen önce. Yöntem: sonucu önce planla, sahneyi **tersinden**
  başlat ki geç gelen dönüş onu oraya indirsin. Sahne boyunca **küçük
  dönüşler** gerilimi canlı tutar.
- Bedende: zamanlama, mesafe ya da ritimdeki küçük değişiklikler güç
  değişimini işaret eder; her adım niyeti iletmeli (tiyatro kaynağı).
- Kamera: dövüşün gelgitini ve **ivmeyi kimin kazandığını** gösteren planlar
  (zayıf kaynak).

**Bizde:** onaylı yapı zaten bir dönüş zinciri: gedik (Ice-man üstün) →
sokak (Barış zorlanıyor) → meydan (Barış donuyor — en dip) → buzun
çatlaması (BÜYÜK dönüş: ateş) → merdiven → lav (son). Öneri: büyük dönüşün
önünde **en az iki küçük dönüş** (Barış'ın okların sektiğini fark edip cesaretlenmesi,
Ömer'in buz duvarına vuruşu) ve büyük dönüş anında §18'deki bilinçli eksen
geçişi. Mesafe değişimi de dönüşü taşır: Ice-man'in tuttuğu menzil (§21)
ilk kez kapandığında seyirci üstünlüğün döndüğünü bedenden okur.

Kaynaklar: [Script Reader Pro — dönüşler](https://www.scriptreaderpro.com/tips-for-writing-a-screenplay/) ·
[Barter Theatre](https://bartertheatre.com/?p=64857) ·
[Académie Duello — aksiyon mantığı](https://academieduello.com/?p=3928) ·
[Be On Air — dövüş çekmek](https://beonair.com/?p=10417)

## 42. Ortamın kırılması: okunaklı, eyleme bağlı, az ama ağır

- Bir Pixar animatörü (Animation Mentor): yıkımı dev bina çöküşlerinden
  çok **animatörün elinden çıkan küçük etkileşimlere** çevir; amaç
  benzetim gerçekçiliği değil, okunaklı enerji ve ağırlık. Ağır molozda
  kilit anlarda **güçlü aralık değişimi** (yoksa yumuşak görünür).
- Okunaklılık katmanı: en iyi planlarda **bir şey çok hızlı**, ortamın
  tepkisi biraz daha yavaş (anekdot).
- Oyun bedeli: yerdeki moloz ve duvardaki delikler oyunu zenginleştiriyor
  ama düzensiz kenarlar hareketin akıcılığını bozuyor (Marvel Rivals
  geliştiricileri).
- Film efekti: moloz kendi başına **akan bir ortam** gibi ele alındı
  (Digital Domain, Black Widow).

**Bizde:** kullanıcının kuralı *"ortam direkt kullanılacak"* ve film
aracında yerden kopan toprak, uçan/kırılan blok, blok fırlatma var
(`toprak_parcalari`, dövüş v2). Öneri: (1) her kırılma bir hamleye bağlı
(boşuna yıkım yok), (2) vuran hareket hızlı, moloz biraz yavaş ve ağır
(kısa ağır çekim değil, aralık), (3) moloz yerde kalıyorsa aktörlerin zemin
hesabına girer — zemin_denetim sırası bozulmamalı (Marvel Rivals dersinin
bizdeki karşılığı).

Kaynaklar: [Animation Mentor — yıkım](https://www.animationmentor.com/?p=92487) ·
[Marvel Rivals geliştirici notu](https://www.marvelrivals.com/news/official/20240510/40185_1154481.html) ·
[Digital Domain — Black Widow (CopComm)](https://digital.copcomm.com/i/1399888/57)

## 43. Bekleme duruşu (dövüşe hazır idle): kişiliğin aynası

- Dövüşçünün bekleme döngüsü kişiliği göstermenin en etkili yollarından
  biri; **beden tipi duruşu belirler** (yumruklu iri karakter: boksör
  duruşu; alçak ağırlık merkezli, güçlü bacaklı karakter: karate duruşu).
- **Dövüşe hazır ile rahat duruşun ölçülebilir farkı:** omurga hafif öne
  (rahatta dik), ayaklar biraz daha açık, nefes hızı farklı. Silah tipi
  başına bir duruş (kılıç+kalkan, tüfek, tabanca, çıplak el).
- Katman: alt beden rahat duruşta, üst beden dövüş duruşunda (oyun
  motorları).
- Döngü 2–4 sn, aynı pozla ve aynı hızla başlayıp biter; dövüş ortasında
  duruş değişimi **zıplama** yapıyorsa göze batar.

**Bizde:** film aracında set duruşları WoM'dan (`durus`, `durus_ust`) ve
"duran karakter" nefes + ağırlık aktarması (5,3 sn) var. Kendi
setlerimizin ilk parçası **bekleme duruşu** olmalı, her karakterin
kimliğiyle (öneri): Pipos alçak, geniş, kök salmış (Hung Gar at duruşu);
Barış öne eğik, kısa adımlı, sabırsız; Ice-man dik, asa önde, kıpırtısız
(soğukluk); Ömer ağır, topuz omuzda; arkadaş gevşek, silahlar aşağıda.
Nefes hızı da karakterle değişebilir (Pipos yavaş, Barış hızlı).
`DURUS_GECIS` duruş değişimini zaten yumuşatıyor.

Kaynaklar: [Pixelblog 52 — bekleme dövüş duruşu](https://slynyrd.com/blog/2024/9/26/pixelblog-52-idle-fighting-stance) ·
[MoCap Online — idle tasarımı](https://mocaponline.com/blogs/mocap-news/idle-animation-design-guide) ·
[Woodmere — idle ve kişilik](https://woodmereartmuseum.org/media/pgs/__the_breath_of_life__idle_animation_function_and_character_personality.html) ·
[Homecoming forumu — duruş değişimi](https://forums.homecomingservers.com/topic/25105-set-idle-stance)

## 44. Kötü dövüşünün evreleri (boss fight): her evre yeni bir kural

- Evreler **sayıyı değil mekanizmayı** artırmalı: yeni saldırı deseni,
  ortam tehlikesi, hatta zayıf noktanın değişmesi. Her evresi aynı desen +
  daha çok can olan dövüş başarısız.
- Yaygın yapı (oyun geleneği, kural değil): %75 hafif tırmanma, %50 büyük
  tırmanma (arena fiziksel olarak değişebilir), %25 çaresizlik evresi (her
  şey, daha önce görülmemiş birleşimlerle). Kurulum → komplikasyon → çözüm.
- **İkinci evre bükülme:** öğrenileni çöpe atmaz, büker; ilk evredeki bir
  ipucu sonra karşılık bulur. Evreler bir beceriyi öğretir, sonra daha iyisini
  ister; **nefes payı** bırakılır. Her boss evre istemez; tek güçlü fikirli düello
  da olur.

**Bizde:** onaylı beş mekân = Ice-man'in evreleri ve "arena fiziksel olarak
değişir" kuralı zaten mekân değişimiyle var. Evre başına yeni mekanizma
önerisi: (1) gedik: uzaktan ordu yönetimi, (2) sokak: dolaylı (oklar), (3)
meydan: doğrudan buz (dondurma — Barış'ın dibi), (4) merdiven: buzlu zemin +
yarım küre kalkan (ilk kez savunmaya geçiyor), (5) lav: çaresizlik (buz
sütunları, her şey). İlk evrede **ipucu**: asadaki küre ilk sahnede parlar
(zayıf nokta sonradan karşılık bulur).

Kaynaklar: [Wayline — boss tasarım ilkeleri](https://www.wayline.io/blog/crafting-legendary-boss-battles) ·
[Scoutski — boss design](https://scoutski.github.io/posts/boss-design/) ·
[Nerd Burglars — üç evre](https://nerdburglars.net/the-trifecta-of-power-understanding-the-three-stages-of-video-game-boss-battles/) ·
[Medium — çok evreli boss](https://medium.com/@scott.sourile/designing-a-multi-phase-boss-encounter-in-unity-pt-1-b06ed37aa3f0)

## 45. Güç uyanışı: birikim, patlama, sessizlik — ve bedel

- Sesi taşıyan birikim: davullar şarj boyunca büyür, dönüşümde gür bir
  patlama, **ardından sessizlik** (an akılda kalır). Tek efekt değil, bir
  dizi: hazırlık → sahneleme → karşılık.
- Katmanlı küçük ayrıntılar (gözyaşı, moloz, arka plandaki tepkiler) durdurup
  bakana ödül verir.
- Güç bir **uyarı** gibi de çerçevelenebilir: seyirci kahramanın o güce sahip
  olmasını istemez (Attack on Titan yorumu).
- **Bedel:** güçlü dönüşümlerin ortak özelliği fiziksel, zihinsel ya da ahlaki
  bir bedel.

**Bizde:** onaylı an Part 3 sonunda: Barış buzun içinde bağırıyor, **gözleri
parlıyor**, ateş. Öneri dizisi: buzun içinde sessizlik → kalp atışı sesi →
gözlerde kıvılcım → buz içten turuncu ışır (çatlaklar) → patlama → bir an
sessizlik → Barış ayakta. Bedel ve uyarı fikri sezonun sırrıyla örtüşüyor
(Satanachia Barış'ın içinde; gücün nereden geldiği belirsiz — kayıtta
"ağrıların geçmesi Satanachia ile ilgili DEĞİL", ateşin kaynağı ise
cadının kitabı). Bedelin ne olduğu kullanıcının kararı, uydurulmadı.

Kaynaklar: [Inbetween Drafts — güç uyanışları](https://inbetweendrafts.com/the-most-iconic-anime-power-up-scenes/) ·
[WatchMojo — uyanış sahneleri](https://watchmojo.com/articles/top-20-anime-power-awakening-scenes) ·
[Fiction Horizon — en çok durdurulan anlar](https://fictionhorizon.com/most-paused-anime-moments/)

## 46. İlk aksiyon sahnesi karakteri tanıtır

- İlk sahne kahramanı **eylemle** tanıtma fırsatı: göster, anlatma; seyirci
  karakteri ne yaptığından öğrenir. Tanıtım eylemin kendisi olabilir.
- İlk dövüşün iki işi var: tanıtmak ve sonraki sahnelere **karşılaştırma
  ölçüsü** olmak (Rurouni Kenshin dökümü).
- **Davranış ne yaptığını, seçim kim olduğunu söyler:** küçük bir çatışmadaki
  karar karakteri tanımlar.

**Bizde:** Part 2'de Barış'ın ilk hareketi bir **seçim**: Zisa "bu hâlinle
yapamazsın" derken *"Gideceğim, onlara yardım edeceğim"* — camı kırıp atlıyor.
Bu, sezonda Barış'ın kim olduğunu söyleyen an. Öneri: atlayışın ilk planı
yüzünde kararlılık (siluet net), dövüşte ilk hamlesi **ölçü** olur (sokakta
zorlanması sonraki ateşli hâlle karşılaştırılacak). Ice-man'in tanıtımı da
eylemle: konuşmadan, fırtınayı koyulaştırarak (Düşünme 1).

Kaynaklar: [No Film School — karakter tanıtmak](https://nofilmschool.com/2016/07/how-to-introduce-your-movie-character) ·
[No Film School — Joker'in otobüs çevirmesi](https://nofilmschool.com/dark-knight-bus-flip-joker-introduction) ·
[TV Tropes — Establishing Character Moment](https://tvtropes.org/pmwiki/pmwiki.php/PlayingWith/EstablishingCharacterMoment) ·
[Writer's Digest — kahramanı tanıtmak](https://writersdigest.com/write-better-fiction/how-to-introduce-your-hero-speculative-version)

## 47. Akıl hocası dövüşü: ölçülülük, göstererek öğretme

- Ustanın dövüşünde **ölçülülük**: gerçek dövüşçü çatışma aramaz ama gerekince
  kararlı biçimde çözer ("bilgi ve savunma için, savaş için değil").
- **Anlatarak değil göstererek** öğretir; dolaylı, mecazlı dersler, beceriyle
  birlikte karakter.
- Yazım dersi: idman dövüşü öğrenmek için değil, **denetimli dövüştür**;
  büyümeyi gösterme fırsatı. Gerçek tehlike yoksa "dövüş" sayılmaz.
- Ahlaki sınır: usta öğrencisine nerede duracağını da öğretir.
- Uyarı: "bilge yabancı usta" klişesine düşmemek.

**Bizde:** Pipos'un Kaplan sanatı kuralı (savunma önde, ölçülü, tek
bitiriş) bu ölçülülüğün beden hâli. Öneri: Pipos dövüşte **rakibini
yaralamadan durdurabildiği hâlde** gerekince tek kararlı bitiriş yapar;
Barış'a (ileride) sözle değil hareketle öğretir — ör. bir saldırıyı tek
kısa geri adımla boşa çıkarıp Barış'a bakar. Pipos'un kendi kimliği
(kullanıcının arkadaşının karakteri, sarı-altın skin) klişeden uzak; ırk
ya da köken üzerinden "bilgelik" kurulmaz.

Kaynaklar: [No Film School — "wax on, wax off"](https://nofilmschool.com/wax-on-wax-off-karate-kid-meaning) ·
[Writer's Digest — idman dövüşü](https://writersdigest.com/write-better-fiction/writing-scenes-with-sparring-fightwrite) ·
[TV Tropes — Opponent Instruction](https://tvtropes.org:443/pmwiki/pmwiki.php/Main/OpponentInstruction) ·
[GamesRadar — bilge akıl hocaları](https://www.gamesradar.com/the-30-wisest-movie-mentors/3)

## 48. Koruma büyüsü / kalkan: gözün olduğu yerde, çarpınca görünür

- Okunaklılık **gözün baktığı yerde** olmalı: kalkan kabarcığı kartın çevresinde
  kalınca fark edilmiyordu; daha parlak, yüzün üstündeki işlem daha iyi
  okundu (Legends of Runeterra oyuncu geri bildirimi). Kalkan biraz dikkat
  dağıtmalı.
- VFX'e kullanıcı deneyimi ilkeleri: **mavi** kalkan ve büyüyle
  özdeşleşmiş; bilinen görsel dili yeniden kullan (iyileşmeye artı gibi).
- Kalkan **çarpınca** görünür: boştayken uyuyan, vurulunca dış çizgisi
  parlayan ve mermiyi parçacığa ayıran bariyer; çarpma tepkisi, çatlak,
  enerji dağılması.

**Bizde:** Zisa'nın koruma büyüsü onaylı biçimde **görünmez** başlıyor:
Barış onu "okların çarpıp sekmesiyle fark ediyor". Bu, araştırmayla bire bir
uyumlu: kalkan boşta görünmez, **çarpınca** Barış'ın bedeninin dış çizgisi
Zisa'nın büyü renginde bir an parlar, ok parçalanıp seker. Renk: Zisa'nın alın
sembolünün rengi (perçem/alın sembolü taslağı) — mavi geleneği yerine onun
kendi rengi, kimlik için.

Kaynaklar: [Mighty Bear — UX ve VFX](https://medium.com/mighty-bear-games/how-ux-design-can-help-with-vfx-a0925f80e0f0) ·
[Legends of Runeterra — Spellshield görünürlüğü](https://outof.games/devtracker/legends-of-runeterra/reddit/r-legendsofruneterra/11143) ·
[UAL öğrenci projesi — bariyer](https://20035428.myblog.arts.ac.uk/?p=1114)

## 49. Kötünün sonu: düşüş, ağır çekim, yüz, müzik

- "Disney kötü ölümü": zafer konuşmasından sonra düşerek ölen kötü; kamera
  çoğu zaman **çarpmadan önce** başka yere kesilir.
- Lav çukuru oyunlarda yaygın son; "lav yumuşak bir iniş sunmaz" — son
  kesinleşir.
- Etkiyi taşıyanlar: **ağır çekim, müzik ve karakterin yüz ifadesi**
  (WatchMojo); oyunculuk ve güçlü müzik (Mustafar yorumu).

**Bizde:** onaylı son: Barış Ice-man'i lav çukuruna düşürüyor, ağır çekim,
Ice-man ölüyor, ordu dağılıyor. Öneri: (1) ağır çekim düşüşün **başında**
(Ice-man'in gözleri — yüzü Minecraft'ta sabit, ifadeyi gözlerin ışığı ve
asanın küresinin sönmesi taşır), (2) lava değmeden kesme (çarpma yerine
yükselen buhar ve sönen buz ışığı), (3) bir an sessizlik (§45 ile aynı
ilke), (4) sonra ordunun dağılması (sonucun dünyadaki karşılığı).

Kaynaklar: [TV Tropes — Disney Villain Death](https://tvtropes.org/pmwiki/pmwiki.php/DisneyVillainDeath/VideoGames) ·
[Destructoid — Crocomire](https://destructoid.com/?p=20507) ·
[WatchMojo — düşerek ölen kötüler](https://www.watchmojo.com/articles/top-10-movie-scenes-where-villains-fall-to-their-death) ·
[Far Out — yer çekimiyle ölen kötüler](https://faroutmagazine.co.uk/exploring-cinematic-curiosity-villains-killed-by-gravity/)

## 50. Birlikte dövüşen iki kişi: sırt sırta, tamamlayıcı stiller

- "Rakipler birleşir": ortak düşmana karşı geçici ya da kalıcı ittifak;
  zaten dostça bir rekabet varsa birleşme kolaylaşır.
- **Sırt sırta** dövüşen ikili, aralarındaki atışmayla bile birbirini kollar
  (Bash Brothers kalıbı). Zıt stiller önce çatışır, sonra birbirini tamamlar
  (Cobra Kai 4. sezon: iki dojo birleşir, stiller hemen çatışır).
- Bu ikili dövüşlerin koreografi dökümü için ayrıntılı kaynak çıkmadı.

**Bizde:** Pipos ve çocukluk arkadaşı ileride birlikte dövüşürse doğal
tamamlayıcılık: **yakın ve kök (Pipos, Hung Gar, karşı vurucu) + menzil ve
çeviklik (arkadaş, iki tabanca)** — biri yakına geleni karşılar, öteki
uzaktakini. Barış ile Pipos arasında usta-öğrenci, Barış ile arkadaş
arasında çocukluk dostluğu: sırt sırta an bu iki ilişkiye farklı tat verir.
Hikâyede birlikte dövüşüp dövüşmeyecekleri kullanıcının kararı.

Kaynaklar: [TV Tropes — Rivals Team Up](https://tvtropes.org/pmwiki/pmwiki.php/Main/RivalsTeamUp) ·
[TV Tropes — Bash Brothers](https://tvtropes.org:443/pmwiki/pmwiki.php/Main/BashBrothers) ·
[Tom's Guide — Cobra Kai 4](https://www.tomsguide.com/news/ralph-macchio-reveals-cobra-kai-season-4s-most-exciting-storyline)

## 51. Komutan: önden giden, kritik anda toparlayan

- Ortak kalıplar: **önden savaşan komutan**, kritik anda söylenen toparlama
  cümlesi, lider ile askerleri arasındaki güveni gösteren **sessiz insani an**.
- Örnekler: ilk inen ve son ayrılan komutan; asker cephesini savunan albay;
  liderliği yalnız aksiyonla değil kişisel anlarla kurulan lider.

**Bizde:** Ömer onaylı olarak "elinde topuzla geliyor", buz duvarını
kıramıyor, sonra hanedana ilerleyen orduyla savaşıyor — önden giden
komutan. Öneri: (1) gelişi askerlerin tepkisiyle (askerler onu görünce
duruşlarını toplar), (2) duvarı kıramadığı an komutan için yenilgi değil,
**yön değişimi**: hemen askerlerine dönüp onları orduya yönlendirir
(toparlama anı; cümle kullanıcınınsa yazılır, uydurulmaz), (3) savaş
odasındaki sakin "Tamam." ile bu sahne arasındaki zıtlık zaten karakteri
kuruyor.

Kaynaklar: [TV Tropes — Frontline General](https://tvtropes.org/pmwiki/pmwiki.php/Main/FrontlineGeneral) ·
[Task & Purpose — takip edeceğimiz kurgusal komutanlar](https://taskandpurpose.com/culture/5-fictional-military-leaders-wed-actually-follow-combat/) ·
[Stony Brook — Gettysburg ve liderlik](https://you.stonybrook.edu/leadership/2015/02/16/gettysburg)

## 52. Kılıç ve kalkan: önce ayak, kalkan köşesi, kalkanla vuruş

- **Önce ayak işi:** uzun kılıç okullarında kılıçtan önce ayak öğretilir;
  Alman okulu zamanlama, ayak, bağlama ve döndürme üzerine.
- **Kalkan kapanır:** kalkanın köşesi düz vuruşu karşılar, kalkanı
  kaldırmaya gerek kalmaz; kol ~45° açıyla. Saldırıların çoğu kalkan
  tarafına iner.
- **Kalkanla vuruş:** 14. yüzyıl I.33 elyazmasına dayanan kılıç-bokleri
  derslerinde kalkan tarafında bağlama, kalkanla vuruş, kılıcı taşıyıp
  saplama ya da kalkanla vuruş.
- Mesafe: vurmak için çoğu zaman adım atmak gerekir; adımsız saldırı da
  vardır, mesafe yönetimi önemli.

**Bizde:** gedikteki ağır zırhlı sur askerleri (gri sur askeri skini) için
dövüş dili: kalkan önde ~45° (gediği kapatan duvar, §29), zombi gelince
**kalkanla itme**, ardından kısa kılıç vuruşu; ileri değil yerinde (hattı
bozmamak). Askerin kendi hamle seti bu üç hareketle yeter: kalkanla
karşıla, kalkanla it, kısa vur. Kayıtta askerin silahı yazılı değil —
kılıç-kalkan öneri, kullanıcı seçer.

Kaynaklar: [SCA Drachenwald — kalkan](https://sca-drachenwald.gitlab.io/archive/node/155.html) ·
[Dimicator — I.33 kılıç ve bokler](https://dimicator.teachable.com/p/the-medieval-art-of-fighting-with-sword-buckler) ·
[Medium — Fight Earnestly](https://medium.com/universe-factory/fight-earnestly-ceb0eccc117f) ·
[Castle Duncan — kılıç kalkan](https://castleduncan.com/forum/topic/148-sword-and-shield-combat/)

## 53. Surun delinmesi: yük, patlama, duman, açıklık, geçiş

- Gerçek bir sur yıkma gösteriminde **sıra:** patlayıcılar duvara yerleşir →
  patlama → duman yükselir → açıklık → tanklar geçer. Bu, kullanılabilir bir
  vuruş sırası.
- Efekt ekibi: kırılan parçalar benzetildikten sonra **ince toz ve küçük
  moloz** eklemek ölçeği ve gerçekliği sattı.
- Tepki: duman içinden geçen askerler, moloz bir askeri siper almaya zorlar.

**Bizde:** Düşünme 1'in son vuruşu "sur patlıyor". Sıra önerisi:
(1) creeper'lar karın içinde sura yaklaşır (Ice-man'in fırtınası saklıyor —
seyirci görür, askerler görmez: §32 işaret seyirciye verilir),
(2) creeper'ın tıslama sesi + yanıp sönmesi (Minecraft'ın kendi işareti),
(3) patlama, (4) toz ve küçük blok parçaları, (5) gedik açılır, (6) zombiler
dumanın içinden geçer, askerler siper alır ve kalkan duvarı kurar (§29, §52).
Film aracında blok kırılması ve parçalar var; creeper patlaması yazılmadı.

Kaynaklar: [CriticalPast — duvar yıkma gösterimi](https://www.criticalpast.com/video/65675058853_bar-charges_smoke-rises_tanks-pass_gap-created_18-feet-wide-gap) ·
[The Mill — yıkım efekti](https://archive.themill.com/portfolio/2716/mobile-strike---arnold%27s-fight) ·
[Variety — Warfare patlama sahnesi](https://variety.com/2025/film/news/how-warfare-created-ied-explosion-military-flyover-injuries-real-life-soldiers-1236366483)

## 54. Kar fırtınasında savaş: siluet, sis yoğunluğunun sürekliliği

- Sisli savaşta en zor şey **ışığın ve sis yoğunluğunun** planlar arasında
  sürekli kalması; sis içinde önden ya da yandan güneş yanlış görünüyor;
  sis **atlıların içinden çıkmasına** izin veriyor (ASC, 2004).
- Arka ışık dramatik siluet verir ama ayrıntıyı korumak için pozlama dikkat
  ister.
- Kalabalık sahnede seçili yapılara sis eklemek onları öne çıkarır ve derinlik
  kurar; sis koyulaştıkça yalnız insanların ve binaların dış çizgisi kalır.
- (Zayıf kaynak) Winterfell savaşında beyaz perde yalnız seyirciyi değil iki
  tarafı da zorladı.

**Bizde:** Part 2'nin fırtınası onaylı ("doğudan gelen fırtına göğün yarısını
karartıyor", Pooka karı ve Kenney dumanı seçili). Kurallar: (1) **sis/kar
yoğunluğu bir senaryo değeri olarak sabitlenir**, planlar arasında
değişmez (süreklilik), (2) düşman fırtınanın **içinden çıkar** (Ice-man'in
ordusu karın içinden belirir — korku), (3) Ice-man fırtınanın önünde arka
ışıkla siluet, (4) fırtına iki tarafı da zorlar: okçular creeper'ları göremez
(Düşünme 1'in mantığı bu).

Kaynaklar: [ASC — sisli savaş (2004)](https://theasc.com/magazine/jan04/cover/page3.html) ·
[ASC — Normal'in kar fırtınası](https://theasc.com/articles/normal-cinematography-salas) ·
[Roger Deakins forumu — yoğun sis](https://www.rogerdeakins.com/?p=215052) ·
[The Week — GoT'nin havası](https://theweek.com/articles/838418/im-obsessed-game-thrones-weather)

## 55. Gizli bir durumu önceden sezdirmek (önceden ekme)

- Örtük ipuçları: tekrar eden simge ve motifler (erken görünen nesne kritik
  sahnede döner). Karakterin **tereddüdü ya da olağandışı davranışı** sonraki
  seçimlerini sessizce işaret eder.
- Tekrarlanan, alışılmadık biçimde vurgulanan ya da duygusal anlara bağlanan
  ayrıntılar, sonradan yeni anlam kazanınca önceden ekmedir.
- Denge: her şey önceden sezdirilmez; bazı dönüşler beklenmedik kalmalı.
  İyi önceden ekme ikinci izlemede ödüllendirir (Altıncı His).

**Bizde:** sezonun sırrı (Satanachia Barış'ın içinde; Barış 3. bölümde
öğreniyor; ruh girerken Barış bir an çarpık skine dönüyor — onaylı). Dövüş
diliyle önceden ekme önerisi: Barış'ın ateşinde **bir tek kare** kırmızı-siyah
(çarpık rengi) kıvılcım; ya da Barış'ın bekleme duruşunda, öfkelendiği bir
an, başın Satanachia'nın tek kırmızı gözlü bakışına benzer küçük bir eğimi
(3. bölüm sonunun gölge sahnesiyle aynı motif). Az ve tekrar eden: her
part'ta en çok bir kez. İpucunun içeriği kullanıcının kararı.

Kaynaklar: [Literary Devices — foreshadowing](https://literarydevices.net/foreshadowing-explained-how-it-shapes-storytelling-writing/) ·
[Vaia — karakter eylemleriyle önceden sezdirme](https://vaia.com/en-us/explanations/english/creative-writing/foreshadowing-character-actions) ·
[Spec Stories — the art of foreshadowing](https://specstories.substack.com/p/the-art-of-foreshadowing) ·
[Filmlifestyle — foreshadowing](https://filmlifestyle.com/what-is-foreshadowing/)

## 56. Yeni gücün ilk kullanımı: acemi, sonra ustalık

- Büyüme yavaş: küçük deneyimler birikir, yeni davranış **çekinerek
  denenir**, eski kalıba geri kayma olur. Evreler: başta eski davranış +
  rahatsızlık ipucu; erken ortada ilk çekingen denemeler; ortada yeni
  davranış sıklaşır ama tutarsız.
- Üç sahne testi: başlangıç, dönüm noktası, son — her biri yayın ilerleyişini
  göstermeli.
- Acemi hatanın mizahı ile gerçek büyüme olasılığı arasında denge; yeni güç
  bazen **güç tükenmesi bayılması** ile gelir; tam denetim, bedeli ödendikten
  (alıştırma ya da başarısızlık) sonraki karşılık sahnesine saklanır. Başından
  beri usta bir karakter, acemiyi daha görünür kılar.

**Bizde:** Barış'ın ateşi için üç sahne testi zaten kurulabiliyor:
(1) başlangıç — kulübede kitabı okuyor (Part 1, ateşi henüz kullanmıyor),
(2) dönüm — buzun içinde ilk ateş (Part 3 sonu; ham, denetimsiz, öfkeli),
(3) son — lav çukurunda ateşin denetimli kullanımı (Part 4). Öneri: Part 3'teki
ilk ateş **fazla büyük ve dağınık** (Barış'ı da sendeletir), Part 4'te daha
toplu ve isabetli (Kor Yürüyüşü bilinçli). Ustalık yolculuğunu Pipos'un
başından beri usta hâliyle zıtlık güçlendirir (§47). Bedel kullanıcının kararı.

Kaynaklar: [Literary Devices — karakter yayı](https://literarydevices.net/mastering-character-arc-how-to-trace-growth-change-in-stories/) ·
[TV Tropes — New Super Power](https://tvtropes.org/pmwiki/pmwiki.php/Main/NewSuperPower) ·
[TV Tropes — How Do I Shot Web](https://TVTropes.org/pmwiki/pmwiki.php/Main/HowDoIShotWeb) ·
[River — belirgin yay anı olmadan büyüme](https://rivereditor.com/guides/how-to-show-character-growth-without-obvious-arc-moments-2026)

## 57. Kiai: vuruşla nefes, bağırış ve onun bedeli

- Kiai (Korece kihap): odak, nefes yönetimi ve tekniğe güç; yeni başlayanlar
  farkında olmadan nefesini tutar, kiai **vuruşta tam nefes vermeyi** öğretir.
  Bazılarına göre önemli olan ses değil **nefes vermenin kendisi** (karın ve
  gövde kasları). Ses şart değil; iyi bir kiai her zaman yüksek değil.
- Kullanımlar: rakibi ürkütmek, sindirmek, güven ya da zafer göstermek.
- Taktik bedel (forum): nefes vererek vuran kişi bir sonraki nefese kadar
  kısa bir an güçsüz kalır — karşı saldırı penceresi; bağırış vuruşu **önceden
  işaret eder**.

**Bizde:** her karaktere bir **ses kimliği** (ses kaydı kararı açık): Barış
güçlü vuruşta kısa bağırış (buzdaki onaylı bağırış bunun doruğu), Pipos
**sessiz** — yalnız nefes (karşı vurucunun sükûneti; bağırmak açık verir),
Ice-man hiç ses çıkarmaz (soğukluk), Ömer topuzu indirirken derin bir
"hıh", askerler toplu bağırış (gedikte cesaret). Bağırışın açık verdiği an
Pipos'un karşı vuruş anı olabilir (§35). Öneri.

Kaynaklar: [Black Belt — kiai'nin tarihi](https://www.blackbeltmag.com/the-kiai-history-usage-and-application-in-martial-arts) ·
[Merakata — kiai sadece bağırış değil](https://merakata.substack.com/p/kiai-more-than-a-shout) ·
[The Martial Way — kiai](https://www.themartialway.com.au/kiai/) ·
[Kendo Guide — nefes](https://www.kendo-guide.com/breathing_in_training.html)

## 58. Kötünün sükûneti: kıpırtısızlık güçtür

- Tehdidi bedenle oynamamak: tehdit sözde, seste ve gözde; beden **sakin**
  kalır, kıpırtısızlık güç kaynağı. Hannibal Lecter neredeyse kımıldamaz;
  bir baş eğmesi bile ağırlık taşır.
- Kusursuz duruş, **az jest, verimli hareket** otorite iletir (Esposito
  üslubu); bakışı tutmak gözle görülür bir eylem olmadan güç gösterir.
  Hareketsiz kalınca her nefes ve bakış kayması bilinçli görünür.
- Karşı görüş: tedirgin edici, öngörülemeyen jestler de bir seçenek.

**Bizde:** Ice-man (Deney 081) için çok güçlü ve ucuz bir kural: **en az
hareket eden karakter o.** Bekleme duruşunda nefes salınımı neredeyse sıfır,
dönüşleri yavaş ve tek seferde, büyüsünü tek bir asa hareketiyle atar; Barış
ne kadar çok hareket ederse Ice-man o kadar az. "Bu kadar kolaysın" anı
kıpırtısız söylenir. Sezonun ana kötüsü (karanlık odadaki iki beyaz göz)
de aynı ilkeyle zaten kurulu: bedeni yok gibi, yalnız gözler.

Kaynaklar: [Prompt Index — Anthony Hopkins üslubu](https://www.thepromptindex.com/skill/2632-actor-style-anthony-hopkins) ·
[Prompt Index — Giancarlo Esposito üslubu](https://www.thepromptindex.com/skill/2523-actor-style-giancarlo-esposito) ·
[Aeon — Willem Dafoe'nun pozları](https://archive.aeon.org/arc/prime-suspense-willem-dafoes-poses-as-a-visual-language-of-intensity-and-emotion)

## 59. Hareket ekonomisi: bekleme pozu imza, vuruşu pozlar satar

- Bekleme pozu karakterin **görsel imzası** ve her hareketin tabanı; güçlü
  bir bekleme pozu bütün animasyon sürecinde karşılığını verir (Gnomon).
- İnandırıcı vuruş animasyonu düzgün hareketten çok **özenle kurulmuş poz
  dizisine** dayanır.
- Sifu (dövüş oyunu) hareketlerini elle anahtar kareledi, yalnız yere
  serme hareketlerinde hareket yakalama kullandı.
- Ağır vuruşa toparlanma karesi; sağlam taban (omuz genişliğinde ayak)
  burulma gücü üretir (zayıf kaynak). Tam bir dövüş oyunu karakteri 200–500
  animasyon ister — bu yüzden ekonomik hamle setleri.

**Bizde:** "kendi hamle setlerimiz" için ölçek dersi: bir karakter için
200 değil, **bekleme + 4–6 hamle + 2 tepki** yeter (film, oyun değil).
Önce bekleme pozu (imza), sonra hamleler o pozdan doğar ve ona döner. Elle
anahtar kare (Sifu gibi) bizim yöntemimiz zaten (`film_poz.py`).

Kaynaklar: [Gnomon — stilize saldırı animasyonu](https://bit.thegnomonworkshop.com/workshops/animating-stylized-attacks-in-maya) ·
[Digital Trends — Sifu animasyon söyleşisi](https://digitaltrends.com/gaming/sloclap-sifu-animation-interview) ·
[MoCap Online — dövüş sanatı animasyonu](https://mocaponline.com/blogs/mocap-news/martial-arts-animation-fighting-styles) ·
[CORE — 2B dövüş oyunu karakter animasyonu tezi](https://core.ac.uk/download/38089441.pdf)

## 60. Büyü atma pozu: büyünün çıktığı yer, yerden yukarı, yön

- Önce büyünün **nereden çıktığına** karar ver, el şekline sonra: yalnız el
  jestiyle kurulan poz büyülü görünür ama bedenden kopuk durur; kol, omuz ve
  gövde ellere açıkça bağlanmalı.
- Hareket **yerden yukarı** başlar: ayak, kalça ve gövde hareketin güçlü mü,
  denetimli mi, zahmetsiz mi hissettireceğini belirler.
- Jestin **yönü** net olmalı: büyü görünmez olsa da enerjinin nereden gelip
  nereye gittiği hissedilmeli. Önce his seçilir (hızlı/yavaş, denetimli/
  kaotik, güçlü/narin), poz birden çok açıdan denenir.
- Dört karelik örnek: 1 hazırlık (asa aşağı-geri, beden kıvrılır), 2 asa
  başın üstüne, tepe karesi **bambaşka bir siluet**, son kare beklemeye
  döner. Etki **bırakma karesinde** tetiklenir, başlangıçta değil; ses de
  bırakmaya denk gelir.
- Minecraft notu: başka bir animasyon kolları ezince büyü atma pozu hiç
  görünmüyor — oyuncu "hiçbir şey olmuyor" sanıyor.

**Bizde:** büyülü üç karakter için doğrudan kural: **Zisa** — büyü alnındaki
sembolden ve göğüsten çıkar (onaylı alın sembolü), jest içe çekip dışa
yayar (koruyucu, kapsayıcı); **Ice-man** — büyü asanın küresinden çıkar
(zayıf nokta orada), jest kısa ve aşağı (kontrol, §58); **Barış** — ateş
avuçtan ve ayaktan çıkar (Kıvılcım avuç, Kor Yürüyüşü ayak), jest geniş ve
ileri (Kuzey Shaolin, §16). Hepsinde efekt **bırakma karesinde** başlar;
film aracında efekt olayları zaten `t` ile yazılıyor — bırakma karesine
bağlanmalı. Film pozu kolu yönetirken setin duruşu kolları ezmemeli
(Minecraft notu; araçta katman sırası bunu zaten çözüyor).

Kaynaklar: [PoseMyArt — büyü pozları](https://posemy.art/blog/drawing-spell-casting-poses/) ·
[OpenMW — büyü bırakma anahtarı](https://git.cijber.net/mirror/openmw/commit/447e93bdb4a8bbceb9dca3da8aea714959073e67) ·
[Hive Workshop — kanal + atma animasyonu](https://www.hiveworkshop.com/threads/channel-cast-time-animation.261346) ·
[Opsive — büyü eylemleri](https://opsive.com/support/documentation/ultimate-character-controller/items-inventory/character-item/item-actions/usable/magic/)

## 61. Son darbeden önceki durgunluk ("ma")

- Japon sinemasında **ma**: anlatıyı güçlendirmek için bilinçli durgunluk,
  duraklama ya da boşluk; son savaştan önce orman yolunda samurayın
  kıpırtısız durduğu geniş plan (Miike).
- *Kill Bill: Vol. 1* dökümü: doruk başlarken iki taraf da durup birbirini
  tartar; sonra saldırılar hızlanır, son darbeye varır (son darbe ~8 sn, hızlı
  değişimler ~110 sn).
- *The Raid 2* karambit dövüşü: kesik hızlı değişimler, her biri ötekinin
  hızını ve stilini sınar, sonra **durup bakar, izler, bekler**.
- Ses: darbeden hemen önce **ani sessizlik** (The Night Comes for Us dökümü).

**Bizde:** bütün dövüşlerin ortak kuralı olarak: **son darbeden önce bir
"ma"** — iki taraf durur, ses kesilir, sonra tek hamle. Pipos'un "tek
bitiriş"i (§6, §35), Barış'ın lav çukurundaki son darbesi (§49) ve
Ice-man'in "Bu kadar kolaysın"ı bu boşluğu taşır. Düşünme anları (beş mekân,
yedi düşünme) dövüş içindeki küçük ma'lar; son darbe öncekisi en uzunu.

Kaynaklar: [LibreTexts — sinemasal durgunluk ve ma](https://human.libretexts.org/Courses/Nashville_State_Community_College/Tokyo_in_Film/03:_Production/3.05:_Cinematic_Stillness_and_the_Power_of_Ma) ·
[GamesRadar — The Raid 2 karambit dövüşü](https://www.gamesradar.com/five-minutes-of-beautifully-choreographed-violence-the-karambit-fight-is-the-best-bit-in-the-raid-2) ·
[Find This Movie — Kill Bill doruğu](https://findthismovie.com/?p=86504)

---

# Üçüncü tur (2026-11-08): eksik araç maddelerinin nasıl yapılacağı

Kullanıcı: *"daha fazla araştırma yap, hepsini de ekle"*. Bu tur "ne
olmalı"yı değil, `DOVUS_KIMLIKLERI.md` 12. bölümde araca dönüşmemiş
maddelerin **nasıl** yapılacağını araştırdı. Kaynakların çoğu oyun
geliştirme yazıları ve forumlar; sayılar başlangıç noktasıdır, standart değil.

## 62. Vuruş donması (hitstop): sayılar ve filmdeki karşılığı

- Dövüş oyunlarında temas anında **iki karakter de** donar; güçlü vuruşta
  ekran sarsıntısı eşlik eder. Sakurai: donmanın süresi, hareket, kamera
  uzaklığı ve titreşimle birlikte ayarlanır; Smash'te donma hasarla büyür.
- Sayılar (60 fps): bir topluluk kaynağına göre çoğu oyunda hafif ~9, orta
  ~11, ağır ~13 kare; eski Street Fighter II ~14 (vuruş gücünden bağımsız);
  Capcom'un örneği 8 kare. Oyunda donma girdi zamanlamasına da yarıyor —
  filmde bu ihtiyaç yok.
- Geliştirici rehberi: ağır vuruşta **50–100 ms** bile vuruşun gerçekten
  oturduğunu hissettiriyor; uzun donma takılma gibi, çok kısa olan fark
  edilmiyor.
- Film/animasyon: kurguda kare tutma (aynı kareyi çoğaltma), süre çarpanla.

**Bizde:** 30 fps'te hafif 1, orta 2, ağır 3 kare (33/67/100 ms) rehberin
aralığında; oyunların büyük sayıları girdi içindi, alınmadı. Donma **bütün
sahnenin zamanını** durdurur (iki taraf da donar), temas karesinden başlar.

Kaynaklar: [Source Gaming — Sakurai'nin hitstop yazısı (çeviri)](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/) ·
[Ultra Combo forumu — donma süreleri](https://forums.ultra-combo.com/t/why-isnt-hitstop-duration-standardized/24838) ·
[critpoints — hitstop](https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/) ·
[Bugnet — hitstop ayarı](https://bugnet.io/blog/how-to-fix-hitstop-or-freeze-frame-feeling-off) ·
[Capcom SFV sütunu](https://game.capcom.com/cfn/sfv/column/131545)

## 63. Kamera sarsıntısı: "travma" modeli, düzgün gürültü, yön

- Eiserloh (GDC 2016, "Juicing Your Cameras With Math"): 0–1 arası bir
  **travma** değeri; her olay ekler, doğrusal söner; görünen sarsıntı
  **travmanın karesi (ya da küpü)** — küçük vuruş zar zor, büyük vuruş sert.
  Rastgele sayı yerine **düzgün gürültü** (Perlin): kare kare zıplamaz.
- Yön: sarsıntı vuruş yönüne eğilimli olursa gücün yanında **yönünü** de
  anlatır. Hızlı sönen sarsıntı patlayıcı darbe gibi okunur.
- Ölçü: hak edilmiş anlara sakla (öldürücü darbe gibi); sürekli sarsıntı
  etkisini yitirir.

**Bizde:** her temasta ağırlığa göre travma (hafif az, ağır çok), savunulan
vuruşta daha az; sarsıntı = travma², düzgün gürültüyle, vuruş yönüne
eğilimli, ~0,4 sn'de söner. Bugünkü sarsıntı yalnız kombonun son vuruşunda.

Kaynaklar: [GDC Vault — Juicing Your Cameras With Math](https://gdcvault.com/play/1023146/contactUs) ·
[Bevy — 2B sarsıntı örneği (konuşmayı izler)](https://bevy.org/examples/camera/2d-screen-shake/) ·
[Screen shake rehberi](https://gamejuice.pages.dev/articles/screen-shake-guide)

## 64. Darbe karesi (impact frame)

- Animede doruk anında 1–3 karelik, sahnenin renklerini sert siyah-beyaza ya
  da negatife çeviren kareler; sakuga geleneğinin parçası, One Piece Wano
  bölümlerinde Vincent Chansard'ın kareleriyle yaygınlaştı.
- Kaynaklar zayıf (süre bilgisi tek ve düşük yetkili sayfadan).

**Bizde:** her vuruşa değil, yalnız **adı konmuş doruk vuruşlarına**
(Barış'ın ilk ateşli darbesi, son darbe): 1–2 kare yüksek kontrast. Karar
sahne yazılırken, kullanıcıya önizlemeyle sorulur.

Kaynaklar: [Know Your Meme — impact frames](https://knowyourmeme.com/memes/cultures/impact-frames) ·
[Mob Psycho 100 sakuga çalışması](https://journal.uitm.edu.my/index.php/IJAD/article/view/1014)

## 65. Yumruğun zamanlaması: hazırlık, temas, oturma

- Yapı: kurma → uzanma → temas → toparlanma; kol vuruşa **hızlanarak** girer,
  toparlanırken yavaşlar. Kurmadan sonra **kısa bir duraklama** hareketi
  okunur kılar; çok küçük ya da kısa hazırlık hızı satamaz.
- 3B'de yumruk yüze değerken **hızlanmaz**, yavaşlar (Polycount eleştirisi).
- Vuruş sonrası hafif **aşma ve oturma**; "hazırlığı uzat, teması kısalt,
  oturmayı uzat" vuruşu keskinleştirir.

**Bizde:** kendi hamle setlerimizin künyesi (`kunye_dogrula`) buna göre:
`baslangic` içinde görünür bir duraklama, temas kısa, `toparlanma` uzun.

Kaynaklar: [Toon Boom — hazırlık ilkesi](https://learn.toonboom.com/modules/animation-principles/topic/anticipation-principle) ·
[Polycount — yumruk eleştirisi](https://polycount.com/discussion/comment/2563876) ·
[Medium — hazırlık](https://medium.com/@brijeshkumarmishra59/anticipation-in-animation-79e0512d7a36)

## 66. Darbe tepkisi: yön ve sıra

- Oyun sistemleri tepkiyi **gelen yöne göre** seçiyor (sol, sağ, ön, arka).
- Yordamsal tepki zinciri: **gövde → omuzlar → baş → eşya**; izleyen
  kemiklerin ağırlığı < 0,5 (bir kemik iki kez oynamasın). Üst beden ve baş
  öncelikli, bacaklar basit kalır.
- Ağır vuruşta animasyondan fiziğe geçiş: kuvvetleri yavaşça azaltarak.

**Bizde:** akıcı katmanın yöne göre ırkilmesi var; zincirin **sırası**
`darbe_vurgusu`'lu senaryoda araçta: gövde önce, kollar 0,03 sn, baş 0,06 sn
sonra (`hareket.irkilme(..., sirali=True)`).

Kaynaklar: [Procedural Hit Reactions — gelişmiş ayarlar](https://ironsami-studio.gitbook.io/proceduralhitreactions/advanced) ·
[Yöne göre tepki (devlog)](https://swearsoft.itch.io/jackmclantern/devlog/76709/direction-based-hit-reaction) ·
[Game Creator — tepkiler](https://docs.gamecreator.io/melee/reactions)

## 67. Sürükleme, devam, sıralı kırılma

- Devam: ana hareket durunca saç, giysi, eşyanın süren hareketi. Üst üste
  binme: birlikte hareket eden parçaların zaman kayması. Sürükleme: ikincil
  parçaların ana hareketin gerisinde kalması.
- **Sıralı kırılma** (eklemler sırayla bırakır, "yosun hareketi").
- Hızlı duruş = uzun devam; çok yavaşsa göze batar, çok hızlıysa görünmez.

**Bizde:** blok karakterde saç/giysi yok; devam baş ve kollarla taşınır.

Kaynaklar: [Toon Boom — devam ilkesi](https://learn.toonboom.com/modules/animation-principles/topic/follow-through-principle) ·
[Brian Lemay — follow through](https://brianlemay.com/Pages/animationschool/animation/lipsyncbook/followthrough.html) ·
[RebusFarm — devam ve üst üste binme](https://rebusfarm.net/blog/follow-through-and-overlapping-action-the-animation-principle-that-prevents-stiff-motion)

## 68. Ayak kayması: basılı aralığı bul, ayağı kilitle

- Standart yöntem: ayağın **basılı** aralıklarını hız/yükseklik eşiğiyle
  bul, en kısa temas süresi şartı koy, basılıyken ayağın dünya konumunu
  kilitle, kalkarken animasyona geri harmanla. Eşikler karakterin ölçüsüne
  ve kare hızına göre ayarlanır (Glardon–Boulic–Thalmann 2006).

**Bizde:** denetim olarak: basılı ayağın dünya konumu kayıyor mu
(`hareket_denetim.py`'nin işi).

Kaynaklar: [Glardon, Boulic, Thalmann — footplant (EPFL)](https://infoscience.epfl.ch/entities/publication/e8b1dc34-691d-450b-9e29-ae34b2f68e60/articledetails)

## 69. Savrulma ve darbe sesi

- Yumruk savrulmasız **ölü** duyulur; savrulma beklentiyi kurar, görünen
  hareketin biraz **önünde** başlar.
- Darbenin yeri: kaynaklar ayrışıyor — tam temasta ya da 1–2 kare önce.
- Darbe 2–4 ses katmanıyla (farklı frekanslar) kurulur; her karakter için
  önce **kumaş/hareket** katmanı; aynı darbe sesi aynı şiddette tekrarlanmaz.

**Bizde:** savrulma temastan ağırlığa göre önce (hafif 2, orta 4, ağır 6
kare), darbe temas karesinde; aynı vuruş sesi arka arkaya tekrar etmez.

Kaynaklar: [IRPR — dövüş sahnesi ses tasarımı](https://sounddesign.irpr.agency/guides/how-to-design-sound-for-a-fight-scene/) ·
[Designing Sound — Bruce Tanis](https://designingsound.org/2010/07/23/bruce-tanis-special-editing-hand-to-hand-fight-sound-effects/) ·
[Pixflow — yumruk sesleri](https://pixflow.net/blog/punch-impact-sound-effects-for-fight-scenes/)

## 70. Hız rampası

- Tek çekimde hız değişimi: %100'den ~%10–20'ye 0,5–1 sn'de iner, kilit anda
  1–2 sn tutar, geri çıkar. Temastan **hemen önce** hızı geri vermek darbeyi
  ağırlaştırır. Müziğin vurgusuna hizalanır; aşırı kullanım etkisini yok eder.

**Bizde:** §33'ün kuralı (dövüş başına bir-iki) korunur; araçta zaman
parçalarıyla (`"zaman"`) zaten yapılabiliyor.

Kaynaklar: [Film Editing Pro — hız rampası](https://www.filmeditingpro.com/?p=30439) ·
[Speed ramping vs slow motion](https://nerdtechy.com/speed-ramping-vs-traditional-slow-motion)

## 71. Vuruş kıvılcımı

- Kıvılcımın **büyüklüğü hasarı**, ayrı efekt **vuruşun türünü** anlatır.
  Savunulan vuruş yumuşak, çoğunlukla **mavi**; ağır vuruş daha dağınık.
  Keskin biçim göze kolay; tek efekt ekranın ~%12–18'ini aşmasın (tek blog).

**Bizde:** savunmada mavi kıvılcım zaten var; vuruş kıvılcımının sayısı ve
büyüklüğü ağırlıkla büyür.

Kaynaklar: [Virtua Fighter forumu — kıvılcım ve tür](https://host.virtuafighter.com/threads/hit-flashes-sparks-effects-auras-whats-the-difference.21696) ·
[TV Tropes — Hit Spark](https://TVTropes.org/pmwiki/pmwiki.php/Main/HitSpark) ·
[Uhiyama Lab — donma, ışık, sarsıntı, ses](https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/)

## 72. İşaret (telegraph) nasıl kurulur

- Bir poz, bir ses ve bir görsel (parıltı, gölge, yerde çizgi); **ikisi
  birden**. Ağır saldırının hazırlığı daha uzun; belirginlik ölümcüllükle
  büyür; her saldırının işareti ötekinden ayrılabilir olmalı.
- Okunaklılık yavaş tempo ister; tek bir öğrenci projesi tepki penceresini
  ~300–500 ms veriyor (standart değil).

**Bizde:** işaret efekti = bir noktada büyüyen parıltı (asanın küresi, alın
sembolü, avuç) + isteğe bağlı yerde çizgi; süre künyedeki `isaret`.

Kaynaklar: [Game Developer — saldırılar ve işaret](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing) ·
[Enemy intent telegraph](https://saschb2b.github.io/game-mechanics/concepts/enemy-intent-telegraph)

## 73. Sürü dövüşü: saldırı jetonu

- Hedefin üstünde bir **saldırı izni havuzu**; yakın dövüşte varsayılan 1
  jeton (The Last of Us Part II'de Naughty Dog). Jetonu olmayan düşman
  **durmaz**: yer değiştirir, yanlar, çember çizer. Bırakılmayan jeton havuzu
  sessizce küçültür. Jeton düzenleme katmanıdır, tasarımın yerini tutmaz.

**Bizde:** sürü düzeni yardımcısı: hedef başına en çok bir etkin + bir
hazırlanan; ötekiler çember üstünde farklı faz/hızla dolaşır.

Kaynaklar: [Signals and Light — düşman saldırısı nedir](https://signalsandlight.substack.com/p/what-is-an-enemy-attack) ·
[StraySpark — saldırı jetonu](https://www.strayspark.studio/blog/attack-token-system-ue5-group-combat-that-feels-fair) ·
[Bugnet — hepsi birden saldırıyor](https://bugnet.io/blog/how-to-fix-enemies-all-attacking-at-once)

## 74. Cam kırılması ve patlama

- Blender'da cam: Cell Fracture + katı cisim + kırılana dek tutan bağlar,
  üstüne parçacık ve duman. Bilinen sorunlar: cisim gelmeden kırılma
  (zamanlama), kırıktan sonra kırılma (refraction) yanlış.
- Minecraft patlaması: Java'da `explosion_emitter`, Bedrock'ta
  `huge_explosion_emitter`; duman parçacıkları ayrı. (Kimlikler; dosya
  alınmadı.)

**Bizde:** fizik benzetimi yerine belirleyici (tohumlu) yol: cam küçük kare
parçalara ayrılıp balistik uçar (toprak parçalarının yöntemi); patlama =
kısa ışık + büyüyüp sönen gri-beyaz küp duman + uçan bloklar.

Kaynaklar: [Blender Guru — cam kırma](https://www.blenderguru.com/tutorials/make-glass-smash-animation) ·
[Minecraft wiki — particle komutu](https://wiki.ronlab.site/content/minecraftwiki_en_all_maxi_2025-11/Commands/particle) ·
[Mojira MCPE-127604](https://mojira.dev/MCPE-127604)

---

## Özet: araştırılan konular

1. Dövüş bir hikâye: tırmanma, vuruş sırası, karakter (§1)
2. Jackie Chan: ortam, sahneleme, kamera sabrı (§2)
3. Animasyon: hazırlık, darbe karesi, sürükleme, devam (§3)
4. Oyun: başlangıç–etkin–toparlanma, vuruş donması (§4)
5. Element ↔ gerçek dövüş sanatı (Avatar yöntemi) (§5)
6. Kaplan stili / Hung Gar (§6)
7. Silahlı yakın dövüş (gun-fu, CAR) (§7)
8. Kamera: okunaklılık, plan süresi, vuruştan önce kesmeme (§8)
9. Sahne dövüşü: vurulan yönetir, mesafe, ses (§9)
10. Yuen Woo-ping: ritim, duraklama, havada asılı kalma (§10)
11. Büyük ordu sahnesi: okunaklılık hiyerarşisi (§11)
12. Minecraft tarzı blok karakter dövüşü (boşluk) (§12)
13. Dövüşçü tipleri: yakın baskı, alan tutucu, tutucu, karşı vurucu (§13)
14. Büyü düellosu hareket dili (Harry Potter yöntemi) (§14)
15. Müziğe göre kurgu (§15)
16. Kuzey Shaolin / Uzun Yumruk (§16)
17. Poz: hareket çizgisi, siluet, anahtar poz (§17)
18. 180° kuralı ve bilerek bozmak (§18)
19. Önce görüntüyle prova (previs / stuntvis) (§19)
20. Tırpan (§20)
21. Asa (§21)
22. Zamanlama ve aralık: ağırlık (§22)
23. Anime (Jujutsu Kaisen): kamera mantığı, ses (§23)
24. The Raid: dar mekân, ortam (§24)
25. Bire karşı çok (§25)
26. Buz büyüsü tasarımı (§26)
27. Ateş efekti (§27)
28. Alan Becker (boşluk) (§28)
29. Kalkan duvarı ve gedik savunması (§29)
30. Dövüş sesi (§30)
31. Ok yağmuru (§31)
32. Saldırının işareti (telegraph) (§32)
33. Ağır çekim ve hız rampası (§33)
34. Dövüşün sonu (§34)
35. Karşı vurucu (§35)
36. Topuz (§36)
37. İki tabanca (§37)
38. Camı kırıp atlamak (§38)
39. Zombi sürüsü (§39)
40. Okçu (§40)
41. Dönüş: üstünlüğün el değiştirmesi (§41)
42. Ortamın kırılması (§42)
43. Bekleme duruşu ve kişilik (§43)
44. Kötü dövüşünün evreleri (§44)
45. Güç uyanışı (§45)
46. İlk aksiyon sahnesi karakteri tanıtır (§46)
47. Akıl hocası dövüşü (§47)
48. Koruma büyüsü / kalkan (§48)
49. Kötünün sonu (§49)
50. Birlikte dövüşen iki kişi (§50)
51. Komutan (§51)
52. Kılıç ve kalkan (§52)
53. Surun delinmesi (§53)
54. Kar fırtınasında savaş (§54)
55. Gizli durumu önceden sezdirmek (§55)
56. Yeni gücün ilk kullanımı (§56)
57. Kiai: nefes, bağırış, bedeli (§57)
58. Kötünün sükûneti (§58)
59. Hareket ekonomisi ve bekleme pozu (§59)
60. Büyü atma pozu (§60)
61. Son darbeden önceki durgunluk (§61)
62. Vuruş donması: sayılar, filmdeki karşılığı (§62)
63. Kamera sarsıntısı: travma modeli (§63)
64. Darbe karesi (§64)
65. Yumruğun zamanlaması (§65)
66. Darbe tepkisi: yön ve sıra (§66)
67. Sürükleme, devam, sıralı kırılma (§67)
68. Ayak kayması (§68)
69. Savrulma ve darbe sesi (§69)
70. Hız rampası (§70)
71. Vuruş kıvılcımı (§71)
72. İşaret nasıl kurulur (§72)
73. Sürü dövüşü: saldırı jetonu (§73)
74. Cam kırılması ve patlama (§74)

**Boşluklar (kaynak bulunamadı, uydurulmadı):** blok karakterle dövüş
koreografisi, Alan Becker'ın yöntemi, gedik savunmasının ekranda
kurulması, buz duvarı tasarımı, iki hedefe aynı anda ateşin sahnelenmesi,
topuz kullanım tekniği, okçuluk için animasyon kaynağı; üçüncü turda: Minecraft animasyonuna özgü dövüş ipuçları, 24 fps filmde donma kare sayısı, işaret parıltısının süresi.

**Hiçbiri karar değil.** "Bizde" satırları öneri; seriye geçmesi için
kullanıcının onayı gerekir (SERI_SEZON1.md'ye yalnız onaylananlar yazılır).
