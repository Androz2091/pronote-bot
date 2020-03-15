const { join, parse } = require("path");
const klaw = require("klaw");
const Collection = require("@discordjs/collection");

module.exports = class Jobs extends Collection {
    constructor(bot) {
        super();
        this.bot = bot;
        this.init();
    }

    init() {
        const start = Date.now();

        klaw(join(__dirname, "..", "jobs"))
            .on("data", item => {
                const file = parse(item.path);
                if (!file.ext || file.ext !== ".js") return;

                const Job = (r => r.default || r)(
                    require(join(file.dir, file.base))
                );
                const job = new Job(this.bot);

                this.set(file.name, job);
            })
            .on("end", () => {
                this.bot.logger.log(
                    `Loaded ${this.size} Jobs in ${Date.now() - start}ms`
                );
            });
    }
};