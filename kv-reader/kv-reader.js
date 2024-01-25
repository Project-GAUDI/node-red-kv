module.exports = function (RED) {
    const commons = require("../commons/commons");

    function KVReaderSingle(config) {
        RED.nodes.createNode(this, config);
        this.ip = config.ip;
        this.port = config.port;
        this.mode = config.mode;
        this.deviceType = config.deviceType;
        this.deviceNo = config.deviceNo;
        this.dataFormat = config.dataFormat;
        this.readNo = config.readNo;

        let node = this;
        let ip = node.ip;
        let port = node.port;
        node.on("input", function (msg) {
            let command = commons.makeCommand(node);
            commons.sendCommand(node, ip, port, command)
                .then(function (ans) {
                    if (ans == "E0" || ans == "E1") {
                        node.error(ans, msg);
                    } else {
                        msg.payload = ans;
                        node.send(msg);
                    }
                })
                .catch(function (err) {
                    node.error(err, msg);
                });
        });
    }
    RED.nodes.registerType("kv-reader-single", KVReaderSingle);
};
