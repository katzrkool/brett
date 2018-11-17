import WishlistItem from './wishlistItem';

interface Game extends WishlistItem{
    percent: number;
    init: number;
    final: number;
    name: string;
    url: string;
}

export default Game;
