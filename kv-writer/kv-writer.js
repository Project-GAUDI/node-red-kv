module.exports = function (RED) {
    const commons = require("../commons/commons");
    const util = require('util');

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
            try{
                checkInputMsg(msg);
            }catch(err){
                node.error(err,msg);
                node.log(`kv-writer-single.checkInputMsg : ${err}`);
                return;
            }
            let input = msg.payload.data;
            if (node.mode == "WR") {
                sendCommandMultiple(node, ip, port, input)
                    .then(function (ans) {
                        if (ans != "OK") {
                            node.error(ans, msg);
                            node.log(`kv-writer-single.sendCommandMultiple ResponseError : ${ans}`);
                        }
                    })
                    .catch(function (err) {
                        node.error(err, msg);
                        node.log(`kv-writer-single.sendCommandMultiple Error : ${err && err.message ? err.message : err}`);
                    });
            } else {
                let command = commons.makeCommand(node, input);
                commons.sendCommand(node, ip, port, command)
                    .then(function (ans) {
                        if (ans != "OK") {
                            node.error(ans, msg);
                            node.log(`kv-writer-single.sendCommand ResponseError : ${ans}`);
                        }
                    })
                    .catch(function (err) {
                        node.error(err, msg);
                        node.log(`kv-writer-single.sendCommand Error : ${err && err.message ? err.message : err}`);
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
            try{
                checkInputMsg(msg);
            }catch(err){
                node.error(err,msg);
                node.log(`kv-writer-single.checkInputMsg : ${err}`);
                return;
            }
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
                        const utilOpt = {
                            depth: Infinity,
                            breakLength: Infinity,
                            compact: true,
                        };
                        node.error(util.inspect(errMsg,utilOpt), msg);
                        node.log(`kv-writer-multiple.sendCommand or sendCommandMultiple Error : ${util.inspect(errMsg,utilOpt)}`);
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

    function checkInputMsg(msg){
        if(false == ("payload" in msg)){
            throw new Error("msg.payload is not exist.");
        }
        if(false == ("data" in msg.payload)){
            throw new Error("msg.payload.data is not exist.");
        }
        if(false == (Array.isArray(msg.payload.data))){
            throw new Error("msg.payload.data is not Array.");
        }
    }
};
