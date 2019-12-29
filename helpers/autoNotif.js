const { CronJob } = require("cron");
const getMoyennes = require("../pronote/getMoyennes");
const InstaUser = require("../instagram/InstaUser");
const logger = require("../helpers/logger");
const beautify = require("json-beautify");
const fs = require("fs");
const reload = require("require-reload")(require);
const { promisify } = require("util");
const write = promisify(fs.writeFile);

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

module.exports.init = async (ig) => {
    const autoNotif = async () => {
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
            if(!credCache){
                credCache = {
                    insta: cred.insta,
                    lastMoyenne: moyennes.moyNormale
                };
                cache.push(credCache);
                await write("./cache.json", beautify(cache, null, 2, 100), "utf-8");
                reload("../cache.json");
                logger.log("Base cache saved. (session="+cred.username+")");
            }
            logger.log("Averages retrieved. (session="+cred.username+")");
            if(credCache.lastMoyenne !== moyennes.moyPluri){
                let finalString = `🔔PronoteBot [process.all]\n\nVotre moyenne est passée de ${credCache.lastMoyenne} à ${moyennes.moyPluri}.\n`;
                logger.log("Differences detected. (session="+cred.username+")");
                if(moyennes.diff.length > 0){
                    logger.log("Subject differences detected. (session="+cred.username+")");
                    finalString += `Liste matières modifiées (${moyennes.diff.length}) :\n\n`;
                    moyennes.diff.forEach((m) => {
                        finalString += m.matiere+" | "+m.ancienneMoyenne+" => "+m.nouvelleMoyenne+"\n"+
                        ((parseFloat(m.nouvelleMoyenne.replace(",", "."))-parseFloat(m.ancienneMoyenne.replace(",", ".")) > 0) ?
                        "Augmentation de "+String((parseFloat(m.nouvelleMoyenne.replace(",", "."))-parseFloat(m.ancienneMoyenne.replace(",", "."))).toFixed(2)).replace(".", ",")+" point(s)." :
                        "Baisse de "+String((parseFloat(m.nouvelleMoyenne.replace(",", "."))-parseFloat(m.ancienneMoyenne.replace(",", "."))).toFixed(2)).replace(".", ",")+" point(s).")
                    });
                } else {
                    logger.log("No subject differences detected. (session="+cred.username+")");
                }
                let user = new InstaUser(cred.insta, ig);
                user.send(finalString);
                cache.find((c) => c.insta === cred.insta).lastMoyenne = moyennes.moyPluri;
                await write("./cache.json", beautify(cache, null, 2, 100), "utf-8");
                logger.log("New cache saved. (session="+cred.username+")");
                logger.log("-----------END------- (session="+cred.username+")");
                return;
            } else {
                logger.log("No differences. (session="+cred.username+")");
                logger.log("-----------END------- (session="+cred.username+")");
                return;
            }
        });
        logger.log("-----------END------- (session=ALL)");
    };
    autoNotif();
    new CronJob("55 16 15 * * *", autoNotif, null, true, "Europe/Paris");
};