const Cours = require('./Cours');

const dateAndTime = require('date-and-time');
require('date-and-time/locale/fr');
dateAndTime.locale('fr');

/**
 * Représente une journée
 */
class Journee {

    constructor(date, emploiDuTemps){
        // Cours de la journée
        this.coursRaw = emploiDuTemps.donneesSec.donnees.ListeCours.filter((c) => (c.DateDuCours.V).split('/')[0] === date);
        // Cours formatés
        this.cours = this.coursRaw.map((c) => new Cours(c)).sort((a,b) => a.startDate - b.startDate);
        this.cours.forEach((cours) => {
            // Suppression des cours annulés en trop
            if(cours.annule){
                // Si un cours remplace entièrement le cours
                if(this.cours.some((c) => {
                    // Qu'il n'est pas lui-même annulé
                    return !c.isRemoved &&
                    // S'il commence avant ou au même moment
                    c.startDate.getTime() <= cours.startDate.getTime() &&
                    // S'il finit après ou au moment moment
                    c.endDate.getTime() >= cours.endDate.getTime()
                })){
                    // Suppression du cours
                    this.cours = this.cours.filter((c) => c !== cours);
                };
            }
        });
        // Heure de cours
        this.numberOfHoursMS = this.cours.filter((c) => !c.isRemoved).map((c) => c.duration).reduce((p, c) => p+c);
        this.numberOfHours = this.numberOfHoursMS/3600000;
        // Debut et fin des cours
        this.coursStart = new Date(this.cours.filter((c) => !c.isRemoved)[0].startDate);
        this.coursEnd = new Date(this.cours.filter((c) => !c.isRemoved)[this.cours.filter((c) => !c.isRemoved).length-1].endDate);
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
            return `Total: ${this.numberOfHours}h de cours`;
        }
    }

    /**
     * La date à afficher sur le summary
     */
    get dateInfos () {
        return `Journée du ${dateAndTime.format(this.date, "dddd D MMMM")}`;
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
        return `Sortie possible: ${this.cours[this.cours.length-1].formattedEndDate}`;
    }

}

module.exports = Journee;