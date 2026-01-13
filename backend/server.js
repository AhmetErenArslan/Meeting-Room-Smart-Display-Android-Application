import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors()); 

async function getAccessToken() {
    // Credentials
    const tenantId = '066690f2-a8a6-4889-852e-124371dcbd6f'; 
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
    const params = new URLSearchParams({
      client_id: '04b36452-983e-4903-866c-936f4b655d60',
      client_secret: 'whd8Q~lVxH4asu.z_pHRLFpfTJcoAO1H8IpL9aON', 
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default"
    });
  
    const response = await axios.post(url, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
  
    return response.data.access_token;
}

app.get("/room-calendar", async (req, res) => {
  try {
    const token = await getAccessToken();

    const start = new Date();
    start.setHours(0,0,0,0);

    // Fetch next 30 days
    const end = new Date();
    end.setDate(end.getDate() + 30);
    end.setHours(23,59,59,999);

    const ROOM_EMAIL = 'btetoplantiodasi@gtu.edu.tr';

    const graphUrl =
      `https://graph.microsoft.com/v1.0/users/${ROOM_EMAIL}/calendarView` +
      `?startDateTime=${start.toISOString()}` +
      `&endDateTime=${end.toISOString()}`;

    const graphRes = await axios.get(graphUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Success: Fetched ${graphRes.data.value.length} events from Microsoft Graph.`);
    res.json(graphRes.data.value);
  
  } catch (err) {
    // Log minimal error info to server console
    console.error("⚠️ API Error:", err.message);
    
    // Create a mock "System Event" to display error on tablet screen
    const today = new Date();
    const nextHour = new Date(today.getTime() + 60 * 60 * 1000); 

    res.json([
      {
        id: "error-info",
        subject: "⚠️ SYSTEM: Waiting for IT Approval", 
        organizer: { emailAddress: { name: "IT Department" } },
        // Remove 'Z' to avoid double-UTC issues on frontend
        start: { dateTime: today.toISOString().slice(0, -1) },
        end: { dateTime: nextHour.toISOString().slice(0, -1) }
      }
    ]);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend is running on port ${PORT}`);
});
