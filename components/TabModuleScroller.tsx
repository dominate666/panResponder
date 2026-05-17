import { useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import PagerView from 'react-native-pager-view';

type ModuleKey = '1' | '2';
type TabKey = 'A' | 'B' | 'C';

const MODULES: ModuleKey[] = ['1', '2'];
const MODULE_TITLES: Record<ModuleKey, string> = {
  '1': '模块一',
  '2': '模块二',
};

const TABS: TabKey[] = ['A', 'B', 'C'];

const SECTION_TITLES: Record<TabKey, string> = {
  A: 'A模块',
  B: 'B模块',
  C: 'C模块',
};

export default function TabModuleScroller() {
  const { width } = useWindowDimensions();
  const bigModuleWidth = width - 32;
  const pagerRef = useRef<PagerView>(null);
  const innerScrollRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Record<TabKey, number>>({
    A: 0,
    B: 0,
    C: 0,
  });
  const [activeModule, setActiveModule] = useState<ModuleKey>('1');
  const [activeTab, setActiveTab] = useState<TabKey>('A');

  const sectionBlocks = useMemo(
    () =>
      TABS.map((tab) => ({
        key: tab,
        title: SECTION_TITLES[tab],
        desc: `这是${SECTION_TITLES[tab]}的内容区域，可以放列表、卡片或任何业务组件。`,
      })),
    [],
  );

  const scrollToSection = (tab: TabKey) => {
    setActiveTab(tab);
    innerScrollRef.current?.scrollTo({
      y: sectionOffsetsRef.current[tab],
      animated: true,
    });
  };

  const scrollToModule = (module: ModuleKey) => {
    const index = MODULES.indexOf(module);
    if (index < 0) {
      return;
    }

    pagerRef.current?.setPage(index);
    setActiveModule(module);
  };

  const handlePageSelected = (position: number) => {
    const module = MODULES[position];
    if (module) {
      setActiveModule(module);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.moduleTabRow}>
        {MODULES.map((module) => {
          const isActive = activeModule === module;
          return (
            <TouchableOpacity
              key={module}
              style={[styles.moduleTabButton, isActive && styles.moduleTabButtonActive]}
              activeOpacity={0.85}
              onPress={() => scrollToModule(module)}
            >
              <Text style={[styles.moduleTabText, isActive && styles.moduleTabTextActive]}>
                {MODULE_TITLES[module]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        overdrag
        onPageSelected={(e) => handlePageSelected(e.nativeEvent.position)}
      >
        <View key="module-1" style={styles.modulePage}>
          <View
            style={[
              styles.bigModule,
              styles.bigModuleFill,
              { width: bigModuleWidth },
              activeModule === '1' && styles.bigModuleActive,
            ]}
          >
            <Text style={styles.bigModuleTitle}>模块一11111</Text>
            <View style={styles.tabRow}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                    activeOpacity={0.85}
                    onPress={() => scrollToSection(tab)}
                  >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView
              ref={innerScrollRef}
              style={styles.innerScrollView}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {sectionBlocks.map((section) => (
                <View
                  key={section.key}
                  style={styles.sectionCard}
                  onLayout={(e) => {
                    sectionOffsetsRef.current[section.key] = e.nativeEvent.layout.y;
                  }}
                >
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionDesc}>{section.desc}</Text>
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>{section.title} 内容示例22</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        <View key="module-2" style={styles.modulePage}>
          <View
            style={[
              styles.bigModule,
              styles.bigModuleFill,
              { width: bigModuleWidth },
              activeModule === '2' && styles.bigModuleActive,
            ]}
          >
            <Text style={styles.bigModuleTitle}>模块二</Text>
            <Text style={styles.bigModuleDesc}>
              这是第二个大模块，与模块一11同级，可放置其他业务内容。
            </Text>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>模块二 内容示例</Text>
            </View>
          </View>
        </View>
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingTop: 48,
  },
  moduleTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  moduleTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  moduleTabButtonActive: {
    backgroundColor: '#2563eb',
  },
  moduleTabText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  moduleTabTextActive: {
    color: '#ffffff',
  },
  pager: {
    flex: 1,
  },
  modulePage: {
    flex: 1,
    paddingBottom: 32,
    alignItems: 'center',
  },
  bigModule: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bigModuleFill: {
    flex: 1,
    minHeight: 0,
  },
  bigModuleActive: {
    borderColor: '#2563eb',
  },
  bigModuleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  bigModuleDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  innerScrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingTop: 2,
  },
  sectionCard: {
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  sectionDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
  },
  placeholder: {
    marginTop: 14,
    height: 260,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#1e3a8a',
    fontWeight: '600',
  },
});
