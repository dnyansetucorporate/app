<?php
// ─────────────────────────────────────────────────────────────
//  franchise_enquiry.php
//  Place in: htdocs/_dnyansetu/franchise_enquiry.php
// ─────────────────────────────────────────────────────────────

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request.']);
    exit;
}

// ── Include DB & Mail Config ──────────────────────────────────
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/mail_config.php';
require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ── Get & Sanitize Input ──────────────────────────────────────
$full_name  = trim($_POST['full_name'] ?? '');
$phone      = trim($_POST['phone']     ?? '');
$email      = trim($_POST['email']     ?? '');
$city       = trim($_POST['city']      ?? '');
$message    = trim($_POST['message']   ?? '');
$ip_address = $_SERVER['REMOTE_ADDR']  ?? '';

// ── Validate ──────────────────────────────────────────────────
if (!$full_name) { echo json_encode(['success' => false, 'message' => 'Full name is required.']);  exit; }
if (!$phone)     { echo json_encode(['success' => false, 'message' => 'Phone is required.']);       exit; }
if (!$city)      { echo json_encode(['success' => false, 'message' => 'City is required.']);        exit; }

// ── Save to Database ──────────────────────────────────────────
try {
    $stmt = $pdo->prepare("
        INSERT INTO franchise_enquiries (full_name, phone, email, city, message, ip_address)
        VALUES (:full_name, :phone, :email, :city, :message, :ip_address)
    ");
    $stmt->execute([
        ':full_name'  => $full_name,
        ':phone'      => $phone,
        ':email'      => $email ?: null,
        ':city'       => $city,
        ':message'    => $message ?: null,
        ':ip_address' => $ip_address,
    ]);
    $enquiry_id = $pdo->lastInsertId();
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'DB Save failed: ' . $e->getMessage()]);
    exit;
}

// ── Build Email HTML ──────────────────────────────────────────
$email_display   = $email   ?: 'Not provided';
$message_display = $message ?: 'No message';
$submitted_at    = date('d M Y, h:i A');

$html_body = "
<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;background:#f4f6fb;padding:20px;margin:0;'>
<table width='580' cellpadding='0' cellspacing='0'
       style='background:#fff;border-radius:10px;overflow:hidden;
              box-shadow:0 4px 20px rgba(0,0,0,0.08);margin:auto;'>
  <tr><td style='background:linear-gradient(135deg,#f57c00,#e65100);padding:28px 36px;text-align:center;'>
    <h2 style='color:#fff;margin:0;font-size:22px;'>🏪 New Franchise Enquiry</h2>
    <p style='color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;'>
      Dnyan Setu Institute &mdash; Website
    </p>
  </td></tr>
  <tr><td style='padding:18px 36px 0;text-align:center;'>
    <span style='background:#fff3e0;color:#e65100;padding:5px 16px;
                 border-radius:20px;font-size:13px;font-weight:bold;'>
      Franchise Enquiry #{$enquiry_id} &nbsp;|&nbsp; {$submitted_at}
    </span>
  </td></tr>
  <tr><td style='padding:20px 36px;'>
    <table width='100%' cellpadding='0' cellspacing='0'>
      <tr><td style='padding:11px 0;border-bottom:1px solid #f0f0f0;'>
        <small style='color:#888;text-transform:uppercase;font-size:11px;'>Full Name</small><br>
        <strong style='font-size:16px;color:#1a1a2e;'>{$full_name}</strong>
      </td></tr>
      <tr><td style='padding:11px 0;border-bottom:1px solid #f0f0f0;'>
        <small style='color:#888;text-transform:uppercase;font-size:11px;'>Phone</small><br>
        <strong style='font-size:16px;color:#1a1a2e;'>{$phone}</strong>
      </td></tr>
      <tr><td style='padding:11px 0;border-bottom:1px solid #f0f0f0;'>
        <small style='color:#888;text-transform:uppercase;font-size:11px;'>Email</small><br>
        <strong style='font-size:16px;color:#1a1a2e;'>{$email_display}</strong>
      </td></tr>
      <tr><td style='padding:11px 0;border-bottom:1px solid #f0f0f0;'>
        <small style='color:#888;text-transform:uppercase;font-size:11px;'>City / Location</small><br>
        <span style='display:inline-block;margin-top:5px;background:#fff3e0;color:#e65100;
                     padding:4px 16px;border-radius:20px;font-weight:bold;font-size:14px;'>
          📍 {$city}
        </span>
      </td></tr>
      <tr><td style='padding:11px 0;'>
        <small style='color:#888;text-transform:uppercase;font-size:11px;'>Message</small><br>
        <p style='background:#f9f9f9;border-left:3px solid #f57c00;border-radius:4px;
                  padding:12px;margin:6px 0 0;color:#333;font-size:14px;line-height:1.7;'>
          " . nl2br(htmlspecialchars($message_display)) . "
        </p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style='padding:4px 36px 28px;text-align:center;'>
    <a href='tel:{$phone}'
       style='background:#f57c00;color:#fff;text-decoration:none;
              padding:12px 30px;border-radius:6px;font-weight:bold;
              font-size:14px;display:inline-block;'>
      📞 Call Now
    </a>
  </td></tr>
  <tr><td style='background:#f4f6fb;padding:14px;text-align:center;border-top:1px solid #e8e8e8;'>
    <small style='color:#aaa;font-size:12px;'>
      Auto-generated by Dnyan Setu Institute Website
    </small>
  </td></tr>
</table></body></html>";

// ── Send Email via PHPMailer ───────────────────────────────────
try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = MAIL_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = MAIL_USERNAME;
    $mail->Password   = MAIL_PASSWORD;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = MAIL_PORT;
    $mail->CharSet    = 'UTF-8';

   $mail->setFrom(MAIL_FROM_EMAIL, $full_name . ' (via DnyanSetu Website)');

    $mail->addAddress(MAIL_TO_EMAIL, MAIL_TO_NAME);
    if ($email) $mail->addReplyTo($email, $full_name);

    $mail->isHTML(true);
    $mail->Subject = "New Franchise Enquiry #{$enquiry_id} — {$city}";
    $mail->Body    = $html_body;
    $mail->AltBody = "New Franchise Enquiry #{$enquiry_id}\n{$submitted_at}\n\n"
                   . "Name    : {$full_name}\nPhone   : {$phone}\nEmail   : {$email_display}\n"
                   . "City    : {$city}\nMessage : {$message_display}";

    $mail->send();

    echo json_encode([
        'success' => true,
        'message' => 'Enquiry submitted! Our franchise team will contact you soon.',
        'id'      => $enquiry_id
    ]);

} catch (Exception $e) {
    error_log("PHPMailer Error for Franchise Enquiry #{$enquiry_id}: " . $mail->ErrorInfo);
    echo json_encode([
        'success'      => true,
        'message'      => 'Enquiry saved! Our franchise team will contact you soon.',
        'id'           => $enquiry_id,
        'email_error'  => $mail->ErrorInfo
    ]);
}
?>