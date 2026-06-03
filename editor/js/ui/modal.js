 // ===== إنشاء نافذة المستويات (modal) =====
    function createLevelsModal() {
        // إذا كانت موجودة بالفعل لا ننشئها مرتين
        if (document.getElementById('levelsModal')) return;

        var modal = document.createElement('div');
        modal.id = 'levelsModal';
        modal.style.position = 'fixed';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.width = '720px';
        modal.style.maxWidth = '90vw';
        modal.style.maxHeight = '80vh';
        modal.style.overflow = 'auto';
        modal.style.background = '#fff';
        modal.style.border = '1px solid #ccc';
        modal.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)';
        modal.style.zIndex = 10000;
        modal.style.padding = '16px';
        modal.style.borderRadius = '8px';

        // رأس النافذة
        var header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '12px';
        header.innerHTML = '<strong>قائمة المستويات</strong>';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = 'إغلاق';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });

        header.appendChild(closeBtn);
        modal.appendChild(header);

        // محتوى المستويات (قائمة افتراضية — عدّلها لاحقاً)
        var list = document.createElement('div');
        list.id = 'levelsListContainer';
        list.innerHTML = `
    <ul style="padding-left:18px;">
      <li><button class="level-btn" data-level="ping">Level 1 — Ping</button></li>
      <li><button class="level-btn" data-level="routing">Level 2 — Routing</button></li>
      <li><button class="level-btn" data-level="dos">Level 3 — DoS Simulation</button></li>
    </ul>
  `;
        modal.appendChild(list);

        // ربط أزرار المستويات بسلوك التحميل
        modal.querySelectorAll('.level-btn').forEach(function(b) {
            b.style.cursor = 'pointer';
            b.style.margin = '6px 0';
            b.addEventListener('click', function() {
                var levelKey = this.getAttribute('data-level');
                // استدعاء دالة تحميل المستوى — أنشئ الدالة loadLevel لاحقاً
                try {
                    loadLevel(levelKey);
                } catch (e) {
                    console.warn('loadLevel not implemented', levelKey);
                }
                modal.remove();
            });
        });

        document.body.appendChild(modal);
    }