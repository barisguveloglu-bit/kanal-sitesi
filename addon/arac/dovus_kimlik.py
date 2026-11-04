"""Karakterlerin dovus kimlikleri -- DOVUS_KIMLIKLERI.md'nin film aracindaki karsiligi.

Kullanici (2026-11-04): "bu ogrendigin seylerden hepsini karakterlerimize
yedir, entegre et." Arastirma: REFERANS_DOVUS_KOREOGRAFI.md (61 konu).

Senaryoda aktor "kimlik": "<ad>" tasir; "dovus": true olayiyla dovus haline
girer, "dovus": false ile cikar. Dovus halinde (yalniz akici senaryoda):
  - dovuse hazir bekleme durusu (omurga egimi, ayak acikligi; §43): dururken
    tam, yururken soner;
  - nefes suresi ve genligi, agirlik aktarmasi kimlige gore (§43, §58).
Dovus disinda hicbir sey degismez: Part 1'in sahneleri kimlik tasisa da
cizimleri bire bir ayni (test/dovus_kimlik.mjs olcuyor).

Ayrica kendi hamle setlerimizin kunyesi (DOVUS_KIMLIKLERI.md bolum 0) burada
dogrulanir: baslangic < temas <= toparlanma, agirlik sinifi, isaret,
savrulma, vurus donmasi (§4, §22, §30, §32).
"""

AGIRLIK = ("hafif", "orta", "agir")
# vurus donmasi (hitstop), 30 fps'te kare: hafif 1, orta 2, agir 3 (§4)
DONMA_KARE = {"hafif": 1, "orta": 2, "agir": 3}
DONMA_AZAMI = 4          # Saldiri II agir vurusa bir kare ekler (§ Zisa)

# bekleme: dovus halinde tabana eklenen acilar (derece, Bedrock kurali:
# bel X + one egilir; bacak Z +/- yana acilir). Bacak acisi <= 8 derece:
# ayagin alt kosesi en cok ~0,3 px kalkar, zemine oturtma gerekmez.
KIMLIKLER = {
    "baris": {
        "tip": "yakin_baski", "taban": "kuzey_shaolin", "agirlik": "agir",
        "bekleme": {"waist": [8.0, 0.0, 0.0], "rightLeg": [-4.0, 0.0, 3.0], "leftLeg": [4.0, 0.0, -3.0]},
        "nefes_sure": 2.4, "nefes_genlik": 1.3, "salinim": 1.3,
        "ses": "kisa_bagiris",
        "cikis": {"kivilcim": "avuc", "alev_kalkani": "gogus", "kor_yuruyusu": "ayak"},
    },
    "ice_man": {
        "tip": "alan_tutucu", "taban": "yonlendirme", "agirlik": "orta",
        "bekleme": {},                       # dik, kipirtisiz (§58)
        "nefes_sure": 6.0, "nefes_genlik": 0.15, "salinim": 0.1,
        "ses": "sessiz",
        "cikis": {"buz": "asa_kure"},
    },
    "pipos": {
        "tip": "karsi_vurucu", "taban": "hung_gar", "agirlik": "hafif",
        "bekleme": {"waist": [3.0, 0.0, 0.0], "rightLeg": [0.0, 0.0, 8.0], "leftLeg": [0.0, 0.0, -8.0]},
        "nefes_sure": 6.0, "nefes_genlik": 0.8, "salinim": 0.5,
        "ses": "nefes",
        "cikis": {},
    },
    "omer": {
        "tip": "agir", "taban": "topuz", "agirlik": "agir",
        "bekleme": {"waist": [3.0, 0.0, 0.0], "rightLeg": [0.0, 0.0, 6.0], "leftLeg": [0.0, 0.0, -6.0]},
        "nefes_sure": 4.4, "nefes_genlik": 1.4, "salinim": 0.8,
        "ses": "derin",
        "cikis": {},
    },
    "zisa": {
        "tip": "koruyucu", "taban": "buyu", "agirlik": "hafif",
        "bekleme": {"rightLeg": [0.0, 0.0, 3.0], "leftLeg": [0.0, 0.0, -3.0]},
        "nefes_sure": 4.0, "nefes_genlik": 1.0, "salinim": 1.0,
        "ses": "nefes",
        "cikis": {"koruma": "alin_sembolu", "saldiri_ii": "alin_sembolu"},
    },
    "arkadas": {
        "tip": "menzil", "taban": "gun_fu", "agirlik": "hafif",
        "bekleme": {"waist": [0.0, 0.0, 2.0], "rightLeg": [0.0, 0.0, 1.0], "leftLeg": [3.0, 0.0, -5.0]},
        "nefes_sure": 4.0, "nefes_genlik": 0.9, "salinim": 1.4,
        "ses": "az",
        "cikis": {},
    },
    "asker": {
        "tip": "duvar", "taban": "kilic_kalkan", "agirlik": "orta",
        "bekleme": {"waist": [4.0, 0.0, 0.0], "rightLeg": [0.0, 0.0, 6.0], "leftLeg": [0.0, 0.0, -6.0]},
        "nefes_sure": 3.6, "nefes_genlik": 1.0, "salinim": 0.4,
        "ses": "toplu_bagiris",
        "cikis": {},
    },
}


def kimlik(ad):
    """Ad -> kimlik sozlugu; ad yoksa None. Bilinmeyen ad hata (yazim
    yanlisi sessizce kimliksiz aktor yapmasin)."""
    if ad is None:
        return None
    if ad not in KIMLIKLER:
        raise ValueError("bilinmeyen dovus kimligi: %r (var olanlar: %s)" % (ad, ", ".join(sorted(KIMLIKLER))))
    return KIMLIKLER[ad]


def donma_kare(agirlik, saldiri_ii=False):
    """Vurus donmasi (kare, 30 fps). Saldiri II (Zisa'nin Guc II benzeri
    buyusu) bir kare ekler, en cok DONMA_AZAMI."""
    if agirlik not in DONMA_KARE:
        raise ValueError("agirlik sinifi: %r" % (agirlik,))
    return min(DONMA_AZAMI, DONMA_KARE[agirlik] + (1 if saldiri_ii else 0))


def kunye_dogrula(k, fps=30):
    """Kendi hamle setlerimizdeki bir hamlenin kunyesini dogrular.
    Donus: hata cumleleri listesi (bossa gecerli)."""
    hata = []
    for alan in ("baslangic", "temas", "toparlanma", "agirlik", "isaret", "savrulma", "tepki"):
        if alan not in k:
            hata.append("eksik alan: " + alan)
    if hata:
        return hata
    b, t, s = float(k["baslangic"]), float(k["temas"]), float(k["toparlanma"])
    if not (0.0 <= b < t <= s):
        hata.append("evre sirasi: baslangic < temas <= toparlanma olmali (%g, %g, %g)" % (b, t, s))
    if k["agirlik"] not in AGIRLIK:
        hata.append("agirlik sinifi: %r" % (k["agirlik"],))
    else:
        # isaret agirlikla buyur (§32): agir hamle en az orta kadar isaretli
        if float(k["isaret"]) < 0:
            hata.append("isaret suresi negatif")
        if k["agirlik"] == "agir" and float(k["isaret"]) < 0.2:
            hata.append("agir hamlenin isareti en az 0,2 sn olmali (§32)")
    once = (t - float(k["savrulma"])) * fps
    if not (2 - 1e-6 <= once <= 6 + 1e-6):
        hata.append("savrulma temastan 2-6 kare once olmali (%.1f kare)" % once)
    if not str(k["tepki"]).strip():
        hata.append("vurulanin tepkisi yazilmali (§9)")
    if "cikis" in k and k.get("buyu") and not k["cikis"]:
        hata.append("buyu hamlesinin cikis yeri yazilmali (§60)")
    return hata
