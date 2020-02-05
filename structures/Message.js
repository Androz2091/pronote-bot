const cheerio = require("cheerio");

const { entViewMessageURL } = require("../config");
const { writeFileSync, existsSync, mkdirSync, readFileSync } = require("fs");

const dayNames = [
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
    "dimanche"
];

const dateAndTime = require("date-and-time");
require("date-and-time/locale/fr");
dateAndTime.locale("fr");

const format = (name, reverse) => {
    let final = [];
    name.split(" ").forEach(s => {
        final.push(
            `${s.charAt(0).toUpperCase()}${s.substr(1, s.length).toLowerCase()}`
        );
    });
    if (reverse) final = final.reverse();
    return final.join(" ");
};

class Message {
    constructor(pageContent, username) {
        this.name = username;

        let date = null;

        // Vérifier que tous les fichiers existent bien
        if (!existsSync(`./data/${this.name}`))
            mkdirSync(`./data/${this.name}`);
        if (!existsSync(`./data/${this.name}/cache.json`))
            writeFileSync(`./data/${this.name}/cache.json`, "{}", "utf-8");
        if (!existsSync(`./data/${this.name}/history.json`))
            writeFileSync(`./data/${this.name}/history.json`, "[]", "utf-8");
        if (!existsSync(`./data/${this.name}/lastMessage.json`))
            writeFileSync(
                `./data/${this.name}/lastMessage.json`,
                `{ "date": null }`,
                "utf-8"
            );
        date = "000";

        if (!date) date = require(`./data/${this.name}/lastMessage.json`);

        this.pageContent = pageContent;
        const $ = cheerio.load(pageContent);
        this.pageLastMessage = $("#js_boite_reception").get(0).children[1];

        // Si le message est lu
        this.isRead = !this.pageLastMessage.children[3].children[1].attribs.class.includes(
            "b-like"
        );
        this.author = this.pageLastMessage.children[3].children[1].children[13].attribs.title;
        this.formattedAuthor = format(this.author, true);
        this.subject = this.pageLastMessage.children[7].children[1].children[1].children[0].data.trim();
        this.formattedDate = this.pageLastMessage.children[11].children[1].attribs.title;
        this.formattedDateWithoutDay = this.formattedDate
            .split(" ")
            .filter(i => !dayNames.includes(i))
            .join(" ");
        this.date = dateAndTime.parse(
            this.formattedDateWithoutDay,
            "D MMMM YYYY à HH:mm"
        );
        this.endOfLink = this.pageLastMessage.children[7].children[1].children[1].attribs.href;
        this.fullLink = `${entViewMessageURL}${this.endOfLink}`;
        this.mustBeSent = date !== this.formattedDate && !this.isRead;
    }

    get formatted() {
        return `📮 Nouveau mail\n\nℹ️ Objet: ${this.subject}\n\n👤 Auteur: ${this.formattedAuthor}\n\n🔗 Voir le message:\n\n${this.fullLink}`;
    }

    saveIt() {
        writeFileSync(
            `./data/${this.name}/lastMessage.json`,
            JSON.stringify({
                date: this.formattedDate
            }),
            "utf-8"
        );
    }
}

module.exports = Message;
