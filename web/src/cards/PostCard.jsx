// Picks the card for the network a post is written for. Returns null for a network without its own card.
import {BlueskyCard} from './BlueskyCard.jsx';
import {DiscordCard} from './DiscordCard.jsx';
import {HackerNewsCard} from './HackerNewsCard.jsx';
import {ProductHuntCard} from './ProductHuntCard.jsx';
import {RedditCard} from './RedditCard.jsx';
import {XCard} from './XCard.jsx';

const BY = {x: XCard, twitter: XCard, bluesky: BlueskyCard, reddit: RedditCard, discord: DiscordCard, 'hacker news': HackerNewsCard, 'product hunt': ProductHuntCard};

export const postCardFor = (where) => BY[String(where || '').trim().toLowerCase()] || null;
