const matieresFormatees = require("../matieres.json");
const formatMatiere = (nom, reverse) => {
    let data = matieresFormatees.find(d => (reverse ? d[1] : d[0]) === nom);
    if (data) {
        return reverse ? data[0] : data[1];
    }
    return reverse
        ? nom
        : nom.charAt(0).toUpperCase() + nom.substr(1, nom.length).toLowerCase();
};

const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
};

const delay = ms => {
    return new Promise(res => {
        setTimeout(res, ms);
    });
};

const getLundi = date => {
    let day = date.getDay();
    let diff = date.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(date.setDate(diff));
};

const getVendredi = date => {
    let lundi = new Date(date);
    lundi.setDate(lundi.getDate() + 4);
    return lundi;
};

const getMois = date => {
    return [
        "janvier",
        "février",
        "mars",
        "avril",
        "mai",
        "juin",
        "juillet",
        "août",
        "septembre",
        "octobre",
        "novembre",
        "décembre"
    ][date.getMonth()];
};

const getMenuNom = () => {
    let dateWeek = new Date();
    // Si c'est samedi ou dimanche
    if (new Date().getDay() === 6 || new Date().getDay() === 0) {
        dateWeek.setDate(dateWeek.getDate() + 4);
    }
    return `${
        String(getLundi(dateWeek).getDate()).length === 1
            ? `0${getLundi(dateWeek).getDate()}`
            : getLundi(dateWeek).getDate()
    }-au-${
        String(getVendredi(dateWeek).getDate()).length === 1
            ? `0${getVendredi(dateWeek).getDate()}`
            : getVendredi(dateWeek).getDate()
    }-${getMois(dateWeek)}-${dateWeek.getFullYear()}`;
};

module.exports = {
    formatMatiere,
    asyncForEach,
    delay,
    getMenuNom
};
