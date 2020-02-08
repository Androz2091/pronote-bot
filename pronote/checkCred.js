const puppeteer = require("puppeteer");
const { entLoginURL, entHomePageURL } = require("../config.json");

module.exports = async (username, password) => {
    return new Promise(async (resolve) => {
        let browser = await puppeteer.launch({ args: ["--no-sandbox"] });
        let page = await browser.newPage();

        // Login
        await page.goto(entLoginURL);
        await page.type("#username", username);
        await page.type("#password", password);
        let navPromise = page.waitForNavigation({
            waitUntil: "networkidle0",
            timeout: 0
        });
        await page.$eval("#button-submit", form => form.click());
        await navPromise;
        if (page.url().startsWith(entHomePageURL)) {
            page.browser().close();
            resolve(true);
        } else {
            page.browser().close();
            resolve(false);
        }
    });
};
