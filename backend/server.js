import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
app.use(cors());

// ==========================================
// DEMO VE SUNUM AYARLARI (BURAYI DEĞİŞTİR)
// ==========================================
// Demo yapmak istiyorsan burayı 'true' yap.
const DEMO_MODE = true; 

// Ekranda ne görmek istiyorsun? 'BUSY' (Kırmızı) veya 'AVAILABLE' (Yeşil)
const DEMO_STATUS = 'BUSY'; 

// ==========================================

// Microsoft Graph Ayarları
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TENANT_ID = process.env.TENANT_ID;
const ROOM_EMAIL = process.env.ROOM_EMAIL || "toplanti.odasi@gtu.edu.tr"; 

let tokenCache = {
    token: null,
    expiresAt: 0
};

// Access Token Alma Fonksiyonu
async function getAccessToken() {
    const now = Date.now();
    if (tokenCache.token && now < tokenCache.expiresAt) {
        return tokenCache.token;
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');

    try {
        const response = await axios.post(tokenEndpoint, params);
        tokenCache.token = response.data.access_token;
        tokenCache.expiresAt = now + (response.data.expires_in * 1000) - 30000;
        console.log("Yeni Access Token alındı.");
        return tokenCache.token;
    } catch (error) {
        console.error("Token hatası:", error.response ? error.response.data : error.message);
        throw new Error("Microsoft Auth Failed");
    }
}

// ANA ENDPOINT
app.get('/api/calendar', async (req, res) => {
    console.log("İstek geldi...");

    // 1. DEMO MODU
    if (DEMO_MODE) {
        console.log(`⚠️ DEMO MODU AKTİF: Durum -> ${DEMO_STATUS}`);
        
        const now = new Date();
        const endTime = new Date(now.getTime() + 45 * 60000); 

        if (DEMO_STATUS === 'BUSY') {
            return res.json({
                status: "Busy",
                currentMeeting: {
                    subject: "Bitirme Projesi Jüri Sunumu",
                    organizer: { 
                        emailAddress: { name: "Ahmet Eren Arslan" } 
                    },
                    start: { dateTime: now.toISOString() },
                    end: { dateTime: endTime.toISOString() }
                },
                nextMeetings: [
                    {
                        subject: "Bölüm Toplantısı",
                        start: { dateTime: new Date(now.getTime() + 60 * 60000).toISOString() },
                        end: { dateTime: new Date(now.getTime() + 120 * 60000).toISOString() }
                    }
                ]
            });
        } else {
            return res.json({
                status: "Available",
                currentMeeting: null,
                nextMeetings: [
                    {
                        subject: "Yarınki Planlama",
                        start: { dateTime: new Date(now.getTime() + 24 * 60 * 60000).toISOString() },
                        end: { dateTime: new Date(now.getTime() + 25 * 60 * 60000).toISOString() }
                    }
                ]
            });
        }
    }

    // 2. GERÇEK MOD
    try {
        const token = await getAccessToken();
        const eventsUrl = `https://graph.microsoft.com/v1.0/users/${ROOM_EMAIL}/calendar/events?$top=5&$orderby=start/dateTime`;
        
        const response = await axios.get(eventsUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const events = response.data.value;
        const now = new Date();
        let currentStatus = "Available";
        let currentMeeting = null;
        let nextMeetings = [];

        for (let event of events) {
            const start = new Date(event.start.dateTime);
            const end = new Date(event.end.dateTime);

            if (now >= start && now <= end) {
                currentStatus = "Busy";
                currentMeeting = event;
            } else if (start > now) {
                nextMeetings.push(event);
            }
        }

        res.json({
            status: currentStatus,
            currentMeeting: currentMeeting,
            nextMeetings: nextMeetings
        });

    } catch (error) {
        console.error("Graph API Hatası:", error.message);
        res.status(500).json({ error: "Veri çekilemedi" });
    }
});

app.get('/', (req, res) => {
    res.send('Meeting Room Server is Running...');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server çalışıyor: Port ${PORT}`);
});
