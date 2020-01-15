const InstaUser = require("./InstaUser");

module.exports = class InstaMessage {

    constructor(data, ig){
        this.author = new InstaUser(data.message.split(":")[0], ig);
        this.content = data.message.split(":").slice(1, data.message.split(":").length).join(":").trim();
        this.ig = ig;
    }

    async reply(content){
        this.author.send(content);
    }

    async replyImage(fileURL){
        this.author.sendImage(fileURL);
    }

    async markAsSeen(){
        this.author.fetchID();
        this.ig.feed.directInbox().items().then((items) => {
            let thread = items.find((i) => i.users.length === 1 && i.users[0].pk === this.author.id);
            let item = thread.items.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))[0];
            this.ig.directThread.markItemSeen(thread.thread_id, item.item_id);
        });
    }

};