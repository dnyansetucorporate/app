<?php
// ─────────────────────────────────────────────────────────────
//  db_connect.php  –  Database connection (PDO)
//  Place in:  htdocs/your-project/
// ─────────────────────────────────────────────────────────────
 
$host     = 'localhost';
$dbname   = 'u732928784_dnyansetu';
$username = 'u732928784_Dnyansetu123';   // ← change if needed
$password = 'Dnyansetu123';       // ← change if needed (blank for XAMPP default)
 
try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE,            PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    error_log('DB connect error: ' . $e->getMessage());
    exit;
}
 