const { get } = require("request-promise");

module.exports = class InstaUser {

    constructor(username, ig){
        this.username = username;
        this.ig = ig;
    }

    async fetchID(){
        this.id = await this.ig.user.getIdByUsername(this.username);
    }

    async fetchThread(){
        this.thread = this.ig.entity.directThread([this.id.toString()]);
    }

    async send(content){
        if(!this.id) await this.fetchID();
        if(!this.thread) await this.fetchThread();
        await this.thread.broadcastText(content);
        return true;
    }

    async sendImage(imgBuffer){
        if(!this.id) await this.fetchID();
        if(!this.thread) await this.fetchThread();
        await this.thread.broadcastPhoto({ file: imgBuffer });
        return true;
    }

    // Whether the user is logged
    get logged() {
        return Boolean(require("../credentials.json").find((i) => i.insta === this.username));
    }

    // The user credentials
    get credentials() {
        return require("../credentials.json").find((i) => i.insta === this.username);
    }

};