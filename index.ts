import Collection from '@discordjs/collection';
import PronoteBot from './structures/PronoteBot';
import LoginState from './structures/LoginState';
import logger from './helpers/logger';
import { stripIndent } from 'common-tags';
import { promises } from 'fs';
import { login } from 'pronote-api';

const generateHelpPage = ({ notifications }: { notifications: boolean }) => {
return stripIndent`
        Voici la liste des commandes disponibles :
                
        !moy (affiche vos moyennes)
        !picture (affiche votre photo)
        !recap (affiche infos sur la journée)
        !devoirs (affiche recap des devoirs)
        !notif (active les notifications)
        !dénotif (désactive les notifications)

        ${notifications ? '🔔Notifications activées' : '🔕Notifications désactivées'}
    `;
};

const processingUsers = new Set<string>();
const loginStates = new Collection<string, LoginState>();

const bot = new PronoteBot();

bot.instagram.on('connected', () => {
    logger.log(`Logged in as ${bot.instagram.user.username}`);
});

bot.instagram.on('messageCreate', async (message) => {

    // check if the message wasn't send by the bot
    if (message.authorID === bot.instagram.user.id) return;

    // mark the message as seen
    message.markSeen();

    const loginState = loginStates.get(message.author.id);

    if (
        !loginState
        && !bot.students.has(message.author.id)
        && message.content !== '!login'
    ) {
        return message.reply('Tapez !login pour vous connecter à l\'ENT.');
    }


    // if the user is logging in
    if (loginState){

        if (loginState.step === 'pronote_url') {
            const pronoteRegex = /https:\/\/([a-zA-Z0-9]{8})\.index-education\.net\/pronote\/?/;
            if (!pronoteRegex.test(message.content)) return message.chat.sendMessage('Cette URL Pronote ne semble pas valide... Pour rappel, cliquez sur ce lien pour apprendre à la récupérer : https://rb.gy/p7p861');
            const pronoteServerID = message.content.match(pronoteRegex)[1];
            loginState.setPronoteURL(`https://${pronoteServerID}.index-education.net/pronote/`);
            const waitingMessagePromise = message.reply('Vérification de vos identifiants...');
            const verified = await loginState.verify();
            await waitingMessagePromise;
            if (!verified) await message.reply('Hmm... on dirait que vos identifiants sont invalides. Tapez !login pour réessayer!');
            bot.database.createStudent({
                instaID: message.author.id,
                instaUsername: message.author.username,
                pronoteUsername: loginState.username,
                pronotePassword: loginState.password,
                pronoteCas: loginState.cas,
                pronoteURL: loginState.pronoteURL,
                notifEnabled: true,
                isDeleted: false
            });
            await message.reply("Vous êtes maintenant connecté! Pour des raisons évidentes de sécurité, il est conseillé de supprimer votre mot de passe de la discussion.");
            await message.reply(generateHelpPage({ notifications: true }));
        }

        if (loginState.step === 'password'){
            loginState.setPassword(message.content);
            return message.reply('Vous y êtes presque ! Envoyez votre URL Pronote (si vous ne savez pas comment la récupérer, cliquez ici : https://rb.gy/p7p861');
        }

        if (loginState.step === 'username'){
            loginState.setUsername(message.content);
            return message.reply('Entrez votre mot de passe ENT :');
        }

    }

    const isProcessing = processingUsers.has(message.author.id);
    const student = bot.students.get(message.author.id);
    const session = bot.pronoteSessions.get(message.author.id);

    /**
     * @command !login
     */
    if (message.content === '!login') {

        // if the member is already logged
        if (bot.students.has(message.author.id)) return message.reply('Vous êtes déjà connecté !');

        // ask for username
        message.reply(`Bonjour, @${message.author.username} !\nEntrez votre identifiant ENT/Pronote (par exemple jean.dupont):`);

        // create login state
        loginStates.set(message.author.id, new LoginState(bot));

    }

    /**
     * @command !logout
     */
    else if (message.content === '!logout') {

        await bot.database.deleteStudent(message.author.id);

        message.reply('Déconnexion effectuée. Pour vous reconnecter, tapez !login.');

    }

    /**
     * @command !moy
     */
    else if (message.content === '!moy') {

        // check if the user can run a command
        if (isProcessing) {
            return message.chat.sendMessage('⌛ Une requête est déjà en cours... merci de patienter!');
        }

        message.chat.sendMessage('Veuillez patienter...');
        processingUsers.add(message.author.id);

        message.reply('Moyenne: '+ (await session.marks()).averages.student);

        processingUsers.delete(message.author.id);
    }

    /**
         * @command !picture
         */
    else if (message.content === '!picture') {
        await message.reply('Veuillez patienter...');
        const img = await promises.readFile(`./images/${student.pronoteUsername}.png`);
        await message.chat.sendPhoto(img);
        setTimeout(() => message.reply('Voilà votre photo de profil Pronote!'), 500);
    }

    /**
         * @command !notif
         */
    else if (message.content === '!notif') {
        /* NOTIF COMMAND */
        if (student.notifEnabled) {
            return message.reply(
                'Les notifications sont déjà activées ! Tapez !dénotif pour les désactiver.'
            );
        }
        await bot.database.updateNotifSettings(message.author.id, true);
        message.reply(
            'Vous recevrez une notification lorsque votre compte est modifié sur Pronote ! Tapez !dénotif pour désactiver cette option.'
        );
    }

    /**
         * @command !dénotif
         */
    else if (message.content === '!dénotif') {
        /* DÉNOTIF COMMAND */
        if (!student.notifEnabled) {
            return message.reply(
                'Les notifications sont déjà désactivées ! Tapez !notif pour les activer.'
            );
        }
        await bot.database.updateNotifSettings(message.author.id, false);
        message.reply(
            'Vous ne recevrez plus de notification lorsqu\'une note est ajoutée sur Pronote... Tapez !notif pour réactiver cette option.'
        );
    }

    /**
         * @command !recap
         */
    else if (message.content === '!recap') {
        return message.reply('⚠️ Suite à une décision du gouvernement français, les cours ne s\'organisent plus de la même façon à compter du lundi 16 mars 2020.');
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
    else if (message.content === '!menu') {
        return message.reply('⚠️ Suite à une décision du gouvernement français, les cours ne s\'organisent plus de la même façon à compter du lundi 16 mars 2020.');
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
    else if (message.content === '!devoirs'){
        // Check if the user can run a command
        if (isProcessing) {
            return message.reply(
                '⌛ Une requête est déjà en cours... merci de patienter!'
            );
        }

        // Update user cooldown
        processingUsers.delete(message.author.id);

        message.reply('Veuillez patienter...');

        const homeworks = await session.homeworks();

        message.reply(
            stripIndent`
                📚 ${homeworks.length} devoirs
                ${homeworks.map((d) => `- ${d.subject}`).join('\n')}
            `
        );
    }

    /**
         * @command !help
         */
    else {
        await message.reply(
            generateHelpPage({
                notifications: student.notifEnabled
            })
        );
    }
});
