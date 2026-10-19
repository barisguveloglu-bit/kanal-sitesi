"""DIZ -- filmde bacak iki parca: uyluk + baldir                    v7.99.15

Kullanicinin karari (2026-10-18, *"Evet, filme diz ekle"*). Onizlemede
destek ayagi yere TEK KOSESIYLE basiyordu (*"ayaklari karakterin yerden
kesiliyor"*): Bedrock bacagi dizsiz tek kutu, egik bacakta taban yere
degmiyor (olcum: staff_auto_3 t=0.48, destek bacagi 25 derece egik,
tabanin koseleri 0 / 0.9 / 1.5 / 2.3 px).

* Yalniz FILM. Oyundaki model (aktor.geo.json) degismez; geometri ondan
  TURETILIR (form_model.py gibi). Senaryoda aktore "diz": true. Yazilmazsa
  film bire bir eskisi (1. bolumun senaryolari degismez).
* Diz acisi UYDURULMAZ: Epic Fight'in kendi bacagi iki parca (kalca 12.18,
  diz 6.18 px) ve WoM vuruslarinda dizler 20-100 derece bukuk. Duz
  cevirme bunu kaybediyordu; arac/wom_cevir.py --diz uylugu DIZE, baldiri
  AYAGA bakacak sekilde ayrica cevirir (kaynak_anim/wom/
  wom_kilic_diz.animation.json). Film araci dizli aktorde bu kanallari
  duz animasyonun ustune bindirir. Kendi tahminimizle (ters kinematik)
  kurulan ilk deneme geri alindi: duz bacakli pozdan dizi geri cikarmak
  ayagin yeri, kalca yuksekligi ve duz taban arasinda secim istiyordu;
  bekleme durusunda dizler 41-49 derece bukuluyordu.
* Bacak 12 px: ust yarisi (y 6..12) bacak kemiginde kalir, alt yarisi
  (y 0..6) yeni kemige gecer (rightLegAlt / leftLegAlt, pivot diz: y 6,
  bacagin ortasi). Pantolon katmani da ikiye bolunur; iki yari dizde
  UST USTE BINMEZ (sisirme yalniz dis yuzlerde), yoksa ayni duzlemdeki
  yuzler titrer.
* Doku: kutu UV'si yuz basina UV'ye cevrilir; yan yuzlerin USTTEKI 6
  satiri uyluga, ALTTAKI 6 satiri baldira. Ust yuz uylukta, alt yuz
  (taban) baldirda. Dizde kalan ic yuzler bacagin dizdeki 4 satirini
  tasir (one bakan baldirda dizin onu, arkaya bakan uylukta dizin arkasi):
  diz bukulunce acilan aralikta kumas gorunur. Skin degismez.
"""
import copy

DIZ_Y = 6.0             # px: 12 px'lik bacagin ortasi
ALT = {"rightLeg": "rightLegAlt", "leftLeg": "leftLegAlt"}
KATMAN = {"rightPants": ("rightLeg", "rightPantsAlt"), "leftPants": ("leftLeg", "leftPantsAlt")}


def diz_ayari(v):
    """Senaryodaki "diz" alani: true / false. Baska deger HATA (sessiz varsayilan yok)."""
    if v in (None, False):
        return False
    if v is True:
        return True
    raise ValueError("diz ayari: %r (true ya da false)" % (v,))


def _yari_uv(u, v, w, h, d, ust):
    """Kutu UV'si (u, v; w x h x d) -> yarim kupun yuz basina UV'si.
    ust: uyluk (yan yuzlerin ustteki h/2 satiri), degilse baldir."""
    y = h / 2.0
    y0 = v + d + (0 if ust else y)
    out = {"north": {"uv": [u + d, y0], "uv_size": [w, y]},
           "east": {"uv": [u, y0], "uv_size": [d, y]},
           "west": {"uv": [u + d + w, y0], "uv_size": [d, y]},
           "south": {"uv": [u + 2 * d + w, y0], "uv_size": [w, y]}}
    dz = v + d + y - d / 2.0                  # dizdeki d satirlik bant
    if ust:
        out["up"] = {"uv": [u + d, v], "uv_size": [w, d]}
        out["down"] = {"uv": [u + 2 * d + w, dz], "uv_size": [w, d]}     # ic: dizin arkasi
    else:
        out["down"] = {"uv": [u + d + w, v], "uv_size": [w, d]}          # taban
        out["up"] = {"uv": [u + d, dz], "uv_size": [w, d]}               # ic: dizin onu
    return out


def _bol(kup):
    """12 px'lik bacak kupu -> (uyluk kupu, baldir kupu). Sisirme dizde
    ust uste binmesin: yarilar y = DIZ_Y'de birlesir."""
    o, s = kup["origin"], kup["size"]
    if abs(o[1]) > 1e-6 or abs(s[1] - 2 * DIZ_Y) > 1e-6:
        raise ValueError("beklenmeyen bacak kupu: %r" % (kup,))
    sis = kup.get("inflate", 0)
    u, v = kup["uv"]
    ust = {"origin": [o[0], DIZ_Y + sis, o[2]], "size": [s[0], DIZ_Y - sis, s[2]],
           "uv": _yari_uv(u, v, s[0], s[1], s[2], True)}
    alt = {"origin": [o[0], 0, o[2]], "size": [s[0], DIZ_Y - sis, s[2]],
           "uv": _yari_uv(u, v, s[0], s[1], s[2], False)}
    if sis:
        ust["inflate"] = alt["inflate"] = sis
    return ust, alt


def dizli_geo(geo):
    """aktor.geo.json (ya da form_model.form_geo) -> dizli film geometrisi:
    ana kemikler AYNEN, yalniz bacak ve pantolon kupleri ikiye bolunur,
    dort alt kemik eklenir."""
    g = copy.deepcopy(geo)
    kemikler = g["minecraft:geometry"][0]["bones"]
    ad = {b["name"]: b for b in kemikler}
    yeni = []
    for bacak, alt_ad in ALT.items():
        b = ad[bacak]
        (kup,) = b["cubes"]
        ust, alt = _bol(kup)
        b["cubes"] = [ust]
        yeni.append({"name": alt_ad, "parent": bacak, "pivot": [b["pivot"][0], DIZ_Y, b["pivot"][2]],
                     "cubes": [alt]})
    for katman, (bacak, alt_ad) in KATMAN.items():
        b = ad[katman]
        (kup,) = b["cubes"]
        ust, alt = _bol(kup)
        b["cubes"] = [ust]
        yeni.append({"name": alt_ad, "parent": ALT[bacak], "pivot": [b["pivot"][0], DIZ_Y, b["pivot"][2]],
                     "cubes": [alt]})
    kemikler.extend(yeni)
    return g


ALT_KEMIKLER = tuple(ALT.values()) + tuple(k[1] for k in KATMAN.values())


def bindir(anims, diz):
    """Duz animasyonlarin ustune dizli bacak kanallari: {ad: animasyon}
    (yalniz diz dosyasinda olanlar). Kemik kemik birlesir; dizde olmayan
    kemik (kollar, govde, silah) duz cevirinin aynisi kalir."""
    out = {}
    for ad, d in diz.items():
        if ad not in anims:
            continue
        a = dict(anims[ad])
        a["bones"] = dict(a.get("bones", {}))
        for kem, kanal in d["bones"].items():
            a["bones"][kem] = dict(a["bones"].get(kem, {}), **kanal)
        out[ad] = a
    return out

