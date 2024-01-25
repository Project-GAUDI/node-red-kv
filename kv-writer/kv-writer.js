module.exports = function (RED) {
    const commons = require("../commons/commons");

    function KVWriterSingle(config) {
        RED.nodes.createNode(this, config);
        this.ip = config.ip;
        this.port = config.port;
        this.mode = config.mode;
        this.deviceType = config.deviceType;
        this.deviceNo = config.deviceNo;
        this.dataFormat = config.dataFormat;

        let node = this;
        let ip = node.ip;
        let port = node.port;
        node.on("input", function (msg) {
            let input = msg.payload.data;
            if (node.mode == "WR") {
                sendCommandMultiple(node, ip, port, input)
                    .then(function (ans) {
                        if (ans != "OK") {
                            node.error(ans, msg);
                        }
                    })
                    .catch(function (err) {
                        node.error(err, msg);
                    });
            } else {
                let command = commons.makeCommand(node, input);
                commons.sendCommand(node, ip, port, command)
                    .then(function (ans) {
                        if (ans != "OK") {
                            node.error(ans, msg);
                        }
                    })
                    .catch(function (err) {
                        node.error(err, msg);
                    });
            }
        });
    }
    RED.nodes.registerType("kv-writer-single", KVWriterSingle);

    function KVWriterMultiple(config) {
        RED.nodes.createNode(this, config);
        this.mode = config.mode;
        this.deviceType = config.deviceType;
        this.deviceNo = config.deviceNo;
        this.dataFormat = config.dataFormat;
        this.targets = config.targets;

        let node = this;
        let targets = node.targets;
        node.on("input", function (msg) {
            let input = msg.payload.data;
            let errMsg = [];
            Promise
                .allSettled(targets.map(function (target) {
                    if (node.mode == "WR") {
                        return sendCommandMultiple(node, target.ip, target.port, input)
                            .then(function (ans) {
                                if (ans != "OK") {
                                    errMsg.push({
                                        IP: target.ip,
                                        Port: target.port,
                                        Message: ans
                                    });
                                }
                            })
                            .catch(function (err) {
                                errMsg.push({
                                    IP: target.ip,
                                    Port: target.port,
                                    Message: err
                                });
                            });
                    } else {
                        let command = commons.makeCommand(node, input);
                        return commons.sendCommand(node, target.ip, target.port, command)
                            .then(function (ans) {
                                if (ans != "OK") {
                                    errMsg.push({
                                        IP: target.ip,
                                        Port: target.port,
                                        Message: ans
                                    });
                                }
                            })
                            .catch(function (err) {
                                errMsg.push({
                                    IP: target.ip,
                                    Port: target.port,
                                    Message: err
                                });
                            });
                    }}))
                .then(function (ans) {
                    if (errMsg.length > 0) {
                        node.error(JSON.stringify(errMsg), msg);
                    }
                });
        });
    }
    RED.nodes.registerType("kv-writer-multiple", KVWriterMultiple);

    function sendCommandMultiple(node, ip, port, data, index = 0) {
        let command = commons.makeCommand(node, data[index]);
        return commons.sendCommand(node, ip, port, command)
            .then(function (ans) {
                if (ans == "OK" && index < data.length - 1) {
                    return sendCommandMultiple(node, ip, port, data, index + 1);
                } else {
                    return Promise.resolve(ans);
                }
            })
            .catch(function (err) {
                return Promise.reject(err);
            });
    }
};
