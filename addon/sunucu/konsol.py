# -*- coding: utf-8 -*-
"""BDS'i ac, konsoluna yaz, cevabini oku, kapat.              v7.99.16

acilis_dene.py ve arena_kur.py ayni seyi yapiyor: sunucuyu oyuncu
olmadan acmak, konsoldan komut gondermek, cevabi beklemek. Tek yerde.

    with Konsol(kok) as k:
        k.bekle("Server started.", 120)
        cevap = k.komut("testforblock 20 290 20 bedrock")
"""
import os
import re
import subprocess
import threading
import time


class Konsol:
    def __init__(self, kok):
        self.kok = os.path.abspath(kok)
        self.satirlar = []
        self._kilit = threading.Lock()
        self.surec = None

    def __enter__(self):
        ikili = os.path.join(self.kok, "bedrock_server")
        if not os.access(ikili, os.X_OK):
            raise FileNotFoundError("%s yok. Once sunucu_kur.sh" % ikili)
        ortam = dict(os.environ, LD_LIBRARY_PATH=".")
        self.surec = subprocess.Popen(
            [ikili], cwd=self.kok, env=ortam, stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace", bufsize=1)
        threading.Thread(target=self._oku, daemon=True).start()
        return self

    def _oku(self):
        for satir in self.surec.stdout:
            with self._kilit:
                self.satirlar.append(satir.rstrip("\n"))

    def __exit__(self, *_):
        self.kapat()
        return False

    def yaz(self, komut):
        try:
            self.surec.stdin.write(komut + "\n")
            self.surec.stdin.flush()
        except (BrokenPipeError, OSError, AttributeError):
            pass

    def bekle(self, aranan, sure, bas=0):
        """`aranan` (metin ya da derlenmis desen) `bas`. satirdan sonra
        gorunene kadar bekler. Bulursa satiri, bulamazsa None doner."""
        bitis = time.time() + sure
        while time.time() < bitis:
            with self._kilit:
                yeni = self.satirlar[bas:]
            for s in yeni:
                if (aranan.search(s) if hasattr(aranan, "search") else aranan in s):
                    return s
            if self.surec.poll() is not None:
                return None
            time.sleep(0.1)
        return None

    def komut(self, komut, sure=5.0, sessizlik=0.6):
        """Komutu gonderir, cevap satirlarini doner. Cevap, ilk satir
        geldikten sonra `sessizlik` sn yeni satir gelmeyince bitmis
        sayilir; hic gelmezse `sure` sonunda bos liste."""
        with self._kilit:
            bas = len(self.satirlar)
        self.yaz(komut)
        bitis = time.time() + sure
        son_sayi, son_zaman = bas, None
        while time.time() < bitis:
            with self._kilit:
                n = len(self.satirlar)
            if n != son_sayi:
                son_sayi, son_zaman = n, time.time()
            elif son_zaman is not None and time.time() - son_zaman >= sessizlik:
                break
            time.sleep(0.05)
        with self._kilit:
            return self.satirlar[bas:]

    def kapat(self, sure=60):
        if not self.surec or self.surec.poll() is not None:
            return
        self.yaz("stop")
        try:
            self.surec.wait(sure)
        except subprocess.TimeoutExpired:
            self.surec.kill()
            self.surec.wait()
        time.sleep(0.3)


def calisiyor_mu(kok):
    """Bu klasorde calisan bir bedrock_server var mi (Linux /proc).
    Ayni klasorde ikinci sunucu ayni porta baglanamaz ve dunyayi iki
    surec birden yazar; kurulum ve arena calisan sunucuya dokunmamali."""
    kok = os.path.realpath(kok)
    try:
        pidler = [p for p in os.listdir("/proc") if p.isdigit()]
    except OSError:
        return False
    for pid in pidler:
        try:
            with open("/proc/%s/cmdline" % pid, "rb") as f:
                ilk = f.read().split(b"\0")[0].decode("utf-8", "replace")
            if os.path.basename(ilk) != "bedrock_server":
                continue
            if os.path.realpath(os.readlink("/proc/%s/cwd" % pid)) == kok:
                return True
        except OSError:
            continue
    return False


def sade(satir):
    """Zaman damgasini atar: '[2026-.. INFO] x' -> 'INFO x'."""
    m = re.match(r"^\[[^\]]* (INFO|WARN|ERROR)\] ?(.*)$", satir)
    return (m.group(1) + " " + m.group(2)) if m else satir.strip()
