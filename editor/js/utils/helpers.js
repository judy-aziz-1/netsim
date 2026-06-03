function generateIP() {
    return "192.168." + Math.floor(Math.random() * 5 + 1) + "." + Math.floor(Math.random() * 200 + 1);
}

function generateMAC() {
    var hex = function() {
        return Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
    };
    return hex()+':'+hex()+':'+hex()+':'+hex()+':'+hex()+':'+hex();
}   