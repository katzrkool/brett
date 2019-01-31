import axios from 'axios';
import Game from '../interfaces/game';

class Humble {
    static async go(game: string, id: string, user: string): Promise<Game | null> {
        const config = {
            params: {
                filter: 'all',
                page_size: 20,
                request: 1,
                search: game,
                sort: 'bestselling',
            },
        };
        const request = (
            (await axios.get('https://www.humblebundle.com/store/api/search', config)).data
        );
        const details = request.results.filter((i) => i.human_name === game)[0];

        if (!details) {
            return null;
        }

        const init = Number(details.full_price[0]);
        const final = Number(details.current_price[0]);

        return {
            name: game, init, final,
            user, url: this.humbleUrl(details.human_url), id, percent: (100 - Math.round((final / init) * 100)),
        };
    }

    private static humbleUrl(game: string): string {
        return ('https://www.humblebundle.com/store/' + game);
    }
}

export default Humble;
