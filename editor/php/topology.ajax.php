<?php
require_once '../../login.inc.php';

if (!LOGGEDIN) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit();
}

$user_id = $_SESSION['cs4g_user_id'];

// إنشاء جدول الطوبولوجيات إذا لم يكن موجوداً
$db->exec("CREATE TABLE IF NOT EXISTS topologies (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    name TEXT,
    json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
)");

$action = $_GET['action'] ?? '';

switch ($action) {

    // حفظ طوبولوجيا
    case 'save':
        $body = file_get_contents('php://input');
        $data = json_decode($body, true);
        if (!$data || !isset($data['name']) || !isset($data['json'])) {
            echo json_encode(['error' => 'Invalid data']);
            exit();
        }
        $name = trim($data['name']);
        $json = json_encode($data['json']);

        // تحقق إذا كان الاسم موجوداً لنفس المستخدم — حدّث بدل إضافة
        $check = $db->prepare("SELECT id FROM topologies WHERE user_id = :uid AND name = :name");
        $check->bindValue(':uid',  $user_id);
        $check->bindValue(':name', $name);
        $res = $check->execute()->fetchArray();

        if ($res) {
            $q = $db->prepare("UPDATE topologies SET json = :json, created_at = datetime('now') WHERE id = :id");
            $q->bindValue(':json', $json);
            $q->bindValue(':id',   $res['id']);
        } else {
            $q = $db->prepare("INSERT INTO topologies (user_id, name, json) VALUES (:uid, :name, :json)");
            $q->bindValue(':uid',  $user_id);
            $q->bindValue(':name', $name);
            $q->bindValue(':json', $json);
        }

        $q->execute();
        echo json_encode(['success' => true, 'message' => 'Saved']);
        break;

    // جلب قائمة الطوبولوجيات
    case 'list':
        $q = $db->prepare("SELECT id, name, created_at FROM topologies WHERE user_id = :uid ORDER BY created_at DESC");
        $q->bindValue(':uid', $user_id);
        $res = $q->execute();
        $list = [];
        while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
            $list[] = $row;
        }
        echo json_encode($list);
        break;

    // تحميل طوبولوجيا
    case 'load':
        $id = intval($_GET['id'] ?? 0);
        $q  = $db->prepare("SELECT json FROM topologies WHERE id = :id AND user_id = :uid");
        $q->bindValue(':id',  $id);
        $q->bindValue(':uid', $user_id);
        $res = $q->execute()->fetchArray(SQLITE3_ASSOC);
        if ($res) {
            echo $res['json'];
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Not found']);
        }
        break;

    // حذف طوبولوجيا
    case 'delete':
        $id = intval($_GET['id'] ?? 0);
        $q  = $db->prepare("DELETE FROM topologies WHERE id = :id AND user_id = :uid");
        $q->bindValue(':id',  $id);
        $q->bindValue(':uid', $user_id);
        $q->execute();
        echo json_encode(['success' => true]);
        break;

    default:
        echo json_encode(['error' => 'Unknown action']);
}
