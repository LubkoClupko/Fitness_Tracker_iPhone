# Forma — offline fitness tracker pre iPhone

Forma je inštalovateľná Progressive Web App (PWA) na zapisovanie tréningov, sledovanie tela, stravy a progresu. Po inštalácii funguje bez internetu a nepotrebuje Python, Oracle, cloudovú databázu ani používateľský účet.

## Čo zostáva v telefóne

- profil,
- tréningové série,
- telesné a stravovacie záznamy,
- vlastné názvy cvikov.

Dáta sa ukladajú do IndexedDB daného prehliadača. Nie sú súčasťou kódu ani GitHub repozitára a neposielajú sa na server.

## Inštalácia na iPhone

PWA musí byť prvýkrát otvorená cez HTTPS. Najjednoduchšie je zverejniť tieto statické súbory cez GitHub Pages.

1. Nahraj obsah priečinka do GitHub repozitára.
2. V repozitári otvor **Settings → Pages**.
3. Ako zdroj vyber **Deploy from a branch**, vetvu `main` a priečinok `/ (root)`.
4. Otvor vygenerovanú HTTPS adresu na iPhone v Safari.
5. Ťukni na **Zdieľať → Pridať na plochu → Pridať**.
6. Spusti Formu ikonou z plochy. Po prvom načítaní funguje offline.

## Prenos existujúcich dát

Záloha z pôvodnej serverovej verzie je kompatibilná.

1. Ulož pôvodnú JSON zálohu do aplikácie **Súbory** na iPhone, napríklad cez iCloud Drive.
2. Vo Forme otvor **Nastavenia → Obnoviť zo zálohy**.
3. Vyber JSON súbor a potvrď nahradenie dát.

Obnova nahradí všetky aktuálne lokálne údaje. Pred obnovou alebo väčšou zmenou si preto vytvor novú zálohu.

## Zálohovanie

V **Nastaveniach** zvoľ **Uložiť zálohu do Súborov**. iPhone ponúkne systémové zdieľanie, kde môžeš vybrať **Uložiť do Súborov** alebo iCloud Drive.

Samotné dáta sú viazané na nainštalovanú PWA a zariadenie. Odstránenie aplikácie alebo vymazanie dát Safari ich môže odstrániť, preto odporúčame pravidelnú JSON zálohu.

## Lokálne spustenie na počítači

Service worker funguje na `localhost` alebo cez HTTPS. Na rýchle overenie spusti v tomto priečinku ľubovoľný statický HTTP server, napríklad:

```powershell
python -m http.server 8080
```

Potom otvor `http://localhost:8080`.

## Kontroly

```powershell
node --check app.js
node --check storage.js
node --check service-worker.js
node tests/storage.test.js
```

## Súbory

```text
.
├── icons/
├── scripts/generate_icons.py
├── tests/storage.test.js
├── app.js
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── storage.js
└── styles.css
```

Výpočty BMR, TDEE a kalorickej bilancie sú orientačné, nie zdravotné odporúčanie.
