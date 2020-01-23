const { CronJob } = require("cron");
const fetchEleve = require("../pronote/fetchEleve");
const InstaUser = require("../instagram/InstaUser");
const logger = require("./logger");

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

module.exports.init = async (ig) => {
    const autoNotif = async (usernames) => {
        let startAt = Date.now();
        logger.log("Starting cache check.", "info");
        // Load all credentials
        let credentials = require("../credentials.json");
        // keep only those who have notif enabled
        credentials = (usernames ? credentials.filter((c) => usernames.includes(c.username)) : credentials.filter((c) => c.notif));
        // For each user
        await asyncForEach(credentials, async (cred) => {
            let userStartAt = Date.now();
            logger.log("Cache check for "+cred.username+" started.", "info");
            let student = await fetchEleve(cred).catch(() => {});
            if(!student) return;
            let diffData = student.getDifferences();
            logger.log('Cache retrieved. (session='+cred.username+')');
            if(diffData.oldGenerale !== diffData.newGenerale){
                logger.log("Differences detected. (session="+cred.username+")");
                let finalString = `🔔PronoteBot [process.all]\n\nVotre moyenne est passée de ${diffData.oldGenerale} à ${diffData.newGenerale}.\n`;
                if(diffData.differences.length > 0){
                    logger.log("Differences detected. (session="+cred.username+")");
                    finalString += `Liste matières modifiées (${diffData.differences.length}) :\n\n`;
                    let user = new InstaUser(cred.insta, ig);
                    user.send(`${finalString}${diffData.differences.join('\n\n')}`);
                } else {
                    logger.log("No subject differences detected. (session="+cred.username+")");
                }
            }
            student.saveCache();
            logger.log("Cache check for "+cred.username+" ended in "+(Date.now()-userStartAt)+"ms.", "info");
        });
        logger.log("Cache check ended in "+(Date.now()-startAt)+"ms.", "info");
    };
    // Notifier quand le bot se lance
    if (process.options["checkfor"]){
        autoNotif(process.options["checkfor"]);
    } else if (!process.options["no-check-launch"]) {
        autoNotif();
    }
    // Notifier à 15h15
    new CronJob("00 15 15 * * *", autoNotif, null, true, "Europe/Paris");
    // Notifier à 19h30
    new CronJob("00 30 19 * * *", autoNotif, null, true, "Europe/Paris");
    // Notifier à 6h30
    new CronJob("00 30 06 * * *", autoNotif, null, true, "Europe/Paris");
};