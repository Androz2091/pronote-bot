const { CronJob } = require("cron");
const fetchStudent = require("../pronote/fetchStudent");
const logger = require("./logger");

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

module.exports.init = async () => {
    const autoHistory = async () => {
        let startAt = Date.now();
        logger.log("Starting auto-history.", "info");
        // Load all credentials
        let credentials = require("../credentials.json");
        // For each user
        await asyncForEach(credentials, async (cred) => {
            let userStartAt = Date.now();
            logger.log("Auto-history for "+cred.username+" started.", "info");
            let student = await fetchStudent(cred);
            student.saveHistory();
            logger.log("Auto-history for "+cred.username+" ended in "+(Date.now()-userStartAt)+"ms.", "info");
        });
        logger.log("Auto-history ended in "+(Date.now()-startAt)+"ms.");
    };
    // Executer quand le bot se lance
    if(process.argv.includes('--save-history')) autoHistory();
    // Tous les jours à minuit
    new CronJob("00 00 00 * * *", autoHistory, null, true, "Europe/Paris");
};