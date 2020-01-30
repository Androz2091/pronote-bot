const puppeteer = require("puppeteer");
const { entLoginURL, entHomePageURL, entMenuURL } = require("../config.json");
const logger = require("../helpers/logger");
const { get } = require("request-promise");
const { promisify } = require("util");
const { writeFile } = require("fs");
const writeFileAsync = promisify(writeFile);
const Jimp = require("jimp");

module.exports = async (username, password) => {
    return new Promise(async (resolve, reject) => {
        let browser = await puppeteer.launch({
            args: ["--no-sandbox"]
        });
        let page = await browser.newPage();
        logger.log("Browser opened. (session=" + username + ")", "info");

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
        if (page.url().startsWith(entHomePageURL)) {
            logger.log(`Connected to the ENT (session=${username})`);
            await page.goto(entMenuURL, {
                waitUntil: "networkidle0"
            });
            await page.screenshot({ path: "./testd.png" });
            logger.log(`On the menu page (session=${username})`);
            await page.addScriptTag({
                url: "https://code.jquery.com/jquery-3.4.1.min.js"
            });
            navPromise = page.waitForNavigation({
                waitUntil: "networkidle0"
            });
            await page.evaluate(() => {
                $("#js-listeArticles")
                    .get(0)
                    .children[1].children[0].children[0].children[0].click();
            });
            await navPromise;
            await page.addScriptTag({
                url: "https://code.jquery.com/jquery-3.4.1.min.js"
            });
            let imgURL = await page.evaluate(async () => {
                return $(".panel--outlined").get(0).children[3].children[0]
                    .children[0].src;
            });
            let url = await page.url();
            let menuDate =
                url
                    .split("menu-de-la-semaine-du-")[1]
                    .split(new Date().getFullYear())[0] +
                new Date().getFullYear();
            const imageRequest = await get({ url: imgURL, encoding: null });
            let imgBuffer = Buffer.from(imageRequest, "binary");
            await writeFileAsync(`./menus/${menuDate}_full.png`, imgBuffer);
            Jimp.read(`./menus/${menuDate}_full.png`)
                .then(image => {
                    image
                        .crop(50, 333, 2200, 900)
                        .write(`./menus/${menuDate}.jpg`);
                })
                .catch(err => {
                    console.error(err);
                });
            logger.log("Menu successfully updated.", "info");
            resolve(menuDate);
        } else {
            reject("Login error");
        }
    });
};
