/**
 * Link Manager Module - مدير الوصلات
 * 
 * الوصف:
 *   يدير إنشاء وحذف الوصلات (Links) بين الأجهزة في الشبكة.
 *   يتعامل مع الرسم البياني والتفاعل والاختيار والحذف.
 * 
 * الميزات:
 *   - إضافة وصلات ثنائية الاتجاه بين الأجهزة
 *   - رسم خطوط سميكة ملونة تمثل الوصلات
 *   - مربعات التقاط (Hit Areas) شفافة للتفاعل
 *   - دعم اختيار الوصلات وحذفها
 *   - تحديث الوصلات عند تحريك الأجهزة
 *   - التحقق من وجود وصلة قبل الإضافة (تجنب التكرار)
 * 
 * الدوال الرئيسية:
 *   linkExists(a, b) - التحقق من وجود وصلة بين جهازين
 *   addLink(a, b) - إضافة وصلة جديدة
 *   removeLink(a, b) - حذف وصلة موجودة
 *   updateLinksForSprite(sprite) - تحديث الوصلات عند تحريك جهاز
 * 
 */

 /* ===== التحقق من وجود وصلة مسبقة بين جهازين ===== */
  function linkExists(a, b) {
        for (var i = 0; i < links.length; i++) {
            var L = links[i];
            if ((L.a === a && L.b === b) || (L.a === b && L.b === a)) {
                if (L.enabled === false) return false;
                return true;
            }
        }
        return false;
    }

    /* ===== إضافة وصلة جديدة مع "hit" تفاعلي يغطي الخط (بدون دائرة مرئية) ===== */
    function addLink(a, b) {
        // أنشئ كائن رسومي جديد لكل وصلة
        var g = game.add.graphics(0, 0);
       g.lineStyle(2, 0x94a3b8, 1);
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);

        // أنشئ "hit sprite" شفاف أكبر قليلاً من سمك الخط لالتقاط النقرات
        var hitSize = 48; // حجم مربع الالتقاط (يمكن تغييره لسهولة الضغط)
        var bmd = game.add.bitmapData(hitSize, hitSize);
        // نرسم مربع شفاف (سيتم تدويره وتمديده لاحقاً)
        bmd.ctx.fillStyle = 'rgba(0,0,0,0)';
        bmd.ctx.fillRect(0, 0, hitSize, hitSize);

        var midX = (a.x + b.x) / 2;
        var midY = (a.y + b.y) / 2;
        var hit = game.add.sprite(midX, midY, bmd);
        hit.anchor.set(0.5);
        hit.inputEnabled = true;
        hit.input.useHandCursor = true;

        // ربط مرجع الوصلة بالـ hit و الـ graphics
        var linkObj = {
            a: a,
            b: b,
            g: g,
            hit: hit
        };
        hit.linkRef = linkObj;
        
        // إضافة الاتصالات مع تجنب التكرار
        if (a.deviceData.connections.indexOf(b) === -1) {
            a.deviceData.connections.push(b);
        }
        if (b.deviceData.connections.indexOf(a) === -1) {
            b.deviceData.connections.push(a);
        }

        // حدث النقر على الـ hit: Shift+Click للحذف الفوري، خلاف ذلك للتحديد
        hit.events.onInputDown.add(function(h, pointer) {
            // امنع انتشار الحدث DOM الذي قد يلغّي التحديد
            try {
                if (pointer && pointer.event) pointer.event.stopPropagation();
            } catch (e) {}

            // إذا كان هناك جهاز محدد، نلغي تحديده فوراً حتى لا يمنع حذف/تحديد الوصلة
            if (selectedDevice) {
                try {
                    selectedDevice.tint = 0xffffff;
                } catch (e) {}
                selectedDevice = null;
            }

            if (pointer && pointer.shiftKey) {
                removeLink(h.linkRef.a, h.linkRef.b);
                return;
            }

            // زر الماوس الأيمن — قائمة سياق
            if (pointer && pointer.button === 2) {
                showLinkContextMenu(h.linkRef, pointer);
                return;
            }

            if (selectedLink === h.linkRef) {
                deselectLink();
            } else {
                selectLink(h.linkRef);
            }
        }, this);

        // ضع الـ hit فوق الـ graphics مباشرة حتى يستقبل النقرات، لكن تحت الأجهزة
        links.push(linkObj);
        try {
            game.world.bringToTop(hit);
        } catch (e) {}
        redrawLink(linkObj);
        if (typeof updateStatusBar === 'function') updateStatusBar();
    }
    
    /* ===== إعادة رسم وصلة مفردة وتحديث موقع وحجم وrotation للـ hit ===== */
   function redrawLink(link) {
        var g = link.g;
        g.clear();
        if (link.enabled === false) {
            g.lineStyle(2, 0xff5f5f, 0.4);
        } else {
            g.lineStyle(2, 0x94a3b8, 1);
        }
        g.moveTo(link.a.x, link.a.y);
        g.lineTo(link.b.x, link.b.y);

        // حدّث موقع الـ hit إلى منتصف الخط
        if (link.hit) {
            var midX = (link.a.x + link.b.x) / 2;
            var midY = (link.a.y + link.b.y) / 2;
            link.hit.x = midX;
            link.hit.y = midY;

            // ضبط طول الـ hit بحيث يغطي طول الخط بين النقطتين
            var dx = link.b.x - link.a.x;
            var dy = link.b.y - link.a.y;
            var length = Math.sqrt(dx * dx + dy * dy);

            // نستخدم scale.x لتمديد الـ hit أفقياً إلى طول الخط
            var hitSize = link.hit.width; // الحجم الأصلي
            if (hitSize === 0) hitSize = 48;
            link.hit.scale.x = length / hitSize;
            // نجعل scale.y أكبر قليلاً لتوسيع منطقة الالتقاط عمودياً
            link.hit.scale.y = 1.0;

            // تدوير الـ hit ليتطابق مع اتجاه الخط
            link.hit.rotation = Math.atan2(dy, dx);

            // تأكد أن الـ hit فوق الـ graphics
            try {
                game.world.bringToTop(link.hit);
            } catch (e) {}
        }
    }

    /* ===== تحديث كل الوصلات المرتبطة بجهاز معين ===== */
    function updateLinksForSprite(sprite) {
        for (var i = 0; i < links.length; i++) {
            var L = links[i];
            if (L.a === sprite || L.b === sprite) {
                redrawLink(L);
            }
        }
    }
     /* ===== تحديد وإلغاء تحديد وصلة مع تمييز بصري ===== */
    function selectLink(link) {
        if (selectedLink) deselectLink();

        selectedLink = link;
        if (selectedLink.g) {
            selectedLink.g.clear();
            selectedLink.g.lineStyle(3, 0x30c896, 1);
            selectedLink.g.moveTo(selectedLink.a.x, selectedLink.a.y);
            selectedLink.g.lineTo(selectedLink.b.x, selectedLink.b.y);
        }
        if (selectedLink.hit) {
            selectedLink.hit.tint = 0xffcccc;
            try {
                game.world.bringToTop(selectedLink.hit);
            } catch (e) {}
        }
    }

    function deselectLink() {
        if (!selectedLink) return;
        if (selectedLink.g) {
            selectedLink.g.clear();
           selectedLink.g.lineStyle(2, 0x94a3b8, 1);
            selectedLink.g.moveTo(selectedLink.a.x, selectedLink.a.y);
            selectedLink.g.lineTo(selectedLink.b.x, selectedLink.b.y);
        }
        if (selectedLink.hit) {
            selectedLink.hit.tint = 0xffffff;
        }
        selectedLink = null;
    }

    function deleteSelectedLink() {
        if (!selectedLink) return;
        removeLink(selectedLink.a, selectedLink.b);
        selectedLink = null;
    }

    /* ===== حذف وصلة بين جهازين (يشمل الـ hit والـ graphics) ===== */
    function removeLink(a, b) {
        for (var i = links.length - 1; i >= 0; i--) {
            var L = links[i];
            if ((L.a === a && L.b === b) || (L.a === b && L.b === a)) {
                if (typeof logEvent === 'function') logEvent('warn', '🗑 Link removed: ' + a.deviceData.name + ' ↔ ' + b.deviceData.name);

                if (L.g && L.g.destroy) L.g.destroy();
                if (L.hit && L.hit.destroy) L.hit.destroy();

                // حذف من connections
                if (L.a.deviceData && L.a.deviceData.connections) {
                    L.a.deviceData.connections = L.a.deviceData.connections.filter(function(n) {
                        return n !== L.b;
                    });
                }

                if (L.b.deviceData && L.b.deviceData.connections) {
                    L.b.deviceData.connections = L.b.deviceData.connections.filter(function(n) {
                        return n !== L.a;
                    });
                }

                links.splice(i, 1);
            }
        }

        // إذا كانت الوصلة المحددة هي نفسها، ألغِ التحديد
        if (selectedLink && ((selectedLink.a === a && selectedLink.b === b) || (selectedLink.a === b && selectedLink.b === a))) {
            selectedLink = null;
        }

        if (typeof updateStatusBar === 'function') updateStatusBar();
    }

    // جعل linkExists عامة للاستخدام في ملفات أخرى
    window.linkExists = linkExists;
    /* ===== تأثير الوصلة أثناء الـ ping ===== */
function highlightLink(deviceA, deviceB) {
    for (var i = 0; i < links.length; i++) {
        var L = links[i];
        if ((L.a === deviceA && L.b === deviceB) ||
            (L.a === deviceB && L.b === deviceA)) {
            L.g.clear();
            L.g.lineStyle(2, 0x30c896, 1);
            L.g.moveTo(L.a.x, L.a.y);
            L.g.lineTo(L.b.x, L.b.y);
            setTimeout(function(link) {
                if (!link.g) return;
                link.g.clear();
                link.g.lineStyle(2, 0x94a3b8, 1);
                link.g.moveTo(link.a.x, link.a.y);
                link.g.lineTo(link.b.x, link.b.y);
            }.bind(null, L), 600);
            break;
        }
    }
}
window.highlightLink = highlightLink;



/* ===== Link Context Menu ===== */
function showLinkContextMenu(linkObj, pointer) {
    // إغلاق أي قائمة سياق مفتوحة
    var oldMenu = document.getElementById('link-context-menu');
    if (oldMenu) oldMenu.remove();

    var mouseX = 0, mouseY = 0;
    if (window.event) {
        mouseX = window.event.clientX;
        mouseY = window.event.clientY;
    } else if (pointer.event) {
        mouseX = pointer.event.clientX;
        mouseY = pointer.event.clientY;
    } else {
        var rect = document.getElementById('editorCanvas').getBoundingClientRect();
        mouseX = rect.left + pointer.x;
        mouseY = rect.top  + pointer.y;
    }
    var isEnabled = linkObj.enabled !== false;

    var menu = document.createElement('div');
    menu.id = 'link-context-menu';
    menu.style.cssText = [
        'position:fixed',
        'left:' + mouseX + 'px',
        'top:'  + mouseY + 'px',
        'background:#161b22',
        'border:1px solid rgba(148,163,184,0.2)',
        'border-radius:8px',
        'z-index:999999',
        'min-width:180px',
        'overflow:hidden',
        'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
        'font-family:JetBrains Mono,monospace',
        'animation:menuIn 0.12s ease'
    ].join(';');

    // عنوان القائمة
    var header = document.createElement('div');
    header.style.cssText = 'padding:8px 14px;font-size:9px;letter-spacing:2px;color:#484f58;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.05)';
    header.textContent = 'Link Options';
    menu.appendChild(header);

    // خيار Enable
    var enableItem = document.createElement('div');
    if (typeof logEvent === 'function') logEvent('success', '🔗 Link enabled: ' + linkObj.a.deviceData.name + ' ↔ ' + linkObj.b.deviceData.name);
    enableItem.style.cssText = [
        'padding:10px 14px',
        'cursor:pointer',
        'font-size:11px',
        'font-weight:600',
        'color:' + (isEnabled ? '#484f58' : '#30c896'),
        'display:flex',
        'align-items:center',
        'gap:10px',
        'transition:background 0.15s',
        'border-bottom:1px solid rgba(255,255,255,0.04)'
    ].join(';');
    enableItem.innerHTML =
        '<span style="width:8px;height:8px;border-radius:50%;background:#30c896;display:inline-block;opacity:' + (isEnabled ? '0.3' : '1') + '"></span>' +
        'Enable Link';
    enableItem.addEventListener('mouseenter', function() { enableItem.style.background = 'rgba(48,200,150,0.08)'; });
    enableItem.addEventListener('mouseleave', function() { enableItem.style.background = 'transparent'; });
    enableItem.onclick = function(e) {
        e.stopPropagation();
        if (!isEnabled) {
            linkObj.enabled = true;
            redrawLink(linkObj);
            if (typeof showToast === 'function') showToast('Link Enabled', 'success');
        }
        menu.remove();
    };

    // خيار Disable
    var disableItem = document.createElement('div');
    if (typeof logEvent === 'function') logEvent('error', '🔴 Link disabled: ' + linkObj.a.deviceData.name + ' ↔ ' + linkObj.b.deviceData.name);
    disableItem.style.cssText = [
        'padding:10px 14px',
        'cursor:pointer',
        'font-size:11px',
        'font-weight:600',
        'color:' + (isEnabled ? '#ff5f5f' : '#484f58'),
        'display:flex',
        'align-items:center',
        'gap:10px',
        'transition:background 0.15s',
        'border-bottom:1px solid rgba(255,255,255,0.04)'
    ].join(';');
    disableItem.innerHTML =
        '<span style="width:8px;height:8px;border-radius:50%;background:#ff5f5f;display:inline-block;opacity:' + (isEnabled ? '1' : '0.3') + '"></span>' +
        'Disable Link';
    disableItem.addEventListener('mouseenter', function() { disableItem.style.background = 'rgba(255,95,95,0.08)'; });
    disableItem.addEventListener('mouseleave', function() { disableItem.style.background = 'transparent'; });
    disableItem.onclick = function(e) {
        e.stopPropagation();
        if (isEnabled) {
            linkObj.enabled = false;
            redrawLink(linkObj);
            if (selectedLink === linkObj) deselectLink();
            if (typeof showToast === 'function') showToast('Link Disabled', 'error');
        }
        menu.remove();
    };

    // خيار Delete
    var deleteItem = document.createElement('div');
    deleteItem.style.cssText = [
        'padding:10px 14px',
        'cursor:pointer',
        'font-size:11px',
        'font-weight:600',
        'color:#ff5f5f',
        'display:flex',
        'align-items:center',
        'gap:10px',
        'transition:background 0.15s'
    ].join(';');
    deleteItem.innerHTML =
        '<span style="width:8px;height:8px;border-radius:50%;background:#ff5f5f;display:inline-block"></span>' +
        'Delete Link';
    deleteItem.addEventListener('mouseenter', function() { deleteItem.style.background = 'rgba(255,95,95,0.1)'; });
    deleteItem.addEventListener('mouseleave', function() { deleteItem.style.background = 'transparent'; });
    deleteItem.onclick = function(e) {
        e.stopPropagation();
        removeLink(linkObj.a, linkObj.b);
        menu.remove();
    };

    menu.appendChild(enableItem);
    menu.appendChild(disableItem);
    menu.appendChild(deleteItem);
    document.body.appendChild(menu);

    // إغلاق عند النقر خارج القائمة
    setTimeout(function() {
        document.addEventListener('click', function handler() {
            if (menu && menu.parentNode) menu.remove();
            document.removeEventListener('click', handler);
        });
    }, 10);
}