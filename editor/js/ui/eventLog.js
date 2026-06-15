/* ===== Event Log System ===== */

function logEvent(type, message) {
    var body = document.getElementById('event-log-body');
    if (!body) return;

    var now = new Date();
    var time = now.getHours().toString().padStart(2,'0') + ':' +
               now.getMinutes().toString().padStart(2,'0') + ':' +
               now.getSeconds().toString().padStart(2,'0');

    var item = document.createElement('div');
    item.className = 'event-item ev-' + type;

    item.innerHTML =
        '<span class="event-time">' + time + '</span>' +
        '<span class="event-msg">' + message + '</span>';

    body.insertBefore(item, body.firstChild);

    // الاحتفاظ بآخر 50 حدث فقط
    while (body.children.length > 50) {
        body.removeChild(body.lastChild);
    }
}

// زر مسح السجل
document.addEventListener('DOMContentLoaded', function() {
    var clearBtn = document.getElementById('event-log-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            var body = document.getElementById('event-log-body');
            if (body) body.innerHTML = '';
        });
    }
});