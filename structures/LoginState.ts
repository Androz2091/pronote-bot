import type PronoteBot from './PronoteBot';
import type { PronoteSession } from 'pronote-api';
import { login } from 'pronote-api';
import { writeFileSync } from 'fs';
import fetch from 'node-fetch';

export default class LoginState {

    bot: PronoteBot;
    step: string;
    username: string;
    password: string;
    pronoteURL: string;
    cas: string;

    constructor (bot: PronoteBot){
        this.bot = bot;
        this.step = 'username';
        this.username = null;
        this.password = null;
        this.pronoteURL = null;
        this.cas = null;
    }

    setUsername (username: string) {
        this.username = username.toLowerCase();
        this.step = 'password';
    }

    setPassword (password: string) {
        this.password = password;
        this.step = 'pronote_url';
    }

    setPronoteURL (url: string) {
        this.pronoteURL = url;
        this.step = 'verify';
    }

    resolveCas (): Promise<string> {
        return new Promise((resolve) => {
            this.cas = 'ac-toulouse';
            resolve();
        });
    }

    verify (): Promise<PronoteSession> {
        return new Promise((resolve) => {
            this.resolveCas().then(() => {
                login(this.pronoteURL, this.username, this.password, this.cas, 'student').then((session) => {
                    resolve(session);
                    fetch(session.user.avatar).then((res) => {
                        res.buffer().then((buffer) => {
                            writeFileSync(`./images/${this.username}.png`, buffer);
                        });
                    });
                }).catch(() => {
                    resolve(null);
                });
            });
        });
    }

};
