const Job = require("../structures/Job");
const InstaUser = require("../instagram/InstaUser");
const { asyncForEach, delay } = require("../helpers/functions");

module.exports = class CheckDevoirs extends Job {
    constructor(bot) {
        super(bot, {
            time: "0 0 */2 * * *"
        });
    }

    async execute() {
        if(!this.bot.students) return;
        const startAt = Date.now();
        await asyncForEach(this.bot.students, async (student) => {
            await student.initBrowser();
            await student.login(false);
            await student.fetchDevoirs(true, true);
            const user = new InstaUser(this.bot, student.instaUsername, this.bot.ig);
            await user.fetchID();
            if(!user.id) return this.bot.logger.log("Cannot send dm to "+student.instaUsername+"...", "error");
            if(student.devoirs.cache){
                const added = student.devoirs.getDevoirsAdded();
                if(added.length > 0){
                    if(!process.options.debug){
                            user.send(`
Nouveau(x) devoir(s):
        
${added.map((d) => `🔖 ${d.matiere}\n📝 ${d.content.split("\n")[0].replace(":", "")}\n📅 ${d.date}`).join("\n\n")}
                            `);
                            await student.devoirs.saveCache();
                    } else {
                        this.bot.logger.log(added);
                    }
                };
            }
            await delay(3000);
        });
        this.bot.logger.log("Check devoirs ended. (duration="+(Date.now()-startAt)+"ms)", "info");
    }
};