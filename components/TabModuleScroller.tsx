import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

type TabKey = 'A' | 'B' | 'C';

const TABS: TabKey[] = ['A', 'B', 'C'];

const SECTION_TITLES: Record<TabKey, string> = {
  A: 'A模块',
  B: 'B模块',
  C: 'C模块',
};

export default function TabModuleScroller() {
  const { height } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Record<TabKey, number>>({
    A: 0,
    B: 0,
    C: 0,
  });
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
    scrollViewRef.current?.scrollTo({
      y: sectionOffsetsRef.current[tab],
      animated: true,
    });
  };

  return (
    <View style={styles.container}>
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
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: height * 0.45 }]}
        showsVerticalScrollIndicator={false}
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
              <Text style={styles.placeholderText}>{section.title} 内容示例</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingTop: 48,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 2,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff',
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
