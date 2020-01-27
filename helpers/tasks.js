const fs = require("fs").promises;
const CronJob = require("cron").CronJob;
const logger = require("./logger");

const tasks = [];

module.exports = async igClient => {
    // Chargement des tâches
    let tasksFiles = await fs.readdir("./tasks/");
    tasksFiles.forEach(file => {
        let task = require(`../tasks/${file}`);
        task.infos.cron.forEach(cron => {
            new CronJob(
                cron,
                () => {
                    task.run(igClient);
                },
                null,
                true,
                "Europe/Paris"
            );
        });
        if(task.infos.fbnsEvents){
            task.infos.fbnsEvents.forEach((e) => {
                igClient.fbns.on(e, () => {
                    task.run(igClient);
                });
            });
        }
        task.name = file.split(".")[0];
        tasks.push(task);
    });
    logger.log(`${tasksFiles.length} tasks loaded.`, "info");

    // Lancement des tâches
    tasks.forEach(task => {
        if (
            task.infos.runOnStart &&
            (!process.options["no-run-start"] ||
                !process.options["no-run-start"].includes(task.name))
        ) {
            logger.log(`${task.name} automatically started.`);
            task.run(igClient);
        } else if (
            process.options["run-tasks"] &&
            process.options["run-tasks"].includes(task.name)
        ) {
            logger.log(`${task.name} started (force-mode).`);
            task.run(igClient);
        }
    });
};
