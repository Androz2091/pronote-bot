const date = require("date-and-time");
require("date-and-time/locale/fr");
date.locale("fr");
const { formatMatiere } = require("../helpers/functions");

/**
 * Représente un cours
 */
class Cours {
    constructor(coursData) {
        // Le nom de la matière
        this.matiere = formatMatiere(
            (
                coursData.ListeContenus.V.find(v => v.G === 16) || {
                    L: "Unknown"
                }
            ).L
        );
        // La durée du cours en millisecondes
        this.duration = coursData.duree * 15 * 60 * 1000;
        // La date de début de cours
        this.startDate = new Date(
            date.parse(coursData.DateDuCours.V, "DD/MM/YYYY HH:mm:ss")
        );
        this.formattedStartDate = `${("0" + this.startDate.getHours()).slice(
            -2
        )}h${("0" + this.startDate.getMinutes()).slice(-2)}`;
        // La date de fin de cours
        this.endDate = new Date(
            this.startDate.getTime() + coursData.duree * (60000 * 15)
        );
        this.formattedEndDate = `${("0" + this.endDate.getHours()).slice(
            -2
        )}h${("0" + this.endDate.getMinutes()).slice(-2)}`;
        // La salle du cours
        this.salle = (
            coursData.ListeContenus.V.find(v => v.G === 17) || { L: "Unknown" }
        ).L;
        // Si le cours est annulé
        this.annule = coursData.estAnnule || false;
        // Si le cours est exceptionnel
        this.exceptionnel =
            (coursData.Statut && coursData.Statut === "Exceptionnel") || false;
        // Si le cours est modifié
        this.modifie =
            (coursData.Statut && coursData.Statut === "Cours modifi\u00E9") ||
            false;
        // Si la salle est changée
        this.salleChangee =
            (coursData.Statut && coursData.Statut === "Changement de salle") ||
            false;
        // Si le cours est déplacé
        this.deplace =
            (coursData.Statut &&
                coursData.Statut === "Cours d\u00E9plac\u00E9") ||
            false;
    }

    /**
     * Si le cours est ajouté
     */
    get isAdded() {
        return this.exceptionnel || this.modifie || this.deplace;
    }

    /**
     * Si le cours est supprimé
     */
    get isRemoved() {
        return this.annule;
    }

    /**
     * Si le cours est normal
     */
    get isNormal() {
        return !this.isAdded && !this.isRemoved && !this.salleChangee;
    }

    /**
     * Affiche les informations sur le cours
     */
    get coursInfos() {
        if (this.isNormal) return false;
        // Si le cours est annulé
        if (this.annule) {
            return [
                `🚫 | Cours annulé`,
                `Matière: ${this.matiere}`,
                `Heure: de ${this.formattedStartDate} à ${this.formattedEndDate}`
            ].join("\n");
        }
        // Si le cours est modifié
        else if (this.modifie) {
            return [
                `🆕 | Cours modifié`,
                `Matière: ${this.matiere}`,
                `Heure: de ${this.formattedStartDate} à ${this.formattedEndDate}`,
                `Salle: ${this.salle}`
            ].join("\n");
        }
        // Si le cours est déplacé
        else if (this.deplace) {
            return [
                `🆕 | Cours déplacé`,
                `Matière: ${this.matiere}`,
                `Heure: de ${this.formattedStartDate} à ${this.formattedEndDate}`,
                `Salle: ${this.salle}`
            ].join("\n");
        }
        // Si le cours est exceptionnel
        else if (this.exceptionnel) {
            return [
                `🆕 | Cours exceptionnel`,
                `Matière: ${this.matiere}`,
                `Heure: de ${this.formattedStartDate} à ${this.formattedEndDate}`,
                `Salle: ${this.salle}`
            ].join("\n");
        }
        // Si la salle est changée
        else if (this.salleChangee) {
            return [
                `✏️ | Salle modifiée`,
                `Matière: ${this.matiere}`,
                `Heure: de ${this.formattedStartDate} à ${this.formattedEndDate}`,
                `Nouvelle salle: ${this.salle}`
            ].join("\n");
        }
        return false;
    }
}

module.exports = Cours;
