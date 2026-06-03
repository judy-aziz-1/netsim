/**
 * Device Manager Module
 */

/* ===== Global Variables ===== */
if (typeof linkStartDevice === 'undefined') {
    window.linkStartDevice = null;
    window.selectedDevice = null;
    window.selectedTargetDevice = null;
    window.deviceCounters = { pc: 0, router: 0, switch: 0, iphone: 0 };
}

/* ===== Create Device ===== */
function createDeviceSprite(scene, x, y, typeKey) {

    if (scene.input && !scene.input.enabled) {
        scene.input.enabled = true;
    }

    var sprite = scene.add.sprite(x, y, typeKey);
    sprite.anchor.set(0.5);
    sprite.inputEnabled = true;
    sprite.input.enableDrag(true);

    // ترقيم منفصل لكل نوع
    // عدّ كل الأجهزة من نفس النوع بغض النظر عن اسمها
    var countOfType = 0;
    devices.forEach(function(d) {
        if (d.deviceData && d.deviceData.type === typeKey) {
            countOfType++;
        }
    });
    var deviceName = typeKey.charAt(0).toUpperCase() + typeKey.slice(1) + ' ' + (countOfType + 1);

   sprite.deviceData = {
        id:      Date.now(),
        type:    typeKey,
        role:    typeKey,
        name:    deviceName,
        ip:      generateIP(),
        mac:     generateMAC(),
        subnet:  '255.255.255.0',
        gateway: '',
        connections: []
    };

    /* ===== Click ===== */
    sprite.events.onInputDown.add(function(s, pointer) {
        if (pointer.button === 2) return;
        if (pointer.shiftKey) {
            deleteDevice(s);
            return;
        }
        onDeviceClicked(s);
    }, this);

    /* ===== Double Click ===== */
    var lastClickTime = 0;
    sprite.events.onInputDown.add(function(s, pointer) {
        if (pointer.button !== 0) return;
        var now = Date.now();
        if (now - lastClickTime < 350) {
            hideDeviceTooltip();
            showEditPanel(sprite);
        }
        lastClickTime = now;
    });

    /* ===== Mouse Up ===== */
    sprite.events.onInputUp.add(function(s, pointer) {
        if (pointer.button === 2) {
            showPingContextMenu(s, pointer);
        }
        s.input.dragging = false;
    }, this);

    /* ===== Drag Start ===== */
    sprite.events.onDragStart.add(function(s, pointer) {
        if (pointer.shiftKey) {
            s.input.dragging = false;
            return false;
        }
        if (window.linkStartDevice && window.linkStartDevice !== s) {
            s.input.dragging = false;
            return false;
        }
        
        return true;
    }, this);

    /* ===== Drag Update ===== */
    sprite.events.onDragUpdate.add(function() {
        updateLinksForSprite(sprite);
        var tip = document.getElementById('device-tooltip');
        if (tip) {
            var rect = document.getElementById('editorCanvas').getBoundingClientRect();
            tip.style.left = (rect.left + sprite.x) + 'px';
            tip.style.top  = (rect.top  + sprite.y - 110) + 'px';
        }
    });

    /* ===== Drag Stop ===== */
    sprite.events.onDragStop.add(function() {
        updateLinksForSprite(sprite);
        sprite.input.dragging = false;
    });

    /* ===== Tooltip ===== */
    sprite.events.onInputOver.add(function() {
        showDeviceTooltip(sprite);
    });

    sprite.events.onInputOut.add(function() {
        hideDeviceTooltip();
    });

    /* ===== Label ===== */
    var label = editorScene.add.text(sprite.x, sprite.y + 38, sprite.deviceData.name, {
        font: '11px JetBrains Mono',
        fill: '#7d8590',
        align: 'center'
    });
    label.anchor.set(0.5, 0);
    sprite._label = label;

    /* ===== Spawn Animation ===== */
    sprite.scale.set(0);
    var scaleTarget = 0.6;
    var scaleStep = 0;
    var spawnInterval = setInterval(function() {
        scaleStep += 0.08;
        var s = Math.min(scaleStep, scaleTarget);
        sprite.scale.set(s);
        if (s >= scaleTarget) clearInterval(spawnInterval);
    }, 16);

    devices.push(sprite);
    updateStatusBar();
    if (typeof logEvent === 'function') logEvent('info', '➕ ' + deviceName + ' added');
    return sprite;
}

/* ===== Add Device ===== */
function addDevice(type, scene) {
    if (!scene) return;
    var x = game.input.activePointer.x;
    var y = game.input.activePointer.y;
    createDeviceSprite(scene, x, y, type);
}

/* ===== Add Device At ===== */
function addDeviceAt(type, scene, x, y) {
    if (!scene) return;
    createDeviceSprite(scene, x, y, type);
}

/* ===== Device Click Logic ===== */
function onDeviceClicked(sprite) {

    if (window.linkStartDevice && window.linkStartDevice !== sprite) {
        window.linkStartDevice.tint = 0xffffff;
    }
    var oldLinkMenu = document.getElementById('link-context-menu');
    if (oldLinkMenu) oldLinkMenu.remove();
   

    if (window.linkStartDevice === sprite) {
        sprite.tint = 0xffffff;
        window.linkStartDevice = null;
        return;
    }

    if (!window.linkStartDevice) {
        window.linkStartDevice = sprite;
        sprite.tint = 0x66ccff;
        return;
    }

    if (window.linkStartDevice !== sprite) {
        if (!linkExists(window.linkStartDevice, sprite)) {
            addLink(window.linkStartDevice, sprite);
        }
        window.linkStartDevice.tint = 0xffffff;
        sprite.tint = 0xffffff;
        window.linkStartDevice = null;
    }
}

/* ===== Delete Device ===== */
function deleteDevice(sprite) {
    if (typeof logEvent === 'function') logEvent('warn', '🗑 ' + sprite.deviceData.name + ' deleted');

    if (typeof stopPing === 'function') stopPing();
    hideDeviceTooltip();

    var panel = document.getElementById('device-edit-panel');
    if (panel) panel.remove();

    for (var i = links.length - 1; i >= 0; i--) {
        var L = links[i];
        if (L.a === sprite || L.b === sprite) {
            var other = (L.a === sprite) ? L.b : L.a;
            if (other.deviceData && other.deviceData.connections) {
                other.deviceData.connections = other.deviceData.connections.filter(function(n) {
                    return n !== sprite;
                });
            }
            if (L.g) L.g.destroy();
            if (L.hit) L.hit.destroy();
            links.splice(i, 1);
        }
    }

    var idx = devices.indexOf(sprite);
    if (idx !== -1) devices.splice(idx, 1);

    if (sprite._label && sprite._label.destroy) sprite._label.destroy();
    if (sprite.destroy) sprite.destroy();

    if (window.linkStartDevice === sprite) window.linkStartDevice = null;
    if (window.selectedDevice === sprite) window.selectedDevice = null;
    if (window.selectedTargetDevice === sprite) window.selectedTargetDevice = null;

    updateStatusBar();
}

/* ===== Context Menu ===== */
function showPingContextMenu(device, pointer) {

    var oldMenu = document.getElementById('ping-context-menu');
    if (oldMenu) oldMenu.remove();
    var oldLinkMenu = document.getElementById('link-context-menu');
    if (oldLinkMenu) oldLinkMenu.remove();
    hideDeviceTooltip();

    var mouseX = window.event ? window.event.clientX : (pointer.clientX || 0);
    var mouseY = window.event ? window.event.clientY : (pointer.clientY || 0);

    var menu = document.createElement('div');
    menu.id = 'ping-context-menu';
    menu.style.left = mouseX + 'px';
    menu.style.top  = mouseY + 'px';
    menu.className  = 'context-menu';

    var sourceOption = document.createElement('div');
    sourceOption.className = 'context-item';
    sourceOption.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#30c896;margin-left:8px;vertical-align:middle"></span> Set as Source';
    sourceOption.onclick = function(e) {
        e.stopPropagation();
        setAsSource(device);
        menu.remove();
    };

    var targetOption = document.createElement('div');
    targetOption.className = 'context-item';
    targetOption.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff5f5f;margin-left:8px;vertical-align:middle"></span> Set as Target';
    targetOption.onclick = function(e) {
        e.stopPropagation();
        setAsTarget(device);
        menu.remove();
    };

    menu.appendChild(sourceOption);
    menu.appendChild(targetOption);
    document.body.appendChild(menu);

    setTimeout(function() {
        document.addEventListener('click', function() {
            if (menu && menu.parentNode) menu.remove();
        }, { once: true });
    }, 10);

    if (window.event) window.event.preventDefault();
}

/* ===== Source ===== */
function setAsSource(device) {
    if (window.linkStartDevice) {
        window.linkStartDevice.tint = 0xffffff;
        window.linkStartDevice = null;
    }
    if (window.selectedDevice && window.selectedDevice !== device) {
        window.selectedDevice.tint = 0xffffff;
    }
    window.selectedDevice = device;
    device.tint = 0x30c896;
    if (typeof logEvent === 'function') logEvent('info', '🎯 Source: ' + device.deviceData.name);
    updateStatusBar();
}

/* ===== Target ===== */
function setAsTarget(device) {
    if (window.linkStartDevice) {
        window.linkStartDevice.tint = 0xffffff;
        window.linkStartDevice = null;
    }
    if (!window.selectedDevice) {
        window.selectedDevice = device;
        device.tint = 0x30c896;
        updateStatusBar();
        return;
    }
    if (window.selectedDevice === device) {
        device.tint = 0xffffff;
        window.selectedDevice = null;
        if (window.selectedTargetDevice) {
            window.selectedTargetDevice.tint = 0xffffff;
            window.selectedTargetDevice = null;
        }
        updateStatusBar();
        return;
    }
    if (window.selectedTargetDevice && window.selectedTargetDevice !== device) {
        window.selectedTargetDevice.tint = 0xffffff;
    }
    window.selectedTargetDevice = device;
    device.tint = 0xff5f5f;
    if (typeof logEvent === 'function') logEvent('info', '🎯 Target: ' + device.deviceData.name);
    updateStatusBar();
}

/* ===== Tooltip ===== */
function showDeviceTooltip(sprite) {
    hideDeviceTooltip();
    var d = sprite.deviceData;
    var rect = document.getElementById('editorCanvas').getBoundingClientRect();
    var x = rect.left + sprite.x;
    var y = rect.top  + sprite.y - 110;

    var tip = document.createElement('div');
    tip.id = 'device-tooltip';
    tip.innerHTML =
        '<div class="tip-name">' + d.name + '</div>' +
        '<div class="tip-row"><span class="tip-label">IP</span><span class="tip-val">' + d.ip + '</span></div>' +
        '<div class="tip-row"><span class="tip-label">MAC</span><span class="tip-val">' + d.mac + '</span></div>' +
        '<div class="tip-row"><span class="tip-label">Type</span><span class="tip-val">' + d.type + '</span></div>';

    tip.style.cssText = [
        'position:fixed',
        'left:' + x + 'px',
        'top:' + y + 'px',
        'transform:translateX(-50%)',
        'background:#161b22',
        'border:1px solid rgba(48,200,150,0.35)',
        'border-radius:8px',
        'padding:10px 14px',
        'z-index:999999',
        'pointer-events:none',
        'white-space:nowrap',
        'min-width:220px',
        'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
        'animation:toastIn 0.15s ease'
    ].join(';');

    document.body.appendChild(tip);
}

function hideDeviceTooltip() {
    var old = document.getElementById('device-tooltip');
    if (old) old.remove();
}

/* ===== Status Bar ===== */
function updateStatusBar() {
    var sd = document.getElementById('stat-devices');
    var sl = document.getElementById('stat-links');
    var ss = document.getElementById('stat-source');
    var st = document.getElementById('stat-target');

    if (sd) sd.textContent = 'Devices: ' + (devices ? devices.length : 0);
    if (sl) sl.textContent = 'Links: '   + (links   ? links.length   : 0);

    if (ss) {
        if (window.selectedDevice) {
            ss.textContent = 'Source: ' + window.selectedDevice.deviceData.name;
            ss.className = 'active';
        } else {
            ss.textContent = 'Source: —';
            ss.className = '';
        }
    }
    if (st) {
        if (window.selectedTargetDevice) {
            st.textContent = 'Target: ' + window.selectedTargetDevice.deviceData.name;
            st.className = 'active';
        } else {
            st.textContent = 'Target: —';
            st.className = '';
        }
    }
}

/* ===== Clear All ===== */
function clearAll() {
    if (typeof stopPing === 'function') stopPing();
    if (typeof logEvent === 'function') logEvent('warn', '🗑 Workspace cleared');

    for (var i = devices.length - 1; i >= 0; i--) {
        var d = devices[i];
        if (d._label && d._label.destroy) d._label.destroy();
        if (d.destroy) d.destroy();
    }
    devices.length = 0;

    for (var j = links.length - 1; j >= 0; j--) {
        var L = links[j];
        if (L.g   && L.g.destroy)   L.g.destroy();
        if (L.hit && L.hit.destroy) L.hit.destroy();
    }
    links.length = 0;

    window.linkStartDevice    = null;
    window.selectedDevice     = null;
    window.selectedTargetDevice = null;
    window.selectedLink       = null;
    window.deviceCounters     = { pc: 0, router: 0, switch: 0, iphone: 0 };

    updateStatusBar();
}

/* ===== Edit Panel ===== */
function showEditPanel(sprite) {
    var old = document.getElementById('device-edit-panel');
    if (old) old.remove();

    var d    = sprite.deviceData;
    var rect = document.getElementById('editorCanvas').getBoundingClientRect();
    var px   = Math.min(rect.left + sprite.x + 20, window.innerWidth - 280);
    var py   = Math.max(rect.top  + sprite.y - 60, 60);

    var panel = document.createElement('div');
    panel.id = 'device-edit-panel';
    panel.style.cssText = [
        'position:fixed',
        'left:' + px + 'px',
        'top:'  + py + 'px',
        'width:240px',
        'background:#161b22',
        'border:1px solid rgba(48,200,150,0.3)',
        'border-radius:10px',
        'padding:16px',
        'z-index:999999',
        'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
        'animation:toastIn 0.15s ease',
        'font-family:JetBrains Mono,monospace'
    ].join(';');

    var roleOptions = ['pc','router','switch','iphone'].map(function(r) {
        return '<option value="' + r + '"' + (d.role === r ? ' selected' : '') + '>' +
            (r === 'pc' ? 'PC / Endpoint' : r === 'router' ? 'Router' : r === 'switch' ? 'Switch' : 'Mobile') +
        '</option>';
    }).join('');

    var subnetOptions = [
        ['255.255.255.0', '/24 — 255.255.255.0'],
        ['255.255.0.0',   '/16 — 255.255.0.0'],
        ['255.0.0.0',     '/8  — 255.0.0.0']
    ].map(function(s) {
        return '<option value="' + s[0] + '"' + (d.subnet === s[0] ? ' selected' : '') + '>' + s[1] + '</option>';
    }).join('');

    var inputStyle = 'width:100%;background:#0d1117;border:1px solid rgba(48,200,150,0.2);border-radius:6px;padding:8px 10px;color:#e6edf3;font-family:JetBrains Mono,monospace;font-size:12px;outline:none;box-sizing:border-box;transition:border-color .15s';
    var labelStyle = 'display:block;font-size:9px;letter-spacing:1.5px;color:#484f58;text-transform:uppercase;margin-bottom:6px';
    var sectionStyle = 'font-size:9px;letter-spacing:2px;color:#30c896;text-transform:uppercase;font-weight:600;margin:12px 0 8px';

    panel.innerHTML =
        '<div id="edit-drag-handle" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;cursor:move;user-select:none">' +
            '<span style="font-size:10px;letter-spacing:2px;color:#484f58;text-transform:uppercase">&#8285; Edit Device</span>' +
            '<span id="edit-close-btn" style="color:#484f58;cursor:pointer;font-size:14px;line-height:1;padding:2px 6px;border-radius:4px">&#x2715;</span>' +
        '</div>' +

        '<div style="' + sectionStyle + '">Identity</div>' +

        '<div style="margin-bottom:10px">' +
            '<label style="' + labelStyle + '">Name</label>' +
            '<input id="edit-name" type="text" value="' + d.name + '" style="' + inputStyle + '" />' +
        '</div>' +

        '<div style="margin-bottom:10px">' +
            '<label style="' + labelStyle + '">Role</label>' +
            '<select id="edit-role" style="' + inputStyle + ';cursor:pointer">' + roleOptions + '</select>' +
        '</div>' +

        '<div style="height:1px;background:rgba(255,255,255,0.05);margin:12px 0"></div>' +
        '<div style="' + sectionStyle + '">Network</div>' +

        '<div style="margin-bottom:10px">' +
            '<label style="' + labelStyle + '">IP Address</label>' +
            '<input id="edit-ip" type="text" value="' + d.ip + '" style="' + inputStyle + '" />' +
            '<span id="ip-error" style="display:none;font-size:9px;color:#ff5f5f;margin-top:4px"></span>' +
        '</div>' +

        '<div style="margin-bottom:10px">' +
            '<label style="' + labelStyle + '">Subnet Mask</label>' +
            '<select id="edit-subnet" style="' + inputStyle + ';cursor:pointer">' + subnetOptions + '</select>' +
        '</div>' +

        '<div style="margin-bottom:16px">' +
            '<label style="' + labelStyle + '">Default Gateway <span style="color:#484f58;font-size:8px">(optional)</span></label>' +
            '<input id="edit-gateway" type="text" value="' + (d.gateway || '') + '" placeholder="e.g. 192.168.1.1" style="' + inputStyle + '" />' +
            '<span id="gw-error" style="display:none;font-size:9px;color:#ff5f5f;margin-top:4px"></span>' +
        '</div>' +

        '<div style="display:flex;gap:8px">' +
            '<button id="edit-save-btn" style="flex:1;background:rgba(48,200,150,0.12);color:#30c896;border:1px solid rgba(48,200,150,0.3);border-radius:6px;padding:8px;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:600;cursor:pointer;letter-spacing:.5px">Save</button>' +
            '<button id="edit-cancel-btn" style="flex:1;background:#0d1117;color:#7d8590;border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:8px;font-family:JetBrains Mono,monospace;font-size:11px;cursor:pointer">Cancel</button>' +
        '</div>';

    document.body.appendChild(panel);

var nameInput    = document.getElementById('edit-name');
    var ipInput      = document.getElementById('edit-ip');
    var gwInput      = document.getElementById('edit-gateway');
    var subnetInput  = document.getElementById('edit-subnet');
    var roleInput    = document.getElementById('edit-role');
    var ipError      = document.getElementById('ip-error');
    var gwError      = document.getElementById('gw-error');
    // Focus
    setTimeout(function() { nameInput.focus(); nameInput.select(); }, 50);
    
    // تغيير Subnet تلقائياً عند تغيير IP
    ipInput.addEventListener('input', function() {
        var val = ipInput.value.trim();
        var first = parseInt(val.split('.')[0]);
        if (isNaN(first)) return;
        if (first >= 1 && first <= 126) {
            subnetInput.value = '255.0.0.0';
        } else if (first >= 128 && first <= 191) {
            subnetInput.value = '255.255.0.0';
        } else if (first >= 192 && first <= 223) {
            subnetInput.value = '255.255.255.0';
        }
    });

[nameInput, ipInput, gwInput].forEach(function(inp) {
            inp.addEventListener('focus', function() {
            inp.style.borderColor = 'rgba(48,200,150,0.6)';
        });
        inp.addEventListener('blur', function() {
            inp.style.borderColor = 'rgba(48,200,150,0.2)';
        });
        inp.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });
        inp.addEventListener('keydown', function(e) {
            e.stopPropagation();
            if (e.key === 'Enter')  document.getElementById('edit-save-btn').click();
            if (e.key === 'Escape') closePanel();
        });
    });
    // Validate IP
    function validateIP(ip) {
        var parts = ip.split('.');
        if (parts.length !== 4) return false;
        return parts.every(function(p) {
            var n = parseInt(p);
            return !isNaN(n) && n >= 0 && n <= 255 && p !== '';
        });
    }

    // Save
    document.getElementById('edit-save-btn').addEventListener('click', function() {
        var newName = nameInput.value.trim();
        var newIP   = ipInput.value.trim();
        var newGW   =  gwInput.value.trim();
        var valid   = true;

        if (!newName) {
            nameInput.style.borderColor = '#ff5f5f';
            valid = false;
        } else {
            nameInput.style.borderColor = 'rgba(48,200,150,0.2)';
        }

        if (!validateIP(newIP)) {
            ipInput.style.borderColor = '#ff5f5f';
            ipError.textContent = 'Invalid IP — use format: 192.168.1.1';
            ipError.style.display = 'block';
            valid = false;
        } else {
            ipInput.style.borderColor = 'rgba(48,200,150,0.2)';
            ipError.style.display = 'none';
        }

        if (newGW && !validateIP(newGW)) {
            gwInput.style.borderColor = '#ff5f5f';
            gwError.textContent = 'Invalid Gateway IP';
            gwError.style.display = 'block';
            valid = false;
        } else {
            gwInput.style.borderColor = 'rgba(48,200,150,0.2)';
            gwError.style.display = 'none';
        }

        if (!valid) return;

        d.name    = newName;
        d.ip      = newIP;
        d.subnet  = subnetInput.value;
        d.gateway = newGW;
        d.role    = roleInput.value;
        if (sprite._label) sprite._label.setText(newName);
        if (typeof logEvent === 'function') logEvent('info', '✏️ ' + newName + ' — IP: ' + newIP);

        panel.remove();
        if (typeof showToast === 'function') showToast('تم الحفظ', 'success');
        updateStatusBar();
    });

 function closePanel() {
        panel.remove();
    }

    document.getElementById('edit-cancel-btn').addEventListener('click', closePanel);
    document.getElementById('edit-close-btn').addEventListener('click', closePanel);

    // إغلاق عند الضغط خارج النافذة
    setTimeout(function() {
        document.addEventListener('mousedown', function handler(e) {
            if (!panel.contains(e.target)) {
                closePanel();
                document.removeEventListener('mousedown', handler);
            }
        });
    }, 150);

    // Drag to Move
    var handle = document.getElementById('edit-drag-handle');
    var dragging = false;
    var startX, startY, startLeft, startTop;

    handle.addEventListener('mousedown', function(e) {
        dragging = true;
        startX    = e.clientX;
        startY    = e.clientY;
        startLeft = parseInt(panel.style.left);
        startTop  = parseInt(panel.style.top);
        e.preventDefault();
        e.stopPropagation();
    });

    document.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        panel.style.left = (startLeft + e.clientX - startX) + 'px';
        panel.style.top  = (startTop  + e.clientY - startY) + 'px';
    });

    document.addEventListener('mouseup', function() {
        dragging = false;
    });
}
/* ===== Save Topology ===== */
function saveTopology() {
    var old = document.getElementById('save-name-panel');
    if (old) old.remove();

    var panel = document.createElement('div');
    panel.id = 'save-name-panel';
    panel.style.cssText = [
        'position:fixed','top:62px','left:50%',
        'transform:translateX(-50%)',
        'background:#161b22',
        'border:1px solid rgba(48,200,150,0.35)',
        'border-radius:10px','padding:16px 20px',
        'z-index:999999','font-family:JetBrains Mono,monospace',
        'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
        'animation:toastIn 0.15s ease',
        'display:flex','gap:10px','align-items:center'
    ].join(';');

    panel.innerHTML =
        '<span style="font-size:10px;letter-spacing:1px;color:#484f58">NAME</span>' +
        '<input id="save-topo-name" type="text" placeholder="My Topology" value="Topology ' + new Date().toLocaleDateString() + '" ' +
        'style="background:#0d1117;border:1px solid rgba(48,200,150,0.3);border-radius:6px;padding:7px 10px;color:#e6edf3;font-family:JetBrains Mono,monospace;font-size:12px;outline:none;width:200px">' +
        '<button id="save-topo-btn" style="background:rgba(48,200,150,0.15);color:#30c896;border:1px solid rgba(48,200,150,0.4);border-radius:6px;padding:7px 14px;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:600;cursor:pointer">Save</button>' +
        '<button id="save-topo-cancel" style="background:transparent;color:#484f58;border:none;cursor:pointer;font-size:16px;padding:0 4px">✕</button>';

    document.body.appendChild(panel);

    var inp = document.getElementById('save-topo-name');
    setTimeout(function() { inp.focus(); inp.select(); }, 50);

    inp.addEventListener('keydown', function(e) {
        e.stopPropagation();
        if (e.key === 'Enter') document.getElementById('save-topo-btn').click();
        if (e.key === 'Escape') panel.remove();
    });

    document.getElementById('save-topo-cancel').addEventListener('click', function() {
        panel.remove();
    });

    document.getElementById('save-topo-btn').addEventListener('click', function() {
        var name = inp.value.trim();
        if (!name) { inp.style.borderColor = '#ff5f5f'; return; }

        var topoData = {
            version: 1,
            devices: devices.map(function(d) {
return { type: d.deviceData.type, role: d.deviceData.role, name: d.deviceData.name, ip: d.deviceData.ip, mac: d.deviceData.mac, subnet: d.deviceData.subnet, gateway: d.deviceData.gateway, x: d.x, y: d.y };            }),
            links: links.map(function(L) {
                return { a: devices.indexOf(L.a), b: devices.indexOf(L.b) };
            })
        };

        fetch('editor/php/topology.ajax.php?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, json: topoData })
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success) {
                panel.remove();
                showToast('Saved: ' + name, 'success');
                if (typeof logEvent === 'function') logEvent('success', '💾 Topology saved: ' + name);
            } else {
                showToast(res.error || 'Save failed', 'error');
            }
        })
        .catch(function() {
            showToast('Connection error', 'error');
        });
    });
}

/* ===== Load Topology ===== */
function loadTopology(data) {
    if (!data || !data.devices) {
        showToast('ملف غير صالح', 'error');
        return;
    }
    clearAll();
    data.devices.forEach(function(dData) {
        var sprite = createDeviceSprite(editorScene, dData.x, dData.y, dData.type);
        sprite.deviceData.name    = dData.name;
        sprite.deviceData.ip      = dData.ip;
        sprite.deviceData.mac     = dData.mac;
        sprite.deviceData.subnet  = dData.subnet  || '255.255.255.0';
        sprite.deviceData.gateway = dData.gateway || '';
        sprite.deviceData.role    = dData.role    || dData.type;
        if (sprite._label) sprite._label.setText(dData.name);
        sprite.scale.set(0.6);
    });
    setTimeout(function() {
        if (data.links) {
            data.links.forEach(function(lData) {
                var a = devices[lData.a];
                var b = devices[lData.b];
                if (a && b && !linkExists(a, b)) addLink(a, b);
            });
        }
        updateStatusBar();
        if (typeof logEvent === 'function') logEvent('success', '📂 Topology loaded');
        if (typeof showToast === 'function') showToast('Topology loaded', 'success');
    }, 200);
}