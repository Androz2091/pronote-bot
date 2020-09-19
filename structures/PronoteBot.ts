import Collection from '@discordjs/collection';
import { Client as InstagramClient } from '@androz2091/insta.js';
import DatabaseService, { StudentPayload } from '../services/database';
import { PronoteSession, login } from 'pronote-api';
import { instagram } from '../config.json';

export default class PronoteBot {

    instagram: InstagramClient;
    database: DatabaseService;
    students: Collection<string, StudentPayload>;
    pronoteSessions: Collection<string, PronoteSession>;

    constructor (){

        // pronote API
        this.pronoteSessions = new Collection();

        // instagram API
        this.instagram = new InstagramClient({
            disableReplyPrefix: true
        });
        this.instagram.login(instagram.username, instagram.password);

        // database service
        this.database = new DatabaseService(this);

        // cache
        this.students = new Collection();

        this.syncDBCache().then(() => this.createSessions());
    }

    async syncDBCache () {
        const students = await this.database.fetchStudents();
        console.log(`${students.length} students fetched.`);
        students.forEach((rawStudent) => {
            this.students.set(rawStudent.instaID, rawStudent);
        });
    }

    async createSession (student: StudentPayload, activeSession?: PronoteSession): Promise<PronoteSession> {
        try {
            const session = activeSession ?? await login(student.pronoteURL, student.pronoteUsername, student.pronotePassword, student.pronoteCas, 'student');
            session.setKeepAlive(true);
            this.pronoteSessions.set(student.instaID, session);
            return session;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    async createSessions () {
        await Promise.all(this.students.map((student) => this.createSession(student)));
    }

};
