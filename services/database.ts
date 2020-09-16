import { Pool, QueryResult } from 'pg';
import type PronoteBot from '../structures/PronoteBot';
import { database } from '../config.json';

export interface StudentPayload {
    instaID: string;
    instaUsername: string;
    pronoteURL: string;
    pronoteCas: string;
    pronoteUsername: string;
    pronotePassword: string;
    notifEnabled: boolean;
    isDeleted: boolean;
}

export default class DatabaseService {

    bot: PronoteBot;
    pool: Pool;

    constructor (bot: PronoteBot) {
        this.bot = bot;
        this.pool = new Pool(database);
        this.pool.on('connect', () => console.log('DB connected'));
    }

    // Make a new query to the db
    query (query: string): Promise<QueryResult> {
        return new Promise((resolve, reject) => {
            this.pool.query(query, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    }

    fetchStudents (): Promise<StudentPayload[]> {
        return new Promise(async (resolve) => {
            console.log('query');
            const { rows } = await this.query(`
                SELECT * FROM students
                WHERE is_deleted = false;
            `);
            resolve(rows.map((row) => {
                return {
                    instaID: row.insta_id,
                    instaUsername: row.insta_username,
                    pronoteUsername: row.pronote_username,
                    pronotePassword: row.pronote_password,
                    pronoteURL: row.pronote_url,
                    pronoteCas: row.pronote_cas,
                    notifEnabled: row.notif_enabled,
                    isDeleted: row.is_deleted
                };
            }));
        });
    }

    async createStudent (data: StudentPayload): Promise<void> {
        await this.query(`
            INSERT INTO students
            (insta_id, pronote_username, pronote_password, pronote_url, pronote_cas, notif_enabled, is_deleted) VALUES
            ('${data.instaID}', '${data.pronoteUsername}', '${data.pronotePassword}', '${data.pronoteURL}', '${data.pronoteCas}', true, false)
        `);
        this.bot.students.set(data.instaID, {
            instaID: data.instaID,
            instaUsername: data.instaUsername,
            pronoteUsername: data.pronoteUsername,
            pronotePassword: data.pronotePassword,
            pronoteURL: data.pronoteURL,
            pronoteCas: data.pronoteCas,
            notifEnabled: true,
            isDeleted: false
        });
    }

    async deleteStudent (instaID: string): Promise<void> {
        await this.query(`
            UDPATE FROM students
            WHERE insta_id = '${instaID}'
            SET is_deleted = true
        `);
        const oldStudent = this.bot.students.get(instaID);
        if (oldStudent) {
            oldStudent.isDeleted = true;
            this.bot.students.set(instaID, oldStudent);
        }
    }

    async updateNotifSettings (instaID: string, enabled: boolean): Promise<void> {
        await this.query(`
            UDPATE FROM students
            WHERE insta_id = '${instaID}'
            SET notif_enabled = ${enabled}
        `);
        const oldStudent = this.bot.students.get(instaID);
        if (oldStudent) {
            oldStudent.isDeleted = true;
            this.bot.students.set(instaID, oldStudent);
        }
    }

};
