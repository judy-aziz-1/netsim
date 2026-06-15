console.log('✅ game.js loaded');

// انتظر حتى يكون كل شيء جاهز
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ DOMContentLoaded fired');
        initializeGame();
    });
} else {
    console.log('✅ DOM already loaded, initializing game');
    initializeGame();
}

function initializeGame() {
    console.log('🎮 Initializing game...');
    
    var editorCanvas = document.getElementById('editorCanvas');
    var topbar = document.getElementById('topbar');
    var toolbar = document.getElementById('toolbar');
    
    console.log('📍 Elements found:');
    console.log('  - editorCanvas:', editorCanvas ? '✅' : '❌');
    console.log('  - topbar:', topbar ? '✅' : '❌');
    console.log('  - toolbar:', toolbar ? '✅' : '❌');

    if (!editorCanvas) {
        console.error('❌ editorCanvas not found!');
        return;
    }

    // تأكد من أن الدوال موجودة
    if (typeof preload !== 'function') {
        console.error('❌ preload function not defined');
        return;
    }
    if (typeof create !== 'function') {
        console.error('❌ create function not defined');
        return;
    }
    if (typeof update !== 'function') {
        console.error('❌ update function not defined');
        return;
    }

    console.log('✅ All Phaser functions defined');

    // الحصول على الأبعاد
    var width = editorCanvas.offsetWidth;
    var height = editorCanvas.offsetHeight;

    console.log('📐 Canvas dimensions:', width, 'x', height);

    if (width === 0 || height === 0) {
        console.warn('⚠️ Canvas has zero dimensions, waiting...');
        setTimeout(initializeGame, 100);
        return;
    }

    // إنشاء اللعبة
    try {
        window.game = new Phaser.Game(
    width,
    height,
    Phaser.CANVAS,
    editorCanvas,
    {
        preload: preload,
        create: create,
        update: update
    }
);

window.game.transparent = true;

        console.log('✅ Phaser game initialized');

        // بعد إنشاء اللعبة
        setTimeout(function() {
            var canvas = editorCanvas.querySelector('canvas');
            console.log('📊 Final state check:');
            console.log('  - Canvas element:', canvas ? '✅' : '❌');

            // 🔥 SOLUTION: استخدم game.input events + manual sprite tracking
            if (window.game && window.game.input) {
                console.log('🛠️ Installing comprehensive input system...');

                var selectedSpriteForDrag = null;
                var dragStartX = 0;
                var dragStartY = 0;
                var isDragging = false;
                var dragThreshold = 5; // pixels before considering it a drag

                // دالة للبحث عن sprite في موضع معين
                function findSpriteAtPoint(x, y) {
                    if (!window.devices || window.devices.length === 0) return null;
                    
                    // ابحث من الآخر إلى الأول (طبقات علوية أولاً)
                    for (var i = window.devices.length - 1; i >= 0; i--) {
                        var sprite = window.devices[i];
                        if (!sprite || !sprite.getBounds) continue;
                        
                        var bounds = sprite.getBounds();
                        if (x >= bounds.x && 
                            x <= bounds.x + bounds.width &&
                            y >= bounds.y && 
                            y <= bounds.y + bounds.height) {
                            return sprite;
                        }
                    }
                    return null;
                }

                // ===== عند الضغط على الماوس =====
                window.game.input.onDown.add(function(pointer) {
                    console.log('🖱️ Input DOWN at:', {x: pointer.x, y: pointer.y, button: pointer.button});
                    
                    var foundSprite = findSpriteAtPoint(pointer.x, pointer.y);
                    
                    if (foundSprite) {
                        console.log('✅ Found sprite at', {x: foundSprite.x, y: foundSprite.y});
                        selectedSpriteForDrag = foundSprite;
                        dragStartX = foundSprite.x;
                        dragStartY = foundSprite.y;
                        isDragging = false; // لم نبدأ drag بعد

                        // Left click - normal device click for linking
                        if (pointer.button === 0 && pointer.shiftKey === false) {
                            console.log('👆 Left click on device');
                            if (typeof onDeviceClicked === 'function') {
                                onDeviceClicked(foundSprite);
                                console.log('Left-click interaction completed');
                            }
                        }
                    } else {
                        console.log('❌ No sprite found at', {x: pointer.x, y: pointer.y});
                        selectedSpriteForDrag = null;
                    }
                });

                // ===== أثناء حركة الماوس (يعمل دائماً) =====
                document.addEventListener('mousemove', function(e) {
                    if (!selectedSpriteForDrag) return;
                    
                    var rect = editorCanvas.getBoundingClientRect();
                    var x = e.clientX - rect.left;
                    var y = e.clientY - rect.top;
                    
                    // تحقق من مسافة السحب
                    var distX = Math.abs(selectedSpriteForDrag.x - dragStartX);
                    var distY = Math.abs(selectedSpriteForDrag.y - dragStartY);
                    
                    if (!isDragging && (distX > dragThreshold || distY > dragThreshold)) {
                        isDragging = true;
                        console.log('🔄 Drag started');
                    }
                    
                    if (isDragging) {
                        // تحديث موضع الجهاز
                        selectedSpriteForDrag.x = x;
                        selectedSpriteForDrag.y = y;
                        
                        // استدعِ الدوال المتعلقة بالسحب
                        if (selectedSpriteForDrag.events && selectedSpriteForDrag.events.onDragUpdate) {
                            selectedSpriteForDrag.events.onDragUpdate.dispatch(selectedSpriteForDrag);
                        }
                        
                        if (typeof updateLinksForSprite === 'function') {
                            updateLinksForSprite(selectedSpriteForDrag);
                        }
                        
                        console.log('📍 Dragging:', {x: selectedSpriteForDrag.x, y: selectedSpriteForDrag.y});
                    }
                });

                // ===== عند رفع الماوس =====
                window.game.input.onUp.add(function(pointer) {
                    console.log('🖱️ Input UP, button:', pointer.button);
                    
                    if (selectedSpriteForDrag) {
                        if (isDragging) {
                            console.log('✋ Drag stopped for device at', {x: selectedSpriteForDrag.x, y: selectedSpriteForDrag.y});
                            
                            // استدعِ onDragStop
                            if (selectedSpriteForDrag.events && selectedSpriteForDrag.events.onDragStop) {
                                selectedSpriteForDrag.events.onDragStop.dispatch(selectedSpriteForDrag);
                            }
                        }
                        
                        // Right click = show context menu
                        if (pointer.button === 2) {
                            console.log('📋 Right-click context menu');
                            if (typeof showPingContextMenu === 'function') {
                                showPingContextMenu(selectedSpriteForDrag, pointer);
                            }
                        }
                        
                        isDragging = false;
                        selectedSpriteForDrag = null;
                    }
                });

                // ===== معالج الـ Right-Click للاجهزة =====
                // لا نستخدم contextmenu من document بل نستخدم mousedown من Phaser مباشرة
                document.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    return false;
                });

                console.log('✅ Comprehensive input system installed');
            }
        }, 300);

    } catch (e) {
        console.error('❌ Error creating Phaser game:', e.message);
    }
}