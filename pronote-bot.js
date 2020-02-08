require("./helpers/extenders");

const getClient = require("./instagram/getClient");
const fetchEleve = require("./pronote/fetchEleve");
const checkCred = require("./pronote/checkCred");
const fs = require("fs");
const logger = require("./helpers/logger");
const beautify = require("json-beautify");
const reload = require("require-reload")(require);
const { writeFileSync, existsSync } = require("fs");
const { sep } = require("path");
const { readFile } = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(readFile);
const { getMenuNom } = require("./helpers/functions");
const InstaMessage = require("./instagram/InstaMessage");
const config = require("./config");

if (!existsSync(__dirname + sep + "credentials.json"))
    writeFileSync(__dirname + sep + "credentials.json", [], "utf-8");

const commandsWait = {};

let loginStates = [];

const helpPage = `Voici la liste des commandes disponibles :

!moy (affiche vos moyennes)
!picture (affiche votre photo)
!recap (affiche infos sur la journée)
!notif (active les notifications)
!dénotif (désactive les notifications)

{{notifStatus}}
`;

(async () => {
    let ig = await getClient();
    let igWakeUp = Date.now();
    logger.log("Client is ready.", "info");

    // Extensions de certaines classes
    require("./helpers/extenders");
    // Lancement des tâches
    require("./helpers/tasks")(ig);

    setTimeout(() => {
        logger.log("Client is listening.", "info");
    }, 2000);

    let currentUserID = null;
    ig.realtime.on('message', async msgRaw => {

        if(msgRaw.message.op !== "add") return;

        // Il peut y avoir de fausses notifications si le bot est démarré depuis moins de 2 secondes
        if (Date.now() - igWakeUp < 2000) {
            return;
        }

        let message = new InstaMessage(msgRaw.message, ig);
        if(message.author.id === currentUserID) return;
        await message.author.fetchInfo();
        if(message.author.username === config.username){
            currentUserID = message.author.id;
            return;
        }

        message.markAsSeen();

        let credentials = require("./credentials");
        let cooldown =
            commandsWait[message.author.username] &&
            Date.now() - commandsWait[message.author.username] < 20000;

        if (loginStates.some(l => l.insta === message.author.username)) {
            let i = loginStates
                .map(l => l.insta)
                .indexOf(message.author.username);

            // If the user entered his username
            if (loginStates[i].step === "username") {
                loginStates[i].username = message.content.toLowerCase();
                loginStates[i].step = "password";
                return message.reply("Entrez votre mot de passe ENT :");
            }

            // If the user entered his password
            if (loginStates[i].step === "password") {
                loginStates[i].password = message.content;
                message.reply("Vérification de vos identifiants...");
                // Check if the credentials are correct
                let isValid = await checkCred(
                    loginStates[i].username,
                    loginStates[i].password
                );
                if(isValid){
                    // If the credentials are correct
                    await message.reply(
                        "Vous êtes maintenant connecté! Pour des raisons évidentes de sécurité, il est conseillé de supprimer votre mot de passe de la discussion."
                    );
                    await message.reply(
                        helpPage.replace(
                            "{{notifStatus}}",
                            "🔔Notification activées"
                        )
                    );
                    credentials.push({
                        username: loginStates[i].username,
                        password: loginStates[i].password,
                        insta: message.author.username,
                        notif: true,
                        avatar
                    });
                    fs.writeFileSync(
                        "./credentials.json",
                        beautify(credentials, null, 2, 100),
                        "utf-8"
                    );
                    reload("./credentials.json");
                    // Remove state
                    loginStates = loginStates.filter(
                        l => l.insta !== message.author.username
                    );
                } else {
                    // Remove state
                    loginStates = loginStates.filter(
                        l => l.insta !== message.author.username
                    );
                    await message.reply(
                        "Hmm... on dirait que vos identifiants sont invalides."
                    );
                    return message.reply("Tapez !login pour réessayer!");
                }
            }
        } else if (!message.author.logged && message.content !== "!login") {
            /* LOGIN MESSAGE */
            message.reply("Tapez !login pour vous connecter à l'ENT.");
        } else if (message.content === "!login") {
            /* LOGIN COMMAND */
            if (message.author.logged)
                return message.reply("Vous êtes déjà connecté !");
            message.reply(
                "Bonjour, @" +
                    message.author.username +
                    " !\nEntrez votre identifiant ENT (par exemple jean.dupont):"
            );
            loginStates.push({
                insta: message.author.username,
                step: "username",
                username: null,
                password: null
            });
        } else if (message.content === "!logout") {
            /* LOGOUT COMMAND */
            credentials = credentials.filter(
                i => i.insta !== message.author.username
            );
            fs.writeFileSync(
                "./credentials.json",
                beautify(credentials, null, 2, 100),
                "utf-8"
            );
            reload("./credentials.json");
            message.reply(
                "Déconnexion effectuée. Pour vous reconnecter, tapez !login."
            );
        } else if (message.content === "!moy") {
            /* MOYENNES */
            if (cooldown) {
                return message.reply(
                    "⌛ Une requête est déjà en cours... merci de patienter!"
                );
            }
            // Update cooldown
            commandsWait[message.author.username] = Date.now();
            message.reply("Veuillez patienter...");
            fetchEleve(message.author.credentials)
                .then(student => {
                    message.reply(
                        "Moyennes:\n\nNormale: " +
                            (student.moyenne || "No data") +
                            "\nPluriannuelle: " +
                            student.moyennePluri
                    );
                    delete commandsWait[message.author.username];
                })
                .catch(e => {
                    message.reply("Une erreur est survenue (e=" + e + ")");
                });
        } else if (message.content === "!picture") {
            /* PICTURE COMMAND */
            await message.reply("Veuillez patienter...");
            let img = await readFileAsync(
                "./images/" + message.author.credentials.username + ".png"
            );
            await message.replyImage(Buffer.from(img, "binary"));
            message.reply("Voilà votre photo de profil Pronote!");
        } else if (message.content === "!notif") {
            /* NOTIF COMMAND */
            if (message.author.credentials.notif) {
                return message.reply(
                    "Les notifications sont déjà activées ! Tapez !dénotif pour les désactiver."
                );
            }
            credentials = credentials.filter(
                i => i.insta !== message.author.username
            );
            message.author.credentials.notif = true;
            credentials.push(message.author.credentials);
            fs.writeFileSync(
                "./credentials.json",
                beautify(credentials, null, 2, 100),
                "utf-8"
            );
            reload("./credentials.json");
            message.reply(
                "Vous recevrez une notification lorsqu'une note est ajoutée sur Pronote ! Tapez !dénotif pour désactiver cette option."
            );
        } else if (message.content === "!dénotif") {
            /* DÉNOTIF COMMAND */
            if (!message.author.credentials.notif) {
                return message.reply(
                    "Les notifications sont déjà désactivées ! Tapez !notif pour les activer."
                );
            }
            credentials = credentials.filter(
                i => i.insta !== message.author.username
            );
            message.author.credentials.notif = false;
            credentials.push(message.author.credentials);
            fs.writeFileSync(
                "./credentials.json",
                beautify(credentials, null, 2, 100),
                "utf-8"
            );
            reload("./credentials.json");
            message.reply(
                "Vous ne recevrez plus de notification lorsqu'une note est ajoutée sur Pronote... Tapez !notif pour réactiver cette option."
            );
        } else if (message.content === "!recap") {
            if(process.modeVacances){
                return message.reply("🌴 Le recap n'est pas disponible en mode vacances...");
            }
            /* RECAP COMMAND */
            if (cooldown) {
                return message.reply(
                    "⌛ Une requête est déjà en cours... merci de patienter!"
                );
            }
            // Update cooldown
            commandsWait[message.author.username] = Date.now();
            message.reply("Veuillez patienter...");
            fetchEleve(message.author.credentials)
                .then(student => {
                    delete commandsWait[message.author.username];
                    let sum = student.getSummary();
                    if (sum === "unreachable") {
                        return message.reply("EDT unreachable.");
                    } else {
                        message.reply(sum);
                    }
                })
                .catch(e => {
                    console.error(e);
                    message.reply("Une erreur est survenue (e=" + e + ")");
                });
        } else if(message.content === "!menu") {
            if(process.modeVacances){
                return message.reply("🌴 Le menu n'est pas disponible en mode vacances...");
            }
            /* MENU COMMAND */
            let menuName = getMenuNom();
            await message.reply("Veuillez patienter...");
            let img = await readFileAsync(
                "./menus/" + menuName.cleanUpSpecialChars() + ".jpg"
            );
            message.replyImage(Buffer.from(img, "binary"));
        } else {
            /* HELP COMMAND */
            await message.reply(
                helpPage.replace(
                    "{{notifStatus}}",
                    message.author.credentials.notif
                        ? "🔔 Notifications activées"
                        : "🔕 Notifications désactivées"
                )
            );
        }
    });
})();
