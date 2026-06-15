// ===== SIEM Panel Manager =====

var siemEvents = [];
var siemOpen = false;

/* ===== تعريف حالات الفشل ===== */
var SIEM_STATUS = {
    NORMAL:      { cls: 'siem-status-normal', icon: '✅ NORMAL'      },
    ATTACK:      { cls: 'siem-status-attack', icon: '🔴 ATTACK'      },
    NO_ROUTE:    { cls: 'siem-status-warn',   icon: '🚫 NO_ROUTE'    },
    BLOCKED:     { cls: 'siem-status-warn',   icon: '⛔ BLOCKED'     },
    UNREACHABLE: { cls: 'siem-status-warn',   icon: '📵 UNREACHABLE' },
    INVALID:     { cls: 'siem-status-warn',   icon: '⚠️ INVALID'     },
    WARN:        { cls: 'siem-status-warn',   icon: '⚠️ WARN'        }
};

function siemLog(srcIP, dstIP, proto, hops, latency, status) {
    var now  = new Date();
    var time = now.toTimeString().slice(0, 8);

    var entry = { time: time, srcIP: srcIP, dstIP: dstIP, proto: proto,
                  hops: hops, latency: latency, status: status };
    siemEvents.unshift(entry);
    if (siemEvents.length > 100) siemEvents.pop();

    renderSiem();
    if (!siemOpen) siemToggle();
}

function renderSiem() {
    var tbody   = document.getElementById('siem-tbody');
    var empty   = document.getElementById('siem-empty');
    var table   = document.getElementById('siem-table');
    var counter = document.getElementById('siem-count');
    if (!tbody) return;

    counter.textContent = siemEvents.length;

    if (siemEvents.length === 0) {
        empty.style.display = 'flex';
        table.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    table.style.display = 'table';

    tbody.innerHTML = siemEvents.map(function(e) {
        var s = SIEM_STATUS[e.status] || SIEM_STATUS['WARN'];
        return '<tr>' +
            '<td>' + e.time    + '</td>' +
            '<td>' + e.srcIP   + '</td>' +
            '<td>' + e.dstIP   + '</td>' +
            '<td class="siem-proto">' + e.proto + '</td>' +
            '<td>' + e.hops    + '</td>' +
            '<td>' + e.latency + '</td>' +
            '<td class="' + s.cls + '">' + s.icon + '</td>' +
        '</tr>';
    }).join('');
}

function siemToggle() {
    var panel = document.getElementById('siem-panel');
    var btn   = document.getElementById('siem-toggle-btn');
    if (!panel) return;

    siemOpen = !siemOpen;
    if (siemOpen) {
        panel.classList.remove('collapsed');
        document.body.classList.add('siem-open');
        btn.textContent = '▼';
        if (window.game && window.game.scale) {
            var newH = window.innerHeight - 52 - 180 - 24;
            window.game.scale.setGameSize(window.game.width, newH);
        }
    } else {
        panel.classList.add('collapsed');
        document.body.classList.remove('siem-open');
        btn.textContent = '▲';
        if (window.game && window.game.scale) {
            var fullH = window.innerHeight - 52 - 24;
            window.game.scale.setGameSize(window.game.width, fullH);
        }
    }
}

function siemClear() {
    siemEvents = [];
    renderSiem();
}

document.addEventListener('DOMContentLoaded', function() {
    var header    = document.getElementById('siem-header');
    var clearBtn  = document.getElementById('siem-clear-btn');
    var toggleBtn = document.getElementById('siem-toggle-btn');

    if (header) header.addEventListener('click', function(e) {
        if (e.target !== clearBtn && e.target !== toggleBtn) siemToggle();
    });
    if (clearBtn)  clearBtn.addEventListener('click',  function(e) { e.stopPropagation(); siemClear(); });
    if (toggleBtn) toggleBtn.addEventListener('click', function(e) { e.stopPropagation(); siemToggle(); });
});