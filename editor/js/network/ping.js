function ping(source, target) {
    let visited = new Set();

    function dfs(node) {
        if (node === target) return true;
        visited.add(node);

        for (let neighbor of node.deviceData.connections) {
            if (!visited.has(neighbor)) {
                if (dfs(neighbor)) return true;
            }
        }
        return false;
    }

    return dfs(source);
}