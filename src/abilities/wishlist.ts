import axios from 'axios';
import {Client} from 'discord.js';
import {Database} from 'sqlite3';
import Game from '../interfaces/game';
import Humble from './humble';

class Wishlist {
    client: Client;
    config: object;
    db: Database;
    constructor(client: Client, config: object, db: Database) {
        this.client = client;
        this.config = config;
        this.db = db;
    }

    async go() {
        const lists: Array<Promise<Game[]>> = [];
        const users = await this.getAll('SELECT * FROM users');
        for (const user of users) {
            lists.push(this.fetchWishlist(user.user, user.id));
        }

        let items: any = (await Promise.all(lists)).filter((i) => i.length > 0);

        items = [].concat(...items);
        items = this.combine(items);

        const promises: Array<Promise<Game | null>> = [];
        for (const i of items) {
            if (i.percent === 0) {
                promises.push(this.getItemData(i.name, i.id, i.user));
            } else {
                promises.push(i);
            }
        }
        let sales = (await Promise.all(promises)).filter((i) => i !== null) as Game[];

        sales = await this.filter(sales);

        await this.send(sales);

    }

    async fetchWishlist(user: string, steamID: string): Promise<Game[]> {
        const json = (await axios.get(`https://store.steampowered.com/wishlist/profiles/${steamID}/wishlistdata/?p=0` )).data;
        return Object.keys(json).map((x) => this.parseSteamJSON(x, user, json[x]));
    }

    parseSteamJSON(key: string, user: string, data): Game {
        return {name: data.name, url: `https://store.steampowered.com/app/${key}`, id: key, user, final: data.subs[0].price / 100,
            percent: data.subs[0].discount_pct,
            init: Number(((data.subs[0].price / 100) / (1 - (data.subs[0].discount_pct / 100))).toFixed(2))};
    }

    async getAll(query: string, params?): Promise<any> {
        return new Promise(((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        }));
    }

    async get(query: string, params?) {
        return new Promise(((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        }));
    }

    async getItemData(name: string, appid: string, user: string): Promise<Game | null> {

        const game = await Humble.go(name, appid, user);

        if (!game) {
            return null;
        }

        if (game.percent !== 0) {
            return game;
        } else {
            return null;
        }

    }
    combine(sales: Game[]): Game[] {
        const checked: any = [];
        for (const i of sales) {
            let found = false;
            for (const x of Object.keys(checked)) {
                if (i.id === checked[x].id) {
                    checked[x].user += `, ${i.user}`;
                    found = true;
                    break;
                }
            }
            if (!found) {
                checked.push(i);
            }
        }
        return checked;
    }

    async send(sales: Game[]) {
        const channel = this.client.channels.get(this.config['channel']);
        if (!channel) {throw new Error('NO CHANNEL FOUND'); }
        for (const i of sales) {
            const msg =
                `Save ${i.percent}% on ${i.name}!\nOriginal Price: \$${i.init}\tSale Price: \$${i.final}\n${i.url}\nCC: ${this.ccUsers(i.user.trim())}`;
            // @ts-ignore
            await channel.send(msg);
        }
    }
    ccUsers(user: string) {
        const users = user.split(', ');
        if (users.length > 1) {
            const userList: string[] = [];
            for (const i of users) {
                userList.push(`<@${i}>`);
            }
            return userList.join(', ');
        } else {
            return `<@${users[0]}>`;
        }
    }
    async filter(sales: Game[]) {
        const timestamp =  new Date().toISOString();
        const filteredSales: Game[] = [];

        for (const i of sales) {
            const game = await this.get('SELECT * FROM cache WHERE name = ?', [i.name]);
            if (game) {
                // if it's not in the database, let's alert the user
                this.db.run('UPDATE cache SET timestamp = ? WHERE name = ?', [timestamp, i.name]);
            } else {
                filteredSales.push(i);
                this.db.run('INSERT INTO cache (name, percent, init, final, url, timestamp) VALUES (?, ?, ?, ?, ?, ?)', [i.name, i.percent, i.init, i.final, i.url, timestamp]);
            }
        }
        this.db.run('DELETE FROM cache WHERE timestamp != ?', timestamp);
        return filteredSales;
    }
}

export default Wishlist;
