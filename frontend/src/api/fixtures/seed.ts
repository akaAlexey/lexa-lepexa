/**
 * Демо-контент прототипа сверх данных жюри. Всё помечено demo: true.
 * Тексты — заготовки для проверки краеведом; реальные факты снабжены источником.
 */
import type {
  Fundraiser,
  LastBattleSite,
  LatLon,
  Route,
  Source,
  Trip,
  VolunteerRequest,
} from '../../contract/schemas.ts'

const demoText: Source = {
  kind: 'demo',
  title: 'Демо-текст прототипа, требует проверки краеведом',
}
const caseNote: Source = {
  kind: 'literature',
  title: 'Историческая справка из кейса хакатона «Маршруты победы»',
}
const desantBook: Source = {
  kind: 'literature',
  title: 'Овчинников А. «Десант в Орле» (1998)',
}
const vystoyali: Source = {
  kind: 'archive',
  title: '«Выстояли и победили! Орловская область в годы Великой Отечественной войны» (ГАОО, 2015)',
  url: 'http://www.gosarchiv-orel.ru/',
}
const bookOfMemory5: Source = {
  kind: 'book_of_memory',
  title: 'Книга Памяти. Орловская область, т. 5',
  url: 'http://library.gu-unpk.ru/9_mai_2010/kniga_pamyati.php',
}

const parkPath: LatLon[] = [
  { lat: 52.96999, lon: 36.06316 },
  { lat: 52.97221, lon: 36.06741 },
  { lat: 52.97371, lon: 36.07245 },
  { lat: 52.97274, lon: 36.0782 },
  { lat: 52.97044, lon: 36.08103 },
  { lat: 52.96805, lon: 36.07909 },
  { lat: 52.96663, lon: 36.07422 },
  { lat: 52.96716, lon: 36.06847 },
  { lat: 52.96867, lon: 36.06457 },
  { lat: 52.96999, lon: 36.06316 },
]

const at = (i: number): LatLon => parkPath[i]!

export const routes: Route[] = [
  {
    id: 'park-3km',
    title: 'Тропа у Оки',
    summary: 'Семейная прогулка на 3 км с четырьмя остановками и заданиями для ребёнка',
    lengthM: 3000,
    durationMin: 75,
    path: parkPath,
    demo: true,
    points: [
      {
        id: 'rubezh',
        kind: 'battle',
        title: 'Рубеж десантников',
        ...at(1),
        story:
          'В октябре 1941 года 5-й воздушно-десантный корпус задержал врага под Орлом. Многие десантники погибли, и точные места их захоронений до сих пор неизвестны.',
        task: {
          question: 'Сколько бригад было в 5-м воздушно-десантном корпусе?',
          options: ['Две', 'Три', 'Пять'],
          answerIndex: 1,
          explanation: 'Три: 9-я, 10-я и 201-я воздушно-десантные бригады.',
        },
        sources: [caseNote, desantBook],
      },
      {
        id: 'okop',
        kind: 'trench',
        title: 'Окоп у дороги',
        ...at(3),
        story:
          'Окоп полного профиля копали так, чтобы боец мог стрелять стоя и укрываться от осколков. Представь, сколько земли нужно было вынуть лопатой за одну ночь.',
        task: {
          question: 'Зачем окоп делали зигзагом, а не прямой линией?',
          options: [
            'Так быстрее копать',
            'Чтобы осколки не летели вдоль всего окопа',
            'Чтобы было красивее',
          ],
          answerIndex: 1,
          explanation: 'Изломы окопа останавливали осколки и взрывную волну.',
        },
        sources: [demoText],
      },
      {
        id: 'shtab',
        kind: 'hq',
        title: 'Полевой штаб',
        ...at(5),
        story:
          'В штабе получали и отправляли донесения. Важные сообщения шифровали, чтобы противник не узнал планы.',
        task: {
          question:
            'Расшифруй донесение: каждая буква заменена следующей по алфавиту. «ПЛБ» — это…',
          options: ['ОКА', 'ОРЁЛ', 'МЦЕНСК'],
          answerIndex: 0,
          explanation: 'П → О, Л → К, Б → А. Получается «ОКА» — река, на которой стоит Орёл.',
        },
        sources: [demoText],
      },
      {
        id: 'salut',
        kind: 'battle',
        title: 'Первый салют',
        ...at(7),
        story:
          '5 августа 1943 года Орёл был освобождён. В тот же вечер в Москве прогремел первый в годы войны артиллерийский салют — в честь освобождения Орла и Белгорода.',
        task: {
          question: 'В честь освобождения каких городов прогремел первый салют?',
          options: ['Курска и Брянска', 'Орла и Белгорода', 'Тулы и Калуги'],
          answerIndex: 1,
          explanation: 'Орла и Белгорода. Поэтому Орёл называют городом первого салюта.',
        },
        sources: [vystoyali],
      },
    ],
  },
]

export const fundraisers: Fundraiser[] = [
  {
    id: 'F01',
    teamId: 'T01',
    purpose: 'fuel',
    title: 'Бензин на Вахту Памяти',
    goalRub: 50000,
    collectedRub: 15000,
    demo: true,
  },
  {
    id: 'F02',
    teamId: 'T03',
    purpose: 'equip',
    title: 'Экипировать отряд: щупы и металлоискатель',
    goalRub: 40000,
    collectedRub: 9000,
    demo: true,
  },
]

export const requests: VolunteerRequest[] = [
  {
    id: 'R01',
    teamId: 'T01',
    title: 'Вахта Памяти (Орловская обл.)',
    date: '2026-10-03',
    place: 'Мценский р-н',
    roles: [{ role: 'digger', count: 5 }],
    joined: 2,
    fundraiserId: 'F01',
    createdAt: '2026-09-20T09:00:00Z',
    demo: true,
  },
]

const checklist = [
  { id: 'shovel', label: 'Лопата' },
  { id: 'probe', label: 'Щуп' },
  { id: 'gloves', label: 'Перчатки' },
  {
    id: 'pamyat',
    label: 'Регистрация на сайте «Память народа»',
    url: 'https://pamyat-naroda.ru/',
  },
]

export const trips: Trip[] = [
  {
    id: 'W01',
    teamId: 'T01',
    date: '2026-10-03',
    title: 'Раскопки у д. Семенково',
    place: 'д. Семенково',
    lat: 53.05,
    lon: 36.22,
    spotsTotal: 12,
    spotsTaken: 5,
    checklist,
    demo: true,
  },
  {
    id: 'W02',
    teamId: 'T03',
    date: '2026-10-10',
    title: 'Разведка у р. Оптуха',
    place: 'р. Оптуха',
    lat: 53.15,
    lon: 36.33,
    spotsTotal: 8,
    spotsTaken: 1,
    checklist,
    demo: true,
  },
]

export const sites: LastBattleSite[] = [
  {
    id: 'S01',
    lat: 52.74,
    lon: 35.84,
    placeName: 'Овраг у д. Крупышино',
    fightersCount: 1,
    fighters: [{ fullName: 'Иванов И.И.', rank: 'Красноармеец' }],
    unit: 'Неизвестно',
    dateText: '1943',
    circumstances: 'Требуется подъём. Пример карточки из прототипа кейса.',
    status: 'found_needs_check',
    sources: [bookOfMemory5],
    volunteersReady: 3,
    createdAt: '2026-09-10T12:00:00Z',
    demo: true,
  },
  {
    id: 'S02',
    lat: 53.21,
    lon: 36.45,
    placeName: 'Опушка у д. Первый Воин',
    fightersCount: 2,
    fighters: [{}, {}],
    unit: '201-я вдбр, 5-й ВДК',
    dateText: 'октябрь 1941',
    circumstances: 'Место указано по рассказу местных жителей, сверено с донесением.',
    status: 'archive_confirmed',
    sources: [{ kind: 'eyewitness', title: 'Рассказ местных жителей (демо)' }, demoText],
    teamId: 'T03',
    volunteersReady: 6,
    createdAt: '2026-08-28T12:00:00Z',
    demo: true,
  },
  {
    id: 'S03',
    lat: 52.9,
    lon: 36.25,
    placeName: 'Поле у д. Становой Колодезь',
    fightersCount: 4,
    fighters: [{}, {}, {}, {}],
    unit: 'Неизвестно',
    dateText: 'июль 1943',
    circumstances: 'Останки подняты и перезахоронены.',
    status: 'remains_raised',
    sources: [demoText],
    teamId: 'T02',
    volunteersReady: 0,
    createdAt: '2026-07-15T12:00:00Z',
    demo: true,
  },
]

/** Демо-подписчики поисковой деятельности вокруг Орла — только для mock-подсчёта рассылки. */
export const demoSubscribers: LatLon[] = [
  { lat: 52.97, lon: 36.07 },
  { lat: 52.99, lon: 36.12 },
  { lat: 53.03, lon: 36.01 },
  { lat: 52.93, lon: 36.03 },
  { lat: 53.1, lon: 36.2 },
  { lat: 53.28, lon: 36.57 },
  { lat: 52.75, lon: 35.83 },
]
