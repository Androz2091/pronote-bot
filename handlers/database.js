const { Pool } = require("pg");
const Collection = require("@discordjs/collection");
const Student = require("../pronote/Student");

module.exports = class DatabaseHandler {
    constructor(bot) {
        this.bot = bot;
        const { database } = bot.config;
        this.pool = new Pool(database);
        this.cacheStudents = new Collection();
    }

    // Make a new query to the db
    query(string) {
        return new Promise((resolve, reject) => {
            this.pool.query(string, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    }

    fetchStudents(){
        return new Promise(async resolve => {
            const { rows } = await this.query(`
                SELECT * FROM students;
            `);
            const students = rows.map((row) => new Student(this, row));
            resolve(students);
        });
    }

    fetchStudent(insta, fullFetch) {
        return new Promise(async resolve => {
            let student = this.cacheStudents.get(insta);
            if(!student){
                const { rows } = await this.query(`
                    SELECT * FROM students
                    WHERE insta_username = '${insta}'
                `);
                student = new Student(this, rows[0]);
                this.cacheStudents.set(insta, student);
            }
            if(fullFetch){
                await student.fetch();
            }
            resolve(student);
        });
    }

    createStudent(data){
        return new Promise(async resolve => {
            const student = new Student(this, data);
            this.cacheStudents.set(data.insta_username, student);
            await student.insert();
            resolve(student);
        });
    }

    deleteStudent(insta){
        return new Promise(async resolve => {
            const student = this.cacheStudents.get(insta);
            if(!student){
                const { rows } = await this.query(`
                    SELECT * FROM students
                    WHERE insta_username = '${data}'
                `);
                student = new Student(this, rows[0]);
                this.cacheStudents.set(insta, student);
            }
            await student.old();
            resolve(student);
        });
    }

};
