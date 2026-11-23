import * as THREE from 'three'
import {
  awningTexture,
  dirtTexture,
  faceTexture,
  glassTexture,
  grassTexture,
  labelTexture,
  mulberry32,
  plasterTexture,
  roofTexture,
  sandTexture,
  stoneTexture,
  upTexture,
  waterTexture,
  woodTexture,
} from './textures'
import { formatCoord, sections } from '../data/sections'

export type IslandCallbacks = {
  /** 角色走进某个栏目的坐标范围（自动拉出抽屉） */
  onZoneEnter: (slug: string) => void
  onZoneLeave: (slug: string) => void
  /** 附近是否有可进入的坐标（HUD 行动按钮） */
  onNearChange: (slug: string | null) => void
  /** 点选了某栋建筑（自动走过去 / 靠近时进入） */
  onPickBuilding: (slug: string) => void
  /** E 键 / 行动键：附近有坐标时触发 */
  onAction: (slug: string | null) => void
}

type Collider = { x: number; z: number; r: number }

/** 岛上六栋建筑的落位（对应六个栏目坐标入口） */
const SITES = [
  { slug: 'dishes', x: -5, z: 17, ry: 0.45 },
  { slug: 'places', x: 5.5, z: 11, ry: -0.55 },
  { slug: 'magazine', x: -5.5, z: 3.5, ry: 0.5 },
  { slug: 'festival', x: 5.5, z: -4.5, ry: -0.5 },
  { slug: 'area', x: -4.5, z: -12, ry: 0.45 },
  { slug: 'bioculture', x: 4.5, z: -19, ry: -0.4 },
]

const PATH: [number, number][] = [
  [0, 24],
  [0, 19.5],
  [-5, 17],
  [0, 14.5],
  [5.5, 11],
  [0, 7],
  [-5.5, 3.5],
  [0, 0],
  [5.5, -4.5],
  [0, -8],
  [-4.5, -12],
  [0, -16],
  [4.5, -19],
  [0, -23],
]

const ZONE_RADIUS = 2.7
const NEAR_RADIUS = 3.6
const SPEED = 4.4
const ISLE_A = 12.2 // x 半径（留边）
const ISLE_B = 25.6 // z 半径（留边）

function makeMat(map: THREE.Texture, extra: Partial<THREE.MeshLambertMaterialParameters> = {}) {
  return new THREE.MeshLambertMaterial({ map, ...extra })
}

export class IslandScene {
  private container: HTMLElement
  private cb: IslandCallbacks
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.OrthographicCamera
  private clock = new THREE.Clock()
  private raf = 0
  private disposed = false

  private character = new THREE.Group()
  private legL!: THREE.Object3D
  private legR!: THREE.Object3D
  private armL!: THREE.Object3D
  private armR!: THREE.Object3D
  private charPos = new THREE.Vector3(0, 0, 24)
  private facing = Math.PI
  private moving = false

  private colliders: Collider[] = []
  private pickTargets: THREE.Object3D[] = []
  private labels = new Map<string, THREE.Sprite>()

  private keys = new Set<string>()
  private joystick = { x: 0, y: 0 }
  private target: THREE.Vector3 | null = null
  private controlsEnabled = true

  private currentZone: string | null = null
  private nearSlug: string | null = null

  private camFocus = new THREE.Vector3(0, 0, 24)
  private water!: THREE.Mesh
  private raycaster = new THREE.Raycaster()
  private pointerDown: { x: number; y: number; t: number } | null = null
  private ro?: ResizeObserver
  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.controlsEnabled) return
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
    this.keys.add(e.key.toLowerCase())
    if (e.key.toLowerCase() === 'e') this.cb.onAction(this.nearSlug)
  }
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase())
  private onPointerDown = (e: PointerEvent) => {
    this.pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() }
  }
  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointerDown) return
    const dx = e.clientX - this.pointerDown.x
    const dy = e.clientY - this.pointerDown.y
    const dt = performance.now() - this.pointerDown.t
    this.pointerDown = null
    if (Math.hypot(dx, dy) > 10 || dt > 500 || !this.controlsEnabled) return
    this.pick(e)
  }

  constructor(container: HTMLElement, cb: IslandCallbacks) {
    this.container = container
    this.cb = cb

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * 0.5) // 低分辨率 = 像素质感
    this.renderer.setClearColor('#8fd1d8')
    this.renderer.domElement.style.imageRendering = 'pixelated'
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.style.touchAction = 'none'
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 200)
    this.camera.position.set(14, 16, 14 + this.charPos.z)
    this.camera.lookAt(this.camFocus)

    this.buildLights()
    this.buildIsland()
    this.buildPath()
    this.buildSites()
    this.scatterProps()
    this.buildCharacter()

    this.scene.fog = new THREE.Fog(0x8fd1d8, 60, 120)

    this.resize()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp)

    this.loop()
  }

  /* ---------------- 构建 ---------------- */

  private buildLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.5))
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.4)
    sun.position.set(10, 18, 6)
    this.scene.add(sun)
    const fill = new THREE.DirectionalLight(0xbfe7ff, 0.5)
    fill.position.set(-8, 10, -6)
    this.scene.add(fill)
  }

  /** 超椭圆岛屿：中心格铺草，边缘格铺沙+土层，海面在下 */
  private buildIsland() {
    const rnd = mulberry32(2026)
    const inside = (x: number, z: number) =>
      Math.pow(Math.abs(x) / ISLE_A, 2.6) + Math.pow(Math.abs(z) / ISLE_B, 2.6) <= 1

    const grass: [number, number][] = []
    const edge: [number, number][] = []
    for (let x = -14; x <= 14; x++) {
      for (let z = -28; z <= 28; z++) {
        if (!inside(x, z)) continue
        const border =
          !inside(x + 1, z) || !inside(x - 1, z) || !inside(x, z + 1) || !inside(x, z - 1)
        ;(border ? edge : grass).push([x, z])
      }
    }

    const grassTex = grassTexture()
    const grassGeo = new THREE.BoxGeometry(1, 1, 1)
    const grassMesh = new THREE.InstancedMesh(grassGeo, makeMat(grassTex), grass.length)
    const m = new THREE.Matrix4()
    grass.forEach(([x, z], i) => {
      m.makeTranslation(x, -0.5, z)
      grassMesh.setMatrixAt(i, m)
    })
    grassMesh.instanceMatrix.needsUpdate = true
    this.scene.add(grassMesh)

    const dirtMat = makeMat(dirtTexture())
    const sandTop = makeMat(sandTexture())
    const edgeMats = [dirtMat, dirtMat, sandTop, dirtMat, dirtMat, dirtMat]
    const edgeGeo = new THREE.BoxGeometry(1, 1, 1)
    edge.forEach(([x, z]) => {
      const top = new THREE.Mesh(edgeGeo, edgeMats)
      top.position.set(x, -0.5, z)
      this.scene.add(top)
      const sub = new THREE.Mesh(edgeGeo, dirtMat)
      sub.position.set(x, -1.5, z)
      this.scene.add(sub)
      void rnd
    })

    const waterTex = waterTexture()
    waterTex.repeat.set(18, 18)
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshBasicMaterial({ map: waterTex }),
    )
    this.water.rotation.x = -Math.PI / 2
    this.water.position.y = -1.02
    this.scene.add(this.water)
  }

  private distToPath(x: number, z: number) {
    let min = Infinity
    for (let i = 0; i < PATH.length - 1; i++) {
      const [ax, az] = PATH[i]
      const [bx, bz] = PATH[i + 1]
      const dx = bx - ax
      const dz = bz - az
      const len2 = dx * dx + dz * dz
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2))
      const px = ax + dx * t
      const pz = az + dz * t
      min = Math.min(min, Math.hypot(x - px, z - pz))
    }
    return min
  }

  /** 石板路：沿路径撒 1×1 石块 */
  private buildPath() {
    const stone = makeMat(stoneTexture())
    const geo = new THREE.BoxGeometry(1.1, 0.1, 1.1)
    const placed = new Set<string>()
    const add = (x: number, z: number) => {
      const key = `${Math.round(x)},${Math.round(z)}`
      if (placed.has(key)) return
      placed.add(key)
      const slab = new THREE.Mesh(geo, stone)
      slab.position.set(Math.round(x), 0.05, Math.round(z))
      slab.rotation.y = ((Number(key.replace(/[^,]/g, '')) || 0) % 7) * 0.03
      this.scene.add(slab)
    }
    for (let i = 0; i < PATH.length - 1; i++) {
      const [ax, az] = PATH[i]
      const [bx, bz] = PATH[i + 1]
      const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.1)
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        add(ax + (bx - ax) * t, az + (bz - az) * t)
      }
    }
  }

  /* ---------------- 建筑 ---------------- */

  private box(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material | THREE.Material[],
    x = 0,
    y = 0,
    z = 0,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    mesh.position.set(x, y, z)
    return mesh
  }

  private buildSites() {
    const wood = makeMat(woodTexture())
    const woodDark = makeMat(woodTexture('#8a5a31', '#6f4726'))
    const plaster = makeMat(plasterTexture())
    const plasterWarm = makeMat(plasterTexture('#f6d9a8'))
    const roofRed = makeMat(roofTexture('#c7503c', '#a63f2e'))
    const roofGreen = makeMat(roofTexture('#2f7a5e', '#25644b'))
    const glass = makeMat(glassTexture())
    const awning = makeMat(awningTexture())
    const dark = new THREE.MeshLambertMaterial({ color: '#4a3527' })
    const windowMat = new THREE.MeshLambertMaterial({ color: '#ffe9a8' })
    const ink = new THREE.MeshLambertMaterial({ color: '#2a2622' })

    for (const site of SITES) {
      const g = new THREE.Group()
      const section = sections.find((s) => s.slug === site.slug)!

      if (site.slug === 'dishes') {
        // 大排档：木摊位 + 条纹雨棚
        g.add(this.box(3.4, 0.5, 1.8, woodDark, 0, 0.25, 0))
        g.add(this.box(3.6, 0.14, 2, wood, 0, 0.6, 0))
        for (const px of [-1.6, 1.6]) for (const pz of [-0.8, 0.8]) g.add(this.box(0.14, 1.7, 0.14, woodDark, px, 1.3, pz))
        const roof = this.box(3.9, 0.16, 2.4, awning, 0, 2.2, 0)
        roof.rotation.x = 0.12
        g.add(roof)
        g.add(this.box(0.6, 0.4, 0.6, ink, -0.8, 0.9, 0)) // 锅
        g.add(this.box(0.5, 0.3, 0.5, ink, 0.6, 0.85, 0.2))
        g.add(this.box(0.9, 0.5, 0.4, plasterWarm, 0, 1.5, -0.9)) // 招牌
      } else if (site.slug === 'magazine') {
        // 两层书店 + 屋顶大书
        g.add(this.box(3.4, 3, 2.6, plaster, 0, 1.5, 0))
        g.add(this.box(3.7, 0.5, 2.9, roofGreen, 0, 3.25, 0))
        g.add(this.box(0.9, 1.4, 0.1, dark, 0, 0.7, 1.32)) // 门
        for (const px of [-1, 1]) g.add(this.box(0.8, 0.8, 0.1, windowMat, px, 1.9, 1.32))
        for (const px of [-1, 1]) g.add(this.box(0.8, 0.7, 0.1, windowMat, px, 2.6, 1.32))
        const bookL = this.box(1.1, 0.1, 1.4, plasterWarm, -0.6, 4.1, 0)
        const bookR = this.box(1.1, 0.1, 1.4, plasterWarm, 0.6, 4.1, 0)
        bookL.rotation.z = 0.5
        bookR.rotation.z = -0.5
        g.add(bookL, bookR)
      } else if (site.slug === 'festival') {
        // 节庆屋：红灯笼 + 粽子（ketupat）挂饰
        g.add(this.box(3.2, 2.2, 2.6, plasterWarm, 0, 1.1, 0))
        g.add(this.box(3.6, 0.6, 3, roofRed, 0, 2.5, 0))
        g.add(this.box(0.8, 1.3, 0.1, dark, 0, 0.65, 1.32))
        g.add(this.box(0.7, 0.7, 0.1, windowMat, -1, 1.4, 1.32))
        g.add(this.box(0.7, 0.7, 0.1, windowMat, 1, 1.4, 1.32))
        for (const px of [-1.4, 1.4]) {
          g.add(this.box(0.34, 0.5, 0.34, new THREE.MeshLambertMaterial({ color: '#d6453a' }), px, 1.7, 1.5))
          const k = this.box(0.4, 0.4, 0.4, new THREE.MeshLambertMaterial({ color: '#4f9e5c' }), px, 2.4, 1.42)
          k.rotation.z = Math.PI / 4
          g.add(k)
        }
      } else if (site.slug === 'bioculture') {
        // 生态温室：玻璃房 + 白框
        const white = new THREE.MeshLambertMaterial({ color: '#f3f3ec' })
        g.add(this.box(3.2, 2, 2.6, glass, 0, 1, 0))
        for (const px of [-1.6, 0, 1.6]) g.add(this.box(0.12, 2.1, 0.12, white, px, 1.05, 1.31))
        g.add(this.box(3.4, 0.14, 2.8, white, 0, 2.05, 0))
        const dome = this.box(2.4, 0.7, 2.2, glass, 0, 2.5, 0)
        dome.rotation.z = 0.1
        g.add(dome)
        g.add(this.box(0.8, 1.2, 0.1, dark, 0, 0.6, 1.32))
        const leaf = this.box(0.7, 0.7, 0.1, new THREE.MeshLambertMaterial({ color: '#3f8f4a' }), 1.1, 1.6, 1.34)
        leaf.rotation.z = Math.PI / 4
        g.add(leaf)
      } else if (site.slug === 'area') {
        // 地区路标广场：石台 + 多向路牌
        g.add(this.box(3.4, 0.24, 3.4, plasterWarm, 0, 0.12, 0))
        g.add(this.box(0.24, 2.6, 0.24, woodDark, 0, 1.4, 0))
        const colors = ['#c7503c', '#e0a13c', '#2f7a5e', '#3a7fbf']
        const dirs = [0.4, -1.1, 2.2, -2.6]
        dirs.forEach((ry, i) => {
          const b = this.box(1.5, 0.42, 0.1, new THREE.MeshLambertMaterial({ color: colors[i] }), 0, 2.4 - i * 0.5, 0)
          b.rotation.y = ry
          b.position.x = Math.sin(ry) * 0.7
          b.position.z = Math.cos(ry) * 0.7
          g.add(b)
        })
        g.add(this.box(0.9, 0.6, 0.9, plaster, -1.2, 0.3, 1))
        g.add(this.box(0.7, 0.5, 0.7, plaster, 1.3, 0.25, -1))
      } else {
        // 吃货地图：大地图告示板 + 长椅
        for (const px of [-1.3, 1.3]) g.add(this.box(0.2, 2.4, 0.2, woodDark, px, 1.2, 0))
        g.add(this.box(3.2, 2, 0.16, plaster, 0, 2.2, 0))
        g.add(this.box(2.8, 1.6, 0.06, makeMat(stoneTexture(), { color: '#dff0e2' }), 0, 2.2, 0.12))
        g.add(this.box(0.5, 0.14, 0.12, new THREE.MeshLambertMaterial({ color: '#c7503c' }), 0.6, 2.5, 0.18))
        g.add(this.box(1.6, 0.14, 0.5, wood, 0, 0.6, 1.4))
        g.add(this.box(1.6, 0.5, 0.12, woodDark, 0, 0.85, 1.62))
      }

      g.position.set(site.x, 0, site.z)
      g.rotation.y = site.ry
      g.userData.slug = site.slug
      g.traverse((o) => {
        o.userData.slug = site.slug
        if ((o as THREE.Mesh).isMesh) this.pickTargets.push(o)
      })
      this.scene.add(g)

      // 碰撞体
      const rad = site.slug === 'area' || site.slug === 'places' ? 1.9 : 2.1
      this.colliders.push({ x: site.x, z: site.z, r: rad })

      // 坐标标签
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: labelTexture(section.navLabel, formatCoord(section.coord)), depthTest: true }),
      )
      sprite.scale.set(3.9, 1.22, 1)
      sprite.position.set(site.x, site.slug === 'magazine' ? 5.4 : 4.2, site.z)
      this.scene.add(sprite)
      this.labels.set(site.slug, sprite)
    }
  }

  /** 棕榈树、石头、灌木、花、小船 —— 沿海岸与空地散布 */
  private scatterProps() {
    const rnd = mulberry32(777)
    const inside = (x: number, z: number, margin = 0) =>
      Math.pow(Math.abs(x) / (ISLE_A - margin), 2.6) +
        Math.pow(Math.abs(z) / (ISLE_B - margin), 2.6) <=
      1

    const trunkMat = makeMat(woodTexture('#9a6b3f', '#7c5432'))
    const leafMat = new THREE.MeshLambertMaterial({ color: '#3f9450' })
    const leafMat2 = new THREE.MeshLambertMaterial({ color: '#4fae5d' })
    const rockMat = new THREE.MeshLambertMaterial({ color: '#9aa0a4' })
    const bushMat = new THREE.MeshLambertMaterial({ color: '#4b9a54' })
    const flowerMats = ['#f3e36b', '#f3f3f3', '#ef7f9a'].map(
      (c) => new THREE.MeshLambertMaterial({ color: c }),
    )

    const trunkGeo = new THREE.CylinderGeometry(0.13, 0.18, 2.2, 6)
    const leafGeo = new THREE.BoxGeometry(1.6, 0.1, 0.5)
    const rockGeo = new THREE.BoxGeometry(0.9, 0.7, 0.8)
    const bushGeo = new THREE.BoxGeometry(0.8, 0.7, 0.8)

    let planted = 0
    for (let i = 0; i < 400 && planted < 46; i++) {
      const x = (rnd() * 2 - 1) * ISLE_A
      const z = (rnd() * 2 - 1) * ISLE_B
      if (!inside(x, z, 1.2)) continue
      if (this.distToPath(x, z) < 2.4) continue
      if (SITES.some((s) => Math.hypot(s.x - x, s.z - z) < 4.2)) continue
      if (Math.hypot(x, z - 24) < 3) continue // 出生点留空
      planted++

      const kind = rnd()
      if (kind < 0.45) {
        // 棕榈树
        const tree = new THREE.Group()
        const trunk = new THREE.Mesh(trunkGeo, trunkMat)
        trunk.position.y = 1.1
        tree.add(trunk)
        for (let f = 0; f < 5; f++) {
          const leaf = new THREE.Mesh(leafGeo, f % 2 ? leafMat : leafMat2)
          leaf.position.y = 2.3
          leaf.rotation.y = (f / 5) * Math.PI * 2
          leaf.rotation.z = -0.35
          leaf.position.x = Math.sin(leaf.rotation.y) * 0.5
          leaf.position.z = Math.cos(leaf.rotation.y) * 0.5
          tree.add(leaf)
        }
        tree.position.set(Math.round(x), 0, Math.round(z))
        tree.rotation.y = rnd() * Math.PI
        this.scene.add(tree)
        this.colliders.push({ x: tree.position.x, z: tree.position.z, r: 0.55 })
      } else if (kind < 0.68) {
        const rock = new THREE.Mesh(rockGeo, rockMat)
        rock.position.set(x, 0.3, z)
        rock.rotation.y = rnd() * Math.PI
        this.scene.add(rock)
        this.colliders.push({ x, z, r: 0.6 })
      } else if (kind < 0.88) {
        const bush = new THREE.Mesh(bushGeo, bushMat)
        bush.position.set(x, 0.3, z)
        this.scene.add(bush)
        this.colliders.push({ x, z, r: 0.5 })
      } else {
        for (let f = 0; f < 3; f++) {
          const fl = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.16, 0.16),
            flowerMats[f % 3],
          )
          fl.position.set(x + (f - 1) * 0.3, 0.1, z + (f % 2) * 0.25)
          this.scene.add(fl)
        }
      }
    }

    // 海面上的两艘小船
    const boatMat = makeMat(woodTexture('#b3593a', '#8f452c'))
    for (const [bx, bz, rot] of [
      [-13.5, 15, 0.6],
      [13.8, -8, -0.4],
    ] as const) {
      const boat = new THREE.Group()
      boat.add(this.box(1.4, 0.4, 3, boatMat, 0, 0, 0))
      boat.add(this.box(1.1, 0.5, 2.2, makeMat(woodTexture()), 0, 0.35, 0))
      boat.position.set(bx, -0.9, bz)
      boat.rotation.y = rot
      this.scene.add(boat)
    }
  }

  private buildCharacter() {
    const skin = new THREE.MeshLambertMaterial({ color: '#f6cfa0' })
    const face = new THREE.MeshLambertMaterial({ map: faceTexture() })
    const hairTop = new THREE.MeshLambertMaterial({ map: upTexture() })
    const shirt = new THREE.MeshLambertMaterial({ color: '#1e5b45' })
    const pants = new THREE.MeshLambertMaterial({ color: '#2f4b62' })
    const cap = new THREE.MeshLambertMaterial({ color: '#f2a93b' })

    const headMats = [skin, skin, hairTop, skin, face, skin]
    const head = this.box(0.42, 0.42, 0.42, headMats, 0, 1.16, 0)
    this.character.add(head)
    this.character.add(this.box(0.46, 0.12, 0.46, cap, 0, 1.4, 0))
    this.character.add(this.box(0.48, 0.5, 0.3, shirt, 0, 0.68, 0))

    const mkLimb = (mat: THREE.Material, w: number, h: number, x: number, y: number) => {
      const pivot = new THREE.Group()
      pivot.position.set(x, y, 0)
      const mesh = this.box(w, h, w, mat, 0, -h / 2, 0)
      pivot.add(mesh)
      return pivot
    }
    this.legL = mkLimb(pants, 0.17, 0.42, -0.12, 0.42)
    this.legR = mkLimb(pants, 0.17, 0.42, 0.12, 0.42)
    this.armL = mkLimb(shirt, 0.13, 0.36, -0.31, 0.9)
    this.armR = mkLimb(shirt, 0.13, 0.36, 0.31, 0.9)
    this.character.add(this.legL, this.legR, this.armL, this.armR)

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.36, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.02
    this.character.add(shadow)

    this.character.position.copy(this.charPos)
    this.character.rotation.y = this.facing
    this.character.scale.setScalar(1.18)
    this.scene.add(this.character)
  }

  /* ---------------- 交互 ---------------- */

  setJoystick(x: number, y: number) {
    this.joystick.x = x
    this.joystick.y = y
  }

  setControlsEnabled(v: boolean) {
    this.controlsEnabled = v
    if (!v) {
      this.keys.clear()
      this.joystick = { x: 0, y: 0 }
      this.target = null
    }
  }

  /** HUD 行动按钮 / E 键：靠近时返回当前坐标 slug */
  action(): string | null {
    return this.nearSlug
  }

  private pick(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(ndc, this.camera)
    const hitBuildings = this.raycaster.intersectObjects(this.pickTargets, false)[0]
    if (hitBuildings) {
      const slug = hitBuildings.object.userData.slug as string
      const site = SITES.find((s) => s.slug === slug)
      if (site) {
        this.target = this.doorOf(site)
        // 已经站在坐标上 → 立即拉开抽屉；否则先走过去，进入范围时自动拉出
        if (this.nearSlug === slug) this.cb.onPickBuilding(slug)
        return
      }
    }
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const pt = new THREE.Vector3()
    if (this.raycaster.ray.intersectPlane(plane, pt)) {
      this.target = pt
    }
  }

  private doorOf(site: (typeof SITES)[number]): THREE.Vector3 {
    const depth = 2
    return new THREE.Vector3(
      site.x + Math.sin(site.ry) * (depth / 2 + 1.6),
      0,
      site.z + Math.cos(site.ry) * (depth / 2 + 1.6),
    )
  }

  /* ---------------- 每帧 ---------------- */

  private free(x: number, z: number) {
    const inside =
      Math.pow(Math.abs(x) / ISLE_A, 2.6) + Math.pow(Math.abs(z) / ISLE_B, 2.6) <= 1
    if (!inside) return false
    for (const c of this.colliders) {
      if (Math.hypot(x - c.x, z - c.z) < c.r + 0.34) return false
    }
    return true
  }

  private update(dt: number, t: number) {
    // 输入向量
    let ix = this.joystick.x
    let iy = this.joystick.y
    if (this.controlsEnabled) {
      if (this.keys.has('w') || this.keys.has('arrowup')) iy += 1
      if (this.keys.has('s') || this.keys.has('arrowdown')) iy -= 1
      if (this.keys.has('a') || this.keys.has('arrowleft')) ix -= 1
      if (this.keys.has('d') || this.keys.has('arrowright')) ix += 1
    }
    const keyActive = ix !== 0 || iy !== 0

    // 相机相对方向（等距固定视角）
    const forward = new THREE.Vector3(-1, 0, -1).normalize() // 屏幕上方向
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    let dir: THREE.Vector3 | null = null
    if (keyActive && this.controlsEnabled) {
      const len = Math.min(1, Math.hypot(ix, iy))
      const n = new THREE.Vector3().addScaledVector(right, ix).addScaledVector(forward, iy)
      if (n.lengthSq() > 0.0001) dir = n.normalize().multiplyScalar(len)
      this.target = null
    } else if (this.target && this.controlsEnabled) {
      const to = new THREE.Vector3(this.target.x - this.charPos.x, 0, this.target.z - this.charPos.z)
      if (to.length() < 0.5) {
        this.target = null
      } else {
        dir = to.normalize()
      }
    }

    this.moving = !!dir
    if (dir) {
      const step = SPEED * dt
      const nx = this.charPos.x + dir.x * step
      if (this.free(nx, this.charPos.z)) this.charPos.x = nx
      const nz = this.charPos.z + dir.z * step
      if (this.free(this.charPos.x, nz)) this.charPos.z = nz

      const want = Math.atan2(dir.x, dir.z)
      let diff = want - this.facing
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      this.facing += diff * Math.min(1, dt * 12)
    }

    this.character.position.set(this.charPos.x, this.moving ? Math.abs(Math.sin(t * 9)) * 0.06 : 0, this.charPos.z)
    this.character.rotation.y = this.facing
    const swing = this.moving ? Math.sin(t * 10) * 0.6 : 0
    this.legL.rotation.x = swing
    this.legR.rotation.x = -swing
    this.armL.rotation.x = -swing * 0.8
    this.armR.rotation.x = swing * 0.8

    // 相机跟随
    this.camFocus.lerp(new THREE.Vector3(this.charPos.x, 0, this.charPos.z), Math.min(1, dt * 5))
    this.camera.position.set(this.camFocus.x + 16, 18, this.camFocus.z + 16)
    this.camera.lookAt(this.camFocus.x, 1, this.camFocus.z)

    // 坐标区域判定
    let nearest: string | null = null
    let nearestDist = Infinity
    for (const site of SITES) {
      const d = Math.hypot(this.charPos.x - site.x, this.charPos.z - site.z)
      const inZone = d < ZONE_RADIUS
      if (inZone && this.currentZone !== site.slug) {
        this.currentZone = site.slug
        this.cb.onZoneEnter(site.slug)
      } else if (!inZone && this.currentZone === site.slug) {
        this.currentZone = null
        this.cb.onZoneLeave(site.slug)
      }
      if (d < NEAR_RADIUS && d < nearestDist) {
        nearest = site.slug
        nearestDist = d
      }
    }
    if (nearest !== this.nearSlug) {
      this.nearSlug = nearest
      this.cb.onNearChange(nearest)
    }

    // 靠近的标签放大高亮
    for (const [slug, sprite] of this.labels) {
      const isNear = slug === nearest
      const target = isNear ? 4.5 : 3.9
      sprite.scale.x += (target - sprite.scale.x) * Math.min(1, dt * 8)
      sprite.scale.y = sprite.scale.x * 0.3125
      sprite.material.opacity = 1
      sprite.position.y += ((isNear ? 0.25 : 0) + (slug === 'magazine' ? 5.4 : 4.2) - sprite.position.y) * Math.min(1, dt * 6)
    }

    // 海面微动
    if (this.water) {
      const map = (this.water.material as THREE.MeshBasicMaterial).map
      if (map) map.offset.y -= dt * 0.015
    }
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const t = this.clock.elapsedTime
    this.update(dt, t)
    this.renderer.render(this.scene, this.camera)
  }

  private resize() {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    const aspect = w / h
    const halfH = 10 / Math.max(1, aspect)
    const halfW = halfH * aspect
    this.camera.left = -halfW
    this.camera.right = halfW
    this.camera.top = halfH
    this.camera.bottom = -halfH
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect()
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp)
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else if (mat) {
        const anyMat = mat as THREE.MeshLambertMaterial
        anyMat.map?.dispose()
        mat.dispose()
      }
    })
    const spriteMat = this.labels
    spriteMat.forEach((s) => s.material.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
