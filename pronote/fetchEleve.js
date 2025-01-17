const puppeteer = require("puppeteer");
const logger = require("../helpers/logger");
const Eleve = require("../structures/Eleve");
const { entLoginURL, pronoteURL } = require("../config.json");
let browserClosed = false;

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
for (let i = 0; i < nombreSemaines; i++) {
    calculatedCoordonnees.push({
        numeroSemaine: i + 1,
        coordonnees: {
            x: 6.5 + i * largeurCaseSemaine,
            y: 167
        }
    });
}

module.exports = async ({ username, password }) => {
    // Calcul du numéro de semaine suivant
    let currentNumeroSemaine =
        // Ajout de 17 pour l'année scolaire
        new Date().getWeekNumber() +
        17 +
        // Ajout de 1 pour récupérer la semaine suivante
        1;
    let fetchMonday =
        new Date().getDay() === 5 ||
        new Date().getDay() === 6 ||
        new Date().getDay() === 0;
    return new Promise(async resolve => {
        let browser = await puppeteer.launch({ args: ["--no-sandbox"] });
        let page = await browser.newPage();
        logger.log("Browser opened. (session=" + username + ")", "info");
        let startAt = Date.now();

        let listeNotes = null;
        let pluriNotes = null;
        let emploiDuTemps = [];

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

        // Go to pronote
        logger.log("Going to pronote. (session=" + username + ")");
        navPromise = page.waitForNavigation({
            waitUntil: "networkidle0",
            timeout: 0
        });
        await page.goto(pronoteURL);
        await navPromise;

        const resolveRequest = async auto => {
            let pdpURL = await page.evaluate(() => {
                return $("body").find("img")[1].src;
            });
            logger.log(
                "Closing browser" +
                    (auto ? "automatically" : "") +
                    ". (session=" +
                    username +
                    ")"
            );
            // Ferme le navigateur
            await browser.close();
            browserClosed = true;
            let student = new Eleve(
                listeNotes,
                pluriNotes,
                emploiDuTemps,
                username,
                pdpURL
            );
            resolve(student);
            logger.log(
                "Promise resolved in " +
                    (Date.now() - startAt) +
                    "ms" +
                    (auto ? "with errors" : "") +
                    ". (session=" +
                    username +
                    ")",
                "info"
            );
        };

        logger.log("Detecting responses. (session=" + username + ")");
        page.on("response", async res => {
            let resText = await res.text();
            if (resText.isJson()) {
                let value = resText.isJson();
                if (value.nom === "DernieresNotes") {
                    logger.log(
                        "First response retrieved. (session=" + username + ")"
                    );
                    listeNotes = value;
                }
                if (value.nom === "PageSuiviPluriannuel") {
                    logger.log(
                        "Second response retrieved. (session=" + username + ")"
                    );
                    pluriNotes = value;
                }
                if (value.nom === "PageEmploiDuTemps") {
                    logger.log(
                        "EDT response retrieved. (i=" +
                            emploiDuTemps.length +
                            ") (session=" +
                            username +
                            ")"
                    );
                    emploiDuTemps.push(value);
                }
                if (
                    listeNotes &&
                    pluriNotes &&
                    emploiDuTemps.length === (fetchMonday ? 2 : 1)
                ) {
                    resolveRequest();
                }
            }
        });

        // Génère les requetes XHR pour obtenir les infos nécessaires
        page.evaluate(async () => {
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
        if (fetchMonday) {
            setTimeout(() => {
                logger.log(
                    "Fetching monday... (session=" + username + ")",
                    "log"
                );
                let interval = setInterval(clickWeek, 2000);
                async function clickWeek() {
                    logger.log(
                        "Evaluating page... (session=" + username + ")",
                        "log"
                    );
                    let isOk = await page.evaluate(
                        async ({ currentNumeroSemaine }) => {
                            return Boolean(
                                $("body").find(
                                    `[id="GInterface.Instances[1].Instances[0]_j_${currentNumeroSemaine}"]`
                                ).length
                            );
                        },
                        { currentNumeroSemaine }
                    );
                    if (!isOk || page.isClosed()) {
                        logger.log(
                            `Not loaded= ${!isOk}, Is closed= ${page.isClosed()} (session=${username})`,
                            "info"
                        );
                        return;
                    }
                    logger.log(
                        "Clearing interval, found... (session=" +
                            username +
                            ")",
                        "log"
                    );
                    clearInterval(interval);
                    let semaine = calculatedCoordonnees.find(
                        s => s.numeroSemaine === currentNumeroSemaine
                    ).coordonnees;
                    page.mouse.click(semaine.x, semaine.y);
                    setTimeout(() => {
                        if (!browserClosed) resolveRequest(true);
                    }, 10000);
                }
            }, 1000);
        }
    });
};
