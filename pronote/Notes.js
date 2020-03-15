const { formatMatiere } = require("../helpers/functions");

module.exports = class Notes {

    constructor(student, listeNotes, pluriNotes){
        this.student = student;
        this.listeNotes = listeNotes;
        this.pluriNotes = pluriNotes;
        this.matieresDernieresNotes = [];

        this.moyenneRaw = listeNotes.donneesSec.donnees.moyGenerale.V;
        this.moyenne = this.moyenneRaw.startsWith("|") ? null : this.moyenneRaw;
        this.parsedMoyenne = parseFloat(this.moyenne.replace(",", "."));

        this.moyennePluriRaw = pluriNotes.donneesSec.donnees.listeDonnees.V.sort(
            (a, b) => parseInt(b.L) - parseInt(a.L)
        )[0].moyenne.V;
        this.moyennePluri = this.moyennePluriRaw.startsWith("|") ? null : this.moyennePluriRaw;
        this.parsedMoyennePluri = parseFloat(this.moyennePluri.replace(",", "."));

        this.cache = null;
    }

    formatNotes(){
        listeNotes.donneesSec.donnees.listeServices.V.map(
            matiere => {
                this.matieresDernieresNotes.push({
                    // nom de la matière
                    nom: formatMatiere(matiere.L),
                    // moyenne de l'élève
                    moyenne: matiere.moyEleve.V
                });
            }
        );
    }

    async fetchCache(){
        const { rows } = await this.student.handler.query(`
            SELECT * FROM student_cache_notes
            WHERE insta_username = '${this.student.instaUsername}';
        `);
        if(!rows[0]) return;
        this.cache = rows[0];
        return;
    }

};