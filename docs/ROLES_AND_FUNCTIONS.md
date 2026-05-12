# MWOS Club Management

## Roles And Functions

## 1. Product Direction

Aplicatia nu mai este doar un tool de scouting. Ea devine un workspace unic pentru staff-ul clubului, cu module pentru:

- training planning
- transport coordination
- scouting reports
- admin oversight

Scopul este ca 5-15 membri din staff sa poata lucra in acelasi sistem, fiecare cu acces doar la ce are nevoie.

## 2. Expected Users

Utilizatorii estimati pentru prima faza:

- adminul clubului
- directorul tehnic
- antrenorii pe categorii de varsta
- soferii pentru deplasari
- scoutii
- optional, membri din board cu acces read-only

Estimare actuala:

- `5-10` utilizatori activi in faza initiala
- poate urca spre `10-15` pe masura ce intra si alte echipe sau board observers

## 3. Team Structure

Structura actuala a clubului:

- `U13`
- `U15`
- `U17`
- `U19`
- `First Team`

Structura pregatita pentru extindere:

- `U11`
- `U9`

Aplicatia trebuie sa permita:

- echipe multiple in sistem
- asignarea unui antrenor la una sau mai multe echipe
- filtrare a datelor pe echipa

## 4. Account Model

Principiul de baza:

- un utilizator are un singur cont
- acelasi cont poate avea unul sau mai multe roluri
- nu exista selector de rol la login
- UI-ul si permisiunile se decid automat in functie de rolurile contului

Exemple:

- admin + technical director pe acelasi cont
- coach pe mai multe echipe
- coach + scout pe acelasi cont

## 5. Roles

### 5.1 Admin

Responsabilitati:

- vede toate modulele
- gestioneaza utilizatorii
- vede toate echipele
- vede rapoarte, training plans si transport plans
- poate comenta sau interveni administrativ

Necesitati principale:

- dashboard club-wide
- user management
- overview pe training, transport si scouting

### 5.2 Technical Director

Poate fi:

- rol separat
  sau
- sub-rol / atribut in cadrul contului de admin

Din cerintele actuale:

- nu trebuie sa aprobe formal planul de antrenament
- trebuie sa poata interveni cu:
  - comentarii
  - intrebari
  - sugestii
  - observatii

Necesitati principale:

- vedere pe toate echipele
- comentarii pe training plan
- notificari cand apare un plan nou

### 5.3 Coach

Responsabilitati:

- creeaza si actualizeaza planurile de antrenament
- lucreaza pe echipa sau echipele lui
- vede programul si istoricul relevant
- poate actualiza in timp real daca este nevoie

Reguli:

- idealul este sa incarce planul cu o saptamana inainte
- dar sistemul trebuie sa permita si update live / de ultim moment
- un coach poate fi atasat la mai multe echipe

### 5.4 Driver

Responsabilitati:

- vede cursele si deplasarile care ii sunt alocate
- vede ora de plecare
- vede destinatia / contextul deplasarii
- poate confirma sau actualiza detalii de transport

Necesitati principale:

- interfata simpla
- focus doar pe transport
- notificari clare inainte de plecare

### 5.5 Scout

Responsabilitati:

- foloseste sistemul actual de scouting
- creeaza rapoarte
- foloseste watchlist, player hub, reviews si comments

Regula importanta:

- `Code of Conduct` se aplica doar scoutilor
- documentul va fi pus in sectiunea de scouting

### 5.6 Board Observer

Rol optional, read-only:

- vede dashboarduri si overview
- nu editeaza
- nu creeaza planuri
- nu schimba transport sau rapoarte

## 6. Core Modules

### 6.1 Training Schedule

Acesta este unul dintre modulele principale noi.

Obiectiv:

- fiecare coach sa poata planifica microciclul de antrenament pentru echipa lui

Functionalitati necesare:

- creare plan de antrenament pe echipa
- planificare pe saptamana
- setare zile de antrenament
- setare zile de recovery / rest
- setare focus pe fiecare zi
- comentarii de la directorul tehnic
- update inainte sau in timp real

### 6.2 Transport Plans

Acesta este al doilea modul nou principal.

Obiectiv:

- organizarea transportului pentru deplasari

Functionalitati necesare:

- creare plan de transport
- asignare sofer
- ora de plecare
- context: meci / antrenament / alta deplasare
- echipa implicata
- comentarii / update-uri

### 6.3 Scouting Reports

Modulul actual de scouting ramane in sistem.

Trebuie integrat ca unul dintre modulele de baza ale clubului, nu ca singura functie a aplicatiei.

Functionalitati deja existente:

- reports
- team sheets
- formations
- player reviews
- comments
- watchlist
- player hub
- OCR
- admin analytics

### 6.4 Admin Oversight

Dashboard si control club-wide pentru:

- overview pe activitatea staff-ului
- status training plans
- status transport plans
- status scouting reports
- activitate pe echipe

## 7. Training Planning Requirements

Din materialul de planning si transcriptul video, modulul de training trebuie sa sustina urmatoarea logica:

- microciclul este in mod normal un ciclu de `7 zile`
- utilizatorul stabileste:
  - cate zile se antreneaza pe saptamana
  - ce zile sunt zile de training
  - ce zile sunt rest / active recovery
- pentru fiecare zi de training se stabileste:
  - focusul sesiunii
  - intensitatea
  - volumul
  - tipul de sesiune

Exemple de focus:

- speed / power / lower body strength
- upper body strength
- conditioning
- recovery

Cerinta functionala importanta:

- sistemul trebuie sa permita alternarea intre zile mai grele si zile mai usoare
- nu toate zilele trebuie sa fie high-intensity
- coach-ul trebuie sa poata scrie exercitiile sau continutul efectiv al sesiunii

In v1, cel mai realist model este:

- plan saptamanal
- sesiuni pe zile
- comentarii
- status simplu

Fara a construi din prima un motor foarte complex de sports science.

## 8. Training Plan Workflow

Flux recomandat:

1. coach selecteaza echipa
2. alege saptamana
3. creeaza / editeaza microciclul
4. completeaza sesiunile pe zile
5. salveaza planul
6. directorul tehnic poate comenta
7. coach-ul poate face update

Observatie:

- nu este nevoie de `approval gate` obligatoriu in aceasta faza
- este suficient un sistem bun de comentarii si notificari

## 9. Transport Workflow

Flux recomandat:

1. admin sau staff desemnat creeaza deplasarea
2. selecteaza echipa
3. seteaza data si ora de plecare
4. aloca soferul
5. soferul vede cursa in contul lui
6. modificarile importante trimit notificare

## 10. Notifications

Notificarile sunt importante si trebuie gandite ca feature central.

Canale dorite:

- notificari pe telefon
- notificari pe WhatsApp

Evenimente mentionate de client:

- cand se uploadeaza un plan de antrenament
- cu `30 de minute` inainte de antrenament
- cand directorul tehnic lasa comentarii la plan

Implicatii:

- in aplicatie putem face notificari interne + web/push mai tarziu
- WhatsApp cere integrare separata si probabil intra ca faza ulterioara

## 11. Permissions Summary

### Admin

- full access

### Technical Director

- view all teams
- comment on training plans
- observe club activity

### Coach

- manage training plans pentru echipele lui
- view only transport and club data relevante rolului

### Driver

- view and update assigned transport entries

### Scout

- use scouting section
- access code of conduct section

### Board Observer

- read-only dashboards and summaries

## 12. Product Changes Needed

Pentru a transforma produsul actual in `Club Management`, trebuie facute urmatoarele schimbari:

### Sprint 0

- update branding si copy in login
- schimbare mesaj din scouting-only in club-wide workspace
- carduri noi in login:
  - `Training Schedule`
  - `Transport Plans`
  - `Scouting Reports`
  - `Admin Oversight`

### Sprint 1

- extindere model de roluri
- multi-role support
- multi-team support
- dashboard conditional pe rol

### Sprint 2

- training plans module
- training comments
- basic weekly planning

### Sprint 3

- transport module
- driver views
- trip planning

### Sprint 4

- notifications layer
- internal notifications
- pregatire pentru push / WhatsApp integration

## 13. Open Questions

Lucruri care inca trebuie confirmate:

- directorul tehnic este rol separat sau ramane in contul de admin?
- cine creeaza efectiv planurile de transport?
- ce campuri exacte trebuie sa aiba fiecare sesiune de antrenament?
- care sunt notificarile obligatorii in v1 si care pot intra in faza 2?
- board observers vad toate echipele sau doar sumarul general?

## 14. Practical Conclusion

Aplicatia actuala este o baza buna pentru:

- auth
- role-aware dashboards
- comments
- notifications shell
- mobile/PWA direction
- scouting workflow

Dar pentru `Club Management` trebuie extinsa cu doua module operationale noi:

- `Training Schedule`
- `Transport Plans`

si cu un model mai matur de:

- roluri
- echipe
- permisiuni
- notificari
