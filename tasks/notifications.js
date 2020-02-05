const logger = require("../helpers/logger");
const fetchEleve = require("../pronote/fetchEleve");
const InstaUser = require("../instagram/InstaUser");
const { asyncForEach } = require("../helpers/functions");

module.exports.run = async igClient => {
    let startAt = Date.now();
    logger.log("Starting notifications check.", "info");

    // Charge tous les identifiants
    let credentials = require("../credentials.json");
    // Garde seulement ceux qui ont les notifications activées
    credentials = credentials.filter(c => c.notif);

    // Pour chaque utilisateur
    await asyncForEach(credentials, async cred => {
        let userStartAt = Date.now();
        logger.log(`Cache check for ${cred.username} started.`, "info");
        let student = await fetchEleve(cred).catch(() => {});
        if (!student) return;
        let diffData = student.getDifferences(true);
        logger.log(`Cache retrieved. (session=${cred.username})`);
        if (diffData.oldGenerale !== diffData.newGenerale) {
            logger.log(`Differences detected. (session=${cred.username})`);
            let finalString = `🔔PronoteBot [process.all]\n\nVotre moyenne est passée de ${diffData.oldGenerale} à ${diffData.newGenerale}.\n`;
            if (diffData.differences.length > 0) {
                logger.log(`Differences detected. (session=${cred.username})`);
                finalString += `Liste matières modifiées (${diffData.differences.length}) :\n\n`;
                let user = new InstaUser(cred.insta, igClient);
                user.send(`${finalString}${diffData.differences.join("\n\n")}`);
            } else {
                logger.log(
                    `No subject differences detected. (session=${cred.username})`
                );
            }
        }
        student.saveCache();
        logger.log(
            `Cache check for ${cred.username} ended in ${Date.now() -
                userStartAt}ms.`,
            "info"
        );
    });
    logger.log(`Cache check ended in ${Date.now() - startAt}ms.`, "info");
};

module.exports.infos = {
    cron: [
        // Tous les jours à 15h15
        "00 15 15 * * *",
        // Tous les jours à 19h30
        "00 30 19 * * *",
        // Tous les jours à 6h30
        "00 30 06 * * *"
    ],
    runOnStart: false
};
