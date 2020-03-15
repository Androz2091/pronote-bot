const database = require("./config.json").database;
const pg = require("pg");
const pool = new pg.Pool(database);

const credentials = require("./credentials.json");
credentials.forEach(async (c) => {
    const { rows } = await pool.query(`
        SELECT * FROM students
        WHERE insta_username = '${c.insta}'; 
    `);
    if(rows[0]) return console.log(c.insta+" already restored.");
    await pool.query(`
        INSERT INTO students
        (insta_username, ent_username, ent_password) VALUES
        ('${c.insta}', '${c.username}', '${c.password}');
    `);
    console.log(c.insta+" restored.");
});
