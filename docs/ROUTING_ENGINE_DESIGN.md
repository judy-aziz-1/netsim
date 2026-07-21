# تصميم محرك التوجيه متعدد القفزات — Multi-Hop Routing Engine Design
## وثيقة تصميم معماري فقط — لا كود تنفيذي (Design-only, no implementation)

**الحالة:** مسودة للمراجعة والموافقة قبل أي تنفيذ.
**يعتمد على:** [docs/DEVICE_TAXONOMY.md](DEVICE_TAXONOMY.md)، [docs/CONNECTION_TAXONOMY.md](CONNECTION_TAXONOMY.md) (النمط الأسلوبي وعقود engine/)، [docs/SRS.md](SRS.md) (FR-019, FR-023, FR-029, FR-033، §1.2 خارج النطاق).

---

## §0 الوضع الحالي في الكود (Current State — grounded in actual files)

فحصت مسار الحزمة بالكامل من نقطة الإطلاق حتى الرسم:

| الملف | الدور الحالي |
|---|---|
| [frontend/src/engine/packetMovement.js](../frontend/src/engine/packetMovement.js) | **اكتشاف محوري:** بنية الحزمة هي `{ id, sourceNodeId, targetNodeId, path, currentSegmentIndex, progress }` — و`path` **مصفوفة من N عقد أصلًا، وليست عقدتين ثابتتين**. `advancePacket` يمشي عبر المقاطع (`segmentCount = path.length - 1`، حلقة `while (progress >= 1 && currentSegmentIndex < segmentCount)`)؛ `getPacketPosition` يستوفي (interpolate) موضع كل مقطع على حدة؛ `isPacketArrived` يتحقق `currentSegmentIndex >= path.length - 1`. **طبقة الحركة متعددة القفزات جاهزة بالكامل بالفعل** — واختبارات [packetMovement.test.js](../frontend/src/engine/packetMovement.test.js) تؤكد ذلك صراحة ("moves to the next segment when progress overflows"، "clamps at the final segment when path is fully traversed"). |
| [frontend/src/store/topologyStore.js#L181-L207](../frontend/src/store/topologyStore.js#L181-L207) | `sendPacket(sourceDeviceId, targetDeviceId)` هو **نقطة القيد الوحيدة**: (1) يتحقق `hasDirectLink` — يرفض الإرسال إن لم يوجد رابط مباشر (السطر 199-202)؛ (2) يبني `createPacket(source, target, [sourceDeviceId, targetDeviceId])` — مسار من عقدتين فقط، مكتوب يدويًا (السطر 204). لا استدعاء لأي منطق pathfinding. **إزالة هذا القيد وبناء مسار أطول هو جوهر الميزة، ولا يتطلب أي تعديل على packetMovement.js إطلاقًا.** |
| [frontend/src/engine/deviceCapabilities.js#L15-L17](../frontend/src/engine/deviceCapabilities.js) | `canForward(deviceType)` موجودة ومختبرة — تُعيد `true` لـ `router`/`switch` فقط. هذه هي الدالة التي تحدد أي جهاز يصلح كعقدة **وسيطة** في المسار. جاهزة للاستهلاك بلا تعديل. |
| [frontend/src/engine/arpSpoofing.js#L1-L28](../frontend/src/engine/arpSpoofing.js) | `buildArpTable(devices, links)` يبني جدول كل جهاز من **جيرانه المباشرين عبر links فقط** (`table[neighbor.ip] = neighbor.mac`). هذا سلوك **صحيح وواقعي**: ARP بروتوكول L2 يحلّ عناوين MAC للأجهزة على نفس نطاق البث المباشر فقط، لا للوجهات البعيدة. **لا يعتمد على مفهوم "مسار" إطلاقًا.** |
| [frontend/src/engine/dnsPoisoning.js#L1-L11](../frontend/src/engine/dnsPoisoning.js) | `buildDnsTable(devices)` يبني خريطة اسم→IP لكل جهاز، **لا يعتمد على links أو الطوبولوجيا إطلاقًا**. |
| [frontend/src/components/Packet.jsx](../frontend/src/components/Packet.jsx) | يحرّك الحزمة عبر `advancePacket` بسرعة `PACKET_SPEED * getSpeedMultiplier(link.type)`. **ملاحظة تقاطع مهمة:** يبحث حاليًا عن **رابط واحد** يطابق `sourceNodeId`/`targetNodeId` لتحديد السرعة — هذا الافتراض (رابط واحد للحزمة كلها) يكسر مع المسار متعدد القفزات (كل مقطع قد يكون على رابط بنوع مختلف). موثَّق كنقطة تعديل مطلوبة في الخطة (§6 الخطوة 2). |

### الخلاصة المعمارية الأهم

الميزة **ليست** "بناء محرك حركة جديد" — محرك الحركة موجود ومتعدد القفزات أصلًا. الميزة هي **بناء طبقة حساب المسار (path computation)** التي تُغذّي `path` بمصفوفة أطول من عقدتين، ثم إزالة قيد الرابط المباشر في `sendPacket`. هذا يقلّص المخاطرة بشكل كبير مقارنة بما يبدو من التكليف.

---

## §1 فحص SRS — المطلوب فعليًا مقابل الاختياري

| البند | النص | التصنيف |
|---|---|---|
| **FR-029** | *"يحاكي النظام static routing في الـ Router (L3 lookup)"* | **ملزم** — توجيه ثابت بفحص L3 |
| **FR-023** | *"يسمح النظام بتعريف routing table يدوي على أجهزة Router"* | **ملزم** — جدول توجيه يدوي |
| **FR-019** | *"يتحقق النظام من صيغة IPv4 + subnet mask (CIDR /0..32)"* | **ملزم** — قناع شبكة، ضروري لتعدد الشبكات الفرعية |
| **FR-033** | *"إعادة توجيه حركة الضحية عبر الـ Attacker بصريًا (MITM)"* | **ملزم** — لكنه أعمق تقاطع مع ARP (§4 مخاطر) |
| **§1.2 خارج النطاق (سطر 52)** | *"بروتوكولات التوجيه الديناميكي (OSPF, BGP, RIP)"* | **مستبعد صراحة** — لا حساب مسارات ديناميكي |

**نتيجة حاسمة:** المطلوب هو **توجيه ثابت (static)** فقط — أي بحث في جدول يعرّفه المستخدم يدويًا، **وليس** خوارزمية اكتشاف مسار تلقائية. هذا يبسّط `resolveNextHop` جوهريًا (بحث في جدول، لا Dijkstra ديناميكي).

### الفجوة الحاسمة: كل الأجهزة على شبكة فرعية واحدة اليوم

[topologyStore.js `randomIp()`](../frontend/src/store/topologyStore.js#L12-L14) يُنتج **دائمًا** `192.168.1.x`. أي أن **كل الأجهزة حاليًا على `192.168.1.0/24` — شبكة فرعية واحدة**. التوجيه L3 (FR-029) بطبيعته **يوجّه بين شبكات فرعية مختلفة**؛ داخل شبكة واحدة لا يوجد ما يُوجَّه (كل شيء L2-switched). لذا:

- **ميزة "المسار متعدد القفزات عبر switches"** (L2) قابلة للعرض **فورًا** ضمن الشبكة الواحدة الحالية.
- **ميزة "التوجيه L3 عبر routingTable"** (FR-029/023) تتطلب **شرطًا مسبقًا: مخطط IP متعدد الشبكات الفرعية** (تعديل `randomIp`/`addDevice` + قناع الشبكة FR-019).

هذان **مفهومان منفصلان يخلطهما التكليف** — والخطة (§6) تفصلهما لمرحلتين.

---

## §2 بنية بيانات `routingTable` المقترحة

حقل جديد على أجهزة `router` فقط (schema موسّع، غير موجود بعد):

```
router.routingTable: Route[]

Route = {
  destination:      string,        // CIDR، مثل "192.168.2.0/24" أو "0.0.0.0/0" للمسار الافتراضي
  nextHopDeviceId:  string | null, // null = "متصل مباشرة (directly connected)"؛ غير ذلك = معرّف الجهاز التالي
}
```

- **`destination` كـ CIDR** يتوافق مع FR-019 (قناع /0..32) ويسمح بـ **مطابقة أطول بادئة (longest-prefix match)** — قاعدة التوجيه القياسية.
- **`nextHopDeviceId` كمعرّف جهاز** (وليس IP) — لأن باقي الكود يعمل بمعرّفات الأجهزة (`sourceDeviceId`/`targetDeviceId` في links)، فيتجنّب طبقة ترجمة IP→device إضافية.
- **`nextHopDeviceId: null`** يمثّل شبكة متصلة مباشرة (الوجهة على رابط مباشر من هذا الراوتر).
- **لا حقول أداء (metric/cost)** الآن — SRS §1.2 يستبعد نمذجة الأداء الفيزيائي؛ إضافة metric تحسين لاحق بلا مستهلك حالي.

---

## §3 خوارزمية `resolveNextHop(routingTable, destinationIp)`

دالة نقية جديدة مقترحة في ملف `engine/routing.js` (غير موجود بعد):

```
resolveNextHop(routingTable, destinationIp):
  1. matches = []
     for each route in routingTable:
        if ipInCidr(destinationIp, route.destination):   // هل الـ IP يقع ضمن نطاق الوجهة
           matches.push(route)

  2. if matches is empty:
        return { status: 'NO_ROUTE' }                    // لا مسار → إسقاط (packet drop)

  3. best = route in matches with the LONGEST prefix      // longest-prefix match
            (أكبر عدد بتات قناع؛ 0.0.0.0/0 دائمًا الأضعف = افتراضي)

  4. if best.nextHopDeviceId is null:
        return { status: 'DIRECTLY_CONNECTED' }          // الوجهة على رابط مباشر من هذا الراوتر

  5. return { status: 'VIA', nextHopDeviceId: best.nextHopDeviceId }
```

- دالة مساعدة نقية `ipInCidr(ip, cidr)` (تحويل IP+mask لأرقام ومقارنة البتات) — بسيطة، بلا تبعيات.
- **حالة "لا مسار موجود" (`NO_ROUTE`):** القرار المعتمد = **إسقاط الحزمة (drop) قبل إنشائها** — لا تُنشأ حزمة، وتُعاد `{ success: false, reason: 'No route to host' }` من `sendPacket` (بنفس نمط الرفض المعتمد في addLink/canBeAttacker). لا حالة "dropped" مرئية في محرك الحركة الحالي، وإضافتها (وميض أحمر ثم اختفاء) **تحسين لاحق اختياري**، ليس ضروريًا للحد الأدنى.

---

## §4 تجميع المسار (`path`) وحركة الحزمة

### كيف يتغيّر مفهوم `path`

**لا يتغيّر شكل البنية إطلاقًا** — `path` يبقى `string[]` من معرّفات العقد. الفرق الوحيد أنه يصبح **أطول من عنصرين**: `[source, hop1, hop2, ..., target]`. محرك الحركة الحالي يستهلكه كما هو دون أي تعديل (§0).

### الحركة البصرية: مسار متصل بتحديث لكل مقطع

**النموذج المعتمد = مسار واحد متصل بحركة نقطية لكل مقطع** (وليس "قفزة/اختفاء ثم ظهور"). هذا **هو السلوك الموجود أصلًا** في `getPacketPosition`: الحزمة تنساب بسلاسة من العقدة `i` إلى `i+1`، وعند اكتمال المقطع (`progress >= 1`) ينتقل `currentSegmentIndex` تلقائيًا للمقطع التالي وتتابع الانسياب — فتبدو كنقطة واحدة تمرّ عبر كل جهاز وسيط بالترتيب. لا حاجة لأي كود جديد للحركة.

### تجميع المسار — نسختان حسب المرحلة

- **المرحلة A (طوبولوجية، L2):** `findPath(devices, links, sourceId, targetId)` — بحث **BFS عرضي عبر `links`** من المصدر للهدف، بشرط أن كل عقدة **وسيطة** تحقق `canForward(type) === true` (أي `pc`/`server`/`attacker`/`firewall` لا يُمرّرون، فلا يكونون عقدًا وسيطة). يُعيد مصفوفة العقد أو `null`. يعمل ضمن الشبكة الواحدة الحالية فورًا.
- **المرحلة B (توجيهية، L3):** تجميع **قفزة بقفزة** — عند كل جهاز `router` في المسار يُستدعى `resolveNextHop(router.routingTable, destinationIp)` لتحديد القفزة التالية؛ عند `switch` يُمرَّر ضمن نفس الشبكة الفرعية (BFS محلي). يتوقف عند بلوغ الهدف أو `NO_ROUTE` → إسقاط. يتطلب المرحلة B شرط تعدد الشبكات الفرعية (§1).

---

## §5 المخاطر المعمارية (Architectural Risks) — قسم صريح

> التكليف يطلب صراحة عدم التقليل من الخطر لإنتاج تصميم "بسيط" مصطنع. التالي مخاطر حقيقية فحصتها في الكود:

### خطر 1 (الأعمق): فصل مسار الحزمة عن جداول ARP يعطّل MITM (FR-033) — **حرِج**
`sendPacket`/`packetMovement` اليوم **لا يستشيران جداول ARP إطلاقًا** — المسار يُحسب من الطوبولوجيا فقط. `simulateArpSpoof` يسمّم الجدول لكنه **لا يؤثر على أي مسار حزمة**. النتيجة: حتى بعد تنفيذ التوجيه متعدد القفزات من `links`+`routingTable` **وحدها**، تسميم ARP **لن يعيد توجيه حركة الضحية عبر المهاجم** — وهذا هو نص **FR-033 و AC-3 حرفيًا** ("يُعاد توجيه الحركة عبر Attacker بصريًا"). لتحقيق MITM فعليًا، يجب أن تستشير طبقة تجميع المسار **جدول ARP للضحية** عند تحديد القفزة التالية (إن كان MAC القفزة التالية مسمَّمًا بـ MAC المهاجم، يُدرَج المهاجم كعقدة وسيطة في `path`). **هذا تقاطع عميق بين محرك التوجيه ومحرك ARP، خارج نطاق هذه الوثيقة، لكنه شرط ضروري لـ FR-033 ويجب أن يُصمَّم كخطوة منفصلة صريحة (§6 الخطوة 7).** التقليل منه الآن يعني تسليم توجيه "يعمل" لكنه يُسقط متطلبًا ملزمًا صامتًا.

### خطر 2: `buildArpTable` سليم، لكن دلالة ARP-spoof عبر الشبكات الفرعية تنكسر — **متوسط**
`buildArpTable` يبني من الجيران المباشرين فقط — **صحيح ولا يحتاج تعديلًا** مع التوجيه. لكن عند إدخال تعدد الشبكات الفرعية (شرط المرحلة B)، تصبح قوائم App.jsx المنسدلة (التي تسمح باختيار أي جهاز كـ attacker/victim/impersonated) قادرة على إنتاج تسميم عبر شبكتين فرعيتين — وهو **بلا معنى واقعيًا** (لا يمكن ARP-spoof جهازًا في شبكة أخرى؛ يُسمَّم الـ gateway بدلًا منه). لا ينهار الكود، لكن الدلالة التعليمية تفسد. **حل مقترح لاحق:** تقييد اختيار ضحية ARP على نفس الشبكة الفرعية للمهاجم عبر دالة نقية جديدة. موثَّق، خارج النطاق.

### خطر 3: `Packet.jsx` يفترض رابطًا واحدًا للحزمة — **منخفض، لكن يجب معالجته في الخطوة 2**
البحث الحالي عن رابط واحد لتحديد `getSpeedMultiplier` (§0) يكسر مع مسار متعدد المقاطع بأنواع روابط مختلفة. الحل بسيط (حساب السرعة لكل مقطع حسب رابطه)، لكنه **يجب** أن يُدرَج في خطوة توصيل المسار لا يُنسى.

### خطر 4: الأداء (NFR-001: ≥50 عقدة، ≥80 رابط، ≥30fps) — **منخفض**
BFS لكل حزمة عند الإطلاق مقبول (يُحسب مرة عند `sendPacket`، لا كل إطار). لا خطر أداء حقيقي طالما الحساب لا يتكرر داخل حلقة الرسم. توثيق تحسبي فقط.

---

## §6 خطة التنفيذ المقترحة (خطوات صغيرة متسلسلة)

بروح DEVICE/CONNECTION_TAXONOMY — **لا تُنفَّذ الميزة بخطوة واحدة**. كل خطوة قابلة للاختبار والموافقة مستقلة:

| # | الخطوة | النطاق | يعتمد على | ملاحظة |
|---|--------|--------|-----------|--------|
| **1** | `engine/routing.js`: دالة نقية `findPath(devices, links, sourceId, targetId)` (BFS، شرط `canForward` للوسطاء) + اختبارات | engine فقط، غير موصولة | canForward الموجودة | تصميم فقط، لا واجهة |
| **2** | توصيل `sendPacket` بـ `findPath` بدل المسار الثابت + إزالة قيد الرابط المباشر + إصلاح خطر 3 في Packet.jsx | topologyStore + Packet.jsx | خطوة 1 | **هنا تظهر القفزات المتعددة بصريًا لأول مرة** (L2، شبكة واحدة) |
| **3** | مخطط IP متعدد الشبكات الفرعية: توسيع `addDevice`/config لدعم subnet mask (FR-019) + شبكات مختلفة | طبقة بيانات فقط | — | **شرط مسبق لأي توجيه L3 حقيقي** |
| **4** | `engine/routing.js`: `resolveNextHop` + `ipInCidr` نقيتان + schema `routingTable` + اختبارات | engine فقط، غير موصولة | خطوة 3 | تصميم منطق التوجيه |
| **5** | تجميع مسار قفزة-بقفزة يستشير `resolveNextHop` عند الراوترات (المرحلة B) | routing.js + topologyStore | خطوات 2،4 | يحقق FR-029 فعليًا |
| **6** | واجهة تحرير `routingTable` (لوحة UC-08 عند النقر المزدوج على راوتر) | مكوّن واجهة جديد | خطوة 5 | يحقق FR-023 |
| **7** | **(منفصلة، عالية الخطورة — خطر 1)** جعل تجميع المسار يستشير جداول ARP لإعادة توجيه MITM | تقاطع routing↔arp | خطوات 5،6 | يحقق FR-033/AC-3؛ يستحق وثيقة تصميم خاصة به |

---

## §7 عقود engine/ المقترحة (تسمية فقط — بدون تنفيذ)

```
engine/routing.js   (ملف جديد مقترح)
  findPath(devices, links, sourceId, targetId): string[] | null
    // BFS عبر links، الوسطاء يجب أن يحققوا canForward؛ null إن لا مسار

  resolveNextHop(routingTable, destinationIp): { status, nextHopDeviceId? }
    // status ∈ { 'VIA', 'DIRECTLY_CONNECTED', 'NO_ROUTE' }

  ipInCidr(ip, cidr): boolean
    // مساعدة نقية لمطابقة longest-prefix
```

كلها نقية (تأخذ بيانات، تُعيد قيمة، بلا React/Konva/Zustand)، تستهلك `canForward` الموجودة بالاستيراد لا بالتكرار — متوافقة تمامًا مع مبدأ الفصل المعماري القائم.

---

## §8 للموافقة

1. هل تقسيم الميزة لمرحلتين (A: قفزات L2 فورية ضمن الشبكة الواحدة / B: توجيه L3 يتطلب تعدد شبكات فرعية) مقبول، أم تريدين الذهاب مباشرة للتوجيه L3 الكامل؟
2. هل قرار "إسقاط الحزمة بصمت عند NO_ROUTE مع رسالة رفض" كافٍ الآن، أم تريدين مؤشر إسقاط بصري (وميض أحمر) من البداية؟
3. **الأهم:** هل يُقبَل تأجيل MITM (خطر 1، الخطوة 7) لوثيقة/مرحلة منفصلة، مع الإقرار الصريح أن التوجيه قبلها لا يحقق FR-033 بعد؟ أم أن FR-033 أولوية تفرض تصميم تقاطع routing↔ARP الآن؟
