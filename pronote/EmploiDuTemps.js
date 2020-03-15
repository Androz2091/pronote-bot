const Journee = require("./Journee");

module.exports = class EmploiDuTemps {

    constructor(student, emploisDuTemps){
        this.student = student;
        this.emploisDuTemps = emploisDuTemps;
        this.journees = [];
        // Pour chaque emploi du temps
        for (const emploiDuTemps of emploisDuTemps) {
            // Récupération de toutes les dates
            const dates = [];
            emploiDuTemps.donneesSec.donnees.ListeCours.forEach(c => {
                const coursDate = c.DateDuCours.V.split("/")[0];
                if (!dates.includes(coursDate)) {
                    dates.push(coursDate);
                }
            });
            // Création d'instances de Journee
            this.journees = this.journees.concat(
                dates.map((date) => new Journee(date, emploiDuTemps))
            );
        }
    }

};