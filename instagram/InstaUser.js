const { get } = require("request-promise");

module.exports = class InstaUser {
    constructor(bot, userID, ig) {
        this.bot = bot;
        this.id = userID;
        this.ig = ig;
        this.thread = this.ig.entity.directThread([this.id]);
    }

    async send(content) {
        await this.thread.broadcastText(content);
        return true;
    }

    async fetchID() {
        this.id = await this.ig.user.getIdByUsername(this.id);
        this.thread = this.ig.entity.directThread([this.id]);
        return;
    }

    async fetchInfo() {
        if (!this.id) return false;
        let rawInfos = await this.ig.user.info(this.id);
        this.username = rawInfos.username;
        return true;
    }

    async sendImage(imgBuffer) {
        await this.thread.broadcastPhoto({ file: imgBuffer });
        return true;
    }

    async sendLink(message, link){
        await this.thread.broadcastLink(message, [link]);
        return true;
    }

    // Whether the user is logged
    get logged() {
        return this.bot.students.some((student) => student.instaUsername === this.username);
    }

    // The user credentials
    get student() {
        return this.bot.students.find((student) => student.instaUsername === this.username);
    }
};
