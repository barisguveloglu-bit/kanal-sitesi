# Dövüş koreografisi — araştırma notları (2026-11-04)

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

**Boşluklar (kaynak bulunamadı, uydurulmadı):** blok karakterle dövüş
koreografisi, Alan Becker'ın yöntemi, gedik savunmasının ekranda
kurulması, buz duvarı tasarımı, iki hedefe aynı anda ateşin sahnelenmesi,
topuz kullanım tekniği, okçuluk için animasyon kaynağı.

**Hiçbiri karar değil.** "Bizde" satırları öneri; seriye geçmesi için
kullanıcının onayı gerekir (SERI_SEZON1.md'ye yalnız onaylananlar yazılır).
