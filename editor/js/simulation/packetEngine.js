/**
 * Packet Engine Module - محرك الحزم
 * 
 * الوصف:
 *   يدير إنشاء وتحريك الدوائر (حزم افتراضية) عبر شبكة الأجهزة.
 *   يتعامل مع رسم الدوائر وتحديث مواضعها كل frame بناءً على مسار معدل خطي.
 * 
 * الميزات:
 *   - إنشاء دوائر افتراضية ملونة (حزم Ping)
 *   - تحريك سلس على طول الوصلات (Linear Interpolation)
 *   - دعم Callbacks عند انتهاء الحركة
 *   - إدارة دورة حياة الحزم (إنشاء → حركة → حذف)
 * 
 * الدوال الرئيسية:
 *   createPacket() - إنشاء دائرة وإضافتها لقائمة الحزم
 *   updatePackets() - تحديث مواضع جميع الحزم (يُستدعى كل frame)
 * 
 */

var packets = [];

function createPacket(fromDevice, toDevice, onComplete) {
    console.log('📦 Creating packet:', fromDevice.deviceData.name, '→', toDevice.deviceData.name);
    
    var circle = game.add.graphics(0, 0);
    circle.beginFill(0x30c896, 0.9);
circle.drawCircle(0, 0, 18);
    circle.endFill();

    var fromX = fromDevice.x;
    var fromY = fromDevice.y;
    var toX = toDevice.x;
    var toY = toDevice.y;

    circle.x = fromX;
    circle.y = fromY;

    if (typeof highlightLink === 'function') {
        highlightLink(fromDevice, toDevice);
    }

    packets.push({
        sprite: circle,
        fromX: fromX,
        fromY: fromY,
        toX: toX,
        toY: toY,
        progress: 0,
        onComplete: onComplete
    });
    
    console.log('  Packets in queue:', packets.length);
}