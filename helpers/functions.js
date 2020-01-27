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

module.exports = {
    formatMatiere,
    asyncForEach
};
