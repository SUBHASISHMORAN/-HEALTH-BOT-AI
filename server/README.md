Simple server for proxying health/news requests and sending WhatsApp via Twilio.

Environment variables (create a .env file in server/):

- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_WHATSAPP_FROM (e.g. whatsapp:+1415xxxxxxx)

Run:

npm install express node-fetch dotenv body-parser
node server/index.js

If Twilio vars are not provided, the /api/whatsapp/send endpoint will return 501 and the client will fall back to opening WhatsApp web via wa.me.
