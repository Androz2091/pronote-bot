const { CronJob } = require("cron");
const getMoyennes = require("../pronote/getMoyennes");
const InstaUser = require("../instagram/InstaUser");
const logger = require("../helpers/logger");

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

module.exports.init = (ig) => {
    new CronJob("55 16 15 * * *", async () => {
        logger.log("Auto-check...");
        // Load all credentials
        let credentials = require("../credentials.json");
        // keep only those who have notif enabled
        credentials = credentials.filter((c) => c.notif);
        let cache = require("../cache.json");
        // For each user
        await asyncForEach(credentials, async (cred) => {
            logger.log("Getting cache. (session="+cred.username+")");
            // Get cache
            let credCache = cache.find((c) => c.insta === cred.insta);
            logger.log("Cache retrieved. (session="+cred.username+")");
            let moyennes = await getMoyennes(cred).catch(console.error);
            if(!moyennes) return;
            logger.log("Averages retrieved. (session="+cred.username+")");
            if(credCache.lastMoyenne !== moyennes.moyPluri){
                let finalString = `Votre moyenne est passée de ${credCache.lastMoyenne} à ${moyennes.moyPluri}.`;
                logger.log("Differences detected. (session="+cred.username+")");
                if(moyennes.diff.length > 0){
                    logger.log("Subject differences detected. (session="+cred.username+")");
                    finalString += `Les matières suivantes ont été modifiées :\n\n`;
                    moyennes.diff.forEach((m) => {
                        finalString += m.nom+" | "+m.ancienneMoyenne+" => "+m.nouvelleMoyenne
                    });
                } else {
                    logger.log("No subject differences detected. (session="+cred.username+")");
                }
                let user = new InstaUser(cred.insta, ig);
                user.send(finalString);
            } else {
                logger.log("No differences. (session="+cred.username+")");
            }
        });
        
    }, null, true, "Europe/Paris");
};