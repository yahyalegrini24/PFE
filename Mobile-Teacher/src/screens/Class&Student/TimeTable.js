import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from "../../context/UserContext";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Footer from '../../components/Footer';
import { supabase } from '../../configuration/supabase';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const hours = ['08:00-09:30', '09:30-11:00', '11:00-12:30', '12:30-14:00', '14:00-15:30', '15:30-17:00'];

const generateAlphaId = (length = 12) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
};

const TimeTable = () => {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const [expandedDay, setExpandedDay] = useState(null);
  const [timetableData, setTimetableData] = useState({});
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.teacherId) return;

      setLoading(true);
      try {
        // Fetch session data with all necessary joins
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('Session_structure')
          .select(`
            moduleId,
            classId,
            groupId,
            teacherId,
            dayId,
            typeId,
            Session_structure_id,
            Day:dayId (dayId, dayName),
            Module:moduleId (moduleId, moduleName),
            Group:groupId (groupId, groupName, sectionId),
            GroupType:typeId (typeId, typeName),
            Classroom:classId (classId, ClassNumber, Location)
          `)
          .eq('teacherId', user.teacherId);

        if (sessionsError) throw sessionsError;

        // Fetch additional group details if needed
        const groupIds = [...new Set(sessionsData?.map(s => s.groupId).filter(Boolean))] || [];
        const { data: groupsData, error: groupsError } = groupIds.length > 0 ? await supabase
          .from('Group')
          .select(`
            groupId,
            sectionId,
            Section:sectionId (sectionId, sectionName, yearId),
            SchoolYear:Section.yearId (yearId, yearName, degreeId),
            Degree:SchoolYear.degreeId (degreeId, degreeName)
          `)
          .in('groupId', groupIds) : { data: null, error: null };

        if (groupsError) throw groupsError;

        // Combine the data
        const formattedData = {};
        sessionsData?.forEach(session => {
          const dayName = session.Day?.dayName || '';
          const groupDetails = groupsData?.find(g => g.groupId === session.groupId) || {};
          
          if (!formattedData[dayName]) {
            formattedData[dayName] = {};
          }

          const timeSlot = hours[session.dayId - 1] || '';
          
          formattedData[dayName][timeSlot] = {
            moduleId: session.moduleId,
            name: session.Module?.moduleName || '',
            groupId: session.groupId,
            group: session.Group?.groupName || '',
            type: session.GroupType?.typeName || '',
            typeId: session.typeId || '',
            year: groupDetails.SchoolYear?.yearName || '',
            yearId: groupDetails.SchoolYear?.yearId || '',
            degree: groupDetails.Degree?.degreeName || '',
            degreeId: groupDetails.Degree?.degreeId || '',
            sectionId: groupDetails.sectionId || '',
            classroomId: session.classId,
            room: {
              roomNumber: session.Classroom?.ClassNumber || '',
              location: session.Classroom?.Location || '',
              classId: session.classId
            },
            dayId: session.dayId,
            sessionStructureId: session.Session_structure_id || generateAlphaId()
          };
        });

        setTimetableData(formattedData);

        // Fetch classrooms separately
        const { data: classroomsData, error: classroomsError } = await supabase
          .from('Classroom')
          .select('classId, ClassNumber, Location');

        if (classroomsError) throw classroomsError;
        setClassrooms(classroomsData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSaveTimetable = async () => {
    setLoading(true);

    try {
      const sessionsToUpsert = [];
      
      Object.entries(timetableData).forEach(([dayName, daySchedule]) => {
        Object.entries(daySchedule).forEach(([timeSlot, slotData]) => {
          if (slotData && slotData.groupId && slotData.moduleId) {
            const sessionData = {
              moduleId: slotData.moduleId,
              classId: slotData.room?.classId || null,
              groupId: slotData.groupId,
              teacherId: user.teacherId,
              dayId: days.indexOf(dayName) + 1,
              typeId: slotData.typeId || null,
              Session_structure_id: slotData.sessionStructureId || generateAlphaId()
            };

            sessionsToUpsert.push(sessionData);
          }
        });
      });

      // Delete existing sessions for this teacher
      const { error: deleteError } = await supabase
        .from('Session_structure')
        .delete()
        .eq('teacherId', user.teacherId);

      if (deleteError) throw deleteError;

      // Insert new sessions
      const { error: insertError } = await supabase
        .from('Session_structure')
        .insert(sessionsToUpsert);

      if (insertError) throw insertError;

      Alert.alert('Success', 'Timetable saved successfully!');
    } catch (error) {
      console.error('Failed to save timetable:', error);
      Alert.alert('Error', 'Failed to save timetable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openCourseDetails = (day, hour) => {
    const slotData = timetableData[day]?.[hour] || {};
    const classroom = classrooms.find(c => c.classId === slotData?.classroomId);
    
    navigation.navigate('CourseDetails', {
      day,
      hour,
      courseDetails: {
        ...slotData,
        room: {
          roomNumber: classroom?.ClassNumber || slotData.room?.roomNumber || '',
          location: classroom?.Location || slotData.room?.location || 'Unknown Location',
          classId: slotData.classroomId || ''
        },
        sessionStructureId: slotData.sessionStructureId || generateAlphaId()
      },
      onSave: (updatedDetails) => {
        setTimetableData(prev => ({
          ...prev,
          [day]: {
            ...prev[day],
            [hour]: {
              ...updatedDetails,
              sessionStructureId: updatedDetails.sessionStructureId || generateAlphaId()
            }
          }
        }));
      }
    });
  };

  const renderDaySchedule = (day) => (
    <View key={day} style={styles.dayContainer}>
      <TouchableOpacity onPress={() => setExpandedDay(expandedDay === day ? null : day)} style={styles.dayHeader}>
        <Text style={styles.dayText}>{day}</Text>
        <MaterialCommunityIcons
          name={expandedDay === day ? 'chevron-up' : 'chevron-down'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
      {expandedDay === day && (
        <View style={styles.hoursContainer}>
          {hours.map((hour) => {
            const slotData = timetableData[day]?.[hour];
            const classroom = classrooms.find(c => c.classId === slotData?.classroomId);
            
            return (
              <View key={hour} style={styles.hourRow}>
                <View style={styles.hourTextContainer}>
                  <Text style={styles.hourText}>{hour}</Text>
                </View>
                <TouchableOpacity
                  style={styles.courseTextContainer}
                  onPress={() => openCourseDetails(day, hour)}
                >
                  {slotData ? (
                    <View style={styles.courseContent}>
                      <View style={styles.courseInfo}>
                        <Text style={styles.courseName}>
                          {slotData.degree} | {slotData.year}
                        </Text>
                        <Text style={styles.courseName}>
                          {slotData.group} | {slotData.name}
                        </Text>
                        <Text style={styles.courseDetails}>
                          {slotData.type} | {classroom?.Location ? `${classroom.Location} - ${classroom.ClassNumber}` : `Room ${slotData.room?.roomNumber || slotData.room}`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                          setTimetableData(prev => {
                            const newData = { ...prev };
                            if (newData[day]) {
                              delete newData[day][hour];
                            }
                            return newData;
                          });
                        }}
                      >
                        <MaterialCommunityIcons name="delete" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.noClassText}>No class</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Timetable</Text>
        {days.map(renderDaySchedule)}
      </ScrollView>
      
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSaveTimetable}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Timetable</Text>
        )}
      </TouchableOpacity>
      
      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#006633',
  },
  dayContainer: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dayHeader: {
    padding: 16,
    backgroundColor: '#006633',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  hoursContainer: {
    padding: 8,
  },
  hourRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  hourTextContainer: {
    width: '30%',
    paddingRight: 8,
  },
  hourText: {
    fontSize: 14,
    color: '#006633',
    fontWeight: '600',
  },
  courseTextContainer: {
    flex: 1,
  },
  courseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  courseDetails: {
    fontSize: 12,
    color: '#666',
  },
  noClassText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#006633',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    margin: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center', 
  },
});

export default TimeTable;