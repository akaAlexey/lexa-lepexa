/**
 * Демо-контент прототипа сверх данных жюри. Всё помечено demo: true.
 * Тексты — заготовки для проверки краеведом; реальные факты снабжены источником.
 */
import type {
  ArchiveStory,
  Fundraiser,
  GroupApplication,
  LastBattleSite,
  LivePhoto,
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

/**
 * Кольцо ≈3 км по пешеходным дорожкам OSM (© участники OpenStreetMap, ODbL) на одном берегу:
 * Детский парк → стрелка Оки и Орлика → ПКиО вдоль набережной Оки → сквер у ул. Гуртьева → обратно.
 * Реки не пересекает.
 */
const parkPath: LatLon[] = [
  { lat: 52.96661, lon: 36.0676 },
  { lat: 52.96704, lon: 36.06727 },
  { lat: 52.96723, lon: 36.06753 },
  { lat: 52.96775, lon: 36.0676 },
  { lat: 52.96798, lon: 36.06778 },
  { lat: 52.96825, lon: 36.06827 },
  { lat: 52.96966, lon: 36.06888 },
  { lat: 52.97059, lon: 36.06895 },
  { lat: 52.9707, lon: 36.06906 },
  { lat: 52.97124, lon: 36.06923 },
  { lat: 52.97199, lon: 36.06972 },
  { lat: 52.97257, lon: 36.07025 },
  { lat: 52.9726, lon: 36.07039 },
  { lat: 52.97308, lon: 36.06923 },
  { lat: 52.97312, lon: 36.06898 },
  { lat: 52.97394, lon: 36.07004 },
  { lat: 52.97412, lon: 36.06964 },
  { lat: 52.97489, lon: 36.07069 },
  { lat: 52.97495, lon: 36.07058 },
  { lat: 52.97519, lon: 36.07055 },
  { lat: 52.97614, lon: 36.07182 },
  { lat: 52.97622, lon: 36.07167 },
  { lat: 52.97606, lon: 36.07145 },
  { lat: 52.97617, lon: 36.07121 },
  { lat: 52.97602, lon: 36.07101 },
  { lat: 52.97685, lon: 36.06926 },
  { lat: 52.97494, lon: 36.0667 },
  { lat: 52.97486, lon: 36.06686 },
  { lat: 52.9748, lon: 36.06685 },
  { lat: 52.9744, lon: 36.06634 },
  { lat: 52.97403, lon: 36.06704 },
  { lat: 52.97384, lon: 36.06699 },
  { lat: 52.97377, lon: 36.06685 },
  { lat: 52.97314, lon: 36.06703 },
  { lat: 52.97287, lon: 36.0668 },
  { lat: 52.97176, lon: 36.06528 },
  { lat: 52.97163, lon: 36.06554 },
  { lat: 52.97156, lon: 36.06545 },
  { lat: 52.97151, lon: 36.06601 },
  { lat: 52.9714, lon: 36.06615 },
  { lat: 52.97115, lon: 36.06809 },
  { lat: 52.97127, lon: 36.0683 },
  { lat: 52.97107, lon: 36.06851 },
  { lat: 52.97004, lon: 36.06804 },
  { lat: 52.96968, lon: 36.0682 },
  { lat: 52.96859, lon: 36.06839 },
  { lat: 52.96825, lon: 36.06827 },
  { lat: 52.96798, lon: 36.06778 },
  { lat: 52.96775, lon: 36.0676 },
  { lat: 52.96723, lon: 36.06753 },
  { lat: 52.96704, lon: 36.06727 },
  { lat: 52.96661, lon: 36.0676 },
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
        ...at(6),
        story:
          'В октябре 1941 года 5-й воздушно-десантный корпус задержал врага под Орлом. Многие десантники погибли, и точные места их захоронений до сих пор неизвестны.',
        task: {
          question: 'Сколько бригад было в 5-м воздушно-десантном корпусе?',
          options: ['Две', 'Три', 'Пять'],
          answerIndex: 1,
          explanation: 'Три: 9-я, 10-я и 201-я воздушно-десантные бригады.',
        },
        sources: [desantBook],
      },
      {
        id: 'okop',
        kind: 'trench',
        title: 'Окоп у дороги',
        ...at(17),
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
        ...at(28),
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
        ...at(36),
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
    lat: 53.28,
    lon: 36.57,
    createdAt: '2026-09-20T09:00:00Z',
    demo: true,
  },
  {
    id: 'F02',
    teamId: 'T03',
    purpose: 'equip',
    title: 'Экипировать отряд: щупы и металлоискатель',
    goalRub: 40000,
    collectedRub: 9000,
    lat: 53.21,
    lon: 36.45,
    createdAt: '2026-09-29T11:00:00Z',
    demo: true,
  },
  {
    id: 'F03',
    teamId: 'T04',
    purpose: 'raise_fighter',
    title: 'Поднять бойца: овраг у д. Крупышино',
    goalRub: 30000,
    collectedRub: 21000,
    lat: 52.74,
    lon: 35.84,
    createdAt: '2026-09-26T10:00:00Z',
    demo: true,
  },
  {
    id: 'F04',
    teamId: 'T02',
    purpose: 'fuel',
    title: 'Бензин на разведку у р. Оптуха',
    goalRub: 80000,
    collectedRub: 32000,
    lat: 53.15,
    lon: 36.33,
    createdAt: '2026-09-24T12:00:00Z',
    demo: true,
  },
  {
    id: 'F05',
    teamId: 'T05',
    purpose: 'equip',
    title: 'Экипировать отряд: палатки и аптечки',
    goalRub: 60000,
    collectedRub: 12500,
    lat: 52.97,
    lon: 36.07,
    createdAt: '2026-09-18T09:00:00Z',
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
    roles: [{ role: 'any', count: 5 }],
    joined: 2,
    minAge: 16,
    // Условия — в окне записи: 09:00–18:00 по Москве
    startsAt: '2026-10-03T06:00:00Z',
    endsAt: '2026-10-03T15:00:00Z',
    meetingPoint: 'Мценск, площадь у автостанции (демо)',
    bring: ['Рабочие перчатки', 'Закрытая обувь по погоде', 'Вода и перекус'],
    fundraiserId: 'F01',
    lat: 53.28,
    lon: 36.57,
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
    minAge: 14,
    startsAt: '2026-10-03T07:00:00Z',
    endsAt: '2026-10-03T14:00:00Z',
    meetingPoint: 'Орёл, ж/д вокзал, у главного входа (демо)',
    checklist,
    createdAt: '2026-09-22T08:00:00Z',
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
    minAge: 16,
    startsAt: '2026-10-10T08:00:00Z',
    endsAt: '2026-10-10T13:00:00Z',
    meetingPoint: 'Орёл, площадь Ленина (демо)',
    checklist,
    createdAt: '2026-09-30T08:00:00Z',
    demo: true,
  },
]

/** Коллективные заявки: одна ждёт решения командира, чтобы показать сценарий «принять / уточнить». */
export const groupApplications: GroupApplication[] = [
  {
    id: 'G01',
    tripId: 'W01',
    organization: 'Школа № 1, 8 «Б» класс (демо)',
    contactName: 'Классный руководитель (демо)',
    contact: '+7 900 000-00-00',
    peopleCount: 12,
    comment: '10 учеников и 2 взрослых, нужен вводный инструктаж',
    status: 'pending',
    createdAt: '2026-09-21T10:00:00Z',
    demo: true,
  },
]

/** Истории людей: подтверждённая, ожидающая проверки и возвращённая на уточнение. */
export const stories: ArchiveStory[] = [
  {
    id: 'ST01',
    title: 'Памятник морякам-тихоокеанцам',
    place: 'с. Крупышино, Кромской район',
    story:
      'Мало кто знает, что возле села Крупышино стоит памятник подвигу моряков Тихоокеанского флота, сражавшихся за Орловскую землю. Пример истории из кейса хакатона.',
    sourceText: 'Кейс хакатона «Маршруты победы», раздел «Описание текущей ситуации»',
    author: 'Краеведческий кружок (демо)',
    status: 'verified',
    verifiedBy: 'Краевед (демо)',
    createdAt: '2026-09-12T10:00:00Z',
    demo: true,
  },
  {
    id: 'ST02',
    title: 'Землянка у оврага (демо)',
    place: 'д. Семенково',
    story:
      'Демо-пример: местные жители помнят землянку у оврага за деревней, где зимой 1942 года стояли бойцы. Нужна сверка с архивом.',
    sourceText: 'Рассказ местного жителя (демо)',
    author: 'Семья Петровых (демо)',
    status: 'pending',
    createdAt: '2026-09-20T15:00:00Z',
    demo: true,
  },
  {
    id: 'ST03',
    title: 'Письмо с фронта (демо)',
    place: 'Кромской район',
    story:
      'Демо-пример: в семье хранится письмо прадеда, отправленное летом 1943 года перед наступлением на Орёл.',
    sourceText: '',
    author: 'Внук бойца (демо)',
    status: 'clarify',
    verifiedBy: 'Краевед (демо)',
    reviewNote:
      'Пришлите, пожалуйста, фото письма или номер полевой почты — без источника подтвердить нельзя.',
    createdAt: '2026-09-18T12:00:00Z',
    demo: true,
  },
]

/**
 * «Живое фото»: ролики — реконструкция ИИ (облачные нейросети, см. frontend/docs/LIVE_PHOTO.md).
 * Снимки — из открытых архивных публикаций; для размещения у памятника нужно согласие родственников.
 */
const openArchivePhoto: Source = {
  kind: 'archive',
  title: 'Архивный снимок из открытых публикаций (демо, требует атрибуции)',
}

export const livePhotos: LivePhoto[] = [
  {
    id: 'soldier',
    title: 'Офицер-победитель',
    caption: 'Портрет советского офицера, 1945 год. Архивный снимок',
    speech:
      'Здравствуй, потомок! Я прошёл эту войну до самой Победы. Мы выстояли, потому что были вместе — весь Советский Союз: и солдат на фронте, и мать у станка, и мальчишка в тылу. Победа досталась нам дорогой ценой. Береги мир, береги память и гордись своей страной. Помни нас!',
    photoUrl: 'live/soldier.jpg',
    videoUrl: 'live/soldier.mp4',
    captionsUrl: 'live/soldier.vtt',
    targetUrl: 'live/soldier.mind',
    photoAspect: 716 / 500,
    animation: 'lip_sync',
    consent: 'Демо для хакатона. Для публикации нужно согласие родственников',
    sources: [openArchivePhoto],
    demo: true,
  },
  {
    id: 'reichstag',
    title: 'У Рейхстага',
    caption: 'Советские бойцы у Рейхстага, Берлин, 1945 год. Колоризованный архивный снимок',
    speech:
      'Товарищи! Мы дошли до Берлина! Через огонь и потери, от Москвы и Орла — до самого Рейхстага! Враг разбит! Победа за нами! Ура!',
    photoUrl: 'live/reichstag.jpg',
    videoUrl: 'live/reichstag.mp4',
    captionsUrl: 'live/reichstag.vtt',
    targetUrl: 'live/reichstag.mind',
    photoAspect: 689 / 959,
    animation: 'neural_motion',
    consent: 'Демо для хакатона. Для публикации нужно согласие родственников',
    sources: [openArchivePhoto],
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
