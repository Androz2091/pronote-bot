const puppeteer = require("puppeteer");
const logger = require("../helpers/logger");
const Eleve = require('../structures/Eleve');
const { entLoginURL, pronoteURL } = require('../config.json');

/* CONCERNANT L'INTERFACE POUR CHANGER DE SEMAINE */
// La largeur en pixel de la case des numéros de semaine
const largeurCaseSemaine = 17;
// Le nombre de semaine au totl
const nombreSemaines = 44;

/**
 * Les coordonnées de la case de la semaine 1 sont
 * X: 6
 * Y: 167
 */

// Calcul des coordonnees pour chaque semaine
const calculatedCoordonnees = [];
for(let i = 0; i < nombreSemaines; i++){
    calculatedCoordonnees.push({
        numeroSemaine: i+1,
        coordonnees: {
            x: 6.5 + (i * largeurCaseSemaine),
            y: 167
        }
    });
};

Date.prototype.getWeekNumber = function(){
    var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7)
};

// Calcul du numéro de semaine suivant
let currentNumeroSemaine = 
// Ajout de 17 pour l'année scolaire
(new Date().getWeekNumber()+17)
// Ajout de 1 pour récupérer la semaine suivante
+1;

const IsJsonString = (str) => {
    try {
        JSON.parse(str);
        return JSON.parse(str);
    } catch (e) {
        return false;
    }
};

module.exports = async ({ username, password }, fetchNextMonday) => {
    return new Promise(async(resolve) => {

        let browser = await puppeteer.launch({ args: ["--no-sandbox"] });
        let page = await browser.newPage();
        logger.log("Browser opened. (session="+username+")", "info");
        let startAt = Date.now();

        let listeNotes = null;
        let pluriNotes = null;
        let emploiDuTemps = [];
     
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
                if(value.nom === "PageEmploiDuTemps"){
                    logger.log("EDT response retrieved. (i="+emploiDuTemps.length+") (session="+username+")");
                    emploiDuTemps.push(value);
                }
                if(listeNotes && pluriNotes && (emploiDuTemps.length === fetchNextMonday ? 2 : 1)){
                    let pdpURL = await page.evaluate(() => {
                        return $("body").find("img")[1].src;
                    });
                    logger.log("Closing browser. (session="+username+")");
                    // Ferme le navigateur
                    await browser.close();
                    let student = new Eleve(listeNotes, pluriNotes, emploiDuTemps, username, pdpURL);
                    resolve(student);
                    logger.log("Promise resolved in "+(Date.now()-startAt)+"ms. (session="+username+")", "info");
                }
            }
        });

        // Génère les requetes XHR pour obtenir les infos nécessaires
        page.evaluate(async () => {
            $("body").find("[id='GInterface.Instances[0].Instances[1]_Combo2']").click();
            setTimeout(() => {
                $("body").find("[aria-label='Suivi pluriannuel']").click();
                setTimeout(() => {
                    $("body").find("[id='GInterface.Instances[0].Instances[1]_Combo5']").click();
                }, 500);
            }, 500);
        });
        if(fetchNextMonday){
            setTimeout(() => {
                let semaine = calculatedCoordonnees.find((s) => s.numeroSemaine === currentNumeroSemaine).coordonnees;
                page.mouse.click(semaine.x, semaine.y);
            }, 1500);
        }
    });
 
};
