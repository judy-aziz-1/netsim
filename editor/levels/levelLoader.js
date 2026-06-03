function loadLevel(key) {
    console.log('Loading level:', key);

    if (key === 'ping') {
        addDeviceAt('pc', editorScene, 200, 200);
        addDeviceAt('pc', editorScene, 500, 200);
    }

    if (key === 'routing') {
        addDeviceAt('router', editorScene, 300, 200);
        addDeviceAt('router', editorScene, 600, 300);
    }

    if (key === 'dos') {
        addDeviceAt('pc', editorScene, 200, 200);
        addDeviceAt('pc', editorScene, 400, 200);
        addDeviceAt('pc', editorScene, 600, 200);
    }
}