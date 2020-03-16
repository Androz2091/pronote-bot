// Config
const config = require("../config.json");

// Handlers
const DatabaseHandler = require("../handlers/database");
const JobsHandler = require("../handlers/jobs");

// Collection
const Collection = require("@discordjs/collection");

// Login State
const LoginState = require("./LoginState");

module.exports = class PronoteBot {

    constructor(ig){
        this.ig = ig;
        this.instagram = ig.realtime;
        this.config = config;
        this.database = new DatabaseHandler(this);
        this.jobs = new JobsHandler(this);
        this.logger = require("../helpers/logger");
        this.createdAt = Date.now();
        this.listening = false;

        setTimeout(() => {
            this.listening = true;
            this.logger.log("Client is listening.", "info");
            if(!process.options.uninit) this.jobs.get("check-devoirs").execute();
        }, 2000);

        // Load extenders
        require("../helpers/extenders");

        this.userID = null;
        this.cooldowns = new Collection();
        this.loginStates = new Collection();
    }

    async fetchStudents(){
        this.students = await this.database.fetchStudents();
        return this;
    }

    setCooldown(username){
        this.cooldowns.set(username, Date.now()+20000);
    }

    deleteCooldown(username){
        this.cooldowns.delete(username);
    }

    canRunCommand(username){
        const userCooldown = this.cooldowns.get(username);
        return !userCooldown || (userCooldown < Date.now());
    }

    createLoginState(username){
        const loginState = new LoginState(this, username);
        this.loginStates.set(username, loginState);
    }

    getLoginState(username){
        return this.loginStates.get(username);
    }

    clearLoginState(username){
        return this.loginStates.delete(username);
    }

    helpPage({ notifEnabled }){
        const helpPage = 
`Voici la liste des commandes disponibles :
        
!moy (affiche vos moyennes)
!picture (affiche votre photo)
!recap (affiche infos sur la journée)
!notif (active les notifications)
!dénotif (désactive les notifications)

${notifEnabled ? "🔔Notification activées" : "🔕Notification désactivées"}`;
        return helpPage;
    }

    fetchMonday(){
        return [ 5, 6, 0 ].includes(new Date().getDay());
    }

};
