import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Animated,
  LayoutAnimation,
  Modal,
  TouchableWithoutFeedback
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons, Ionicons, Feather } from "@expo/vector-icons";
import { supabase } from "../../configuration/supabase";
import Footer from "../../components/Footer";
import { UserContext } from "../../context/UserContext";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';

const ExportPage = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [showSemesterFilter, setShowSemesterFilter] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [downloadingSession, setDownloadingSession] = useState(null);

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

  // Fetch all semesters with academic year info
  const fetchSemesters = async () => {
    try {
      const { data, error } = await supabase
        .from('Semestre')
        .select('SemesterId, label, StartDate, EndDate, AcademicId')
        .order('StartDate', { ascending: false });

      if (error) throw error;
      setSemesters(data || []);
    } catch (error) {
      console.error("Error fetching semesters:", error);
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

  // Organize sessions by year and semester
  const organizedSessions = sessions.reduce((acc, session) => {
    const year = session.yearName || 'Unknown Year';
    const semester = session.semesterLabel || `Semester ${session.semester}`;
    
    if (!acc[year]) {
      acc[year] = {};
    }
    
    if (!acc[year][semester]) {
      acc[year][semester] = [];
    }
    
    acc[year][semester].push(session);
    return acc;
  }, {});

  // Filter sessions based on selected semester
  const filteredSessions = Object.entries(organizedSessions).reduce((acc, [year, semesters]) => {
    acc[year] = {};
    
    Object.entries(semesters).forEach(([semester, sessions]) => {
      if (selectedSemester === 'All' || semester.includes(selectedSemester)) {
        acc[year][semester] = sessions;
      }
    });
    
    return acc;
  }, {});

  const fetchTeacherSessions = useCallback(async () => {
    if (!user?.teacherId) return [];

    try {
      const { data, error } = await supabase
        .from('Session_structure')
        .select(`
          moduleId,
          groupId,
          typeId,
          Module:moduleId (
            moduleId,
            moduleName,
            SemesterId,
            Semestre:SemesterId (
              SemesterId,
              label,
              AcademicId
            ),
            SchoolYear:yearId (
              yearId,
              yearName
            )
          ),
          Group:groupId (
            groupId,
            groupName,
            group_path,
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
          )
        `)
        .eq('teacherId', user.teacherId);

      if (error) throw error;

      // Create a map to track unique sessions by groupId, moduleId, typeId, and semester
      const uniqueSessionsMap = new Map();

      data.forEach(session => {
        const key = `${session.moduleId}-${session.groupId}-${session.typeId}-${session.Module?.SemesterId}`;
        
        if (!uniqueSessionsMap.has(key)) {
          uniqueSessionsMap.set(key, session);
        }
      });

      // Convert the map values back to an array
      const uniqueSessions = Array.from(uniqueSessionsMap.values());

      return uniqueSessions.map(session => ({
        sessionId: `${session.moduleId}-${session.groupId}-${session.typeId}`,
        moduleId: session.moduleId,
        moduleName: session.Module?.moduleName || "Unknown Module",
        semester: session.Module?.SemesterId || "1",
        semesterLabel: session.Module?.Semestre?.label || `Semester ${session.Module?.SemesterId || "1"}`,
        yearName: session.Module?.SchoolYear?.yearName || "Unknown Year",
        groupId: session.groupId,
        groupName: session.Group?.groupName || "Unknown Group",
        filePath: session.Group?.group_path,
        degreeName: session.Group?.Section?.SchoolYear?.Degree?.degreeName || "Unknown Degree",
        sectionName: session.Group?.Section?.sectionName || "Unknown Section",
        academicYearId: session.Module?.Semestre?.AcademicId || null
      }));
    } catch (error) {
      console.error("Error fetching teacher sessions:", error);
      return [];
    }
  }, [user?.teacherId]);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch academic years and semesters first
      await Promise.all([fetchAcademicYears(), fetchSemesters()]);
      const sessions = await fetchTeacherSessions();
      setSessions(sessions);
    } catch (err) {
      console.error("Failed to load data:", err);
      Alert.alert("Error", "Failed to load session data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, fetchTeacherSessions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine current academic year when semesters and academic years are loaded
  useEffect(() => {
    if (semesters.length > 0 && academicYears.length > 0) {
      determineCurrentAcademicYear();
    }
  }, [semesters, academicYears, determineCurrentAcademicYear]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleYear = (year) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const toggleSemester = (year, semester) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSemesters(prev => ({
      ...prev,
      [`${year}-${semester}`]: !prev[`${year}-${semester}`]
    }));
  };

  const handleDownload = async (session) => {
  console.log("Preparing to download materials for:", session.moduleName, session.groupName);
  
  if (!session.filePath) {
    Alert.alert("Error", "No file path available for this session");
    return;
  }
  
  try {
    setDownloadingSession(session.sessionId);
    
    // First get all sessions for this module/group
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('Session')
      .select('sessionId, sessionNumber, date, TypeId')
      .eq('moduleId', session.moduleId)
      .eq('groupId', session.groupId)
      .order('date', { ascending: true });
    
    if (sessionsError) throw sessionsError;
    
    if (!sessionsData || sessionsData.length === 0) {
      throw new Error("No sessions found for this module and group");
    }
    
    console.log(`Found ${sessionsData.length} sessions for ${session.moduleName} - ${session.groupName}`);
    
    // Get all unique students who attended any of these sessions
    const { data: studentsData, error: studentsError } = await supabase
      .from('Attendance')
      .select('matricule')
      .in('sessionId', sessionsData.map(s => s.sessionId));
    
    if (studentsError) throw studentsError;
    
    const uniqueMatricules = [...new Set(studentsData.map(s => s.matricule))];
    
    // Fetch student details (first and last names)
    const { data: studentDetails, error: detailsError } = await supabase
      .from('Student')
      .select('matricule, firstName, lastName')
      .in('matricule', uniqueMatricules);
    
    if (detailsError) throw detailsError;
    
    // Create a map of matricule to student details
    const studentMap = {};
    studentDetails.forEach(student => {
      studentMap[student.matricule] = student;
    });
    
    // Now get attendance for each session with student details
    const sessionsWithAttendance = await Promise.all(
      sessionsData.map(async (sess) => {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('Attendance')
          .select('matricule, presence')
          .eq('sessionId', sess.sessionId);
        
        if (attendanceError) throw attendanceError;
        
        return {
          ...sess,
          attendance: (attendanceData || []).map(att => ({
            ...att,
            firstName: studentMap[att.matricule]?.firstName || "Unknown",
            lastName: studentMap[att.matricule]?.lastName || "Student"
          }))
        };
      })
    );
    
    const attendanceData = {
      sessions: sessionsWithAttendance,
      moduleName: session.moduleName,
      groupName: session.groupName,
      filePath: session.filePath,
      sectionName: session.sectionName || "Section"
    };
    
    await initiateDownload(attendanceData);
    
  } catch (error) {
    console.error("Error preparing download:", error);
    Alert.alert("Error", `Error preparing download: ${error.message}`);
  } finally {
    setDownloadingSession(null);
  }
};

const initiateDownload = async (attendanceData) => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Create the header row
    const header = [
      "N°",
      "Matricule",
      "Nom",
      "Prénom",
      "Section",
      "Groupe"
    ];
    
    // Add session columns
    attendanceData.sessions.forEach((session, index) => {
      header.push(`Session ${index + 1}`);
    });
    
    // Add Note column
    header.push("Note");
    
    // Create the data rows
    const dataRows = [];
    
    // Get all unique students from all sessions
    const allStudents = {};
    attendanceData.sessions.forEach(session => {
      session.attendance.forEach(att => {
        if (!allStudents[att.matricule]) {
          allStudents[att.matricule] = {
            matricule: att.matricule,
            lastName: att.lastName,
            firstName: att.firstName
          };
        }
      });
    });
    
    // Create a row for each student
    Object.values(allStudents).forEach((student, index) => {
      const row = {
        "N°": index + 1,
        "Matricule": student.matricule,
        "Nom": student.lastName,
        "Prénom": student.firstName,
        "Section": attendanceData.sectionName || "Section",
        "Groupe": attendanceData.groupName || "groupe 1"
      };
      
      // Add session attendance
      attendanceData.sessions.forEach((session, sessionIndex) => {
        const sessionAttendance = session.attendance.find(a => a.matricule === student.matricule);
        row[`Session ${sessionIndex + 1}`] = sessionAttendance ? sessionAttendance.presence : 0;
      });
      
      // Calculate note
      row["Note"] = Object.keys(row)
        .filter(key => key.startsWith('Session '))
        .reduce((sum, key) => sum + (row[key] || 0), 0);
      
      dataRows.push(row);
    });
    
    // Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataRows, { header });
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    
    // Write workbook to binary string
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'base64' 
    });
    
    // Save file locally
    const fileName = `${attendanceData.moduleName}_${attendanceData.groupName}_attendance.xlsx`;
    const fileUri = FileSystem.cacheDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, excelBuffer, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `Download ${fileName}`,
      UTI: 'org.openxmlformats.spreadsheetml.sheet'
    });
    
    console.log("Excel file created successfully");
    
  } catch (error) {
    console.error("File creation failed:", error);
    Alert.alert("Error", `File creation failed: ${error.message}`);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#006633"]}
            tintColor="#006633"
          />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Course Materials Export</Text>
          <Text style={styles.subHeader}>Download Group Lists with Notes</Text>
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
            <Ionicons name="filter" size={18} color="#006633" />
            <Text style={styles.semesterFilterText}>
              {selectedSemester === 'All' 
                ? "All Semesters" 
                : semesters.find(s => s.SemesterId === selectedSemester)?.label || "Select Semester"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#006633" />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.fullScreenLoading}>
            <ActivityIndicator size="large" color="#006633" />
            <Text style={styles.loadingText}>Loading your sessions...</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {Object.keys(filteredSessions).length > 0 ? (
              Object.entries(filteredSessions).map(([year, semesters]) => (
                <View key={year} style={styles.yearCard}>
                  <TouchableOpacity
                    onPress={() => toggleYear(year)}
                    style={styles.yearHeader}
                  >
                    <MaterialCommunityIcons name="school" size={20} color="#006633" />
                    <Text style={styles.yearText}>{year}</Text>
                    <Ionicons 
                      name={expandedYears[year] ? 'chevron-down' : 'chevron-forward'} 
                      size={20} 
                      color="#006633" 
                    />
                  </TouchableOpacity>
                  
                  {expandedYears[year] && (
                    <View style={styles.semesterContainer}>
                      {Object.entries(semesters).map(([semester, semesterSessions]) => (
                        <View key={semester} style={styles.semesterCard}>
                          <TouchableOpacity
                            onPress={() => toggleSemester(year, semester)}
                            style={styles.semesterHeader}
                          >
                            <MaterialCommunityIcons name="calendar" size={18} color="#006633" />
                            <Text style={styles.semesterText}>{semester}</Text>
                            <Ionicons 
                              name={expandedSemesters[`${year}-${semester}`] ? 'chevron-down' : 'chevron-forward'} 
                              size={18} 
                              color="#006633" 
                            />
                          </TouchableOpacity>
                          
                          {expandedSemesters[`${year}-${semester}`] && (
                            <View style={styles.sessionsGrid}>
                              {semesterSessions.map((session) => {
                                const isDownloading = downloadingSession === session.sessionId;
                                
                                return (
                                  <View key={`${session.moduleId}-${session.groupId}`} style={styles.sessionCard}>
                                    <View style={styles.sessionHeader}>
                                      <Text style={styles.moduleName}>{session.moduleName}</Text>
                                      <Text style={styles.groupName}>{session.groupName}</Text>
                                    </View>
                                    
                                    <View style={styles.sessionDetails}>
                                      <View style={styles.detailItem}>
                                        <MaterialCommunityIcons name="school" size={14} color="#006633" />
                                        <Text style={styles.detailText}>{session.degreeName}</Text>
                                      </View>
                                      <View style={styles.detailItem}>
                                        <MaterialCommunityIcons name="google-classroom" size={14} color="#006633" />
                                        <Text style={styles.detailText}>{session.sectionName}</Text>
                                      </View>
                                      {session.filePath && (
                                        <View style={styles.detailItem}>
                                          <MaterialIcons name="cloud" size={14} color="#006633" />
                                          <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="middle">
                                            {session.filePath.split('/').pop() || 'File available'}
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                    
                                    <TouchableOpacity
                                      style={[
                                        styles.downloadButton,
                                        !session.filePath && styles.disabledButton,
                                        isDownloading && styles.downloadingButton
                                      ]}
                                      onPress={() => session.filePath && handleDownload(session)}
                                      disabled={!session.filePath || isDownloading}
                                    >
                                      {isDownloading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                      ) : (
                                        <MaterialIcons name="cloud-download" size={18} color="#fff" />
                                      )}
                                      <Text style={styles.downloadText}>
                                        {isDownloading ? 'Downloading...' : (session.filePath ? 'Download' : 'No File')}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                );
                              })}
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
                <MaterialCommunityIcons 
                  name="calendar-remove-outline" 
                  size={48} 
                  color="#006633" 
                />
                <Text style={styles.noSessionsText}>
                  {sessions.length > 0 
                    ? "No sessions for selected semester"
                    : "No teaching sessions assigned"}
                </Text>
                <Text style={styles.noSessionsSubText}>
                  {sessions.length > 0
                    ? "You don't have any modules assigned for this semester"
                    : "You don't have any modules assigned to teach yet"}
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
    backgroundColor: "#f8f9fa"
  }, downloadingButton: {
    backgroundColor: '#4CAF50' // Different color when downloading
  },
  scrollContent: {
    paddingBottom: 80,
    paddingHorizontal: 16
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
  listContainer: {
    marginBottom: 20
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200
  },
  loadingText: {
    marginTop: 16,
    color: '#006633',
    fontSize: 16
  },
  yearCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f7f0'
  },
  yearText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#006633',
    marginLeft: 10
  },
  semesterContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8
  },
  semesterCard: {
    marginTop: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    overflow: 'hidden'
  },
  semesterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 24
  },
  semesterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#006633',
    marginLeft: 10
  },
  sessionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8
  },
  sessionCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sessionHeader: {
    marginBottom: 8
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#006633'
  },
  groupName: {
    fontSize: 14,
    color: '#64748b'
  },
  sessionDetails: {
    marginBottom: 12
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  detailText: {
    fontSize: 12,
    color: '#006633',
    marginLeft: 6
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006633',
    borderRadius: 4,
    padding: 8,
    marginTop: 8
  },
  disabledButton: {
    backgroundColor: '#cccccc'
  },
  downloadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6
  },
  noSessionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20
  },
  noSessionsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#006633',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8
  },
  noSessionsSubText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center'
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
  }
});

export default ExportPage;