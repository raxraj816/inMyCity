# inMyCity

inMyCity is a city discovery app built with Expo, React Native, and Expo Router. It helps users explore what’s happening in their city across places, events, deals, movies, activities, transit, hotels, dining, shopping, and itineraries.

## What the app does

The app is designed around a simple idea: help people find something useful or fun to do right now.

Main capabilities:

- browse city-specific places and categories
- discover events, deals, activities, movies, and transit updates
- switch between supported cities
- open detail pages for events, places, deals, activities, movies, hotels, and routes
- save and revisit content
- use search to find locations, events, and offers quickly
- access an AI chat assistant for city-related help

## Core user experience

The homepage is centered on discovery:

- search at the top for quick access
- category grid for fast navigation
- weekend planner for curated action-oriented browsing
- trending content feed for broader exploration

The rest of the app is organized into focused sections such as events, places, activities, deals, transit, movies, hotels, dining, and more.

## Tech stack

- Expo
- React Native
- Expo Router
- TypeScript
- React Query
- Zod
- React Native Vector Icons
- Expo Image
- Safe area and gesture handling libraries

## Project structure

### `app/`
Route-based screens and navigation.

Important screens include:

- `app/(tabs)/index.tsx` — main Explore page
- `app/(tabs)/feeds.tsx` — social/news-style feed
- `app/(tabs)/search.tsx` — search experience
- `app/events.tsx` — events listing
- `app/activities.tsx` — activity browsing
- `app/deals.tsx` — deals browsing
- `app/movies.tsx` — movies browsing
- `app/transit.tsx` — transit browsing
- `app/dining.tsx` — dining browsing
- `app/hotels.tsx` — hotels browsing

### `components/`
Reusable UI components such as cards, headers, filters, city picker, and utility UI.

### `context/`
App state providers such as city selection and location-related state.

### `hooks/`
Shared hooks like theme/color helpers.

### `assets/`
Static images and app icons.

### `server/`
Simple local serving assets for the artifact.

### `scripts/`
Build helpers for the Expo artifact.

## Development

Install dependencies with pnpm and run the artifact through its workflow.

Available package scripts:

- `pnpm --filter @workspace/inmycity run dev`
- `pnpm --filter @workspace/inmycity run build`
- `pnpm --filter @workspace/inmycity run serve`
- `pnpm --filter @workspace/inmycity run typecheck`

## Notes

- The app uses path-based routing.
- The Expo artifact is configured to run on the platform-provided `PORT`.
- City data and content are designed to feel local and personalized.

## API server

This repository also includes a backend artifact at `artifacts/api-server` that seeds city data and serves app content.

Useful scripts there:

- `pnpm --filter @workspace/api-server run dev`
- `pnpm --filter @workspace/api-server run build`
- `pnpm --filter @workspace/api-server run start`
- `pnpm --filter @workspace/api-server run seed`

## Summary

inMyCity is a city discovery and local planning app. The goal is to make it easy to find something relevant, nearby, and worth doing without digging through generic search results.
