var topbarReady = false;

var setupTopbarButtons = function() {
    if (topbarReady) return;
    topbarReady = true;

    /* ===== منع Phaser من التقاط أحداث الـ Topbar ===== */
    var topbar = document.getElementById('topbar');
    if (topbar) {
        ['mousedown', 'mouseup'].forEach(function(evt) {
            topbar.addEventListener(evt, function(e) {
                e.stopPropagation();
            }, true);
        });
    }

    /* ===== Play ===== */
    var btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
        btnPlay.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    /* ===== Pause ===== */
    var btnPause = document.getElementById('btn-pause');
    if (btnPause) {
        btnPause.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    /* ===== Clear ===== */
    var btnClear = document.getElementById('btn-clear');
    if (btnClear) {
        btnClear.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            showConfirmToast('مسح كل الأجهزة والوصلات؟', function() {
                clearAll();
            });
        });
    }

    /* ===== Save ===== */
    var btnSave = document.getElementById('btn-save');
    if (btnSave) {
        btnSave.addEventListener('click', function(e) {
            e.stopPropagation();
            saveTopology();
        });
    }

    /* ===== Load ===== */
    /* ===== Load ===== */
    var btnLoad = document.getElementById('btn-load');
    if (btnLoad) {
        btnLoad.addEventListener('click', function(e) {
            e.stopPropagation();
            showTopologyList();
        });
    }

    /* ===== Ping ===== */
    var btnPingTop = document.getElementById('btn-ping-top');
    if (btnPingTop) {
        btnPingTop.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!devices || devices.length < 1) {
                showToast('يجب إضافة أجهزة أولاً', 'error');
                return;
            }
            sendPing();
        });
    }

    /* ===== Routing ===== */
    var btnRouting = document.getElementById('btn-routing');
    if (btnRouting) {
        btnRouting.addEventListener('click', function(e) {
            e.stopPropagation();
            showToast('Routing — قريباً', 'error');
        });
    }

    /* ===== DoS ===== */
    var btnDos = document.getElementById('btn-dos');
    if (btnDos) {
        btnDos.addEventListener('click', function(e) {
            e.stopPropagation();
            showToast('DoS — قريباً', 'error');
        });
    }

    /* ===== Levels ===== */
    var btnLevelsTop = document.getElementById('btn-levels-top');
    if (btnLevelsTop) {
        btnLevelsTop.addEventListener('click', function(e) {
            e.stopPropagation();
            window.location.href = '/netsim-master-test/';
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTopbarButtons);
} else {
    setupTopbarButtons();
}
function showTopologyList() {
    var old = document.getElementById('topo-list-panel');
    if (old) { old.remove(); return; }

    var panel = document.createElement('div');
    panel.id = 'topo-list-panel';
    panel.style.cssText = [
        'position:fixed','top:62px','right:20px',
        'background:#161b22',
        'border:1px solid rgba(77,159,255,0.3)',
        'border-radius:12px','padding:0',
        'z-index:999999','font-family:JetBrains Mono,monospace',
        'box-shadow:0 12px 40px rgba(0,0,0,0.7)',
        'animation:toastIn 0.15s ease',
        'width:340px','overflow:hidden'
    ].join(';');

    panel.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(77,159,255,0.15);background:rgba(77,159,255,0.05)">' +
            '<div style="display:flex;align-items:center;gap:8px">' +
                '<span style="font-size:14px">📂</span>' +
                '<span style="font-size:10px;letter-spacing:2px;color:#7d8590;text-transform:uppercase;font-weight:600">Saved Topologies</span>' +
            '</div>' +
            '<span id="topo-list-close" style="color:#484f58;cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:4px;transition:color .15s">✕</span>' +
        '</div>' +
        '<div id="topo-list-body" style="padding:10px;max-height:360px;overflow-y:auto">' +
            '<div style="color:#484f58;font-size:11px;padding:20px;text-align:center;letter-spacing:1px">Loading...</div>' +
        '</div>';

    document.body.appendChild(panel);

    document.getElementById('topo-list-close').addEventListener('click', function() {
        panel.remove();
    });

    // جلب القائمة من الـ DB
    fetch('editor/php/topology.ajax.php?action=list')
    .then(function(r) { return r.json(); })
    .then(function(list) {
        var body = document.getElementById('topo-list-body');
        if (!list || list.length === 0) {
            body.innerHTML = '<div style="color:#484f58;font-size:11px;padding:16px;text-align:center">No saved topologies</div>';
            return;
        }
        body.innerHTML = '';
        list.forEach(function(item) {
            var row = document.createElement('div');
            row.style.cssText = [
                'display:flex','justify-content:space-between','align-items:center',
                'padding:12px 14px','border-radius:8px','margin-bottom:6px',
                'background:#1c2330','border:1px solid transparent',
                'transition:all 0.15s','cursor:default'
            ].join(';');

            row.addEventListener('mouseenter', function() {
                row.style.background = '#21293a';
                row.style.borderColor = 'rgba(77,159,255,0.2)';
            });
            row.addEventListener('mouseleave', function() {
                row.style.background = '#1c2330';
                row.style.borderColor = 'transparent';
            });

            row.innerHTML =
                '<div style="flex:1;min-width:0">' +
                    '<div style="color:#e6edf3;font-size:12px;font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + item.name + '</div>' +
                    '<div style="color:#484f58;font-size:9px;letter-spacing:0.5px">' + item.created_at + '</div>' +
                '</div>' +
                '<div style="display:flex;gap:6px;flex-shrink:0;margin-left:12px">' +
                    '<button data-id="' + item.id + '" class="topo-load-btn" style="background:rgba(48,200,150,0.12);color:#30c896;border:1px solid rgba(48,200,150,0.3);border-radius:6px;padding:6px 12px;font-size:10px;font-weight:600;cursor:pointer;font-family:JetBrains Mono,monospace;transition:all .15s;letter-spacing:.5px">Load</button>' +
                    '<button data-id="' + item.id + '" class="topo-del-btn" style="background:rgba(255,95,95,0.08);color:#ff5f5f;border:1px solid rgba(255,95,95,0.2);border-radius:6px;padding:6px 10px;font-size:10px;cursor:pointer;font-family:JetBrains Mono,monospace;transition:all .15s">✕</button>' +
                '</div>';

            body.appendChild(row);
        });

        // Load
        body.querySelectorAll('.topo-load-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var id = this.getAttribute('data-id');
                fetch('editor/php/topology.ajax.php?action=load&id=' + id)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    loadTopology(data);
                    panel.remove();
                })
                .catch(function() { showToast('Load failed', 'error'); });
            });
        });

        // Delete
        body.querySelectorAll('.topo-del-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var id = this.getAttribute('data-id');
                var row = this.closest('div[style]');
                fetch('editor/php/topology.ajax.php?action=delete&id=' + id)
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    if (res.success) row.remove();
                });
            });
        });
    })
    .catch(function() {
        showToast('لم تسجل دخول أو حدث خطأ', 'error');
        panel.remove();
    });

    setTimeout(function() {
        document.addEventListener('mousedown', function handler(e) {
            if (!panel.contains(e.target) && e.target.id !== 'btn-load') {
                panel.remove();
                document.removeEventListener('mousedown', handler);
            }
        });
    }, 100);
}