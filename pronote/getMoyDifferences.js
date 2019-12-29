const stringSimilarity = require("string-similarity");

const arrondiALaPronote = (nombre) => {
    // Si nombre == 12
    if(!String(nombre).includes(".")) return nombre;
    // Si nombre == 12.34
    if(String(nombre).split(".")[1].length <= 2) return nombre;
    // Si nombre == 12.454
    if(!String(nombre).endsWith("5")) return nombre.toFixed(2);
    // Si nombre == 12.455
    return Number(String(nombre).split(".")[0]+"."+Math.ceil(Number(String(nombre).split(".")[1])/10))
};

/**
 * Compare les moyennes des dernières notes avec celles du suivi pluriannuel et retourne les différences
 * @param {object} reponse1 Le premier objet de réponse (dernières notes)
 * @param {object} reponse2 Le deuxième objet de réponse (suivi pluriannuel)
 * @returns {Array<object>} Les moyennes qui sont différentes
 */
const getMoyennesDifferentes = (reponse1, reponse2) => {
    /* RECUPERATION DE LA LISTE DES MATIERES FORMATEES AVEC NOM ET MOYENNE */

    /* DERNIERES NOTES */
    let matieresDernieresNotes = [];
    // Pour chaque matière
    reponse1.donneesSec.donnees.listeServices.V.forEach((matiere) => {
        // Ajout de la matière formatée dans la liste
        matieresDernieresNotes.push({
            // Nom de la matière
            nom: matiere.L,
            // Moyenne de l'élève
            moyenne: matiere.moyEleve.V
        });
    });

    /* SUIVIPLURIANNUEL */
    let matieresSuiviPluri = [];
    // Pour chaque matière
    reponse2.donneesSec.donnees.listeDonnees.V.sort((a, b) => parseInt(b.L) - parseInt(a.L))[0].listeSuivis.V.forEach((v) => {
        // Ajout de la matière formatée dans la liste
        matieresSuiviPluri.push({
            // Nom de la matière
            nom: v.strMeta,
            // Moyenne de l'élève
            moyenne: v.moyenne.V
        });
    });

    /* GENERATION MOYENNE GLOBALE ANGLAIS */
    /* Dans le suivi pluriannuel, seule la moyenne des
     * moyennes de langue (compréhension écrite, expression orale, etc..) est affichée.
     * Il faut donc calculer la moyenne des moyennes pour la comparer
    */
    let moyenneAnglais = 0;
    let nbNotesAnglais = 0;
    // Pour chaque moyenne d'anglais
    matieresDernieresNotes.filter((m) => m.nom.startsWith("ANGLAIS")).forEach((m) => {
        // Ajout à la moyenne
        moyenneAnglais += parseFloat(m.moyenne.replace(",", "."));
        // Incrémentation nb de notes totales
        nbNotesAnglais++;
    });
    moyenneAnglais = arrondiALaPronote(moyenneAnglais/nbNotesAnglais, 2);
    matieresDernieresNotes.push({
        // Le nom sur le suivi pluriannuel est LV1
        nom: "LV1",
        // Moyenne de l'élève
        moyenne: String(moyenneAnglais).replace(".", ",")
    });
    // Suppression des autres moyennes ANGLAIS
    matieresDernieresNotes = matieresDernieresNotes.filter((m) => !m.nom.startsWith("ANGLAIS"));

    if(matieresDernieresNotes.some((n) => n.nom.startsWith("ESPAGNOL"))){
        /* GENERATION MOYENNE GLOBALE ESPAGNOL */
        /* Dans le suivi pluriannuel, seule la moyenne des
         * moyennes de langue (compréhension écrite, expression orale, etc..) est affichée.
         * Il faut donc calculer la moyenne des moyennes pour la comparer
         */
        let moyenneEspagnol = 0;
        let nbNotesEspagnol = 0;
        // Pour chaque moyenne d'anglais
        matieresDernieresNotes.filter((m) => m.nom.startsWith("ESPAGNOL")).forEach((m) => {
            // Ajout à la moyenne
            moyenneEspagnol += parseFloat(m.moyenne.replace(",", "."));
            // Incrémentation nb de notes totales
            nbNotesEspagnol++;
        });
        moyenneEspagnol = arrondiALaPronote(moyenneEspagnol/nbNotesEspagnol, 2);
        matieresDernieresNotes.push({
            // Le nom sur le suivi pluriannuel est LV2
            nom: "LV2",
            // Moyenne de l'élève
            moyenne: String(moyenneEspagnol).replace(".", ",")
        });
        // Suppression des autres moyennes ESPAGNOL
        matieresDernieresNotes = matieresDernieresNotes.filter((m) => !m.nom.startsWith("ESPAGNOL"));
    }
    
    /* RENOMMAGE SVT */
    // Svt est appelé SCIENCES VIE & TERRE sur dernières notes
    matieresDernieresNotes.find((m) => m.nom === "SCIENCES VIE & TERRE").nom = "SVT";

    let moyenneDifferentes = [];
    // Pour chaque moyenne
    matieresDernieresNotes.forEach((m) => {
        // Récupération de la moyenne du suivi pluriannuel correspondante
        let moyenneSuiviPluriCorrespondante = matieresSuiviPluri.find((m2) => stringSimilarity.compareTwoStrings(m2.nom, m.nom) > 0.6);
        try {
            // Si la moyenne n'est pas la même, on la renvoie
            if(moyenneSuiviPluriCorrespondante.moyenne !== m.moyenne){
                moyenneDifferentes.push({
                    // Moyenne "dernière note"
                    ancienneMoyenne: m.moyenne,
                    // Moyenne "suivi pluriannuel"
                    nouvelleMoyenne: moyenneSuiviPluriCorrespondante.moyenne,
                    // Nom de la matière dont la moyenne a bougé
                    matiere:    m.nom === "LV1" ? "Anglais"   :
                                m.nom === "LV2" ? "Espagnol"  :
                                (m.nom.charAt(0).toUpperCase()+m.nom.substring(1, m.nom.length).toLowerCase())
                });
            }
        } catch(e){
            console.log(moyenneSuiviPluriCorrespondante, m);
        }
    });
    return {
        diff: moyenneDifferentes,
        moyNormale: reponse1.donneesSec.donnees.moyGenerale.V,
        moyPluri: reponse2.donneesSec.donnees.listeDonnees.V.sort((a, b) => parseInt(b.L) - parseInt(a.L))[0].moyenne.V,
    };
};

module.exports = getMoyennesDifferentes;

