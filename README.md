# Project Utopia - Strona Whitelisty

Strona internetowa dla serwera FiveM **Project Utopia** z systemem podań na whitelistę zintegrowanym z Discordem.

## Funkcje

- **Strona prezentacyjna** – sekcje O nas, FAQ, Regulamin
- **Logowanie przez Discord** – OAuth2 via `passport-discord`
- **System podań na whitelistę** – formularz OOC + IC dla gracza
- **Panel WL Checkera** – widok oczekujących podań z możliwością akceptacji lub odrzucenia
- **Integracja z botem Discord** – automatyczne nadawanie/odbieranie rang i wysyłanie wiadomości prywatnych do graczy po rozpatrzeniu podania

## Technologie

| Pakiet | Opis |
|---|---|
| `express` | Serwer HTTP |
| `express-session` | Zarządzanie sesjami |
| `passport` + `passport-discord` | Autoryzacja OAuth2 przez Discord |
| `dotenv` | Zmienne środowiskowe |

## Struktura plików

```
www/
├── server.js          # Serwer Node.js – API i logika biznesowa
├── index.html         # Frontend (Single Page Application)
├── style.css          # Style CSS
├── applications.json  # Baza danych podań (plik JSON)
├── image_1.png        # Logo serwera
├── o_nas.png          # Grafika sekcji "O nas"
└── package.json
```

## Konfiguracja

Utwórz plik `.env` w folderze `www/` i uzupełnij go:

```env
SESSION_SECRET=twoj_tajny_klucz_sesji

# Discord OAuth2 (panel deweloperski Discord)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_CALLBACK_URL=http://twoja-domena.pl/auth/discord/callback

# Bot Discord
DISCORD_BOT_TOKEN=

# ID serwera Discord
GUILD_ID=

# ID rang na serwerze Discord
ROLE_WHITELIST=       # Ranga nadawana po akceptacji
ROLE_UNWHITELIST=     # Ranga wymagana do złożenia podania
ROLE_WL_CHECKER=      # Ranga admina (dostep do panelu)
```

## Instalacja i uruchomienie

```bash
cd www
npm install
node server.js
```

Serwer startuje na porcie **3000**.

## Endpoints API

| Metoda | Ścieżka | Opis |
|---|---|---|
| `GET` | `/auth/discord` | Rozpoczyna logowanie przez Discord |
| `GET` | `/auth/discord/callback` | Callback OAuth2 |
| `GET` | `/logout` | Wylogowanie |
| `GET` | `/api/user` | Dane zalogowanego użytkownika i status podania |
| `POST` | `/api/apply` | Złożenie podania na whitelistę |
| `GET` | `/api/applications` | Lista podań (tylko WL Checker) |
| `POST` | `/api/applications/:id/status` | Zmiana statusu podania (tylko WL Checker) |

## Przepływ podania

1. Gracz musi znajdować się na serwerze Discord i posiadać rangę **Un-Whitelist**
2. Loguje się przez Discord na stronie
3. Wypełnia formularz (dane OOC i opis postaci IC)
4. Podanie trafia do panelu WL Checkerów ze statusem `Oczekujące`
5. WL Checker akceptuje lub odrzuca podanie z podaniem powodu
6. Gracz otrzymuje wiadomość prywatną od bota na Discordzie z wynikiem
7. Przy akceptacji bot automatycznie nadaje rangę **Whitelist** i odbiera **Un-Whitelist**
8. Przy odrzuceniu gracz może złożyć nowe podanie po upływie cooldownu

## Wymagania

- Node.js v18+
- Aplikacja Discord (OAuth2 + Bot) skonfigurowana w [Discord Developer Portal](https://discord.com/developers/applications)
- Serwer musi działać pod adresem zgodnym z `DISCORD_CALLBACK_URL`
