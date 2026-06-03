
    /* ===== عنصر الوسيط (drag proxy) ===== */
    function createDragProxy(text, x, y) {
        removeDragProxy();
        dragProxy = document.createElement('div');
        dragProxy.className = 'drag-proxy';
        dragProxy.textContent = text;
        document.body.appendChild(dragProxy);
        moveDragProxy(x, y);
    }

    function moveDragProxy(x, y) {
        if (dragProxy) {
            dragProxy.style.left = x + 'px';
            dragProxy.style.top = y + 'px';
        }
    }

    function removeDragProxy() {
        if (dragProxy && dragProxy.parentNode) {
            dragProxy.parentNode.removeChild(dragProxy);
            dragProxy = null;
        }
    }
