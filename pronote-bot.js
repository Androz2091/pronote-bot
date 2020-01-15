const getClient = require("./instagram/getClient");
const getMoyennes = require("./pronote/getMoyennes");
const genConnectedPage = require("./pronote/genConnectedPage");
const fs = require("fs");
const logger = require("./helpers/logger");
const beautify = require("json-beautify");
const reload = require("require-reload")(require);
const { writeFileSync, readFileSync, existsSync } = require("fs");
const { sep } = require("path");

if (!existsSync(__dirname+sep+"credentials.json")) writeFileSync(__dirname+sep+"credentials.json", [], "utf-8");
if (!existsSync(__dirname+sep+"cache.json")) writeFileSync(__dirname+sep+"cache.json", [], "utf-8");

let loginStates = [];

const helpPage = 
`Voici la liste des commandes disponibles :

!moy (affiche vos moyennes)
!picture (affiche votre avatar)
!notif (active les notifications)
!dénotif (désactive les notifications)

{{notifStatus}}
`;

(async () => {

    let ig = await getClient();
    logger.log("Client is ready.");
    require("./helpers/autoNotif").init(ig);

    ig.fbns.on("message", async (message) => {

        // Il peut y avoir de fausses notifications si le bot est démarré depuis moins de 10-20 secondes
        if(process.uptime() < 10000){
            return;
        }

        let credentials = require("./credentials");

        if(loginStates.some((l) => l.insta === message.author.username)){
            let i = loginStates.map((l) => l.insta).indexOf(message.author.username);

            // If the user entered his username
            if(loginStates[i].step === "username"){
                loginStates[i].username = message.content.toLowerCase();
                loginStates[i].step     = "password";
                return message.reply("Entrez votre mot de passe ENT :");
            }
            
            // If the user entered his password
            if(loginStates[i].step === "password"){
                loginStates[i].password = message.content;
                message.reply("Vérification de vos identifiants...");
                // Check if the credentials are correct
                genConnectedPage(loginStates[i].username, loginStates[i].password, true).then(async (page) => {
                    let avatar = await page.evaluate(() => {
                        return $("body").find("img")[1].src;
                    });
                    // If the credentials are correct
                    await message.reply("Vous êtes maintenant connecté! Pour des raisons évidentes de sécurité, il est conseillé de supprimer votre mot de passe de la discussion.");
                    await message.reply(helpPage.replace("{{notifStatus}}", "🔔Notification activées"));
                    credentials.push({
                        username: loginStates[i].username,
                        password: loginStates[i].password,
                        insta: message.author.username,
                        notif: false,
                        avatar
                    });
                    fs.writeFileSync("./credentials.json", beautify(credentials, null, 2, 100), "utf-8");
                    reload("./credentials.json");
                    // Remove state
                    loginStates = loginStates.filter((l) => l.insta !== message.author.username);
                }).catch(async () => {
                    // Remove state
                    loginStates = loginStates.filter((l) => l.insta !== message.author.username);
                    await message.reply("Hmm... on dirait que vos identifiants sont invalides.");
                    return message.reply("Tapez !login pour réessayer!");
                });
            }
        }

        /* LOGIN MESSAGE */
        else if(!message.author.logged && message.content !== "!login"){
            message.reply("Tapez !login pour vous connecter à l'ENT.");
        }

        /* LOGIN COMMAND */
        else if(message.content === "!login"){
            if(message.author.logged) return message.reply("Vous êtes déjà connecté !");
            message.reply("Bonjour, @"+message.author.username+" !\nEntrez votre identifiant ENT (par exemple jean.dupont):");
            loginStates.push({
                insta: message.author.username,
                step: "username",
                username: null,
                password: null
            });
        }

        /* LOGOUT COMMAND */
        else if(message.content === "!logout"){
            credentials = credentials.filter((i) => i.insta !== message.author.username);
            fs.writeFileSync("./credentials.json", beautify(credentials, null, 2, 100), "utf-8");
            reload("./credentials.json");
            message.reply("Déconnexion effectuée. Pour vous reconnecter, tapez !login.");
        }

        /* MOYENNES */
        else if(message.content === "!moy"){
            message.reply("Veuillez patienter...");
            getMoyennes(message.author.credentials).then((moyennes) => {
                message.reply("Moyennes:\n\nNormale: "+moyennes.moyNormale+"\nPluriannuelle: "+moyennes.moyPluri);
            }).catch((e) => {
                message.reply("Une erreur est survenue (e="+e+")");
            });
        }

        /* PICTURE COMMAND */
        else if(message.content === "!picture"){
            await message.reply("Veuillez patienter...");
            await message.replyImage(message.author.credentials.avatar);
            message.reply("Voilà votre photo de profil Pronote!");
        }

        /* NOTIF COMMAND */
        else if(message.content === "!notif"){
            if(message.author.credentials.notif){
                return message.reply("Les notifications sont déjà activées ! Tapez !dénotif pour les désactiver.");
            }
            credentials = credentials.filter((i) => i.insta !== message.author.username);
            message.author.credentials.notif = true;
            credentials.push(message.author.credentials);
            fs.writeFileSync("./credentials.json", beautify(credentials, null, 2, 100), "utf-8");
            reload("./credentials.json");
            message.reply("Vous recevrez une notification lorsqu'une note est ajoutée sur Pronote ! Tapez !dénotif pour désactiver cette option.");
        }

        /* DÉNOTIF COMMAND */
        else if(message.content === "!dénotif"){
            if(!message.author.credentials.notif){
                return message.reply("Les notifications sont déjà désactivées ! Tapez !notif pour les activer.");
            }
            credentials = credentials.filter((i) => i.insta !== message.author.username);
            message.author.credentials.notif = false;
            credentials.push(message.author.credentials);
            fs.writeFileSync("./credentials.json", beautify(credentials, null, 2, 100), "utf-8");
            reload("./credentials.json");
            message.reply("Vous ne recevrez plus de notification lorsqu'une note est ajoutée sur Pronote... Tapez !notif pour réactiver cette option.");
        }

        /* HELP COMMAND */
        else if(message.content === "!help"){
            await message.reply(helpPage.replace("{{notifStatus}}", (
                message.author.credentials.notif ?
                "🔔 Notifications activées" :
                "🔕 Notifications désactivées")));
        }

    });
})();