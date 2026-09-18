# MovieHub — real Movies + TV Shows + Dramas

A dark, premium movie/TV discovery website based on the supplied reference video. It uses real TMDB data and YouTube trailer embeds. It does not generate fake movie or drama records.

## Features
- Reference-style dark premium home page
- Real movie data: Trending, Popular, Now Playing, Upcoming
- Real TV data: Popular TV Shows, Trending Dramas, TV Airing Today
- Combined movie + TV search
- Movie and TV/drama detail pages/modal
- Cast, genres, rating, dates, seasons/episodes and synopsis
- YouTube trailer playback when a trailer is listed
- Responsive mobile/desktop design
- Server-side TMDB token proxy
- 10-minute cache

## Setup
1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Put your TMDB API Read Access Token into `TMDB_BEARER_TOKEN`.
4. Run `npm install` then `npm start`.
5. Open `http://localhost:3000`.

TMDB API documentation: https://developer.themoviedb.org/docs/getting-started

The site displays TMDB attribution. TMDB data/images do not grant permission to host full copyrighted movies or episodes. This project uses metadata and trailer embeds rather than copying full video files.
