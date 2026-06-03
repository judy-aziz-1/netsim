/* ===== create: تهيئة المشهد وإعداد الشريط ===== */
    function create() {
        console.log("Editor scene create (Phaser CE)");
        editorScene = this;

        // اضبط لون الخلفية داخل Phaser
game.stage.backgroundColor = 'rgba(0,0,0,0)';
        document.querySelectorAll('.tool-item').forEach(function(item) {
            item.addEventListener('dragstart', function(e) {
                e.preventDefault();
            });

            var deviceKey = item.getAttribute('data-device');
            var actionKey = item.getAttribute('data-action');

            if (deviceKey) {
                // سلوك السحب/النقر لإنشاء جهاز (كما كان)
                item.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    dragType = deviceKey;
                    isDraggingFromToolbar = true;
                    var label = item.querySelector('span') ? item.querySelector('span').textContent : dragType;
                    createDragProxy(label, e.clientX, e.clientY);
                });

                item.addEventListener('click', function(e) {
                    var pointerX = e.clientX;
                    var canvasWidth = window.innerWidth - 200;
                    if (pointerX < canvasWidth) {
                        addDevice(deviceKey, editorScene);
                    }
                });

            } else if (actionKey) {
                // عناصر الإجراءات: لا سحب، فقط تنفيذ الفعل
                item.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });

                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (actionKey === 'levels') {
                        // **التعديل المطلوب**: توجه إلى الصفحة عبر query param
                        window.location.href = '?page=levels';
                    }
                    // أفعال أخرى لاحقاً
                });
            }
        });
    }