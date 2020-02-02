const logger = require("../helpers/logger");
const { asyncForEach } = require("../helpers/functions");
const InstaUser = require("../instagram/InstaUser");
const { getMenuNom } = require("../helpers/functions");

module.exports.run = async igClient => {
    let startAt = Date.now();
    logger.log("Starting menu messages.", "info");

    // Charge tous les identifiants
    let credentials = require("../credentials.json");
    // Garde seulement ceux qui ont les notifications activées
    credentials = credentials.filter(c => c.notif);

    let menuName = getMenuNom();
    let img = await readFileAsync(
        "./menus/" + menuName.cleanUpSpecialChars() + ".jpg"
    );

    // Pour chaque utilisateur
    await asyncForEach(credentials, async cred => {
        let userStartAt = Date.now();
        logger.log(`Menu messages for ${cred.username} started.`, "info");

        let user = new InstaUser(cred.insta, igClient);
        user.sendImage(Buffer.from(img, "binary"));
        logger.log(`Menu message sent to ${cred.username}`, "info");

        logger.log(
            `Menu messages for ${cred.username} ended in ${Date.now() -
                userStartAt} ms.`,
            "info"
        );
    });
    logger.log(`Menu messages ended in ${Date.now() - startAt}ms.`, "info");
};

module.exports.infos = {
    cron: [
        // Les dimanches à 19h30
        "00 30 19 * * SUN"
    ],
    runOnStart: false
};
