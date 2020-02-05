const logger = require("../helpers/logger");
const fetchMessage = require("../pronote/fetchMessage");
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
        logger.log(`Messages check for ${cred.username} started.`, "info");
        let message = await fetchMessage(
            cred.username,
            cred.password
        ).catch(() => {});
        logger.log(`Messages retrieved. (session=${cred.username})`);
        if (message.mustBeSent) {
            logger.log(`New message detected. (session=${cred.username})`);
            let user = new InstaUser(cred.insta, igClient);
            user.send(message.formatted);
        } else {
            logger.log(`No new messages detected. (session=${cred.username})`);
        }
        message.saveIt();
        logger.log(
            `Messages check for ${cred.username} ended in ${Date.now() -
                userStartAt}ms.`,
            "info"
        );
    });
    logger.log(`Messages check ended in ${Date.now() - startAt}ms.`, "info");
};

module.exports.infos = {
    cron: [
        // Tous les jours à 16h
        "00 00 16 * * *"
    ],
    runOnStart: false
};
