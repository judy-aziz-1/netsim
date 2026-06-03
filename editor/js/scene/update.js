 function updateDeviceLabels() {
        if (!devices) return;
        devices.forEach(function(d) {
            if (d && d._label) {
                d._label.x = d.x;
                d._label.y = d.y + 38;
            }
        });
    }
 function updatePackets() {
    for (var i = packets.length - 1; i >= 0; i--) {
        var p = packets[i];
        p.progress += 0.01;

        p.sprite.x = Phaser.Math.linear(p.fromX, p.toX, p.progress);
        p.sprite.y = Phaser.Math.linear(p.fromY, p.toY, p.progress);

        if (p.progress >= 1) {
            console.log('✓ Packet delivery complete');
            if (typeof p.onComplete === 'function') {
                p.onComplete();
            }
            if (p.sprite && p.sprite.destroy) {
                p.sprite.destroy();
            }
            packets.splice(i, 1);
        }
    }
}

/* ===== تحديث الوصلات أثناء السحب (معالج إضافي) ===== */
function updateDraggedDeviceLinks() {
    // ابحث عن أي جهاز يتم سحبه وحدّث وصلاته
    if (devices && devices.length > 0) {
        devices.forEach(function(d) {
            if (d && d.input && d.input.dragging) {
                // تحديث الوصلات للجهاز المسحوب
                if (typeof updateLinksForSprite === 'function') {
                    updateLinksForSprite(d);
                }
            }
        });
    }
}
 function update() {
    updatePackets();
    updateDraggedDeviceLinks();
    updateDeviceLabels();
}