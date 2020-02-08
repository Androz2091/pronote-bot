const { get } = require("request-promise");

module.exports = class InstaUser {
    constructor(userID, ig) {
        this.id = userID;
        this.ig = ig;
        this.thread = this.ig.entity.directThread([this.id]);
    }

    async send(content) {
        await this.thread.broadcastText(content);
        return true;
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

    // Whether the user is logged
    get logged() {
        return Boolean(
            require("../credentials.json").find(i => i.insta === this.username)
        );
    }

    // The user credentials
    get credentials() {
        return require("../credentials.json").find(
            i => i.insta === this.username
        );
    }
};
