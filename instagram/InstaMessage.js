const InstaUser = require("./InstaUser");

module.exports = class InstaMessage {
    constructor(bot, data, ig) {
        this.bot = bot;
        this.author = new InstaUser(bot, data.user_id, ig);
        this.authorID = data.user_id;
        this.id = data.item_id;
        this.thread = data.thread_id;
        this.date = data.timestamp;
        this.content = (data.text || (data.link ? data.link.text : null));
        this.ig = ig;
    }

    async reply(content) {
        this.author.send(content);
    }

    async replyImage(imgBuffer) {
        this.author.sendImage(imgBuffer);
    }

    async markAsSeen() {
        this.ig.directThread.markItemSeen(this.thread, this.id);
    }
};
