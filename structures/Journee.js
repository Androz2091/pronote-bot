const Cours = require('./Cours');

/**
 * Représente une journée
 */
class Journee {

    constructor(date, emploiDuTemps){
        // Cours de la journée
        this.coursRaw = emploiDuTemps.donneesSec.donnees.ListeCours.filter((c) => (c.DateDuCours.V).split('/')[0] === date).map((c) => new Cours(c));
        // Cours formatés
        this.cours = this.coursRaw.map((c) => new Cours(c)).sort((a,b) => a.startDate - b.startDate);
        // Heure de cours
        this.numberOfHours = this.cours.map((c) => c.duration).reduce((p, c) => p+c);
        // Debut et fin des cours
        this.coursStart = new Date(this.cours[0].startDate());
        this.coursEnd = new Date(this.cours[this.cours.length-1]);
        // Date de la journée
        this.date = new Date(this.coursStart);
    }

    /**
     * La durée à afficher sur le summary
     */
    get durationInfos () {
        let notInt = String(this.numberOfHours).includes('.');
        let [ hours, minutes ] = String(this.numberOfHours).split('.');
        if(notInt){
            return `Total: ${hours}h${parseInt(minutes)*6} de cours`;
        } else {
            return `Total ${this.numberOfHours}h de cours`;
        }
    }

    /**
     * La date à afficher sur le summary
     */
    get dateInfos () {
        return `Journée du ${date.format(this.date, "dddd D MMMM")}`;
    }

    /**
     * Information pour les arrivées possibles
     */
    get arriveeInfos () {
        return `Arrivée possible: ${this.cours[0].formattedStartDate}`;
    }

    /**
     * Information pour les sorties possibles
     */
    get sortieInfos () {
        return `Sortie possible: ${this.cours[this.cours.length-1].formattedStartDate}`;
    }

}

module.exports = Journee;