/* ===== نظام الـ Routing الكامل ===== */

window.routingTable = {};

/* ===== مساعدات الشبكة ===== */
function getNetworkAddress(ip, subnet) {
    try {
        var ipParts  = ip.split('.').map(Number);
        var subParts = (subnet || '255.255.255.0').split('.').map(Number);
        return ipParts.map(function(p, i) { return p & subParts[i]; }).join('.');
    } catch(e) { return ip; }
}

function prefixToMask(prefix) {
    return [0,1,2,3].map(function(i) {
        var bits = Math.min(8, Math.max(0, prefix - i * 8));
        return 256 - Math.pow(2, 8 - bits);
    }).join('.');
}

function ipInNetwork(ip, network, prefix) {
    try {
        return getNetworkAddress(ip, prefixToMask(prefix)) === network;
    } catch(e) { return false; }
}

/* ===== الجيران المتصلون ===== */
function getNeighbors(router) {
    var neighbors = [];
    links.forEach(function(L) {
        if (L.enabled === false) return;
        if (L.a === router) neighbors.push(L.b);
        else if (L.b === router) neighbors.push(L.a);
    });
    return neighbors;
}

function routeExists(routerId, destination, prefix) {
    return (window.routingTable[routerId] || []).some(function(r) {
        return r.destination === destination && r.prefix === prefix;
    });
}

/* ===== Auto-Route ===== */
function autoRoute() {
    window.routingTable = {};
    var routers = devices.filter(function(d) { return d.deviceData.role === 'router'; });
    if (routers.length === 0) { showToast('لا يوجد Router في الشبكة', 'error'); return 0; }

    // بناء جدول كل Router من جيرانه المباشرين
    routers.forEach(function(router) {
        var id    = router.deviceData.id;
        var d     = router.deviceData;
        var myNet = getNetworkAddress(d.ip, d.subnet || '255.255.255.0');
        window.routingTable[id] = [];

        // شبكته المباشرة
        window.routingTable[id].push({
            destination: myNet, prefix: 24,
            nextHop: null, nextHopDevice: null,
            iface: d.ip, type: 'Direct', viaName: d.name
        });

        // جيرانه المباشرون
        getNeighbors(router).forEach(function(nb) {
            var nd    = nb.deviceData;
            if (!nd.ip) return;
            var nbNet = getNetworkAddress(nd.ip, nd.subnet || '255.255.255.0');
            if (nbNet !== myNet && !routeExists(id, nbNet, 24)) {
                window.routingTable[id].push({
                    destination: nbNet, prefix: 24,
                    nextHop: nd.ip, nextHopDevice: nb,
                    iface: d.ip,
                    type: nd.role === 'router' ? 'Static' : 'Direct',
                    viaName: nd.name
                });
            }
        });
    });

    // Propagate — تعلّم شبكات الجيران البعيدين (مثل RIP)
    var changed = true, iterations = 0;
    while (changed && iterations < 20) {
        changed = false; iterations++;
        routers.forEach(function(router) {
            var id    = router.deviceData.id;
            var d     = router.deviceData;
            var myNet = getNetworkAddress(d.ip, d.subnet || '255.255.255.0');
            getNeighbors(router).forEach(function(nb) {
                if (nb.deviceData.role !== 'router') return;
                var nbId = nb.deviceData.id;
                (window.routingTable[nbId] || []).forEach(function(nbRoute) {
                    if (nbRoute.destination === myNet) return;
                    if (!routeExists(id, nbRoute.destination, nbRoute.prefix)) {
                        window.routingTable[id].push({
                            destination: nbRoute.destination, prefix: nbRoute.prefix,
                            nextHop: nb.deviceData.ip, nextHopDevice: nb,
                            iface: d.ip, type: 'Static', viaName: nb.deviceData.name
                        });
                        changed = true;
                    }
                });
            });
        });
    }

    var total = routers.reduce(function(s, r) {
        return s + (window.routingTable[r.deviceData.id] || []).length;
    }, 0);

    if (typeof logEvent === 'function')
        logEvent('success', '✅ Auto-Route — ' + total + ' routes على ' + routers.length + ' router');

    return total;
}

/* ===== Lookup Route ===== */
function lookupRoute(router, destIp) {
    var table = window.routingTable[router.deviceData.id];
    if (!table || table.length === 0) return null;
    var best = null;
    table.forEach(function(route) {
        if (ipInNetwork(destIp, route.destination, route.prefix))
            if (!best || route.prefix > best.prefix) best = route;
    });
    return best;
}

/* ===== اسم الجهاز من IP ===== */
function getDeviceNameByIp(ip) {
    for (var i = 0; i < devices.length; i++) {
        if (devices[i].deviceData.ip === ip) return devices[i].deviceData.name;
    }
    return null;
}

function formatNextHop(route) {
    if (!route.nextHop) return '<span style="color:#30c896">directly connected</span>';
    var name = route.viaName || getDeviceNameByIp(route.nextHop);
    return '<span style="color:#7d8590">' + route.nextHop +
           (name ? ' <span style="color:#484f58;font-size:9px">(' + name + ')</span>' : '') +
           '</span>';
}

/* ===== واجهة Routing Panel ===== */
function showRoutingPanel() {
    var old = document.getElementById('routing-panel');
    if (old) { old.remove(); return; }

    var routers = devices.filter(function(d) { return d.deviceData.role === 'router'; });
    if (routers.length === 0) { showToast('لا يوجد Router في الشبكة', 'error'); return; }

    var panel = document.createElement('div');
    panel.id = 'routing-panel';
    panel.style.cssText = [
        'position:fixed','top:62px','right:20px','width:560px',
        'max-height:78vh','overflow-y:auto','background:#0d1117',
        'border:1px solid rgba(77,159,255,0.35)','border-radius:10px',
        'z-index:999998','font-family:JetBrains Mono,monospace',
        'box-shadow:0 8px 40px rgba(0,0,0,0.7)','animation:toastIn 0.2s ease'
    ].join(';');

    var isConfigured = routers.some(function(r) {
        var t = window.routingTable[r.deviceData.id]; return t && t.length > 0;
    });

    panel.innerHTML =
        // Header
        '<div id="routing-drag-handle" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(77,159,255,0.2);background:#161b22;border-radius:10px 10px 0 0;cursor:move">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
                '<span style="color:#4d9fff;font-size:10px;letter-spacing:2px;font-weight:700">ROUTING</span>' +
                '<span id="routing-status-badge" style="' + badgeStyle(isConfigured) + '">' + (isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED') + '</span>' +
            '</div>' +
            '<button id="routing-close-btn" style="background:transparent;border:none;color:#484f58;font-size:16px;cursor:pointer">✕</button>' +
        '</div>' +

        // Toolbar
        '<div style="padding:12px 16px;border-bottom:1px solid rgba(77,159,255,0.1);background:rgba(77,159,255,0.03);display:flex;align-items:center;gap:10px">' +
            '<button id="btn-auto-route" style="background:rgba(77,159,255,0.15);color:#4d9fff;border:1px solid rgba(77,159,255,0.4);border-radius:7px;padding:8px 18px;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:1px">⚡ Auto-Route</button>' +
            '<button id="btn-reset-routes" style="background:rgba(255,95,95,0.08);color:#ff5f5f;border:1px solid rgba(255,95,95,0.25);border-radius:7px;padding:8px 14px;font-family:JetBrains Mono,monospace;font-size:11px;cursor:pointer">🗑 Reset</button>' +
            '<span id="auto-route-result" style="font-size:10px;color:#484f58;flex:1"></span>' +
        '</div>' +

        // Table content
        '<div id="routing-table-content" style="padding:12px 16px;display:flex;flex-direction:column;gap:14px"></div>';

    document.body.appendChild(panel);
    renderRoutingTable(routers);

    // Auto-Route
    document.getElementById('btn-auto-route').addEventListener('click', function() {
        var total = autoRoute();
        document.getElementById('auto-route-result').innerHTML =
            '<span style="color:#30c896">✅ ' + total + ' routes على ' + routers.length + ' routers</span>';
        updateBadge(true);
        renderRoutingTable(routers);
        showToast('✅ Auto-Route اكتمل', 'success');
    });

    // Reset
    document.getElementById('btn-reset-routes').addEventListener('click', function() {
        showConfirmToast('مسح جميع الـ Routes؟ الـ Ping سيفشل حتى تعيد Auto-Route', function() {
            window.routingTable = {};
            document.getElementById('auto-route-result').innerHTML =
                '<span style="color:#ff5f5f">🗑 تم مسح جميع الـ Routes</span>';
            updateBadge(false);
            renderRoutingTable(routers);
            if (typeof logEvent === 'function') logEvent('warn', '🗑 Routing Table cleared');
        });
    });

    document.getElementById('routing-close-btn').addEventListener('click', function() { panel.remove(); });

    setTimeout(function() {
        document.addEventListener('mousedown', function handler(e) {
            if (!panel.contains(e.target) && e.target.id !== 'btn-routing') {
                panel.remove();
                document.removeEventListener('mousedown', handler);
            }
        });
    }, 150);

    makeDraggable(panel, document.getElementById('routing-drag-handle'));
    if (typeof logEvent === 'function') logEvent('info', '📋 Routing Panel opened');
}

function badgeStyle(configured) {
    return configured
        ? 'background:rgba(48,200,150,0.15);color:#30c896;font-size:9px;padding:2px 8px;border-radius:10px;border:1px solid rgba(48,200,150,0.3)'
        : 'background:rgba(255,95,95,0.15);color:#ff5f5f;font-size:9px;padding:2px 8px;border-radius:10px;border:1px solid rgba(255,95,95,0.3)';
}

function updateBadge(configured) {
    var badge = document.getElementById('routing-status-badge');
    if (!badge) return;
    badge.style.cssText = badgeStyle(configured);
    badge.textContent   = configured ? 'CONFIGURED' : 'NOT CONFIGURED';
}

/* ===== رسم الجدول ===== */
function renderRoutingTable(routers) {
    var content = document.getElementById('routing-table-content');
    if (!content) return;
    content.innerHTML = '';

    routers.forEach(function(router) {
        var d      = router.deviceData;
        var routes = window.routingTable[d.id] || [];
        var configured = routes.length > 0;

        var card = document.createElement('div');
        card.style.cssText = 'background:#161b22;border:1px solid rgba(77,159,255,0.2);border-radius:8px;overflow:hidden';

        card.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(77,159,255,0.08);border-bottom:1px solid rgba(77,159,255,0.15)">' +
                '<div style="display:flex;align-items:center;gap:8px">' +
                    '<span style="width:8px;height:8px;border-radius:50%;background:' + (configured?'#30c896':'#ff5f5f') + ';display:inline-block"></span>' +
                    '<span style="color:#e6edf3;font-size:12px;font-weight:700">' + d.name + '</span>' +
                    '<span style="color:#484f58;font-size:10px">|</span>' +
                    '<span style="color:#4d9fff;font-size:11px">' + d.ip + '</span>' +
                '</div>' +
                '<span style="color:' + (configured?'#30c896':'#ff5f5f') + ';font-size:9px;letter-spacing:1px">' +
                    (configured ? routes.length + ' ROUTES' : 'NO ROUTES') + '</span>' +
            '</div>';

        if (routes.length === 0) {
card.innerHTML += '<div style="padding:10px 12px;text-align:center;color:#484f58;font-size:10px">● NO ROUTES</div>';        } else {
            var html = '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
                '<thead><tr style="background:rgba(255,255,255,0.03)">' +
                    '<th style="padding:6px 12px;text-align:left;color:#484f58;font-size:9px;letter-spacing:1px">DESTINATION</th>' +
                    '<th style="padding:6px 12px;text-align:left;color:#484f58;font-size:9px;letter-spacing:1px">NEXT HOP</th>' +
                    '<th style="padding:6px 12px;text-align:left;color:#484f58;font-size:9px;letter-spacing:1px">TYPE</th>' +
                '</tr></thead><tbody>';

            routes.forEach(function(route, idx) {
                var typeColor = route.type === 'Direct' ? '#30c896' : '#4d9fff';
                var bg = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
                html += '<tr style="border-top:1px solid rgba(255,255,255,0.04);background:' + bg + '">' +
                    '<td style="padding:7px 12px;color:#e6edf3">' + route.destination + '/' + route.prefix + '</td>' +
                    '<td style="padding:7px 12px">' + formatNextHop(route) + '</td>' +
                    '<td style="padding:7px 12px"><span style="color:' + typeColor + ';font-size:9px;padding:2px 6px;border-radius:4px;border:1px solid ' + typeColor + '33;background:' + typeColor + '11">' + route.type + '</span></td>' +
                '</tr>';
            });

            html += '</tbody></table>';
            card.innerHTML += html;
        }

        content.appendChild(card);
    });
}

/* ===== مسح عند Clear الشبكة ===== */
function clearRoutingTable() { window.routingTable = {}; }

/* ===== Drag ===== */
function makeDraggable(panel, handle) {
    if (!handle) return;
    var dragging = false, startX, startY, startRight, startTop;
    handle.addEventListener('mousedown', function(e) {
        if (e.target.id === 'routing-close-btn') return;
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        startRight = parseInt(panel.style.right) || 20;
        startTop   = parseInt(panel.style.top)   || 62;
        e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        panel.style.right = (startRight - (e.clientX - startX)) + 'px';
        panel.style.top   = (startTop   + (e.clientY - startY)) + 'px';
    });
    document.addEventListener('mouseup', function() { dragging = false; });
}

/* ===== تصدير ===== */
window.showRoutingTable  = showRoutingPanel;
window.showRoutingPanel  = showRoutingPanel;
window.autoRoute         = autoRoute;
window.lookupRoute       = lookupRoute;
window.clearRoutingTable = clearRoutingTable;
window.getNetworkAddress = getNetworkAddress;
window.ipInNetwork       = ipInNetwork;