export type SectionItem = {
  title: string
  desc: string
  url: string
}

export type Section = {
  slug: string
  navLabel: string
  title: string
  enLabel: string
  /** 展示用地理坐标（马来西亚真实经纬度） */
  coord: { lat: number; lng: number }
  /** 地图主视觉上的百分比定位（x 相对宽度，y 相对高度） */
  pin: { x: number; y: number }
  intro: string
  /** eatplan.online 上对应栏目的真实地址 */
  externalUrl: string
  /** 抽屉主按钮文案（默认「在主站打开本栏目 ▶」） */
  ctaLabel?: string
  items: SectionItem[]
}

const SITE = 'https://eatplan.online'

const rawSections: Section[] = [
  {
    slug: 'magazine',
    navLabel: '百科',
    title: '百科全书',
    enLabel: 'ENCYCLOPEDIA',
    coord: { lat: 3.139, lng: 101.6869 },
    pin: { x: 61, y: 57 },
    intro:
      '280 篇百科文章，用中文系统整理马来西亚的菜式、节庆、食材与地点资料。每一篇都尽量回到公开来源，把「是什么、从哪里来、怎么吃」讲清楚。',
    externalUrl: `${SITE}/magazine/`,
    items: [
      {
        title: '椰浆饭 Nasi Lemak 是什么？',
        desc: '名字的由来、早期记录与马来半岛各州版本。',
        url: `${SITE}/nasi-lemak-history/`,
      },
      {
        title: 'Roti Canai 是什么？',
        desc: '印度煎饼的由来、甩饼做法与常见种类。',
        url: `${SITE}/roti-canai/`,
      },
      {
        title: '扁担饭 Nasi Kandar 是什么？',
        desc: '槟城码头的起源，以及「扁担」这个名字的来历。',
        url: `${SITE}/nasi-kandar-history/`,
      },
      {
        title: '蓝花饭 Nasi Kerabu 是什么？',
        desc: '吉兰丹的蓝色米饭与香草配菜。',
        url: `${SITE}/nasi-kerabu/`,
      },
      {
        title: '仁当 Rendang 是什么？',
        desc: '慢煮工序、古籍记录与霹雳、森美兰版本的差别。',
        url: `${SITE}/rendang-history/`,
      },
      {
        title: '槟城亚参叻沙是什么？',
        desc: 'Asam Laksa 的配料表与「叻沙」词源。',
        url: `${SITE}/penang-asam-laksa/`,
      },
    ],
  },
  {
    slug: 'dishes',
    navLabel: '美食词条',
    title: '美食词条',
    enLabel: 'DISH INDEX',
    coord: { lat: 5.4141, lng: 100.3288 },
    pin: { x: 16, y: 32 },
    intro:
      '从椰浆饭到仁当，每一条词条都是一张小名片：它是什么、在哪里最常见、怎么点、配什么吃。逛词条就像在摊位前看菜单。',
    externalUrl: `${SITE}/dishes/`,
    items: [
      {
        title: '椰浆饭',
        desc: 'Nasi Lemak，国民早餐：椰浆饭、叁巴、江鱼仔与半熟蛋。',
        url: `${SITE}/dishes/food-q1420553/`,
      },
      {
        title: '印度煎饼',
        desc: 'Roti Canai，点单话术与沾酱搭配一次讲完。',
        url: `${SITE}/dishes/food-q2039365/`,
      },
      {
        title: 'Nasi kandar',
        desc: '扁担饭词条：浇汁（kuah）怎么选。',
        url: `${SITE}/dishes/nasi-kandar-q3520299/`,
      },
      {
        title: '仁当',
        desc: 'Rendang，节庆与婚宴上的慢煮咖喱。',
        url: `${SITE}/dishes/food-q1520293/`,
      },
      {
        title: '煎蕊、红豆冰与白咖啡',
        desc: '马来西亚甜饮点单词典，一整套下午茶。',
        url: `${SITE}/cendol-abc-ipoh-white-coffee-guide/`,
      },
      {
        title: '咖啡店怎么点 Kopi O、Kopi',
        desc: 'Kopi-O / Kopi-C 点单速查表。',
        url: `${SITE}/kopi-o-kopi-c-ordering-guide/`,
      },
    ],
  },
  {
    slug: 'festival',
    navLabel: '岁时节庆',
    title: '岁时节庆',
    enLabel: 'FESTIVALS',
    coord: { lat: 6.125, lng: 102.25 },
    pin: { x: 54, y: 25 },
    intro:
      '农历新年、开斋节、屠妖节、丰收节……马来西亚的公共假期背后，都有一套固定的食物与仪式。这里把日期、习俗与「怎么吃」放在一起。',
    externalUrl: `${SITE}/festival/`,
    items: [
      {
        title: '农历新年是什么？',
        desc: '历法、马来西亚公共假期与十五日节期。',
        url: `${SITE}/chinese-new-year-malaysia/`,
      },
      {
        title: '开斋节是什么？',
        desc: '日期如何推算、习俗与「开放门户」做客礼仪。',
        url: `${SITE}/hari-raya-aidilfitri/`,
      },
      {
        title: '屠妖节与大宝森节有什么不同？',
        desc: '灯节含义、历法与各州公共假期。',
        url: `${SITE}/deepavali-thaipusam-differences-holidays/`,
      },
      {
        title: 'Gawai Dayak 是什么？',
        desc: '砂拉越丰收节的命名、别称、历史与含义。',
        url: `${SITE}/gawai-dayak/`,
      },
      {
        title: 'Kaamatan 是什么？',
        desc: '沙巴丰收节的词源、假期与传说分级。',
        url: `${SITE}/kaamatan-festival/`,
      },
      {
        title: 'Ketupat 是什么？',
        desc: '椰叶包饭的做法、开斋节吃法与由来。',
        url: `${SITE}/ketupat-rice-cake/`,
      },
    ],
  },
  {
    slug: 'bioculture',
    navLabel: '生物与生态文化',
    title: '生物与生态文化',
    enLabel: 'BIOCULTURE',
    coord: { lat: 4.045, lng: 114.82 },
    pin: { x: 75, y: 25 },
    intro:
      '食物与生态、族群与手艺之间的隐形网络：从洞穴生态到发酵虾酱，从锡克社群的共享厨房到伊班人的竹筒烹调。',
    externalUrl: `${SITE}/bioculture/`,
    items: [
      {
        title: '虾酱 Belacan 的味道从哪里来？',
        desc: '发酵与熟成的科学，为什么越「臭」越鲜。',
        url: `${SITE}/belacan-fermentation-flavour-science/`,
      },
      {
        title: '旁遮普餐桌与共享厨房：Langar',
        desc: '马来西亚锡克社群的免费食堂传统。',
        url: `${SITE}/sikh-langar-malaysia-community-kitchen/`,
      },
      {
        title: '竹筒鸡 Manok Pansoh',
        desc: '伊班人的 Pansoh 竹筒烹调法。',
        url: `${SITE}/manok-pansoh/`,
      },
      {
        title: '包装日期与食品召回',
        desc: '看懂标签上的安全信息（MITI、Best Before 怎么读）。',
        url: `${SITE}/food-dates-labels-recalls-malaysia/`,
      },
      {
        title: 'Bubur Lambuk 是什么？',
        desc: '斋月清真寺香料粥的做法与由来。',
        url: `${SITE}/bubur-lambuk/`,
      },
      {
        title: '竹筒饭 Lemang 是什么？',
        desc: '炭火烤制、词源与开斋节餐桌。',
        url: `${SITE}/lemang/`,
      },
    ],
  },
  {
    slug: 'area',
    navLabel: '按地区',
    title: '按地区浏览',
    enLabel: 'BY STATE',
    coord: { lat: 1.5535, lng: 110.3593 },
    pin: { x: 38, y: 17 },
    intro:
      '十三个州各有一套自己的版本：槟城的亚参叻沙、吉兰丹的蓝花饭、霹雳的仁当、砂拉越的叻沙。先选地方，再选吃法。',
    externalUrl: `${SITE}/area/`,
    items: [
      {
        title: '槟城：亚参叻沙',
        desc: '鱼酸汤底、薄荷与洋葱，北马的酸味代表。',
        url: `${SITE}/penang-asam-laksa/`,
      },
      {
        title: '吉兰丹：蓝花饭 Nasi Kerabu',
        desc: '蝶豆花染色的米饭与香草配菜。',
        url: `${SITE}/nasi-kerabu/`,
      },
      {
        title: '槟城：扁担饭 Nasi Kandar',
        desc: '码头工人的午餐，浇汁是灵魂。',
        url: `${SITE}/nasi-kandar-history/`,
      },
      {
        title: '砂拉越：古晋叻沙',
        desc: '虾汤咖喱底的早餐汤粉。',
        url: `${SITE}/sarawak-laksa/`,
      },
      {
        title: '霹雳：仁当 Rendang',
        desc: '慢火收汁，森美兰与霹雳的版本差异。',
        url: `${SITE}/rendang-history/`,
      },
      {
        title: '霹雳：怡保白咖啡与 Kopi 点单',
        desc: '一杯咖啡的点法，就是一座城镇的日常。',
        url: `${SITE}/kopi-o-kopi-c-ordering-guide/`,
      },
    ],
  },
  {
    slug: 'places',
    navLabel: '吃货地图',
    title: '吃货地图',
    enLabel: 'PLACES',
    coord: { lat: 5.98, lng: 116.07 },
    pin: { x: 44, y: 46 },
    intro:
      '把文章落到真实坐标上：洞穴、小镇、市集与庙宇。每个地点都附导航坐标，走到哪里，就吃到哪里。',
    externalUrl: `${SITE}/places/`,
    items: [
      {
        title: 'Deer Cave 砂拉越',
        desc: '姆鲁国家公园的鹿洞，距离 Wind Cave 约 0.1 公里。',
        url: `${SITE}/places/deer-cave-2/`,
      },
      {
        title: 'Clearwater Cave Mulu',
        desc: '砂拉越的长洞穴系统，距风洞约 0.5 公里。',
        url: `${SITE}/places/clearwater-cave-2/`,
      },
      {
        title: '丹那拉打 Tanah Rata 彭亨',
        desc: '金马仑高原的小镇入口。',
        url: `${SITE}/places/tanah-rata/`,
      },
      {
        title: '苏丹依斯迈柏特拉银禧清真寺',
        desc: '吉兰丹的河畔清真寺。',
        url: `${SITE}/places/sultan-ismail-petra-mosque/`,
      },
      {
        title: '苏丹伊德里斯沙阿二世清真寺',
        desc: '霹雳的州清真寺，距毕治纪念塔约 86 米。',
        url: `${SITE}/places/sultan-idris-shah-ii-mosque/`,
      },
      {
        title: '垄尾 Pulau Pinang',
        desc: '槟城的印度庙与街区索引。',
        url: `${SITE}/places/paya-terubong/`,
      },
    ],
  },
  {
    slug: 'games',
    navLabel: '吃货游戏',
    title: '吃货游戏',
    enLabel: 'GAME ROOM',
    coord: { lat: 3.139, lng: 101.6869 },
    pin: { x: 30, y: 47 },
    intro:
      '把马来西亚玩进地图里：拿着吃货护照去打卡盖章，回帮衬村经营你的小吃摊，或者坐下掷骰子环游半岛——三个小游戏，各玩各的，随时开局。',
    externalUrl: 'https://game.eatplan.online/',
    ctaLabel: '开局吃货大富翁 ▶',
    items: [
      {
        title: '吃货大富翁 · 环马',
        desc: '28 格环形棋盘走遍马来西亚：买地收租，还有股票、保险与财务报表的现金流玩法，单机或 6 人联机。',
        url: 'https://game.eatplan.online/',
      },
      {
        title: '吃货护照 H5',
        desc: '边吃边盖章：走遍景点与摊位，把行程收进自己的护照。',
        url: `${SITE}/passport/`,
      },
      {
        title: '帮衬村',
        desc: '经营你的小吃摊，看看一天能赚多少、能撑多久。',
        url: `${SITE}/bangchen/`,
      },
    ],
  },
]

export const BRAND_BADGE = '/brand-badge.png'

export function formatCoord(c: { lat: number; lng: number }): string {
  const latDir = c.lat >= 0 ? 'N' : 'S'
  const lngDir = c.lng >= 0 ? 'E' : 'W'
  return `${latDir}${Math.abs(c.lat).toFixed(4)}° ${lngDir}${Math.abs(c.lng).toFixed(4)}°`
}

export function findSection(slug: string | undefined): Section | undefined {
  return sections.find((s) => s.slug === slug)
}
/** 行走顺序：码头出发自下而上，抽屉「下一站」也按此串联 */
const WALK_ORDER = ['dishes', 'places', 'festival', 'magazine', 'games', 'bioculture', 'area']

export const sections: Section[] = [...rawSections].sort(
  (a, b) => WALK_ORDER.indexOf(a.slug) - WALK_ORDER.indexOf(b.slug),
)
