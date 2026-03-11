# MWOS Football Club Scouting Network

## Client Pitch + Product Specification

## 1. Executive Summary

MWOS Football Club Scouting Network este o aplicatie web pentru scouting si management de rapoarte de meci, construita pentru a centraliza activitatea de evaluare a jucatorilor intr-un singur workspace branded.

Aplicatia permite:

- creare si administrare de match reports
- evaluare individuala a jucatorilor
- organizare de loturi si formatii
- comentarii colaborative pe rapoarte
- dashboard administrativ cu statistici si insight-uri
- shortlist / watchlist pentru jucatori
- import OCR pentru note si rapoarte scanate
- asistenta AI pentru analiza administrativa

Platforma este gandita pentru utilizare practica de catre scouti, coordonatori si administratori de club.

## 2. Problema Pe Care O Rezolva

In mod normal, activitatea de scouting este fragmentata intre:

- fisiere Word sau PDF
- rapoarte scrise de mana
- grupuri WhatsApp
- foi Excel
- documente neuniforme
- lipsa unui istoric clar pe jucatori si rapoarte

Aplicatia rezolva aceasta problema prin:

- standardizare a rapoartelor
- centralizare a datelor intr-o baza unica
- acces pe roluri
- istoric consultabil
- colaborare intre membri ai staff-ului
- posibilitatea de a transforma notele brute in informatie structurata

## 3. Ce Face Aplicatia

### 3.1 Autentificare si acces pe roluri

Aplicatia foloseste autentificare cu email si parola.

Roluri implementate:

- `Scout`
  - vede si gestioneaza propriile rapoarte
  - lucreaza cu Player Hub si watchlist-ul propriu
- `Admin`
  - vede toate rapoartele
  - vede toti utilizatorii
  - acceseaza dashboard administrativ
  - foloseste insight-urile AI si chat-ul administrativ

### 3.2 Match Reports

Fiecare raport poate include:

- competitie
- data meciului
- venue
- kickoff
- vreme si suprafata
- echipa gazda / oaspete
- scor
- focus de scouting
- notite generale
- manageri
- formatii

Aplicatia previne acum salvarea drafturilor complet goale, pentru a evita rapoarte accidentale fara continut relevant.

### 3.3 Team Sheets

Pentru fiecare raport pot fi adaugati jucatori in lotul fiecarei echipe:

- numar de tricou
- nume
- status schimbare / gol
- rating
- ordine

Exista si import automat de lot pe baza integrarii cu API-Football.

### 3.4 Formations

Aplicatia include un editor de formatii cu pozitionare vizuala a jucatorilor:

- home / away
- drag and drop
- reasignare rapida pe sistem de joc

### 3.5 Player Reviews

Fiecare jucator poate fi evaluat individual in raport, cu campuri precum:

- overview
- strengths
- areas to improve
- pace
- strength
- stamina
- agility
- decision making
- composure
- work rate
- positioning
- recommendation verdict
- potential level

### 3.6 Comments

Rapoartele salvate pot primi comentarii colaborative:

- comentarii atasate raportului
- stergere de catre autor sau admin
- colaborare usoara intre membri ai staff-ului

### 3.7 Export PDF

Rapoartele pot fi exportate in format PDF pentru:

- arhivare
- trimitere catre management
- evaluari interne
- prezentare externa

### 3.8 Player Hub

Aplicatia agregheaza jucatorii raportati din toate rapoartele si construieste un hub central pentru monitorizare.

Functionalitati deja implementate:

- top performers
- filtre
- shortlist / watchlist
- sumar de trend pe baza ratingurilor si review-urilor
- comparatie intre jucatori

### 3.9 Admin Dashboard

Pentru utilizatorii admin exista un dashboard separat cu:

- total reports
- total users
- active scouts
- reports recente
- top players mentionati pozitiv
- short notes extrase din rapoarte
- overview operational

### 3.10 AI Insights + Admin Chat

Partea administrativa include integrare AI pentru:

- sugestii de imbunatatire bazate pe datele reale din rapoarte
- sumarizarea tendintelor din activitatea de scouting
- chat dedicat adminului pentru intrebari despre rapoarte, jucatori, volum de lucru si observatii recurente

### 3.11 OCR pentru rapoarte scanate

Aplicatia poate extrage text din imagini cu rapoarte sau note folosind OCR.

Fluxul implementat:

- utilizatorul incarca o imagine
- OCR extrage textul
- sistemul incearca sa detecteze campuri utile
- utilizatorul poate aplica sugestiile sau adauga textul in notes

## 4. Ce Tehnologii Foloseste

### 4.1 Frontend

- `React 19`
- `TypeScript`
- `Vite`
- `Tailwind CSS v4`
- `Zustand` pentru state management
- `React Router` pentru navigare

Rol:

- interfata rapida
- formulare interactive
- dashboard-uri
- experienta moderna in browser

### 4.2 Backend / Baza de date

- `Supabase`
  - autentificare
  - baza de date PostgreSQL
  - politici RLS pentru securitate pe utilizator

Rol:

- stocarea rapoartelor
- stocarea jucatorilor si review-urilor
- user profiles
- watchlist
- comments
- control acces admin/scout

### 4.3 Serverless Functions

- `Netlify Functions`

Rol:

- proxy securizat pentru API-Football
- OCR endpoint
- admin AI endpoints

### 4.4 OCR

- `Google Cloud Vision API`

Rol:

- extragere text din rapoarte scanate sau poze

### 4.5 AI

- `Gemini`

Rol:

- insight-uri administrative
- chat contextual pentru admin

### 4.6 Data Import

- `API-Football`

Rol:

- cautare echipe
- import loturi

## 5. Ce Implica Aceste Integrari

### Supabase

Implica:

- cont Supabase activ
- proiect configurat
- rulare a schemei SQL
- internet pentru autentificare si sincronizare date

Avantaj:

- cost redus
- administrare simpla
- securitate prin RLS

### Netlify Functions

Implica:

- hosting compatibil Netlify
- setare environment variables
- cost de hosting separat

Avantaj:

- integrare rapida cu frontend-ul actual
- deploy simplu

### Google Vision OCR

Implica:

- cheie API
- consum pe baza de request-uri
- dependenta de internet

Avantaj:

- ajuta la digitizarea rapoartelor scrise sau scanate

### Gemini

Implica:

- cheie API separata
- cost sau quota separata
- dependenta de internet

Avantaj:

- analiza mai rapida a activitatii administrative
- suport pentru interpretarea datelor deja colectate

### API-Football

Implica:

- cheie API
- posibil consum limitat pe planurile free

Avantaj:

- reduce munca manuala la introducerea loturilor

## 6. Securitate si Control Acces

Aplicatia foloseste:

- autentificare securizata cu Supabase Auth
- roluri `Scout` si `Admin`
- Row Level Security in baza de date
- acces separat pe utilizator
- posibilitatea ca adminul sa vada toate rapoartele

Asta inseamna ca:

- un scout vede doar ce ii apartine
- un admin are vizibilitate centralizata
- datele sunt izolate la nivel de baza de date, nu doar in interfata

## 7. Ce Este Deja Implementat

La momentul actual, aplicatia include deja:

- login / signup
- roluri Scout si Admin
- dashboard pentru scout
- dashboard separat pentru admin
- creare, editare si stergere de rapoarte
- team sheets
- formations
- player reviews
- export PDF
- comments pe rapoarte
- Player Hub
- watchlist
- comparatie jucatori
- OCR import
- AI admin suggestions
- AI admin chat
- branding MWOS
- configurare Supabase
- repo GitHub pregatit pentru update-uri viitoare

## 8. Ce Poate Fi Extins Usor in Etapa Urmatoare

Platforma poate fi dezvoltata in continuare cu:

- management useri direct din UI
- promovare user la Admin din aplicatie
- fisiere atasate per raport
- arhiva media
- dashboard pe competitie
- statusuri de follow-up pe jucatori
- shortlist-uri tematice
- tracking pe termen lung al dezvoltarii jucatorilor
- analytics suplimentare pentru management
- custom domain si productie finala pentru client

## 9. Cerinte de Operare

Pentru folosirea aplicatiei in productie sunt necesare:

- cont de hosting
- cont Supabase
- variabile de mediu configurate
- conturi API pentru OCR / AI / import date, daca se folosesc aceste functii

Aplicatia poate functiona:

- local, pentru dezvoltare si testare
- pe hosting public, pentru utilizare de catre staff

## 10. Recomandare de Hosting

Recomandarea pentru lansare este:

- `Netlify Personal` pe contul clientului
- fara domeniu la inceput, pe subdomeniu Netlify
- dupa perioada de testare, conectare la custom domain

Avantaj:

- cost initial mic
- testare rapida
- migrare usoara catre domeniu final

## 11. Estimare de Scalare Pentru Cazul Curent

Pentru un scenariu de aproximativ:

- `20 utilizatori`
- folosire de `4-5 ori pe saptamana`

arhitectura actuala este adecvata pentru etapa de lansare, cu conditia configurarii corecte a:

- hostingului
- Supabase
- cheilor API externe

## 12. Valoarea Aplicatiei

Aceasta nu este doar o pagina de prezentare, ci o aplicatie full-stack specializata pentru activitatea de scouting.

Valoarea ei vine din combinatia dintre:

- operare reala pentru club
- structura de date reutilizabila
- organizare administrativa
- suport AI
- branding personalizat
- posibilitate de dezvoltare ulterioara

## 13. Concluzie

MWOS Football Club Scouting Network este o baza solida pentru digitalizarea procesului de scouting al unui club sau al unei structuri de analiza sportiva.

Aplicatia este deja intr-un stadiu avansat de implementare si poate fi folosita ca:

- MVP operational
- platforma interna de scouting
- produs care poate fi extins comercial in etape

## 14. Anexa Tehnica Scurta

Module principale implementate:

- `Authentication`
- `Reports`
- `Team Sheets`
- `Formations`
- `Player Reviews`
- `Comments`
- `Player Hub`
- `Watchlist`
- `Admin Dashboard`
- `OCR Import`
- `AI Insights`
- `AI Chat`
- `PDF Export`

Servicii externe:

- `Supabase`
- `Netlify Functions`
- `Google Cloud Vision`
- `Gemini`
- `API-Football`

## 15. Fisier de Referinta

Acest document poate fi folosit ca:

- pitch de produs
- document de prezentare catre client
- baza pentru oferta comerciala
- punct de plecare pentru documentatie de livrare
