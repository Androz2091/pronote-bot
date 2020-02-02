const logger = require("../helpers/logger");
const { asyncForEach } = require("../helpers/functions");
const fetchEleve = require("../pronote/fetchEleve");
const InstaUser = require("../instagram/InstaUser");

module.exports.run = async igClient => {
    // Si c'est vendredi ou samedi
    if (
        new Date().getDay() === 5 ||
        new Date().getDay() === 6
    ) {
        return;
    }

    let startAt = Date.now();
    logger.log("Starting summary messages.", "info");

    // Charge tous les identifiants
    let credentials = require("../credentials.json");
    // Garde seulement ceux qui ont les notifications activées
    credentials = credentials.filter(c => c.notif);

    // Pour chaque utilisateur
    await asyncForEach(credentials, async cred => {
        let userStartAt = Date.now();
        logger.log(`Summary messages for ${cred.username} started.`, "info");
        let student = await fetchEleve(cred).catch(() => {});
        if (!student) return;
        let summary = student.getSummary(true);
        if (summary) {
            let user = new InstaUser(cred.insta, igClient);
            user.send(summary);
            logger.log(`Summary message sent to ${cred.username}`, "info");
        }
        logger.log(
            `Summary messages for ${cred.username} ended in ${Date.now() -
                userStartAt} ms.`,
            "info"
        );
    });
    logger.log(`Summary messages ended in ${Date.now() - startAt}ms.`, "info");
};

module.exports.infos = {
    cron: [
        // Tous les jours à 19h15
        "00 15 19 * * *"
    ],
    runOnStart: false
};
