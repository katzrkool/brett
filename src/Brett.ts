import {Client} from 'discord.js';
import * as fs from 'fs';
import Wishlist from './abilities/wishlist';

class Brett {
    static validParams: string[] = ['--c', '-w'];
    paramKey: object = {'-w': async () => {await this.wishlist(); }};
    client: Client = new Client();
    token: string;
    configPath: string;
    config: object;
    args: string[];
    constructor(configPath: string, args: string[] = []) {
        this.configPath = configPath;
        this.config = JSON.parse(fs.readFileSync(this.configPath, {encoding: 'utf-8'}));
        this.token = this.config['token'];
        this.args = args;
    }
    async go() {

        await this.startup();
        for (const i of this.args) {
            await this.paramKey[i]();
        }
        process.exit(0);
    }

    async startup() {
        await this.client.login(this.token);
    }
    async wishlist() {
        const wishConfig = this.config['wishlist'];
        const pathList = this.configPath.split('/');
        pathList.pop();
        const path = `${pathList.join('/')}`;
        wishConfig.cache = wishConfig.cache.replace('$HERE', path);
        await new Wishlist(this.client, wishConfig).go();
    }
}

export default Brett;
