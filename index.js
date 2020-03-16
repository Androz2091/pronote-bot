// Generate Instagram Client
const getClient = require("./instagram/getClient");

// Instagram classes
const InstaMessage = require("./instagram/InstaMessage");

// Utils
const logger = require("./helpers/logger");
const { readFile } = require("fs").promises;

// Pronote bot class
const PronoteBot = require("./structures/PronoteBot");

(async () => {
    const ig = await getClient();
    const bot = new PronoteBot(ig);
    logger.log("Client is ready.", "info");

    await bot.fetchStudents();
    logger.log("Students fetched.", "info");

    bot.instagram.on('message', async msgRaw => {

        if(msgRaw.message.op !== "add") return;
        if (!bot.listening) return;

        // Parser le message
        const message = new InstaMessage(bot, msgRaw.message, ig);

        // Vérifier que l'auteur du message n'est pas le bot
        if(message.author.id === bot.userID) return;
        await message.author.fetchInfo();
        if(message.author.username === bot.config.username){
            bot.userID = message.author.id;
            return;
        }

        // Marquer le message comme lu
        message.markAsSeen();

        const canRunCommand = bot.canRunCommand(message.author.username);

        const loginState = bot.getLoginState(message.author.username);

        if(loginState){

            if(loginState.step === "password"){
                loginState.setPassword(message.content);
                message.reply("Vérification de vos identifiants...");
                const verified = await loginState.verify();
                if(!verified){
                    bot.clearLoginState(message.author.username);
                    return message.reply(
                        "Hmm... on dirait que vos identifiants sont invalides. Tapez !login pour réessayer!"
                    );
                }
                await message.reply(
                    "Vous êtes maintenant connecté! Pour des raisons évidentes de sécurité, il est conseillé de supprimer votre mot de passe de la discussion."
                );
                await message.reply(
                    bot.helpPage({
                        notifEnabled: true
                    })
                );
                bot.database.createStudent({
                    insta_username: message.author.username,
                    ent_username: loginState.username,
                    ent_password: loginState.password
                });
            }

            if(loginState.step === "username"){
                loginState.setUsername(message.content);
                return message.reply("Entrez votre mot de passe ENT :");
            }
        }

        else if (!message.author.logged && message.content !== "!login") {
            message.reply("Tapez !login pour vous connecter à l'ENT.");
        }
        
        /**
         * @command !login
         */
        else if (message.content === "!login") {

            // If the member is already logged
            if (message.author.logged){
                return message.reply("Vous êtes déjà connecté !");
            }

            // Ask for username
            message.reply(`Bonjour, @${message.author.username} !\nEntrez votre identifiant ENT (par exemple jean.dupont):`);
            
            // Create login state
            bot.createLoginState(message.author.username);
        }
        
        /**
         * @command !logout
         */
        else if (message.content === "!logout") {
            await bot.database.deleteStudent(message.author.username);
            message.reply("Déconnexion effectuée. Pour vous reconnecter, tapez !login.");
        }
        
        /**
         * @command !moy
         */
        else if (message.content === "!moy") {
            
            // Check if the user can run a command
            if (!canRunCommand) {
                return message.reply(
                    "⌛ Une requête est déjà en cours... merci de patienter!"
                );
            }
            
            // Update user cooldown
            bot.setCooldown(message.author.username);

            message.reply("Veuillez patienter...");

            const student = await bot.database.fetchStudent(message.author.username);
            await student.initBrowser();
            await student.login(false);
            await student.pronote(false);
            await student.fetchNotes(false, true);

            message.reply(
                "Moyennes:\n\nNormale: " +
                    (student.notes.moyenne || "Aucune note") +
                    "\nPluriannuelle: " +
                    (student.notes.moyennePluri || "Aucune note")
            );

            bot.deleteCooldown(message.author.username);
        }
        
        /**
         * @command !picture
         */
        else if (message.content === "!picture") {
            await message.reply("Veuillez patienter...");
            const img = await readFile(`./images/${message.author.student.entUsername}.png`);
            await message.replyImage(Buffer.from(img, "binary"));
            setTimeout(() => message.reply("Voilà votre photo de profil Pronote!"), 500);
        }
        
        /**
         * @command !notif
         */
        else if (message.content === "!notif") {
            /* NOTIF COMMAND */
            if (message.author.student.notifEnabled) {
                return message.reply(
                    "Les notifications sont déjà activées ! Tapez !dénotif pour les désactiver."
                );
            }
            await message.author.student.setNotif(true);
            message.reply(
                "Vous recevrez une notification lorsque votre compte est modifié sur Pronote ! Tapez !dénotif pour désactiver cette option."
            );
        }
        
        /**
         * @command !dénotif
         */
        else if (message.content === "!dénotif") {
            /* DÉNOTIF COMMAND */
            if (!message.author.student.notifEnabled) {
                return message.reply(
                    "Les notifications sont déjà désactivées ! Tapez !notif pour les activer."
                );
            }
            await message.author.student.setNotif(false);
            message.reply(
                "Vous ne recevrez plus de notification lorsqu'une note est ajoutée sur Pronote... Tapez !notif pour réactiver cette option."
            );
        }
        
        /**
         * @command !recap
         */
        else if (message.content === "!recap") {
            return message.reply("⚠️ Suite à une décision du gouvernement français, les cours ne s'organisent plus de la même façon à compter du lundi 16 mars 2020.");
            /*
            if(process.modeVacances){
                return message.reply("🌴 Le recap n'est pas disponible en mode vacances...");
            } else if (process.coronaMode){
            }
            if (cooldown) {
                return message.reply(
                    "⌛ Une requête est déjà en cours... merci de patienter!"
                );
            }
            bot.setCooldown(message.author.username);
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
                });*/
        }
        
        /**
         * @command !menu
         */
        else if(message.content === "!menu") {
            return message.reply("⚠️ Suite à une décision du gouvernement français, les cours ne s'organisent plus de la même façon à compter du lundi 16 mars 2020.");
            /*
            if(process.modeVacances){
                return message.reply("🌴 Le menu n'est pas disponible en mode vacances...");
            } else if (process.coronaMode){
            }
            /* MENU COMMAND 
            let menuName = getMenuNom();
            await message.reply("Veuillez patienter...");
            let img = await readFileAsync(
                "./menus/" + menuName.cleanUpSpecialChars() + ".jpg"
            );
            message.replyImage(Buffer.from(img, "binary"));
            */
        }

        /**
         * @command !devoirs
         */
        else if(message.content === "!devoirs"){
            // Check if the user can run a command
            if (!canRunCommand) {
                return message.reply(
                    "⌛ Une requête est déjà en cours... merci de patienter!"
                );
            }
            
            // Update user cooldown
            bot.setCooldown(message.author.username);

            message.reply("Veuillez patienter...");

            const student = await bot.database.fetchStudent(message.author.username);
            await student.initBrowser();
            await student.login(false);
            await student.fetchDevoirs(false, true);

            message.reply(`
            📚 ${student.devoirs.list.length} devoirs

${student.devoirs.list.map((d) => `- ${d.matiere}`).join("\n")}
            `);

            bot.deleteCooldown(message.author.username);
        }
        
        /**
         * @command !help
         */
        else {
            await message.reply(
                bot.helpPage({
                    notifEnabled: message.author.student.notifEnabled
                })
            );
        }
    });
})();
