"""Ses üretici: müzik ve efektler numpy ile sentezlenir.

Hiçbir hazır ses dosyası kullanılmıyor; bu yüzden telif riski yok ve her
şey koddan yeniden üretilebilir. Çıktı 48 kHz, 16 bit, stereo WAV.
"""
import math
import wave

import numpy as np

SR = 48000
_rnd = np.random.default_rng(42)


def zaman(sure):
    return np.arange(int(sure * SR)) / SR


def zarf(n, atak=0.005, sonum=8.0):
    t = np.arange(n) / SR
    a = np.minimum(1.0, t / max(atak, 1e-4))
    return a * np.exp(-t * sonum)


def suzgec(x, alt=None, ust=None):
    """FFT ile bant geçiren süzgeç (yumuşak kenarlı)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if alt:
        m *= 1 / (1 + (alt / np.maximum(f, 1)) ** 4)
    if ust:
        m *= 1 / (1 + (f / ust) ** 4)
    return np.fft.irfft(X * m, len(x))


def faz(frekans):
    """Zamanla değişen frekans dizisinden sinüs fazı."""
    return 2 * np.pi * np.cumsum(frekans) / SR


def testere(frekans):
    p = (np.cumsum(frekans) / SR) % 1.0
    return 2 * p - 1


# ------------------------------------------------------------- efektler

def pop():
    t = zaman(0.09)
    f = 1100 * np.exp(-t * 28) + 300
    return np.sin(faz(f)) * zarf(len(t), 0.002, 45) * 0.8


def kapanis_pop():
    t = zaman(0.07)
    f = 380 + 900 * (t / t[-1])
    return np.sin(faz(f)) * zarf(len(t), 0.002, 60) * 0.4


def boing():
    t = zaman(0.42)
    f = 170 + 330 * (1 - np.exp(-t * 9)) + 40 * np.sin(2 * np.pi * (24 - 30 * t) * t)
    return (np.sin(faz(f)) + 0.25 * np.sin(2 * faz(f))) * zarf(len(t), 0.004, 7) * 0.55


def tok():
    t = zaman(0.18)
    gov = np.sin(faz(110 * np.exp(-t * 6) + 50)) * zarf(len(t), 0.001, 22)
    gur = suzgec(_rnd.uniform(-1, 1, len(t)), ust=900) * zarf(len(t), 0.001, 40)
    return (gov * 0.8 + gur * 0.6) * 0.7


def blip(frekans):
    t = zaman(0.055)
    x = np.sin(faz(np.full(len(t), frekans))) + 0.3 * np.sin(3 * faz(np.full(len(t), frekans)))
    return x * zarf(len(t), 0.003, 40) * 0.35


def zil(frekans=1568):
    t = zaman(1.2)
    x = sum(a * np.sin(2 * np.pi * frekans * k * t) * np.exp(-t * d)
            for k, a, d in ((1, 1.0, 4), (2.76, 0.5, 7), (5.4, 0.25, 11)))
    return x * zarf(len(t), 0.002, 0.5) * 0.3


def _bando(frekanslar, sure, parlaklik=2500):
    t = zaman(sure)
    x = sum(testere(np.full(len(t), f)) for f in frekanslar) / len(frekanslar)
    x = suzgec(x, alt=60, ust=parlaklik)
    a = np.minimum(1, t / 0.02) * np.minimum(1, (sure - t) / 0.08)
    return x * a


def tada():
    """'Ta-daa' — kısa-uzun majör akor."""
    akor = [523.25, 659.25, 783.99]
    bir = _bando(akor, 0.13)
    iki = _bando([f * 1.0 for f in akor] + [1046.5], 0.9) * np.exp(-zaman(0.9) * 2.2)
    sessiz = np.zeros(int(0.05 * SR))
    return np.concatenate([bir, sessiz, iki]) * 0.5


def dram():
    """'Dan dan DAAAN' — dramatik vurgu."""
    def nota(fs, sure):
        x = _bando(fs, sure, 1800)
        t = zaman(sure)
        return x * (1 + 0.25 * np.sin(2 * np.pi * 7 * t) * (t > 0.3))

    a = nota([146.83, 293.66], 0.2)
    b = nota([146.83, 293.66], 0.2)
    c = nota([116.54, 233.08, 138.59], 1.5) * np.exp(-zaman(1.5) * 1.3)
    bos = np.zeros(int(0.07 * SR))
    gum = np.sin(faz(70 * np.exp(-zaman(0.8) * 3) + 35)) * zarf(int(0.8 * SR), 0.002, 5)
    son = c.copy()
    son[:len(gum)] += gum * 1.2
    return np.concatenate([a, bos, b, bos, son]) * 0.6


def cizik():
    """Plak cızırtısı — müziğin kesildiği an."""
    t = zaman(0.45)
    hiz = np.sin(2 * np.pi * 3.2 * t) * np.exp(-t * 2)
    f = 600 + 1500 * np.abs(hiz)
    gur = _rnd.uniform(-1, 1, len(t))
    x = suzgec(gur, alt=300, ust=3500) * (0.5 + 0.5 * np.abs(hiz)) + 0.3 * np.sin(faz(f))
    return x * zarf(len(t), 0.005, 3) * 0.45


def huu():
    """Hızlı yakınlaşma için hava sesi."""
    t = zaman(0.35)
    gur = suzgec(_rnd.uniform(-1, 1, len(t)), alt=400, ust=4000)
    a = np.sin(np.pi * t / t[-1]) ** 2
    return gur * a * 0.35


def yutkunma():
    t = zaman(0.22)
    f = 520 * np.exp(-t * 6) + 180
    return np.sin(faz(f)) * zarf(len(t), 0.004, 10) * 0.4


def uzgun_tuba():
    """'Vah vaah' — inen iki nota."""
    def nota(f, sure, titresim=0.0):
        t = zaman(sure)
        ff = f * (1 + titresim * np.sin(2 * np.pi * 6 * t) * (t > 0.2))
        x = suzgec(testere(ff), ust=900)
        return x * np.minimum(1, t / 0.04) * np.minimum(1, (sure - t) / 0.12)

    return np.concatenate([nota(233.08, 0.32), nota(207.65, 0.85, 0.02)]) * 0.45


EFEKTLER = {
    "pop": pop, "kapanis_pop": kapanis_pop, "boing": boing, "tok": tok,
    "zil": zil, "tada": tada, "dram": dram, "cizik": cizik, "huu": huu,
    "yutkunma": yutkunma, "uzgun_tuba": uzgun_tuba,
}


# ---------------------------------------------------------------- müzik

def telli(frekans, sure, sonum=0.996, parlak=0.5):
    """Karplus-Strong telli çalgı (ukulele benzeri). Blok blok vektörel."""
    N = max(2, int(SR / frekans))
    n = int(sure * SR)
    y = np.zeros(n + N + 1)
    tohum = _rnd.uniform(-1, 1, N + 1)
    tohum = parlak * tohum + (1 - parlak) * np.convolve(tohum, [0.5, 0.5], "same")
    y[:N + 1] = tohum
    i = N + 1
    while i < len(y):
        j = min(i + N, len(y))
        y[i:j] = sonum * 0.5 * (y[i - N:j - N] + y[i - N - 1:j - N - 1])
        i = j
    return y[N + 1:N + 1 + n]


NOTALAR = {"C3": 130.81, "G2": 98.0, "A2": 110.0, "F2": 87.31,
           "C4": 261.63, "E4": 329.63, "G4": 392.0, "A4": 440.0,
           "B4": 493.88, "D4": 293.66, "F4": 349.23, "C5": 523.25, "D5": 587.33,
           "E5": 659.25, "G5": 783.99}

AKORLAR = [("C3", ["C4", "E4", "G4", "C5"]), ("G2", ["D4", "G4", "B4", "D5"]),
           ("A2", ["C4", "E4", "A4", "C5"]), ("F2", ["C4", "F4", "A4", "C5"])]


def muzik(sure, bpm=104):
    vurus = 60 / bpm
    toplam = np.zeros((int((sure + 2) * SR), 2))
    olcu = 0
    t0 = 0.0
    while t0 < sure:
        bas, ust = AKORLAR[olcu % 4]
        for v in (0, 2):
            ekle(toplam, t0 + v * vurus, telli(NOTALAR[bas], 1.2, 0.995, 0.3) * 0.55, 0.0)
        for k in range(8):
            nota = ust[[0, 1, 2, 3, 2, 1, 2, 3][k]]
            ekle(toplam, t0 + k * vurus / 2,
                 telli(NOTALAR[nota], 0.7, 0.993, 0.6) * (0.32 if k % 2 == 0 else 0.22),
                 0.25 if k % 2 else -0.25)
        olcu += 1
        t0 += 4 * vurus
    return toplam[:int(sure * SR)]


# ------------------------------------------------------------- karıştırma

def ekle(hedef, zaman_sn, ses, pan=0.0):
    """Mono sesi stereo hedefe 'pan' konumunda ekler (-1 sol, +1 sağ)."""
    i = int(zaman_sn * SR)
    if i >= len(hedef) or i < 0:
        return
    j = min(len(hedef), i + len(ses))
    sol = math.cos((pan + 1) * math.pi / 4)
    sag = math.sin((pan + 1) * math.pi / 4)
    hedef[i:j, 0] += ses[:j - i] * sol
    hedef[i:j, 1] += ses[:j - i] * sag


def wav_yaz(yol, veri, tepe=None):
    veri = np.asarray(veri, dtype=np.float64)
    if veri.ndim == 1:
        veri = np.stack([veri, veri], axis=1)
    if tepe is not None:
        m = np.max(np.abs(veri)) or 1.0
        veri = veri * (tepe / m)
    veri = np.clip(veri, -1, 1)
    with wave.open(str(yol), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((veri * 32767).astype("<i2").tobytes())
