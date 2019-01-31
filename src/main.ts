import Brett from './brett';

async function main(args: string[]) {
    let config = `${ __dirname}/../brett-config.json`;
    let wishlist = false;
    for (const i of args) {
        if (i === '--c') {
            config = args[args.indexOf(i) + 1];
        } else if (i === '-w') {
            wishlist = true;
        }
    }
    const bot = new Brett(config, wishlist);
    await bot.go();
}

main(process.argv.slice(2));
