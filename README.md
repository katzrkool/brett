# Brett
A nifty Discord bot

## Features
* Scrapes users' steam wishlists for deals.
![Brett announcing game deal](screenshots/wishlist.png)

## Usage
To start, you'll need a config file. It can be placed anywhere, but the default is `brett-config.json` in the root of the directory.

A config file is made up of a token, and sub objects for modules. See example below
```json
{
  "token": "DISCORD BOT TOKEN"
}
```

Then, run `node bin/main.js`

### Wishlist
For the wishlist functionality, you'll need to add to your config. You need a cache (a file to store sales data), a channel ID to post in, and a dictionary of discord users to steam ids. See example below
```json
{
  "token": "DISCORD BOT TOKEN",
  "wishlist": {
    "cache": "brett-wishlist.json",
    "channel": "CHANNEL NUMBER",
     "users": {
       "DISCORD USER ID 1": "STEAM USER ID 1",
       "DISCORD USER ID 2": "STEAM USER ID 2",
       "STEAM USER ID 3": "STEAM USER ID 3"
     }
 }
}
```

To activate the wishlist functionality, use the `-w` flag.

Brett will then post in the specified channel about any sales for any games on a user's steam wishlist and mention them.
(It will mention multiple users that have the same game, not make an individual post.)

The bot will not post about a game until the next time it goes on sale. (So the game must go off sale, then back on sale)

## Installation
`npm install && tsc`

## Contributing
Feel free to submit a PR or make suggestions! I'd appreciate it!
