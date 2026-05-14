\# وثيقة مواصفات متطلبات البرمجيات

\# Software Requirements Specification (SRS)



\*\*عنوان المشروع:\*\* تطوير منصة لمحاكي شبكات تفاعلي يحقق معايير SIEM و SOC

\*\*Project Title:\*\* Developing an Interactive Network Simulator Platform that meets SIEM and SOC standards



\*\*الجامعة:\*\* جامعة اللاذقية — كلية الهندسة المعلوماتية — قسم النظم والشبكات الحاسوبية

\*\*العام الدراسي:\*\* 2025 – 2026



\*\*فريق العمل:\*\*

1\. حسين نادر فاتح

2\. جودي حسن عزيز



\*\*المشرف:\*\* د. أحمد صقر أحمد



\*\*إصدار الوثيقة:\*\* 1.0 (مسودة أولى)

\*\*تاريخ الإصدار:\*\* 2026-05-12



\---



\## §1 المقدمة (Introduction)



\### 1.1 الهدف من الوثيقة (Purpose)



تهدف هذه الوثيقة إلى تحديد المتطلبات الوظيفية وغير الوظيفية لمشروع منصة محاكاة شبكات تفاعلية تتكامل مع وظائف SIEM (Security Information and Event Management) و SOC (Security Operations Center). تُعدّ هذه الوثيقة المرجع الأساسي والملزِم لجميع مراحل المشروع اللاحقة، بما فيها التصميم المعماري ونمذجة البيانات وتطوير الواجهة والخلفية والاختبار والقبول النهائي أمام لجنة المناقشة.



تتوجّه هذه الوثيقة إلى: (1) فريق التطوير، (2) المشرف الأكاديمي، (3) لجنة المناقشة، (4) أي مطوّر مستقبلي يرغب في توسيع المنصة.



\### 1.2 نطاق المشروع (Scope)



\*\*اسم المنتج:\*\* \*NetSim-SIEM\* (اسم العمل المؤقت).



\*\*الوصف الموجز:\*\* تطبيق ويب يعمل بالكامل في المتصفح، يسمح للمستخدم ببناء طوبولوجيا شبكة افتراضية بصرياً (drag-and-drop)، وضبط إعدادات الأجهزة (IP, MAC, gateway, routing)، وتشغيل محاكاة لحركة الحزم بين هذه الأجهزة، وتنفيذ سيناريوهات هجوم تعليمية شائعة (ARP Spoofing, DNS Poisoning, SYN Flood, Port Scanning)، ومراقبة الأحداث الناتجة عبر لوحة SOC تجمع الـ logs وتطبّق قواعد ارتباط (correlation rules) لرفع تنبيهات (alerts) مصنّفة حسب الخطورة.



\*\*ما يقدمه المشروع (In Scope):\*\*

\- بناء طوبولوجيا تفاعلية في المتصفح.

\- تكوين كامل لأجهزة الشبكة (Endpoint, Switch, Router, Firewall, Attacker).

\- محاكاة منطقية لبروتوكولات ARP, IPv4, ICMP, TCP handshake, UDP, DNS.

\- أربع سيناريوهات هجوم: ARP Spoofing/MITM, DNS Poisoning, DoS/SYN Flood, Port Scanning.

\- وحدة SIEM كاملة: جمع logs، محرّك قواعد، تنبيهات بأربع درجات خطورة، تصدير CSV/JSON.

\- لوحة SOC حيّة عبر WebSocket.

\- حفظ واسترجاع الطوبولوجيا بصيغة JSON عبر REST APIs.

\- نظامان للمستخدمين: طالب ثانوية مبتدئ (مسار تعليمي مبسّط) ومتدرّب SOC (مسار تحليلي عميق)، بالإضافة إلى دوري المدرّس والمدير.



\*\*ما هو خارج النطاق (Out of Scope):\*\*

\- محاكاة شبكات لاسلكية (Wi-Fi, 802.11).

\- بروتوكولات التوجيه الديناميكي (OSPF, BGP, RIP).

\- IPv6.

\- تطبيق هاتفي محمول (native mobile).

\- واجهة عربية وتدعيم RTL (الواجهة باللغة الإنكليزية فقط).

\- التكامل مع SIEM تجارية خارجية (Splunk, ELK).

\- محاكاة معدّلات أداء شبكي حقيقية (bandwidth, latency بدقّة فيزيائية).



\### 1.3 التعاريف والاختصارات (Definitions \& Acronyms)



| المصطلح | الشرح |

|---|---|

| \*\*SIEM\*\* | Security Information and Event Management — نظام جمع وتحليل أحداث الأمن السيبراني. |

| \*\*SOC\*\* | Security Operations Center — مركز عمليات الأمن، حيث يُتابع المحلّلون الـ alerts. |

| \*\*ARP\*\* | Address Resolution Protocol — بروتوكول ربط عناوين IP بعناوين MAC. |

| \*\*DNS\*\* | Domain Name System — نظام تحويل أسماء النطاقات إلى عناوين IP. |

| \*\*MITM\*\* | Man-In-The-Middle — هجوم يعترض الاتصال بين طرفين. |

| \*\*DoS\*\* | Denial of Service — هجوم تعطيل الخدمة. |

| \*\*SYN Flood\*\* | نوع من DoS يستنزف موارد TCP بطلبات SYN كثيرة. |

| \*\*Port Scan\*\* | استكشاف المنافذ المفتوحة على جهاز هدف. |

| \*\*Topology\*\* | الطوبولوجيا — مخطّط الأجهزة والروابط في الشبكة. |

| \*\*Endpoint\*\* | جهاز نهائي (حاسوب، خادم، هاتف). |

| \*\*Switch\*\* | مفتاح يعمل في الطبقة الثانية L2. |

| \*\*Router\*\* | موجّه يعمل في الطبقة الثالثة L3. |

| \*\*JWT\*\* | JSON Web Token — رمز مصادقة. |

| \*\*CRUD\*\* | Create / Read / Update / Delete — العمليات الأربع الأساسية. |

| \*\*REST\*\* | Representational State Transfer — نمط تصميم APIs. |

| \*\*DSL\*\* | Domain-Specific Language — لغة خاصة بمجال محدّد. |

| \*\*UC\*\* | Use Case — حالة استخدام. |

| \*\*FR\*\* | Functional Requirement — متطلّب وظيفي. |

| \*\*NFR\*\* | Non-Functional Requirement — متطلّب غير وظيفي. |

| \*\*SRS\*\* | Software Requirements Specification. |

| \*\*i18n\*\* | Internationalization. |



\### 1.4 المراجع (References)



\- IEEE Std 830-1998 — Recommended Practice for Software Requirements Specifications.

\- المشروع الأصل \*netsim\* — Erinn Atwater \& Cecylia Bocovich (https://netsim.erinn.io).

\- OWASP Top 10 (2021).

\- NIST SP 800-61 Rev. 2 — Computer Security Incident Handling Guide.

\- RFC 826 (ARP), RFC 1035 (DNS), RFC 793 (TCP).

\- React 18 documentation, Laravel 11 documentation, MongoDB 7 documentation.



\### 1.5 نظرة عامة على الوثيقة (Document Overview)



\- \*\*§2\*\* الوصف العام للنظام، الأدوار، البيئة، ومخطّط حالات الاستخدام.

\- \*\*§3\*\* حالات الاستخدام التفصيلية (28 UC).

\- \*\*§4\*\* المتطلبات الوظيفية (65 FR موزّعة على 9 وحدات).

\- \*\*§5\*\* المتطلبات غير الوظيفية (12 NFR).

\- \*\*§6\*\* مصفوفة التتبّع UC ↔ FR.

\- \*\*§7\*\* معايير القبول النهائي للمشروع.



\---



\## §2 الوصف العام (Overall Description)



\### 2.1 منظور المنتج (Product Perspective)



المشروع امتداد وتوسيع لمنصّة \*netsim\* الحالية (PHP + jQuery + Phaser + MySQL) التي تقدّم 13 سيناريو شبكة جاهز ضمن مجلّدات `levels/01 Basics`, `02 Spoofs`, `03 DoS`, `04 Attacks`. المنصّة الحالية تُتيح للمستخدم \*لعب\* سيناريو معدّ سلفاً فقط، ولا تتيح \*بناء\* طوبولوجيا، ولا تحوي أي وظيفة SIEM/SOC.



يموضع المشروع الجديد نفسه بين أدوات تعليمية ثقيلة (Cisco Packet Tracer, GNS3) — والتي تتطلّب تنصيباً محلياً ومنهجاً مغلقاً — وبين \*netsim\* الأصلي الذي يفتقر للمرونة. يستهدف المشروع \*سدّ الفجوة\* عبر منصّة ويب خفيفة، تفاعلية، تجمع بين بناء الطوبولوجيا الحرّ ومحاكاة الهجمات وتحليل الأحداث في بيئة SOC تعليمية واحدة.



\### 2.2 الوظائف العامة للمنتج (Product Functions)



على المستوى الأعلى، توفّر المنصّة تسع قدرات رئيسية:



1\. إدارة المستخدمين والمصادقة (Authentication \& Authorization).

2\. بناء طوبولوجيا تفاعلية على Canvas.

3\. تكوين أجهزة الشبكة (IP, MAC, routing, DNS).

4\. محرّك محاكاة منطقي للحزم (Simulation Engine).

5\. سيناريوهات هجوم جاهزة وقابلة للتنفيذ.

6\. جمع logs بنيوية من جميع الأجهزة المحاكاة.

7\. محرّك قواعد ارتباط (Correlation Rules Engine).

8\. لوحة SOC حيّة مع تنبيهات وإدارة حوادث.

9\. حفظ/تحميل/تصدير بصيغة JSON عبر REST APIs.



\### 2.3 فئات المستخدمين وخصائصهم (User Classes \& Characteristics)



| الفئة | الخلفية المفترضة | المسار الأساسي |

|---|---|---|

| \*\*Student\*\* (طالب ثانوية مبتدئ) | لا معرفة سابقة بالشبكات، لغة إنكليزية متوسطة، يستخدم متصفّحاً فقط. | يبني شبكات بسيطة، يجرّب هجمات جاهزة، يتعلّم من خلال tutorials. |

| \*\*SOC Trainee\*\* (متدرّب SOC) | إلمام أساسي بـ TCP/IP، يدرس الأمن السيبراني. | يحلّل logs، يكتب correlation rules، يدير alerts. |

| \*\*Instructor\*\* (مدرّس / مشرف) | خبرة تدريسية بالشبكات. | يُنشئ labs، يكلّف الطلّاب، يقيّم النتائج. |

| \*\*Admin\*\* (مدير النظام) | مسؤول تقني. | يدير المستخدمين، يراقب صحّة النظام، يدير قوالب الهجوم المضمّنة. |



\### 2.4 بيئة التشغيل (Operating Environment)



\- \*\*العميل (Client):\*\* متصفّح حديث (Chrome 120+, Firefox 120+, Edge 120+) على أنظمة Windows/Linux/macOS، شاشة ≥1280×720.

\- \*\*الخادم (Server):\*\* Linux (Ubuntu 22.04 LTS), Laravel 11 على PHP 8.3, Node.js 20 لخدمة Vite في التطوير.

\- \*\*قاعدة البيانات:\*\* MongoDB 7.x.

\- \*\*الاتصال الحيّ:\*\* Laravel Reverb (WebSocket).

\- \*\*النشر:\*\* خادم افتراضي واحد (single VM) كافٍ للنطاق المستهدف.



\### 2.5 قيود التصميم والتنفيذ (Design \& Implementation Constraints)



\- المنصّة كلّها داخل المتصفّح — \*\*لا تنصيب محلّي\*\* لدى المستخدم النهائي.

\- الواجهة الأمامية: React 18 + TypeScript + Vite + Tailwind CSS.

\- الواجهة الخلفية: Laravel 11 + Sanctum/JWT.

\- قاعدة البيانات: MongoDB (تخزين الطوبولوجيا والأحداث والقواعد بصيغة وثائق).

\- صيغة تخزين الطوبولوجيا: JSON متوافق مع — وموسّع لـ — صيغة `levels/\*.json` الموجودة في المشروع الأصل.

\- لغة الواجهة: English فقط (مع جاهزية بنية i18n لتوسّع لاحق).

\- لا اعتماد على خدمات خارجية مدفوعة.



\### 2.6 الفرضيات والاعتماديات (Assumptions \& Dependencies)



\- المستخدم يمتلك اتصالاً بالإنترنت أثناء العمل.

\- المتصفح يدعم WebSocket و Canvas/SVG وES2020.

\- يُتاح للفريق خادم تجريبي واحد للنشر التجريبي قبل المناقشة.

\- تبقى صيغة JSON للطوبولوجيا متوافقة \*تنازلياً\* مع ملفات `levels/\*.json` في `netsim` الأصلي قدر الإمكان.



\### 2.7 مخطّط حالات الاستخدام (Use Case Diagram)



​```mermaid

%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%

flowchart LR

&#x20;   classDef actor fill:#fff,stroke:#000,stroke-width:2px;

&#x20;   classDef uc fill:#e8f4fd,stroke:#0366d6;



&#x20;   S((Student)):::actor

&#x20;   T((SOC Trainee)):::actor

&#x20;   I((Instructor)):::actor

&#x20;   A((Admin)):::actor



&#x20;   subgraph SYS\[NetSim-SIEM Platform]

&#x20;     direction TB

&#x20;     U01\[UC-01 Register]:::uc

&#x20;     U02\[UC-02 Login]:::uc

&#x20;     U06\[UC-06 Create Topology]:::uc

&#x20;     U07\[UC-07 Add Device]:::uc

&#x20;     U08\[UC-08 Configure Device]:::uc

&#x20;     U09\[UC-09 Link Devices]:::uc

&#x20;     U11\[UC-11 Save Topology]:::uc

&#x20;     U12\[UC-12 Run Simulation]:::uc

&#x20;     U13\[UC-13 Open SOC Dashboard]:::uc

&#x20;     U14\[UC-14 View Live Logs]:::uc

&#x20;     U16\[UC-16 View Alerts]:::uc

&#x20;     U17\[UC-17 Drill into Alert]:::uc

&#x20;     U19\[UC-19 Export Logs]:::uc

&#x20;     U20\[UC-20 Define Custom Rule]:::uc

&#x20;     U21\[UC-21 Create Lab]:::uc

&#x20;     U22\[UC-22 Assign Lab]:::uc

&#x20;     U24\[UC-24 Grade Submission]:::uc

&#x20;     U26\[UC-26 Manage Users]:::uc

&#x20;     U28\[UC-28 Manage Built-in Scenarios]:::uc

&#x20;   end



&#x20;   S --> U01 \& U02 \& U06 \& U07 \& U08 \& U09 \& U11 \& U12

&#x20;   T --> U02 \& U12 \& U13 \& U14 \& U16 \& U17 \& U19 \& U20

&#x20;   I --> U02 \& U21 \& U22 \& U24

&#x20;   A --> U02 \& U26 \& U28

​```



> ملاحظة: لتجنّب اكتظاظ المخطّط لم تُرسَم جميع 28 حالة استخدام؛ بقية الحالات (UC-03 Logout, UC-04 Reset Password, UC-05 List Topologies, UC-10 Delete Element, UC-15 Filter Logs, UC-18 Acknowledge Alert, UC-23 View Submissions, UC-25 Class Progress, UC-27 System Health) موصوفة بالكامل في §3.



\---



\## §3 حالات الاستخدام (Use Cases)



تستخدم القالب التالي لكل حالة استخدام:



> \*\*المعرّف / الاسم\*\* — \*\*الفاعل\*\* — \*\*الشروط القَبْلية\*\* — \*\*التدفّق الرئيسي\*\* — \*\*التدفّقات البديلة\*\* — \*\*الشروط البَعْدية\*\*.



\### 3.1 حالات استخدام الطالب (Student)



\*\*UC-01 — Register\*\*

\- \*الفاعل:\* زائر غير مسجَّل.

\- \*قَبْلية:\* لا حساب سابق.

\- \*تدفّق رئيسي:\* (1) فتح صفحة التسجيل (2) إدخال email + password + role=Student (3) إرسال (4) تأكيد البريد.

\- \*بديل:\* email موجود مسبقاً → رسالة خطأ.

\- \*بَعْدية:\* حساب جديد مفعّل.



\*\*UC-02 — Login\*\*

\- \*الفاعل:\* مستخدم مسجَّل.

\- \*قَبْلية:\* حساب مفعّل.

\- \*رئيسي:\* إدخال email + password → استقبال JWT → توجيه إلى dashboard المناسب للدور.

\- \*بديل:\* بيانات خاطئة → رسالة خطأ بعد 3 محاولات → قفل مؤقّت 5 دقائق.

\- \*بَعْدية:\* جلسة نشطة.



\*\*UC-03 — Logout\*\* — إنهاء الجلسة وإبطال الـ JWT.



\*\*UC-04 — Reset Password\*\* — طلب رابط إعادة تعيين عبر البريد، صلاحية الرابط 30 دقيقة.



\*\*UC-05 — List My Topologies\*\* — عرض الطوبولوجيات المحفوظة للمستخدم مع تاريخ آخر تعديل.



\*\*UC-06 — Create New Topology\*\*

\- \*الفاعل:\* Student.

\- \*قَبْلية:\* مسجَّل دخوله.

\- \*رئيسي:\* (1) النقر على \*New\* (2) إدخال اسم (3) فتح Canvas فارغ.

\- \*بَعْدية:\* طوبولوجيا جديدة في الذاكرة (غير محفوظة بعد).



\*\*UC-07 — Add Device to Canvas\*\*

\- \*رئيسي:\* سحب أيقونة من palette إلى الـ canvas في إحداثيات (x,y).

\- \*بديل:\* إفلات خارج منطقة الـ canvas → إلغاء.

\- \*بَعْدية:\* جهاز جديد بمعرّف فريد، إعدادات افتراضية (IP/MAC مولّدة).



\*\*UC-08 — Configure Device\*\*

\- \*رئيسي:\* (1) النقر المزدوج على جهاز (2) فتح panel جانبي (3) تعديل hostname / IP / mask / MAC / gateway / DNS / routing table (إن كان Router) (4) حفظ.

\- \*بديل:\* IP مكرّر في نفس الـ subnet → تحذير.

\- \*بَعْدية:\* الجهاز محدّث.



\*\*UC-09 — Link Two Devices\*\*

\- \*رئيسي:\* (1) النقر على منفذ في جهاز A (2) السحب إلى منفذ في جهاز B (3) إنشاء link.

\- \*بديل:\* المنفذ محجوز → رفض. نفس الجهاز (loopback) → رفض.

\- \*بَعْدية:\* link جديد بحالة \*up\*.



\*\*UC-10 — Delete Element\*\* — حذف جهاز أو رابط مع تأكيد. حذف الجهاز يحذف كل الـ links المرتبطة.



\*\*UC-11 — Save Topology\*\* — حفظ الطوبولوجيا كـ JSON في MongoDB عبر POST/PUT `/api/topologies`.



\*\*UC-12 — Run Simulation\*\*

\- \*رئيسي:\* (1) النقر على \*Play\* (2) المحرّك يولّد ARP/DHCP/DNS تلقائياً (3) عرض الحزم متحرّكة (4) النقر على حزمة يفتح Packet Inspector.

\- \*بديل:\* Pause / Step / Reset / Speed.

\- \*بَعْدية:\* سجلات الأحداث في DB.



\### 3.2 حالات استخدام متدرّب SOC (SOC Trainee)



\*\*UC-13 — Open SOC Dashboard\*\* — الانتقال إلى صفحة /soc تعرض لوحات Alerts و Live Logs و Stats.



\*\*UC-14 — View Live Log Feed\*\* — تدفّق logs مباشر عبر WebSocket مع أحدث 200 سطر.



\*\*UC-15 — Filter Logs\*\* — فلترة حسب: device, severity (Critical/High/Medium/Low/Info), event type, time range.



\*\*UC-16 — View Alerts\*\* — قائمة alerts مصنّفة، فرز حسب الخطورة والوقت.



\*\*UC-17 — Drill into Alert\*\*

\- \*رئيسي:\* (1) النقر على alert (2) عرض: القاعدة التي أطلقت التنبيه، الأحداث المرتبطة (evidence logs)، الجهاز المتأثّر، الخطّ الزمني للحادث.

\- \*بَعْدية:\* المتدرّب يفهم سبب التنبيه.



\*\*UC-18 — Acknowledge / Resolve Alert\*\* — تغيير حالة alert إلى \*acknowledged\* أو \*resolved\* مع ملاحظة نصّية.



\*\*UC-19 — Export Logs\*\* — تصدير CSV أو JSON للنطاق الزمني المحدّد.



\*\*UC-20 — Define Custom Correlation Rule\*\* — كتابة قاعدة في DSL/JSON بسيط: شرط + نافذة زمنية + عدّاد + خطورة + رسالة، ثم تفعيلها.



\### 3.3 حالات استخدام المدرّس (Instructor)



\*\*UC-21 — Create Lab\*\* — إنشاء lab يتضمّن: طوبولوجيا قالب + هدف تعليمي + معايير نجاح + قواعد SIEM مرتبطة.



\*\*UC-22 — Assign Lab to Student/Class\*\* — اختيار طلّاب أو صف واسناد lab مع تاريخ تسليم.



\*\*UC-23 — View Student Submissions\*\* — قائمة بالطلّاب وحالة كلّ تسليم.



\*\*UC-24 — Grade Submission\*\* — عرض الطوبولوجيا المسلّمة، تشغيل المحاكاة، إدخال درجة + تعليق.



\*\*UC-25 — View Class Progress Dashboard\*\* — متوسّط الدرجات، نسبة الإنجاز، أكثر الـ alerts شيوعاً.



\### 3.4 حالات استخدام المدير (Admin)



\*\*UC-26 — Manage Users\*\* — قائمة المستخدمين، إنشاء/تعطيل/ترقية الدور.



\*\*UC-27 — View System Health\*\* — حالة الخدمات (Laravel, MongoDB, WebSocket), استهلاك المعالج/الذاكرة, عدد الجلسات الحالية.



\*\*UC-28 — Manage Built-in Attack Scenarios\*\* — تفعيل/تعطيل سيناريوهات الهجوم المضمّنة، تعديل بارامتراتها الافتراضية.



\---



\## §4 المتطلبات الوظيفية (Functional Requirements)



تُرقَّم المتطلبات وفق `FR-xxx`. كل متطلّب يتضمّن وسم `(traces: UC-xx)` لإثبات تتبّعه إلى حالة استخدام واحدة على الأقل.



\### 4.1 المصادقة وإدارة المستخدمين (Auth \& User Management)



\- \*\*FR-001\*\* يجب أن يسمح النظام للزائر بإنشاء حساب باستخدام email + password + role. \*(traces: UC-01)\*

\- \*\*FR-002\*\* يجب أن يتحقّق النظام من صحّة صيغة الـ email عبر RFC 5322. \*(traces: UC-01)\*

\- \*\*FR-003\*\* يجب أن يفرض النظام أن تكون كلمة السر ≥8 محارف وتتضمّن حرفاً كبيراً، صغيراً، رقماً ورمزاً. \*(traces: UC-01)\*

\- \*\*FR-004\*\* يجب أن يصدر النظام JWT صالحاً ≤24 ساعة عند تسجيل دخول ناجح. \*(traces: UC-02)\*

\- \*\*FR-005\*\* يجب أن يُبطل النظام الـ JWT عند logout (server-side blacklist). \*(traces: UC-03)\*

\- \*\*FR-006\*\* يجب أن يرسل النظام رابط إعادة تعيين كلمة سرّ عبر البريد، صالح ≤30 دقيقة. \*(traces: UC-04)\*

\- \*\*FR-007\*\* يجب أن يفرض النظام صلاحيات وفق الدور (Student / SOC-Trainee / Instructor / Admin). \*(traces: UC-26)\*

\- \*\*FR-008\*\* يجب أن يستطيع Admin تعطيل أي حساب. \*(traces: UC-26)\*

\- \*\*FR-009\*\* يجب أن يستطيع Admin ترقية دور مستخدم (Student ↔ SOC-Trainee ↔ Instructor). \*(traces: UC-26)\*



\### 4.2 باني الطوبولوجيا (Topology Builder)



\- \*\*FR-010\*\* يجب أن تعرض الواجهة palette يحوي الأجهزة: PC, Server, Switch, Router, Firewall, Attacker. \*(traces: UC-07)\*

\- \*\*FR-011\*\* يجب أن يدعم النظام سحب وإفلات (drag-and-drop) جهاز من palette إلى الـ canvas. \*(traces: UC-07)\*

\- \*\*FR-012\*\* يجب أن يسمح النظام بإعادة تموضع أي جهاز على الـ canvas. \*(traces: UC-07)\*

\- \*\*FR-013\*\* يجب أن يحذف النظام كلّ الـ links المرتبطة عند حذف جهاز. \*(traces: UC-10)\*

\- \*\*FR-014\*\* يجب أن يتيح النظام إنشاء link بسحب من منفذ إلى منفذ. \*(traces: UC-09)\*

\- \*\*FR-015\*\* يجب أن يرفض النظام link إذا كان أحد المنفذين مستخدماً مسبقاً. \*(traces: UC-09)\*

\- \*\*FR-016\*\* يجب أن يعرض النظام حالة الـ link بصرياً (up / down / congested). \*(traces: UC-12)\*

\- \*\*FR-017\*\* يجب أن يدعم النظام zoom و pan على الـ canvas. \*(traces: UC-07)\*



\### 4.3 تكوين الأجهزة (Device Configuration)



\- \*\*FR-018\*\* يجب أن يسمح النظام بتعديل hostname لكل جهاز. \*(traces: UC-08)\*

\- \*\*FR-019\*\* يجب أن يتحقّق النظام من صيغة IPv4 + subnet mask (CIDR /0..32). \*(traces: UC-08)\*

\- \*\*FR-020\*\* يجب أن يولّد النظام MAC تلقائياً ويسمح بتعديله يدوياً (صيغة AA:BB:CC:DD:EE:FF). \*(traces: UC-08)\*

\- \*\*FR-021\*\* يجب أن يسمح النظام بتحديد default gateway. \*(traces: UC-08)\*

\- \*\*FR-022\*\* يجب أن يسمح النظام بتحديد عنوان DNS server. \*(traces: UC-08)\*

\- \*\*FR-023\*\* يجب أن يسمح النظام بتعريف routing table يدوي على أجهزة Router. \*(traces: UC-08)\*

\- \*\*FR-024\*\* يجب أن يدعم النظام خيار DHCP أو IP ثابت لكل endpoint. \*(traces: UC-08)\*



\### 4.4 محرّك المحاكاة (Simulation Engine)



\- \*\*FR-025\*\* يجب أن يوفّر النظام أزرار Play / Pause / Step / Reset. \*(traces: UC-12)\*

\- \*\*FR-026\*\* يجب أن يدعم النظام سرعات محاكاة من 0.25× حتى 10×. \*(traces: UC-12)\*

\- \*\*FR-027\*\* يجب أن يحاكي النظام ARP request/reply وفق RFC 826. \*(traces: UC-12)\*

\- \*\*FR-028\*\* يجب أن يحاكي النظام MAC learning في الـ Switch (L2 forwarding table). \*(traces: UC-12)\*

\- \*\*FR-029\*\* يجب أن يحاكي النظام static routing في الـ Router (L3 lookup). \*(traces: UC-12)\*

\- \*\*FR-030\*\* يجب أن يحاكي النظام DNS lookup عبر عقدة DNS resolver. \*(traces: UC-12)\*

\- \*\*FR-031\*\* يجب أن يوفّر النظام Packet Inspector يعرض حقول Ethernet/IP/TCP/UDP/payload لأي حزمة محدّدة. \*(traces: UC-12)\*



\### 4.5 سيناريوهات الهجوم (Attack Scenarios)



\- \*\*FR-032\*\* يجب أن يدعم النظام هجوم ARP Spoofing من عقدة Attacker. \*(traces: UC-12)\*

\- \*\*FR-033\*\* يجب أن يُظهر النظام إعادة توجيه حركة الضحية عبر الـ Attacker بشكل بصري (MITM). \*(traces: UC-12)\*

\- \*\*FR-034\*\* يجب أن يدعم النظام هجوم DNS Poisoning عبر forged DNS reply. \*(traces: UC-12)\*

\- \*\*FR-035\*\* يجب أن يدعم النظام هجوم SYN Flood من Attacker إلى Server. \*(traces: UC-12)\*

\- \*\*FR-036\*\* يجب أن يدعم النظام هجوم Port Scan تسلسلي على هدف. \*(traces: UC-12)\*

\- \*\*FR-037\*\* يجب أن يوفّر النظام lab template جاهز لكلّ هجوم من الأربعة. \*(traces: UC-21)\*

\- \*\*FR-038\*\* يجب أن يطلق النظام الهجوم عند النقر على Attacker واختيار سيناريو. \*(traces: UC-12)\*

\- \*\*FR-039\*\* يجب أن يسمح النظام بضبط بارامترات الهجوم (rate, target, port range, payload). \*(traces: UC-12)\*



\### 4.6 جمع السجلات (SIEM Log Collection)



\- \*\*FR-040\*\* يجب أن يبعث كل جهاز محاكى log structured عند كل حدث (login, packet rx/tx, ARP change, DNS resolve, port open). \*(traces: UC-14)\*

\- \*\*FR-041\*\* يجب أن يلتزم كل log بالمخطّط: `{ts, src\_device, src\_ip, src\_mac, type, severity, payload}`. \*(traces: UC-14)\*

\- \*\*FR-042\*\* يجب أن يخزّن النظام جميع الـ logs في MongoDB. \*(traces: UC-14)\*

\- \*\*FR-043\*\* يجب أن يبث النظام الـ logs عبر WebSocket إلى لوحة SOC في الزمن الحقيقي. \*(traces: UC-14)\*

\- \*\*FR-044\*\* يجب أن يدعم النظام فلترة الـ logs حسب الجهاز/الخطورة/النوع/النطاق الزمني. \*(traces: UC-15)\*



\### 4.7 محرّك قواعد الارتباط (Correlation Rules Engine)



\- \*\*FR-045\*\* يجب أن يوفّر النظام قاعدة مبنيّة سلفاً تكشف ARP Spoofing (أكثر من N ARP-replies لنفس IP من MACs مختلفة خلال نافذة T). \*(traces: UC-16)\*

\- \*\*FR-046\*\* يجب أن يوفّر النظام قاعدة مبنيّة سلفاً تكشف DNS Poisoning (DNS reply من مصدر غير المخوّل). \*(traces: UC-16)\*

\- \*\*FR-047\*\* يجب أن يوفّر النظام قاعدة مبنيّة سلفاً تكشف SYN Flood (أكثر من X SYN/sec من نفس المصدر). \*(traces: UC-16)\*

\- \*\*FR-048\*\* يجب أن يوفّر النظام قاعدة مبنيّة سلفاً تكشف Port Scan (محاولة اتصال على >Y منافذ من نفس المصدر خلال T). \*(traces: UC-16)\*

\- \*\*FR-049\*\* يجب أن يتيح النظام للمتدرّب تعريف قواعد مخصّصة بصيغة JSON DSL بسيطة (condition / window / count / severity / message). \*(traces: UC-20)\*



\### 4.8 لوحة SOC والتنبيهات (SOC Dashboard \& Alerts)



\- \*\*FR-050\*\* يجب أن يصنّف النظام التنبيهات إلى أربع درجات: Critical / High / Medium / Low. \*(traces: UC-16)\*

\- \*\*FR-051\*\* يجب أن يعرض النظام تنبيهات حيّة في feed على لوحة SOC. \*(traces: UC-16)\*

\- \*\*FR-052\*\* يجب أن تعرض صفحة تفاصيل التنبيه: القاعدة المُفعّلة، الأحداث الدالّة (evidence)، الجهاز/الأجهزة المتأثّرة. \*(traces: UC-17)\*

\- \*\*FR-053\*\* يجب أن يسمح النظام للمتدرّب بتغيير حالة التنبيه إلى \*acknowledged\*. \*(traces: UC-18)\*

\- \*\*FR-054\*\* يجب أن يسمح النظام بحلّ التنبيه (\*resolved\*) مع ملاحظة نصّية. \*(traces: UC-18)\*

\- \*\*FR-055\*\* يجب أن يوفّر النظام عرض timeline لكلّ حادث. \*(traces: UC-17)\*

\- \*\*FR-056\*\* يجب أن يصدّر النظام الـ logs بصيغة CSV. \*(traces: UC-19)\*

\- \*\*FR-057\*\* يجب أن يصدّر النظام الـ logs بصيغة JSON. \*(traces: UC-19)\*



\### 4.9 الحفظ والـ APIs (Persistence \& APIs)



\- \*\*FR-058\*\* يجب أن يحفظ النظام الطوبولوجيا في MongoDB بصيغة JSON. \*(traces: UC-11)\*

\- \*\*FR-059\*\* يجب أن يدعم النظام تحميل طوبولوجيا حسب المعرّف. \*(traces: UC-05)\*

\- \*\*FR-060\*\* يجب أن تكون صيغة JSON للطوبولوجيا توسيعاً لصيغة `levels/\*.json` في netsim الأصلي (devices / links / timeline / triggers) — حقول إضافية: device.config (ip, mac, gw, dns, routes), security (siem rules). \*(traces: UC-11)\*

\- \*\*FR-061\*\* يجب أن يوفّر النظام REST endpoints CRUD على `/api/topologies`: `POST`, `GET`, `GET/{id}`, `PUT/{id}`, `DELETE/{id}`. \*(traces: UC-05, UC-11)\*

\- \*\*FR-062\*\* يجب أن يوفّر النظام `POST /api/topologies/{id}/run` لبدء جلسة محاكاة جديدة. \*(traces: UC-12)\*

\- \*\*FR-063\*\* يجب أن يستطيع Instructor إنشاء lab template عبر `POST /api/labs`. \*(traces: UC-21)\*

\- \*\*FR-064\*\* يجب أن يستطيع Instructor إسناد lab إلى مستخدم/صف عبر `POST /api/labs/{id}/assign`. \*(traces: UC-22)\*

\- \*\*FR-065\*\* يجب أن يعرض النظام للمدرّس قائمة التسليمات مع درجاتها. \*(traces: UC-23, UC-24)\*



\---



\## §5 المتطلبات غير الوظيفية (Non-Functional Requirements)



كلّ NFR قابل للقياس — لا توجد عبارات إنشائية من قبيل "النظام يجب أن يكون سريعاً".



\- \*\*NFR-001 (Performance):\*\* يجب أن يحاكي النظام طوبولوجيا تحوي ≥50 عقدة و ≥80 link بمعدّل عرض ≥30 fps على متصفّح Chrome على جهاز بمواصفات 8 GB RAM / Intel i5 (الجيل 8 أو أحدث).

\- \*\*NFR-002 (Scalability):\*\* يجب أن يدعم النظام ≥100 مستخدم متزامن على خادم VM واحد (4 vCPU / 8 GB RAM) دون تجاوز زمن استجابة API ≤500 ms للنسبة المئوية 95.

\- \*\*NFR-003 (Security — Password Hashing):\*\* كلمات السر تُخزَّن بـ bcrypt بكلفة ≥12.

\- \*\*NFR-004 (Security — Session):\*\* صلاحية JWT ≤24 ساعة، refresh token ≤7 أيام.

\- \*\*NFR-005 (Security — Input Validation):\*\* يجب أن يُحصَّن كلّ endpoint من النظام ضدّ OWASP Top-10 (2021)، بما فيها XSS, CSRF, SQL/NoSQL Injection, Mass Assignment. التحقّق من المدخلات server-side إلزامي.

\- \*\*NFR-006 (Usability):\*\* يجب أن يستطيع طالب ثانوية مبتدئ يستخدم المنصّة لأوّل مرّة إكمال السلسلة (UC-06 → UC-07 → UC-08 → UC-09 → UC-11) خلال أقلّ من 10 دقائق دون مساعدة، استناداً إلى اختبارات قابلية استخدام على ≥5 مستخدمين.

\- \*\*NFR-007 (Reliability — Determinism):\*\* بفرض الطوبولوجيا نفسها وبذرة عشوائية (seed) نفسها، يجب أن ينتج محرّك المحاكاة نفس تسلسل الأحداث في كلّ تشغيل.

\- \*\*NFR-008 (Portability):\*\* يعمل النظام على آخر إصدارَين من Chrome, Firefox, Edge، وعلى أنظمة Windows 10/11, Ubuntu 22.04, macOS 13+.

\- \*\*NFR-009 (Maintainability):\*\* الشيفرة تجتاز PSR-12 على PHP و ESLint (recommended) + Prettier على TypeScript دون أخطاء، وتغطية اختبار الوحدات ≥60%.

\- \*\*NFR-010 (Localizability):\*\* كلّ النصوص في الواجهة محصورة في حزمة i18n واحدة، حتّى لو شُحنت اللغة الإنكليزية فقط، بحيث تكون إضافة لغات لاحقة لا تتطلّب تعديل أي كومبوننت.

\- \*\*NFR-011 (Auditability / Logging):\*\* يحفظ الخادم سجلّ كل طلب API (method, path, user, status, latency) مع دوران (log rotation) أسبوعي.

\- \*\*NFR-012 (Browser Compatibility):\*\* الحدّ الأدنى لدقّة الشاشة 1280×720 — لا يلزم تجاوب موبايل في هذا الإصدار.



\---



\## §6 مصفوفة التتبّع (Traceability Matrix)



> كلّ سطر يعرض UC ↔ FR(s) المرتبطة. لا يوجد UC يتيم ولا FR يتيم.



| UC | الاسم | FRs المرتبطة |

|---|---|---|

| UC-01 | Register | FR-001, FR-002, FR-003 |

| UC-02 | Login | FR-004 |

| UC-03 | Logout | FR-005 |

| UC-04 | Reset Password | FR-006 |

| UC-05 | List Topologies | FR-059, FR-061 |

| UC-06 | Create Topology | FR-058 |

| UC-07 | Add Device | FR-010, FR-011, FR-012, FR-017 |

| UC-08 | Configure Device | FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-024 |

| UC-09 | Link Devices | FR-014, FR-015 |

| UC-10 | Delete Element | FR-013 |

| UC-11 | Save Topology | FR-058, FR-060, FR-061 |

| UC-12 | Run Simulation | FR-016, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032, FR-033, FR-034, FR-035, FR-036, FR-038, FR-039, FR-062 |

| UC-13 | Open SOC Dashboard | FR-043, FR-051 |

| UC-14 | View Live Logs | FR-040, FR-041, FR-042, FR-043 |

| UC-15 | Filter Logs | FR-044 |

| UC-16 | View Alerts | FR-045, FR-046, FR-047, FR-048, FR-050, FR-051 |

| UC-17 | Drill into Alert | FR-052, FR-055 |

| UC-18 | Acknowledge/Resolve Alert | FR-053, FR-054 |

| UC-19 | Export Logs | FR-056, FR-057 |

| UC-20 | Custom Rule | FR-049 |

| UC-21 | Create Lab | FR-037, FR-063 |

| UC-22 | Assign Lab | FR-064 |

| UC-23 | View Submissions | FR-065 |

| UC-24 | Grade Submission | FR-065 |

| UC-25 | Class Progress | FR-065 |

| UC-26 | Manage Users | FR-007, FR-008, FR-009 |

| UC-27 | System Health | \*(يغطّيه NFR-011 + Admin UI، لا FR منفصل)\* |

| UC-28 | Manage Built-in Scenarios | FR-037 |



\*\*التحقّق من السلامة:\*\*

\- جميع 28 UC مرتبطة بـ FR ≥1 (UC-27 مرتبط بـ NFR — مقبول).

\- جميع 65 FR مرتبط بـ UC ≥1 (تحقّق يدوي مطلوب قبل تجميد الوثيقة).



\---



\## §7 معايير القبول (Acceptance Criteria)



يُعتبر المشروع \*جاهزاً للمناقشة\* عند تحقّق \*\*جميع\*\* المعايير التالية، التي ستُستخدم كقائمة فحص ذاتي ولجنة المناقشة:



\*\*AC-1 (Topology Builder)\*\* يمكن لطالب ثانوية، بدون تدريب مسبق، أن يبني شبكة من 4 أجهزة (PC + Switch + Router + Server)، ويضبط IPs، ويُجري ping ناجحاً بين عقدتَين، خلال ≤10 دقائق.



\*\*AC-2 (Save/Load)\*\* الطوبولوجيا تُحفَظ في MongoDB، وتُحمَّل لاحقاً مع كلّ الإعدادات سليمة. الـ JSON الناتج صالح للتحميل في netsim الأصلي للحقول المشتركة (تطابق صيغة `levels/\*.json`).



\*\*AC-3 (ARP Spoofing Scenario)\*\* ينفّذ Attacker هجوم ARP Spoofing، تتلوّث جداول ARP في الضحية، ويُعاد توجيه الحركة عبر Attacker بصرياً، وترتفع alert من نوع \*ARP-Spoof-Suspected\* في لوحة SOC خلال ≤5 ثوان.



\*\*AC-4 (DNS Poisoning Scenario)\*\* ينفّذ Attacker DNS Poisoning، يحلّ الضحيّة `bank.com` إلى IP المهاجم، وترتفع alert \*DNS-Poisoning-Suspected\*.



\*\*AC-5 (DoS Scenario)\*\* ينفّذ Attacker SYN Flood، وترتفع alert \*SYN-Flood-Suspected\* بدرجة Critical.



\*\*AC-6 (Port Scan Scenario)\*\* ينفّذ Attacker مسحاً تسلسلياً، وترتفع alert \*Port-Scan-Suspected\*.



\*\*AC-7 (SIEM Live Feed)\*\* لوحة SOC تعرض ≥50 log/ثانية بدون lag محسوس عبر WebSocket.



\*\*AC-8 (Custom Rule)\*\* متدرّب SOC يكتب قاعدة JSON بسيطة (مثال: `>10 ICMP echo من نفس المصدر خلال 5s → High`)، ويراها تُطلق alert عند تنفيذ السيناريو.



\*\*AC-9 (Export)\*\* تصدير logs آخر 10 دقائق بصيغة CSV و JSON ينتج ملفّات صحيحة قابلة للفتح في Excel و jq على التوالي.



\*\*AC-10 (Performance)\*\* على طوبولوجيا 50 عقدة، يحافظ المتصفّح على ≥30 fps لـ 5 دقائق محاكاة متواصلة (NFR-001).



\*\*AC-11 (Security)\*\* اختبار اختراق أساسي (يدوي + OWASP ZAP) لا يكتشف ثغرات Critical/High في XSS, CSRF, NoSQL Injection, IDOR.



\*\*AC-12 (Documentation)\*\* الوثائق التالية مكتملة:

\- هذه الـ SRS.

\- وثيقة Architecture \& ERD (Step 2).

\- OpenAPI spec للـ APIs (Step 3).

\- User Manual (PDF) + Installation Guide.

\- المذكّرة النهائية للمناقشة.



\*\*AC-13 (Code Quality)\*\* ESLint + PSR-12 + Vitest + PHPUnit تمرّ كلّها في CI. تغطية اختبار الوحدات ≥60% للوحدات الحرجة (محرّك المحاكاة، محرّك القواعد).



\---



> \*هذه مسودة أولى موقّعة من فريق المشروع، تنتظر مراجعة المشرف الأكاديمي قبل التجميد الرسمي. أيّ تعديل لاحق يتطلّب إصداراً جديداً مرقّماً مع سجلّ تغيير (changelog).\*

