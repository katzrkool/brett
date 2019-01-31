import {Client} from 'discord.js';
import * as fs from 'fs';
import {Database} from 'sqlite3';
import MessageProcessor from './abilities/messageProcessor';
import Wishlist from './abilities/wishlist';

class Brett {
    client: Client = new Client();
    token: string;
    configPath: string;
    config: object;
    db: Database;
    runWishlist: boolean;
    constructor(configPath: string, runWishlist) {
        this.configPath = configPath;
        this.config = JSON.parse(fs.readFileSync(this.configPath, {encoding: 'utf-8'}));
        this.token = this.config['token'];
        this.db = new Database(this.replaceCache(this.config['cache']));
        this.runWishlist = runWishlist;
    }

    async go() {
        await this.startup();
        await this.processMessages();
        if (this.runWishlist) {
            await this.wishlist();
        }
        await new Promise(((resolve, reject) => {
            this.db.close((error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        }));
        process.exit();
    }

    async startup() {
        this.db.run('CREATE TABLE IF NOT EXISTS users (user text PRIMARY KEY UNIQUE, id text)');
        this.db.run('CREATE TABLE IF NOT EXISTS cache (name text PRIMARY KEY UNIQUE, percent number, init number, final number, url string, timestamp string)');
        await this.client.login(this.token);
    }

    replaceCache(cache: string) {
        const pathList = this.configPath.split('/');
        pathList.pop();
        const path = `${pathList.join('/')}`;
        return cache.replace('$HERE', path);

    }
    async wishlist() {
        const wishConfig = this.config['wishlist'];
        wishConfig['id'] = this.client.user.id;
        wishConfig['cache'] = this.replaceCache(this.config['cache']);
        await new Wishlist(this.client, wishConfig, this.db).go();
    }

    async processMessages() {
        const messConfig = this.config['messages'];
        messConfig['id'] = this.client.user.id;
        messConfig['cache'] = this.replaceCache(this.config['cache']);
        await new MessageProcessor(this.client, messConfig, this.db).go();
    }
}

export default Brett;
