<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <title>CS4G Network Simulator - Custom Topology Editor</title>
    <script src="js/phaser.min.js"></script>
    <link rel="stylesheet" href="editor/css/editor.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@400;600;700&display=swap" rel="stylesheet">

    <!-- 🔥 CSS Inline للتطبيق الفوري -->
    <style>
        html,
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            width: 100%;
            height: 100%;
        }
    </style>
</head>

<body>

    <!-- Scene Scripts -->
    <script src="editor/js/scene/preload.js"></script>
    <script src="editor/js/scene/create.js"></script>
    <script src="editor/js/scene/update.js"></script>

    <!-- Devices + Links -->
    <script src="editor/js/devices/deviceManager.js"></script>
    <!-- <script src="editor/js/devices/deviceEvents.js"></script> -->
    <script src="editor/js/links/linkManager.js"></script>

    <!-- UI Scripts -->
    <script src="editor/js/ui/dragDrop.js"></script>
    <script src="editor/js/ui/events.js"></script>
    <script src="editor/js/ui/modal.js"></script>
    <script src="editor/js/ui/toolbar.js"></script>
    <script src="editor/js/ui/eventLog.js"></script>

    <!-- Levels -->
    <script src="editor/js/levels/levelLoader.js"></script>
    <script src="editor/js/levels/levelsData.js"></script>

    <!-- Simulation -->
    <script src="editor/js/utils/helpers.js"></script>
    <script src="editor/js/network/ping.js"></script>
    <script src="editor/js/simulation/packetEngine.js"></script>
    <script src="editor/js/simulation/pingTest.js"></script>

    <!-- Config -->
    <script src="editor/js/core/config.js"></script>

    <!-- Global Variables -->
    <script>
        var editorScene = null;
        var dragType = null;
        var dragProxy = null;
        var isDraggingFromToolbar = false;

        var devices = [];
        var links = [];
        var selectedDevice = null;
        var selectedTargetDevice = null; // للـ Ping (هدف)
        var selectedLink = null;
    </script>

    <!-- HTML Elements - يجب أن يكون قبل game.js -->
    <div id="topbar">
        <div class="topbar-left">
            <button id="btn-play">▶</button>
            <button id="btn-pause">⏸</button>
        </div>

        <div class="topbar-right">
            <button id="btn-clear">🗑 Clear</button>
            <button id="btn-save">💾 Save</button>
            <button id="btn-load">📂 Load</button>
            <input id="file-load-input" type="file" accept=".json" style="display:none">
            <button id="btn-ping-top">📡 Ping</button>
            <button id="btn-routing">Routing</button>
            <button id="btn-dos">DoS</button>
            <button id="btn-levels-top">📋 Levels</button>
        </div>
    </div>

    <div id="editorCanvas"></div>
    <div id="statusbar">
        <span id="stat-devices">Devices: 0</span>
        &nbsp;|&nbsp;
        <span id="stat-links">Links: 0</span>
        &nbsp;|&nbsp;
        <span id="stat-source">Source: —</span>
        &nbsp;→&nbsp;
        <span id="stat-target">Target: —</span>
    </div>

    <div id="toolbar">
        <h3>Devices</h3>
        <!-- تأكد أن هذه المسارات صحيحة بالنسبة لموقع الملف -->
        <div class="tool-item" data-device="pc">
            <img src="includes/monitor.png" alt="PC"><span>PC</span>
        </div>

        <div class="tool-item" data-device="router">
            <img src="includes/router.png" alt="Router"><span>Router</span>
        </div>

        <div class="tool-item" data-device="switch">
            <img src="includes/server.png" alt="Switch"><span>Switch</span>
        </div>

        <div class="tool-item" data-device="iphone">
            <img src="includes/iphone-1.png" alt="iphone"><span>iphone</span>
        </div>

        <!-- Event Log -->
        <div id="event-log-section">
            <div class="event-log-header">
                <span>Event Log</span>
                <span id="event-log-clear" title="Clear log">✕</span>
            </div>
            <div id="event-log-body"></div>
        </div>
    </div>

    <!-- تشغيل اللعبة - آخر شيء يتم تحميله -->


    <!-- تشغيل اللعبة - آخر شيء يتم تحميله -->
    <script src="editor/js/core/game.js"></script>

    <script>
        /* ===== متغيرات عامة ===== */
        // تم تعريف المتغيرات بالفعل أعلاه (selectedDevice, selectedTargetDevice, selectedLink, إلخ)
    </script>

</body>

</html>