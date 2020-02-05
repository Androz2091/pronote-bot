const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const {
    entLoginURL,
    entHomePageURL,
    entMessagesURL
} = require("../config.json");
const logger = require("../helpers/logger");
const Message = require("../structures/Message");

module.exports = async (username, password) => {
    return new Promise(async (resolve, reject) => {
        let browser = await puppeteer.launch({
            args: ["--no-sandbox"],
            headless: true
        });
        let page = await browser.newPage();
        logger.log("Browser opened. (session=" + username + ")", "info");
        await page.setExtraHTTPHeaders({
            "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8"
        });
        logger.log("User agent defined. (ssesion=" + username + ")");

        // Login
        await page.goto(entLoginURL);
        await page.type("#username", username);
        await page.type("#password", password);
        logger.log("Credentials typed. (session=" + username + ")");
        let navPromise = page.waitForNavigation({
            waitUntil: "networkidle0",
            timeout: 0
        });
        await page.$eval("#button-submit", form => form.click());
        await navPromise;
        page.on("console", msg => console.log("PAGE LOG:", msg.text()));
        if (page.url().startsWith(entHomePageURL)) {
            logger.log(`Connected to the ENT (session=${username})`);
            await page.goto(entMessagesURL, {
                waitUntil: "networkidle0"
            });
            logger.log(`On the messages page (session=${username})`);
            let pageContent = await page.content();
            let lastMessage = new Message(pageContent, username);
            resolve(lastMessage);
        } else {
            reject("Login error");
        }
    });
};
