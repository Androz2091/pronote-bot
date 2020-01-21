const { writeFileSync, existsSync, mkdirSync, readFileSync } = require('fs');
const beautify = require('json-beautify');
const { get } = require("request-promise");
const reload = require("require-reload")(require);

const formattedSubjects = require('../matieres.json');
const formatMatiere = (nom) => {
    let data = formattedSubjects.find((d) => d[0] === nom);
    if(data){
        return data[1];
    }
    return nom.charAt(0).toUpperCase()+nom.substr(1, nom.length).toLowerCase();
};

const Journee = require('./Journee');

/**
 * Représente un élève sur Pronote.
 */
class Eleve {
    /**
     * @param {Object} listeNotes Les notes affichées dans la section "Dernières Notes"
     * @param {Object} pluriNotes Les notes affichées dans le suivi pluriannuel
     * @param {Object} emploiDuTemps L'emploi du temps de l'élève
     * @param {Object} username Le prénom et le nom de l'élève
     * @param {String} pdpURL La photo de profil de l'élève
     */
    constructor(listeNotes, pluriNotes, emploiDuTemps, username, pdpURL){
        // Formate les matières correctement
        this.matieresDernieresNotes = listeNotes.donneesSec.donnees.listeServices.V.map((matiere) => {
            return {
                // nom de la matière
                nom: formatMatiere(matiere.L),
                // moyenne de l'élève
                moyenne: matiere.moyEleve.V
            };
        });
        let dates = [];
        emploiDuTemps.donneesSec.donnees.ListeCours.forEach((c) => {
            let coursDate = (c.DateDuCours.V).split("/")[0];
            if(!dates.includes(coursDate)){
                dates.push(coursDate);
            }
        });
        this.journees = dates.map((d) => new Journee(d, emploiDuTemps));
        // Nom de l'élève
        this.name = username;
        // Moyenne de l'élève
        this.moyenne = listeNotes.donneesSec.donnees.moyGenerale.V.startsWith('|') ? null : listeNotes.donneesSec.donnees.moyGenerale.V;
        // Moyenne de l'élève (pluriannuelle)
        this.moyennePluri = pluriNotes.donneesSec.donnees.listeDonnees.V.sort((a, b) => parseInt(b.L) - parseInt(a.L))[0].moyenne.V;
        // Vérifier que tous les fichiers existent bien
        if(!existsSync(`./data/${this.name}`)) mkdirSync(`./data/${this.name}`);
        if(!existsSync(`./data/${this.name}/cache.json`)) writeFileSync(`./data/${this.name}/cache.json`, '{}', 'utf-8');
        if(!existsSync(`./data/${this.name}/history.json`)) writeFileSync(`./data/${this.name}/history.json`, '[]', 'utf-8');
        // Cache pour l'élève
        this.cache = require(`../data/${this.name}/cache.json`);
        // Historique des moyennes
        this.history = require(`../data/${this.name}/history.json`);
        // Photo de profil
        this.pdpURL = pdpURL;
        if(!existsSync(`../images/${this.name}.png`)){
            this.writePdp();
        }
    }

    /**
     * Enregistre la photo de profil de l'élève
     */
    async writePdp() {
        const imageRequest = await get({ url: this.pdpURL, encoding: null });
        let imgBuffer = Buffer.from(imageRequest, 'binary');
        writeFileSync(`./images/${this.name}.png`, imgBuffer);
    }

    /**
     * Sauvegarde le cache pour cet élève
     */
    saveCache() {
        // Génération des données cache
        this.cache = {
            matieres: this.matieresDernieresNotes,
            moyenne: this.moyenne,
            moyennePluri: this.moyennePluri
        };
        // Ecriture du fichier
        let beautifiedCache = beautify(this.cache, null, 2, 100);
        writeFileSync(`./data/${this.name}/cache.json`, beautifiedCache, 'utf-8');
        reload(`../data/${this.name}/cache.json`);
    }

    /**
     * Sauvegarde l'historique des moyennes de l'élève
     */
    saveHistory() {
        let date = new Date();
        // Suppression des données si elles existent déjà
        if(this.history.some((d) => d.label === `${date.getDate()}/${date.getMonth()+1}`)){
            this.history = this.history.filter((d) => d.label !== `${date.getDate()}/${date.getMonth()+1}`);
        }
        // Ajout des données
        this.history.push({
            label: `${date.getDate()}/${date.getMonth()+1}`,
            value: this.moyenne || "ABS"
        });
        // Ecriture du fichier
        let beautifiedHistory = beautify(this.history, null, 2, 100);
        writeFileSync(`./data/${this.name}/history.json`, beautifiedHistory, 'utf-8');
        reload(`../data/${this.name}/history.json`);
    }

    /**
     * Obtiens le résumé du lendemain pour l'utilisateur
     * @param {Boolean} auto Si le summary est demandé par un process automatique
     */
    getSummary(auto) {
        // Si la journée à afficher est celle du lendemain
        let mustGetTomorrow = new Date().getHours() > 17;
        // Incrémente le jour à obtenir
        let date = new Date();
        if(mustGetTomorrow) date.setDate(date.getDate()+1);
        // Récupération de la journée
        let journee = this.journees.find((j) => j.date.getDate() === date.getDate());
        // Si la journée n'est pas trouvée (cela peut arriver car le lundi n'est pas chargé)
        if(!journee) return 'unreachable';
        let modifications = [];
        journee.cours.forEach((cours) => {
            if(cours.coursInfos) modifications.push(cours.coursInfos);
        });
        console.log(modifications.length);
        if(modifications.length < 1 && auto) return false;
        console.log(modifications.length);
        let message = `🔔Pronote Bot [process.sum]\n\n${journee.dateInfos}\n\n${journee.durationInfos}\n\n${modifications.length < 1 ? "Aucune modification d'emploi du temps." : modifications.join("\n\n") }\n\n${journee.arriveeInfos}\n${journee.sortieInfos}`;
        return message;
    }

    /**
     * Trouve les différences de moyennes entre le cache et les données actuelles
     */
    getDifferences() {
        if(Object.keys(this.cache).length === 0) return { oldGenerale: 0, newGenerale: 0, differences: [] };
        if(!this.cache.moyenne){
            return { oldGenerale: 0, newGenerale: 0, differences: [] };
        }
        let differences = [];
        // Pour chaque matière du cache
        this.cache.matieres.forEach((matiereCache) => {
            let matiereActu = this.matieresDernieresNotes.find((m) => m.nom === matiereCache.nom);
            if(!matiereActu) return;
            // S'il y a une différence de moyenne
            if(matiereCache.moyenne !== matiereActu.moyenne){
                differences.push({
                    matiereNom: matiereCache.nom,
                    oldMoyenne: matiereCache.moyenne,
                    newMoyenne: matiereActu.moyenne
                });
            }
        });
        return {
            // Moyenne générale du cache
            oldGenerale: this.cache.moyenne,
            // Moyenne générale actuelle
            newGenerale: this.moyenne,
            // Différences de moyenne pour chaque moyenne
            differences
        };
    }

};

module.exports = Eleve;