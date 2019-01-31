import axios from 'axios';
import {Client, Message, SnowflakeUtil, TextChannel} from 'discord.js';
import {Database} from 'sqlite3';

const helpText = `Hi! The following commands are supported! Use these at the beginning of your message

* !add: Signs you up for wishlist service. Brett will alert you when your steam wishlist games go on sale. Your steam profile MUST be public! Pass your Steam Community ID as an argument. If you don't know what your Steam Community ID is, it's the number that comes after \`http://steamcommunity.com/profiles/\`.

Example: \`!add STEAMCOMMUNITYID\`

* !remove: Removes you from the wishlist service. Not much more to add here

Example: \`!remove\`

* !mysteamid: DMs you your Steam Community ID if you are signed up.

Example: \`!steamid\`

* !help: Brings up this menu

Example: \`!help\``;

class MessageProcessor {
    client: Client;
    config: object;
    db: Database;
    constructor(client: Client, config: object, db: Database) {
        this.client = client;
        this.config = config;
        this.db = db;
    }

    async go() {
        const d = new Date();
        d.setHours(d.getHours() - this.config['hours'] * 2);
        // the typings are claiming there is no timestamp, but in the next release, the typings are updated
        // See Discord.js Pull #2998 for more info
        // @ts-ignore
        const snowflake = SnowflakeUtil.generate(d);
        const channel = this.client.channels.get(this.config['channel']) as TextChannel;
        if (!channel) {throw new Error('NO CHANNEL FOUND'); }

        const msg = await channel.fetchMessages({after: snowflake});
        for (const i of msg) {
            if (!(await this.checkSelfReact(i[1])) && i[1].author.id !== this.client.user.id) {
                await this.dealWithIt(i[1]);
                await i[1].react('✅');
            }
        }
    }
    async checkSelfReact(msg: Message): Promise<boolean> {
        for (const i of msg.reactions) {
            if (i[1].me) {return true; }
        }
        return false;
    }

    async add(msg: Message) {
        if (await this.fetchId(msg) !== 'No entry found') {
            await msg.author.send('You have already registered');
            return;
        }
        const text = msg.content.replace(/( |)!add/, '').trim();
        const html = (await axios.get(`https://store.steampowered.com/wishlist/profiles/${text}`)).data;
        if (html.indexOf('var g_rgWishlistData') === -1) {
            await msg.author.send(`${text} IS NOT A VALID STEAM COMMUNITY ID!`);
            return;
        }

        this.db.run('INSERT OR REPLACE INTO users VALUES (?, ?)', [msg.author.id, text]);

        await msg.author.send(`Added Steam Community ID: ${text} to wishlist. You will receive alerts when wishlist items go on sale.\n` +
        `Leave the wishlist program with !remove.`);

    }

    remove(msg: Message) {
        this.db.run('DELETE FROM users WHERE user IS ?', msg.author.id);
    }

    async fetchId(msg: Message) {
        return new Promise(((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE user IS ?', msg.author.id, (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve(`Your ID is ${row['id']}`);
                } else {
                    resolve('No entry found');
                }
            });
        }));
    }

    async dealWithIt(msg: Message) {
        const text = msg.content.replace(/<.*>/, '').trim();
        if (text.startsWith('!add')) {
           await this.add(msg);
           // No need to send message. this.add sends a message by itself.
        } else if (text.startsWith('!remove')) {
            this.remove(msg);
            await msg.author.send(`Removed you from the Wishlist program.`);
        } else if (text.startsWith('!steamid')) {
            await msg.author.send(await this.fetchId(msg));
        } else {
            await msg.author.send(helpText);
        }

    }
}

export default MessageProcessor;
