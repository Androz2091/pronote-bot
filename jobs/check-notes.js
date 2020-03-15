
const Job = require("../structures/Job");
const InstaUser = require("../instagram/InstaUser");
const { asyncForEach, delay } = require("../helpers/functions");

module.exports = class CheckNotes extends Job {
    constructor(bot) {
        super(bot, {
            time: "0 0 */9 * * *"
        });
    }

    async execute() {
    }
};