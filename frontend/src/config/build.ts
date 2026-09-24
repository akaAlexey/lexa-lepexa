declare const __BUILD_ID__: string

/** Версия сборки (коммит и время) — видна в демо-пульте, чтобы на показе не открыть старую. */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'
