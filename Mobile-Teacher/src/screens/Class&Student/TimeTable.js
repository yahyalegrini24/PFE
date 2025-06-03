import React, { useState, useContext, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from "../../context/UserContext";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Footer from '../../components/Footer';
import { supabase } from '../../configuration/supabase';
import { Picker } from '@react-native-picker/picker';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

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
  const [timeSlots, setTimeSlots] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState(null);
  const [modules, setModules] = useState([]);

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('AcademicYear')
        .select('*')
        .order('AcademicId', { ascending: true });

      if (error) throw error;
      setAcademicYears(data || []);
    } catch (error) {
      console.error("Error fetching academic years:", error);
      Alert.alert('Error', 'Failed to load academic years');
    }
  };

  const fetchModules = async (semesterId = null) => {
    try {
      let query = supabase
        .from('Module')
        .select('*');

      if (semesterId) {
        query = query.eq('SemesterId', semesterId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
      Alert.alert('Error', 'Failed to load modules');
    }
  };

  const determineCurrentAcademicYear = useCallback(() => {
    const currentDate = new Date();
    
    const currentSemester = semesters.find(semester => {
      if (!semester.StartDate || !semester.EndDate) return false;
      
      const startDate = new Date(semester.StartDate);
      const endDate = new Date(semester.EndDate);
      
      return currentDate >= startDate && currentDate <= endDate;
    });

    if (currentSemester && currentSemester.AcademicId) {
      const academicYear = academicYears.find(year => year.AcademicId === currentSemester.AcademicId);
      setCurrentAcademicYear(academicYear);
      return academicYear;
    } else {
      setCurrentAcademicYear(null);
      return null;
    }
  }, [semesters, academicYears]);

  useEffect(() => {
    if (semesters.length > 0 && academicYears.length > 0) {
      determineCurrentAcademicYear();
    }
  }, [semesters, academicYears, determineCurrentAcademicYear]);

  useEffect(() => {
    fetchModules(selectedSemester);
  }, [selectedSemester]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.teacherId) return;

      setLoading(true);
      try {
        if (academicYears.length === 0) {
          await fetchAcademicYears();
        }

        // Fetch semesters
        const { data: semestersData, error: semestersError } = await supabase
          .from('Semestre')
          .select('*, AcademicYear:AcademicId (AcademicId, label)')
          .order('SemesterId', { ascending: true });

        if (semestersError) throw semestersError;
        setSemesters(semestersData || []);

        // Fetch time slots
        const { data: timeSlotsData, error: timeSlotsError } = await supabase
          .from('SessionTime')
          .select('*')
          .order('TimeId', { ascending: true });

        if (timeSlotsError) throw timeSlotsError;
        setTimeSlots(timeSlotsData || []);

        // Build the query for sessions
        let query = supabase
          .from('Session_structure')
          .select(`
            moduleId,
            classId,
            groupId,
            teacherId,
            dayId,
            typeId,
            TimeId,
            Session_structure_id,
            Day:dayId (dayId, dayName),
            Module:moduleId (moduleId, moduleName, SemesterId, SchoolYear:yearId (yearId, yearName, Degree:degreeId (degreeId, degreeName))),
            Group:groupId (
              groupId,
              groupName,
              Section:sectionId (
                sectionId,
                sectionName,
                SchoolYear:yearId (
                  yearId,
                  yearName,
                  Degree:degreeId (
                    degreeId,
                    degreeName
                  )
                )
              )
            ),
            Classroom:classId (classId, ClassNumber, Location),
            GroupType:typeId (typeId, typeName),
            SessionTime:TimeId (TimeId, label)
          `)
          .eq('teacherId', user.teacherId);

        // Apply semester filter if selected
        if (selectedSemester) {
          query = query.eq('Module.SemesterId', selectedSemester);
        }

        const { data: sessionsData, error: sessionsError } = await query;

        if (sessionsError) throw sessionsError;

        // Format the data
        const formattedData = {};
        sessionsData?.forEach(session => {
          const dayName = session.Day?.dayName || '';
          const timeSlot = session.SessionTime?.label || '';
          const timeId = session.TimeId || null;
          
          if (!formattedData[dayName]) {
            formattedData[dayName] = {};
          }

          formattedData[dayName][timeSlot] = {
            moduleId: session.moduleId,
            name: session.Module?.moduleName || '',
            groupId: session.groupId,
            group: session.Group?.groupName || '',
            type: session.GroupType?.typeName || '',
            typeId: session.typeId || '',
            year: session.Module?.SchoolYear?.yearName || session.Group?.Section?.SchoolYear?.yearName || '',
            yearId: session.Module?.yearId || session.Group?.Section?.SchoolYear?.yearId || '',
            degree: session.Module?.SchoolYear?.Degree?.degreeName || session.Group?.Section?.SchoolYear?.Degree?.degreeName || '',
            degreeId: session.Module?.SchoolYear?.degreeId || session.Group?.Section?.SchoolYear?.Degree?.degreeId || '',
            sectionId: session.Group?.Section?.sectionId || '',
            classroomId: session.classId,
            room: {
              roomNumber: session.Classroom?.ClassNumber || '',
              location: session.Classroom?.Location || '',
              classId: session.classId
            },
            timeId: timeId,
            timeLabel: timeSlot,
            dayId: session.dayId,
            sessionStructureId: session.Session_structure_id || generateAlphaId()
          };
        });

        setTimetableData(formattedData);

        // Fetch classrooms
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
  }, [user, selectedSemester]);

  const handleSaveTimetable = async () => {
    setLoading(true);

    try {
      const sessionsToUpsert = [];
      
      Object.entries(timetableData).forEach(([dayName, daySchedule]) => {
        Object.entries(daySchedule).forEach(([timeSlot, slotData]) => {
          if (slotData && slotData.groupId && slotData.moduleId) {
            const timeSlotData = timeSlots.find(t => t.label === timeSlot);
            
            sessionsToUpsert.push({
              moduleId: slotData.moduleId,
              classId: slotData.classroomId || null,
              groupId: slotData.groupId,
              teacherId: user.teacherId,
              dayId: days.indexOf(dayName) + 1,
              typeId: slotData.typeId || null,
              TimeId: timeSlotData?.TimeId || null,
              Session_structure_id: slotData.sessionStructureId || generateAlphaId()
            });
          }
        });
      });

      // Delete existing sessions
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

  const openCourseDetails = (day, timeSlot) => {
    const slotData = timetableData[day]?.[timeSlot] || {};
    const classroom = classrooms.find(c => c.classId === slotData?.classroomId);
    const timeSlotData = timeSlots.find(t => t.label === timeSlot);
    
    navigation.navigate('CourseDetails', {
      day,
      timeSlot,
      courseDetails: {
        ...slotData,
        room: {
          roomNumber: classroom?.ClassNumber || slotData.room?.roomNumber || '',
          location: classroom?.Location || slotData.room?.location || '',
          classId: slotData.classroomId || ''
        },
        timeId: timeSlotData?.TimeId || null,
        timeLabel: timeSlot,
        sessionStructureId: slotData.sessionStructureId || generateAlphaId()
      },
      onSave: (updatedDetails) => {
        setTimetableData(prev => ({
          ...prev,
          [day]: {
            ...prev[day],
            [updatedDetails.timeLabel || timeSlot]: {
              ...updatedDetails,
              sessionStructureId: updatedDetails.sessionStructureId || generateAlphaId()
            }
          }
        }));
      },
      teacherId: user?.teacherId,
      classrooms,
      selectedSemester,
      modules // Pass filtered modules based on selected semester
    });
  };

  const handleDeleteSession = async (day, timeSlot) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: async () => {
          const sessionId = timetableData[day]?.[timeSlot]?.sessionStructureId;
          if (!sessionId) return;

          try {
            const { error } = await supabase
              .from('Session_structure')
              .delete()
              .eq('Session_structure_id', sessionId);

            if (error) throw error;

            setTimetableData(prev => {
              const newData = { ...prev };
              if (newData[day]) {
                delete newData[day][timeSlot];
              }
              return newData;
            });
          } catch (error) {
            console.error('Failed to delete session:', error);
            Alert.alert('Error', 'Failed to delete session');
          }
        }}
      ]
    );
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
          {timeSlots.map((timeSlot) => {
            const slotData = timetableData[day]?.[timeSlot.label];
            const classroom = classrooms.find(c => c.classId === slotData?.classroomId);
            
            return (
              <View key={timeSlot.TimeId} style={styles.hourRow}>
                <View style={styles.hourTextContainer}>
                  <Text style={styles.hourText}>{timeSlot.label}</Text>
                </View>
                <TouchableOpacity
                  style={styles.courseTextContainer}
                  onPress={() => openCourseDetails(day, timeSlot.label)}
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
                          {slotData.type} | {classroom?.Location ? `${classroom.Location} - ${classroom.ClassNumber}` : `Room ${slotData.room?.roomNumber || ''}`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteSession(day, timeSlot.label)}
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
        
        {currentAcademicYear && (
          <View style={styles.academicYearContainer}>
            <MaterialCommunityIcons name="calendar" size={20} color="#1a73e8" />
            <Text style={styles.academicYearText}>
              Current Academic Year: {currentAcademicYear.label}
            </Text>
          </View>
        )}

        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filter Options</Text>
          
          <View style={styles.filterCard}>
            <View style={styles.filterRow}>
              <MaterialCommunityIcons name="calendar-month" size={20} color="#666" />
              <Text style={styles.filterLabel}>Semester:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedSemester}
                  onValueChange={(itemValue) => setSelectedSemester(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  <Picker.Item label="All Semesters" value={null} />
                  {semesters
                    .filter(semester => 
                      !currentAcademicYear || semester.AcademicId === currentAcademicYear.AcademicId
                    )
                    .map(semester => (
                      <Picker.Item 
                        key={semester.SemesterId} 
                        label={semester.label} 
                        value={semester.SemesterId} 
                      />
                    ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#006633" />
          </View>
        ) : (
          days.map(renderDaySchedule)
        )}
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
    paddingBottom: 100,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#006633',
  },
  academicYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f0fe',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  academicYearText: {
    fontSize: 16,
    color: '#1a73e8',
    marginLeft: 8,
    fontWeight: '500',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
    paddingLeft: 5,
  },
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 16,
    color: '#555',
    marginLeft: 10,
    marginRight: 15,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
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
    position: 'absolute',
    bottom: 70,
    left: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
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