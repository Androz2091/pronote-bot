const puppeteer = require("puppeteer");

module.exports = async (username, password) => {
    return new Promise(async (resolve, reject) => {
        let browser = await puppeteer.launch({ args: ["--no-sandbox"] });
        let page = await browser.newPage();
     
        // Login
        await page.goto("https://cas.ecollege.haute-garonne.fr/login?selection=ATS_parent_eleve&service=https%3A%2F%2Fadrienne-bolland.ecollege.haute-garonne.fr%2Fsg.do%3FPROC%3DIDENTIFICATION_FRONT&submit=Valider");
        await page.type("#username", username);
        await page.type("#password", password);
        let navPromise = page.waitForNavigation({ waitUntil: "networkidle0", timeout: 0 });
        await page.$eval("#button-submit", form => form.click());
        await navPromise;
        if(page.url().startsWith("https://adrienne-bolland.ecollege.haute-garonne.fr/")){
            navPromise = page.waitForNavigation({ waitUntil: "networkidle0", timeout: 0 });
            await page.goto("https://0312799z.index-education.net/pronote/");
            await navPromise;
            resolve(page);
        } else {
            reject("Login error");
        }
    });
};
