import type { RouteObject } from 'react-router'
import { patterns } from '../../functions/core/paths.ts'
import { EventsScreen } from './EventsScreen.tsx'

/** «Мероприятия»: лента. Карточки выездов и форма заявки — в модулях weekends и search-hq. */
export const routes: RouteObject[] = [{ path: patterns.events.slice(1), element: <EventsScreen /> }]
