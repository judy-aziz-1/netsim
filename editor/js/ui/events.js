/* ===== متابعة حركة الماوس لتحديث العنصر الوسيط (DOM) ===== */
    document.addEventListener('mousemove', function(e) {
        if (!isDraggingFromToolbar) return;
        moveDragProxy(e.clientX, e.clientY);
    });

    /* ===== عند الإفلات: إنشاء الجهاز داخل مساحة العمل إذا كان داخل الـ canvas ===== */
    document.addEventListener('mouseup', function(e) {
        if (!isDraggingFromToolbar) return;

        var rect = document.getElementById('editorCanvas').getBoundingClientRect();
        var sceneX = e.clientX - rect.left;
        var sceneY = e.clientY - rect.top;

        if (sceneX >= 0 && sceneY >= 0 && sceneX <= rect.width && sceneY <= rect.height) {
            if (dragType && editorScene) {
                addDeviceAt(dragType, editorScene, sceneX, sceneY);
            }
        }

        isDraggingFromToolbar = false;
        dragType = null;
        removeDragProxy();
    });

    /* ===== إعادة تحجيم اللعبة عند تغيير حجم النافذة ===== */
    window.addEventListener('resize', function() {
        game.width = window.innerWidth;
        game.height = window.innerHeight;
        game.renderer.resize(window.innerWidth, window.innerHeight);
    });

    /* ===== مستمع لوحة المفاتيح: حذف الجهاز أو الوصلة المحددة عند الضغط على Delete ===== */
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Delete' || e.key === 'Del' || e.key === 'Backspace') {
            
            // إذا كان المستخدم يكتب في input أو textarea — تجاهل الحذف
            var tag = document.activeElement && document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            e.preventDefault();
            
            // حذف وصلة محددة أولاً إن وُجدت
            if (selectedLink) {
                deleteSelectedLink();
                return;
            }
            
            // حذف جهاز محدد للـ Ping
            if (selectedDevice) {
                deleteDevice(selectedDevice);
                selectedDevice = null;
                selectedTargetDevice = null;
                return;
            }
            
            // حذف جهاز محدد للربط
            if (linkStartDevice) {
                deleteDevice(linkStartDevice);
                linkStartDevice = null;
                return;
            }
        }
    });
    
    // إلغاء التحديد عند النقر في أي مكان خارج مساحة العمل أو الشريط
    document.addEventListener('mousedown', function(e) {
        var toolbar = document.getElementById('toolbar');
        var editorDiv = document.getElementById('editorCanvas');
        var contextMenu = document.getElementById('ping-context-menu');

        // إذا النقر داخل الشريط فلا نلغي
        if (toolbar && toolbar.contains(e.target)) return;

        // إذا النقر داخل مساحة العمل (الـ canvas أو داخل div#editorCanvas) فلا نلغي
        if (editorDiv && editorDiv.contains(e.target)) return;

        // إذا النقر داخل قائمة السياق (Ping Context Menu) فلا نلغي
        if (contextMenu && contextMenu.contains(e.target)) return;

        // إذا كان Ctrl مضغوط (قديم - للتوافق) فلا نلغي التحديد
        if (e.ctrlKey) return;

        // خلاف ذلك: إلغاء تحديد الجهاز أو الوصلة أو Ping
        if (selectedDevice) {
            selectedDevice.tint = 0xffffff;
            selectedDevice = null;
        }
        if (selectedTargetDevice) {
            selectedTargetDevice.tint = 0xffffff;
            selectedTargetDevice = null;
        }
        if (selectedLink) {
            deselectLink();
        }
        if (typeof updateStatusBar === 'function') updateStatusBar();
    });

    // إعادة تعيين حالة السحب عند إفلات الماوس لتجنب عالق السحب
    document.addEventListener('mouseup', function(e) {
        // أعد تعيين جميع الأجهزة للتأكد من عدم عالق السحب
        if (devices && devices.length > 0) {
            devices.forEach(function(device) {
                if (device && device.input) {
                    device.input.dragging = false;
                }
            });
        }
    });