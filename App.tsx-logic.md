# `App.tsx` 代码逻辑与属性说明

本文档用于解释 `App.tsx` 当前实现的交互逻辑、核心状态与属性含义，以及手势和内容滚动之间的协同机制。

## 1. 页面目标与交互设计

当前页面实现的是一个“红色可拖拽面板 + 内部列表”的混合交互：

- 红色面板本体占满全屏（绝对定位，`top: 0`, `bottom: 0`）。
- 进入页面时，面板通过 `translateY` 下移到“距离顶部 20%”的位置。
- 向上拖动：
  - 先让红色面板向上移动，直到面板顶部贴到屏幕顶部。
  - 面板到顶后，继续上滑会转交给内部 `ScrollView`，滚动显示更多内容。
- 向下拖动：
  - 如果列表内容已经滚动过（`scrollY > 0`），优先先把内容回滚到顶部（显示第一条内容）。
  - 内容回到顶部后，剩余手势位移才会继续用于下拉红色面板。
- 面板下拉有下限：红色可视区域高度最低到 `100rpx` 时，禁止继续下拉。

这套逻辑保证了“拖拽层”和“内容滚动”不会打架，手势分配符合直觉。

---

## 2. 常量与工具函数

### `rpxToDp(rpx, windowWidth)`

- 作用：把设计稿单位 `rpx` 按当前屏宽换算为 React Native 的 `dp/px`。
- 公式：`(rpx / 750) * windowWidth`
- 目的：让 `100rpx` 这种阈值在不同设备宽度下保持一致视觉比例。

### `INITIAL_RED_TOP_OFFSET_RATIO = 0.2`

- 含义：初始化时红色面板距离顶部是屏高的 `20%`。
- 实现方式：通过 `translateY = layoutHeight * 0.2` 初始位移实现。

### `MIN_VISIBLE_RED_HEIGHT_RPX = 100`

- 含义：红色区域最少保留 `100rpx` 可视高度。
- 用于计算向下拖拽的最大位移边界（即面板能被拖到多低）。

### `DRAG_EDGE_EPSILON = 0.5`

- 含义：顶边判定容差，避免浮点数误差导致“看起来到顶但逻辑不认顶”。

### `getStableWindowHeight(fallbackFromHook)`

- 作用：给页面高度提供稳定值。
- 优先级：
  1. `useWindowDimensions().height`
  2. `Dimensions.get('window').height`
  3. `Dimensions.get('screen').height`
  4. 默认 `667`
- 目的：避免偶发场景下窗口高度为 0 导致边界计算异常。

---

## 3. 核心状态与 Ref

## React State

- `rootLayoutHeight`
  - 根容器真实高度（来自 `onLayout`），用于精确边界计算。
- `debugVisibleRedHeightRpx`
  - 右上角调试文本显示的“红色可视高度（rpx）”。

## Animated / 手势相关 Ref

- `translateY` (`Animated.Value`)
  - 红色面板的实时位移（视觉表现）。
- `translateYRef`
  - 与 `translateY` 同步的数值缓存，避免每帧读取 Animated 值的复杂性。
- `lastGestureDy`
  - 上一帧手势 `dy`，用于计算增量 `delta = currentDy - lastDy`。
- `hasInitializedOffsetRef`
  - 只在首次布局完成时设置初始位移，避免重复初始化。

## Scroll 协同相关 Ref

- `scrollYRef`
  - 当前列表滚动位置（手动维护）。
- `scrollViewRef`
  - 调用 `scrollTo` 的引用。
- `contentHeightRef`
  - 内容总高度（来自 `onContentSizeChange`）。
- `viewportHeightRef`
  - 视口高度（来自 `onLayout`）。
- `maxScroll = max(0, contentHeight - viewportHeight)`
  - 当前可滚动的最大距离。

## 调试节流 Ref

- `debugPendingRpxRef`
  - 当前帧待提交的调试值。
- `debugRafRef`
  - 用 `requestAnimationFrame` 合并状态更新，减少每帧 setState 抖动。

---

## 4. 边界计算

### 布局高度

- `layoutHeight = rootLayoutHeight > 0 ? rootLayoutHeight : safeHeight`

### 初始位移

- `initialTopFromScreenTopPx = layoutHeight * 0.2`

### 上边界（最小位移）

- `minTranslateY = 0`
- 含义：红色面板最多上移到顶部贴齐（不能再往上）。

### 下边界（最大位移）

- `minVisibleRedHeightDp = rpxToDp(100, windowWidth)`
- `maxTranslateY = max(minTranslateY, layoutHeight - minVisibleRedHeightDp)`
- 含义：下拉到只剩 100rpx 可视高度时停止继续下拉。

---

## 5. 初始化流程（`useEffect`）

首次拿到有效布局后：

1. 设置 `translateYRef` 与 `translateY` 到初始偏移 `initialTopFromScreenTopPx`。
2. 计算初始可视高度并写入 `debugVisibleRedHeightRpx`。
3. `hasInitializedOffsetRef` 置为 `true`，防止重复初始化导致“跳动”。

---

## 6. PanResponder 手势分发策略

`onPanResponderMove` 的核心是先算增量 `delta`，再按优先级分配给“内容滚动”或“面板拖拽”。

### A. 面板到顶且继续上滑：优先滚动内容

条件：

- `delta < 0`（手指上滑）
- 面板在顶部边缘：`translateYRef.current <= minTranslateY + DRAG_EDGE_EPSILON`
- 内容可滚动：`maxScroll > 0`

行为：

- 更新 `scrollYRef`
- 执行 `scrollViewRef.current?.scrollTo(...)`
- `return`（本次手势不再改面板位移）

### B. 内容已滚动且向下滑：先回滚内容

条件：

- `delta > 0`
- `scrollYRef.current > 0`

行为：

1. 先把内容往回滚到顶部。
2. 若还没回到顶部：直接 `return`。
3. 若本次手势有剩余位移：把剩余位移用于拖拽面板（连续手感）。

### C. 其他情况：拖拽面板

- `nextY = clamp(translateYRef.current + delta, minTranslateY, maxTranslateY)`
- 更新 `translateYRef` 和 `translateY`
- 计算可视高度并更新调试显示

---

## 7. 关键组件属性解释

## 根容器 `View`（`styles.root`）

- `flex: 1`：占满屏幕。
- `overflow: 'hidden'`：超出边界内容裁切，避免拖拽时视觉溢出。
- `onLayout`：记录根容器真实高度用于精确计算。

## 红色面板 `Animated.View`（`styles.sheet`）

- `position: 'absolute'`, `left: 0`, `right: 0`, `bottom: 0`, `top: 0`
  - 面板本体占满全屏。
- `transform: [{ translateY }]`
  - 通过位移实现初始偏移与拖拽效果。

## 手势承载层 `View`

- `style={StyleSheet.absoluteFillObject}`：覆盖整个面板区域。
- `collapsable={false}`：避免 Android 优化掉导致触摸不稳定。
- `...panResponder.panHandlers`：挂载手势响应。

## `ScrollView`

- `scrollEnabled={false}`
  - 关闭系统原生滚动，改为由手势逻辑统一驱动 `scrollTo`。
- `overScrollMode="never"`（Android）和 `bounces={false}`（iOS）
  - 关闭回弹，减少冲突和误差。
- `onLayout`
  - 记录可视高度（viewport）。
- `onContentSizeChange`
  - 记录内容总高度（content）。

## 调试角标 `debugBadge`

- 固定在右上角，`pointerEvents="none"` 不拦截触摸。
- 实时显示“红色可视高度 rpx / 100rpx 阈值”。

---

## 8. 当前行为总结（用户视角）

- 初始：红色面板显示在距顶部 20% 位置。
- 上滑：
  - 先推面板到顶；
  - 到顶后继续上滑，列表开始向下阅读（内容滚动）。
- 下滑：
  - 先把列表滚回第一条；
  - 回到第一条后，才开始下拉红色面板。
- 下拉到底：红色可视高度达到 100rpx 时停止继续下拉。

---

## 9. 可调参数建议

如果要微调手感，优先调整这三个常量：

- `INITIAL_RED_TOP_OFFSET_RATIO`
  - 控制初始展示高度（例如 0.2 -> 0.3 表示初始露出更少）。
- `MIN_VISIBLE_RED_HEIGHT_RPX`
  - 控制下拉最底保留高度（例如 100 -> 140 更“收不下去”）。
- `DRAG_EDGE_EPSILON`
  - 控制“到顶判断”灵敏度（一般保持 0.5 即可）。

---

## 10. 后续优化方向（可选）

- 把手势状态机抽成 `useDraggableSheet` 自定义 Hook，降低 `App.tsx` 复杂度。
- 对 `delta` 做速度/阻尼处理，提升惯性感受。
- 在 release 时关闭调试角标（可用 `__DEV__` 包裹）。

