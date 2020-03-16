const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { formatMatiere } = require("../helpers/functions");

const Notes = require("./Notes");
const Devoirs = require("./Devoirs");

module.exports = class Student {

    constructor(handler, data){
        this.handler = handler;
        this.data = data;
        this.config = this.handler.bot.config;
        this.logger = this.handler.bot.logger;

        // base student data (fetched from the database)
        this.instaUsername = data.insta_username;
        this.entUsername = data.ent_username;
        this.entPassword = data.ent_password;
        this.notifEnabled = data.notif_enabled || true;

        // Puppeteer utilities
        this.browser = null;
        this.page = null;
        this.startAt = null;

        // Pronote utilities
        this.listeNotes = null;
        this.pluriNotes = null;
        this.emploiDuTemps = [];

        // Promise Resolvers
        this.startListeningPromise = null;
        this.fetchNotesResolve = null;
        this.fetchNotesCacheNeeded = false;
        this.fetchNotesClose = true;
        this.fetchEmploiDuTempsResolve = null;
        this.fetchEmploiDuTempsClose = true;

        // Parsed results
        this.notes = null;
    }

    async initBrowser(){
        return new Promise(async resolve => {
            this.startAt = Date.now();
            this.browser = await puppeteer.launch({
                args: [ "--no-sandbox" ]
            });
            this.browser.on("disconnected", () => {
                this.logger.log(`Browser closed. (session=${this.entUsername})`, "info");
            });
            this.page = await this.browser.newPage();
            this.logger.log(`Browser opened. (session=${this.entUsername})`, "info");
            resolve(this.page);
            // Once the browser is started, listen for pronote responses
            const promise = new Promise(resolve => {
                this.startListeningPromise = resolve;
            });
            promise.then(() => {
                this.page.on("response", async res => {
                    const resText = await res.text();
                    const resJson = resText.isJson();
                    if(!resJson || !resJson.nom) return;
                    switch(resJson.nom){
                        case "DernieresNotes":
                            this.logger.log(`DernieresNotes response retrieved. (session=${this.entUsername})`, "debug");
                            this.listeNotes = resJson;
                            break;
                        case "PageSuiviPluriannuel":
                            this.logger.log(`PageSuiviPluriannuel response retrieved. (session=${this.entUsername})`, "debug");
                            this.pluriNotes = resJson;
                            break;
                        case "PageEmploiDuTemps":
                            const emploiDuTempsCount = this.emploiDuTemps.length;
                            this.logger.log(`EDT response retrieved. (n=${emploiDuTempsCount}) (session=${this.entUsername})`, "debug");
                            this.emploiDuTemps.push(value);
                            break;
                    }
                    if(this.listeNotes && this.pluriNotes && this.fetchNotesResolve){
                        this.notes = new Notes(this, this.listeNotes, this.pluriNotes);
                        if(this.fetchNotesCacheNeeded){
                            await this.notes.fetchCache();
                        }
                        if(this.fetchNotesClose){
                            await this.browser.close();
                        }
                        this.fetchNotesResolve();
                    }
                    if(this.emploiDuTemps.length === (this.fetchMonday ? 2 : 1) && this.fetchEmploiDuTempsResolve){
                        if(this.fetchEmploiDuTempsClose){
                            await this.browser.close();
                        }
                        this.fetchEmploiDuTempsResolve();
                    }
                });
            });
        });
    }

    get fetchMonday(){
        return this.handler.bot.fetchMonday();
    }

    async login(){
        return new Promise(async resolve => {
            // Login
            let navPromise = this.page.waitForNavigation({
                waitUntil: "networkidle0",
                timeout: 0
            });
            await this.page.goto(this.config.entLoginURL);
            await navPromise;
            await this.page.type("#username", this.entUsername);
            await this.page.type("#password", this.entPassword);
            this.logger.log(`Credentials typed. (session=${this.entUsername})`, "debug");
            navPromise = this.page.waitForNavigation({
                waitUntil: "networkidle0",
                timeout: 0
            });
            await this.page.$eval("#button-submit", form => form.click());
            await navPromise;
            resolve(this.page);
        });
    }

    async fetchDevoirs(cache = true, closeBrowser = true){
        return new Promise(async resolve => {
            const navPromise = this.page.waitForNavigation({
                waitUntil: "networkidle0",
                timeout: 0
            });
            this.page.goto("https://adrienne-bolland.ecollege.haute-garonne.fr/sg.do?PROC=TRAVAIL_A_FAIRE&ACTION=AFFICHER_ELEVES_TAF&filtreAVenir=true");
            await navPromise;
            const $ = cheerio.load(await this.page.content());
            const devoirsLength = $(".js-taf__content").length;
            const devoirs = [];
            for(let i = 0; i < devoirsLength; i++){
                devoirs.push({
                    matiere: formatMatiere($(".js-taf__content").get(i).children[1].children[1].children[1].children[0].data.trim()),
                    content: $(".js-taf__content").get(i).children[1].children[1].children[3].children[0].data.trim()
                });
            }
            this.devoirs = new Devoirs(this, devoirs);
            if(cache){
                await this.devoirs.fetchCache();
            }
            resolve(this.devoirs);
            if(closeBrowser) await this.browser.close();
        });
    }

    async pronote(){
        return new Promise(async resolve => {
            this.logger.log(`Going to pronote. (session=${this.entUsername})`, "debug");
            const navPromise = this.page.waitForNavigation({
                waitUntil: "networkidle0",
                timeout: 0
            });
            await this.page.goto(this.config.pronoteURL);
            await navPromise;
            this.startListeningPromise();
            resolve(this.page);
        });
    }

    async fetchPicture(closeBrowser = true){
        return new Promise(async resolve => {
            const pictureURL = await this.page.evaluate(() => {
                return $("body").find("img")[1].src;
            });
            this.pictureURL = pictureURL;
            resolve(pictureURL);
            if(closeBrowser) await this.browser.close();
        });
    }

    async fetchEmploiDuTemps(closeBrowser = true){
        return new Promise(async resolve => {
            this.fetchEmploiDuTempsResolve = resolve;
            this.fetchEmploiDuTempsClose = closeBrowser;
            this.page.evaluate(async () => {
                $("body")
                    .find("[id='GInterface.Instances[0].Instances[1]_Combo2']")
                    .click();
                setTimeout(() => {
                    $("body")
                        .find("[aria-label='Suivi pluriannuel']")
                        .click();
                    setTimeout(() => {
                        $("body")
                            .find(
                                "[id='GInterface.Instances[0].Instances[1]_Combo5']"
                            )
                            .click();
                    }, 1000);
                }, 500);
            });
            if (this.fetchMonday) {
                logger.log(`Fetching monday... (session=${this.entUsername})`, "debug");
                const semaine = calculatedCoordonnees.find(
                    s => s.numeroSemaine === currentNumeroSemaine
                ).coordonnees;
                this.page.mouse.click(semaine.x, semaine.y);
            }
            if(this.emploiDuTemps.length === (this.fetchMonday ? 2 : 1)){
                resolve(this.emploiDuTemps);
                if(closeBrowser) await this.browser.close();
            }
        });
    }

    async fetchNotes(cache = true, closeBrowser = true){
        return new Promise(async resolve => {
            this.page.evaluate(async () => {
                $("body")
                    .find("[id='GInterface.Instances[0].Instances[1]_Combo2']")
                    .click();
                setTimeout(() => {
                    $("body")
                    .find("[aria-label='Suivi pluriannuel']")
                    .click();
                }, 200);
            });
            this.fetchNotesResolve = resolve;
            this.fetchNotesCacheNeeded = cache;
            this.fetchNotesClose = closeBrowser;
            if(this.listeNotes && this.pluriNotes){
                this.notes = new Notes(this, this.listeNotes, this.pluriNotes);
                if(cache){
                    await this.notes.fetchCache();
                }
                resolve({
                    listeNotes: this.listeNotes,
                    pluriNotes: this.pluriNotes
                });
                if(closeBrowser) await this.browser.close();
            }
        });
    }

    async setNotif(boolean){
        await this.handler.query(`
            UPDATE FROM students
            SET notif_enabled = ${boolean}
            WHERE insta_username = '${this.instaUsername}';
        `);
        this.notifEnabled = boolean;
    }

    async old(){
        await this.handler.query(`
            INSERT INTO old_students
            (insta_username, ent_username, ent_password) VALUES
            ('${this.insta  }', '${this.entUsername}', '${this.entPassword}');
        `);
        await this.handler.query(`
            DELETE FROM students
            WHERE insta_username = '${this.instaUsername}';
        `);
        return this;
    }

    // Insert the student in the database
    async insert() {
        await this.handler.query(`
            INSERT INTO students
            (insta_username, ent_username, ent_password, notif_enabled) VALUES
            ('${this.instaUsername}', '${this.entUsername}', '${this.entPassword}', true);
        `);
        return this;
    }

}