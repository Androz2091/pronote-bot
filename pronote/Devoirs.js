module.exports = class Devoirs {

    constructor(student, devoirs){
        this.student = student;
        this.list = devoirs;

        this.cache = null;
    }

    getDevoirsAdded(){
        const added = [];
        this.list.forEach((devoir) => {
            if(!this.cache.some((d) => d.content === devoir.content)){
                added.push(devoir);
            }
        });
        return added;
    }

    async saveCache(){
        if(this.cache){
            await this.student.handler.query(`
                UPDATE student_cache_devoirs
                SET devoirs = '${JSON.stringify(this.list).replace(/'/g, "''")}'
                WHERE insta_username = '${this.student.instaUsername}';
            `);
            this.cache = this.list;
        } else {
            await this.student.handler.query(`
                INSERT INTO student_cache_devoirs
                (insta_username, devoirs) VALUES
                ('${this.student.instaUsername}', '${JSON.stringify(this.list).replace(/'/g, "''")}');
            `);
            
            this.cache = this.list;
        }
        
    }

    async fetchCache(){
        const { rows } = await this.student.handler.query(`
            SELECT * FROM student_cache_devoirs
            WHERE insta_username = '${this.student.instaUsername}';
        `);
        if(!rows[0]) return;
        this.cache = rows[0].devoirs;
        return;
    }

};