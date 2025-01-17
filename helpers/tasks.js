const fs = require("fs").promises;
const CronJob = require("cron").CronJob;
const logger = require("./logger");
const { delay } = require("./functions");

const tasks = [];

module.exports = async igClient => {
    await delay(10000);
    // Chargement des tâches
    let tasksFiles = await fs.readdir("./tasks/");
    tasksFiles.forEach(file => {
        let task = require(`../tasks/${file}`);
        task.name = file.split(".")[0];
        task.infos.cron.forEach(cron => {
            new CronJob(
                cron,
                () => {
                    logger.log(
                        "Task " + task.name + " started (cron).",
                        "info"
                    );
                    task.run(igClient);
                },
                null,
                true,
                "Europe/Paris"
            );
        });
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
            if (task.infos.waitBeforeRunStart) {
                setTimeout(() => {
                    logger.log(`${task.name} automatically started.`);
                    task.run(igClient);
                }, task.infos.waitBeforeRunStart);
            } else {
                logger.log(`${task.name} automatically started.`);
                task.run(igClient);
            }
        } else if (
            process.options["run-tasks"] &&
            process.options["run-tasks"].includes(task.name)
        ) {
            logger.log(`${task.name} started (force-mode).`);
            task.run(igClient);
        }
    });
};
