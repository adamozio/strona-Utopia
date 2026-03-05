require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 80;

app.use(express.json()); 

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds', 'guilds.members.read']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const response = await fetch(`https://discord.com/api/users/@me/guilds/${process.env.GUILD_ID}/member`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
            const memberData = await response.json();
            profile.isWLChecker = memberData.roles.includes(process.env.ROLE_WL_CHECKER);
            // NOWE: Sprawdzamy czy ma rangę Un-Whitelist i czy w ogóle jest na serwerze
            profile.hasUnWhitelist = memberData.roles.includes(process.env.ROLE_UNWHITELIST);
            profile.isOnServer = true;
        } else {
            profile.isWLChecker = false;
            profile.hasUnWhitelist = false;
            profile.isOnServer = false;
        }
    } catch (error) {
        profile.isWLChecker = false;
        profile.hasUnWhitelist = false;
        profile.isOnServer = false;
    }
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

const getApps = () => {
    if (!fs.existsSync('./applications.json')) return [];
    return JSON.parse(fs.readFileSync('./applications.json'));
};
const saveApps = (apps) => {
    fs.writeFileSync('./applications.json', JSON.stringify(apps, null, 2));
};

app.use(express.static(__dirname));

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/'));
app.get('/logout', (req, res) => req.logout(() => { res.redirect('/'); }));

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        const apps = getApps();
        const userApps = apps.filter(a => a.discordId === req.user.id).sort((a,b) => b.timestamp - a.timestamp);
        
        let appStatus = 'None';
        let cooldownUntil = null;

        if (userApps.length > 0) {
            const latestApp = userApps[0];
            if (latestApp.status === 'Oczekujące') {
                appStatus = 'Oczekujące';
            } else if (latestApp.status === 'Zaakceptowane') {
                appStatus = 'Zaakceptowane';
            } else if (latestApp.status === 'Odrzucone') {
                const cooldownEnd = latestApp.timestamp + (1 * 60 * 1000);
                if (Date.now() < cooldownEnd) {
                    appStatus = 'Odrzucone';
                    cooldownUntil = cooldownEnd;
                }
            }
        }

        res.json({
            loggedIn: true, 
            username: req.user.username,
            discordId: req.user.id, 
            isWLChecker: req.user.isWLChecker,
            hasUnWhitelist: req.user.hasUnWhitelist, // NOWE
            isOnServer: req.user.isOnServer, // NOWE
            appStatus: appStatus,
            cooldownUntil: cooldownUntil
        });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/api/apply', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Zaloguj się!" });

    const apps = getApps();
    const newApp = {
        id: Date.now().toString(),
        discordId: req.user.id,
        discordTag: req.user.username,
        status: 'Oczekujące',
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        ...req.body
    };
    
    apps.push(newApp);
    saveApps(apps);
    res.json({ success: true });
});

app.get('/api/applications', (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWLChecker) return res.status(403).json({ error: "Brak uprawnień" });
    res.json(getApps());
});

async function sendDiscordDM(userId, messageContent) {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    try {
        const dmChannelRes = await fetch(`https://discord.com/api/users/@me/channels`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipient_id: userId })
        });
        const dmChannel = await dmChannelRes.json();

        if (dmChannel.id) {
            await fetch(`https://discord.com/api/channels/${dmChannel.id}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: messageContent })
            });
        }
    } catch (err) {
        console.error("Błąd przy wysyłaniu DM do gracza:", err);
    }
}

app.post('/api/applications/:id/status', async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWLChecker) return res.status(403).json({ error: "Brak uprawnień" });
    
    const apps = getApps();
    const appIndex = apps.findIndex(a => a.id === req.params.id);
    if (appIndex > -1) {
        const newStatus = req.body.status;
        const reason = req.body.reason || "Brak podanego powodu.";
        
        apps[appIndex].status = newStatus;
        if(newStatus === 'Odrzucone') apps[appIndex].timestamp = Date.now();
        
        saveApps(apps);

        const userId = apps[appIndex].discordId;

        if (newStatus === 'Zaakceptowane') {
            const guildId = process.env.GUILD_ID;
            const botToken = process.env.DISCORD_BOT_TOKEN;
            try {
                await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${process.env.ROLE_WHITELIST}`, {
                    method: 'PUT', headers: { 'Authorization': `Bot ${botToken}` }
                });
                await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${process.env.ROLE_UNWHITELIST}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bot ${botToken}` }
                });
            } catch (err) {
                console.error("Błąd zmiany ról Discord:", err);
            }
            await sendDiscordDM(userId, `🎉 Cześć! Twoje podanie na Whitelistę **Project Utopia** zostało właśnie **zaakceptowane**! Gratulujemy i witamy na serwerze!`);
        } else if (newStatus === 'Odrzucone') {
            await sendDiscordDM(userId, `❌ Cześć. Niestety, Twoje podanie na Whitelistę **Project Utopia** zostało **odrzucone**.\n\n📝 **Powód:** ${reason}\n\nKolejną próbę możesz podjąć za 24 godziny na naszej stronie.`);
        }

        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Nie znaleziono podania" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serwer działa na: http://localhost:${PORT}`);
});
