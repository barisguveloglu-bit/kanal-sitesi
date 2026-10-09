"""Senaryodan film sesi: efekt + ortam + muzik, kare kare eslesmis.   v7.99.10

    python3 addon/arac/film_ses.py senaryo.json cikti.wav

Kullanici: "sesi sen hazirla". Kurallar SERI_SEZON1.md "Ses":
  * Efektler CC0 (Kenney Impact / RPG Audio / Sci-fi Sounds) --
    addon/kaynak_ses/film/, KAYNAKLAR.md'de satiri var.
  * Muzik CC0 ("Battle Theme A", cynicmusic, OpenGameArt).
  * Minecraft'in kendi sesleri YOK (Mojang'in dosyasi).
  * Zamanlama elle degil: blender_film'in zaman cizelgesi (temas, adim,
    isinlanma, donma) -> FILM zamani. Goruntuyle ses ayni kaynaktan.
  * Replikler seslendirilmiyor (yalniz altyazi).
Senaryodaki "ses" alani: {"ortam": "orman"|"oda", "gece": [t0, t1],
  "muzik": [{"bas", "bit", "sus": [[t0, t1], ...]}], "son_vurgu": t}
(zamanlar HIKAYE zamaninda; film zamanina burada cevriliyor).
Ortam sesleri (ruzgar, cekirge, oda ugultusu) burada URETILIYOR.
"""
import json
import math
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_film as F  # noqa: E402
import bedrock_onizleme as B  # noqa: E402

ORAN = 48000
KAYNAK = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "kaynak_ses", "film")
_ONBELLEK = {}


def oku(ad):
    """Ses dosyasi -> (n, 2) float32, 48 kHz."""
    if ad not in _ONBELLEK:
        ham = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(KAYNAK, ad), "-f", "f32le",
                              "-ac", "2", "-ar", str(ORAN), "-"], capture_output=True, check=True).stdout
        _ONBELLEK[ad] = np.frombuffer(ham, dtype=np.float32).reshape(-1, 2).copy()
    return _ONBELLEK[ad]


class Kanal:
    def __init__(self, sure):
        self.x = np.zeros((int(sure * ORAN) + ORAN, 2), dtype=np.float32)

    def ekle(self, ses, t, ses_duzey=1.0, hiz=1.0):
        if hiz != 1.0:
            n = int(len(ses) / hiz)
            idx = np.clip((np.arange(n) * hiz).astype(int), 0, len(ses) - 1)
            ses = ses[idx]
        i = int(t * ORAN)
        if i < 0 or i >= len(self.x):
            return
        j = min(len(self.x), i + len(ses))
        self.x[i:j] += ses[:j - i] * ses_duzey


def ruzgar(sure, rnd):
    """Kahverengi gurultu + yavas dalgalanma: orman ruzgari."""
    n = int(sure * ORAN) + ORAN
    w = rnd.standard_normal((n, 2)).astype(np.float32)
    b = np.cumsum(w, axis=0)
    b -= np.convolve(b[:, 0], np.ones(4800) / 4800, mode="same")[:, None]
    b /= np.max(np.abs(b)) + 1e-9
    t = np.arange(n) / ORAN
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t + 1.3) * np.sin(2 * np.pi * 0.023 * t)
    return b * lfo[:, None] * 0.35


def cekirge(sure, rnd):
    """Gece cekirgeleri: 4.4 kHz cirpma, ritimli zarf, iki yanda farkli."""
    n = int(sure * ORAN) + ORAN
    t = np.arange(n) / ORAN
    out = np.zeros((n, 2), dtype=np.float32)
    for k, (f, r, ph) in enumerate(((4400, 14.0, 0.0), (4650, 11.5, 0.7))):
        zarf = np.clip(np.sin(2 * np.pi * r * t + ph), 0, 1) ** 4
        tur = (np.sin(2 * np.pi * 0.5 * t + ph * 3) > -0.2).astype(np.float32)
        out[:, k] = np.sin(2 * np.pi * f * t) * zarf * tur * 0.06
    return out


def ugultu(sure):
    """Kapali oda: 48 Hz + 71 Hz agir ugultu."""
    n = int(sure * ORAN) + ORAN
    t = np.arange(n) / ORAN
    s = (np.sin(2 * np.pi * 48 * t) * 0.18 + np.sin(2 * np.pi * 71.3 * t) * 0.1) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t))
    return np.stack([s, s * 0.95], axis=1).astype(np.float32)


def ses_kur(senaryo, katmanlar=False):
    """Karisim (n, 2). katmanlar=True: {"efekt", "ortam", "muzik"} ayri ayri
    (stem) -- kullanici son miksaji isterse Resolve'da kendisi yapar."""
    setler = B.oku(F.HAREKET)["setler"]
    harita = F.zaman_haritasi(senaryo)
    fps = senaryo.get("fps", 24)
    ak, efektler, _, _ = F.zaman_cizelgesi(senaryo, setler, {})
    film_t = lambda t: F.kare_bul(harita, t) / fps
    sure = len(harita) / fps
    rnd = np.random.default_rng(5)
    ef, ortam, muzik = Kanal(sure), Kanal(sure), Kanal(sure)
    cfg = senaryo.get("ses", {})
    oda = cfg.get("ortam") == "oda"

    # ---- adimlar: aktorun yuruyus mesafesi her 0.9 blokta bir adim ----
    adim_ses = (["footstep_concrete_00%d.ogg" % i for i in range(3)] if oda
                else ["footstep_grass_00%d.ogg" % i for i in range(5)])
    for ad, a in ak.items():
        sonraki = 0.9
        for f, k in enumerate(a.kayit):
            if not k["gorunur"]:
                continue
            if k["mesafe"] >= sonraki:
                ef.ekle(oku(adim_ses[f % len(adim_ses)]), f / fps, 0.5)
                sonraki = k["mesafe"] + 0.9
    # ---- senaryo olaylari ----
    for o in senaryo.get("olaylar", []):
        t = o["t"]
        if "vur" in o:
            ef.ekle(oku("cloth%d.ogg" % (1 + int(t * 10) % 2)), film_t(t + 0.15), 0.7, 0.8)   # savurma
        if "isinlan" in o:
            ef.ekle(oku("forceField_00%d.ogg" % (int(t) % 2)), film_t(t), 0.9, 0.75)
        if o.get("esya") == "kagit":
            ef.ekle(oku("bookFlip1.ogg"), film_t(t), 0.8)
        if "kapi" in o:
            ef.ekle(oku("doorOpen_1.ogg" if o["kapi"] == "ac" else "doorClose_1.ogg"), film_t(t), 1.0, 0.85)
        if o.get("poz") in ("dus", "diz_cok", "yuzustu", "bayil") and not o.get("atla"):
            gec = {"dus": 0.55, "diz_cok": 0.55, "yuzustu": 0.7, "bayil": 0.8}[o["poz"]]
            ef.ekle(oku("impactSoft_heavy_000.ogg"), film_t(t + gec), 1.0)
        if o.get("efekt") == "toprak":
            ef.ekle(oku("lowFrequency_explosion_000.ogg"), film_t(t), 0.8)
            ef.ekle(oku("impactMining_000.ogg"), film_t(t), 0.8)
    # ---- temaslar ----
    yumruk = {ad for ad, a in ak.items() if a.set == "yumruk"}
    for e in efektler:
        t = film_t(e["t"])
        if e["tur"] == "vurus":
            if e.get("kim") in yumruk:
                ef.ekle(oku("impactPunch_medium_00%d.ogg" % (int(e["t"] * 7) % 3)), t, 1.0)
            else:
                # tirpan El-Harkos'tan SEKIYOR: metal sesi (silah islemiyor)
                ef.ekle(oku("impactMetal_light_00%d.ogg" % (int(e["t"] * 7) % 3)), t, 0.9)
                ef.ekle(oku("impactMetal_medium_000.ogg"), t, 0.4)
        elif e["tur"] == "savun":
            ef.ekle(oku("impactWood_medium_000.ogg"), t, 0.8)
        elif e["tur"] == "kan":
            ef.ekle(oku("impactPunch_heavy_00%d.ogg" % (int(e["t"]) % 2)), t, 1.2)
            ef.ekle(oku("knifeSlice.ogg"), t, 0.9)
    # ---- donma anlari: boguk vurgu ----
    for z in senaryo.get("zaman", []):
        if z["hiz"] < 0.1:
            ef.ekle(oku("lowFrequency_explosion_001.ogg"), film_t(z["t"]), 0.7)
    # ---- dorduncu duvar: son kesmede sert vurgu ----
    if "son_vurgu" in cfg:
        t = film_t(cfg["son_vurgu"])
        ef.ekle(oku("lowFrequency_explosion_000.ogg"), t, 1.1)
        ef.ekle(oku("impactBell_heavy_000.ogg"), t, 0.6, 0.7)
    # ---- ortam ----
    if oda:
        ortam.x[:] += ugultu(sure)[:len(ortam.x)] * 0.8
    else:
        r = ruzgar(sure, rnd)[:len(ortam.x)]
        ortam.x[:] += r * 0.5
        if "gece" in cfg:
            t0, t1 = film_t(cfg["gece"][0]), film_t(cfg["gece"][1])
            tt = np.arange(len(ortam.x)) / ORAN
            agirlik = np.clip((tt - t0) / max(0.1, t1 - t0), 0, 1)[:, None]
            ortam.x[:] += cekirge(sure, rnd)[:len(ortam.x)] * agirlik
    # ---- muzik: dovusle girer, delen darbede bir an susar ----
    for m in cfg.get("muzik", []):
        parca = oku("battleThemeA.mp3")
        t0, t1 = film_t(m["bas"]), film_t(m["bit"])
        n = int((t1 - t0) * ORAN)
        p = np.resize(parca, (n, 2)) if n > len(parca) else parca[:n].copy()
        zarf = np.ones(len(p), dtype=np.float32)
        g = int(1.5 * ORAN)
        zarf[:g] = np.linspace(0, 1, g)
        cks = int(3.0 * ORAN)
        zarf[-cks:] = np.minimum(zarf[-cks:], np.linspace(1, 0, cks))
        for s0, s1 in m.get("sus", []):
            a0, a1 = int((film_t(s0) - t0) * ORAN), int((film_t(s1) - t0) * ORAN)
            k = int(0.25 * ORAN)
            if 0 <= a0 < len(zarf):
                zarf[max(0, a0 - k):a0] *= np.linspace(1, 0, a0 - max(0, a0 - k))
                zarf[a0:min(len(zarf), a1)] = 0
                if a1 < len(zarf):
                    zarf[a1:min(len(zarf), a1 + 2 * k)] *= np.linspace(0, 1, min(len(zarf), a1 + 2 * k) - a1)
        muzik.ekle(p * zarf[:, None], t0, 0.55)
    n = int(sure * ORAN)
    katman = {"efekt": ef.x[:n] * 0.9, "ortam": ortam.x[:n] * 0.35, "muzik": muzik.x[:n]}
    if katmanlar:
        return katman
    # Burada YALNIZ tasma korumasi; asil seviye isi (kompresor + limiter +
    # YouTube -14 LUFS) film_birlestir.py'de ffmpeg ile. Eskiden tek bir
    # sert tepe BUTUN sesi kisiyordu.
    karisim = katman["efekt"] + katman["ortam"] + katman["muzik"]
    tepe = np.max(np.abs(karisim)) + 1e-9
    if tepe > 0.99:
        karisim *= 0.99 / tepe
    return karisim


def yaz(karisim, yol):
    veri = (np.clip(karisim, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ac", "2", "-ar", str(ORAN), "-i", "-", yol],
                   input=veri, check=True)


if __name__ == "__main__":
    sen = B.oku(os.path.abspath(sys.argv[1]))
    k = ses_kur(sen)
    yaz(k, sys.argv[2])
    print("ses: %.1f sn, tepe %.2f" % (len(k) / ORAN, float(np.max(np.abs(k)))))
