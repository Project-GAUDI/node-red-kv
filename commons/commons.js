const net = require("net");
const retryMax = 5;

module.exports.makeCommand = function(node, data = null) {
    let commandStr = `${node.mode} ${node.deviceType}${node.deviceNo}`;
    if (node.dataFormat) {
        commandStr += `.${node.dataFormat}`;
    }
    switch (node.mode) {
        case "RDS":
            commandStr += ` ${node.readNo}`;
            break;
        case "WR":
            commandStr += ` ${data}`;
            break;
        case "WRS":
            commandStr += ` ${data.length}`;
            data.forEach(function (value) {
                commandStr += ` ${value}`;
            });
            break;
    }
    return `${commandStr}\r`;
}

module.exports.sendCommand = function(node, ip, port, command, count = 1) {
    return sendMessage(node, ip, port, command)
        .then(function (ans) {
            return Promise.resolve(ans);
        })
        .catch(function (err) {
            if (count < retryMax) {
                node.log("An error occured, Retrying.");
                return module.exports.sendCommand(node, ip, port, command, count + 1);
            } else {
                return Promise.reject(err);
            }
        });
}

function sendMessage(node, ip, port, command) {
    return new Promise(function (resolve, reject) {
        const client = net.connect(port, ip, function () {
            node.log(`Connected. (IP:${ip}, PORT:${port})`);
            client.write(Buffer.from(command));
            node.log("Command sent.");
        });

        // タイムアウトを10秒に設定
        client.setTimeout(10000);

        client.on("data", function (data) {
            let ans = data.toString().replace("\r\n", "");
            node.log(`Received Response. (${ans})`);
            client.destroy();
            resolve(ans);
        });

        client.on("error", function (err) {
            node.log(`Connection error occurred: ${err.message}`);
            client.destroy();
            reject(err);
        });

        client.on("timeout", function () {
            node.log("Connection timeout occurred");
            client.destroy();
            reject(new Error("Connection timeout"));
        });
    });
}