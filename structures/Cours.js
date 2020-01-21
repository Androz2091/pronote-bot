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
 * Représente un cours
 */
class Cours {

    constructor(coursData){
        // Le nom de la matière
        this.matiere = formatMatiere(c.ListeContenus.V.find((v) => v.G === 16).L || 'Unknown');
        // La durée du cours en millisecondes
        this.duration = (coursData.duree*15)*60*100;
        // La date de début de cours
        this.startDate = new Date(date.parse(coursData.DateDuCours.V, 'DD/MM/YYYY HH:mm:ss'));
        this.formattedStartDate = `${("0" + startDate.getHours()).slice(-2)}h${("0" + startDate.getMinutes()).slice(-2)}`;
        // La date de fin de cours
        this.endDate = new Date(startDate.getTime()+(coursData.duree*(60000*15)));
        this.formattedEndDate = `${("0" + endDate.getHours()).slice(-2)}h${("0" + endDate.getMinutes()).slice(-2)}`;
        // La salle du cours
        this.salle = c.ListeContenus.V.find((v) => v.G === 17).L || 'Unknown';
        // Si le cours est annulé
        this.annule = coursData.estAnnule || false;
        // Si le cours est exceptionnel
        this.exceptionnel = (c.Statut && c.Statut === "Exceptionnel") || false;
        // Si le cours est modifié
        this.modifie = (c.Statut && c.Statut === "Cours modifi\u00E9") || false;
        // Si le cours est déplacé
        this.deplace = (c.Statut && c.Statut === "Cours d\u00E9plac\u00E9") || false;
    }

    /**
     * Si le cours est ajouté
     */
    get isAdded () {
        return this.exceptionnel || this.modifie || this.deplace;
    }

    /**
     * Si le cours est supprimé
     */
    get isRemoved () {
        return this.annule;
    }

    /**
     * Si le cours est normal
     */
    get isNormal () {
        return !this.isAdded && !this.isRemoved;
    }

}

module.exports = Cours;