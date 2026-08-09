<?php
// ─────────────────────────────────────────────────────────────
//  mail_config.php  –  Gmail SMTP configuration
//  ⚠️  Keep this file private. Never commit to GitHub.
// ─────────────────────────────────────────────────────────────
 
define('MAIL_HOST',       'smtp.gmail.com');
define('MAIL_PORT',       587);                          // TLS port
define('MAIL_USERNAME',   'dnyansetucorporate@gmail.com');  // Your Gmail
define('MAIL_PASSWORD',   'raehfmliwiqymkov');     // ← See setup guide below
define('MAIL_FROM_EMAIL', 'dnyansetucorporate@gmail.com');
define('MAIL_FROM_NAME',  'Dnyan Setu Institute – Website');
define('MAIL_TO_EMAIL',   'dnyansetucorporate@gmail.com');  // Where to receive enquiries
define('MAIL_TO_NAME',    'Dnyan Setu Enquiries');
 
/*
 ╔══════════════════════════════════════════════════════════════╗
 ║  HOW TO GET YOUR GMAIL APP PASSWORD (one-time setup)        ║
 ╠══════════════════════════════════════════════════════════════╣
 ║  1. Go to: https://myaccount.google.com/security            ║
 ║  2. Enable "2-Step Verification" (required)                 ║
 ║  3. Search "App passwords" in the search bar                ║
 ║  4. Select app: Mail  |  Device: Other → type "Website"     ║
 ║  5. Click Generate → copy the 16-character password         ║
 ║  6. Paste it above in MAIL_PASSWORD (no spaces)             ║
 ╚══════════════════════════════════════════════════════════════╝
*/
 