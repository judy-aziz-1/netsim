var pingActive = false;
/* ===== linkExists مع تجاهل المعطلة ===== */
function linkActiveExists(a, b) {
    for (var i = 0; i < links.length; i++) {
        var L = links[i];
        if ((L.a === a && L.b === b) || (L.a === b && L.b === a)) {
            return L.enabled !== false;
        }
    }
    return false;
}

function sendPing() {
    stopPing();

    if (!window.selectedDevice || !window.selectedTargetDevice) {
        showToast('يجب تحديد جهاز مصدر وهدف', 'error');
        return;
    }
    if (window.selectedDevice === window.selectedTargetDevice) {
        showToast('المصدر والهدف لا يمكن أن يكونا نفس الجهاز', 'error');
        return;
    }
    if (!links || links.length === 0) {
        showToast('لا توجد وصلات بين الأجهزة', 'error');
        return;
    }

    var path = findPathBFS(window.selectedDevice, window.selectedTargetDevice);

    if (!path || path.length < 2) {
        showToast('لا يوجد مسار بين الجهازين', 'error');
        if (typeof logEvent === 'function') logEvent('error', '❌ PING — No path found');
        return;
    }

    pingActive = true;
    animateForward(path);
}

/* ===== BFS ===== */
function findPathBFS(source, target) {
    var queue = [[source]];
    var visited = new Set();
    visited.add(source);

    while (queue.length > 0) {
        var currentPath = queue.shift();
        var currentNode = currentPath[currentPath.length - 1];

        if (currentNode === target) return currentPath;

        for (var i = 0; i < devices.length; i++) {
            var neighbor = devices[i];
            if (!visited.has(neighbor) && linkActiveExists(currentNode, neighbor)) {
                visited.add(neighbor);
                var newPath = currentPath.slice();
                newPath.push(neighbor);
                queue.push(newPath);
            }
        }
    }
    return null;
}

/* ===== تحريك الحزمة من المصدر إلى الهدف ===== */
function animateForward(path) {
    var index = 0;

    function nextHop() {
        if (!pingActive) return;
        if (index >= path.length - 1) {
            animateReturn(path);
            return;
        }
        var from = path[index];
        var to = path[index + 1];
        createPacket(from, to, function() {
            index++;
            nextHop();
        });
    }

    nextHop();
}

/* ===== تحريك الحزمة من الهدف إلى المصدر ===== */
function animateReturn(path) {
    var index = path.length - 1;

    function nextHop() {
        if (!pingActive) return;
        if (index <= 0) {
            if (typeof logEvent === 'function') logEvent('success', '✅ PING ' + path[0].deviceData.name + ' → ' + path[path.length-1].deviceData.name + ' — ' + (path.length-1) + ' hops');
            showPingPath(path);
            showToast('Ping Success', 'success');
            stopPing();
            return;
        }
        var from = path[index];
        var to = path[index - 1];
        createPacket(from, to, function() {
            index--;
            nextHop();
        });
    }

    nextHop();
}

function showPingPath(path) {
    var old = document.getElementById('ping-path-panel');
    if (old) old.remove();

    var names   = path.map(function(d) { return d.deviceData.name; });
    var pathStr = names.join(' <span style="color:#484f58">→</span> ');
    var hops    = path.length - 1;
    var ms      = Math.floor(hops * 2 + Math.random() * 3 + 1);

    var panel = document.createElement('div');
    panel.id = 'ping-path-panel';
    panel.style.cssText = [
        'position:fixed',
        'top:62px',
        'left:50%',
        'transform:translateX(-50%)',
        'background:#161b22',
        'border:1px solid rgba(48,200,150,0.35)',
        'border-radius:8px',
        'padding:10px 20px',
        'z-index:999999',
        'pointer-events:none',
        'font-family:JetBrains Mono,monospace',
        'font-size:11px',
        'color:#7d8590',
        'animation:toastIn 0.2s ease',
        'white-space:nowrap',
        'display:flex',
        'align-items:center',
        'gap:16px'
    ].join(';');

    panel.innerHTML =
        '<span style="color:#484f58;font-size:10px;letter-spacing:1px">PATH</span>' +
        '<span style="color:#30c896">' + pathStr + '</span>' +
        '<span style="color:#484f58">|</span>' +
        '<span style="color:#4d9fff;font-size:10px">' + hops + ' hop' + (hops > 1 ? 's' : '') + '</span>' +
        '<span style="color:#484f58">|</span>' +
        '<span style="color:#c084fc;font-size:10px">' + ms + ' ms</span>';

    document.body.appendChild(panel);
}

/* ===== إيقاف ===== */
function stopPing() {
    pingActive = false;
    clearPackets();
    var panel = document.getElementById('ping-path-panel');
    if (panel) setTimeout(function() { panel.remove(); }, 3000);
}

/* ===== حذف الحزم ===== */
function clearPackets() {
    while (packets.length > 0) {
        var p = packets.pop();
        if (p.sprite) p.sprite.destroy();
    }
}

/* ===== Toast ===== */
function showToast(message, type) {
    var old = document.getElementById('netsim-toast');
    if (old) old.remove();

    var toast = document.createElement('div');
    toast.id = 'netsim-toast';
    toast.textContent = message;

    var isSuccess = type === 'success';
    toast.style.cssText = [
        'position:fixed',
        'bottom:32px',
        'left:50%',
        'transform:translateX(-50%)',
        'padding:12px 28px',
        'background:' + (isSuccess ? '#161b22' : '#1a1215'),
        'color:' + (isSuccess ? '#30c896' : '#ff5f5f'),
        'border:1px solid ' + (isSuccess ? '#30c896' : '#ff5f5f'),
        'border-radius:8px',
        'font-family:JetBrains Mono,monospace',
        'font-size:13px',
        'font-weight:600',
        'letter-spacing:0.5px',
        'z-index:999999',
        'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
        'animation:toastIn 0.2s ease'
    ].join(';');

    document.body.appendChild(toast);
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3000);
}
/* ===== Confirm Toast ===== */
function showConfirmToast(message, onConfirm) {
    var old = document.getElementById('netsim-confirm');
    if (old) old.remove();

    var box = document.createElement('div');
    box.id = 'netsim-confirm';
    box.style.cssText = [
        'position:fixed',
        'bottom:60px',
        'left:50%',
        'transform:translateX(-50%)',
        'background:#161b22',
        'border:1px solid rgba(255,95,95,0.4)',
        'border-radius:8px',
        'padding:14px 20px',
        'z-index:999999',
        'font-family:JetBrains Mono,monospace',
        'font-size:12px',
        'color:#e6edf3',
        'display:flex',
        'align-items:center',
        'gap:16px',
        'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
        'animation:toastIn 0.2s ease'
    ].join(';');

    var msg = document.createElement('span');
    msg.textContent = message;

    var btnYes = document.createElement('button');
    btnYes.textContent = 'نعم';
    btnYes.style.cssText = 'background:#ff5f5f;color:#fff;border:none;padding:6px 14px;border-radius:5px;cursor:pointer;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:600';

    var btnNo = document.createElement('button');
    btnNo.textContent = 'إلغاء';
    btnNo.style.cssText = 'background:#21293a;color:#7d8590;border:1px solid rgba(255,255,255,0.1);padding:6px 14px;border-radius:5px;cursor:pointer;font-family:JetBrains Mono,monospace;font-size:11px';

    btnYes.addEventListener('click', function() {
        box.remove();
        onConfirm();
    });

    btnNo.addEventListener('click', function() {
        box.remove();
    });

    box.appendChild(msg);
    box.appendChild(btnYes);
    box.appendChild(btnNo);
    document.body.appendChild(box);

    setTimeout(function() { if (box.parentNode) box.remove(); }, 5000);
}

window.stopPing = stopPing;