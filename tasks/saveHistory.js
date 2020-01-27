const logger = require("../helpers/logger");
const { asyncForEach } = require("../helpers/functions");
const fetchEleve = require("../pronote/fetchEleve");

module.exports.run = async () => {
    let startAt = Date.now();
    logger.log("Starting save history.", "info");

    // Charge tous les identifiants
    let credentials = require("../credentials.json");

    await asyncForEach(credentials, async cred => {
        let userStartAt = Date.now();
        logger.log(`Auto-history for ${cred.username} started.`, "info");
        let student = await fetchEleve(cred);
        student.saveHistory();
        logger.log(
            `Auto-history for ${cred.username} ended in ${Date.now() -
                userStartAt}ms.`,
            "info"
        );
    });
    logger.log(
        "Auto-history ended in " + (Date.now() - startAt) + "ms.",
        "info"
    );
};

module.exports.infos = {
    cron: [
        // Tous les jours à minuit
        "00 00 00 * * *"
    ],
    runOnStart: false
};
