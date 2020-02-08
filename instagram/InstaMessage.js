const InstaUser = require("./InstaUser");

module.exports = class InstaMessage {
    constructor(data, ig) {
        this.author = new InstaUser(data.user_id, ig);
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
        console.log("marked");
    }
};
