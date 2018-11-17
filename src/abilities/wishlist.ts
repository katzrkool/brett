import axios from 'axios';
import {Client} from 'discord.js';
import * as fs from 'fs';
import {Parser} from 'htmlparser2';
import Game from '../interfaces/game';
import Stores from './stores';
import WishlistItem from '../interfaces/wishlistItem';

class Wishlist {
    client: Client;
    config: object;
    constructor(client: Client, config: object) {
        this.client = client;
        this.config = config;
    }

    async go() {
        let items: WishlistItem[][] = [];
        for (const user of Object.keys(this.config['users'])) {
            items.push(await this.fetchWishlist(user, this.config['users'][user]));
        }
        items = (items).filter((i) => i.length > 0);
        let flattenedItems = [].concat.apply([], items);
        flattenedItems = this.combine(flattenedItems);

        let promises: Array<Promise<Game | null>> = [];
        for (const i of flattenedItems) {
            promises.push(this.getItemData(i.id, i.user))
        }

        let sales = <Game[]>(await Promise.all(promises)).filter((i) => i !== null);

        sales = this.filter(sales);
        await this.send(sales);
    }

    async fetchWishlist(user: string, steamID: string): Promise<WishlistItem[]> {
        const html = (await axios.get(`https://store.steampowered.com/wishlist/profiles/${steamID}`)).data;
        const items: WishlistItem[] = [];
        const parser = new Parser({
            ontext: (text) => {
                if (text.indexOf('var g_rgWishlistData') > -1) {
                    const wishlistData = JSON.parse(text.split('= ')[1].split(';')[0]);
                    for (const i of wishlistData) {
                        items.push({id: i.appid, user});
                    }
                }
            },
        });
        parser.parseComplete(html);
        return items;
    }

    async getItemData(appid: string, user: string): Promise<Game | null> {
        let game: any = await Stores.steam(appid, user);

        if (!game['percent']) {
            game = await Stores.humble(game['name'], appid, user);
        }

        if (!game || !game['percent']) {
            return null;
        }

        if (game.percent !== 0) {
            return game;
        } else {
            return null;
        }

    }
    combine(sales: WishlistItem[]): WishlistItem[] {
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
    filter(sales: Game[]) {
        if (!fs.existsSync(this.config['cache'])) {
            fs.writeFileSync(this.config['cache'], '[]', {encoding: 'utf-8'});
        }
        const cache = JSON.parse(fs.readFileSync(this.config['cache'], {encoding: 'utf-8'}));
        const newCache: Game[] = [];
        const filteredSales: Game[] = [];
        for (const i of sales) {
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
        fs.writeFileSync(this.config['cache'], JSON.stringify(filteredSales.concat(newCache)), {encoding: 'utf-8'});
        return filteredSales;
    }
}

export default Wishlist;
