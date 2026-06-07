# 📚 توثيق شامل لمشروع Netsim

## 📋 نظرة عامة على المشروع

**Netsim** هو محاكي شبكات ويب يهدف إلى **تعليم الهاكينج والأمان السيبراني لطلاب المدارس الثانوية**.

المشروع يسمح للمستخدمين بـ:
- تعلم مفاهيم الشبكات والبروتوكولات
- فهم كيفية نقل البيانات عبر الشبكات
- ممارسة هجمات الشبكة بطريقة تعليمية آمنة
- حل تحديات متدرجة من الأساسيات إلى الهجمات المتقدمة

---

## 🔧 معلومات تقنية

| المعلومة | التفاصيل |
|---------|---------|
| **نوع المشروع** | تطبيق ويب تفاعلي |
| **الترخيص** | MIT License |
| **حالة المشروع** | Beta (قيد التطوير) |
| **عدد المستخدمين المتزامنين المدعومين** | متعدد المستخدمين |
| **متطلبات الخادم** | PHP مع SQLite3 |
| **حجم المشروع** | 6532 كيلوبايت |

---

## 🗂️ بنية الملفات الكاملة

```
netsim/
│
├── 📄 المستندات والإعدادات
│   ├── README.md                    # ملف التعريف الأساسي
│   ├── LICENSE                      # رخصة MIT
│   ├── .gitignore                   # ملفات يتم تجاهلها في Git
│   ├── sample.config.inc.php        # ملف تكوين نموذجي
│   └── PROJECT_DOCUMENTATION.md     # هذا الملف
│
├── 📄 ملفات PHP الرئيسية
│   ├── index.php                    # الملف الرئيسي للتطبيق
│   ├── register.php                 # صفحة تسجيل حسابات جديدة
│   ├── login.inc.php                # نظام المصادقة وقاعدة البيانات
│   ├── phaser.inc.php               # محرك اللعبة والمحاكاة
│   ├── header.inc.php               # رأس الصفحة HTML
│   ├── footer.inc.php               # تذييل الصفحة HTML
│   ├── listing.inc.php              # قائمة المستويات المتاحة
���   └── solns.ajax.php               # معالج الطلبات AJAX
│
├── 📁 css/ - ملفات التنسيق
│   └── jquery-ui.min.css            # أنماط jQuery UI
│
├── 📁 js/ - ملفات JavaScript
│   ├── jquery-3.2.1.min.js          # مكتبة jQuery
│   ├── jquery-ui.min.js             # واجهة jQuery
│   ├── phaser.min.js                # محرك اللعبة
│   ├── ui.js                        # منطق الواجهة
│   ├── bindings.js                  # ربط الأحداث والتفاعلات
│   └── devicescripts.js             # سكريبتات الأجهزة
│
├── 📁 levels/ - ملفات المستويات
│   ├── 01 Basics/
│   │   ├── level01.html
│   │   ├── level01.json
│   │   ├── level02.html
│   │   └── level02.json
│   ├── 02 Spoofs/
│   ├── 03 Denial of Service/
│   └── 04 Attacks/
│
└── 📁 includes/ - ملفات الموارد
    ├── 📁 ui/                       # أيقونات الواجهة
    │   ├── reset.png
    │   ├── pause.png
    │   ├── play.png
    │   ├── fast.png
    │   ├── launch.png
    │   ├── tabs.png
    │   ├── add.png
    │   └── meter-0.png إلى meter-6.png
    ├── 📁 thumbs/                   # صور المستويات المصغرة
    │   └── check.png                # علامة الإكمال
    ├── fireworks.gif                # صورة الاحتفال عند إكمال اللعبة
    ├── circle.png                   # صورة الحزم
    ├── imac.png                     # صورة جهاز كمبيوتر
    ├── iphone-1.png                 # صورة هاتف ذكي
    ├── macbook.png                  # صورة جهاز محمول
    ├── monitor.png                  # صورة شاشة
    ├── server.png                   # صورة خادم
    └── router.png                   # صورة موجه الشبكة

```

---

## 📄 شرح تفصيلي للملفات الرئيسية

### 1️⃣ `index.php` - الملف الرئيسي

**الهدف**: نقطة الدخول الأساسية للتطبيق

**الوظائف الرئيسية**:
- التحقق من حالة تسجيل الدخول
- التوجيه إلى الصفحات المناسبة حسب حالة المستخدم
- تحميل المستوى المطلوب من قاعدة البيانات
- عرض واجهة اللعبة التفاعلية

**التدفق**:
```
1. استدعاء login.inc.php → التحقق من المصادقة
2. إذا لم يكن مسجل دخول → عرض صفحة تسجيل
3. إذا لم تكن هناك معاملات level → عرض قائمة المستويات (listing.inc.php)
4. إذا كان level محدد → تحميل بيانات المستوى من قاعدة البيانات
5. عرض واجهة اللعبة مع محرر الحزم (Packet Editor)
6. في النهاية → عرض رسالة الاحتفال عند الانتهاء من جميع المستويات
```

**المتغيرات الهامة**:
- `$_GET['level']`: معرف المستوى المطلوب
- `$leveldata`: بيانات المستوى المحملة من قاعدة البيانات
- `LOGGEDIN`: ثابت يحدد ما إذا كان المستخدم مسجل دخول

---

### 2️⃣ `login.inc.php` - نظام المصادقة وقاعدة البيانات

**الهدف**: إدارة المصادقة وإنشاء/إدارة قاعدة البيانات

**الميزات الرئيسية**:

#### أ. إنشاء قاعدة البيانات (عند الزيارة الأولى)

ينشئ جداول SQLite3 التالية:

**جدول `user`**:
```sql
CREATE TABLE user (
    id INTEGER PRIMARY KEY,
    name TEXT,
    password TEXT
)
```
- يحتوي على المستخدمين
- كلمات المرور مشفرة باستخدام `password_hash`
- يتضمن حساب افتراضي: المستخدم `erinn` (مطور المشروع)

**جدول `category`**:
```sql
CREATE TABLE category (
    id INTEGER PRIMARY KEY,
    name TEXT,
    orderby INTEGER
)
```
- الفئات الافتراضية:
  1. **Basics** - المفاهيم الأساسية
  2. **Spoofs** - هجمات التزييف
  3. **Denial of Service** - هجمات إنكار الخدمة
  4. **Attacks** - الهجمات المتقدمة

**جدول `level`**:
```sql
CREATE TABLE level (
    id INTEGER PRIMARY KEY,
    category_id INTEGER,
    name TEXT,
    orderby INTEGER,
    filename TEXT
)
```
- يحتوي على معلومات المستويات
- `filename`: مسار ملف HTML وJSON للمستوى

**جدول `solns` (Solutions)**:
```sql
CREATE TABLE solns (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    level_id INTEGER,
    completed INTEGER,
    json TEXT
)
```
- يحفظ حلول المستخدمين
- `completed`: 0 = قيد المحاولة، 1 = مكتمل
- `json`: بيانات الحل بصيغة JSON

#### ب. المصادقة

```php
// التحقق من المستخدم
$userq->bindValue(':name', $_POST['username']);
$res = $userq->execute();

// التحقق من كلمة المرور (مشفرة)
if (password_verify($_POST['password'], $res['password'])) {
    $_SESSION['cs4g_user_id'] = $res['id'];
    header('Location: ./');
}
```

#### ج. إدارة الجلسات

```php
session_set_cookie_params(3600 * 24 * 30); // 30 يوم
session_start();
define('LOGGEDIN', isset($_SESSION['cs4g_user_id']));
```

---

### 3️⃣ `register.php` - تسجيل حسابات جديدة

**الهدف**: السماح بإنشاء حسابات مستخدمين جديدة

**الخطوات**:
1. التحقق من المدخلات (`reg_username`, `reg_password`)
2. التحقق من أن اسم المستخدم غير موجود مسبقاً
3. تشفير كلمة المرور باستخدام `password_hash`
4. إدراج المستخدم الجديد في جدول `user`
5. تسجيل الدخول التلقائي للمستخدم الجديد
6. إعادة التوجيه إلى الصفحة الرئيسية

**رسائل الخطأ**:
- `"Someone has that username already..."` - اسم المستخدم موجود
- `"Passwords don't match"` - عدم تطابق كلمات المرور

---

### 4️⃣ `listing.inc.php` - قائمة المستويات

**الهدف**: عرض جميع المستويات المتاحة بطريقة منظمة

**الميزات**:
- تصنيف المستويات حسب الفئات
- عرض صور المستويات كبطاقات
- إشارة بصرية للمستويات المكتملة (✓)
- توجيه للمستوى المطلوب

**الكود الأساسي**:
```php
// جلب الفئات
$res = $db->query("SELECT * FROM category ORDER BY orderby");

while ($row = $res->fetchArray()) {
    echo "<h3>".$row['name']."</h3>";
    
    // جلب المستويات في كل فئة
    $res2 = $db->query("SELECT * FROM level WHERE category_id = ".$row['id']." ORDER BY orderby");
    
    while ($row2 = $res2->fetchArray()) {
        // عرض البطاقة
        $complete = levelComplete($row2['id']);
        echo "<img src=\"includes/thumbs/".$row2['id'].".png\">";
        if ($complete) echo "<img src=\"includes/thumbs/check.png\">"; // علامة الإكمال
    }
}
```

**دالة `levelComplete`**:
```php
function levelComplete($l) {
    global $db;
    $q = $db->query("SELECT * FROM solns WHERE user_id = ".$_SESSION['cs4g_user_id']." AND level_id = $l");
    $row = $q->fetchArray();
    return $row !== false && $row['completed'] == 1;
}
```

---

### 5️⃣ `header.inc.php` - رأس الصفحة

**الهدف**: توفير هيكل HTML القياسي وتحميل المكتبات

**المحتويات**:
- `<!DOCTYPE html>` وفتح الصفحة
- تحميل مكتبات JavaScript:
  - jQuery 3.2.1 - معالجة DOM
  - jQuery UI - مكونات الواجهة
- تحميل أنماط CSS (jQuery UI)
- تنسيق عام للصفحة (gradients, backgrounds)

---

### 6️⃣ `footer.inc.php` - تذييل الصفحة

**الهدف**: إغلاق عناصر HTML

**المحتويات**:
```php
</div>
</body>
</html>
```

---

### 7️⃣ `phaser.inc.php` - محرك اللعبة والمحاكاة

**الهدف**: محرك الرسوميات والمحاكاة لشبكة الحاسوب

**المميزات الرئيسية**:

#### أ. تحميل الموارد (Preload)
```javascript
game.load.image('imac', 'includes/imac.png');      // جهاز كمبيوتر
game.load.image('iphone-1', 'includes/iphone-1.png'); // هاتف
game.load.image('router', 'includes/router.png');  // موجه
game.load.image('server', 'includes/server.png');  // خادم
game.load.image('packet', 'includes/circle.png');  // حزمة بيانات
game.load.image('pause', 'includes/ui/pause.png'); // أزرار التحكم
```

#### ب. إنشاء المشهد (Create)
```javascript
function create() {
    grpDevices = game.add.group();   // مجموعة الأجهزة
    grpPackets = game.add.group();   // مجموعة الحزم
    grpLaunchers = game.add.group(); // مجموعة المطلقات
    
    // إنشاء أجهزة الشبكة
    for (var i = 0; i < level.devices.length; i++) {
        var devSprite = grpDevices.create(
            0.7 * game.world.width * level.devices[i].x,
            game.world.height * level.devices[i].y,
            level.devices[i].image
        );
    }
}
```

#### ج. حقول الحزم (Packet Fields)

تنقسم الحزم إلى طبقات:

**طبقة الشبكة (Network Layer)**:
- `srcip` - عنوان IP المصدر
- `dstip` - عنوان IP الوجهة

**طبقة النقل (Transport Layer)**:
- `proto` - البروتوكول
- `ttl` - Time To Live (مدة البقاء)

**طبقة التطبيق (Application Layer)**:
- `type` - نوع الرسالة
- `key` - مفتاح التشفير

#### د. إطلاق الحزم

```javascript
function doPacketAnimation(from, to, payload) {
    // إنشاء حزمة وتحريكها من جهاز إلى آخر
    var packet = grpPackets.create(...);
    packet.dst = to;
    packet.payload = payload;
}
```

#### هـ. التحفزات (Triggers)

نوعان من التحفزات:

**1. Packet Trigger** - يتحقق من استقبال حزمة معينة:
```json
{
    "type": "packet",
    "device": "bob",
    "payload": {
        "network": {"srcip": "192.168.1.1"},
        "transport": {"proto": "tcp"}
    },
    "times": 3  // كم مرة يجب أن تتكرر
}
```

**2. Flood Trigger** - يكتشف هجمات إنكار الخدمة:
```json
{
    "type": "flood",
    "device": "server",
    "times": 1
}
```

#### و. حالة الفوز

```javascript
function donePacket() {
    // التحقق من تحقق جميع التحفزات
    for (var i = 0; i < level.triggers.length; i++) {
        if (!level.triggers[i].completed) youWin = false;
    }
    
    if (youWin) {
        $.get("./solns.ajax.php?level="+levelid+"&method=win");
        // عرض نافذة الفوز
    }
}
```

#### ز. أزرار التحكم

| الزر | الوظيفة |
|-----|--------|
| Reset | إعادة تشغيل المستوى |
| Pause | إيقاف المحاكاة |
| Play | استئناف المحاكاة |
| Fast | تسريع المحاكاة |

---

### 8️⃣ `solns.ajax.php` - معالج الطلبات AJAX

**الهدف**: حفظ وتحميل حلول المستخدمين

**الطلبات المدعومة**:

#### 1. `method=load` - تحميل الحل السابق
```php
if ($_GET['method'] == "load") {
    $q = $db->query("SELECT * FROM solns WHERE level_id = $l AND user_id = ".$_SESSION['cs4g_user_id']);
    echo $row['json']; // إرجاع البيانات المحفوظة
}
```

#### 2. `method=save` - حفظ الحل الحالي
```php
if ($_GET['method'] == 'save') {
    $json = $_POST['json'];
    // حذف الحل القديم
    $db->exec("DELETE FROM solns WHERE level_id = $l AND user_id = ".$_SESSION['cs4g_user_id']);
    // إدراج الحل الجديد
    $q->execute();
    echo $q->execute() ? "ok" : "err";
}
```

#### 3. `method=win` - تحديث حالة المستوى إلى مكتمل
```php
if ($_GET['method'] == 'win') {
    $db->exec("UPDATE solns SET completed = 1 WHERE level_id = $l AND user_id = ".$_SESSION['cs4g_user_id']);
}
```

---

### 9️⃣ `sample.config.inc.php` - ملف التكوين

**الهدف**: تخزين إعدادات المشروع

**المحتويات**:
```php
<?php
// مسار ملف قاعدة البيانات SQLite
// يجب أن يكون قابلاً للكتابة من قبل خادم الويب
define('DB_FILE', '/var/www-data/netsim.sqlite3');
?>
```

**خطوات الإعداد**:
1. نسخ `sample.config.inc.php` إلى `config.inc.php`
2. تعديل مسار المجلد حسب الخادم
3. التأكد من أن المجلد قابل للكتابة

---

## 🎮 ملفات المستويات

كل مستوى يتكون من ملفين:

### 1. `levelXX.html` - وصف التحدي

يحتوي على:
- شرح التحدي والأهداف
- نصائح وإرشادات
- معلومات عن الأجهزة والشبكة

### 2. `levelXX.json` - بيانات المحاكاة

```json
{
  "devices": [
    {
      "id": "alice",
      "name": "Alice's Computer",
      "x": 0.1,
      "y": 0.3,
      "image": "imac.png"
    }
  ],
  "links": [
    {
      "src": "alice",
      "dst": "bob",
      "srcport": 0,
      "dstport": 0
    }
  ],
  "timeline": [
    {
      "at": 2000,
      "from": "alice",
      "payload": {
        "network": {"srcip": "192.168.1.1", "dstip": "192.168.1.2"}
      }
    }
  ],
  "triggers": [
    {
      "type": "packet",
      "device": "bob",
      "payload": {
        "network": {"srcip": "192.168.1.1"}
      }
    }
  ],
  "nextLevel": 2
}
```

---

## 🗄️ هيكل قاعدة البيانات

### مخطط علاقات الجداول

```
user (1) ────────→ (N) solns
                    ↓
                  level
                    ↓
                  category
```

### استعلامات شائعة

**جلب جميع مستويات المستخدم المكتملة**:
```sql
SELECT l.* FROM level l
JOIN solns s ON l.id = s.level_id
WHERE s.user_id = ? AND s.completed = 1
ORDER BY s.level_id;
```

**التحقق من إكمال مستوى معين**:
```sql
SELECT * FROM solns 
WHERE user_id = ? AND level_id = ? AND completed = 1;
```

**حفظ محاولة جديدة**:
```sql
INSERT INTO solns (user_id, level_id, completed, json) 
VALUES (?, ?, 0, ?);
```

---

## 🔐 الأمان والمصادقة

### تشفير كلمات المرور

```php
// عند التسجيل
$hash = password_hash($_POST['password'], PASSWORD_DEFAULT);

// عند التحقق
if (password_verify($_POST['password'], $hash)) {
    // صحيح
}
```

**الخوارزمية**: bcrypt (الخوارزمية الافتراضية في PHP)

### جلسات المستخدم

- **مدة الجلسة**: 30 يوم
- **التخزين**: Cookie جانب العميل + Server Session
- **السلامة**: معرف الجلسة المشفر

### حماية قاعدة البيانات

- استخدام `SQLite3` (آمن من حيث SQL Injection)
- استخدام Prepared Statements:
```php
$q = $db->prepare("SELECT * FROM user WHERE name = :name");
$q->bindValue(':name', $_POST['username']);
```

---

## 🎨 تكنولوجيا الواجهة

### JavaScript

```javascript
// معالجة الأحداث
game.input.keyboard.onPressCallback = function(e) {
    if (e == " ") btnPause(); // مسافة = إيقاف
}

// تحديث الشاشة (60 FPS)
function update() {
    // حساب حالة الفيضانات
    // تحديث عرض الأمتار
    // التحقق من الفوز
}
```

### jQuery

```javascript
// حفظ الحل
$.post("./solns.ajax.php", {
    level: levelid,
    json: playerPackets
});

// تحميل الحل السابق
$.get("./solns.ajax.php?level="+levelid+"&method=load", function(data) {
    playerPackets = JSON.parse(data);
});
```

### Phaser Engine

- **محرك الألعاب**: Phaser 2.x
- **الرسوميات**: Canvas 2D
- **الأداء**: 60 FPS
- **الحجم**: ~900 KB (مضغوط)

---

## 📊 إحصائيات المشروع

| المقياس | الرقم |
|--------|------|
| عدد الملفات | ~50+ |
| عدد المستويات | 15+ (في النسخة الأساسية) |
| عدد الفئات | 4 |
| حجم الصور | ~100 MB |
| عدد المكتبات الخارجية | 3 (jQuery, jQuery UI, Phaser) |

---

## 🚀 سير العمل الكامل

### دورة حياة المستخدم

```
1. الزيارة الأولى
   ↓
2. التحقق من الحساب (login.inc.php)
   ├─ إذا لم يكن مسجل: عرض صفحة Login
   ├─ إذا لم يكن له حساب: عرض صفحة Register
   └─ إذا كان مسجل: عرض listing.inc.php
   ↓
3. عرض قائمة المستويات (listing.inc.php)
   ├─ جلب جميع الفئات من قاعدة البيانات
   ├─ جلب جميع المستويات لكل فئة
   ├─ عرض صور المستويات
   └─ الإشارة إلى المستويات المكتملة
   ↓
4. اختيار مستوى
   ↓
5. تحميل المستوى (index.php)
   ├─ جلب بيانات المستوى من قاعدة البيانات
   ├─ جلب وصف المستوى (HTML)
   ├─ جلب بيانات المحاكاة (JSON)
   └─ عرض واجهة اللعبة
   ↓
6. تشغيل المحاكاة (phaser.inc.php)
   ├─ تحميل صور الأجهزة والحزم
   ├─ رسم الشبكة والأجهزة
   ├─ تشغيل الحزم المبرمجة (timeline)
   └─ الاستماع لتفاعلات المستخدم
   ↓
7. حل التحدي (ui.js + bindings.js)
   ├─ إنشاء حزم بيانات
   ├─ إطلاق الحزم إلى الأجهزة
   ├─ مراقبة الحزم الواردة
   └─ التحقق من تحقق الشروط
   ↓
8. الفوز (donePacket)
   ├─ التحقق من جميع الشروط
   ├─ حفظ حالة الفوز (solns.ajax.php)
   └─ عرض نافذة الاحتفال
   ↓
9. العودة إلى القائمة
   └─ تكرار العملية للمستوى التالي
```

---

## 🔧 التثبيت والإعداد

### المتطلبات
- PHP 5.4+
- SQLite3 extension
- خادم ويب (Apache, Nginx, إلخ)
- متصفح حديث يدعم HTML5 Canvas

### خطوات التثبيت

1. **تحميل الملفات**:
   ```bash
   git clone https://github.com/judy-aziz-1/netsim.git
   cd netsim
   ```

2. **إنشاء ملف التكوين**:
   ```bash
   cp sample.config.inc.php config.inc.php
   ```

3. **تعديل مسار قاعدة البيانات**:
   ```php
   // في config.inc.php
   define('DB_FILE', '/path/to/netsim.sqlite3');
   ```

4. **التأكد من الأذونات**:
   ```bash
   chmod 755 /path/to/database/directory
   chmod 644 config.inc.php
   ```

5. **زيارة التطبيق**:
   ```
   http://your-server/netsim/index.php
   ```

6. **تهيئة قاعدة البيانات**:
   - سيتم الإنشاء تلقائياً عند أول زيارة
   - سيظهر رسالة: "The database was initialized successfully!"

---

## 🎓 المفاهيم التعليمية

يعلم المشروع المفاهيم التالية:

### الأساسيات (Basics)
- مفهوم الحزم وبنيتها
- طبقات OSI
- عناوين IP والمنافذ
- البروتوكولات (TCP, UDP, ICMP)

### التزييف (Spoofs)
- ARP Spoofing
- IP Spoofing
- DNS Spoofing
- تقنيات إعادة التوجيه

### إنكار الخدمة (Denial of Service)
- Flood attacks (DDoS)
- كشف الفيضانات
- تأثير الحمل الثقيل على الأجهزة

### الهجمات المتقدمة (Attacks)
- تسلسل رسائل معقدة
- اختراق الأمان
- تحليل البروتوكولات

---

## 🐛 معالجة الأخطاء

### رسائل الخطأ الشائعة

**"No database file was found"**
- السبب: قاعدة البيانات غير موجودة
- الحل: تأكد من مسار DB_FILE والأذونات

**"Failed to create file"**
- السبب: لا توجد أذونات كتابة
- الحل: `chmod 755` على المجلد الأب

**"Username or password incorrect"**
- السبب: بيانات دخول غير صحيحة
- الحل: تحقق من اسم المستخدم وكلمة المرور

---

## 📞 الدعم والمساهمة

### المطورون الأصليون
- **Erinn Atwater** - المطور الرئيسي
  - [موقع Erinn](https://erinn.io/)
  - [Patreon](https://www.patreon.com/errorinn)

- **Cecylia Bocovich** - المطور المساعد
  - [جامعة Waterloo](https://cs.uwaterloo.ca/~cbocovic)

### التقارير والمشاكل
- Twitter: [@errorinn](https://twitter.com/errorinn)
- GitHub Issues: [judy-aziz-1/netsim](https://github.com/judy-aziz-1/netsim)

### رصيد الصور
- جميع صور الأجهزة: [madebyoliver](http://www.flaticon.com/authors/madebyoliver) من Flaticon

---

## 📝 الملاحظات الهامة

⚠️ **المشروع لا يزال في مرحلة Beta**
- قد تكون هناك باقات تحديثات متكررة
- قد يتم إعادة تعيين قاعدة البيانات من وقت لآخر
- الإبلاغ عن الأخطاء مهم لتحسين المشروع

✅ **الهدف التعليمي**
- هذا المشروع آمن وقانوني للاستخدام التعليمي
- لا يتم محاكاة هجمات فعلية بل تحديات تعليمية فقط
- مناسب لطلاب المدارس الثانوية والجامعات

---

## 📚 مراجع إضافية

### مفاهيم الشبكات
- [OSI Model](https://en.wikipedia.org/wiki/OSI_model)
- [TCP/IP Protocol Suite](https://en.wikipedia.org/wiki/Internet_protocol_suite)
- [Network Packets](https://en.wikipedia.org/wiki/Network_packet)

### التقنيات المستخدمة
- [PHP Documentation](https://www.php.net/docs.php)
- [SQLite3 Manual](https://www.sqlite.org/docs.html)
- [Phaser Framework](https://phaser.io/)

---

**تم التوثيق بواسطة**: Copilot
**التاريخ**: يونيو 2026
**الحالة**: وثائق شاملة
