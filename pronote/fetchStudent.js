const puppeteer = require("puppeteer");
const logger = require("../helpers/logger");
const Student = require('./Student');
const { entLoginURL, pronoteURL } = require('../config.json');

const IsJsonString = (str) => {
    try {
        JSON.parse(str);
        return JSON.parse(str);
    } catch (e) {
        return false;
    }
};

module.exports = async ({ username, password }) => {
    return new Promise(async(resolve) => {

        let browser = await puppeteer.launch({ args: ["--no-sandbox"] });
        let page = await browser.newPage();
        logger.log("Browser opened. (session="+username+")", "info");
        let startAt = Date.now();

        let listeNotes = null;
        let pluriNotes = null;
     
        // Login
        await page.goto(entLoginURL);
        await page.type("#username", username);
        await page.type("#password", password);
        logger.log("Credentials typed. (session="+username+")");
        let navPromise = page.waitForNavigation({ waitUntil: "networkidle0", timeout: 0 });
        await page.$eval("#button-submit", form => form.click());
        await navPromise;
         
        // Go to pronote
        logger.log("Going to pronote. (session="+username+")");
        navPromise = page.waitForNavigation({ waitUntil: "networkidle0", timeout: 0 });
        await page.goto(pronoteURL);
        await navPromise;
        
        logger.log("Detecting responses. (session="+username+")");
        page.on("response", async (res) => {
            let resText = await res.text();
            if(IsJsonString(resText)){
                let value = IsJsonString(resText);
                if(value.nom === "DernieresNotes"){
                    logger.log("First response retrieved. (session="+username+")");
                    listeNotes = value;
                }
                if(value.nom === "PageSuiviPluriannuel"){
                    logger.log("Second response retrieved. (session="+username+")");
                    pluriNotes = value;
                }
                if(listeNotes && pluriNotes){
                    let pdpURL = await page.evaluate(() => {
                        return $("body").find("img")[1].src;
                    });
                    logger.log("Closing browser. (session="+username+")");
                    // Ferme le navigateur
                    await browser.close();
                    let student = new Student(listeNotes, pluriNotes, username, pdpURL);
                    resolve(student);
                    logger.log("Promise resolved in "+(Date.now()-startAt)+"ms. (session="+username+")", "info");
                }
            }
        });

        // Génère les requetes XHR pour obtenir les infos nécessaires
        page.evaluate(async () => {
            GInterface.Instances[1]._surToutVoir(10);
            setTimeout(() => {
                $("body").find("[aria-label='Suivi pluriannuel']").click();
            }, 500);
        });
    });
 
};
