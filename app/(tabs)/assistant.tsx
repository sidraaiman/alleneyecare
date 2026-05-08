import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAI, DisplayMessage } from '@/context/AIContext';
import { Colors } from '@/constants/Colors';

const QUICK_ACTIONS: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Find glasses for my face shape', icon: 'glasses-outline' },
  { label: 'Explain lens types', icon: 'eye-outline' },
  { label: 'Help me read my prescription', icon: 'document-text-outline' },
  { label: 'Track my order', icon: 'cube-outline' },
  { label: 'Eye care tips', icon: 'leaf-outline' },
  { label: 'Show best sellers', icon: 'star-outline' },
];

function MessageBubble({ item }: { item: DisplayMessage }) {
  const isUser = item.role === 'user';

  return (
    <Animated.View
      entering={FadeInDown.duration(250).springify()}
      style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}
    >
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="glasses-outline" size={14} color={Colors.gold} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.aiBubbleText]}>
          {item.content}
        </Text>
      </View>
    </Animated.View>
  );
}

function TypingIndicator() {
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={[styles.row, styles.rowLeft]}>
      <View style={styles.aiAvatar}>
        <Ionicons name="glasses-outline" size={14} color={Colors.gold} />
      </View>
      <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
        <ActivityIndicator size="small" color={Colors.gold} />
        <Text style={styles.typingText}>Thinking…</Text>
      </View>
    </Animated.View>
  );
}

export default function AssistantScreen() {
  const { messages, isLoading, sendMessage, clearChat } = useAI();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text);
  };

  const showQuickActions = messages.length <= 1 && !isLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Ionicons name="glasses-outline" size={20} color={Colors.gold} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Always available</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={clearChat}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          style={styles.clearBtn}
        >
          <Ionicons name="refresh-outline" size={20} color={Colors.goldLight} />
        </TouchableOpacity>
      </View>

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MessageBubble item={item} />}
        contentContainerStyle={styles.messageList}
        ListFooterComponent={isLoading ? <TypingIndicator /> : null}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {/* Quick actions — shown only on fresh chat */}
      {showQuickActions && (
        <Animated.View entering={FadeIn.duration(500)} style={styles.quickSection}>
          <Text style={styles.quickLabel}>Try asking:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.label}
                style={styles.chip}
                onPress={() => sendMessage(action.label)}
                activeOpacity={0.7}
              >
                <Ionicons name={action.icon} size={13} color={Colors.navy} style={styles.chipIcon} />
                <Text style={styles.chipText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about eyewear, lenses, prescriptions…"
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={17} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pageBg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.navy,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.navyLight,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 20,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  statusText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.goldLight,
  },
  clearBtn: {
    padding: 4,
  },

  // Messages
  messageList: {
    padding: 16,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.navyLight,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: Colors.navy,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  userBubbleText: {
    color: Colors.white,
  },
  aiBubbleText: {
    color: Colors.textPrimary,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  typingText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },

  // Quick actions
  quickSection: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  chipRow: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.goldLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.navy,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 14,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.pageBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
});
