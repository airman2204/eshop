const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const WEBHOOK_URL = process.env.WEBHOOK_URL || ''; // URL de tu tienda: https://tudominio.com/api/whatsapp/webhook
const API_KEY = process.env.API_KEY || 'foxdrop_secret_2026';

let qrCodeData = null;
let connectionStatus = 'connecting'; // 'connecting', 'qr_ready', 'connected', 'disconnected'
let sock = null;

// Carpeta donde se guarda la sesión para no pedir QR en cada reinicio
const authDir = path.join(__dirname, 'auth_info_baileys');
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }), // Silenciar logs excesivos
    browser: ['FoxDrop CRM', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionStatus = 'qr_ready';
      qrCodeData = await QRCode.toDataURL(qr);
      console.log('⚡ Nuevo código QR generado. Escanéalo desde la interfaz web.');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`Conexión cerrada (status: ${statusCode}). ¿Reconectar?: ${shouldReconnect}`);
      connectionStatus = 'disconnected';
      qrCodeData = null;

      if (shouldReconnect) {
        setTimeout(startWhatsApp, 4000);
      }
    } else if (connection === 'open') {
      console.log('✅ ¡WhatsApp Conectado exitosamente con FoxDrop!');
      connectionStatus = 'connected';
      qrCodeData = null;
    }
  });

  // Escuchar mensajes entrantes y reenviarlos al webhook de FoxDrop / Supabase
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const senderJid = msg.key.remoteJid || '';
      // Filtrar mensajes de grupos
      if (senderJid.includes('@g.us')) continue;

      const cleanPhone = senderJid.replace(/@.+/, '');
      const text = 
        msg.message.conversation || 
        msg.message.extendedTextMessage?.text || 
        msg.message.imageMessage?.caption || 
        '';

      const pushName = msg.pushName || 'Cliente WhatsApp';

      console.log(`📩 Mensaje recibido de ${cleanPhone} (${pushName}): ${text}`);

      if (WEBHOOK_URL && text) {
        try {
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: cleanPhone,
              text: text,
              clientName: pushName,
            }),
          });
        } catch (err) {
          console.error('Error enviando mensaje al webhook de FoxDrop:', err.message);
        }
      }
    }
  });
}

// Iniciar sesión
startWhatsApp();

// ==========================================
// RUTAS Y PANTALLA VISUAL
// ==========================================

// Página principal: Muestra el QR o el estado de conexión
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FoxDrop WhatsApp Bridge</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F3E36; color: #FAF6F0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: white; color: #222E3C; padding: 32px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); text-align: center; max-width: 420px; width: 100%; }
        h1 { margin: 0 0 8px; color: #0F3E36; font-size: 24px; font-weight: 900; }
        p { color: #64748B; font-size: 13px; line-height: 1.5; margin: 0 0 20px; }
        .qr-box { background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 16px; padding: 16px; display: inline-block; margin-bottom: 20px; min-width: 250px; min-height: 250px; display: flex; align-items: center; justify-content: center; }
        .qr-box img { width: 240px; height: 240px; display: block; border-radius: 8px; }
        .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; }
        .badge.connected { background: #DCFCE7; color: #166534; }
        .badge.waiting { background: #FEF3C7; color: #92400E; }
        .badge.disconnected { background: #FEE2E2; color: #991B1B; }
        .instructions { text-align: left; background: #F1F5F9; border-radius: 12px; padding: 14px; font-size: 12px; color: #334155; }
        .instructions ol { margin: 8px 0 0; padding-left: 18px; }
        .instructions li { margin-bottom: 4px; }
      </style>
      <script>
        // Auto-refresco si está esperando QR o reconectando
        setTimeout(() => {
          if (!document.querySelector('.badge.connected')) {
            window.location.reload();
          }
        }, 8000);
      </script>
    </head>
    <body>
      <div class="card">
        <span class="badge ${connectionStatus === 'connected' ? 'connected' : connectionStatus === 'qr_ready' ? 'waiting' : 'disconnected'}">
          ${connectionStatus === 'connected' ? '🟢 Conectado a WhatsApp' : connectionStatus === 'qr_ready' ? '🟡 Esperando Escaneo de QR' : '⚪ Conectando...'}
        </span>
        
        <h1>WhatsApp FoxDrop</h1>
        <p>Micro-conector Multi-Socio para tu tienda en línea</p>

        <div class="qr-box">
          ${connectionStatus === 'connected' 
            ? '<div style="color: #166534; font-weight: bold;">🎉 ¡Tu celular ya está vinculado!<br><span style="font-size: 12px; color: #64748B;">Puedes cerrar esta pestaña o dejarla activa.</span></div>'
            : qrCodeData 
            ? '<img src="' + qrCodeData + '" alt="Código QR WhatsApp" />'
            : '<div>Generando código QR...<br><span style="font-size: 11px; color: #94A3B8;">Espera unos segundos</span></div>'
          }
        </div>

        ${connectionStatus !== 'connected' ? `
          <div class="instructions">
            <strong>Cómo vincular tu celular:</strong>
            <ol>
              <li>Abre WhatsApp en tu teléfono.</li>
              <li>Toca <strong>Menú (3 puntos)</strong> o <strong>Configuración</strong>.</li>
              <li>Selecciona <strong>Dispositivos vinculados</strong>.</li>
              <li>Toca <strong>Vincular un dispositivo</strong> y apunta al código QR.</li>
            </ol>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `);
});

// Endpoint de salud
app.get('/status', (req, res) => {
  res.json({ status: connectionStatus });
});

// Endpoint POST para enviar mensajes desde el panel Admin
app.post('/message/sendText', async (req, res) => {
  const { number, text } = req.body;

  if (!sock || connectionStatus !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp no está conectado todavía' });
  }

  if (!number || !text) {
    return res.status(400).json({ error: 'Número y texto requeridos' });
  }

  try {
    const formattedJid = `${number.replace(/\D/g, '')}@s.whatsapp.net`;
    const sent = await sock.sendMessage(formattedJid, { text });
    console.log(`📤 Mensaje enviado a ${number}: ${text}`);
    res.json({ success: true, messageId: sent.key.id });
  } catch (err) {
    console.error('Error enviando mensaje por WhatsApp:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 FoxDrop WhatsApp Bridge activo en el puerto ${PORT}`);
});
