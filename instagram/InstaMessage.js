const InstaUser = require("./InstaUser");

module.exports = class InstaMessage {

    constructor(data, ig){
        this.author = new InstaUser(data.message.split(":")[0], ig);
        this.content = data.message.split(":").slice(1, data.message.split(":").length).join(":").trim();
    }

    async reply(content){
        this.author.send(content);
    }

    async replyImage(fileURL){
        this.author.sendImage(fileURL);
    }

};