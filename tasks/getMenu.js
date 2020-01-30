const credentials = require("../credentials.json");
const { exists } = require("fs");
const { promisify } = require("util");
const existsAsync = promisify(exists);
const { getMenuNom } = require("../helpers/functions");
const logger = require("../helpers/logger");

module.exports.run = async () => {
    if (await existsAsync(`./menus/${getMenuNom()}.jpg`)) {
        logger.log("Menu already fetched", "info");
    } else {
        logger.log("Menu will be fetched", "info");
        require("../pronote/fetchMenu")(
            credentials[0].username,
            credentials[0].password
        );
    }
};

module.exports.infos = {
    cron: ["0 0 * * MON"],
    runOnStart: true
};
