<?php
// ─────────────────────────────────────────────────────────────
//  student_enquiry.php
//  Place in: htdocs/_dnyansetu/student_enquiry.php
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

// PHPMailer — path depends on how you installed it
// If via Composer:
require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ── Get & Sanitize Input ──────────────────────────────────────
$full_name  = trim($_POST['full_name'] ?? '');
$phone      = trim($_POST['phone']     ?? '');
$email      = trim($_POST['email']     ?? '');
$course     = trim($_POST['course']    ?? '');
$message    = trim($_POST['message']   ?? '');
$ip_address = $_SERVER['REMOTE_ADDR'] ?? '';

// ── Validate ──────────────────────────────────────────────────
if (!$full_name) { echo json_encode(['success' => false, 'message' => 'Full name is required.']);   exit; }
if (!$phone)     { echo json_encode(['success' => false, 'message' => 'Phone is required.']);        exit; }
if (!$course)    { echo json_encode(['success' => false, 'message' => 'Please select a course.']);   exit; }

// ── Save to Database ──────────────────────────────────────────
try {
    $stmt = $pdo->prepare("
        INSERT INTO student_enquiries (full_name, phone, email, course, message, ip_address)
        VALUES (:full_name, :phone, :email, :course, :message, :ip_address)
    ");
    $stmt->execute([
        ':full_name'  => $full_name,
        ':phone'      => $phone,
        ':email'      => $email ?: null,
        ':course'     => $course,
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
  <tr><td style='background:linear-gradient(135deg,#1a73e8,#0d47a1);padding:28px 36px;text-align:center;'>
    <h2 style='color:#fff;margin:0;font-size:22px;'>📚 New Student Enquiry</h2>
    <p style='color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;'>
      Dnyan Setu Institute &mdash; Website
    </p>
  </td></tr>
  <tr><td style='padding:18px 36px 0;text-align:center;'>
    <span style='background:#e8f0fe;color:#1a73e8;padding:5px 16px;
                 border-radius:20px;font-size:13px;font-weight:bold;'>
      Enquiry #{$enquiry_id} &nbsp;|&nbsp; {$submitted_at}
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
        <small style='color:#888;text-transform:uppercase;font-size:11px;'>Course Interested In</small><br>
        <span style='display:inline-block;margin-top:5px;background:#fff3e0;color:#e65100;
                     padding:4px 16px;border-radius:20px;font-weight:bold;font-size:14px;'>{$course}</span>
      </td></tr>
      <tr><td style='padding:11px 0;'>
        <small style='color:#888;text-transform:uppercase;font-size:11px;'>Message</small><br>
        <p style='background:#f9f9f9;border-left:3px solid #1a73e8;border-radius:4px;
                  padding:12px;margin:6px 0 0;color:#333;font-size:14px;line-height:1.7;'>
          " . nl2br(htmlspecialchars($message_display)) . "
        </p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style='padding:4px 36px 28px;text-align:center;'>
    <a href='tel:{$phone}'
       style='background:#1a73e8;color:#fff;text-decoration:none;
              padding:12px 30px;border-radius:6px;font-weight:bold;
              font-size:14px;display:inline-block;'>
      📞 Call Student Now
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

    // SMTP Settings from mail_config.php
    $mail->isSMTP();
    $mail->Host       = MAIL_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = MAIL_USERNAME;
    $mail->Password   = MAIL_PASSWORD;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = MAIL_PORT;
    $mail->CharSet    = 'UTF-8';

    // From & To
  $mail->setFrom(MAIL_FROM_EMAIL, $full_name . ' (via DnyanSetu Website)');
    $mail->addAddress(MAIL_TO_EMAIL, MAIL_TO_NAME);

    // Reply-To (student's email if provided)
    if ($email) {
        $mail->addReplyTo($email, $full_name);
    }

    // Content
    $mail->isHTML(true);
    $mail->Subject = "New Student Enquiry #{$enquiry_id} — {$course}";
    $mail->Body    = $html_body;
    $mail->AltBody = "New Student Enquiry #{$enquiry_id}\n{$submitted_at}\n\n"
                   . "Name    : {$full_name}\nPhone   : {$phone}\nEmail   : {$email_display}\n"
                   . "Course  : {$course}\nMessage : {$message_display}";

    $mail->send();

    echo json_encode([
        'success' => true,
        'message' => 'Enquiry submitted! Our counsellor will contact you shortly.',
        'id'      => $enquiry_id
    ]);

} catch (Exception $e) {
    // DB save was successful but email failed — still return success
    // so user doesn't resubmit, but log the error
    error_log("PHPMailer Error for Enquiry #{$enquiry_id}: " . $mail->ErrorInfo);

    echo json_encode([
        'success' => true,
        'message' => 'Enquiry saved! Our counsellor will contact you shortly.',
        'id'      => $enquiry_id,
        'email_error' => $mail->ErrorInfo  // remove this line on production
    ]);
}
?>