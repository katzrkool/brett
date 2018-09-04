import axios from 'axios';
import {Client} from 'discord.js';
import * as fs from 'fs';
import {Parser} from 'htmlparser2';

interface Game {
    name: string;
    percent: number;
    init: number;
    final: number;
    user: string;
    url: string;
    id: string;
}

class Wishlist {
    client: Client;
    config: object;
    constructor(client: Client, config: object) {
        this.client = client;
        this.config = config;
    }

    async go() {
        const promises: Array<Promise<any>> = [];
        for (const user of Object.keys(this.config['users'])) {
            promises.push(this.fetchWishlist(user, this.config['users'][user]));
        }
        let sales = (await Promise.all(promises)).filter((i) => i.length > 0);
        sales = this.combine(sales);
        sales = this.filter(sales);
        await this.send(sales);
    }

    async fetchWishlist(user: string, steamID: string) {
        const html = (await axios.get(`https://store.steampowered.com/wishlist/profiles/${steamID}`)).data;
        const promises: Array<Promise<any>> = [];
        const parser = new Parser({
            ontext: (text) => {
                if (text.indexOf('var g_rgWishlistData') > -1) {
                    const wishlistData = JSON.parse(text.split('= ')[1].split(';')[0]);
                    for (const i of wishlistData) {
                        promises.push(this.getItemData(i.appid, user));
                    }
                }
            },
        });
        parser.parseComplete(html);
        return (await Promise.all(promises)).filter((i) => i !== null);
    }

    async getItemData(appid, user): Promise<Game | null> {
        const details = (
            await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appid}`)).data[appid].data;

        const pricing = details['price_overview'];
        const url = `https://store.steampowered.com/app/${appid}`;

        if (pricing && pricing['discount_percent'] !== 0) {
            return {init: Number(pricing.initial) / 100, final: Number(pricing.final) / 100,
                name: details.name, percent: pricing['discount_percent'], user, url, id: appid};
        } else {
            return null;
        }

    }
    combine(sales: Game[]) {
        const checked: any = [];
        for (const i of sales) {
            let found = false;
            for (const x of Object.keys(checked)) {
                if (i.name === checked[x].name) {
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
    filter(sales: Game[][]) {
        if (!fs.existsSync(this.config['cache'])) {
            fs.writeFileSync(this.config['cache'], '[]', {encoding: 'utf-8'});
        }
        const cache = JSON.parse(fs.readFileSync(this.config['cache'], {encoding: 'utf-8'}));
        const newCache: Game[] = [];
        const filteredSales: Game[] = [];
        for (const m of sales) {
            for (const i of m) {
                let found = false;
                for (const x of Object.keys(cache)) {
                    if (i.name === cache[x].name) {
                        if (this.getItemData(i.id, i.user)) {
                            newCache.push(i);
                        }
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    filteredSales.push(i);
                }
            }
        }
        fs.writeFileSync(this.config['cache'], JSON.stringify(filteredSales.concat(newCache)), {encoding: 'utf-8'});
        return filteredSales;
    }
}

export default Wishlist;
