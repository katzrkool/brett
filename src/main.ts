import Brett from './Brett';

async function main(args: string[]) {
    let config = 'brett-config.json';
    const brettArgs: string[] = [];
    for (const i of args) {
        if (Brett.validParams.indexOf(i) > -1) {
            if (i === '--c') {
                config = args[args.indexOf(i) + 1];
            } else if (i.startsWith('--')) {
                brettArgs.push(args[args.indexOf(i) + 1]);
            } else if (i.startsWith('-')) {
                brettArgs.push(i);
            }
        }
    }
    const bot = new Brett(config, brettArgs);
    await bot.go();
}

main(process.argv.slice(2));
