import React, { useEffect, useState, useContext, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';
import { supabase } from '../../configuration/supabase';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import Footer from '../../components/Footer';
import { useNavigation } from '@react-navigation/native';

const EditSession = () => {
  const navigation = useNavigation();
  const { user } = useContext(UserContext);
  const [sessions, setSessions] = useState([]);
  const [organizedData, setOrganizedData] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [showSemesterFilter, setShowSemesterFilter] = useState(false);
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState(null);

  // Fetch Academic Years
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
    }
  };

  // Determine current academic year based on current date and semester intervals
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

  // Organize sessions by school year, semester, and module
  const organizeSessions = (sessions) => {
    const organized = {};

    sessions.forEach(session => {
      const yearName = session.Group?.Section?.SchoolYear?.yearName || 'Unknown Year';
      const semesterId = session.Module?.Semester?.SemesterId || 'unknown';
      const semesterName = session.Module?.Semester?.label || 'Unknown Semester';
      const moduleId = session.Module?.moduleId || 'unknown';
      const moduleName = session.Module?.moduleName || 'Unknown Module';

      if (!organized[yearName]) {
        organized[yearName] = {
          yearName,
          semesters: {}
        };
      }

      if (!organized[yearName].semesters[semesterId]) {
        organized[yearName].semesters[semesterId] = {
          semesterId,
          semesterName,
          modules: {}
        };
      }

      if (!organized[yearName].semesters[semesterId].modules[moduleId]) {
        organized[yearName].semesters[semesterId].modules[moduleId] = {
          moduleId,
          moduleName,
          sessions: []
        };
      }

      organized[yearName].semesters[semesterId].modules[moduleId].sessions.push(session);
    });

    return Object.values(organized);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.teacherId) return;
      setLoading(true);
      
      try {
        // Fetch academic years if not already loaded
        if (academicYears.length === 0) {
          await fetchAcademicYears();
        }

        // Fetch semesters with academic year info
        const { data: semesterData, error: semesterError } = await supabase
          .from('Semestre')
          .select('SemesterId, label, StartDate, EndDate, AcademicId')
          .order('StartDate', { ascending: false });

        if (semesterError) throw semesterError;
        setSemesters(semesterData || []);

        // Then fetch sessions with all related data
        const { data: sessionData, error: sessionError } = await supabase
          .from('Session')
          .select(`
            sessionId,
            sessionNumber,
            date,
            confirm,
            Module:moduleId (
              moduleId,
              moduleName,
              Semester:SemesterId (SemesterId, label, AcademicId)
            ),
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
            Day:dayId (dayId, dayName)
          `)
          .eq('teacherId', user.teacherId)
          .order('date', { ascending: false });

        if (sessionError) throw sessionError;
        setSessions(sessionData || []);
        setOrganizedData(organizeSessions(sessionData || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        setStatusMessage({ type: "error", text: "Failed to load sessions" });
        setTimeout(() => setStatusMessage(null), 3000);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, academicYears]);

  // Determine current academic year when semesters and academic years are loaded
  useEffect(() => {
    if (semesters.length > 0 && academicYears.length > 0) {
      determineCurrentAcademicYear();
    }
  }, [semesters, academicYears, determineCurrentAcademicYear]);

  useEffect(() => {
    if (sessions.length > 0) {
      let filtered = sessions;
      if (selectedSemester !== 'All') {
        filtered = sessions.filter(session => 
          session.Module?.Semester?.SemesterId === selectedSemester
        );
      }
      setOrganizedData(organizeSessions(filtered));
    }
  }, [selectedSemester, sessions]);

  const toggleSessionDetails = (sessionId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSession(selectedSession === sessionId ? null : sessionId);
  };

  const toggleYear = (yearName) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedYears(prev => ({
      ...prev,
      [yearName]: !prev[yearName]
    }));
  };

  const toggleSemester = (yearName, semesterId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSemesters(prev => ({
      ...prev,
      [`${yearName}-${semesterId}`]: !prev[`${yearName}-${semesterId}`]
    }));
  };

  const toggleModule = (yearName, semesterId, moduleId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedModules(prev => ({
      ...prev,
      [`${yearName}-${semesterId}-${moduleId}`]: !prev[`${yearName}-${semesterId}-${moduleId}`]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No Date';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Message */}
      {statusMessage && (
        <Animated.View 
          style={[
            styles.statusMessage,
            statusMessage.type === "success" 
              ? styles.successMessage 
              : styles.errorMessage
          ]}
          entering={Animated.spring(new Animated.Value(0), {
            toValue: 1,
            useNativeDriver: true
          })}
          exiting={Animated.spring(new Animated.Value(1), {
            toValue: 0,
            useNativeDriver: true
          })}
        >
          <View style={styles.statusContent}>
            {statusMessage.type === "success" ? (
              <Feather name="check-circle" size={20} color="#fff" />
            ) : (
              <Feather name="alert-circle" size={20} color="#fff" />
            )}
            <Text style={styles.statusText}>{statusMessage.text}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Your Teaching Sessions</Text>
          <Text style={styles.subHeader}>View and manage your past sessions</Text>
        </View>

        {/* Current Academic Year Display */}
        {currentAcademicYear && (
          <View style={styles.academicYearContainer}>
            <Feather name="calendar" size={18} color="#006633" />
            <Text style={styles.academicYearText}>
              Current Academic Year: {currentAcademicYear.label}
            </Text>
          </View>
        )}

        {/* Semester Filter */}
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={styles.semesterFilterButton}
            onPress={() => setShowSemesterFilter(true)}
          >
            <Feather name="filter" size={18} color="#006633" />
            <Text style={styles.semesterFilterText}>
              {selectedSemester === 'All' 
                ? "All Semesters" 
                : semesters.find(s => s.SemesterId === selectedSemester)?.label || "Select Semester"}
            </Text>
            <Feather name="chevron-down" size={18} color="#006633" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.fullScreenLoading}>
            <ActivityIndicator size="large" color="#006633" />
            <Text style={styles.loadingText}>Loading your sessions...</Text>
          </View>
        ) : (
          <View style={styles.mainContent}>
            {organizedData.length > 0 ? (
              organizedData.map((yearData) => (
                <View key={yearData.yearName} style={styles.yearCard}>
                  <TouchableOpacity
                    onPress={() => toggleYear(yearData.yearName)}
                    style={styles.yearHeader}
                  >
                    <MaterialCommunityIcons name="school" size={20} color="#006633" />
                    <Text style={styles.yearText}>{yearData.yearName}</Text>
                    <MaterialCommunityIcons 
                      name={expandedYears[yearData.yearName] ? "chevron-down" : "chevron-right"} 
                      size={20} 
                      color="#006633" 
                    />
                  </TouchableOpacity>

                  {expandedYears[yearData.yearName] && (
                    <View style={styles.semesterContainer}>
                      {Object.values(yearData.semesters).map((semesterData) => (
                        <View key={semesterData.semesterId} style={styles.semesterCard}>
                          <TouchableOpacity
                            onPress={() => toggleSemester(yearData.yearName, semesterData.semesterId)}
                            style={styles.semesterHeader}
                          >
                            <MaterialCommunityIcons name="calendar" size={18} color="#006633" />
                            <Text style={styles.semesterText}>{semesterData.semesterName}</Text>
                            <MaterialCommunityIcons 
                              name={expandedSemesters[`${yearData.yearName}-${semesterData.semesterId}`] ? "chevron-down" : "chevron-right"} 
                              size={18} 
                              color="#006633" 
                            />
                          </TouchableOpacity>

                          {expandedSemesters[`${yearData.yearName}-${semesterData.semesterId}`] && (
                            <View style={styles.moduleContainer}>
                              {Object.values(semesterData.modules).map((moduleData) => (
                                <View key={moduleData.moduleId} style={styles.moduleCard}>
                                  <TouchableOpacity
                                    onPress={() => toggleModule(yearData.yearName, semesterData.semesterId, moduleData.moduleId)}
                                    style={styles.moduleHeader}
                                  >
                                    <MaterialCommunityIcons name="book-open" size={16} color="#006633" />
                                    <Text style={styles.moduleText}>{moduleData.moduleName}</Text>
                                    <MaterialCommunityIcons 
                                      name={expandedModules[`${yearData.yearName}-${semesterData.semesterId}-${moduleData.moduleId}`] ? "chevron-down" : "chevron-right"} 
                                      size={16} 
                                      color="#006633" 
                                    />
                                  </TouchableOpacity>

                                  {expandedModules[`${yearData.yearName}-${semesterData.semesterId}-${moduleData.moduleId}`] && (
                                    <View style={styles.sessionsContainer}>
                                      {moduleData.sessions.map((session) => (
                                        <View key={session.sessionId} style={styles.sessionCard}>
                                          <TouchableOpacity
                                            onPress={() => toggleSessionDetails(session.sessionId)}
                                            style={styles.sessionHeader}
                                          >
                                            <Text style={styles.sessionTitle}>
                                              Session #{session.sessionNumber}
                                            </Text>
                                            <MaterialCommunityIcons 
                                              name={selectedSession === session.sessionId ? "chevron-down" : "chevron-right"} 
                                              size={16} 
                                              color="#006633" 
                                            />
                                          </TouchableOpacity>

                                          {selectedSession === session.sessionId && (
                                            <View style={styles.sessionDetails}>
                                              <View style={styles.detailRow}>
                                                <MaterialCommunityIcons name="account-group" size={16} color="#006633" />
                                                <Text style={styles.detailText}>
                                                  {session.Group?.groupName || 'Unknown Group'}
                                                </Text>
                                              </View>
                                              
                                              <View style={styles.detailRow}>
                                                <MaterialCommunityIcons name="google-classroom" size={16} color="#006633" />
                                                <Text style={styles.detailText}>
                                                  {session.Classroom?.Location 
                                                    ? `${session.Classroom.Location} - ${session.Classroom.ClassNumber}`
                                                    : `Room ${session.Classroom?.ClassNumber || ''}`}
                                                </Text>
                                              </View>
                                              
                                              <View style={styles.detailRow}>
                                                <MaterialCommunityIcons name="calendar" size={16} color="#006633" />
                                                <Text style={styles.detailText}>
                                                  {session.Day?.dayName || 'Unknown Day'}
                                                </Text>
                                              </View>
                                              
                                              <View style={styles.detailRow}>
                                                <MaterialCommunityIcons name="clock" size={16} color="#006633" />
                                                <Text style={styles.detailText}>
                                                  {formatDate(session.date)}
                                                </Text>
                                              </View>
                                              
                                              <View style={styles.detailRow}>
                                                <MaterialCommunityIcons 
                                                  name={session.confirm ? "check-circle" : "close-circle"} 
                                                  size={16} 
                                                  color={session.confirm ? "#006633" : "#ccc"} 
                                                />
                                                <Text style={styles.detailText}>
                                                  {session.confirm ? "Confirmed" : "Not Confirmed"}
                                                </Text>
                                              </View>

                                              <TouchableOpacity
                                                style={styles.absentButton}
                                                onPress={() => {
                                                  navigation.navigate('JustifiedStudents', {
                                                    sessionId: session.sessionId,
                                                    moduleName: session.Module?.moduleName,
                                                    groupName: session.Group?.groupName
                                                  });
                                                }}
                                              >
                                                <MaterialCommunityIcons name="account-off" size={18} color="#fff" />
                                                <Text style={styles.absentButtonText}>View Absentees</Text>
                                              </TouchableOpacity>
                                            </View>
                                          )}
                                        </View>
                                      ))}
                                    </View>
                                  )}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.noSessionsContainer}>
                <MaterialCommunityIcons name="calendar-remove-outline" size={48} color="#006633" />
                <Text style={styles.noSessionsText}>
                  {sessions.length > 0 
                    ? "No sessions match your filters"
                    : "No sessions found"}
                </Text>
                <Text style={styles.noSessionsSubText}>
                  {sessions.length > 0
                    ? "Try adjusting your semester filter"
                    : "You don't have any teaching sessions recorded yet"}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Semester Filter Modal */}
      <Modal
        visible={showSemesterFilter}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSemesterFilter(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSemesterFilter(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.modalContent}>
          <ScrollView style={styles.modalScroll}>
            <TouchableOpacity
              style={[
                styles.modalOption,
                selectedSemester === 'All' && styles.modalOptionSelected
              ]}
              onPress={() => {
                setSelectedSemester('All');
                setShowSemesterFilter(false);
              }}
            >
              <Text style={selectedSemester === 'All' ? styles.modalOptionTextSelected : styles.modalOptionText}>
                All Semesters
              </Text>
            </TouchableOpacity>
            
            {semesters
              .filter(semester => 
                !currentAcademicYear || semester.AcademicId === currentAcademicYear.AcademicId
              )
              .map(semester => (
                <TouchableOpacity
                  key={semester.SemesterId}
                  style={[
                    styles.modalOption,
                    selectedSemester === semester.SemesterId && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedSemester(semester.SemesterId);
                    setShowSemesterFilter(false);
                  }}
                >
                  <Text style={selectedSemester === semester.SemesterId ? styles.modalOptionTextSelected : styles.modalOptionText}>
                    {semester.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </Modal>

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
    paddingBottom: 80,
    paddingHorizontal: 16,
  },
  headerContainer: {
    marginBottom: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#006633",
    marginBottom: 4,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 14,
    color: "#64748b",
    textAlign: 'center',
  },
  academicYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    borderColor: '#b3d1ff',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  academicYearText: {
    marginLeft: 8,
    color: '#006633',
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  semesterFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#006633',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  semesterFilterText: {
    color: '#006633',
    fontWeight: '500',
    marginHorizontal: 10,
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  loadingText: {
    marginTop: 16,
    color: '#006633',
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
  },
  yearCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 1,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f7f0',
  },
  yearText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#006633',
    marginLeft: 10,
  },
  semesterContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  semesterCard: {
    marginTop: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  semesterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 24,
  },
  semesterText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#006633',
    marginLeft: 10,
  },
  moduleContainer: {
    paddingLeft: 16,
  },
  moduleCard: {
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 32,
  },
  moduleText: {
    flex: 1,
    fontSize: 14,
    color: '#006633',
    marginLeft: 10,
  },
  sessionsContainer: {
    paddingLeft: 16,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  sessionDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
  },
  absentButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  absentButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  noSessionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  noSessionsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#006633',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  noSessionsSubText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  statusMessage: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 100,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  successMessage: {
    backgroundColor: '#006633',
  },
  errorMessage: {
    backgroundColor: '#ff4444',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '50%',
  },
  modalScroll: {
    flex: 1,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionSelected: {
    backgroundColor: '#f0f7f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionTextSelected: {
    fontSize: 16,
    color: '#006633',
    fontWeight: '500',
  },
});

export default EditSession;