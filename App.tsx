import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

/** 按当前窗口宽度换算 rpx → dp（750 设计稿，与常见小程序 rpx 一致） */
const rpxToDp = (rpx: number, windowWidth: number) => (rpx / 750) * windowWidth;

/** 进入页面时，红色可拖区域距顶部的屏高比例（20%） */
const INITIAL_RED_TOP_OFFSET_RATIO = 0.2;
/** 向下拖动时，红色可视区域高度小于等于该阈值后禁止继续拖 */
const MIN_VISIBLE_RED_HEIGHT_RPX = 100;
const DRAG_EDGE_EPSILON = 0.5;
/** 手势响应系数：>1 会减轻“阻尼感”，让拖拽更跟手 */
const DRAG_RESPONSE_FACTOR = 1.2;

function getStableWindowHeight(fallbackFromHook: number): number {
  if (fallbackFromHook > 0) return fallbackFromHook;
  const w = Dimensions.get('window').height;
  if (w > 0) return w;
  const s = Dimensions.get('screen').height;
  if (s > 0) return s;
  return 667;
}

export default function App() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const safeHeight = getStableWindowHeight(windowHeight);
  /** 根容器实测高度，与 Dimensions 对齐，避免底边与父布局不一致出现橙色条 */
  const [rootLayoutHeight, setRootLayoutHeight] = useState(0);
  const [debugVisibleRedHeightRpx, setDebugVisibleRedHeightRpx] = useState(0);
  const latestVisibleRedHeightRpxRef = useRef(0);
  const layoutHeight = rootLayoutHeight > 0 ? rootLayoutHeight : safeHeight;

  /** 进入页：红色层本身全屏，通过 translateY 下移到距顶部 20% */
  const initialTopFromScreenTopPx = layoutHeight * INITIAL_RED_TOP_OFFSET_RATIO;
  /** translateY 最小值：红色区域顶部贴到屏幕顶部 */
  const minTranslateY = 0;

  /**
   * translateY 最大值：向下拖到“红色可视高度 = 100rpx”时停止
   * - sheet 顶部固定为 0，所以 top = translateY
   * - 可视高度(px) = layoutHeight - top
   */
  const minVisibleRedHeightDp = rpxToDp(MIN_VISIBLE_RED_HEIGHT_RPX, windowWidth);
  const maxTranslateY = Math.max(minTranslateY, layoutHeight - minVisibleRedHeightDp);

  const translateY = useRef(new Animated.Value(initialTopFromScreenTopPx)).current;
  const translateYRef = useRef(initialTopFromScreenTopPx);
  const lastGestureDy = useRef(0);
  const hasInitializedOffsetRef = useRef(false);
  const scrollYRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);

  useEffect(() => {
    if (layoutHeight <= 0) return;
    if (hasInitializedOffsetRef.current) return;
    hasInitializedOffsetRef.current = true;
    translateYRef.current = initialTopFromScreenTopPx;
    translateY.setValue(initialTopFromScreenTopPx);
    const initialVisibleHeightRpx =
      windowWidth > 0
        ? Math.max(
            0,
            Math.round(((layoutHeight - initialTopFromScreenTopPx) / windowWidth) * 750),
          )
        : 0;
    setDebugVisibleRedHeightRpx(initialVisibleHeightRpx);
    latestVisibleRedHeightRpxRef.current = initialVisibleHeightRpx;
  }, [initialTopFromScreenTopPx, layoutHeight, translateY, windowWidth]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // ScrollView / Text 会抢先成为响应者，在捕获阶段由本层接手（勿再加 moveCapture，部分机型会锁死手势）
        onStartShouldSetPanResponderCapture: () => true,
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          lastGestureDy.current = 0;
        },
        onPanResponderMove: (_, g) => {
          const rawDelta = g.dy - lastGestureDy.current;
          lastGestureDy.current = g.dy;
          const delta = rawDelta * DRAG_RESPONSE_FACTOR;

          const maxScroll = Math.max(0, contentHeightRef.current - viewportHeightRef.current);
          const atTopEdge = translateYRef.current <= minTranslateY + DRAG_EDGE_EPSILON;
          // 红色区域已经贴顶时，继续上滑应滚动内容，而不是再移动红色区域。
          if (delta < 0 && atTopEdge && maxScroll > 0) {
            const nextScroll = Math.min(maxScroll, Math.max(0, scrollYRef.current - delta));
            scrollYRef.current = nextScroll;
            scrollViewRef.current?.scrollTo({ y: nextScroll, animated: false });
            return;
          }
          // 内容已滚动过时，向下滑应先把内容滚回顶部，再把剩余位移交给红色区域下拉。
          if (delta > 0 && scrollYRef.current > 0) {
            const prevScroll = scrollYRef.current;
            const nextScroll = Math.max(0, prevScroll - delta);
            scrollYRef.current = nextScroll;
            scrollViewRef.current?.scrollTo({ y: nextScroll, animated: false });
            if (nextScroll > 0) {
              return;
            }
            // 本次手势还有剩余位移，继续用于拖拽红色区域。
            const remainingDelta = delta - prevScroll;
            let nextY = translateYRef.current + remainingDelta;
            nextY = Math.min(maxTranslateY, Math.max(minTranslateY, nextY));

            translateYRef.current = nextY;
            translateY.setValue(nextY);
            const nextTopPx = nextY;
            const visibleHeightPx = layoutHeight - Math.max(0, nextTopPx);
            const nextVisibleHeightRpx =
              windowWidth > 0
                ? Math.max(0, Math.round((visibleHeightPx / windowWidth) * 750))
                : 0;
            latestVisibleRedHeightRpxRef.current = nextVisibleHeightRpx;
            return;
          }

          let nextY = translateYRef.current + delta;
          // 只靠 clamp 做边界控制：向上可回弹，向下最多拖到可视高度 100rpx。
          nextY = Math.min(maxTranslateY, Math.max(minTranslateY, nextY));

          translateYRef.current = nextY;
          translateY.setValue(nextY);
          // 计算“红色可视区域高度 rpx”（用于校验是否在 100rpx 处停止继续下拉）
          const nextTopPx = nextY;
          const visibleHeightPx = layoutHeight - Math.max(0, nextTopPx);
          const nextVisibleHeightRpx =
            windowWidth > 0 ? Math.max(0, Math.round((visibleHeightPx / windowWidth) * 750)) : 0;
          latestVisibleRedHeightRpxRef.current = nextVisibleHeightRpx;
        },
        onPanResponderRelease: () => {
          lastGestureDy.current = 0;
          setDebugVisibleRedHeightRpx(latestVisibleRedHeightRpxRef.current);
        },
        onPanResponderTerminate: () => {
          lastGestureDy.current = 0;
          setDebugVisibleRedHeightRpx(latestVisibleRedHeightRpxRef.current);
        },
      }),
    [translateY, maxTranslateY, minTranslateY],
  );

  return (
    <View
      style={styles.root}
      onLayout={(e) => setRootLayoutHeight(e.nativeEvent.layout.height)}
    >
      <Animated.View
        style={[
          styles.sheet,
          { top: 0 },
          { transform: [{ translateY }] },
        ]}
      >
        {/* 手势挂在非 Animated 的 View 上，避免 Android 上 transform 与触摸冲突；collapsable=false 防止子树被优化掉导致不响应 */}
        <View
          style={StyleSheet.absoluteFillObject}
          collapsable={false}
          {...panResponder.panHandlers}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            scrollEnabled={false}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
            bounces={false}
            onLayout={(e) => {
              viewportHeightRef.current = e.nativeEvent.layout.height;
            }}
            onContentSizeChange={(_, h) => {
              contentHeightRef.current = h;
            }}
          >
            {Array.from({ length: 48 }, (_, i) => (
              <Text key={i} style={styles.line}>
                条目 {i + 1}
              </Text>
            ))}
          </ScrollView>
          <View pointerEvents="none" style={styles.debugBadge}>
            <Text style={styles.debugText}>
              红色可视高度: {debugVisibleRedHeightRpx}rpx / {MIN_VISIBLE_RED_HEIGHT_RPX}rpx
            </Text>
          </View>
        </View>
      </Animated.View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fb923c',
    overflow: 'hidden',
  },
  /** 顶边由 top 留白，底边贴 root 底，可拖区域纵向占满剩余屏高 */
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#dc2626',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#dc2626',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 16,
  },
  line: {
    fontSize: 15,
    lineHeight: 24,
    color: '#fef2f2',
    marginBottom: 10,
  },
  debugBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  debugText: {
    fontSize: 12,
    color: '#fff',
  },
});
