# 「Les Circuits de Zap」完整开发 Prompt 文档

面向 8 岁孩子的电路拼接学习游戏，支持电脑、平板和手机，带法语解说、用户管理与学习进度（MongoDB）。

## 使用方法

1. 新建一个空目录，把下面「Prompt 0」的内容保存为根目录下的 `CLAUDE.md`（也可以直接使用随附的 CLAUDE.md 文件）。Claude Code 每次启动都会自动读取它。
2. 在该目录启动 Claude Code，按顺序逐条发送 Prompt 1 → 20。
3. 每完成一条，先运行并试玩，确认没问题再发送下一条。出现问题时直接描述现象，让 Claude Code 修复。

| 阶段 | Prompt | 内容 |
|---|---|---|
| 一 · 游戏核心 | 1–6 | monorepo、电路引擎、交互、图形、语音、关卡 |
| 二 · 多端适配 | 7–8 | 响应式布局、工作台缩放 |
| 三 · 用户系统 | 9–14 | 数据库、认证、管理 API、进度同步、后台、看板 |
| 四 · 完善功能 | 15–19 | 沙盒、性能、PWA、可用性审查、自动化测试 |
| 五 · 部署 | 20 | Docker + Caddy + 备份 |

---

## Prompt 0 · CLAUDE.md（项目总纲）

````markdown
# Projet : « Les Circuits de Zap » — jeu web d'initiation aux circuits électriques

## Public cible
Enfants de 8 ans (CE2), francophones, débutants complets. Préparation à la robotique.
Adultes : encadrants (coachs / enseignants), parents, administrateur.

## Principes pédagogiques (à respecter dans TOUT le code et le contenu)
- Un seul nouveau concept par niveau. Jamais deux à la fois.
- Progression concret → abstrait : d'abord des composants dessinés de façon réaliste
  (vraie pile, vraie ampoule), puis passage progressif aux symboles normalisés.
- Phrases courtes (≤ 12 mots), vocabulaire simple, tutoiement, ton encourageant.
- Pas d'échec punitif : une erreur déclenche un indice, jamais un « Perdu ».
- Pas de chiffres (volts, ohms) à l'écran. Tout est qualitatif : « brille fort », « brille faiblement ».
- Feedback immédiat et visuel : l'ampoule s'allume, le moteur tourne, le courant « coule ».
- Sécurité : le court-circuit est expliqué comme dangereux, avec une animation claire
  (pile qui chauffe), et un rappel que dans la vraie vie on ne touche pas aux prises.

## Personnage
« Zap », un petit robot sympathique, guide l'enfant. Il parle (voix + bulle de texte),
a 4 expressions : content, réfléchit, surpris, alerte.

## Appareils supportés
- Ordinateur (souris), tablette (tactile, priorité), téléphone (tactile, mode simplifié).
- Toutes les interactions passent par les Pointer Events (pointerdown/move/up), jamais
  par mouse* ou touch* séparément. Une seule logique pour souris, doigt et stylet.
- Aucune interaction ne dépend du survol (hover), du double-clic, du clic droit ou du clavier.
  Le survol peut seulement ajouter un bonus visuel sur ordinateur.
- Navigateurs cibles : Safari iOS/iPadOS 16+, Chrome Android, Chrome/Edge/Firefox/Safari desktop récents.
  Tester particulièrement Safari iPad (voix, audio, gestes).

## Points de rupture (selon la taille réelle, pas le type d'appareil)
- compact : largeur < 700 px ou hauteur < 500 px (téléphone)
- medium  : tablette et petits écrans
- large   : ordinateur
Le plan de travail se joue en paysage. En portrait sur téléphone, Zap demande de tourner
l'appareil. Sur tablette en portrait, une mise en page adaptée est proposée.

## Contraintes UI pour enfants
- Cibles tactiles ≥ 48 px partout, ≥ 56 px en compact. Bornes des composants avec grande
  zone de capture (aimantation).
- Grille magnétique : les composants se calent automatiquement.
- Maximum 5 boutons visibles à la fois.
- Icônes + texte, couleurs vives mais pas agressives, police arrondie et lisible (Nunito, auto-hébergée).
- Animations sans clignotement rapide (< 3 flashs par seconde).

## Architecture
Monorepo pnpm workspaces :
- apps/web : front React 18 (Vite, TypeScript strict, Zustand, framer-motion), PWA
- apps/api : back Node 20 + Fastify 4 + TypeScript strict
- packages/shared : moteur de circuit, définitions des niveaux, règles de score, types,
  schémas zod (partagés front/back)

Organisation du front :
- apps/web/src/components/ : composants React (plan de travail, palette, Zap…)
- apps/web/src/narration/ : textes français (fr.ts) + service de voix
- apps/web/src/assets/ : SVG des composants (réaliste + symbole)
- apps/web/src/admin/ : back-office adultes (chargé à la demande)

## Front-end
- Plan de travail rendu en SVG (pas de canvas).
- Voix : Web Speech API (fr-FR) derrière une interface NarrationService, remplaçable par
  des fichiers MP3 pré-enregistrés.
- Progression via une interface ProgressRepository (implémentations locale et API).
- PWA installable (manifest + service worker), jouable hors ligne pour les niveaux déjà chargés.

## Back-end
- MongoDB 7 via Mongoose (schémas stricts, strict: 'throw', timestamps activés).
- MongoDB lancé en replica set à un seul nœud (rs0) pour pouvoir utiliser les transactions.
- Index déclarés dans les schémas Mongoose et créés au démarrage (syncIndexes).
- Évolutions de schéma : scripts de migration versionnés avec migrate-mongo (apps/api/migrations).
- Ne jamais renvoyer un document Mongoose brut au client : toujours passer par un DTO validé
  par zod (pas de _id, __v ni de hash dans les réponses ; exposer un champ id en string).
- Protection contre l'injection NoSQL : toutes les entrées validées par zod, sanitizeFilter activé.
- Sessions par cookie httpOnly + SameSite=Lax + Secure, stockées en base avec un index TTL
  sur expiresAt (pas de JWT dans localStorage).
- Mots de passe adultes : argon2id.
- Rate limiting sur toutes les routes d'authentification.
- Logs structurés (pino), jamais de mot de passe ni de code secret dans les logs.
- Tests : Vitest, mongodb-memory-server en mode replica set.

## Rôles
- admin : gère tout
- encadrant : coach / enseignant, gère ses groupes et ses élèves, voit leur progression
- parent : voit la progression de ses enfants uniquement (lecture seule)
- eleve : joue, ne peut rien administrer

## Protection des données des enfants (RGPD / CNIL)
- Minimisation : pour un élève on stocke uniquement un prénom ou pseudo, un avatar,
  le groupe, et la progression. Pas d'email, pas de nom de famille, pas de date de naissance.
- Aucun traceur tiers, aucune analytics externe, aucune ressource chargée depuis un CDN externe.
- Un encadrant ou un parent peut exporter (JSON) et supprimer définitivement les données d'un élève.
- Les données inactives depuis plus de 24 mois sont signalées à l'admin pour suppression.

## Déploiement
- Serveur cible : instance Oracle Cloud (OCI) Ampere A1, CPU aarch64 (linux/arm64), Ubuntu.
- Docker Compose : mongo, api, et build statique du front. Toutes les images doivent exister
  en linux/arm64 et être testées sur cette architecture.
- Images Node basées sur Debian (node:20-bookworm-slim), pas Alpine : les modules natifs
  (argon2) et mongodb-memory-server sont plus fiables en glibc sur arm64.
- Aucune dépendance qui n'a pas de version arm64 (vérifier avant d'ajouter un paquet natif
  ou une image Docker).
- Reverse proxy : Caddy déjà installé sur l'hôte (hors compose).

## Langue
Code, commentaires et noms de variables en anglais. Tout le texte visible par l'enfant et
par les adultes en français.
````

---

## 第一阶段 · 游戏核心

### Prompt 1 · 初始化 monorepo

```
阅读 CLAUDE.md。按照里面的架构初始化 pnpm monorepo：
- apps/web：Vite + React 18 + TypeScript strict + Zustand + framer-motion
- apps/api：Fastify 4 + TypeScript strict，暂时只有 GET /api/health 返回 { ok: true }
- packages/shared：空的 TypeScript 包，以 @circuits/shared 名称被前后端引用
- 全部包使用 Vitest；根目录 pnpm dev 同时启动前后端，pnpm test 运行所有测试
- Vite dev server 把 /api 代理到本地 api 端口

前端做一个最简单的首页：标题「Les Circuits de Zap」、一个大大的「Jouer」按钮、一个「Atelier libre」按钮（沙盒，后面实现）。
自托管 Nunito 字体（不使用 Google Fonts CDN），定义一套适合儿童的配色 CSS 变量。
全局使用 100dvh 而不是 100vh，并预留 safe-area-inset 的处理。
完成后告诉我如何启动开发环境。
```

### Prompt 2 · 电路引擎（packages/shared，不含界面）

```
在 packages/shared 中实现电路引擎，纯 TypeScript，不依赖 React 和 DOM。

数据模型：
- Component：id、type、position、rotation、terminals（每个端子有 id）
- 元件类型：battery（正负极）、bulb、switch（开/合状态）、wire、motor、buzzer、led（有极性）、
  resistor，以及「测试材料」类型 material（属性 conductive: true/false，用于导体/绝缘体关卡）
- Wire：连接两个端子
- 多个端子连在一起构成一个节点（用并查集合并）
- 电路可序列化为 JSON 并还原（后面沙盒保存和服务器存储会用到）

求解：
- 用简单的节点电压法（MNA）求解直流电路，每个负载有一个内阻，电池有固定电压和小内阻
- 输出每个元件的电流，再映射成定性状态：off / dim / normal / bright
- LED 反接时不亮；开关断开等于断路
- 检测短路：电池两极之间存在几乎无阻值的通路时返回 shortCircuit: true 以及涉及的导线 id
- 检测开路：返回电路未闭合的提示信息，并尽量指出断开的位置（哪个端子没接）

额外提供 describeCircuit()，返回结构化诊断结果（例如 missing_battery、bulb_one_side、switch_open、
short_circuit、open_circuit），后续用来生成法语提示和教学统计。

用 Vitest 写测试，至少覆盖：单灯闭合回路、开路、开关开/合、两灯串联（比单灯暗）、两灯并联（亮度与单灯相同）、
短路、并联支路中的短路、LED 正接/反接、导体/绝缘体材料、序列化往返。
运行测试直到全部通过。
```

### Prompt 3 · 工作台与统一指针交互

```
实现 SVG 工作台（Workbench）和元件面板（Palette）。交互只基于 Pointer Events，
鼠标、手指、触控笔走同一套逻辑。

- 工作台 SVG 设置 touch-action: none，防止拖动时页面滚动或浏览器缩放；面板区域保留正常滚动
- 使用 setPointerCapture，手指移出元件时拖拽也不会中断
- 拖放元件：从面板按下即开始拖拽（不要求长按）；触控时元件显示在手指上方偏移约 40px 的位置，
  避免被手指挡住；松开后吸附网格；松开在无效区域时元件平滑回到面板
- 拖动已放置的元件可以移动，连在上面的导线跟着动
- 连线：点按一个端子，再点按另一个端子（点-点模式，触屏和鼠标通用），点空白处取消；
  同时支持从端子直接拖出导线拖到目标端子
- 端子吸附：拖动导线或元件时，靠近端子 30px（compact 布局下 40px）以内就自动吸附并高亮，不依赖 hover
- 选择：点按元件即选中，旁边弹出小工具条，包含大按钮：旋转 ↻、删除 🗑；
  开关元件也可以直接点按本身切换开/合，并有清脆的视觉反馈
- 删除：拖到垃圾桶，或使用工具条；点按导线也可选中并删除
- 撤销按钮（一个大箭头图标）
- 区分「点按」和「拖动」：移动超过 8px 才算拖动
- 多指触控时只响应第一根手指（两指手势留给后面的缩放功能）
- 工作台区域禁用 iOS 长按菜单和文字选择（-webkit-touch-callout: none; user-select: none）

每次电路变化都调用引擎重新计算，结果存入 Zustand。拖拽过程中只更新被拖动元件的 transform，松开后再触发引擎计算。
先用彩色方块代替元件图形，下一步再做美术。
不要做键盘快捷键、右键菜单、双击等孩子在触屏上用不了的功能。
把点按/拖动判定、吸附计算写成与 DOM 解耦的函数，并写单元测试。
```

### Prompt 4 · 元件图形与电流可视化

```
为每种元件制作两套 SVG 外观：
1. realistic：卡通写实风格（圆柱电池带 + / − 标记、透明玻璃灯泡、拨动开关、带小风扇的马达……）
2. symbol：法国学校使用的规范电路符号

元件根据引擎结果显示状态：
- 灯泡：off 灰色，dim/normal/bright 对应不同亮度的黄色光晕
- 马达：风扇旋转，速度随电流变化
- 蜂鸣器：小音波动画 + 一个短促、柔和的提示音（音量要低）
- LED：亮起对应颜色
- 短路：电池变红、轻微抖动、冒出「热」的波纹，导线闪烁红色（闪烁频率低于 3 次/秒）

电流可视化：闭合回路中，导线上有小黄点沿电流方向（正极 → 负极）流动，速度与电流成正比。
小点动画用 CSS/SVG 动画或单个 requestAnimationFrame 循环实现，不要每个点一个 React 状态。

全局显示模式：realistic / symbol / 两者叠加（symbol 显示在写实图标旁边的小标签里），关卡数据可以指定默认模式。
```

### Prompt 5 · 法语解说系统与 Zap 角色

```
在 apps/web/src/narration/ 实现解说系统：
- NarrationService 接口：speak(textId)、stop()、replay()
- 第一个实现基于 Web Speech API，选择 fr-FR 声音（优先质量较好的，如名字包含 "Google"、"Amélie"、"Thomas"），
  语速 0.9，音高略高；监听 voiceschanged，因为 iOS 上声音列表是异步加载的
- 第二个实现预留：从 /audio/{textId}.mp3 播放，如果文件存在则优先使用
- 所有文本集中在 fr.ts 中，以 id 为键，组件里不硬编码法语文本
- 音频解锁：浏览器（尤其 iOS Safari）要求在用户手势中首次播放。在首次点按「Jouer」或登录时，
  同步播放一段静音并调用一次 speak('')，解锁后续播放
- 页面切到后台时停止语音（visibilitychange），回来后不自动续播
- 设备完全没有 fr-FR 声音时，气泡文字照常显示

Zap 角色组件：
- 屏幕角落的小机器人，四种表情（content、réfléchit、surpris、alerte）
- 说话时显示文字气泡，嘴巴动；气泡旁有 🔊「Réécouter」按钮
- 全局静音按钮

根据 describeCircuit() 的诊断结果生成渐进式提示（第一次模糊，第二次更具体，第三次高亮出问题的端子）。
示例文本：
- « Regarde bien : le courant doit faire un tour complet ! »
- « Le fil ne touche qu'un côté de l'ampoule. »
- « Attention ! Les deux bouts de la pile se touchent directement. C'est un court-circuit, la pile chauffe ! »
- « Bravo ! L'ampoule s'allume, ton circuit est fermé ! »
```

### Prompt 6 · 关卡系统与第一章内容

```
实现关卡系统。关卡完全由数据定义，放在 packages/shared/levels/，结构包括：
id、标题、目标说明 textId、可用元件及数量、预放置的元件（可锁定不可移动）、显示模式、
工作台逻辑尺寸（例如 12×8 格）、成功条件（例如 "bulb#1 亮"、"motor 转且 bulb 不亮"、"开关断开时灭、闭合时亮"）、
提示列表、学到的词汇。
星级规则也写在 packages/shared 中（0 个提示 = 3 星，1–2 个提示 = 2 星，更多 = 1 星），以便后端复用。

关卡流程：Zap 介绍 → 孩子操作 → 实时检测成功条件 → 成功动画（星星 + 庆祝音效）→ 学到的词汇卡片 → 下一关。
关卡地图页面：像游戏地图一样的路径，已完成的显示星星，未解锁的显示锁。

进度存储：定义 ProgressRepository 接口（getProgress、startAttempt、finishAttempt、saveSandbox、listSandbox），
目前先实现 LocalProgressRepository（localStorage），后面会加入 API 实现。
每次尝试要记录 hintsUsed、durationMs 以及遇到过的诊断类型 errorsDetected。

第一章「La lumière」实现以下关卡（每关只引入一个新概念）：
1. Allume l'ampoule：电池和灯泡已放好，只需要连两根线
2. Le circuit fermé：故意留一个缺口，让孩子找到并补上（概念：闭合回路 / 断开回路）
3. L'interrupteur：加入开关，成功条件是「开关断开时灭、闭合时亮」
4. Conducteur ou isolant ? ：电路中留一个空位，孩子拖入不同材料（clé en métal、gomme、cuillère、
   crayon en bois、papier aluminium），并把它们分到两个盒子里：« Le courant passe » / « Le courant ne passe pas »
5. Deux ampoules en file：串联两个灯，观察变暗；拿掉一个灯会怎样？
6. Deux ampoules côte à côte：并联，观察亮度相同；拿掉一个另一个仍然亮
7. Danger : court-circuit ！：有意识地展示短路，并让孩子修复
8. Le moteur：用马达代替灯泡（为机器人做铺垫）
9. Le sens du courant：LED 有正反方向，孩子要转过来才能亮
10. Défi final：用一个开关控制马达、另一个开关控制灯泡

第 1–6 关默认写实模式，第 7–10 关逐渐引入符号（第 7 关开始在元件旁显示符号小标签，第 10 关完全使用符号）。
第 7 关之前插入过渡环节：Zap 解释 « Les ingénieurs dessinent les composants avec des symboles »，
做一个配对小游戏：把写实图片拖到对应符号上。
```

---

## 第二阶段 · 多端适配

### Prompt 7 · 响应式布局

```
为游戏界面实现三种布局，用容器尺寸（ResizeObserver + CSS container queries）判断，而不是 user agent：

large（电脑）：
- 左侧元件面板（竖排）、中间工作台、右下角垃圾桶、左下角 Zap

medium（平板）：
- 横屏：与电脑相同，但面板稍窄、按钮更大
- 竖屏：元件面板移到底部横向排列，Zap 缩小到左上角，气泡在工作台上方

compact（手机，横屏）：
- 元件面板变成底部一条可横向滑动的托盘，只显示图标
- Zap 缩成小头像，说话时气泡以半透明覆盖层出现在顶部，3 秒后自动收起，点头像可再看
- 关卡说明折叠成一个 ❓ 按钮
- 撤销、垃圾桶合并到右侧一个竖排工具栏
- 手机竖屏：显示 Zap 提示 « Tourne ton téléphone ! » 加旋转动画，不显示工作台

通用：
- 处理 safe-area-inset（刘海屏、iPad 圆角），按钮不能被遮挡
- 字体大小用 clamp()，在所有尺寸上保持可读
- 关卡地图：电脑和平板为横向路径，手机改为纵向滚动路径
- 首页同样适配三种布局
```

### Prompt 8 · 工作台缩放与视口适配

```
让工作台在任何屏幕尺寸上都能完整显示关卡：

- 根据关卡数据中的工作台逻辑尺寸，用 SVG viewBox 自动缩放以适应可用空间，最小的屏幕上整个关卡也能一屏显示
- 计算缩放后的实际格子大小；如果端子点击区域小于 44px，自动进入「可平移」模式：
  两指缩放、单指在空白处拖动平移
- 缩放和平移只作用于工作台，范围限制在 0.75×–2.5×
- 右下角「⤢ Tout voir」按钮一键恢复完整显示
- 电脑上支持鼠标滚轮缩放
- 所有坐标转换（屏幕 → SVG 逻辑坐标）集中在一个工具函数中并写测试，
  确保缩放、平移、旋转屏幕后拖放和吸附依然准确
- 屏幕旋转或窗口大小改变时，电路保持不变，只重新计算视口
```

---

## 第三阶段 · 用户系统与数据库（MongoDB）

### Prompt 9 · 数据库模型

```
在 apps/api 中用 Mongoose 设计 MongoDB 数据模型。原则：一起读取的数据放在一起，会无限增长的数据单独成集合。

集合 users：
- role (admin | encadrant | parent | eleve)、displayName、avatarId
- email（可空，仅成人，部分唯一索引：只对存在 email 的文档唯一）、passwordHash（可空，仅成人）
- pictureSecretHash（学生的图片密码，argon2 哈希）
- failedLogins、lockedUntil、lastSeenAt、disabledAt
- parentOf：[userId]（家长关联的孩子，内嵌）
- vocabulary：[{ wordId, unlockedAt }]（内嵌）

集合 groups：
- name（如 « Équipe Camelot »、« CE2 B »）、joinCode（唯一索引，6 位，大写字母+数字，去掉 0/O/1/I）、
  createdBy、archivedAt
- members：[{ userId, roleInGroup (encadrant | eleve), joinedAt }]（内嵌；在 members.userId 上建索引）

集合 sessions：
- userId、expiresAt（TTL 索引）、userAgent、kind (adult | child)

集合 invites：
- tokenHash、type (encadrant | parent | password_reset)、targetUserId、childId（家长邀请时）、
  expiresAt（TTL 索引）、usedAt

集合 levelprogress：
- userId、levelId（对应 shared 中的关卡 id）、status (locked | unlocked | completed)、stars (0–3)、
  attempts、hintsUsed、bestTimeMs、firstCompletedAt、lastPlayedAt
- 复合唯一索引 (userId, levelId)

集合 levelattempts：
- userId、groupId（冗余存储，方便看板聚合）、levelId、startedAt、endedAt、success、hintsUsed、
  errorsDetected：[string]
- 索引：(userId, startedAt)、(groupId, levelId)

集合 sandboxcircuits：
- userId、name、data（使用 shared 中的电路序列化格式，文档大小限制 200 KB）、thumbnail（可空）、updatedAt

集合 auditlogs：
- actorId、action、targetType、targetId、createdAt

MongoDB 没有外键级联：实现 deleteStudent(userId) 服务函数，在一个事务中删除该学生在 users、levelprogress、
levelattempts、sandboxcircuits、sessions 中的数据，并把他从所有 groups.members 和 users.parentOf 中移除。
写测试确认删除后数据库中不留任何痕迹。

用 migrate-mongo 初始化迁移目录，第一个迁移负责创建所有索引。
seed 脚本：创建一个 admin（邮箱和密码从环境变量读取）、一个示例小组、三个示例学生。
测试使用 mongodb-memory-server，以副本集模式启动以支持事务。
本地开发提供一个 docker-compose.dev.yml，只启动单节点副本集模式的 mongo:7。
```

### Prompt 10 · 认证（成人与孩子分开设计）

```
实现认证，成人和孩子采用完全不同的登录方式。

成人（admin / encadrant / parent）：
- 邮箱 + 密码登录，argon2id 校验，登录接口有限流
- 会话存在 sessions 集合中，以 httpOnly cookie 下发，有效期 30 天，每次访问滑动续期（更新 expiresAt）
- encadrant 或 parent 账号由 admin 或 encadrant 生成一次性邀请链接（有效 7 天），本人点开后设置密码。
  先不做邮件发送，生成链接后在界面上显示，由我手动转发
- 密码重置同样使用一次性链接

孩子（eleve），完全不需要打字：
1. 输入小组码（屏幕上的大按钮键盘），或老师已把设备「固定」到小组时直接跳到第 2 步
2. 从小组成员中点按自己的头像和名字
3. 图片密码：从 9 个图案（动物/水果/物品，配法语语音名称）中按顺序点按 3 个
- 连续错 5 次锁定该学生 10 分钟，并提示 « Demande de l'aide à ton encadrant »
- 孩子的会话有效期 8 小时；在共享设备上点 « Au revoir » 即退出
- 老师可以在后台一键重置某个学生的图片密码

设备固定：encadrant 登录后可以把当前浏览器绑定到某个小组（签名 cookie），
之后孩子在这台设备上只需点头像 + 图片密码。

中间件：requireAuth、requireRole(...)、requireGroupAccess(groupId)。
所有 API 响应通过 zod 校验的 DTO 输出。为所有认证流程写集成测试。
```

### Prompt 11 · 用户与小组管理 API

```
实现 REST API（以 /api 为前缀，用 shared 中的 zod schema 校验输入输出）：

小组：
- encadrant 创建、重命名、归档自己的小组，重新生成 joinCode
- 在小组中添加学生（只填写名字并选择头像，系统随机生成初始图片密码并显示给老师）
- 批量添加：粘贴一列名字，一次创建多个学生
- 把学生移到另一个小组

家长：
- encadrant 为某个学生生成家长邀请链接
- 一个家长可以关联多个孩子

管理：
- admin 可以查看所有用户、停用/启用账号、修改角色
- encadrant 只能看到自己小组里的学生
- parent 只能看到自己关联的孩子

隐私：
- GET /api/students/:id/export 返回该学生的全部数据（JSON）
- DELETE /api/students/:id 永久删除该学生，请求体中需再次输入学生名字作为确认；调用 deleteStudent 事务函数
- 这两个操作写入 auditlogs

为权限边界写测试：encadrant A 不能读取或修改 encadrant B 的学生，parent 不能读取别人的孩子，eleve 不能访问任何管理接口。
```

### Prompt 12 · 学习进度同步

```
实现进度 API，并接入前端的 ProgressRepository：

API：
- GET  /api/me/progress                 当前学生全部关卡进度 + 已解锁词汇
- POST /api/me/attempts/start           { levelId } → 返回 attemptId
- POST /api/me/attempts/:id/finish      { success, hintsUsed, durationMs, errorsDetected }
- PUT  /api/me/sandbox/:id              保存沙盒电路
- GET  /api/me/sandbox                  列出沙盒电路

服务器端规则（不信任前端）：
- 校验 levelId 存在于 shared 的关卡列表中，并且该关卡已解锁
- 星级用 shared 中的规则在服务器上计算
- 完成一关后自动解锁下一关，并写入该关的词汇
- 保留最佳成绩，attempts 累加（用 $inc、$max、$min 原子更新，不要先读后写）
- 「结束尝试 + 更新进度 + 解锁下一关 + 写入词汇」放在同一个事务中

前端：
- 实现 ApiProgressRepository；网络断开时把操作存入本地队列（localStorage），恢复网络后按顺序自动重放，成功后清除队列
- 未登录也可以「Jouer en invité」：使用 LocalProgressRepository，关卡地图上提示进度不会被保存
- 登录后如果本地有访客进度，询问老师（不是孩子）是否合并到当前学生账号
- 孩子永远看不到技术错误信息，只显示 Zap 的一句话：« Oups, je n'arrive pas à sauvegarder. On réessaie plus tard ! »
```

### Prompt 13 · 前端：孩子登录界面与成人后台

```
前端新增以下页面。孩子界面保持原来的游戏风格；成人后台用简洁专业的风格，路由懒加载，二者明显区分。

孩子：
- 登录流程：小组码屏幕键盘 → 头像网格 → 图片密码（每个图案点按时 Zap 读出名称）
- 头像网格根据屏幕宽度自动调整列数，compact 下每行 3 个
- 图片密码 3×3 网格在手机上占满可用高度，图案 ≥ 72px；小组码键盘在手机上分两行
- 关卡地图显示自己的头像和名字，右上角 « Au revoir » 退出按钮
- 「Ma collection」页面：已解锁的词汇卡片（可点按收听发音）

成人后台（/admin，路由守卫按角色）：
- 登录、接受邀请设置密码、重置密码
- 我的小组列表 → 小组详情：学生列表、添加/批量添加学生、打印「登录卡片」
  （每个学生一张：头像、名字、小组码；图片密码另外单独显示给老师）
- 设备固定按钮
- 家长邀请链接的生成与复制
- 学生详情：导出数据、删除学生（二次确认）、重置图片密码
- admin 额外页面：所有用户、角色管理、审计日志查看
- 后台在手机上导航改为底部标签栏，表格在窄屏上改为卡片

所有后台文字使用法语。
```

### Prompt 14 · 进度看板

```
为 encadrant 和 parent 实现进度看板：

encadrant 的小组看板：
- 表格：行 = 学生，列 = 关卡，单元格显示星级（未开始/进行中/1–3 星），颜色直观；
  手机上改为「每个学生一张卡片」，展开后显示各关星级
- 每个关卡的统计：完成率、平均尝试次数、平均提示数
- 「常见困难」：汇总 levelattempts.errorsDetected，例如 « 7 élèves ont fait un court-circuit au niveau 7 »，
  帮助老师知道下节课该重点讲什么
- 最近 7 天活跃的学生数

学生详情页：
- 时间轴：最近的尝试记录
- 已掌握的概念：circuit fermé、interrupteur、conducteur/isolant、série、dérivation、court-circuit、moteur、polarité
- 沙盒作品缩略图

parent 看板：只显示自己孩子的信息，语气更通俗，不和其他孩子比较。以手机为首要设计目标（家长大多用手机查看）。

图表使用 recharts + ResponsiveContainer，手机上隐藏次要图例。
看板接口用 MongoDB 聚合管道（$match → $group → $project）在服务器端计算，不在前端拉取原始数据。
用 explain() 确认这些聚合查询命中了索引。
```

---

## 第四阶段 · 完善功能

### Prompt 15 · 自由工坊（沙盒）

```
实现「Atelier libre」模式：
- 所有已在关卡中解锁的元件都可以使用，数量不限
- 依然有实时模拟、电流动画和短路警告
- Zap 偶尔给出好奇心提示，例如 « Et si tu ajoutais une deuxième pile ? »
- 作品通过 ProgressRepository 保存和打开（登录时存到服务器，访客存本地）
- 「Prendre une photo」按钮：把当前电路导出为 PNG（给家长看），同时生成缩略图随作品保存
- 「Tout effacer」按钮需要二次确认（大的「Oui / Non」对话框）
- 三种布局下都可用
```

### Prompt 16 · 移动端性能与反馈

```
性能目标：入门级 Android 平板和旧款 iPad 上稳定 60fps。
- 检查并修复所有拖拽、动画中的不必要 React 重渲染
- 低性能模式：检测 prefers-reduced-motion 或帧率持续低于 40fps 时，减少电流小点数量和光晕效果
- 图片资源全部用 SVG；首屏 JS 包控制在 300KB（gzip）以内，关卡数据和成人后台按路由懒加载
- 输出一份构建产物大小报告

震动反馈：支持 navigator.vibrate 的设备上，成功完成关卡时轻震一下，短路时两次短震。

家长设置页面（用简单问题保护，例如「3 × 7 = ?」）：
重置本地进度、调整语速、开关声音、开关震动、开关低性能模式。
```

### Prompt 17 · PWA

```
用 vite-plugin-pwa 把前端做成 PWA：
- manifest：name « Les Circuits de Zap »，display: fullscreen（回退 standalone），orientation: landscape，
  各尺寸图标（包括 iOS apple-touch-icon 和 maskable 图标）
- 缓存策略：应用外壳、字体、关卡数据、音频预缓存；/api 请求 network-first，认证相关接口不缓存
- 离线时已加载的关卡可以照常游玩，进度进入同步队列
- 新版本可用时只在关卡地图页面（不在游戏中途）提示刷新
- 成人后台加一个「Installer sur cette tablette」说明页，分别给出 iPad 和 Android 的添加到主屏幕步骤
- 设备固定：确保在 PWA 独立模式下也能保存。iOS 上 PWA 和 Safari 的存储是隔离的，
  需要在 PWA 内重新固定一次，在说明页上写明这一点
```

### Prompt 18 · 儿童可用性审查与打磨

```
以一个 8 岁孩子的视角审查整个应用，在电脑、平板、手机三种布局下逐一检查并修复：
- 所有可点按元素 ≥ 48px（compact 下 ≥ 56px），端子吸附半径足够大
- 每个画面可见按钮不超过 5 个
- 所有面向孩子的文本都来自 fr.ts，句子不超过 12 个词，检查法语拼写与语法
- 界面上没有任何英文
- 没有任何操作依赖 hover、双击、右键或键盘
- 动画不能过快或闪烁，短路闪烁频率低于 3 次/秒
- 没有横向滚动条，没有被 safe area 遮挡的按钮
- 拖拽松开在无效区域时元件平滑回到面板，不报错
运行全部测试并确保构建无警告。
```

### Prompt 19 · 多端自动化测试

```
1. 用 Playwright 配置以下项目：Desktop Chrome、Desktop Safari、iPad (gen 7) 横屏与竖屏、
   Galaxy Tab S4、iPhone 13 横屏、Pixel 7 横屏。测试使用独立的测试数据库。
2. 端到端用例：
   - 老师登录 → 创建小组 → 添加学生 → 固定设备
   - 孩子登录（头像 + 图片密码）→ 用触控拖放和点按连线完成第 1 关 → 看到星星
   - 断网完成一关 → 恢复网络 → 服务器上出现进度
   - 家长在手机上登录 → 看到孩子的进度
   - 权限：encadrant B 无法访问 encadrant A 的学生页面
3. 截图对比测试：每种布局（large / medium 横竖屏 / compact）下的关卡界面和关卡地图
4. 生成 TESTING.md（法语），列出需要在真机上手动确认的项目：
   iPad Safari 语音解锁、Android 平板拖放流畅度、手机旋转提示、PWA 安装与离线游玩、断网后进度补同步。
```

---

## 第五阶段 · 部署

### Prompt 20 · Docker 部署（Oracle Cloud · aarch64）

```
为生产环境准备部署。目标服务器是 Oracle Cloud（OCI）Ampere A1 实例，CPU 架构 aarch64（linux/arm64），Ubuntu 系统，
宿主机上已运行 Caddy 作为反向代理（不要放进 compose）。

1. 架构兼容性（先做）：
   - 列出项目中所有原生依赖（argon2 等）和所有 Docker 镜像，逐一确认有 linux/arm64 版本，结果写进 README
   - api 镜像基于 node:20-bookworm-slim（不用 alpine），多阶段构建，pnpm install 在目标架构上执行，
     不要把开发机上的 node_modules 复制进镜像
   - Dockerfile 不写死 --platform；默认直接在服务器上原生构建（docker compose build）。
     另提供 scripts/build-arm64.sh，用 docker buildx build --platform linux/arm64 在 x86 开发机上交叉构建，
     并说明这种方式较慢（QEMU 模拟），只作备选
   - 构建完成后在容器内执行 uname -m 和一次 argon2 哈希，作为冒烟测试

2. docker-compose.yml：
   - mongo:7（官方镜像提供 arm64，Ampere A1 满足其 ARMv8.2-A 要求），数据卷持久化，不对外暴露端口
   - 以单节点副本集方式启动（--replSet rs0），用一次性 init 服务或启动脚本执行 rs.initiate()，脚本可重复执行（已初始化时跳过）
   - 开启认证：root 账号只用于初始化，另建一个只对应用数据库有 readWrite 权限的用户给 api 使用
   - 设置 WiredTiger cache 上限（例如 --wiredTigerCacheSizeGB 0.5）和容器内存限制，
     因为这台服务器上还运行着其他服务
   - api：非 root 用户运行，只监听 127.0.0.1:3100；启动时执行 migrate-mongo up 和 syncIndexes
   - web：构建静态文件输出到宿主机目录（例如 /srv/circuits/web），由 Caddy 直接托管
   - 所有服务设置 restart: unless-stopped
   - 所有密钥从 .env 读取，提供 .env.example，不提交真实 .env

3. 网络与 Oracle Cloud 注意事项（写进 README）：
   - 不需要在 OCI 安全列表或主机防火墙中开放任何新端口：mongo 不暴露，api 只绑定 127.0.0.1，
     对外仍只走 Caddy 已使用的 80/443
   - 提醒：Oracle 的 Ubuntu 镜像默认带有 iptables 规则，Docker 修改 iptables 时要确认没有意外把
     容器端口暴露到公网；用 ss -tlnp 和从外部 nmap 各检查一次

4. Caddyfile 示例：静态文件托管 + /api/* 反向代理到 127.0.0.1:3100；SPA 路由回退到 index.html；
   service worker 文件禁止长缓存；安全响应头（CSP 只允许同源，无第三方脚本）

5. 备份：scripts/backup.sh 用 mongodump --archive --gzip 每天备份，保留 14 天，可加入 cron；
   备份目录可配置（我会指向用 rclone 挂载的 NAS 路径）。脚本在备份目录不可写时（例如挂载断开）要报错退出，
   而不是写进本地磁盘。另提供 scripts/restore.sh（mongorestore --drop），README 中写恢复演练步骤

6. 健康检查：api 和 mongo 都配置 healthcheck（mongo 用 mongosh --eval "db.adminCommand('ping')"），
   api 在 mongo 健康且副本集已初始化后再启动

7. README（法语）：首次部署、版本更新（git pull + docker compose up -d --build）、创建 admin、
   备份与恢复、arm64 兼容性清单、新增关卡（只修改 packages/shared/levels/ 中的数据）、替换为录制好的 MP3 解说

Playwright 端到端测试在开发机上运行，不在生产服务器上运行。
构建完成后在服务器上完整跑一遍：老师登录 → 添加学生 → 孩子玩一关 → 看板上出现进度。
```

---

## 附录

### 开发建议

- 每完成一条 prompt，先在浏览器里试玩，确认没问题再进入下一条。
- Prompt 3 完成后就拿平板给孩子试手感。如果误触多，优先调大吸附半径和「点按/拖动」判定阈值。
- Prompt 10 完成后让孩子亲手试一次登录流程，这是孩子遇到的第一道门槛。
- 上线前用两个不同的 encadrant 账号互相测试，确认看不到对方的学生。
- 图片密码对 8 岁孩子足够安全（数据敏感度低，且有锁定机制），不要改成文字密码。
- 如果以后要在学校正式使用，可以让 Claude Code 根据代码生成一份 « Politique de confidentialité » 草稿，再请专业人士审核。

### 后续章节方向

- 第二章「Les capteurs」：按钮、光敏电阻（白天/夜晚自动亮灯）、简单的「如果……就……」逻辑
- 第三章「Mon premier robot」：两个马达 + 开关控制左转右转，在小地图上让机器人移动
- 第四章：用拖拽积木（类似 Scratch）给机器人编程，衔接 Eurobot Junior 这类比赛
