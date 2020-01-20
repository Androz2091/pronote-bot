const { writeFileSync, existsSync, mkdirSync, readFileSync } = require('fs');
const beautify = require('json-beautify');
const { get } = require("request-promise");
const reload = require("require-reload")(require);
const date = require('date-and-time');
require('date-and-time/locale/fr');
date.locale('fr');

const formattedSubjects = require('../formatted_subjects.json');

const formatMatiere = (nom) => {
    let data = formattedSubjects.find((d) => d[0] === nom);
    if(data){
        return data[1];
    }
    return nom.charAt(0).toUpperCase()+nom.substr(1, nom.length).toLowerCase();
};

/**
 * Représente un élève sur Pronote.
 */
class Student {
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
        // Emploi du temps pour le lendemain
        this.emploiDuTemps = emploiDuTemps.donneesSec.donnees.ListeCours.filter((c) => (c.DateDuCours.V).split('/')[0] === String(new Date().getDate()+1)).map((c) => {
            let startDate = new Date(date.parse(c.DateDuCours.V, 'DD/MM/YYYY HH:mm:ss'));
            let endDate = new Date(startDate.getTime()+(c.duree*(60000*15)));
            let matiereData = {
                matiere: c.ListeContenus.V.find((v) => v.G === 16).L,
                duree: c.duree,
                date: date.parse(c.DateDuCours.V, 'DD/MM/YYYY HH:mm:ss'),
                salle: c.ListeContenus.V.find((v) => v.G === 17).L,
                startDate,
                endDate,
                formattedDate: `${("0" + startDate.getHours()).slice(-2)}h${("0" + startDate.getMinutes()).slice(-2)}`,
                formattedEndDate: `${("0" + endDate.getHours()).slice(-2)}h${("0" + endDate.getMinutes()).slice(-2)}`,
                annule: c.estAnnule || false,
                exceptionnel: (c.Statut && c.Statut === "Exceptionnel") || false,
                modifie: (c.Statut && c.Statut === "Cours modifi\u00E9") || false,
                deplace: (c.Statut && c.Statut === "Cours d\u00E9plac\u00E9") || false
            };
            matiereData.isValid = (!matiereData.annule);
            return matiereData;
        }).sort((a,b) => a.date - b.date);
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
     */
    getSummary() {
        let duration = '';
        let numberOfHours = this.emploiDuTemps.map((c) => c.isValid && c.duree*15).reduce((p, c) => p+c)/60;
        let notInt = String(numberOfHours).includes('.');
        let [ hours, minutes ] = String(numberOfHours).split('.');
        if(notInt){
            duration = `${hours}h${parseInt(minutes)*6}`;
        } else {
            duration = numberOfHours+'h';
        }
        let modifications = [];
        this.emploiDuTemps.forEach((h) => {
            if(h.annule){
                modifications.push(`🚫 | Cours annulé\nMatière: ${formatMatiere(h.matiere)}\nHeure: de ${h.formattedDate} à ${h.formattedEndDate}`);
            } else if(h.modifie){
                modifications.push(`🆕 | Cours modifié\nMatière: ${formatMatiere(h.matiere)}\nHeure: de ${h.formattedDate} à ${h.formattedEndDate}\nSalle: ${h.salle}`);
            } else if(h.deplace){
                modifications.push(`🆕 | Cours déplacé\nMatière: ${formatMatiere(h.matiere)}\nHeure: de ${h.formattedDate} à ${h.formattedEndDate}\nSalle: ${h.salle}`)
            } else if(h.exceptionnel){
                modifications.push(`🆕 | Cours exceptionnel\nMatière: ${formatMatiere(h.matiere)}\nHeure: de ${h.formattedDate} à ${h.formattedEndDate}\nSalle: ${h.salle}`);
            }
        });
        if(modifications.length < 1) return false;
        let dateTomorrow = new Date();
        dateTomorrow.setDate(dateTomorrow.getDate()+1);
        return `🔔Pronote Bot [process.sum]\n\nJournée du ${date.format(dateTomorrow, 'dddd D MMMM')}\nTotal: ${duration} de cours\n\n${modifications.join('\n\n')}\n\nHeure de sortie possible: ${this.emploiDuTemps.pop().formattedEndDate}`;
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

module.exports = Student;