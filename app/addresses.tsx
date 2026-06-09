import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import {
  Address, AddressInput, loadAddresses, addAddress, updateAddress, removeAddress,
  setDefaultAddress, formatAddress, isComplete,
} from '../lib/addresses';

const FIELDS: { label: string; key: keyof AddressInput; keyboard: 'default' | 'phone-pad' | 'number-pad' }[] = [
  { label: 'Full Name', key: 'name', keyboard: 'default' },
  { label: 'Phone Number', key: 'phone', keyboard: 'phone-pad' },
  { label: 'Flat / House No.', key: 'flat', keyboard: 'default' },
  { label: 'Street / Area', key: 'street', keyboard: 'default' },
  { label: 'City', key: 'city', keyboard: 'default' },
  { label: 'State', key: 'state', keyboard: 'default' },
  { label: 'PIN Code', key: 'pin', keyboard: 'number-pad' },
];

const EMPTY: AddressInput = { name: '', phone: '', flat: '', street: '', city: '', state: '', pin: '' };

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    loadAddresses(user?.id).then(list => { setAddresses(list); setLoading(false); });
  }, [user?.id]);

  useEffect(() => { reload(); }, [reload]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY); setModalVisible(true); };
  const openEdit = (a: Address) => {
    setEditingId(a.id);
    setForm({ name: a.name, phone: a.phone, flat: a.flat, street: a.street, city: a.city, state: a.state, pin: a.pin });
    setModalVisible(true);
  };

  async function save() {
    if (!isComplete(form)) { Alert.alert('Incomplete address', 'Please fill in all fields.'); return; }
    setSaving(true);
    try {
      const next = editingId
        ? await updateAddress(user?.id, editingId, form)
        : await addAddress(user?.id, form);
      setAddresses(next);
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(a: Address) {
    Alert.alert('Delete address', `Remove ${a.name}'s address?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => setAddresses(await removeAddress(user?.id, a.id)) },
    ]);
  }

  async function makeDefault(a: Address) {
    setAddresses(await setDefaultAddress(user?.id, a.id));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {addresses.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="location-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No saved addresses</Text>
              <Text style={styles.emptyDesc}>Add a delivery address to speed up checkout.</Text>
            </View>
          ) : (
            addresses.map(a => (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{a.name}</Text>
                  {a.isDefault && (
                    <View style={styles.defaultBadge}><Text style={styles.defaultText}>DEFAULT</Text></View>
                  )}
                </View>
                <Text style={styles.cardPhone}>{a.phone}</Text>
                <Text style={styles.cardAddr}>{formatAddress(a)}</Text>
                <View style={styles.cardActions}>
                  {!a.isDefault && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => makeDefault(a)}>
                      <Ionicons name="star-outline" size={15} color={Colors.navy} />
                      <Text style={styles.actionText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(a)}>
                    <Ionicons name="create-outline" size={15} color={Colors.navy} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(a)}>
                    <Ionicons name="trash-outline" size={15} color={Colors.error} />
                    <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color={Colors.navy} />
          <Text style={styles.addBtnText}>Add New Address</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Address' : 'Add Address'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.navy} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {FIELDS.map(({ label, key, keyboard }) => (
                <View key={key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={form[key]}
                    onChangeText={t => setForm(prev => ({ ...prev, [key]: t }))}
                    placeholder={label}
                    placeholderTextColor={Colors.textLight}
                    keyboardType={keyboard}
                  />
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} disabled={saving} onPress={save}>
              {saving ? <ActivityIndicator color={Colors.navy} /> : <Text style={styles.saveBtnText}>Save Address</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: Colors.navy },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 24 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 20, color: Colors.navy },
  emptyDesc: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  defaultBadge: { backgroundColor: Colors.navy, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  defaultText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.gold, letterSpacing: 0.5 },
  cardPhone: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  cardAddr: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textPrimary, lineHeight: 19, marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.navy },

  bottomBar: { backgroundColor: Colors.white, paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  addBtn: {
    backgroundColor: Colors.gold, borderRadius: 10, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: Colors.navy },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  inputBox: {
    height: 48, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, backgroundColor: Colors.white,
    paddingHorizontal: 14, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.navy, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.white },
});
