const puppeteer = require("puppeteer");
const getMoyenneDifferentes = require("./getMoyDifferences");
const logger = require("../helpers/logger");

const IsJsonString = (str) => {
    try {
        JSON.parse(str);
        return JSON.parse(str);
    } catch (e) {
        return false;
    }
};

module.exports = async ({ username, password }) => {
    return new Promise(async(resolve, reject) => {

        let browser = await puppeteer.launch({ args: ["--no-sandbox"] });
        let page = await browser.newPage();
        logger.log("Browser opened. (session="+username+")");

        let moyenne1 = null;
        let moyenne2 = null;
     
        // Login
        await page.goto("https://cas.ecollege.haute-garonne.fr/login?selection=ATS_parent_eleve&service=https%3A%2F%2Fadrienne-bolland.ecollege.haute-garonne.fr%2Fsg.do%3FPROC%3DIDENTIFICATION_FRONT&submit=Valider");
        await page.type("#username", username);
        await page.type("#password", password);
        logger.log("Credentials typed. (session="+username+")");
        let navPromise = page.waitForNavigation({ waitUntil: "networkidle0", timeout: 0 });
        await page.$eval("#button-submit", form => form.click());
        await navPromise;
         
        // Go to pronote
        logger.log("Going to pronote. (session="+username+")");
        navPromise = page.waitForNavigation({ waitUntil: "networkidle0", timeout: 0 });
        await page.goto("https://0312799z.index-education.net/pronote/");
        await navPromise;
        
        logger.log("Detecting responses. (session="+username+")");
        page.on("response", async (res) => {
            let resText = await res.text();
            if(IsJsonString(resText)){
                let value = IsJsonString(resText);
                if(value.nom === "DernieresNotes"){
                    logger.log("First response retrieved. (session="+username+")");
                    moyenne1 = value;
                }
                if(value.nom === "PageSuiviPluriannuel"){
                    logger.log("Second response retrieved. (session="+username+")");
                    moyenne2 = value;
                }
                if(moyenne1 && moyenne2){
                    logger.log("Promise resolved. (session="+username+")");
                    resolve(await getMoyenneDifferentes(moyenne1, moyenne2));
                }
            }
        });
    
        // Get moyennes
        page.evaluate(async () => {
            GInterface.Instances[1]._surToutVoir(10);
            setTimeout(() => {
                $("body").find("[aria-label='Suivi pluriannuel']").click();
            }, 500);
        });
    });
 
};
