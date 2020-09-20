interface SubjectArray {
    [subject: string]: string;
}

export const SUBJECTS: SubjectArray = {
    'ESPAGNOL LVA-LVB': 'Espagnol',
    'PHYSIQUE-CHIMIE': 'Physique-Chimie',
    'FRANCAIS': 'Français'
};

export const getSubjectName = (subject: string, pronoteName: boolean) => {
    return (pronoteName ? Object.keys(SUBJECTS).find((sname) => SUBJECTS[sname] === subject) : SUBJECTS[subject]) || subject;
};
