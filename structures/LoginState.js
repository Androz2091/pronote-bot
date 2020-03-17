const puppeteer = require("puppeteer");
const { get } = require("request-promise");
const { writeFileSync } = require("fs");

module.exports = class LoginState {

    constructor(bot, instaUsername){
        this.bot = bot;
        this.instaUsername = instaUsername;
        this.step = "username";
        this.username = null;
        this.password = null;
    }

    setUsername(username){
        this.username = username.toLowerCase();
        this.step = "password";
    }

    setPassword(password){
        this.password = password;
        this.step = "verify";
    }

    verify(){
        /*return new Promise(async resolve => {
           
    
            // Login
            await page.goto(this.bot.config.entLoginURL);
            await page.type("#username", this.username);
            await page.type("#password", this.password);
            let navPromise = page.waitForNavigation({ waitUntil: "networkidle0" });
            await page.$eval("#button-submit", form => form.click());
            await navPromise;

            this.verified = page.url().startsWith(this.bot.config.entHomePageURL);
            resolve(this.verified);

            // Fetch profile picture
            navPromise = this.page.waitForNavigation({ waitUntil: "networkidle0" });
            await this.page.goto(this.bot.config.pronoteURL);
            await navPromise;
            const pictureURL = await this.page.evaluate(() => {
                return $("body").find("img")[1].src;
            });
            const imageRequest = await get({
                url: pictureURL,
                encoding: null
            });
            const imgBuffer = Buffer.from(imageRequest, "binary");
            writeFileSync(`./images/${this.name}.png`, imgBuffer);
            this.browser.close();
        });*/
        return new Promise(async (resolve, reject) => {
            const browser = await puppeteer.launch({ args: [ "--no-sandbox" ] });
            const page = await browser.newPage();
            // Login
            let navPromise = page.waitForSelector("#username", {
                timeout
            });
            await page.goto(this.config.entLoginURL);
            navPromise.then(async () => {
                await page.type("#username", this.username);
                await page.type("#password", this.password);
                this.bot.logger.log(`Credentials typed. (session=${this.username})`, "debug");
                navPromise = page.waitForNavigation({
                    waitUntil: "networkidle0",
                    timeout
                });
                await page.$eval("#button-submit", form => form.click());
                this.verified = page.url().startsWith(this.bot.config.entHomePageURL);
                resolve(this.verified);
    
                // Fetch profile picture
                navPromise = page.waitForNavigation({
                    waitUntil: "networkidle0"
                });
                await this.page.goto(this.bot.config.pronoteURL);
                await navPromise;
                const pictureURL = await page.evaluate(() => {
                    return $("body").find("img")[1].src;
                });
                const imageRequest = await get({
                    url: pictureURL,
                    encoding: null
                });
                const imgBuffer = Buffer.from(imageRequest, "binary");
                writeFileSync(`./images/${this.username}.png`, imgBuffer);
                browser.close();
            }).catch(async () => {
                await browser.close();
                reject("unreachable (step=verify)");
            });
        });
    }

}