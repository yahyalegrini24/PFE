import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../configuration/supabase';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../../components/Footer';

const AbsentStudents = ({ route }) => {
  const { sessionId, moduleName, groupName } = route.params;
  const [absentees, setAbsentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // Track which card is expanded
  const [justifying, setJustifying] = useState(null); // Track which student is being justified

  useEffect(() => {
    fetchAbsentees();
  }, [sessionId]);

  const fetchAbsentees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Attendance')
        .select(`
          studentMatricule,
          StudentGroup (
            matricule,
            Student (
              firstName,
              lastName
            )
          )
        `)
        .eq('sessionId', sessionId)
        .eq('presence', 0);
      if (error) throw error;
      setAbsentees(data || []);
    } catch (error) {
      setAbsentees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = (matricule) => {
    setExpanded(expanded === matricule ? null : matricule);
  };

  const handleJustify = async (studentMatricule) => {
    setJustifying(studentMatricule);
    const { error } = await supabase
      .from('Attendance')
      .update({ presence: 0.5 })
      .eq('sessionId', sessionId)
      .eq('studentMatricule', studentMatricule);
    if (!error) {
      setAbsentees(absentees.filter(a => a.studentMatricule !== studentMatricule));
      setExpanded(null);
    }
    setJustifying(null);
  };

  const renderItem = ({ item }) => {
    const isExpanded = expanded === item.studentMatricule;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleExpand(item.studentMatricule)}
        style={[
          styles.absentCard,
          isExpanded && styles.absentCardExpanded
        ]}
      >
        <Ionicons name="person-remove" size={22} color="#dc3545" />
        <View style={{ flex: 1 }}>
          <Text style={styles.absentName}>
            {item.StudentGroup?.Student?.firstName} {item.StudentGroup?.Student?.lastName}
          </Text>
          <Text style={styles.matriculeText}>
            Matricule: {item.studentMatricule}
          </Text>
          {isExpanded && (
            <TouchableOpacity
              style={styles.justifyBtn}
              onPress={() => handleJustify(item.studentMatricule)}
              disabled={justifying === item.studentMatricule}
            >
              <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
              <Text style={styles.justifyBtnText}>
                {justifying === item.studentMatricule ? 'Justifying...' : 'Justify'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Absent Students</Text>
      <Text style={styles.subHeader}>{moduleName} - {groupName}</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#006633" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={absentees}
          keyExtractor={item => item.studentMatricule}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No absentees for this session.</Text>
          }
        />
      )}
      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: 1,
  },
  subHeader: {
    fontSize: 16,
    color: '#006633',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 4,
    fontWeight: '600',
  },
  listContainer: {
    paddingVertical: 16,
  },
  absentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    transition: 'all 0.2s',
  },
  absentCardExpanded: {
    borderLeftColor: '#006633',
    backgroundColor: '#f1fdf6',
    elevation: 4,
  },
  absentName: {
    fontSize: 17,
    color: '#212529',
    fontWeight: 'bold',
    marginLeft: 12,
    marginBottom: 2,
  },
  matriculeText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 12,
    marginBottom: 8,
  },
  justifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#006633',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 12,
    marginTop: 4,
    shadowColor: '#006633',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  justifyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
    fontStyle: 'italic',
  },
});

export default AbsentStudents;